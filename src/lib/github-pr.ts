import { GITHUB_URL } from "./constants.ts";
import {
  emptyVisual,
  keepBallotVisual,
  packMaterials,
  packSteps,
  parseVisual,
  type CiKind,
  type CiPr,
  type CiPrState,
  type CiUpsample,
  type CiVisual,
} from "./ci.ts";

export const HALL_POLICY =
  "A proposal is a pull request. It changes the hall only when that pull request is merged to main.";

export const HALL_STATE_PATH = "hall/state.json";

export type GhFile = { path: string; content: string };

export type HallInstall = {
  day: string;
  slot: number;
  kind: CiKind;
  title: string;
  body: string;
  adds: string[];
  modifies: string[];
  visual: CiVisual;
  prNumber: number | null;
  prUrl: string | null;
};

export type HallOpen = {
  day: string;
  slot: number;
  kind: CiKind;
  title: string;
  branch: string;
  url: string | null;
  state: CiPrState;
};

export type HallStateDoc = {
  version: 1;
  policy: string;
  updatedAt: string;
  repo: string;
  installs: HallInstall[];
  openProposals: HallOpen[];
};

export type UpsamplePacket = CiUpsample & {
  materials: string[];
  steps: string[];
  visual: CiVisual;
  imagePrompt: string;
};

const PR_STATES = new Set<CiPrState>(["queued", "open", "merged", "closed"]);

export function prUrl(number: number): string {
  return `${GITHUB_URL}/pull/${number}`;
}

export function slugTitle(title: string): string {
  const s = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42);
  return s || "proposal";
}

export function proposalBranch(day: string, slot: number, title: string): string {
  const daySafe = day.replace(/[^0-9a-z-]/gi, "").slice(0, 40) || "day";
  return `proposal/${daySafe}-s${slot}-${slugTitle(title)}`;
}

export function proposalPaths(day: string, slot: number, title: string): { md: string; json: string } {
  const slug = slugTitle(title);
  const daySafe = day.replace(/[^0-9a-z-]/gi, "").slice(0, 40) || "day";
  return {
    md: `proposals/${daySafe}/s${slot}-${slug}.md`,
    json: `proposals/${daySafe}/s${slot}-${slug}.json`,
  };
}

export function installNotePath(day: string, slot: number, title: string): string {
  const daySafe = day.replace(/[^0-9a-z-]/gi, "").slice(0, 40) || "day";
  return `hall/installs/${daySafe}-s${slot}-${slugTitle(title)}.md`;
}

export function parseStoredPr(raw: unknown): CiPr | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.branch !== "string" || !o.branch.startsWith("proposal/")) return null;
  const state = typeof o.state === "string" && PR_STATES.has(o.state as CiPrState) ? (o.state as CiPrState) : "queued";
  const number = typeof o.number === "number" && Number.isFinite(o.number) && o.number > 0 ? Math.round(o.number) : null;
  const url = typeof o.url === "string" && o.url.startsWith("https://github.com/") ? o.url : number ? prUrl(number) : null;
  const sha = typeof o.sha === "string" && /^[0-9a-f]{7,40}$/i.test(o.sha) ? o.sha : null;
  return { branch: o.branch, number, url, state, sha };
}

export function parseStoredUpsample(raw: unknown): CiUpsample | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const adds = strList(o.adds, 6);
  const modifies = strList(o.modifies, 4);
  if (!adds.length && !modifies.length) return null;
  return {
    summary: typeof o.summary === "string" ? o.summary.slice(0, 280) : "",
    adds,
    modifies,
    model: typeof o.model === "string" ? o.model.slice(0, 80) : "",
  };
}

function strList(v: unknown, cap: number): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const item of v) {
    if (typeof item !== "string") continue;
    const t = item.trim().slice(0, 160);
    if (t.length < 3) continue;
    if (!out.includes(t)) out.push(t);
    if (out.length >= cap) break;
  }
  return out;
}

export function emptyHallState(now = new Date().toISOString()): HallStateDoc {
  return {
    version: 1,
    policy: HALL_POLICY,
    updatedAt: now,
    repo: GITHUB_URL,
    installs: [],
    openProposals: [],
  };
}

export function parseHallState(raw: unknown): HallStateDoc {
  const base = emptyHallState();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const installs = Array.isArray(o.installs) ? o.installs : [];
  const open = Array.isArray(o.openProposals) ? o.openProposals : [];
  return {
    ...base,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : base.updatedAt,
    installs: installs
      .map((row) => parseInstall(row))
      .filter((row): row is HallInstall => Boolean(row))
      .slice(0, 48),
    openProposals: open
      .map((row) => parseOpen(row))
      .filter((row): row is HallOpen => Boolean(row))
      .slice(0, 24),
  };
}

