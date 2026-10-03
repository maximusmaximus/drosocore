import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { adSpaceById } from "@/lib/ad-spaces";
import { useAds } from "@/lib/ads-store";
import {
  AD_MAX_ZOOM,
  MAX_POLAR,
  MIN_POLAR,
  adInspectPose,
  adWorldCenter,
  blendNdc,
  clampZoom,
  clientToNdc,
  fittedZoom,
  focusSnapBias,
  getFollowPos,
  HOME_POS,
  isPinching,
  isTowardFocus,
  lerpPose,
  MAX_ZOOM,
  MIN_ZOOM,
  pinchDistance,
  pinchMid,
  poseClose,
  poseFromOffset,
  resizePreserveZoom,
  setPinching,
  sphericalOffset,
  zoomMulFor,
  type CamPose,
  type FocusKind,
  type Ndc,
} from "@/lib/cam-focus";
import { FEATURE_BY_ID, tourFeature } from "@/lib/guide";
import { useSim } from "@/lib/store";

const _before = new THREE.Vector3();
const _after = new THREE.Vector3();
const _proj = new THREE.Vector3();
const _delta = new THREE.Vector3();
const _desired = new THREE.Vector3();

function applyZoomToNdc(
  cam: THREE.OrthographicCamera,
  controls: OrbitControlsImpl,
  nextZoom: number,
  ndc: Ndc,
) {
  const z = clampZoom(nextZoom, MIN_ZOOM, AD_MAX_ZOOM);
  if (Math.abs(z - cam.zoom) < 1e-6) return;
  _before.set(ndc.x, ndc.y, 0).unproject(cam);
  cam.zoom = z;
  cam.updateProjectionMatrix();
  _after.set(ndc.x, ndc.y, 0).unproject(cam);
  _delta.copy(_before).sub(_after);
  cam.position.add(_delta);
  controls.target.add(_delta);
}

function focusKind(): { kind: FocusKind; key: string } {
  const sim = useSim.getState();
  const ads = useAds.getState();
  if (sim.selected) return { kind: "fly", key: `fly-${sim.selected.index}` };
  if (ads.selectedSpace) return { kind: "ad", key: `ad-${ads.selectedSpace}` };
  if (sim.guideStep !== null) {
    const feat = tourFeature(sim.guideStep);
    return { kind: feat?.anchor.kind === "world" ? "guide" : "home", key: `guide-${sim.guideStep}` };
  }
  if (sim.tipId) {
    const feat = FEATURE_BY_ID[sim.tipId];
    return { kind: feat?.anchor.kind === "world" ? "guide" : "home", key: `tip-${sim.tipId}` };
  }
  return { kind: "home", key: "home" };
}

function desiredTarget(kind: FocusKind): THREE.Vector3 {
  const sim = useSim.getState();
  const ads = useAds.getState();
  if (kind === "fly") {
    const p = getFollowPos();
    return _desired.set(p.x, p.y, p.z);
  }
  if (kind === "ad" && ads.selectedSpace) {
    const space = adSpaceById(ads.selectedSpace);
    if (space) {
      const c = adWorldCenter(space);
      return _desired.set(c.x, c.y, c.z);
    }
  }
  if (kind === "guide") {
    const feat =
      sim.guideStep !== null ? tourFeature(sim.guideStep) : sim.tipId ? FEATURE_BY_ID[sim.tipId] : null;
    if (feat?.anchor.kind === "world") {
      const p = feat.anchor.pos;
      return _desired.set(p[0], p[1], p[2]);
    }
  }
  return _desired.set(HOME_POS.x, HOME_POS.y, HOME_POS.z);
}

function projectNdc(cam: THREE.Camera, x: number, y: number, z: number): Ndc | null {
  _proj.set(x, y, z).project(cam);
  if (!Number.isFinite(_proj.x) || !Number.isFinite(_proj.y)) return null;
  return { x: _proj.x, y: _proj.y };
}

function blockedEl(n: Element | null) {
  return Boolean(n?.closest("[data-no-pinch], input, textarea, select"));
}

function ignorePinchPoints(points: { x: number; y: number }[]) {
  if (points.length < 2) return false;
  const a = document.elementFromPoint(points[0]!.x, points[0]!.y);
  const b = document.elementFromPoint(points[1]!.x, points[1]!.y);
  return blockedEl(a) && blockedEl(b);
}

function capturePose(cam: THREE.OrthographicCamera, ctl: OrbitControlsImpl): CamPose {
  const target = { x: ctl.target.x, y: ctl.target.y, z: ctl.target.z };
  const offset = {
    x: cam.position.x - target.x,
    y: cam.position.y - target.y,
    z: cam.position.z - target.z,
  };
  return poseFromOffset(target, offset, cam.zoom);
}

