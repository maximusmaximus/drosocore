import { getAddress, recoverMessageAddress } from "viem";
import {
  issuedAtFresh,
  parseSiweMessage,
  siweDomainAllowed,
  SIWE_STATEMENT,
  SIWE_VERSION,
} from "./siwe.ts";

export type SiweVerifyOk = { ok: true; address: string };
export type SiweVerifyErr = { ok: false; error: string };
export type SiweVerifyResult = SiweVerifyOk | SiweVerifyErr;

export async function verifySiweSignature(opts: {
  message: string;
  signature: string;
  expectedNonce: string;
  expectedDomain?: string;
  nowMs?: number;
}): Promise<SiweVerifyResult> {
  let fields;
  try {
    fields = parseSiweMessage(opts.message);
  } catch {
    return { ok: false, error: "parse" };
  }
  if (fields.nonce !== opts.expectedNonce) return { ok: false, error: "nonce" };
  if (fields.version !== SIWE_VERSION) return { ok: false, error: "version" };
  if (fields.statement !== SIWE_STATEMENT) return { ok: false, error: "statement" };
  if (fields.chainId !== 1) return { ok: false, error: "chain" };
  if (!siweDomainAllowed(fields.domain)) return { ok: false, error: "domain" };
  if (opts.expectedDomain && fields.domain !== opts.expectedDomain) return { ok: false, error: "domain" };
  if (!issuedAtFresh(fields.issuedAt, opts.nowMs)) return { ok: false, error: "issued" };
  if (!opts.signature || !opts.signature.startsWith("0x")) return { ok: false, error: "signature" };
  try {
    const recovered = await recoverMessageAddress({
      message: opts.message,
      signature: opts.signature as `0x${string}`,
    });
    const a = getAddress(recovered);
    const b = getAddress(fields.address as `0x${string}`);
    if (a !== b) return { ok: false, error: "mismatch" };
    return { ok: true, address: a };
  } catch {
    return { ok: false, error: "recover" };
  }
}
