/**
 * Reduced male Drosophila CNS for the hall crew.
 *
 * Grounded in the Google Research + HHMI Janelia complete male fruit-fly
 * central-nervous-system connectome (Cell, 3 Sep 2026): 166,700 neurons,
 * ~125 million synapses, three partitions — central brain, optic lobes, VNC.
 * We do not run 166k cells in the tab. Each worker gets a leaky integrator
 * over the named neuropils those papers map, plus a job-trained policy.
 *
 * Atlas: https://www.janelia.org/project-team/flyem/male-cns-connectome
 */

import type { RoleId } from "./roles.ts";

export const CNS_CITATION =
  "Azevedo et al. / FlyEM + Google Research, Cell 2026. Male Drosophila CNS connectome, 166,700 neurons.";

export type RegionId =
  | "opticLobe"
  | "antennalLobe"
  | "mushroomBody"
  | "centralComplex"
  | "lateralHorn"
  | "aotu"
  | "gnathal"
  | "sez"
  | "descending"
  | "vncWalk"
  | "vncWing";

export type BrainFn =
  | "visual_fixate"
  | "path_integrate"
  | "spatial_map"
  | "conspecific_signal"
  | "talk_pulse"
  | "tool_grasp"
  | "job_execute"
  | "reward_update"
  | "wing_steer"
  | "leg_tripod";

export type RegionSpec = {
  id: RegionId;
  name: string;
  partition: "optic" | "central" | "vnc";
  color: string;
  neuropil: string;
};

/** Colors follow the Janelia/Google figures: optic purple, central green, VNC blue. */
export const BRAIN_REGIONS: RegionSpec[] = [
  { id: "opticLobe", name: "optic lobe", partition: "optic", color: "#c4b5fd", neuropil: "ME / LO / LOP" },
  { id: "aotu", name: "AOTU", partition: "central", color: "#86efac", neuropil: "AOTU008 pathway" },
  { id: "antennalLobe", name: "antennal lobe", partition: "central", color: "#4ade80", neuropil: "AL glomeruli" },
  { id: "mushroomBody", name: "mushroom body", partition: "central", color: "#22c55e", neuropil: "KC / MBON / DAN" },
  { id: "centralComplex", name: "central complex", partition: "central", color: "#16a34a", neuropil: "EB / FB / PB" },
  { id: "lateralHorn", name: "lateral horn", partition: "central", color: "#86efac", neuropil: "LH / PNs" },
  { id: "gnathal", name: "gnathal ganglion", partition: "central", color: "#4ade80", neuropil: "GNG" },
  { id: "sez", name: "SEZ", partition: "central", color: "#bbf7d0", neuropil: "proboscis / tool" },
  { id: "descending", name: "descending neurons", partition: "vnc", color: "#38bdf8", neuropil: "DNs to VNC" },
  { id: "vncWalk", name: "VNC T1–T3", partition: "vnc", color: "#0ea5e9", neuropil: "leg neuropils" },
  { id: "vncWing", name: "VNC wing", partition: "vnc", color: "#0284c7", neuropil: "wing / haltere" },
];

export const REGION_BY_ID = Object.fromEntries(BRAIN_REGIONS.map((r) => [r.id, r])) as Record<
  RegionId,
  RegionSpec
>;

const REGION_IDS = BRAIN_REGIONS.map((r) => r.id);

/** Job training: which neuropils the role practices. Higher = more reward credit. */
export const ROLE_TRAINING: Record<RoleId, Partial<Record<RegionId, number>>> = {
  welder: { sez: 1, vncWalk: 0.85, mushroomBody: 0.45, descending: 0.5 },
  coil: { vncWalk: 0.8, descending: 0.7, centralComplex: 0.5, mushroomBody: 0.4 },
  physicist: { mushroomBody: 1, centralComplex: 0.85, opticLobe: 0.55, aotu: 0.4 },
  pipe: { sez: 0.7, vncWalk: 0.8, centralComplex: 0.45 },
  crane: { aotu: 1, opticLobe: 0.8, descending: 0.7, vncWing: 0.4 },
  inspector: { opticLobe: 0.9, mushroomBody: 0.7, antennalLobe: 0.4 },
  electric: { sez: 0.75, mushroomBody: 0.6, vncWalk: 0.55 },
  cryo: { sez: 0.8, gnathal: 0.4, vncWalk: 0.5 },
  builder: { vncWalk: 0.9, centralComplex: 0.6, descending: 0.55 },
  safety: { opticLobe: 0.7, lateralHorn: 0.8, gnathal: 0.6 },
  diag: { opticLobe: 0.75, mushroomBody: 0.8, aotu: 0.5 },
  coder: { mushroomBody: 1, centralComplex: 0.5, sez: 0.35 },
  divertor: { vncWalk: 0.7, sez: 0.65, centralComplex: 0.4 },
  vacuum: { sez: 0.7, vncWalk: 0.55, antennalLobe: 0.35 },
  magnet: { mushroomBody: 0.7, descending: 0.65, vncWalk: 0.5 },
  janitor: { vncWalk: 0.85, antennalLobe: 0.5, gnathal: 0.4 },
};

