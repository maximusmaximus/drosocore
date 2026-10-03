import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { getClientMounted, getServerMounted, subscribeClientMount } from "./client-mount.ts";
import { AD_SPACES } from "./ad-spaces.ts";
import { TF_COUNT, MISSING_COIL, HALL_R, R0 } from "./constants.ts";
import { createFlies } from "./fly-sim.ts";
import { HOME_POS, HOME_POLAR, fittedZoom, clampZoom } from "./cam-focus.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function src(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("client world mount", () => {
  it("is off during SSR and notifies on the client", async () => {
    assert.equal(getServerMounted(), false);
    assert.equal(getClientMounted(), true);
    let n = 0;
    const unsub = subscribeClientMount(() => {
      n += 1;
    });
    await new Promise((r) => setTimeout(r, 20));
    unsub();
    assert.equal(n, 1);
  });

  it("does not gate the hall on rAF or a timeout", () => {
    const sim = src("components/ReactorSim.tsx");
    assert.match(sim, /lazy\(/);
    assert.match(sim, /scene\/World/);
    assert.doesNotMatch(sim, /setMountWorld/);
    assert.doesNotMatch(sim, /requestAnimationFrame/);
  });

  it("always mounts World — not behind the client snapshot", () => {
    const sim = src("components/ReactorSim.tsx");
    assert.match(sim, /<World /);
    assert.doesNotMatch(sim, /onClient \?\s*\([\s\S]*<World/);
  });

  it("code-splits the WebGL tree and prefetches it at module eval", () => {
    const sim = src("components/ReactorSim.tsx");
    assert.match(sim, /loadWorld/);
    assert.match(sim, /lazy\(loadWorld\)/);
    assert.match(sim, /import\(\s*["']\.\/scene\/World["']/);
    assert.match(sim, /void loadWorld\(\)/);
    assert.match(sim, /FlyInspector/);
    assert.match(sim, /Walkthrough/);
    assert.match(sim, /NftReveal/);
    assert.doesNotMatch(sim, /import\s+\{\s*World\s*\}\s+from\s+["']\.\/scene\/World["']/);
  });
});

describe("worldReady store", () => {
  it("starts cold and latches", () => {
    const store = src("lib/store.ts");
    assert.match(store, /worldReady: boolean/);
    assert.match(store, /markWorldReady:\s*\(\)\s*=>\s*void/);
    assert.match(store, /worldReady:\s*false/);
    assert.match(store, /shouldAutoGuide/);
    assert.match(store, /worldReady:\s*true/);
  });
});

describe("hall graph still exists", () => {
  it("World mounts Hall, Reactor, flies, and pings ready", () => {
    const world = src("components/scene/World.tsx");
    assert.match(world, /<Hall/);
    assert.match(world, /<Reactor/);
    assert.match(world, /<Flies/);
    assert.match(world, /markWorldReady/);
    assert.match(world, /<Canvas/);
    assert.doesNotMatch(world, /HallBackdrop/);
    assert.doesNotMatch(world, /createPortal/);
    assert.doesNotMatch(world, /createRoot/);
    assert.ok(world.length > 2000);
  });

  it("Hall and Reactor are real meshes, not empty shells", () => {
    const hall = src("components/scene/Hall.tsx");
    const reactor = src("components/scene/Reactor.tsx");
    assert.ok(hall.length > 1500, "Hall.tsx was emptied");
    assert.ok(reactor.length > 1500, "Reactor.tsx was emptied");
    assert.match(hall, /InstancedMesh|BoxGeometry|makeHallFloor/);
    assert.match(reactor, /TF_COUNT|millerCurve|torus/i);
  });

  it("tokamak + ads + crew numbers are finite", () => {
    assert.equal(TF_COUNT, 16);
    assert.ok(MISSING_COIL >= 0 && MISSING_COIL < TF_COUNT);
    assert.ok(HALL_R > R0);
    assert.ok(AD_SPACES.length >= 8);
    assert.equal(createFlies().length, 16);
    assert.ok(Number.isFinite(HOME_POS.x + HOME_POS.y + HOME_POS.z));
    assert.ok(Number.isFinite(HOME_POLAR));
    assert.ok(fittedZoom(1280, 800) > 10);
    assert.equal(clampZoom(Number.NaN), 10);
  });
});
