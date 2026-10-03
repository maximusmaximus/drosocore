import { useEffect, useRef } from "react";
import { useSim } from "@/lib/store";

type Node = { x: number; y: number; phase: number; freq: number };
type Edge = { a: number; b: number };

function layout(seed: number, w: number, h: number) {
  const rng = (n: number) => {
    const x = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  const nodes: Node[] = [];
  const cx = w / 2;
  const cy = h / 2 - 8;
  const lobes = [
    { x: cx - 52, y: cy, rx: 48, ry: 58, n: 16 },
    { x: cx + 52, y: cy, rx: 48, ry: 58, n: 16 },
    { x: cx, y: cy + 4, rx: 28, ry: 36, n: 12 },
  ];
  let k = 0;
  for (const L of lobes) {
    for (let i = 0; i < L.n; i++) {
      const a = rng(k) * Math.PI * 2;
      const r = Math.sqrt(rng(k + 1));
      nodes.push({
        x: L.x + Math.cos(a) * L.rx * r,
        y: L.y + Math.sin(a) * L.ry * r,
        phase: rng(k + 2) * Math.PI * 2,
        freq: 2.2 + rng(k + 3) * 6,
      });
      k++;
    }
  }
  const edges: Edge[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      if (dx * dx + dy * dy < 42 * 42 && rng(i * 50 + j) > 0.55) {
        edges.push({ a: i, b: j });
      }
    }
  }
  return { nodes, edges };
}

export function BrainPopup() {
  const selected = useSim((s) => s.selected);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!selected) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = 280;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    const { nodes, edges } = layout(selected.seed, size, size);
    let raf = 0;
    const pulses: { e: number; t: number }[] = [];

    const draw = (now: number) => {
      const t = now / 1000;
      ctx.clearRect(0, 0, size, size);
      const g = ctx.createRadialGradient(size / 2, size / 2, 20, size / 2, size / 2, 140);
      g.addColorStop(0, "rgba(30, 50, 58, 0.9)");
      g.addColorStop(1, "rgba(8, 10, 12, 0.2)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);

      ctx.strokeStyle = "rgba(94, 234, 212, 0.18)";
      ctx.lineWidth = 1;
      for (let i = 0; i < edges.length; i++) {
        const e = edges[i];
        ctx.beginPath();
        ctx.moveTo(nodes[e.a].x, nodes[e.a].y);
        ctx.lineTo(nodes[e.b].x, nodes[e.b].y);
        ctx.stroke();
      }

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const fire = Math.sin(t * n.freq + n.phase);
        if (fire > 0.92 && Math.random() > 0.7) {
          const hits = edges.filter((e) => e.a === i || e.b === i);
          if (hits.length) pulses.push({ e: edges.indexOf(hits[0]), t: 0 });
        }
        const glow = fire > 0.55;
        ctx.beginPath();
        ctx.arc(n.x, n.y, glow ? 3.4 : 2.1, 0, Math.PI * 2);
        ctx.fillStyle = glow ? "rgba(245, 251, 255, 0.95)" : "rgba(94, 234, 212, 0.7)";
        ctx.fill();
        if (glow) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, 7, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(94, 234, 212, 0.16)";
          ctx.fill();
        }
      }

      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.t += 0.045;
        const e = edges[p.e];
        if (!e || p.t >= 1) {
          pulses.splice(i, 1);
          continue;
        }
        const a = nodes[e.a];
        const b = nodes[e.b];
        const x = a.x + (b.x - a.x) * p.t;
        const y = a.y + (b.y - a.y) * p.t;
        ctx.beginPath();
        ctx.arc(x, y, 2.4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 244, 210, 0.95)";
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [selected]);

  if (!selected) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center p-4"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        aria-label="close"
        className="pointer-events-auto absolute inset-0 bg-transparent"
        onClick={() => useSim.getState().select(null)}
      />
      <div
        className="pointer-events-auto relative flex size-[min(78vw,20rem)] flex-col items-center justify-end overflow-hidden rounded-full border border-border bg-surface/90 shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
        style={{ backdropFilter: "blur(10px)" }}
      >
        <canvas ref={canvasRef} className="absolute inset-0 size-full" />
        <div className="relative z-10 mb-7 flex flex-col items-center px-8 text-center">
          <span
            className="mb-1 size-2 rounded-full"
            style={{ background: selected.role.accent }}
          />
          <p className="font-mono text-sm font-medium tracking-wide text-fg">{selected.role.title}</p>
          <p className="mt-0.5 font-mono text-xs text-muted">{selected.role.tool}</p>
          <p className="mt-1 font-mono text-[0.7rem] tracking-widest text-subtle">{selected.role.designation}</p>
        </div>
      </div>
    </div>
  );
}
