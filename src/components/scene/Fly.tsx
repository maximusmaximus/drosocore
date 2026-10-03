import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import type { CargoKind, FlyState } from "@/lib/fly-sim";
import { FLY_SCALE, flyPlantY } from "@/lib/fly-view";
import { strideOmega } from "@/lib/fly-gait";
import { playClick } from "@/lib/audio";
import { recentlyPinched } from "@/lib/cam-focus";
import { useAds } from "@/lib/ads-store";
import { useSim } from "@/lib/store";
import { gearForRole } from "@/lib/ci";
import { useCi } from "@/lib/ci-store";
import { FlyAnatomy } from "./FlyAnatomy";
import { CiKit } from "./fly-kit";
import { useGfx } from "./gfx";
import type { Kit } from "./materials";

const CARGO_KINDS: CargoKind[] = ["cable", "coil", "crate", "pipe", "tile", "dewar"];

function CargoBit({ kind, kit }: { kind: CargoKind; kit: Kit }) {
  const pos: [number, number, number] = [0.04, 0.02, 0.15];
  switch (kind) {
    case "cable":
      return (
        <mesh position={pos} rotation={[0.6, 0.2, 0.4]} material={kit.cable}>
          <torusGeometry args={[0.085, 0.022, 6, 12]} />
        </mesh>
      );
    case "coil":
      return (
        <mesh position={pos} rotation={[0.5, 0, 0.3]} material={kit.coil}>
          <torusGeometry args={[0.08, 0.026, 6, 12]} />
        </mesh>
      );
    case "crate":
      return (
        <mesh position={pos} material={kit.caution}>
          <boxGeometry args={[0.14, 0.11, 0.14]} />
        </mesh>
      );
    case "pipe":
      return (
        <mesh position={pos} rotation={[0.2, 0, 1.1]} material={kit.copper}>
          <cylinderGeometry args={[0.028, 0.028, 0.32, 7]} />
        </mesh>
      );
    case "tile":
      return (
        <mesh position={pos} rotation={[0.4, 0.2, 0]} material={kit.tungsten}>
          <boxGeometry args={[0.16, 0.03, 0.12]} />
        </mesh>
      );
    case "dewar":
      return (
        <mesh position={pos} material={kit.frost}>
          <cylinderGeometry args={[0.042, 0.05, 0.18, 8]} />
        </mesh>
      );
    default:
      return null;
  }
}

function CargoVis({
  kind,
  stateRef,
  index,
  kit,
}: {
  kind: CargoKind;
  stateRef: MutableRefObject<FlyState[]>;
  index: number;
  kit: Kit;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    g.visible = stateRef.current[index].cargo === kind;
  });
  return (
    <group ref={ref} visible={stateRef.current[index].cargo === kind} scale={0.62}>
      <CargoBit kind={kind} kit={kit} />
    </group>
  );
}

