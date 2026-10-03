import { AD_SPACES } from "./ad-spaces.ts";
import { adPriceEth, type AdRecord } from "./ads.ts";
import { GITHUB_URL } from "./constants.ts";
import { catalogTraining } from "./training.ts";
import { adPriceUsdc, donatePriceUsdc, TRAINING_PRICE_USDC, X402_RESOURCES } from "./x402.ts";
import { TIERS } from "./tiers.ts";
import type { McpAuth } from "./mcp-key.ts";

export type RpcReq = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };

export const MCP_TOOLS = [
  {
    name: "list_ad_spaces",
    description: "List DROSOCORE billboard slots, occupancy, image CIDs, and the next ad price.",
    inputSchema: { type: "object", properties: {} },
    paid: false,
    auth: "public" as McpAuth,
  },
  {
    name: "get_ads",
    description: "Pull published billboard records (image URLs, IPFS CIDs, tx hashes).",
    inputSchema: { type: "object", properties: {} },
    paid: false,
    auth: "public" as McpAuth,
  },
  {
    name: "buy_ad",
    description: "Publish an image on a vacant billboard. x402 USDC or a settled txHash. Pairing key attributes the board to your wallet.",
    inputSchema: {
      type: "object",
      properties: {
        spaceId: { type: "string" },
        imageBase64: { type: "string", description: "data URL or raw base64 image" },
        imageUrl: { type: "string" },
        txHash: { type: "string" },
      },
      required: ["spaceId"],
    },
    paid: true,
    auth: "paid" as McpAuth,
    resource: "/api/agent/ads/buy",
  },
  {
    name: "list_donation_tiers",
    description: "Crew membership ranks (larva through wizard) that mint the 3D hall worker.",
    inputSchema: { type: "object", properties: {} },
    paid: false,
    auth: "public" as McpAuth,
  },
  {
    name: "donate",
    description: "Donate at a crew tier. x402 USDC or a settled txHash. Pairing key attributes membership to your wallet.",
    inputSchema: {
      type: "object",
      properties: {
        tier: { type: "string", enum: TIERS.map((t) => t.id) },
        txHash: { type: "string" },
      },
      required: ["tier"],
    },
    paid: true,
    auth: "paid" as McpAuth,
    resource: "/api/agent/donate",
  },
  {
    name: "get_training",
    description: "Pull fly job-training tables plus recent submitted samples.",
    inputSchema: { type: "object", properties: {} },
    paid: false,
    auth: "public" as McpAuth,
  },
  {
    name: "submit_training",
    description: "Add a fly-job training sample (role, neuropil, function). x402-paid.",
    inputSchema: {
      type: "object",
      properties: {
        role: { type: "string" },
        region: { type: "string" },
        fn: { type: "string" },
        note: { type: "string" },
        reward: { type: "number" },
        txHash: { type: "string" },
      },
      required: ["role", "region"],
    },
    paid: true,
    auth: "paid" as McpAuth,
    resource: "/api/agent/training",
  },
  {
    name: "pull_data",
    description: "Pull the full hall dump: ads, donations, fly training, and the IPFS/GitHub backup pointer.",
    inputSchema: { type: "object", properties: {} },
    paid: false,
    auth: "public" as McpAuth,
  },
  {
    name: "get_backup",
    description: "Latest IPFS CID and GitHub pointer for the hall data bundle.",
    inputSchema: { type: "object", properties: {} },
    paid: false,
    auth: "public" as McpAuth,
  },
  {
    name: "get_ci_ballot",
    description: "Today's six-hour CI ballot. Each option is a GitHub pull request. The winner is Venice-upsampled and merged to main.",
    inputSchema: { type: "object", properties: {} },
    paid: false,
    auth: "public" as McpAuth,
  },
  {
    name: "get_ci_history",
    description: "Installed CI packs, past tallies, and shift talk around upgrades.",
    inputSchema: { type: "object", properties: {} },
    paid: false,
    auth: "public" as McpAuth,
  },
  {
    name: "get_hall_log",
    description: "Latest hive events and agreed memories (construction, talk, visitor actions).",
    inputSchema: { type: "object", properties: { limit: { type: "number" } } },
    paid: false,
    auth: "public" as McpAuth,
  },
  {
    name: "whoami",
    description: "Your paired wallet, stake, and MCP role. Requires a pairing key.",
    inputSchema: { type: "object", properties: {} },
    paid: false,
    auth: "signed" as McpAuth,
  },
  {
    name: "get_account",
    description: "Membership ETH, boards you paid for, privileges, and current vote. Requires a pairing key.",
    inputSchema: { type: "object", properties: {} },
    paid: false,
    auth: "signed" as McpAuth,
  },
  {
    name: "list_my_ads",
    description: "Billboards paid from your paired wallet.",
    inputSchema: { type: "object", properties: {} },
    paid: false,
    auth: "signed" as McpAuth,
  },
  {
    name: "vote_ci",
    description: "Cast a stake-weighted CI vote. Stakeholders only (membership or a published board).",
    inputSchema: {
      type: "object",
      properties: {
        optionId: { type: "number" },
        cycleId: { type: "number" },
      },
      required: ["optionId"],
    },
    paid: false,
    auth: "stakeholder" as McpAuth,
  },
  {
    name: "comment_ci",
    description: "Leave a note on the current cycle or a seated pack. Stakeholders only.",
    inputSchema: {
      type: "object",
      properties: {
        body: { type: "string" },
        cycleId: { type: "number" },
        itemId: { type: "number" },
      },
      required: ["body"],
    },
    paid: false,
    auth: "stakeholder" as McpAuth,
  },
  {
    name: "update_ad",
    description: "Swap the image on a billboard you bought. Stakeholders who own that slot.",
    inputSchema: {
      type: "object",
      properties: {
        spaceId: { type: "string" },
        imageBase64: { type: "string" },
        imageUrl: { type: "string" },
      },
      required: ["spaceId"],
    },
    paid: false,
    auth: "stakeholder" as McpAuth,
  },
] as const;