function applyPose(cam: THREE.OrthographicCamera, ctl: OrbitControlsImpl, pose: CamPose) {
  ctl.target.set(pose.target.x, pose.target.y, pose.target.z);
  const off = sphericalOffset(pose.radius, pose.polar, pose.azimuth);
  cam.position.set(pose.target.x + off.x, pose.target.y + off.y, pose.target.z + off.z);
  cam.up.set(0, 1, 0);
  cam.lookAt(ctl.target);
  cam.zoom = pose.zoom;
  cam.updateProjectionMatrix();
}

function setClip(cam: THREE.OrthographicCamera, inspecting: boolean) {
  const near = inspecting ? 0.16 : -80;
  const far = inspecting ? 36 : 180;
  if (cam.near === near && cam.far === far) return;
  cam.near = near;
  cam.far = far;
  cam.updateProjectionMatrix();
}

function FitZoom() {
  const { camera, size } = useThree();
  const fitted = useRef(0);
  const booted = useRef(false);
  useLayoutEffect(() => {
    const cam = camera as THREE.OrthographicCamera;
    const next = fittedZoom(size.width, size.height);
    if (!booted.current) {
      cam.zoom = next;
      cam.near = -80;
      cam.far = 180;
      cam.position.set(24, 19.2, 24);
      cam.lookAt(HOME_POS.x, HOME_POS.y, HOME_POS.z);
      booted.current = true;
    } else {
      cam.zoom = resizePreserveZoom(cam.zoom, fitted.current, next);
    }
    fitted.current = next;
    cam.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

function Controls() {
  const celebrating = useSim((s) => s.celebrating);
  const focused = useSim((s) => s.selected !== null || s.guideStep !== null);
  const adOpen = useAds((s) => s.selectedSpace !== null);
  const locked = focused || adOpen;
  return (
    <OrbitControls
      makeDefault
      enableDamping
      dampingFactor={0.12}
      minPolarAngle={MIN_POLAR}
      maxPolarAngle={MAX_POLAR}
      minZoom={MIN_ZOOM}
      maxZoom={AD_MAX_ZOOM}
      enablePan
      enableZoom={false}
      zoomToCursor
      autoRotate={!locked}
      autoRotateSpeed={celebrating ? 2.4 : 0.32}
      rotateSpeed={0.72}
      panSpeed={0.7}
      touches={{
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      }}
    />
  );
}

function FocusAndPinch() {
  const { camera, gl, controls, size } = useThree();
  const snapZoom = useRef<number | null>(null);
  const lastKey = useRef("home");
  const pinchDist = useRef(0);
  const towardRef = useRef(false);
  const zoomingInRef = useRef(false);
  const sourceRef = useRef<"touch" | "pointer" | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const savedHome = useRef<CamPose | null>(null);
  const poseSnap = useRef<CamPose | null>(null);

  useEffect(() => {
    const el = gl.domElement;
    el.style.touchAction = "none";
    el.style.userSelect = "none";
    (el.style as CSSStyleDeclaration & { webkitUserSelect?: string }).webkitUserSelect = "none";

    const camOf = () => camera as THREE.OrthographicCamera;
    const ctlOf = () => controls as OrbitControlsImpl | null;
    const rectOf = () => el.getBoundingClientRect();

    const freezeOrbit = (frozen: boolean) => {
      const ctl = ctlOf();
      if (!ctl) return;
      ctl.enablePan = !frozen;
      ctl.enableRotate = !frozen;
      if (frozen) ctl.enableZoom = false;
    };

    const zoomAt = (next: number, clientX: number, clientY: number, zoomingIn?: boolean) => {
      const ctl = ctlOf();
      if (!ctl) return;
      snapZoom.current = null;
      poseSnap.current = null;
      const cam = camOf();
      const pinch = clientToNdc(clientX, clientY, rectOf());
      const kind = focusKind().kind;
      const target = desiredTarget(kind);
      const focus = kind === "home" ? null : projectNdc(cam, target.x, target.y, target.z);
      const inZoom = zoomingIn ?? next > cam.zoom;
      zoomingInRef.current = inZoom;
      const bias = focusSnapBias(pinch, focus, inZoom);
      towardRef.current = isTowardFocus(pinch, focus);
      const cap = kind === "ad" ? AD_MAX_ZOOM : MAX_ZOOM;
      applyZoomToNdc(cam, ctl, clampZoom(next, MIN_ZOOM, cap), blendNdc(pinch, focus, bias));
      ctl.update();
    };

    const applySpan = (a: { x: number; y: number }, b: { x: number; y: number }) => {
      const dist = pinchDistance(a, b);
      const prev = pinchDist.current;
      pinchDist.current = dist;
      if (prev < 4 || dist < 4) return;
      const mid = pinchMid(a, b);
      zoomAt(camOf().zoom * (dist / prev), mid.x, mid.y, dist > prev);
    };

    const beginPinch = (a: { x: number; y: number }, b: { x: number; y: number }, source: "touch" | "pointer") => {
      if (ignorePinchPoints([a, b])) return false;
      sourceRef.current = source;
      setPinching(true);
      snapZoom.current = null;
      pinchDist.current = pinchDistance(a, b);
      freezeOrbit(true);
      return true;
    };

    const endPinch = () => {
      if (sourceRef.current === null && !isPinching()) return;
      sourceRef.current = null;
      freezeOrbit(false);
      const kind = focusKind().kind;
      if (towardRef.current && zoomingInRef.current && kind !== "home") {
        const fitted = fittedZoom(size.width, size.height);
        const inspect = clampZoom(fitted * zoomMulFor(kind), MIN_ZOOM, kind === "ad" ? AD_MAX_ZOOM : MAX_ZOOM);
        snapZoom.current = clampZoom(Math.max(camOf().zoom, inspect), MIN_ZOOM, kind === "ad" ? AD_MAX_ZOOM : MAX_ZOOM);
      }
      window.setTimeout(() => setPinching(false), 120);
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const cam = camOf();
      const factor = Math.exp(-e.deltaY * 0.0016);
      zoomAt(cam.zoom * factor, e.clientX, e.clientY, factor > 1);
      snapZoom.current = null;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length < 2) return;
      const a = { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY };
      const b = { x: e.touches[1]!.clientX, y: e.touches[1]!.clientY };
      if (!beginPinch(a, b, "touch")) return;
      e.preventDefault();
      e.stopPropagation();
    };
    const onTouchMove = (e: TouchEvent) => {
      if (sourceRef.current !== "touch" || e.touches.length < 2) return;
      const a = { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY };
      const b = { x: e.touches[1]!.clientX, y: e.touches[1]!.clientY };
      if (ignorePinchPoints([a, b])) return;
      e.preventDefault();
      e.stopPropagation();
      setPinching(true);
      applySpan(a, b);
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2 && sourceRef.current === "touch") endPinch();
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (sourceRef.current === "touch") return;
      if (pointers.current.size < 2) return;
      const pts = [...pointers.current.values()];
      if (!beginPinch(pts[0]!, pts[1]!, "pointer")) return;
      e.preventDefault();
      e.stopPropagation();
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (sourceRef.current !== "pointer") return;
      const pts = [...pointers.current.values()];
      if (pts.length < 2) return;
      if (ignorePinchPoints(pts)) return;
      e.preventDefault();
      e.stopPropagation();
      setPinching(true);
      applySpan(pts[0]!, pts[1]!);
    };
    const onPointerUp = (e: PointerEvent) => {
      pointers.current.delete(e.pointerId);
      if (pointers.current.size < 2 && sourceRef.current === "pointer") endPinch();
    };

    const killGesture = (e: Event) => e.preventDefault();

    el.addEventListener("wheel", onWheel, { passive: false });
    const touchOpts: AddEventListenerOptions = { passive: false, capture: true };
    window.addEventListener("touchstart", onTouchStart, touchOpts);
    window.addEventListener("touchmove", onTouchMove, touchOpts);
    window.addEventListener("touchend", onTouchEnd, { capture: true });
    window.addEventListener("touchcancel", onTouchEnd, { capture: true });
    window.addEventListener("pointerdown", onPointerDown, touchOpts);
    window.addEventListener("pointermove", onPointerMove, touchOpts);
    window.addEventListener("pointerup", onPointerUp, { capture: true });
    window.addEventListener("pointercancel", onPointerUp, { capture: true });
    window.addEventListener("gesturestart", killGesture, { passive: false });
    window.addEventListener("gesturechange", killGesture, { passive: false });

    const api = {
      zoom: () => camOf().zoom,
      target: () => {
        const c = ctlOf();
        return c ? { x: c.target.x, y: c.target.y, z: c.target.z } : HOME_POS;
      },
      polar: () => {
        const c = ctlOf();
        if (!c) return 0;
        const cam = camOf();
        const r = cam.position.distanceTo(c.target) || 1;
        return Math.acos(Math.min(1, Math.max(-1, (cam.position.y - c.target.y) / r)));
      },
      pinchTo: (mul: number, clientX?: number, clientY?: number) => {
        const cam = camOf();
        const rect = rectOf();
        const x = clientX ?? rect.left + rect.width * 0.5;
        const y = clientY ?? rect.top + rect.height * 0.5;
        zoomAt(cam.zoom * mul, x, y, mul > 1);
      },
      tiltTo: (polar: number) => {
        const cam = camOf();
        const ctl = ctlOf();
        if (!ctl) return;
        const cur = capturePose(cam, ctl);
        applyPose(cam, ctl, { ...cur, polar: Math.min(MAX_POLAR, Math.max(MIN_POLAR, polar)) });
      },
    };
    const w = window as unknown as { __drosocoreCam?: typeof api };
    w.__drosocoreCam = api;

    return () => {
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart, true);
      window.removeEventListener("touchmove", onTouchMove, true);
      window.removeEventListener("touchend", onTouchEnd, true);
      window.removeEventListener("touchcancel", onTouchEnd, true);
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pointermove", onPointerMove, true);
      window.removeEventListener("pointerup", onPointerUp, true);
      window.removeEventListener("pointercancel", onPointerUp, true);
      window.removeEventListener("gesturestart", killGesture);
      window.removeEventListener("gesturechange", killGesture);
      freezeOrbit(false);
      if (w.__drosocoreCam === api) delete w.__drosocoreCam;
    };
  }, [camera, controls, gl, size.width, size.height]);

  useFrame((_, delta) => {
    const ctl = controls as OrbitControlsImpl | null;
    if (!ctl) return;
    const dt = Math.min(delta, 0.1);
    const cam = camera as THREE.OrthographicCamera;
    const { kind, key } = focusKind();
    setClip(cam, kind === "ad");
    const fitted = fittedZoom(size.width, size.height);
    if (key !== lastKey.current) {
      const wasAd = lastKey.current.startsWith("ad-");
      const isAd = kind === "ad";
      lastKey.current = key;
      if (isAd) {
        if (!wasAd) savedHome.current = capturePose(cam, ctl);
        const space = adSpaceById(useAds.getState().selectedSpace ?? "");
        if (space) {
          poseSnap.current = adInspectPose(space, size.width, size.height);
          snapZoom.current = null;
        }
      } else if (wasAd && kind === "home" && savedHome.current) {
        poseSnap.current = savedHome.current;
        savedHome.current = null;
        snapZoom.current = null;
      } else {
        poseSnap.current = null;
        snapZoom.current = clampZoom(fitted * zoomMulFor(kind));
        towardRef.current = kind !== "home";
        if (!isAd) savedHome.current = null;
      }
    }
    const pinchingNow = isPinching();
    if (poseSnap.current && !pinchingNow) {
      ctl.enableRotate = false;
      ctl.enablePan = false;
      ctl.enableDamping = false;
      const cur = capturePose(cam, ctl);
      const next = lerpPose(cur, poseSnap.current, 1 - Math.exp(-12 * dt));
      applyPose(cam, ctl, next);
      if (poseClose(next, poseSnap.current)) {
        applyPose(cam, ctl, poseSnap.current);
        poseSnap.current = null;
        ctl.enableRotate = true;
        ctl.enablePan = true;
        ctl.enableDamping = true;
      }
      return;
    }
    if (!pinchingNow) {
      ctl.enableRotate = true;
      ctl.enablePan = true;
      ctl.enableDamping = true;
    }
    const goal = desiredTarget(kind);
    const followK = pinchingNow
      ? towardRef.current
        ? 1 - Math.exp(-7.4 * dt)
        : 0
      : 1 - Math.exp(-(kind === "fly" ? 5.6 : 3.8) * dt);
    if (followK > 0 && kind !== "ad") {
      _delta.copy(goal).sub(ctl.target).multiplyScalar(followK);
      ctl.target.add(_delta);
      cam.position.add(_delta);
    }
    if (snapZoom.current !== null && !pinchingNow) {
      const z = THREE.MathUtils.lerp(cam.zoom, snapZoom.current, 1 - Math.exp(-4.2 * dt));
      const focus = projectNdc(cam, goal.x, goal.y, goal.z) ?? { x: 0, y: 0 };
      applyZoomToNdc(cam, ctl, z, focus);
      if (Math.abs(cam.zoom - snapZoom.current) < 0.15) snapZoom.current = null;
    }
    ctl.update();
  }, 1);

  return null;
}

export function IsoCamera() {
  return (
    <>
      <FitZoom />
      <Controls />
      <FocusAndPinch />
    </>
  );
}
