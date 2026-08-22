-- Ahsan Project: the board learns which roles a project is asking for.
--
-- The feed could already say *how many* seats a project has open, but not
-- *which* — and "which" is the question a designer looking for somewhere to
-- help actually asks. The roles were always in `seats`; this surfaces them on
-- the overview so the board can filter by them and the cards can name them.
--
-- The view is dropped and recreated whole, the same way 0004 and 0006 did it,
-- so this file stays the single place the current shape can be read.

drop view public.project_overview;

create view public.project_overview with (security_invoker = true) as
select
  p.id, p.slug, p.title, p.tagline, p.owner_id, p.stage,
  p.problem, p.solution, p.audience,
  p.doc_url, p.live_url, p.repo_url,
  p.tags, p.glyph, p.created_at,
  o.username as owner_username,
  o.name     as owner_name,
  (select count(*) from public.seats s where s.project_id = p.id)                         as seat_count,
  (select count(*) from public.seats s where s.project_id = p.id and s.status = 'open')   as open_seat_count,
  (select count(*) from public.seats s where s.project_id = p.id and s.status = 'filled') as active_member_count,
  -- Distinct, because two open engineering seats still answer "needs an
  -- engineer" only once. coalesce keeps it an empty array rather than null,
  -- so `contains` filters and array mappings never meet a special case.
  (select coalesce(array_agg(distinct s.role), '{}'::text[])
     from public.seats s where s.project_id = p.id and s.status = 'open')                 as open_roles,
  (select count(*) from public.boosts b where b.project_id = p.id)                         as boost_count,
  (select count(*) from public.comments c where c.project_id = p.id)                       as comment_count,
  (select count(*) from public.tasks t where t.project_id = p.id and t.status <> 'done')   as open_task_count,
  (select count(*) from public.tasks t where t.project_id = p.id and t.status  = 'done')   as done_task_count
from public.projects p
join public.profiles o on o.id = p.owner_id;

-- Dropping the view takes its grant with it, so it has to be re-issued here.
grant select on public.project_overview to anon, authenticated;
