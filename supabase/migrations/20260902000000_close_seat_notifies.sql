-- Closing a role, and telling the people who had already applied to it.
--
-- `managers close seats on their project` (DELETE) has been legal since 0004,
-- but nothing in the app ever offered it: a role opened by mistake, or one
-- that stopped being needed, had no way out except sitting on the board
-- advertising help that was no longer wanted.
--
-- Deleting the row was never the missing piece — `proposals.seat_id` already
-- cascades. The missing piece is what cascading does to whoever was still
-- waiting: their pending proposal disappears with no explanation, the same
-- silent loss `notices` was built in 0008 to close for the single-applicant
-- model. This is that same fix for the new one.

/*
 * Runs before the row is gone, while the seat's pending proposals can still
 * be read. Nothing here needs an authorisation check: DELETE on `seats` is
 * already gated by "managers close seats on their project", so by the time
 * this fires the caller has already been allowed to do this.
 *
 * A filled seat has no pending proposals to speak of — `decide_proposal`
 * declines every competing one the moment it accepts somebody — so this only
 * ever has work to do on an open role, but it is written to read that off the
 * row rather than assume it.
 */
create or replace function public.notify_proposals_before_seat_close()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_label   text;
  project_slug   text;
  project_title  text;
  applicant      uuid;
begin
  target_label := coalesce(nullif(old.role_title, ''), old.role);
  select p.slug, p.title into project_slug, project_title
  from public.projects p where p.id = old.project_id;

  for applicant in
    select person_id from public.proposals
    where seat_id = old.id and status = 'pending'
  loop
    perform public.record_notice(
      applicant,
      'role_closed',
      jsonb_build_object(
        'slug', coalesce(project_slug, ''),
        'title', coalesce(project_title, 'project yang sudah dihapus'),
        'target', coalesce(target_label, 'peran'),
        'target_kind', 'role'
      )
    );
  end loop;

  return old;
end;
$$;

create trigger seats_notify_before_close
  before delete on public.seats
  for each row execute function public.notify_proposals_before_seat_close();

alter table public.notices drop constraint notices_kind_valid;
alter table public.notices add constraint notices_kind_valid check (kind in (
  'application_accepted', 'application_declined', 'proposal_accepted', 'proposal_declined', 'role_closed'
));
