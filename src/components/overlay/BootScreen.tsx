import { useEffect, useRef, useState } from "react";
import {
  BOOT_FADE_MS,
  BOOT_MAX_MS,
  BOOT_MIN_MS,
  BOOT_QUOTE_MS,
  bootCanSkip,
  bootQuoteAt,
  bootShouldDismiss,
} from "@/lib/boot-quotes";
import { useSim } from "@/lib/store";
import { BootFly } from "@/components/scene/BootFly";

export function BootScreen() {
  const worldReady = useSim((s) => s.worldReady);
  const [tick, setTick] = useState(0);
  const [minElapsed, setMinElapsed] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [gone, setGone] = useState(false);
  const [hiding, setHiding] = useState(false);
  const leaving = useRef(false);

  useEffect(() => {
    const started = performance.now();
    let fadeTimer = 0;
    const id = window.setInterval(() => {
      const elapsed = performance.now() - started;
      setTick(Math.floor(elapsed / BOOT_QUOTE_MS));
      if (elapsed >= BOOT_MIN_MS) setMinElapsed(true);
      if (elapsed >= BOOT_MAX_MS) setTimedOut(true);
      if (leaving.current) return;
      const ready = useSim.getState().worldReady;
      if (!bootShouldDismiss(ready, elapsed >= BOOT_MIN_MS, elapsed >= BOOT_MAX_MS)) return;
      leaving.current = true;
      setHiding(true);
      fadeTimer = window.setTimeout(() => setGone(true), BOOT_FADE_MS);
    }, 80);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(fadeTimer);
    };
  }, []);

  if (gone) return null;

  const quote = bootQuoteAt(tick);
  const skippable = bootCanSkip(worldReady, minElapsed);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={!hiding}
      aria-label="loading DROSOCORE"
      data-boot={hiding ? "out" : "on"}
      className={
        "absolute inset-0 z-[80] flex flex-col items-center justify-center overflow-hidden bg-bg px-6 text-fg transition-opacity duration-500 " +
        (hiding ? "pointer-events-none opacity-0" : "opacity-100") +
        (skippable && !hiding ? " cursor-pointer" : "")
      }
      onClick={() => {
        if (!skippable || leaving.current) return;
        leaving.current = true;
        setHiding(true);
        window.setTimeout(() => setGone(true), 280);
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-35"
        style={{
          backgroundImage: "url(/hall-poster.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "saturate(0.7) brightness(0.55)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-bg/80 via-bg/55 to-bg" />
      <p className="relative font-mono text-xs tracking-widest text-muted">DROSOCORE</p>
      <div className="relative mt-6 h-56 w-56 overflow-hidden rounded-xl border border-border bg-surface shadow-[0_24px_60px_rgba(0,0,0,0.55)] sm:h-64 sm:w-64">
        <BootFly className="size-full" />
      </div>
      <p key={tick} className="boot-quote relative mt-8 max-w-sm text-center font-mono text-sm leading-snug text-fg">
        {quote}
      </p>
      <p className="relative mt-4 font-mono text-xs tracking-wide text-subtle">
        {timedOut && !worldReady ? "still compiling the vessel" : "assembling the hall"}
      </p>
      <p className={"relative mt-3 font-mono text-xs text-muted transition-opacity duration-300 " + (skippable ? "opacity-100" : "opacity-0")}>
        tap to skip
      </p>
    </div>
  );
}
