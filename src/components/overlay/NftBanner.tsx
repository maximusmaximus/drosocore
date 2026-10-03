import { useSim } from "@/lib/store";

export function NftBanner() {
  const infoOn = useSim((s) => s.infoOn);
  if (!infoOn) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center px-14 pt-[max(3.4rem,calc(env(safe-area-inset-top)+2.6rem))]">
      <p className="max-w-[22rem] rounded-full border border-border bg-surface/80 px-3 py-1.5 text-center font-mono text-[0.65rem] leading-snug tracking-wide text-muted sm:max-w-none sm:text-xs">
        billboards mint a 3D supporter plate · 0.01 ETH and up names a fly at rank
      </p>
    </div>
  );
}
