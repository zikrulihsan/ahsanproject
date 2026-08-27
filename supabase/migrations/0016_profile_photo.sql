-- A face on a profile, without asking anybody to upload one.
--
-- Two ways in, and the later one wins:
--   1. the picture the login provider already handed over (Google's, today),
--      kept in step whenever that picture changes, and
--   2. a direct image URL the person types into their profile.
--
-- Deliberately not from a LinkedIn profile URL. LinkedIn serves its profile
-- pages behind an authentication wall, its robots rules disallow reading them,
-- and the photo URLs it does hand out are signed and expire — so nothing here
-- can turn `linkedin.com/in/<name>` into a picture. Signing in with LinkedIn
-- (Supabase's `linkedin_oidc` provider) hands over `picture` the same way
-- Google does, and lands in the same column through the trigger below.

alter table public.profiles
  add column photo_url text not null default '';

alter table public.profiles
  add constraint profiles_photo_url_length check (char_length(photo_url) <= 500);

-- The provider's picture, or an empty string. Only https survives: a forged
-- metadata value cannot make the site load an image over a protocol nobody
-- expects, and every provider that offers a picture serves it over https.
create or replace function public.provider_photo(metadata jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when candidate ~ '^https://' then left(candidate, 500) else '' end
  from (
    select coalesce(
      nullif(trim(metadata ->> 'avatar_url'), ''),
      nullif(trim(metadata ->> 'picture'), ''),
      ''
    ) as candidate
  ) as source;
$$;

-- Same body as 0002, plus the picture the provider sent along with the name.
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

  insert into public.profiles (id, username, name, photo_url)
  values (
    new.id,
    public.available_username(coalesce(display_name, new.email)),
    left(display_name, 80),
    public.provider_photo(new.raw_user_meta_data)
  );

  return new;
end;
$$;

-- Google refreshes the picture URL on later sign-ins, and people change their
-- photo there. Only the provider's own previous value gets replaced: a photo
-- somebody typed in here is theirs to keep, and so is an empty one — clearing
-- the field is how a person goes back to their initials, and this must not
-- hand them a Google photo again on their next sign-in.
create or replace function public.sync_provider_photo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  fresh    text;
  previous text;
begin
  fresh    := public.provider_photo(new.raw_user_meta_data);
  previous := public.provider_photo(old.raw_user_meta_data);
  if fresh = previous then
    return new;
  end if;

  update public.profiles p
     set photo_url = fresh
   where p.id = new.id
     and p.photo_url = previous;

  return new;
end;
$$;

drop trigger if exists on_auth_user_photo_changed on auth.users;

create trigger on_auth_user_photo_changed
  after update of raw_user_meta_data on auth.users
  for each row execute function public.sync_provider_photo();

-- Everybody who signed in with Google before this migration existed.
update public.profiles p
   set photo_url = public.provider_photo(u.raw_user_meta_data)
  from auth.users u
 where u.id = p.id
   and p.photo_url = ''
   and public.provider_photo(u.raw_user_meta_data) <> '';
