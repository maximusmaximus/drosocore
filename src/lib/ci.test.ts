import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  attachNeeds,
  cannedOptions,
  CI_BUDGET_USD,
  CI_KINDS,
  CI_PROPOSAL_CAP,
  CI_WINDOW_MS,
  dayKey,
  flyBallotsFor,
  flyEndorseSlot,
  gearForRole,
  keepBallotVisual,
  milliweth,
  packMaterials,
  packSteps,
  parseOptionDraft,
  parseVisual,
  pickWinner,
  reduceInstalls,
  remainingMs,
  selectSustainDrafts,
  stakeEligible,
  sustainBallot,
  voteMessage,
} from "./ci.ts";

describe("ci cycle math", () => {
  it("uses a six hour window and a one dollar day", () => {
    assert.equal(CI_WINDOW_MS, 6 * 60 * 60 * 1000);
    assert.equal(CI_BUDGET_USD, 1);
    assert.match(dayKey(new Date("2026-09-18T15:00:00.000Z")), /^2026-09-18$/);
  });

  it("counts milliweth so 0.001 ETH is the first vote", () => {
    assert.equal(milliweth(0.001), 1);
    assert.equal(milliweth(0.01), 10);
    assert.equal(stakeEligible(0.001), true);
    assert.equal(stakeEligible(0.0004), false);
    assert.equal(stakeEligible(0), false);
  });

  it("signs a stable vote message", () => {
    assert.match(voteMessage(4, 12, "2026-09-18"), /Cycle 4/);
    assert.match(voteMessage(4, 12, "2026-09-18"), /Option 12/);
  });

  it("does not go negative on remaining time", () => {
    assert.equal(remainingMs("2000-01-01T00:00:00.000Z", Date.parse("2026-01-01T00:00:00.000Z")), 0);
  });
});

describe("ci proposals", () => {
  it("seeds the four classic kinds for a seated day", () => {
    const a = cannedOptions("2026-09-18");
    const b = cannedOptions("2026-09-18");
    const c = cannedOptions("2026-09-19");
    assert.equal(a.length, 4);
    assert.deepEqual(
      a.map((o) => o.kind),
      ["reactor", "workplace", "outfit", "body"],
    );
    assert.ok(CI_KINDS.includes("location"));
    assert.ok(CI_KINDS.includes("retire"));
    assert.equal(a[0].title, b[0].title);
    assert.notEqual(a.map((o) => o.title).join(), c.map((o) => o.title).join());
  });

  it("proposes five needs including a site and a retirement", () => {
    const a = sustainBallot("2026-10-02");
    const b = sustainBallot("2026-10-02");
    const c = sustainBallot("2026-10-03");
    assert.equal(a.length, CI_PROPOSAL_CAP);
    assert.ok(a.some((o) => o.kind === "location" && o.visual.site));
    assert.ok(a.filter((o) => o.kind === "location").length >= 1);
    assert.ok(
      a.some(
        (o) =>
          o.kind === "retire" &&
          (o.visual.rule || o.visual.strip !== "none" || o.visual.prop !== "none" || o.visual.extraModules > 0),
      ),
    );
    assert.equal(a.map((o) => o.title).join("|"), b.map((o) => o.title).join("|"));
    assert.notEqual(a.map((o) => o.title).join("|"), c.map((o) => o.title).join("|"));
    assert.equal(selectSustainDrafts(a)?.length, 5);
    assert.equal(selectSustainDrafts(cannedOptions("2026-10-02")), null);
  });

  it("keeps a site or a rule when fabrication rewrites the visual", () => {
    const named = attachNeeds(
      parseOptionDraft({
        kind: "location",
        title: "fuel shed",
        body: "A pellet shed by the plant so the torus stays lit.",
        sponsor: "Cryona",
      })!,
    );
    assert.equal(named.visual.site, "fuel-shed");
    const kept = keepBallotVisual(
      parseVisual({ site: "cryo-bay", rule: "mezz-lock", strip: "hood", prop: "rack" }),
      parseVisual({ glowAdd: 0.2, prop: "none", gear: "none", strip: "none" }),
    );
    assert.equal(kept.site, "cryo-bay");
    assert.equal(kept.rule, "mezz-lock");
    assert.equal(kept.strip, "hood");
    assert.equal(kept.prop, "rack");
  });

  it("rejects thin venice drafts", () => {
    assert.equal(parseOptionDraft({ kind: "reactor", title: "ab", body: "short" }), null);
    const ok = parseOptionDraft({
      kind: "outfit",
      title: "argon visor",
      body: "A close visor that keeps the weld pocket inert.",
      sponsor: "Helix",
      visual: { gear: "hood", glowAdd: 9, extraModules: -2, prop: "nope" },
    });
    assert.ok(ok);
    assert.equal(ok.visual.gear, "hood");
    assert.equal(ok.visual.glowAdd, 2.6);
    assert.equal(ok.visual.extraModules, 0);
    assert.equal(ok.visual.prop, "none");
  });

  it("clamps visual fields", () => {
    const v = parseVisual({ glowAdd: "1.2", extraModules: 3.6, prop: "lamp", gear: "cape", roleId: "welder", tint: "#5eead4" });
    assert.equal(v.glowAdd, 1.2);
    assert.equal(v.extraModules, 4);
    assert.equal(v.prop, "lamp");
    assert.equal(v.roleId, "welder");
    assert.equal(v.tint, "#5eead4");
  });
});

