import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { legCycle } from "@/lib/fly-gait";
import { chitinBumpTexture, eyeTexture } from "./fly-geo";

export type AnatomyLive = {
  flap: number;
  working: boolean;
  gait?: number;
  headYaw?: number;
  abdomen?: number;
  grasp?: number;
  airborne?: number;
  skill?: number;
  antennal?: number;
  roll?: number;
};

export const FLY_GLB = "/models/drosophila.glb?v=shade2";

const LEGS = [
  "T1_right",
  "T2_right",
  "T3_right",
  "T1_left",
  "T2_left",
  "T3_left",
] as const;

const TRIPOD = [0, Math.PI, 0, Math.PI, 0, Math.PI];

type NodeMap = Record<string, THREE.Object3D>;

function collect(root: THREE.Object3D): NodeMap {
  const map: NodeMap = {};
  root.traverse((o) => {
    if (o.name) map[o.name] = o;
  });
  return map;
}

const BODY = new THREE.Color("#14151a");
const ABDOMEN = new THREE.Color("#1c1914");
const EYE = new THREE.Color("#c21818");
const WING = new THREE.Color("#c5cdd4");
const SHEEN = new THREE.Color("#243044");

/** Keep chitin highlights cool so shop lamps don't turn the flies gold. */
function coolSpec(shader: { fragmentShader: string }) {
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <lights_physical_fragment>",
    `#include <lights_physical_fragment>
material.specularColor *= vec3(0.72, 0.86, 1.08);`,
  );
}

type FlySkin = {
  body: THREE.MeshPhysicalMaterial;
  abdomen: THREE.MeshPhysicalMaterial;
  eye: THREE.MeshPhysicalMaterial;
  wing: THREE.MeshPhysicalMaterial;
};

let skin: FlySkin | null = null;

function flySkin(): FlySkin {
  if (skin) return skin;
  const bump = chitinBumpTexture();
  const facets = eyeTexture();
  const body = new THREE.MeshPhysicalMaterial({
    name: "chitin",
    color: BODY,
    metalness: 0.06,
    roughness: 0.46,
    clearcoat: 0.58,
    clearcoatRoughness: 0.28,
    sheen: 0.22,
    sheenColor: SHEEN,
    iridescence: 0.12,
    iridescenceIOR: 1.24,
    envMapIntensity: 0.42,
    bumpMap: bump,
    bumpScale: 0.018,
  });
  body.onBeforeCompile = coolSpec;
  const abdomen = new THREE.MeshPhysicalMaterial({
    name: "abdomen",
    color: ABDOMEN,
    metalness: 0.05,
    roughness: 0.52,
    clearcoat: 0.46,
    clearcoatRoughness: 0.34,
    sheen: 0.16,
    sheenColor: new THREE.Color("#2a241c"),
    envMapIntensity: 0.34,
    bumpMap: bump,
    bumpScale: 0.014,
  });
  abdomen.onBeforeCompile = coolSpec;
  const eye = new THREE.MeshPhysicalMaterial({
    name: "red",
    color: EYE,
    metalness: 0.04,
    roughness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    envMapIntensity: 0.7,
    bumpMap: facets,
    bumpScale: 0.045,
  });
  const wing = new THREE.MeshPhysicalMaterial({
    name: "membrane",
    color: WING,
    metalness: 0.02,
    roughness: 0.16,
    transparent: true,
    opacity: 0.38,
    side: THREE.DoubleSide,
    depthWrite: false,
    clearcoat: 0.85,
    clearcoatRoughness: 0.12,
    iridescence: 0.28,
    iridescenceIOR: 1.18,
    envMapIntensity: 0.45,
  });
  skin = { body, abdomen, eye, wing };
  return skin;
}

function polish(root: THREE.Object3D) {
  const mats = flySkin();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const list = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as THREE.Material[];
    const next: THREE.Material[] = [];
    for (const src of list) {
      const name = `${src?.name ?? ""} ${mesh.name ?? ""}`.toLowerCase();
      if (name.includes("red") || name.includes("eye")) next.push(mats.eye);
      else if (name.includes("membrane") && !name.includes("brown")) next.push(mats.wing);
      else next.push(name.includes("lower") ? mats.abdomen : mats.body);
    }
    mesh.material = next.length === 1 ? next[0] : next;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = true;
  });
}

