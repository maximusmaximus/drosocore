import { createServerFn } from "@tanstack/react-start";
import { isHexAddress } from "./siwe";
import type { CiDesk, CiItemView, CiMessageView } from "./ci";
import { loadDesk, castVote, creditStake, forceClose, searchCi, stakeOf } from "./ci.server";
import type { CiStake } from "./ci";

export const getCiDesk = createServerFn({ method: "POST" })
  .validator((d: { address?: string | null }) => {
    const address = d?.address && isHexAddress(d.address) ? d.address : null;
    return { address };
  })
  .handler(async ({ data }): Promise<CiDesk> => {
    return loadDesk(data.address);
  });

type VoteInput = {
  address: string;
  cycleId: number;
  optionId: number;
  signature: string;
};

export const castCiVote = createServerFn({ method: "POST" })
  .validator((d: VoteInput) => {
    if (!d || !isHexAddress(d.address)) throw new Error("address");
    if (typeof d.cycleId !== "number" || d.cycleId < 1) throw new Error("cycle");
    if (typeof d.optionId !== "number" || d.optionId < 1) throw new Error("option");
    if (typeof d.signature !== "string" || d.signature.length < 80) throw new Error("sig");
    return d;
  })
  .handler(async ({ data }): Promise<CiDesk> => {
    return castVote(data);
  });

type CreditInput = {
  address: string;
  eth: number;
  kind: "ads" | "membership" | "preview";
  txHash: string;
};

export const creditCiStake = createServerFn({ method: "POST" })
  .validator((d: CreditInput) => {
    if (!d || !isHexAddress(d.address)) throw new Error("address");
    if (typeof d.eth !== "number" || !Number.isFinite(d.eth) || d.eth <= 0 || d.eth > 20) throw new Error("eth");
    if (d.kind !== "ads" && d.kind !== "membership" && d.kind !== "preview") throw new Error("kind");
    if (typeof d.txHash !== "string" || d.txHash.length < 3) throw new Error("tx");
    return { ...d, txHash: d.txHash.slice(0, 80), eth: Math.round(d.eth * 1e6) / 1e6 };
  })
  .handler(async ({ data }): Promise<CiStake> => {
    return creditStake(data);
  });

export const closeCiNow = createServerFn({ method: "POST" })
  .validator((d: { cycleId?: number }) => {
    const cycleId = typeof d?.cycleId === "number" && d.cycleId > 0 ? d.cycleId : undefined;
    return { cycleId };
  })
  .handler(async ({ data }): Promise<CiDesk> => {
    return forceClose(data.cycleId);
  });

export const searchCiMemory = createServerFn({ method: "POST" })
  .validator((d: { text: string }) => {
    if (!d || typeof d.text !== "string" || d.text.trim().length < 2) throw new Error("text");
    return { text: d.text.trim().slice(0, 240) };
  })
  .handler(async ({ data }): Promise<{ items: CiItemView[]; messages: CiMessageView[] }> => {
    return searchCi(data.text);
  });

export const getCiStake = createServerFn({ method: "POST" })
  .validator((d: { address?: string | null }) => {
    const address = d?.address && isHexAddress(d.address) ? d.address : null;
    return { address };
  })
  .handler(async ({ data }): Promise<CiStake> => {
    return stakeOf(data.address);
  });
