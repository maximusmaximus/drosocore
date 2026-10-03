import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { AD_SPACES } from "@/lib/ad-spaces";
import { HALL_R } from "@/lib/constants";
import { HOT_PINK } from "@/lib/house-ads";
import { applySurfMaps, createKit, disposeKit, type Kit } from "./materials";
import { useGfx } from "./gfx";

function Columns({ kit }: { kit: Kit }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const cap = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.BoxGeometry(0.38, 8.2, 0.38), []);
  const capGeo = useMemo(() => new THREE.BoxGeometry(0.7, 0.16, 0.7), []);
  const n = 14;
  useLayoutEffect(() => {
    const m = mesh.current;
    const c = cap.current;
    if (!m || !c) return;
    const dummy = new THREE.Object3D();
    let i = 0;
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2 + 0.1;
      const camGap = Math.abs(((a + Math.PI * 2) % (Math.PI * 2)) - Math.PI / 4);
      if (camGap < 0.42 || camGap > Math.PI * 2 - 0.42) continue;
      if (i >= n) break;
      const r = HALL_R - 0.4;
      dummy.position.set(Math.cos(a) * r, 4.1, Math.sin(a) * r);
      dummy.rotation.set(0, -a, 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      dummy.position.y = 8.25;
      dummy.updateMatrix();
      c.setMatrixAt(i, dummy.matrix);
      i++;
    }
    m.count = i;
    c.count = i;
    m.instanceMatrix.needsUpdate = true;
    c.instanceMatrix.needsUpdate = true;
    return () => {
      geo.dispose();
      capGeo.dispose();
    };
  }, [geo, capGeo]);
  return (
    <>
      <instancedMesh ref={mesh} args={[geo, kit.steelDark, n]} />
      <instancedMesh ref={cap} args={[capGeo, kit.paintGray, n]} />
    </>
  );
}

function Lamps({ kit, extra }: { kit: Kit; extra: boolean }) {
  const spots = useMemo(() => {
    const s: [number, number, number][] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.3;
      s.push([Math.cos(a) * 13.2, 7.55, Math.sin(a) * 13.2]);
    }
    return s;
  }, []);
  return (
    <group>
      {spots.map((p, i) => (
        <group key={i} position={p}>
          <mesh material={kit.steelDark}>
            <boxGeometry args={[0.55, 0.12, 0.55]} />
          </mesh>
          <mesh position={[0, -0.18, 0]} material={kit.emissiveWarm}>
            <boxGeometry args={[0.42, 0.06, 0.42]} />
          </mesh>
          <mesh position={[0, -0.32, 0]} material={kit.cautionDark}>
            <cylinderGeometry args={[0.16, 0.28, 0.22, 8]} />
          </mesh>
          {extra ? (
            <mesh position={[0, -1.45, 0]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[1.55, 2.7, 12, 1, true]} />
              <meshBasicMaterial
                color="#f0c070"
                transparent
                opacity={0.05}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
                fog
              />
            </mesh>
          ) : null}
        </group>
      ))}
    </group>
  );
}

function PipeRack({ kit }: { kit: Kit }) {
  return (
    <group position={[-15.4, 0, -1]}>
      <mesh position={[0, 1.1, 0]} material={kit.scaffold}>
        <boxGeometry args={[0.12, 2.2, 18]} />
      </mesh>
      <mesh position={[0.55, 1.1, 0]} material={kit.scaffold}>
        <boxGeometry args={[0.12, 2.2, 18]} />
      </mesh>
      {[0.55, 1.15, 1.75].map((y, i) => (
        <mesh key={y} position={[0.28, y, 0]} rotation={[0, 0, Math.PI / 2]} material={i === 1 ? kit.copper : kit.paintGray}>
          <cylinderGeometry args={[0.09, 0.09, 17.4, 8]} />
        </mesh>
      ))}
      {[-7, -2, 3, 8].map((z) => (
        <mesh key={z} position={[0.28, 1.1, z]} material={kit.steelDark}>
          <boxGeometry args={[0.7, 0.08, 0.08]} />
        </mesh>
      ))}
    </group>
  );
}

