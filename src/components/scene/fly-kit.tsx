import type { CiGear } from "@/lib/ci";
import type { RoleId } from "@/lib/roles";
import type { StageId } from "@/lib/tiers";
import { GEO } from "./fly-geo";
import type { Kit } from "./materials";

const HELD: [number, number, number] = [0.155, 0.02, 0.08];

function HardHat({ kit, mat }: { kit: Kit; mat?: Kit[keyof Kit] }) {
  const m = mat ?? kit.caution;
  return (
    <group position={[0, 0.07, 0.114]} rotation={[-0.24, 0, 0]} scale={0.76}>
      <mesh geometry={GEO.hatDome} material={m} />
      <mesh geometry={GEO.hatBrim} material={m} />
      <mesh position={[0, 0.03, 0.002]} rotation={[0.08, 0, 0]} material={m}>
        <boxGeometry args={[0.01, 0.007, 0.058]} />
      </mesh>
      <mesh position={[0, 0.002, 0.018]} material={kit.plasticWhite}>
        <boxGeometry args={[0.024, 0.004, 0.012]} />
      </mesh>
      <mesh position={[0, -0.026, 0.006]} rotation={[0.4, 0, Math.PI / 2]} material={kit.rubber}>
        <torusGeometry args={[0.046, 0.0028, 5, 12, Math.PI]} />
      </mesh>
    </group>
  );
}

function Vest({ kit, mat }: { kit: Kit; mat: Kit[keyof Kit] }) {
  return (
    <group>
      <mesh position={[0.04, 0.026, 0.018]} rotation={[0.28, 0.72, 0.08]} material={mat}>
        <planeGeometry args={[0.052, 0.092]} />
      </mesh>
      <mesh position={[-0.04, 0.026, 0.018]} rotation={[0.28, -0.72, -0.08]} material={mat}>
        <planeGeometry args={[0.052, 0.092]} />
      </mesh>
      <mesh position={[0, 0.032, -0.048]} rotation={[0.2, 0, 0]} material={mat}>
        <planeGeometry args={[0.062, 0.078]} />
      </mesh>
      <mesh position={[0.04, 0.026, 0.02]} rotation={[0.28, 0.72, 0.08]} material={kit.plasticWhite}>
        <planeGeometry args={[0.052, 0.01]} />
      </mesh>
      <mesh position={[-0.04, 0.026, 0.02]} rotation={[0.28, -0.72, -0.08]} material={kit.plasticWhite}>
        <planeGeometry args={[0.052, 0.01]} />
      </mesh>
    </group>
  );
}

function Lapels({ mat }: { mat: Kit[keyof Kit] }) {
  return (
    <group>
      <mesh position={[0.038, 0.016, 0.05]} rotation={[0.4, 0.55, 0.08]} material={mat}>
        <planeGeometry args={[0.03, 0.1]} />
      </mesh>
      <mesh position={[-0.038, 0.016, 0.05]} rotation={[0.4, -0.55, -0.08]} material={mat}>
        <planeGeometry args={[0.03, 0.1]} />
      </mesh>
      <mesh position={[0, 0.014, -0.062]} rotation={[0.28, 0, 0]} material={mat}>
        <planeGeometry args={[0.07, 0.1]} />
      </mesh>
    </group>
  );
}

function Bib({ mat, w = 0.08, h = 0.09 }: { mat: Kit[keyof Kit]; w?: number; h?: number }) {
  return (
    <mesh position={[0, -0.01, 0.07]} rotation={[0.95, 0, 0]} material={mat}>
      <planeGeometry args={[w, h]} />
    </mesh>
  );
}

function Goggles({ kit }: { kit: Kit }) {
  return (
    <group position={[0, 0.024, 0.172]}>
      <mesh position={[0.054, 0, 0]} rotation={[Math.PI / 2, 0, 0]} material={kit.rubber}>
        <torusGeometry args={[0.024, 0.0045, 6, 12]} />
      </mesh>
      <mesh position={[-0.054, 0, 0]} rotation={[Math.PI / 2, 0, 0]} material={kit.rubber}>
        <torusGeometry args={[0.024, 0.0045, 6, 12]} />
      </mesh>
      <mesh position={[0.054, 0, 0.002]} material={kit.glass} scale={[0.92, 0.82, 0.26]}>
        <sphereGeometry args={[0.022, 10, 8]} />
      </mesh>
      <mesh position={[-0.054, 0, 0.002]} material={kit.glass} scale={[0.92, 0.82, 0.26]}>
        <sphereGeometry args={[0.022, 10, 8]} />
      </mesh>
      <mesh position={[0, 0.002, 0]} material={kit.rubber}>
        <boxGeometry args={[0.028, 0.005, 0.005]} />
      </mesh>
    </group>
  );
}

