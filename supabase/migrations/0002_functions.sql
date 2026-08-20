-- Ahsan Project: triggers and the two seat transitions that need more than a
-- plain row-level rule.
--
-- Every function pins an empty search_path and fully qualifies its names, so a
-- caller cannot shadow a table or operator and change what a SECURITY DEFINER
-- body actually does.

-- --------------------------------------------------------------------- clock

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------ profiles

-- Turns a name or an email into a username nobody has taken yet.
create or replace function public.available_username(seed text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  base      text;
  candidate text;
  suffix    int := 1;
begin
  base := lower(split_part(coalesce(seed, ''), '@', 1));
  base := regexp_replace(base, '[^a-z0-9]+', '-', 'g');
  base := trim(both '-' from base);
  base := left(base, 40);

  -- The username format check wants at least two characters, starting with a
  -- letter or digit. Anything that shrank away falls back to a generic stem.
  if char_length(base) < 2 or base !~ '^[a-z0-9]' then
    base := 'orang';
  end if;

  candidate := base;
  while exists (select 1 from public.profiles p where p.username = candidate) loop
    suffix    := suffix + 1;
    candidate := base || '-' || suffix;
  end loop;

  return candidate;
end;
$$;

-- A Supabase auth user gets its public half here the moment it is created, so
-- no request ever has to race to create one.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  display_name text;
begin
  display_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'name', '')), '');
  display_name := coalesce(display_name, split_part(new.email, '@', 1));

  insert into public.profiles (id, username, name)
  values (new.id, public.available_username(coalesce(display_name, new.email)), left(display_name, 80));

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- --------------------------------------------------------------------- seats

-- Taking an open seat. This is a function rather than a row-level rule because
-- the allowed change is narrow: only status, holder and pitch may move, and
-- only from 'open'. A plain UPDATE policy would also have to leave the role and
-- the brief writable by the applicant.
create or replace function public.apply_for_seat(seat_id bigint, pitch text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller  uuid := auth.uid();
  project bigint;
begin
  if caller is null then
    raise exception 'Masuk dulu untuk mengambil peran.' using errcode = '42501';
  end if;

  if coalesce(trim(pitch), '') = '' then
    raise exception 'Ceritakan dulu kenapa kamu cocok.' using errcode = '22023';
  end if;

  select s.project_id into project
  from public.seats s
  where s.id = seat_id and s.status = 'open'
  for update;

  if project is null then
    raise exception 'Peran ini sudah tidak terbuka.' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.projects p where p.id = project and p.owner_id = caller) then
    raise exception 'Proyek ini milikmu sendiri.' using errcode = '42501';
  end if;

  if exists (select 1 from public.seats s where s.project_id = project and s.user_id = caller) then
    raise exception 'Kamu sudah punya peran di proyek ini.' using errcode = '23505';
  end if;

  update public.seats s
  set status = 'pending', user_id = caller, pitch = left(trim(apply_for_seat.pitch), 1000)
  where s.id = seat_id;
end;
$$;

-- The owner's answer. Accepting fills the seat; declining reopens it and drops
-- the applicant's pitch.
create or replace function public.decide_seat(seat_id bigint, accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  owner  uuid;
begin
  select p.owner_id into owner
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

  if accept then
    update public.seats s set status = 'filled' where s.id = seat_id;
  else
    update public.seats s set status = 'open', user_id = null, pitch = '' where s.id = seat_id;
  end if;
end;
$$;

revoke all on function public.available_username(text) from public, anon, authenticated;
grant execute on function public.apply_for_seat(bigint, text) to authenticated;
grant execute on function public.decide_seat(bigint, boolean) to authenticated;
