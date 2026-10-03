import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Cpu,
  Factory,
  MapPin,
  Scissors,
  Search,
  Shirt,
  Vote,
  GitPullRequest,
  Wrench,
  X,
} from "lucide-react";
import { formatRemain, kindLabel, type CiItemView, type CiKind, type CiOptionView, type CiPr } from "@/lib/ci";
import { useCi } from "@/lib/ci-store";
import { useSim } from "@/lib/store";
import { useWallet } from "@/lib/wallet-store";
import { shortAddress } from "@/lib/eth";
import { InfoMark } from "./InfoMark";
import { NotifyBell } from "./NotifyStack";

function KindIcon({ kind }: { kind: CiKind }) {
  const cls = "size-3.5 shrink-0 text-muted";
  switch (kind) {
    case "reactor":
      return <Factory className={cls} />;
    case "workplace":
      return <Wrench className={cls} />;
    case "outfit":
      return <Shirt className={cls} />;
    case "body":
      return <Cpu className={cls} />;
    case "location":
      return <MapPin className={cls} />;
    case "retire":
      return <Scissors className={cls} />;
  }
}

function StakeNote() {
  const stake = useCi((s) => s.desk?.stake);
  const connected = useWallet((s) => s.status === "connected" && Boolean(s.address));
  const address = useWallet((s) => s.address);
  if (!connected || !address) {
    return (
      <p className="font-mono text-[0.65rem] leading-snug text-muted">
        Connect a wallet. Membership or a board buys weight.
      </p>
    );
  }
  if (!stake?.eligible) {
    return (
      <p className="font-mono text-[0.65rem] leading-snug text-muted">
        {shortAddress(address)} has no stake yet. Buy a board or fund a rank.
      </p>
    );
  }
  return (
    <p className="font-mono text-[0.65rem] leading-snug text-fg">
      {shortAddress(address)} · {stake.eth} ETH weight
      <span className="text-subtle">
        {" "}
        ({stake.membership} membership · {stake.ads} boards)
      </span>
    </p>
  );
}

function PrLine({ pr }: { pr: CiPr | null }) {
  if (!pr) return null;
  const label = pr.number ? `PR #${pr.number}` : pr.branch.replace(/^proposal\//, "");
  const state = pr.state === "queued" ? "opening" : pr.state;
  const cls = "mt-2 flex h-11 items-center gap-2 rounded-md border border-border px-3 font-mono text-xs text-fg";
  const inner = (
    <>
      <GitPullRequest className="size-3.5 shrink-0 text-accent" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="shrink-0 text-subtle">{state}</span>
    </>
  );
  if (pr.url) {
    return (
      <a href={pr.url} target="_blank" rel="noreferrer" className={cls}>
        {inner}
      </a>
    );
  }
  return <p className={cls}>{inner}</p>;
}

function OptionCard({
  opt,
  maxStake,
  maxFly,
  mine,
  canVote,
  onVote,
}: {
  opt: CiOptionView;
  maxStake: number;
  maxFly: number;
  mine: boolean;
  canVote: boolean;
  onVote: () => void;
}) {
  const flyPct = maxFly > 0 ? Math.round((opt.flyVotes / maxFly) * 100) : 0;
  const stakePct = maxStake > 0 ? Math.round((opt.stakeEth / maxStake) * 100) : 0;
  return (
    <article className={"rounded-md border p-3 " + (mine ? "border-accent bg-surface-2" : "border-border bg-surface")}>
      <div className="flex items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-wide text-muted">
          <KindIcon kind={opt.kind} />
          <span>{kindLabel(opt.kind)}</span>
          <span className="truncate text-subtle">· {opt.sponsor}</span>
        </p>
        {mine ? <span className="font-mono text-[0.6rem] uppercase tracking-wide text-accent">your stake</span> : null}
      </div>
      <p className="mt-1 font-mono text-sm text-fg">{opt.title}</p>
      <p className="mt-1 text-sm leading-snug text-muted">{opt.body}</p>
      <PrLine pr={opt.pr} />
      {opt.flies?.length ? (
        <p className="mt-2 truncate font-mono text-[0.6rem] text-subtle">
          {opt.flies.slice(0, 6).join(" · ")}
          {opt.flies.length > 6 ? ` +${opt.flies.length - 6}` : ""}
        </p>
      ) : null}
      <div className="mt-3 space-y-1.5">
        <div>
          <p className="flex justify-between font-mono text-[0.6rem] uppercase tracking-wide text-subtle">
            <span>flies</span>
            <span className="tabular-nums">{opt.flyVotes}</span>
          </p>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full bg-muted" style={{ width: `${flyPct}%` }} />
          </div>
        </div>
        <div>
          <p className="flex justify-between font-mono text-[0.6rem] uppercase tracking-wide text-subtle">
            <span>stake</span>
            <span className="tabular-nums">{opt.stakeEth} ETH · {opt.voterCount}</span>
          </p>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full bg-accent" style={{ width: `${stakePct}%` }} />
          </div>
        </div>
      </div>
      {canVote ? (
        <button
          type="button"
          className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-md bg-accent text-sm font-medium text-accent-fg"
          onClick={onVote}
        >
          stake this
        </button>
      ) : null}
    </article>
  );
}

function ItemCard({ item, onOpen }: { item: CiItemView; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full gap-3 rounded-md border border-border bg-surface p-3 text-left"
    >
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt=""
          className="size-16 shrink-0 rounded-md border border-border object-cover"
          crossOrigin="anonymous"
        />
      ) : (
        <div className="flex size-16 shrink-0 items-center justify-center rounded-md border border-border bg-surface-2">
          <KindIcon kind={item.kind} />
        </div>
      )}
      <span className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-wide text-muted">
          <KindIcon kind={item.kind} />
          {kindLabel(item.kind)}
          {item.installedAt ? <span className="text-accent">· seated</span> : <span className="text-subtle">· packing</span>}
          {item.pr?.state === "merged" ? <span className="text-accent">· on main</span> : null}
        </p>
        <p className="mt-1 font-mono text-sm text-fg">{item.title}</p>
        <p className="mt-1 line-clamp-2 text-sm leading-snug text-muted">{item.body}</p>
      </span>
    </button>
  );
}

