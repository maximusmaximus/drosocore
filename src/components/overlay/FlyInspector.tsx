import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { ConnectomeView, RegionMap } from "./Connectome";
import { FlyPortrait } from "@/components/scene/FlyPortrait";
import { BRAIN_REGIONS, CNS_CITATION, fnLabel, REGION_BY_ID, type FlyBrain } from "@/lib/fly-brain";
import { peekFly } from "@/lib/fly-live";
import { useSim } from "@/lib/store";

function useLiveBrain(index: number): FlyBrain | null {
  const [brain, setBrain] = useState<FlyBrain | null>(() => peekFly(index)?.brain ?? null);
  useEffect(() => {
    setBrain(peekFly(index)?.brain ?? null);
    const id = window.setInterval(() => {
      const next = peekFly(index)?.brain ?? null;
      setBrain(next ? { ...next, act: { ...next.act }, lastFns: next.lastFns.slice(), motor: { ...next.motor } } : null);
    }, 140);
    return () => window.clearInterval(id);
  }, [index]);
  return brain;
}

function Dossier({ brain, roleTitle }: { brain: FlyBrain | null; roleTitle: string }) {
  const used = brain?.lastFns[0]?.regions ?? [];
  const traces = brain?.lastFns.slice(0, 6) ?? [];
  const skill = brain?.skill ?? 0;
  return (
    <div className="grid w-[min(92vw,28rem)] grid-cols-[7.5rem_minmax(0,1fr)] gap-3 rounded-xl border border-border bg-surface p-3 sm:w-[min(40vw,22rem)] sm:grid-cols-1">
      <div className="h-[7.5rem] overflow-hidden rounded-md border border-border bg-bg sm:h-28">
        <RegionMap act={brain?.act ?? null} used={used} />
      </div>
      <div className="min-w-0">
        <p className="font-mono text-[0.65rem] uppercase tracking-wide text-muted">job skill</p>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round(skill * 100)}%` }} />
        </div>
        <p className="mt-1 font-mono text-[0.65rem] text-muted">
          {Math.round(skill * 100)}% trained · {brain?.jobsDone ?? 0} jobs · {brain?.talksDone ?? 0} talks · {roleTitle}
        </p>
        <p className="mt-2 font-mono text-[0.65rem] uppercase tracking-wide text-muted">last functions</p>
        <ul className="mt-1 space-y-0.5">
          {traces.length === 0 ? (
            <li className="font-mono text-[0.7rem] text-subtle">awaiting spike</li>
          ) : (
            traces.map((t, i) => (
              <li key={`${t.fn}-${t.t}-${i}`} className="flex items-baseline justify-between gap-2 font-mono text-[0.7rem]">
                <span className="truncate text-fg">{fnLabel(t.fn)}</span>
                <span className="truncate text-right text-[0.6rem] text-muted">
                  {t.regions.map((id) => REGION_BY_ID[id].neuropil).join(" · ")}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
      <p className="col-span-full truncate font-mono text-[0.55rem] text-subtle">{CNS_CITATION}</p>
    </div>
  );
}

export function FlyInspector() {
  const selected = useSim((s) => s.selected);
  const brain = useLiveBrain(selected?.index ?? -1);
  if (!selected) return null;
  const trained = BRAIN_REGIONS.filter((r) => (brain?.act[r.id] ?? 0) > 0.45)
    .slice(0, 3)
    .map((r) => r.name);

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-end justify-center p-3 pb-[max(6.5rem,calc(env(safe-area-inset-bottom)+5.5rem))] sm:items-end sm:pb-24">
      <div data-no-pinch className="pointer-events-auto relative flex max-w-full flex-col items-center gap-2 sm:flex-row sm:items-end sm:gap-4">
        <button
          type="button"
          aria-label="close"
          className="absolute -top-3 right-0 z-10 inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface text-fg"
          onClick={() => useSim.getState().select(null)}
        >
          <X className="size-4" />
        </button>
        <div className="flex items-end gap-2 sm:gap-5">
          <div className="flex flex-col items-center gap-2">
            <div className="orbit-frame size-[min(34vw,13rem)] overflow-hidden rounded-full border border-border bg-surface shadow-[0_20px_60px_rgba(0,0,0,0.55)] sm:size-[min(40vw,16rem)]">
              <FlyPortrait
                key={`${selected.index}-${selected.role.id}`}
                role={selected.role}
                stage="imago"
                seed={selected.seed}
                spin={0.85}
                className="size-full"
              />
            </div>
            <div className="max-w-[11rem] text-center">
              <p className="font-mono text-xs font-medium text-fg sm:text-sm">{selected.name}</p>
              <p className="font-mono text-[0.65rem] text-muted sm:text-xs">{selected.role.title}</p>
              {trained.length > 0 ? (
                <p className="mt-0.5 font-mono text-[0.6rem] text-subtle">{trained.join(" · ")}</p>
              ) : null}
            </div>
          </div>
          <div className="orbit-frame size-[min(34vw,13rem)] overflow-hidden rounded-full border border-border bg-surface shadow-[0_20px_60px_rgba(0,0,0,0.55)] sm:size-[min(40vw,16rem)]">
            <ConnectomeView seed={selected.seed} index={selected.index} className="size-full" />
          </div>
        </div>
        <Dossier brain={brain} roleTitle={selected.role.tool} />
      </div>
    </div>
  );
}
