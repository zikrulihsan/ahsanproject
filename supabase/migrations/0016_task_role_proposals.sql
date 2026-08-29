-- Tasks, roles, and proposals are separate things.
--
-- A role may exist without a task, and a task may exist without a role. When
-- they do belong together, `tasks.seat_id` is the optional link. Proposals are
-- intentionally their own rows: changing a role to `pending` made the first
-- applicant hide everybody else who was interested.

alter table public.tasks
  add column seat_id bigint references public.seats (id) on delete set null;

create index tasks_seat_idx on public.tasks (seat_id) where seat_id is not null;

-- A task can point at a role only in its own project. A foreign key can prove
-- the role exists, not that both rows belong to the same parent.
create or replace function public.task_role_belongs_to_project()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.seat_id is not null and not exists (
    select 1 from public.seats s
    where s.id = new.seat_id and s.project_id = new.project_id
  ) then
    raise exception 'Role yang dihubungkan harus berasal dari project yang sama.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger tasks_check_role_project
  before insert or update of project_id, seat_id on public.tasks
  for each row execute function public.task_role_belongs_to_project();

create table public.proposals (
  id          bigint generated always as identity primary key,
  -- Exactly one target: either a concrete task or an open role.
  task_id     bigint references public.tasks (id) on delete cascade,
  seat_id     bigint references public.seats (id) on delete cascade,
  person_id   uuid not null references public.profiles (id) on delete cascade,
  pitch       text not null,
  status      text not null default 'pending',
  created_at  timestamptz not null default now(),
  decided_at  timestamptz,

  constraint proposals_one_target check (num_nonnulls(task_id, seat_id) = 1),
  constraint proposals_pitch_len check (char_length(pitch) between 1 and 1000),
  constraint proposals_status_valid check (status in ('pending', 'accepted', 'declined'))
);

create index proposals_task_idx on public.proposals (task_id, id desc) where task_id is not null;
create index proposals_seat_idx on public.proposals (seat_id, id desc) where seat_id is not null;
create index proposals_person_idx on public.proposals (person_id, id desc);
-- A person cannot send the same pending proposal twice, but may apply again if
-- a manager declined it while the task or role remains available.
create unique index proposals_one_pending_task_per_person
  on public.proposals (task_id, person_id) where task_id is not null and status = 'pending';
create unique index proposals_one_pending_seat_per_person
  on public.proposals (seat_id, person_id) where seat_id is not null and status = 'pending';

-- Preserve any in-flight application from the old single-applicant model.
insert into public.proposals (seat_id, person_id, pitch, status, created_at)
select id, user_id, pitch, 'pending', created_at
from public.seats
where status = 'pending' and user_id is not null;

update public.seats
set status = 'open', user_id = null, pitch = '', access = 'member'
where status = 'pending';

alter table public.seats drop constraint seats_status_valid;
alter table public.seats
  add constraint seats_status_valid check (status in ('open', 'filled'));

-- The old RPCs encode one applicant in the seat row. Leaving them callable
-- would let a crafted request reintroduce that state.
drop function public.apply_for_seat(bigint, text);
drop function public.decide_seat(bigint, boolean);

alter table public.proposals enable row level security;

create policy "people and project managers read proposals"
  on public.proposals for select
  to authenticated
  using (
    person_id = (select auth.uid())
    or exists (
      select 1 from public.tasks t
      where t.id = task_id and public.can_manage_project(t.project_id)
    )
    or exists (
      select 1 from public.seats s
      where s.id = seat_id and public.can_manage_project(s.project_id)
    )
  );

grant select on public.proposals to authenticated;

-- The profile rule is deliberately repeated in the database. Rendering a
-- "lengkapi profil" button is helpful, but server actions remain public POST
-- endpoints and must not trust the screen that sent them.
create or replace function public.profile_ready_for_talent_pool(person uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = person
      and btrim(p.profession) <> ''
      and cardinality(p.skills) > 0
      and (btrim(p.bio) <> '' or btrim(p.headline) <> '')
  );
$$;

