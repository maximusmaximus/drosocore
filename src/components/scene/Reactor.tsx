import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { FLOOR_R, MISSING_COIL, R0, TF_COUNT, VESSEL_TUBE, Y0 } from "@/lib/constants";
import { shieldPanelYaw } from "@/lib/ad-spaces";
import { applySurfMaps, createKit, disposeKit, type Kit } from "./materials";
import { useGfx } from "./gfx";

function millerCurve(R: number, a: number, kappa: number, delta: number, n: number) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const th = (i / n) * Math.PI * 2;
    const r = R + a * Math.cos(th + delta * Math.sin(th));
    const z = a * kappa * Math.sin(th);
    pts.push(new THREE.Vector3(r, z + Y0, 0));
  }
  return pts;
}

function Box({
  position,
  args,
  rotation,
  material,
}: {
  position: [number, number, number];
  args: [number, number, number];
  rotation?: [number, number, number];
  material: THREE.Material;
}) {
  return (
    <mesh position={position} rotation={rotation} material={material}>
      <boxGeometry args={args} />
    </mesh>
  );
}

function Cyl({
  position,
  args,
  rotation,
  material,
}: {
  position: [number, number, number];
  args: [number, number, number, number?];
  rotation?: [number, number, number];
  material: THREE.Material;
}) {
  return (
    <mesh position={position} rotation={rotation} material={material}>
      <cylinderGeometry args={args} />
    </mesh>
  );
}

function TfCoils({ kit }: { kit: Kit }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => {
    const pts = millerCurve(R0, 1.52, 1.68, 0.38, 72);
    const curve = new THREE.CatmullRomCurve3(pts, true);
    return new THREE.TubeGeometry(curve, 96, 0.155, 7, true);
  }, []);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    let i = 0;
    for (let k = 0; k < TF_COUNT; k++) {
      if (k === MISSING_COIL) continue;
      dummy.position.set(0, 0, 0);
      dummy.rotation.set(0, (k / TF_COUNT) * Math.PI * 2, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i++, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    return () => {
      geo.dispose();
    };
  }, [geo]);

  return <instancedMesh ref={meshRef} args={[geo, kit.coil, TF_COUNT - 1]} />;
}

function BlanketTiles({ kit }: { kit: Kit }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.BoxGeometry(0.42, 0.08, 0.34), []);
  const tu = 18;
  const tv = 10;
  const count = tu * tv;

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    let i = 0;
    for (let u = 0; u < tu; u++) {
      for (let v = 0; v < tv; v++) {
        const ua = (u / tu) * Math.PI * 2;
        const va = (v / tv) * Math.PI * 2;
        const r = R0 + (VESSEL_TUBE + 0.07) * Math.cos(va);
        dummy.position.set(Math.cos(ua) * r, Y0 + (VESSEL_TUBE + 0.07) * Math.sin(va), Math.sin(ua) * r);
        dummy.lookAt(Math.cos(ua) * R0, Y0, Math.sin(ua) * R0);
        dummy.rotateX(Math.PI / 2);
        dummy.updateMatrix();
        mesh.setMatrixAt(i++, dummy.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    return () => geo.dispose();
  }, [geo]);

  return <instancedMesh ref={meshRef} args={[geo, kit.vesselDark, count]} />;
}

function Plasma() {
  const inner = useRef<THREE.Mesh>(null);
  const outer = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (inner.current) {
      inner.current.rotation.y = t * 0.35;
      inner.current.scale.setScalar(1 + Math.sin(t * 2.1) * 0.03);
    }
    if (outer.current) {
      outer.current.rotation.y = -t * 0.22;
    }
    if (light.current) {
      light.current.intensity = 6.5 + Math.sin(t * 3.2) * 1.4;
    }
  });
  return (
    <group position={[0, Y0, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh ref={outer}>
        <torusGeometry args={[R0, 0.78, 32, 96]} />
        <meshBasicMaterial
          color="#6ec8ff"
          transparent
          opacity={0.38}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={inner}>
        <torusGeometry args={[R0, 0.42, 24, 80]} />
        <meshBasicMaterial
          color="#f5fbff"
          transparent
          opacity={0.32}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <pointLight ref={light} color="#9ad8ff" intensity={7} distance={16} />
    </group>
  );
}

function HangingCoil({ kit }: { kit: Kit }) {
  const ref = useRef<THREE.Group>(null);
  const geo = useMemo(() => {
    const pts = millerCurve(R0, 1.52, 1.68, 0.38, 72);
    const curve = new THREE.CatmullRomCurve3(pts, true);
    return new THREE.TubeGeometry(curve, 64, 0.155, 7, true);
  }, []);
  const a = (MISSING_COIL / TF_COUNT) * Math.PI * 2;
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.position.y = 0.55 + Math.sin(t * 0.8) * 0.18;
    ref.current.rotation.y = a + Math.sin(t * 0.5) * 0.08;
  });
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  return (
    <group ref={ref} position={[Math.cos(a) * 0.15, 0.6, Math.sin(a) * 0.15]}>
      <mesh geometry={geo} material={kit.coil} rotation={[0, a, 0]} />
    </group>
  );
}

