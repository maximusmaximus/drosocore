import { MISSING_COIL, R0, TF_COUNT } from "./constants.ts";

export type AdSection =
  | "floor"
  | "cabinet"
  | "crate"
  | "nbi"
  | "scaffold"
  | "crane"
  | "shield"
  | "walk"
  | "wall";

/** "up" sits on a deck; "out" stands on a vertical face. */
export type AdMount = "up" | "out";

export type AdSpace = {
  id: string;
  label: string;
  section: AdSection;
  position: [number, number, number];
  /** World yaw for "out"; in-plane spin for "up" (applied after flattening). */
  yaw: number;
  mount: AdMount;
  /** Kept as the outer group rotation for wall frames. */
  rotation: [number, number, number];
  /** Distance along the face normal so the board clears the mesh. */
  lift: number;
  size: [number, number];
};

export const AD_SECTION_ORDER: AdSection[] = [
  "wall",
  "floor",
  "cabinet",
  "crate",
  "nbi",
  "scaffold",
  "crane",
  "shield",
  "walk",
];

export const AD_SECTION_LABEL: Record<AdSection, string> = {
  wall: "hall walls",
  floor: "floor pads",
  cabinet: "cabinets",
  crate: "crates",
  nbi: "NBI housings",
  scaffold: "coil scaffold",
  crane: "crane",
  shield: "shields",
  walk: "catwalks",
};

const PI = Math.PI;
export const MISS_A = (MISSING_COIL / TF_COUNT) * PI * 2;

/** Shield panel yaw so the large faces are radial (thin axis points out). */
export function shieldPanelYaw(a: number): number {
  return PI / 2 - a;
}

/** Billboard on the inner face, looking back at the vessel. */
export function shieldAdYaw(a: number): number {
  return -a - PI / 2;
}

function craneWorld(local: [number, number, number]): [number, number, number] {
  const a = MISS_A;
  const ox = Math.cos(a) * 8.35;
  const oz = Math.sin(a) * 8.35;
  const yaw = -a + PI;
  const [lx, ly, lz] = local;
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return [ox + lx * c + lz * s, ly, oz - lx * s + lz * c];
}

function space(partial: Omit<AdSpace, "rotation">): AdSpace {
  const rotation: [number, number, number] =
    partial.mount === "up" ? [-PI / 2, 0, 0] : [0, partial.yaw, 0];
  return { ...partial, rotation };
}

