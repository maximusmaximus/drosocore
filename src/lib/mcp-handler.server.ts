import {
  addDonation,
  addTraining,
  buildBundle,
  json,
  latestBundleMeta,
  loadAdsCatalog,
  loadAdsForPayer,
  loadTraining,
  placeAd,
  requirePayment,
  updateAd,
  vacantSpaces,
} from "./agent.server";
import {
  authToolError,
  donationCatalog,
  initializeResult,
  paymentToolError,
  quoteForTool,
  resourcesList,
  spaceSummary,
  textResult,
  toolAuth,
  toolsList,
  trainingCatalog,
  type RpcReq,
} from "./mcp";
import { donatePriceUsdc } from "./x402";
import { TIERS, type StageId } from "./tiers";
import { sessionFromRequest, type McpSession } from "./mcp-auth.server";
import { loadDesk, castVoteAs, addCiComment } from "./ci.server";
import { listHive } from "./hive.server";

const MCP_HDR = { "MCP-Protocol-Version": "2025-03-26" };

function rpc(id: RpcReq["id"], result: unknown, error?: { code: number; message: string }) {
  if (error) return { jsonrpc: "2.0", id: id ?? null, error };
  return { jsonrpc: "2.0", id: id ?? null, result };
}

function ok(id: RpcReq["id"], result: unknown, status = 200) {
  return json(rpc(id, result), status, MCP_HDR);
}

function accountView(session: McpSession, desk: Awaited<ReturnType<typeof loadDesk>>, ads: Awaited<ReturnType<typeof loadAdsForPayer>>) {
  return {
    address: session.address,
    role: session.role,
    stake: session.stake,
    privileges: {
      read: true,
      vote: session.role === "stakeholder",
      comment: session.role === "stakeholder",
      manageAds: session.role === "stakeholder",
      membership: session.stake.membership > 0,
    },
    myVote: desk.myVote,
    ads,
    cycle: desk.cycle
      ? { id: desk.cycle.id, dayKey: desk.cycle.dayKey, status: desk.cycle.status, closesAt: desk.cycle.closesAt }
      : null,
  };
}

async function callTool(name: string, args: Record<string, unknown>, request: Request, session: McpSession | null) {
  const auth = toolAuth(name);
  if ((auth === "signed" || auth === "stakeholder") && !session) {
    return authToolError("pairing-key", {
      hint: "Connect a wallet in the hall, copy your dc_ key, and send Authorization: Bearer dc_…",
    });
  }
  if (auth === "stakeholder" && session?.role !== "stakeholder") {
    return authToolError("stakeholder", {
      hint: "Buy a billboard or fund a membership, then retry. Stake-weighted tools need paid-in ETH.",
      stake: session?.stake ?? { eth: 0, eligible: false },
    });
  }

  const ads = await loadAdsCatalog();
  const taken = new Set(ads.records.map((r) => r.spaceId));

  if (name === "list_ad_spaces") return textResult(spaceSummary(taken, ads.purchaseCount, ads.records));
  if (name === "get_ads") return textResult({ ...ads, github: spaceSummary(taken, ads.purchaseCount).github });
  if (name === "list_donation_tiers") return textResult(donationCatalog());
  if (name === "get_training") {
    const samples = await loadTraining(30);
    return textResult({ ...trainingCatalog(), samples });
  }
  if (name === "get_backup") {
    const meta = await latestBundleMeta();
    return textResult(meta ?? { cid: null, hint: "no bundle yet — buy an ad or submit training" });
  }
  if (name === "pull_data") {
    const bundle = await buildBundle();
    const meta = await latestBundleMeta();
    return textResult({ ...bundle, backup: meta });
  }
  if (name === "get_ci_ballot") {
    const desk = await loadDesk(session?.address ?? null);
    return textResult({
      cycle: desk.cycle,
      options: desk.options,
      myVote: desk.myVote,
      stake: session?.stake ?? desk.stake,
      remainHint: desk.cycle?.closesAt,
    });
  }
  if (name === "get_ci_history") {
    const desk = await loadDesk(session?.address ?? null);
    return textResult({
      items: desk.items,
      history: desk.history,
      messages: desk.messages,
      budget: desk.budget,
    });
  }
  if (name === "get_hall_log") {
    const limit = typeof args.limit === "number" ? args.limit : 40;
    const snap = await listHive(limit);
    return textResult(snap);
  }
  if (name === "whoami") {
    return textResult({
      address: session!.address,
      role: session!.role,
      stake: session!.stake,
      prefix: session!.prefix,
    });
  }
  if (name === "get_account") {
    const desk = await loadDesk(session!.address);
    const mine = await loadAdsForPayer(session!.address);
    return textResult(accountView(session!, desk, mine));
  }
  if (name === "list_my_ads") {
    return textResult({ ads: await loadAdsForPayer(session!.address) });
  }
  if (name === "vote_ci") {
    const optionId = Number(args.optionId);
    const desk = await loadDesk(session!.address);
    const cycleId = typeof args.cycleId === "number" && args.cycleId > 0 ? args.cycleId : desk.cycle?.id;
    if (!cycleId) throw new Error("cycle");
    const next = await castVoteAs(session!.address, cycleId, optionId);
    return textResult({ ok: true, myVote: next.myVote, cycle: next.cycle, options: next.options });
  }
  if (name === "comment_ci") {
    const next = await addCiComment({
      address: session!.address,
      body: String(args.body ?? ""),
      cycleId: typeof args.cycleId === "number" ? args.cycleId : null,
      itemId: typeof args.itemId === "number" ? args.itemId : null,
    });
    return textResult({ ok: true, messages: next.messages.slice(0, 8) });
  }
  if (name === "update_ad") {
    const record = await updateAd({
      spaceId: String(args.spaceId ?? ""),
      imageBase64: typeof args.imageBase64 === "string" ? args.imageBase64 : undefined,
      imageUrl: typeof args.imageUrl === "string" ? args.imageUrl : undefined,
      payer: session!.address,
    });
    return textResult({ record });
  }

  if (name === "buy_ad") {
    const quote = quoteForTool("buy_ad", ads.purchaseCount)!;
    const pay = await requirePayment(request, args, quote);
    if (!pay.ok) return paymentToolError(pay.required);
    const spaceId = String(args.spaceId ?? "");
    const payer =
      session?.address ||
      (typeof args.payer === "string" ? args.payer : undefined);
    const record = await placeAd({
      spaceId,
      imageBase64: typeof args.imageBase64 === "string" ? args.imageBase64 : undefined,
      imageUrl: typeof args.imageUrl === "string" ? args.imageUrl : undefined,
      txHash: pay.txHash,
      source: "mcp",
      payer,
    });
    const meta = await latestBundleMeta();
    return textResult({ record, vacant: vacantSpaces(new Set([...taken, record.spaceId])), backup: meta });
  }

  if (name === "donate") {
    const tier = String(args.tier ?? "larva") as StageId;
    const known = TIERS.some((t) => t.id === tier) ? tier : "larva";
    const usdc = donatePriceUsdc(known);
    const pay = await requirePayment(request, args, {
      usdc,
      resource: "/api/agent/donate",
      description: `Donate ${known}`,
    });
    if (!pay.ok) return paymentToolError(pay.required);
    const payer = session?.address || (typeof args.payer === "string" ? args.payer : undefined);
    const amountEth = TIERS.find((t) => t.id === known)?.eth;
    await addDonation(known, String(usdc), pay.txHash, "mcp", payer, amountEth);
    const meta = await latestBundleMeta();
    return textResult({ ok: true, tier: known, usdc, txHash: pay.txHash, backup: meta, payer });
  }

  if (name === "submit_training") {
    const pay = await requirePayment(request, args, quoteForTool("submit_training")!);
    if (!pay.ok) return paymentToolError(pay.required);
    const sample = await addTraining(args, "mcp", pay.txHash);
    const meta = await latestBundleMeta();
    return textResult({ sample, backup: meta });
  }

  throw new Error(`unknown tool ${name}`);
}

