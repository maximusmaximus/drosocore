import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { emptyVisual } from "./ci.ts";
import {
  courierOffset,
  cratePose,
  CRANE_HOOK,
  DELIVERY_TOTAL,
  destFor,
  DROP_PAD,
  gearLabel,
  phaseAt,
  phaseCopy,
  warnMarks,
} from "./ci-delivery.ts";

describe("gary air-mail", () => {
  it("runs sling → drop → hatch → haul → seat → done", () => {
    assert.equal(phaseAt(0), "sling");
    assert.equal(phaseAt(1.2), "drop");
    assert.equal(phaseAt(3.5), "hatch");
    assert.equal(phaseAt(5.2), "haul");
    assert.equal(phaseAt(8), "seat");
    assert.equal(phaseAt(DELIVERY_TOTAL), "done");
    assert.equal(phaseAt(40), "done");
  });

  it("drops from the hook onto the pad, then hauls to the bay", () => {
    const dest = destFor("workplace", { ...emptyVisual(), prop: "rack" });
    const sling = cratePose(0.2, dest);
    const landed = cratePose(3.3, dest);
    const hauled = cratePose(7.5, dest);
    const done = cratePose(DELIVERY_TOTAL + 0.1, dest);
    assert.ok(sling.y > 10);
    assert.equal(sling.x, CRANE_HOOK.x);
    assert.ok(landed.y < 1.2);
    assert.ok(Math.abs(landed.x - DROP_PAD.x) < 0.2);
    assert.ok(landed.lid > 0);
    assert.ok(Math.abs(hauled.x - dest.x) < 1.2);
    assert.equal(done.visible, false);
    assert.equal(done.x, dest.x);
  });

  it("keeps couriers beside the crate", () => {
    const dest = destFor("reactor", emptyVisual());
    const crate = cratePose(5, dest);
    const a = courierOffset(5, -1, crate);
    const b = courierOffset(5, 1, crate);
    assert.ok(a.x < crate.x);
    assert.ok(b.x > crate.x);
    assert.ok(a.airborne > 0.5);
  });

  it("warns at 15, 5, and 1 minute", () => {
    assert.deepEqual(warnMarks(16 * 60 * 1000), []);
    assert.deepEqual(warnMarks(14 * 60 * 1000), ["15m"]);
    assert.deepEqual(warnMarks(4 * 60 * 1000), ["15m", "5m"]);
    assert.deepEqual(warnMarks(30 * 1000), ["15m", "5m", "1m"]);
    assert.deepEqual(warnMarks(0), []);
  });

  it("names gear and phase copy without emoji", () => {
    assert.equal(gearLabel("hood"), "weld hood");
    const copy = phaseCopy("drop", "PF trim coil");
    assert.match(copy.title, /air-mail/i);
    assert.match(copy.body, /PF trim coil/);
  });
});
