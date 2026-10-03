/** Isometric camera focus + pinch/wheel zoom helpers. Pure numbers, no THREE. */

import { adFaceNormal, type AdMount } from "./ad-spaces.ts";
import { ISO_POLAR } from "./constants.ts";

export const HOME_POS = { x: 0, y: 1.7, z: 0 } as const;

export const MIN_ZOOM = 10;
export const MAX_ZOOM = 160;
export const AD_MAX_ZOOM = 720;
export const FIT_DIVISOR = 30;

/** Default iso; user can pull the view down toward horizontal. */
export const MIN_POLAR = 0.18;
export const MAX_POLAR = Math.PI / 2 - 0.06;
export const HOME_POLAR = ISO_POLAR;

/** Sit just in front of a wall board so hall props stay behind the camera. */
export const AD_INSPECT_RADIUS = 2.25;

export type FocusKind = "home" | "fly" | "ad" | "guide";

export type Ndc = { x: number; y: number };

export type Pt = { x?: number; y?: number; clientX?: number; clientY?: number };

export type Vec3 = { x: number; y: number; z: number };

export type CamPose = {
  zoom: number;
  target: Vec3;
  polar: number;
  azimuth: number;
  radius: number;
};

export function fittedZoom(width: number, height: number, divisor = FIT_DIVISOR): number {
  const m = Math.min(width, height);
  if (!Number.isFinite(m) || m <= 0) return 32;
  return m / divisor;
}

export function clampZoom(z: number, min = MIN_ZOOM, max = MAX_ZOOM): number {
  if (!Number.isFinite(z)) return min;
  return Math.min(max, Math.max(min, z));
}

export function clampPolar(p: number): number {
  if (!Number.isFinite(p)) return HOME_POLAR;
  return Math.min(MAX_POLAR, Math.max(MIN_POLAR, p));
}

export function zoomMulFor(kind: FocusKind): number {
  switch (kind) {
    case "fly":
      return 1.88;
    case "ad":
      return 2.35;
    case "guide":
      return 1.12;
    default:
      return 1;
  }
}

export function resizePreserveZoom(zoom: number, prevFitted: number, nextFitted: number): number {
  if (!Number.isFinite(prevFitted) || prevFitted <= 0) return clampZoom(nextFitted, MIN_ZOOM, AD_MAX_ZOOM);
  return clampZoom(zoom * (nextFitted / prevFitted), MIN_ZOOM, AD_MAX_ZOOM);
}

export function ptX(p: Pt): number {
  return p.x ?? p.clientX ?? 0;
}

export function ptY(p: Pt): number {
  return p.y ?? p.clientY ?? 0;
}

export function ndcDistance(a: Ndc, b: Ndc): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Mix pinch/cursor NDC toward the selected object's screen position. */
export function blendNdc(pinch: Ndc, focus: Ndc | null, bias = 0.68): Ndc {
  if (!focus) return pinch;
  const t = Math.min(1, Math.max(0, bias));
  return {
    x: pinch.x * (1 - t) + focus.x * t,
    y: pinch.y * (1 - t) + focus.y * t,
  };
}

/**
 * Lock onto the selection when the pinch is aimed at it; follow fingers when
 * the user is looking somewhere else. Zooming in snaps harder than zooming out.
 */
export function focusSnapBias(
  pinch: Ndc,
  focus: Ndc | null,
  zoomingIn: boolean,
  radius = 0.95,
): number {
  if (!focus) return 0;
  const proximity = Math.max(0, 1 - ndcDistance(pinch, focus) / Math.max(0.15, radius));
  const base = 0.18 + proximity * 0.74;
  if (zoomingIn) return Math.min(0.96, base + 0.12 * proximity);
  return base * 0.42;
}

export function isTowardFocus(pinch: Ndc, focus: Ndc | null, radius = 0.72): boolean {
  if (!focus) return false;
  return ndcDistance(pinch, focus) <= radius;
}

export function clientToNdc(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
): Ndc {
  const w = rect.width || 1;
  const h = rect.height || 1;
  return {
    x: ((clientX - rect.left) / w) * 2 - 1,
    y: -((clientY - rect.top) / h) * 2 + 1,
  };
}

export function pinchDistance(a: Pt, b: Pt): number {
  return Math.hypot(ptX(a) - ptX(b), ptY(a) - ptY(b));
}

export function pinchMid(a: Pt, b: Pt): { x: number; y: number } {
  return { x: (ptX(a) + ptX(b)) * 0.5, y: (ptY(a) + ptY(b)) * 0.5 };
}

/** Ortho zoom so an ad of world size (adW, adH) nearly fills the viewport. */
export function adFillZoom(viewW: number, viewH: number, adW: number, adH: number, pad = 0.96): number {
  const w = Math.max(0.05, adW);
  const h = Math.max(0.05, adH);
  const zw = (Math.max(1, viewW) * pad) / w;
  const zh = (Math.max(1, viewH) * pad) / h;
  return clampZoom(Math.min(zw, zh), MIN_ZOOM, AD_MAX_ZOOM);
}

export function applyEulerXYZ(
  rot: [number, number, number],
  v: Vec3,
): Vec3 {
  const [rx, ry, rz] = rot;
  const cx = Math.cos(rx);
  const sx = Math.sin(rx);
  const y1 = v.y * cx - v.z * sx;
  const z1 = v.y * sx + v.z * cx;
  const cy = Math.cos(ry);
  const sy = Math.sin(ry);
  const x2 = v.x * cy + z1 * sy;
  const z2 = -v.x * sy + z1 * cy;
  const cz = Math.cos(rz);
  const sz = Math.sin(rz);
  return {
    x: x2 * cz - y1 * sz,
    y: x2 * sz + y1 * cz,
    z: z2,
  };
}