describe("ci tally", () => {
  it("lets fly votes decide when no one has staked", () => {
    const win = pickWinner([
      { optionId: 1, slot: 0, flyVotes: 4, stakeEth: 0 },
      { optionId: 2, slot: 1, flyVotes: 9, stakeEth: 0 },
      { optionId: 3, slot: 2, flyVotes: 3, stakeEth: 0 },
    ]);
    assert.equal(win?.optionId, 2);
  });

  it("lets stake outweigh the flies", () => {
    const win = pickWinner([
      { optionId: 1, slot: 0, flyVotes: 12, stakeEth: 0.001 },
      { optionId: 2, slot: 1, flyVotes: 2, stakeEth: 0.04 },
    ]);
    assert.equal(win?.optionId, 2);
  });

  it("gives every fly a ballot on the five sustain slots", () => {
    const opts = sustainBallot("2026-10-02").map((o, i) => ({ slot: i, kind: o.kind }));
    const ballots = flyBallotsFor("2026-10-02", opts);
    assert.equal(ballots.length, 16);
    assert.ok(ballots.every((b) => b.slot >= 0 && b.slot < 5));
    assert.equal(flyEndorseSlot(0, "welder", "2026-09-18", 4), flyEndorseSlot(0, "welder", "2026-09-18", 4));
  });
});

describe("ci world reduce", () => {
  it("stacks reactor glow and workplace props", () => {
    const w = reduceInstalls([
      { kind: "reactor", visual: parseVisual({ glowAdd: 0.7, extraModules: 2 }) },
      { kind: "workplace", visual: parseVisual({ prop: "rack" }) },
      { kind: "outfit", visual: parseVisual({ gear: "hood", roleId: "welder" }) },
    ]);
    assert.ok(w.glowAdd > 0.6);
    assert.equal(w.extraModules, 2);
    assert.deepEqual(w.props, ["rack"]);
    assert.equal(gearForRole(w, "welder"), "hood");
    assert.equal(gearForRole(w, "janitor"), "none");
  });

  it("seats a site and can retire a rule, a prop, or a body mod", () => {
    const w = reduceInstalls([
      { kind: "location", visual: parseVisual({ site: "fuel-shed", glowAdd: 0.2 }) },
      { kind: "outfit", visual: parseVisual({ gear: "hood", roleId: "welder" }) },
      { kind: "workplace", visual: parseVisual({ prop: "lamp" }) },
      {
        kind: "retire",
        visual: parseVisual({ rule: "mezz-lock", strip: "hood", roleId: "welder", prop: "lamp" }),
      },
    ]);
    assert.deepEqual(w.sites, ["fuel-shed"]);
    assert.deepEqual(w.retiredRules, ["mezz-lock"]);
    assert.equal(gearForRole(w, "welder"), "none");
    assert.deepEqual(w.props, []);
    assert.ok(packMaterials("location").includes("floor bolts"));
    assert.ok(packSteps("retire")[0]?.includes("fails"));
  });

  it("keeps fabrication kits short and kind-specific", () => {
    assert.ok(packMaterials("reactor").includes("copper winding"));
    assert.ok(packSteps("workplace")[0]?.includes("pad"));
    assert.equal(packMaterials("outfit").length, 3);
  });
});
