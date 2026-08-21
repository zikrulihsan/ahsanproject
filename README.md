# Ahsan Project

A board for ideas that are meant to be worked on together, plus a portfolio page
for everyone who works on them.

Anyone can leave an idea here as long as it is written down properly, open the
roles they need help with, and let other people take those roles. Each person's
profile doubles as their portfolio: the projects they own and the ones they help
build.

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
| `/` | The board — every idea and project, filterable by level, tag and search |
| `/projects/<slug>` | One project: brief, level, team, open roles, discussion |
| `/u/<username>` | One person: their bio, the projects they own, the ones they help build |
| `/new` | Post an idea. The brief is required — an empty project cannot be created |
| `/signin`, `/signup` | Email and password, through Supabase Auth |
| `/about`, `/en/about` | The story behind the name, in Indonesian and English |

### Where the rules live

- `app/lib/brief.ts` — the minimum a project must carry before it can exist,
  plus the completeness meter. This is the "no empty ideas" rule.
- `app/lib/stages.ts` — the levels (`idea → validating → building → live`, plus
  `resting`) and what each one requires. No level asks for a team: working alone
  is not a lesser project. What they ask for is evidence the work has moved.
- `app/lib/roles.ts` — the kinds of help a project can ask for.
- `app/lib/tasks.ts` — the three task statuses and what a task must carry.
- `app/lib/activity.ts` — the ten kinds of trail entry and how each one reads
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
would also let them retitle it and hand it to somebody else.

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
