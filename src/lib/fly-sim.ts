import { CORE_POS, MISSING_COIL, R0, TF_COUNT, Y0 } from "./constants.ts";
import { cloneBrain, createBrain, rewardJob, stepBrain, type FlyBrain } from "./fly-brain.ts";
import { ROLES, type Role, type RoleId } from "./roles.ts";
import { speechAt } from "./ascii.ts";

export type Vec3 = { x: number; y: number; z: number };

export type FlyMode = "goto" | "work" | "talk" | "dance";

export type CargoKind = "cable" | "coil" | "crate" | "pipe" | "tile" | "dewar";

export const CALLSIGNS = [
  "Helix",
  "Toroid",
  "Alfven",
  "Gyro",
  "Quark",
  "Boson",
  "Stellar",
  "Wendel",
  "Magnum",
  "Solen",
  "Divertina",
  "Cryona",
  "Plasma",
  "Neutrino",
  "Photon",
  "Flux",
] as const;

export type FlyState = {
  index: number;
  role: Role;
  name: string;
  pos: Vec3;
  yaw: number;
  pitch: number;
  target: Vec3;
  mode: FlyMode;
  workLeft: number;
  talkLeft: number;
  speech: string;
  speechLeft: number;
  phase: number;
  speed: number;
  seed: number;
  cargo: CargoKind | null;
  brain: FlyBrain;
};

export type Waypoint = Vec3 & { kind: "walk" | "air" };

function v(x: number, y: number, z: number, kind: Waypoint["kind"] = "walk"): Waypoint {
  return { x, y, z, kind };
}