function Crane({ kit }: { kit: Kit }) {
  const a = (MISSING_COIL / TF_COUNT) * Math.PI * 2;
  const r = 8.35;
  const x = Math.cos(a) * r;
  const z = Math.sin(a) * r;
  const hookY = useRef(0);
  const cable = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    hookY.current = 5.1 + Math.sin(t * 0.8) * 0.18;
    if (cable.current) {
      const len = 7.4 - hookY.current;
      cable.current.scale.y = len;
      cable.current.position.y = 7.4 - len / 2;
    }
  });
  const jibLen = 7.6;
  return (
    <group position={[x, 0, z]} rotation={[0, -a + Math.PI, 0]}>
      <Box position={[0, 0.2, 0]} args={[1.3, 0.4, 1.3]} material={kit.craneDark} />
      <Cyl position={[0, 3.7, 0]} args={[0.16, 0.16, 7.2, 8]} material={kit.crane} />
      {Array.from({ length: 8 }).map((_, i) => (
        <Box
          key={i}
          position={[0, 0.7 + i * 0.85, 0]}
          args={[0.55, 0.06, 0.55]}
          material={kit.craneDark}
        />
      ))}
      <Box position={[0, 7.4, jibLen / 2 - 0.4]} args={[0.22, 0.18, jibLen]} material={kit.crane} />
      <Box position={[0, 7.4, -1.6]} args={[0.22, 0.18, 2.4]} material={kit.crane} />
      <Box position={[0, 7.15, -2.5]} args={[0.5, 0.55, 0.7]} material={kit.caution} />
      <mesh ref={cable} position={[0, 4, jibLen - 1.1]}>
        <cylinderGeometry args={[0.025, 0.025, 1, 5]} />
        <meshStandardMaterial color="#1a1c1e" />
      </mesh>
      <Box position={[0, 7.55, jibLen - 1.1]} args={[0.4, 0.22, 0.4]} material={kit.craneDark} />
    </group>
  );
}

function LivingLeds({ kit }: { kit: Kit }) {
  const a = useRef<THREE.Mesh>(null);
  const b = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (a.current) {
      const mat = a.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1.4 + Math.sin(t * 5) * 1.1;
    }
    if (b.current) {
      const mat = b.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1.2 + Math.sin(t * 3.7 + 1.2) * 0.9;
    }
  });
  return (
    <group>
      <mesh ref={a} position={[6.9, 0.95, 4.15]} material={kit.emissiveCyan}>
        <boxGeometry args={[0.08, 0.08, 0.08]} />
      </mesh>
      <mesh ref={b} position={[-6.4, 0.95, 5.05]} material={kit.emissiveAmber}>
        <boxGeometry args={[0.08, 0.08, 0.08]} />
      </mesh>
    </group>
  );
}

