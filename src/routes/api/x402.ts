import { createFileRoute } from "@tanstack/react-router";
import { agentIndex, json, loadAdsCatalog, optionsOk } from "@/lib/agent.server";
import { X402_RESOURCES, adPriceUsdc, donatePriceUsdc, paymentRequired, TRAINING_PRICE_USDC } from "@/lib/x402";
import { TIERS } from "@/lib/tiers";

export const Route = createFileRoute("/api/x402")({
  server: {
    handlers: {
      OPTIONS: async () => optionsOk(),
      GET: async () => {
        const ads = await loadAdsCatalog();
        return json({
          ...agentIndex(),
          accepts: X402_RESOURCES.map((r) => {
            const usdc =
              r.kind === "ad"
                ? adPriceUsdc(ads.purchaseCount)
                : r.kind === "training"
                  ? TRAINING_PRICE_USDC
                  : donatePriceUsdc("larva");
            return paymentRequired({
              usdc,
              resource: r.resource,
              description: r.description,
            }).accepts[0];
          }),
          donateTiers: TIERS.map((t) => ({ id: t.id, usdc: donatePriceUsdc(t.id) })),
        });
      },
    },
  },
});
