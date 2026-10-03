import { createServerFn } from "@tanstack/react-start";
import { isHexAddress } from "./siwe";

function memoryNonces(): Map<string, number> {
  const g = globalThis as typeof globalThis & { __drosocoreNonces__?: Map<string, number> };
  g.__drosocoreNonces__ ??= new Map();
  return g.__drosocoreNonces__;
}

function pruneMemory(now = Date.now()) {
  const m = memoryNonces();
  for (const [k, t] of m) {
    if (now - t > 15 * 60 * 1000) m.delete(k);
  }
}

function randomNonce(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function consumeNonce(nonce: string): Promise<boolean> {
  pruneMemory();
  const mem = memoryNonces();
  let known = mem.has(nonce);
  mem.delete(nonce);
  try {
    const { getSql } = await import("./db");
    const sql = await getSql();
    const rows = await sql<{ nonce: string }>`select nonce from wallet_nonces where nonce = ${nonce}`;
    if (rows.length) {
      known = true;
      await sql`delete from wallet_nonces where nonce = ${nonce}`;
    }
  } catch {
    /* memory only */
  }
  return known;
}

export const walletNonce = createServerFn({ method: "POST" }).handler(async () => {
  pruneMemory();
  const nonce = randomNonce();
  memoryNonces().set(nonce, Date.now());
  try {
    const { getSql } = await import("./db");
    const sql = await getSql();
    await sql`delete from wallet_nonces where created_at < now() - interval '15 minutes'`;
    await sql`insert into wallet_nonces (nonce) values (${nonce})`;
  } catch {
    /* memory fallback */
  }
  return { nonce, issuedAt: new Date().toISOString() };
});

type VerifyInput = {
  message: string;
  signature: string;
  nonce: string;
  domain?: string;
};

export const walletVerify = createServerFn({ method: "POST" })
  .validator((d: VerifyInput) => {
    if (!d || typeof d.message !== "string" || typeof d.signature !== "string" || typeof d.nonce !== "string") {
      throw new Error("invalid");
    }
    if (d.message.length > 4000 || d.signature.length > 200 || d.nonce.length > 80) throw new Error("invalid");
    return d;
  })
  .handler(async ({ data }) => {
    if (!(await consumeNonce(data.nonce))) throw new Error("nonce");
    const { verifySiweSignature } = await import("./siwe-verify");
    const result = await verifySiweSignature({
      message: data.message,
      signature: data.signature,
      expectedNonce: data.nonce,
      expectedDomain: data.domain,
    });
    if (!result.ok) throw new Error(result.error);
    let mcpKey: string | null = null;
    let mcpPrefix: string | null = null;
    let role: "signed" | "stakeholder" = "signed";
    let stake = { eth: 0, ads: 0, membership: 0, eligible: false };
    try {
      const { issueOrGetMcpKey } = await import("./mcp-auth.server");
      const { stakeOf } = await import("./ci.server");
      const issued = await issueOrGetMcpKey(result.address);
      mcpKey = issued.token;
      mcpPrefix = issued.prefix;
      stake = await stakeOf(result.address);
      if (stake.eligible) role = "stakeholder";
    } catch (e) {
      console.error("mcp issue", e);
    }
    return {
      address: result.address,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      mcpKey,
      mcpPrefix,
      role,
      stake,
    };
  });

type PairInput = {
  address: string;
  signature: string;
  nonce: string;
  rotate?: boolean;
};

export const pairMcpKey = createServerFn({ method: "POST" })
  .validator((d: PairInput) => {
    if (!d || !isHexAddress(d.address)) throw new Error("address");
    if (typeof d.signature !== "string" || d.signature.length < 80) throw new Error("sig");
    if (typeof d.nonce !== "string" || d.nonce.length < 8) throw new Error("nonce");
    return { address: d.address, signature: d.signature, nonce: d.nonce, rotate: Boolean(d.rotate) };
  })
  .handler(async ({ data }) => {
    if (!(await consumeNonce(data.nonce))) throw new Error("nonce");
    const { verifyPairSignature, issueOrGetMcpKey, rotateMcpKey } = await import("./mcp-auth.server");
    const address = await verifyPairSignature(data);
    const issued = data.rotate ? await rotateMcpKey(address) : await issueOrGetMcpKey(address);
    const { stakeOf } = await import("./ci.server");
    const stake = await stakeOf(address);
    return {
      address,
      mcpKey: issued.token,
      mcpPrefix: issued.prefix,
      role: stake.eligible ? ("stakeholder" as const) : ("signed" as const),
      stake,
    };
  });
