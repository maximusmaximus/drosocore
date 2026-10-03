import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { CiGear } from "@/lib/ci";
import type { Role } from "@/lib/roles";
import type { StageId } from "@/lib/tiers";
import { studioOffset, studioPieces, type StudioSlot } from "@/lib/studio";
import { FlyAnatomy } from "./FlyAnatomy";
import { CiKit, Outfit, RankKit, Tool } from "./fly-kit";
import { createKit, decorateFlyMaps, disposeKit, type Kit } from "./materials";

const _want = new THREE.Vector3();

function Room({ kit }: { kit: Kit }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow material={kit.steelDark}>
        <planeGeometry args={[10, 10]} />
      </mesh>
      <mesh position={[0, 1.6, -3.4]} material={kit.steel}>
        <planeGeometry args={[10, 3.4]} />
      </mesh>
      <mesh position={[0, 3.2, 0]} rotation={[Math.PI / 2, 0, 0]} material={kit.steelDark}>
        <planeGeometry args={[10, 10]} />
      </mesh>
      {[-2.2, 0, 2.2].map((x) => (
        <mesh key={x} position={[x, 3.05, -1.2]}>
          <boxGeometry args={[1.6, 0.06, 0.18]} />
          <meshStandardMaterial color="#5eead4" emissive="#5eead4" emissiveIntensity={0.85} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <ringGeometry args={[0.62, 0.68, 48]} />
        <meshStandardMaterial color="#5eead4" emissive="#5eead4" emissiveIntensity={0.25} />
      </mesh>
    </group>
  );
}

function Plinth({
  selected,
  onPick,
  label,
  kit,
}: {
  selected: boolean;
  onPick: () => void;
  label: string;
  kit: Kit;
}) {
  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        onPick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      <mesh position={[0, 0.12, 0]} castShadow material={kit.steel}>
        <cylinderGeometry args={[0.28, 0.34, 0.24, 24]} />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.04, 24]} />
        <meshStandardMaterial color="#5eead4" emissive="#5eead4" emissiveIntensity={selected ? 0.5 : 0.15} />
      </mesh>
      <group userData={{ label }} />
    </group>
  );
}

