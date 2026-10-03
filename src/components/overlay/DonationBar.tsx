import { lazy, Suspense, useState } from "react";
import { Check, Copy, Wallet } from "lucide-react";
import { ETH_ADDRESS } from "@/lib/constants";
import { useAds } from "@/lib/ads-store";
import { contribute } from "@/lib/donate";
import { shortAddress } from "@/lib/eth";
import { ROLES } from "@/lib/roles";
import { useSim } from "@/lib/store";
import { TIERS, clampEth, tierFromEth } from "@/lib/tiers";
import { useWallet } from "@/lib/wallet-store";
import { InfoMark } from "./InfoMark";

const MembershipPreview = lazy(() =>
  import("./MembershipPreview").then((m) => ({ default: m.MembershipPreview })),
);

const FALLBACK_FLY = { index: 0, role: ROLES[0], seed: 11.3, name: "Helix" };

export function DonationBar() {
  const open = useSim((s) => s.donationOpen);
  const copied = useSim((s) => s.copied);
  const sendState = useSim((s) => s.sendState);
  const sendError = useSim((s) => s.sendError);
  const amount = useSim((s) => s.donateEth);
  const donateCue = useSim((s) => s.cues.donate);
  const contributed = useSim((s) => s.contributedEth);
  const adOpen = useAds((s) => s.pickerOpen || Boolean(s.selectedSpace));
  const connected = useWallet((s) => s.status === "connected" && Boolean(s.address));
  const tier = tierFromEth(amount);
  const fly = useSim((s) => {
    const id = Object.entries(s.clickCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (id && s.lastByRole[id]) return s.lastByRole[id];
    return FALLBACK_FLY;
  });
  const [custom, setCustom] = useState(String(amount));

  if (adOpen) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ETH_ADDRESS);
    } catch {
      const el = document.createElement("textarea");
      el.value = ETH_ADDRESS;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    useSim.getState().setCopied(true);
    window.setTimeout(() => useSim.getState().setCopied(false), 1400);
  };

  const send = async () => {
    useSim.getState().setSendState("pending");
    try {
      const r = await contribute(amount);
      if (r === "need-wallet") {
        useSim.getState().setSendState("error", "need-wallet");
        return;
      }
      if (r === "copy") {
        await copy();
        useSim.getState().setSendState("error", "copy");
        return;
      }
      useSim.getState().setSendState("idle");
    } catch {
      useSim.getState().setSendState("error", "rejected");
    }
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-50 flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div
        data-no-pinch
        className={
          "pointer-events-auto relative w-full max-w-xl max-h-[min(72dvh,40rem)] overflow-y-auto rounded-xl border border-border bg-surface/85 px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.45)]" +
          (donateCue && !open ? " cue-pulse" : "")
        }
      >
        <div className="absolute -right-1 -top-3 z-10">
          <InfoMark id="donate" />
        </div>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 text-left"
          onClick={() => {
            useAds.getState().closeComposer();
            useSim.getState().setDonationOpen(!open);
          }}
        >
          <span className="min-w-0 truncate font-mono text-[0.7rem] tracking-wide text-muted sm:text-xs">
            <span className="sm:hidden">{shortAddress(ETH_ADDRESS)}</span>
            <span className="hidden sm:inline">{ETH_ADDRESS}</span>
          </span>
          <span className="shrink-0 font-mono text-[0.7rem] text-fg sm:text-xs">
            {contributed > 0 ? `plant ${contributed.toFixed(4)} ETH` : "support the reactor development"}
          </span>
        </button>
        {open ? (
          <form
            className="mt-3 flex flex-col gap-3 border-t border-border pt-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <div className="flex flex-col gap-3">
              <Suspense fallback={<div className="h-36 w-full rounded-lg bg-surface-2 sm:h-44" />}>
                <MembershipPreview
                  key={`${fly.role.id}-${tier.id}-${fly.seed}`}
                  role={fly.role}
                  stage={tier.id}
                  seed={fly.seed}
                  className="h-36 w-full rounded-lg border border-border sm:h-44"
                />
              </Suspense>
              <div className="min-w-0">
                <p className="font-mono text-sm text-fg">
                  {fly.name} · {fly.role.title}
                </p>
                <p className="mt-1 font-mono text-xs text-accent">
                  {tier.label} · {tier.subtitle}
                </p>
                <p className="mt-0.5 font-mono text-[0.65rem] text-subtle">{tier.blurb}</p>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {TIERS.map((t) => {
                const on = t.id === tier.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      useSim.getState().setDonateEth(t.eth);
                      setCustom(String(t.eth));
                    }}
                    className={
                      "flex min-h-11 flex-col items-center justify-center rounded-md px-1 py-2 " +
                      (on ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted")
                    }
                  >
                    <span className="font-mono text-[0.6rem] leading-tight">{t.label}</span>
                    <span className="font-mono text-[0.6rem] opacity-80">{t.eth}</span>
                  </button>
                );
              })}
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[0.65rem] text-subtle">contribution · ETH</span>
              <input
                type="range"
                min={0.01}
                max={1}
                step={0.01}
                value={amount}
                onChange={(e) => {
                  const n = clampEth(Number(e.target.value));
                  useSim.getState().setDonateEth(n);
                  setCustom(String(n));
                }}
                className="w-full accent-accent"
              />
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min={0.01}
                max={1}
                step={0.01}
                value={custom}
                onChange={(e) => {
                  setCustom(e.target.value);
                  const n = Number(e.target.value);
                  if (Number.isFinite(n)) useSim.getState().setDonateEth(clampEth(n));
                }}
                className="h-11 w-24 rounded-md border border-border bg-surface-2 px-2 font-mono text-sm text-fg"
                aria-label="ETH amount"
              />
              <button
                type="button"
                onClick={() => void copy()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-surface-2 px-3 text-fg"
                aria-label="copy address"
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </button>
              <button
                type="submit"
                disabled={sendState === "pending"}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-accent text-sm font-medium text-accent-fg disabled:opacity-60"
              >
                <Wallet className="size-4" />
                {sendState === "pending" ? "…" : connected ? `send ${amount} ETH` : "connect wallet"}
              </button>
            </div>
            {sendError === "rejected" ? (
              <p className="font-mono text-[0.7rem] text-muted">transaction dismissed</p>
            ) : null}
            {sendError === "need-wallet" ? (
              <p className="font-mono text-[0.7rem] text-muted">sign in with a wallet, then send</p>
            ) : null}
            {sendError === "copy" ? (
              <p className="font-mono text-[0.7rem] text-muted">
                address copied · send {amount} ETH then the mint unlocks on-chain
              </p>
            ) : null}
          </form>
        ) : null}
      </div>
    </div>
  );
}
