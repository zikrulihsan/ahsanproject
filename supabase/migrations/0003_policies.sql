-- Ahsan Project: row level security.
--
-- The board is public to read. Everything that writes is pinned to the person
-- doing it: you edit your own profile, your own projects, your own comments and
-- your own support. Seats are the owner's to open and close; taking one goes
-- through apply_for_seat/decide_seat in 0002_functions.sql.
--
-- These policies are the real authorization boundary. The checks in the server
-- actions exist to give people a readable error, not to keep them out.

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.seats    enable row level security;
alter table public.comments enable row level security;
alter table public.boosts   enable row level security;

-- ------------------------------------------------------------------ profiles

create policy "profiles are public"
  on public.profiles for select
  to anon, authenticated
  using (true);

-- The sign-up trigger already creates the row. This exists so a session whose
-- profile somehow went missing can put it back for itself, and nothing else.
create policy "people create their own profile"
  on public.profiles for insert
  to authenticated
  with check (id = (select auth.uid()));

create policy "people edit their own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ------------------------------------------------------------------ projects

create policy "projects are public"
  on public.projects for select
  to anon, authenticated
  using (true);

create policy "people post their own projects"
  on public.projects for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy "owners edit their project"
  on public.projects for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "owners remove their project"
  on public.projects for delete
  to authenticated
  using (owner_id = (select auth.uid()));

-- --------------------------------------------------------------------- seats

create policy "seats are public"
  on public.seats for select
  to anon, authenticated
  using (true);

create policy "owners open seats on their project"
  on public.seats for insert
  to authenticated
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = (select auth.uid())
    )
  );

-- Editing the ask itself. Taking a seat is deliberately not reachable here:
-- apply_for_seat() is the only way in, so an applicant cannot rewrite the role
-- or the brief on their way through.
create policy "owners edit seats on their project"
  on public.seats for update
  to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = (select auth.uid())
    )
  );

create policy "owners close seats on their project"
  on public.seats for delete
  to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = (select auth.uid())
    )
  );

-- ------------------------------------------------------------------ comments

create policy "comments are public"
  on public.comments for select
  to anon, authenticated
  using (true);

create policy "people write as themselves"
  on public.comments for insert
  to authenticated
  with check (author_id = (select auth.uid()));

create policy "people delete their own comment"
  on public.comments for delete
  to authenticated
  using (author_id = (select auth.uid()));

-- -------------------------------------------------------------------- boosts

create policy "support is public"
  on public.boosts for select
  to anon, authenticated
  using (true);

create policy "people support as themselves"
  on public.boosts for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "people take back their own support"
  on public.boosts for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- --------------------------------------------------------------------- grants
--
-- RLS narrows what a role may touch; it does not hand out the privilege in the
-- first place. Supabase grants these by default on hosted projects — spelled
-- out here so a database built from these files alone behaves the same.

grant usage on schema public to anon, authenticated;

grant select on
  public.profiles, public.projects, public.seats, public.comments,
  public.boosts, public.project_overview
  to anon, authenticated;

grant insert, update            on public.profiles to authenticated;
grant insert, update, delete    on public.projects to authenticated;
grant insert, update, delete    on public.seats    to authenticated;
grant insert, delete            on public.comments to authenticated;
grant insert, delete            on public.boosts   to authenticated;