export function hash01(s: number): number {
  const x = Math.sin(s * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Hall pick-up benches, reels, racks — not a ring around the vessel. */
export const PICKUPS: Vec3[] = [
  { x: 13.05, y: 0.92, z: 9.35 },
  { x: 14.4, y: 0.82, z: 8.15 },
  { x: 12.0, y: 0.68, z: 8.05 },
  { x: -13.15, y: 0.88, z: 10.9 },
  { x: 14.55, y: 1.05, z: -10.85 },
  { x: -8.2, y: 0.78, z: 13.25 },
  { x: 13.9, y: 1.35, z: -3.15 },
  { x: -14.35, y: 1.18, z: 3.05 },
  { x: -14.85, y: 1.12, z: -1.85 },
  { x: -14.7, y: 1.72, z: 3.8 },
  { x: -12.35, y: 3.42, z: -10.15 },
  { x: -10.05, y: 3.42, z: -11.35 },
  { x: 8.15, y: 0.42, z: 11.45 },
  { x: -4.55, y: 0.38, z: 12.05 },
  { x: 10.85, y: 0.52, z: 2.45 },
  { x: 6.15, y: 0.34, z: -10.7 },
  { x: 8.05, y: 0.4, z: 4.55 },
  { x: 5.45, y: 1.42, z: -6.85 },
  { x: -7.15, y: 0.38, z: 6.05 },
  { x: 0.35, y: 0.22, z: 8.45 },
  { x: -8.55, y: 1.65, z: -3.05 },
  { x: 8.55, y: 1.5, z: -1.05 },
  { x: 2.05, y: 4.15, z: 3.25 },
  { x: -3.05, y: 5.05, z: -2.25 },
];

export function buildWaypoints(): Waypoint[] {
  const pts: Waypoint[] = PICKUPS.map((p) => v(p.x, p.y, p.z, p.y > 2.4 ? "air" : "walk"));
  pts.push(v(CORE_POS.x, 0.95, CORE_POS.z, "walk"));
  pts.push(v(CORE_POS.x + 0.85, 1.15, CORE_POS.z + 0.4, "walk"));
  pts.push(v(CORE_POS.x - 0.7, 0.72, CORE_POS.z + 0.55, "walk"));
  pts.push(v(CORE_POS.x + 0.2, 1.55, CORE_POS.z - 0.6, "walk"));
  const missA = (MISSING_COIL / TF_COUNT) * Math.PI * 2;
  pts.push(v(Math.cos(missA) * 8.2, 6.35, Math.sin(missA) * 8.2, "air"));
  pts.push(v(Math.cos(missA) * 5.4, 3.4, Math.sin(missA) * 5.4, "air"));
  pts.push(v(7.15, 1.85, 1.1, "walk"));
  pts.push(v(-6.7, 1.7, 3.05, "walk"));
  pts.push(v(0.2, 0.16, 8.1, "walk"));
  return pts;
}

export const WAYPOINTS = buildWaypoints();

const CORE_DROPS: Vec3[] = [
  { x: CORE_POS.x + 0.72, y: 0.62, z: CORE_POS.z + 0.18 },
  { x: CORE_POS.x - 0.58, y: 0.78, z: CORE_POS.z + 0.52 },
  { x: CORE_POS.x + 0.22, y: 1.22, z: CORE_POS.z - 0.64 },
  { x: CORE_POS.x - 0.18, y: 1.55, z: CORE_POS.z + 0.08 },
  { x: CORE_POS.x + 0.55, y: 0.95, z: CORE_POS.z - 0.22 },
  { x: CORE_POS.x - 0.72, y: 1.08, z: CORE_POS.z - 0.38 },
];

function vesselDrop(seed: number): Vec3 {
  const a = hash01(seed * 1.7) * Math.PI * 2;
  const y = Y0 + (hash01(seed * 2.3) - 0.5) * 1.55;
  const r = R0 + 1.12 + hash01(seed * 0.9) * 0.4;
  return { x: Math.cos(a) * r, y, z: Math.sin(a) * r };
}

export function cargoForRole(id: RoleId, seed: number): CargoKind {
  const h = hash01(seed + 4.2);
  switch (id) {
    case "electric":
    case "coder":
    case "diag":
    case "magnet":
      return "cable";
    case "coil":
      return h > 0.45 ? "coil" : "cable";
    case "welder":
      return h > 0.5 ? "coil" : "tile";
    case "pipe":
    case "vacuum":
      return "pipe";
    case "cryo":
      return "dewar";
    case "divertor":
      return "tile";
    default:
      return h > 0.62 ? "pipe" : "crate";
  }
}

function prefersCore(id: RoleId): boolean {
  return (
    id === "electric" ||
    id === "coder" ||
    id === "diag" ||
    id === "magnet" ||
    id === "builder" ||
    id === "crane"
  );
}

export function pickupForRole(id: RoleId, seed: number): Vec3 {
  const pool: number[] =
    id === "pipe" || id === "vacuum"
      ? [8, 9, 7]
      : id === "cryo"
        ? [4, 5, 6]
        : id === "coil" || id === "welder" || id === "divertor"
          ? [0, 1, 2, 3]
          : id === "builder" || id === "crane"
            ? [10, 11, 22, 23]
            : id === "electric" || id === "coder" || id === "magnet"
              ? [6, 14, 16, 21]
              : id === "janitor" || id === "safety"
                ? [12, 13, 19, 18]
                : [15, 17, 20, 16, 19];
  const i = pool[Math.floor(hash01(seed + 6.1) * pool.length)] ?? 0;
  const p = PICKUPS[i % PICKUPS.length];
  const jx = (hash01(seed + 11.4) - 0.5) * 0.7;
  const jz = (hash01(seed + 19.2) - 0.5) * 0.7;
  return { x: p.x + jx, y: p.y, z: p.z + jz };
}

export function nextDrop(role: Role, seed: number, time: number): Vec3 {
  const h = hash01(seed + time * 0.13 + 2.1);
  const jx = (hash01(seed + 13.4) - 0.5) * 0.4;
  const jz = (hash01(seed + 17.2) - 0.5) * 0.4;
  if (prefersCore(role.id) || h < 0.42) {
    const d = CORE_DROPS[Math.floor(hash01(seed + 8) * CORE_DROPS.length)];
    return { x: d.x + jx, y: d.y, z: d.z + jz };
  }
  if (h < 0.82) {
    const d = vesselDrop(seed + time);
    return { x: d.x + jx, y: d.y, z: d.z + jz };
  }
  const wp = WAYPOINTS[Math.floor(hash01(seed * 3.1 + time) * WAYPOINTS.length)];
  return { x: wp.x + jx, y: wp.y, z: wp.z + jz };
}

function lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  const s = Math.sin(t * Math.PI) * 0.55;
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t + s,
    z: a.z + (b.z - a.z) * t,
  };
}

export function scatterSpawn(index: number, seed: number): { pos: Vec3; yaw: number; target: Vec3 } {
  const role = ROLES[index % ROLES.length];
  const pick = pickupForRole(role.id, seed);
  const drop = nextDrop(role, seed, seed * 9 + index);
  const u = 0.08 + hash01(seed + 2.2) * 0.82;
  const hauling = hash01(seed + 0.7) > 0.38;
  const from = hauling ? pick : PICKUPS[(index + 7) % PICKUPS.length];
  const to = hauling ? drop : pick;
  const pos = lerp(from, to, u);
  const yaw = Math.atan2(to.x - pos.x, to.z - pos.z);
  return { pos, yaw, target: to };
}

