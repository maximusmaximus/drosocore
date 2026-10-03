import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { adPriceEth, adPriceWei, formatWeiEth, isAdSpaceId, nextAdPriceEth, recordsMap } from "./ads.ts";
import {
  AD_SPACES,
  MISS_A,
  adFaceNormal,
  houseSpaceIds,
  shieldAdYaw,
  shieldPanelYaw,
} from "./ad-spaces.ts";
import { HOUSE_ADS, HOT_PINK, VACANT_COPY, houseCreativeFor, isHouseSpace } from "./house-ads.ts";
import { weiHexToBigInt } from "./eth.ts";
import { parseEthToWeiHex } from "./eth.ts";

describe("ad price doubling", () => {
  it("starts at 0.001 ETH", () => {
    assert.equal(adPriceEth(0), "0.001");
    assert.equal(adPriceWei(0), 1_000_000_000_000_000n);
  });

  it("doubles each purchase", () => {
    assert.equal(adPriceEth(1), "0.002");
    assert.equal(adPriceEth(2), "0.004");
    assert.equal(adPriceEth(3), "0.008");
    assert.equal(nextAdPriceEth(0), "0.002");
  });

  it("matches wei encoding used for send", () => {
    for (const n of [0, 1, 2, 5, 10]) {
      const eth = adPriceEth(n);
      assert.equal(weiHexToBigInt(parseEthToWeiHex(eth)), adPriceWei(n));
    }
  });

  it("caps exponent so bigint stays sane", () => {
    assert.equal(adPriceWei(40), adPriceWei(99));
    assert.equal(adPriceWei(-3), adPriceWei(0));
  });

  it("formats whole eth without trailing zeros", () => {
    assert.equal(formatWeiEth(10n ** 18n), "1");
  });
});

describe("ad spaces", () => {
  it("registers unique ids", () => {
    const ids = AD_SPACES.map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.length >= 16);
    assert.equal(isAdSpaceId(ids[0]!), true);
    assert.equal(isAdSpaceId("nope"), false);
  });

  it("maps records by space", () => {
    const m = recordsMap([
      { spaceId: "floor-0", imageUrl: "x", txHash: "0x1", priceEth: "0.001" },
    ]);
    assert.equal(m["floor-0"]?.txHash, "0x1");
  });

  it("puts billboards on the hall walls", () => {
    const walls = AD_SPACES.filter((s) => s.section === "wall");
    assert.ok(walls.length >= 6);
    assert.ok(walls.every((s) => s.size[0] > 4 && s.size[1] > 2));
    assert.ok(walls.every((s) => s.mount === "out"));
  });

  it("lays floor and deck ads flat instead of shearing them into the mesh", () => {
    const floors = AD_SPACES.filter((s) => s.mount === "up");
    assert.ok(floors.length >= 8);
    for (const s of floors) {
      const n = adFaceNormal(s);
      assert.ok(Math.abs(n.y - 1) < 1e-9, s.id);
      assert.ok(Math.abs(n.x) < 1e-9);
      assert.ok(s.lift > 0);
    }
  });

  it("sits cabinet, crate, and NBI ads on the host tops and faces", () => {
    const lid = AD_SPACES.find((s) => s.id === "cab-a-top")!;
    assert.ok(Math.abs(lid.position[1] - 1.19) < 0.02);
    const face = AD_SPACES.find((s) => s.id === "cab-a-face")!;
    assert.ok(Math.abs(face.position[2] - 4.55) < 0.02);
    const crate = AD_SPACES.find((s) => s.id === "crate-caution")!;
    assert.ok(crate.position[1] < 0.55);
    const nbi = AD_SPACES.find((s) => s.id === "nbi-a-top")!;
    assert.ok(Math.abs(nbi.position[1] - 2.1) < 0.03);
  });

  it("parks the crane ads on the cab and jib, not in empty air", () => {
    const a = MISS_A;
    const ox = Math.cos(a) * 8.35;
    const oz = Math.sin(a) * 8.35;
    const cab = AD_SPACES.find((s) => s.id === "crane-cab")!;
    const wantX = ox - 2.5 * Math.sin(a);
    const wantZ = oz + 2.5 * Math.cos(a);
    assert.ok(Math.hypot(cab.position[0] - wantX, cab.position[2] - wantZ) < 0.05, `${cab.position}`);
    const jib = AD_SPACES.find((s) => s.id === "crane-jib")!;
    const jx = ox + 3.4 * Math.sin(a);
    const jz = oz - 3.4 * Math.cos(a);
    assert.ok(Math.hypot(jib.position[0] - jx, jib.position[2] - jz) < 0.08, `${jib.position}`);
  });

  it("faces shield ads inward on the large panel, not through the thin edge", () => {
    const shields = AD_SPACES.filter((s) => s.section === "shield");
    for (const s of shields) {
      const n = adFaceNormal(s);
      const radial = Math.hypot(s.position[0], s.position[2]);
      const along = (n.x * s.position[0] + n.z * s.position[2]) / radial;
      assert.ok(along < -0.9, `${s.id} along ${along}`);
      const a = Math.atan2(s.position[2], s.position[0]);
      assert.ok(Math.abs(s.yaw - shieldAdYaw(a)) < 1e-9);
      const panel = shieldPanelYaw(a);
      const tangentX = Math.cos(panel);
      const tangentZ = -Math.sin(panel);
      const dot = n.x * tangentX + n.z * tangentZ;
      assert.ok(Math.abs(dot) < 1e-6, `${s.id} shear ${dot}`);
    }
  });

  it("seeds one fly-brain house ad per section", () => {
    const house = houseSpaceIds();
    const sections = new Set(AD_SPACES.map((s) => s.section));
    assert.equal(house.length, sections.size);
    for (const id of house) {
      assert.equal(isHouseSpace(id), true);
      const copy = houseCreativeFor(id);
      assert.ok(copy);
      assert.match(copy.title, /[A-Z]/);
    }
    assert.equal(houseCreativeFor("wall-back-1"), null);
    assert.equal(VACANT_COPY, "your ad here");
    assert.equal(HOT_PINK, "#FF1493");
    assert.ok(HOUSE_ADS.wall.line.toLowerCase().includes("nerve"));
  });
});
