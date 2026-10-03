import * as THREE from "three";
import type { GfxProfile } from "@/lib/gfx-tier";

export type SurfPack = {
  concrete: THREE.CanvasTexture;
  concreteRough: THREE.CanvasTexture;
  steel: THREE.CanvasTexture;
  steelRough: THREE.CanvasTexture;
  steelMetal: THREE.CanvasTexture;
  copper: THREE.CanvasTexture;
  copperRough: THREE.CanvasTexture;
  copperMetal: THREE.CanvasTexture;
  diamond: THREE.CanvasTexture;
  rust: THREE.CanvasTexture;
  paint: THREE.CanvasTexture;
  hallFloor: THREE.CanvasTexture;
  hallFloorRough: THREE.CanvasTexture;
  padFloor: THREE.CanvasTexture;
  bump?: THREE.CanvasTexture;
  brushBump?: THREE.CanvasTexture;
  bumpScale: number;
  clones: THREE.Texture[];
};

function hash01(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function canvas(size: number): { c: HTMLCanvasElement; g: CanvasRenderingContext2D } {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const g = c.getContext("2d");
  if (!g) throw new Error("no 2d");
  return { c, g };
}

function tex(c: HTMLCanvasElement, aniso: number, repeat: number, linear = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.needsUpdate = true;
  return t;
}

function speckle(g: CanvasRenderingContext2D, size: number, n: number, color: (i: number) => string, seed: number) {
  for (let i = 0; i < n; i++) {
    const x = hash01(seed + i * 3.1) * size;
    const y = hash01(seed + i * 7.7 + 1) * size;
    const s = 0.6 + hash01(seed + i) * 2.4;
    g.fillStyle = color(i);
    g.fillRect(x, y, s, s);
  }
}

function makeConcrete(size: number, aniso: number): { color: THREE.CanvasTexture; rough: THREE.CanvasTexture } {
  const { c, g } = canvas(size);
  g.fillStyle = "#7a7670";
  g.fillRect(0, 0, size, size);
  const { c: r, g: rg } = canvas(size);
  rg.fillStyle = "#9a9a9a";
  rg.fillRect(0, 0, size, size);
  speckle(g, size, size * 4, (i) => (i % 5 === 0 ? "#6a6660" : i % 3 === 0 ? "#8a8680" : "#746f68"), 2);
  speckle(rg, size, size * 3, (i) => (i % 4 === 0 ? "#bbb" : "#888"), 9);
  g.strokeStyle = "rgba(50,46,42,0.18)";
  g.lineWidth = Math.max(1, size / 256);
  for (let i = 0; i < 8; i++) {
    g.beginPath();
    g.moveTo((i / 8) * size, 0);
    g.lineTo((i / 8) * size, size);
    g.stroke();
    g.beginPath();
    g.moveTo(0, (i / 8) * size);
    g.lineTo(size, (i / 8) * size);
    g.stroke();
  }
  for (let i = 0; i < 10; i++) {
    const x = hash01(40 + i) * size;
    const y = hash01(80 + i) * size;
    const rad = size * (0.08 + hash01(i + 3) * 0.12);
    const grd = g.createRadialGradient(x, y, 2, x, y, rad);
    grd.addColorStop(0, "rgba(40,36,32,0.28)");
    grd.addColorStop(1, "rgba(40,36,32,0)");
    g.fillStyle = grd;
    g.beginPath();
    g.arc(x, y, rad, 0, Math.PI * 2);
    g.fill();
  }
  const color = tex(c, aniso, 6, false);
  const rough = tex(r, aniso, 6, true);
  return { color, rough };
}

function makeSteel(size: number, aniso: number): {
  color: THREE.CanvasTexture;
  rough: THREE.CanvasTexture;
  metal: THREE.CanvasTexture;
} {
  const { c, g } = canvas(size);
  const { c: r, g: rg } = canvas(size);
  const { c: m, g: mg } = canvas(size);
  const base = g.createLinearGradient(0, 0, 0, size);
  base.addColorStop(0, "#c5cdd4");
  base.addColorStop(0.45, "#8e98a2");
  base.addColorStop(1, "#a8b2bc");
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  rg.fillStyle = "#c8c8c8";
  rg.fillRect(0, 0, size, size);
  mg.fillStyle = "#e6e6e6";
  mg.fillRect(0, 0, size, size);
  for (let i = 0; i < size; i++) {
    const a = 0.05 + hash01(i * 0.3) * 0.16;
    g.strokeStyle = `rgba(255,255,255,${a})`;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, i + hash01(i) * 1.6);
    g.lineTo(size, i);
    g.stroke();
    const rv = 150 + Math.floor(hash01(i * 1.7) * 70);
    rg.strokeStyle = `rgb(${rv},${rv},${rv})`;
    rg.beginPath();
    rg.moveTo(0, i);
    rg.lineTo(size, i);
    rg.stroke();
  }
  for (let i = 0; i < 28; i++) {
    const y = hash01(i * 9.1) * size;
    g.strokeStyle = `rgba(20,24,28,${0.12 + hash01(i) * 0.22})`;
    g.lineWidth = 0.8 + hash01(i + 2) * 1.8;
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(size, y + (hash01(i + 4) - 0.5) * 8);
    g.stroke();
    rg.strokeStyle = "#efefef";
    rg.lineWidth = 1.2;
    rg.beginPath();
    rg.moveTo(0, y);
    rg.lineTo(size, y);
    rg.stroke();
  }
  speckle(g, size, 140, () => "rgba(16,18,20,0.4)", 21);
  speckle(g, size, 60, () => "rgba(220,228,236,0.28)", 27);
  for (let i = 0; i < 18; i++) {
    const x = hash01(i * 3.3) * size;
    const y = hash01(i * 5.1) * size;
    const rad = size * (0.04 + hash01(i + 2) * 0.08);
    const grd = g.createRadialGradient(x, y, 2, x, y, rad);
    grd.addColorStop(0, "rgba(12,14,16,0.32)");
    grd.addColorStop(1, "rgba(12,14,16,0)");
    g.fillStyle = grd;
    g.beginPath();
    g.arc(x, y, rad, 0, Math.PI * 2);
    g.fill();
    mg.fillStyle = "#9a9a9a";
    mg.beginPath();
    mg.arc(x, y, rad * 0.7, 0, Math.PI * 2);
    mg.fill();
    rg.fillStyle = "#d8d8d8";
    rg.beginPath();
    rg.arc(x, y, rad * 0.7, 0, Math.PI * 2);
    rg.fill();
  }
  speckle(mg, size, 80, () => "#b0b0b0", 44);
  return {
    color: tex(c, aniso, 2.4, false),
    rough: tex(r, aniso, 2.4, true),
    metal: tex(m, aniso, 2.4, true),
  };
}

