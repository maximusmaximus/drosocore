import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { adPriceUsdc, parsePaymentPayload, paymentRequired, usdToAtomic, TRAINING_PRICE_USDC } from "./x402.ts";
import { MCP_TOOLS, initializeResult, quoteForTool } from "./mcp.ts";
import { AD_SPACES, adFaceNormal } from "./ad-spaces.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("x402 quotes", () => {
  it("encodes USDC atomic amounts and doubles ads like ETH", () => {
    assert.equal(usdToAtomic(0.01), "10000");
    assert.equal(adPriceUsdc(0), 0.01);
    assert.equal(adPriceUsdc(1), 0.02);
    const req = paymentRequired({ usdc: 0.01, resource: "/api/agent/ads/buy", description: "ad" });
    assert.equal(req.x402Version, 1);
    assert.equal(req.accepts[0]?.scheme, "exact");
    assert.equal(req.accepts[0]?.maxAmountRequired, "10000");
    assert.match(req.accepts[0]?.payTo ?? "", /^0x/);
  });

  it("parses payment headers and raw tx hashes", () => {
    assert.equal(parsePaymentPayload("0xabcdefff")?.txHash, "0xabcdefff");
    const packed = Buffer.from(JSON.stringify({ txHash: "0xdeadbeef" }), "utf8").toString("base64");
    assert.equal(parsePaymentPayload(packed)?.txHash, "0xdeadbeef");
    assert.equal(TRAINING_PRICE_USDC, 0.001);
  });
});

describe("mcp tools", () => {
  it("lists buy/donate/training plus free pulls", () => {
    const names: string[] = MCP_TOOLS.map((t) => t.name);
    for (const n of [
      "list_ad_spaces",
      "get_ads",
      "buy_ad",
      "donate",
      "get_training",
      "submit_training",
      "get_backup",
      "pull_data",
      "get_ci_ballot",
      "whoami",
      "vote_ci",
      "get_account",
      "update_ad",
    ]) {
      assert.ok(names.includes(n), n);
    }
    assert.ok(initializeResult().instructions.toLowerCase().includes("x402"));
    assert.match(initializeResult().instructions, /pairing key|Bearer/i);
    assert.equal(quoteForTool("submit_training")?.usdc, TRAINING_PRICE_USDC);
    const vote = MCP_TOOLS.find((t) => t.name === "vote_ci");
    assert.equal(vote?.auth, "stakeholder");
    const who = MCP_TOOLS.find((t) => t.name === "whoami");
    assert.equal(who?.auth, "signed");
    const ballot = MCP_TOOLS.find((t) => t.name === "get_ci_ballot");
    assert.equal(ballot?.auth, "public");
  });

  it("is wired as HTTP routes", () => {
    const mcp = readFileSync(join(root, "routes/api/mcp.ts"), "utf8");
    const agent = readFileSync(join(root, "routes/api/agent/$.ts"), "utf8");
    assert.match(mcp, /handleMcp/);
    assert.match(agent, /requirePayment/);
    assert.match(agent, /placeAd/);
    assert.match(agent, /addTraining/);
    assert.match(agent, /publishBundle/);
  });
});

describe("ad faces", () => {
  it("shields look along the pad radius, not along the rim", () => {
    const s = AD_SPACES.find((x) => x.id === "shield-0");
    assert.ok(s);
    const n = adFaceNormal(s!);
    const radial = Math.hypot(s!.position[0], s!.position[2]);
    const along = (n.x * s!.position[0] + n.z * s!.position[2]) / radial;
    assert.ok(Math.abs(along) > 0.9, `along ${along}`);
    assert.ok(along < 0, "inward");
  });
});
