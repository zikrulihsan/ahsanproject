# Ahsan Project

A board for ideas that are meant to be worked on together, plus a portfolio page
for everyone who works on them.

Anyone can leave an idea here as long as it is written down properly, open the
roles they need help with, and let other people take those roles. Each person's
profile doubles as their portfolio: the projects they own and the ones they help
build.

Built on [vinext](https://github.com/cloudflare/vinext) (Next.js on Cloudflare
Workers) with Cloudflare D1 and Drizzle.

## Prerequisites

- Node.js `>=22.13.0`

## Quick start

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # verify the worker build
npm test        # build, then unit and rendered-HTML tests
```

## How the site is put together

| Route | What it is |
| --- | --- |
| `/` | The board — every idea and project, filterable by level, tag and search |
| `/projects/<slug>` | One project: brief, level, team, open roles, discussion |
| `/u/<username>` | One person: their bio, the projects they own, the ones they help build |
| `/new` | Post an idea. The brief is required — an empty project cannot be created |
| `/about`, `/en/about` | The story behind the name, in Indonesian and English |

Sign-in is Sign in with ChatGPT, owned by the hosting platform — see
`app/chatgpt-auth.ts` and the section further down. A profile row is created the
first time somebody signs in (`app/lib/session.ts`).

### The domain rules live in `app/lib/`

- `brief.ts` — the minimum a project must carry before it can exist, plus the
  completeness meter. This is the "no empty ideas" rule.
- `stages.ts` — the levels (`idea → validating → building → live`, plus
  `resting`) and the requirements each one checks against the project itself. A
  project only moves up when it actually meets them.
- `roles.ts` — the kinds of help a project can ask for.
- `data.ts` — every read the pages do, over D1 when it is attached.
- `seed.ts` — the projects the board opens with.

Writes are server actions in `app/actions.ts`. Every owner-only action goes
through `ownedProject()`, which refuses anyone else.

### Running without a database

`getDb()` returns `null` when no D1 binding is attached, and `data.ts` then
serves the read-only seed from `app/lib/seed.ts`. That is what makes local
`npm test` and a build-time render work. Writes refuse with a clear message
instead of failing silently.

## Database

`.openai/hosting.json` declares the D1 binding (`"d1": "DB"`), and
`vite.config.ts` simulates it for local development. Migrations live in
`drizzle/` and the platform applies them on deploy.

```bash
npm run db:generate   # after editing db/schema.ts
npm run db:seed       # after editing app/lib/seed.ts — rewrites drizzle/0001_seed.sql
```

The seed statements are `INSERT OR IGNORE` with fixed ids, so replaying them
never overwrites rows people have since edited.

To work against a real local database, run `npm run dev` once so Miniflare
creates its D1 file under `.wrangler/state/v3/d1/`, then apply the SQL in
`drizzle/` to that file.

## Deployment

The site is served by the Cloudflare Worker in `worker/index.ts`. There is no
static export any more: every route reads request identity or the database, so
the previous Netlify `output: "export"` build no longer applies and its config
has been removed.

Update `siteUrl` in `app/content.ts` when the site moves to its own domain — it
is the base for canonical and Open Graph URLs.

## Workspace auth headers

Signed-in visitors receive both `oai-authenticated-user-id` and
`oai-authenticated-user-email`. Private Sites require every visitor to sign in;
public Sites may also have anonymous visitors, for whom neither header is
present.

The user ID is stable for the same user on the same Site and different across
Sites. Email and name are intended for display or contact purposes.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

`app/chatgpt-auth.ts` wraps all of this:

- `getChatGPTUser()` for optional signed-in UI.
- `requireChatGPTUser(returnTo)` to send anonymous visitors through sign-in.
- `chatGPTSignInPath(returnTo)` / `chatGPTSignOutPath(returnTo)` for links.
- Pages that depend on identity set `export const dynamic = "force-dynamic"`.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths.

SIWC establishes identity only; it does not prove workspace membership. Use the
hosting platform's access policy controls for workspace-wide restrictions, or
enforce explicit server-side membership checks.

## Useful commands

- `npm run dev` — local development
- `npm run build` — verify the vinext build output
- `npm test` — build, then run everything under `tests/`
- `npm run lint` — ESLint
- `npm run db:generate` / `npm run db:seed` — regenerate migrations

## Learn more

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