function makeCopper(size: number, aniso: number): {
  color: THREE.CanvasTexture;
  rough: THREE.CanvasTexture;
  metal: THREE.CanvasTexture;
} {
  const { c, g } = canvas(size);
  const { c: r, g: rg } = canvas(size);
  const { c: m, g: mg } = canvas(size);
  const base = g.createLinearGradient(0, 0, size, 0);
  base.addColorStop(0, "#c4783a");
  base.addColorStop(0.5, "#b56a32");
  base.addColorStop(1, "#9a5424");
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  rg.fillStyle = "#b8b8b8";
  rg.fillRect(0, 0, size, size);
  mg.fillStyle = "#ececec";
  mg.fillRect(0, 0, size, size);
  for (let i = 0; i < size; i += 2) {
    const a = 0.04 + hash01(i * 0.41) * 0.12;
    g.strokeStyle = `rgba(255,200,140,${a})`;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, i + hash01(i) * 1.4);
    g.lineTo(size, i);
    g.stroke();
    const rv = 140 + Math.floor(hash01(i * 2.2) * 70);
    rg.strokeStyle = `rgb(${rv},${rv},${rv})`;
    rg.beginPath();
    rg.moveTo(0, i);
    rg.lineTo(size, i);
    rg.stroke();
  }
  for (let i = 0; i < 22; i++) {
    g.fillStyle = i % 2 ? "rgba(60,140,90,0.18)" : "rgba(180,90,40,0.22)";
    g.beginPath();
    g.ellipse(hash01(i) * size, hash01(i + 4) * size, size * 0.16, size * 0.05, hash01(i + 8) * 2, 0, Math.PI * 2);
    g.fill();
    if (i % 2) {
      mg.fillStyle = "#8a8a8a";
      mg.beginPath();
      mg.ellipse(hash01(i) * size, hash01(i + 4) * size, size * 0.12, size * 0.04, hash01(i + 8) * 2, 0, Math.PI * 2);
      mg.fill();
      rg.fillStyle = "#d0d0d0";
      rg.beginPath();
      rg.ellipse(hash01(i) * size, hash01(i + 4) * size, size * 0.12, size * 0.04, hash01(i + 8) * 2, 0, Math.PI * 2);
      rg.fill();
    }
  }
  speckle(g, size, size * 2, (i) => (i % 7 === 0 ? "#d4894a" : "#8a4a22"), 33);
  return {
    color: tex(c, aniso, 3, false),
    rough: tex(r, aniso, 3, true),
    metal: tex(m, aniso, 3, true),
  };
}

