-- Project kind: why it exists, and what joining it actually means.
--
-- Until now a project could only be told apart by its stage (how far it has
-- got) and its topics (what it is about). Neither answers the question that
-- decides whether somebody wants in: is this a weekend experiment, a community
-- effort, a product people already use, or a business? The open role can be
-- identical across all four and still be four different arrangements. This
-- column holds that answer, and Explore filters on it.
--
-- Deliberately orthogonal to `stage`. 'live' means other people can open it —
-- that is availability, not the reason the project exists. A pet project may
-- well be live, and a commercial one may still be an idea.
--
-- SAFE TO RE-RUN, and worth re-running once. An earlier draft of this file was
-- numbered 0016 and rebuilt project_overview from the definition that existed
-- before 0017_github_open_contributions.sql and
-- 20260829032113_explore_search_indexes.sql. Applied after those, it silently
-- dropped `open_for_github_contributions` and `search_text` from the view,
-- which is what Explore's search and the GitHub contribution badge read. The
-- view below is rebuilt from the current definition, so running this file
-- restores both columns.

alter table public.projects
  add column if not exists project_type text not null default '';

/*
 * Empty is a valid value, and it means "not stated".
 *
 * Every row that already exists was created before the question was ever
 * asked, so picking a kind on their behalf would attach a claim their owner
 * never made — precisely what this board refuses to carry elsewhere. New
 * projects have to choose (see createProject in app/actions.ts), so the gap
 * closes on its own instead of being papered over now.
 */
alter table public.projects drop constraint if exists projects_type_valid;
alter table public.projects
  add constraint projects_type_valid
  check (project_type in ('', 'pet', 'community', 'product', 'commercial'));

create index if not exists projects_type_idx on public.projects (project_type);

-- The projects supabase/seed.sql plants, filled in as they actually are — the
-- same narrow backfill 0015 used for the FlipCard logo. Only those slugs, and
-- only where the owner has not said something themselves.
update public.projects set project_type = 'pet'
where slug = 'tap-tap-dzikr' and project_type = '';

update public.projects set project_type = 'product'
where slug in ('wecard', 'carikontak') and project_type = '';

update public.projects set project_type = 'commercial'
where slug in ('invoice-cepat', 'warung-antre') and project_type = '';

update public.projects set project_type = 'community'
where slug in ('main-aman', 'swegrowth', 'titip-jemput') and project_type = '';

/*
 * Rebuilt so the board can filter without a second read of `projects`.
 *
 * This is 20260829032113_explore_search_indexes.sql's definition with
 * `project_type` added beside `stage` — the two answer neighbouring questions
 * and belong next to each other. `open_for_github_contributions` and
 * `search_text` stay last, where 0017 and 20260829032113 put them, so column
 * order is unchanged for anything reading positionally.
 *
 * Dropped and recreated rather than CREATE OR REPLACE, for the same reason as
 * 0004, 0006, 0007, 0010 and 0015: replace quietly keeps the old reloptions, so
 * a replacement that forgets `security_invoker = true` stops honouring RLS.
 * Adding a column in the middle rules out replace anyway.
 */
drop view if exists public.project_overview;

create view public.project_overview with (security_invoker = true) as
select
  p.id, p.slug, p.title, p.tagline, p.owner_id, p.stage, p.project_type,
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
