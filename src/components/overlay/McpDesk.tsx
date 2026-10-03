import { useEffect, useMemo } from "react";
import { Copy, KeyRound, Lock, Plug, Unlock, Wallet, X } from "lucide-react";
import { MCP_TOOLS } from "@/lib/mcp";
import { mcpConfigSnippet, mcpTokenPrefix } from "@/lib/mcp-key";
import { MCP_CAN_PAID, MCP_CAN_READ, MCP_CAN_SIGNED, MCP_CAN_STAKE, SITE_CAN, SITE_TAGLINE } from "@/lib/site-readme";
import { useMcp } from "@/lib/mcp-store";
import { useWallet } from "@/lib/wallet-store";
import { useSim } from "@/lib/store";
import { shortAddress } from "@/lib/eth";
import { InfoMark } from "./InfoMark";

type Tab = "pair" | "tools" | "readme";

function origin(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

function copyText(text: string) {
  void navigator.clipboard?.writeText(text).catch(() => {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    try {
      document.execCommand("copy");
    } catch {
      /* ignore */
    }
    document.body.removeChild(el);
  });
}

function RoleBadge({ role, eligible }: { role: string; eligible: boolean }) {
  const label = eligible ? "stakeholder" : role === "signed" ? "signed in" : "reader";
  return (
    <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-wide text-accent">
      {label}
    </span>
  );
}

function PairTab() {
  const address = useWallet((s) => s.address);
  const connected = useWallet((s) => s.status === "connected" && Boolean(s.address));
  const mcpKey = useWallet((s) => s.mcpKey);
  const mcpRole = useWallet((s) => s.mcpRole);
  const stake = useWallet((s) => s.stake);
  const pairing = useWallet((s) => s.pairing);
  const copied = useMcp((s) => s.copied);
  const host = origin();
  const snippet = useMemo(() => mcpConfigSnippet(host, mcpKey), [host, mcpKey]);
  const readSnippet = useMemo(() => mcpConfigSnippet(host), [host]);

  return (
    <div className="space-y-3">
      <p className="text-sm leading-snug text-muted">
        Anyone can connect and read. Sign in with a wallet to mint a pairing key so your agent votes, buys ads, and manages membership as you.
      </p>

      {!connected ? (
        <button
          type="button"
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-accent text-sm font-medium text-accent-fg"
          onClick={() => useWallet.getState().openModal()}
        >
          <Wallet className="size-4" />
          connect wallet to mint a key
        </button>
      ) : !mcpKey ? (
        <button
          type="button"
          disabled={pairing}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-accent text-sm font-medium text-accent-fg disabled:opacity-60"
          onClick={() => void useWallet.getState().pairMcp(false).catch(() => undefined)}
        >
          <KeyRound className="size-4" />
          {pairing ? "signing…" : "mint pairing key"}
        </button>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-[0.65rem] uppercase tracking-wide text-subtle">your key</p>
            <RoleBadge role={mcpRole} eligible={stake.eligible} />
          </div>
          <p className="font-mono text-[0.65rem] text-muted">
            {address ? shortAddress(address) : ""}
            {stake.eligible ? ` · ${stake.eth} ETH weight` : " · reader until you buy in"}
          </p>
          <pre className="select-all overflow-x-auto rounded-md bg-surface-2 p-3 font-mono text-[0.7rem] leading-snug text-fg">
            {mcpKey}
          </pre>
          <div className="flex gap-2">
            <button
              type="button"
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-accent text-sm font-medium text-accent-fg"
              onClick={() => {
                copyText(mcpKey);
                useMcp.getState().markCopied("key");
              }}
            >
              <Copy className="size-4" />
              {copied === "key" ? "copied" : "copy key"}
            </button>
            <button
              type="button"
              disabled={pairing}
              className="inline-flex h-11 items-center justify-center rounded-md bg-surface-2 px-4 text-sm text-muted disabled:opacity-60"
              onClick={() => void useWallet.getState().pairMcp(true).catch(() => undefined)}
            >
              {pairing ? "…" : "rotate"}
            </button>
          </div>
          <p className="font-mono text-[0.6rem] text-subtle">
            {mcpTokenPrefix(mcpKey)} · paste into Claude, Cursor, or any MCP client
          </p>
        </div>
      )}

      <div>
        <p className="font-mono text-[0.65rem] uppercase tracking-wide text-subtle">client config</p>
        <pre className="mt-1 max-h-40 overflow-auto rounded-md bg-surface-2 p-3 font-mono text-[0.65rem] leading-snug text-fg">
          {mcpKey ? snippet : readSnippet}
        </pre>
        <button
          type="button"
          className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-surface-2 px-4 text-sm text-fg"
          onClick={() => {
            copyText(mcpKey ? snippet : readSnippet);
            useMcp.getState().markCopied("config");
          }}
        >
          <Copy className="size-4" />
          {copied === "config" ? "copied" : "copy config"}
        </button>
      </div>

      {!stake.eligible && connected ? (
        <p className="font-mono text-[0.65rem] leading-snug text-muted">
          Buy a billboard or fund a membership to unlock stakeholder tools (vote, manage ads, notes).
        </p>
      ) : null}
    </div>
  );
}

function ToolsTab() {
  const mcpRole = useWallet((s) => s.mcpRole);
  const stake = useWallet((s) => s.stake);
  const connected = useWallet((s) => s.status === "connected" && Boolean(s.address));
  return (
    <div className="space-y-4">
      <section>
        <p className="flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-wide text-subtle">
          <Unlock className="size-3" /> anyone · read
        </p>
        <ul className="mt-1 space-y-1">
          {MCP_CAN_READ.map((l) => (
            <li key={l} className="text-sm leading-snug text-muted">
              {l}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <p className="flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-wide text-subtle">
          {connected ? <Unlock className="size-3" /> : <Lock className="size-3" />}
          signed in · identity
        </p>
        <ul className="mt-1 space-y-1">
          {MCP_CAN_SIGNED.map((l) => (
            <li key={l} className="text-sm leading-snug text-muted">
              {l}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <p className="flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-wide text-subtle">
          {stake.eligible ? <Unlock className="size-3" /> : <Lock className="size-3" />}
          stakeholder · vote + manage
        </p>
        <ul className="mt-1 space-y-1">
          {MCP_CAN_STAKE.map((l) => (
            <li key={l} className="text-sm leading-snug text-muted">
              {l}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <p className="flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-wide text-subtle">
          paid · x402 USDC
        </p>
        <ul className="mt-1 space-y-1">
          {MCP_CAN_PAID.map((l) => (
            <li key={l} className="text-sm leading-snug text-muted">
              {l}
            </li>
          ))}
        </ul>
      </section>
      <p className="font-mono text-[0.6rem] text-subtle">
        {MCP_TOOLS.length} tools · role {stake.eligible ? "stakeholder" : mcpRole}
      </p>
    </div>
  );
}

function ReadmeTab() {
  return (
    <div className="space-y-3">
      <p className="text-sm leading-snug text-fg">{SITE_TAGLINE}</p>
      <ul className="space-y-3">
        {SITE_CAN.map((c) => (
          <li key={c.title}>
            <p className="font-mono text-sm text-fg">
              <span className="mr-1.5" aria-hidden>
                {c.emoji}
              </span>
              {c.title}
            </p>
            <p className="mt-0.5 text-sm leading-snug text-muted">{c.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function McpDesk() {
  const open = useMcp((s) => s.open);
  const tab = useMcp((s) => s.tab);
  const worldReady = useSim((s) => s.worldReady);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") useMcp.getState().setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open || !worldReady) return null;

  const tabs: { id: Tab; label: string }[] = [
    { id: "readme", label: "what you can do" },
    { id: "pair", label: "pair" },
    { id: "tools", label: "tools" },
  ];

  return (
    <div className="pointer-events-none fixed inset-0 z-[80] flex items-end justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center">
      <button
        type="button"
        aria-label="close mcp"
        className="pointer-events-auto absolute inset-0 bg-bg/55"
        onClick={() => useMcp.getState().setOpen(false)}
      />
      <div
        data-no-pinch
        role="dialog"
        aria-label="MCP desk"
        className="pointer-events-auto relative flex max-h-[min(36rem,82dvh)] w-full max-w-md flex-col rounded-xl border border-border bg-surface p-4 shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
      >
        <button
          type="button"
          aria-label="close"
          className="absolute right-2 top-2 inline-flex size-11 items-center justify-center rounded-full text-muted"
          onClick={() => useMcp.getState().setOpen(false)}
        >
          <X className="size-4" />
        </button>
        <div className="flex items-start gap-2 pr-10">
          <Plug className="mt-0.5 size-4 text-accent" />
          <div>
            <p className="font-mono text-xs tracking-wide text-fg">MCP desk</p>
            <p className="mt-0.5 font-mono text-[0.65rem] text-subtle">connect · read · vote · manage</p>
          </div>
        </div>
        <div className="mt-3 flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={tab === t.id}
              className={
                "inline-flex h-9 items-center rounded-md px-3 font-mono text-[0.65rem] uppercase tracking-wide " +
                (tab === t.id ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted")
              }
              onClick={() => useMcp.getState().setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
          {tab === "pair" ? <PairTab /> : tab === "tools" ? <ToolsTab /> : <ReadmeTab />}
        </div>
      </div>
    </div>
  );
}

export function McpChip() {
  const cues = useSim((s) => s.cues);
  const open = useMcp((s) => s.open);
  const connected = useWallet((s) => s.status === "connected" && Boolean(s.address));
  const mcpKey = useWallet((s) => s.mcpKey);
  return (
    <div className="relative">
      <button
        type="button"
        aria-label="MCP desk"
        aria-pressed={open}
        className={
          "pointer-events-auto inline-flex size-11 items-center justify-center rounded-full border border-border " +
          (open ? "bg-accent text-accent-fg" : "bg-surface-2 text-fg") +
          (cues.mcp && !open ? " cue-pulse cue-pop" : "")
        }
        onClick={() => {
          useSim.getState().markCue("mcp");
          useSim.getState().select(null);
          useSim.getState().setDonationOpen(false);
          const next = !useMcp.getState().open;
          useMcp.getState().setOpen(next);
          if (next && connected && !mcpKey) useMcp.getState().setTab("pair");
        }}
      >
        <Plug className="size-4" />
      </button>
      <div className="absolute -right-2 -top-2">
        <InfoMark id="mcp" />
      </div>
    </div>
  );
}
