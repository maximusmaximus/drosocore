import { getAddress } from "viem";
import { recoverMessageAddress } from "viem";
import { stakeOf } from "./ci.server";
import type { CiStake } from "./ci";
import {
  hashMcpToken,
  isMcpToken,
  mintMcpToken,
  mcpPairMessage,
  mcpTokenPrefix,
  readBearer,
  roleFromStake,
  type McpRole,
} from "./mcp-key";
import { isHexAddress } from "./siwe";

export type McpSession = {
  address: string;
  role: Exclude<McpRole, "public">;
  stake: CiStake;
  prefix: string;
};

type KeyRow = { address: string; token: string; token_hash: string };

function memoryKeys(): Map<string, KeyRow> {
  const g = globalThis as typeof globalThis & { __drosocoreMcpKeys__?: Map<string, KeyRow> };
  g.__drosocoreMcpKeys__ ??= new Map();
  return g.__drosocoreMcpKeys__;
}

async function sql() {
  const { getSql } = await import("./db");
  return getSql();
}

function normAddress(address: string): string {
  return getAddress(address as `0x${string}`).toLowerCase();
}

async function sessionFromAddress(address: string, prefix: string): Promise<McpSession> {
  const stake = await stakeOf(address);
  const role = roleFromStake(stake.eligible, true);
  return {
    address: normAddress(address),
    role: role === "stakeholder" ? "stakeholder" : "signed",
    stake,
    prefix,
  };
}

export async function issueOrGetMcpKey(address: string): Promise<{ token: string; created: boolean; prefix: string }> {
  const addr = normAddress(address);
  const mem = memoryKeys();
  for (const row of mem.values()) {
    if (row.address === addr) return { token: row.token, created: false, prefix: mcpTokenPrefix(row.token) };
  }
  try {
    const db = await sql();
    const existing = await db<KeyRow>`select address, token, token_hash from mcp_keys where address = ${addr}`;
    if (existing[0]) {
      mem.set(existing[0].token_hash, existing[0]);
      return { token: existing[0].token, created: false, prefix: mcpTokenPrefix(existing[0].token) };
    }
  } catch {
    /* memory */
  }
  const token = mintMcpToken();
  const tokenHash = await hashMcpToken(token);
  const row: KeyRow = { address: addr, token, token_hash: tokenHash };
  mem.set(tokenHash, row);
  try {
    const db = await sql();
    await db`
      insert into mcp_keys (address, token, token_hash)
      values (${addr}, ${token}, ${tokenHash})
      on conflict (address) do nothing
    `;
    const again = await db<KeyRow>`select address, token, token_hash from mcp_keys where address = ${addr}`;
    if (again[0]) {
      mem.set(again[0].token_hash, again[0]);
      return { token: again[0].token, created: again[0].token === token, prefix: mcpTokenPrefix(again[0].token) };
    }
  } catch {
    /* memory only */
  }
  return { token, created: true, prefix: mcpTokenPrefix(token) };
}

export async function rotateMcpKey(address: string): Promise<{ token: string; prefix: string }> {
  const addr = normAddress(address);
  const token = mintMcpToken();
  const tokenHash = await hashMcpToken(token);
  const mem = memoryKeys();
  for (const [h, row] of mem) {
    if (row.address === addr) mem.delete(h);
  }
  mem.set(tokenHash, { address: addr, token, token_hash: tokenHash });
  try {
    const db = await sql();
    await db`
      insert into mcp_keys (address, token, token_hash, rotated_at)
      values (${addr}, ${token}, ${tokenHash}, now())
      on conflict (address) do update set token = excluded.token, token_hash = excluded.token_hash, rotated_at = now()
    `;
  } catch {
    /* memory */
  }
  return { token, prefix: mcpTokenPrefix(token) };
}

export async function lookupMcpToken(token: string): Promise<McpSession | null> {
  if (!isMcpToken(token)) return null;
  const tokenHash = await hashMcpToken(token);
  const mem = memoryKeys();
  const cached = mem.get(tokenHash);
  if (cached && cached.token === token) return sessionFromAddress(cached.address, mcpTokenPrefix(token));
  try {
    const db = await sql();
    const rows = await db<KeyRow>`select address, token, token_hash from mcp_keys where token_hash = ${tokenHash}`;
    const row = rows[0];
    if (row && row.token === token) {
      mem.set(tokenHash, row);
      return sessionFromAddress(row.address, mcpTokenPrefix(token));
    }
  } catch {
    /* memory */
  }
  return null;
}

export async function sessionFromRequest(
  request: Request,
  extra?: Record<string, unknown> | null,
): Promise<McpSession | null> {
  const header =
    readBearer(request.headers.get("authorization")) ||
    readBearer(request.headers.get("x-drosocore-key"));
  const meta = extra && typeof extra === "object" ? extra : {};
  const fromMeta =
    typeof meta["drosocore/key"] === "string"
      ? readBearer(meta["drosocore/key"] as string)
      : typeof meta.key === "string"
        ? readBearer(meta.key as string)
        : null;
  const token = header || fromMeta;
  if (!token) return null;
  return lookupMcpToken(token);
}

export async function verifyPairSignature(input: {
  address: string;
  signature: string;
  nonce: string;
}): Promise<string> {
  if (!isHexAddress(input.address)) throw new Error("address");
  if (typeof input.signature !== "string" || input.signature.length < 80) throw new Error("sig");
  const msg = mcpPairMessage(input.address, input.nonce);
  const recovered = await recoverMessageAddress({
    message: msg,
    signature: input.signature as `0x${string}`,
  });
  if (getAddress(recovered) !== getAddress(input.address as `0x${string}`)) throw new Error("sig");
  return normAddress(input.address);
}
