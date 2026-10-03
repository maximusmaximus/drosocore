import { create } from "zustand";
import {
  getActiveProvider,
  personalSign,
  readAccounts,
  readChainId,
  requestAccounts,
  setActiveProvider,
  type EthereumProvider,
} from "./eth";
import { createSiweMessage, SIWE_STATEMENT, SIWE_VERSION } from "./siwe";
import { pairMcpKey, walletNonce, walletVerify } from "./wallet-api";
import {
  consumeWalletIntent,
  detectInAppWallet,
  mergeAnnounced,
  parseWalletSession,
  sessionValid,
  sortWallets,
  WALLET_SESSION_LS,
  WALLET_SESSION_MS,
  walletErrorCode,
  type AnnouncedWallet,
  type WalletSession,
} from "./wallets";
import { logHive } from "./hive-log";
import { loadLocalMcpKey, mcpPairMessage, saveLocalMcpKey, type McpRole } from "./mcp-key";
import type { CiStake } from "./ci";

type Status = "disconnected" | "connecting" | "signing" | "connected" | "error";

const providersByRdns = new Map<string, EthereumProvider>();
const boundProviders = new WeakSet<EthereumProvider>();
let hydrated = false;

const emptyStake: CiStake = { eth: 0, ads: 0, membership: 0, eligible: false };

type WalletState = {
  address: string | null;
  chainId: number | null;
  rdns: string | null;
  walletName: string | null;
  status: Status;
  error: string | null;
  modalOpen: boolean;
  announced: AnnouncedWallet[];
  mcpKey: string | null;
  mcpRole: McpRole;
  stake: CiStake;
  pairing: boolean;
  openModal: () => void;
  closeModal: () => void;
  hydrate: () => void;
  connectRdns: (rdns: string) => Promise<void>;
  connectProvider: (provider: EthereumProvider, meta: AnnouncedWallet) => Promise<void>;
  disconnect: () => void;
  pairMcp: (rotate?: boolean) => Promise<void>;
};

function persist(session: WalletSession | null) {
  if (typeof window === "undefined") return;
  try {
    if (!session) window.localStorage.removeItem(WALLET_SESSION_LS);
    else window.localStorage.setItem(WALLET_SESSION_LS, JSON.stringify(session));
  } catch {
    /* quota */
  }
}

function loadSession(): WalletSession | null {
  if (typeof window === "undefined") return null;
  try {
    return parseWalletSession(window.localStorage.getItem(WALLET_SESSION_LS));
  } catch {
    return null;
  }
}

function indexProvider(rdns: string, provider: EthereumProvider) {
  providersByRdns.set(rdns, provider);
}

function indexInjectedTree(eth: EthereumProvider) {
  indexProvider("injected", eth);
  if (!Array.isArray(eth.providers)) return;
  for (const p of eth.providers) {
    const rdns = p.isCoinbaseWallet
      ? "com.coinbase.wallet"
      : p.isMetaMask
        ? "io.metamask"
        : p.isRainbow
          ? "me.rainbow"
          : p.isTrust
            ? "com.trustwallet.app"
            : p.isOkxWallet
              ? "com.okex.wallet"
              : p.isPhantom
                ? "app.phantom"
                : "injected";
    if (rdns === "injected" && providersByRdns.has("injected")) continue;
    indexProvider(rdns, p);
  }
}

