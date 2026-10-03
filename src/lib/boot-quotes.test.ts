import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  BOOT_MAX_MS,
  BOOT_MIN_MS,
  BOOT_QUOTES,
  bootCanSkip,
  bootQuoteAt,
  bootShouldDismiss,
} from "./boot-quotes.ts";

describe("boot quotes", () => {
  it("has a full shift of construction lines", () => {
    assert.ok(BOOT_QUOTES.length >= 12);
    assert.ok(BOOT_QUOTES.every((q) => q.length > 20 && q.length < 90));
    assert.ok(BOOT_QUOTES.some((q) => /coil|solenoid|vessel|catwalk|coupler/i.test(q)));
  });

  it("wraps the index", () => {
    assert.equal(bootQuoteAt(0), BOOT_QUOTES[0]);
    assert.equal(bootQuoteAt(BOOT_QUOTES.length), BOOT_QUOTES[0]);
    assert.equal(bootQuoteAt(-1), BOOT_QUOTES[BOOT_QUOTES.length - 1]);
  });

  it("never uncovers chrome over an unpainted hall", () => {
    assert.equal(bootShouldDismiss(false, false, false), false);
    assert.equal(bootShouldDismiss(true, false, false), false);
    assert.equal(bootShouldDismiss(false, true, false), true);
    assert.equal(bootShouldDismiss(true, true, false), true);
    assert.equal(bootShouldDismiss(false, true, true), true);
    assert.equal(bootShouldDismiss(true, false, true), true);
    assert.ok(BOOT_MAX_MS > BOOT_MIN_MS);
    assert.equal(bootCanSkip(false, false), false);
    assert.equal(bootCanSkip(true, false), true);
    assert.equal(bootCanSkip(false, true), true);
    assert.equal(bootCanSkip(true, true), true);
  });
});
