-- Ahsan Project: the activity trail.
--
-- A profile could list the projects somebody is on, but not what they had
-- actually done. This records that — automatically, from the writes themselves,
-- so it is a record of work rather than a wall people post to.
--
-- Ten kinds. The list is spelled out in three places: the CHECK below, the
-- CHECK on profiles.activity_hidden, and EVENT_KINDS in app/lib/activity.ts.
-- Keep them in step, the same way STAGES and projects_stage_valid already are.

create table public.events (
  id         bigint      generated always as identity primary key,
  -- Deleting your account takes your trail with it. Leaving events behind that
  -- nobody owns would also leave nobody whose visibility choice to honour.
  actor_id   uuid        not null references public.profiles (id) on delete cascade,
  -- The one reference in this schema that releases instead of cascading.
  -- Together with the title snapshot in `payload`, somebody's history survives
  -- the deletion of a project it happened on.
  project_id bigint      references public.projects (id) on delete set null,
  kind       text        not null,
  payload    jsonb       not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint events_kind_valid check (kind in (
    'project_created', 'project_stage_changed', 'seat_opened', 'seat_applied',
    'seat_filled', 'task_created', 'task_taken', 'task_done',
    'comment_posted', 'boost_given')),
  constraint events_payload_object check (jsonb_typeof(payload) = 'object')
);

create index events_actor_idx   on public.events (actor_id, id desc);
create index events_project_idx on public.events (project_id, id desc);

-- Supporting a project, taking it back, and supporting it again is one
-- decision, not three. record_event() swallows the conflict, so this index
-- quietly de-duplicates rather than failing the boost.
create unique index events_one_boost_per_project
  on public.events (actor_id, project_id) where kind = 'boost_given';

-- Which kinds somebody keeps off their public profile. A deny-list, so the
-- default is "show everything" with no backfill, and a kind added later shows
-- up instead of silently hiding for everyone who never opted into it.
alter table public.profiles
  add column activity_hidden text[] not null default '{}',
  add constraint profiles_activity_hidden_valid check (
    activity_hidden <@ array[
      'project_created', 'project_stage_changed', 'seat_opened', 'seat_applied',
      'seat_filled', 'task_created', 'task_taken', 'task_done',
      'comment_posted', 'boost_given']::text[]
  );

-- ------------------------------------------------------------------ writing

/*
 * The only thing that writes to `events`.
 *
 * Triggers call this rather than the server actions doing it, and that is a
 * security decision more than a tidiness one: if the app wrote events, the
 * table would need `grant insert to authenticated`, and anybody could then
 * POST a fabricated entry into their own trail. This way `events` needs no
 * write grant at all, and a trail nobody can forge is a trail worth reading.
 */
create or replace function public.record_event(
  actor uuid, project bigint, kind text, payload jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- No request behind this statement: a migration, supabase/seed.sql, or psql.
  -- The trail records what people did, so there is nothing here to record.
  -- Without this, seeding eight backdated projects would manufacture eight
  -- "posted an idea" entries dated today.
  if auth.uid() is null then return; end if;
  if actor is null then return; end if;

  insert into public.events (actor_id, project_id, kind, payload)
  values (actor, project, kind, coalesce(payload, '{}'::jsonb));
exception
  -- Recording what happened must never be able to fail the thing that happened.
  when unique_violation or foreign_key_violation or check_violation then return;
end;
$$;

revoke all on function public.record_event(uuid, bigint, text, jsonb) from public, anon, authenticated;

/** Enough of a project to render a trail entry after the project is gone. */
create or replace function public.project_snapshot(project bigint)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select jsonb_build_object('slug', p.slug, 'title', p.title)
     from public.projects p where p.id = project),
    '{}'::jsonb);
$$;

revoke all on function public.project_snapshot(bigint) from public, anon, authenticated;

-- ----------------------------------------------------------------- triggers
--
-- The actor is read from the row, not from auth.uid(). They differ where it
-- matters: when an owner accepts an application, the person who joined is the
-- applicant, and the entry belongs on the applicant's profile.

create or replace function public.record_project_created()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.record_event(new.owner_id, new.id, 'project_created',
    jsonb_build_object('slug', new.slug, 'title', new.title));
  return new;
end;
$$;

create or replace function public.record_project_stage()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.record_event(new.owner_id, new.id, 'project_stage_changed',
    jsonb_build_object('slug', new.slug, 'title', new.title,
                       'from', old.stage, 'to', new.stage));
  return new;