function Mezzanine({ kit }: { kit: Kit }) {
  return (
    <group position={[-12.6, 0, -10.4]}>
      <mesh position={[0, 3.15, 0]} material={kit.diamond}>
        <boxGeometry args={[8.4, 0.12, 5.2]} />
      </mesh>
      {([-3.8, 3.8] as const).map((x) =>
        ([-2.3, 2.3] as const).map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 1.55, z]} material={kit.steelDark}>
            <boxGeometry args={[0.16, 3.1, 0.16]} />
          </mesh>
        )),
      )}
      <mesh position={[0, 3.55, 2.55]} material={kit.scaffold}>
        <boxGeometry args={[8.4, 0.06, 0.08]} />
      </mesh>
      <mesh position={[4.15, 3.55, 0]} material={kit.scaffold}>
        <boxGeometry args={[0.08, 0.06, 5.2]} />
      </mesh>
    </group>
  );
}

function Stacks({ kit }: { kit: Kit }) {
  const crates: { p: [number, number, number]; s: [number, number, number]; m: THREE.Material }[] = [
    { p: [13.2, 0.45, 9.6], s: [1.4, 0.9, 1.1], m: kit.caution },
    { p: [13.2, 1.2, 9.6], s: [1.2, 0.6, 0.95], m: kit.cautionDark },
    { p: [14.6, 0.38, 8.4], s: [1.1, 0.76, 1.3], m: kit.paintGray },
    { p: [12.1, 0.28, 8.2], s: [0.8, 0.56, 0.8], m: kit.tungsten },
    { p: [-13.4, 0.4, 11.2], s: [1.5, 0.8, 1.1], m: kit.nbi },
    { p: [-13.4, 1.05, 11.2], s: [1.2, 0.5, 0.9], m: kit.cabinet },
    { p: [14.8, 0.55, -11.2], s: [1.8, 1.1, 1.2], m: kit.rust },
    { p: [-8.4, 0.35, 13.6], s: [2.2, 0.7, 0.9], m: kit.caution },
  ];
  return (
    <group>
      {crates.map((c, i) => (
        <mesh key={i} position={c.p} material={c.m}>
          <boxGeometry args={c.s} />
        </mesh>
      ))}
      <mesh position={[14.2, 1.35, -3.4]} material={kit.nbi}>
        <cylinderGeometry args={[0.55, 0.55, 2.7, 12]} />
      </mesh>
      <mesh position={[14.2, 2.8, -3.4]} material={kit.copper}>
        <cylinderGeometry args={[0.18, 0.22, 0.3, 10]} />
      </mesh>
      <mesh position={[-14.6, 1.1, 3.2]} material={kit.coilCase}>
        <cylinderGeometry args={[0.7, 0.7, 2.2, 14]} />
      </mesh>
    </group>
  );
}

function BackWalls({ kit }: { kit: Kit }) {
  const walls = AD_SPACES.filter((s) => s.section === "wall");
  const rim = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: HOT_PINK,
        toneMapped: false,
        fog: false,
      }),
    [],
  );
  useLayoutEffect(() => () => rim.dispose(), [rim]);
  return (
    <group>
      <mesh position={[0, 3.6, -17.6]} material={kit.concrete}>
        <boxGeometry args={[36, 7.4, 0.38]} />
      </mesh>
      <mesh position={[-17.6, 3.6, -2]} material={kit.concrete}>
        <boxGeometry args={[0.38, 7.4, 32]} />
      </mesh>
      <mesh position={[-6, 1.15, -17.2]} material={kit.steelDark}>
        <boxGeometry args={[3.2, 1.9, 0.2]} />
      </mesh>
      {walls.map((s) => (
        <group key={s.id} position={s.position} rotation={[0, s.yaw, 0]}>
          <mesh position={[0, 0, -0.06]} material={kit.cabinet}>
            <boxGeometry args={[s.size[0] + 0.42, s.size[1] + 0.42, 0.1]} />
          </mesh>
          <mesh position={[0, 0, 0.01]} material={rim}>
            <planeGeometry args={[s.size[0] + 0.28, s.size[1] + 0.28]} />
          </mesh>
        </group>
      ))}
      <pointLight position={[0, 5.6, -14.6]} color="#ff8ac4" intensity={7.5} distance={18} />
      <pointLight position={[-14.6, 5.6, 4]} color="#ff8ac4" intensity={6.2} distance={16} />
    </group>
  );
}

