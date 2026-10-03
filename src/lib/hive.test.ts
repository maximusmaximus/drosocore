import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyVote, claimBuild, claimTalk, CONSENSUS_N, emptyVoteBook, nearbyFlies } from "./hive.ts";
import { cosine, embedText, HIVE_DIM, topK } from "./hive-embed.ts";
import { constructionFact, isEnglish, setCiTalk, talkLine } from "./fly-talk.ts";
import { createFlies, stepFlies } from "./fly-sim.ts";

describe("hive embeddings", () => {
  it("is a fixed-length unit vector", () => {
    const v = embedText("Coil work on the vessel gap is holding.");
    assert.equal(v.length, HIVE_DIM);
    const n = Math.hypot(...v);
    assert.ok(Math.abs(n - 1) < 1e-6);
  });

  it("ranks related construction above unrelated talk", () => {
    const q = embedText("coil seated on the east gap");
    const corpus = [
      embedText("Coil work on the vessel gap is holding."),
      embedText("Visitor plugged a wallet."),
      embedText("Someone spilled caution paint."),
    ];
    const hits = topK(q, corpus, 3, 0);
    assert.equal(hits[0].i, 0);
    assert.ok(cosine(q, corpus[0]) > cosine(q, corpus[1]));
  });
});

describe("three-fly consensus", () => {
  it("promotes a claim on the third unique vote", () => {
    const book = emptyVoteBook();
    const key = claimBuild("coil", "welder");
    const fact = constructionFact("coil", "welder");
    const a = applyVote(book, key, fact, 0);
    const b = applyVote(book, key, fact, 1);
    const c = applyVote(book, key, fact, 2);
    assert.equal(a.votes, 1);
    assert.equal(b.votes, 2);
    assert.equal(c.votes, CONSENSUS_N);
    assert.equal(c.newlyAgreed, true);
    const again = applyVote(book, key, fact, 0);
    assert.equal(again.newlyAgreed, false);
    assert.equal(again.first, false);
  });

  it("keeps talk claims symmetric", () => {
    assert.equal(claimTalk("welder", "coil"), claimTalk("coil", "welder"));
  });

  it("collects two neighbors so a third vote can land", () => {
    const flies = createFlies();
    const origin = flies[0];
    origin.pos = { x: 0, y: 1, z: 0 };
    flies[1].pos = { x: 1, y: 1, z: 0 };
    flies[2].pos = { x: 0, y: 1, z: 1 };
    flies[3].pos = { x: 40, y: 1, z: 40 };
    const near = nearbyFlies(flies, origin, 2);
    assert.equal(near.length, 2);
    assert.ok(near.every((f) => f.index !== origin.index));
    assert.ok(near.every((f) => f.index !== 3));
  });
});

describe("english shift talk", () => {
  it("emits English job lines", () => {
    const flies = createFlies();
    const line = talkLine(flies[0], flies[1], 12);
    assert.ok(isEnglish(line), line);
    assert.ok(line.length > 8);
  });

  it("writes English onto talking workers", () => {
    const flies = createFlies();
    const a = flies[0];
    const b = flies[1];
    a.pos = { x: 0, y: 1, z: 0 };
    b.pos = { x: 0.3, y: 1, z: 0.2 };
    a.mode = "goto";
    b.mode = "goto";
    a.talkCool = 0;
    b.talkCool = 0;
    for (let i = 0; i < 180; i++) stepFlies(flies, 1 / 60, false, i / 8);
    const spoken = flies.filter((f) => isEnglish(f.speech));
    assert.ok(spoken.length >= 1, flies.map((f) => f.speech).join("|"));
  });

  it("lets the crew name seated CI packs", () => {
    setCiTalk({ seated: ["PF trim coil on bay 7"], ballot: ["pad lamp over the plant"] });
    const flies = createFlies();
    const hits: string[] = [];
    for (let t = 0; t < 80; t++) {
      const line = talkLine(flies[0], flies[1], t);
      if (/trim coil|pad lamp|CI packed|six-hour ballot|Venice packed/i.test(line)) hits.push(line);
    }
    setCiTalk({ seated: [], ballot: [] });
    assert.ok(hits.length >= 1, hits.join("|") || "no CI lines");
    assert.ok(hits.every(isEnglish));
  });
});
