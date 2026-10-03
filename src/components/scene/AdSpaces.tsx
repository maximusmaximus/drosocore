import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { AD_SPACES, adHitScale, type AdSpace } from "@/lib/ad-spaces";
import { playClick } from "@/lib/audio";
import { recentlyPinched } from "@/lib/cam-focus";
import { AD_FONT, HOT_PINK, VACANT_COPY, houseCreativeFor, type HouseCreative } from "@/lib/house-ads";
import { useAds } from "@/lib/ads-store";
import { useSim } from "@/lib/store";

function canvasSize(w: number, h: number) {
  const aspect = w / Math.max(0.01, h);
  if (aspect >= 1) return { cw: 1024, ch: Math.max(280, Math.round(1024 / aspect)) };
  return { cw: Math.max(280, Math.round(1024 * aspect)), ch: 1024 };
}

function wrapLines(g: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (g.measureText(next).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

function paintBoard(
  g: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  kind: "vacant" | "house",
  house?: HouseCreative | null,
) {
  g.fillStyle = "#3a1024";
  g.fillRect(0, 0, cw, ch);
  const m = Math.max(18, Math.min(cw, ch) * 0.05);
  g.strokeStyle = HOT_PINK;
  g.lineWidth = Math.max(14, Math.min(cw, ch) * 0.028);
  g.setLineDash([Math.max(18, cw * 0.03), Math.max(10, cw * 0.016)]);
  g.strokeRect(m, m, cw - m * 2, ch - m * 2);
  g.setLineDash([]);
  g.fillStyle = HOT_PINK;
  g.textAlign = "center";
  g.textBaseline = "middle";
  const cx = cw / 2;
  const cy = ch / 2;
  if (kind === "vacant") {
    const size = Math.max(36, Math.min(cw * 0.13, ch * 0.26));
    g.font = `700 ${size}px ${AD_FONT}`;
    const lines = wrapLines(g, VACANT_COPY, cw - m * 4);
    const gap = size * 1.1;
    const top = cy - ((lines.length - 1) * gap) / 2;
    lines.forEach((line, i) => g.fillText(line, cx, top + i * gap));
    return;
  }
  const copy = house!;
  const titleSize = Math.max(30, Math.min(cw * 0.1, ch * 0.2));
  g.font = `700 ${titleSize}px ${AD_FONT}`;
  const titles = wrapLines(g, copy.title, cw - m * 4);
  const lineSize = Math.max(18, titleSize * 0.42);
  g.font = `700 ${lineSize}px ${AD_FONT}`;
  const body = wrapLines(g, copy.line, cw - m * 4);
  const subSize = Math.max(14, lineSize * 0.78);
  const block = titles.length * titleSize * 1.05 + body.length * lineSize * 1.15 + subSize * 1.4;
  let y = cy - block / 2 + titleSize * 0.5;
  g.font = `700 ${titleSize}px ${AD_FONT}`;
  for (const t of titles) {
    g.fillText(t, cx, y);
    y += titleSize * 1.05;
  }
  y += lineSize * 0.35;
  g.font = `700 ${lineSize}px ${AD_FONT}`;
  for (const t of body) {
    g.fillText(t, cx, y);
    y += lineSize * 1.15;
  }
  y += subSize * 0.4;
  g.font = `700 ${subSize}px ${AD_FONT}`;
  g.fillText(copy.sub, cx, y);
}

function makeBoardTex(space: AdSpace, house: HouseCreative | null) {
  const { cw, ch } = canvasSize(space.size[0], space.size[1]);
  const c = document.createElement("canvas");
  c.width = cw;
  c.height = ch;
  const g = c.getContext("2d")!;
  paintBoard(g, cw, ch, house ? "house" : "vacant", house);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function useImageTexture(url: string | null) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!url) {
      setTex(null);
      return;
    }
    let alive = true;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      url,
      (t) => {
        if (!alive) {
          t.dispose();
          return;
        }
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        t.needsUpdate = true;
        setTex(t);
      },
      undefined,
      () => {
        if (alive) setTex(null);
      },
    );
    return () => {
      alive = false;
    };
  }, [url]);
  useEffect(() => {
    return () => {
      tex?.dispose();
    };
  }, [tex]);
  return tex;
}

