import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  cargoForRole,
  cloneFly,
  createFlies,
  scatterSpawn,
  stepFlies,
  warmStartFlies,
  type FlyMode,
  type FlyState,
} from "./fly-sim.ts";
import { ROLES } from "./roles.ts";
import { BRAIN_REGIONS } from "./fly-brain.ts";

function cloneFlies(): FlyState[] {
  return createFlies().map(cloneFly);
}

describe("crew spawn", () => {
  it("does not park everyone on the same ring", () => {
    const flies = createFlies();
    assert.equal(flies.length, ROLES.length);
    const radii = flies.map((f) => Math.hypot(f.pos.x, f.pos.z));
    const minR = Math.min(...radii);
    const maxR = Math.max(...radii);
    assert.ok(maxR - minR > 2.4, `radius spread ${minR.toFixed(2)}..${maxR.toFixed(2)}`);
    const ys = flies.map((f) => f.pos.y);
    assert.ok(Math.max(...ys) - Math.min(...ys) > 0.5);
    const angles = flies.map((f) => Math.atan2(f.pos.z, f.pos.x));
    const sorted = [...angles].sort((a, b) => a - b);
    let maxGap = 0;
    for (let i = 0; i < sorted.length; i++) {
      const a = sorted[i];
      const b = sorted[(i + 1) % sorted.length] + (i + 1 === sorted.length ? Math.PI * 2 : 0);
      maxGap = Math.max(maxGap, b - a);
    }
    assert.ok(maxGap > 0.7, `angle clustering gap ${maxGap}`);
  });

  it("keeps pairwise spacing so they do not spawn in a clump", () => {
    const pts = ROLES.map((_, i) => scatterSpawn(i, i * 17.13 + 2.4 + i * i * 0.37).pos);
    let closest = Infinity;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y, pts[i].z - pts[j].z);
        if (d < closest) closest = d;
      }
    }
    assert.ok(closest > 0.8, `scatter closest ${closest}`);
  });

  it("is already mid-shift: mixed jobs, some cargo", () => {
    const flies = createFlies();
    const modes = new Set(flies.map((f) => f.mode));
    assert.ok(modes.size >= 2, [...modes].join(","));
    assert.ok(flies.some((f) => f.cargo));
    assert.ok(flies.some((f) => f.mode === "goto"));
  });

  it("scatter is deterministic per seed", () => {
    const a = scatterSpawn(3, 41.2);
    const b = scatterSpawn(3, 41.2);
    assert.deepEqual(a, b);
    const c = scatterSpawn(4, 41.2);
    assert.ok(Math.hypot(a.pos.x - c.pos.x, a.pos.z - c.pos.z) > 0.2);
  });
});

describe("jobs", () => {
  it("hands electricians cable and cryo a dewar", () => {
    assert.equal(cargoForRole("electric", 1), "cable");
    assert.equal(cargoForRole("cryo", 1), "dewar");
    assert.equal(cargoForRole("divertor", 1), "tile");
  });

  it("warm start is deterministic", () => {
    const a = cloneFlies();
    const b = cloneFlies();
    assert.equal(a[0].pos.x, b[0].pos.x);
    assert.equal(a[7].mode, b[7].mode);
    assert.equal(a[2].brain.jobsDone, b[2].brain.jobsDone);
  });

  it("steps carrying flies toward a drop without collapsing", () => {
    const flies = createFlies();
    const before = flies.map((f) => ({ ...f.pos }));
    for (let i = 0; i < 30; i++) stepFlies(flies, 1 / 60, false, 400 + i / 60);
    const moved = flies.filter((f, i) => Math.hypot(f.pos.x - before[i].x, f.pos.z - before[i].z) > 0.01);
    assert.ok(moved.length >= 4);
    for (const f of flies) {
      assert.ok(Number.isFinite(f.pos.x) && Number.isFinite(f.pos.y));
    }
  });

  it("warmStartFlies advances the clock without NaNs", () => {
    const flies = createFlies().slice(0, 4);
    warmStartFlies(flies, 2, 10);
    for (const f of flies) assert.ok(Number.isFinite(f.yaw));
  });
});

describe("crew CNS", () => {
  it("gives every worker a male CNS atlas", () => {
    const flies = createFlies();
    for (const f of flies) {
      assert.equal(Object.keys(f.brain.act).length, BRAIN_REGIONS.length);
      assert.ok(f.brain.motor.flap > 0);
    }
  });

  it("rewards completed jobs onto mushroom body skill", () => {
    const flies = createFlies().map(cloneFly);
    const before = flies.reduce((s, f) => s + f.brain.jobsDone, 0);
    for (let i = 0; i < 480; i++) stepFlies(flies, 1 / 60, false, 80 + i / 60);
    const after = flies.reduce((s, f) => s + f.brain.jobsDone, 0);
    assert.ok(after > before, `jobs ${before} -> ${after}`);
    assert.ok(flies.some((f) => f.brain.lastFns.some((t) => t.fn === "reward_update" || t.fn === "job_execute")));
    assert.ok(flies.some((f) => f.brain.skill > 0.05));
  });

  it("logs spatial functions while commuting and talk when conspecifics meet", () => {
    const flies = createFlies().map(cloneFly);
    flies[0].pos = { x: 5, y: 0.9, z: 5 };
    flies[1].pos = { x: 5.2, y: 0.9, z: 5.15 };
    flies[0].target = { x: 8, y: 0.9, z: 5 };
    flies[1].target = { x: 8, y: 0.9, z: 5 };
    const commute: FlyMode = "goto";
    flies[0].mode = commute;
    flies[1].mode = commute;
    let talked = false;
    for (let i = 0; i < 240; i++) {
      stepFlies(flies, 1 / 60, false, 12 + i / 60);
      if (flies.some((f) => f.mode === "talk")) talked = true;
    }
    const fns = new Set(flies.flatMap((f) => f.brain.lastFns.map((t) => t.fn)));
    assert.ok(fns.has("spatial_map") || fns.has("path_integrate") || fns.has("leg_tripod") || fns.has("wing_steer"));
    assert.ok(talked || flies[0].brain.talkIntent > 0.15);
  });
});
