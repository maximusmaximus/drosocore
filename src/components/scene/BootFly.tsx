import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ROLES } from "@/lib/roles";
import { FlyAnatomy } from "./FlyAnatomy";
import { createKit, decorateFlyMaps, disposeKit, type Kit } from "./materials";

function MiniHall({ kit }: { kit: Kit }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]} receiveShadow material={kit.steelDark}>
        <circleGeometry args={[1.8, 48]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.118, 0]}>
        <ringGeometry args={[0.72, 0.78, 48]} />
        <meshStandardMaterial color="#5eead4" emissive="#5eead4" emissiveIntensity={0.35} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.22, 0]} material={kit.steel}>
        <torusGeometry args={[0.55, 0.085, 12, 48]} />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <torusGeometry args={[0.55, 0.04, 8, 32]} />
        <meshStandardMaterial color="#5eead4" emissive="#2dd4bf" emissiveIntensity={0.7} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.55, 0.22, Math.sin(a) * 0.55]} rotation={[0, -a, 0]} material={kit.steelDark}>
            <boxGeometry args={[0.08, 0.22, 0.05]} />
          </mesh>
        );
      })}
      <mesh position={[0, 0.22, 0]} material={kit.copper}>
        <cylinderGeometry args={[0.09, 0.09, 0.55, 12]} />
      </mesh>
    </group>
  );
}

function WalkingFly({ kit }: { kit: Kit }) {
  const g = useRef<THREE.Group>(null);
  const live = useMemo(
    () => ({
      flap: 8,
      working: false,
      gait: 6.4,
      headYaw: 0.06,
      abdomen: 0.1,
      grasp: 0.2,
      airborne: 0,
      skill: 0.45,
      antennal: 0.4,
    }),
    [],
  );
  const role = ROLES[0];
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const bout = t % 2.6;
    const bursting = bout < 1.15;
    const hopping = bout > 2.05 && bout < 2.35;
    const a = t * 0.55;
    const r = 0.95;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const y = hopping ? 0.22 + Math.sin(((bout - 2.05) / 0.3) * Math.PI) * 0.28 : bursting ? 0.02 : 0;
    if (g.current) {
      g.current.position.set(x, y, z);
      g.current.rotation.order = "YXZ";
      g.current.rotation.y = -a + Math.PI / 2;
      g.current.rotation.x = hopping ? -0.45 : bursting ? 0.08 : 0.02;
    }
    live.airborne = hopping ? 1 : 0;
    live.flap = hopping ? 118 : bursting ? 10 : 4;
    live.gait = bursting && !hopping ? 7.2 : 0;
    live.headYaw = Math.sin(t * 3.2) * 0.12;
  });
  return (
    <group ref={g} scale={1.55}>
      <FlyAnatomy
        kit={kit}
        roleId={role.id}
        accentHex={role.accent}
        stage="imago"
        detail="hero"
        seed={4.2}
        flap={8}
        working={false}
        live={live}
      />
    </group>
  );
}

function BootScene() {
  const kit = useMemo(() => {
    const k = createKit();
    decorateFlyMaps(k);
    return k;
  }, []);
  useLayoutEffect(() => () => disposeKit(kit), [kit]);
  return (
    <>
      <MiniHall kit={kit} />
      <WalkingFly kit={kit} />
    </>
  );
}

export function BootFly({ className }: { className?: string }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.02,
      }}
      camera={{ position: [1.65, 1.05, 1.65], fov: 32, near: 0.05, far: 20 }}
      className={className}
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <color attach="background" args={["#12161b"]} />
      <fog attach="fog" args={["#12161b", 4.5, 9]} />
      <hemisphereLight args={["#d8dee6", "#1a1814", 0.55]} />
      <directionalLight position={[2.4, 3.6, 1.8]} intensity={1.7} color="#f4f6fa" />
      <directionalLight position={[-1.8, 1.2, -1.2]} intensity={0.7} color="#8ec5ff" />
      <pointLight position={[0, 0.5, 0]} color="#5eead4" intensity={1.1} distance={3.2} />
      <ambientLight intensity={0.16} />
      <Suspense fallback={null}>
        <BootScene />
      </Suspense>
    </Canvas>
  );
}
