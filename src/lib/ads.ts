import { AD_SPACE_IDS } from "./ad-spaces.ts";

export const BASE_AD_ETH = "0.001";
export const BASE_AD_WEI = 1_000_000_000_000_000n;
export const ADS_LS = "drosocore.ads.v1";

export type AdRecord = {
  spaceId: string;
  imageUrl: string;
  txHash: string;
  priceEth: string;
  cid?: string;
  source?: string;
  payer?: string;
};

export type AdsSnapshot = {
  records: AdRecord[];
  purchaseCount: number;
};

export function adPriceWei(purchaseCount: number): bigint {
  const n = Math.max(0, Math.min(40, purchaseCount | 0));
  return BASE_AD_WEI << BigInt(n);
}

export function formatWeiEth(wei: bigint): string {
  const s = wei.toString().padStart(19, "0");
  const whole = s.slice(0, -18).replace(/^0+(?=\d)/, "") || "0";
  const frac = s.slice(-18).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}

export function adPriceEth(purchaseCount: number): string {
  return formatWeiEth(adPriceWei(purchaseCount));
}

export function nextAdPriceEth(purchaseCount: number): string {
  return adPriceEth(purchaseCount + 1);
}

export function isAdSpaceId(id: string): boolean {
  return AD_SPACE_IDS.has(id);
}

export function loadAdsLocal(): AdsSnapshot {
  if (typeof window === "undefined") return { records: [], purchaseCount: 0 };
  try {
    const raw = window.localStorage.getItem(ADS_LS);
    if (!raw) return { records: [], purchaseCount: 0 };
    const parsed = JSON.parse(raw) as AdsSnapshot;
    if (!Array.isArray(parsed.records)) return { records: [], purchaseCount: 0 };
    return {
      records: parsed.records.filter((r) => r && isAdSpaceId(r.spaceId) && r.imageUrl),
      purchaseCount: Math.max(0, parsed.purchaseCount | 0),
    };
  } catch {
    return { records: [], purchaseCount: 0 };
  }
}

export function saveAdsLocal(snap: AdsSnapshot) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ADS_LS, JSON.stringify(snap));
  } catch {
    /* quota */
  }
}

export function recordsMap(records: AdRecord[]): Record<string, AdRecord> {
  const m: Record<string, AdRecord> = {};
  for (const r of records) m[r.spaceId] = r;
  return m;
}
