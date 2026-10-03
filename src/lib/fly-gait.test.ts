import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SWING_DUTY, legCycle, strideOmega, stridePush } from "./fly-gait.ts";

describe("drosophila step cycle", () => {
  it("keeps swing shorter than stance", () => {
    assert.ok(SWING_DUTY < 0.5);
    assert.ok(SWING_DUTY > 0.25);
  });

  it("runs a readable hall-scale cadence", () => {
    const hz = strideOmega(6) / (Math.PI * 2);
    assert.ok(hz > 6 && hz < 12, `hz ${hz}`);
  });

  it("alternates tripods 180 degrees apart", () => {
    const a = legCycle(0.2, 6, 0, 0);
    const b = legCycle(0.2, 6, 0, Math.PI);
    assert.equal(a.swinging, !b.swinging);
  });

  it("pushes harder in stance than in swing", () => {
    let maxSwing = 0;
    let maxStance = 0;
    for (let i = 0; i < 40; i++) {
      const t = i / 200;
      const c = legCycle(t, 8, 0, 0);
      const p = stridePush(t, 8, 0);
      if (c.swinging) maxSwing = Math.max(maxSwing, p);
      else maxStance = Math.max(maxStance, p);
    }
    assert.ok(maxStance > maxSwing, `stance ${maxStance} swing ${maxSwing}`);
  });
});
