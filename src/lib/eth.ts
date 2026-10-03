import { ETH_ADDRESS } from "./constants.ts";
import { isHexAddress } from "./siwe.ts";

export type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  isRainbow?: boolean;
  isTrust?: boolean;
  isOkxWallet?: boolean;
  isPhantom?: boolean;
  providers?: EthereumProvider[];
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

let activeProvider: EthereumProvider | null = null;

export function setActiveProvider(provider: EthereumProvider | null) {
  activeProvider = provider;
}

export function getActiveProvider(): EthereumProvider | null {
  if (activeProvider) return activeProvider;
  if (typeof window === "undefined") return null;
  return window.ethereum ?? null;
}

export function hasWallet(): boolean {
  return Boolean(getActiveProvider());
}

export function parseEthToWeiHex(eth: string | number): string {
  if (typeof eth === "number") {
    const wei = BigInt(Math.round(eth * 1e18));
    return "0x" + wei.toString(16);
  }
  const clean = eth.trim();
  const neg = clean.startsWith("-");
  const s = neg ? clean.slice(1) : clean;
  const [w, f = ""] = s.split(".");
  const whole = (w.replace(/^0+(?=\d)/, "") || "0").replace(/[^\d]/g, "") || "0";
  const frac = (f.replace(/[^\d]/g, "") + "000000000000000000").slice(0, 18);
  const wei = BigInt(whole) * 10n ** 18n + BigInt(frac);
  return "0x" + wei.toString(16);
}

export function toWeiHex(eth: number): string {
  return parseEthToWeiHex(eth);
}

export function weiHexToBigInt(hex: string): bigint {
  const h = hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
  if (!h) return 0n;
  return BigInt("0x" + h);
}

export async function requestAccounts(provider: EthereumProvider): Promise<string[]> {
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  return (accounts ?? []).filter((a) => typeof a === "string" && isHexAddress(a));
}

export async function readAccounts(provider: EthereumProvider): Promise<string[]> {
  try {
    const accounts = (await provider.request({ method: "eth_accounts" })) as string[];
    return (accounts ?? []).filter((a) => typeof a === "string" && isHexAddress(a));
  } catch {
    return [];
  }
}

export async function readChainId(provider: EthereumProvider): Promise<number> {
  const id = (await provider.request({ method: "eth_chainId" })) as string;
  return Number.parseInt(id, 16);
}

export async function ensureMainnet(provider: EthereumProvider): Promise<void> {
  const chainId = await readChainId(provider);
  if (chainId === 1) return;
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x1" }],
    });
  } catch {
    try {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: "0x1",
            chainName: "Ethereum",
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://cloudflare-eth.com"],
            blockExplorerUrls: ["https://etherscan.io"],
          },
        ],
      });
    } catch {
      /* stay on current chain; send may still work on forks */
    }
  }
}

export async function personalSign(
  provider: EthereumProvider,
  address: string,
  message: string,
): Promise<string> {
  const sig = (await provider.request({
    method: "personal_sign",
    params: [message, address],
  })) as string;
  if (!sig || typeof sig !== "string") throw new Error("signature");
  return sig;
}

export async function sendEth(
  amountEth: number | string,
  fromAddress?: string,
): Promise<string> {
  const provider = getActiveProvider();
  if (!provider) throw new Error("no-wallet");
  const accounts = await requestAccounts(provider);
  const from = fromAddress && accounts.some((a) => a.toLowerCase() === fromAddress.toLowerCase())
    ? fromAddress
    : accounts[0];
  if (!from) throw new Error("no-account");
  await ensureMainnet(provider);

  const hash = (await provider.request({
    method: "eth_sendTransaction",
    params: [
      {
        from,
        to: ETH_ADDRESS,
        value: parseEthToWeiHex(amountEth),
      },
    ],
  })) as string;
  return hash;
}

export async function fetchBalanceWei(): Promise<bigint | null> {
  try {
    const res = await fetch("https://cloudflare-eth.com", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getBalance",
        params: [ETH_ADDRESS, "latest"],
      }),
    });
    const json = (await res.json()) as { result?: string };
    if (typeof json.result === "string") return BigInt(json.result);
  } catch {
    /* public RPC optional */
  }
  return null;
}

export function shortAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