function Gauntlets({ kit, mat }: { kit: Kit; mat?: Kit[keyof Kit] }) {
  const m = mat ?? kit.leather;
  return (
    <group>
      <mesh geometry={GEO.gauntlet} material={m} position={[0.068, -0.018, 0.058]} rotation={[0.55, 0, 0.72]} />
      <mesh geometry={GEO.gauntlet} material={m} position={[-0.068, -0.018, 0.058]} rotation={[0.55, 0, -0.72]} />
    </group>
  );
}

function WeldHood({ kit }: { kit: Kit }) {
  return (
    <group>
      <mesh position={[0, 0.046, 0.118]} rotation={[0.15, 0, Math.PI / 2]} material={kit.rubber}>
        <torusGeometry args={[0.055, 0.005, 5, 14]} />
      </mesh>
      <group position={[0, 0.1, 0.078]} rotation={[-1.22, 0, 0]}>
        <mesh material={kit.coilCase}>
          <sphereGeometry args={[0.052, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        </mesh>
        <mesh position={[0, 0.002, 0.04]} material={kit.coilCase}>
          <boxGeometry args={[0.048, 0.018, 0.007]} />
        </mesh>
        <mesh position={[0, 0.002, 0.045]} material={kit.visorDark}>
          <planeGeometry args={[0.038, 0.012]} />
        </mesh>
      </group>
    </group>
  );
}

function Headset({ kit }: { kit: Kit }) {
  return (
    <group position={[0, 0.04, 0.118]}>
      <mesh rotation={[0.15, 0, Math.PI / 2]} material={kit.cable}>
        <torusGeometry args={[0.068, 0.004, 5, 14, Math.PI]} />
      </mesh>
      <mesh position={[0.07, 0.002, 0.008]} material={kit.cabinet}>
        <boxGeometry args={[0.016, 0.032, 0.028]} />
      </mesh>
      <mesh position={[-0.07, 0.002, 0.008]} material={kit.cabinet}>
        <boxGeometry args={[0.016, 0.032, 0.028]} />
      </mesh>
      <mesh position={[0.042, -0.018, 0.042]} rotation={[0.5, -0.35, 0]} material={kit.steel}>
        <cylinderGeometry args={[0.0025, 0.0025, 0.07, 5]} />
      </mesh>
    </group>
  );
}

function Belt({ kit }: { kit: Kit }) {
  return (
    <mesh position={[0, -0.018, -0.01]} rotation={[Math.PI / 2, 0, 0]} material={kit.leather}>
      <torusGeometry args={[0.072, 0.007, 6, 16]} />
    </mesh>
  );
}

function BallCap({ kit }: { kit: Kit }) {
  return (
    <group position={[0, 0.068, 0.114]} rotation={[-0.3, 0, 0]} scale={0.9}>
      <mesh material={kit.plasticTan}>
        <sphereGeometry args={[0.048, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
      </mesh>
      <mesh position={[0, -0.016, 0.042]} rotation={[0.12, 0, 0]} material={kit.plasticTan} scale={[1, 0.18, 1.05]}>
        <cylinderGeometry args={[0.042, 0.05, 0.012, 12, 1, false, -0.4, Math.PI + 0.8]} />
      </mesh>
    </group>
  );
}

export function Tool({ id, kit, detail }: { id: RoleId; kit: Kit; detail: "lod" | "hero" }) {
  switch (id) {
    case "welder":
      return (
        <group position={HELD} rotation={[0.2, 0.35, 0.95]}>
          <mesh material={kit.rubber}>
            <boxGeometry args={[0.022, 0.062, 0.028]} />
          </mesh>
          <mesh position={[0.006, 0.004, 0.018]} material={kit.steel}>
            <boxGeometry args={[0.006, 0.02, 0.012]} />
          </mesh>
          <mesh position={[0, 0.048, 0.016]} rotation={[0.7, 0, 0]} material={kit.steel}>
            <cylinderGeometry args={[0.009, 0.009, 0.055, 8]} />
          </mesh>
          <mesh position={[0, 0.082, 0.04]} rotation={[0.7, 0, 0]} material={kit.copper}>
            <cylinderGeometry args={[0.012, 0.01, 0.028, 8]} />
          </mesh>
          <mesh position={[0, 0.098, 0.052]} rotation={[0.7, 0, 0]} material={kit.steel}>
            <cylinderGeometry args={[0.004, 0.003, 0.018, 6]} />
          </mesh>
          {detail === "hero" ? (
            <mesh position={[0, -0.038, -0.018]} rotation={[1.15, 0, 0]} material={kit.cable}>
              <torusGeometry args={[0.028, 0.005, 5, 10, Math.PI]} />
            </mesh>
          ) : null}
        </group>
      );
    case "coil":
      return (
        <group position={[0.145, 0.035, 0.04]} rotation={[0.35, 0.2, 0.25]}>
          <mesh material={kit.wood} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.038, 0.038, 0.048, 12]} />
          </mesh>
          <mesh material={kit.copper} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.044, 0.013, 8, 16]} />
          </mesh>
          {detail === "hero" ? (
            <mesh material={kit.copperBright} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.036, 0.008, 6, 14]} />
            </mesh>
          ) : null}
          <mesh position={[0, 0, 0.028]} material={kit.wood}>
            <cylinderGeometry args={[0.048, 0.048, 0.007, 12]} />
          </mesh>
          <mesh position={[0, 0, -0.028]} material={kit.wood}>
            <cylinderGeometry args={[0.048, 0.048, 0.007, 12]} />
          </mesh>
        </group>
      );
    case "physicist":
      return (
        <group position={[0.132, -0.018, 0.088]} rotation={[-0.55, 0.32, 0.12]}>
          <mesh material={kit.cabinet}>
            <boxGeometry args={[0.086, 0.058, 0.01]} />
          </mesh>
          <mesh position={[0, 0.002, 0.007]} material={kit.emissiveCyan}>
            <boxGeometry args={[0.07, 0.044, 0.003]} />
          </mesh>
          <mesh position={[0, -0.036, 0]} material={kit.steel}>
            <boxGeometry args={[0.028, 0.012, 0.008]} />
          </mesh>
          {detail === "hero" ? (
            <mesh position={[0.03, 0.022, 0.008]} material={kit.coilCase}>
              <boxGeometry args={[0.008, 0.008, 0.004]} />
            </mesh>
          ) : null}
        </group>
      );
    case "pipe":
      return (
        <group position={HELD} rotation={[0.15, 0.08, 0.9]}>
          <mesh material={kit.steel}>
            <cylinderGeometry args={[0.009, 0.009, 0.14, 8]} />
          </mesh>
          <mesh position={[0, 0.072, 0]} material={kit.steel}>
            <boxGeometry args={[0.02, 0.042, 0.038]} />
          </mesh>
          <mesh position={[0.02, 0.09, 0]} material={kit.steel}>
            <boxGeometry args={[0.032, 0.016, 0.036]} />
          </mesh>
          <mesh position={[0, 0.055, 0.016]} rotation={[Math.PI / 2, 0, 0]} material={kit.copper}>
            <cylinderGeometry args={[0.012, 0.012, 0.014, 8]} />
          </mesh>
          <mesh position={[0.15, 0.02, 0]} rotation={[0, 0, Math.PI / 2]} material={kit.copper}>
            <cylinderGeometry args={[0.013, 0.013, 0.1, 8]} />
          </mesh>
        </group>
      );
    case "crane":
      return (
        <group position={HELD}>
          <mesh material={kit.caution}>
            <boxGeometry args={[0.05, 0.078, 0.026]} />
          </mesh>
          {[0.02, 0.0, -0.02].map((y, i) => (
            <mesh key={i} position={[0.01, y, 0.016]} material={i === 2 ? kit.crane : kit.plasticWhite}>
              <cylinderGeometry args={[0.006, 0.006, 0.008, 8]} />
            </mesh>
          ))}
          <mesh position={[-0.01, 0.02, 0.016]} material={kit.emissiveAmber}>
            <boxGeometry args={[0.01, 0.008, 0.004]} />
          </mesh>
          <mesh position={[0, 0.052, 0]} material={kit.cable}>
            <cylinderGeometry args={[0.007, 0.007, 0.036, 6]} />
          </mesh>
          {detail === "hero" ? (
            <mesh position={[0, 0.078, 0]} rotation={[1.2, 0, 0]} material={kit.cable}>
              <torusGeometry args={[0.02, 0.005, 5, 10, Math.PI]} />
            </mesh>
          ) : null}
        </group>
      );
    case "inspector":
      return (
        <group position={HELD} rotation={[0.28, 0.18, 0.18]}>
          <mesh material={kit.wood}>
            <boxGeometry args={[0.068, 0.088, 0.008]} />
          </mesh>
          <mesh position={[0, 0.042, 0.002]} material={kit.steel}>
            <boxGeometry args={[0.05, 0.012, 0.012]} />
          </mesh>
          <mesh position={[0, -0.004, 0.007]} material={kit.paper}>
            <boxGeometry args={[0.056, 0.068, 0.003]} />
          </mesh>
          <mesh position={[0.058, 0.018, 0.012]} rotation={[Math.PI / 2, 0.15, 0]} material={kit.steel}>
            <torusGeometry args={[0.02, 0.004, 6, 12]} />
          </mesh>
          <mesh position={[0.058, 0.018, 0.012]} material={kit.glass} scale={[1, 1, 0.22]}>
            <sphereGeometry args={[0.016, 10, 8]} />
          </mesh>
        </group>
      );
    case "electric":
      return (
        <group position={HELD} rotation={[0.18, 0, 0.35]}>
          <mesh material={kit.caution}>
            <boxGeometry args={[0.026, 0.086, 0.018]} />
          </mesh>
          <mesh position={[0, 0.022, 0.012]} material={kit.cabinet}>
            <boxGeometry args={[0.018, 0.022, 0.004]} />
          </mesh>
          <mesh position={[0, 0.022, 0.015]} material={kit.emissiveAmber}>
            <boxGeometry args={[0.012, 0.008, 0.002]} />
          </mesh>
          <mesh position={[0.007, -0.058, 0]} rotation={[0.35, 0, 0]} material={kit.crane}>
            <cylinderGeometry args={[0.003, 0.002, 0.055, 5]} />
          </mesh>
          <mesh position={[-0.007, -0.058, 0]} rotation={[0.45, 0, 0]} material={kit.cable}>
            <cylinderGeometry args={[0.003, 0.002, 0.05, 5]} />
          </mesh>
        </group>
      );
    case "cryo":
      return (
        <group position={HELD} rotation={[0.12, 0.2, 0.15]}>
          <mesh material={kit.frost}>
            <cylinderGeometry args={[0.032, 0.038, 0.11, 10]} />
          </mesh>
          <mesh position={[0, 0.062, 0]} material={kit.steel}>
            <cylinderGeometry args={[0.022, 0.028, 0.018, 10]} />
          </mesh>
          <mesh position={[0, 0.078, 0]} material={kit.steel}>
            <torusGeometry args={[0.016, 0.005, 6, 12]} />
          </mesh>
          {detail === "hero" ? (
            <mesh position={[0.028, 0.01, 0]} rotation={[0, 0, Math.PI / 2]} material={kit.frost}>
              <cylinderGeometry args={[0.008, 0.008, 0.036, 8]} />
            </mesh>
          ) : null}
        </group>
      );
    case "builder":
      return (
        <group position={[0.14, 0.02, 0.06]} rotation={[0.2, 0.4, 0.5]}>
          <mesh material={kit.steel}>
            <boxGeometry args={[0.12, 0.018, 0.028]} />
          </mesh>
          <mesh position={[0, 0.02, 0]} material={kit.steelDark}>
            <boxGeometry args={[0.1, 0.022, 0.018]} />
          </mesh>
          {detail === "hero" ? (
            <mesh position={[0.05, 0, 0]} material={kit.caution}>
              <boxGeometry args={[0.008, 0.026, 0.03]} />
            </mesh>
          ) : null}
        </group>
      );
    case "safety":
      return (
        <group position={HELD} rotation={[0.2, 0, 0.4]}>
          <mesh material={kit.caution}>
            <boxGeometry args={[0.09, 0.12, 0.008]} />
          </mesh>
          <mesh position={[0, 0, 0.006]} material={kit.plasticWhite}>
            <boxGeometry args={[0.062, 0.018, 0.004]} />
          </mesh>
        </group>
      );
    case "diag":
      return (
        <group position={HELD} rotation={[0.4, 0.2, 0.9]}>
          <mesh material={kit.cabinet}>
            <cylinderGeometry args={[0.01, 0.01, 0.12, 8]} />
          </mesh>
          <mesh position={[0, 0.07, 0]} material={kit.copper}>
            <cylinderGeometry args={[0.004, 0.001, 0.05, 6]} />
          </mesh>
          <mesh position={[0, -0.04, 0]} material={kit.cable}>
            <cylinderGeometry args={[0.012, 0.012, 0.03, 8]} />
          </mesh>
          {detail === "hero" ? (
            <mesh position={[0, 0.096, 0]} material={kit.emissiveCyan}>
              <sphereGeometry args={[0.008, 8, 6]} />
            </mesh>
          ) : null}
        </group>
      );
    case "coder":
      return (
        <group position={[0.13, -0.01, 0.07]} rotation={[-0.4, 0.25, 0.1]}>
          <mesh material={kit.cabinet}>
            <boxGeometry args={[0.1, 0.062, 0.012]} />
          </mesh>
          <mesh position={[0, 0.004, 0.008]} material={kit.emissiveCyan}>
            <boxGeometry args={[0.084, 0.048, 0.003]} />
          </mesh>
          <mesh position={[0, -0.04, -0.01]} material={kit.steelDark}>
            <boxGeometry args={[0.1, 0.008, 0.07]} />
          </mesh>
        </group>
      );
    case "divertor":
      return (
        <group position={HELD} rotation={[0.5, 0.2, 0.15]}>
          <mesh material={kit.tungsten}>
            <boxGeometry args={[0.1, 0.018, 0.08]} />
          </mesh>
          {detail === "hero" ? (
            <mesh position={[0, 0.012, 0]} material={kit.steelDark}>
              <boxGeometry args={[0.08, 0.006, 0.06]} />
            </mesh>
          ) : null}
        </group>
      );
    case "vacuum":
      return (
        <group position={HELD} rotation={[0.15, 0, 0.25]}>
          <mesh material={kit.steel}>
            <cylinderGeometry args={[0.032, 0.036, 0.07, 10]} />
          </mesh>
          <mesh position={[0, 0.05, 0]} material={kit.steelDark}>
            <cylinderGeometry args={[0.018, 0.022, 0.03, 10]} />
          </mesh>
          <mesh position={[0, 0.072, 0]} rotation={[Math.PI / 2, 0, 0]} material={kit.steel}>
            <torusGeometry args={[0.02, 0.006, 6, 12]} />
          </mesh>
          {detail === "hero"
            ? [0, 1, 2, 3].map((i) => (
                <mesh key={i} position={[0, 0.01, 0]} rotation={[0, (i * Math.PI) / 2, 0]} material={kit.steelDark}>
                  <boxGeometry args={[0.05, 0.008, 0.006]} />
                </mesh>
              ))
            : null}
        </group>
      );
    case "magnet":
      return (
        <group position={[0.14, 0.02, 0.05]} rotation={[0.4, 0.2, 0.3]}>
          <mesh material={kit.coil} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.036, 0.014, 8, 16]} />
          </mesh>
          <mesh material={kit.steel}>
            <boxGeometry args={[0.03, 0.08, 0.016]} />
          </mesh>
        </group>
      );
    case "janitor":
      return (
        <group position={HELD} rotation={[0.2, 0.1, 0.85]}>
          <mesh material={kit.wood}>
            <cylinderGeometry args={[0.007, 0.007, 0.22, 6]} />
          </mesh>
          <mesh position={[0, 0.12, 0]} rotation={[0.4, 0, 0]} material={kit.plasticTan}>
            <boxGeometry args={[0.08, 0.012, 0.04]} />
          </mesh>
          {detail === "hero" ? (
            <mesh position={[0, 0.128, 0.01]} material={kit.steelDark}>
              <boxGeometry args={[0.07, 0.004, 0.018]} />
            </mesh>
          ) : null}
        </group>
      );
    default:
      return null;
  }
}