function makeBrushBump(size: number, aniso: number): THREE.CanvasTexture {
  const { c, g } = canvas(size);
  g.fillStyle = "#808080";
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < size; i++) {
    const v = 96 + Math.floor(hash01(i * 0.9) * 70);
    g.strokeStyle = `rgb(${v},${v},${v})`;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, i);
    g.lineTo(size, i + (hash01(i) - 0.5) * 1.2);
    g.stroke();
  }
  speckle(g, size, size * 2, (i) => {
    const v = 60 + Math.floor(hash01(i + 9) * 120);
    return `rgb(${v},${v},${v})`;
  }, 77);
  return tex(c, aniso, 3, true);
}

function makeDiamond(size: number, aniso: number): THREE.CanvasTexture {
  const { c, g } = canvas(size);
  g.fillStyle = "#4a5158";
  g.fillRect(0, 0, size, size);
  const step = Math.max(16, size / 12);
  g.strokeStyle = "#6a727a";
  g.fillStyle = "#3a4048";
  g.lineWidth = Math.max(1, size / 256);
  for (let y = -step; y < size + step; y += step) {
    for (let x = -step; x < size + step; x += step) {
      const ox = (Math.floor(y / step) % 2) * (step / 2);
      g.beginPath();
      g.moveTo(x + ox, y + step / 2);
      g.lineTo(x + ox + step / 2, y);
      g.lineTo(x + ox + step, y + step / 2);
      g.lineTo(x + ox + step / 2, y + step);
      g.closePath();
      g.fill();
      g.stroke();
    }
  }
  return tex(c, aniso, 4, false);
}

function makeRust(size: number, aniso: number): THREE.CanvasTexture {
  const { c, g } = canvas(size);
  g.fillStyle = "#6a3a28";
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 24; i++) {
    g.fillStyle = i % 2 ? "rgba(140,70,30,0.45)" : "rgba(40,20,12,0.35)";
    g.beginPath();
    g.arc(hash01(i * 2) * size, hash01(i * 3) * size, size * (0.05 + hash01(i) * 0.12), 0, Math.PI * 2);
    g.fill();
  }
  speckle(g, size, size * 3, (i) => (i % 2 ? "#c4783a" : "#3a1c10"), 44);
  return tex(c, aniso, 2, false);
}

function makePaint(size: number, aniso: number): THREE.CanvasTexture {
  const { c, g } = canvas(size);
  g.fillStyle = "#4e555e";
  g.fillRect(0, 0, size, size);
  speckle(g, size, size * 2, (i) => (i % 6 === 0 ? "#6a727c" : "#3a4048"), 55);
  for (let i = 0; i < 12; i++) {
    g.strokeStyle = "rgba(20,20,22,0.35)";
    g.lineWidth = 1 + hash01(i) * 2;
    g.beginPath();
    g.moveTo(hash01(i) * size, hash01(i + 1) * size);
    g.lineTo(hash01(i + 2) * size, hash01(i + 3) * size);
    g.stroke();
  }
  return tex(c, aniso, 3, false);
}

function makeHallFloor(size: number, aniso: number, grit: boolean): { color: THREE.CanvasTexture; rough: THREE.CanvasTexture } {
  const { c, g } = canvas(size);
  const { c: r, g: rg } = canvas(size);
  g.fillStyle = "#2c3036";
  g.fillRect(0, 0, size, size);
  rg.fillStyle = "#7a7a7a";
  rg.fillRect(0, 0, size, size);
  for (let i = 0; i < 80; i++) {
    const x = hash01(i * 19.1) * size;
    const y = hash01(i * 11.7 + 2) * size;
    g.fillStyle = i % 3 === 0 ? "#34383e" : "#262a30";
    g.fillRect(x, y, 40 + (i % 5) * 12, 18);
  }
  g.strokeStyle = "#3a4048";
  g.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    g.beginPath();
    g.moveTo((i / 12) * size, 0);
    g.lineTo((i / 12) * size, size);
    g.stroke();
    g.beginPath();
    g.moveTo(0, (i / 12) * size);
    g.lineTo(size, (i / 12) * size);
    g.stroke();
  }
  if (grit) {
    speckle(g, size, size * 6, (i) => (i % 9 === 0 ? "rgba(12,12,12,0.45)" : "rgba(80,84,90,0.28)"), 70);
    for (let i = 0; i < 7; i++) {
      g.fillStyle = "rgba(18,16,12,0.28)";
      g.beginPath();
      g.ellipse(hash01(200 + i) * size, hash01(240 + i) * size, size * 0.12, size * 0.04, hash01(i) * 3, 0, Math.PI * 2);
      g.fill();
      rg.fillStyle = "#c8c8c8";
      rg.beginPath();
      rg.ellipse(hash01(200 + i) * size, hash01(240 + i) * size, size * 0.12, size * 0.04, hash01(i) * 3, 0, Math.PI * 2);
      rg.fill();
    }
  }
  g.strokeStyle = "#c9a227";
  g.lineWidth = Math.max(8, size / 72);
  g.setLineDash([28, 18]);
  g.strokeRect(size * 0.05, size * 0.05, size * 0.9, size * 0.9);
  g.setLineDash([]);
  const color = tex(c, aniso, 4, false);
  const rough = tex(r, aniso, 4, true);
  return { color, rough };
}