export const useWallet = create<WalletState>((set, get) => {
  const bindProviderEvents = (provider: EthereumProvider) => {
    if (!provider.on || boundProviders.has(provider)) return;
    boundProviders.add(provider);
    provider.on("accountsChanged", (accounts: unknown) => {
      const list = Array.isArray(accounts) ? (accounts as string[]) : [];
      if (!list.length) get().disconnect();
      else {
        const address = list[0];
        set({ address, mcpKey: loadLocalMcpKey(address) });
      }
    });
    provider.on("chainChanged", (id: unknown) => {
      if (typeof id === "string") set({ chainId: Number.parseInt(id, 16) });
    });
  };

  return {
    address: null,
    chainId: null,
    rdns: null,
    walletName: null,
    status: "disconnected",
    error: null,
    modalOpen: false,
    announced: [],
    mcpKey: null,
    mcpRole: "public",
    stake: emptyStake,
    pairing: false,
    openModal: () => set({ modalOpen: true, error: null }),
    closeModal: () => set({ modalOpen: false }),
    hydrate: () => {
      if (typeof window === "undefined") return;
      if (hydrated) return;
      hydrated = true;
      const onAnnounce = (event: Event) => {
        const detail = (event as CustomEvent<{ info: AnnouncedWallet; provider: EthereumProvider }>).detail;
        if (!detail?.info || !detail.provider) return;
        indexProvider(detail.info.rdns, detail.provider);
        set({ announced: sortWallets(mergeAnnounced(get().announced, detail.info)) });
      };
      window.addEventListener("eip6963:announceProvider", onAnnounce as EventListener);
      window.dispatchEvent(new Event("eip6963:requestProvider"));
      if (window.ethereum) {
        indexInjectedTree(window.ethereum);
        if (get().announced.length === 0) {
          const injected: AnnouncedWallet = {
            uuid: "injected",
            name: "Browser wallet",
            icon: "",
            rdns: "injected",
          };
          set({ announced: sortWallets(mergeAnnounced(get().announced, injected)) });
        }
      }
      const session = loadSession();
      if (session && sessionValid(session)) {
        const p = providersByRdns.get(session.rdns) ?? window.ethereum ?? null;
        if (p) {
          setActiveProvider(p);
          bindProviderEvents(p);
        }
        const mcpKey = loadLocalMcpKey(session.address);
        set({
          address: session.address,
          chainId: session.chainId,
          rdns: session.rdns,
          walletName: session.walletName,
          status: "connected",
          mcpKey,
          mcpRole: mcpKey ? "signed" : "public",
        });
        if (p) {
          void readAccounts(p).then((accounts) => {
            const still = accounts.some((a) => a.toLowerCase() === session.address.toLowerCase());
            if (!still && accounts[0]) set({ address: accounts[0], mcpKey: loadLocalMcpKey(accounts[0]) });
            if (!still && accounts.length === 0) get().disconnect();
          });
        }
      }
      const provider = getActiveProvider();
      if (provider) bindProviderEvents(provider);

      if (get().status !== "connected" && consumeWalletIntent()) {
        const eth = window.ethereum;
        const inApp = detectInAppWallet(navigator.userAgent, {
          isMetaMask: eth?.isMetaMask,
          isCoinbaseWallet: eth?.isCoinbaseWallet,
          isRainbow: eth?.isRainbow,
          isTrust: eth?.isTrust,
          isOkxWallet: eth?.isOkxWallet,
          isPhantom: eth?.isPhantom,
        });
        if (inApp || eth) set({ modalOpen: true });
      }
    },
    connectRdns: async (rdns) => {
      const provider = providersByRdns.get(rdns) ?? (rdns === "injected" ? window.ethereum : undefined);
      if (!provider) throw new Error("missing");
      const announced = get().announced.find((w) => w.rdns === rdns);
      await get().connectProvider(provider, announced ?? {
        uuid: rdns,
        name: rdns === "injected" ? "Browser wallet" : rdns,
        icon: "",
        rdns,
      });
    },
    connectProvider: async (provider, meta) => {
      set({ status: "connecting", error: null });
      try {
        setActiveProvider(provider);
        bindProviderEvents(provider);
        const accounts = await requestAccounts(provider);
        const address = accounts[0];
        if (!address) throw new Error("no-account");
        const chainId = await readChainId(provider);
        set({ status: "signing", address, chainId, rdns: meta.rdns, walletName: meta.name });
        const { nonce, issuedAt } = await walletNonce();
        const domain = window.location.host;
        const message = createSiweMessage({
          domain,
          address,
          statement: SIWE_STATEMENT,
          uri: window.location.origin,
          version: SIWE_VERSION,
          chainId: 1,
          nonce,
          issuedAt,
        });
        const signature = await personalSign(provider, address, message);
        const verified = await walletVerify({
          data: { message, signature, nonce, domain },
        });
        const now = Date.now();
        const session: WalletSession = {
          address: verified.address,
          chainId,
          rdns: meta.rdns,
          walletName: meta.name,
          signedAt: now,
          expiresAt: verified.expiresAt ?? now + WALLET_SESSION_MS,
        };
        persist(session);
        if (verified.mcpKey) saveLocalMcpKey(verified.address, verified.mcpKey);
        set({
          address: session.address,
          chainId,
          rdns: meta.rdns,
          walletName: meta.name,
          status: "connected",
          modalOpen: false,
          error: null,
          mcpKey: verified.mcpKey ?? loadLocalMcpKey(verified.address),
          mcpRole: verified.role ?? "signed",
          stake: verified.stake ?? emptyStake,
        });
        logHive({
          kind: "user",
          actor: "visitor",
          title: "wallet",
          body: `Visitor plugged ${meta.name}.`,
          meta: { wallet: meta.name },
        });
      } catch (e) {
        set({ status: "error", error: walletErrorCode(e) });
        throw e;
      }
    },
    disconnect: () => {
      persist(null);
      setActiveProvider(null);
      set({
        address: null,
        chainId: null,
        rdns: null,
        walletName: null,
        status: "disconnected",
        error: null,
        mcpKey: null,
        mcpRole: "public",
        stake: emptyStake,
      });
    },
    pairMcp: async (rotate = false) => {
      const address = get().address;
      const provider = getActiveProvider();
      if (!address || !provider) {
        set({ modalOpen: true });
        return;
      }
      set({ pairing: true, error: null });
      try {
        const { nonce } = await walletNonce();
        const message = mcpPairMessage(address, nonce);
        const signature = await personalSign(provider, address, message);
        const paired = await pairMcpKey({
          data: { address, signature, nonce, rotate },
        });
        saveLocalMcpKey(paired.address, paired.mcpKey);
        set({
          mcpKey: paired.mcpKey,
          mcpRole: paired.role,
          stake: paired.stake,
          pairing: false,
        });
        logHive({
          kind: "user",
          actor: "visitor",
          title: rotate ? "MCP key rotated" : "MCP paired",
          body: rotate ? "Visitor rotated their pairing key." : "Visitor minted an MCP pairing key.",
        });
      } catch (e) {
        set({ pairing: false, error: walletErrorCode(e) });
        throw e;
      }
    },
  };
});
