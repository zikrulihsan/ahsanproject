-- Ahsan Project: giving admins their seat decisions back.
--
-- 0004 widened `decide_seat` from the owner to `can_manage_project()`, and made
-- declining reset `access` along with the holder. 0008 then rewrote the whole
-- function to add the applicant's notice — but it built on the 0002 body rather
-- than the 0004 one, so both of those changes went away silently.
--
-- Two things broke with them:
--
--   1. An admin still sees "Menunggu keputusanmu" on the project page, because
--      app/lib/access.ts says admins manage seats. Pressing Terima raised
--      42501 and the page fell over. The rule the interface renders and the
--      rule the database enforces have to be the same rule.
--
--   2. Declining stopped clearing `access`. Nothing is actually leaking today —
--      `seats_admin_needs_holder` refuses an admin flag on any seat that is not
--      filled, so a pending seat cannot be carrying one to begin with. The
--      reset is put back as the second lock 0004 intended it to be: if that
--      constraint is ever loosened, the reopened seat still comes back as a
--      plain member instead of waiting to promote whoever is accepted next.
--
-- Everything else is 0008's function unchanged: the notice is still written
-- before the seat is touched, because declining is what clears `user_id`.

create or replace function public.decide_seat(seat_id bigint, accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller    uuid := auth.uid();
  applicant uuid;
  project   bigint;
  seat_role text;
begin
  select s.user_id, s.project_id, s.role
    into applicant, project, seat_role
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
    update public.seats s
    set status = 'open', user_id = null, pitch = '', access = 'member'
    where s.id = seat_id;
  end if;
end;
$$;

grant execute on function public.decide_seat(bigint, boolean) to authenticated;
