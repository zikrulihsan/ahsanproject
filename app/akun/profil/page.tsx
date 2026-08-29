import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter, SiteHeader } from "../../components/shell";
import { ProfileForm, type EditableProfile } from "../../components/profile-form";
import { listPeople } from "../../lib/data";
import { termSuggestions } from "../../lib/people";
import { readPublicly } from "../../lib/public-read";
import { currentViewer, type Viewer } from "../../lib/session";
import { signInPath } from "../../lib/urls";

/*
 * Allowed to block — same reason as the rest of /akun. Nothing here is
 * cacheable or indexed: the page is one person's own form, and a visitor
 * about to be redirected should not watch it paint first.
 */
export const instant = false;

export const metadata: Metadata = {
  title: "Ubah profil — Ahsan Project",
  description: "Ubah profil, keahlian, dan tautan kontak di Ahsan Project.",
  robots: { index: false },
};

export default async function EditProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const viewer = await currentViewer();
  if (!viewer) redirect(signInPath("/akun/profil"));
  const query = await searchParams;
  const requestedReturnTo = Array.isArray(query.returnTo) ? query.returnTo[0] : query.returnTo;
  // This is only a convenience after a blocked proposal, never an external
  // redirect destination supplied by a query string.
  const returnTo = requestedReturnTo?.startsWith("/projects/") ? requestedReturnTo : undefined;

  // Suggestions only. If the directory cannot be read the form still works —
  // it just stops proposing the words other people already use.
  const people = await readPublicly("saran istilah profil", () => listPeople(400), []);

  return (
    <>
      <SiteHeader returnTo="/akun/profil" />

      <main id="main-content" className="page-narrow">
        <p className="eyebrow">
          <span /> Profil
        </p>
        <h1>Isi datamu.</h1>
        <p className="lede">
          Ini yang orang lihat di <Link href={`/u/${viewer.username}`}>halaman portofoliomu</Link>{" "}
          dan yang dipakai untuk menemukanmu di <Link href="/orang">talent pool</Link>. Semua bisa
          diubah lagi kapan saja.
        </p>

        <ProfileForm
          profile={toEditable(viewer)}
          skillSuggestions={termSuggestions(people.value, "skills")}
          fieldSuggestions={termSuggestions(people.value, "fields")}
          returnTo={returnTo}
        />

        <p className="hint">
          Alamat web profilmu — <code>/u/{viewer.username}</code> — dibuatkan sistem dan belum bisa
          diubah dari sini. Kata sandi diubah di <Link href="/akun/password">halaman kata sandi</Link>.
        </p>
      </main>

      <SiteFooter />
    </>
  );
}

/** The stored profile as the form's string fields. */
function toEditable(viewer: Viewer): EditableProfile {
  return {
    name: viewer.name,
    profession: viewer.profession,
    headline: viewer.headline,
    bio: viewer.bio,
    skills: viewer.skills.join(", "),
    yearsExperience: viewer.yearsExperience === null ? "" : String(viewer.yearsExperience),
    fields: viewer.fields.join(", "),
    website: viewer.website,
    publicEmail: viewer.publicEmail,
    github: viewer.github,
    linkedin: viewer.linkedin,
    x: viewer.x,
    resume: viewer.resume,
  };
}
