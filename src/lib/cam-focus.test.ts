import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  adFillZoom,
  adInspectPose,
  adInspectRadius,
  adNormal,
  AD_INSPECT_RADIUS,
  AD_MAX_ZOOM,
  angleDelta,
  blendNdc,
  clampPolar,
  clampZoom,
  clientToNdc,
  fittedZoom,
  focusSnapBias,
  HOME_POLAR,
  isTowardFocus,
  lerpAngle,
  MAX_POLAR,
  MAX_ZOOM,
  MIN_POLAR,
  MIN_ZOOM,
  ndcDistance,
  pinchDistance,
  pinchMid,
  recentlyPinched,
  resizePreserveZoom,
  setPinching,
  sphericalOffset,
  zoomMulFor,
} from "./cam-focus.ts";

describe("fitted zoom", () => {
  it("uses the short viewport side", () => {
    assert.equal(fittedZoom(1280, 800), 800 / 30);
    assert.equal(fittedZoom(390, 844), 390 / 30);
  });

  it("is finite on junk", () => {
    assert.ok(Number.isFinite(fittedZoom(0, 0)));
  });
});

describe("clamp + resize", () => {
  it("clamps to the iso range", () => {
    assert.equal(clampZoom(1), MIN_ZOOM);
    assert.equal(clampZoom(999), MAX_ZOOM);
    assert.equal(clampZoom(40), 40);
  });

  it("keeps relative zoom when the viewport changes", () => {
    const a = fittedZoom(390, 844);
    const b = fittedZoom(844, 390);
    const kept = resizePreserveZoom(a * 2, a, b);
    assert.ok(Math.abs(kept / b - 2) < 1e-9);
  });
});

describe("focus zoom multipliers", () => {
  it("inspects giant crew wider than a wall board, still closer than home", () => {
    assert.ok(zoomMulFor("ad") > zoomMulFor("fly"));
    assert.ok(zoomMulFor("fly") > zoomMulFor("guide"));
    assert.equal(zoomMulFor("home"), 1);
  });
});

describe("pinch math", () => {
  it("maps client coords to NDC", () => {
    const ndc = clientToNdc(100, 50, { left: 0, top: 0, width: 200, height: 100 });
    assert.equal(ndc.x, 0);
    assert.equal(ndc.y, 0);
  });

  it("blends pinch toward the selected object", () => {
    const out = blendNdc({ x: 0, y: 0 }, { x: 1, y: -1 }, 0.5);
    assert.equal(out.x, 0.5);
    assert.equal(out.y, -0.5);
    assert.deepEqual(blendNdc({ x: 0.2, y: 0.1 }, null), { x: 0.2, y: 0.1 });
  });

  it("measures two-finger span and midpoint", () => {
    const a = { clientX: 0, clientY: 0 };
    const b = { clientX: 6, clientY: 8 };
    assert.equal(pinchDistance(a, b), 10);
    assert.deepEqual(pinchMid(a, b), { x: 3, y: 4 });
    assert.equal(pinchDistance({ x: 0, y: 0 }, { x: 6, y: 8 }), 10);
  });
});

describe("snap toward selection", () => {
  const pinch = { x: 0.1, y: 0.05 };
  const focus = { x: 0.12, y: 0.04 };

  it("locks hard when the pinch sits on the selection", () => {
    const inBias = focusSnapBias(pinch, focus, true);
    const outBias = focusSnapBias(pinch, focus, false);
    assert.ok(inBias > 0.75, `in ${inBias}`);
    assert.ok(inBias > outBias);
    assert.ok(isTowardFocus(pinch, focus));
  });

  it("follows fingers when the pinch is across the screen", () => {
    const far = { x: -0.9, y: 0.8 };
    const bias = focusSnapBias(far, focus, true);
    assert.ok(bias < 0.35, `far bias ${bias}`);
    assert.equal(isTowardFocus(far, focus), false);
    assert.equal(focusSnapBias(pinch, null, true), 0);
  });

  it("measures NDC distance", () => {
    assert.equal(ndcDistance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
  });

  it("flags a pinch so a following tap does not deselect", () => {
    setPinching(true);
    assert.equal(recentlyPinched(), true);
    setPinching(false);
    assert.equal(recentlyPinched(), true);
  });
});

describe("tilt + ad fill", () => {
  it("lets polar go from iso down to nearly horizontal", () => {
    assert.ok(MIN_POLAR < HOME_POLAR);
    assert.ok(MAX_POLAR > HOME_POLAR);
    assert.ok(MAX_POLAR < Math.PI / 2);
    assert.equal(clampPolar(0), MIN_POLAR);
    assert.equal(clampPolar(2), MAX_POLAR);
  });

  it("fills a wall board in the viewport", () => {
    const z = adFillZoom(1440, 900, 6.4, 3.2);
    assert.ok(z > 100, `zoom ${z}`);
    assert.ok(z <= AD_MAX_ZOOM);
    const small = adFillZoom(1440, 900, 0.48, 0.5);
    assert.equal(small, AD_MAX_ZOOM);
  });

  it("faces a back wall along +Z", () => {
    const n = adNormal([0, 0, 0]);
    assert.ok(Math.abs(n.z - 1) < 1e-9);
    assert.ok(Math.abs(n.x) < 1e-9);
  });

  it("faces a west wall along +X", () => {
    const n = adNormal([0, Math.PI / 2, 0]);
    assert.ok(Math.abs(n.x - 1) < 1e-6, JSON.stringify(n));
  });

  it("inspects a wall ad from the hall side, close enough to skip props", () => {
    const pose = adInspectPose(
      { position: [0, 5.35, -17.38], rotation: [0, 0, 0], offset: [0, 0, 0.08], size: [6.4, 3.2] },
      1440,
      900,
    );
    assert.ok(pose.target.z > -17.5);
    assert.ok(pose.polar > 1.0, `polar ${pose.polar}`);
    assert.ok(pose.zoom > 80);
    const off = sphericalOffset(pose.radius, pose.polar, pose.azimuth);
    const camZ = pose.target.z + off.z;
    assert.ok(camZ < -12, `camZ ${camZ}`);
    assert.ok(pose.radius <= AD_INSPECT_RADIUS + 0.4, `radius ${pose.radius}`);
    assert.ok(adInspectRadius([0, 0, 0]) < adInspectRadius([-Math.PI / 2, 0, 0]));
  });

  it("wraps azimuth lerp the short way", () => {
    const a = lerpAngle(3.0, -3.0, 0.5);
    assert.ok(Math.abs(a) > 2.5);
    assert.ok(angleDelta(3.0, -3.0) < 0.3);
  });
});
