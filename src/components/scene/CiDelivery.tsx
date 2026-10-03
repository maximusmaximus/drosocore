import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ROLES } from "@/lib/roles";
import { courierOffset, cratePose, CRANE_HOOK, destFor, DELIVERY_TOTAL, phaseAt } from "@/lib/ci-delivery";
import { useCi } from "@/lib/ci-store";
import { FlyAnatomy } from "./FlyAnatomy";
import { createKit, decorateFlyMaps, disposeKit } from "./materials";

function Courier({
  side,
  kit,
}: {
  side: -1 | 1;
  kit: ReturnType<typeof createKit>;
}) {
  const g = useRef<THREE.Group>(null);
  const live = useMemo(
    () => ({
      flap: 96,
      working: false,
      gait: 0,
      headYaw: 0,
      abdomen: 0.08,
      grasp: 0.7,
      airborne: 1,
      skill: 0.4,
      antennal: 0.5,
    }),
    [],
  );
  const role = ROLES[side < 0 ? 4 : 8];
  useFrame(() => {
    const job = useCi.getState().delivery;
    const el = g.current;
    if (!job || !el) {
      if (el) el.visible = false;
      return;
    }
    const elapsed = (Date.now() - job.startedAt) / 1000;
    const dest = destFor(job.kind, job.visual);
    const crate = cratePose(elapsed, dest);
    const p = courierOffset(elapsed, side, crate);
    el.visible = crate.visible;
    el.position.set(p.x, p.y, p.z);
    el.lookAt(crate.x, crate.y, crate.z);
    el.rotateY(Math.PI);
    live.airborne = p.airborne;
    live.flap = p.airborne > 0.4 ? 108 : 10;
    live.gait = p.airborne > 0.4 ? 0 : 6;
  });
  return (
    <group ref={g} scale={1.85}>
      <FlyAnatomy
        kit={kit}
        roleId={role.id}
        accentHex={role.accent}
        stage="imago"
        detail="lod"
        seed={side * 11.3}
        flap={96}
        live={live}
      />
    </group>
  );
}

export function CiDelivery() {
  const job = useCi((s) => s.delivery);
  const crate = useRef<THREE.Group>(null);
  const lid = useRef<THREE.Mesh>(null);
  const cable = useRef<THREE.Mesh>(null);
  const kit = useMemo(() => {
    const k = createKit();
    decorateFlyMaps(k);
    return k;
  }, []);
  useLayoutEffect(() => () => disposeKit(kit), [kit]);

  useFrame(() => {
    const cur = useCi.getState().delivery;
    const g = crate.current;
    if (!cur || !g) {
      if (g) g.visible = false;
      return;
    }
    const elapsed = (Date.now() - cur.startedAt) / 1000;
    if (elapsed >= DELIVERY_TOTAL) {
      useCi.getState().finishDelivery();
      return;
    }
    const dest = destFor(cur.kind, cur.visual);
    const pose = cratePose(elapsed, dest);
    g.visible = pose.visible;
    g.position.set(pose.x, pose.y, pose.z);
    g.rotation.z = pose.sway;
    if (lid.current) lid.current.rotation.x = -pose.lid * 1.35;
    if (cable.current) {
      const len = Math.max(0.2, CRANE_HOOK.y - pose.y);
      cable.current.visible = pose.cable > 0.05;
      cable.current.position.set(pose.x, pose.y + len / 2, pose.z);
      cable.current.scale.set(pose.cable, len, pose.cable);
    }
  });

  if (!job) return null;
  const phase = phaseAt(0);

  return (
    <group>
      <mesh ref={cable} visible={false}>
        <cylinderGeometry args={[0.012, 0.012, 1, 6]} />
        <meshStandardMaterial color="#2a3036" metalness={0.7} roughness={0.4} />
      </mesh>
      <group ref={crate} visible={phase !== "done"}>
        <mesh position={[0, 0.22, 0]} castShadow>
          <boxGeometry args={[0.72, 0.44, 0.72]} />
          <meshStandardMaterial color="#6b4a2e" roughness={0.72} metalness={0.04} />
        </mesh>
        <mesh position={[0, 0.44, 0]}>
          <boxGeometry args={[0.76, 0.05, 0.76]} />
          <meshStandardMaterial color="#c9a227" roughness={0.45} metalness={0.2} />
        </mesh>
        <mesh ref={lid} position={[0, 0.48, -0.2]}>
          <boxGeometry args={[0.74, 0.04, 0.74]} />
          <meshStandardMaterial color="#5a3c24" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.28, 0.37]}>
          <boxGeometry args={[0.5, 0.08, 0.02]} />
          <meshStandardMaterial color="#c9a227" />
        </mesh>
        <pointLight position={[0, 0.6, 0]} color="#7cf0d8" intensity={1.4} distance={4} />
      </group>
      <Courier side={-1} kit={kit} />
      <Courier side={1} kit={kit} />
    </group>
  );
}
