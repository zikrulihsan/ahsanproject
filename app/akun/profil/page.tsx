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
  title: "Edit profile — Ahsan Project",
  description: "Edit your profile, skills, and contact links on Ahsan Project.",
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
  const people = await readPublicly("profile term suggestions", () => listPeople(400), []);

  return (
    <>
      <SiteHeader returnTo="/akun/profil" />

      <main id="main-content" className="page-narrow">
        <p className="eyebrow">
          <span /> Profile
        </p>
        <h1>Complete your profile.</h1>
        <p className="lede">
          This is what people see on <Link href={`/u/${viewer.username}`}>your portfolio page</Link>{" "}
          and use to find you in the <Link href="/orang">talent pool</Link>. You can update it at
          any time.
        </p>

        <ProfileForm
          profile={toEditable(viewer)}
          skillSuggestions={termSuggestions(people.value, "skills")}
          fieldSuggestions={termSuggestions(people.value, "fields")}
          returnTo={returnTo}
        />

        <p className="hint">
          Your profile URL—<code>/u/{viewer.username}</code>—is created by the system and cannot be
          changed here. Change your password on the <Link href="/akun/password">password page</Link>.
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