export function FlyBodyModel({
  live,
  phase,
  flap = 18,
}: {
  live?: AnatomyLive;
  phase: number;
  flap?: number;
}) {
  const gltf = useGLTF(FLY_GLB);
  const root = useMemo(() => {
    polish(gltf.scene);
    return gltf.scene.clone(true);
  }, [gltf]);
  const nodes = useMemo(() => collect(root), [root]);
  const coxae = useRef<(THREE.Object3D | undefined)[]>([]);
  const femurs = useRef<(THREE.Object3D | undefined)[]>([]);
  const tibias = useRef<(THREE.Object3D | undefined)[]>([]);

  useLayoutEffect(() => {
    coxae.current = LEGS.map((id) => nodes[`Coxa_${id}Anim`]);
    femurs.current = LEGS.map((id) => nodes[`Femur_${id}Anim`]);
    tibias.current = LEGS.map((id) => nodes[`Tibia_${id}Anim`]);
  }, [nodes]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const motor = live;
    const rate = motor?.flap ?? flap;
    const airborne = motor?.airborne ?? 0;
    const flight = THREE.MathUtils.clamp(airborne, 0, 1);
    const beat = t * rate + phase;
    const stroke = Math.sin(beat);
    const twist = Math.cos(beat);
    const fig8 = Math.sin(beat * 2);
    const amp = flight * 1.32;
    const folded = 1 - flight;

    const wingL = nodes.WingLAnim;
    const wingR = nodes.WingRAnim;
    if (wingL) {
      wingL.rotation.order = "ZYX";
      wingL.rotation.z = stroke * amp;
      wingL.rotation.x = twist * 0.64 * flight - folded * 0.62;
      wingL.rotation.y = fig8 * 0.3 * flight;
    }
    if (wingR) {
      wingR.rotation.order = "ZYX";
      wingR.rotation.z = -stroke * amp;
      wingR.rotation.x = twist * 0.64 * flight - folded * 0.62;
      wingR.rotation.y = -fig8 * 0.3 * flight;
    }

    const head = nodes.HeadAnim;
    if (head) {
      head.rotation.y = motor?.headYaw ?? 0;
      head.rotation.x = (motor?.grasp ?? 0) * 0.18;
    }
    const abdomen = nodes.AbdomenAnim;
    if (abdomen) {
      abdomen.rotation.x = (motor?.abdomen ?? 0) * 0.4 + Math.sin(t * 5.4 + phase) * 0.03 * (1 - flight);
    }

    const haltRate = 2 + airborne * 48;
    const haltSwing = 0.02 + airborne * 1.05;
    if (nodes.HaltLAnim) nodes.HaltLAnim.rotation.x = Math.sin(t * haltRate + phase) * haltSwing;
    if (nodes.HaltRAnim) nodes.HaltRAnim.rotation.x = Math.sin(t * haltRate + phase + 0.4) * haltSwing;

    const ant = motor?.antennal ?? 0.12;
    if (nodes.AntLAnim) {
      nodes.AntLAnim.rotation.x = Math.sin(t * (7 + ant * 8) + phase) * (0.08 + ant * 0.22);
      nodes.AntLAnim.rotation.z = Math.sin(t * 5 + phase) * 0.06;
    }
    if (nodes.AntRAnim) {
      nodes.AntRAnim.rotation.x = Math.sin(t * (7 + ant * 8) + phase + 1.1) * (0.08 + ant * 0.22);
      nodes.AntRAnim.rotation.z = -Math.sin(t * 5 + phase) * 0.06;
    }

    const gait = motor?.gait ?? 0;
    const tuck = THREE.MathUtils.smoothstep(airborne, 0.22, 0.72);
    const walking = gait > 0.7 && tuck < 0.5;
    const grooming = Boolean(motor?.working) && !walking && tuck < 0.35;
    for (let i = 0; i < LEGS.length; i++) {
      const coxa = coxae.current[i];
      const femur = femurs.current[i];
      const tibia = tibias.current[i];
      if (!coxa) continue;
      const side = i < 3 ? 1 : -1;
      const seg = i % 3;
      if (grooming) {
        if (seg === 0) {
          const wipe = Math.sin(t * 8.2 + phase + side);
          coxa.rotation.x = 0.62 + wipe * 0.72;
          coxa.rotation.y = side * (0.18 + wipe * 0.12);
          coxa.rotation.z = side * 0.16;
          if (femur) femur.rotation.x = 0.55 + Math.max(0, wipe) * 0.85;
          if (tibia) tibia.rotation.x = 0.2 + Math.max(0, wipe) * 0.45;
        } else if (seg === 2) {
          const rub = Math.sin(t * 6.4 + phase);
          coxa.rotation.x = -0.22 + rub * 0.28;
          coxa.rotation.y = side * 0.1;
          coxa.rotation.z = side * 0.18;
          if (femur) femur.rotation.x = 0.22 + Math.max(0, -rub) * 0.4;
          if (tibia) tibia.rotation.x = 0.12;
        } else {
          coxa.rotation.x = 0.04;
          coxa.rotation.y = side * 0.08;
          coxa.rotation.z = side * 0.1;
          if (femur) femur.rotation.x = 0.12;
          if (tibia) tibia.rotation.x = 0.08;
        }
        continue;
      }
      if (!walking) {
        const breathe = Math.sin(t * 2.05 + TRIPOD[i] + phase) * 0.025 * (1 - tuck);
        coxa.rotation.x = breathe + tuck * 0.82;
        coxa.rotation.y = side * (0.05 + tuck * 0.14);
        coxa.rotation.z = side * (0.07 + tuck * 0.32);
        if (femur) femur.rotation.x = 0.1 * (1 - tuck) + tuck * 1.12;
        if (tibia) tibia.rotation.x = 0.06 * (1 - tuck) + tuck * 0.68;
        continue;
      }
      const strideAmp = seg === 0 ? 1.16 : seg === 1 ? 0.94 : 0.82;
      const step = legCycle(t, gait, phase, TRIPOD[i]);
      const lift = step.swinging ? Math.sin(step.swingU * Math.PI) : 0;
      const stride = step.swinging ? -0.68 + step.swingU * 1.36 : 0.68 - step.stanceU * 1.36;
      coxa.rotation.x = stride * 0.58 * strideAmp;
      coxa.rotation.y = side * stride * 0.2;
      coxa.rotation.z = side * (0.09 + lift * 0.14);
      if (femur) femur.rotation.x = 0.06 + lift * 1.08;
      if (tibia) tibia.rotation.x = step.swinging ? 0.1 + lift * 0.62 : 0.03;
    }
  });

  return <primitive object={root} />;
}

useGLTF.preload(FLY_GLB);
