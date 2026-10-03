/** Pairing-key format, pair message, and local cache. Pure / isomorphic. */

export const MCP_KEY_PREFIX = "dc_";
export const MCP_KEYS_LS = "drosocore.mcp.keys.v1";

export type McpAuth = "public" | "signed" | "stakeholder" | "paid";
export type McpRole = "public" | "signed" | "stakeholder";

export function mintMcpToken(): string {
  const bytes = new Uint8Array(24);
  globalThis.crypto.getRandomValues(bytes);
  return MCP_KEY_PREFIX + toHex(bytes);
}

export function isMcpToken(value: string): boolean {
  return /^dc_[a-f0-9]{48}$/.test(value.trim());
}

export function mcpTokenPrefix(token: string): string {
  const t = token.trim();
  if (t.length < 10) return t;
  return `${t.slice(0, 7)}…${t.slice(-4)}`;
}

export async function hashMcpToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token.trim());
  const buf = await globalThis.crypto.subtle.digest("SHA-256", data);
  return toHex(new Uint8Array(buf));
}

export function mcpPairMessage(address: string, nonce: string): string {
  return [`DROSOCORE MCP pair`, `Address: ${address}`, `Nonce: ${nonce}`].join("\n");
}

export function roleFromStake(eligible: boolean, signed: boolean): McpRole {
  if (eligible) return "stakeholder";
  if (signed) return "signed";
  return "public";
}

export function mcpConfigSnippet(origin: string, token?: string | null): string {
  const url = `${origin.replace(/\/$/, "")}/api/mcp`;
  const headers = token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : undefined;
  const body: Record<string, unknown> = {
    mcpServers: {
      drosocore: headers
        ? { type: "http", url, headers }
        : { type: "http", url },
    },
  };
  return JSON.stringify(body, null, 2);
}

export function readBearer(header: string | null | undefined): string | null {
  if (!header) return null;
  const raw = header.trim();
  const m = /^Bearer\s+(.+)$/i.exec(raw);
  const token = (m ? m[1] : raw).trim();
  return isMcpToken(token) ? token : null;
}

type KeyMap = Record<string, string>;

function loadKeyMap(): KeyMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(MCP_KEYS_LS);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: KeyMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string" && isMcpToken(v)) out[k.toLowerCase()] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function saveKeyMap(map: KeyMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MCP_KEYS_LS, JSON.stringify(map));
  } catch {
    /* quota */
  }
}

export function loadLocalMcpKey(address: string | null | undefined): string | null {
  if (!address) return null;
  return loadKeyMap()[address.toLowerCase()] ?? null;
}

export function saveLocalMcpKey(address: string, token: string) {
  if (!isMcpToken(token)) return;
  const map = loadKeyMap();
  map[address.toLowerCase()] = token.trim();
  saveKeyMap(map);
}

export function clearLocalMcpKey(address: string) {
  const map = loadKeyMap();
  delete map[address.toLowerCase()];
  saveKeyMap(map);
}

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}