function parseInstall(raw: unknown): HallInstall | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.title !== "string" || typeof o.kind !== "string") return null;
  return {
    day: typeof o.day === "string" ? o.day : "",
    slot: typeof o.slot === "number" ? o.slot : 0,
    kind: o.kind as CiKind,
    title: o.title.slice(0, 80),
    body: typeof o.body === "string" ? o.body.slice(0, 400) : "",
    adds: strList(o.adds, 6),
    modifies: strList(o.modifies, 4),
    visual: parseVisual(o.visual),
    prNumber: typeof o.prNumber === "number" ? o.prNumber : null,
    prUrl: typeof o.prUrl === "string" ? o.prUrl : null,
  };
}

function parseOpen(raw: unknown): HallOpen | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.branch !== "string" || typeof o.title !== "string") return null;
  const state = typeof o.state === "string" && PR_STATES.has(o.state as CiPrState) ? (o.state as CiPrState) : "open";
  return {
    day: typeof o.day === "string" ? o.day : "",
    slot: typeof o.slot === "number" ? o.slot : 0,
    kind: (typeof o.kind === "string" ? o.kind : "reactor") as CiKind,
    title: o.title.slice(0, 80),
    branch: o.branch,
    url: typeof o.url === "string" ? o.url : null,
    state,
  };
}