function SpinPiece({ children, active }: { children: ReactNode; active: boolean }) {
  const g = useRef<THREE.Group>(null);
  const dragging = useRef(false);
  const last = useRef(0);
  useFrame((_, dt) => {
    if (!g.current) return;
    if (!dragging.current && !active) g.current.rotation.y += dt * 0.35;
  });
  return (
    <group
      ref={g}
      onPointerDown={(e) => {
        e.stopPropagation();
        dragging.current = true;
        last.current = e.clientX;
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
      onPointerMove={(e) => {
        if (!dragging.current || !g.current) return;
        const dx = e.clientX - last.current;
        last.current = e.clientX;
        g.current.rotation.y += dx * 0.02;
      }}
    >
      {children}
    </group>
  );
}

function StudioScene({
  role,
  stage,
  seed,
  upgrade,
  focus,
  setFocus,
  onFrame,
}: {
  role: Role;
  stage: StageId;
  seed: number;
  upgrade: CiGear;
  focus: StudioSlot;
  setFocus: (id: StudioSlot) => void;
  onFrame?: (gl: THREE.WebGLRenderer) => void;
}) {
  const kit = useMemo(() => {
    const k = createKit();
    decorateFlyMaps(k);
    return k;
  }, []);
  useLayoutEffect(() => () => disposeKit(kit), [kit]);
  const pieces = useMemo(() => studioPieces(role, stage, upgrade), [role, stage, upgrade]);
  const extras = pieces.filter((p) => p.id !== "fly");
  const controls = useRef<OrbitControlsImpl>(null);
  const target = useRef(new THREE.Vector3(0, 0.55, 0));
  const live = useMemo(
    () => ({
      flap: stage === "larva" || stage === "pupa" ? 0 : 8,
      working: true,
      gait: 5.6,
      headYaw: 0.08,
      abdomen: 0.1,
      grasp: 0.4,
      airborne: 0,
      skill: stage === "wizard" ? 0.75 : stage === "foreman" ? 0.55 : 0.42,
      antennal: 0.4,
    }),
    [stage],
  );

  useFrame(({ clock, gl }) => {
    const extraIndex = extras.findIndex((p) => p.id === focus);
    const want = focus === "fly" ? ([0, 0.55, 0] as const) : studioOffset(focus, Math.max(0, extraIndex), Math.max(1, extras.length));
    _want.set(want[0], focus === "fly" ? 0.55 : 0.5, want[2]);
    target.current.lerp(_want, 0.1);
    if (controls.current) {
      controls.current.target.lerp(target.current, 0.12);
      controls.current.update();
    }
    if (onFrame && clock.elapsedTime > 0.8) onFrame(gl);
  });

  const aim = (id: StudioSlot) => {
    setFocus(id);
  };

  return (
    <>
      <Room kit={kit} />
      <OrbitControls
        ref={controls}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={1.4}
        maxDistance={5.2}
        minPolarAngle={0.32}
        maxPolarAngle={1.35}
        makeDefault
      />
      <group position={[0, 0, 0]}>
        <Plinth selected={focus === "fly"} onPick={() => aim("fly")} label={role.title} kit={kit} />
        <group position={[0, 0.38, 0]} scale={stage === "larva" ? 2.1 : stage === "pupa" ? 1.9 : 2.35}>
          <FlyAnatomy
            kit={kit}
            roleId={role.id}
            accentHex={role.accent}
            stage={stage}
            detail="hero"
            seed={seed}
            flap={stage === "larva" || stage === "pupa" ? 0 : 8}
            working
            live={live}
          />
        </group>
      </group>
      {extras.map((piece, i) => {
        const pos = studioOffset(piece.id, i, extras.length);
        return (
          <group key={piece.id} position={pos}>
            <Plinth selected={focus === piece.id} onPick={() => aim(piece.id)} label={piece.label} kit={kit} />
            <group position={[0, 0.42, 0]}>
              <SpinPiece active={focus === piece.id}>
                {piece.id === "tool" ? (
                  <group scale={3.2} position={[-0.4, 0.05, 0]}>
                    <Tool id={role.id} kit={kit} detail="hero" />
                  </group>
                ) : null}
                {piece.id === "kit" ? (
                  <group scale={2.6}>
                    <Outfit id={role.id} kit={kit} detail="hero" />
                  </group>
                ) : null}
                {piece.id === "upgrade" ? (
                  <group scale={2.8}>
                    <CiKit gear={upgrade} kit={kit} />
                  </group>
                ) : null}
                {piece.id === "rank" ? (
                  <group scale={2.6}>
                    <RankKit stage={stage} kit={kit} />
                  </group>
                ) : null}
              </SpinPiece>
            </group>
          </group>
        );
      })}
    </>
  );
}

export function MemberStudio({
  role,
  stage,
  seed,
  upgrade = "none",
  className,
  capture,
}: {
  role: Role;
  stage: StageId;
  seed: number;
  upgrade?: CiGear;
  className?: string;
  capture?: (dataUrl: string) => void;
}) {
  const [focus, setFocus] = useState<StudioSlot>("fly");
  const pieces = useMemo(() => studioPieces(role, stage, upgrade), [role, stage, upgrade]);
  const captured = useRef(false);
  const active = pieces.find((p) => p.id === focus) ?? pieces[0];

  return (
    <div className={"relative overflow-hidden bg-surface-2 " + (className ?? "h-64 w-full")}>
      <Canvas
        dpr={capture ? [2, 2] : [1, 1.6]}
        gl={{
          antialias: true,
          alpha: false,
          preserveDrawingBuffer: Boolean(capture),
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.82,
        }}
        camera={{ position: [2.4, 1.35, 2.6], fov: 32, near: 0.05, far: 30 }}
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        <color attach="background" args={["#12161b"]} />
        <hemisphereLight args={["#d5dbe4", "#14161a", 0.5]} />
        <directionalLight position={[2.6, 3.6, 2.0]} intensity={1.55} color="#f4f6fa" />
        <directionalLight position={[-2.2, 1.6, 1.4]} intensity={0.85} color="#9bb6d4" />
        <directionalLight position={[0.2, 1.6, -2.4]} intensity={0.55} color="#c5d0dc" />
        <ambientLight intensity={0.12} />
        <Suspense fallback={null}>
          <StudioScene
            role={role}
            stage={stage}
            seed={seed}
            upgrade={upgrade}
            focus={focus}
            setFocus={setFocus}
            onFrame={(gl) => {
              if (!capture || captured.current) return;
              captured.current = true;
              try {
                capture(gl.domElement.toDataURL("image/jpeg", 0.92));
              } catch {
                capture("");
              }
            }}
          />
        </Suspense>
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between gap-2 p-2">
        <p className="rounded-md border border-border bg-surface/85 px-2 py-1 font-mono text-[0.6rem] uppercase tracking-wide text-muted">
          {active?.label}
        </p>
        <p className="rounded-md border border-border bg-surface/85 px-2 py-1 font-mono text-[0.6rem] text-subtle">
          drag to orbit · tap a stand
        </p>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex gap-1 overflow-x-auto p-2">
        {pieces.map((p) => {
          const on = p.id === focus;
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={on}
              className={
                "inline-flex h-9 shrink-0 items-center rounded-md px-2.5 font-mono text-[0.65rem] " +
                (on ? "bg-accent text-accent-fg" : "border border-border bg-surface/85 text-muted")
              }
              onClick={() => setFocus(p.id)}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
