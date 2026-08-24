-- Make profiles searchable as people, without weakening the proof-of-work
-- that already distinguishes Ahsan Project from a CV directory.

alter table public.profiles
  add column profession text not null default '',
  add column skills text[] not null default '{}',
  add column years_experience smallint,
  add column fields text[] not null default '{}',
  add constraint profiles_profession_length check (char_length(profession) <= 80),
  add constraint profiles_skills_count check (cardinality(skills) <= 20),
  add constraint profiles_experience_range check (
    years_experience is null or years_experience between 0 and 60
  ),
  add constraint profiles_fields_count check (cardinality(fields) <= 10);

create index profiles_profession_idx on public.profiles (lower(profession));
create index profiles_skills_idx on public.profiles using gin (skills);
create index profiles_fields_idx on public.profiles using gin (fields);
