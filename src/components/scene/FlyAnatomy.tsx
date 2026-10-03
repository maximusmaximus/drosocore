import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { RoleId } from "@/lib/roles";
import type { StageId } from "@/lib/tiers";
import { GEO } from "./fly-geo";
import { Gear } from "./fly-kit";
import { FlyBodyModel, type AnatomyLive } from "./FlyModel";
import type { Kit } from "./materials";
import { GEAR_FIT, GEAR_POS } from "@/lib/fly-view";

export type { AnatomyLive };

function Larva({ kit }: { kit: Kit }) {
  return (
    <group rotation={[0.15, 0, 0]}>
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh
          key={i}
          geometry={GEO.larvaSeg}
          material={i % 2 ? kit.chitinDark : kit.larvaSkin}
          position={[0, 0, 0.14 - i * 0.055]}
          scale={[0.85 - i * 0.04, 0.7, 0.7]}
        />
      ))}
      <mesh material={kit.setae} position={[0.02, 0.02, 0.175]} rotation={[0.6, 0, 0.3]}>
        <cylinderGeometry args={[0.004, 0.002, 0.04, 4]} />
      </mesh>
      <mesh material={kit.setae} position={[-0.02, 0.02, 0.175]} rotation={[0.6, 0, -0.3]}>
        <cylinderGeometry args={[0.004, 0.002, 0.04, 4]} />
      </mesh>
    </group>
  );
}

function Pupa({ kit }: { kit: Kit }) {
  return (
    <group>
      <mesh geometry={GEO.pupa} material={kit.pupaShell} scale={[0.11, 0.1, 0.2]} />
      <mesh material={kit.chitinDark} position={[0.04, 0.06, 0.12]} rotation={[-0.5, 0.3, 0]}>
        <cylinderGeometry args={[0.012, 0.008, 0.05, 6]} />
      </mesh>
      <mesh material={kit.chitinDark} position={[-0.04, 0.06, 0.12]} rotation={[-0.5, -0.3, 0]}>
        <cylinderGeometry args={[0.012, 0.008, 0.05, 6]} />
      </mesh>
      {[0, 1, 2, 3].map((k) => (
        <mesh
          key={k}
          material={kit.chitinDark}
          position={[0, 0, 0.06 - k * 0.055]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[1, 1, 0.6]}
        >
          <torusGeometry args={[0.09 - k * 0.008, 0.006, 6, 16]} />
        </mesh>
      ))}
    </group>
  );
}

export function FlyAnatomy({
  kit,
  roleId,
  accentHex,
  stage = "imago",
  detail = "lod",
  seed: _seed = 1,
  flap = 18,
  phase = 0,
  working = false,
  live,
}: {
  kit: Kit;
  roleId: RoleId;
  accentHex: string;
  stage?: StageId;
  detail?: "lod" | "hero";
  seed?: number;
  flap?: number;
  phase?: number;
  working?: boolean;
  live?: AnatomyLive;
}) {
  const sparks = useRef<THREE.Group>(null);
  const group = useRef<THREE.Group>(null);
  const gear = useRef<THREE.Group>(null);
  const accent = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: accentHex,
        metalness: 0.42,
        roughness: 0.32,
        clearcoat: 0.55,
        envMapIntensity: 0.55,
      }),
    [accentHex],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (stage === "larva" || stage === "pupa") {
      if (group.current) {
        group.current.rotation.z = Math.sin(t * (stage === "larva" ? 6 : 2) + phase) * (stage === "larva" ? 0.18 : 0.05);
        const s = stage === "pupa" ? 1 + Math.sin(t * 2 + phase) * 0.03 : 1;
        group.current.scale.setScalar(s);
      }
      return;
    }
    const motor = live;
    if (sparks.current) {
      const on = Boolean(motor?.working ?? working);
      sparks.current.visible = on;
      if (on) sparks.current.rotation.x = t * 9;
    }
    const skill = motor?.skill ?? 0;
    if (gear.current) {
      const g = GEAR_FIT * (0.84 + skill * 0.32);
      gear.current.scale.setScalar(g);
      gear.current.rotation.z = (motor?.grasp ?? 0) * 0.18 * Math.sin(t * 6 + phase);
    }
  });

  const adult = stage !== "larva" && stage !== "pupa";

  return (
    <group ref={group}>
      {stage === "larva" ? <Larva kit={kit} /> : null}
      {stage === "pupa" ? <Pupa kit={kit} /> : null}
      {adult ? (
        <>
          <FlyBodyModel live={live} phase={phase} flap={flap} />
          <mesh material={accent} position={[0.018, 0.082, 0.04]} rotation={[0.15, -0.2, 0]}>
            <boxGeometry args={[0.022, 0.016, 0.003]} />
          </mesh>
          <mesh material={kit.plasticWhite} position={[0.018, 0.082, 0.042]} rotation={[0.15, -0.2, 0]}>
            <boxGeometry args={[0.014, 0.008, 0.002]} />
          </mesh>
          <group ref={gear} position={GEAR_POS} scale={GEAR_FIT}>
            <Gear id={roleId} kit={kit} stage={stage} detail={detail} />
          </group>
        </>
      ) : null}
      <group ref={sparks} position={[0.09, 0.05, 0.16]} visible={false}>
        {Array.from({ length: 6 }).map((_, i) => (
          <mesh key={i} position={[(i % 3) * 0.02, (i % 2) * 0.016, i * 0.008]} material={kit.emissiveAmber}>
            <octahedronGeometry args={[0.012, 0]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

