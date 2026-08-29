import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { decideProposal, markNoticesSeen } from "../actions";
import { SiteFooter, SiteHeader } from "../components/shell";
import { initials, timeAgo } from "../components/pieces";
import {
  listFollowedUpdates,
  listIncomingApplications,
  listMyApplications,
  listNotices,
  type ApplicationView,
  type NoticeView,
} from "../lib/data";
import { roleLabel } from "../lib/roles";
import { currentViewer } from "../lib/session";
import { signInPath } from "../lib/urls";
import { SubmitButton } from "../components/submit-button";

/*
 * Allowed to block.
 *
 * This page decides what to render — or whether to redirect — from who is
 * signed in, and there is no useful shell to show before that answer arrives:
 * a visitor who is about to be sent elsewhere should not watch this page paint
 * first. Nothing here is cacheable and nothing here is indexed, so blocking on
 * the session costs a request that was always going to be per-visitor.
 */
export const instant = false;

export const metadata: Metadata = {
  title: "Inbox — Ahsan Project",
  description: "Updates from projects you follow and applications in both directions.",
  robots: { index: false },
};

/*
 * Proposals remain as a small history instead of taking over the task or role
 * row, so one target can collect several people's offers at once.
 */
const STATUS_LABEL: Record<string, string> = {
  pending: "Awaiting a response",
  accepted: "Accepted",
  declined: "Not moving forward",
};

