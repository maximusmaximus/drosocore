import { useLayoutEffect, useMemo } from "react";
import { CORE_POS } from "@/lib/constants";
import { SITE_PLACES, type CiSite } from "@/lib/ci";
import { useCi } from "@/lib/ci-store";
import { applySurfMaps, createKit, disposeKit } from "./materials";
import { useGfx } from "./gfx";

function SiteMark({
  id,
  kit,
  lamps,
}: {
  id: CiSite;
  kit: ReturnType<typeof createKit>;
  lamps: boolean;
}) {
  const p = SITE_PLACES[id];
  const mat =
    id === "bus-gallery" || id === "fuel-shed"
      ? kit.copper
      : id === "cryo-bay"
        ? kit.frost
        : id === "control-perch"
          ? kit.nbi
          : kit.steel;
  return (
    <group position={[p.x, 0, p.z]}>
      <mesh position={[0, 0.08, 0]} material={kit.diamond} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.72, 20]} />
      </mesh>
      <mesh position={[0, 0.42, 0]} material={mat}>
        <boxGeometry args={[0.9, 0.16, 0.55]} />
      </mesh>
      <mesh position={[-0.32, 0.22, -0.18]} material={kit.steelDark}>
        <cylinderGeometry args={[0.04, 0.05, 0.44, 8]} />
      </mesh>
      <mesh position={[0.32, 0.22, -0.18]} material={kit.steelDark}>
        <cylinderGeometry args={[0.04, 0.05, 0.44, 8]} />
      </mesh>
      <mesh position={[-0.32, 0.22, 0.18]} material={kit.steelDark}>
        <cylinderGeometry args={[0.04, 0.05, 0.44, 8]} />
      </mesh>
      <mesh position={[0.32, 0.22, 0.18]} material={kit.steelDark}>
        <cylinderGeometry args={[0.04, 0.05, 0.44, 8]} />
      </mesh>
      {id === "cryo-bay" || id === "fuel-shed" ? (
        <mesh position={[0.55, 0.38, 0]} material={kit.steel}>
          <cylinderGeometry args={[0.16, 0.18, 0.55, 12]} />
        </mesh>
      ) : null}
      {id === "control-perch" || id === "bus-gallery" ? (
        <mesh position={[0, 0.78, 0]} material={kit.emissiveCyan}>
          <boxGeometry args={[0.22, 0.08, 0.12]} />
        </mesh>
      ) : null}
      {lamps ? (
        <pointLight
          position={[0, 1.1, 0]}
          color={id === "fuel-shed" ? "#f5c56e" : "#7cf0d8"}
          intensity={0.8}
          distance={4.5}
        />
      ) : null}
    </group>
  );
}

export function CiInstalls() {
  const { maps, profile } = useGfx();
  const kit = useMemo(() => createKit(), []);
  const world = useCi((s) => s.world);
  useLayoutEffect(() => {
    if (maps) applySurfMaps(kit, maps);
  }, [kit, maps]);
  useLayoutEffect(() => () => disposeKit(kit), [kit]);

  const extras = Array.from({ length: world.extraModules }, (_, i) => {
    const a = (i / Math.max(1, world.extraModules)) * Math.PI * 2 + 0.55;
    const r = 0.95 + (i % 3) * 0.12;
    return {
      key: i,
      pos: [Math.cos(a) * r, 0.62 + (i % 3) * 0.22, Math.sin(a) * r] as [number, number, number],
      rot: [0, -a, 0] as [number, number, number],
    };
  });

  return (
    <group>
      <group position={[CORE_POS.x, CORE_POS.y, CORE_POS.z]}>
        {extras.map((e) => (
          <group key={e.key} position={e.pos} rotation={e.rot}>
            <mesh material={kit.coil}>
              <torusGeometry args={[0.11, 0.028, 8, 16]} />
            </mesh>
            <mesh position={[0.12, 0, 0]} material={kit.emissiveCore}>
              <boxGeometry args={[0.08, 0.06, 0.05]} />
            </mesh>
          </group>
        ))}
        {world.glowAdd > 0 ? (
          <pointLight position={[0, 1.4, 0]} color="#7cf0d8" intensity={1.2 + world.glowAdd * 1.6} distance={10} />
        ) : null}
      </group>

      {world.props.includes("rack") ? (
        <group position={[11.4, 0, 7.6]}>
          <mesh position={[0, 0.85, 0]} material={kit.steelDark}>
            <boxGeometry args={[1.35, 1.7, 0.42]} />
          </mesh>
          {[0.35, 0.7, 1.05, 1.4].map((y) => (
            <mesh key={y} position={[0, y, 0.02]} material={kit.steel}>
              <boxGeometry args={[1.2, 0.04, 0.38]} />
            </mesh>
          ))}
          <mesh position={[0, 1.72, 0]} material={kit.caution}>
            <boxGeometry args={[1.38, 0.05, 0.44]} />
          </mesh>
        </group>
      ) : null}

      {world.props.includes("lamp") ? (
        <group position={[CORE_POS.x + 1.6, 0, CORE_POS.z + 1.1]}>
          <mesh position={[0, 1.1, 0]} material={kit.steel}>
            <cylinderGeometry args={[0.04, 0.05, 2.2, 8]} />
          </mesh>
          <mesh position={[0.35, 2.15, 0]} rotation={[0, 0, -0.6]} material={kit.steelDark}>
            <boxGeometry args={[0.7, 0.08, 0.22]} />
          </mesh>
          <mesh position={[0.55, 2.05, 0]} material={kit.emissiveAmber}>
            <cylinderGeometry args={[0.12, 0.16, 0.08, 10]} />
          </mesh>
          <pointLight position={[0.55, 2.0, 0]} color="#ffd8a0" intensity={3.2} distance={8} />
        </group>
      ) : null}

      {world.props.includes("crate") ? (
        <group position={[12.4, 0, 8.8]}>
          <mesh position={[0, 0.42, 0]} material={kit.wood}>
            <boxGeometry args={[0.95, 0.82, 0.95]} />
          </mesh>
          <mesh position={[0, 0.84, 0]} material={kit.caution}>
            <boxGeometry args={[0.98, 0.05, 0.98]} />
          </mesh>
          <mesh position={[0, 0.48, 0.48]} material={kit.cable}>
            <torusGeometry args={[0.16, 0.04, 6, 12]} />
          </mesh>
        </group>
      ) : null}

      {world.props.includes("decal") ? (
        <mesh position={[CORE_POS.x, 0.03, CORE_POS.z + 2.4]} rotation={[-Math.PI / 2, 0, 0.2]} material={kit.caution}>
          <planeGeometry args={[1.8, 0.55]} />
        </mesh>
      ) : null}

      {world.sites.map((id) => (
        <SiteMark key={id} id={id} kit={kit} lamps={profile.lampLights} />
      ))}
    </group>
  );
}
