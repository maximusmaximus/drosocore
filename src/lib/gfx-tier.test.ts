import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { detectGfxTier, gfxProfile, gpuNameFromContext, profileFromGl } from "./gfx-tier.ts";
import { WORLD_GL, worldGlIsPreviewSafe } from "./world-gl.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("gfx tier", () => {
  it("sends software and tiny GPUs to low", () => {
    assert.equal(detectGfxTier({ gpu: "Google SwiftShader", maxTex: 8192 }), "low");
    assert.equal(detectGfxTier({ gpu: "llvmpipe", cores: 16, memory: 32 }), "low");
    assert.equal(detectGfxTier({ gpu: "Apple M3", maxTex: 2048 }), "low");
    assert.equal(detectGfxTier({ saveData: true, gpu: "GeForce RTX 4090" }), "low");
    assert.equal(detectGfxTier({ reducedMotion: true }), "low");
  });

  it("keeps phones conservative unless the GPU is clearly strong", () => {
    assert.equal(detectGfxTier({ mobile: true, gpu: "Mali-G52", width: 390 }), "low");
    assert.equal(detectGfxTier({ mobile: true, gpu: "Adreno (TM) 730", memory: 8, width: 412 }), "mid");
    assert.equal(detectGfxTier({ mobile: true, gpu: "Apple M2", memory: 8 }), "mid");
  });

  it("promotes discrete / Apple Silicon desktops to high", () => {
    assert.equal(detectGfxTier({ gpu: "NVIDIA GeForce RTX 4070", cores: 12, memory: 16, mobile: false }), "high");
    assert.equal(detectGfxTier({ gpu: "Apple M3 Pro", cores: 11, memory: 18, mobile: false }), "high");
    assert.equal(detectGfxTier({ gpu: "AMD Radeon RX 7800 XT", cores: 8, mobile: false }), "high");
  });

  it("leaves integrated desktops on mid or low", () => {
    assert.equal(detectGfxTier({ gpu: "Intel(R) UHD Graphics 620", cores: 8, mobile: false }), "low");
    assert.equal(detectGfxTier({ gpu: "ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)", cores: 8, memory: 8, mobile: false }), "high");
    const mid = detectGfxTier({ gpu: "ANGLE (NVIDIA, NVIDIA GeForce GTX 1050 Direct3D11)", cores: 6, mobile: false });
    assert.ok(mid === "mid" || mid === "high");
  });

  it("scales maps and dpr with the tier, never past the GPU anisotropy cap", () => {
    const low = gfxProfile("low", 4);
    const mid = gfxProfile("mid", 8);
    const high = gfxProfile("high", 4);
    assert.ok(low.dprMax <= 1.25);
    assert.equal(low.extraDetail, false);
    assert.equal(low.bump, false);
    assert.ok(mid.texSize >= 512);
    assert.equal(mid.extraDetail, true);
    assert.ok(high.dprMax >= 2);
    assert.equal(high.anisotropy, 4);
    assert.ok(high.texSize > mid.texSize);
    assert.ok(high.contact.resolution >= mid.contact.resolution);
  });

  it("reads an unmasked renderer when the extension exists", () => {
    const gl = {
      getExtension: (n: string) => (n === "WEBGL_debug_renderer_info" ? { UNMASKED_RENDERER_WEBGL: 7 } : null),
      getParameter: (p: number) => (p === 7 ? "Apple M2" : ""),
    };
    assert.match(gpuNameFromContext(gl), /M2/);
  });

  it("does not touch the preview-safe GL flags", () => {
    assert.equal(worldGlIsPreviewSafe(WORLD_GL), true);
    const p = profileFromGl({ capabilities: { maxTextureSize: 8192, getMaxAnisotropy: () => 8 } }, { gpu: "Apple M3", cores: 8, mobile: false });
    assert.equal(p.tier, "high");
    assert.equal(WORLD_GL.powerPreference, "default");
    assert.equal(WORLD_GL.preserveDrawingBuffer, true);
  });
});

describe("hall quality wiring", () => {
  it("World picks a tier after the GL context exists and still pumps the hall", () => {
    const world = readFileSync(join(root, "components/scene/World.tsx"), "utf8");
    assert.match(world, /profileFromGl|detectGfxTier/);
    assert.match(world, /HallPump/);
    assert.match(world, /WORLD_GL/);
    assert.match(world, /gl\.render\(scene, camera\)/);
    assert.doesNotMatch(world, /powerPreference:\s*["']high-performance["']/);
    assert.doesNotMatch(world, /EffectComposer/);
  });

  it("Hall and Reactor bind surface maps from the gfx pack", () => {
    const hall = readFileSync(join(root, "components/scene/Hall.tsx"), "utf8");
    const reactor = readFileSync(join(root, "components/scene/Reactor.tsx"), "utf8");
    const mats = readFileSync(join(root, "components/scene/materials.ts"), "utf8");
    const surf = readFileSync(join(root, "components/scene/surf-maps.ts"), "utf8");
    const flies = readFileSync(join(root, "components/scene/Flies.tsx"), "utf8");
    assert.match(hall, /applySurfMaps|useGfx/);
    assert.match(hall, /extraDetail/);
    assert.match(reactor, /applySurfMaps|useGfx/);
    assert.match(mats, /applySurfMaps/);
    assert.match(mats, /metalnessMap/);
    assert.match(surf, /steelMetal|makeMetalPack/);
    assert.match(flies, /applySurfMaps/);
  });
});
