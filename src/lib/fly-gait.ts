/** Drosophila-like step timing shared by the VNC motor and the body mesh. */

/** Fraction of a step spent in swing (recovery). Stance is the rest. */
export const SWING_DUTY = 0.38;

/**
 * Step cycle rate in rad/s. Real fruit flies step at 10–18 Hz. Hall-scale
 * bodies are huge, so we sit at a readable ~6–11 Hz — still a scurry, not a
 * stroll, without turning the tripod into a blur.
 */
export function strideOmega(gait: number): number {
  const g = Math.min(Math.max(gait, 0), 12);
  return (6.2 + g * 0.32) * Math.PI * 2;
}

export type LegCycle = {
  u: number;
  swinging: boolean;
  swingU: number;
  stanceU: number;
};

export function legCycle(t: number, gait: number, phase: number, tripodPhase: number): LegCycle {
  const cycle = t * strideOmega(gait) + tripodPhase + phase;
  const u = ((cycle / (Math.PI * 2)) % 1 + 1) % 1;
  const swinging = u < SWING_DUTY;
  return {
    u,
    swinging,
    swingU: swinging ? u / SWING_DUTY : 0,
    stanceU: swinging ? 0 : (u - SWING_DUTY) / (1 - SWING_DUTY),
  };
}

/**
 * Forward shove during stance of one tripod. Walk translation should pulse
 * with this so the body hitch-steps instead of skating.
 */
export function stridePush(t: number, gait: number, phase: number): number {
  const c = legCycle(t, gait, phase, 0);
  if (c.swinging) return 0.32 + 0.12 * Math.sin(c.swingU * Math.PI);
  return 0.58 + 0.42 * Math.sin(c.stanceU * Math.PI);
}
