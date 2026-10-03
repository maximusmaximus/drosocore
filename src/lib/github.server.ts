import { GITHUB_OWNER, GITHUB_REPO, GITHUB_URL } from "./constants.ts";
import type { CiPr, CiPrState } from "./ci.ts";
import {
  HALL_STATE_PATH,
  parseHallState,
  type GhFile,
  type HallStateDoc,
} from "./github-pr.ts";

const API = "https://api.github.com";

export function githubToken(): string | undefined {
  return process.env.GITHUB_TOKEN?.trim() || process.env.GH_TOKEN?.trim() || process.env.DROSOCORE_GITHUB_TOKEN?.trim();
}

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "content-type": "application/json",
    "user-agent": "drosocore-hall",
  };
}

async function gh(token: string, path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API}${path}`, {
    ...init,
    headers: { ...headers(token), ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(12_000),
  });
}

async function refSha(token: string, branch: string): Promise<string | null> {
  const res = await gh(token, `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/ref/heads/${branch}`);
  if (!res.ok) return null;
  const json = (await res.json()) as { object?: { sha?: string } };
  return json.object?.sha ?? null;
}

async function ensureBranch(token: string, branch: string, fromSha: string): Promise<void> {
  const have = await refSha(token, branch);
  if (have) return;
  const res = await gh(token, `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/refs`, {
    method: "POST",
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: fromSha }),
  });
  if (!res.ok && res.status !== 422) {
    throw new Error(`branch ${res.status}`);
  }
}

async function fileSha(token: string, path: string, branch: string): Promise<string | undefined> {
  const res = await gh(
    token,
    `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(branch)}`,
  );
  if (!res.ok) return undefined;
  const json = (await res.json()) as { sha?: string };
  return json.sha;
}

async function putFile(token: string, branch: string, file: GhFile, message: string): Promise<void> {
  const sha = await fileSha(token, file.path, branch);
  const res = await gh(
    token,
    `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${file.path.split("/").map(encodeURIComponent).join("/")}`,
    {
      method: "PUT",
      body: JSON.stringify({
        message: message.slice(0, 120),
        content: Buffer.from(file.content, "utf8").toString("base64"),
        branch,
        sha,
      }),
    },
  );
  if (!res.ok) throw new Error(`put ${file.path} ${res.status}`);
}

type FoundPr = { number: number; url: string; state: CiPrState; sha: string | null };

async function findPr(token: string, branch: string): Promise<FoundPr | null> {
  const head = `${GITHUB_OWNER}:${branch}`;
  const res = await gh(
    token,
    `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/pulls?head=${encodeURIComponent(head)}&state=all&per_page=5`,
  );
  if (!res.ok) return null;
  const rows = (await res.json()) as {
    number?: number;
    html_url?: string;
    state?: string;
    merged_at?: string | null;
    head?: { sha?: string };
  }[];
  const row = rows.find((r) => typeof r.number === "number");
  if (!row?.number) return null;
  const state: CiPrState = row.merged_at ? "merged" : row.state === "closed" ? "closed" : "open";
  return {
    number: row.number,
    url: row.html_url || `${GITHUB_URL}/pull/${row.number}`,
    state,
    sha: row.head?.sha ?? null,
  };
}

async function createPr(token: string, title: string, branch: string, body: string): Promise<FoundPr> {
  const res = await gh(token, `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/pulls`, {
    method: "POST",
    body: JSON.stringify({ title, head: branch, base: "main", body }),
  });
  if (res.status === 422) {
    const existing = await findPr(token, branch);
    if (existing) return existing;
  }
  if (!res.ok) throw new Error(`pr ${res.status}`);
  const json = (await res.json()) as { number?: number; html_url?: string; head?: { sha?: string } };
  if (!json.number) throw new Error("pr number");
  return {
    number: json.number,
    url: json.html_url || `${GITHUB_URL}/pull/${json.number}`,
    state: "open",
    sha: json.head?.sha ?? null,
  };
}

async function mergePr(token: string, number: number, title: string): Promise<string | null> {
  const res = await gh(token, `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/pulls/${number}/merge`, {
    method: "PUT",
    body: JSON.stringify({
      merge_method: "squash",
      commit_title: title.slice(0, 72),
      commit_message: "Winner of the stake-weighted ballot. Venice upsample. Merged to main.",
    }),
  });
  if (res.status === 405 || res.status === 409) {
    const pr = await gh(token, `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/pulls/${number}`);
    if (!pr.ok) return null;
    const json = (await pr.json()) as { merged?: boolean; merge_commit_sha?: string };
    return json.merged ? json.merge_commit_sha ?? "merged" : null;
  }
  if (!res.ok) throw new Error(`merge ${res.status}`);
  const json = (await res.json()) as { sha?: string };
  return json.sha ?? "merged";
}

async function closePr(token: string, number: number, title: string): Promise<void> {
  await gh(token, `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${number}/comments`, {
    method: "POST",
    body: JSON.stringify({
      body: `Closed. ${title} lost the stake-weighted ballot. Main only moves when a winning proposal is merged.`,
    }),
  });
  await gh(token, `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/pulls/${number}`, {
    method: "PATCH",
    body: JSON.stringify({ state: "closed" }),
  });
}

type LedgerHit = { number: number; url: string; state: CiPrState; sha: string | null };

let ledgerCache: { at: number; map: Record<string, LedgerHit> } | null = null;

export async function ledgerByBranch(): Promise<Record<string, LedgerHit>> {
  if (ledgerCache && Date.now() - ledgerCache.at < 4000) return ledgerCache.map;
  const map: Record<string, LedgerHit> = {};
  try {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const raw = await readFile(join(process.cwd(), "data", "pr-ledger.json"), "utf8");
    const json = JSON.parse(raw) as {
      byBranch?: Record<string, { number?: number; url?: string; state?: string; sha?: string }>;
    };
    for (const [branch, hit] of Object.entries(json.byBranch ?? {})) {
      if (!branch.startsWith("proposal/") || typeof hit.number !== "number") continue;
      const state: CiPrState =
        hit.state === "merged" || hit.state === "closed" || hit.state === "open" || hit.state === "queued"
          ? hit.state
          : "open";
      map[branch] = {
        number: hit.number,
        url: hit.url || `${GITHUB_URL}/pull/${hit.number}`,
        state,
        sha: hit.sha ?? null,
      };
    }
  } catch {
    /* no ledger yet */
  }
  ledgerCache = { at: Date.now(), map };
  return map;
}

export function overlayLedger(pr: CiPr | null, ledger: Record<string, LedgerHit>): CiPr | null {
  if (!pr) return null;
  const hit = ledger[pr.branch];
  if (!hit) return pr;
  return { ...pr, number: hit.number, url: hit.url, state: hit.state, sha: hit.sha ?? pr.sha };
}

export async function readMainHallState(): Promise<HallStateDoc | null> {
  const token = githubToken();
  if (!token) return null;
  try {
    const res = await gh(
      token,
      `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${HALL_STATE_PATH}?ref=main`,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { content?: string; encoding?: string };
    if (!json.content) return null;
    const text = Buffer.from(json.content, "base64").toString("utf8");
    return parseHallState(JSON.parse(text));
  } catch (e) {
    console.error("github state", e);
    return null;
  }
}

export async function openProposalPr(input: {
  branch: string;
  title: string;
  body: string;
  files: GhFile[];
}): Promise<CiPr> {
  const queued: CiPr = { branch: input.branch, number: null, url: null, state: "queued", sha: null };
  const ledger = await ledgerByBranch();
  const known = ledger[input.branch];
  if (known) {
    return { branch: input.branch, number: known.number, url: known.url, state: known.state, sha: known.sha };
  }
  const token = githubToken();
  if (!token) return queued;
  try {
    const mainSha = await refSha(token, "main");
    if (!mainSha) return queued;
    await ensureBranch(token, input.branch, mainSha);
    for (const file of input.files) {
      await putFile(token, input.branch, file, `proposal: ${input.title}`);
    }
    const pr = (await findPr(token, input.branch)) ?? (await createPr(token, input.title, input.branch, input.body));
    return { branch: input.branch, number: pr.number, url: pr.url, state: pr.state, sha: pr.sha };
  } catch (e) {
    console.error("github proposal", e);
    return queued;
  }
}

export async function landWinnerPr(input: {
  branch: string;
  title: string;
  body: string;
  files: GhFile[];
  close: { branch: string; number: number | null; title: string }[];
}): Promise<CiPr> {
  const token = githubToken();
  const ledger = await ledgerByBranch();
  const known = ledger[input.branch];
  const base: CiPr = {
    branch: input.branch,
    number: known?.number ?? null,
    url: known?.url ?? null,
    state: known?.state ?? "queued",
    sha: known?.sha ?? null,
  };
  if (!token) return base;
  try {
    const mainSha = await refSha(token, "main");
    if (!mainSha) return base;
    await ensureBranch(token, input.branch, mainSha);
    let pr = await findPr(token, input.branch);
    if (!pr) pr = await createPr(token, input.title, input.branch, input.body);
    if (pr.state === "merged") {
      return { branch: input.branch, number: pr.number, url: pr.url, state: "merged", sha: pr.sha };
    }
    if (pr.state === "closed") {
      await gh(token, `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/pulls/${pr.number}`, {
        method: "PATCH",
        body: JSON.stringify({ state: "open" }),
      });
    }
    for (const file of input.files) {
      await putFile(token, input.branch, file, `upsample: ${input.title}`);
    }
    const sha = await mergePr(token, pr.number, input.title);
    if (!sha) {
      return { branch: input.branch, number: pr.number, url: pr.url, state: "open", sha: pr.sha };
    }
    for (const other of input.close) {
      if (!other.number || other.branch === input.branch) continue;
      try {
        await closePr(token, other.number, other.title);
      } catch (e) {
        console.error("github close", e);
      }
    }
    return { branch: input.branch, number: pr.number, url: pr.url, state: "merged", sha };
  } catch (e) {
    console.error("github land", e);
    return base.number ? { ...base, state: base.state === "queued" ? "open" : base.state } : base;
  }
}