export function FlyMesh({
  stateRef,
  index,
  kit,
}: {
  stateRef: MutableRefObject<FlyState[]>;
  index: number;
  kit: Kit;
}) {
  const group = useRef<THREE.Group>(null);
  const prevYaw = useRef(stateRef.current[index].yaw);
  const roll = useRef(0);
  const { profile } = useGfx();
  const detail = profile.extraDetail ? "hero" : "lod";
  const role = stateRef.current[index].role;
  const live = useMemo(
    () => ({
      flap: 22,
      working: false,
      gait: 0,
      headYaw: 0,
      abdomen: 0,
      grasp: 0,
      airborne: 0,
      skill: 0.08,
      antennal: 0.12,
      roll: 0,
    }),
    [],
  );
  const s0 = stateRef.current[index];
  const world = useCi((s) => s.world);
  const upgrade = gearForRole(world, role.id);

  useFrame(({ clock }, delta) => {
    const s = stateRef.current[index];
    const g = group.current;
    if (!s || !g) return;
    const dt = Math.min(delta, 0.1);
    const air = s.brain.motor.airborne;
    const gait = s.brain.motor.gait;
    const omega = strideOmega(gait);
    const plant = Math.max(0, Math.sin(clock.elapsedTime * omega + s.phase));
    const hover = air > 0.4 ? Math.sin(clock.elapsedTime * 22 + s.phase) * 0.07 * air : 0;
    const walkBob = air < 0.3 && gait > 0.7 ? plant * 0.072 - 0.018 : Math.sin(clock.elapsedTime * 2.1 + s.phase) * 0.005;
    const workBob = s.mode === "work" ? Math.sin(clock.elapsedTime * 8.5 + s.phase) * 0.016 : 0;
    g.position.set(s.pos.x, flyPlantY(s.pos.y) + hover + walkBob + workBob, s.pos.z);
    g.rotation.order = "YXZ";
    g.rotation.y = s.yaw;
    const flapPitch = air * Math.sin(clock.elapsedTime * Math.max(18, s.brain.motor.flap * 0.16) + s.phase) * 0.035;
    g.rotation.x = s.pitch + flapPitch;

    let dyaw = s.yaw - prevYaw.current;
    if (dyaw > Math.PI) dyaw -= Math.PI * 2;
    if (dyaw < -Math.PI) dyaw += Math.PI * 2;
    prevYaw.current = s.yaw;
    const yawRate = dyaw / Math.max(dt, 1e-4);
    const rollGain = air > 0.4 ? 0.1 : 0.035;
    const wantRoll = THREE.MathUtils.clamp(-yawRate * rollGain, air > 0.4 ? -0.95 : -0.22, air > 0.4 ? 0.95 : 0.22);
    roll.current = THREE.MathUtils.damp(roll.current, wantRoll, air > 0.4 ? 7 : 14, dt);
    const tripodRoll = air < 0.3 && gait > 0.7 ? Math.sin(clock.elapsedTime * omega + s.phase) * 0.14 : 0;

    if (s.mode === "dance") {
      g.rotation.z = roll.current + Math.sin(clock.elapsedTime * 14 + s.phase) * 0.45;
    } else if (s.mode === "work") {
      g.rotation.z = roll.current + Math.sin(clock.elapsedTime * 5 + s.phase) * 0.04;
    } else {
      const cargoLean = s.cargo && air < 0.3 ? 0.1 : 0;
      g.rotation.z = roll.current + tripodRoll + cargoLean;
    }
    live.flap = s.brain.motor.flap;
    live.working = s.mode === "work";
    live.gait = s.brain.motor.gait;
    live.headYaw = s.brain.motor.headYaw;
    live.abdomen = s.brain.motor.abdomen;
    live.grasp = s.brain.motor.grasp;
    live.airborne = s.brain.motor.airborne;
    live.skill = s.brain.skill;
    live.antennal = s.brain.motor.antennal;
    live.roll = roll.current;
  });

  return (
    <group
      ref={group}
      scale={FLY_SCALE}
      onClick={(e) => {
        e.stopPropagation();
        if (recentlyPinched()) return;
        playClick();
        const s = stateRef.current[index];
        const cur = useSim.getState().selected;
        useAds.getState().closeComposer();
        if (cur?.index === index) useSim.getState().select(null);
        else useSim.getState().select({ index, role: s.role, seed: s.seed, name: s.name });
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        useSim.getState().setHovered(index);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        useSim.getState().setHovered(null);
        document.body.style.cursor = "";
      }}
    >
      <FlyAnatomy
        kit={kit}
        roleId={role.id}
        accentHex={role.accent}
        stage="imago"
        detail={detail}
        seed={s0.seed}
        phase={s0.phase}
        live={live}
      />
      <CiKit gear={upgrade} kit={kit} />
      {CARGO_KINDS.map((k) => (
        <CargoVis key={k} kind={k} stateRef={stateRef} index={index} kit={kit} />
      ))}
      <mesh>
        <sphereGeometry args={[0.34, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
