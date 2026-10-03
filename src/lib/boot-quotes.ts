/** Shift talk while the hall comes up. Cycle these; do not invent more in overlays. */

export const BOOT_QUOTES = [
  "bolting TF coil 14. the drawing said 16. we are discussing it.",
  "stretching the solenoid. it keeps recoiling. like us.",
  "the catwalk is load-rated for one fly. we sent three.",
  "plasma vessel: rinse, weld, rinse. do not ask with what.",
  "NBI box is in. the beamline is not. morale is mixed.",
  "running cable tray. the tray is running too.",
  "the missing coil is a feature. engineering signed it.",
  "pouring the hall slab. caution paint went on first. priorities.",
  "crane named Gary is union. Gary wants a raise in ETH.",
  "growing the coupler. every wei a new winding.",
  "floor pads first. ads first. physics can wait in the crate.",
  "the connectome compiled. the budget did not.",
  "tungsten crate is heavier than the briefing. the briefing lied.",
  "PF rings seated. nobody knows what PF stands for.",
  "the flies started construction before the permits. typical.",
  "installing the west wall boards. your ad here, eventually.",
  "hauling a dewar up the mezzanine. gravity remains anti-union.",
  "torqueing the vessel. lefty-loosey does not apply to deuterium.",
] as const;

export const BOOT_MIN_MS = 2400;
export const BOOT_MAX_MS = 12000;
export const BOOT_QUOTE_MS = 2200;
export const BOOT_FADE_MS = 420;

export function bootQuoteAt(i: number, quotes: readonly string[] = BOOT_QUOTES): string {
  const n = quotes.length;
  if (n === 0) return "";
  const idx = ((i % n) + n) % n;
  return quotes[idx]!;
}

/**
 * Poster + SVG hall are in the first HTML. Do not hold the overlay for WebGL —
 * that used to leave chrome over a black GPU canvas when the context failed.
 */
export function bootShouldDismiss(worldReady: boolean, minElapsed: boolean, timedOut: boolean): boolean {
  return minElapsed || timedOut || (worldReady && minElapsed);
}

export function bootCanSkip(worldReady: boolean, minElapsed: boolean): boolean {
  return minElapsed || worldReady;
}
