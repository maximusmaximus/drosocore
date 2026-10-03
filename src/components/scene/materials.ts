import * as THREE from "three";
import { abdomenTexture, chitinBumpTexture, eyeTexture, thoraxTexture, wingTexture } from "./fly-geo";
import { makeMetalPack, type SurfPack } from "./surf-maps";

export type Kit = ReturnType<typeof createKit>;

export function createKit() {
  const phys = (
    color: string,
    extra: ConstructorParameters<typeof THREE.MeshPhysicalMaterial>[0] = {},
  ) =>
    new THREE.MeshPhysicalMaterial({
      color,
      metalness: 0.18,
      roughness: 0.42,
      clearcoat: 0.65,
      clearcoatRoughness: 0.28,
      envMapIntensity: 1.1,
      ...extra,
    });

  return {
    vessel: phys("#c9d0d6", { metalness: 0.86, roughness: 0.26, clearcoat: 0.42 }),
    vesselShell: phys("#c9d0d6", {
      metalness: 0.45,
      roughness: 0.22,
      clearcoat: 0.8,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    }),
    vesselDark: phys("#8b949c", { metalness: 0.78, roughness: 0.32 }),
    coil: phys("#3e5f86", { metalness: 0.55, roughness: 0.34, clearcoat: 0.4 }),
    coilCase: phys("#2a3340", { metalness: 0.6, roughness: 0.4 }),
    copper: phys("#b56a32", { metalness: 0.92, roughness: 0.26, clearcoat: 0.28 }),
    copperBright: phys("#d4894a", { metalness: 0.9, roughness: 0.22, clearcoat: 0.3 }),
    concrete: phys("#7d7973", { metalness: 0.08, roughness: 0.72, clearcoat: 0.15 }),
    floor: phys("#3a3e44", { metalness: 0.2, roughness: 0.62, clearcoat: 0.2 }),
    caution: phys("#c9a227", { metalness: 0.2, roughness: 0.45 }),
    cautionDark: phys("#1a1c1e", { metalness: 0.3, roughness: 0.5 }),
    crane: phys("#c45c4a", { metalness: 0.62, roughness: 0.36, clearcoat: 0.45 }),
    craneDark: phys("#6e2e26", { metalness: 0.58, roughness: 0.38, clearcoat: 0.3 }),
    plasticWhite: phys("#e8ecef", { metalness: 0.12, roughness: 0.28, clearcoat: 0.85 }),
    plasticTan: phys("#c4a574", {
      metalness: 0.08,
      roughness: 0.36,
      clearcoat: 0.7,
      side: THREE.DoubleSide,
    }),
    plasticBrown: phys("#5c4033", { metalness: 0.1, roughness: 0.45, clearcoat: 0.4 }),
    plasticStripe: phys("#2b211c", { metalness: 0.1, roughness: 0.4 }),
    eye: phys("#c42822", { metalness: 0.08, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.06 }),
    eyeGloss: new THREE.MeshPhysicalMaterial({
      color: "#1a0505",
      metalness: 0.2,
      roughness: 0.08,
      clearcoat: 1,
    }),
    wing: new THREE.MeshPhysicalMaterial({
      color: "#e8f4fa",
      metalness: 0.04,
      roughness: 0.18,
      transparent: true,
      opacity: 0.42,
      clearcoat: 0.95,
      clearcoatRoughness: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    nbi: phys("#d9dde2", { metalness: 0.78, roughness: 0.28, clearcoat: 0.22 }),
    cabinet: phys("#2c3138", { metalness: 0.4, roughness: 0.4 }),
    emissiveCyan: new THREE.MeshStandardMaterial({
      color: "#5eead4",
      emissive: "#5eead4",
      emissiveIntensity: 2.2,
      toneMapped: false,
    }),
    emissiveAmber: new THREE.MeshStandardMaterial({
      color: "#f5c56e",
      emissive: "#f5c56e",
      emissiveIntensity: 1.8,
      toneMapped: false,
    }),
    plasma: new THREE.MeshBasicMaterial({
      color: "#8fd4ff",
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    plasmaHot: new THREE.MeshBasicMaterial({
      color: "#f4f7ff",
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
    cable: phys("#1f2328", { metalness: 0.2, roughness: 0.6 }),
    tungsten: phys("#6f7378", { metalness: 0.88, roughness: 0.32, clearcoat: 0.22 }),
    scaffold: phys("#c9a66b", { metalness: 0.55, roughness: 0.42, clearcoat: 0.18 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: "#8ec5ff",
      metalness: 0.15,
      roughness: 0.12,
      transparent: true,
      opacity: 0.45,
      clearcoat: 1,
    }),
    chitin: phys("#121318", {
      metalness: 0.06,
      roughness: 0.5,
      clearcoat: 0.48,
      clearcoatRoughness: 0.34,
      sheen: 0.2,
      sheenColor: new THREE.Color("#243044"),
      iridescence: 0.1,
      iridescenceIOR: 1.22,
      envMapIntensity: 0.38,
    }),
    chitinDark: phys("#0a0b0e", {
      metalness: 0.05,
      roughness: 0.56,
      clearcoat: 0.36,
      sheen: 0.12,
      sheenColor: new THREE.Color("#1a2430"),
      envMapIntensity: 0.28,
    }),
    abdomen: phys("#161410", {
      metalness: 0.05,
      roughness: 0.52,
      clearcoat: 0.4,
      sheen: 0.14,
      sheenColor: new THREE.Color("#2a241c"),
      envMapIntensity: 0.32,
    }),
    setae: phys("#1a120c", { metalness: 0.04, roughness: 0.78, clearcoat: 0.08 }),
    larvaSkin: phys("#e4d2a4", {
      metalness: 0.04,
      roughness: 0.48,
      clearcoat: 0.55,
      sheen: 0.4,
      sheenColor: new THREE.Color("#f2e4c0"),
    }),
    pupaShell: phys("#8b5a32", { metalness: 0.18, roughness: 0.38, clearcoat: 0.7 }),
    cornea: new THREE.MeshPhysicalMaterial({
      color: "#ffd8d0",
      metalness: 0.05,
      roughness: 0.04,
      transparent: true,
      opacity: 0.2,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
    }),
    cape: phys("#1a2430", { metalness: 0.25, roughness: 0.35, clearcoat: 0.4, side: THREE.DoubleSide }),
    vein: new THREE.MeshBasicMaterial({ color: "#9bb8c8", transparent: true, opacity: 0.55 }),
    leather: phys("#4a2c1e", {
      metalness: 0.08,
      roughness: 0.62,
      sheen: 0.3,
      sheenColor: new THREE.Color("#7a4a32"),
      side: THREE.DoubleSide,
    }),
    hiVis: phys("#e0b82a", {
      metalness: 0.06,
      roughness: 0.48,
      sheen: 0.22,
      side: THREE.DoubleSide,
    }),
    labCoat: phys("#eef0ec", {
      metalness: 0.04,
      roughness: 0.55,
      sheen: 0.25,
      sheenColor: new THREE.Color("#ffffff"),
      side: THREE.DoubleSide,
    }),
    rubber: phys("#1c1c1c", { metalness: 0.05, roughness: 0.72 }),
    steel: phys("#9aa3ab", { metalness: 0.9, roughness: 0.28, clearcoat: 0.28 }),
    frost: phys("#c8d8e8", {
      metalness: 0.15,
      roughness: 0.28,
      clearcoat: 0.8,
      side: THREE.DoubleSide,
    }),
    visorDark: new THREE.MeshPhysicalMaterial({
      color: "#0c2418",
      metalness: 0.35,
      roughness: 0.06,
      transparent: true,
      opacity: 0.48,
      clearcoat: 1,
      side: THREE.DoubleSide,
    }),
    paper: phys("#efe6d2", { metalness: 0.02, roughness: 0.78, clearcoat: 0.05 }),
    wood: phys("#6b4a2e", { metalness: 0.04, roughness: 0.68 }),
    magnetRed: phys("#b03a32", { metalness: 0.25, roughness: 0.4 }),
    rust: phys("#6a3a28", { metalness: 0.22, roughness: 0.72, clearcoat: 0.08 }),
    steelDark: phys("#2a3038", { metalness: 0.86, roughness: 0.36, clearcoat: 0.18 }),
    paintGray: phys("#4e555e", { metalness: 0.28, roughness: 0.55 }),
    diamond: phys("#5a6168", { metalness: 0.45, roughness: 0.48, clearcoat: 0.3 }),
    emissiveWarm: new THREE.MeshStandardMaterial({
      color: "#f0c070",
      emissive: "#f0c070",
      emissiveIntensity: 1.6,
      toneMapped: false,
    }),
    emissiveCore: new THREE.MeshStandardMaterial({
      color: "#7cf0d8",
      emissive: "#5eead4",
      emissiveIntensity: 1.2,
      toneMapped: false,
    }),
  };
}

let flyMetals: ReturnType<typeof makeMetalPack> | null = null;

function flyMetalPack(anisotropy: number) {
  if (flyMetals) return flyMetals;
  flyMetals = makeMetalPack(anisotropy >= 8 ? 512 : 256, anisotropy);
  return flyMetals;
}

export function decorateFlyMaps(kit: Kit, anisotropy = 8) {
  const eye = eyeTexture();
  eye.repeat.set(2.6, 2.6);
  eye.anisotropy = anisotropy;
  kit.eye.map = eye;
  kit.eye.needsUpdate = true;
  const thorax = thoraxTexture();
  thorax.anisotropy = anisotropy;
  kit.chitin.map = thorax;
  const bump = chitinBumpTexture();
  bump.anisotropy = anisotropy;
  kit.chitin.bumpMap = bump;
  kit.chitin.bumpScale = 0.016;
  kit.chitin.needsUpdate = true;
  const ab = abdomenTexture();
  ab.anisotropy = anisotropy;
  kit.abdomen.map = ab;
  kit.abdomen.bumpMap = bump;
  kit.abdomen.bumpScale = 0.012;
  kit.abdomen.needsUpdate = true;
  const wing = wingTexture();
  wing.anisotropy = anisotropy;
  kit.wing.map = wing;
  kit.wing.needsUpdate = true;
  const metals = flyMetalPack(anisotropy);
  const brush = metals.brushBump;
  bindMap(kit.steel, metals.steel, metals.steelRough, brush, 0.08, metals.steelMetal);
  bindMap(kit.steelDark, metals.steel, metals.steelRough, brush, 0.07, metals.steelMetal);
  bindMap(kit.tungsten, metals.steel, metals.steelRough, brush, 0.05, metals.steelMetal);
  bindMap(kit.vessel, metals.steel, metals.steelRough, brush, 0.04, metals.steelMetal);
  bindMap(kit.vesselDark, metals.steel, metals.steelRough, brush, 0.05, metals.steelMetal);
  bindMap(kit.nbi, metals.steel, metals.steelRough, brush, 0.04, metals.steelMetal);
  bindMap(kit.copper, metals.copper, metals.copperRough, brush, 0.06, metals.copperMetal);
  bindMap(kit.copperBright, metals.copper, metals.copperRough, brush, 0.05, metals.copperMetal);
  bindMap(kit.coil, metals.copper, metals.copperRough, brush, 0.04, metals.copperMetal);
  bindMap(kit.crane, undefined, metals.steelRough, brush, 0.06, metals.steelMetal);
  bindMap(kit.craneDark, undefined, metals.steelRough, brush, 0.05, metals.steelMetal);
  bindMap(kit.scaffold, undefined, metals.steelRough, brush, 0.07, metals.steelMetal);
  for (const m of [kit.coil, kit.coilCase, kit.cabinet, kit.nbi, kit.tungsten, kit.plasticWhite]) {
    m.side = THREE.DoubleSide;
  }
}

function bindMap(
  mat: THREE.MeshPhysicalMaterial,
  map: THREE.Texture | undefined,
  rough?: THREE.Texture,
  bump?: THREE.Texture,
  bumpScale = 0,
  metal?: THREE.Texture,
) {
  if (map) mat.map = map;
  if (rough) mat.roughnessMap = rough;
  if (metal) mat.metalnessMap = metal;
  if (bump) {
    mat.bumpMap = bump;
    mat.bumpScale = bumpScale;
  }
  mat.needsUpdate = true;
}

/** Bind shared hall/reactor surface maps. Cheap on low (no bump). */
export function applySurfMaps(kit: Kit, pack: SurfPack) {
  const s = pack.bumpScale;
  const bump = s > 0 ? (pack.brushBump ?? pack.bump) : undefined;
  bindMap(kit.concrete, pack.concrete, pack.concreteRough, pack.bump, s);
  bindMap(kit.steel, pack.steel, pack.steelRough, bump, s * 0.55, pack.steelMetal);
  bindMap(kit.steelDark, pack.steel, pack.steelRough, bump, s * 0.5, pack.steelMetal);
  bindMap(kit.copper, pack.copper, pack.copperRough, bump, s * 0.4, pack.copperMetal);
  bindMap(kit.copperBright, pack.copper, pack.copperRough, bump, s * 0.35, pack.copperMetal);
  bindMap(kit.diamond, pack.diamond, pack.steelRough, bump, s * 0.7, pack.steelMetal);
  bindMap(kit.rust, pack.rust, pack.concreteRough, pack.bump, s * 0.8);
  bindMap(kit.paintGray, pack.paint, pack.steelRough, bump, s * 0.25, pack.steelMetal);
  bindMap(kit.coil, pack.copper, pack.copperRough, bump, s * 0.28, pack.copperMetal);
  bindMap(kit.coilCase, pack.paint, pack.steelRough, bump, s * 0.25, pack.steelMetal);
  bindMap(kit.vessel, pack.steel, pack.steelRough, bump, s * 0.22, pack.steelMetal);
  bindMap(kit.vesselDark, pack.steel, pack.steelRough, bump, s * 0.26, pack.steelMetal);
  bindMap(kit.nbi, pack.paint, pack.steelRough, bump, s * 0.22, pack.steelMetal);
  bindMap(kit.cabinet, pack.paint, pack.steelRough, bump, s * 0.22, pack.steelMetal);
  bindMap(kit.scaffold, pack.paint, pack.steelRough, bump, s * 0.32, pack.steelMetal);
  bindMap(kit.tungsten, pack.steel, pack.steelRough, bump, s * 0.2, pack.steelMetal);
  bindMap(kit.crane, undefined, pack.steelRough, bump, s * 0.3, pack.steelMetal);
  bindMap(kit.craneDark, undefined, pack.steelRough, bump, s * 0.28, pack.steelMetal);
  bindMap(kit.floor, pack.hallFloor, pack.hallFloorRough, pack.bump, s * 0.5);
}

export function disposeKit(kit: Kit) {
  for (const m of Object.values(kit)) m.dispose();
}
