import * as THREE from "three";

function hexPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

let eyeMap: THREE.CanvasTexture | null = null;
let thoraxMap: THREE.CanvasTexture | null = null;
let abdomenMap: THREE.CanvasTexture | null = null;
let wingMap: THREE.CanvasTexture | null = null;
let chitinBumpMap: THREE.CanvasTexture | null = null;

function texFrom(c: HTMLCanvasElement, linear = false): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.colorSpace = linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

export function eyeTexture(): THREE.CanvasTexture {
  if (eyeMap) return eyeMap;
  const s = 512;
  const c = document.createElement("canvas");
  c.width = s;
  c.height = s;
  const ctx = c.getContext("2d");
  if (!ctx) {
    eyeMap = new THREE.CanvasTexture(c);
    return eyeMap;
  }
  ctx.fillStyle = "#2a0505";
  ctx.fillRect(0, 0, s, s);
  const R = 3.7;
  const h = R * Math.sqrt(3);
  for (let row = -2; row < s / h + 3; row++) {
    for (let col = -2; col < s / (R * 1.5) + 3; col++) {
      const x = col * R * 1.5;
      const y = row * h + (col % 2 ? h / 2 : 0);
      const g = ctx.createRadialGradient(x - 0.9, y - 1.1, 0.15, x, y, R);
      g.addColorStop(0, "#ff9a72");
      g.addColorStop(0.16, "#e03a28");
      g.addColorStop(0.52, "#9a1610");
      g.addColorStop(0.82, "#4a0808");
      g.addColorStop(1, "#1a0303");
      ctx.fillStyle = g;
      hexPath(ctx, x, y, R * 0.92);
      ctx.fill();
    }
  }
  eyeMap = texFrom(c);
  return eyeMap;
}

/** Dark charcoal chitin — real Drosophila, not gold. */
export function thoraxTexture(): THREE.CanvasTexture {
  if (thoraxMap) return thoraxMap;
  const s = 512;
  const c = document.createElement("canvas");
  c.width = s;
  c.height = s;
  const ctx = c.getContext("2d");
  if (!ctx) {
    thoraxMap = new THREE.CanvasTexture(c);
    return thoraxMap;
  }
  const base = ctx.createLinearGradient(0, 0, 0, s);
  base.addColorStop(0, "#1c1e24");
  base.addColorStop(0.35, "#14161a");
  base.addColorStop(0.7, "#101214");
  base.addColorStop(1, "#0c0d10");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = "rgba(6, 6, 8, 0.7)";
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(s / 2, 16);
  ctx.lineTo(s / 2, s - 16);
  ctx.stroke();
  ctx.strokeStyle = "rgba(8, 8, 10, 0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(s * 0.38, 40);
  ctx.lineTo(s * 0.42, s - 50);
  ctx.moveTo(s * 0.62, 40);
  ctx.lineTo(s * 0.58, s - 50);
  ctx.stroke();
  for (let i = 0; i < 5200; i++) {
    const x = Math.random() * s;
    const y = Math.random() * s;
    ctx.fillStyle = `rgba(36, 40, 48, ${0.04 + Math.random() * 0.14})`;
    ctx.fillRect(x, y, 1, 1 + Math.random() * 2);
  }
  for (let i = 0; i < 620; i++) {
    ctx.strokeStyle = `rgba(4, 4, 6, ${0.45 + Math.random() * 0.45})`;
    ctx.lineWidth = 0.4 + Math.random() * 0.65;
    const x = Math.random() * s;
    const y = Math.random() * s;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 3, y - 8 - Math.random() * 16);
    ctx.stroke();
  }
  thoraxMap = texFrom(c);
  return thoraxMap;
}

export function abdomenTexture(): THREE.CanvasTexture {
  if (abdomenMap) return abdomenMap;
  const s = 512;
  const c = document.createElement("canvas");
  c.width = s;
  c.height = s;
  const ctx = c.getContext("2d");
  if (!ctx) {
    abdomenMap = new THREE.CanvasTexture(c);
    return abdomenMap;
  }
  const base = ctx.createLinearGradient(0, 0, 0, s);
  base.addColorStop(0, "#1a1814");
  base.addColorStop(0.5, "#141210");
  base.addColorStop(1, "#0c0a08");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, s, s);
  const bands = [0.14, 0.28, 0.42, 0.56, 0.7, 0.84];
  for (const t of bands) {
    const y = t * s;
    const g = ctx.createLinearGradient(0, y - 10, 0, y + 22);
    g.addColorStop(0, "rgba(12, 10, 8, 0)");
    g.addColorStop(0.32, "rgba(32, 26, 20, 0.55)");
    g.addColorStop(0.55, "rgba(22, 18, 14, 0.35)");
    g.addColorStop(0.78, "rgba(10, 8, 6, 0.2)");
    g.addColorStop(1, "rgba(12, 10, 8, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, y - 10, s, 34);
  }
  const tail = ctx.createLinearGradient(0, s * 0.8, 0, s);
  tail.addColorStop(0, "rgba(8, 6, 4, 0)");
  tail.addColorStop(1, "rgba(6, 4, 4, 0.72)");
  ctx.fillStyle = tail;
  ctx.fillRect(0, s * 0.8, s, s * 0.2);
  for (let i = 0; i < 1800; i++) {
    ctx.fillStyle = `rgba(40, 36, 30, ${0.04 + Math.random() * 0.1})`;
    ctx.fillRect(Math.random() * s, Math.random() * s, 1, 1);
  }
  abdomenMap = texFrom(c);
  return abdomenMap;
}