export function Outfit({ id, kit, detail }: { id: RoleId; kit: Kit; detail: "lod" | "hero" }) {
  switch (id) {
    case "welder":
      return (
        <group>
          <WeldHood kit={kit} />
          <Gauntlets kit={kit} mat={kit.leather} />
        </group>
      );
    case "coil":
      return (
        <group>
          <Vest kit={kit} mat={kit.coil} />
          <Gauntlets kit={kit} />
        </group>
      );
    case "physicist":
      return (
        <group>
          <Goggles kit={kit} />
          <Lapels mat={kit.labCoat} />
          {detail === "hero" ? (
            <mesh position={[0.036, 0.038, 0.08]} material={kit.coilCase}>
              <boxGeometry args={[0.016, 0.01, 0.006]} />
            </mesh>
          ) : null}
        </group>
      );
    case "pipe":
      return (
        <group>
          <Belt kit={kit} />
          <Gauntlets kit={kit} />
        </group>
      );
    case "crane":
      return (
        <group>
          <HardHat kit={kit} mat={kit.crane} />
          <Vest kit={kit} mat={kit.hiVis} />
        </group>
      );
    case "inspector":
      return (
        <group>
          <HardHat kit={kit} mat={kit.plasticWhite} />
          <Lapels mat={kit.labCoat} />
        </group>
      );
    case "electric":
      return (
        <group>
          <HardHat kit={kit} mat={kit.caution} />
          <Vest kit={kit} mat={kit.coilCase} />
          <Gauntlets kit={kit} mat={kit.rubber} />
        </group>
      );
    case "cryo":
      return (
        <group>
          <Goggles kit={kit} />
          <Lapels mat={kit.labCoat} />
          <Gauntlets kit={kit} mat={kit.frost} />
        </group>
      );
    case "builder":
      return (
        <group>
          <HardHat kit={kit} />
          <Vest kit={kit} mat={kit.hiVis} />
          <Belt kit={kit} />
        </group>
      );
    case "safety":
      return (
        <group>
          <HardHat kit={kit} mat={kit.caution} />
          <Vest kit={kit} mat={kit.hiVis} />
        </group>
      );
    case "diag":
      return (
        <group>
          <Headset kit={kit} />
          <Lapels mat={kit.labCoat} />
        </group>
      );
    case "coder":
      return (
        <group>
          <Headset kit={kit} />
          <Lapels mat={kit.labCoat} />
        </group>
      );
    case "divertor":
      return (
        <group>
          <HardHat kit={kit} mat={kit.steelDark} />
          <Gauntlets kit={kit} mat={kit.tungsten} />
        </group>
      );
    case "vacuum":
      return (
        <group>
          <Goggles kit={kit} />
          <Vest kit={kit} mat={kit.steelDark} />
        </group>
      );
    case "magnet":
      return (
        <group>
          <Vest kit={kit} mat={kit.coil} />
          <Gauntlets kit={kit} />
        </group>
      );
    case "janitor":
      return (
        <group>
          <BallCap kit={kit} />
          <Bib mat={kit.plasticTan} w={0.08} h={0.09} />
          <Belt kit={kit} />
        </group>
      );
    default:
      return null;
  }
}

