import { isHttpUrl } from "./brief";

export type GitHubRepository = {
  owner: string;
  repo: string;
  url: string;
};

export type GitHubProjectDraft = {
  title: string;
  tagline: string;
  problem: string;
  solution: string;
  audience: string;
  now: string;
  tags: string[];
  liveUrl: string;
  readmeFound: boolean;
};

/** One open issue, as an invitation somebody can act on. */
export type GitHubIssue = {
  number: number;
  title: string;
  url: string;
  labels: string[];
  createdAt: string;
  comments: number;
  /** Carries a label maintainers use to say "this one is yours to take". */
  inviting: boolean;
};

type GitHubRepositoryResponse = {
  name?: unknown;
  description?: unknown;
  homepage?: unknown;
  topics?: unknown;
};

type GitHubReadmeResponse = {
  content?: unknown;
  encoding?: unknown;
};

type GitHubIssueResponse = {
  number?: unknown;
  title?: unknown;
  html_url?: unknown;
  labels?: unknown;
  created_at?: unknown;
  comments?: unknown;
  pull_request?: unknown;
};

const GITHUB_API = "https://api.github.com";

/** The labels maintainers use to mark work an outsider may simply take. */
const INVITING_LABELS = new Set(["good first issue", "help wanted"]);
const ISSUE_PAGE_SIZE = 30;
const ISSUE_LIMIT = 5;

const REQUEST_HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "Ahsan-Project",
};

/**
 * Accept only the ordinary repository URL somebody can copy from GitHub.
 *
 * Keeping this narrow is intentional: this value is later used to build an
 * upstream request, so accepting arbitrary hosts would turn a helpful import
 * button into an SSRF primitive.
 */
