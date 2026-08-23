import type { Metadata } from "next";
import Link from "next/link";
import { signInPath } from "../lib/urls";
import { SiteFooter, SiteHeader } from "../components/shell";
import { CreateForm } from "../components/create-form";
import { currentViewer } from "../lib/session";
import { about } from "../content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tunjukkan project — Ahsan Project",
  description:
    "Tulis idemu lengkap dengan masalah, gambaran solusi, dan untuk siapa. Lalu buka peran supaya ada yang bisa ikut menggarap.",
  alternates: { canonical: "/new" },
};

export default async function NewProject() {
  const viewer = await currentViewer();

  return (
    <>
      <SiteHeader returnTo="/new" />

      <main id="main-content" className="page-narrow">
        <p className="eyebrow">
          <span /> Tunjukkan project
        </p>
        <h1>Tunjukkan yang sedang kamu bangun.</h1>
        <p className="lede">
          Ide, setengah jadi, atau sudah dipakai orang — semuanya boleh. Yang wajib cuma briefnya,
          karena project yang ditulis lengkap jauh lebih mungkin dapat teman mengerjakan.
        </p>

        <ol className="how-list">
          {about.id.how.map((step) => (
            <li key={step.step}>
              <span>{step.step}</span>
              <div>
                <h2>{step.title}</h2>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        {viewer ? (
          <CreateForm />
        ) : (
          <p className="sign-in-callout">
            <Link className="primary-button" href={signInPath("/new")}>
              Masuk dulu untuk menunjukkan project
            </Link>
          </p>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
