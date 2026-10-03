import { CORE_POS } from "./constants.ts";
import type { CiGear, CiKind, CiProp, CiVisual } from "./ci.ts";

/** Pad Gary the crane aims at — east of the vessel, short of the ETH plant. */
export const DROP_PAD = { x: 6.4, y: 0, z: -3.15 } as const;
export const CRANE_HOOK = { x: 6.4, y: 14.2, z: -3.15 } as const;

export const DELIVERY_TOTAL = 9.4;

export type DeliveryPhase = "sling" | "drop" | "hatch" | "haul" | "seat" | "done";

export type DeliveryJob = {
  itemId: number;
  cycleId: number;
  kind: CiKind;
  title: string;
  visual: CiVisual;
  startedAt: number;
};

const PHASES: { t: number; phase: DeliveryPhase }[] = [
  { t: 0, phase: "sling" },
  { t: 0.9, phase: "drop" },
  { t: 3.2, phase: "hatch" },
  { t: 4.5, phase: "haul" },
  { t: 7.6, phase: "seat" },
  { t: DELIVERY_TOTAL, phase: "done" },
];

export function phaseAt(elapsed: number): DeliveryPhase {
  const t = Math.max(0, elapsed);
  let phase: DeliveryPhase = "sling";
  for (const row of PHASES) {
    if (t >= row.t) phase = row.phase;
  }
  return phase;
}

export function phaseCopy(phase: DeliveryPhase, title: string): { title: string; body: string } {
  switch (phase) {
    case "sling":
      return { title: "Gary has the pack", body: `${title} is on the hook. Cable paying out.` };
    case "drop":
      return { title: "air-mail inbound", body: `${title} is coming down the well.` };
    case "hatch":
      return { title: "crate on the pad", body: `Lid popping. Crew is on the straps.` };
    case "haul":
      return { title: "flies have the load", body: `Two on the sling. Walking ${title} to its bay.` };
    case "seat":
      return { title: "seating the pack", body: `${title} is going in. Torque and walk away.` };
    case "done":
      return { title: "pack seated", body: `${title} is in the hall.` };
  }
}

export function destFor(kind: CiKind, visual: CiVisual): { x: number; y: number; z: number } {
  if (kind === "reactor") {
    return { x: CORE_POS.x, y: 1.15, z: CORE_POS.z };
  }
  if (kind === "workplace") {
    if (visual.prop === "rack") return { x: 11.4, y: 0.85, z: 7.6 };
    if (visual.prop === "lamp") return { x: CORE_POS.x + 1.6, y: 1.1, z: CORE_POS.z + 1.1 };
    if (visual.prop === "crate") return { x: 12.4, y: 0.42, z: 8.8 };
    if (visual.prop === "decal") return { x: CORE_POS.x, y: 0.04, z: CORE_POS.z + 2.4 };
    return { x: 10.6, y: 0.4, z: 6.8 };
  }
  if (kind === "outfit" || kind === "body") {
    return { x: 4.6, y: 0.55, z: 2.4 };
  }
  return { x: DROP_PAD.x, y: 0.4, z: DROP_PAD.z };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(t: number): number {
  if (t < 0) return 0;
  if (t > 1) return 1;
  return t;
}

function easeOut(t: number): number {
  const x = clamp01(t);
  return 1 - (1 - x) * (1 - x);
}

function easeInOut(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

export type CratePose = {
  x: number;
  y: number;
  z: number;
  sway: number;
  lid: number;
  cable: number;
  visible: boolean;
};

export function cratePose(elapsed: number, dest: { x: number; y: number; z: number }): CratePose {
  const t = Math.max(0, elapsed);
  const phase = phaseAt(t);
  if (phase === "done") {
    return { x: dest.x, y: dest.y, z: dest.z, sway: 0, lid: 1, cable: 0, visible: false };
  }

  if (phase === "sling") {
    const u = clamp01(t / 0.9);
    return {
      x: CRANE_HOOK.x,
      y: lerp(CRANE_HOOK.y - 0.4, CRANE_HOOK.y - 1.6, u),
      z: CRANE_HOOK.z,
      sway: Math.sin(t * 7) * 0.08 * u,
      lid: 0,
      cable: 1,
      visible: true,
    };
  }

  if (phase === "drop") {
    const u = easeOut((t - 0.9) / 2.3);
    const yDrop = lerp(CRANE_HOOK.y - 1.6, 0.55, u);
    const bounce = u > 0.92 ? Math.sin((u - 0.92) * 40) * 0.12 * (1 - (u - 0.92) / 0.08) : 0;
    return {
      x: DROP_PAD.x + Math.sin(t * 5.5) * 0.12 * (1 - u),
      y: yDrop + bounce,
      z: DROP_PAD.z,
      sway: Math.sin(t * 6) * 0.18 * (1 - u),
      lid: 0,
      cable: 1 - u * 0.15,
      visible: true,
    };
  }

  if (phase === "hatch") {
    const u = clamp01((t - 3.2) / 1.3);
    return {
      x: DROP_PAD.x,
      y: 0.52,
      z: DROP_PAD.z,
      sway: 0,
      lid: easeOut(u),
      cable: lerp(0.85, 0.2, u),
      visible: true,
    };
  }

  if (phase === "haul") {
    const u = easeInOut((t - 4.5) / 3.1);
    return {
      x: lerp(DROP_PAD.x, dest.x, u),
      y: lerp(0.52, dest.y + 0.35, u) + Math.sin(u * Math.PI) * 0.45,
      z: lerp(DROP_PAD.z, dest.z, u),
      sway: Math.sin(t * 9) * 0.06,
      lid: 1,
      cable: 0,
      visible: true,
    };
  }

  const u = clamp01((t - 7.6) / 1.8);
  return {
    x: dest.x,
    y: lerp(dest.y + 0.35, dest.y, easeOut(u)),
    z: dest.z,
    sway: 0,
    lid: 1,
    cable: 0,
    visible: u < 0.92,
  };
}

export function courierOffset(
  elapsed: number,
  side: -1 | 1,
  crate: CratePose,
): { x: number; y: number; z: number; airborne: number } {
  const phase = phaseAt(elapsed);
  const orbit = phase === "drop" || phase === "sling" ? 1.15 : 0.72;
  const yOff = phase === "haul" ? 0.22 : phase === "drop" ? 0.9 : 0.35;
  const air = phase === "drop" || phase === "haul" || phase === "sling" ? 1 : 0.15;
  return {
    x: crate.x + side * orbit,
    y: crate.y + yOff,
    z: crate.z + side * 0.18,
    airborne: air,
  };
}

export function warnMarks(remainMs: number): Array<"15m" | "5m" | "1m"> {
  const out: Array<"15m" | "5m" | "1m"> = [];
  if (remainMs <= 15 * 60 * 1000 && remainMs > 0) out.push("15m");
  if (remainMs <= 5 * 60 * 1000 && remainMs > 0) out.push("5m");
  if (remainMs <= 60 * 1000 && remainMs > 0) out.push("1m");
  return out;
}

export function gearLabel(gear: CiGear): string {
  switch (gear) {
    case "hood":
      return "weld hood";
    case "cape":
      return "sensor cape";
    case "harness":
      return "ground harness";
    case "goggles":
      return "cryo goggles";
    case "antenna":
      return "IR antennae";
    default:
      return "kit";
  }
}

export function propLabel(prop: CiProp): string {
  switch (prop) {
    case "rack":
      return "tool crib";
    case "lamp":
      return "pad lamp";
    case "crate":
      return "cable crate";
    case "decal":
      return "floor decal";
    default:
      return "pack";
  }
}
