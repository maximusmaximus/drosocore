import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  FEATURES,
  FEATURE_BY_ID,
  GUIDE_VERSION,
  TOUR,
  featureIds,
  featureOf,
  tourFeature,
  type FeatureId,
} from "./guide.ts";

describe("guide catalog", () => {
  it("has unique ids covering FEATURE_BY_ID", () => {
    const ids = featureIds();
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ids) {
      assert.equal(featureOf(id).id, id);
      assert.equal(FEATURE_BY_ID[id].id, id);
      assert.ok(FEATURE_BY_ID[id].emoji.length >= 1, id);
      assert.ok(FEATURE_BY_ID[id].actions.length >= 1, id);
    }
  });

  it("tour steps exist and end on info", () => {
    for (const id of TOUR) {
      assert.ok(FEATURE_BY_ID[id], id);
    }
    assert.equal(TOUR.at(-1), "info");
    assert.equal(tourFeature(0)?.id, "intro");
    assert.equal(tourFeature(TOUR.length), null);
  });

  it("documents wallet login as a chrome slot", () => {
    const w = FEATURE_BY_ID.wallet;
    assert.equal(w.anchor.kind, "dom");
    if (w.anchor.kind === "dom") assert.equal(w.anchor.slot, "wallet");
    assert.match(w.body, /MetaMask/);
    assert.match(w.body, /EIP-6963|wallet browser/i);
    assert.ok(TOUR.includes("wallet"));
    const walletAt = TOUR.indexOf("wallet");
    const donateAt = TOUR.indexOf("donate");
    assert.ok(walletAt >= 0 && donateAt > walletAt);
  });

  it("walks people through what they can do, including MCP pair", () => {
    assert.ok(GUIDE_VERSION >= 26);
    const blob = (id: FeatureId) => {
      const f = FEATURE_BY_ID[id];
      return `${f.body}\n${f.actions.join("\n")}\n${f.flyLine}`;
    };
    assert.match(blob("ci"), /six|stake|site/i);
    assert.match(blob("ci"), /retire|site/i);
    assert.ok(FEATURE_BY_ID.ci.actions.some((a) => /vote|chip|wallet/i.test(a)));
    assert.match(blob("mint"), /0\.001 ETH|larva|wizard/i);
    assert.match(blob("donate"), /rank|larva|wizard/i);
    assert.ok(TOUR.includes("ci"));
    assert.ok(TOUR.indexOf("ci") > TOUR.indexOf("hive"));
    assert.match(blob("ads"), /your ad here/i);
    assert.match(blob("agents"), /x402|MCP/i);
    assert.match(blob("github"), /data\/latest/);
    assert.ok(TOUR.includes("mcp"));
    assert.equal(FEATURE_BY_ID.mcp.anchor.kind, "dom");
    if (FEATURE_BY_ID.mcp.anchor.kind === "dom") assert.equal(FEATURE_BY_ID.mcp.anchor.slot, "mcp");
    assert.match(blob("mcp"), /pairing key|MCP/i);
    assert.ok(FEATURE_BY_ID.mcp.actions.some((a) => /key|plug|wallet/i.test(a)));
    assert.ok(TOUR.indexOf("mcp") > TOUR.indexOf("wallet"));
    assert.match(blob("crew"), /tripod|hover|CNS|chitin/i);
    assert.match(blob("brain"), /neuropil|inspector/i);
    assert.match(blob("intro"), /fly|shift|hall/i);
    assert.match(blob("reactor"), /Pinch|pinch|Drag|drag/i);
    assert.match(blob("talk"), /English/i);
    assert.match(blob("hive"), /three|agree|log/i);
    assert.equal(FEATURE_BY_ID.hive.anchor.kind, "dom");
    if (FEATURE_BY_ID.hive.anchor.kind === "dom") assert.equal(FEATURE_BY_ID.hive.anchor.slot, "hive");
    assert.match(blob("core"), /ETH|coupler|grow/i);
    assert.match(blob("info"), /off until you tap/i);
    assert.ok(FEATURE_BY_ID.intro.actions.some((a) => /Drag|Pinch|Tap/i.test(a)));
  });

  it("every FeatureId is listed", () => {
    const listed = new Set(featureIds());
    const sample: FeatureId[] = [
      "intro",
      "reactor",
      "plasma",
      "crew",
      "brain",
      "talk",
      "hive",
      "ci",
      "ads",
      "agents",
      "mcp",
      "mint",
      "wallet",
      "donate",
      "core",
      "github",
      "audio",
      "info",
    ];
    for (const id of sample) assert.ok(listed.has(id), id);
  });
});