export function Gear({
  id,
  kit,
  stage,
  detail,
}: {
  id: RoleId;
  kit: Kit;
  stage: StageId;
  detail: "lod" | "hero";
}) {
  if (stage === "larva" || stage === "pupa") return null;
  return (
    <group>
      <Outfit id={id} kit={kit} detail={detail} />
      <Tool id={id} kit={kit} detail={detail} />
      {stage === "foreman" ? (
        <group>
          <HardHat kit={kit} mat={kit.plasticWhite} />
          <Belt kit={kit} />
        </group>
      ) : null}
      {stage === "wizard" ? (
        <group>
          <mesh geometry={GEO.wizardHat} material={kit.cape} position={[0, 0.078, 0.108]} rotation={[-0.22, 0, 0]} />
          <mesh position={[0, 0.01, -0.118]} rotation={[0.52, 0, 0]} material={kit.cape}>
            <planeGeometry args={[0.26, 0.28]} />
          </mesh>
          <mesh position={[0.02, 0.0, -0.1]} rotation={[0.5, 0.08, 0.04]} material={kit.cape}>
            <planeGeometry args={[0.14, 0.22]} />
          </mesh>
          <mesh geometry={GEO.staff} material={kit.coilCase} position={[0.17, 0.05, 0.02]} rotation={[0, 0, 0.28]} />
          <mesh geometry={GEO.orb} material={kit.emissiveCyan} position={[0.21, 0.2, 0.02]} />
        </group>
      ) : null}
    </group>
  );
}