export default async function InboxPage() {
  const viewer = await currentViewer();
  if (!viewer) redirect(signInPath("/inbox"));

  const [incoming, mine, notices, followed] = await Promise.all([
    listIncomingApplications(viewer.id),
    listMyApplications(viewer.id),
    listNotices(viewer.id),
    listFollowedUpdates(viewer.id),
  ]);
  const unseen = notices.filter((notice) => !notice.seen).length;

  return (
    <>
      <SiteHeader returnTo="/inbox" />

      <main id="main-content" className="page-narrow inbox">
        <p className="eyebrow">
          <span /> Inbox
        </p>
        <h1>Updates and applications.</h1>
        <p className="lede">
          Everything moving in the projects you follow, what awaits your response, and what you are
          waiting to hear back about—in one place.
        </p>

        {notices.length > 0 ? (
          <section aria-labelledby="notices-heading">
            <h2 id="notices-heading" className="section-title">
              Updates for you {unseen > 0 ? `(${unseen} new)` : ""}
            </h2>

            <ul className="notice-list">
              {notices.map((notice) => (
                <li key={notice.id} className={notice.seen ? "" : "is-new"}>
                  <NoticeLine notice={notice} />
                  <small>{timeAgo(notice.createdAt)}</small>
                </li>
              ))}
            </ul>

            {unseen > 0 ? (
              <form action={markNoticesSeen}>
                <SubmitButton className="quiet" pendingLabel="Please wait…">
                  Mark as read
                </SubmitButton>
              </form>
            ) : null}
          </section>
        ) : null}

        {followed.length > 0 ? (
          <section aria-labelledby="followed-heading">
            <h2 id="followed-heading" className="section-title">
              From projects you follow
            </h2>
            <ul className="followed-list">
              {followed.map((update) => (
                <li key={update.id}>
                  <p className="followed-project">
                    {update.project.slug ? (
                      <Link href={`/projects/${update.project.slug}`}>{update.project.title}</Link>
                    ) : (
                      <strong>{update.project.title}</strong>
                    )}
                  </p>
                  <h3>{update.title}</h3>
                  {update.body ? <p className="followed-body">{update.body}</p> : null}
                  <small>{timeAgo(update.createdAt)}</small>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="incoming-heading">
          <h2 id="incoming-heading" className="section-title">
            Awaiting your response {incoming.length > 0 ? `(${incoming.length})` : ""}
          </h2>

          {incoming.length === 0 ? (
            <p className="muted">
              Nobody has applied to help yet. Projects that clearly name the help they need are much
              more likely to find collaborators—open one from your project page.
            </p>
          ) : (
            <ul className="application-list">
              {incoming.map((application) => (
                <li key={application.proposalId}>
                  <ApplicationHead application={application} showApplicant />
                  {application.pitch ? <blockquote>{application.pitch}</blockquote> : null}
                  <form action={decideProposal}>
                    <input type="hidden" name="slug" value={application.project.slug} />
                    <input type="hidden" name="proposalId" value={application.proposalId} />
                    <SubmitButton name="decision" value="terima" pendingLabel="Please wait…">
                      Accept
                    </SubmitButton>
                    <SubmitButton className="quiet" name="decision" value="tolak">Decline</SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="mine-heading">
          <h2 id="mine-heading" className="section-title">
            Your applications
          </h2>

          {mine.length === 0 ? (
            <p className="muted">
              You have not joined anything yet.{" "}
              <Link href="/kolaborasi?needs=open">See projects that need a hand</Link>.
            </p>
          ) : (
            <ul className="application-list">
              {mine.map((application) => (
                <li key={application.proposalId}>
                  <ApplicationHead application={application} />
                  {application.pitch ? <blockquote>{application.pitch}</blockquote> : null}
                  <p className={`application-status status-${application.status}`}>
                    {STATUS_LABEL[application.status] ?? application.status}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

/**
 * One line of news, built from the notice's own snapshot of the project.
 *
 * The slug can be empty if the project was deleted after the decision — the
 * sentence still reads, it just stops being a link.
 */
function NoticeLine({ notice }: { notice: NoticeView }) {
  const target = notice.payload.target || (notice.payload.role ? roleLabel(notice.payload.role) : "");
  const title = notice.payload.title || "deleted project";
  const slug = notice.payload.slug;
  const project = slug ? (
    <Link href={`/projects/${slug}`}>{title}</Link>
  ) : (
    <strong>{title}</strong>
  );

  if (notice.kind === "application_accepted") {
    return (
      <p>
        Your application was accepted—you are now {target ? <strong>{target}</strong> : "a member"} of{" "}
        {project}.
      </p>
    );
  }

  if (notice.kind === "proposal_accepted") {
    return <p>Your proposal for <strong>{target || "a contribution"}</strong> was accepted on {project}.</p>;
  }

  if (notice.kind === "application_declined") {
    return (
      <p>
        The {target ? <strong>{target}</strong> : "role"} on {project} has reopened, so your application
        is not moving forward. There are plenty of other projects looking for help.
      </p>
    );
  }

  if (notice.kind === "proposal_declined") {
    return <p>Your proposal for <strong>{target || "a contribution"}</strong> on {project} is not moving forward.</p>;
  }

  return <p>There is an update from {project}.</p>;
}

function ApplicationHead({
  application,
  showApplicant = false,
}: {
  application: ApplicationView;
  showApplicant?: boolean;
}) {
  return (
    <div className="application-head">
      {showApplicant && application.person ? (
        <span className="avatar" aria-hidden="true">
          {initials(application.person.name)}
        </span>
      ) : null}
      <div>
        <p className="application-title">
          {showApplicant && application.person ? (
            <>
              <Link href={`/u/${application.person.username}`}>{application.person.name}</Link>{" "}
              wants to help with <strong>{application.targetLabel}</strong>
            </>
          ) : (
            <>
              <strong>{application.targetLabel}</strong> on{" "}
              <Link href={`/projects/${application.project.slug}`}>
                {application.project.title}
              </Link>
            </>
          )}
        </p>
        <p className="application-meta">
          {showApplicant ? (
            <Link href={`/projects/${application.project.slug}`}>{application.project.title}</Link>
          ) : null}
          {showApplicant ? " · " : ""}
          {timeAgo(application.createdAt)}
        </p>
      </div>
    </div>
  );
}
