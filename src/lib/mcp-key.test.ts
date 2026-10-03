import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  hashMcpToken,
  isMcpToken,
  mcpConfigSnippet,
  mcpPairMessage,
  mcpTokenPrefix,
  mintMcpToken,
  readBearer,
  roleFromStake,
} from "./mcp-key.ts";
import { MCP_CAN_READ, MCP_CAN_SIGNED, MCP_CAN_STAKE, SITE_CAN } from "./site-readme.ts";
import { MCP_TOOLS } from "./mcp.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("mcp pairing key", () => {
  it("mints dc_ tokens and hashes them", async () => {
    const a = mintMcpToken();
    const b = mintMcpToken();
    assert.ok(isMcpToken(a));
    assert.ok(isMcpToken(b));
    assert.notEqual(a, b);
    const ha = await hashMcpToken(a);
    const hb = await hashMcpToken(a);
    assert.equal(ha, hb);
    assert.equal(ha.length, 64);
    assert.notEqual(ha, await hashMcpToken(b));
    assert.match(mcpTokenPrefix(a), /^dc_[a-f0-9]{4}…[a-f0-9]{4}$/);
  });

  it("reads bearer headers and builds a pair message", () => {
    const token = "dc_" + "ab".repeat(24);
    assert.equal(readBearer(`Bearer ${token}`), token);
    assert.equal(readBearer(token), token);
    assert.equal(readBearer("Bearer nope"), null);
    const msg = mcpPairMessage("0xabc", "nonce1");
    assert.match(msg, /DROSOCORE MCP pair/);
    assert.match(msg, /0xabc/);
    assert.match(msg, /nonce1/);
  });

  it("maps stake to roles and prints a client snippet", () => {
    assert.equal(roleFromStake(true, true), "stakeholder");
    assert.equal(roleFromStake(false, true), "signed");
    assert.equal(roleFromStake(false, false), "public");
    const withKey = mcpConfigSnippet("https://hall.example", "dc_" + "11".repeat(24));
    assert.match(withKey, /mcpServers/);
    assert.match(withKey, /Authorization/);
    assert.match(withKey, /\/api\/mcp/);
    const open = mcpConfigSnippet("https://hall.example");
    assert.doesNotMatch(open, /Authorization/);
  });
});

describe("site readme + MCP catalog", () => {
  it("tells people what they can do and documents pairing", () => {
    assert.ok(SITE_CAN.length >= 6);
    assert.ok(SITE_CAN.some((c) => /MCP|Plug/i.test(c.title + c.body)));
    assert.ok(MCP_CAN_READ.length >= 3);
    assert.ok(MCP_CAN_SIGNED.some((l) => /whoami|account/i.test(l)));
    assert.ok(MCP_CAN_STAKE.some((l) => /vote/i.test(l)));
    const names = MCP_TOOLS.map((t) => t.name);
    assert.ok(names.includes("vote_ci"));
    assert.ok(names.includes("whoami"));
    const readme = readFileSync(join(root, "README.md"), "utf8");
    assert.match(readme, /pairing key/i);
    assert.match(readme, /\/api\/mcp/);
    assert.match(readme, /0\.001 ETH/);
    assert.match(readme, /vote/i);
  });
});
