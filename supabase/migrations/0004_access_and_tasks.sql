-- Ahsan Project: project access levels, and tasks.
--
-- Two additions that belong together: a project needs somebody besides the
-- owner who may keep the work moving, and it needs somewhere to say what is
-- being worked on.
--
-- Access levels do not get their own table. A `seats` row with status 'filled'
-- already *is* the membership record, so one column carries the whole idea:
--
--   pemilik  projects.owner_id, holds no seat
--   admin    a filled seat with access = 'admin'
--   anggota  a filled seat with access = 'member'

alter table public.seats
  add column access text not null default 'member',
  add constraint seats_access_valid       check (access in ('member', 'admin')),
  -- An open seat must never advertise itself as admin, or accepting an
  -- application would silently hand over the keys. Promotion is always a
  -- separate, deliberate act on a seat somebody already holds.
  add constraint seats_admin_needs_holder check (access = 'member' or status = 'filled');

-- ---------------------------------------------------------------- who may act

/*
 * Whether the caller may keep this project moving: the owner, or one of its
 * admins.
 *
 * SECURITY DEFINER is load-bearing here, not a style choice. This function is
 * used inside the policies on `seats` and it reads `seats` itself. As INVOKER,
 * evaluating a seats policy would evaluate the seats policy again — infinite
 * recursion. As DEFINER it runs as the table owner, which bypasses RLS, so
 * there is no second evaluation. Any future policy that needs "is this person
 * an admin" must go through a definer function for the same reason.
 */
create or replace function public.can_manage_project(project bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
           select 1 from public.projects p
           where p.id = project and p.owner_id = (select auth.uid()))
      or exists (
           select 1 from public.seats s
           where s.project_id = project
             and s.user_id = (select auth.uid())
             and s.status   = 'filled'
             and s.access   = 'admin');
$$;

