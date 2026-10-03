import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { CORE_POS, R0, Y0 } from "@/lib/constants";
import { growthFromEth } from "@/lib/growth";
import { useSim } from "@/lib/store";
import { useCi } from "@/lib/ci-store";
import { createKit, disposeKit, applySurfMaps } from "./materials";
import { useGfx } from "./gfx";

const FEEDERS = 4;
const MAX_EXTRA = 14;

function makeFeeder(i: number, n: number, height: number, radius: number) {
  const a = (i / Math.max(1, n)) * Math.PI * 2 + 0.18;
  const start = new THREE.Vector3(
    Math.cos(a) * (R0 + 1.02),
    Y0 - 0.22 + (i % 3) * 0.16,
    Math.sin(a) * (R0 + 1.02),
  );
  const midA = new THREE.Vector3(Math.cos(a) * 5.35, 0.28 + (i % 4) * 0.16, Math.sin(a) * 5.35);
  const midB = new THREE.Vector3(
    start.x * 0.22 + CORE_POS.x * 0.78,
    0.2 + (i % 5) * 0.12,
    start.z * 0.22 + CORE_POS.z * 0.78,
  );
  const end = new THREE.Vector3(
    CORE_POS.x + Math.cos(a + 0.4) * (0.28 + radius * 0.15),
    0.48 + (i % 6) * 0.11 + height * 0.1,
    CORE_POS.z + Math.sin(a + 0.4) * (0.28 + radius * 0.15),
  );
  const curve = new THREE.CatmullRomCurve3([start, midA, midB, end]);
  return new THREE.TubeGeometry(curve, 48, 0.055 + (i % 3) * 0.012, 6, false);
}

