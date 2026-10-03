import { useEffect } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronLeft,
  ChevronRight,
  Footprints,
  Hammer,
  MessageSquare,
  ScrollText,
  User,
  X,
} from "lucide-react";
import { flowLabel, kindLabel, type HiveEvent, type HiveKind } from "@/lib/hive";
import { useHive, visibleEvents } from "@/lib/hive-store";
import { useSim } from "@/lib/store";
import { InfoMark } from "./InfoMark";

const FILTERS: { id: "all" | HiveKind; label: string }[] = [
  { id: "all", label: "all" },
  { id: "construction", label: "build" },
  { id: "discussion", label: "talk" },
  { id: "movement", label: "move" },
  { id: "user", label: "you" },
  { id: "consensus", label: "agreed" },
];

function KindIcon({ kind }: { kind: HiveKind }) {
  const cls = "size-3.5 shrink-0 text-muted";
  switch (kind) {
    case "construction":
      return <Hammer className={cls} />;
    case "discussion":
      return <MessageSquare className={cls} />;
    case "movement":
      return <Footprints className={cls} />;
    case "user":
      return <User className={cls} />;
    case "query":
      return <ArrowUpFromLine className={cls} />;
    case "consensus":
      return <ScrollText className={cls} />;
  }
}

function FlowMark({ flow }: { flow: HiveEvent["flow"] }) {
  return flow === "in" ? (
    <span className="inline-flex items-center gap-1 font-mono text-[0.6rem] uppercase tracking-wide text-subtle">
      <ArrowDownToLine className="size-3" />
      {flowLabel(flow)}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 font-mono text-[0.6rem] uppercase tracking-wide text-accent">
      <ArrowUpFromLine className="size-3" />
      {flowLabel(flow)}
    </span>
  );
}

function EventRow({ e, compact = false }: { e: HiveEvent; compact?: boolean }) {
  return (
    <article className={compact ? "min-w-0" : "border-b border-border py-2 last:border-b-0"}>
      <div className="flex items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-wide text-muted">
          <KindIcon kind={e.kind} />
          <span className="truncate">{kindLabel(e.kind)}</span>
          <span className="truncate text-subtle">· {e.actor}</span>
        </p>
        <FlowMark flow={e.flow} />
      </div>
      <p className="mt-1 font-mono text-xs leading-snug text-fg">{e.title}</p>
      <p className={"mt-0.5 text-sm leading-snug text-muted " + (compact ? "line-clamp-3" : "line-clamp-4")}>{e.body}</p>
    </article>
  );
}

function RailHeader({ onMore }: { onMore: () => void }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="font-mono text-[0.65rem] uppercase tracking-wide text-subtle">hall log</p>
        <p className="font-mono text-xs text-fg">latest activity</p>
      </div>
      <div className="flex items-center gap-1">
        <InfoMark id="hive" />
        <button
          type="button"
          aria-label="see more"
          className="inline-flex h-11 items-center rounded-md px-2 font-mono text-[0.7rem] text-muted"
          onClick={onMore}
        >
          see more
        </button>
      </div>
    </div>
  );
}