export function Reactor() {
  const { maps } = useGfx();
  const kit = useMemo(() => createKit(), []);
  useLayoutEffect(() => {
    if (maps) applySurfMaps(kit, maps);
  }, [kit, maps]);
  useLayoutEffect(() => () => disposeKit(kit), [kit]);

  const pf = [
    { r: 1.15, y: Y0 + 1.85, tube: 0.13 },
    { r: 1.15, y: Y0 - 1.85, tube: 0.13 },
    { r: 2.35, y: Y0 + 2.35, tube: 0.12 },
    { r: 2.35, y: Y0 - 2.35, tube: 0.12 },
    { r: 4.55, y: Y0 + 1.55, tube: 0.11 },
    { r: 4.55, y: Y0 - 1.55, tube: 0.11 },
  ];

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} material={kit.floor}>
        <circleGeometry args={[FLOOR_R, 64]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <circleGeometry args={[FLOOR_R * 0.98, 64]} />
        <meshPhysicalMaterial
          map={maps?.padFloor ?? undefined}
          metalness={0.18}
          roughness={0.58}
          clearcoat={0.25}
          color={maps?.padFloor ? "#ffffff" : "#35393f"}
        />
      </mesh>

      <mesh position={[0, Y0, 0]} rotation={[Math.PI / 2, 0, 0]} material={kit.vesselShell}>
        <torusGeometry args={[R0, VESSEL_TUBE, 36, 96]} />
      </mesh>
      <mesh position={[0, Y0, 0]} rotation={[Math.PI / 2, 0.4, 0]} material={kit.vessel}>
        <torusGeometry args={[R0, VESSEL_TUBE, 28, 64, Math.PI * 0.95]} />
      </mesh>

      <Plasma />
      <TfCoils kit={kit} />
      <BlanketTiles kit={kit} />
      <HangingCoil kit={kit} />
      <Crane kit={kit} />

      {pf.map((c, i) => (
        <mesh key={i} position={[0, c.y, 0]} rotation={[Math.PI / 2, 0, 0]} material={kit.copper}>
          <torusGeometry args={[c.r, c.tube, 12, 64]} />
        </mesh>
      ))}

      <Cyl position={[0, Y0, 0]} args={[0.58, 0.58, 4.5, 24]} material={kit.coilCase} />
      {Array.from({ length: 22 }).map((_, i) => {
        const t = i / 22;
        const ang = t * Math.PI * 2 * 16;
        const y = 0.15 + t * 4.4;
        return (
          <mesh
            key={i}
            position={[Math.cos(ang) * 0.62, y, Math.sin(ang) * 0.62]}
            rotation={[0, -ang, Math.PI / 2]}
            material={kit.copperBright}
          >
            <cylinderGeometry args={[0.045, 0.045, 0.55, 6]} />
          </mesh>
        );
      })}

      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2 + 0.2;
        const rr = R0 + 0.15;
        return (
          <Cyl
            key={i}
            position={[Math.cos(a) * rr, 0.58, Math.sin(a) * rr]}
            args={[0.14, 0.18, 1.16, 8]}
            material={kit.vesselDark}
          />
        );
      })}

      {Array.from({ length: 6 }).map((_, i) => {
        const a = (i / 6) * Math.PI * 2;
        const rr = R0 + VESSEL_TUBE + 0.55;
        return (
          <group key={i} position={[Math.cos(a) * rr, Y0, Math.sin(a) * rr]} rotation={[0, -a, 0]}>
            <Box position={[0.35, 0, 0]} args={[0.9, 0.7, 0.7]} material={kit.nbi} />
            <Cyl
              position={[0.95, 0, 0]}
              args={[0.22, 0.28, 0.7, 10]}
              rotation={[0, 0, Math.PI / 2]}
              material={kit.vesselDark}
            />
          </group>
        );
      })}

      <group position={[7.4, 1.55, 1.35]} rotation={[0, -0.35, 0]}>
        <Box position={[0, 0, 0]} args={[2.4, 1.1, 1.15]} material={kit.nbi} />
        <Cyl
          position={[-1.5, 0.1, 0]}
          args={[0.32, 0.38, 1.4, 12]}
          rotation={[0, 0, Math.PI / 2]}
          material={kit.coilCase}
        />
        <Box position={[0.7, 0.7, 0]} args={[0.7, 0.35, 0.5]} material={kit.cabinet} />
      </group>
      <group position={[-6.9, 1.45, 3.2]} rotation={[0, 2.3, 0]}>
        <Box position={[0, 0, 0]} args={[2.1, 1.0, 1.05]} material={kit.nbi} />
        <Cyl
          position={[-1.35, 0.05, 0]}
          args={[0.28, 0.34, 1.2, 12]}
          rotation={[0, 0, Math.PI / 2]}
          material={kit.coilCase}
        />
      </group>

      {Array.from({ length: 3 }).map((_, i) => (
        <mesh
          key={i}
          position={[0, 0.55 + i * 0.28, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          material={kit.copper}
        >
          <torusGeometry args={[5.35 + i * 0.18, 0.055, 8, 80]} />
        </mesh>
      ))}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2 + 0.4;
        return (
          <Cyl
            key={i}
            position={[Math.cos(a) * 5.5, 1.55, Math.sin(a) * 5.5]}
            args={[0.05, 0.05, 2.1, 6]}
            material={kit.copper}
          />
        );
      })}

      <mesh position={[0, 1.38, 0]} rotation={[Math.PI / 2, 0, 0]} material={kit.scaffold}>
        <torusGeometry args={[6.15, 0.07, 8, 64]} />
      </mesh>
      <mesh position={[0, 1.62, 0]} rotation={[Math.PI / 2, 0, 0]} material={kit.scaffold}>
        <torusGeometry args={[6.28, 0.03, 6, 64]} />
      </mesh>
      {Array.from({ length: 16 }).map((_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return (
          <Box
            key={i}
            position={[Math.cos(a) * 6.15, 1.5, Math.sin(a) * 6.15]}
            args={[0.55, 0.06, 0.38]}
            rotation={[0, -a, 0]}
            material={kit.scaffold}
          />
        );
      })}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <Cyl
            key={i}
            position={[Math.cos(a) * 6.15, 0.7, Math.sin(a) * 6.15]}
            args={[0.05, 0.05, 1.4, 6]}
            material={kit.scaffold}
          />
        );
      })}

      {Array.from({ length: 12 }).map((_, i) => {
        const a = ((i + 0.5) / 12) * Math.PI * 2;
        return (
          <Box
            key={i}
            position={[Math.cos(a) * 8.85, 0.55, Math.sin(a) * 8.85]}
            args={[1.35, 1.1, 0.28]}
            rotation={[0, shieldPanelYaw(a), 0]}
            material={kit.concrete}
          />
        );
      })}

      <Box position={[6.9, 0.55, 4.2]} args={[1.1, 1.1, 0.7]} material={kit.cabinet} />
      <Box position={[6.9, 1.15, 4.2]} args={[1.0, 0.08, 0.62]} material={kit.plasticWhite} />
      <Box position={[-6.4, 0.55, 5.1]} args={[1.2, 1.1, 0.75]} material={kit.cabinet} />
      <Box position={[-6.4, 1.15, 5.1]} args={[1.1, 0.08, 0.68]} material={kit.plasticWhite} />
      <LivingLeds kit={kit} />

      <Box position={[0.15, 0.22, 8.15]} args={[1.6, 0.44, 0.7]} material={kit.caution} />
      <Box position={[0.15, 0.22, 8.15]} args={[1.62, 0.12, 0.72]} material={kit.cautionDark} />

      {(() => {
        const a = (MISSING_COIL / TF_COUNT) * Math.PI * 2;
        const rr = R0 + 2.1;
        return (
          <group position={[Math.cos(a) * rr, 0, Math.sin(a) * rr]} rotation={[0, -a, 0]}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Cyl
                key={i}
                position={[((i % 2) - 0.5) * 1.4, 1.4, (i < 2 ? -0.7 : 0.7)]}
                args={[0.05, 0.05, 2.8, 6]}
                material={kit.scaffold}
              />
            ))}
            <Box position={[0, 2.75, 0]} args={[1.6, 0.08, 1.6]} material={kit.scaffold} />
            <Box position={[0, 1.4, 0]} args={[1.5, 0.06, 1.5]} material={kit.scaffold} />
          </group>
        );
      })()}

      {Array.from({ length: 10 }).map((_, i) => {
        const a = (i / 10) * Math.PI * 2 + 0.13;
        const y = Y0 + Math.sin(i) * 0.8;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * (R0 + 1.35), y, Math.sin(a) * (R0 + 1.35)]}
            rotation={[0.4, -a, 0.2]}
            material={kit.cable}
          >
            <cylinderGeometry args={[0.03, 0.03, 1.1, 5]} />
          </mesh>
        );
      })}

      <Box position={[-2.2, 0.35, 7.4]} args={[0.7, 0.7, 0.7]} material={kit.tungsten} />
      <Box position={[-2.2, 0.72, 7.4]} args={[0.55, 0.08, 0.55]} material={kit.vessel} />
      <Cyl position={[8.1, 0.45, -2.2]} args={[0.28, 0.32, 0.9, 12]} material={kit.nbi} />
      <Cyl position={[8.1, 0.95, -2.2]} args={[0.12, 0.18, 0.22, 10]} material={kit.copper} />
    </group>
  );
}