function CableTray({ kit }: { kit: Kit }) {
  return (
    <group position={[0, 6.85, 0]}>
      <mesh rotation={[0, 0, 0]} material={kit.paintGray} position={[8.4, 0, -4]}>
        <boxGeometry args={[0.55, 0.08, 18]} />
      </mesh>
      <mesh position={[8.4, 0.12, -4]} material={kit.cable}>
        <boxGeometry args={[0.22, 0.05, 17.4]} />
      </mesh>
      <mesh position={[8.55, 0.18, -4]} material={kit.copper}>
        <boxGeometry args={[0.08, 0.04, 17.4]} />
      </mesh>
    </group>
  );
}

function InnerYard({ kit }: { kit: Kit }) {
  const { profile } = useGfx();
  const pipes = useMemo(() => {
    const out: { pos: [number, number, number]; rot: [number, number, number]; r: number; h: number; m: THREE.Material }[] = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.15;
      const r = 9.15;
      out.push({
        pos: [Math.cos(a) * r, 0.42, Math.sin(a) * r],
        rot: [0, -a, Math.PI / 2],
        r: 0.08,
        h: 2.4,
        m: i % 3 === 0 ? kit.copper : kit.paintGray,
      });
    }
    return out;
  }, [kit]);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]} material={kit.paintGray}>
        <ringGeometry args={[10.35, 14.8, 72]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} material={kit.caution}>
        <ringGeometry args={[10.5, 10.72, 72]} />
      </mesh>
      {pipes.map((p, i) => (
        <mesh key={i} position={p.pos} rotation={p.rot} material={p.m}>
          <cylinderGeometry args={[p.r, p.r, p.h, 8]} />
        </mesh>
      ))}
      {[0.55, 1.85].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} material={kit.steelDark}>
          <torusGeometry args={[9.15, 0.05, 8, 64]} />
        </mesh>
      ))}
      {[-2.2, 1.4, 4.8].map((z, i) => (
        <group key={z} position={[8.85, 0, z]}>
          <mesh position={[0, 0.38, 0]} material={i === 1 ? kit.caution : kit.cabinet}>
            <boxGeometry args={[0.85, 0.76, 0.62]} />
          </mesh>
          <mesh position={[0, 0.8, 0]} material={kit.steelDark}>
            <boxGeometry args={[0.7, 0.08, 0.5]} />
          </mesh>
        </group>
      ))}
      {([
        [8.2, 4.6],
        [-7.4, 11.2],
        [3.2, -9.6],
      ] as const).map(([x, z]) => (
        <group key={`${x}-${z}`} position={[x, 0, z]}>
          <mesh position={[0, 0.55, 0]} rotation={[0, 0, Math.PI / 2]} material={kit.cable}>
            <cylinderGeometry args={[0.42, 0.42, 0.22, 12]} />
          </mesh>
          <mesh position={[0, 0.55, 0]} rotation={[0, 0, Math.PI / 2]} material={kit.copper}>
            <cylinderGeometry args={[0.18, 0.18, 0.28, 8]} />
          </mesh>
        </group>
      ))}
      {[-1.6, 1.2, 4.8, 7.4].map((a, i) => {
        const ang = (i / 4) * Math.PI + 0.4;
        return (
          <mesh key={a} position={[Math.cos(ang) * 10.9, 0.28, Math.sin(ang) * 10.9]} material={kit.caution}>
            <cylinderGeometry args={[0.09, 0.12, 0.56, 8]} />
          </mesh>
        );
      })}
      <group position={[9.6, 0, -6.4]}>
        <mesh position={[0, 1.15, 0]} material={kit.steelDark}>
          <cylinderGeometry args={[0.04, 0.04, 2.3, 6]} />
        </mesh>
        <mesh position={[0, 2.35, 0]} material={kit.emissiveWarm}>
          <boxGeometry args={[0.35, 0.08, 0.22]} />
        </mesh>
        {profile.lampLights ? <pointLight position={[0, 2.1, 0]} color="#f0c070" intensity={2.4} distance={9} /> : null}
      </group>
      <group position={[-8.8, 0, 7.2]}>
        <mesh position={[0, 1.15, 0]} material={kit.steelDark}>
          <cylinderGeometry args={[0.04, 0.04, 2.3, 6]} />
        </mesh>
        <mesh position={[0, 2.35, 0]} material={kit.emissiveWarm}>
          <boxGeometry args={[0.35, 0.08, 0.22]} />
        </mesh>
        {profile.lampLights ? <pointLight position={[0, 2.1, 0]} color="#f0c070" intensity={2.1} distance={8} /> : null}
      </group>
    </group>
  );
}