export const AD_SPACES: AdSpace[] = [
  ...Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * PI * 2 + 0.38;
    return space({
      id: `floor-${i}`,
      label: `floor pad ${i + 1}`,
      section: "floor",
      position: [Math.cos(a) * 7.55, 0.03, Math.sin(a) * 7.55],
      yaw: -a - PI / 2,
      mount: "up",
      lift: 0.045,
      size: [1.62, 0.92],
    });
  }),
  space({
    id: "cab-a-top",
    label: "east cabinet lid",
    section: "cabinet",
    position: [6.9, 1.19, 4.2],
    yaw: 0,
    mount: "up",
    lift: 0.03,
    size: [0.92, 0.54],
  }),
  space({
    id: "cab-a-face",
    label: "east cabinet face",
    section: "cabinet",
    position: [6.9, 0.58, 4.55],
    yaw: 0,
    mount: "out",
    lift: 0.04,
    size: [0.96, 0.88],
  }),
  space({
    id: "cab-b-top",
    label: "north cabinet lid",
    section: "cabinet",
    position: [-6.4, 1.19, 5.1],
    yaw: 0,
    mount: "up",
    lift: 0.03,
    size: [1.02, 0.6],
  }),
  space({
    id: "cab-b-face",
    label: "north cabinet face",
    section: "cabinet",
    position: [-6.4, 0.58, 5.475],
    yaw: 0,
    mount: "out",
    lift: 0.04,
    size: [1.06, 0.88],
  }),
  space({
    id: "crate-caution",
    label: "caution crate",
    section: "crate",
    position: [0.15, 0.44, 8.15],
    yaw: 0,
    mount: "up",
    lift: 0.03,
    size: [1.46, 0.58],
  }),
  space({
    id: "crate-w",
    label: "tungsten crate",
    section: "crate",
    position: [-2.2, 0.76, 7.4],
    yaw: 0,
    mount: "up",
    lift: 0.03,
    size: [0.5, 0.5],
  }),
  space({
    id: "nbi-a-top",
    label: "NBI housing",
    section: "nbi",
    position: [7.4, 2.1, 1.35],
    yaw: -0.35,
    mount: "up",
    lift: 0.035,
    size: [2.16, 1.0],
  }),
  space({
    id: "nbi-b-top",
    label: "west NBI housing",
    section: "nbi",
    position: [-6.9, 1.95, 3.2],
    yaw: 2.3,
    mount: "up",
    lift: 0.035,
    size: [1.86, 0.9],
  }),
  space({
    id: "scaffold-top",
    label: "coil scaffold deck",
    section: "scaffold",
    position: [Math.cos(MISS_A) * (R0 + 2.1), 2.79, Math.sin(MISS_A) * (R0 + 2.1)],
    yaw: -MISS_A,
    mount: "up",
    lift: 0.035,
    size: [1.42, 1.42],
  }),
  space({
    id: "scaffold-mid",
    label: "coil scaffold mid",
    section: "scaffold",
    position: [Math.cos(MISS_A) * (R0 + 2.1), 1.43, Math.sin(MISS_A) * (R0 + 2.1)],
    yaw: -MISS_A,
    mount: "up",
    lift: 0.035,
    size: [1.32, 1.32],
  }),
  space({
    id: "crane-cab",
    label: "crane cab",
    section: "crane",
    position: craneWorld([0, 7.15, -2.5]),
    yaw: -MISS_A,
    mount: "out",
    lift: 0.4,
    size: [0.44, 0.48],
  }),
  space({
    id: "crane-jib",
    label: "crane jib",
    section: "crane",
    position: craneWorld([0, 7.49, 3.4]),
    yaw: -MISS_A,
    mount: "up",
    lift: 0.04,
    size: [0.36, 3.2],
  }),
  ...Array.from({ length: 6 }, (_, i) => {
    const a = ((i + 0.5) / 12) * PI * 2;
    return space({
      id: `shield-${i}`,
      label: `shield ${i + 1}`,
      section: "shield",
      position: [Math.cos(a) * 8.85, 0.55, Math.sin(a) * 8.85],
      yaw: shieldAdYaw(a),
      mount: "out",
      lift: 0.16,
      size: [1.18, 0.92],
    });
  }),
  ...Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * PI * 2;
    return space({
      id: `walk-${i}`,
      label: `catwalk ${i + 1}`,
      section: "walk",
      position: [Math.cos(a) * 6.15, 1.53, Math.sin(a) * 6.15],
      yaw: -a,
      mount: "up",
      lift: 0.03,
      size: [0.48, 0.32],
    });
  }),
  space({
    id: "wall-back-0",
    label: "south wall left",
    section: "wall",
    position: [-10.4, 5.35, -17.38],
    yaw: 0,
    mount: "out",
    lift: 0.1,
    size: [6.4, 3.2],
  }),
  space({
    id: "wall-back-1",
    label: "south wall center",
    section: "wall",
    position: [-2.4, 5.35, -17.38],
    yaw: 0,
    mount: "out",
    lift: 0.1,
    size: [6.4, 3.2],
  }),
  space({
    id: "wall-back-2",
    label: "south wall right",
    section: "wall",
    position: [5.6, 5.35, -17.38],
    yaw: 0,
    mount: "out",
    lift: 0.1,
    size: [6.4, 3.2],
  }),
  space({
    id: "wall-back-3",
    label: "south wall far",
    section: "wall",
    position: [13.2, 5.35, -17.38],
    yaw: 0,
    mount: "out",
    lift: 0.1,
    size: [5.6, 3.2],
  }),
  space({
    id: "wall-west-0",
    label: "west wall south",
    section: "wall",
    position: [-17.38, 5.35, -3.2],
    yaw: PI / 2,
    mount: "out",
    lift: 0.1,
    size: [6.4, 3.2],
  }),
  space({
    id: "wall-west-1",
    label: "west wall mid",
    section: "wall",
    position: [-17.38, 5.35, 4.8],
    yaw: PI / 2,
    mount: "out",
    lift: 0.1,
    size: [6.4, 3.2],
  }),
  space({
    id: "wall-west-2",
    label: "west wall north",
    section: "wall",
    position: [-17.38, 5.35, 12.4],
    yaw: PI / 2,
    mount: "out",
    lift: 0.1,
    size: [6.2, 3.2],
  }),
];

export const AD_SPACE_IDS = new Set(AD_SPACES.map((s) => s.id));

export function adSpaceById(id: string): AdSpace | undefined {
  return AD_SPACES.find((s) => s.id === id);
}

export function adSection(id: string): AdSection {
  const hit = adSpaceById(id);
  if (hit) return hit.section;
  const prefix = id.split("-")[0];
  if (prefix === "cab") return "cabinet";
  if (prefix === "floor") return "floor";
  if (prefix === "crate") return "crate";
  if (prefix === "nbi") return "nbi";
  if (prefix === "scaffold") return "scaffold";
  if (prefix === "crane") return "crane";
  if (prefix === "shield") return "shield";
  if (prefix === "walk") return "walk";
  if (prefix === "wall") return "wall";
  return "floor";
}

export function houseSpaceIds(spaces: AdSpace[] = AD_SPACES): string[] {
  const seen = new Set<AdSection>();
  const out: string[] = [];
  for (const s of spaces) {
    if (seen.has(s.section)) continue;
    seen.add(s.section);
    out.push(s.id);
  }
  return out;
}

export function adFaceNormal(space: Pick<AdSpace, "mount" | "yaw">): { x: number; y: number; z: number } {
  if (space.mount === "up") return { x: 0, y: 1, z: 0 };
  return { x: Math.sin(space.yaw), y: 0, z: Math.cos(space.yaw) };
}

export function adHitScale(size: [number, number]): number {
  const m = Math.min(size[0], size[1]);
  if (m >= 1.1) return 1;
  return Math.min(2.4, 1.2 / Math.max(0.2, m));
}

export function spacesBySection(): { section: AdSection; label: string; spaces: AdSpace[] }[] {
  return AD_SECTION_ORDER.map((section) => ({
    section,
    label: AD_SECTION_LABEL[section],
    spaces: AD_SPACES.filter((s) => s.section === section),
  }));
}
