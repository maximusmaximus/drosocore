import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { hallHasPainted, hallHostReady, hallFitSize, blitNeedsResize, hallFrameLooksPainted, WORLD_GL, worldGlIsPreviewSafe } from "./world-gl.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
function src(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("world GL flags", () => {
  it("keeps a drawing buffer so iframe compositors can see the hall", () => {
    assert.equal(WORLD_GL.preserveDrawingBuffer, true);
    assert.equal(WORLD_GL.alpha, false);
    assert.equal(WORLD_GL.powerPreference, "default");
    assert.equal(WORLD_GL.failIfMajorPerformanceCaveat, false);
    assert.equal(worldGlIsPreviewSafe(WORLD_GL), true);
  });

  it("rejects the flags that painted a blank hall under chrome", () => {
    assert.equal(
      worldGlIsPreviewSafe({
        preserveDrawingBuffer: false,
        alpha: false,
        powerPreference: "high-performance",
      }),
      false,
    );
    assert.equal(
      worldGlIsPreviewSafe({ preserveDrawingBuffer: true, alpha: true, powerPreference: "default" }),
      false,
    );
  });
});

describe("hallHasPainted", () => {
  it("ignores context creation and the first useFrame (pre-render)", () => {
    assert.equal(hallHasPainted(0, 0), false);
    assert.equal(hallHasPainted(0, 1), false);
    assert.equal(hallHasPainted(1, 1), false);
    assert.equal(hallHasPainted(0, 2), false);
    assert.equal(hallHasPainted(Number.NaN, 2), false);
  });

  it("latches after a renderer frame and a second tick", () => {
    assert.equal(hallHasPainted(1, 2), true);
    assert.equal(hallHasPainted(4, 8), true);
  });
});

describe("hallHostReady", () => {
  it("rejects an empty iframe box", () => {
    assert.equal(hallHostReady(0, 0), false);
    assert.equal(hallHostReady(1280, 0), false);
    assert.equal(hallHostReady(7, 800), false);
    assert.equal(hallHostReady(1280, 800), true);
  });

  it("falls back to the window when the parent is 0", () => {
    assert.equal(hallFitSize(0, 0, 0, 0), null);
    assert.deepEqual(hallFitSize(0, 0, 1280, 800), { width: 1280, height: 800 });
    assert.deepEqual(hallFitSize(390, 844, 1280, 800), { width: 390, height: 844 });
  });
});

describe("hall blit", () => {
  it("resizes the 2D mirror to the WebGL buffer", () => {
    assert.equal(blitNeedsResize(0, 0, 0, 0), false);
    assert.equal(blitNeedsResize(1280, 800, 0, 0), true);
    assert.equal(blitNeedsResize(1280, 800, 1280, 800), false);
  });

  it("rejects a clear-color frame so we never cover the poster with black", () => {
    const clear = [0x12, 0x16, 0x1b, 0x12, 0x16, 0x1b, 0x11, 0x15, 0x1a, 0x12, 0x16, 0x1b];
    assert.equal(hallFrameLooksPainted(clear), false);
    const hall = [
      0x12, 0x16, 0x1b, 0x5e, 0xea, 0xd4, 0xc4, 0x5c, 0x4a, 0xe8, 0xec, 0xef, 0x8a, 0x90, 0x98, 0x12, 0x16, 0x1b, 0x7c,
      0xf0, 0xd8, 0x3a, 0x42, 0x4a,
    ];
    assert.equal(hallFrameLooksPainted(hall), true);
  });

  it("rejects an all-black buffer (unrendered WebGL copies as 0,0,0)", () => {
    const black = Array.from({ length: 16 * 3 }, () => 0);
    assert.equal(hallFrameLooksPainted(black), false);
    const nearBlack = Array.from({ length: 16 * 3 }, (_, i) => (i % 3 === 0 ? 8 : i % 3 === 1 ? 10 : 12));
    assert.equal(hallFrameLooksPainted(nearBlack), false);
  });
});

describe("World wires the paint latch and preview-safe GL", () => {
  it("does not mark ready from onCreated", () => {
    const world = src("components/scene/World.tsx");
    const created = world.split("onCreated")[1]?.slice(0, 500) ?? "";
    assert.doesNotMatch(created, /markWorldReady/);
    assert.match(world, /hallHasPainted/);
    assert.match(world, /WORLD_GL/);
    assert.match(world, /dataset\.world/);
    assert.match(world, /data-hall-host/);
    assert.match(world, /<Canvas/);
    assert.match(world, /<Hall/);
    assert.match(world, /<Reactor/);
    assert.match(world, /<Flies/);
    assert.match(world, /HallPump/);
    assert.match(world, /gl\.render\(scene, camera\)/);
    assert.doesNotMatch(world, /createPortal/);
    assert.doesNotMatch(world, /createRoot/);
    assert.doesNotMatch(world, /data-hall-blit/);
    assert.doesNotMatch(world, /HallBackdrop/);
    assert.doesNotMatch(world, /toDataURL/);
    assert.doesNotMatch(world, /window\.self !== window\.top/);
  });

  it("does not hide the WebGL canvas", () => {
    const css = src("styles.css");
    assert.doesNotMatch(css, /\[data-hall-host\] canvas\s*\{[^}]*opacity:\s*0/);
    const sim = src("components/ReactorSim.tsx");
    assert.doesNotMatch(sim, /HallBackdrop/);
    assert.doesNotMatch(sim, /hall-poster\.jpg/);
  });
});
