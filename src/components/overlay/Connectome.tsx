import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { BRAIN_REGIONS, REGION_BY_ID, type RegionId } from "@/lib/fly-brain";
import { peekFly } from "@/lib/fly-live";

type Cloud = {
  id: RegionId;
  cx: number;
  cy: number;
  cz: number;
  rx: number;
  ry: number;
  rz: number;
  n: number;
  mirror?: boolean;
};

/** Side-view layout matching the 2026 Janelia/Google male CNS figure. */
const CLOUDS: Cloud[] = [
  { id: "opticLobe", cx: 0.78, cy: 0.14, cz: 0.04, rx: 0.34, ry: 0.4, rz: 0.26, n: 340, mirror: true },
  { id: "aotu", cx: 0.4, cy: 0.22, cz: 0.12, rx: 0.1, ry: 0.09, rz: 0.08, n: 70, mirror: true },
  { id: "antennalLobe", cx: 0.14, cy: 0.0, cz: 0.22, rx: 0.11, ry: 0.11, rz: 0.09, n: 80, mirror: true },
  { id: "mushroomBody", cx: 0.2, cy: 0.34, cz: 0.02, rx: 0.13, ry: 0.11, rz: 0.11, n: 110, mirror: true },
  { id: "centralComplex", cx: 0, cy: 0.1, cz: 0, rx: 0.11, ry: 0.1, rz: 0.1, n: 90 },
  { id: "lateralHorn", cx: 0.34, cy: 0.1, cz: 0.16, rx: 0.09, ry: 0.09, rz: 0.08, n: 64, mirror: true },
  { id: "gnathal", cx: 0, cy: -0.26, cz: 0.08, rx: 0.15, ry: 0.11, rz: 0.11, n: 80 },
  { id: "sez", cx: 0, cy: -0.4, cz: 0.1, rx: 0.11, ry: 0.08, rz: 0.09, n: 50 },
  { id: "descending", cx: 0, cy: -0.62, cz: 0, rx: 0.07, ry: 0.16, rz: 0.07, n: 60 },
  { id: "vncWalk", cx: 0, cy: -1.08, cz: 0.02, rx: 0.13, ry: 0.28, rz: 0.1, n: 150 },
  { id: "vncWing", cx: 0, cy: -0.82, cz: -0.08, rx: 0.11, ry: 0.11, rz: 0.08, n: 70 },
];

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function build(seed: number) {
  const rand = rng(((Math.abs(seed) * 9999) | 1) % 2147483646);
  const positions: number[] = [];
  const colors: number[] = [];
  const phases: number[] = [];
  const regionOf: number[] = [];
  const col = new THREE.Color();
  const lobes: { cloud: Cloud; sx: number }[] = [];
  for (const c of CLOUDS) {
    lobes.push({ cloud: c, sx: 1 });
    if (c.mirror) lobes.push({ cloud: c, sx: -1 });
  }
  for (const { cloud: R, sx } of lobes) {
    const spec = REGION_BY_ID[R.id];
    const ri = BRAIN_REGIONS.findIndex((x) => x.id === R.id);
    for (let i = 0; i < R.n; i++) {
      const u = rand() * Math.PI * 2;
      const v = Math.acos(2 * rand() - 1);
      const k = Math.cbrt(rand());
      positions.push(
        sx * (R.cx + Math.sin(v) * Math.cos(u) * R.rx * k),
        R.cy + Math.cos(v) * R.ry * k,
        R.cz + Math.sin(v) * Math.sin(u) * R.rz * k,
      );
      col.set(spec.color);
      col.offsetHSL(0, 0, (rand() - 0.5) * 0.12);
      colors.push(col.r, col.g, col.b);
      phases.push(rand() * Math.PI * 2);
      regionOf.push(ri);
    }
  }
  const lines: number[] = [];
  const n = positions.length / 3;
  for (let i = 0; i < 420; i++) {
    const a = (rand() * n) | 0;
    const b = (rand() * n) | 0;
    const dx = positions[a * 3] - positions[b * 3];
    const dy = positions[a * 3 + 1] - positions[b * 3 + 1];
    const dz = positions[a * 3 + 2] - positions[b * 3 + 2];
    if (dx * dx + dy * dy + dz * dz < 0.14) {
      lines.push(
        positions[a * 3],
        positions[a * 3 + 1],
        positions[a * 3 + 2],
        positions[b * 3],
        positions[b * 3 + 1],
        positions[b * 3 + 2],
      );
    }
  }
  return {
    positions: new Float32Array(positions),
    colors: new Float32Array(colors),
    phases,
    regionOf,
    lines: new Float32Array(lines),
  };
}

