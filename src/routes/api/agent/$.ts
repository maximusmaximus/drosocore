import { createFileRoute } from "@tanstack/react-router";
import {
  addDonation,
  addTraining,
  agentIndex,
  buildBundle,
  json,
  latestBundleMeta,
  loadAdsCatalog,
  loadTraining,
  optionsOk,
  paymentResponse,
  placeAd,
  publishBundle,
  requirePayment,
  vacantSpaces,
} from "@/lib/agent.server";
import { adPriceEth } from "@/lib/ads";
import { catalogTraining } from "@/lib/training";
import { TIERS, type StageId } from "@/lib/tiers";
import { adPriceUsdc, donatePriceUsdc, TRAINING_PRICE_USDC } from "@/lib/x402";

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const j = await request.json();
    return j && typeof j === "object" ? (j as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export const Route = createFileRoute("/api/agent/$")({
  server: {
    handlers: {
      OPTIONS: async () => optionsOk(),
      GET: async ({ params }) => {
        const path = (params as { _splat?: string })._splat ?? "";
        if (!path || path === "index") return json(agentIndex());
        if (path === "ads") {
          const ads = await loadAdsCatalog();
          const taken = new Set(ads.records.map((r) => r.spaceId));
          return json({
            ...ads,
            nextPriceEth: adPriceEth(ads.purchaseCount),
            nextPriceUsdc: adPriceUsdc(ads.purchaseCount),
            vacant: vacantSpaces(taken),
          });
        }
        if (path === "training") {
          return json({ ...catalogTraining(), samples: await loadTraining(40) });
        }
        if (path === "backup") {
          const meta = await latestBundleMeta();
          return json(meta ?? { cid: null, github: "https://github.com/maximusmaximus/drosocore/blob/main/data/latest.json" });
        }
        if (path === "data") {
          const bundle = await buildBundle();
          const meta = await latestBundleMeta();
          return json({ ...bundle, backup: meta });
        }
        if (path === "donate") {
          return json({
            tiers: TIERS.map((t) => ({ id: t.id, label: t.label, eth: t.eth, usdc: donatePriceUsdc(t.id) })),
          });
        }
        return json({ error: "not-found", index: agentIndex() }, 404);
      },
      POST: async ({ request, params }) => {
        const path = (params as { _splat?: string })._splat ?? "";
        const body = await readBody(request);
        if (path === "ads/buy" || path === "ads") {
          const ads = await loadAdsCatalog();
          const pay = await requirePayment(request, body, {
            usdc: adPriceUsdc(ads.purchaseCount),
            resource: "/api/agent/ads/buy",
            description: "Publish a DROSOCORE billboard",
          });
          if (!pay.ok) return paymentResponse(pay.required);
          try {
            const record = await placeAd({
              spaceId: String(body.spaceId ?? ""),
              imageBase64: typeof body.imageBase64 === "string" ? body.imageBase64 : undefined,
              imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : undefined,
              txHash: pay.txHash,
              source: "x402",
              payer: typeof body.payer === "string" ? body.payer : undefined,
            });
            const backup = await latestBundleMeta();
            return json({ record, backup });
          } catch (e) {
            return json({ error: e instanceof Error ? e.message : "buy" }, 400);
          }
        }
        if (path === "donate") {
          const tier = String(body.tier ?? "larva") as StageId;
          const known = TIERS.some((t) => t.id === tier) ? tier : "larva";
          const usdc = donatePriceUsdc(known);
          const pay = await requirePayment(request, body, {
            usdc,
            resource: "/api/agent/donate",
            description: `Donate ${known}`,
          });
          if (!pay.ok) return paymentResponse(pay.required);
          await addDonation(known, String(usdc), pay.txHash, "x402");
          const backup = await latestBundleMeta();
          return json({ ok: true, tier: known, usdc, txHash: pay.txHash, backup });
        }
        if (path === "training") {
          const pay = await requirePayment(request, body, {
            usdc: TRAINING_PRICE_USDC,
            resource: "/api/agent/training",
            description: "Fly training sample",
          });
          if (!pay.ok) return paymentResponse(pay.required);
          try {
            const sample = await addTraining(body, "x402", pay.txHash);
            const backup = await latestBundleMeta();
            return json({ sample, backup });
          } catch (e) {
            return json({ error: e instanceof Error ? e.message : "sample" }, 400);
          }
        }
        if (path === "backup") {
          try {
            const pin = await publishBundle();
            return json(pin);
          } catch (e) {
            return json({ error: e instanceof Error ? e.message : "bundle" }, 500);
          }
        }
        return json({ error: "not-found" }, 404);
      },
    },
  },
});
