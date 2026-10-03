import { CORE_POS, MISSING_COIL, R0, TF_COUNT, Y0 } from "./constants.ts";
import { cloneBrain, createBrain, rewardJob, rewardTalk, stepBrain, talkKind, type FlyBrain } from "./fly-brain.ts";
import { stridePush } from "./fly-gait.ts";
import { flySpeechY, NEARBY_RANGE, TALK_RANGE } from "./fly-view.ts";
import { ROLES, type Role, type RoleId } from "./roles.ts";
import { danceLine, talkLine } from "./fly-talk.ts";

export type Vec3 = { x: number; y: number; z: number };

export type FlyMode = "goto" | "work" | "talk" | "dance";

/** Drosophila motor: stop, snap-turn, scurry, hop, hover, dart, stall-land. */
export type LocoKind = "pause" | "saccade" | "burst" | "jump" | "hover" | "dart" | "land";

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
  talkWith: number;
  talkCool: number;
  speech: string;
  speechLeft: number;
  phase: number;
  speed: number;
  seed: number;
  cargo: CargoKind | null;
  brain: FlyBrain;
  loco: LocoKind;
  locoLeft: number;
  vy: number;
};

export type SustainSite = { id: string; x: number; y: number; z: number; roles: string[] };

let sustainSites: SustainSite[] = [];
let retiredRules = new Set<string>();
let roster: FlyState[] = [];

export function applySustainWorld(sites: SustainSite[], retired: string[]) {
  sustainSites = sites;
  retiredRules = new Set(retired);
}

function ruleOn(id: string): boolean {
  return !retiredRules.has(id);
}

function siteFor(roleId: string, seed: number): SustainSite | null {
  const mine = sustainSites.filter((s) => s.roles.includes(roleId));
  const pool = mine.length ? mine : sustainSites;
  if (!pool.length) return null;
  return pool[Math.floor(hash01(seed + 4.4) * pool.length)] ?? null;
}

function mezzExempt(id: RoleId): boolean {
  return id === "crane" || id === "builder" || id === "coder";
}

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
  const jx = (hash01(seed + 11.4) - 0.5) * 0.7;
  const jz = (hash01(seed + 19.2) - 0.5) * 0.7;
  const site = siteFor(id, seed);
  if (site && hash01(seed + 2.2) < 0.64) {
    return { x: site.x + jx, y: site.y, z: site.z + jz };
  }
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
  let y = p.y;
  if (ruleOn("mezz-lock") && !mezzExempt(id) && y > 1.2) y = 0.42;
  return { x: p.x + jx, y, z: p.z + jz };
}

export function nextDrop(role: Role, seed: number, time: number): Vec3 {
  const h = hash01(seed + time * 0.13 + 2.1);
  const jx = (hash01(seed + 13.4) - 0.5) * 0.4;
  const jz = (hash01(seed + 17.2) - 0.5) * 0.4;
  const site = siteFor(role.id, seed + time);
  if (site && h < 0.58) return { x: site.x + jx, y: site.y, z: site.z + jz };
  if (ruleOn("vessel-duty") && (prefersCore(role.id) || h < 0.42)) {
    const d = CORE_DROPS[Math.floor(hash01(seed + 8) * CORE_DROPS.length)];
    return { x: d.x + jx, y: d.y, z: d.z + jz };
  }
  if (h < 0.82) {
    const d = vesselDrop(seed + time);
    return { x: d.x + jx, y: d.y, z: d.z + jz };
  }
  const wp = WAYPOINTS[Math.floor(hash01(seed * 3.1 + time) * WAYPOINTS.length)];
  let y = wp.y;
  if (ruleOn("mezz-lock") && !mezzExempt(role.id) && y > 1.2) y = 0.42;
  return { x: wp.x + jx, y, z: wp.z + jz };
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

function startLoco(f: FlyState, kind: LocoKind, dur: number) {
  f.loco = kind;
  f.locoLeft = dur;
}

function beginFetch(f: FlyState, time: number) {
  f.cargo = null;
  f.target = pickupForRole(f.role.id, f.seed + time);
  f.mode = "goto";
  f.pitch = 0;
  f.vy = 0;
  startLoco(f, "saccade", 0.1 + hash01(f.seed + time) * 0.08);
}

function beginHaul(f: FlyState, time: number) {
  if (ruleOn("pair-haul") && roster.length > 1) {
    const mate = roster.find((o) => o.index !== f.index && dist(o.pos, f.pos) < 2.6);
    if (!mate) {
      let near: FlyState | null = null;
      let best = Infinity;
      for (const o of roster) {
        if (o.index === f.index) continue;
        const d = dist(o.pos, f.pos);
        if (d < best) {
          best = d;
          near = o;
        }
      }
      if (near) {
        f.cargo = null;
        f.target = { x: near.pos.x, y: Math.min(near.pos.y, 1.1), z: near.pos.z };
        f.mode = "goto";
        f.pitch = 0;
        f.vy = 0;
        startLoco(f, "saccade", 0.1 + hash01(f.seed + time) * 0.08);
        return;
      }
    }
  }
  f.cargo = cargoForRole(f.role.id, f.seed + time);
  f.target = nextDrop(f.role, f.seed, time);
  f.mode = "goto";
  f.pitch = 0;
  f.vy = 0;
  startLoco(f, "saccade", 0.1 + hash01(f.seed + time) * 0.08);
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
    const paused = hash01(seed + 5.1) > 0.62;
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
      talkWith: -1,
      talkCool: 0,
      speech: "",
      speechLeft: 0,
      phase: seed,
      speed: 0.7 + hash01(seed + 0.4) * 0.95,
      seed,
      cargo,
      brain: createBrain(seed),
      loco: (paused ? "pause" : "burst") as LocoKind,
      locoLeft: 0.16 + hash01(seed + 4.4) * 0.4,
      vy: 0,
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
    if (dist(a.pos, flies[j].pos) < NEARBY_RANGE) n += 1;
  }
  return Math.min(1, n / 2);
}

