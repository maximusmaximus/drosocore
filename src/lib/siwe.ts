/** EIP-4361 Sign-In with Ethereum — create and parse. No crypto here. */

export const SIWE_VERSION = "1";
export const SIWE_STATEMENT = "Sign in to DROSOCORE to support the reactor.";

export type SiweFields = {
  domain: string;
  address: string;
  statement: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
};

const HEX_ADDR = /^0x[a-fA-F0-9]{40}$/;

export function isHexAddress(value: string): boolean {
  return HEX_ADDR.test(value);
}

export function createSiweMessage(fields: SiweFields): string {
  if (!isHexAddress(fields.address)) throw new Error("address");
  if (!fields.nonce || fields.nonce.length < 8) throw new Error("nonce");
  if (!fields.domain) throw new Error("domain");
  return [
    `${fields.domain} wants you to sign in with your Ethereum account:`,
    fields.address,
    "",
    fields.statement,
    "",
    `URI: ${fields.uri}`,
    `Version: ${fields.version}`,
    `Chain ID: ${fields.chainId}`,
    `Nonce: ${fields.nonce}`,
    `Issued At: ${fields.issuedAt}`,
  ].join("\n");
}

export function parseSiweMessage(message: string): SiweFields {
  const lines = message.split("\n");
  if (lines.length < 9) throw new Error("siwe");
  const header = /^(.*) wants you to sign in with your Ethereum account:$/.exec(lines[0] ?? "");
  if (!header) throw new Error("siwe-header");
  const address = lines[1] ?? "";
  if (!isHexAddress(address)) throw new Error("siwe-address");
  const uri = /^URI: (.+)$/.exec(lines[5] ?? "")?.[1];
  const version = /^Version: (.+)$/.exec(lines[6] ?? "")?.[1];
  const chainRaw = /^Chain ID: (\d+)$/.exec(lines[7] ?? "")?.[1];
  const nonce = /^Nonce: (.+)$/.exec(lines[8] ?? "")?.[1];
  const issuedAt = /^Issued At: (.+)$/.exec(lines[9] ?? "")?.[1];
  if (!uri || !version || !chainRaw || !nonce || !issuedAt) throw new Error("siwe-fields");
  return {
    domain: header[1],
    address,
    statement: lines[3] ?? "",
    uri,
    version,
    chainId: Number(chainRaw),
    nonce,
    issuedAt,
  };
}

export function siweDomainAllowed(domain: string): boolean {
  if (!domain || domain.length > 253) return false;
  if (domain === "localhost") return true;
  if (/^\d{1,3}(\.\d{1,3}){3}(:\d+)?$/.test(domain.split(":")[0] ?? "")) return true;
  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain.split(":")[0] ?? "") ||
    /^[a-z0-9-]{1,63}$/i.test(domain.split(":")[0] ?? "");
}

export function issuedAtFresh(issuedAt: string, nowMs = Date.now(), maxAgeMs = 15 * 60 * 1000): boolean {
  const t = Date.parse(issuedAt);
  if (!Number.isFinite(t)) return false;
  if (t > nowMs + 60_000) return false;
  return nowMs - t <= maxAgeMs;
}