function beginFetch(f: FlyState, time: number) {
  f.cargo = null;
  f.target = pickupForRole(f.role.id, f.seed + time);
  f.mode = "goto";
  f.pitch = 0;
}

function beginHaul(f: FlyState, time: number) {
  f.cargo = cargoForRole(f.role.id, f.seed + time);
  f.target = nextDrop(f.role, f.seed, time);
  f.mode = "goto";
  f.pitch = 0;
}

export function createFlies(): FlyState[] {
  const flies = ROLES.map((role, index) => {
    const seed = index * 17.13 + 2.4 + index * index * 0.37;
    const spawn = scatterSpawn(index, seed);
    const roll = hash01(seed + 9.1);
    const hauling = hash01(seed + 0.7) > 0.38;
    let mode: FlyMode = "goto";
    let cargo: CargoKind | null = hauling ? cargoForRole(role.id, seed) : null;
    let workLeft = 0;
    let pos = spawn.pos;
    let target = spawn.target;
    if (roll < 0.2) {
      const p = pickupForRole(role.id, seed + 3);
      pos = { x: p.x, y: p.y, z: p.z };
      target = p;
      mode = "work";
      cargo = null;
      workLeft = 0.4 + hash01(seed + 1) * 1.8;
    } else if (roll < 0.38) {
      const d = nextDrop(role, seed, seed * 4);
      pos = { x: d.x, y: d.y, z: d.z };
      target = d;
      mode = "work";
      cargo = cargoForRole(role.id, seed + 5);
      workLeft = 0.5 + hash01(seed + 2) * 2.2;
    }
    return {
      index,
      role,
      name: CALLSIGNS[index % CALLSIGNS.length],
      pos,
      yaw: spawn.yaw,
      pitch: 0,
      target,
      mode,
      workLeft,
      talkLeft: 0,
      speech: "",
      speechLeft: 0,
      phase: seed,
      speed: 0.7 + hash01(seed + 0.4) * 0.95,
      seed,
      cargo,
      brain: createBrain(seed),
    };
  });
  warmStartFlies(flies, 2.4, 81.6);
  return flies;
}

export function warmStartFlies(flies: FlyState[], seconds: number, t0: number) {
  const dt = 1 / 60;
  const n = Math.max(0, Math.floor(seconds / dt));
  let t = t0;
  for (let i = 0; i < n; i++) {
    stepFlies(flies, dt, false, t);
    t += dt;
  }
}

function dist(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.hypot(dx, dy, dz);
}

function avoidPit(f: FlyState) {
  const r = Math.hypot(f.pos.x, f.pos.z);
  if (r < 2.15 && f.pos.y < 3.4) {
    const s = 2.2 / (r || 0.2);
    f.pos.x *= s;
    f.pos.z *= s;
  }
}

function headingError(f: FlyState): number {
  const want = Math.atan2(f.target.x - f.pos.x, f.target.z - f.pos.z);
  let e = want - f.yaw;
  while (e > Math.PI) e -= Math.PI * 2;
  while (e < -Math.PI) e += Math.PI * 2;
  return e;
}

function nearbyScore(flies: FlyState[], i: number): number {
  const a = flies[i];
  let n = 0;
  for (let j = 0; j < flies.length; j++) {
    if (j === i) continue;
    if (dist(a.pos, flies[j].pos) < 1.45) n += 1;
  }
  return Math.min(1, n / 2);
}

function senseAndStep(f: FlyState, flies: FlyState[], dt: number, time: number, mode: FlyState["mode"]) {
  stepBrain(
    f.brain,
    {
      distToTarget: dist(f.pos, f.target),
      headingErr: headingError(f),
      nearby: nearbyScore(flies, f.index),
      cargo: Boolean(f.cargo),
      mode,
      grounded: f.pos.y < 2.15,
      role: f.role.id,
      time,
    },
    dt,
  );
}

export function cloneFly(f: FlyState): FlyState {
  return {
    ...f,
    pos: { ...f.pos },
    target: { ...f.target },
    brain: cloneBrain(f.brain),
  };
}

