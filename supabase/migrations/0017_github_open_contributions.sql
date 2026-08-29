-- A project can make a precise public promise: contributions through its
-- GitHub repository are welcome. It is not inferred from merely having a
-- repository link — maintainers must opt in explicitly.

alter table public.projects
  add column open_for_github_contributions boolean not null default false,
  add constraint projects_open_github_needs_repository check (
    not open_for_github_contributions
    or lower(repo_url) ~ '^https://(www\.)?github\.com/[^/[:space:]]+/[^/[:space:]]+/?$'
  );

-- Keep the public project shape in sync with the new badge. Adding the field
-- at the end lets CREATE OR REPLACE preserve the existing view column order.
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
  p.open_for_github_contributions
from public.projects p
join public.profiles o on o.id = p.owner_id;

grant select on public.project_overview to anon, authenticated;
