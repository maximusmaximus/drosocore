import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { setFollowPos } from "@/lib/cam-focus";
import { activeSpeech, applySustainWorld, createFlies, stepFlies, type FlyState, type SpeechBillboard } from "@/lib/fly-sim";
import { SITE_PLACES } from "@/lib/ci";
import { useCi } from "@/lib/ci-store";
import { flyFollowY } from "@/lib/fly-view";
import { publishFlies } from "@/lib/fly-live";
import { observeFlies } from "@/lib/hive-live";
import { useSim } from "@/lib/store";
import { applySurfMaps, createKit, decorateFlyMaps, disposeKit } from "./materials";
import { FlyMesh } from "./Fly";
import { useGfx } from "./gfx";

const _v = new THREE.Vector3();

export function Flies({
  onSpeech,
}: {
  onSpeech: (s: SpeechBillboard[]) => void;
}) {
  const { profile, maps } = useGfx();
  const kit = useMemo(() => {
    const k = createKit();
    decorateFlyMaps(k, profile.anisotropy);
    if (maps) applySurfMaps(k, maps);
    return k;
  }, [profile.anisotropy, maps]);
  const states = useRef<FlyState[]>(createFlies());
  const acc = useRef(0);
  const speechAcc = useRef(0);
  const { camera, size } = useThree();
  const sites = useCi((s) => s.world.sites);
  const retired = useCi((s) => s.world.retiredRules);
  useLayoutEffect(() => {
    applySustainWorld(
      sites.map((id) => {
        const p = SITE_PLACES[id];
        return { id, x: p.x, y: p.y, z: p.z, roles: p.roles };
      }),
      retired,
    );
  }, [sites, retired]);
  useLayoutEffect(() => {
    publishFlies(states.current);
    return () => publishFlies([]);
  }, []);
  useLayoutEffect(() => () => disposeKit(kit), [kit]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const celebrating = useSim.getState().celebrating;
    acc.current += dt;
    const FIXED = 1 / 60;
    while (acc.current >= FIXED) {
      const t = performance.now() / 1000;
      stepFlies(states.current, FIXED, celebrating, t);
      observeFlies(states.current, t);
      acc.current -= FIXED;
    }
    const sel = useSim.getState().selected;
    if (sel) {
      const s = states.current[sel.index];
      if (s) setFollowPos(s.pos.x, flyFollowY(s.pos.y), s.pos.z);
    }
    speechAcc.current += dt;
    if (speechAcc.current > 0.08) {
      speechAcc.current = 0;
      const list = activeSpeech(states.current);
      const projected: SpeechBillboard[] = [];
      for (const s of list) {
        _v.set(s.x, s.y, s.z).project(camera);
        projected.push({
          index: s.index,
          text: s.text,
          x: (_v.x * 0.5 + 0.5) * size.width,
          y: (-_v.y * 0.5 + 0.5) * size.height,
          z: s.z,
        });
      }
      onSpeech(projected);
    }
  });

  return (
    <group>
      {states.current.map((f) => (
        <FlyMesh key={f.index} stateRef={states} index={f.index} kit={kit} />
      ))}
    </group>
  );
}
