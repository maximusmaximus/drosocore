import { roleById } from "@/lib/roles";
import { TOUR, tourFeature } from "@/lib/guide";
import { useSim } from "@/lib/store";
import { useMcp } from "@/lib/mcp-store";
import { FlyPortrait } from "@/components/scene/FlyPortrait";

export function Walkthrough() {
  const step = useSim((s) => s.guideStep);
  const mcpOpen = useMcp((s) => s.open);
  if (step === null || mcpOpen) return null;
  const feat = tourFeature(step);
  if (!feat) return null;
  const last = step >= TOUR.length - 1;
  const role = roleById("inspector");

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[60] flex justify-center p-3 pb-[max(6.5rem,calc(env(safe-area-inset-bottom)+5.5rem))]">
      <div data-no-pinch className="pointer-events-auto flex w-full max-w-lg items-stretch gap-3 rounded-xl border border-border bg-surface/92 p-3 shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
        <div className="orbit-frame hidden size-20 shrink-0 overflow-hidden rounded-full border border-border bg-surface-2 sm:block">
          <FlyPortrait role={role} stage="imago" seed={77.7} spin={0.7} className="size-full" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[0.65rem] tracking-wide text-subtle">
            {step + 1} / {TOUR.length}
          </p>
          <p className="mt-1 font-mono text-sm font-medium text-fg">
            <span className="mr-1.5" aria-hidden>
              {feat.emoji}
            </span>
            {feat.title}
          </p>
          <p className="mt-1 font-mono text-xs text-accent">{feat.flyLine}</p>
          <div className="mt-1.5 max-h-[min(40dvh,16rem)] overflow-y-auto pr-1">
            <p className="text-sm leading-snug text-fg">{feat.body}</p>
            {feat.actions.length ? (
              <ul className="mt-2 space-y-1">
                {feat.actions.map((a) => (
                  <li key={a} className="text-sm leading-snug text-muted">
                    {a}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="inline-flex h-11 flex-1 items-center justify-center rounded-md bg-accent text-sm font-medium text-accent-fg"
              onClick={() => useSim.getState().nextGuide()}
            >
              {last ? "done" : "next"}
            </button>
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center rounded-md bg-surface-2 px-4 text-sm text-muted"
              onClick={() => useSim.getState().skipGuide()}
            >
              skip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
