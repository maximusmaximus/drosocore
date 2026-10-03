import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { FLY_PORTRAIT_SCALE } from "@/lib/fly-view";
import type { Role } from "@/lib/roles";
import type { StageId } from "@/lib/tiers";
import { FlyAnatomy } from "./FlyAnatomy";
import { createKit, decorateFlyMaps, disposeKit } from "./materials";

function Aim() {
  const { camera } = useThree();
  useFrame(() => {
    camera.lookAt(0, 0.01, 0);
  });
  return null;
}

function SpinFly({
  role,
  stage,
  seed,
  spin,
  onFrame,
}: {
  role: Role;
  stage: StageId;
  seed: number;
  spin: number;
  onFrame?: (gl: THREE.WebGLRenderer) => void;
}) {
  const kit = useMemo(() => {
    const k = createKit();
    decorateFlyMaps(k);
    return k;
  }, []);
  const g = useRef<THREE.Group>(null);
  useLayoutEffect(() => () => disposeKit(kit), [kit]);
  useFrame(({ clock, gl }) => {
    if (g.current) g.current.rotation.y = clock.elapsedTime * spin;
    if (!onFrame) return;
    if (clock.elapsedTime < 0.7) return;
    onFrame(gl);
  });
  const s = stage === "larva" ? 1.9 : stage === "pupa" ? 1.7 : FLY_PORTRAIT_SCALE;
  const live = useMemo(
    () => ({
      flap: stage === "larva" || stage === "pupa" ? 0 : 8,
      working: true,
      gait: 6.2,
      headYaw: 0.08,
      abdomen: 0.12,
      grasp: 0.45,
      airborne: 0,
      skill: stage === "wizard" ? 0.72 : stage === "foreman" ? 0.55 : 0.42,
      antennal: 0.4,
    }),
    [stage],
  );
  return (
    <group ref={g} scale={s} position={[0, stage === "larva" ? -0.02 : -0.04, 0]}>
      <FlyAnatomy
        kit={kit}
        roleId={role.id}
        accentHex={role.accent}
        stage={stage}
        detail="hero"
        seed={seed}
        flap={stage === "larva" || stage === "pupa" ? 0 : 8}
        phase={seed}
        working
        live={live}
      />
    </group>
  );
}

export function FlyPortrait({
  role,
  stage,
  seed,
  className,
  spin = 0.7,
  capture,
}: {
  role: Role;
  stage: StageId;
  seed: number;
  className?: string;
  spin?: number;
  capture?: (dataUrl: string) => void;
}) {
  const captured = useRef(false);
  return (
    <Canvas
      dpr={capture ? [2, 2] : [1, 1.5]}
      gl={{
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: Boolean(capture),
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.92,
      }}
      camera={{ position: [0.82, 0.2, 0.48], fov: 26, near: 0.05, far: 20 }}
      className={className}
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <color attach="background" args={["#1a1e24"]} />
      <hemisphereLight args={["#d8dee6", "#14161a", 0.5]} />
      <directionalLight position={[1.9, 2.4, 1.5]} intensity={1.45} color="#f4f6fa" />
      <directionalLight position={[-1.3, 0.9, 1.6]} intensity={0.7} color="#c5d4e8" />
      <directionalLight position={[0.4, 0.2, -1.4]} intensity={0.4} color="#d0d4dc" />
      <ambientLight intensity={0.16} />
      <Aim />
      <Suspense fallback={null}>
        <SpinFly
          role={role}
          stage={stage}
          seed={seed}
          spin={spin}
          onFrame={(gl) => {
            if (!capture || captured.current) return;
            captured.current = true;
            const src = gl.domElement;
            try {
              const out = document.createElement("canvas");
              const side = Math.max(src.width, src.height, 768);
              out.width = side;
              out.height = side;
              const ctx = out.getContext("2d");
              if (!ctx) {
                capture("");
                return;
              }
              ctx.fillStyle = "#1a1e24";
              ctx.fillRect(0, 0, side, side);
              const dx = (side - src.width) / 2;
              const dy = (side - src.height) / 2;
              ctx.drawImage(src, dx, dy);
              capture(out.toDataURL("image/jpeg", 0.92));
            } catch {
              capture("");
            }
          }}
        />
      </Suspense>
    </Canvas>
  );
}
