import { ETH_ADDRESS } from "./constants.ts";
import { adPriceWei, BASE_AD_WEI } from "./ads.ts";
import { TIERS, type StageId } from "./tiers.ts";

/** Native USDC on Base. */
export const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const X402_NETWORK = "base";
export const X402_NETWORK_CAIP = "eip155:8453";
export const USDC_DECIMALS = 6;

export type X402Accept = {
  scheme: "exact";
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra: { name: string; version: string };
};

export type X402PaymentRequired = {
  x402Version: number;
  error?: string;
  accepts: X402Accept[];
};

export function usdToAtomic(usdc: number): string {
  const n = Math.max(0, usdc);
  return String(Math.round(n * 10 ** USDC_DECIMALS));
}

export function atomicToUsdc(atomic: string | number): number {
  const n = typeof atomic === "string" ? Number(atomic) : atomic;
  if (!Number.isFinite(n)) return 0;
  return n / 10 ** USDC_DECIMALS;
}

/** Mirror the ETH doubling curve in USDC so agents pay the same shape. */
export function adPriceUsdc(purchaseCount: number): number {
  const wei = adPriceWei(purchaseCount);
  return Number(wei) / Number(BASE_AD_WEI) * 0.01;
}

export function donatePriceUsdc(tier: StageId): number {
  const t = TIERS.find((x) => x.id === tier);
  return t?.eth ?? 0.01;
}

export const TRAINING_PRICE_USDC = 0.001;

export function paymentRequired(opts: {
  usdc: number;
  resource: string;
  description: string;
}): X402PaymentRequired {
  return {
    x402Version: 1,
    error: "PAYMENT_REQUIRED",
    accepts: [
      {
        scheme: "exact",
        network: X402_NETWORK,
        maxAmountRequired: usdToAtomic(opts.usdc),
        resource: opts.resource,
        description: opts.description,
        mimeType: "application/json",
        payTo: ETH_ADDRESS,
        maxTimeoutSeconds: 120,
        asset: USDC_BASE,
        extra: { name: "USDC", version: "2" },
      },
    ],
  };
}

export function encodePaymentRequired(body: X402PaymentRequired): string {
  return Buffer.from(JSON.stringify(body), "utf8").toString("base64");
}

export function readPaymentHeader(headers: Headers): string | null {
  return (
    headers.get("PAYMENT-SIGNATURE") ||
    headers.get("payment-signature") ||
    headers.get("X-PAYMENT") ||
    headers.get("x-payment")
  );
}

export function parsePaymentPayload(raw: string): { txHash?: string; payload?: unknown } | null {
  try {
    const text = raw.includes("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const json = JSON.parse(text) as { payload?: { txHash?: string }; txHash?: string };
    const txHash = json.txHash || json.payload?.txHash;
    return { txHash, payload: json };
  } catch {
    if (/^0x[0-9a-fA-F]{8,}$/.test(raw.trim())) return { txHash: raw.trim() };
    return null;
  }
}

export const X402_RESOURCES = [
  {
    resource: "/api/agent/ads/buy",
    description: "Publish an image on a vacant DROSOCORE billboard",
    kind: "ad" as const,
  },
  {
    resource: "/api/agent/donate",
    description: "Donate ETH-equivalent USDC at a named crew tier",
    kind: "donate" as const,
  },
  {
    resource: "/api/agent/training",
    description: "Submit a fly-job training sample for the hall crew",
    kind: "training" as const,
  },
];
