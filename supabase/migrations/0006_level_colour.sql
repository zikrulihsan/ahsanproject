-- Ahsan Project: colour follows the level.
--
-- Every project carried an `accent`, picked from a hash of its title, and the
-- board painted the whole card with it. It looked busy and it said nothing —
-- worse, it made the one colour that does mean something, the level badge,
-- compete with a background chosen at random.
--
-- Colour now comes from `stage`, which the interface already computes, so this
-- column has nothing left to say. Nothing is lost that cannot be rebuilt: the
-- old value was a pure function of the title.

drop view public.project_overview;

alter table public.projects drop column accent;

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
  (select count(*) from public.boosts b where b.project_id = p.id)                         as boost_count,
  (select count(*) from public.comments c where c.project_id = p.id)                       as comment_count,
  (select count(*) from public.tasks t where t.project_id = p.id and t.status <> 'done')   as open_task_count,
  (select count(*) from public.tasks t where t.project_id = p.id and t.status  = 'done')   as done_task_count
from public.projects p
join public.profiles o on o.id = p.owner_id;

-- Dropping the view takes its grant with it, so it has to be re-issued here.
grant select on public.project_overview to anon, authenticated;
