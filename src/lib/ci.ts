import { CALLSIGNS } from "./fly-sim.ts";
import { CORE_POS } from "./constants.ts";
import { ROLES, type RoleId } from "./roles.ts";

export const CI_WINDOW_MS = 6 * 60 * 60 * 1000;
export const CI_BUDGET_USD = 1;
export const CI_KINDS = ["reactor", "workplace", "outfit", "body", "location", "retire"] as const;
export type CiKind = (typeof CI_KINDS)[number];

export const CI_PROPOSAL_CAP = 5;

export const CI_SITES = [
  "winding-bench",
  "divertor-bench",
  "vacuum-manifold",
  "bus-gallery",
  "cryo-bay",
  "control-perch",
  "brood-nest",
  "fuel-shed",
] as const;
export type CiSite = (typeof CI_SITES)[number];

export const CI_RULES = ["vessel-duty", "mezz-lock", "pair-haul", "job-speech"] as const;
export type CiRule = (typeof CI_RULES)[number];

export const CI_PROPS = ["none", "rack", "lamp", "crate", "decal"] as const;
export type CiProp = (typeof CI_PROPS)[number];

export const CI_GEAR = ["none", "hood", "cape", "harness", "goggles", "antenna"] as const;
export type CiGear = (typeof CI_GEAR)[number];

export type CiStatus = "open" | "closed" | "fabricating" | "installed" | "failed";

export type CiPrState = "queued" | "open" | "merged" | "closed";

export type CiPr = {
  branch: string;
  number: number | null;
  url: string | null;
  state: CiPrState;
  sha: string | null;
};

export type CiUpsample = {
  summary: string;
  adds: string[];
  modifies: string[];
  model: string;
};

export type CiVisual = {
  glowAdd: number;
  extraModules: number;
  prop: CiProp;
  gear: CiGear;
  roleId: RoleId | null;
  tint: string | null;
  site?: CiSite | null;
  rule?: CiRule | null;
  strip?: CiGear;
};

export type CiOptionDraft = {
  kind: CiKind;
  title: string;
  body: string;
  sponsor: string;
  roleId: RoleId | null;
  visual: CiVisual;
};

export type CiOptionView = {
  id: number;
  cycleId: number;
  slot: number;
  kind: CiKind;
  title: string;
  body: string;
  sponsor: string;
  roleId: RoleId | null;
  visual: CiVisual;
  flyVotes: number;
  stakeEth: number;
  voterCount: number;
  flies: string[];
  pr: CiPr | null;
};

export type CiCycleView = {
  id: number;
  dayKey: string;
  status: CiStatus;
  opensAt: string;
  closesAt: string;
  tallyCid: string | null;
  tallyUrl: string | null;
  winnerOptionId: number | null;
  itemId: number | null;
  brief: string;
};

export type CiItemView = {
  id: number;
  cycleId: number;
  optionId: number | null;
  kind: CiKind;
  title: string;
  body: string;
  visual: CiVisual;
  materials: string[];
  steps: string[];
  imagePrompt: string;
  imageCid: string | null;
  imageUrl: string | null;
  metaCid: string | null;
  metaUrl: string | null;
  model: string;
  costUsd: number;
  installedAt: string | null;
  createdAt: string;
  pr: CiPr | null;
  upsample: CiUpsample | null;
};

export type CiMessageView = {
  id: number;
  cycleId: number | null;
  itemId: number | null;
  actor: string;
  kind: string;
  body: string;
  createdAt: string;
};

export type CiStake = {
  eth: number;
  ads: number;
  membership: number;
  eligible: boolean;
};

export type CiDesk = {
  cycle: CiCycleView | null;
  options: CiOptionView[];
  myVote: { optionId: number; weightEth: number } | null;
  stake: CiStake;
  items: CiItemView[];
  history: CiCycleView[];
  messages: CiMessageView[];
  budget: { dayKey: string; spentUsd: number; capUsd: number };
  now: string;
};

export function emptyVisual(): CiVisual {
  return {
    glowAdd: 0,
    extraModules: 0,
    prop: "none",
    gear: "none",
    roleId: null,
    tint: null,
    site: null,
    rule: null,
    strip: "none",
  };
}

export function isCiKind(v: string): v is CiKind {
  return (CI_KINDS as readonly string[]).includes(v);
}

