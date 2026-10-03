import { X } from "lucide-react";
import { FEATURE_BY_ID, type FeatureId } from "@/lib/guide";
import { useSim } from "@/lib/store";
import type { ProjectedAnchor } from "@/components/scene/InfoAnchors";
import { InfoMark } from "./InfoMark";

export function InfoLayer({ anchors }: { anchors: ProjectedAnchor[] }) {
  const infoOn = useSim((s) => s.infoOn);
  const guideStep = useSim((s) => s.guideStep);
  const tipId = useSim((s) => s.tipId);
  const show = infoOn || guideStep !== null;
  if (!show) return null;
  const tip = tipId ? FEATURE_BY_ID[tipId] : null;

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      {anchors.map((a) =>
        a.visible ? (
          <div
            key={a.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: a.x, top: a.y }}
          >
            <InfoMark id={a.id} />
          </div>
        ) : null,
      )}
      {tip && guideStep === null ? <TipCard id={tip.id} /> : null}
    </div>
  );
}

export function TipCard({ id }: { id: FeatureId }) {
  const feat = FEATURE_BY_ID[id];
  const guideStep = useSim((s) => s.guideStep);
  if (guideStep !== null) return null;
  return (
    <div className="pointer-events-auto absolute left-1/2 top-20 z-40 w-[min(22rem,calc(100vw-1.5rem))] -translate-x-1/2 rounded-lg border border-border bg-surface/92 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.45)] sm:left-4 sm:right-auto sm:translate-x-0">
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-xs font-medium tracking-wide text-fg">
          <span className="mr-1.5" aria-hidden>
            {feat.emoji}
          </span>
          {feat.title}
        </p>
        <button
          type="button"
          aria-label="close"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted"
          onClick={() => useSim.getState().openTip(null)}
        >
          <X className="size-4" />
        </button>
      </div>
      <p className="mt-2 text-sm leading-snug text-muted">{feat.body}</p>
      {feat.actions.length ? (
        <ul className="mt-2 space-y-1">
          {feat.actions.map((a) => (
            <li key={a} className="text-sm leading-snug text-fg">
              {a}
            </li>
          ))}
        </ul>
      ) : null}
      {id === "info" ? (
        <button
          type="button"
          className="mt-3 inline-flex h-11 items-center rounded-md bg-surface-2 px-4 text-sm text-fg"
          onClick={() => useSim.getState().startGuide()}
        >
          walk through
        </button>
      ) : null}
    </div>
  );
}
