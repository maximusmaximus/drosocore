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
  type LocoKind,
} from "./fly-sim.ts";
import { ROLES } from "./roles.ts";
import { BRAIN_REGIONS } from "./fly-brain.ts";

function cloneFlies(): FlyState[] {
  return createFlies().map(cloneFly);
}

function byRole(flies: FlyState[], id: string): FlyState {
  const f = flies.find((x) => x.role.id === id);
  assert.ok(f, id);
  return f;
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
    assert.equal(a[2].brain.talksDone, b[2].brain.talksDone);
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

describe("drosophila locomotion", () => {
  function isolate(flies: FlyState[], keep: FlyState) {
    for (const o of flies) {
      if (o === keep) continue;
      o.pos = { x: 40 + o.index, y: 0.9, z: 40 };
      o.target = { ...o.pos };
      o.mode = "work";
      o.workLeft = 80;
      o.talkCool = 80;
    }
  }

  it("walks in bursts and pauses instead of gliding", () => {
    const flies = createFlies().map(cloneFly);
    const f = flies[0];
    isolate(flies, f);
    f.mode = "goto";
    f.pos = { x: 8, y: 0.9, z: 6 };
    f.target = { x: 16, y: 0.9, z: 6 };
    f.yaw = Math.atan2(8, 0);
    f.loco = "burst" as LocoKind;
    f.locoLeft = 0.22;
    f.vy = 0;
    const xs: number[] = [];
    let sawPause = false;
    let sawBurst = false;
    const x0 = f.pos.x;
    for (let i = 0; i < 120; i++) {
      stepFlies(flies, 1 / 60, false, 40 + i / 60);
      xs.push(f.pos.x);
      if (f.loco === "pause") sawPause = true;
      if (f.loco === "burst") sawBurst = true;
    }
    let paused = 0;
    for (let i = 1; i < xs.length; i++) {
      if (Math.abs(xs[i] - xs[i - 1]) < 0.003) paused += 1;
    }
    assert.ok(paused >= 8, `paused frames ${paused}`);
    assert.ok(sawPause && sawBurst, `loco pause=${sawPause} burst=${sawBurst}`);
    assert.ok(f.pos.x - x0 > 1.2, `progress ${f.pos.x - x0}`);
    assert.ok(Math.abs(f.pos.y - 0.9) < 0.35);
  });

  it("saccades in place instead of skating toward the target", () => {
    const flies = createFlies().map(cloneFly);
    const f = flies[2];
    isolate(flies, f);
    f.mode = "goto";
    f.pos = { x: 8, y: 0.9, z: 6 };
    f.target = { x: 16, y: 0.9, z: 6 };
    f.yaw = 0;
    f.loco = "saccade" as LocoKind;
    f.locoLeft = 0.28;
    f.vy = 0;
    const startX = f.pos.x;
    const startZ = f.pos.z;
    for (let i = 0; i < 10; i++) stepFlies(flies, 1 / 60, false, 12 + i / 60);
    const moved = Math.hypot(f.pos.x - startX, f.pos.z - startZ);
    assert.ok(moved < 0.22, `skated ${moved.toFixed(3)} x=${f.pos.x.toFixed(3)}`);
    assert.ok(f.loco === "saccade" || Math.abs(f.yaw) > 0.35, `yaw ${f.yaw} loco ${f.loco}`);
  });

  it("jumps into the air toward a high perch", () => {
    const flies = createFlies().map(cloneFly);
    const f = flies[1];
    isolate(flies, f);
    f.mode = "goto";
    f.pos = { x: 8, y: 0.9, z: 6 };
    f.target = { x: 18, y: 5.2, z: 6 };
    f.yaw = Math.atan2(10, 0);
    f.loco = "pause" as LocoKind;
    f.locoLeft = 0.02;
    f.vy = 0;
    let peak = f.pos.y;
    let sawJump = false;
    let sawHover = false;
    let maxPitch = f.pitch;
    for (let i = 0; i < 50; i++) {
      stepFlies(flies, 1 / 60, false, 8 + i / 60);
      peak = Math.max(peak, f.pos.y);
      maxPitch = Math.max(maxPitch, f.pitch);
      if (f.loco === "jump") sawJump = true;
      if (f.loco === "hover" || f.loco === "dart") sawHover = true;
    }
    assert.ok(peak > 1.4, `peak ${peak}`);
    assert.ok(maxPitch > 0.35, `pitch ${maxPitch}`);
    assert.ok(sawJump, "never jumped");
    assert.ok(sawHover, "never hovered or darted");
  });

  it("hovers in place then darts instead of cruising", () => {
    const flies = createFlies().map(cloneFly);
    const f = flies[3];
    isolate(flies, f);
    f.mode = "goto";
    f.pos = { x: 8, y: 3.2, z: 6 };
    f.target = { x: 18, y: 3.2, z: 6 };
    f.yaw = Math.atan2(10, 0);
    f.loco = "hover" as LocoKind;
    f.locoLeft = 0.35;
    f.vy = 0;
    const xs: number[] = [];
    let sawDart = false;
    let sawHover = false;
    const x0 = f.pos.x;
    for (let i = 0; i < 90; i++) {
      stepFlies(flies, 1 / 60, false, 20 + i / 60);
      xs.push(f.pos.x);
      if (f.loco === "dart") sawDart = true;
      if (f.loco === "hover") sawHover = true;
    }
    let slow = 0;
    let fast = 0;
    for (let i = 1; i < xs.length; i++) {
      const dx = xs[i] - xs[i - 1];
      if (dx < 0.015) slow += 1;
      if (dx > 0.08) fast += 1;
    }
    assert.ok(sawDart && sawHover, `dart=${sawDart} hover=${sawHover}`);
    assert.ok(slow >= 6, `slow frames ${slow}`);
    assert.ok(fast >= 4, `fast frames ${fast}`);
    assert.ok(f.pos.x - x0 > 1.5, `air progress ${f.pos.x - x0}`);
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
    let sawJob = false;
    for (let i = 0; i < 480; i++) {
      stepFlies(flies, 1 / 60, false, 80 + i / 60);
      if (flies.some((f) => f.brain.lastFns.some((t) => t.fn === "reward_update" || t.fn === "job_execute"))) {
        sawJob = true;
      }
    }
    const after = flies.reduce((s, f) => s + f.brain.jobsDone, 0);
    assert.ok(after > before, `jobs ${before} -> ${after}`);
    assert.ok(sawJob);
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

describe("talk that helps the job", () => {
  it("pays both workers after a finished conversation", () => {
    const flies = createFlies().map(cloneFly);
    const welder = byRole(flies, "welder");
    const coil = byRole(flies, "coil");
    welder.pos = { x: 4, y: 0.9, z: 4 };
    coil.pos = { x: 4.12, y: 0.9, z: 4.08 };
    welder.target = { x: 4.05, y: 0.9, z: 4.02 };
    coil.target = { x: 4.1, y: 0.9, z: 4.05 };
    welder.mode = "talk";
    coil.mode = "talk";
    welder.talkLeft = 0.04;
    coil.talkLeft = 0.04;
    welder.talkWith = coil.index;
    coil.talkWith = welder.index;
    welder.cargo = "coil";
    coil.cargo = "cable";
    const talks = welder.brain.talksDone;
    stepFlies(flies, 0.08, false, 40);
    assert.ok(welder.brain.talksDone > talks);
    assert.ok(coil.brain.talksDone > talks);
    assert.ok(welder.brain.talkBoost > 0.2);
    assert.ok(coil.brain.reward > 0);
    assert.ok(welder.brain.lastFns.some((t) => t.fn === "talk_reward"));
    assert.equal(welder.mode, "goto");
  });

  it("a job-helpful chat shortens the next plug", () => {
    const src = createFlies();
    const boosted = [cloneFly(src[0])];
    const plain = [cloneFly(src[0])];
    boosted[0].brain.talkBoost = 0.8;
    plain[0].brain.talkBoost = 0;
    boosted[0].mode = "goto";
    plain[0].mode = "goto";
    boosted[0].pos = { ...boosted[0].target };
    plain[0].pos = { ...plain[0].target };
    stepFlies(boosted, 1 / 60, false, 3);
    stepFlies(plain, 1 / 60, false, 3);
    assert.equal(boosted[0].mode, "work");
    assert.equal(plain[0].mode, "work");
    assert.ok(boosted[0].workLeft < plain[0].workLeft, `${boosted[0].workLeft} vs ${plain[0].workLeft}`);
  });

  it("prefers stopping to talk when the other trade actually helps", () => {
    const flies = createFlies().map(cloneFly);
    const welder = byRole(flies, "welder");
    const coil = byRole(flies, "coil");
    const janitor = byRole(flies, "janitor");
    const physicist = byRole(flies, "physicist");
    for (const f of flies) {
      f.mode = "goto";
      f.brain.talkIntent = 0.2;
      f.loco = "pause" as LocoKind;
      f.locoLeft = 12;
    }
    welder.pos = { x: 6, y: 0.9, z: 2 };
    coil.pos = { x: 6.1, y: 0.9, z: 2.05 };
    janitor.pos = { x: -6, y: 0.9, z: -2 };
    physicist.pos = { x: -6.1, y: 0.9, z: -2.05 };
    welder.target = { x: 8, y: 0.9, z: 2 };
    coil.target = { x: 8, y: 0.9, z: 2 };
    janitor.target = { x: -8, y: 0.9, z: -2 };
    physicist.target = { x: -8, y: 0.9, z: -2 };
    welder.yaw = Math.atan2(2, 0);
    coil.yaw = welder.yaw;
    janitor.yaw = Math.atan2(-2, 0);
    physicist.yaw = janitor.yaw;
    let coordTalks = 0;
    let socialTalks = 0;
    for (let i = 0; i < 180; i++) {
      stepFlies(flies, 1 / 30, false, 20 + i / 30);
      if (welder.mode === "talk" && coil.mode === "talk") coordTalks += 1;
      if (janitor.mode === "talk" && physicist.mode === "talk") socialTalks += 1;
    }
    assert.ok(coordTalks > socialTalks, `coord ${coordTalks} social ${socialTalks}`);
  });
});
