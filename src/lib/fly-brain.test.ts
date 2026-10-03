import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ROLES, type RoleId } from "./roles.ts";
import {
  BRAIN_REGIONS,
  ROLE_COLLAB,
  ROLE_TRAINING,
  cloneBrain,
  createBrain,
  fnLabel,
  rewardJob,
  rewardTalk,
  skillFromJobs,
  skillFromWork,
  stepBrain,
  talkKind,
  talkQuality,
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

describe("shift talk reward", () => {
  it("classifies shop talk, job coordination, and social chatter", () => {
    assert.equal(talkKind("welder", "welder"), "shop");
    assert.equal(talkKind("welder", "coil"), "coord");
    assert.equal(talkKind("physicist", "coder"), "coord");
    assert.equal(talkKind("janitor", "physicist"), "social");
  });

  it("keeps collaboration symmetric so a handoff pays both trades", () => {
    const ids = ROLES.map((r) => r.id);
    for (const a of ids) {
      for (const b of ROLE_COLLAB[a]) {
        assert.ok(ROLE_COLLAB[b].includes(a), `${a} ↔ ${b}`);
      }
    }
  });

  it("pays more for talk that helps the job than for idle chatter", () => {
    assert.ok(talkQuality("coord") > talkQuality("shop"));
    assert.ok(talkQuality("shop") > talkQuality("social"));
    assert.ok(talkQuality("coord", { onSite: true, hauling: true }) > talkQuality("coord"));
  });

  it("credits antennal / lateral horn and mushroom body after a conversation", () => {
    const b = createBrain(7);
    const al = b.act.antennalLobe;
    const lh = b.act.lateralHorn;
    const mb = b.act.mushroomBody;
    rewardTalk(b, "welder", "coil", 4, { onSite: true, hauling: true });
    assert.equal(b.talksDone, 1);
    assert.ok(b.act.antennalLobe > al);
    assert.ok(b.act.lateralHorn > lh);
    assert.ok(b.act.mushroomBody > mb);
    assert.ok(b.talkBoost > 0.25);
    assert.ok(b.reward > 0);
    assert.equal(b.lastFns[0]?.fn, "talk_reward");
  });

  it("shop talk trains the role's own neuropils; social talk barely moves skill", () => {
    const shop = createBrain(8);
    const social = createBrain(8);
    rewardTalk(shop, "physicist", "physicist", 2);
    rewardTalk(social, "physicist", "janitor", 2);
    assert.ok(shop.act.mushroomBody > social.act.mushroomBody);
    assert.ok(shop.act.centralComplex > social.act.centralComplex);
    assert.ok(shop.talkBoost > social.talkBoost);
    assert.ok(shop.skill > social.skill);
  });

  it("coordination with a partner trade beats same-job shop talk", () => {
    const shop = createBrain(9);
    const coord = createBrain(9);
    rewardTalk(shop, "cryo", "cryo", 3);
    rewardTalk(coord, "cryo", "pipe", 3, { onSite: true, hauling: true });
    assert.ok(coord.reward >= shop.reward);
    assert.ok(coord.talkBoost > shop.talkBoost);
  });

  it("talks raise skill without counting as finished jobs", () => {
    const b = createBrain(10);
    const jobs = b.jobsDone;
    rewardTalk(b, "coder", "electric", 5);
    assert.equal(b.jobsDone, jobs);
    assert.equal(b.talksDone, 1);
    assert.ok(b.skill > skillFromJobs(jobs));
    assert.ok(skillFromWork(4, 4) > skillFromWork(4, 0));
    assert.ok(skillFromWork(4, 8) < skillFromWork(12, 0));
  });

  it("cloneBrain copies talk bookkeeping", () => {
    const a = createBrain(11);
    a.talksDone = 3;
    a.talkBoost = 0.4;
    a.talkCredit = 1.2;
    const b = cloneBrain(a);
    b.talksDone = 0;
    b.talkBoost = 0;
    b.talkCredit = 0;
    assert.equal(a.talksDone, 3);
    assert.equal(a.talkBoost, 0.4);
    assert.equal(a.talkCredit, 1.2);
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
      "talk_reward",
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
    for (const role of ROLES) {
      for (const other of ROLE_COLLAB[role.id]) {
        assert.ok(ids.size > 0);
        assert.ok(ROLES.some((r) => r.id === (other as RoleId)));
      }
    }
  });
});
