import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { TIERS, tierFromEth } from "./tiers.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("crew memberships", () => {
  it("ranks molt from larva to wizard", () => {
    assert.equal(TIERS[0].id, "larva");
    assert.equal(TIERS.at(-1)?.id, "wizard");
    assert.equal(tierFromEth(0.15).id, "imago");
    assert.equal(tierFromEth(1).id, "wizard");
    for (const t of TIERS) {
      assert.ok(t.blurb.length > 8, t.id);
    }
  });

  it("plates capture the 3D worker instead of a sticker fly", () => {
    const card = readFileSync(join(root, "lib/nft-card.ts"), "utf8");
    const reveal = readFileSync(join(root, "components/overlay/NftReveal.tsx"), "utf8");
    const bar = readFileSync(join(root, "components/overlay/DonationBar.tsx"), "utf8");
    const preview = readFileSync(join(root, "components/overlay/MembershipPreview.tsx"), "utf8");
    assert.match(card, /composeMembershipCard/);
    assert.match(card, /portraitDataUrl/);
    assert.match(reveal, /capture=/);
    assert.match(reveal, /composeMembershipCard/);
    assert.match(bar, /MembershipPreview/);
    assert.match(preview, /MemberStudio/);
  });
});
