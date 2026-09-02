-- Closing a role to new proposals, without touching who already applied.
--
-- `managers close seats on their project` (DELETE) has been legal since
-- 0004, but deleting the row throws away every proposal aimed at it —
-- `proposals.seat_id` cascades — including somebody still waiting on a
-- decision. Closing a role that stopped being needed should not silently
-- reject people who already put in the work of applying; it should only
-- turn off new ones. A third seat status does that: `open` still takes
-- proposals, `closed` does not, and neither deletes anything.

alter table public.seats drop constraint seats_status_valid;
alter table public.seats
  add constraint seats_status_valid check (status in ('open', 'filled', 'closed'));

-- `seats_holder_matches_status` has read "anything but open names a holder"
-- since 0001, back when the only other status was 'filled'. A closed seat is
-- exactly as holder-less as an open one — it just stopped taking new
-- proposals — so the rule has to key off 'filled' specifically, not off
-- 'open' being the only holder-less status anymore.
alter table public.seats drop constraint seats_holder_matches_status;
alter table public.seats
  add constraint seats_holder_matches_status check (
    (status = 'filled' and user_id is not null) or (status <> 'filled' and user_id is null)
  );

-- `submit_proposal` already looks for `status = 'open'` before accepting a
-- new one, so a closed seat falls straight into its existing "sudah tidak
-- menerima proposal" error — nothing to change there.
--
-- `decide_proposal` is the one place that hard-codes 'open': accepting a
-- proposal only filled a seat coming from that status. A closed seat can
-- still be carrying proposals sent before it closed, and accepting one of
-- those has to fill the seat exactly the same way. Everything else below is
-- unchanged from 0016.
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
    where id = proposal.seat_id and status in ('open', 'closed');
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

grant execute on function public.decide_proposal(bigint, boolean) to authenticated;