export type BrainTrace = {
  fn: BrainFn;
  regions: RegionId[];
  t: number;
};

export type FlyMotor = {
  flap: number;
  gait: number;
  headYaw: number;
  abdomen: number;
  grasp: number;
  airborne: number;
  antennal: number;
};

export type FlyBrain = {
  act: Record<RegionId, number>;
  lastFns: BrainTrace[];
  jobsDone: number;
  skill: number;
  reward: number;
  motor: FlyMotor;
  talkIntent: number;
  workIntent: number;
  navigateIntent: number;
};

export type BrainSense = {
  distToTarget: number;
  headingErr: number;
  nearby: number;
  cargo: boolean;
  mode: "goto" | "work" | "talk" | "dance";
  grounded: boolean;
  role: RoleId;
  time: number;
};

function emptyAct(): Record<RegionId, number> {
  const act = {} as Record<RegionId, number>;
  for (const id of REGION_IDS) act[id] = 0.08;
  return act;
}

export function createBrain(seed: number): FlyBrain {
  const act = emptyAct();
  act.opticLobe = 0.22 + (seed % 1) * 0.08;
  act.mushroomBody = 0.12;
  return {
    act,
    lastFns: [],
    jobsDone: Math.floor((Math.abs(Math.sin(seed * 9.1)) * 4) | 0),
    skill: 0.08,
    reward: 0,
    motor: { flap: 22, gait: 0, headYaw: 0, abdomen: 0, grasp: 0, airborne: 0, antennal: 0.12 },
    talkIntent: 0,
    workIntent: 0,
    navigateIntent: 0.4,
  };
}

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function pushFn(brain: FlyBrain, fn: BrainFn, regions: RegionId[], t: number) {
  const last = brain.lastFns[0];
  if (last && last.fn === fn && t - last.t < 0.28) {
    last.t = t;
    last.regions = regions;
    return;
  }
  brain.lastFns.unshift({ fn, regions, t });
  if (brain.lastFns.length > 8) brain.lastFns.length = 8;
}

function leak(v: number, drive: number, dt: number, tau = 0.18): number {
  return clamp01(v + (drive - v) * Math.min(1, dt / tau));
}

export function skillFromJobs(jobs: number): number {
  return clamp01(1 - Math.exp(-jobs / 11));
}

/**
 * One physics tick of the reduced CNS. Sensory drive → neuropil leak →
 * policy (navigate / talk / work) → VNC motor. Completing a job credits
 * the role's trained regions (DAN-like reward onto mushroom body).
 */
