import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { isInvitingLabel, listGitHubIssues, parseGitHubRepositoryUrl, type GitHubIssue } from "../lib/github";
import { tx, type Locale } from "../lib/locale";
import { Arrow } from "./shell";
import { timeAgo } from "./pieces";

/**
 * Open work in a project's own repository, beside the roles it is asking for.
 *
 * A seat answers "what part would I play"; an issue answers "what could I do
 * this afternoon". Only projects that explicitly opted in to GitHub
 * contributions reach here — the badge is a promise, and this is the promise
 * kept in a form somebody can act on without leaving to go read a repository.
 *
 * Nothing written here ever reaches `tasks`. That table is the project's own
 * record, written by its managers and counted into the trail that makes a
 * portfolio claim checkable; issues belong to a repository we only read, so
 * they sit next to that record rather than inside it.
 */
export async function GitHubIssueList({ repoUrl, locale }: { repoUrl: string; locale: Locale }) {
  // Keep GitHub out of the build. `generateStaticParams` prerenders up to
  // thirty-two project pages, and thirty-two upstream requests in one deploy
  // would spend most of an unauthenticated hour before a single visitor
  // arrived. Waiting for a request costs nothing here: the section streams in
  // behind Suspense, and the read itself is shared through the cache below.
  await connection();
  // Parse rather than concatenate. The database constraint behind the opt-in
  // makes a malformed value unlikely, but every link below leaves this site,
  // and a normalised URL is the difference between a link to GitHub and a
  // broken relative one built from whatever the column happened to hold.
  const repository = parseGitHubRepositoryUrl(repoUrl);
  if (!repository) return null;

  const issues = await openIssues(repository.url);
  if (issues.length === 0) return null;

  return (
    <section className="github-issues" aria-labelledby="github-issues-heading">
      <h2 id="github-issues-heading">{tx(locale, "Bisa dikerjakan sekarang", "Open to pick up now")}</h2>
      <p className="muted">
        {tx(
          locale,
          "Issue yang sedang terbuka di repositori proyek ini. Ambil satu, atau tanyakan dulu di issue-nya.",
          "Issues currently open in this project's repository. Take one, or ask in the issue first.",
        )}
      </p>

      <ul className="github-issue-list">
        {issues.map((issue) => (
          <li key={issue.number}>
            <a href={issue.url} target="_blank" rel="noreferrer">
              <span className="github-issue-title">{issue.title}</span>
              <Arrow diagonal />
            </a>
            <p className="github-issue-meta">
              <span className="github-issue-number">#{issue.number}</span>
              {issue.createdAt ? <span>{tx(locale, "dibuka ", "opened ")}{timeAgo(issue.createdAt, locale)}</span> : null}
              {issue.comments > 0 ? (
                <span>{tx(locale, `${issue.comments} komentar`, `${issue.comments} comments`)}</span>
              ) : null}
            </p>
            {issue.labels.length > 0 ? (
              <p className="github-issue-labels">
                {issue.labels.map((label) => (
                  <span key={label} className={`github-issue-label ${isInvitingLabel(label) ? "is-inviting" : ""}`}>
                    {label}
                  </span>
                ))}
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      <a className="github-issue-all" href={`${repository.url}/issues`} target="_blank" rel="noreferrer">
        {tx(locale, "Lihat semua issue di GitHub", "See every issue on GitHub")} <Arrow diagonal />
      </a>
    </section>
  );
}

/**
 * One read per repository, shared by everybody looking at that project.
 *
 * The locale stays out of this on purpose: it belongs to the markup above, and
 * including it here would double the requests this site makes to GitHub for
 * exactly the same five issues.
 */
async function openIssues(repoUrl: string): Promise<GitHubIssue[]> {
  "use cache";
  cacheLife("github");
  return listGitHubIssues(repoUrl);
}
