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
  title: "Kotak masuk — Ahsan Project",
  description: "Kabar dari project yang kamu ikuti, dan lamaran dari kedua sisinya.",
  robots: { index: false },
};

/*
 * Proposals remain as a small history instead of taking over the task or role
 * row, so one target can collect several people's offers at once.
 */
const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu jawaban",
  accepted: "Diterima",
  declined: "Tidak dilanjutkan",
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
          <span /> Kotak masuk
        </p>
        <h1>Kabar dan lamaran.</h1>
        <p className="lede">
          Yang bergerak di project yang kamu ikuti, yang menunggu jawabanmu, dan yang sedang kamu
          tunggu jawabannya — di satu tempat.
        </p>

        {notices.length > 0 ? (
          <section aria-labelledby="notices-heading">
            <h2 id="notices-heading" className="section-title">
              Kabar untukmu {unseen > 0 ? `(${unseen} baru)` : ""}
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
                <SubmitButton className="quiet" pendingLabel="Sebentar…">
                  Tandai sudah dibaca
                </SubmitButton>
              </form>
            ) : null}
          </section>
        ) : null}

        {followed.length > 0 ? (
          <section aria-labelledby="followed-heading">
            <h2 id="followed-heading" className="section-title">
              Dari yang kamu ikuti
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
            Menunggu jawabanmu {incoming.length > 0 ? `(${incoming.length})` : ""}
          </h2>

          {incoming.length === 0 ? (
            <p className="muted">
              Belum ada yang mau ikut membantu. Project yang menyebut bantuannya jauh lebih mungkin
              dapat teman mengerjakan — buka satu di halaman projectmu.
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
                    <SubmitButton name="decision" value="terima" pendingLabel="Sebentar…">
                      Terima
                    </SubmitButton>
                    <SubmitButton className="quiet" name="decision" value="tolak">Tolak</SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="mine-heading">
          <h2 id="mine-heading" className="section-title">
            Yang kamu ikuti sendiri
          </h2>

          {mine.length === 0 ? (
            <p className="muted">
              Kamu belum ikut di mana-mana.{" "}
              <Link href="/kolaborasi?needs=open">Lihat yang sedang butuh tangan</Link>.
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
  const title = notice.payload.title || "project yang sudah dihapus";
  const slug = notice.payload.slug;
  const project = slug ? (
    <Link href={`/projects/${slug}`}>{title}</Link>
  ) : (
    <strong>{title}</strong>
  );

  if (notice.kind === "application_accepted") {
    return (
      <p>
        Lamaranmu diterima — kamu sekarang {target ? <strong>{target}</strong> : "anggota"} di{" "}
        {project}.
      </p>
    );
  }

  if (notice.kind === "proposal_accepted") {
    return <p>Proposalmu untuk <strong>{target || "kontribusi"}</strong> diterima di {project}.</p>;
  }

  if (notice.kind === "application_declined") {
    return (
      <p>
        Peran {target ? <strong>{target}</strong> : ""} di {project} dibuka lagi, jadi lamaranmu tidak
        dilanjutkan. Masih banyak yang butuh orang.
      </p>
    );
  }

  if (notice.kind === "proposal_declined") {
    return <p>Proposalmu untuk <strong>{target || "kontribusi"}</strong> di {project} belum dilanjutkan.</p>;
  }

  return <p>Ada kabar dari {project}.</p>;
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
              mau bantu mengerjakan <strong>{application.targetLabel}</strong>
            </>
          ) : (
            <>
              <strong>{application.targetLabel}</strong> di{" "}
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
