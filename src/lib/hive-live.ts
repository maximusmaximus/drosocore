import { constructionFact, danceLine, moveLine, quoteMemory, talkFact, talkLine, workLine } from "./fly-talk";
import { claimBuild, claimTalk, nearbyFlies, zoneOf } from "./hive";
import { logHive } from "./hive-log";
import { useHive } from "./hive-store";
import { hash01, type FlyState } from "./fly-sim";

type Snap = {
  mode: FlyState["mode"];
  cargo: FlyState["cargo"];
  talkWith: number;
  speech: string;
  x: number;
  z: number;
};

const snaps: Snap[] = [];
const lastMoveAt: number[] = [];
const lastQueryAt: number[] = [];
let lastObserve = 0;

function snapOf(f: FlyState): Snap {
  return { mode: f.mode, cargo: f.cargo, talkWith: f.talkWith, speech: f.speech, x: f.pos.x, z: f.pos.z };
}

function dist2(a: Snap, f: FlyState): number {
  const dx = a.x - f.pos.x;
  const dz = a.z - f.pos.z;
  return dx * dx + dz * dz;
}

function maybeQuote(f: FlyState, seed: number) {
  const hive = useHive.getState();
  const hit = hive.nearestFact(f.speech || f.role.title);
  if (!hit) return false;
  if (hash01(seed + f.index * 3.1) < 0.42) return false;
  f.speech = quoteMemory(f, hit.fact, seed);
  f.speechLeft = Math.max(f.speechLeft, 2.2);
  lastQueryAt[f.index] = seed;
  logHive({
    kind: "query",
    flow: "out",
    actor: f.name,
    title: "recall",
    body: `${f.name} pulled: ${hit.fact}`,
    meta: { fly: f.index, claimKey: hit.claimKey },
  });
  return true;
}

function voteCluster(flies: FlyState[], origin: FlyState, claimKey: string, fact: string, extra: number) {
  const hive = useHive.getState();
  void hive.vote(origin.index, claimKey, fact);
  for (const o of nearbyFlies(flies, origin, extra)) {
    void hive.vote(o.index, claimKey, fact);
  }
}

export function observeFlies(flies: FlyState[], time: number) {
  if (time - lastObserve < 0.35) return;
  lastObserve = time;

  for (const f of flies) {
    const prev = snaps[f.index];
    if (!prev) {
      snaps[f.index] = snapOf(f);
      continue;
    }

    if (f.mode === "talk" && prev.mode !== "talk") {
      const partner = f.talkWith >= 0 ? flies[f.talkWith] : undefined;
      if (!f.speech || f.speech.length < 4) f.speech = talkLine(f, partner, time);
      const quoted = maybeQuote(f, time);
      if (!quoted && partner && f.index < partner.index) {
        logHive({
          kind: "discussion",
          flow: "in",
          actor: f.name,
          title: `${f.name} · ${partner.name}`,
          body: `${f.speech} — ${partner.speech}`,
          meta: { a: f.index, b: partner.index },
          flyIndex: f.index,
          claimKey: claimTalk(f.role.id, partner.role.id),
          fact: talkFact(f.role.id, partner.role.id),
        });
        const key = claimTalk(f.role.id, partner.role.id);
        const fact = talkFact(f.role.id, partner.role.id);
        void useHive.getState().vote(f.index, key, fact);
        void useHive.getState().vote(partner.index, key, fact);
        const third = nearbyFlies(flies, f, 4).find((o) => o.index !== partner.index);
        if (third) void useHive.getState().vote(third.index, key, fact);
      }
    }

    if (prev.mode === "work" && f.mode !== "work") {
      const line = workLine({ ...f, cargo: prev.cargo }, time);
      const key = claimBuild(prev.cargo, f.role.id);
      const fact = constructionFact(prev.cargo, f.role.id);
      logHive({
        kind: "construction",
        flow: "in",
        actor: f.name,
        title: f.role.title,
        body: `${f.name} (${f.role.title}): ${line}`,
        meta: { fly: f.index, cargo: prev.cargo, zone: zoneOf(f.pos.x, f.pos.z) },
        flyIndex: f.index,
        claimKey: key,
        fact,
      });
      voteCluster(flies, f, key, fact, 2);
      if (hash01(f.seed + time) > 0.62) maybeQuote(f, time + 1);
    }

    if (f.mode === "goto" && dist2(prev, f) > 9 && time - (lastMoveAt[f.index] ?? 0) > 7) {
      lastMoveAt[f.index] = time;
      const line = moveLine(f, time);
      logHive({
        kind: "movement",
        flow: "in",
        actor: f.name,
        title: f.name,
        body: `${f.name} ${line.toLowerCase()}`,
        meta: { fly: f.index, zone: zoneOf(f.pos.x, f.pos.z) },
      });
    }

    if (f.mode === "dance" && prev.mode !== "dance") {
      f.speech = danceLine(f.index, time);
      f.speechLeft = 2;
    }

    snaps[f.index] = snapOf(f);
  }
}

export function resetHiveLive() {
  snaps.length = 0;
  lastMoveAt.length = 0;
  lastQueryAt.length = 0;
  lastObserve = 0;
}
