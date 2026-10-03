import type { FlyState } from "./fly-sim.ts";

let live: FlyState[] | null = null;

export function publishFlies(flies: FlyState[]) {
  live = flies;
}

export function peekFly(index: number): FlyState | null {
  return live?.[index] ?? null;
}
