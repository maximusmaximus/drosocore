import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseEthToWeiHex, shortAddress, weiHexToBigInt } from "./eth.ts";
import { isHexAddress } from "./siwe.ts";

describe("parseEthToWeiHex", () => {
  it("encodes 0.00001 ETH as 1e13 wei", () => {
    assert.equal(weiHexToBigInt(parseEthToWeiHex("0.00001")), 10_000_000_000_000n);
    assert.equal(weiHexToBigInt(parseEthToWeiHex(0.00001)), 10_000_000_000_000n);
  });

  it("encodes 1 ETH", () => {
    assert.equal(weiHexToBigInt(parseEthToWeiHex("1")), 10n ** 18n);
    assert.equal(weiHexToBigInt(parseEthToWeiHex(1)), 10n ** 18n);
  });

  it("encodes 0.01 ETH", () => {
    assert.equal(weiHexToBigInt(parseEthToWeiHex("0.01")), 10n ** 16n);
  });

  it("pads fractional wei", () => {
    assert.equal(weiHexToBigInt(parseEthToWeiHex("0.00002")), 20_000_000_000_000n);
    assert.equal(weiHexToBigInt(parseEthToWeiHex("0.00004")), 40_000_000_000_000n);
  });

  it("returns hex with 0x prefix", () => {
    assert.match(parseEthToWeiHex("0.00001"), /^0x[0-9a-f]+$/);
  });
});

describe("shortAddress", () => {
  it("elides the middle", () => {
    assert.equal(shortAddress("0xdAB2758BDCD16C6FB62c8626206084e4F3B88776"), "0xdAB2…8776");
  });

  it("passes through tiny strings", () => {
    assert.equal(shortAddress("0xabc"), "0xabc");
  });
});

describe("isHexAddress", () => {
  it("accepts 20-byte hex", () => {
    assert.equal(isHexAddress("0xdAB2758BDCD16C6FB62c8626206084e4F3B88776"), true);
    assert.equal(isHexAddress("0x0000000000000000000000000000000000000000"), true);
  });

  it("rejects junk", () => {
    assert.equal(isHexAddress("dAB2758BDCD16C6FB62c8626206084e4F3B88776"), false);
    assert.equal(isHexAddress("0x123"), false);
    assert.equal(isHexAddress(""), false);
  });
});