function HallDressing({ kit }: { kit: Kit }) {
  const beams = useRef<THREE.InstancedMesh>(null);
  const rust = useRef<THREE.InstancedMesh>(null);
  const beamGeo = useMemo(() => new THREE.BoxGeometry(0.22, 0.32, 7.4), []);
  const rustGeo = useMemo(() => new THREE.CylinderGeometry(0.22, 0.24, 0.08, 8), []);
  const nBeam = 11;
  const nRust = 14;
  useLayoutEffect(() => {
    const b = beams.current;
    const r = rust.current;
    if (!b || !r) return;
    const dummy = new THREE.Object3D();
    let i = 0;
    for (let k = 0; k < 6; k++) {
      dummy.position.set(-12 + k * 4.6, 7.85, -16.9);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      b.setMatrixAt(i++, dummy.matrix);
    }
    for (let k = 0; k < 5; k++) {
      dummy.position.set(-16.9, 7.85, -10 + k * 5.2);
      dummy.rotation.set(0, Math.PI / 2, 0);
      dummy.updateMatrix();
      b.setMatrixAt(i++, dummy.matrix);
    }
    b.count = i;
    b.instanceMatrix.needsUpdate = true;
    i = 0;
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2 + 0.1;
      const camGap = Math.abs(((a + Math.PI * 2) % (Math.PI * 2)) - Math.PI / 4);
      if (camGap < 0.42 || camGap > Math.PI * 2 - 0.42) continue;
      if (i >= nRust) break;
      dummy.position.set(Math.cos(a) * (HALL_R - 0.4), 0.18, Math.sin(a) * (HALL_R - 0.4));
      dummy.rotation.set(0, -a, 0);
      dummy.updateMatrix();
      r.setMatrixAt(i++, dummy.matrix);
    }
    r.count = i;
    r.instanceMatrix.needsUpdate = true;
    return () => {
      beamGeo.dispose();
      rustGeo.dispose();
    };
  }, [beamGeo, rustGeo]);
  return (
    <group>
      <instancedMesh ref={beams} args={[beamGeo, kit.steelDark, nBeam]} />
      <instancedMesh ref={rust} args={[rustGeo, kit.rust, nRust]} />
      <mesh position={[0, 0.4, -17.38]} material={kit.paintGray}>
        <boxGeometry args={[36, 0.55, 0.12]} />
      </mesh>
      <mesh position={[-17.38, 0.4, -2]} material={kit.paintGray}>
        <boxGeometry args={[0.12, 0.55, 32]} />
      </mesh>
      <mesh position={[-12.6, 3.22, -10.4]} material={kit.steelDark}>
        <boxGeometry args={[8.4, 0.05, 0.08]} />
      </mesh>
    </group>
  );
}

export function Hall() {
  const { profile, maps } = useGfx();
  const kit = useMemo(() => createKit(), []);
  useLayoutEffect(() => {
    if (maps) applySurfMaps(kit, maps);
  }, [kit, maps]);
  useLayoutEffect(() => () => disposeKit(kit), [kit]);
  const floorMap = maps?.hallFloor;
  const floorRough = maps?.hallFloorRough;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshPhysicalMaterial
          map={floorMap ?? undefined}
          roughnessMap={floorRough ?? undefined}
          bumpMap={profile.bump ? maps?.bump : undefined}
          bumpScale={maps?.bumpScale ?? 0}
          color={floorMap ? "#ffffff" : "#3a3e44"}
          metalness={0.16}
          roughness={0.68}
          clearcoat={0.12}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.014, 0]} material={kit.cautionDark}>
        <ringGeometry args={[HALL_R - 0.55, HALL_R - 0.15, 64]} />
      </mesh>
      <Columns kit={kit} />
      <Lamps kit={kit} extra={profile.extraDetail} />
      <PipeRack kit={kit} />
      <Mezzanine kit={kit} />
      <Stacks kit={kit} />
      <BackWalls kit={kit} />
      <CableTray kit={kit} />
      <InnerYard kit={kit} />
      {profile.extraDetail ? <HallDressing kit={kit} /> : null}
    </group>
  );
}

