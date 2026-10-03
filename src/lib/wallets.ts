/** Wallet catalog, platform detection, mobile dapp links. Pure. */

export type WalletId =
  | "io.metamask"
  | "com.coinbase.wallet"
  | "io.rabby"
  | "com.brave.wallet"
  | "me.rainbow"
  | "com.trustwallet.app"
  | "com.okex.wallet"
  | "app.phantom"
  | "injected";

export type WalletMeta = {
  id: WalletId;
  name: string;
  rdns: string;
  mobile: boolean;
};

export const STANDARD_WALLETS: WalletMeta[] = [
  { id: "io.metamask", name: "MetaMask", rdns: "io.metamask", mobile: true },
  { id: "com.coinbase.wallet", name: "Coinbase Wallet", rdns: "com.coinbase.wallet", mobile: true },
  { id: "io.rabby", name: "Rabby", rdns: "io.rabby", mobile: false },
  { id: "com.brave.wallet", name: "Brave", rdns: "com.brave.wallet", mobile: false },
  { id: "me.rainbow", name: "Rainbow", rdns: "me.rainbow", mobile: true },
  { id: "com.trustwallet.app", name: "Trust", rdns: "com.trustwallet.app", mobile: true },
  { id: "com.okex.wallet", name: "OKX", rdns: "com.okex.wallet", mobile: true },
  { id: "app.phantom", name: "Phantom", rdns: "app.phantom", mobile: true },
];

export const WALLET_SESSION_LS = "drosocore.wallet.v1";
export const WALLET_SESSION_MS = 7 * 24 * 60 * 60 * 1000;
export const WALLET_INTENT_LS = "drosocore.wallet.intent";

export type WalletSession = {
  address: string;
  chainId: number;
  rdns: string;
  walletName: string;
  signedAt: number;
  expiresAt: number;
};

export type KvStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

export function walletByRdns(rdns: string): WalletMeta | undefined {
  return STANDARD_WALLETS.find((w) => w.rdns === rdns);
}

export function isMobileUa(ua: string): boolean {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
}

export type InAppWallet = "metamask" | "coinbase" | "rainbow" | "trust" | "okx" | "phantom" | null;

export function detectInAppWallet(ua: string, flags: {
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  isRainbow?: boolean;
  isTrust?: boolean;
  isOkxWallet?: boolean;
  isPhantom?: boolean;
}): InAppWallet {
  if (flags.isCoinbaseWallet || /CoinbaseWallet|CBWallet/i.test(ua)) return "coinbase";
  if (flags.isRainbow || /Rainbow/i.test(ua)) return "rainbow";
  if (flags.isTrust || /TrustWallet|Trust\//i.test(ua)) return "trust";
  if (flags.isOkxWallet || /OKApp/i.test(ua)) return "okx";
  if (flags.isPhantom || /Phantom/i.test(ua)) return "phantom";
  if (flags.isMetaMask || /MetaMaskMobile/i.test(ua)) return "metamask";
  return null;
}

export function needsWalletDeepLink(ua: string, hasInjected: boolean): boolean {
  return isMobileUa(ua) && !hasInjected;
}

export function metamaskDappLink(pageUrl: string): string {
  const u = new URL(pageUrl);
  return `https://metamask.app.link/dapp/${u.host}${u.pathname}${u.search}`;
}

export function coinbaseDappLink(pageUrl: string): string {
  return `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(pageUrl)}`;
}

export function rainbowDappLink(pageUrl: string): string {
  return `https://rnbwapp.com/dapp?url=${encodeURIComponent(pageUrl)}`;
}

export function trustDappLink(pageUrl: string): string {
  return `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(pageUrl)}`;
}

export function okxDappLink(pageUrl: string): string {
  return `https://www.okx.com/download?deeplink=${encodeURIComponent(`okx://wallet/dapp/url?dappUrl=${encodeURIComponent(pageUrl)}`)}`;
}

export function phantomDappLink(pageUrl: string): string {
  return `https://phantom.app/ul/browse/${encodeURIComponent(pageUrl)}?ref=${encodeURIComponent(pageUrl)}`;
}

export function deepLinkFor(id: WalletId, pageUrl: string): string | null {
  switch (id) {
    case "io.metamask":
      return metamaskDappLink(pageUrl);
    case "com.coinbase.wallet":
      return coinbaseDappLink(pageUrl);
    case "me.rainbow":
      return rainbowDappLink(pageUrl);
    case "com.trustwallet.app":
      return trustDappLink(pageUrl);
    case "com.okex.wallet":
      return okxDappLink(pageUrl);
    case "app.phantom":
      return phantomDappLink(pageUrl);
    default:
      return null;
  }
}

export function writeIntent(storage: KvStorage): void {
  storage.setItem(WALLET_INTENT_LS, "1");
}

export function takeIntent(storage: KvStorage): boolean {
  const v = storage.getItem(WALLET_INTENT_LS);
  if (!v) return false;
  storage.removeItem(WALLET_INTENT_LS);
  return true;
}

export function markWalletIntent(): void {
  if (typeof window === "undefined") return;
  try {
    writeIntent(window.localStorage);
  } catch {
    /* quota */
  }
}

export function consumeWalletIntent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return takeIntent(window.localStorage);
  } catch {
    return false;
  }
}

export function sessionValid(s: WalletSession | null, now = Date.now()): s is WalletSession {
  if (!s) return false;
  if (!/^0x[a-fA-F0-9]{40}$/.test(s.address)) return false;
  return s.expiresAt > now && s.signedAt <= now;
}

export function parseWalletSession(raw: string | null): WalletSession | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as WalletSession;
    if (!sessionValid(s)) return null;
    return s;
  } catch {
    return null;
  }
}

export type AnnouncedWallet = {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
};

export function mergeAnnounced(current: AnnouncedWallet[], next: AnnouncedWallet): AnnouncedWallet[] {
  const i = current.findIndex((w) => w.rdns === next.rdns || w.uuid === next.uuid);
  if (i >= 0) {
    const copy = current.slice();
    copy[i] = next;
    return copy;
  }
  return [...current, next];
}

export function sortWallets(list: AnnouncedWallet[]): AnnouncedWallet[] {
  const order = STANDARD_WALLETS.map((w) => w.rdns);
  return list.slice().sort((a, b) => {
    const ia = order.indexOf(a.rdns as WalletId);
    const ib = order.indexOf(b.rdns as WalletId);
    const da = ia === -1 ? 99 : ia;
    const db = ib === -1 ? 99 : ib;
    if (da !== db) return da - db;
    return a.name.localeCompare(b.name);
  });
}

export function walletErrorCode(err: unknown): string {
  if (!err) return "connect";
  const e = err as { code?: number; message?: string };
  if (e.code === 4001) return "rejected";
  const msg = typeof e.message === "string" ? e.message : String(err);
  if (/reject|denied|cancel/i.test(msg)) return "rejected";
  return msg === "nonce" ? "session" : msg || "connect";
}