export async function handleMcp(request: Request): Promise<Response> {
  if (request.method === "GET") {
    return json(
      {
        protocol: "mcp",
        ...initializeResult(),
        tools: toolsList().tools.map((t) => t.name),
      },
      200,
      MCP_HDR,
    );
  }
  let msg: RpcReq;
  try {
    msg = (await request.json()) as RpcReq;
  } catch {
    return json(rpc(null, undefined, { code: -32700, message: "parse error" }), 400, MCP_HDR);
  }
  const id = msg.id ?? null;
  const method = msg.method ?? "";
  try {
    if (method === "initialize") return ok(id, initializeResult());
    if (method === "notifications/initialized" || method === "initialized") return ok(id, {});
    if (method === "ping") return ok(id, {});
    if (method === "tools/list") return ok(id, toolsList());
    if (method === "resources/list") return ok(id, resourcesList());
    if (method === "resources/read") {
      const uri = String(msg.params?.uri ?? "");
      if (uri.endsWith("ads")) {
        const ads = await loadAdsCatalog();
        return ok(id, textResult(spaceSummary(new Set(ads.records.map((r) => r.spaceId)), ads.purchaseCount, ads.records)));
      }
      if (uri.endsWith("training")) return ok(id, textResult({ ...trainingCatalog(), samples: await loadTraining(20) }));
      if (uri.endsWith("backup")) return ok(id, textResult((await latestBundleMeta()) ?? {}));
      if (uri.endsWith("donations") || uri.endsWith("donate")) {
        const bundle = await buildBundle();
        return ok(id, textResult({ donations: bundle.donations, ...donationCatalog() }));
      }
      if (uri.endsWith("ci")) {
        const desk = await loadDesk(null);
        return ok(id, textResult({ cycle: desk.cycle, options: desk.options, items: desk.items }));
      }
      if (uri.endsWith("log")) {
        return ok(id, textResult(await listHive(30)));
      }
      return json(rpc(id, undefined, { code: -32002, message: "unknown resource" }), 200, MCP_HDR);
    }
    if (method === "tools/call") {
      const name = String(msg.params?.name ?? "");
      const args = (msg.params?.arguments as Record<string, unknown>) ?? {};
      const meta = (msg.params?._meta as Record<string, unknown>) ?? {};
      if (meta["x402/payment"] && !args.txHash) {
        const pay = meta["x402/payment"];
        args.payment = typeof pay === "string" ? pay : JSON.stringify(pay);
      }
      const session = await sessionFromRequest(request, { ...meta, ...args });
      const result = await callTool(name, args, request, session);
      return ok(id, result);
    }
    return json(rpc(id, undefined, { code: -32601, message: `unknown method ${method}` }), 200, MCP_HDR);
  } catch (e) {
    const message = e instanceof Error ? e.message : "error";
    return json(rpc(id, undefined, { code: -32000, message }), 200, MCP_HDR);
  }
}
