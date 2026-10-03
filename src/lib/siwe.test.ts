import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { privateKeyToAccount } from "viem/accounts";
import {
  createSiweMessage,
  issuedAtFresh,
  parseSiweMessage,
  SIWE_STATEMENT,
  SIWE_VERSION,
  siweDomainAllowed,
} from "./siwe.ts";
import { verifySiweSignature } from "./siwe-verify.ts";

const KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const account = privateKeyToAccount(KEY);

function fields(over: Partial<ReturnType<typeof parseSiweMessage>> = {}) {
  return {
    domain: "localhost",
    address: account.address,
    statement: SIWE_STATEMENT,
    uri: "http://localhost:8080",
    version: SIWE_VERSION,
    chainId: 1,
    nonce: "a".repeat(32),
    issuedAt: new Date().toISOString(),
    ...over,
  };
}

describe("siwe message", () => {
  it("round-trips create/parse", () => {
    const f = fields();
    const msg = createSiweMessage(f);
    assert.equal(parseSiweMessage(msg).nonce, f.nonce);
    assert.equal(parseSiweMessage(msg).address, f.address);
    assert.match(msg, /Sign in to DROSOCORE/);
  });

  it("rejects a bad address", () => {
    assert.throws(() => createSiweMessage(fields({ address: "0x1" })));
  });

  it("rejects a short nonce", () => {
    assert.throws(() => createSiweMessage(fields({ nonce: "abc" })));
  });
});

describe("siwe domain + time", () => {
  it("allows localhost, ports, and hosts", () => {
    assert.equal(siweDomainAllowed("localhost"), true);
    assert.equal(siweDomainAllowed("localhost:8080"), true);
    assert.equal(siweDomainAllowed("127.0.0.1"), true);
    assert.equal(siweDomainAllowed("drosocore.example"), true);
    assert.equal(siweDomainAllowed(""), false);
  });

  it("rejects future and stale issuedAt", () => {
    const now = Date.parse("2026-09-11T12:00:00.000Z");
    assert.equal(issuedAtFresh(new Date(now).toISOString(), now), true);
    assert.equal(issuedAtFresh(new Date(now + 120_000).toISOString(), now), false);
    assert.equal(issuedAtFresh(new Date(now - 20 * 60 * 1000).toISOString(), now), false);
  });
});

describe("siwe verify", () => {
  it("accepts a matching personal_sign", async () => {
    const f = fields();
    const message = createSiweMessage(f);
    const signature = await account.signMessage({ message });
    const result = await verifySiweSignature({
      message,
      signature,
      expectedNonce: f.nonce,
      expectedDomain: "localhost",
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.address.toLowerCase(), account.address.toLowerCase());
  });

  it("rejects a wrong nonce", async () => {
    const f = fields();
    const message = createSiweMessage(f);
    const signature = await account.signMessage({ message });
    const result = await verifySiweSignature({
      message,
      signature,
      expectedNonce: "b".repeat(32),
    });
    assert.equal(result.ok, false);
  });

  it("rejects a signature from another key", async () => {
    const other = privateKeyToAccount(
      "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    );
    const f = fields();
    const message = createSiweMessage(f);
    const signature = await other.signMessage({ message });
    const result = await verifySiweSignature({
      message,
      signature,
      expectedNonce: f.nonce,
    });
    assert.equal(result.ok, false);
  });

  it("rejects a mutated statement", async () => {
    const f = fields();
    const message = createSiweMessage(f).replace(SIWE_STATEMENT, "hacked");
    const signature = await account.signMessage({ message });
    const result = await verifySiweSignature({
      message,
      signature,
      expectedNonce: f.nonce,
    });
    assert.equal(result.ok, false);
  });
});
