/** WebGL flags for the hall. Tuned so iframe / preview compositors keep a frame. */

export const WORLD_CLEAR = "#12161b";
export const WORLD_CLEAR_RGB = [0x12, 0x16, 0x1b] as const;

export const WORLD_GL = {
  antialias: true,
  alpha: false,
  stencil: false,
  depth: true,
  preserveDrawingBuffer: true,
  powerPreference: "default" as const,
  failIfMajorPerformanceCaveat: false,
};

export type WorldGlFlags = {
  preserveDrawingBuffer?: boolean;
  powerPreference?: string;
  failIfMajorPerformanceCaveat?: boolean;
  alpha?: boolean;
};

/** high-performance + no drawing-buffer is what made the live preview look empty. */
export function worldGlIsPreviewSafe(gl: WorldGlFlags): boolean {
  return (
    gl.preserveDrawingBuffer === true &&
    gl.alpha === false &&
    gl.powerPreference !== "high-performance" &&
    gl.failIfMajorPerformanceCaveat !== true
  );
}

/**
 * Context creation is not a painted hall.
 * `info.render.calls` is unusable here: ContactShadows does a later pass that
 * auto-resets the counter to 1–2. Use the renderer frame index plus our own
 * useFrame ticks (tick 1 is before the first render).
 */
export function hallHasPainted(frame: number, ticks: number): boolean {
  if (!Number.isFinite(frame) || !Number.isFinite(ticks)) return false;
  return frame >= 1 && ticks >= 2;
}

/** Do not create a WebGL context until the host actually has a box. */
export function hallHostReady(width: number, height: number): boolean {
  return Number.isFinite(width) && Number.isFinite(height) && width >= 8 && height >= 8;
}

export function hallFitSize(
  parentW: number,
  parentH: number,
  winW: number,
  winH: number,
): { width: number; height: number } | null {
  const fromParent = hallHostReady(parentW, parentH);
  const width = fromParent ? parentW : winW;
  const height = fromParent ? parentH : winH;
  if (!hallHostReady(width, height)) return null;
  return { width, height };
}

/** 2D scratch of the WebGL buffer — never mounted in the page (compositors paint canvases black). */
export function blitNeedsResize(srcW: number, srcH: number, dstW: number, dstH: number): boolean {
  if (!hallHostReady(srcW, srcH)) return false;
  return srcW !== dstW || srcH !== dstH;
}

export function hallPixelDelta(r: number, g: number, b: number): number {
  return Math.abs(r - WORLD_CLEAR_RGB[0]) + Math.abs(g - WORLD_CLEAR_RGB[1]) + Math.abs(b - WORLD_CLEAR_RGB[2]);
}

/**
 * True when sampled RGB triples look like the hall, not a dead buffer.
 * Unrendered WebGL copies as 0,0,0 — that is NOT clear-color and used to
 * replace the poster with a black JPEG. Require both "not clear" and some
 * actual light (teal torus, steel, lamps).
 * Packed as r,g,b[,a] repeating.
 */
export function hallFrameLooksPainted(packed: ArrayLike<number>): boolean {
  if (packed.length < 9) return false;
  const stride = packed.length % 4 === 0 && packed.length % 3 !== 0 ? 4 : 3;
  const n = Math.floor(packed.length / stride);
  let hits = 0;
  let lit = 0;
  for (let i = 0; i < n; i++) {
    const o = i * stride;
    const r = packed[o]!;
    const g = packed[o + 1]!;
    const b = packed[o + 2]!;
    if (hallPixelDelta(r, g, b) > 48) hits += 1;
    if (r + g + b >= 140) lit += 1;
  }
  return hits >= Math.max(2, Math.ceil(n * 0.12)) && lit >= Math.max(1, Math.ceil(n * 0.08));
}
