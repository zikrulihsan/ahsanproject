import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { decideSeat, markNoticesSeen } from "../actions";
import { SiteFooter, SiteHeader } from "../components/shell";
import { initials, timeAgo } from "../components/pieces";
import {
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

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kotak masuk — Ahsan Project",
  description: "Lamaran yang menunggu jawabanmu, dan lamaran yang kamu kirim.",
  robots: { index: false },
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu jawaban",
  filled: "Diterima",
  open: "Dibuka lagi",
};

export default async function InboxPage() {
  const viewer = await currentViewer();
  if (!viewer) redirect(signInPath("/inbox"));

  const [incoming, mine, notices] = await Promise.all([
    listIncomingApplications(viewer.id),
    listMyApplications(viewer.id),
    listNotices(viewer.id),
  ]);
  const unseen = notices.filter((notice) => !notice.seen).length;

  return (
    <>
      <SiteHeader returnTo="/inbox" />

      <main className="page-narrow inbox">
        <p className="eyebrow">
          <span /> Kotak masuk
        </p>
        <h1>Lamaran.</h1>
        <p className="lede">
          Semua yang menunggu jawabanmu, dan semua yang sedang kamu tunggu jawabannya — di satu
          tempat, tanpa perlu buka proyeknya satu per satu.
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

        <section aria-labelledby="incoming-heading">
          <h2 id="incoming-heading" className="section-title">
            Menunggu jawabanmu {incoming.length > 0 ? `(${incoming.length})` : ""}
          </h2>

          {incoming.length === 0 ? (
            <p className="muted">
              Belum ada yang melamar ke proyekmu. Proyek yang membuka peran jauh lebih mungkin
              dapat teman mengerjakan — cek <Link href="/new">idemu</Link> dan buka perannya.
            </p>
          ) : (
            <ul className="application-list">
              {incoming.map((application) => (
                <li key={application.seatId}>
                  <ApplicationHead application={application} showApplicant />
                  {application.pitch ? <blockquote>{application.pitch}</blockquote> : null}
                  <form action={decideSeat}>
                    <input type="hidden" name="slug" value={application.project.slug} />
                    <input type="hidden" name="seatId" value={application.seatId} />
                    <SubmitButton name="decision" value="terima" pendingLabel="Sebentar…">
                      Terima
                    </SubmitButton>
                    <SubmitButton className="quiet" name="decision" value="tolak">
                      Buka lagi
                    </SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="mine-heading">
          <h2 id="mine-heading" className="section-title">
            Lamaran yang kamu kirim
          </h2>

          {mine.length === 0 ? (
            <p className="muted">
              Kamu belum melamar ke mana-mana. <Link href="/?sort=dibutuhkan">Lihat proyek yang
              paling butuh orang</Link>.
            </p>
          ) : (
            <ul className="application-list">
              {mine.map((application) => (
                <li key={application.seatId}>
                  <ApplicationHead application={application} />
                  {application.pitch ? <blockquote>{application.pitch}</blockquote> : null}
                  <p className={`application-status status-${application.status}`}>
                    {STATUS_LABEL[application.status] ?? application.status}
                    {application.status === "open"
                      ? " — pemiliknya membuka lagi peran ini, jadi lamaranmu tidak dilanjutkan."
                      : ""}
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
  const role = notice.payload.role ? roleLabel(notice.payload.role) : "";
  const title = notice.payload.title || "proyek yang sudah dihapus";
  const slug = notice.payload.slug;
  const project = slug ? (
    <Link href={`/projects/${slug}`}>{title}</Link>
  ) : (
    <strong>{title}</strong>
  );

  if (notice.kind === "application_accepted") {
    return (
      <p>
        Lamaranmu diterima — kamu sekarang {role ? <strong>{role}</strong> : "anggota"} di{" "}
        {project}.
      </p>
    );
  }

  if (notice.kind === "application_declined") {
    return (
      <p>
        Peran {role ? <strong>{role}</strong> : ""} di {project} dibuka lagi, jadi lamaranmu tidak
        dilanjutkan. Masih banyak yang butuh orang.
      </p>
    );
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
              melamar sebagai <strong>{roleLabel(application.role)}</strong>
            </>
          ) : (
            <>
              <strong>{roleLabel(application.role)}</strong> di{" "}
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
