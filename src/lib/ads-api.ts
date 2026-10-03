import { createServerFn } from "@tanstack/react-start";
import { AD_SPACE_IDS } from "./ad-spaces";
import { type AdRecord } from "./ads";
import { loadAdsCatalog, placeAd } from "./agent.server";

export type AdsPayload = {
  records: AdRecord[];
  purchaseCount: number;
};

export const listAds = createServerFn({ method: "GET" }).handler(async (): Promise<AdsPayload> => {
  return loadAdsCatalog();
});

type BuyInput = {
  spaceId: string;
  imageBase64: string;
  txHash: string;
  payer?: string;
};

export const purchaseAd = createServerFn({ method: "POST" })
  .validator((d: BuyInput) => {
    if (!d || typeof d.spaceId !== "string" || !AD_SPACE_IDS.has(d.spaceId)) {
      throw new Error("space");
    }
    if (typeof d.imageBase64 !== "string" || d.imageBase64.length < 32) throw new Error("image");
    if (d.imageBase64.length > 3_500_000) throw new Error("too-large");
    if (typeof d.txHash !== "string" || d.txHash.length < 4) throw new Error("tx");
    const payer = typeof d.payer === "string" && d.payer.startsWith("0x") ? d.payer : undefined;
    return { ...d, payer };
  })
  .handler(async ({ data }): Promise<AdsPayload & { record: AdRecord }> => {
    const record = await placeAd({
      spaceId: data.spaceId,
      imageBase64: data.imageBase64,
      txHash: data.txHash,
      source: "wallet",
      payer: data.payer,
    });
    const snap = await loadAdsCatalog();
    return { record, records: snap.records, purchaseCount: snap.purchaseCount };
  });