function isMoving(f: FlyState): boolean {
  return f.mode === "goto" && (f.loco === "burst" || f.loco === "dart" || f.loco === "jump");
}

function senseAndStep(f: FlyState, flies: FlyState[], dt: number, time: number, mode: FlyState["mode"]) {
  const airborneLoco = f.loco === "jump" || f.loco === "hover" || f.loco === "dart" || f.loco === "land";
  stepBrain(
    f.brain,
    {
      distToTarget: dist(f.pos, f.target),
      headingErr: headingError(f),
      nearby: nearbyScore(flies, f.index),
      cargo: Boolean(f.cargo),
      mode,
      grounded: f.pos.y < 1.85 && !airborneLoco,
      role: f.role.id,
      time,
      moving: isMoving(f),
    },
    dt,
  );
}

function finishTalk(f: FlyState, flies: FlyState[], time: number) {
  const partner = f.talkWith >= 0 ? flies[f.talkWith] : undefined;
  const kind = partner ? talkKind(f.role.id, partner.role.id) : "social";
  if (partner) {
    rewardTalk(f.brain, f.role.id, partner.role.id, time, {
      onSite: dist(f.pos, f.target) < 1.6,
      hauling: Boolean(f.cargo),
    });
  }
  f.talkWith = -1;
  f.talkCool = kind === "social" ? 1.6 : 2.4;
  f.mode = "goto";
  startLoco(f, "saccade", 0.12);
}

export function cloneFly(f: FlyState): FlyState {
  return {
    ...f,
    pos: { ...f.pos },
    target: { ...f.target },
    brain: cloneBrain(f.brain),
  };
}

function wrapPi(e: number): number {
  while (e > Math.PI) e -= Math.PI * 2;
  while (e < -Math.PI) e += Math.PI * 2;
  return e;
}

function turnToward(f: FlyState, want: number, maxTurn: number): number {
  const err = wrapPi(want - f.yaw);
  if (err > maxTurn) f.yaw += maxTurn;
  else if (err < -maxTurn) f.yaw -= maxTurn;
  else f.yaw += err;
  return err;
}

function easeToward(cur: number, want: number, dt: number, rate: number): number {
  return cur + (want - cur) * Math.min(1, rate * dt);
}

function clamp(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n;
}

function advanceAlongYaw(f: FlyState, distStep: number) {
  f.pos.x += Math.sin(f.yaw) * distStep;
  f.pos.z += Math.cos(f.yaw) * distStep;
}

const WALK_Y = 2.15;
const PAD_Y = 1.95;

function saccadeDur(err: number, seed: number, time: number): number {
  return 0.06 + Math.min(0.14, Math.abs(err) * 0.07) + hash01(seed + time) * 0.03;
}

function burstDur(seed: number, time: number): number {
  return 0.16 + hash01(seed + time) * 0.36;
}

