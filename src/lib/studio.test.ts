import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ROLES } from "./roles.ts";
import { studioOffset, studioPieces } from "./studio.ts";

describe("membership studio", () => {
  it("lays the fly and kit out as separate inspectable stands", () => {
    const welder = ROLES[0];
    const pieces = studioPieces(welder, "imago", "hood");
    const ids = pieces.map((p) => p.id);
    assert.ok(ids.includes("fly"));
    assert.ok(ids.includes("tool"));
    assert.ok(ids.includes("kit"));
    assert.ok(ids.includes("upgrade"));
    assert.equal(pieces.find((p) => p.id === "upgrade")?.label, "weld hood");
  });

  it("adds rank kit for wizard and keeps larva/imago quiet", () => {
    const coder = ROLES.find((r) => r.id === "coder")!;
    const wiz = studioPieces(coder, "wizard", "none");
    assert.ok(wiz.some((p) => p.id === "rank"));
    const imago = studioPieces(coder, "imago", "none");
    assert.equal(
      imago.some((p) => p.id === "rank"),
      false,
    );
  });

  it("parks extras in an arc in front of the fly", () => {
    const fly = studioOffset("fly", 0, 3);
    const a = studioOffset("tool", 0, 3);
    const b = studioOffset("kit", 1, 3);
    assert.deepEqual(fly, [0, 0, 0]);
    assert.ok(a[2] > 0.5);
    assert.ok(a[0] < b[0]);
  });
});
