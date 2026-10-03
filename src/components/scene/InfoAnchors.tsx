import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { FEATURES, type FeatureId } from "@/lib/guide";
import { useSim } from "@/lib/store";

export type ProjectedAnchor = {
  id: FeatureId;
  x: number;
  y: number;
  visible: boolean;
};

const _v = new THREE.Vector3();

export function InfoAnchors({ on }: { on: (items: ProjectedAnchor[]) => void }) {
  const { camera, size } = useThree();
  const acc = useRef(0);
  useFrame((_, delta) => {
    acc.current += delta;
    if (acc.current < 0.05) return;
    acc.current = 0;
    if (!useSim.getState().infoOn && useSim.getState().guideStep === null) {
      on([]);
      return;
    }
    const out: ProjectedAnchor[] = [];
    for (const f of FEATURES) {
      if (f.anchor.kind !== "world") continue;
      _v.set(f.anchor.pos[0], f.anchor.pos[1], f.anchor.pos[2]).project(camera);
      out.push({
        id: f.id,
        x: (_v.x * 0.5 + 0.5) * size.width,
        y: (-_v.y * 0.5 + 0.5) * size.height,
        visible: _v.z < 1 && _v.x > -1.15 && _v.x < 1.15 && _v.y > -1.15 && _v.y < 1.15,
      });
    }
    on(out);
  });
  return null;
}
