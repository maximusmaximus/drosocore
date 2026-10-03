import type { CargoKind, FlyState } from "./fly-sim.ts";
import type { HiveMemory } from "./hive.ts";
import { cosine, embedText } from "./hive-embed.ts";
import type { RoleId } from "./roles.ts";
import { talkKind, type TalkKind } from "./fly-brain.ts";

function hash01(s: number): number {
  const x = Math.sin(s * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const JOB: Record<RoleId, string[]> = {
  welder: [
    "Hold the seam. Torch is hot.",
    "Gap on coil 14 is still open.",
    "I can close this if you brace it.",
    "Weld bead is clean. Next joint.",
  ],
  coil: [
    "Winding four is short. Fetching more.",
    "TF bobbin jammed. Give me a second.",
    "Coil seated. Check the east gap.",
    "Bobbin is live. Stay off the lead.",
  ],
  physicist: [
    "Plasma is up. Do not poke it.",
    "Density is holding. Leave the knob.",
    "I want a cleaner n-e before we push.",
    "The torus is bored. That is good.",
  ],
  pipe: [
    "Cryoline is sweating. I am on it.",
    "Fit the elbow. I have the wrench.",
    "This run wants another hanger.",
    "Helium does not wait. Move.",
  ],
  crane: [
    "Gary has the load. Clear the pad.",
    "Hook is over the vessel. Easy.",
    "I can lift that crate if you spot.",
    "Catwalk is not a shelf. Down.",
  ],
  inspector: [
    "I am logging this. Do it again.",
    "Torque marks are off. Recheck.",
    "That joint passes. Next one.",
    "Hive will want three names on this.",
  ],
  electric: [
    "Busbar is live. Gloves on.",
    "Cable to the plant is seated.",
    "I need a spare lug from the south rack.",
    "Ground is clean. You can land it.",
  ],
  cryo: [
    "Dewar is heavy. Spot me.",
    "LHe is low. I am topping the can.",
    "Do not breathe on the frost.",
    "Transfer line is hissing. I hear it.",
  ],
  builder: [
    "Scaffold is up one lift. Tie in.",
    "I-beam is walking. Hold the end.",
    "Deck plate goes here, not there.",
    "We build the pad. Physics can wait.",
  ],
  safety: [
    "Stop. That lead is hot.",
    "Three on the catwalk is two too many.",
    "Paddle is up until the crate lands.",
    "If it sparks, I blow the whistle.",
  ],
  diag: [
    "Probe is noisy. Recalibrating.",
    "RF looks honest for once.",
    "I want another shot at that trace.",
    "Diagnostics say the gap is real.",
  ],
  coder: [
    "PCS is looping. Do not cycle it.",
    "I pushed a limiter. Leave it.",
    "Field laptop is not a step.",
    "If it compiles, we still test it.",
  ],
  divertor: [
    "Tungsten tile is seated. Torque it.",
    "Strike face is scored. Swapping.",
    "Heat load likes this corner. Watch it.",
    "I need another tile from the crate.",
  ],
  vacuum: [
    "Turbo is spinning up. Door shut.",
    "We are not at P-zero yet.",
    "Leak is on the west flange. I think.",
    "Pump down, then we talk.",
  ],
  magnet: [
    "PF current is in the window.",
    "Field magnet is walking. Brace it.",
    "I want a quieter ripple before we go.",
    "Ring four is seated. Next ring.",
  ],
  janitor: [
    "Someone spilled caution paint. Again.",
    "I sweep. You bolt. That is the deal.",
    "Crate junk is a trip. Moving it.",
    "Floor first. Then your physics.",
  ],
};

const CARGO: Record<CargoKind, string[]> = {
  cable: ["Cable run is in.", "Landing this lead on the plant.", "Spare lug. Do not trip it."],
  coil: ["Coil on the east gap.", "Winding is seated.", "Bobbin is empty. Going back."],
  crate: ["Crate is on the pad.", "This box is heavier than the brief.", "Unstrapping the crate."],
  pipe: ["Pipe hangers first.", "Elbow is in. Torque it.", "Cryoline wants another clamp."],
  tile: ["Tile for the strike face.", "Tungsten does not float.", "Seating the next plate."],
  dewar: ["Dewar going up the mezz.", "Do not tap the can.", "Helium is in the bottle."],
};

const REPLIES: Record<TalkKind, string[]> = {
  coord: ["Copy. I will take the other end.", "On it. Meet you at the drop.", "Yes. That pairing works."],
  shop: ["Same job. I have a better angle.", "Show me the trick.", "We have done this haul."],
  social: ["Keep talking. I am still hauling.", "Noted. Back to the rack.", "Fine. Then we move."],
};

const MOVE = [
  "Heading for the south rack.",
  "Crossing the pad. Load coming through.",
  "Up the catwalk. Clear the rail.",
  "Back to the vessel with this.",
  "Plant coupler next. Stay off the cables.",
];

const DANCE = ["Paid. We fly.", "ETH in. Keep the beat.", "The hall sings. We do not.", "Wings out. Work later."];

const QUERY = ["Hive already logged that.", "Three of us agreed:", "Memory says", "I asked the log."];

type CiTalk = { seated: string[]; ballot: string[] };
let ciTalk: CiTalk = { seated: [], ballot: [] };

export function setCiTalk(next: CiTalk) {
  ciTalk = {
    seated: next.seated.filter((s) => s.trim()).slice(0, 8),
    ballot: next.ballot.filter((s) => s.trim()).slice(0, 8),
  };
}

export function ciTalkState(): CiTalk {
  return ciTalk;
}

function ciSpeech(seed: number): string | null {
  if (ciTalk.seated.length && hash01(seed + 17) > 0.55) {
    const title = pick(ciTalk.seated, seed);
    return pick(
      [
        `${title} is seated. We voted it in.`,
        `CI packed ${title}. I am using it.`,
        `The hall has ${title} now. Keep it off the paint.`,
        `Venice packed ${title}. Hive logged it.`,
      ],
      seed + 1,
    );
  }
  if (ciTalk.ballot.length && hash01(seed + 19) > 0.62) {
    const title = pick(ciTalk.ballot, seed + 3);
    return pick(
      [
        `I backed ${title} on the six-hour ballot.`,
        `Stake ${title} if you have paid in.`,
        `Crew vote is open. I want ${title}.`,
      ],
      seed + 2,
    );
  }
  return null;
}

function pick(lines: string[], seed: number): string {
  return lines[Math.abs((seed * 17 + 31) | 0) % lines.length];
}

export function talkLine(f: FlyState, partner: FlyState | undefined, time: number): string {
  const kind = partner ? talkKind(f.role.id, partner.role.id) : "social";
  const seed = f.seed + (partner?.seed ?? 0) + Math.floor(time * 3);
  const ci = ciSpeech(seed);
  if (ci && hash01(seed + 21) > 0.38) return ci;
  if (kind === "coord" && hash01(seed) > 0.45) {
    return pick(JOB[f.role.id], seed);
  }
  if (f.cargo && hash01(seed + 1) > 0.5) {
    return pick(CARGO[f.cargo], seed + 2);
  }
  if (hash01(seed + 3) > 0.55) return pick(JOB[f.role.id], seed + 4);
  return pick(REPLIES[kind], seed + 5);
}

export function workLine(f: FlyState, time: number): string {
  const seed = f.seed + Math.floor(time * 5);
  const ci = ciSpeech(seed + 8);
  if (ci && hash01(seed + 23) > 0.5) return ci;
  if (f.cargo) return pick(CARGO[f.cargo], seed);
  return pick(JOB[f.role.id], seed + 1);
}

export function moveLine(f: FlyState, time: number): string {
  return pick(MOVE, f.seed + Math.floor(time));
}

export function danceLine(index: number, time: number): string {
  return pick(DANCE, index * 9 + Math.floor(time * 2));
}

export function constructionFact(cargo: CargoKind | null, roleId: RoleId): string {
  if (cargo === "cable") return "The cable plant feed is staffed and holding.";
  if (cargo === "coil") return "Coil work on the vessel gap is holding.";
  if (cargo === "pipe") return "Cryoline hangers are in and the run is live.";
  if (cargo === "tile") return "Divertor tiles are seating on the strike face.";
  if (cargo === "dewar") return "Helium dewars are moving to the mezzanine.";
  if (cargo === "crate") return "Pad crates are being unpacked on shift.";
  const job = JOB[roleId][0] ?? "The hall job is moving.";
  return job.replace(/\.$/, "") + " — three of us will sign it.";
}

export function talkFact(a: RoleId, b: RoleId): string {
  const kind = talkKind(a, b);
  if (kind === "coord") return `${a} and ${b} coordinate on the same haul.`;
  if (kind === "shop") return `${a} crew is sharing technique on shift.`;
  return `${a} and ${b} compared notes on the pad.`;
}

export function quoteMemory(f: FlyState, fact: string, seed: number): string {
  const lead = pick(QUERY, seed + f.index);
  const short = fact.length > 52 ? fact.slice(0, 49) + "…" : fact;
  return `${lead} ${short}`;
}

export function recallMemory(text: string, memories: HiveMemory[], min = 0.22): HiveMemory | null {
  if (memories.length === 0) return null;
  const q = embedText(text);
  let best: HiveMemory | null = null;
  let score = min;
  for (const m of memories) {
    const c = cosine(q, embedText(m.fact));
    if (c > score) {
      score = c;
      best = m;
    }
  }
  return best;
}

export function isEnglish(s: string): boolean {
  return /[A-Za-z]{3,}/.test(s);
}
