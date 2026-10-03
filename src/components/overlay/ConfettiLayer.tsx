import { useEffect, useRef } from "react";
import { useSim } from "@/lib/store";

type P = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  w: number;
  h: number;
  color: string;
};

const COLORS = ["#5eead4", "#e8ecef", "#c45c4a", "#c9a227", "#8fd4ff", "#b56a32", "#3e5f86"];

function spawn(w: number, n: number): P[] {
  const out: P[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      x: Math.random() * w,
      y: -20 - Math.random() * 80,
      vx: (Math.random() - 0.5) * 80,
      vy: 40 + Math.random() * 90,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 8,
      w: 6 + Math.random() * 8,
      h: 8 + Math.random() * 12,
      color: COLORS[i % COLORS.length],
    });
  }
  return out;
}

export function ConfettiLayer() {
  const celebrating = useSim((s) => s.celebrating);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: 0, y: 0, vx: 0, vy: 0 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const m = mouse.current;
      m.vx = e.clientX - m.x;
      m.vy = e.clientY - m.y;
      m.x = e.clientX;
      m.y = e.clientY;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useEffect(() => {
    if (!celebrating) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = window.innerWidth;
    let h = window.innerHeight;
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    let parts = spawn(w, reduce ? 40 : 140);
    let last = performance.now();
    let raf = 0;
    let spawnAcc = 0;

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      spawnAcc += dt;
      if (!reduce && spawnAcc > 0.12) {
        spawnAcc = 0;
        parts.push(...spawn(w, 8));
        if (parts.length > 420) parts = parts.slice(parts.length - 420);
      }
      ctx.clearRect(0, 0, w, h);
      const mx = mouse.current.x;
      const my = mouse.current.y;
      const mvx = mouse.current.vx;
      const mvy = mouse.current.vy;
      mouse.current.vx *= 0.86;
      mouse.current.vy *= 0.86;
      for (const p of parts) {
        const dx = p.x - mx;
        const dy = p.y - my;
        const d2 = dx * dx + dy * dy;
        if (d2 < 22000) {
          const k = 1 - d2 / 22000;
          p.vx += mvx * 18 * k * dt;
          p.vy += mvy * 18 * k * dt;
          p.vx += dx * 0.8 * k * dt;
          p.vy += dy * 0.8 * k * dt;
        }
        p.vy += 180 * dt;
        p.vx *= 0.995;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        if (p.y > h + 30) {
          p.y = -20;
          p.x = Math.random() * w;
          p.vy = 50 + Math.random() * 70;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [celebrating]);

  if (!celebrating) return null;
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-40"
      aria-hidden
    />
  );
}
