import type { SpeechBillboard } from "@/lib/fly-sim";

export function SpeechHud({ items }: { items: SpeechBillboard[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {items.map((s) => (
        <div
          key={s.index}
          className="absolute -translate-x-1/2 -translate-y-full max-w-[12.5rem] whitespace-normal rounded-md bg-surface/80 px-1.5 py-0.5 text-left font-mono text-[0.65rem] leading-snug tracking-wide text-accent"
          style={{ left: s.x, top: s.y }}
        >
          {s.text}
        </div>
      ))}
    </div>
  );
}