function ItemDetail({ item, onClose }: { item: CiItemView; onClose: () => void }) {
  const messages = useCi((s) => s.desk?.messages ?? []);
  const thread = messages.filter((m) => m.cycleId === item.cycleId || m.itemId === item.id);
  const materials = item.materials;
  const steps = item.steps;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-wide text-subtle">
            <KindIcon kind={item.kind} />
            {kindLabel(item.kind)}
          </p>
          <p className="mt-1 font-mono text-sm text-fg">{item.title}</p>
        </div>
        <button type="button" aria-label="back" className="inline-flex size-11 items-center justify-center rounded-md text-fg" onClick={onClose}>
          <X className="size-4" />
        </button>
      </div>
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt=""
          className="mt-3 aspect-[4/3] w-full rounded-md border border-border object-cover"
          crossOrigin="anonymous"
        />
      ) : (
        <div className="mt-3 flex aspect-[4/3] items-center justify-center rounded-md border border-border bg-surface-2">
          <Box className="size-8 text-subtle" />
        </div>
      )}
      <p className="mt-3 text-sm leading-snug text-muted">{item.body}</p>
      {item.upsample ? (
        <div className="mt-3">
          <p className="font-mono text-[0.6rem] uppercase tracking-wide text-subtle">built out</p>
          <p className="mt-1 text-sm leading-snug text-fg">{item.upsample.summary}</p>
          {item.upsample.adds.length ? (
            <ul className="mt-2 space-y-1">
              {item.upsample.adds.map((m) => (
                <li key={m} className="font-mono text-xs text-fg">
                  add · {m}
                </li>
              ))}
            </ul>
          ) : null}
          {item.upsample.modifies.length ? (
            <ul className="mt-2 space-y-1">
              {item.upsample.modifies.map((m) => (
                <li key={m} className="font-mono text-xs text-muted">
                  change · {m}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      <PrLine pr={item.pr} />
      {materials.length ? (
        <ul className="mt-3 space-y-1">
          {materials.map((m) => (
            <li key={m} className="font-mono text-xs text-fg">
              {m}
            </li>
          ))}
        </ul>
      ) : null}
      {steps.length ? (
        <ol className="mt-3 list-decimal space-y-1 pl-4">
          {steps.map((m) => (
            <li key={m} className="text-sm leading-snug text-muted">
              {m}
            </li>
          ))}
        </ol>
      ) : null}
      <p className="mt-3 font-mono text-[0.65rem] leading-snug text-subtle">
        {item.model || "seed"} · ${item.costUsd.toFixed(4)} inference
        {item.metaCid ? ` · ipfs ${item.metaCid.slice(0, 10)}…` : ""}
      </p>
      {item.metaUrl ? (
        <a href={item.metaUrl} target="_blank" rel="noreferrer" className="mt-1 font-mono text-[0.65rem] text-accent">
          open packet
        </a>
      ) : null}
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto border-t border-border pt-3">
        <p className="font-mono text-[0.6rem] uppercase tracking-wide text-subtle">shift talk</p>
        {thread.length === 0 ? (
          <p className="mt-2 font-mono text-xs text-subtle">quiet on this pack</p>
        ) : (
          thread.map((m) => (
            <p key={m.id} className="mt-2 text-sm leading-snug text-fg">
              <span className="font-mono text-[0.65rem] text-muted">{m.actor} · </span>
              {m.body}
            </p>
          ))
        )}
      </div>
    </div>
  );
}

export function CiDesk() {
  const worldReady = useSim((s) => s.worldReady);
  const open = useCi((s) => s.open);
  const tab = useCi((s) => s.tab);
  const desk = useCi((s) => s.desk);
  const remainMs = useCi((s) => s.remainMs);
  const delivery = useCi((s) => s.delivery);
  const voting = useCi((s) => s.voting);
  const error = useCi((s) => s.error);
  const detail = useCi((s) => s.detailItem);
  const query = useCi((s) => s.query);
  const hits = useCi((s) => s.hits);
  const connected = useWallet((s) => s.status === "connected" && Boolean(s.address));
  const [q, setQ] = useState("");

  useEffect(() => {
    void useCi.getState().hydrate();
  }, []);

  const options = desk?.options ?? [];
  const maxStake = Math.max(0.001, ...options.map((o) => o.stakeEth));
  const maxFly = Math.max(1, ...options.map((o) => o.flyVotes));
  const canVote = Boolean(desk?.cycle && desk.cycle.status === "open" && desk.stake.eligible && !voting);
  const live = desk?.cycle?.status === "open";

  const errCopy = useMemo(() => {
    if (error === "wallet") return "Connect a wallet to stake.";
    if (error === "stake") return "Need a membership or a published board.";
    if (error === "sig") return "Signature did not match that account.";
    if (error === "vote") return "Vote did not land. Try again.";
    if (error === "closed") return "Window closed. Tally is running.";
    return null;
  }, [error]);

  if (!worldReady && !open) return null;

  return (
    <>
      <div className="pointer-events-none absolute left-3 top-[5.25rem] z-30 flex items-start gap-2">
        <button
          type="button"
          aria-label="crew vote"
          aria-pressed={open}
          className={
            "pointer-events-auto inline-flex h-11 items-center gap-2 rounded-full border border-border px-3 " +
            (open || live ? "bg-accent text-accent-fg" : "bg-surface-2 text-fg")
          }
          onClick={() => {
            useSim.getState().select(null);
            useSim.getState().setDonationOpen(false);
            useCi.getState().setOpen(!open);
          }}
        >
          <Vote className="size-4" />
          <span className="font-mono text-[0.7rem] tabular-nums">
            {live ? formatRemain(remainMs) : "CI"}
          </span>
        </button>
        <NotifyBell />
        {delivery ? (
          <span className="pointer-events-auto hidden h-11 max-w-[12rem] items-center truncate rounded-full border border-border bg-surface-2 px-3 font-mono text-[0.65rem] text-fg sm:inline-flex">
            air-mail · {delivery.title}
          </span>
        ) : null}
        <div className="absolute -right-2 -top-2">
          <InfoMark id="ci" />
        </div>
      </div>

      {open ? (
        <div className="pointer-events-none absolute inset-0 z-[55] flex items-end justify-center p-3 pb-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] sm:items-center sm:pb-8">
          <div
            data-no-pinch
            className="pointer-events-auto flex h-[min(82dvh,42rem)] w-full max-w-lg flex-col rounded-xl border border-border bg-surface p-3 shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono text-[0.65rem] uppercase tracking-wide text-subtle">daily CI</p>
                <p className="font-mono text-sm text-fg">
                  {desk?.cycle ? `${desk.cycle.dayKey} · ${desk.cycle.status}` : "opening ballot"}
                </p>
                <p className="font-mono text-[0.65rem] text-muted">proposals are pull requests · winner merges to main</p>
              </div>
              <button
                type="button"
                aria-label="close vote"
                className="inline-flex size-11 items-center justify-center rounded-md text-fg"
                onClick={() => useCi.getState().setOpen(false)}
              >
                <X className="size-4" />
              </button>
            </div>
            <StakeNote />
            {live ? (
              <p className="mt-1 font-mono text-[0.65rem] tabular-nums text-accent">{formatRemain(remainMs)} left</p>
            ) : null}
            {errCopy ? <p className="mt-2 font-mono text-xs text-fly">{errCopy}</p> : null}

            {detail ? (
              <div className="mt-3 min-h-0 flex-1 overflow-hidden">
                <ItemDetail item={detail} onClose={() => useCi.getState().setDetail(null)} />
              </div>
            ) : (
              <>
                <div className="mt-3 flex gap-1">
                  {(["ballot", "installed", "history"] as const).map((t) => {
                    const on = tab === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={on}
                        className={
                          "inline-flex h-11 flex-1 items-center justify-center rounded-md font-mono text-[0.7rem] " +
                          (on ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted")
                        }
                        onClick={() => useCi.getState().setTab(t)}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
                  {tab === "ballot" ? (
                    <div className="space-y-3">
                      {options.length === 0 ? (
                        <p className="py-10 text-center font-mono text-xs text-subtle">crew is writing the ballot</p>
                      ) : (
                        options.map((opt) => (
                          <OptionCard
                            key={opt.id}
                            opt={opt}
                            maxStake={maxStake}
                            maxFly={maxFly}
                            mine={desk?.myVote?.optionId === opt.id}
                            canVote={canVote}
                            onVote={() => {
                              if (!connected) {
                                useWallet.getState().openModal();
                                return;
                              }
                              void useCi.getState().vote(opt.id);
                            }}
                          />
                        ))
                      )}
                      {(desk?.messages ?? []).filter((m) => m.cycleId === desk?.cycle?.id).length ? (
                        <div className="rounded-md border border-border bg-surface-2 p-3">
                          <p className="font-mono text-[0.6rem] uppercase tracking-wide text-subtle">shift talk</p>
                          {(desk?.messages ?? [])
                            .filter((m) => m.cycleId === desk?.cycle?.id)
                            .slice(0, 8)
                            .map((m) => (
                              <p key={m.id} className="mt-2 text-sm leading-snug text-fg">
                                <span className="font-mono text-[0.65rem] text-muted">{m.actor} · </span>
                                {m.body}
                              </p>
                            ))}
                        </div>
                      ) : null}
                      <p className="pb-2 font-mono text-[0.6rem] leading-snug text-subtle">
                        Each proposal is a pull request. Contributors stake ETH. After six hours Venice builds the winner out — extra parts, and a change to something already in the hall — and that pull request merges to main. Losing proposals close. $
                        {(desk?.budget.spentUsd ?? 0).toFixed(3)} of ${desk?.budget.capUsd ?? 1} inference today.
                      </p>
                    </div>
                  ) : null}

                  {tab === "installed" ? (
                    <div className="space-y-3">
                      {(desk?.items ?? []).length === 0 ? (
                        <p className="py-10 text-center font-mono text-xs text-subtle">nothing seated yet</p>
                      ) : (
                        (desk?.items ?? []).map((item) => (
                          <ItemCard key={item.id} item={item} onOpen={() => useCi.getState().setDetail(item)} />
                        ))
                      )}
                    </div>
                  ) : null}

                  {tab === "history" ? (
                    <div className="space-y-3">
                      <label className="flex h-11 items-center gap-2 rounded-md border border-border bg-surface-2 px-3">
                        <Search className="size-4 text-muted" />
                        <input
                          value={q}
                          onChange={(e) => {
                            setQ(e.target.value);
                            void useCi.getState().search(e.target.value);
                          }}
                          placeholder="search packets and talk"
                          className="min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-subtle"
                        />
                      </label>
                      {query.trim().length >= 2 && hits ? (
                        <>
                          {hits.items.map((item) => (
                            <ItemCard key={`h-${item.id}`} item={item} onOpen={() => useCi.getState().setDetail(item)} />
                          ))}
                          {hits.messages.map((m) => (
                            <p key={m.id} className="text-sm leading-snug text-fg">
                              <span className="font-mono text-[0.65rem] text-muted">{m.actor} · </span>
                              {m.body}
                            </p>
                          ))}
                          {hits.items.length === 0 && hits.messages.length === 0 ? (
                            <p className="py-6 text-center font-mono text-xs text-subtle">no match in hive memory</p>
                          ) : null}
                        </>
                      ) : (
                        (desk?.history ?? []).map((c) => {
                          const item = desk?.items.find((i) => i.id === c.itemId);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              className="w-full rounded-md border border-border bg-surface p-3 text-left"
                              onClick={() => item && useCi.getState().setDetail(item)}
                            >
                              <p className="font-mono text-[0.65rem] uppercase tracking-wide text-subtle">
                                {c.dayKey} · {c.status}
                              </p>
                              <p className="mt-1 font-mono text-sm text-fg">{item?.title ?? (c.brief || "cycle")}</p>
                              {c.tallyUrl ? (
                                <a
                                  href={c.tallyUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-1 inline-block font-mono text-[0.6rem] text-accent"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  tally {c.tallyCid?.slice(0, 12)}…
                                </a>
                              ) : c.tallyCid ? (
                                <p className="mt-1 font-mono text-[0.6rem] text-muted">tally {c.tallyCid.slice(0, 12)}…</p>
                              ) : (
                                <p className="mt-1 line-clamp-2 text-sm leading-snug text-muted">{c.brief}</p>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