export function HiveFeed() {
  const worldReady = useSim((s) => s.worldReady);
  const events = useHive((s) => s.events);
  const filter = useHive((s) => s.filter);
  const logOpen = useHive((s) => s.logOpen);
  const mobileIndex = useHive((s) => s.mobileIndex);
  const selected = useSim((s) => s.selected);
  const list = visibleEvents(events, "all").slice(0, 8);
  const mobileList = visibleEvents(events, filter);
  const card = mobileList[mobileIndex] ?? mobileList[0] ?? list[0];

  useEffect(() => {
    if (logOpen) return;
    const id = window.setInterval(() => useHive.getState().cycleMobile(1), 5200);
    return () => window.clearInterval(id);
  }, [logOpen]);

  if (!worldReady && !logOpen) return null;

  return (
    <>
      <aside
        data-no-pinch
        className={
          "pointer-events-auto absolute right-3 top-[5.25rem] z-30 hidden w-[min(18.5rem,calc(100vw-1.5rem))] flex-col rounded-xl border border-border bg-surface/92 p-3 shadow-[0_16px_40px_rgba(0,0,0,0.4)] sm:flex " +
          (selected ? "max-h-[min(22rem,calc(100dvh-14rem))]" : "max-h-[min(28rem,calc(100dvh-10rem))]")
        }
      >
        <RailHeader onMore={() => useHive.getState().openLog()} />
        <div className="mt-2 min-h-0 flex-1 overflow-y-auto pr-1">
          {list.length === 0 ? (
            <p className="py-6 font-mono text-xs text-subtle">waiting on the hive</p>
          ) : (
            list.map((e) => <EventRow key={e.id} e={e} />)
          )}
        </div>
      </aside>

      <aside
        data-no-pinch
        className={
          "pointer-events-auto absolute right-2 top-[5.25rem] z-30 w-[min(16.5rem,calc(100vw-1rem))] rounded-xl border border-border bg-surface/92 p-3 shadow-[0_16px_40px_rgba(0,0,0,0.4)] sm:hidden " +
          (selected ? "hidden" : "")
        }
      >
        <RailHeader onMore={() => useHive.getState().openLog()} />
        {card ? (
          <div className="mt-2">
            <EventRow e={card} compact />
            <div className="mt-2 flex items-center justify-between">
              <button
                type="button"
                aria-label="previous activity"
                className="inline-flex size-11 items-center justify-center rounded-md text-fg"
                onClick={() => useHive.getState().cycleMobile(-1)}
              >
                <ChevronLeft className="size-4" />
              </button>
              <p className="font-mono text-[0.65rem] tabular-nums text-subtle">
                {Math.min(mobileIndex, Math.max(mobileList.length - 1, 0)) + 1} / {Math.max(mobileList.length, 1)}
              </p>
              <button
                type="button"
                aria-label="next activity"
                className="inline-flex size-11 items-center justify-center rounded-md text-fg"
                onClick={() => useHive.getState().cycleMobile(1)}
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-3 font-mono text-xs text-subtle">waiting on the hive</p>
        )}
      </aside>

      {logOpen ? <HiveLogView /> : null}
    </>
  );
}

function HiveLogView() {
  const events = useHive((s) => s.events);
  const memories = useHive((s) => s.memories);
  const filter = useHive((s) => s.filter);
  const list = visibleEvents(events, filter);

  return (
    <div className="pointer-events-none absolute inset-0 z-[55] flex items-end justify-center p-3 pb-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] sm:items-center sm:pb-8">
      <div
        data-no-pinch
        className="pointer-events-auto flex h-[min(78dvh,40rem)] w-full max-w-lg flex-col rounded-xl border border-border bg-surface p-3 shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-mono text-[0.65rem] uppercase tracking-wide text-subtle">hive memory</p>
            <p className="font-mono text-sm text-fg">construction, talk, you</p>
          </div>
          <button
            type="button"
            aria-label="close log"
            className="inline-flex size-11 items-center justify-center rounded-md text-fg"
            onClick={() => useHive.getState().closeLog()}
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
          {FILTERS.map((f) => {
            const on = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={on}
                className={
                  "inline-flex h-11 shrink-0 items-center rounded-md px-3 font-mono text-[0.7rem] " +
                  (on ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted")
                }
                onClick={() => useHive.getState().setFilter(f.id)}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        {memories.length > 0 ? (
          <div className="mt-3 rounded-md border border-border bg-surface-2 px-3 py-2">
            <p className="font-mono text-[0.6rem] uppercase tracking-wide text-subtle">canon · three agreed</p>
            <ul className="mt-1 space-y-1">
              {memories.slice(0, 4).map((m) => (
                <li key={m.id} className="text-sm leading-snug text-fg">
                  {m.fact}
                  <span className="ml-2 font-mono text-[0.6rem] text-subtle">{m.support}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="mt-2 min-h-0 flex-1 overflow-y-auto pr-1">
          {list.length === 0 ? (
            <p className="py-8 text-center font-mono text-xs text-subtle">nothing in this filter yet</p>
          ) : (
            list.map((e) => <EventRow key={e.id} e={e} />)
          )}
        </div>
      </div>
    </div>
  );
}
