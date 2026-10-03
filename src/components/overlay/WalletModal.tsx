import { useEffect, useMemo } from "react";
import { Smartphone, Wallet, X, Plug } from "lucide-react";
import { useWallet } from "@/lib/wallet-store";
import { useMcp } from "@/lib/mcp-store";
import {
  STANDARD_WALLETS,
  deepLinkFor,
  detectInAppWallet,
  isMobileUa,
  markWalletIntent,
  needsWalletDeepLink,
  type WalletId,
} from "@/lib/wallets";
import { shortAddress } from "@/lib/eth";

function pageUrl(): string {
  return window.location.origin + window.location.pathname;
}

export function WalletModal() {
  const open = useWallet((s) => s.modalOpen);
  const announced = useWallet((s) => s.announced);
  const status = useWallet((s) => s.status);
  const error = useWallet((s) => s.error);
  const address = useWallet((s) => s.address);
  const walletName = useWallet((s) => s.walletName);

  const env = useMemo(() => {
    if (typeof window === "undefined") {
      return { mobile: false, deep: false, inApp: null as ReturnType<typeof detectInAppWallet> };
    }
    const ua = navigator.userAgent;
    const eth = window.ethereum;
    return {
      mobile: isMobileUa(ua),
      deep: needsWalletDeepLink(ua, Boolean(eth)),
      inApp: detectInAppWallet(ua, {
        isMetaMask: eth?.isMetaMask,
        isCoinbaseWallet: eth?.isCoinbaseWallet,
        isRainbow: eth?.isRainbow,
        isTrust: eth?.isTrust,
        isOkxWallet: eth?.isOkxWallet,
        isPhantom: eth?.isPhantom,
      }),
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") useWallet.getState().closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;
  const busy = status === "connecting" || status === "signing";
  const connected = status === "connected" && address;
  const listed = env.inApp ? announced.filter((w) => w.rdns !== "injected") : announced;

  const connectInjected = (rdns: string) => {
    void useWallet.getState().connectRdns(rdns).catch(() => undefined);
  };

  const openDeep = (id: WalletId) => {
    markWalletIntent();
    const link = deepLinkFor(id, pageUrl());
    if (link) window.location.assign(link);
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] flex items-end justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center">
      <button
        type="button"
        aria-label="close wallet"
        className="pointer-events-auto absolute inset-0 bg-bg/55"
        onClick={() => useWallet.getState().closeModal()}
      />
      <div
        data-no-pinch
        role="dialog"
        aria-label="wallet"
        className="pointer-events-auto relative w-full max-w-sm rounded-xl border border-border bg-surface p-4 shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
      >
        <button
          type="button"
          aria-label="close"
          className="absolute right-2 top-2 inline-flex size-11 items-center justify-center rounded-full text-muted"
          onClick={() => useWallet.getState().closeModal()}
        >
          <X className="size-4" />
        </button>
        <p className="pr-10 font-mono text-xs tracking-wide text-fg">wallet</p>
        <p className="mt-1 font-mono text-[0.65rem] text-subtle">
          {connected ? `${walletName ?? "connected"} · signed in` : "sign in with a standard crypto wallet"}
        </p>

        {connected ? (
          <div className="mt-4 flex flex-col gap-2">
            <p className="font-mono text-sm text-accent">{shortAddress(address)}</p>
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-accent text-sm font-medium text-accent-fg"
              onClick={() => {
                useWallet.getState().closeModal();
                useMcp.getState().setOpen(true);
              }}
            >
              <Plug className="size-4" />
              MCP pairing key
            </button>
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center rounded-md bg-surface-2 text-sm text-fg"
              onClick={() => {
                useWallet.getState().disconnect();
              }}
            >
              disconnect
            </button>
          </div>
        ) : (
          <div className="mt-3 flex max-h-[min(24rem,60dvh)] flex-col gap-2 overflow-y-auto">
            {env.inApp ? (
              <button
                type="button"
                disabled={busy}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-accent text-sm font-medium text-accent-fg disabled:opacity-60"
                onClick={() => connectInjected("injected")}
              >
                <Wallet className="size-4" />
                {busy ? "…" : "continue in this wallet"}
              </button>
            ) : null}

            {listed.map((w) => (
              <button
                key={w.uuid}
                type="button"
                disabled={busy}
                className="inline-flex h-11 items-center gap-3 rounded-md bg-surface-2 px-3 text-left text-sm text-fg disabled:opacity-60"
                onClick={() => connectInjected(w.rdns)}
              >
                {w.icon ? (
                  <img src={w.icon} alt="" className="size-6 rounded-sm" />
                ) : (
                  <Wallet className="size-4 shrink-0 text-muted" />
                )}
                <span className="flex-1 font-medium">{w.name}</span>
              </button>
            ))}

            {env.deep || (env.mobile && listed.length === 0 && !env.inApp) ? (
              <>
                <p className="mt-2 font-mono text-[0.65rem] text-subtle">open this page in a wallet</p>
                {STANDARD_WALLETS.filter((w) => w.mobile).map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    className="inline-flex h-11 items-center gap-3 rounded-md bg-surface-2 px-3 text-left text-sm text-fg"
                    onClick={() => openDeep(w.id)}
                  >
                    <Smartphone className="size-4 shrink-0 text-muted" />
                    <span>{w.name}</span>
                  </button>
                ))}
              </>
            ) : null}

            {!env.mobile && listed.length === 0 && !env.inApp ? (
              <div className="flex flex-col gap-2">
                <p className="font-mono text-[0.65rem] text-subtle">install a wallet, then return</p>
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center justify-center rounded-md bg-surface-2 text-sm text-fg"
                >
                  MetaMask
                </a>
                <a
                  href="https://www.coinbase.com/wallet/downloads"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center justify-center rounded-md bg-surface-2 text-sm text-fg"
                >
                  Coinbase Wallet
                </a>
                <a
                  href="https://rainbow.me/download"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center justify-center rounded-md bg-surface-2 text-sm text-fg"
                >
                  Rainbow
                </a>
              </div>
            ) : null}
          </div>
        )}

        {busy ? (
          <p className="mt-3 font-mono text-[0.65rem] text-accent">
            {status === "signing" ? "sign the login message in your wallet" : "waiting for wallet…"}
          </p>
        ) : null}
        {error ? (
          <p className="mt-3 font-mono text-[0.65rem] text-muted">
            {error === "rejected" || error.includes("reject") || error.includes("denied")
              ? "signature dismissed"
              : "wallet dismissed · try another"}
          </p>
        ) : null}
      </div>
    </div>
  );
}