end;
$$;

create or replace function public.record_seat_opened()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  owner uuid;
begin
  select p.owner_id into owner from public.projects p where p.id = new.project_id;
  perform public.record_event(owner, new.project_id, 'seat_opened',
    public.project_snapshot(new.project_id) || jsonb_build_object('role', new.role));
  return new;
end;
$$;

create or replace function public.record_seat_status()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'pending' then
    perform public.record_event(new.user_id, new.project_id, 'seat_applied',
      public.project_snapshot(new.project_id) || jsonb_build_object('role', new.role));
  elsif new.status = 'filled' then
    perform public.record_event(new.user_id, new.project_id, 'seat_filled',
      public.project_snapshot(new.project_id) || jsonb_build_object('role', new.role));
  end if;
  return new;
end;
$$;

create or replace function public.record_task_created()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.record_event(new.created_by, new.project_id, 'task_created',
    public.project_snapshot(new.project_id) || jsonb_build_object('task_title', new.title));
  return new;
end;
$$;

create or replace function public.record_task_taken()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.record_event(new.assignee_id, new.project_id, 'task_taken',
    public.project_snapshot(new.project_id) || jsonb_build_object('task_title', new.title));
  return new;
end;
$$;

create or replace function public.record_task_done()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.record_event(coalesce(new.assignee_id, auth.uid()), new.project_id, 'task_done',
    public.project_snapshot(new.project_id) || jsonb_build_object('task_title', new.title));
  return new;
end;
$$;

create or replace function public.record_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- The body stays out of the payload: the trail says somebody joined the
  -- discussion and links to it, rather than republishing what they said.
  perform public.record_event(new.author_id, new.project_id, 'comment_posted',
    public.project_snapshot(new.project_id));
  return new;
end;
$$;

create or replace function public.record_boost()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.record_event(new.user_id, new.project_id, 'boost_given',
    public.project_snapshot(new.project_id));
  return new;
end;
$$;

revoke all on function
  public.record_project_created(), public.record_project_stage(),
  public.record_seat_opened(), public.record_seat_status(),
  public.record_task_created(), public.record_task_taken(),
  public.record_task_done(), public.record_comment(), public.record_boost()
  from public, anon, authenticated;

create trigger projects_record_created after insert on public.projects
  for each row execute function public.record_project_created();

create trigger projects_record_stage after update on public.projects
  for each row when (old.stage is distinct from new.stage)
  execute function public.record_project_stage();

create trigger seats_record_opened after insert on public.seats
  for each row execute function public.record_seat_opened();

create trigger seats_record_status after update on public.seats
  for each row when (old.status is distinct from new.status)
  execute function public.record_seat_status();

create trigger tasks_record_created after insert on public.tasks
  for each row execute function public.record_task_created();

create trigger tasks_record_taken after update on public.tasks
  for each row when (old.assignee_id is distinct from new.assignee_id and new.assignee_id is not null)
  execute function public.record_task_taken();

create trigger tasks_record_done after update on public.tasks
  for each row when (old.status is distinct from new.status and new.status = 'done')
  execute function public.record_task_done();

create trigger comments_record after insert on public.comments
  for each row execute function public.record_comment();

create trigger boosts_record after insert on public.boosts
  for each row execute function public.record_boost();

-- ------------------------------------------------------------------ reading

/** Whether this person still shows this kind of entry in public. */
create or replace function public.event_is_visible(actor uuid, kind text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select not exists (
    select 1 from public.profiles p
    where p.id = actor and kind = any (p.activity_hidden));
$$;

grant execute on function public.event_is_visible(uuid, text) to anon, authenticated;

alter table public.events enable row level security;

/*
 * Hiding a kind is a privacy control, so it has to be a database rule. Doing it
 * in the query would leave GET /rest/v1/events?actor_id=eq.… wide open, and the
 * anon key is public by design.
 *
 * You always see your own trail whole, including the parts you have hidden —
 * the profile then marks those as yours alone.
 */
create policy "a trail is public as far as its owner allows"
  on public.events for select
  to anon, authenticated
  using (
    actor_id = (select auth.uid())
    or public.event_is_visible(actor_id, kind)
  );

-- Read only, on purpose. No insert, update or delete policy and no write grant:
-- record_event() is the only writer, and a trail you can edit proves nothing.
grant select on public.events to anon, authenticated;
