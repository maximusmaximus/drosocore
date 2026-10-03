import type { RoleId } from "./roles.ts";

export const CONSENSUS_N = 3;

export type HiveKind = "movement" | "discussion" | "construction" | "user" | "query" | "consensus";
export type HiveFlow = "in" | "out";
export type HiveStatus = "live" | "pending" | "canon";

export type HiveEvent = {
  id: number;
  kind: HiveKind;
  flow: HiveFlow;
  actor: string;
  title: string;
  body: string;
  meta: Record<string, string | number | boolean | null>;
  agreed: number;
  status: HiveStatus;
  createdAt: string;
};

export type HiveMemory = {
  id: number;
  claimKey: string;
  fact: string;
  support: number;
  createdAt: string;
};

export type HiveDraft = {
  kind: HiveKind;
  flow?: HiveFlow;
  actor: string;
  title: string;
  body: string;
  meta?: Record<string, string | number | boolean | null>;
  flyIndex?: number;
  claimKey?: string;
  fact?: string;
};

export type VoteBook = Map<string, { fact: string; voters: number[] }>;

export function emptyVoteBook(): VoteBook {
  return new Map();
}

export function applyVote(
  book: VoteBook,
  key: string,
  fact: string,
  flyIndex: number,
): { votes: number; agreed: boolean; newlyAgreed: boolean; first: boolean } {
  let row = book.get(key);
  if (!row) {
    row = { fact, voters: [] };
    book.set(key, row);
  }
  const first = !row.voters.includes(flyIndex);
  if (first) row.voters.push(flyIndex);
  if (!row.fact) row.fact = fact;
  const votes = row.voters.length;
  const was = votes - (first ? 1 : 0) >= CONSENSUS_N;
  const agreed = votes >= CONSENSUS_N;
  return { votes, agreed, newlyAgreed: agreed && !was && first, first };
}

export function claimBuild(cargo: string | null, roleId: RoleId): string {
  return `build:${cargo ?? roleId}`;
}

export function claimTalk(a: RoleId, b: RoleId): string {
  return a < b ? `talk:${a}:${b}` : `talk:${b}:${a}`;
}

export function zoneOf(x: number, z: number): string {
  const qx = Math.round(x / 4);
  const qz = Math.round(z / 4);
  return `zone:${qx}:${qz}`;
}

export function nearbyFlies<T extends { index: number; pos: { x: number; z: number } }>(
  flies: T[],
  origin: T,
  max: number,
  range = 6,
): T[] {
  const r2 = range * range;
  const out: T[] = [];
  for (const o of flies) {
    if (o.index === origin.index) continue;
    const dx = o.pos.x - origin.pos.x;
    const dz = o.pos.z - origin.pos.z;
    if (dx * dx + dz * dz > r2) continue;
    out.push(o);
    if (out.length >= max) break;
  }
  return out;
}

export function kindLabel(kind: HiveKind): string {
  switch (kind) {
    case "movement":
      return "move";
    case "discussion":
      return "talk";
    case "construction":
      return "build";
    case "user":
      return "you";
    case "query":
      return "recall";
    case "consensus":
      return "agreed";
  }
}

export function flowLabel(flow: HiveFlow): string {
  return flow === "in" ? "in" : "out";
}