export function isCiStatus(v: string): v is CiStatus {
  return v === "open" || v === "closed" || v === "fabricating" || v === "installed" || v === "failed";
}

export function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function closesAtIso(opens: Date, windowMs = CI_WINDOW_MS): string {
  return new Date(opens.getTime() + windowMs).toISOString();
}

export function remainingMs(closesAt: string, now = Date.now()): number {
  return Math.max(0, Date.parse(closesAt) - now);
}

export function formatRemain(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m ${String(sec).padStart(2, "0")}s`;
}

export function voteMessage(cycleId: number, optionId: number, day: string): string {
  return `DROSOCORE CI vote\nCycle ${cycleId}\nOption ${optionId}\nDay ${day}`;
}

export function milliweth(eth: number): number {
  if (!Number.isFinite(eth) || eth <= 0) return 0;
  return Math.max(0, Math.round(eth * 1000));
}

export function stakeEligible(eth: number): boolean {
  return milliweth(eth) >= 1;
}

const ROLE_IDS = new Set(ROLES.map((r) => r.id));

function asRole(v: unknown): RoleId | null {
  return typeof v === "string" && ROLE_IDS.has(v as RoleId) ? (v as RoleId) : null;
}

function asSite(v: unknown): CiSite | null {
  return typeof v === "string" && (CI_SITES as readonly string[]).includes(v) ? (v as CiSite) : null;
}

function asRule(v: unknown): CiRule | null {
  return typeof v === "string" && (CI_RULES as readonly string[]).includes(v) ? (v as CiRule) : null;
}

function asProp(v: unknown): CiProp {
  return typeof v === "string" && (CI_PROPS as readonly string[]).includes(v) ? (v as CiProp) : "none";
}

function asGear(v: unknown): CiGear {
  return typeof v === "string" && (CI_GEAR as readonly string[]).includes(v) ? (v as CiGear) : "none";
}

function clampNum(v: unknown, lo: number, hi: number, fallback = 0): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : fallback;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, n));
}

const HEX = /^#[0-9a-fA-F]{6}$/;

export function parseVisual(raw: unknown): CiVisual {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const tint = typeof o.tint === "string" && HEX.test(o.tint) ? o.tint.toLowerCase() : null;
  return {
    glowAdd: clampNum(o.glowAdd, 0, 2.6, 0),
    extraModules: Math.round(clampNum(o.extraModules, 0, 6, 0)),
    prop: asProp(o.prop),
    gear: asGear(o.gear),
    roleId: asRole(o.roleId),
    tint,
    site: asSite(o.site),
    rule: asRule(o.rule),
    strip: asGear(o.strip),
  };
}

export function parseOptionDraft(raw: unknown): CiOptionDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.kind !== "string" || !isCiKind(o.kind)) return null;
  if (typeof o.title !== "string" || o.title.trim().length < 3) return null;
  if (typeof o.body !== "string" || o.body.trim().length < 8) return null;
  const sponsor = typeof o.sponsor === "string" && o.sponsor.trim() ? o.sponsor.trim().slice(0, 24) : "Helix";
  return {
    kind: o.kind,
    title: o.title.trim().slice(0, 56),
    body: o.body.trim().slice(0, 200),
    sponsor,
    roleId: asRole(o.roleId),
    visual: parseVisual(o.visual),
  };
}

export function kindAffinity(role: RoleId): CiKind {
  switch (role) {
    case "welder":
    case "coil":
    case "magnet":
    case "divertor":
    case "vacuum":
      return "reactor";
    case "builder":
    case "crane":
    case "janitor":
    case "pipe":
    case "safety":
      return "workplace";
    case "inspector":
    case "electric":
    case "cryo":
    case "coder":
      return "outfit";
    default:
      return "body";
  }
}

function hash01(s: number): number {
  const x = Math.sin(s * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function flyEndorseSlot(flyIndex: number, role: RoleId, day: string, n: number, kinds?: CiKind[]): number {
  if (n <= 1) return 0;
  const list = kinds && kinds.length === n ? kinds : null;
  const jitter = hash01(flyIndex * 19.17 + day.charCodeAt(day.length - 1) * 0.13);
  if (list) {
    const loc = list.findIndex((k) => k === "location");
    const ret = list.findIndex((k) => k === "retire");
    if ((role === "builder" || role === "crane" || role === "safety" || role === "janitor") && loc >= 0 && jitter < 0.58) {
      return loc;
    }
    if ((role === "inspector" || role === "physicist") && ret >= 0 && jitter < 0.48) return ret;
    const prefer = kindAffinity(role);
    const exact = list.findIndex((k) => k === prefer);
    if (exact >= 0 && jitter < 0.72) return exact;
  } else {
    const prefer = kindAffinity(role);
    const kindSlot = (["reactor", "workplace", "outfit", "body"] as const).indexOf(
      prefer === "location" || prefer === "retire" ? "workplace" : prefer,
    );
    if (jitter < 0.62 && kindSlot >= 0 && kindSlot < n) return kindSlot;
  }
  return Math.floor(hash01(flyIndex * 7.3 + day.length * 0.41) * n) % n;
}

export function flyBallotsFor(
  day: string,
  options: { slot: number; kind: CiKind }[],
): { flyIndex: number; name: string; slot: number }[] {
  const n = Math.max(1, options.length);
  return ROLES.map((role, i) => ({
    flyIndex: i,
    name: CALLSIGNS[i % CALLSIGNS.length],
    slot: flyEndorseSlot(i, role.id, day, n, options.map((o) => o.kind)),
  }));
}

export type CiTallyRow = { optionId: number; slot: number; flyVotes: number; stakeEth: number };

export function pickWinner(rows: CiTallyRow[]): CiTallyRow | null {
  if (!rows.length) return null;
  const human = rows.reduce((s, r) => s + r.stakeEth, 0);
  const ranked = [...rows].sort((a, b) => {
    if (human > 0) {
      if (b.stakeEth !== a.stakeEth) return b.stakeEth - a.stakeEth;
    }
    if (b.flyVotes !== a.flyVotes) return b.flyVotes - a.flyVotes;
    return a.slot - b.slot;
  });
  return ranked[0] ?? null;
}

const POOL: CiOptionDraft[] = [
  {
    kind: "reactor",
    title: "PF trim coil on bay 7",
    body: "A small trim winding to flatten the error field on the east gap. Crew can seat it without a crane lift.",
    sponsor: "Toroid",
    roleId: "coil",
    visual: { glowAdd: 0.7, extraModules: 2, prop: "none", gear: "none", roleId: "coil", tint: null },
  },
  {
    kind: "workplace",
    title: "labeled tool crib",
    body: "A steel crib by the pad with bins for torches, testers, and torque wrenches so hauls stop hunting the floor.",
    sponsor: "Boson",
    roleId: "builder",
    visual: { glowAdd: 0, extraModules: 0, prop: "rack", gear: "none", roleId: "builder", tint: null },
  },
  {
    kind: "outfit",
    title: "argon purge visor",
    body: "A close visor that keeps the weld pocket inert. Welders asked first; electric wants the same shell.",
    sponsor: "Helix",
    roleId: "welder",
    visual: { glowAdd: 0, extraModules: 0, prop: "none", gear: "hood", roleId: "welder", tint: null },
  },
  {
    kind: "body",
    title: "antennal IR pickups",
    body: "Short IR fibers on T1 so diagnostics can read tile heat without walking the catwalk with a probe.",
    sponsor: "Neutrino",
    roleId: "diag",
    visual: { glowAdd: 0.15, extraModules: 0, prop: "none", gear: "antenna", roleId: "diag", tint: null },
  },
  {
    kind: "reactor",
    title: "divertor strike tiles",
    body: "Four tungsten tiles for the inner strike face. Divertina has the pattern. The old set is scored.",
    sponsor: "Divertina",
    roleId: "divertor",
    visual: { glowAdd: 0.55, extraModules: 1, prop: "none", gear: "none", roleId: "divertor", tint: null },
  },
  {
    kind: "workplace",
    title: "pad lamp over the plant",
    body: "A cool work lamp aimed at the ETH coupler so night hauls stop guessing socket numbers.",
    sponsor: "Photon",
    roleId: "electric",
    visual: { glowAdd: 0.35, extraModules: 0, prop: "lamp", gear: "none", roleId: "electric", tint: null },
  },
  {
    kind: "outfit",
    title: "static-safe harness",
    body: "A grounded strap for busbar work. Electric and magnet both get one; the rest of us stay off the lead.",
    sponsor: "Magnum",
    roleId: "electric",
    visual: { glowAdd: 0, extraModules: 0, prop: "none", gear: "harness", roleId: "electric", tint: null },
  },
  {
    kind: "body",
    title: "stronger T3 haunches",
    body: "A stiffer T3 segment for crate and coil hauls. Crane asked. Janitor seconded. Physics abstained.",
    sponsor: "Quark",
    roleId: "crane",
    visual: { glowAdd: 0, extraModules: 0, prop: "none", gear: "none", roleId: "crane", tint: "#1a1814" },
  },
  {
    kind: "reactor",
    title: "NBI cryopump can",
    body: "A small pump can on the NBI box to keep the beamline dry while the main turbo is busy.",
    sponsor: "Cryona",
    roleId: "vacuum",
    visual: { glowAdd: 0.4, extraModules: 2, prop: "none", gear: "none", roleId: "vacuum", tint: null },
  },
  {
    kind: "workplace",
    title: "cable-reel crate",
    body: "A marked crate for live leads so we stop looping cable over the caution paint.",
    sponsor: "Flux",
    roleId: "janitor",
    visual: { glowAdd: 0, extraModules: 0, prop: "crate", gear: "none", roleId: "janitor", tint: null },
  },
  {
    kind: "outfit",
    title: "cryo goggle shells",
    body: "Frosted cups over the compound eyes for dewar work. Cryona filed it. Physicist wants a pair too.",
    sponsor: "Alfven",
    roleId: "cryo",
    visual: { glowAdd: 0, extraModules: 0, prop: "none", gear: "goggles", roleId: "cryo", tint: null },
  },
  {
    kind: "body",
    title: "dorsal sensor cape",
    body: "A thin dorsal cape with pickup traces so PCS can log gait while a worker is on the vessel.",
    sponsor: "Plasma",
    roleId: "coder",
    visual: { glowAdd: 0.2, extraModules: 0, prop: "none", gear: "cape", roleId: "coder", tint: "#5eead4" },
  },
];

const SEED_KINDS = ["reactor", "workplace", "outfit", "body"] as const satisfies readonly CiKind[];

export function cannedOptions(day: string): CiOptionDraft[] {
  const seed = day.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const out: CiOptionDraft[] = [];
  for (let k = 0; k < SEED_KINDS.length; k++) {
    const kind = SEED_KINDS[k];
    const pool = POOL.filter((p) => p.kind === kind);
    const pick = pool[(seed + k * 3) % pool.length] ?? pool[0];
    const sponsor = CALLSIGNS[(seed + k * 5) % CALLSIGNS.length];
    out.push({ ...pick, sponsor });
  }
  return out;
}

export type SitePlace = {
  id: CiSite;
  x: number;
  y: number;
  z: number;
  roles: RoleId[];
  label: string;
};

export const SITE_PLACES: Record<CiSite, SitePlace> = {
  "winding-bench": {
    id: "winding-bench",
    x: 4.35,
    y: 0.16,
    z: 1.15,
    roles: ["coil", "magnet", "welder"],
    label: "winding bench",
  },
  "divertor-bench": {
    id: "divertor-bench",
    x: 1.15,
    y: 0.16,
    z: 5.55,
    roles: ["divertor", "welder", "crane"],
    label: "divertor bench",
  },
  "vacuum-manifold": {
    id: "vacuum-manifold",
    x: -4.7,
    y: 0.16,
    z: 2.15,
    roles: ["vacuum", "pipe"],
    label: "vacuum manifold",
  },
  "bus-gallery": {
    id: "bus-gallery",
    x: -2.15,
    y: 0.16,
    z: -5.2,
    roles: ["electric", "magnet"],
    label: "bus gallery",
  },
  "cryo-bay": {
    id: "cryo-bay",
    x: 5.9,
    y: 0.16,
    z: -2.35,
    roles: ["cryo", "pipe"],
    label: "cryo bay",
  },
  "control-perch": {
    id: "control-perch",
    x: -6.15,
    y: 0.18,
    z: -1.35,
    roles: ["coder", "physicist", "diag"],
    label: "control perch",
  },
  "brood-nest": {
    id: "brood-nest",
    x: 2.7,
    y: 0.14,
    z: -3.55,
    roles: ["janitor", "safety", "inspector", "builder"],
    label: "brood nest",
  },
  "fuel-shed": {
    id: "fuel-shed",
    x: CORE_POS.x + 1.85,
    y: 0.16,
    z: CORE_POS.z + 0.55,
    roles: ["physicist", "vacuum", "cryo"],
    label: "fuel shed",
  },
};

const SITES: CiOptionDraft[] = (Object.keys(SITE_PLACES) as CiSite[]).map((id) => {
  const place = SITE_PLACES[id];
  const why: Record<CiSite, string> = {
    "winding-bench": "A floor bench at the vessel base so coil techs wind and seat turns without a crane lift.",
    "divertor-bench": "A strike-tile bench on the south skirt. Divertor work stops living on the catwalk.",
    "vacuum-manifold": "A manifold west of the vessel so the turbo and the beamline share one dry header.",
    "bus-gallery": "A live bus gallery. The plant cannot stay up if electric still hunts leads on the floor.",
    "cryo-bay": "A fill bay for dewars. Self-sustaining heat loads need helium that is already staged.",
    "control-perch": "A perch for PCS and density. The shot should be driven from the floor, not a laptop on a knee.",
    "brood-nest": "A meet nest. Shift planning happens here so hauls stop starting from six different pads.",
    "fuel-shed": "A pellet shed by the plant. Fuel on hand is how the torus stays lit between shifts.",
  };
  return {
    kind: "location" as const,
    title: place.label,
    body: why[id],
    sponsor: "Boson",
    roleId: place.roles[0] ?? null,
    visual: {
      glowAdd: id === "fuel-shed" || id === "bus-gallery" ? 0.35 : 0.1,
      extraModules: 0,
      prop: "none",
      gear: "none",
      roleId: place.roles[0] ?? null,
      tint: null,
      site: id,
    },
  };
});

const RETIRES: CiOptionDraft[] = [
  {
    kind: "retire",
    title: "drop vessel-only drops",
    body: "Vessel-duty makes reactor crew dump every haul on the core. New sites never get used. Retire the rule.",
    sponsor: "Toroid",
    roleId: "coil",
    visual: { ...emptyVisual(), rule: "vessel-duty", roleId: "coil" },
  },
  {
    kind: "retire",
    title: "open the mezzanine",
    body: "Mezz-lock keeps most of the crew off the high walkways. The plant needs eyes up there. Retire it.",
    sponsor: "Quark",
    roleId: "crane",
    visual: { ...emptyVisual(), rule: "mezz-lock", roleId: "crane" },
  },
  {
    kind: "retire",
    title: "haul without a partner",
    body: "Pair-haul stalls a loaded fly until someone stands nearby. Solo hauls finish the shift. Retire it.",
    sponsor: "Gyro",
    roleId: "builder",
    visual: { ...emptyVisual(), rule: "pair-haul", roleId: "builder" },
  },
  {
    kind: "retire",
    title: "allow off-job talk",
    body: "Job-speech blocks chatter that is not a work order. The nest needs planning talk. Retire the rule.",
    sponsor: "Plasma",
    roleId: "coder",
    visual: { ...emptyVisual(), rule: "job-speech", roleId: "coder" },
  },
  {
    kind: "retire",
    title: "shed the weld hood",
    body: "The argon hood fogs the compound eyes on a clean seam. Welders want it off until the pocket is dirty.",
    sponsor: "Helix",
    roleId: "welder",
    visual: { ...emptyVisual(), gear: "hood", strip: "hood", roleId: "welder" },
  },
  {
    kind: "retire",
    title: "cut the sensor cape",
    body: "The dorsal cape snags on rails and does not change the shot. PCS can log without it.",
    sponsor: "Plasma",
    roleId: "coder",
    visual: { ...emptyVisual(), gear: "cape", strip: "cape", roleId: "coder" },
  },
  {
    kind: "retire",
    title: "pull the IR pickups",
    body: "Antennal IR fibers itch and the probe already reads tile heat. Diagnostics wants them gone.",
    sponsor: "Neutrino",
    roleId: "diag",
    visual: { ...emptyVisual(), gear: "antenna", strip: "antenna", roleId: "diag" },
  },
  {
    kind: "retire",
    title: "pull the tool crib",
    body: "The labeled crib crowds the pad and the bins stay empty. Builder wants the rack gone.",
    sponsor: "Boson",
    roleId: "builder",
    visual: { ...emptyVisual(), prop: "rack", roleId: "builder" },
  },
  {
    kind: "retire",
    title: "pull the spare trim coils",
    body: "The extra modules on the plant draw heat we do not have yet. Physics wants them off until the new sites are working.",
    sponsor: "Alfven",
    roleId: "physicist",
    visual: { ...emptyVisual(), glowAdd: 0.7, extraModules: 2, roleId: "physicist" },
  },
];

export function sustainBallot(day: string): CiOptionDraft[] {
  const seed = day.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const out: CiOptionDraft[] = [];
  const used = new Set<string>();
  const take = (pool: CiOptionDraft[], salt: number) => {
    for (let i = 0; i < pool.length; i++) {
      const pick = pool[(seed + salt + i) % pool.length];
      if (!pick || used.has(pick.title)) continue;
      used.add(pick.title);
      const sponsor = CALLSIGNS[(seed + salt + i * 3) % CALLSIGNS.length];
      out.push({ ...pick, sponsor });
      return;
    }
  };
  const rules = RETIRES.filter((r) => r.visual.rule);
  const pulls = RETIRES.filter((r) => !r.visual.rule);
  take(SITES, 1);
  take(SITES, 4);
  take(SITES, 9);
  take(POOL, 2);
  if (hash01(seed + 3.1) < 0.62) take(rules, 6);
  else take(pulls, 6);
  if (!out.some((o) => o.kind === "retire")) take(RETIRES, 6);
  return out.slice(0, CI_PROPOSAL_CAP);
}

const GEAR_WORDS = ["hood", "cape", "harness", "goggles", "antenna"] as const;
const PROP_WORDS = ["rack", "lamp", "crate", "decal"] as const;

export function attachNeeds(d: CiOptionDraft): CiOptionDraft {
  const visual: CiVisual = { ...emptyVisual(), ...d.visual };
  const blob = `${d.title} ${d.body}`.toLowerCase();
  if (d.kind === "location" && !visual.site) {
    const hit = (CI_SITES as readonly CiSite[]).find(
      (id) => blob.includes(id.replace(/-/g, " ")) || blob.includes(SITE_PLACES[id].label),
    );
    if (hit) visual.site = hit;
  }
  if (d.kind === "retire") {
    if (!visual.rule) {
      const hit = CI_RULES.find((r) => blob.includes(r) || blob.includes(r.replace(/-/g, " ")));
      if (hit) visual.rule = hit;
    }
    if (!visual.strip || visual.strip === "none") {
      const gear = GEAR_WORDS.find((g) => blob.includes(g));
      if (gear) {
        visual.strip = gear;
        if (visual.gear === "none") visual.gear = gear;
      }
    }
    if (visual.prop === "none") {
      if (blob.includes("crib") || blob.includes("rack")) visual.prop = "rack";
      else {
        const prop = PROP_WORDS.find((p) => blob.includes(p));
        if (prop) visual.prop = prop;
      }
    }
  }
  return { ...d, visual };
}

export function selectSustainDrafts(drafts: CiOptionDraft[]): CiOptionDraft[] | null {
  const uniq: CiOptionDraft[] = [];
  const seen = new Set<string>();
  for (const d of drafts) {
    const key = d.title.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(d);
  }
  const loc = uniq.find((d) => d.kind === "location" && d.visual.site);
  const ret = uniq.find(
    (d) =>
      d.kind === "retire" &&
      Boolean(
        d.visual.rule ||
          (d.visual.strip && d.visual.strip !== "none") ||
          d.visual.prop !== "none" ||
          (d.visual.gear && d.visual.gear !== "none") ||
          d.visual.glowAdd > 0 ||
          d.visual.extraModules > 0,
      ),
  );
  if (!loc || !ret) return null;
  const rest = uniq.filter((d) => d !== loc && d !== ret);
  const out = [loc, ...rest.slice(0, CI_PROPOSAL_CAP - 2), ret];
  if (out.length !== CI_PROPOSAL_CAP) return null;
  return out;
}

export function keepBallotVisual(ballot: CiVisual, next: CiVisual): CiVisual {
  return {
    ...next,
    site: next.site ?? ballot.site ?? null,
    rule: next.rule ?? ballot.rule ?? null,
    strip: next.strip && next.strip !== "none" ? next.strip : (ballot.strip ?? "none"),
    prop: next.prop !== "none" ? next.prop : ballot.prop,
    gear: next.gear !== "none" ? next.gear : ballot.gear,
    roleId: next.roleId ?? ballot.roleId,
  };
}

export function kindLabel(kind: CiKind): string {
  switch (kind) {
    case "reactor":
      return "reactor";
    case "workplace":
      return "workplace";
    case "outfit":
      return "outfit";
    case "body":
      return "body";
    case "location":
      return "location";
    case "retire":
      return "retire";
  }
}

export function packMaterials(kind: CiKind): string[] {
  switch (kind) {
    case "reactor":
      return ["copper winding", "G10 clamp", "M6 studs"];
    case "workplace":
      return ["steel angle", "bin labels", "floor bolts"];
    case "outfit":
      return ["polycarb shell", "ground strap", "felt seal"];
    case "body":
      return ["IR fiber", "T3 splice", "epoxy"];
    case "location":
      return ["floor bolts", "guard rail", "nameplate"];
    case "retire":
      return ["cutter", "patch plate", "shift note"];
  }
}

export function packSteps(kind: CiKind): string[] {
  switch (kind) {
    case "reactor":
      return ["spot the bay", "seat the winding", "torque, log, walk away"];
    case "workplace":
      return ["mark the pad", "stand the crib", "label the bins"];
    case "outfit":
      return ["fit the shell", "ground the strap", "log the issue"];
    case "body":
      return ["prep the segment", "splice", "walk a test haul"];
    case "location":
      return ["mark the pad", "stand the site", "send the crew"];
    case "retire":
      return ["name what fails", "pull it", "log the hole"];
  }
}

export type CiWorld = {
  glowAdd: number;
  extraModules: number;
  props: CiProp[];
  gear: CiGear[];
  gearByRole: Partial<Record<RoleId, CiGear>>;
  tint: string | null;
  sites: CiSite[];
  retiredRules: CiRule[];
  stripped: Partial<Record<RoleId, CiGear>>;
};

export function reduceInstalls(items: { kind: CiKind; visual: CiVisual }[]): CiWorld {
  const world: CiWorld = {
    glowAdd: 0,
    extraModules: 0,
    props: [],
    gear: [],
    gearByRole: {},
    tint: null,
    sites: [],
    retiredRules: [],
    stripped: {},
  };
  for (const it of items) {
    const v = it.visual;
    if (it.kind === "retire") {
      world.glowAdd -= v.glowAdd;
      world.extraModules -= v.extraModules;
      if (v.prop !== "none") world.props = world.props.filter((p) => p !== v.prop);
      if (v.site) world.sites = world.sites.filter((s) => s !== v.site);
      if (v.rule && !world.retiredRules.includes(v.rule)) world.retiredRules.push(v.rule);
      const strip = v.strip && v.strip !== "none" ? v.strip : v.gear !== "none" ? v.gear : null;
      if (strip) {
        if (v.roleId) {
          world.stripped[v.roleId] = strip;
          if (world.gearByRole[v.roleId] === strip) delete world.gearByRole[v.roleId];
        } else {
          world.gear = world.gear.filter((g) => g !== strip);
          for (const role of Object.keys(world.gearByRole) as RoleId[]) {
            if (world.gearByRole[role] === strip) {
              delete world.gearByRole[role];
              world.stripped[role] = strip;
            }
          }
        }
      }
      continue;
    }
    world.glowAdd += v.glowAdd;
    world.extraModules += v.extraModules;
    if (v.prop !== "none" && !world.props.includes(v.prop)) world.props.push(v.prop);
    if (v.gear !== "none") {
      if (v.roleId) {
        if (world.stripped[v.roleId] !== v.gear) world.gearByRole[v.roleId] = v.gear;
      } else if (!world.gear.includes(v.gear)) world.gear.push(v.gear);
    }
    if (v.site && !world.sites.includes(v.site)) world.sites.push(v.site);
    if (v.tint) world.tint = v.tint;
  }
  world.glowAdd = Math.min(3.2, Math.max(0, world.glowAdd));
  world.extraModules = Math.min(8, Math.max(0, world.extraModules));
  return world;
}

export function gearForRole(world: CiWorld, role: RoleId): CiGear {
  const worn = world.gearByRole[role];
  if (worn && world.stripped[role] === worn) return "none";
  if (world.stripped[role] && !worn) return "none";
  return worn ?? world.gear.find((g) => g !== world.stripped[role]) ?? "none";
}