export function parseGitHubRepositoryUrl(value: string): GitHubRepository | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || (url.hostname !== "github.com" && url.hostname !== "www.github.com")) {
      return null;
    }

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

    const [owner, rawRepo] = parts;
    const repo = rawRepo.replace(/\.git$/i, "");
    if (!repo) return null;

    return {
      owner,
      repo,
      url: `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    };
  } catch {
    return null;
  }
}

export function isGitHubRepositoryUrl(value: string): boolean {
  return parseGitHubRepositoryUrl(value) !== null;
}

/** Whether a label is a maintainer saying "this one is yours to take". */
export function isInvitingLabel(value: string): boolean {
  return INVITING_LABELS.has(value.trim().toLowerCase());
}

/** Reads public repository metadata plus its README, without saving anything. */
export async function getGitHubProjectDraft(
  repoUrl: string,
  request: typeof fetch = fetch,
): Promise<GitHubProjectDraft> {
  const repository = parseGitHubRepositoryUrl(repoUrl);
  if (!repository) {
    throw new Error("Use a public GitHub repository URL, for example https://github.com/organization/project.");
  }

  const path = `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}`;
  const response = await githubRequest(request, `${GITHUB_API}${path}`);
  if (response.status === 404) throw new Error("That GitHub repository was not found or is not public.");
  if (response.status === 403) throw new Error("GitHub is limiting requests. Please try again shortly.");
  if (!response.ok) throw new Error("GitHub repository data could not be read. Please try again shortly.");

  const data = (await response.json()) as GitHubRepositoryResponse;
  const readmeResponse = await githubRequest(request, `${GITHUB_API}${path}/readme`);
  if (!readmeResponse.ok && readmeResponse.status !== 404) {
    throw new Error("The GitHub README could not be read. Please try again shortly.");
  }
  const readme = readmeResponse.ok ? readmeText((await readmeResponse.json()) as GitHubReadmeResponse) : "";

  return {
    title: clip(markdownTitle(readme) || stringValue(data.name), 60),
    tagline: clip(firstParagraph(readme) || stringValue(data.description), 140),
    problem: clip(section(readme, ["masalah", "problem"]), 2000),
    solution: clip(section(readme, ["solusi", "solution", "what we build", "what we're building"]), 2000),
    audience: clip(section(readme, ["untuk siapa", "audience", "target users", "who is it for"]), 600),
    now: clip(section(readme, ["status", "what's next", "selanjutnya", "roadmap"]), 200),
    tags: topics(data.topics),
    liveUrl: publicUrl(data.homepage),
    readmeFound: Boolean(readme),
  };
}

/**
 * Open issues from a public repository, ranked by how ready they are to take.
 *
 * Unlike `getGitHubProjectDraft`, this never throws. That function answers a
 * form somebody just submitted, so it owes them a reason when GitHub says no;
 * this one decorates a project page nobody asked GitHub for, so a rate-limited
 * or unreachable upstream should cost the section and nothing else.
 *
 * One request, ranked here rather than by asking GitHub twice: a label filter
 * would be a second call against a budget of sixty an hour shared by every
 * visitor this site serves. The cost is that an inviting issue nobody has
 * touched in a long while can fall outside the most recently updated page.
 */
export async function listGitHubIssues(
  repoUrl: string,
  request: typeof fetch = fetch,
): Promise<GitHubIssue[]> {
  const repository = parseGitHubRepositoryUrl(repoUrl);
  if (!repository) return [];

  const path = `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}/issues`;
  const query = `?state=open&sort=updated&direction=desc&per_page=${ISSUE_PAGE_SIZE}`;

  let payload: unknown;
  try {
    const response = await githubRequest(request, `${GITHUB_API}${path}${query}`);
    if (!response.ok) return [];
    payload = await response.json();
  } catch {
    // A timeout, a network failure, or a body that is not JSON. All of them
    // mean the same thing to the page: there is nothing to show right now.
    return [];
  }

  if (!Array.isArray(payload)) return [];

  return payload
    .filter(isIssue)
    .map(toIssue)
    .sort(mostInvitingFirst)
    .slice(0, ISSUE_LIMIT);
}

/**
 * GitHub answers `/issues` with pull requests too, and only a `pull_request`
 * key tells them apart. The URL check is not paranoia about GitHub: it is what
 * keeps a surprising payload from becoming an arbitrary link on our page.
 */
function isIssue(value: unknown): value is GitHubIssueResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as GitHubIssueResponse;

  return (
    candidate.pull_request === undefined &&
    typeof candidate.number === "number" &&
    stringValue(candidate.title) !== "" &&
    isGitHubRepositoryUrl(issueRepositoryUrl(candidate.html_url))
  );
}

/** The repository an issue URL belongs to, or "" when it is not one. */
function issueRepositoryUrl(value: unknown): string {
  const url = stringValue(value);
  const match = url.match(/^https:\/\/github\.com\/[^/]+\/[^/]+/);
  return match ? match[0] : "";
}

function toIssue(value: GitHubIssueResponse): GitHubIssue {
  const labels = issueLabels(value.labels);

  return {
    number: value.number as number,
    title: clip(plainText(stringValue(value.title)), 120),
    url: stringValue(value.html_url),
    labels,
    createdAt: stringValue(value.created_at),
    comments: typeof value.comments === "number" ? value.comments : 0,
    inviting: labels.some(isInvitingLabel),
  };
}

function issueLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((label) => (label && typeof label === "object" ? stringValue((label as { name?: unknown }).name) : stringValue(label)))
    .filter(Boolean)
    .slice(0, 4);
}

/** An explicit invitation first, then the most recently opened. */
function mostInvitingFirst(a: GitHubIssue, b: GitHubIssue): number {
  if (a.inviting !== b.inviting) return a.inviting ? -1 : 1;
  return openedAt(b.createdAt) - openedAt(a.createdAt);
}

function openedAt(value: string): number {
  const time = Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
}

/** A third-party import should never keep the form busy indefinitely. */
function githubRequest(request: typeof fetch, url: string): Promise<Response> {
  return request(url, { headers: REQUEST_HEADERS, signal: AbortSignal.timeout(4_500) });
}

function readmeText(value: GitHubReadmeResponse): string {
  if (value.encoding !== "base64" || typeof value.content !== "string") return "";

  try {
    return Buffer.from(value.content.replace(/\n/g, ""), "base64").toString("utf8");
  } catch {
    return "";
  }
}

function markdownTitle(markdown: string): string {
  const match = markdown.match(/^\s*#\s+(.+)$/m);
  return match ? plainText(match[1]) : "";
}

function firstParagraph(markdown: string): string {
  const withoutTitle = markdown.replace(/^\s*#\s+.+$/m, "");
  const paragraphs = withoutTitle
    .split(/\n\s*\n/)
    .map(plainText)
    .filter((paragraph) => paragraph.length >= 20 && !/^(\[!\[|https?:\/\/)/i.test(paragraph));
  return paragraphs[0] || "";
}

/** Returns the copy under a named Markdown heading, stopping at its next peer. */
function section(markdown: string, names: string[]): string {
  const headings = [...markdown.matchAll(/^(#{1,6})\s+(.+)$/gm)];
  const matchIndex = headings.findIndex((heading) => names.includes(normaliseHeading(heading[2])));
  if (matchIndex === -1) return "";

  const match = headings[matchIndex];
  const level = match[1].length;
  const start = (match.index || 0) + match[0].length;
  const next = headings.slice(matchIndex + 1).find((heading) => heading[1].length <= level);
  const end = next?.index ?? markdown.length;
  return plainText(markdown.slice(start, end));
}

function normaliseHeading(value: string): string {
  return plainText(value).toLowerCase().replace(/[.:!?]+$/g, "").trim();
}

function plainText(value: string): string {
  return value
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`{1,3}([^`]+)`{1,3}/g, "$1")
    .replace(/^\s{0,3}[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/<[^>]+>/g, "")
    .replace(/[\*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function topics(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((topic): topic is string => typeof topic === "string").map((topic) => topic.trim().toLowerCase()).filter(Boolean))].slice(0, 6);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function publicUrl(value: unknown): string {
  const url = stringValue(value);
  return isHttpUrl(url) ? url : "";
}

function clip(value: string, maximum: number): string {
  return value.slice(0, maximum).trim();
}
