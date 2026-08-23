# Ahsan Project

Where a project meets the people who want to help build it.

Show what you are making — an idea, a half-built thing, or something people
already use. Say what it is working on right now, write down its journey as it
goes, and name the help you are looking for. Anyone else can follow along or
join in. Each person's profile is the work with their name on it: what they are
building, and what they helped build.

Next.js on Netlify, with Supabase for both the database and sign-in.

## Prerequisites

- Node.js `>=22.13.0`
- A Supabase project (free tier is plenty)

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL and anon key
npm run dev                  # http://localhost:3000
```

Without `.env.local` the site still runs: it serves the read-only seed from
`app/lib/seed.ts`, so you can work on the pages without a database. Signing in
and everything that writes will say so rather than failing quietly.

## Setting up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run the files in `supabase/migrations/` **in order**, in the SQL editor. The
   deploy tolerates running ahead of the database — a page loses the feature a
   missing table feeds rather than falling over, and says so in the server log —
   but nothing new works until these are applied:
   - `0001_schema.sql` — tables, constraints, and the `project_overview` view
   - `0002_functions.sql` — the sign-up trigger and the two seat transitions
   - `0003_policies.sql` — row level security
   - `0004_access_and_tasks.sql` — project access levels and the task list
   - `0005_activity.sql` — the activity trail
   - `0006_level_colour.sql` — drops the decorative accent colour
   - `0007_open_roles.sql` — the roles a project is asking for, on the overview
   - `0008_notices.sql` — telling an applicant what was decided
   - `0009_admins_decide_again.sql` — gives admins back the seat decisions
     0008 accidentally took from them
   - `0010_showcase.sql` — what a project is working on now, its journey,
     following, and four levels instead of five
3. Copy the project URL and the **anon** key from Project Settings → API into
   `.env.local`. Never put the `service_role` key in this app; it bypasses every
   policy.
4. Sign up through the site with your own email.
5. Optional: open `supabase/seed.sql`, change `owner_email` at the top to that
   same address, and run it. That imports the starting projects under your
   account.

Email confirmation is on by default in Supabase. The link it sends lands on
`/auth/confirm`, which exchanges the token for a session. If you turn
confirmation off, sign-up signs people straight in instead.

## How the site is put together

| Route | What it is |
| --- | --- |
| `/` | The board — five lanes (`?lane=`), narrowed by level, topic, role, search |
| `/projects/<slug>` | One project: the story, what it is doing now, the help it wants, its journey |
| `/u/<username>` | One person: what they are building, what they helped build, their trail |
| `/new` | Show a project. The brief is required — an empty project cannot be created |
| `/signin`, `/signup` | Email and password, through Supabase Auth |
| `/about`, `/en/about` | The story behind the name, in Indonesian and English |

### Where the rules live

- `app/lib/brief.ts` — the minimum a project must carry before it can exist,
  plus the completeness meter. This is the "no empty ideas" rule.
- `app/lib/stages.ts` — the levels (`idea → building → live`, plus `resting`)
  and what each one requires. No level asks for a team: working alone is not a
  lesser project. What they ask for is evidence the work has moved — a link, or
  the line saying what is being worked on right now.
- `app/lib/feed.ts` — the board's lanes, and how the "untuk kamu" lane is
  arranged. Pure, so the unit tests read it directly.
- `app/lib/updates.ts` — the journey a project writes for itself.
- `app/lib/roles.ts` — the kinds of help a project can ask for.
- `app/lib/tasks.ts` — the three task statuses and what a task must carry.
- `app/lib/activity.ts` — the eleven kinds of trail entry and how each one reads
  as a sentence.
- `app/lib/access.ts` — owner, admin, member. Admins run the work — seats,
  applications, the task list. The project itself — the brief, the level,
  deleting it — stays with the owner.
- `app/lib/data.ts` — every read the pages do.
- `app/actions.ts` — every write, as server actions.

**Authorization is the database's job.** The policies in
`supabase/migrations/0003_policies.sql` decide who may read and write; the
checks in the server actions exist to turn a refusal into a readable sentence.
Taking a seat goes through `apply_for_seat()` and `decide_seat()` rather than a
plain update, so an applicant cannot rewrite the role on their way in. Moving a
task goes through `move_task()` for the same reason: row level security is row
level, not column level, so a policy letting the assignee update their own task
would also let them retitle it and hand it to somebody else. `set_now()` is the
third of the same shape — an admin may rewrite the one line saying what the
project is working on, and nothing else on that row.

`projects.now_updated_at` is written by a trigger for the same reason the trail
is: it is the freshness people read to decide whether a project is still alive,
so it must not be something a request can set. `updates` is the other half of
that pair — the journey in the project's own words. It has no UPDATE policy and
no update grant on purpose: an entry can be written and removed, never quietly
reworded after people have read it.

The activity trail is written by triggers, never by the app, and that is a
security decision rather than a tidiness one: if server actions wrote events,
the table would need `grant insert to authenticated`, and anybody could then
POST a fabricated entry into their own trail. As it stands `events` has no write
grant at all — `record_event()` is the only writer, and it returns early when
`auth.uid()` is null, so a migration or `supabase/seed.sql` cannot manufacture
history that never happened.

Hiding a kind of entry is enforced by the SELECT policy on `events`, not by the
query. Filtering in `listPersonActivity()` would leave
`GET /rest/v1/events?actor_id=eq.…` wide open, and the anon key is public by
design.

Two rules in `0004` are worth knowing before changing anything there.
`can_manage_project()` is SECURITY DEFINER because it reads `seats` and is used
inside the policies on `seats` — as INVOKER it would recurse forever. And
`project_overview` is dropped and recreated rather than replaced, because
`create or replace view` keeps the old reloptions silently, so a replacement
that forgets `security_invoker = true` would stop honouring RLS altogether.

## Tests

```bash
npm test        # builds, then runs everything under tests/
npm run test:unit   # just the pure logic, no build
```

`tests/rendered-html.test.mjs` runs the built site with no Supabase credentials,
so it covers every page as a guest. `tests/supabase.test.mjs` is a read-only
smoke test that skips unless credentials are present — it is safe to point at
production.

The policies have their own suite, which needs a scratch PostgreSQL 16:

```bash
createdb ahsan_test
psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f supabase/local/auth-shim.sql
for f in supabase/migrations/*.sql; do psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f "$f"; done
psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f supabase/tests/policies.sql
```

`supabase/local/auth-shim.sql` is the smallest slice of Supabase's `auth` schema
the migrations touch, so a plain PostgreSQL can run them. It is for development
only — never run it against a hosted project.

## Deployment

Netlify, using `@netlify/plugin-nextjs` (declared in `netlify.toml`). Set these
in Site settings → Environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL` — the deployed origin, so confirmation emails point back
  at the right place

Then add that same origin to Supabase under Authentication → URL Configuration,
including `<origin>/auth/confirm` as a redirect URL.

Update `siteUrl` in `app/content.ts` when the site moves to its own domain — it
is the base for canonical and Open Graph URLs.

## Useful commands

- `npm run dev` — local development
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run db:seed` — regenerate `supabase/seed.sql` from `app/lib/seed.ts`

## Learn more

- [Supabase docs](https://supabase.com/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
