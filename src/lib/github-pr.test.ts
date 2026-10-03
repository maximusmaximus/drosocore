import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { emptyVisual } from "./ci.ts";
import {
  HALL_POLICY,
  applyWinnerToState,
  buildOutVisual,
  cannedUpsample,
  mergePlan,
  parseHallState,
  parseStoredPr,
  parseUpsample,
  proposalBranch,
  proposalBundle,
  renderHallState,
  slugTitle,
} from "./github-pr.ts";

describe("proposal pull requests", () => {
  it("slugs a stable branch that is a pull request, not a direct commit", () => {
    assert.equal(slugTitle("PF trim coil on bay 7"), "pf-trim-coil-on-bay-7");
    const branch = proposalBranch("2026-10-02", 0, "PF trim coil on bay 7");
    assert.equal(branch, "proposal/2026-10-02-s0-pf-trim-coil-on-bay-7");
    const again = proposalBundle({
      day: "2026-10-02",
      slot: 0,
      kind: "reactor",
      title: "PF trim coil on bay 7",
      body: "A small trim winding to flatten the error field on the east gap.",
      sponsor: "Toroid",
      visual: { ...emptyVisual(), extraModules: 2, glowAdd: 0.7, roleId: "coil" },
    });
    assert.equal(again.branch, branch);
    assert.match(again.body, /merges to `main` only if it wins/);
    assert.match(again.files[0].content, /pull request/);
    assert.match(again.files[0].content, /upsamples/);
    assert.equal(again.files[0].path, "proposals/2026-10-02/s0-pf-trim-coil-on-bay-7.md");
    assert.ok(again.files.every((f) => f.path !== "hall/state.json"));
  });

  it("stores a pull request pointer and ignores junk", () => {
    assert.equal(parseStoredPr(null), null);
    assert.equal(parseStoredPr({ branch: "main" }), null);
    const pr = parseStoredPr({
      branch: "proposal/2026-10-02-s1-tool-crib",
      number: 14,
      state: "open",
      url: "https://github.com/maximusmaximus/drosocore/pull/14",
      sha: "abc1234",
    });
    assert.equal(pr?.number, 14);
    assert.equal(pr?.state, "open");
    assert.equal(pr?.sha, "abc1234");
  });

  it("builds the winner out past the ballot line", () => {
    const ballot = { ...emptyVisual(), extraModules: 1, glowAdd: 0.4, site: "cryo-bay" as const, roleId: "cryo" as const };
    const up = parseUpsample(
      {
        summary: "A second pump can and a clamp on the seated cryo lead.",
        adds: ["second pump can", "labeled stub line"],
        modifies: ["seated cryo lead gains a clamp"],
        visual: { extraModules: 4, glowAdd: 0.9, site: null, prop: "crate" },
      },
      { kind: "location", title: "cryo bay stool", body: "A perch at the bay so dewar work stops happening on the floor.", visual: ballot },
      "e2ee-deepseek-v4-flash",
    );
    assert.equal(up.visual.site, "cryo-bay");
    assert.ok(up.visual.extraModules >= ballot.extraModules + 1);
    assert.equal(up.visual.prop, "crate");
    assert.equal(up.adds.length, 2);
    assert.equal(up.modifies.length, 1);
    assert.equal(up.model, "e2ee-deepseek-v4-flash");
    const fallback = cannedUpsample({ kind: "reactor", title: "trim coil", body: "seat it", visual: emptyVisual() });
    assert.ok(fallback.adds.length >= 2);
    assert.ok(fallback.modifies.length >= 1);
    assert.equal(buildOutVisual(emptyVisual(), null).extraModules, 1);
  });

  it("merges only the winner and records that on the hall state", () => {
    const plan = mergePlan(
      [
        { slot: 0, branch: "proposal/d-s0-a" },
        { slot: 1, branch: "proposal/d-s1-b" },
        { slot: 2, branch: "proposal/d-s2-c" },
      ],
      1,
    );
    assert.equal(plan.merge, "proposal/d-s1-b");
    assert.deepEqual(plan.close, ["proposal/d-s0-a", "proposal/d-s2-c"]);
    const packet = cannedUpsample({
      kind: "workplace",
      title: "labeled tool crib",
      body: "Bins by the pad.",
      visual: { ...emptyVisual(), prop: "rack", roleId: "builder" },
    });
    const next = applyWinnerToState(null, {
      day: "2026-10-02",
      slot: 1,
      kind: "workplace",
      title: "labeled tool crib",
      body: "Bins by the pad.",
      visual: packet.visual,
      packet,
      branch: "proposal/d-s1-b",
      prNumber: 9,
      prUrl: "https://github.com/maximusmaximus/drosocore/pull/9",
      now: "2026-10-02T18:00:00.000Z",
    });
    assert.equal(next.policy, HALL_POLICY);
    assert.equal(next.installs.length, 1);
    assert.equal(next.installs[0].prNumber, 9);
    assert.equal(next.openProposals.length, 0);
    assert.match(renderHallState(next), /labeled tool crib/);
    const round = parseHallState(JSON.parse(renderHallState(next)));
    assert.equal(round.installs[0].title, "labeled tool crib");
    assert.equal(round.installs[0].visual.prop, "rack");
  });
});
