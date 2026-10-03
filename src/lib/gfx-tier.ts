/** Pick a hall quality tier from what the browser/GPU actually offers. */

export type GfxTier = "low" | "mid" | "high";

export type GfxHints = {
  gpu?: string;
  maxTex?: number;
  maxAniso?: number;
  dpr?: number;
  cores?: number;
  memory?: number;
  mobile?: boolean;
  saveData?: boolean;
  width?: number;
  reducedMotion?: boolean;
};

export type GfxProfile = {
  tier: GfxTier;
  dprMax: number;
  anisotropy: number;
  texSize: number;
  extraDetail: boolean;
  bump: boolean;
  envBoost: number;
  fogDensity: number;
  contact: { opacity: number; blur: number; scale: number; far: number; resolution: number };
  lampLights: boolean;
};

const HIGH_GPU =
  /rtx|geforce rtx|gtx 16|gtx 10|gtx 20|radeon rx|radeon pro|arc a|arc b|apple m[1-9]|m1 (pro|max|ultra)|m2|m3|m4|nvidia.*[3-9]\d{3}/i;
const WEAK_GPU =
  /uhd graphics|hd graphics \d|intel\(r\) hd|iris xe|adreno [1-6]|mali-g[1-5]|mali-t|powervr|intel iris(?! xe plus)/i;
const SOFTWARE_GPU = /swiftshader|llvmpipe|softpipe|microsoft basic|gdi generic|virtualbox|vmware|lavapipe/i;

export function detectGfxTier(h: GfxHints = {}): GfxTier {
  if (h.saveData || h.reducedMotion) return "low";
  const gpu = h.gpu ?? "";
  if (SOFTWARE_GPU.test(gpu)) return "low";
  if ((h.maxTex ?? 8192) < 4096) return "low";
  if ((h.memory ?? 8) > 0 && (h.memory ?? 8) < 4) return "low";

  if (h.mobile) {
    if (HIGH_GPU.test(gpu) && (h.memory ?? 4) >= 6) return "mid";
    if (/adreno \(tm\) [78]|adreno [78]|mali-g[7-9]|apple gpu/i.test(gpu) && (h.memory ?? 4) >= 6) return "mid";
    if ((h.width ?? 400) >= 900 && (h.dpr ?? 2) <= 2 && (h.cores ?? 4) >= 6) return "mid";
    return "low";
  }

  if (WEAK_GPU.test(gpu) || (h.cores ?? 8) < 4 || (h.width ?? 1280) < 700) return "low";
  if (HIGH_GPU.test(gpu) && (h.cores ?? 8) >= 6) return "high";
  if ((h.dpr ?? 1) >= 2 && (h.cores ?? 8) >= 8 && (h.memory ?? 8) >= 8) return "high";
  return "mid";
}

export function gfxProfile(tier: GfxTier, maxAniso = 16): GfxProfile {
  const clampA = (n: number) => Math.max(1, Math.min(n, maxAniso || 1));
  if (tier === "low") {
    return {
      tier,
      dprMax: 1.15,
      anisotropy: clampA(2),
      texSize: 256,
      extraDetail: false,
      bump: false,
      envBoost: 0.94,
      fogDensity: 0.013,
      contact: { opacity: 0.34, blur: 2.8, scale: 36, far: 12, resolution: 256 },
      lampLights: false,
    };
  }
  if (tier === "high") {
    return {
      tier,
      dprMax: 2,
      anisotropy: clampA(16),
      texSize: 1024,
      extraDetail: true,
      bump: true,
      envBoost: 1.16,
      fogDensity: 0.0085,
      contact: { opacity: 0.56, blur: 1.7, scale: 44, far: 16, resolution: 1024 },
      lampLights: true,
    };
  }
  return {
    tier: "mid",
    dprMax: 1.5,
    anisotropy: clampA(8),
    texSize: 512,
    extraDetail: true,
    bump: true,
    envBoost: 1.05,
    fogDensity: 0.011,
    contact: { opacity: 0.48, blur: 2.4, scale: 42, far: 14, resolution: 512 },
    lampLights: true,
  };
}

export function readGfxHintsFromNavigator(): GfxHints {
  if (typeof navigator === "undefined") return { mobile: false, cores: 8, dpr: 1, width: 1280 };
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  const ua = nav.userAgent ?? "";
  const coarse = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  return {
    mobile: coarse || /Mobi|Android|iPhone|iPad/i.test(ua),
    cores: nav.hardwareConcurrency,
    memory: nav.deviceMemory,
    dpr: typeof window !== "undefined" ? window.devicePixelRatio : 1,
    width: typeof window !== "undefined" ? window.innerWidth : 1280,
    saveData: Boolean(nav.connection?.saveData),
    reducedMotion: reduced,
  };
}

export function gpuNameFromContext(gl: { getExtension?: (n: string) => { UNMASKED_RENDERER_WEBGL?: number } | null; getParameter?: (p: number) => unknown; RENDERER?: number }): string {
  try {
    const ext = gl.getExtension?.("WEBGL_debug_renderer_info");
    if (ext && gl.getParameter && ext.UNMASKED_RENDERER_WEBGL != null) {
      return String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? "");
    }
    if (gl.getParameter && gl.RENDERER != null) return String(gl.getParameter(gl.RENDERER) ?? "");
  } catch {
    /* some browsers throw on unmasked renderer */
  }
  return "";
}

export function profileFromGl(
  gl: { capabilities?: { maxTextureSize?: number; getMaxAnisotropy?: () => number }; getContext?: () => unknown },
  nav: GfxHints = readGfxHintsFromNavigator(),
): GfxProfile {
  const ctx = gl.getContext?.() as Parameters<typeof gpuNameFromContext>[0] | null;
  const gpu = ctx ? gpuNameFromContext(ctx) : nav.gpu;
  const maxTex = gl.capabilities?.maxTextureSize ?? nav.maxTex;
  const maxAniso = gl.capabilities?.getMaxAnisotropy?.() ?? nav.maxAniso ?? 8;
  const tier = detectGfxTier({ ...nav, gpu, maxTex, maxAniso });
  return gfxProfile(tier, maxAniso);
}