function makePadFloor(size: number, aniso: number): THREE.CanvasTexture {
  const { c, g } = canvas(size);
  g.fillStyle = "#35393f";
  g.fillRect(0, 0, size, size);
  const cx = size / 2;
  const cy = size / 2;
  g.strokeStyle = "#2a2e34";
  g.lineWidth = 3;
  for (let rad = size * 0.08; rad < size * 0.48; rad += size * 0.07) {
    g.beginPath();
    g.arc(cx, cy, rad, 0, Math.PI * 2);
    g.stroke();
  }
  g.strokeStyle = "#2f343a";
  g.lineWidth = 2;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx + Math.cos(a) * size * 0.48, cy + Math.sin(a) * size * 0.48);
    g.stroke();
  }
  speckle(g, size, size * 3, (i) => (i % 5 === 0 ? "#2a2c30" : "#3e444c"), 91);
  g.strokeStyle = "#c9a227";
  g.lineWidth = Math.max(6, size / 100);
  g.setLineDash([22, 16]);
  g.beginPath();
  g.arc(cx, cy, size * 0.46, 0, Math.PI * 2);
  g.stroke();
  g.setLineDash([]);
  g.strokeStyle = "#c9d0d6";
  g.lineWidth = 2;
  g.beginPath();
  g.arc(cx, cy, size * 0.018, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.moveTo(cx - size * 0.04, cy);
  g.lineTo(cx + size * 0.04, cy);
  g.moveTo(cx, cy - size * 0.04);
  g.lineTo(cx, cy + size * 0.04);
  g.stroke();
  const t = tex(c, aniso, 1, false);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.repeat.set(1, 1);
  return t;
}

function makeBump(size: number, aniso: number): THREE.CanvasTexture {
  const { c, g } = canvas(size);
  g.fillStyle = "#808080";
  g.fillRect(0, 0, size, size);
  speckle(g, size, size * 8, (i) => {
    const v = 70 + Math.floor(hash01(i + 5) * 110);
    return `rgb(${v},${v},${v})`;
  }, 120);
  return tex(c, aniso, 4, true);
}

export function makeMetalPack(size: number, aniso: number) {
  const steel = makeSteel(size, aniso);
  const copper = makeCopper(Math.min(size, 512), aniso);
  return {
    steel: steel.color,
    steelRough: steel.rough,
    steelMetal: steel.metal,
    copper: copper.color,
    copperRough: copper.rough,
    copperMetal: copper.metal,
    brushBump: makeBrushBump(Math.min(size, 512), aniso),
  };
}

export function makeSurfPack(profile: GfxProfile): SurfPack {
  const size = profile.texSize;
  const aniso = profile.anisotropy;
  const concrete = makeConcrete(size, aniso);
  const metals = makeMetalPack(size, aniso);
  const floor = makeHallFloor(size, aniso, profile.extraDetail);
  return {
    concrete: concrete.color,
    concreteRough: concrete.rough,
    steel: metals.steel,
    steelRough: metals.steelRough,
    steelMetal: metals.steelMetal,
    copper: metals.copper,
    copperRough: metals.copperRough,
    copperMetal: metals.copperMetal,
    diamond: makeDiamond(Math.min(size, 512), aniso),
    rust: makeRust(Math.min(size, 512), aniso),
    paint: makePaint(Math.min(size, 512), aniso),
    hallFloor: floor.color,
    hallFloorRough: floor.rough,
    padFloor: makePadFloor(size, aniso),
    bump: profile.bump ? makeBump(Math.min(size, 512), aniso) : undefined,
    brushBump: metals.brushBump,
    bumpScale: profile.tier === "high" ? 0.18 : profile.bump ? 0.1 : 0,
    clones: [],
  };
}

export function disposeSurfPack(pack: SurfPack) {
  const list: (THREE.Texture | undefined)[] = [
    pack.concrete,
    pack.concreteRough,
    pack.steel,
    pack.steelRough,
    pack.steelMetal,
    pack.copper,
    pack.copperRough,
    pack.copperMetal,
    pack.diamond,
    pack.rust,
    pack.paint,
    pack.hallFloor,
    pack.hallFloorRough,
    pack.padFloor,
    pack.bump,
    pack.brushBump,
    ...pack.clones,
  ];
  for (const t of list) t?.dispose();
}
