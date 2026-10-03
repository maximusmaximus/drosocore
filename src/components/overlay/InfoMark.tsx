import { Info } from "lucide-react";
import { FEATURE_BY_ID, type FeatureId } from "@/lib/guide";
import { useSim } from "@/lib/store";

export function InfoMark({
  id,
  className = "",
}: {
  id: FeatureId;
  className?: string;
}) {
  const infoOn = useSim((s) => s.infoOn);
  const guideStep = useSim((s) => s.guideStep);
  const tipId = useSim((s) => s.tipId);
  if (!infoOn && guideStep === null) return null;
  const on = tipId === id;
  const feat = FEATURE_BY_ID[id];
  return (
    <button
      type="button"
      aria-label={feat.title}
      aria-pressed={on}
      className={
        "info-mark pointer-events-auto inline-flex size-9 items-center justify-center rounded-full border border-border bg-surface text-accent shadow-[0_4px_16px_rgba(0,0,0,0.35)] sm:size-10 " +
        (on ? "ring-1 ring-accent " : "") +
        className
      }
      onClick={(e) => {
        e.stopPropagation();
        const cur = useSim.getState().tipId;
        useSim.getState().openTip(cur === id ? null : id);
      }}
    >
      <Info className="size-3.5" strokeWidth={2.2} />
    </button>
  );
}
