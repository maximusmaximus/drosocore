import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("CNS inspector wiring", () => {
  it("connectome is the 2026 atlas driven by live activity", () => {
    const src = readFileSync(join(root, "components/overlay/Connectome.tsx"), "utf8");
    assert.match(src, /BRAIN_REGIONS/);
    assert.match(src, /opticLobe/);
    assert.match(src, /vncWalk/);
    assert.match(src, /peekFly/);
    assert.match(src, /RegionMap/);
  });

  it("profiles list last functions and the region map", () => {
    const src = readFileSync(join(root, "components/overlay/FlyInspector.tsx"), "utf8");
    assert.match(src, /last functions/);
    assert.match(src, /fnLabel/);
    assert.match(src, /RegionMap/);
    assert.match(src, /jobsDone/);
    assert.match(src, /talksDone/);
  });

  it("bodies step from VNC motor and morph with skill", () => {
    const ana = readFileSync(join(root, "components/scene/FlyAnatomy.tsx"), "utf8");
    const model = readFileSync(join(root, "components/scene/FlyModel.tsx"), "utf8");
    assert.match(model, /TRIPOD|tripod/);
    assert.match(model, /gait/);
    assert.match(ana, /skill/);
    assert.match(model, /Femur|femur/);
    assert.match(model, /Tibia|tibia/);
    assert.match(model, /legCycle/);
    assert.match(model, /MeshPhysicalMaterial/);
    assert.match(model, /#14151a/);
    assert.match(model, /onBeforeCompile/);
    assert.match(model, /clearcoat/);
    assert.doesNotMatch(model, /MeshLambertMaterial/);
    const geo = readFileSync(join(root, "components/scene/fly-geo.ts"), "utf8");
    assert.match(geo, /chitinBumpTexture/);
    assert.doesNotMatch(geo, /#c9a56e|#e8cc86|#d8b57a/);
    const fly = readFileSync(join(root, "components/scene/Fly.tsx"), "utf8");
    assert.match(fly, /brain\.motor\.flap/);
    assert.match(fly, /brain\.skill/);
    assert.match(fly, /FLY_SCALE/);
    const sim = readFileSync(join(root, "components/scene/Flies.tsx"), "utf8");
    assert.match(sim, /publishFlies/);
  });
});