export function wingTexture(): THREE.CanvasTexture {
  if (wingMap) return wingMap;
  const s = 512;
  const c = document.createElement("canvas");
  c.width = s;
  c.height = s;
  const ctx = c.getContext("2d");
  if (!ctx) {
    wingMap = new THREE.CanvasTexture(c);
    return wingMap;
  }
  ctx.clearRect(0, 0, s, s);
  const g = ctx.createLinearGradient(0, 60, s, s - 40);
  g.addColorStop(0, "rgba(236, 246, 252, 0.55)");
  g.addColorStop(0.45, "rgba(210, 228, 236, 0.28)");
  g.addColorStop(1, "rgba(190, 214, 224, 0.1)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(18, 256);
  ctx.bezierCurveTo(70, 70, 300, 48, 492, 210);
  ctx.bezierCurveTo(480, 340, 280, 420, 24, 300);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(60, 80, 92, 0.7)";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(24, 256);
  ctx.quadraticCurveTo(240, 120, 488, 214);
  ctx.stroke();
  ctx.lineWidth = 1.35;
  const veins: [number, number, number, number][] = [
    [28, 262, 400, 170],
    [32, 276, 380, 310],
    [70, 230, 320, 130],
    [90, 290, 340, 360],
    [150, 190, 240, 330],
    [210, 160, 300, 320],
    [260, 150, 380, 250],
    [120, 250, 280, 200],
  ];
  for (const [ax, ay, bx, by] of veins) {
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 - 18, bx, by);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(50, 70, 80, 0.35)";
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 11; i++) {
    ctx.beginPath();
    ctx.moveTo(120 + i * 28, 170);
    ctx.lineTo(150 + i * 24, 340);
    ctx.stroke();
  }
  wingMap = texFrom(c);
  return wingMap;
}

/** Micro-setae and plate seams for physical bump. */
export function chitinBumpTexture(): THREE.CanvasTexture {
  if (chitinBumpMap) return chitinBumpMap;
  const s = 256;
  const c = document.createElement("canvas");
  c.width = s;
  c.height = s;
  const ctx = c.getContext("2d");
  if (!ctx) {
    chitinBumpMap = new THREE.CanvasTexture(c);
    return chitinBumpMap;
  }
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 2400; i++) {
    const v = 70 + Math.floor(Math.random() * 90);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(Math.random() * s, Math.random() * s, 1 + Math.random() * 1.4, 1);
  }
  ctx.strokeStyle = "rgba(40,40,40,0.55)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(s * 0.5, 8);
  ctx.lineTo(s * 0.5, s - 8);
  ctx.stroke();
  for (let i = 0; i < 280; i++) {
    const x = Math.random() * s;
    const y = Math.random() * s;
    ctx.strokeStyle = `rgba(30,30,30,${0.35 + Math.random() * 0.4})`;
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 2, y - 4 - Math.random() * 8);
    ctx.stroke();
  }
  chitinBumpMap = texFrom(c, true);
  return chitinBumpMap;
}

export function makeWingShape(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.06, 0.055, 0.28, 0.13, 0.62, 0.018);
  shape.bezierCurveTo(0.6, -0.09, 0.28, -0.135, 0.045, -0.042);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.0036,
    bevelEnabled: true,
    bevelThickness: 0.0008,
    bevelSize: 0.0012,
    bevelSegments: 1,
    curveSegments: 28,
    steps: 1,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0.0018, 0);
  geo.computeVertexNormals();
  return geo;
}

export function makeAbdomenGeo(): THREE.LatheGeometry {
  const pts = [
    new THREE.Vector2(0.008, 0),
    new THREE.Vector2(0.038, 0.008),
    new THREE.Vector2(0.066, 0.026),
    new THREE.Vector2(0.082, 0.052),
    new THREE.Vector2(0.09, 0.086),
    new THREE.Vector2(0.088, 0.122),
    new THREE.Vector2(0.078, 0.158),
    new THREE.Vector2(0.062, 0.194),
    new THREE.Vector2(0.044, 0.226),
    new THREE.Vector2(0.026, 0.252),
    new THREE.Vector2(0.012, 0.27),
    new THREE.Vector2(0.003, 0.282),
  ];
  const geo = new THREE.LatheGeometry(pts, 32);
  geo.rotateX(Math.PI / 2);
  geo.translate(0, 0, -0.018);
  geo.computeVertexNormals();
  return geo;
}