function pauseDur(seed: number, time: number): number {
  return 0.22 + hash01(seed + time) * 0.55;
}

function hoverDur(seed: number, time: number): number {
  return 0.18 + hash01(seed + time) * 0.42;
}

function dartDur(seed: number, time: number): number {
  return 0.14 + hash01(seed + time) * 0.28;
}

function walkPad(f: FlyState, dt: number, time: number, want: number, err: number, base: number) {
  if (Math.abs(err) > 0.3 && f.loco !== "saccade") {
    startLoco(f, "saccade", saccadeDur(err, f.seed, time));
  }

  if (f.loco === "saccade") {
    turnToward(f, want, 26 * dt);
    f.pitch = easeToward(f.pitch, 0.03, dt, 14);
    f.vy = 0;
    if (f.locoLeft <= 0 || Math.abs(wrapPi(want - f.yaw)) < 0.07) {
      startLoco(f, "pause", 0.1 + hash01(f.seed + time) * 0.14);
    }
    return;
  }

  if (f.loco !== "burst") {
    if (f.loco !== "pause") startLoco(f, "pause", pauseDur(f.seed, time));
    f.yaw += Math.sin(time * 6.4 + f.phase) * 0.14 * dt;
    f.pitch = easeToward(f.pitch, 0.02, dt, 12);
    f.vy = 0;
    if (hash01(f.seed + Math.floor(time * 9) + f.index) > 0.94) {
      advanceAlongYaw(f, -0.55 * dt);
    }
    if (f.locoLeft <= 0) {
      if (Math.abs(err) > 0.2) startLoco(f, "saccade", saccadeDur(err, f.seed, time + 2));
      else startLoco(f, "burst", burstDur(f.seed, time + 3));
    }
    return;
  }

  turnToward(f, want, 2.8 * dt);
  const push = stridePush(time, 8, f.phase);
  const step = base * (5.1 + f.brain.navigateIntent * 1.6) * (0.42 + 0.7 * push) * dt;
  advanceAlongYaw(f, step);
  f.pos.y = easeToward(f.pos.y, f.target.y, dt, 11);
  f.pitch = easeToward(f.pitch, 0.04 + push * 0.05, dt, 16);
  f.vy = 0;
  avoidPit(f);
  if (Math.abs(wrapPi(want - f.yaw)) > 0.52) {
    startLoco(f, "saccade", saccadeDur(err, f.seed, time + 4));
    return;
  }
  if (f.locoLeft <= 0) startLoco(f, "pause", pauseDur(f.seed, time + 5));
}

function takeoffPad(f: FlyState, dt: number, time: number, want: number, err: number, base: number) {
  if (f.loco !== "jump") {
    if (Math.abs(err) > 0.28) {
      startLoco(f, "saccade", saccadeDur(err, f.seed, time));
      turnToward(f, want, 28 * dt);
      f.pitch = easeToward(f.pitch, 0.16, dt, 10);
      f.vy = 0;
      return;
    }
    startLoco(f, "jump", 0.12 + hash01(f.seed + time) * 0.05);
    f.vy = 5.5 + hash01(f.seed + time + 1) * 1.5;
  }
  turnToward(f, want, 8 * dt);
  advanceAlongYaw(f, base * 1.6 * dt);
  f.vy -= 8.4 * dt;
  f.pos.y += f.vy * dt;
  f.pitch = easeToward(f.pitch, 0.58, dt, 12);
  if (f.pos.y < 0.2) {
    f.pos.y = 0.2;
    f.vy = 0;
  }
  if (f.locoLeft <= 0 || f.pos.y > 2.35) startLoco(f, "hover", hoverDur(f.seed, time));
}

