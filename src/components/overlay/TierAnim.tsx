import type { StageId } from "@/lib/tiers";

export function TierAnim({ stage, active }: { stage: StageId; active: boolean }) {
  return (
    <div className={"tier-stage relative mx-auto h-12 w-16 " + (active ? "is-on" : "")} data-stage={stage} aria-hidden>
      {stage === "larva" ? (
        <svg viewBox="0 0 64 48" className="larva-body size-full text-muted">
          <g className="larva-wiggle origin-center fill-current">
            <ellipse cx="18" cy="26" rx="8" ry="6" className="fill-fg/80" />
            <ellipse cx="28" cy="26" rx="7" ry="6.5" className="fill-muted" />
            <ellipse cx="38" cy="26" rx="7" ry="6" className="fill-fg/80" />
            <ellipse cx="47" cy="27" rx="6" ry="5" className="fill-muted" />
            <circle cx="14" cy="24" r="1.4" className="fill-bg" />
          </g>
        </svg>
      ) : null}
      {stage === "pupa" ? (
        <svg viewBox="0 0 64 48" className="size-full">
          <g className="pupa-breathe origin-center">
            <ellipse cx="32" cy="26" rx="11" ry="16" className="fill-muted" />
            <ellipse cx="32" cy="26" rx="8" ry="13" className="fill-fg/40" />
            <path d="M26 12 l-4 -6 M38 12 l4 -6" className="stroke-fg/70" strokeWidth="1.5" fill="none" />
          </g>
        </svg>
      ) : null}
      {stage === "imago" || stage === "foreman" || stage === "wizard" ? (
        <svg viewBox="0 0 64 48" className="size-full">
          <g className={stage === "foreman" ? "foreman-bob origin-center" : "origin-center"}>
            {stage === "wizard" ? (
              <g className="wizard-orbit origin-[32px_22px]">
                <circle cx="48" cy="14" r="2" className="fill-accent" />
                <circle cx="16" cy="12" r="1.4" className="fill-accent/70" />
              </g>
            ) : null}
            <ellipse className="wing-l fill-accent/40" cx="22" cy="20" rx="12" ry="5" />
            <ellipse className="wing-r fill-accent/40" cx="42" cy="20" rx="12" ry="5" />
            <ellipse cx="32" cy="26" rx="7" ry="5" className="fill-fg/80" />
            <ellipse cx="32" cy="32" rx="6" ry="8" className="fill-muted" />
            <circle cx="28" cy="24" r="2.4" className="fill-fly" />
            <circle cx="36" cy="24" r="2.4" className="fill-fly" />
            {stage === "foreman" ? <path d="M26 18 h12 l-2 -4 h-8 z" className="fill-accent" /> : null}
            {stage === "wizard" ? (
              <>
                <path d="M32 8 l4 8 h-8 z" className="fill-accent" />
                <line x1="44" y1="36" x2="50" y2="16" className="stroke-fg" strokeWidth="1.5" />
                <circle cx="50" cy="14" r="2.5" className="fill-accent" />
              </>
            ) : null}
          </g>
        </svg>
      ) : null}
    </div>
  );
}