export function initializeResult() {
  return {
    protocolVersion: "2025-03-26",
    capabilities: { tools: { listChanged: false }, resources: { listChanged: false } },
    serverInfo: { name: "drosocore", version: "1.2.0", website: GITHUB_URL },
    instructions:
      "DROSOCORE hall. Anyone may call public tools (ads, ballot, hall log, training, backup) with no key. Connect a crypto wallet in the hall to mint a pairing key (Authorization: Bearer dc_…). Signed tools (whoami, get_account, list_my_ads) run as that wallet. Stakeholders — membership or a published board — may vote_ci, comment_ci, and update_ad. buy_ad, donate, and submit_training are x402-paid in USDC on Base; a pairing key attributes those writes to your wallet. On 402, attach PAYMENT-SIGNATURE or _meta['x402/payment'] and retry.",
  };
}

export function toolsList() {
  return {
    tools: MCP_TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  };
}

export function toolAuth(name: string): McpAuth {
  const t = MCP_TOOLS.find((x) => x.name === name);
  return t?.auth ?? "public";
}

export function resourcesList() {
  return {
    resources: [
      { uri: "drosocore://ads", name: "Billboards", mimeType: "application/json" },
      { uri: "drosocore://training", name: "Fly training", mimeType: "application/json" },
      { uri: "drosocore://backup", name: "IPFS + GitHub bundle", mimeType: "application/json" },
      { uri: "drosocore://donations", name: "Crew donations", mimeType: "application/json" },
      { uri: "drosocore://ci", name: "Daily CI ballot", mimeType: "application/json" },
      { uri: "drosocore://log", name: "Hall log", mimeType: "application/json" },
      ...X402_RESOURCES.map((r) => ({
        uri: `drosocore://${r.kind}`,
        name: r.description,
        mimeType: "application/json",
      })),
    ],
  };
}

export function textResult(obj: unknown, extra?: Record<string, unknown>) {
  return {
    content: [{ type: "text", text: typeof obj === "string" ? obj : JSON.stringify(obj, null, 2) }],
    ...extra,
  };
}

export function authToolError(message: string, extra?: Record<string, unknown>) {
  return {
    isError: true,
    content: [{ type: "text", text: JSON.stringify({ error: message, ...extra }) }],
  };
}

export function paymentToolError(required: unknown) {
  return {
    isError: true,
    content: [{ type: "text", text: JSON.stringify(required) }],
    _meta: { "x402/payment-required": required },
  };
}

export function quoteForTool(name: string, purchaseCount = 0): { usdc: number; resource: string; description: string } | null {
  if (name === "buy_ad") {
    return { usdc: adPriceUsdc(purchaseCount), resource: "/api/agent/ads/buy", description: `Billboard ${adPriceEth(purchaseCount)} ETH-equivalent` };
  }
  if (name === "donate") {
    return { usdc: donatePriceUsdc("larva"), resource: "/api/agent/donate", description: "Crew donation" };
  }
  if (name === "submit_training") {
    return { usdc: TRAINING_PRICE_USDC, resource: "/api/agent/training", description: "Fly training sample" };
  }
  return null;
}

export function spaceSummary(taken: Set<string>, purchaseCount: number, records: AdRecord[] = []) {
  const byId: Record<string, AdRecord> = {};
  for (const r of records) byId[r.spaceId] = r;
  return {
    purchaseCount,
    nextPriceEth: adPriceEth(purchaseCount),
    nextPriceUsdc: adPriceUsdc(purchaseCount),
    records,
    spaces: AD_SPACES.map((s) => ({
      id: s.id,
      label: s.label,
      section: s.section,
      vacant: !taken.has(s.id),
      imageUrl: byId[s.id]?.imageUrl,
      cid: byId[s.id]?.cid,
    })),
    github: GITHUB_URL,
  };
}

export function donationCatalog() {
  return {
    github: GITHUB_URL,
    tiers: TIERS.map((t) => ({
      id: t.id,
      label: t.label,
      subtitle: t.subtitle,
      blurb: t.blurb,
      eth: t.eth,
      usdc: donatePriceUsdc(t.id),
    })),
  };
}

export function trainingCatalog() {
  return catalogTraining();
}