function flyAir(
  f: FlyState,
  dt: number,
  time: number,
  want: number,
  err: number,
  dy: number,
  dHoriz: number,
  d: number,
  base: number,
  targetWalk: boolean,
) {
  if (targetWalk && dHoriz < 1.2 && f.pos.y > f.target.y + 0.1 && f.loco !== "land") {
    startLoco(f, "land", 0.28);
  }

  if (f.loco === "land") {
    f.vy = Math.min(f.vy - 14 * dt, -4.6);
    f.pos.y += f.vy * dt;
    advanceAlongYaw(f, base * 0.45 * dt);
    f.pitch = easeToward(f.pitch, 0.88, dt, 9);
    turnToward(f, want, 7 * dt);
    if (f.pos.y <= f.target.y + 0.04) {
      f.pos.y = f.target.y;
      f.vy = 0;
      f.pitch = 0.04;
      startLoco(f, "pause", 0.18 + hash01(f.seed + time) * 0.12);
    }
    avoidPit(f);
    return;
  }

  if (f.loco === "jump") {
    takeoffPad(f, dt, time, want, err, base);
    return;
  }

  if (f.loco === "saccade") {
    turnToward(f, want, 34 * dt);
    f.vy = easeToward(f.vy, Math.sin(time * 16 + f.phase) * 0.35, dt, 8);
    f.pos.y += f.vy * dt;
    f.pitch = easeToward(f.pitch, 0.74, dt, 9);
    if (f.locoLeft <= 0 || Math.abs(wrapPi(want - f.yaw)) < 0.09) {
      startLoco(f, "hover", 0.12 + hash01(f.seed + time) * 0.16);
    }
    return;
  }

  if (f.loco !== "dart") {
    if (f.loco !== "hover") startLoco(f, "hover", hoverDur(f.seed, time));
    const hoverY = f.target.y + (targetWalk ? 0.55 : 0.12);
    f.vy = easeToward(f.vy, (hoverY - f.pos.y) * 2.1 + Math.sin(time * 15 + f.phase) * 0.35, dt, 4.2);
    f.pos.y += f.vy * dt;
    f.pitch = easeToward(f.pitch, 0.78 + Math.sin(time * 13 + f.phase) * 0.05, dt, 7);
    turnToward(f, want, 3.4 * dt);
    if (f.pos.y < 0.18) {
      f.pos.y = 0.18;
      f.vy = 0;
    }
    avoidPit(f);
    if (f.locoLeft <= 0) {
      if (Math.abs(err) > 0.26) startLoco(f, "saccade", saccadeDur(err, f.seed, time + 6));
      else startLoco(f, "dart", dartDur(f.seed, time + 7));
    }
    return;
  }

  const dart = base * (10.8 + f.brain.navigateIntent * 2.4) * dt;
  advanceAlongYaw(f, dart);
  const wantVy = clamp(dy * 2.6, -6.4, 6.4);
  f.vy = easeToward(f.vy, wantVy, dt, 5.2);
  f.pos.y += f.vy * dt;
  if (f.pos.y < 0.18) {
    f.pos.y = 0.18;
    f.vy = 0;
  }
  f.pitch = easeToward(f.pitch, 0.4 + clamp(-f.vy, 0, 4) * 0.05, dt, 8);
  turnToward(f, want, 4.4 * dt);
  avoidPit(f);
  if (f.locoLeft <= 0 || d < 0.5) startLoco(f, "hover", hoverDur(f.seed, time + 8));
}

function stepTravel(f: FlyState, dt: number, time: number) {
  const dx = f.target.x - f.pos.x;
  const dy = f.target.y - f.pos.y;
  const dz = f.target.z - f.pos.z;
  const d = Math.hypot(dx, dy, dz);
  const dHoriz = Math.hypot(dx, dz);
  const laden = f.cargo ? 0.8 : 1.08;
  const trained = 1 + f.brain.skill * 0.28 + f.brain.talkBoost * 0.22;
  const base = f.speed * laden * trained;
  const want = Math.atan2(dx, dz);
  const err = wrapPi(want - f.yaw);
  const targetWalk = f.target.y < WALK_Y;
  const onPad = f.pos.y < PAD_Y && f.loco !== "jump" && f.loco !== "hover" && f.loco !== "dart";

  if (d < 0.22 || (dHoriz < 0.16 && Math.abs(dy) < 0.22)) {
    f.pos.x = f.target.x;
    f.pos.y = f.target.y;
    f.pos.z = f.target.z;
    f.vy = 0;
    f.mode = "work";
    const baseWork = f.cargo ? 1.7 + (f.index % 5) * 0.5 : 0.9 + hash01(f.seed + time) * 1.1;
    f.workLeft = baseWork * (1 - f.brain.talkBoost * 0.4);
    f.pitch = f.cargo ? -0.18 : 0.08;
    startLoco(f, "pause", 0.3);
    return;
  }

  f.locoLeft -= dt;

  if (f.loco === "land") {
    flyAir(f, dt, time, want, err, dy, dHoriz, d, base, targetWalk);
    return;
  }

  if (onPad && targetWalk) {
    walkPad(f, dt, time, want, err, base);
    return;
  }

  if (onPad && !targetWalk) {
    takeoffPad(f, dt, time, want, err, base);
    return;
  }

  flyAir(f, dt, time, want, err, dy, dHoriz, d, base, targetWalk);
}

