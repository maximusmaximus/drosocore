import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { peekFly, publishFlies } from "./fly-live.ts";
import { createFlies } from "./fly-sim.ts";

describe("fly live bus", () => {
  it("exposes a worker brain after publish", () => {
    const flies = createFlies();
    publishFlies(flies);
    const f = peekFly(0);
    assert.ok(f);
    assert.ok(f.brain.lastFns.length >= 0);
    assert.equal(peekFly(99), null);
    publishFlies([]);
    assert.equal(peekFly(0), null);
  });
});
