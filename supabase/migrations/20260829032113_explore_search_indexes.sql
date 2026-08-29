-- Keep Explore quick once the public catalogue is large.
--
-- These indexes mirror the predicates in app/lib/data.ts. They are intentionally
-- narrow: the shared cache already removes repeated reads, while these avoid a
-- sequential scan when a cache entry is cold or has just been invalidated.

-- ILIKE '%term%' needs trigrams; put the extension in Supabase's conventional
-- extension schema rather than exposing its objects through public.
create extension if not exists pg_trgm with schema extensions;

-- project_overview counts both states for every card. The same leading key also
-- supports the project-detail seat read, while status avoids filtering every
-- seat belonging to a project after the lookup.
create index seats_project_status_idx on public.seats (project_id, status);

-- Explore asks for matching roles only among seats that can still be joined.
-- A partial index keeps filled seats out of the index and returns project_id
-- directly to the two-step role search.
create index seats_open_role_project_idx
  on public.seats (role, project_id)
  where status = 'open';

-- Custom role titles use ILIKE with a contains pattern. B-tree cannot support
-- that predicate, whereas a trigram GIN index can.
create index seats_open_role_title_trgm_idx
  on public.seats using gin (role_title extensions.gin_trgm_ops)
  where status = 'open';

-- One searchable value means the project search needs one index instead of a
-- separate large trigram index for title, tagline, problem, solution, audience
-- and now_text. Every source column is non-null, making this stored expression
-- immutable and automatically refreshed whenever a brief is edited.
alter table public.projects
  add column search_text text generated always as (
    title || ' ' || tagline || ' ' || problem || ' ' || solution || ' ' || audience || ' ' || now_text
  ) stored;

create index projects_search_text_trgm_idx
  on public.projects using gin (search_text extensions.gin_trgm_ops);

-- project_overview is the read model Explore queries. Expose the indexed search
-- value at the end to preserve the existing view-column order for all clients.
create or replace view public.project_overview with (security_invoker = true) as
select
  p.id, p.slug, p.title, p.tagline, p.owner_id, p.stage,
  p.problem, p.solution, p.audience,
  p.doc_url, p.live_url, p.repo_url, p.logo_url,
  p.tags, p.glyph, p.created_at,
  p.now_text, p.now_updated_at,
  o.username as owner_username,
  o.name     as owner_name,
  (select count(*) from public.seats s where s.project_id = p.id)                         as seat_count,
  (select count(*) from public.seats s where s.project_id = p.id and s.status = 'open')   as open_seat_count,
  (select count(*) from public.seats s where s.project_id = p.id and s.status = 'filled') as active_member_count,
  (select coalesce(array_agg(distinct s.role), '{}'::text[])
     from public.seats s where s.project_id = p.id and s.status = 'open')                 as open_roles,
  (select count(*) from public.boosts   b where b.project_id = p.id)                      as boost_count,
  (select count(*) from public.follows  f where f.project_id = p.id)                      as follower_count,
  (select count(*) from public.comments c where c.project_id = p.id)                      as comment_count,
  (select count(*) from public.updates  u where u.project_id = p.id)                      as update_count,
  (select count(*) from public.tasks t where t.project_id = p.id and t.status <> 'done')  as open_task_count,
  (select count(*) from public.tasks t where t.project_id = p.id and t.status  = 'done')  as done_task_count,
  greatest(
    p.updated_at,
    coalesce((select max(u.created_at) from public.updates  u where u.project_id = p.id), p.updated_at),
    coalesce((select max(c.created_at) from public.comments c where c.project_id = p.id), p.updated_at),
    coalesce((select max(t.updated_at) from public.tasks    t where t.project_id = p.id), p.updated_at),
    coalesce((select max(s.created_at) from public.seats    s where s.project_id = p.id), p.updated_at)
  ) as last_activity_at,
  p.open_for_github_contributions,
  p.search_text
from public.projects p
join public.profiles o on o.id = p.owner_id;

grant select on public.project_overview to anon, authenticated;
