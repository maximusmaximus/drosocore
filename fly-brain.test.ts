import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ROLES } from "./roles.ts";
import {
  BRAIN_REGIONS,
  ROLE_TRAINING,
  cloneBrain,
  createBrain,
  fnLabel,
  rewardJob,
  skillFromJobs,
  stepBrain,
  topRegions,
  type BrainSense,
  type RegionId,
} from "./fly-brain.ts";

function sense(over: Partial<BrainSense> = {}): BrainSense {
  return {
    distToTarget: 4,
    headingErr: 0.2,
    nearby: 0,
    cargo: false,
    mode: "goto",
    grounded: true,
    role: "builder",
    time: 1,
    ...over,
  };
}

describe("male CNS atlas", () => {
  it("covers optic, central, and VNC partitions like the 2026 map", () => {
    const parts = new Set(BRAIN_REGIONS.map((r) => r.partition));
    assert.deepEqual([...parts].sort(), ["central", "optic", "vnc"]);
    assert.ok(BRAIN_REGIONS.length >= 10);
    assert.ok(BRAIN_REGIONS.every((r) => r.neuropil.length > 2));
  });

  it("trains every hall role on named neuropils", () => {
    for (const role of ROLES) {
      const t = ROLE_TRAINING[role.id];
      assert.ok(t, role.id);
      const w = Object.values(t).reduce((a, b) => a + b, 0);
      assert.ok(w > 0.8, role.id);
    }
  });
});

describe("stepBrain", () => {
  it("nearby conspecifics drive antennal lobe and talk intent", () => {
    const far = createBrain(2);
    const near = createBrain(2);
    stepBrain(far, sense({ nearby: 0 }), 0.08);
    stepBrain(near, sense({ nearby: 1 }), 0.08);
    assert.ok(near.act.antennalLobe > far.act.antennalLobe);
    assert.ok(near.talkIntent > far.talkIntent);
  });

  it("grounded walking lights VNC T1–T3; flight lights wing neuropil", () => {
    const walk = createBrain(3);
    const fly = createBrain(3);
    stepBrain(walk, sense({ grounded: true, mode: "goto" }), 0.1);
    stepBrain(fly, sense({ grounded: false, mode: "goto" }), 0.1);
    assert.ok(walk.act.vncWalk > fly.act.vncWalk);
    assert.ok(fly.act.vncWing > walk.act.vncWing);
    assert.ok(fly.motor.flap > walk.motor.flap);
  });

  it("logs spatial and motor functions while commuting", () => {
    const b = createBrain(4);
    for (let i = 0; i < 12; i++) stepBrain(b, sense({ time: i * 0.2, headingErr: 0.9 }), 0.2);
    const fns = new Set(b.lastFns.map((t) => t.fn));
    assert.ok(fns.has("spatial_map") || fns.has("path_integrate"));
    assert.ok(fns.has("leg_tripod") || fns.has("wing_steer"));
    assert.ok(b.lastFns.every((t) => t.regions.length > 0));
  });
});

describe("job reward", () => {
  it("credits mushroom body and the role's trained regions", () => {
    const b = createBrain(5);
    const before = b.act.mushroomBody;
    rewardJob(b, "physicist", 10);
    assert.ok(b.jobsDone >= 1);
    assert.ok(b.act.mushroomBody > before);
    assert.ok(b.skill > 0);
    assert.equal(b.lastFns[0]?.fn, "reward_update");
    const top = topRegions(b, 3).map((r) => r.id);
    assert.ok(top.includes("mushroomBody") || b.act.mushroomBody > 0.3);
  });

  it("skill saturates with jobs", () => {
    assert.ok(skillFromJobs(0) < 0.05);
    assert.ok(skillFromJobs(8) > skillFromJobs(2));
    assert.ok(skillFromJobs(80) > 0.95);
  });

  it("cloneBrain isolates activity", () => {
    const a = createBrain(6);
    a.act.opticLobe = 0.9;
    const b = cloneBrain(a);
    b.act.opticLobe = 0.1;
    assert.equal(a.act.opticLobe, 0.9);
  });
});

describe("labels", () => {
  it("names every function in plain english", () => {
    const fns: string[] = [];
    const ids = [
      "visual_fixate",
      "path_integrate",
      "spatial_map",
      "conspecific_signal",
      "talk_pulse",
      "tool_grasp",
      "job_execute",
      "reward_update",
      "wing_steer",
      "leg_tripod",
    ] as const;
    for (const id of ids) {
      const s = fnLabel(id);
      assert.match(s, /[a-z]/);
      fns.push(s);
    }
    assert.equal(new Set(fns).size, ids.length);
  });

  it("region ids stay in the atlas", () => {
    const ids = new Set(BRAIN_REGIONS.map((r) => r.id));
    for (const role of ROLES) {
      for (const k of Object.keys(ROLE_TRAINING[role.id]) as RegionId[]) {
        assert.ok(ids.has(k), k);
      }
    }
  });
});