function AdPlane({ space, boardTex }: { space: AdSpace; boardTex: THREE.CanvasTexture }) {
  const record = useAds((s) => s.byId[space.id]);
  const selected = useAds((s) => s.selectedSpace === space.id);
  const pending = useAds((s) => (s.selectedSpace === space.id ? s.pendingImage : null));
  const hovered = useAds((s) => s.hoveredSpace === space.id);
  const infoOn = useSim((s) => s.infoOn);
  const imageUrl = pending || record?.imageUrl || null;
  const map = useImageTexture(imageUrl);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const filled = Boolean(map);
  const hit = adHitScale(space.size);
  const lift = space.lift;
  const [bw, bh] = space.size;
  const frame = 0.05;

  useFrame(({ clock }) => {
    const m = mat.current;
    if (!m) return;
    const t = clock.getElapsedTime();
    if (filled) {
      m.color.setRGB(1, 1, 1);
      return;
    }
    const pulse = hovered || selected ? 1 : infoOn ? 0.92 : 0.82 + Math.sin(t * 2.1 + space.position[0]) * 0.1;
    m.color.setRGB(pulse, pulse, pulse);
  });

  const pick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (recentlyPinched()) return;
    playClick();
    useSim.getState().select(null);
    useSim.getState().setDonationOpen(false);
    useAds.getState().openSpace(space.id);
  };

  const board = (
    <group>
      <mesh position={[0, 0, -0.018]} renderOrder={7}>
        <boxGeometry args={[bw + frame * 2, bh + frame * 2, 0.028]} />
        <meshBasicMaterial color="#14161a" toneMapped={false} fog={false} />
      </mesh>
      <mesh
        position={[0, 0, 0.002]}
        renderOrder={8}
        onClick={pick}
        onPointerOver={(e) => {
          e.stopPropagation();
          useAds.getState().hover(space.id);
        }}
        onPointerOut={() => {
          if (useAds.getState().hoveredSpace === space.id) useAds.getState().hover(null);
        }}
      >
        <planeGeometry args={[bw, bh]} />
        <meshBasicMaterial
          ref={mat}
          map={filled ? map : boardTex}
          color="#ffffff"
          toneMapped={false}
          fog={false}
          side={THREE.DoubleSide}
          depthWrite
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>
      {hit > 1.01 ? (
        <mesh position={[0, 0, 0.004]} onClick={pick} visible={false}>
          <planeGeometry args={[bw * hit, bh * hit]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ) : null}
      {hovered || selected ? (
        <mesh position={[0, 0, 0.01]} renderOrder={9}>
          <planeGeometry args={[bw + 0.07, bh + 0.07]} />
          <meshBasicMaterial
            color={selected ? "#5eead4" : "#e8ecef"}
            toneMapped={false}
            fog={false}
            transparent
            opacity={selected ? 0.28 : 0.14}
            depthWrite={false}
            side={THREE.FrontSide}
          />
        </mesh>
      ) : null}
    </group>
  );

  if (space.mount === "up") {
    return (
      <group position={space.position}>
        <group rotation={[-Math.PI / 2, 0, 0]}>
          <group rotation={[0, 0, space.yaw]} position={[0, 0, lift]}>
            {board}
          </group>
        </group>
      </group>
    );
  }

  return (
    <group position={space.position} rotation={[0, space.yaw, 0]}>
      <group position={[0, 0, lift]}>{board}</group>
    </group>
  );
}

export function AdSpaces() {
  const [fontTick, setFontTick] = useState(0);
  useEffect(() => {
    let alive = true;
    const boot = async () => {
      try {
        if (document.fonts?.load) {
          await document.fonts.load(`700 64px ${AD_FONT}`);
        }
      } catch {
        /* system bold is fine */
      }
      if (alive) setFontTick(1);
    };
    void boot();
    return () => {
      alive = false;
    };
  }, []);

  const boards = useMemo(() => {
    const m = new Map<string, THREE.CanvasTexture>();
    for (const s of AD_SPACES) {
      m.set(s.id, makeBoardTex(s, houseCreativeFor(s.id)));
    }
    return m;
  }, [fontTick]);

  useEffect(
    () => () => {
      for (const tex of boards.values()) tex.dispose();
    },
    [boards],
  );

  return (
    <group>
      {AD_SPACES.map((s) => (
        <AdPlane key={s.id} space={s} boardTex={boards.get(s.id)!} />
      ))}
    </group>
  );
}
