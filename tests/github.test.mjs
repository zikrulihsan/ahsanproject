import assert from "node:assert/strict";
import test from "node:test";

import { getGitHubProjectDraft, listGitHubIssues, parseGitHubRepositoryUrl } from "../app/lib/github.ts";

test("only accepts an ordinary GitHub repository URL", () => {
  assert.deepEqual(parseGitHubRepositoryUrl("https://github.com/ahsan/project.git"), {
    owner: "ahsan",
    repo: "project",
    url: "https://github.com/ahsan/project",
  });
  assert.equal(parseGitHubRepositoryUrl("https://github.com/ahsan/project/issues"), null);
  assert.equal(parseGitHubRepositoryUrl("https://example.com/ahsan/project"), null);
  assert.equal(parseGitHubRepositoryUrl("http://github.com/ahsan/project"), null);
});

test("turns public repository metadata and named README sections into a reviewable draft", async () => {
  const requests = [];
  const request = async (url) => {
    requests.push(url);
    if (url.endsWith("/readme")) {
      const markdown = `# Kelas Terbuka\n\nBelajar bersama agar materi berkualitas mudah dipakai siapa saja.\n\n## Masalah\n\nMateri belajar yang baik sulit ditemukan oleh guru di daerah.\n\n## Solusi\n\nKami membuat perpustakaan materi yang bisa dipakai ulang dan diperbaiki bersama.\n\n## Untuk siapa\n\nGuru dan relawan pendidikan di Indonesia.\n\n## Status\n\nSedang menyiapkan koleksi pertama bersama lima sekolah.`;
      return new Response(JSON.stringify({ content: Buffer.from(markdown).toString("base64"), encoding: "base64" }), { status: 200 });
    }
    return new Response(JSON.stringify({ name: "kelas-terbuka", description: "Belajar bersama", homepage: "https://kelas.example", topics: ["Pendidikan", "Komunitas"] }), { status: 200 });
  };

  const draft = await getGitHubProjectDraft("https://github.com/ahsan/kelas-terbuka", request);

  assert.equal(requests.length, 2);
  assert.equal(draft.title, "Kelas Terbuka");
  assert.equal(draft.tagline, "Belajar bersama agar materi berkualitas mudah dipakai siapa saja.");
  assert.match(draft.problem, /sulit ditemukan/);
  assert.match(draft.solution, /perpustakaan materi/);
  assert.equal(draft.audience, "Guru dan relawan pendidikan di Indonesia.");
  assert.match(draft.now, /Sedang menyiapkan/);
  assert.deepEqual(draft.tags, ["pendidikan", "komunitas"]);
  assert.equal(draft.liveUrl, "https://kelas.example");
  assert.equal(draft.readmeFound, true);
});

function issuesResponse(items) {
  return async () => new Response(JSON.stringify(items), { status: 200 });
}

test("ranks issues a maintainer marked as takeable ahead of the rest", async () => {
  const requests = [];
  const request = async (url) => {
    requests.push(url);
    return issuesResponse([
      {
        number: 11,
        title: "Perbaiki tautan yang putus",
        html_url: "https://github.com/ahsan/kelas-terbuka/issues/11",
        labels: [{ name: "bug" }],
        created_at: "2026-08-30T00:00:00Z",
        comments: 2,
      },
      {
        number: 4,
        title: "Tambahkan panduan pemasangan",
        html_url: "https://github.com/ahsan/kelas-terbuka/issues/4",
        labels: [{ name: "documentation" }, { name: "good first issue" }],
        created_at: "2026-06-01T00:00:00Z",
        comments: 0,
      },
      {
        number: 9,
        title: "Terjemahkan halaman beranda",
        html_url: "https://github.com/ahsan/kelas-terbuka/issues/9",
        labels: [{ name: "help wanted" }],
        created_at: "2026-08-20T00:00:00Z",
        comments: 1,
      },
    ])();
  };

  const issues = await listGitHubIssues("https://github.com/ahsan/kelas-terbuka", request);

  assert.equal(requests.length, 1);
  assert.match(requests[0], /\/repos\/ahsan\/kelas-terbuka\/issues\?state=open/);
  // Both invitations first, newest of them leading; the plain bug last.
  assert.deepEqual(issues.map((issue) => issue.number), [9, 4, 11]);
  assert.equal(issues[0].inviting, true);
  assert.equal(issues[2].inviting, false);
  assert.deepEqual(issues[1].labels, ["documentation", "good first issue"]);
  assert.equal(issues[2].comments, 2);
});

test("keeps pull requests and anything pointing elsewhere out of the list", async () => {
  const request = issuesResponse([
    {
      number: 21,
      title: "Rapikan gaya tombol",
      html_url: "https://github.com/ahsan/kelas-terbuka/pull/21",
      pull_request: { url: "https://api.github.com/repos/ahsan/kelas-terbuka/pulls/21" },
      labels: [],
      created_at: "2026-08-31T00:00:00Z",
    },
    {
      number: 22,
      title: "Klik di sini",
      html_url: "https://example.com/phishing",
      labels: [],
      created_at: "2026-08-31T00:00:00Z",
    },
    {
      number: 23,
      title: "Perjelas pesan galat saat gagal masuk",
      html_url: "https://github.com/ahsan/kelas-terbuka/issues/23",
      labels: [],
      created_at: "2026-08-29T00:00:00Z",
    },
  ]);

  const issues = await listGitHubIssues("https://github.com/ahsan/kelas-terbuka", request);

  assert.deepEqual(issues.map((issue) => issue.number), [23]);
});

test("loses the section rather than the page when GitHub says no", async () => {
  const rateLimited = async () => new Response("", { status: 403 });
  assert.deepEqual(await listGitHubIssues("https://github.com/ahsan/kelas-terbuka", rateLimited), []);

  const unreachable = async () => {
    throw new Error("network down");
  };
  assert.deepEqual(await listGitHubIssues("https://github.com/ahsan/kelas-terbuka", unreachable), []);

  // A URL that is not a repository never reaches GitHub at all.
  let called = false;
  const counted = async () => {
    called = true;
    return new Response("[]", { status: 200 });
  };
  assert.deepEqual(await listGitHubIssues("https://example.com/ahsan/project", counted), []);
  assert.equal(called, false);
});