export function buildOutVisual(ballot: CiVisual, proposed: CiVisual | null): CiVisual {
  const next = keepBallotVisual(ballot, proposed ?? emptyVisual());
  return {
    ...next,
    extraModules: Math.min(6, Math.max(ballot.extraModules + 1, next.extraModules)),
    glowAdd: Math.min(2.6, Math.max(ballot.glowAdd, next.glowAdd, round2(ballot.glowAdd + 0.2))),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function cannedUpsample(draft: {
  kind: CiKind;
  title: string;
  body: string;
  visual: CiVisual;
}): UpsamplePacket {
  const add =
    draft.kind === "retire"
      ? [`patch plate where ${draft.title} came off`, `shift note naming the hole`]
      : [`second fitting for ${draft.title}`, `nameplate and torque log on ${draft.title}`];
  const mod =
    draft.kind === "retire"
      ? [`pulled the neighboring lead the ballot only named`]
      : [`the seated ${draft.kind} install gains a clamp from ${draft.title}`];
  return {
    summary: `${draft.title} is built past the ballot line: extra fittings, and a change to what is already in the hall.`,
    adds: add,
    modifies: mod,
    materials: [...packMaterials(draft.kind), "nameplate", "spare clamp"].slice(0, 8),
    steps: [...packSteps(draft.kind), "commit the upsample on the pull request", "merge to main"].slice(0, 8),
    visual: buildOutVisual(draft.visual, null),
    imagePrompt: `Photoreal industrial fusion hall, dark fruit flies in PPE building ${draft.title}, extra fittings, steel, tungsten, tokamak, no text.`,
    model: "canned-upsample",
  };
}

export function parseUpsample(
  raw: unknown,
  draft: { kind: CiKind; title: string; body: string; visual: CiVisual },
  model = "upsample",
): UpsamplePacket {
  const canned = cannedUpsample(draft);
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const adds = strList(o.adds, 5);
  const modifies = strList(o.modifies, 4);
  const materials = strList(o.materials, 8);
  const steps = strList(o.steps, 8);
  const proposed = o.visual && typeof o.visual === "object" ? parseVisual(o.visual) : null;
  return {
    summary:
      typeof o.summary === "string" && o.summary.trim().length > 8
        ? o.summary.trim().slice(0, 280)
        : canned.summary,
    adds: adds.length >= 2 ? adds : canned.adds,
    modifies: modifies.length >= 1 ? modifies : canned.modifies,
    materials: materials.length ? materials : canned.materials,
    steps: steps.length ? steps : canned.steps,
    visual: buildOutVisual(draft.visual, proposed),
    imagePrompt:
      typeof o.imagePrompt === "string" && o.imagePrompt.length > 12
        ? o.imagePrompt.slice(0, 500)
        : canned.imagePrompt,
    model,
  };
}

export function proposalMarkdown(input: {
  day: string;
  slot: number;
  kind: CiKind;
  title: string;
  body: string;
  sponsor: string;
  visual: CiVisual;
}): string {
  return `# ${input.title}

Kind: ${input.kind}
Sponsor: ${input.sponsor}
Day: ${input.day}
Slot: ${input.slot}

${input.body}

This proposal is a pull request. It lands on \`main\` only if it wins the six-hour stake-weighted ballot. Venice then upsamples the winner — extra parts, and a modification of something already seated — and that merge is what \`main\` tracks.

## Ballot visual

\`\`\`json
${JSON.stringify(input.visual, null, 2)}
\`\`\`
`;
}

export function proposalPatch(input: {
  day: string;
  slot: number;
  kind: CiKind;
  title: string;
  body: string;
  sponsor: string;
  visual: CiVisual;
  branch: string;
}): string {
  return (
    JSON.stringify(
      {
        op: "propose",
        day: input.day,
        slot: input.slot,
        kind: input.kind,
        title: input.title,
        body: input.body,
        sponsor: input.sponsor,
        branch: input.branch,
        visual: input.visual,
        landsOn: "main-only-if-merged",
      },
      null,
      2,
    ) + "\n"
  );
}

export function proposalBundle(input: {
  day: string;
  slot: number;
  kind: CiKind;
  title: string;
  body: string;
  sponsor: string;
  visual: CiVisual;
}): { branch: string; title: string; body: string; files: GhFile[] } {
  const branch = proposalBranch(input.day, input.slot, input.title);
  const paths = proposalPaths(input.day, input.slot, input.title);
  const title = `CI ${input.day}: ${input.title}`.slice(0, 72);
  const body = [
    input.body,
    "",
    `Kind **${input.kind}** · sponsor **${input.sponsor}** · slot ${input.slot}.`,
    "",
    "Stake-weighted hall ballot. This pull request merges to `main` only if it wins.",
    "The winner is upsampled with Venice (private text) so the build adds parts and modifies what is already seated.",
    "Losing proposals are closed. `hall/state.json` on `main` is the seated hall.",
  ].join("\n");
  return {
    branch,
    title,
    body,
    files: [
      { path: paths.md, content: proposalMarkdown({ ...input }) },
      { path: paths.json, content: proposalPatch({ ...input, branch }) },
    ],
  };
}

export function installNote(input: {
  day: string;
  title: string;
  kind: CiKind;
  sponsor: string;
  packet: UpsamplePacket;
  prUrl: string | null;
}): string {
  const adds = input.packet.adds.map((a) => `- ${a}`).join("\n");
  const mods = input.packet.modifies.map((a) => `- ${a}`).join("\n");
  return `# ${input.title}

Kind: ${input.kind}
Sponsor: ${input.sponsor}
Day: ${input.day}
Model: ${input.packet.model}
Pull request: ${input.prUrl ?? "pending"}

${input.packet.summary}

## Adds

${adds}

## Modifies

${mods}

Merged to \`main\`. That merge is the change.
`;
}

export function applyWinnerToState(
  prev: HallStateDoc | null,
  input: {
    day: string;
    slot: number;
    kind: CiKind;
    title: string;
    body: string;
    visual: CiVisual;
    packet: UpsamplePacket;
    branch: string;
    prNumber: number | null;
    prUrl: string | null;
    now?: string;
  },
): HallStateDoc {
  const base = prev ?? emptyHallState(input.now);
  const install: HallInstall = {
    day: input.day,
    slot: input.slot,
    kind: input.kind,
    title: input.title,
    body: input.body,
    adds: input.packet.adds,
    modifies: input.packet.modifies,
    visual: input.visual,
    prNumber: input.prNumber,
    prUrl: input.prUrl,
  };
  return {
    ...base,
    policy: HALL_POLICY,
    repo: GITHUB_URL,
    updatedAt: input.now ?? new Date().toISOString(),
    installs: [install, ...base.installs.filter((row) => !(row.day === input.day && row.slot === input.slot))].slice(0, 48),
    openProposals: base.openProposals.filter((row) => row.branch !== input.branch && !(row.day === input.day && row.slot === input.slot)),
  };
}

export function withOpenProposal(prev: HallStateDoc | null, row: HallOpen, now?: string): HallStateDoc {
  const base = prev ?? emptyHallState(now);
  const rest = base.openProposals.filter((r) => r.branch !== row.branch);
  return {
    ...base,
    updatedAt: now ?? base.updatedAt,
    openProposals: [row, ...rest].slice(0, 24),
  };
}

export function renderHallState(doc: HallStateDoc): string {
  return JSON.stringify(doc, null, 2) + "\n";
}

export function mergePlan(rows: { slot: number; branch: string }[], winnerSlot: number): { merge: string; close: string[] } {
  const win = rows.find((r) => r.slot === winnerSlot) ?? rows[0];
  if (!win) return { merge: "", close: [] };
  return {
    merge: win.branch,
    close: rows.filter((r) => r.branch !== win.branch).map((r) => r.branch),
  };
}

export function samePr(a: CiPr | null, b: CiPr): boolean {
  return !!a && a.branch === b.branch && a.number === b.number && a.state === b.state && a.url === b.url && a.sha === b.sha;
}