/** Whether somebody is on this project at all — the owner, or a filled seat. */
create or replace function public.is_project_person(project bigint, person uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select person is not null and (
    exists (select 1 from public.projects p
            where p.id = project and p.owner_id = person)
    or exists (select 1 from public.seats s
               where s.project_id = project and s.user_id = person and s.status = 'filled'));
$$;

/**
 * Whether the caller owns this project outright.
 *
 * Reads only `projects`, and is used in policies on `seats`, so there is no
 * recursion to avoid and SECURITY INVOKER is the smaller surface.
 */
create or replace function public.owns_project(project bigint)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (select 1 from public.projects p
                 where p.id = project and p.owner_id = (select auth.uid()));
$$;

grant execute on function public.can_manage_project(bigint) to anon, authenticated;
grant execute on function public.is_project_person(bigint, uuid) to anon, authenticated;
grant execute on function public.owns_project(bigint) to anon, authenticated;

/*
 * Admins help run the work, so they inherit the seat controls. The project
 * itself — the brief, the level, deleting it — stays with the owner.
 *
 * The `access = 'member' or owns_project(...)` guard appears in both clauses,
 * and it is the difference between an admin and a second owner. In USING it
 * reads against the OLD row, so an admin cannot touch a seat that is already
 * admin; in WITH CHECK it reads against the NEW row, so an admin cannot make
 * one. Without it, `can_manage_project` on its own would let any admin promote
 * anybody — including themselves — and the level would mean nothing.
 */
drop policy "owners open seats on their project"  on public.seats;
drop policy "owners edit seats on their project"  on public.seats;
drop policy "owners close seats on their project" on public.seats;

create policy "managers open seats on their project"
  on public.seats for insert
  to authenticated
  with check (
    public.can_manage_project(project_id)
    and (access = 'member' or public.owns_project(project_id))
  );

create policy "managers edit seats on their project"
  on public.seats for update
  to authenticated
  using (
    public.can_manage_project(project_id)
    and (access = 'member' or public.owns_project(project_id))
  )
  with check (
    public.can_manage_project(project_id)
    and (access = 'member' or public.owns_project(project_id))
  );

create policy "managers close seats on their project"
  on public.seats for delete
  to authenticated
  using (
    public.can_manage_project(project_id)
    and (access = 'member' or public.owns_project(project_id))
  );

-- ---------------------------------------------------------------------- tasks

/*
 * What the project is actually working on.
 *
 * Deliberately thin: no due dates, no ordering, no labels, no sub-tasks, no
 * milestones. Three statuses and one person per task is enough to answer
 * "lagi ngerjain apa", and it stays readable for somebody who has never used
 * an issue tracker.
 */
create table public.tasks (
  id          bigint generated always as identity primary key,
  project_id  bigint      not null references public.projects (id) on delete cascade,
  title       text        not null,
  detail      text        not null default '',
  -- Both people references release rather than cascade: somebody deleting
  -- their account should not erase the project's record of the work.
  assignee_id uuid        references public.profiles (id) on delete set null,
  created_by  uuid        references public.profiles (id) on delete set null,
  status      text        not null default 'todo',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint tasks_title_len    check (char_length(title) between 3 and 120),
  constraint tasks_detail_len   check (char_length(detail) <= 400),
  constraint tasks_status_valid check (status in ('todo', 'doing', 'done'))
);

create index tasks_project_idx  on public.tasks (project_id, id);
create index tasks_assignee_idx on public.tasks (assignee_id);

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;

create policy "tasks are public"
  on public.tasks for select
  to anon, authenticated
  using (true);

create policy "managers add tasks"
  on public.tasks for insert
  to authenticated
  with check (
    public.can_manage_project(project_id)
    and created_by = (select auth.uid())
    and (assignee_id is null or public.is_project_person(project_id, assignee_id))
  );

create policy "managers edit tasks"
  on public.tasks for update
  to authenticated
  using (public.can_manage_project(project_id))
  with check (
    public.can_manage_project(project_id)
    and (assignee_id is null or public.is_project_person(project_id, assignee_id))
  );

create policy "managers remove tasks"
  on public.tasks for delete
  to authenticated
  using (public.can_manage_project(project_id));

grant select                 on public.tasks to anon, authenticated;
grant insert, update, delete on public.tasks to authenticated;

/*
 * Moving a task along.
 *
 * A function rather than an UPDATE policy for the same reason apply_for_seat is
 * one: row level security is row level, not column level. A policy letting the
 * assignee update their own task would also let them rewrite its title and hand
 * it to somebody else. Column-level GRANT UPDATE(status) cannot help either —
 * it would apply to every authenticated role, so it cannot be narrow for the
 * assignee and wide for the owner at the same time.
 *
 * The parameter is `next_status`, not `status`, so it never shadows the column.
 */
create or replace function public.move_task(task_id bigint, next_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller  uuid := auth.uid();
  project bigint;
  holder  uuid;
begin
  if caller is null then
    raise exception 'Masuk dulu untuk memindahkan tugas.' using errcode = '42501';
  end if;

  if next_status not in ('todo', 'doing', 'done') then
    raise exception 'Status tugas itu tidak ada.' using errcode = '22023';
  end if;

  select t.project_id, t.assignee_id into project, holder
  from public.tasks t
  where t.id = task_id
  for update;

  if project is null then
    raise exception 'Tugasnya tidak ketemu.' using errcode = 'P0002';
  end if;

  if holder is distinct from caller and not public.can_manage_project(project) then
    raise exception 'Cuma yang kebagian tugas ini, admin, atau pemilik proyek yang bisa memindahkannya.'
      using errcode = '42501';
  end if;

  update public.tasks t set status = next_status where t.id = task_id;
end;
$$;

grant execute on function public.move_task(bigint, text) to authenticated;

/*
 * When somebody stops being on a project, their tasks go back to unclaimed.
 *
 * Without this the task keeps pointing at a person who no longer holds a seat,
 * and the `is_project_person` clause above would then refuse a manager who
 * re-saves the task with the same assignee — a WITH CHECK cannot see the old
 * row, so it cannot say "unchanged". Fixing it at the source is honest in the
 * interface too: the task simply reads "Belum ada yang ambil" again.
 */
create or replace function public.release_tasks_of_departed_seat()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.user_id is not null
     and (tg_op = 'DELETE' or new.user_id is distinct from old.user_id
          or new.status is distinct from 'filled')
  then
    update public.tasks t
    set assignee_id = null
    where t.project_id = old.project_id and t.assignee_id = old.user_id;
  end if;

  return coalesce(new, old);
end;
$$;

create trigger seats_release_tasks
  after update or delete on public.seats
  for each row execute function public.release_tasks_of_departed_seat();

-- Declining an application sends the seat back to 'open'. Reset access at the
-- same time so no filled → open path can ever leave an admin flag on a seat
-- nobody holds.
create or replace function public.decide_seat(seat_id bigint, accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller  uuid := auth.uid();
  project bigint;
begin
  select s.project_id into project
  from public.seats s
  where s.id = seat_id and s.status = 'pending'
  for update of s;

  if project is null then
    raise exception 'Tidak ada lamaran yang menunggu di peran ini.' using errcode = 'P0002';
  end if;

  if caller is null or not public.can_manage_project(project) then
    raise exception 'Cuma pemilik proyek atau adminnya yang bisa menjawab lamaran.'
      using errcode = '42501';
  end if;

  if accept then
    update public.seats s set status = 'filled' where s.id = seat_id;
  else
    update public.seats s
    set status = 'open', user_id = null, pitch = '', access = 'member'
    where s.id = seat_id;
  end if;
end;
$$;

-- ----------------------------------------------------------------- overview

/*
 * Rebuilt to carry the task counts, so a card and a portfolio page can show
 * progress without loading task rows.
 *
 * Dropped and recreated rather than CREATE OR REPLACE on purpose: replace keeps
 * the old reloptions silently, so a replacement that forgets
 * `security_invoker = true` would leave the view running with definer
 * semantics and quietly stop honouring row level security. Writing the option
 * out is worth re-issuing the grant, which the drop takes with it.
 */
drop view public.project_overview;

create view public.project_overview with (security_invoker = true) as
select
  p.id, p.slug, p.title, p.tagline, p.owner_id, p.stage,
  p.problem, p.solution, p.audience,
  p.doc_url, p.live_url, p.repo_url,
  p.tags, p.accent, p.glyph, p.created_at,
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

grant select on public.project_overview to anon, authenticated;