export function GrowthCore() {
  const { maps } = useGfx();
  const kit = useMemo(() => createKit(), []);
  const eth = useSim((s) => s.contributedEth);
  const shown = useRef(eth);
  const group = useRef<THREE.Group>(null);
  const heart = useRef<THREE.Mesh>(null);
  const glass = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const ring = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);
  const extras = useRef<THREE.Group>(null);

  useLayoutEffect(() => {
    if (maps) applySurfMaps(kit, maps);
  }, [kit, maps]);
  useLayoutEffect(() => () => disposeKit(kit), [kit]);

  const feederGeos = useMemo(() => {
    const g0 = growthFromEth(0);
    return Array.from({ length: FEEDERS }, (_, i) => makeFeeder(i, FEEDERS, g0.height, g0.radius));
  }, []);

  const extraGeos = useMemo(() => {
    return Array.from({ length: MAX_EXTRA }, (_, i) => makeFeeder(i + FEEDERS, FEEDERS + MAX_EXTRA, 1.4, 0.5));
  }, []);

  useLayoutEffect(
    () => () => {
      for (const geo of feederGeos) geo.dispose();
      for (const geo of extraGeos) geo.dispose();
    },
    [feederGeos, extraGeos],
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const goal = useSim.getState().contributedEth;
    shown.current += (goal - shown.current) * (1 - Math.exp(-2.4 * dt));
    const g = growthFromEth(shown.current);
    const glowAdd = useCi.getState().world.glowAdd;
    const t = performance.now() / 1000;
    if (group.current) {
      group.current.scale.setScalar(1);
    }
    if (heart.current) {
      const mat = heart.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = (g.glow + glowAdd) * (1 + Math.sin(t * (1.4 + g.pulse * 0.4)) * 0.22);
      heart.current.scale.setScalar(0.95 + g.scale * 0.18 + Math.sin(t * 2.1) * 0.05);
      heart.current.position.y = Math.max(0.55, g.height * 0.45);
    }
    if (glass.current) {
      glass.current.scale.set(1, g.height / 1.18, 1);
      glass.current.position.y = g.height * 0.5;
    }
    if (light.current) {
      light.current.intensity = 2.4 + g.glow * 2.2 + glowAdd * 1.8;
      light.current.distance = 8 + g.scale * 5;
      light.current.position.y = 0.8 + g.height * 0.45;
    }
    if (ring.current) {
      ring.current.rotation.y = t * 0.45;
      ring.current.position.y = 0.42 + g.height * 0.08;
    }
    if (halo.current) {
      const mat = halo.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.16 + Math.min(0.22, g.glow * 0.04) + Math.sin(t * 2.4) * 0.03;
      halo.current.position.y = g.height * 0.48;
      halo.current.scale.setScalar(1.08 + Math.sin(t * 1.6) * 0.05);
    }
    if (extras.current) {
      const n = Math.min(MAX_EXTRA, Math.max(0, g.wires - 2));
      extras.current.children.forEach((ch, i) => {
        ch.visible = i < n;
      });
    }
  });

  const g0 = growthFromEth(eth);
  const modules = Array.from({ length: Math.max(2, g0.modules) }, (_, i) => {
    const a = (i / Math.max(1, Math.max(2, g0.modules))) * Math.PI * 2 + 0.2;
    const r = 0.78 + (i % 3) * 0.14;
    return {
      key: i,
      pos: [Math.cos(a) * r, 0.42 + (i % 4) * 0.32, Math.sin(a) * r] as [number, number, number],
      rot: [0, -a, 0] as [number, number, number],
    };
  });

  const sockets = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2 + 0.12;
    return {
      key: i,
      pos: [Math.cos(a) * 1.18, 0.38, Math.sin(a) * 1.18] as [number, number, number],
      rot: [0, -a, 0] as [number, number, number],
    };
  });

  return (
    <group position={[CORE_POS.x, CORE_POS.y, CORE_POS.z]}>
      <mesh position={[0, 0.07, 0]} material={kit.steelDark}>
        <cylinderGeometry args={[1.35, 1.55, 0.14, 18]} />
      </mesh>
      <mesh position={[0, 0.16, 0]} material={kit.caution}>
        <cylinderGeometry args={[1.22, 1.22, 0.06, 18]} />
      </mesh>
      {sockets.map((s) => (
        <group key={s.key} position={s.pos} rotation={s.rot}>
          <mesh material={kit.coilCase}>
            <boxGeometry args={[0.22, 0.28, 0.16]} />
          </mesh>
          <mesh position={[0.12, 0.04, 0]} material={kit.emissiveCore}>
            <cylinderGeometry args={[0.03, 0.04, 0.1, 8]} />
          </mesh>
        </group>
      ))}
      <group ref={group}>
        <mesh ref={glass} position={[0, 0.5, 0]} material={kit.glass}>
          <cylinderGeometry args={[0.42, 0.48, 1, 22]} />
        </mesh>
        <mesh ref={heart} position={[0, 0.62, 0]} material={kit.emissiveCore}>
          <icosahedronGeometry args={[0.26, 1]} />
        </mesh>
        <mesh ref={halo} position={[0, 0.7, 0]}>
          <sphereGeometry args={[0.55, 16, 12]} />
          <meshBasicMaterial color="#7cf0d8" transparent opacity={0.22} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh ref={ring} position={[0, 0.48, 0]} material={kit.copperBright}>
          <torusGeometry args={[0.58, 0.05, 8, 28]} />
        </mesh>
        <mesh position={[0, 1.05, 0]} material={kit.copper}>
          <torusGeometry args={[0.44, 0.045, 8, 22]} />
        </mesh>
        <mesh position={[0, 0.3, 0]} material={kit.coilCase}>
          <cylinderGeometry args={[0.54, 0.62, 0.24, 14]} />
        </mesh>
        {modules.map((m) => (
          <mesh key={m.key} position={m.pos} rotation={m.rot} material={kit.cabinet}>
            <boxGeometry args={[0.3, 0.24, 0.2]} />
          </mesh>
        ))}
      </group>
      <pointLight ref={light} position={[0, 1.35, 0]} color="#7cf0d8" intensity={3.4} distance={10} />
      {feederGeos.map((geo, i) => (
        <mesh
          key={`f${i}`}
          geometry={geo}
          position={[-CORE_POS.x, -CORE_POS.y, -CORE_POS.z]}
          material={i % 2 === 0 ? kit.copperBright : kit.emissiveCore}
        />
      ))}
      <group ref={extras}>
        {extraGeos.map((geo, i) => (
          <mesh
            key={`e${i}`}
            geometry={geo}
            position={[-CORE_POS.x, -CORE_POS.y, -CORE_POS.z]}
            material={i % 3 === 0 ? kit.copper : kit.cable}
            visible={i < Math.max(0, g0.wires - 2)}
          />
        ))}
      </group>
    </group>
  );
}
