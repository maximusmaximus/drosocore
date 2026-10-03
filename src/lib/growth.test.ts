import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { growthFromEth } from "./growth.ts";

describe("growthFromEth", () => {
  it("starts small and dark with a couple of idle leads", () => {
    const g = growthFromEth(0);
    assert.equal(g.level, 0);
    assert.equal(g.wires, 2);
    assert.ok(g.scale < 1.2);
    assert.ok(g.glow < 1.1);
    assert.ok(g.modules >= 2);
  });

  it("grows wires, glow, and modules as ETH arrives", () => {
    const a = growthFromEth(0.02);
    const b = growthFromEth(0.25);
    const c = growthFromEth(1);
    assert.ok(b.wires > a.wires);
    assert.ok(c.wires >= b.wires);
    assert.ok(b.glow > a.glow);
    assert.ok(c.height > b.height);
    assert.ok(c.modules >= b.modules);
    assert.ok(c.scale > a.scale);
  });

  it("is finite on junk", () => {
    const g = growthFromEth(Number.NaN);
    assert.equal(g.level, 0);
    assert.ok(Number.isFinite(g.glow));
  });
});