export function makeThoraxGeo(): THREE.LatheGeometry {
  const pts = [
    new THREE.Vector2(0.008, 0.07),
    new THREE.Vector2(0.036, 0.066),
    new THREE.Vector2(0.07, 0.05),
    new THREE.Vector2(0.096, 0.026),
    new THREE.Vector2(0.108, 0.002),
    new THREE.Vector2(0.104, -0.024),
    new THREE.Vector2(0.09, -0.044),
    new THREE.Vector2(0.062, -0.06),
    new THREE.Vector2(0.03, -0.072),
    new THREE.Vector2(0.006, -0.078),
  ];
  const geo = new THREE.LatheGeometry(pts, 32);
  geo.rotateX(Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

export function makeHatDome(): THREE.SphereGeometry {
  const geo = new THREE.SphereGeometry(0.052, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.56);
  geo.rotateX(-0.12);
  return geo;
}

export function makeWizardHat(): THREE.LatheGeometry {
  const pts = [
    new THREE.Vector2(0.001, 0.132),
    new THREE.Vector2(0.01, 0.112),
    new THREE.Vector2(0.02, 0.084),
    new THREE.Vector2(0.032, 0.048),
    new THREE.Vector2(0.044, 0.016),
    new THREE.Vector2(0.056, 0.0),
    new THREE.Vector2(0.078, -0.006),
    new THREE.Vector2(0.08, -0.012),
    new THREE.Vector2(0.018, -0.012),
  ];
  const geo = new THREE.LatheGeometry(pts, 20);
  geo.computeVertexNormals();
  return geo;
}

export const GEO = {
  head: new THREE.SphereGeometry(0.062, 28, 22),
  thorax: makeThoraxGeo(),
  scutellum: new THREE.SphereGeometry(0.028, 12, 10),
  abdomen: makeAbdomenGeo(),
  eye: new THREE.SphereGeometry(0.068, 32, 24),
  cornea: new THREE.SphereGeometry(0.072, 24, 18),
  ocellus: new THREE.SphereGeometry(0.007, 8, 6),
  wing: makeWingShape(),
  coxa: new THREE.CylinderGeometry(0.012, 0.0095, 0.028, 8),
  femur: new THREE.CylinderGeometry(0.0085, 0.0058, 0.094, 8),
  tibia: new THREE.CylinderGeometry(0.0056, 0.0038, 0.102, 8),
  tarsus: new THREE.CylinderGeometry(0.0036, 0.0022, 0.058, 6),
  claw: new THREE.ConeGeometry(0.0028, 0.012, 5),
  pulvillus: new THREE.SphereGeometry(0.0042, 8, 6),
  ant: new THREE.CylinderGeometry(0.0055, 0.0034, 0.048, 6),
  funiculus: new THREE.SphereGeometry(0.0075, 8, 6),
  arista: new THREE.CylinderGeometry(0.0018, 0.0008, 0.08, 4),
  hair: new THREE.CylinderGeometry(0.0014, 0.0004, 0.058, 4),
  haltere: new THREE.SphereGeometry(0.01, 8, 6),
  haltStem: new THREE.CylinderGeometry(0.0028, 0.0018, 0.038, 5),
  larvaSeg: new THREE.SphereGeometry(0.07, 14, 10),
  pupa: new THREE.SphereGeometry(1, 18, 12),
  staff: new THREE.CylinderGeometry(0.008, 0.01, 0.28, 8),
  orb: new THREE.SphereGeometry(0.028, 12, 10),
  hatDome: makeHatDome(),
  hatBrim: new THREE.CylinderGeometry(0.068, 0.072, 0.007, 16),
  wizardHat: makeWizardHat(),
  gauntlet: new THREE.CylinderGeometry(0.011, 0.009, 0.026, 6),
  labellum: new THREE.SphereGeometry(0.014, 8, 6),
  palp: new THREE.CylinderGeometry(0.0034, 0.0024, 0.026, 6),
};

GEO.coxa.translate(0, -0.013, 0);
GEO.femur.translate(0, -0.047, 0);
GEO.tibia.translate(0, -0.051, 0);
GEO.tarsus.translate(0, -0.028, 0);
GEO.claw.translate(0, -0.005, 0);
GEO.ant.translate(0, 0.024, 0);
GEO.arista.translate(0, 0.04, 0);
GEO.hair.translate(0, 0.029, 0);
GEO.haltStem.translate(0, -0.019, 0);
GEO.hatBrim.translate(0, -0.004, 0.01);
GEO.palp.translate(0, -0.012, 0);
