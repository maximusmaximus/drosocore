import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { kindLabel, NOTICE_CAP, TOAST_CAP, TOAST_MS } from "./notify.ts";

describe("shift notices", () => {
  it("covers the four key events", () => {
    assert.equal(kindLabel("vote"), "vote");
    assert.equal(kindLabel("vote-end"), "tally");
    assert.equal(kindLabel("generate"), "pack");
    assert.equal(kindLabel("delivery"), "drop");
  });

  it("keeps a short live stack and a longer log", () => {
    assert.equal(TOAST_CAP, 3);
    assert.ok(NOTICE_CAP >= 20);
    assert.ok(TOAST_MS >= 4000);
  });
});