export function adNormal(rotation: [number, number, number]): Vec3 {
  return applyEulerXYZ(rotation, { x: 0, y: 0, z: 1 });
}

export function adWorldCenter(space: {
  position: [number, number, number];
  rotation: [number, number, number];
  offset?: [number, number, number];
  mount?: AdMount;
  yaw?: number;
  lift?: number;
}): Vec3 {
  if (space.mount && space.yaw != null) {
    const n = adFaceNormal({ mount: space.mount, yaw: space.yaw });
    const lift = space.lift ?? 0.03;
    return {
      x: space.position[0] + n.x * lift,
      y: space.position[1] + n.y * lift,
      z: space.position[2] + n.z * lift,
    };
  }
  const off = space.offset ?? [0, 0, 0.012];
  const r = applyEulerXYZ(space.rotation, { x: off[0], y: off[1], z: off[2] });
  return {
    x: space.position[0] + r.x,
    y: space.position[1] + r.y,
    z: space.position[2] + r.z,
  };
}

export function sphericalOffset(radius: number, polar: number, azimuth: number): Vec3 {
  const sp = Math.sin(polar);
  return {
    x: radius * sp * Math.sin(azimuth),
    y: radius * Math.cos(polar),
    z: radius * sp * Math.cos(azimuth),
  };
}

export function poseFromOffset(target: Vec3, offset: Vec3, zoom: number): CamPose {
  const radius = Math.hypot(offset.x, offset.y, offset.z) || 12;
  const polar = Math.acos(Math.min(1, Math.max(-1, offset.y / radius)));
  const azimuth = Math.atan2(offset.x, offset.z);
  return { zoom, target, polar, azimuth, radius };
}

/** Stand close to a vertical board; stay a bit higher over floor pads. */
export function adInspectRadius(input: [number, number, number] | { mount?: AdMount; rotation?: [number, number, number] }): number {
  if (Array.isArray(input)) {
    const n = applyEulerXYZ(input, { x: 0, y: 0, z: 1 });
    return Math.abs(n.y) < 0.42 ? AD_INSPECT_RADIUS : 3.4;
  }
  if (input.mount === "up") return 3.4;
  if (input.mount === "out") return AD_INSPECT_RADIUS;
  const n = applyEulerXYZ(input.rotation ?? [0, 0, 0], { x: 0, y: 0, z: 1 });
  return Math.abs(n.y) < 0.42 ? AD_INSPECT_RADIUS : 3.4;
}

/** Face an ad plane, then zoom so it fills the viewport. */
export function adInspectPose(
  space: {
    position: [number, number, number];
    rotation: [number, number, number];
    offset?: [number, number, number];
    size: [number, number];
    mount?: AdMount;
    yaw?: number;
    lift?: number;
  },
  viewW: number,
  viewH: number,
  radius?: number,
): CamPose {
  const center = adWorldCenter(space);
  const n =
    space.mount && space.yaw != null
      ? adFaceNormal({ mount: space.mount, yaw: space.yaw })
      : adNormal(space.rotation);
  const len = Math.hypot(n.x, n.y, n.z) || 1;
  const r = radius ?? adInspectRadius(space);
  const offset = { x: (n.x / len) * r, y: (n.y / len) * r, z: (n.z / len) * r };
  const zoom = adFillZoom(viewW, viewH, space.size[0], space.size[1]);
  const pose = poseFromOffset(center, offset, zoom);
  pose.polar = clampPolar(pose.polar);
  return pose;
}

export function lerpAngle(a: number, b: number, t: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export function lerpPose(a: CamPose, b: CamPose, t: number): CamPose {
  const k = Math.min(1, Math.max(0, t));
  return {
    zoom: a.zoom + (b.zoom - a.zoom) * k,
    target: {
      x: a.target.x + (b.target.x - a.target.x) * k,
      y: a.target.y + (b.target.y - a.target.y) * k,
      z: a.target.z + (b.target.z - a.target.z) * k,
    },
    polar: a.polar + (b.polar - a.polar) * k,
    azimuth: lerpAngle(a.azimuth, b.azimuth, k),
    radius: a.radius + (b.radius - a.radius) * k,
  };
}

export function angleDelta(a: number, b: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

export function poseClose(a: CamPose, b: CamPose): boolean {
  return (
    Math.abs(a.zoom - b.zoom) < 0.35 &&
    Math.abs(a.polar - b.polar) < 0.012 &&
    angleDelta(a.azimuth, b.azimuth) < 0.012 &&
    Math.hypot(a.target.x - b.target.x, a.target.y - b.target.y, a.target.z - b.target.z) < 0.04
  );
}

let follow: { x: number; y: number; z: number } = { x: HOME_POS.x, y: HOME_POS.y, z: HOME_POS.z };
let pinching = false;
let pinchUntil = 0;

export function setFollowPos(x: number, y: number, z: number) {
  follow = { x, y, z };
}

export function getFollowPos() {
  return follow;
}

export function setPinching(v: boolean) {
  pinching = v;
  if (v) pinchUntil = (typeof performance !== "undefined" ? performance.now() : Date.now()) + 320;
}

export function isPinching() {
  return pinching;
}

export function recentlyPinched() {
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  return pinching || now < pinchUntil;
}
