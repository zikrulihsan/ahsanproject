-- Ahsan Project: telling somebody what happened to their application.
--
-- Applying was a one-way trip. Accepting filled the seat, but declining reset
-- it — status back to 'open', user_id to null, pitch wiped — so the applicant's
-- side of that decision was erased along with it. They were never told, and
-- afterwards there was nothing left to find: /inbox reads `seats`, and the row
-- no longer named them.
--
-- A notice is the part that has to outlive the seat. It belongs to the person
-- it is for, not to the seat it came from, and it carries its own copy of what
-- it is about, so it still reads correctly after the project is renamed or
-- deleted — the same snapshot trick `events.payload` already uses.

create table public.notices (
  id           bigint      generated always as identity primary key,
  -- Deleting your account takes your notices with it; there would be nobody
  -- left to read them.
  recipient_id uuid        not null references public.profiles (id) on delete cascade,
  kind         text        not null,
  payload      jsonb       not null default '{}'::jsonb,
  seen         boolean     not null default false,
  created_at   timestamptz not null default now(),

  constraint notices_kind_valid check (kind in (
    'application_accepted', 'application_declined')),
  constraint notices_payload_object check (jsonb_typeof(payload) = 'object')
);

-- The inbox reads "mine, newest first", and the header badge counts the unseen
-- ones. Both are this index.
create index notices_recipient_idx on public.notices (recipient_id, id desc);

-- ------------------------------------------------------------------ writing

/*
 * The only thing that writes a notice.
 *
 * Same reasoning as record_event() in 0005: if the app inserted these, the
 * table would need `grant insert to authenticated`, and the anon key is public
 * — anybody could then post themselves a notice claiming they were accepted
 * onto a project they never applied to. This way `notices` needs no insert
 * grant at all, and a notice can only appear as the side effect of a real
 * decision.
 */
create or replace function public.record_notice(
  recipient uuid,
  kind text,
  payload jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notices (recipient_id, kind, payload)
  values (recipient, kind, coalesce(payload, '{}'::jsonb));
$$;

revoke all on function public.record_notice(uuid, text, jsonb) from public, anon, authenticated;

/*
 * decide_seat, now telling the applicant what was decided.
 *
 * The notice is written before the seat is touched, because declining is what
 * clears `user_id` — read the applicant afterwards and there is nobody left to
 * notify. Everything else about the function is unchanged from 0002.
 */
create or replace function public.decide_seat(seat_id bigint, accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller    uuid := auth.uid();
  owner     uuid;
  applicant uuid;
  project   bigint;
  seat_role text;
begin
  select p.owner_id, s.user_id, p.id, s.role
    into owner, applicant, project, seat_role
  from public.seats s
  join public.projects p on p.id = s.project_id
  where s.id = seat_id and s.status = 'pending'
  for update of s;

  if owner is null then
    raise exception 'Tidak ada lamaran yang menunggu di peran ini.' using errcode = 'P0002';
  end if;

  if caller is null or caller <> owner then
    raise exception 'Cuma pemilik proyek yang bisa menjawab lamaran.' using errcode = '42501';
  end if;

  if applicant is not null then
    perform public.record_notice(
      applicant,
      case when accept then 'application_accepted' else 'application_declined' end,
      (select jsonb_build_object('slug', p.slug, 'title', p.title, 'role', seat_role)
         from public.projects p where p.id = project)
    );
  end if;

  if accept then
    update public.seats s set status = 'filled' where s.id = seat_id;
  else
    update public.seats s set status = 'open', user_id = null, pitch = '' where s.id = seat_id;
  end if;
end;
$$;

grant execute on function public.decide_seat(bigint, boolean) to authenticated;

-- ------------------------------------------------------------------ reading

alter table public.notices enable row level security;

-- A notice is addressed to one person and nobody else reads it. There is no
-- anon case on purpose: a signed-out visitor has no notices.
create policy "a notice is for its recipient alone"
  on public.notices for select
  to authenticated
  using (recipient_id = (select auth.uid()));

/*
 * Marking as read is the one thing a recipient may change, and the WITH CHECK
 * keeps it to their own rows — without it, an UPDATE could move a notice onto
 * somebody else by rewriting recipient_id.
 */
create policy "a recipient may mark their own notices read"
  on public.notices for update
  to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

grant select on public.notices to authenticated;
grant update (seen) on public.notices to authenticated;
