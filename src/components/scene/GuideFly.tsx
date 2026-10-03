import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { FEATURE_BY_ID, tourFeature } from "@/lib/guide";
import { FLY_GUIDE_SCALE } from "@/lib/fly-view";
import { roleById } from "@/lib/roles";
import { useSim } from "@/lib/store";
import { FlyAnatomy } from "./FlyAnatomy";
import { createKit, decorateFlyMaps, disposeKit } from "./materials";

const REST: [number, number, number] = [6.9, 3.85, 4.2];

export function GuideFly() {
  const kit = useMemo(() => {
    const k = createKit();
    decorateFlyMaps(k);
    return k;
  }, []);
  const group = useRef<THREE.Group>(null);
  const live = useMemo(
    () => ({
      flap: 110,
      working: false,
      gait: 0,
      headYaw: 0,
      abdomen: 0.08,
      grasp: 0,
      airborne: 1,
      skill: 0.35,
      antennal: 0.4,
    }),
    [],
  );
  const role = roleById("inspector");
  const pos = useRef(new THREE.Vector3(...REST));
  const yaw = useRef(0);
  const pitch = useRef(0.72);
  const dartLeft = useRef(0);
  const hoverLeft = useRef(0.3);
  const _target = useRef(new THREE.Vector3(...REST));
  useLayoutEffect(() => () => disposeKit(kit), [kit]);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.1);
    const g = group.current;
    if (!g) return;
    const step = useSim.getState().guideStep;
    const tip = useSim.getState().tipId;
    const feat = step !== null ? tourFeature(step) : tip ? FEATURE_BY_ID[tip] : null;
    const tgt = _target.current;
    if (feat?.anchor.kind === "world") {
      const p = feat.anchor.pos;
      tgt.set(p[0], p[1] + 1.15, p[2]);
    } else if (feat?.anchor.kind === "dom") {
      tgt.set(0, 4.4, 8.4);
    } else {
      const t = clock.getElapsedTime();
      tgt.set(REST[0] + Math.sin(t * 0.4) * 0.35, REST[1] + Math.sin(t * 0.9) * 0.12, REST[2]);
    }

    const dx = tgt.x - pos.current.x;
    const dy = tgt.y - pos.current.y;
    const dz = tgt.z - pos.current.z;
    const dist = Math.hypot(dx, dy, dz);
    const want = Math.atan2(dx, dz);
    let err = want - yaw.current;
    while (err > Math.PI) err -= Math.PI * 2;
    while (err < -Math.PI) err += Math.PI * 2;

    dartLeft.current -= dt;
    hoverLeft.current -= dt;

    if (dist > 0.55 && (dartLeft.current > 0 || (hoverLeft.current <= 0 && Math.abs(err) < 0.35))) {
      if (dartLeft.current <= 0) dartLeft.current = 0.16 + Math.random() * 0.22;
      const turn = Math.sign(err) * Math.min(Math.abs(err), 22 * dt);
      yaw.current += turn;
      const dash = 9.4 * dt;
      pos.current.x += Math.sin(yaw.current) * dash;
      pos.current.z += Math.cos(yaw.current) * dash;
      pos.current.y += Math.max(-5.5, Math.min(5.5, dy * 2.2)) * dt;
      pitch.current += (0.42 - pitch.current) * Math.min(1, 8 * dt);
    } else {
      if (hoverLeft.current <= 0) hoverLeft.current = 0.2 + Math.random() * 0.35;
      dartLeft.current = 0;
      if (Math.abs(err) > 0.4) yaw.current += Math.sign(err) * Math.min(Math.abs(err), 28 * dt);
      pos.current.y += (tgt.y - pos.current.y) * Math.min(1, 2.4 * dt);
      pos.current.y += Math.sin(clock.elapsedTime * 16) * 0.018;
      pitch.current += (0.74 - pitch.current) * Math.min(1, 6 * dt);
    }

    g.position.copy(pos.current);
    g.rotation.order = "YXZ";
    g.rotation.y = yaw.current;
    g.rotation.x = pitch.current;
    g.rotation.z = 0;
    live.flap = step !== null ? 128 : 110;
    live.working = step !== null;
    live.airborne = 1;
  });

  return (
    <group ref={group} scale={FLY_GUIDE_SCALE}>
      <FlyAnatomy
        kit={kit}
        roleId={role.id}
        accentHex="#5eead4"
        stage="imago"
        detail="hero"
        seed={77.7}
        phase={0.4}
        live={live}
      />
      <mesh position={[0, 0.2, 0]}>
        <sphereGeometry args={[0.28, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
