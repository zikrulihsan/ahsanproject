-- Ahsan Project: tables.
--
-- One person owns a project; anyone can contribute to it. A project always
-- carries its brief (problem/solution/audience) — the length floors here are
-- the same ones app/lib/brief.ts enforces before the insert is ever attempted,
-- so an empty idea cannot reach the table by any route.

create extension if not exists "pgcrypto";

-- Public half of a Supabase auth user. Created by a trigger on sign-up; see
-- 0003_functions.sql.
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text        not null,
  name        text        not null,
  headline    text        not null default '',
  bio         text        not null default '',
  website     text        not null default '',
  github      text        not null default '',
  created_at  timestamptz not null default now(),

  constraint profiles_username_format check (username ~ '^[a-z0-9][a-z0-9-]{1,47}$'),
  constraint profiles_name_length     check (char_length(name) between 1 and 80),
  constraint profiles_headline_length check (char_length(headline) <= 140),
  constraint profiles_bio_length      check (char_length(bio) <= 800)
);

create unique index profiles_username_key on public.profiles (username);

create table public.projects (
  id          bigint generated always as identity primary key,
  slug        text        not null,
  title       text        not null,
  tagline     text        not null,
  owner_id    uuid        not null references public.profiles (id) on delete cascade,
  stage       text        not null default 'idea',

  -- The brief.
  problem     text        not null,
  solution    text        not null,
  audience    text        not null,

  -- Optional extras that unlock the later levels.
  doc_url     text        not null default '',
  live_url    text        not null default '',
  repo_url    text        not null default '',

  tags        text[]      not null default '{}',

  -- Card presentation, kept on the row so a project looks like itself everywhere.
  accent      text        not null default 'mint',
  glyph       text        not null default '✦',

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint projects_slug_format  check (slug ~ '^[a-z0-9][a-z0-9-]{1,47}$'),
  constraint projects_stage_valid  check (stage in ('idea', 'validating', 'building', 'live', 'resting')),
  constraint projects_title_len    check (char_length(title) between 3 and 60),
  constraint projects_tagline_len  check (char_length(tagline) between 20 and 140),
  constraint projects_problem_len  check (char_length(problem) between 120 and 2000),
  constraint projects_solution_len check (char_length(solution) between 120 and 2000),
  constraint projects_audience_len check (char_length(audience) between 40 and 600),
  constraint projects_tags_present check (cardinality(tags) between 1 and 6),

  -- The two level requirements that a single row can vouch for on its own.
  -- The rest (a project needs an open seat or a document to be 'validating')
  -- depend on other tables and are checked in app/lib/stages.ts.
  constraint projects_live_needs_link check (
    stage <> 'live' or live_url <> ''
  ),
  constraint projects_building_needs_work check (
    stage not in ('building', 'live') or repo_url <> '' or doc_url <> '' or live_url <> ''
  )
);

create unique index projects_slug_key   on public.projects (slug);
create index        projects_owner_idx  on public.projects (owner_id);
create index        projects_stage_idx  on public.projects (stage);
create index        projects_tags_idx   on public.projects using gin (tags);

-- A seat on a project. Seats exist before anyone fills them: an open seat is
-- the "open contribution" ask, a filled seat is the assignment.
create table public.seats (
  id          bigint generated always as identity primary key,
  project_id  bigint      not null references public.projects (id) on delete cascade,
  role        text        not null,
  brief       text        not null default '',
  status      text        not null default 'open',
  user_id     uuid        references public.profiles (id) on delete set null,
  pitch       text        not null default '',
  created_at  timestamptz not null default now(),

  constraint seats_role_valid   check (role in ('pm', 'design', 'engineering', 'research', 'content', 'growth', 'other')),
  constraint seats_status_valid check (status in ('open', 'pending', 'filled')),
  constraint seats_brief_len    check (char_length(brief) <= 400),
  constraint seats_pitch_len    check (char_length(pitch) <= 1000),
  -- An open seat belongs to nobody; a taken one always names a person.
  constraint seats_holder_matches_status check (
    (status = 'open' and user_id is null) or (status <> 'open' and user_id is not null)
  )
);

create index seats_project_idx on public.seats (project_id);
create index seats_user_idx    on public.seats (user_id);

-- One person can only hold one seat per project, however that seat came about.
create unique index seats_one_per_person on public.seats (project_id, user_id)
  where user_id is not null;

create table public.comments (
  id          bigint generated always as identity primary key,
  project_id  bigint      not null references public.projects (id) on delete cascade,
  author_id   uuid        not null references public.profiles (id) on delete cascade,
  body        text        not null,
  created_at  timestamptz not null default now(),

  constraint comments_body_len check (char_length(body) between 1 and 2000)
);

create index comments_project_idx on public.comments (project_id, id);

create table public.boosts (
  project_id  bigint      not null references public.projects (id) on delete cascade,
  user_id     uuid        not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),

  primary key (project_id, user_id)
);

-- Everything a card or a project page needs, counted once in the database
-- rather than by pulling every seat and comment across the wire.
create view public.project_overview with (security_invoker = true) as
select
  p.id, p.slug, p.title, p.tagline, p.owner_id, p.stage,
  p.problem, p.solution, p.audience,
  p.doc_url, p.live_url, p.repo_url,
  p.tags, p.accent, p.glyph, p.created_at,
  o.username as owner_username,
  o.name     as owner_name,
  (select count(*) from public.seats s where s.project_id = p.id)                          as seat_count,
  (select count(*) from public.seats s where s.project_id = p.id and s.status = 'open')    as open_seat_count,
  (select count(*) from public.seats s where s.project_id = p.id and s.status = 'filled')  as active_member_count,
  (select count(*) from public.boosts b where b.project_id = p.id)                          as boost_count,
  (select count(*) from public.comments c where c.project_id = p.id)                        as comment_count
from public.projects p
join public.profiles o on o.id = p.owner_id;
