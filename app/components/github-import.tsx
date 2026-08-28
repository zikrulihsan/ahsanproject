"use client";

import { useState, useTransition, type RefObject } from "react";
import { importGitHubReadme } from "../actions";
import type { GitHubProjectDraft } from "../lib/github";

type ImportMessage = { tone: "success" | "error"; text: string } | null;

/**
 * Imports into the form in front of the person, rather than saving upstream
 * text behind their back. Only blank fields are filled, so this also remains
 * safe after somebody has started writing their own brief.
 */
export function GitHubImport({ formRef }: { formRef: RefObject<HTMLFormElement | null> }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<ImportMessage>(null);

  function startImport() {
    const form = formRef.current;
    const repoUrl = valueOf(form, "repoUrl");
    if (!repoUrl) {
      setMessage({ tone: "error", text: "Tempel URL repository GitHub dulu." });
      return;
    }

    startTransition(async () => {
      const result = await importGitHubReadme(repoUrl);
      if (!result.ok) {
        setMessage({ tone: "error", text: result.error });
        return;
      }

      const changed = applyDraft(form, result.draft);
      const readmeNote = result.draft.readmeFound ? "README-nya sudah dibaca." : "README tidak ditemukan; data repo yang tersedia tetap dipakai.";
      setMessage({
        tone: "success",
        text: changed.length
          ? `${readmeNote} Mengisi ${changed.join(", ")}; periksa dulu sebelum menyimpan.`
          : `${readmeNote} Kolom yang relevan sudah terisi, jadi tidak ada tulisanmu yang ditimpa.`,
      });
    });
  }

  return (
    <div className="github-import">
      <p>
        <strong>Mulai dari repository GitHub?</strong> Kami akan membaca README dan detail repository
        publik untuk mengisi kolom yang masih kosong. Kamu tetap meninjau semuanya sebelum project terbit.
      </p>
      <button className="quiet" type="button" onClick={startImport} disabled={pending}>
        {pending ? "Membaca GitHub…" : "Isi draft dari README GitHub"}
      </button>
      {message ? (
        <p className={`github-import-message is-${message.tone}`} role={message.tone === "error" ? "alert" : undefined} aria-live="polite">
          {message.text}
        </p>
      ) : null}
    </div>
  );
}

function valueOf(form: HTMLFormElement | null, name: string): string {
  const input = form?.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`);
  return input?.value.trim() || "";
}

function applyDraft(form: HTMLFormElement | null, draft: GitHubProjectDraft): string[] {
  if (!form) return [];

  const fields: Array<[keyof Pick<GitHubProjectDraft, "title" | "tagline" | "problem" | "solution" | "audience" | "now" | "liveUrl">, string]> = [
    ["title", "nama project"],
    ["tagline", "ringkasan"],
    ["problem", "masalah"],
    ["solution", "solusi"],
    ["audience", "sasaran pengguna"],
    ["now", "yang sedang dikerjakan"],
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
    changed.push("topik");
  }

  return changed;
}
