import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { Suspense, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { useAds } from "@/lib/ads-store";
import { recentlyPinched } from "@/lib/cam-focus";
import {
  detectGfxTier,
  gfxProfile,
  profileFromGl,
  readGfxHintsFromNavigator,
  type GfxProfile,
} from "@/lib/gfx-tier";
import { hallHasPainted, WORLD_CLEAR, WORLD_GL } from "@/lib/world-gl";
import { useSim } from "@/lib/store";
import type { SpeechBillboard } from "@/lib/fly-sim";
import type { ProjectedAnchor } from "./InfoAnchors";
import { GfxContext, useGfx } from "./gfx";
import { IsoCamera } from "./IsoCamera";
import { Reactor } from "./Reactor";
import { Hall } from "./Hall";
import { GrowthCore } from "./GrowthCore";
import { CiInstalls } from "./CiInstalls";
import { CiDelivery } from "./CiDelivery";
import { Flies } from "./Flies";
import { AdSpaces } from "./AdSpaces";
import { GuideFly } from "./GuideFly";
import { InfoAnchors } from "./InfoAnchors";
import { disposeSurfPack, makeSurfPack } from "./surf-maps";

function StudioEnv() {
  const { gl, scene } = useThree();
  const { profile } = useGfx();
  useLayoutEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const sc = new THREE.Scene();
    sc.add(new THREE.HemisphereLight(0xd6dee8, 0x2a2824, 1.05 * profile.envBoost));
    const key = new THREE.DirectionalLight(0xf0f3f7, 2.6 * profile.envBoost);
    key.position.set(6, 10, 4);
    sc.add(key);
    const fill = new THREE.DirectionalLight(0x8aa4c4, 1.45);
    fill.position.set(-5, 4, -3);
    sc.add(fill);
    if (profile.tier === "high") {
      const rim = new THREE.DirectionalLight(0xb7d4ee, 1.05);
      rim.position.set(-2, 6, 8);
      sc.add(rim);
    }
    const room = new THREE.Mesh(
      new THREE.SphereGeometry(10, profile.tier === "low" ? 12 : 24, profile.tier === "low" ? 8 : 16),
      new THREE.MeshBasicMaterial({ color: 0x8a96a4, side: THREE.BackSide }),
    );
    sc.add(room);
    const env = pmrem.fromScene(sc, profile.tier === "high" ? 0.02 : 0.04);
    scene.environment = env.texture;
    scene.environmentIntensity = profile.envBoost;
    scene.fog = new THREE.FogExp2(WORLD_CLEAR, profile.fogDensity);
    room.geometry.dispose();
    (room.material as THREE.Material).dispose();
    pmrem.dispose();
    return () => {
      scene.environment = null;
      scene.fog = null;
      env.dispose();
    };
  }, [gl, scene, profile.envBoost, profile.fogDensity, profile.tier]);
  return null;
}

function Lights() {
  const { profile } = useGfx();
  return (
    <>
      <hemisphereLight args={["#d4dce8", "#2c2a26", 0.95 * profile.envBoost]} />
      <directionalLight position={[12, 26, 8]} intensity={2.55 * profile.envBoost} color="#f2f4f8" />
      <directionalLight position={[-14, 9, -9]} intensity={1.45} color="#8eb0d0" />
      <directionalLight position={[4, 10, -16]} intensity={1.15} color="#b7d0e8" />
      <directionalLight position={[-8, 4, 12]} intensity={0.42} color="#c4a078" />
      <pointLight position={[7.55, 3.2, -6.05]} color="#7cf0d8" intensity={2.4} distance={14} />
      <ambientLight intensity={profile.tier === "low" ? 0.38 : 0.22} />
    </>
  );
}

function BootPing() {
  const sent = useRef(false);
  const ticks = useRef(0);
  const gl = useThree((s) => s.gl);
  useFrame(() => {
    if (sent.current) return;
    ticks.current += 1;
    if (!hallHasPainted(gl.info.render.frame, ticks.current)) return;
    sent.current = true;
    gl.domElement.dataset.world = "on";
    useSim.getState().markWorldReady();
  });
  return null;
}