export function stepBrain(brain: FlyBrain, sense: BrainSense, dt: number): FlyBrain {
  const a = brain.act;
  const train = ROLE_TRAINING[sense.role] ?? {};
  const near = clamp01(sense.nearby);
  const dist = sense.distToTarget;
  const close = dist < 0.35;

  a.opticLobe = leak(a.opticLobe, 0.25 + (sense.mode === "goto" ? 0.45 : 0.15) + (1 - Math.min(dist, 8) / 8) * 0.2, dt);
  a.antennalLobe = leak(a.antennalLobe, 0.1 + near * 0.85, dt);
  a.aotu = leak(a.aotu, a.opticLobe * 0.7 + (train.aotu ?? 0) * 0.2, dt);
  a.centralComplex = leak(
    a.centralComplex,
    0.2 + (1 - Math.min(Math.abs(sense.headingErr) / Math.PI, 1)) * 0.55 + (train.centralComplex ?? 0) * 0.15,
    dt,
  );
  a.lateralHorn = leak(a.lateralHorn, near * 0.7 + (train.lateralHorn ?? 0) * 0.2, dt);
  a.gnathal = leak(a.gnathal, near * 0.55 + (sense.mode === "talk" ? 0.8 : 0), dt);
  a.sez = leak(a.sez, (sense.cargo ? 0.55 : 0.12) + (sense.mode === "work" ? 0.7 : 0) + (train.sez ?? 0) * 0.2, dt);
  a.mushroomBody = leak(
    a.mushroomBody,
    0.15 + brain.skill * 0.5 + brain.reward * 0.6 + (train.mushroomBody ?? 0) * 0.25,
    dt,
    0.32,
  );
  a.descending = leak(a.descending, a.centralComplex * 0.45 + a.aotu * 0.25 + a.mushroomBody * 0.25 + a.sez * 0.15, dt);
  a.vncWalk = leak(a.vncWalk, sense.grounded ? a.descending * 0.85 + (train.vncWalk ?? 0) * 0.2 : 0.08, dt);
  a.vncWing = leak(a.vncWing, sense.grounded ? 0.12 + a.descending * 0.2 : 0.35 + a.descending * 0.7, dt);

  brain.navigateIntent = clamp01(a.centralComplex * 0.5 + a.opticLobe * 0.3 + a.aotu * 0.3);
  brain.talkIntent = clamp01(a.lateralHorn * 0.55 + a.gnathal * 0.5 + near * 0.35);
  brain.workIntent = clamp01(a.mushroomBody * 0.4 + a.sez * 0.4 + (close ? 0.45 : 0) + (train.sez ?? 0) * 0.15);

  brain.reward = leak(brain.reward, 0, dt, 0.55);
  brain.skill = skillFromJobs(brain.jobsDone);

  const airborne = sense.grounded ? 0.08 : clamp01(0.4 + a.vncWing);
  brain.motor = {
    flap: 14 + a.vncWing * 62 + (sense.mode === "dance" ? 28 : 0),
    gait: a.vncWalk * 10,
    headYaw: (a.aotu - 0.35) * 0.7,
    abdomen: a.sez * 0.35 + a.gnathal * 0.15,
    grasp: sense.cargo || sense.mode === "work" ? clamp01(0.4 + a.sez) : 0.08,
    airborne,
    antennal: a.antennalLobe,
  };

  if (sense.mode === "talk") {
    pushFn(brain, "conspecific_signal", ["lateralHorn", "antennalLobe"], sense.time);
    pushFn(brain, "talk_pulse", ["gnathal"], sense.time);
  } else if (sense.mode === "work") {
    pushFn(brain, "job_execute", ["mushroomBody", "sez"], sense.time);
    pushFn(brain, "tool_grasp", ["sez", "vncWalk"], sense.time);
  } else if (sense.mode === "goto") {
    pushFn(brain, "spatial_map", ["centralComplex"], sense.time);
    pushFn(brain, sense.grounded ? "leg_tripod" : "wing_steer", [sense.grounded ? "vncWalk" : "vncWing", "descending"], sense.time);
    if (a.opticLobe > 0.4) pushFn(brain, "visual_fixate", ["opticLobe", "aotu"], sense.time);
    if (Math.abs(sense.headingErr) > 0.4) pushFn(brain, "path_integrate", ["centralComplex", "descending"], sense.time);
  }

  return brain;
}

/** Credit the trained neuropils after a completed haul or fetch. */
export function rewardJob(brain: FlyBrain, role: RoleId, t: number): FlyBrain {
  const train = ROLE_TRAINING[role] ?? {};
  let credit = 0.18;
  for (const id of REGION_IDS) {
    const w = train[id] ?? 0;
    if (w > 0) {
      brain.act[id] = clamp01(brain.act[id] + 0.22 * w);
      credit += 0.08 * w;
    }
  }
  brain.act.mushroomBody = clamp01(brain.act.mushroomBody + 0.35);
  brain.jobsDone += 1;
  brain.skill = skillFromJobs(brain.jobsDone);
  brain.reward = clamp01(brain.reward + credit);
  pushFn(brain, "reward_update", ["mushroomBody"], t);
  return brain;
}

export function cloneBrain(b: FlyBrain): FlyBrain {
  return {
    act: { ...b.act },
    lastFns: b.lastFns.map((t) => ({ fn: t.fn, regions: [...t.regions], t: t.t })),
    jobsDone: b.jobsDone,
    skill: b.skill,
    reward: b.reward,
    motor: { ...b.motor },
    talkIntent: b.talkIntent,
    workIntent: b.workIntent,
    navigateIntent: b.navigateIntent,
  };
}

export function topRegions(brain: FlyBrain, n = 3): RegionSpec[] {
  return [...BRAIN_REGIONS].sort((a, b) => brain.act[b.id] - brain.act[a.id]).slice(0, n);
}

export function fnLabel(fn: BrainFn): string {
  switch (fn) {
    case "visual_fixate":
      return "visual fixate";
    case "path_integrate":
      return "path integrate";
    case "spatial_map":
      return "spatial map";
    case "conspecific_signal":
      return "conspecific signal";
    case "talk_pulse":
      return "talk pulse";
    case "tool_grasp":
      return "tool grasp";
    case "job_execute":
      return "job execute";
    case "reward_update":
      return "reward update";
    case "wing_steer":
      return "wing steer";
    case "leg_tripod":
      return "leg tripod";
  }
}