export function RankKit({ stage, kit }: { stage: StageId; kit: Kit }) {
  if (stage === "foreman") {
    return (
      <group>
        <HardHat kit={kit} mat={kit.plasticWhite} />
        <Belt kit={kit} />
      </group>
    );
  }
  if (stage === "wizard") {
    return (
      <group>
        <mesh geometry={GEO.wizardHat} material={kit.cape} position={[0, 0.078, 0.108]} rotation={[-0.22, 0, 0]} />
        <mesh position={[0, 0.01, -0.118]} rotation={[0.52, 0, 0]} material={kit.cape}>
          <planeGeometry args={[0.26, 0.28]} />
        </mesh>
        <mesh geometry={GEO.staff} material={kit.coilCase} position={[0.17, 0.05, 0.02]} rotation={[0, 0, 0.28]} />
        <mesh geometry={GEO.orb} material={kit.emissiveCyan} position={[0.21, 0.2, 0.02]} />
      </group>
    );
  }
  return null;
}

/** Voted CI upgrade, pulled off the fly so it can sit on its own stand. */
export function CiKit({ gear, kit }: { gear: CiGear; kit: Kit }) {
  if (gear === "none") return null;
  if (gear === "hood") {
    return (
      <group position={[0, 0.07, 0.12]} rotation={[-0.3, 0, 0]}>
        <mesh material={kit.steelDark}>
          <sphereGeometry args={[0.07, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        <mesh position={[0, -0.01, 0.05]} rotation={[0.2, 0, 0]} material={kit.glass}>
          <planeGeometry args={[0.1, 0.05]} />
        </mesh>
      </group>
    );
  }
  if (gear === "goggles") {
    return (
      <group position={[0, 0.03, 0.17]}>
        <mesh position={[0.05, 0, 0]} rotation={[Math.PI / 2, 0, 0]} material={kit.frost}>
          <torusGeometry args={[0.022, 0.005, 6, 10]} />
        </mesh>
        <mesh position={[-0.05, 0, 0]} rotation={[Math.PI / 2, 0, 0]} material={kit.frost}>
          <torusGeometry args={[0.022, 0.005, 6, 10]} />
        </mesh>
      </group>
    );
  }
  if (gear === "harness") {
    return (
      <group>
        <mesh position={[0, 0.02, 0.02]} rotation={[0.4, 0, 0]} material={kit.cable}>
          <torusGeometry args={[0.07, 0.008, 6, 14]} />
        </mesh>
        <mesh position={[0.06, -0.02, 0.02]} material={kit.steel}>
          <boxGeometry args={[0.02, 0.04, 0.016]} />
        </mesh>
      </group>
    );
  }
  if (gear === "cape") {
    return (
      <mesh position={[0, 0.01, -0.08]} rotation={[0.5, 0, 0]} material={kit.emissiveCyan}>
        <planeGeometry args={[0.14, 0.16]} />
      </mesh>
    );
  }
  return (
    <group position={[0, 0.08, 0.14]}>
      <mesh position={[0.03, 0.02, 0]} rotation={[0.4, 0.4, 0]} material={kit.setae}>
        <cylinderGeometry args={[0.004, 0.002, 0.08, 4]} />
      </mesh>
      <mesh position={[-0.03, 0.02, 0]} rotation={[0.4, -0.4, 0]} material={kit.setae}>
        <cylinderGeometry args={[0.004, 0.002, 0.08, 4]} />
      </mesh>
    </group>
  );
}
