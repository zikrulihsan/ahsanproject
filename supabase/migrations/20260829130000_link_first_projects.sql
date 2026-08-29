-- A project can now arrive as nothing more than a link.
--
-- The board's original bargain was that a project had to carry a full brief
-- before it existed here, and the length floors below enforced it at the
-- boundary. That bargain cost us the submissions we never saw: somebody with a
-- finished product opens /new, meets six required paragraphs, and leaves. The
-- brief is still the thing that makes a project worth reading — it is simply no
-- longer the price of admission. It is filled in afterwards, by the owner, on a
-- page that already exists.
--
-- So every brief column keeps its ceiling and loses its floor. Nothing here
-- deletes writing or relaxes a rule that protects somebody else; an empty
-- column now means "not said yet" exactly as `project_type` already does.

-- The one thing we ask for beyond the link, and the one part of the page a
-- machine cannot read: why this is worth somebody's attention, in the owner's
-- own words. Short on purpose — a highlight, not a second brief.
alter table public.projects
  add column if not exists highlight text not null default '';

alter table public.projects drop constraint if exists projects_highlight_len;
alter table public.projects
  add constraint projects_highlight_len check (char_length(highlight) <= 280);

alter table public.projects
  drop constraint if exists projects_tagline_len,
  drop constraint if exists projects_problem_len,
  drop constraint if exists projects_solution_len,
  drop constraint if exists projects_audience_len,
  drop constraint if exists projects_tags_present;

/*
 * "Not said yet" is the empty string, so make it the default too.
 *
 * These four columns are NOT NULL with no default, which was right when every
 * one of them was required and wrong now that none of them is: an insert that
 * simply does not mention the brief should produce a project without one, not
 * an error about a null. The application always sends a string either way —
 * this is about what the table means on its own.
 */
alter table public.projects
  alter column tagline  set default '',
  alter column problem  set default '',
  alter column solution set default '',
  alter column audience set default '';

alter table public.projects
  add constraint projects_tagline_len  check (char_length(tagline) <= 140),
  add constraint projects_problem_len  check (char_length(problem) <= 2000),
  add constraint projects_solution_len check (char_length(solution) <= 2000),
  add constraint projects_audience_len check (char_length(audience) <= 600),
  add constraint projects_tags_present check (cardinality(tags) <= 6);

/*
 * `title` keeps its floor of three characters, and createProject in
 * app/actions.ts guarantees one for a link-only submission: the page title, the
 * site name, or the domain itself. A project with no name is not a row anybody
 * could link to.
 *
 * `projects_live_needs_link` and `projects_building_needs_work` also stay as
 * they are. Both ask for evidence rather than prose, and a link-first project
 * arrives holding exactly that evidence.
 */

-- search_text is a stored generated column, so the highlight only becomes
-- searchable by rebuilding it. The view reads the column, and the index is
-- built on it, so both come down first and go back up after.
drop view if exists public.project_overview;
drop index if exists public.projects_search_text_trgm_idx;

alter table public.projects drop column if exists search_text;
alter table public.projects
  add column search_text text generated always as (
    title || ' ' || tagline || ' ' || highlight || ' ' || problem || ' ' ||
    solution || ' ' || audience || ' ' || now_text
  ) stored;

create index projects_search_text_trgm_idx
  on public.projects using gin (search_text extensions.gin_trgm_ops);

-- 20260829120000_project_types.sql's definition, with `highlight` beside the
-- brief it now stands in for. Recreated rather than replaced for the reason
-- given there: replace keeps the old reloptions, and a view that quietly loses
-- `security_invoker = true` stops honouring RLS.
create view public.project_overview with (security_invoker = true) as
select
  p.id, p.slug, p.title, p.tagline, p.owner_id, p.stage, p.project_type,
  p.highlight, p.problem, p.solution, p.audience,
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
