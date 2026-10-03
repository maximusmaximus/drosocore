import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  FLY_FOOT,
  FLY_GUIDE_SCALE,
  FLY_SCALE,
  FLY_SCALE_PREV,
  NEARBY_RANGE,
  TALK_RANGE,
  flyFollowY,
  flyPlantY,
  flySpeechY,
} from "./fly-view.ts";

describe("hall crew scale", () => {
  it("is 60% of the previous giant workers", () => {
    assert.equal(FLY_SCALE, FLY_SCALE_PREV * 3 * 0.6);
    assert.ok(Math.abs(FLY_SCALE - 5.67) < 1e-9);
    assert.ok(Math.abs(FLY_GUIDE_SCALE - 6.66) < 1e-9);
  });

  it("plants tarsi on the sim contact point", () => {
    const y = 0.92;
    assert.equal(flyPlantY(y), y + FLY_FOOT * FLY_SCALE);
    assert.ok(flyPlantY(y) - y > 1.2);
    assert.ok(flySpeechY(y) > flyFollowY(y));
    assert.ok(flyFollowY(y) > flyPlantY(y));
  });

  it("lets giant bodies talk without occupying the same point", () => {
    assert.ok(TALK_RANGE > 2);
    assert.ok(NEARBY_RANGE > TALK_RANGE);
  });
});