create or replace function public.submit_proposal(
  target_task_id bigint default null,
  target_seat_id bigint default null,
  message text default ''
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  project bigint;
begin
  if caller is null then
    raise exception 'Masuk dulu untuk mengajukan bantuan.' using errcode = '42501';
  end if;
  if num_nonnulls(target_task_id, target_seat_id) <> 1 then
    raise exception 'Pilih satu tugas atau satu role untuk diajukan.' using errcode = '22023';
  end if;
  if coalesce(btrim(message), '') = '' then
    raise exception 'Ceritakan dulu kenapa kamu cocok.' using errcode = '22023';
  end if;
  if not public.profile_ready_for_talent_pool(caller) then
    raise exception 'Lengkapi profil talent pool sebelum mengajukan bantuan.' using errcode = '42501';
  end if;

  if target_task_id is not null then
    select t.project_id into project
    from public.tasks t
    where t.id = target_task_id and t.assignee_id is null and t.status <> 'done'
    for update;
  else
    select s.project_id into project
    from public.seats s
    where s.id = target_seat_id and s.status = 'open'
    for update;
  end if;

  if project is null then
    raise exception 'Tugas atau role ini sudah tidak menerima proposal.' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.projects p where p.id = project and p.owner_id = caller) then
    raise exception 'Project ini milikmu sendiri.' using errcode = '42501';
  end if;
  if target_seat_id is not null and public.is_project_person(project, caller) then
    raise exception 'Kamu sudah menjadi bagian dari project ini.' using errcode = '42501';
  end if;

  insert into public.proposals (task_id, seat_id, person_id, pitch)
  values (target_task_id, target_seat_id, caller, left(btrim(message), 1000));
exception
  when unique_violation then
    raise exception 'Proposalmu untuk ini masih menunggu jawaban.' using errcode = '23505';
end;
$$;

create or replace function public.decide_proposal(proposal_id bigint, accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  proposal public.proposals%rowtype;
  project bigint;
  target_label text;
  project_slug text;
  project_title text;
  other_person uuid;
begin
  select * into proposal
  from public.proposals p
  where p.id = proposal_id and p.status = 'pending'
  for update;

  if proposal.id is null then
    raise exception 'Proposal ini sudah dijawab atau tidak ditemukan.' using errcode = 'P0002';
  end if;

  if proposal.task_id is not null then
    select t.project_id, t.title into project, target_label
    from public.tasks t where t.id = proposal.task_id for update;
  else
    select s.project_id, coalesce(nullif(s.role_title, ''), s.role) into project, target_label
    from public.seats s where s.id = proposal.seat_id for update;
  end if;
  if project is null or caller is null or not public.can_manage_project(project) then
    raise exception 'Cuma pemilik project atau adminnya yang bisa menjawab proposal.' using errcode = '42501';
  end if;

  if accept and proposal.task_id is not null then
    update public.tasks
    set assignee_id = proposal.person_id
    where id = proposal.task_id and assignee_id is null and status <> 'done';
    if not found then
      raise exception 'Tugas ini sudah diambil atau sudah beres.' using errcode = 'P0002';
    end if;
  elsif accept then
    update public.seats
    set status = 'filled', user_id = proposal.person_id, pitch = '', access = 'member'
    where id = proposal.seat_id and status = 'open';
    if not found then
      raise exception 'Role ini sudah terisi.' using errcode = 'P0002';
    end if;
  end if;

  update public.proposals
  set status = case when accept then 'accepted' else 'declined' end,
      decided_at = now()
  where id = proposal.id;

  select slug, title into project_slug, project_title from public.projects where id = project;
  perform public.record_notice(
    proposal.person_id,
    case when accept then 'proposal_accepted' else 'proposal_declined' end,
    jsonb_build_object(
      'slug', coalesce(project_slug, ''),
      'title', coalesce(project_title, 'project yang sudah dihapus'),
      'target', coalesce(target_label, 'kontribusi'),
      'target_kind', case when proposal.task_id is null then 'role' else 'task' end
    )
  );

  -- Once one person is accepted the target is closed. Settle every remaining
  -- pending proposal too, so no applicant is left waiting on a role or task
  -- that can no longer be assigned, and tell each of them why.
  if accept then
    for other_person in
      update public.proposals p
      set status = 'declined', decided_at = now()
      where p.status = 'pending'
        and p.id <> proposal.id
        and (p.task_id = proposal.task_id or p.seat_id = proposal.seat_id)
      returning p.person_id
    loop
      perform public.record_notice(
        other_person,
        'proposal_declined',
        jsonb_build_object(
          'slug', coalesce(project_slug, ''),
          'title', coalesce(project_title, 'project yang sudah dihapus'),
          'target', coalesce(target_label, 'kontribusi'),
          'target_kind', case when proposal.task_id is null then 'role' else 'task' end
        )
      );
    end loop;
  end if;
end;
$$;

grant execute on function public.profile_ready_for_talent_pool(uuid) to anon, authenticated;
grant execute on function public.submit_proposal(bigint, bigint, text) to authenticated;
grant execute on function public.decide_proposal(bigint, boolean) to authenticated;

-- Keep the notification log honest about the new kind of decision.
alter table public.notices drop constraint notices_kind_valid;
alter table public.notices add constraint notices_kind_valid check (kind in (
  'application_accepted', 'application_declined', 'proposal_accepted', 'proposal_declined'
));
