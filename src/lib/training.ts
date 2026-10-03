import { BRAIN_REGIONS, ROLE_TRAINING, type RegionId } from "./fly-brain.ts";
import { ROLES, type RoleId } from "./roles.ts";

export type TrainingSample = {
  id?: number;
  role: RoleId;
  region: RegionId;
  fn: string;
  note: string;
  reward: number;
  source: string;
  createdAt?: string;
};

const REGION_IDS = new Set(BRAIN_REGIONS.map((r) => r.id));

export function isRoleId(id: string): id is RoleId {
  return ROLES.some((r) => r.id === id);
}

export function isRegionId(id: string): id is RegionId {
  return REGION_IDS.has(id as RegionId);
}

export function parseTrainingSample(raw: unknown): TrainingSample | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.role !== "string" || !isRoleId(o.role)) return null;
  if (typeof o.region !== "string" || !isRegionId(o.region)) return null;
  const fn = typeof o.fn === "string" && o.fn.trim() ? o.fn.trim().slice(0, 64) : "job_execute";
  const note = typeof o.note === "string" ? o.note.trim().slice(0, 280) : "";
  const reward = typeof o.reward === "number" && Number.isFinite(o.reward) ? Math.min(1, Math.max(0, o.reward)) : 0.2;
  const source = typeof o.source === "string" ? o.source.trim().slice(0, 80) : "agent";
  return { role: o.role, region: o.region, fn, note, reward, source };
}

export function catalogTraining() {
  return {
    citation: "Google/Janelia male Drosophila CNS 2026 — reduced neuropil training tables",
    roles: ROLE_TRAINING,
    regions: BRAIN_REGIONS.map((r) => ({ id: r.id, name: r.name, neuropil: r.neuropil, partition: r.partition })),
  };
}