export function stepFlies(flies: FlyState[], dt: number, celebrating: boolean, time: number) {
  roster = flies;
  if (celebrating) {
    for (const f of flies) {
      f.mode = "dance";
      f.cargo = null;
      f.talkWith = -1;
      startLoco(f, "jump", 0.2);
      const r = 3.6 + (f.index % 5) * 0.42;
      const w = 1.4 + (f.index % 3) * 0.18;
      const a = time * w + f.phase;
      f.pos.x = Math.cos(a) * r;
      f.pos.z = Math.sin(a) * r;
      const hop = Math.abs(Math.sin(time * 14 + f.phase));
      f.pos.y = 0.85 + (hop > 0.35 ? hop * 1.35 : 0.08) + (f.index % 4) * 0.08;
      f.yaw = a + Math.PI / 2;
      f.pitch = 0.4 + hop * 0.25;
      f.vy = hop > 0.35 ? 2 : 0;
      f.speech = danceLine(f.index, time);
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
    if (f.talkCool > 0) f.talkCool -= dt;
    senseAndStep(f, flies, dt, time, f.mode);

    if (f.mode === "talk") {
      f.talkLeft -= dt;
      f.loco = "pause";
      f.pitch = f.brain.motor.headYaw * 0.2;
      const side = Math.sin(time * 4.1 + f.phase) * 0.55 * dt;
      f.pos.x += Math.cos(f.yaw) * side;
      f.pos.z += -Math.sin(f.yaw) * side;
      if (f.talkLeft <= 0) finishTalk(f, flies, time);
      continue;
    }

    if (f.mode === "work") {
      f.workLeft -= dt;
      f.vy = 0;
      f.loco = "pause";
      const twitch = hash01(f.seed + Math.floor(time * 7) + f.index);
      if (twitch > 0.84) f.yaw += (hash01(f.seed + time) - 0.5) * 1.6 * dt * 6;
      f.pitch = easeToward(f.pitch, (f.cargo ? -0.16 : 0.05) + f.brain.motor.abdomen * 0.1, dt, 8);
      if (f.workLeft <= 0) {
        rewardJob(f.brain, f.role.id, time);
        if (f.cargo) beginFetch(f, time + f.index);
        else beginHaul(f, time + f.index);
      }
      continue;
    }

    stepTravel(f, dt, time);
  }

  for (let i = 0; i < flies.length; i++) {
    const a = flies[i];
    if (a.mode !== "goto" && a.mode !== "work") continue;
    if (a.talkCool > 0) continue;
    for (let j = i + 1; j < flies.length; j++) {
      const b = flies[j];
      if (b.mode !== "goto" && b.mode !== "work") continue;
      if (b.talkCool > 0) continue;
      const d = dist(a.pos, b.pos);
      if (d >= TALK_RANGE) continue;
      const kind = talkKind(a.role.id, b.role.id);
      if (ruleOn("job-speech") && kind === "social") continue;
      const jobHelp = kind === "coord" ? 0.32 : kind === "shop" ? 0.16 : 0;
      const affinity = 0.12 + a.brain.talkIntent * 0.55 + b.brain.talkIntent * 0.55 + jobHelp;
      const roll = hash01(a.seed + b.seed + Math.floor(time * 8) + a.index);
      if (roll < affinity * dt * 8) {
        a.mode = "talk";
        b.mode = "talk";
        a.talkLeft = kind === "social" ? 1.15 : 1.7;
        b.talkLeft = a.talkLeft;
        a.talkWith = b.index;
        b.talkWith = a.index;
        a.speech = talkLine(a, b, time);
        b.speech = talkLine(b, a, time + 0.7);
        a.speechLeft = a.talkLeft + 0.4;
        b.speechLeft = b.talkLeft + 0.4;
        const ay = Math.atan2(b.pos.x - a.pos.x, b.pos.z - a.pos.z);
        a.yaw = ay;
        b.yaw = ay + Math.PI;
        a.pitch = 0;
        b.pitch = 0;
        startLoco(a, "pause", a.talkLeft);
        startLoco(b, "pause", b.talkLeft);
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
      out.push({ index: f.index, text: f.speech, x: f.pos.x, y: flySpeechY(f.pos.y), z: f.pos.z });
    }
  }
  return out;
}