function Brain({ seed, index }: { seed: number; index: number }) {
  const data = useMemo(() => build(seed), [seed]);
  const colorAttr = useRef<THREE.BufferAttribute>(null);
  const group = useRef<THREE.Group>(null);
  const flash = useMemo(() => new THREE.Color("#fff6d8"), []);
  const scratch = useMemo(() => new THREE.Color(), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (group.current) {
      group.current.rotation.y = t * 0.28;
      group.current.rotation.x = Math.sin(t * 0.4) * 0.12;
    }
    const attr = colorAttr.current;
    if (!attr) return;
    const fly = peekFly(index);
    const arr = attr.array as Float32Array;
    for (let i = 0; i < data.phases.length; i++) {
      const spec = BRAIN_REGIONS[data.regionOf[i]];
      const act = fly?.brain.act[spec.id] ?? 0.16;
      const fire = Math.sin(t * (5 + act * 9) + data.phases[i]);
      const o = i * 3;
      if (fire > 1.12 - act * 0.7) {
        arr[o] = flash.r;
        arr[o + 1] = flash.g;
        arr[o + 2] = flash.b;
      } else {
        scratch.set(spec.color);
        scratch.multiplyScalar(0.28 + act * 0.85);
        arr[o] = scratch.r;
        arr[o + 1] = scratch.g;
        arr[o + 2] = scratch.b;
      }
    }
    attr.needsUpdate = true;
  });

  return (
    <group ref={group} scale={0.78} position={[0, 0.28, 0]}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
          <bufferAttribute ref={colorAttr} attach="attributes-color" args={[data.colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.034}
          vertexColors
          sizeAttenuation
          transparent
          opacity={0.94}
          depthWrite={false}
        />
      </points>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[data.lines, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#8ee8d8" transparent opacity={0.14} />
      </lineSegments>
    </group>
  );
}

export function ConnectomeView({ seed, index, className }: { seed: number; index: number; className?: string }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      camera={{ position: [0, 0.15, 2.55], fov: 38, near: 0.1, far: 20 }}
      className={className}
    >
      <color attach="background" args={["#0b0d10"]} />
      <ambientLight intensity={0.8} />
      <Brain seed={seed} index={index} />
    </Canvas>
  );
}

const MAP_SHAPES: { id: RegionId; x: number; y: number; rx: number; ry: number }[] = [
  { id: "opticLobe", x: 28, y: 36, rx: 22, ry: 28 },
  { id: "opticLobe", x: 132, y: 36, rx: 22, ry: 28 },
  { id: "aotu", x: 52, y: 22, rx: 10, ry: 8 },
  { id: "aotu", x: 108, y: 22, rx: 10, ry: 8 },
  { id: "mushroomBody", x: 62, y: 18, rx: 12, ry: 10 },
  { id: "mushroomBody", x: 98, y: 18, rx: 12, ry: 10 },
  { id: "centralComplex", x: 80, y: 34, rx: 14, ry: 12 },
  { id: "antennalLobe", x: 64, y: 48, rx: 10, ry: 9 },
  { id: "antennalLobe", x: 96, y: 48, rx: 10, ry: 9 },
  { id: "lateralHorn", x: 48, y: 44, rx: 9, ry: 8 },
  { id: "lateralHorn", x: 112, y: 44, rx: 9, ry: 8 },
  { id: "gnathal", x: 80, y: 64, rx: 16, ry: 9 },
  { id: "sez", x: 80, y: 78, rx: 12, ry: 7 },
  { id: "descending", x: 80, y: 94, rx: 8, ry: 12 },
  { id: "vncWing", x: 80, y: 112, rx: 14, ry: 9 },
  { id: "vncWalk", x: 80, y: 132, rx: 13, ry: 16 },
];

export function RegionMap({
  act,
  used,
}: {
  act: Record<RegionId, number> | null;
  used: RegionId[];
}) {
  const hot = new Set(used);
  return (
    <svg viewBox="0 0 160 156" className="h-full w-full" aria-hidden>
      {MAP_SHAPES.map((s, i) => {
        const spec = REGION_BY_ID[s.id];
        const a = act?.[s.id] ?? 0.12;
        const on = hot.has(s.id);
        return (
          <ellipse
            key={`${s.id}-${i}`}
            cx={s.x}
            cy={s.y}
            rx={s.rx}
            ry={s.ry}
            fill={spec.color}
            fillOpacity={0.22 + a * 0.7}
            stroke={on ? "var(--color-fg)" : "var(--color-border)"}
            strokeWidth={on ? 1.4 : 0.6}
          />
        );
      })}
    </svg>
  );
}
