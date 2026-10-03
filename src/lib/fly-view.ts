/** World-space sizes for hall crew, docent, and portrait flies. */

export const FLY_SCALE_PREV = 3.15;
/** Giant pass (3×) then 60% of that — hall workers, not billboard mascots. */
export const FLY_SCALE = FLY_SCALE_PREV * 3 * 0.6;
export const FLY_GUIDE_SCALE = 11.1 * 0.6;
export const FLY_PORTRAIT_SCALE = 2.2;

/** Local-space drop from thorax origin to tarsal contact. */
export const FLY_FOOT = 0.24;
/** Local-space rise from thorax origin to speech glyph. */
export const FLY_HEAD = 0.22;

/** Hats/tools were authored for the blob fly; sit them on the flybody head. */
export const GEAR_FIT = 0.5;
export const GEAR_POS: [number, number, number] = [0, 0.018, 0.094];

export const TALK_RANGE = 2.2;
export const NEARBY_RANGE = 2.6;

export function flyPlantY(posY: number, scale = FLY_SCALE): number {
  return posY + FLY_FOOT * scale;
}

export function flySpeechY(posY: number, scale = FLY_SCALE): number {
  return posY + (FLY_FOOT + FLY_HEAD) * scale;
}

export function flyFollowY(posY: number, scale = FLY_SCALE): number {
  return posY + (FLY_FOOT + 0.08) * scale;
}