/** R3F's own pass was clearing to fog and skipping the graph. Draw after subscribers. */
function HallPump() {
  const { gl, scene, camera } = useThree();
  useFrame(() => {
    gl.render(scene, camera);
  }, 1);
  return null;
}

function FitGl() {
  const gl = useThree((s) => s.gl);
  useLayoutEffect(() => {
    const el = gl.domElement;
    el.style.display = "block";
    el.style.width = "100%";
    el.style.height = "100%";
  }, [gl]);
  return null;
}

function GroundContact() {
  const { profile } = useGfx();
  const c = profile.contact;
  return (
    <ContactShadows
      position={[0, 0.02, 0]}
      opacity={c.opacity}
      scale={c.scale}
      blur={c.blur}
      far={c.far}
      resolution={c.resolution}
      frames={profile.tier === "low" ? 1 : Infinity}
    />
  );
}

function dismissWorld() {
  if (recentlyPinched()) return;
  useSim.getState().select(null);
  useAds.getState().closeComposer();
}

function WorldClickAway({ children }: { children: ReactNode }) {
  const down = useRef<{ x: number; y: number } | null>(null);
  return (
    <group
      onPointerDown={(e) => {
        down.current = { x: e.clientX, y: e.clientY };
      }}
      onClick={(e) => {
        const d = down.current;
        down.current = null;
        if (!d) return;
        if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8) return;
        if (!useAds.getState().selectedSpace && !useAds.getState().pickerOpen) return;
        e.stopPropagation();
        dismissWorld();
      }}
    >
      {children}
    </group>
  );
}

function guessProfile(): GfxProfile {
  return gfxProfile(detectGfxTier(readGfxHintsFromNavigator()));
}

export function World({
  onSpeech,
  onAnchors,
}: {
  onSpeech: (s: SpeechBillboard[]) => void;
  onAnchors: (a: ProjectedAnchor[]) => void;
}) {
  const hovered = useSim((s) => s.hovered);
  const adHover = useAds((s) => s.hoveredSpace);
  const [profile, setProfile] = useState(guessProfile);
  const maps = useMemo(() => {
    if (typeof document === "undefined") return null;
    return makeSurfPack(profile);
  }, [profile]);
  useLayoutEffect(() => {
    if (!maps) return;
    return () => disposeSurfPack(maps);
  }, [maps]);

  return (
    <GfxContext.Provider value={{ profile, maps }}>
      <div
        data-hall-host="on"
        data-gfx={profile.tier}
        className="absolute inset-0 z-0"
        style={{
          width: "100%",
          height: "100%",
          background: WORLD_CLEAR,
          cursor: hovered !== null || adHover ? "pointer" : "grab",
        }}
      >
        <Canvas
          orthographic
          frameloop="always"
          dpr={[1, profile.dprMax]}
          gl={{
            ...WORLD_GL,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.12,
          }}
          camera={{ position: [24, 19.2, 24], zoom: 26, near: -80, far: 180 }}
          resize={{ debounce: 0 }}
          onCreated={({ gl }) => {
            gl.setClearColor(WORLD_CLEAR, 1);
            gl.domElement.dataset.gl = "on";
            gl.domElement.dataset.gfx = profile.tier;
            const next = profileFromGl(gl);
            gl.setPixelRatio(Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, next.dprMax));
            if (next.tier !== profile.tier || next.texSize !== profile.texSize) setProfile(next);
          }}
          onPointerMissed={() => dismissWorld()}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            background: WORLD_CLEAR,
            cursor: hovered !== null || adHover ? "pointer" : "grab",
            touchAction: "none",
          }}
        >
          <color attach="background" args={[WORLD_CLEAR]} />
          <FitGl />
          <BootPing />
          <StudioEnv />
          <Lights />
          <WorldClickAway>
            <Hall />
            <Reactor />
            <GrowthCore />
            <CiInstalls />
            <CiDelivery />
          </WorldClickAway>
          <AdSpaces />
          <Suspense fallback={null}>
            <Flies onSpeech={onSpeech} />
            <GuideFly />
          </Suspense>
          <InfoAnchors on={onAnchors} />
          <GroundContact />
          <IsoCamera />
          <HallPump />
        </Canvas>
      </div>
    </GfxContext.Provider>
  );
}

