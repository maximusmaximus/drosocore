import type { CiGear } from "./ci.ts";
import { gearLabel } from "./ci-delivery.ts";
import type { Role } from "./roles.ts";
import type { StageId } from "./tiers.ts";

export type StudioSlot = "fly" | "tool" | "kit" | "upgrade" | "rank";

export type StudioPiece = {
  id: StudioSlot;
  label: string;
  hint: string;
};

/** Pedestal layout around the fly — same view, inspectable kit. */
export function studioPieces(role: Role, stage: StageId, upgrade: CiGear): StudioPiece[] {
  const out: StudioPiece[] = [
    { id: "fly", label: role.title, hint: "drag to orbit the worker" },
    { id: "tool", label: role.tool, hint: "issued tool, off the body" },
    { id: "kit", label: "shift PPE", hint: "hood, vest, belt — pulled off the thorax" },
  ];
  if (upgrade !== "none") {
    out.push({ id: "upgrade", label: gearLabel(upgrade), hint: "CI pack the crew voted on" });
  }
  if (stage === "foreman") {
    out.push({ id: "rank", label: "foreman hat", hint: "white lid for the rank" });
  } else if (stage === "wizard") {
    out.push({ id: "rank", label: "wizard kit", hint: "hat, cape, staff" });
  }
  return out;
}

export function studioFocusIndex(pieces: StudioPiece[], id: StudioSlot): number {
  const i = pieces.findIndex((p) => p.id === id);
  return i < 0 ? 0 : i;
}

/** World offsets for pedestals. Fly sits at origin; others arc in front. */
export function studioOffset(id: StudioSlot, indexAmongExtras: number, extraCount: number): [number, number, number] {
  if (id === "fly") return [0, 0, 0];
  const span = Math.min(2.6, 0.9 + extraCount * 0.35);
  const t = extraCount <= 1 ? 0 : indexAmongExtras / (extraCount - 1);
  const x = (t - 0.5) * span;
  return [x, 0, 1.15];
}
