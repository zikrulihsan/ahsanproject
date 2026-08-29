import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "../components/shell";
import { shareCard } from "../content";

const title = "Privacy Policy — Ahsan Project";
const description =
  "What Ahsan Project collects, what's public, and how your data is used and protected.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/privacy" },
  openGraph: shareCard({ title, description, url: "/privacy" }),
};

const LAST_UPDATED = "August 29, 2026";

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader returnTo="/privacy" />

      <main id="main-content" className="page-narrow legal-content">
        <p className="eyebrow">
          <span /> Privacy Policy
        </p>
        <h1>Your data, and who gets to see it.</h1>
        <p className="lede">
          Ahsan Project is both a collaboration board and a portfolio: people post project ideas,
          open roles, and work on them together, while each profile at <code>/u/username</code>{" "}
          shows that work to the public. Because visibility is the whole point of the product, this
          page says plainly what is public, what stays private, and where your data goes — not
          boilerplate legal language.
        </p>

        <h2>1. What we collect</h2>

        <h3>Account</h3>
        <p>
          You sign up with email and password, or with Google. Authentication is handled entirely by
          Supabase Auth — this app never stores your password in plain text, and if you sign in with
          Google, all we receive is your name, email, and Google account ID, under whatever
          permissions you grant at that moment (see section 4). Your account email is used for
          sign-in and system notices — it is never shown publicly unless you separately add it as a{" "}
          <em>public email</em> on your profile.
        </p>

        <h3>Profile (public, and optional)</h3>
        <p>
          Every field on <Link href="/account/profile">/account/profile</Link> besides your name is
          yours to fill in or skip: profession, one-line intro, short bio, skills, fields of
          expertise, years of experience, and links (website, GitHub, LinkedIn, X, résumé, public
          email). Once filled in, these show on your public profile page and can be found through the{" "}
          <Link href="/people">People</Link> directory.
        </p>

        <h3>Projects</h3>
        <p>
          The link you paste and what your page says about itself (its name, description and icon,
          which we read once when you add it), what you say is interesting about the project,
          tagline, brief (problem, solution, audience), tags, stage, what you are working on right
          now, the journey you post, open roles, and a logo — all of this is public the moment a
          project is created, because the product exists to make work visible. Do not put anything
          here you would not want public.
        </p>

        <h3>Collaboration</h3>
        <p>
          Role applications (seats), tasks taken and completed, comments on project pages, boosts of
          support, and follows are all recorded so collaboration can actually happen and be seen by
          others.
        </p>

        <h3>Activity trail</h3>
        <p>
          Certain events are recorded automatically by the system as they happen — a project created,
          a stage changed, a role opened or filled, a task completed, a comment, a boost, an update
          posted — and shown as a trail on your profile. This is what sets the portfolio here apart:
          the claims are not typed in by you, they are logged by the system as they occur. You can
          hide specific kinds of events from your public trail in your profile settings; hiding one
          does not delete the record, it only keeps it from other visitors.
        </p>

        <h3>Inbox</h3>
        <p>
          When your application is accepted or declined, one private notice is sent to your inbox at{" "}
          <Link href="/inbox">/inbox</Link> — only you can see it, and it is marked read when you
          open it with the button there, never automatically.
        </p>

        <h3>GitHub import</h3>
        <p>
          If you paste a public repository URL while creating a project, we read that repository&rsquo;s
          public metadata directly from GitHub — its name, description, topics, and README — to
          prefill the form. This does not require you to sign in with GitHub, does not touch anything
          private, and is not stored on our servers unless you save the result as a project.
        </p>

        <h3>Technical data</h3>
        <p>
          Your session is kept with a cookie managed by Supabase Auth, plus one short-lived cookie
          (the PKCE verifier) during Google sign-in. This site sets no advertising or third-party
          analytics cookies.
        </p>

        <h2>2. Public vs. private, at a glance</h2>
        <ul>
          <li>
            <strong>Always public:</strong> projects and their content, whichever profile fields you
            fill in, your activity trail (except kinds you hide), comments, and follows.
          </li>
          <li>
            <strong>Always private:</strong> your account email (unless you choose to show it as a
            public email), your password, and the contents of your inbox.
          </li>
        </ul>

        <h2>3. What this data is used for</h2>
        <p>
          Running the product features you already see: showing projects and profiles, matching
          people to roles, sending application notices, and building your activity trail. It is not
          sold, and it is not used for targeted advertising.
        </p>

        <h2>4. Who we share it with</h2>
        <p>Only the providers that run this site, nothing more:</p>
        <ul>
          <li>
            <strong>Supabase</strong> — the database and authentication, including password storage
            and sessions.
          </li>
          <li>
            <strong>Google</strong> — only if you choose to sign in with a Google account.
          </li>
          <li>
            <strong>Netlify</strong> — hosting for this app.
          </li>
          <li>
            <strong>GitHub API</strong> — only when you use the repository import feature, to read
            the public metadata of the repository you point it at.
          </li>
        </ul>

        <h2>5. Security</h2>
        <p>
          Access to data is filtered directly in the database with Postgres row level security, not
          only in application code — who may read and write which rows is decided by Supabase, and
          the code on top of it only turns a refusal into a readable sentence. Sensitive actions like
          deciding an application or moving a task go through restricted database functions rather
          than a plain update.
        </p>

        <h2>6. Your controls</h2>
        <p>
          You can edit or clear your profile fields at any time, hide specific kinds of activity from
          your trail, delete a project you own, and sign out. Deleting your account entirely is not
          yet self-service on this site — to request it, or for any other question about your data,
          reach us on Email (zikrulihsanmd@gmail.com)
          .
        </p>

        <h2>7. Children</h2>
        <p>
          This site is not directed at children under 13, and we do not knowingly collect data from
          them.
        </p>

        <h2>8. Changes to this policy</h2>
        <p>
          Ahsan Project is under active development, so this page will change as features do. The
          date below always reflects the latest version.
        </p>

        <p className="muted" style={{ marginTop: 40 }}>
          Last updated: {LAST_UPDATED}.
        </p>
      </main>

      <SiteFooter />
    </>
  );
}