export function stepFlies(flies: FlyState[], dt: number, celebrating: boolean, time: number) {
  if (celebrating) {
    for (const f of flies) {
      f.mode = "dance";
      f.cargo = null;
      const r = 3.6 + (f.index % 5) * 0.42;
      const w = 1.4 + (f.index % 3) * 0.18;
      const a = time * w + f.phase;
      f.pos.x = Math.cos(a) * r;
      f.pos.z = Math.sin(a) * r;
      f.pos.y = 1.1 + Math.abs(Math.sin(time * 6 + f.phase)) * 1.6 + (f.index % 4) * 0.12;
      f.yaw = a + Math.PI / 2;
      f.pitch = Math.sin(time * 8 + f.phase) * 0.5;
      f.speech = f.index % 2 === 0 ? "※※※" : "∞∞∞";
      f.speechLeft = 1;
      senseAndStep(f, flies, dt, time, "dance");
    }
    return;
  }

  for (const f of flies) {
    if (f.mode === "dance") {
      if (hash01(f.seed + time) > 0.5) beginHaul(f, time);
      else beginFetch(f, time);
    }
    if (f.speechLeft > 0) f.speechLeft -= dt;
    senseAndStep(f, flies, dt, time, f.mode);

    if (f.mode === "talk") {
      f.talkLeft -= dt;
      f.pitch = f.brain.motor.headYaw * 0.25;
      if (f.talkLeft <= 0) {
        f.mode = "goto";
      }
      continue;
    }

    if (f.mode === "work") {
      f.workLeft -= dt;
      f.yaw += Math.sin(time * 3.4 + f.phase) * 0.55 * dt;
      f.pitch = Math.sin(time * 14 + f.phase) * 0.18 - (f.cargo ? 0.22 : 0.08) + f.brain.motor.abdomen * 0.12;
      f.pos.y += Math.sin(time * 11 + f.phase) * 0.016;
      if (f.workLeft <= 0) {
        rewardJob(f.brain, f.role.id, time);
        if (f.cargo) beginFetch(f, time + f.index);
        else beginHaul(f, time + f.index);
      }
      continue;
    }

    const dx = f.target.x - f.pos.x;
    const dy = f.target.y - f.pos.y;
    const dz = f.target.z - f.pos.z;
    const d = Math.hypot(dx, dy, dz) || 1;
    const laden = f.cargo ? 0.8 : 1.08;
    const trained = 1 + f.brain.skill * 0.28;
    const spd = f.speed * laden * trained * (dy > 0.4 ? 1.28 : 1);
    const step = spd * dt;
    if (d < 0.22 || step >= d) {
      f.pos.x = f.target.x;
      f.pos.y = f.target.y;
      f.pos.z = f.target.z;
      f.mode = "work";
      f.workLeft = f.cargo ? 1.7 + (f.index % 5) * 0.5 : 0.9 + hash01(f.seed + time) * 1.1;
      f.pitch = f.cargo ? -0.2 : 0.12;
    } else {
      f.pos.x += (dx / d) * step;
      f.pos.y += (dy / d) * step;
      f.pos.z += (dz / d) * step;
      avoidPit(f);
      const turn = 0.55 + f.brain.navigateIntent * 0.45;
      const want = Math.atan2(dx, dz);
      let err = want - f.yaw;
      while (err > Math.PI) err -= Math.PI * 2;
      while (err < -Math.PI) err += Math.PI * 2;
      f.yaw += err * Math.min(1, turn);
      f.pitch = Math.max(-0.5, Math.min(0.5, (-dy / d) * 0.45));
    }
  }

  for (let i = 0; i < flies.length; i++) {
    const a = flies[i];
    if (a.mode !== "goto" && a.mode !== "work") continue;
    for (let j = i + 1; j < flies.length; j++) {
      const b = flies[j];
      if (b.mode !== "goto" && b.mode !== "work") continue;
      const d = dist(a.pos, b.pos);
      if (d >= 0.95) continue;
      const affinity = 0.12 + a.brain.talkIntent * 0.55 + b.brain.talkIntent * 0.55;
      const roll = hash01(a.seed + b.seed + Math.floor(time * 8) + a.index);
      if (roll < affinity * dt * 8) {
        a.mode = "talk";
        b.mode = "talk";
        a.talkLeft = 1.5;
        b.talkLeft = 1.5;
        a.speech = speechAt((i * 7 + (time | 0)) | 0);
        b.speech = speechAt((j * 11 + 3 + (time | 0)) | 0);
        a.speechLeft = 1.9;
        b.speechLeft = 1.9;
        const ay = Math.atan2(b.pos.x - a.pos.x, b.pos.z - a.pos.z);
        a.yaw = ay;
        b.yaw = ay + Math.PI;
        a.pitch = 0;
        b.pitch = 0;
      }
    }
  }
}

export type SpeechBillboard = {
  index: number;
  text: string;
  x: number;
  y: number;
  z: number;
};

export function activeSpeech(flies: FlyState[]): SpeechBillboard[] {
  const out: SpeechBillboard[] = [];
  for (const f of flies) {
    if (f.speechLeft > 0 && f.speech) {
      out.push({ index: f.index, text: f.speech, x: f.pos.x, y: f.pos.y + 0.28, z: f.pos.z });
    }
  }
  return out;
}
