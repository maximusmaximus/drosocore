import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  coinbaseDappLink,
  deepLinkFor,
  detectInAppWallet,
  isMobileUa,
  mergeAnnounced,
  metamaskDappLink,
  needsWalletDeepLink,
  parseWalletSession,
  sessionValid,
  sortWallets,
  STANDARD_WALLETS,
  takeIntent,
  trustDappLink,
  walletErrorCode,
  writeIntent,
  type AnnouncedWallet,
  type KvStorage,
  type WalletSession,
} from "./wallets.ts";

function memStorage(): KvStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v);
    },
    removeItem: (k) => {
      data.delete(k);
    },
  };
}

describe("platform detection", () => {
  it("flags phones", () => {
    assert.equal(isMobileUa("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"), true);
    assert.equal(isMobileUa("Mozilla/5.0 (Linux; Android 14)"), true);
    assert.equal(isMobileUa("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"), false);
  });

  it("detects in-app wallets", () => {
    assert.equal(detectInAppWallet("MetaMaskMobile", { isMetaMask: true }), "metamask");
    assert.equal(detectInAppWallet("CoinbaseWallet", { isCoinbaseWallet: true }), "coinbase");
    assert.equal(detectInAppWallet("Rainbow", { isRainbow: true }), "rainbow");
    assert.equal(detectInAppWallet("TrustWallet", {}), "trust");
    assert.equal(detectInAppWallet("OKApp", { isOkxWallet: true }), "okx");
    assert.equal(detectInAppWallet("Phantom", { isPhantom: true }), "phantom");
    assert.equal(detectInAppWallet("Mozilla/5.0 Safari", {}), null);
  });

  it("asks for a deep link only on mobile without injected", () => {
    const phone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)";
    assert.equal(needsWalletDeepLink(phone, false), true);
    assert.equal(needsWalletDeepLink(phone, true), false);
    assert.equal(needsWalletDeepLink("Mozilla/5.0 (Macintosh)", false), false);
  });
});

describe("deep links", () => {
  const page = "https://example.com/reactor";

  it("builds MetaMask and Coinbase dapp urls", () => {
    assert.equal(metamaskDappLink(page), "https://metamask.app.link/dapp/example.com/reactor");
    assert.ok(coinbaseDappLink(page).includes(encodeURIComponent(page)));
    assert.ok(trustDappLink(page).includes(encodeURIComponent(page)));
  });

  it("maps known rdns to a link", () => {
    assert.ok(deepLinkFor("io.metamask", page)?.startsWith("https://metamask.app.link/"));
    assert.equal(deepLinkFor("io.rabby", page), null);
  });

  it("covers the standard mobile set", () => {
    const mobile = STANDARD_WALLETS.filter((w) => w.mobile);
    assert.ok(mobile.length >= 5);
    for (const w of mobile) {
      assert.ok(deepLinkFor(w.id, page), w.id);
    }
  });
});

describe("session + announced + intent", () => {
  it("validates expiry", () => {
    const now = 1_000_000;
    const s: WalletSession = {
      address: "0xdAB2758BDCD16C6FB62c8626206084e4F3B88776",
      chainId: 1,
      rdns: "io.metamask",
      walletName: "MetaMask",
      signedAt: now - 10,
      expiresAt: now + 1000,
    };
    assert.equal(sessionValid(s, now), true);
    assert.equal(sessionValid({ ...s, expiresAt: now - 1 }, now), false);
    assert.equal(parseWalletSession("not-json"), null);
  });

  it("merges and sorts announced wallets", () => {
    const a: AnnouncedWallet = { uuid: "1", name: "Rabby", icon: "", rdns: "io.rabby" };
    const b: AnnouncedWallet = { uuid: "2", name: "MetaMask", icon: "", rdns: "io.metamask" };
    const merged = mergeAnnounced(mergeAnnounced([], a), b);
    const sorted = sortWallets(merged);
    assert.equal(sorted[0]?.rdns, "io.metamask");
    const again = mergeAnnounced(sorted, { ...b, name: "MetaMask Nightly" });
    assert.equal(again.length, 2);
    assert.equal(again.find((w) => w.rdns === "io.metamask")?.name, "MetaMask Nightly");
  });

  it("round-trips the mobile reconnect intent", () => {
    const storage = memStorage();
    assert.equal(takeIntent(storage), false);
    writeIntent(storage);
    assert.equal(storage.data.size, 1);
    assert.equal(takeIntent(storage), true);
    assert.equal(takeIntent(storage), false);
  });

  it("maps wallet rejection codes", () => {
    assert.equal(walletErrorCode({ code: 4001, message: "User rejected" }), "rejected");
    assert.equal(walletErrorCode(new Error("user denied the request")), "rejected");
    assert.equal(walletErrorCode(new Error("nonce")), "session");
  });
});
