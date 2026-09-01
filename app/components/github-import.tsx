"use client";

import { useState, useTransition, type RefObject } from "react";
import { importGitHubReadme } from "../actions";
import type { GitHubProjectDraft } from "../lib/github";
import { useLanguage } from "./language-provider";

type ImportMessage = { tone: "success" | "error"; text: string } | null;

/**
 * Imports into the form in front of the person, rather than saving upstream
 * text behind their back. Only blank fields are filled, so this also remains
 * safe after somebody has started writing their own brief.
 */
export function GitHubImport({ formRef }: { formRef: RefObject<HTMLFormElement | null> }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<ImportMessage>(null);
  const { tx } = useLanguage();

  function startImport() {
    const form = formRef.current;
    const repoUrl = valueOf(form, "repoUrl");
    if (!repoUrl) {
      setMessage({ tone: "error", text: tx("Tempel URL repositori GitHub terlebih dahulu.", "Paste a GitHub repository URL first.") });
      return;
    }

    startTransition(async () => {
      const result = await importGitHubReadme(repoUrl);
      if (!result.ok) {
        setMessage({ tone: "error", text: result.error });
        return;
      }

      const changed = applyDraft(form, result.draft);
      const readmeNote = result.draft.readmeFound
        ? tx("README berhasil dibaca.", "The README has been read.")
        : tx("README tidak ditemukan; data repositori yang tersedia tetap digunakan.", "No README was found; available repository data is still being used.");
      setMessage({
        tone: "success",
        text: changed.length
          ? tx(`${readmeNote} Bagian ${changed.map((label) => draftFieldLabel(label)).join(", ")} telah diisi; periksa sebelum menyimpan.`, `${readmeNote} Filled in ${changed.join(", ")}; review it before saving.`)
          : tx(`${readmeNote} Kolom yang relevan sudah terisi, jadi tidak ada tulisanmu yang ditimpa.`, `${readmeNote} Relevant fields are already filled in, so none of your writing was overwritten.`),
      });
    });
  }

  return (
    <div className="github-import">
      <p>
        {tx("Kami akan membaca README dan detail repositori publik untuk mengisi kolom yang kosong. Tidak ada yang disimpan sampai kamu menerbitkan proyek.", "We will read the README and public repository details to fill in blank fields. Nothing is saved until you publish the project.")}
      </p>
      <button className="quiet" type="button" onClick={startImport} disabled={pending} aria-busy={pending || undefined}>
        {pending ? tx("Membaca GitHub…", "Reading GitHub…") : tx("Isi draf dari README GitHub", "Fill draft from GitHub README")}
      </button>
      {message ? (
        <p className={`github-import-message is-${message.tone}`} role={message.tone === "error" ? "alert" : undefined} aria-live="polite">
          {message.text}
        </p>
      ) : null}
    </div>
  );
}

function draftFieldLabel(label: string): string {
  const labels: Record<string, string> = {
    "project name": "nama proyek",
    summary: "ringkasan",
    problem: "masalah",
    solution: "solusi",
    "target audience": "sasaran pengguna",
    "current work": "pekerjaan terkini",
    website: "situs web",
    topics: "topik",
  };
  return labels[label] ?? label;
}

function valueOf(form: HTMLFormElement | null, name: string): string {
  const input = form?.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`);
  return input?.value.trim() || "";
}

function applyDraft(form: HTMLFormElement | null, draft: GitHubProjectDraft): string[] {
  if (!form) return [];

  const fields: Array<[keyof Pick<GitHubProjectDraft, "title" | "tagline" | "problem" | "solution" | "audience" | "now" | "liveUrl">, string]> = [
    ["title", "project name"],
    ["tagline", "summary"],
    ["problem", "problem"],
    ["solution", "solution"],
    ["audience", "target audience"],
    ["now", "current work"],
    ["liveUrl", "website"],
  ];
  const changed: string[] = [];

  for (const [name, label] of fields) {
    const input = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`);
    if (!input || input.value.trim() || !draft[name]) continue;
    input.value = draft[name];
    input.dispatchEvent(new Event("input", { bubbles: true }));
    changed.push(label);
  }

  const existingTopics = new FormData(form)
    .getAll("topics")
    .some((topic) => typeof topic === "string" && topic.trim());
  const customTags = form.querySelector<HTMLInputElement>("[name=customTags]");
  if (!existingTopics && !customTags?.value.trim() && draft.tags.length && customTags) {
    customTags.value = draft.tags.join(", ");
    customTags.dispatchEvent(new Event("input", { bubbles: true }));
    changed.push("topics");
  }

  return changed;
}
