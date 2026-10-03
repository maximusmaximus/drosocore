import { getAddress } from "viem";
import { recoverMessageAddress } from "viem";
import {
  attachNeeds,
  cannedOptions,
  CI_BUDGET_USD,
  CI_WINDOW_MS,
  dayKey,
  flyBallotsFor,
  isCiKind,
  isCiStatus,
  keepBallotVisual,
  packMaterials,
  packSteps,
  parseOptionDraft,
  parseVisual,
  pickWinner,
  selectSustainDrafts,
  stakeEligible,
  sustainBallot,
  voteMessage,
  type CiCycleView,
  type CiDesk,
  type CiItemView,
  type CiKind,
  type CiMessageView,
  type CiOptionDraft,
  type CiOptionView,
  type CiStake,
  type CiStatus,
  type CiVisual,
} from "./ci";
import { CALLSIGNS } from "./fly-sim";
import { embedText, encodeEmbedding } from "./hive-embed";
import { insertEvent } from "./hive.server";
import { ROLES } from "./roles";
import { CI_IMAGE_MODEL, CI_TEXT_MODEL, budgetLeft, veniceChat, veniceImage } from "./venice.server";
import {
  installNote,
  installNotePath,
  mergePlan,
  parseStoredPr,
  parseStoredUpsample,
  parseUpsample,
  proposalBundle,
  proposalMarkdown,
  renderHallState,
  samePr,
  applyWinnerToState,
  type UpsamplePacket,
} from "./github-pr";
import { githubToken, landWinnerPr, ledgerByBranch, openProposalPr, overlayLedger, readMainHallState } from "./github.server";
import type { CiPr } from "./ci";

async function sql() {
  const { getSql } = await import("./db");
  return getSql();
}

type CycleRow = {
  id: number;
  day_key: string;
  status: string;
  opens_at: string;
  closes_at: string;
  tally_cid: string | null;
  tally_url: string | null;
  winner_option_id: number | null;
  item_id: number | null;
  brief: string;
};

type OptionRow = {
  id: number;
  cycle_id: number;
  slot: number;
  kind: string;
  title: string;
  body: string;
  sponsor: string;
  role_id: string | null;
  spec_json: string;
  fly_votes: number;
};

type ItemRow = {
  id: number;
  cycle_id: number;
  option_id: number | null;
  kind: string;
  title: string;
  body: string;
  spec_json: string;
  image_cid: string | null;
  image_url: string | null;
  meta_cid: string | null;
  meta_url: string | null;
  model: string;
  cost_usd: number;
  installed_at: string | null;
  created_at: string;
};

type MsgRow = {
  id: number;
  cycle_id: number | null;
  item_id: number | null;
  actor: string;
  kind: string;
  body: string;
  created_at: string;
};

function iso(v: string): string {
  return typeof v === "string" && v.includes("T") ? v : new Date(v).toISOString();
}

function asCycle(r: CycleRow): CiCycleView {
  return {
    id: r.id,
    dayKey: r.day_key,
    status: isCiStatus(r.status) ? r.status : "open",
    opensAt: iso(r.opens_at),
    closesAt: iso(r.closes_at),
    tallyCid: r.tally_cid,
    tallyUrl: r.tally_url,
    winnerOptionId: r.winner_option_id,
    itemId: r.item_id,
    brief: r.brief ?? "",
  };
}

function asItem(r: ItemRow): CiItemView {
  let spec: {
    visual?: unknown;
    materials?: unknown;
    steps?: unknown;
    imagePrompt?: unknown;
    pr?: unknown;
    upsample?: unknown;
  } = {};
  try {
    spec = JSON.parse(r.spec_json) as typeof spec;
  } catch {
    spec = {};
  }
  const materials = Array.isArray(spec.materials) ? spec.materials.filter((x): x is string => typeof x === "string").slice(0, 8) : [];
  const steps = Array.isArray(spec.steps) ? spec.steps.filter((x): x is string => typeof x === "string").slice(0, 8) : [];
  return {
    id: r.id,
    cycleId: r.cycle_id,
    optionId: r.option_id,
    kind: isCiKind(r.kind) ? r.kind : "reactor",
    title: r.title,
    body: r.body,
    visual: parseVisual(spec.visual ?? spec),
    materials,
    steps,
    imagePrompt: typeof spec.imagePrompt === "string" ? spec.imagePrompt : "",
    imageCid: r.image_cid,
    imageUrl: r.image_url,
    metaCid: r.meta_cid,
    metaUrl: r.meta_url,
    model: r.model,
    costUsd: Number(r.cost_usd) || 0,
    installedAt: r.installed_at ? iso(r.installed_at) : null,
    createdAt: iso(r.created_at),
    pr: parseStoredPr(spec.pr),
    upsample: parseStoredUpsample(spec.upsample),
  };
}

function asMsg(r: MsgRow): CiMessageView {
  return {
    id: r.id,
    cycleId: r.cycle_id,
    itemId: r.item_id,
    actor: r.actor,
    kind: r.kind,
    body: r.body,
    createdAt: iso(r.created_at),
  };
}

function visJson(v: CiVisual): string {
  return JSON.stringify({ visual: v });
}

async function addMessage(cycleId: number | null, itemId: number | null, actor: string, kind: string, body: string) {
  const db = await sql();
  const embedding = encodeEmbedding(embedText(body));
  await db`
    insert into ci_messages (cycle_id, item_id, actor, kind, body, embedding)
    values (${cycleId}, ${itemId}, ${actor.slice(0, 48)}, ${kind.slice(0, 24)}, ${body.slice(0, 400)}, ${embedding})
  `;
}

export async function creditStake(input: {
  address: string;
  eth: number;
  kind: "ads" | "membership" | "preview";
  txHash: string;
}): Promise<CiStake> {
  const address = getAddress(input.address as `0x${string}`).toLowerCase();
  const eth = Number(input.eth);
  if (!Number.isFinite(eth) || eth <= 0) return stakeOf(address);
  const tx = input.txHash.slice(0, 80);
  const db = await sql();
  await db`
    insert into ci_contributions (address, kind, amount_eth, tx_hash)
    values (${address}, ${input.kind}, ${eth}, ${tx})
    on conflict (tx_hash) do nothing
  `;
  return stakeOf(address);
}

export async function stakeOf(address: string | null | undefined): Promise<CiStake> {
  const empty: CiStake = { eth: 0, ads: 0, membership: 0, eligible: false };
  if (!address) return empty;
  let addr: string;
  try {
    addr = getAddress(address as `0x${string}`).toLowerCase();
  } catch {
    return empty;
  }
  const db = await sql();
  const rows = await db<{ kind: string; s: number }>`
    select kind, coalesce(sum(amount_eth), 0)::float as s
    from ci_contributions
    where address = ${addr}
    group by kind
  `;
  let ads = 0;
  let membership = 0;
  for (const r of rows) {
    if (r.kind === "ads") ads += Number(r.s);
    else membership += Number(r.s);
  }
  const eth = ads + membership;
  return { eth, ads, membership, eligible: stakeEligible(eth) };
}

async function loadOptions(cycleId: number): Promise<CiOptionView[]> {
  const db = await sql();
  const rows = await db<OptionRow>`
    select id, cycle_id, slot, kind, title, body, sponsor, role_id, spec_json, fly_votes
    from ci_options where cycle_id = ${cycleId} order by slot
  `;
  const votes = await db<{ option_id: number; w: number; n: number }>`
    select option_id, coalesce(sum(weight_eth), 0)::float as w, count(*)::int as n
    from ci_votes where cycle_id = ${cycleId} group by option_id
  `;
  const by = new Map(votes.map((v) => [v.option_id, v]));
  const ballots = await db<{ option_id: number; fly_index: number }>`
    select option_id, fly_index from ci_fly_ballots where cycle_id = ${cycleId}
  `;
  const fliesBy = new Map<number, string[]>();
  for (const b of ballots) {
    const name = CALLSIGNS[b.fly_index % CALLSIGNS.length];
    const arr = fliesBy.get(b.option_id) ?? [];
    arr.push(name);
    fliesBy.set(b.option_id, arr);
  }
  const ledger = await ledgerByBranch();
  return rows.map((r) => {
    let spec: { visual?: unknown; pr?: unknown } = {};
    try {
      spec = JSON.parse(r.spec_json) as { visual?: unknown; pr?: unknown };
    } catch {
      spec = {};
    }
    const v = by.get(r.id);
    return {
      id: r.id,
      cycleId: r.cycle_id,
      slot: r.slot,
      kind: isCiKind(r.kind) ? r.kind : "reactor",
      title: r.title,
      body: r.body,
      sponsor: r.sponsor,
      roleId: (r.role_id as CiOptionView["roleId"]) ?? null,
      visual: parseVisual(spec.visual ?? spec),
      flyVotes: Number(r.fly_votes) || 0,
      stakeEth: Number(v?.w ?? 0),
      voterCount: Number(v?.n ?? 0),
      flies: fliesBy.get(r.id) ?? [],
      pr: overlayLedger(parseStoredPr(spec.pr), ledger),
    };
  });
}

async function veniceOptions(day: string): Promise<{ drafts: CiOptionDraft[]; model: string; cost: number } | null> {
  const crew = ROLES.map((r, i) => `${CALLSIGNS[i]} (${r.title})`).join(", ");
  const chat = await veniceChat({
    system:
      "You are DROSOCORE, a hall of 16 fruit-fly workers assembling a hydrogen tokamak that must become self-sustaining. Reply with JSON only. Text privacy: Private/TEE/E2EE.",
    maxTokens: 1100,
    prompt: `Today is ${day}. Propose exactly 5 things the crew needs most to keep the reactor moving toward self-sustaining. Include at least one location and at least one retire. The other three may be reactor, workplace, outfit, body, location, or retire. No more than 5.
Crew: ${crew}.
Locations (set visual.site to the id): winding-bench, divertor-bench, vacuum-manifold, bus-gallery, cryo-bay, control-perch, brood-nest, fuel-shed.
Rules a retire may drop (visual.rule): vessel-duty, mezz-lock, pair-haul, job-speech.
Body mods a retire may strip (visual.strip and visual.gear, set visual.roleId): hood, cape, harness, goggles, antenna.
Props a retire may pull (visual.prop): rack, lamp, crate, decal.
Return {"options":[{"kind":"reactor"|"workplace"|"outfit"|"body"|"location"|"retire","title":"max 48 chars","body":"max 160 chars, English, concrete, no magic","sponsor":"callsign","roleId":"welder|coil|physicist|pipe|crane|inspector|electric|cryo|builder|safety|diag|coder|divertor|vacuum|magnet|janitor","visual":{"glowAdd":0-2,"extraModules":0-4,"prop":"none|rack|lamp|crate|decal","gear":"none|hood|cape|harness|goggles|antenna","roleId":null or a role,"tint":null or "#rrggbb","site":null or a location id,"rule":null or a rule id,"strip":"none|hood|cape|harness|goggles|antenna"}}]}
Industrial, cheap, job-useful. A location must name a site. A retire must name a rule, a strip, or a prop. Fabrication budget is $1.`,
  });
  if (!chat?.json || typeof chat.json !== "object") return null;
  const obj = chat.json as { options?: unknown };
  if (!Array.isArray(obj.options)) return null;
  const drafts = obj.options
    .map(parseOptionDraft)
    .filter((d): d is CiOptionDraft => Boolean(d))
    .map(attachNeeds);
  const picked = selectSustainDrafts(drafts);
  if (!picked) return null;
  return { drafts: picked, model: chat.model, cost: chat.costUsd };
}

async function writeOptions(cycleId: number, day: string, drafts: CiOptionDraft[]) {
  const db = await sql();
  const optionIds: number[] = [];
  for (let i = 0; i < drafts.length; i++) {
    const d = drafts[i];
    const embedding = encodeEmbedding(embedText(`${d.title} ${d.body}`));
    const ins = await db<{ id: number }>`
      insert into ci_options (cycle_id, slot, kind, title, body, sponsor, role_id, spec_json, embedding, fly_votes)
      values (${cycleId}, ${i}, ${d.kind}, ${d.title}, ${d.body}, ${d.sponsor}, ${d.roleId}, ${visJson(d.visual)}, ${embedding}, ${0})
      returning id
    `;
    optionIds.push(ins[0]!.id);
  }
  const ballots = flyBallotsFor(
    day,
    drafts.map((d, i) => ({ slot: i, kind: d.kind })),
  );
  const counts = new Array(drafts.length).fill(0);
  for (const b of ballots) {
    counts[b.slot] += 1;
    await db`
      insert into ci_fly_ballots (cycle_id, fly_index, option_id)
      values (${cycleId}, ${b.flyIndex}, ${optionIds[b.slot]})
      on conflict (cycle_id, fly_index) do nothing
    `;
    await addMessage(cycleId, null, b.name, "fly", `${b.name} backed ${drafts[b.slot].title}.`);
  }
  for (let i = 0; i < optionIds.length; i++) {
    await db`update ci_options set fly_votes = ${counts[i]} where id = ${optionIds[i]}`;
  }
}

async function insertCycle(day: string, drafts: CiOptionDraft[], brief: string): Promise<number> {
  const db = await sql();
  const opens = new Date();
  const closes = new Date(opens.getTime() + CI_WINDOW_MS);
  const rows = await db<{ id: number }>`
    insert into ci_cycles (day_key, status, opens_at, closes_at, brief)
    values (${day}, ${"open"}, ${opens.toISOString()}, ${closes.toISOString()}, ${brief.slice(0, 280)})
    on conflict (day_key) do nothing
    returning id
  `;
  let id = rows[0]?.id;
  if (!id) {
    const existing = await db<{ id: number }>`select id from ci_cycles where day_key = ${day}`;
    id = existing[0]?.id;
  }
  if (!id) throw new Error("ci-cycle");
  const have = await db<{ c: number }>`select count(*)::int as c from ci_options where cycle_id = ${id}`;
  if ((have[0]?.c ?? 0) > 0) return id;
  await writeOptions(id, day, drafts);
  await insertEvent({
    kind: "construction",
    flow: "in",
    actor: "crew",
    title: "daily CI",
    body: `Crew opened the ${day} ballot. Five proposals. Sites, adds, or a retirement. Six hours to stake.`,
    meta: { cycle: id, day },
  });
  return id;
}

function ballotNeedsRewrite(kinds: string[]): boolean {
  return !kinds.includes("location") || !kinds.includes("retire");
}

async function draftSustain(day: string): Promise<{ drafts: CiOptionDraft[]; brief: string }> {
  let drafts = sustainBallot(day);
  let brief = "Crew proposed five needs: work sites, a useful add, and something to retire.";
  try {
    const raced = await Promise.race([
      veniceOptions(day),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 4000);
      }),
    ]);
    if (raced) {
      drafts = raced.drafts;
      brief = `Venice ${raced.model} drafted five proposals toward a self-sustaining hall.`;
    }
  } catch {
    /* canned sustain */
  }
  return { drafts, brief };
}

async function rewriteCycle(cycleId: number, day: string, drafts: CiOptionDraft[], brief: string) {
  const db = await sql();
  await db`delete from ci_votes where cycle_id = ${cycleId}`;
  await db`delete from ci_fly_ballots where cycle_id = ${cycleId}`;
  await db`delete from ci_messages where cycle_id = ${cycleId} and kind = ${"fly"}`;
  await db`delete from ci_options where cycle_id = ${cycleId}`;
  await writeOptions(cycleId, day, drafts);
  const opens = new Date();
  const closes = new Date(opens.getTime() + CI_WINDOW_MS);
  await db`
    update ci_cycles
    set status = ${"open"},
        opens_at = ${opens.toISOString()},
        closes_at = ${closes.toISOString()},
        brief = ${brief.slice(0, 280)},
        winner_option_id = null,
        item_id = null,
        tally_cid = null,
        tally_url = null
    where id = ${cycleId}
  `;
  await addMessage(
    cycleId,
    null,
    "crew",
    "system",
    "Ballot rewritten. Up to five proposals: a site, an add, or a retirement. Six hours.",
  );
  await insertEvent({
    kind: "construction",
    flow: "in",
    actor: "crew",
    title: "sustain ballot",
    body: `Crew reopened the ${day} ballot around sites and retirements.`,
    meta: { cycle: cycleId, day },
  });
}

let sustainBusy = false;

async function ensureOpenSustain() {
  if (sustainBusy) return;
  sustainBusy = true;
  try {
    const db = await sql();
    const today = dayKey();
    const row = await db<{ id: number; status: string }>`
      select id, status from ci_cycles where day_key = ${today}
    `;
    if (!row[0]) {
      const drafted = await draftSustain(today);
      await insertCycle(today, drafted.drafts, drafted.brief);
      return;
    }
    if (row[0].status === "open") {
      const opts = await loadOptions(row[0].id);
      if (ballotNeedsRewrite(opts.map((o) => o.kind))) {
        const drafted = await draftSustain(today);
        await rewriteCycle(row[0].id, today, drafted.drafts, drafted.brief);
      }
      return;
    }
    const key = `${today}-sites`;
    const extra = await db<{ id: number; status: string }>`
      select id, status from ci_cycles where day_key = ${key}
    `;
    if (!extra[0]) {
      const drafted = await draftSustain(key);
      await insertCycle(key, drafted.drafts, drafted.brief);
      return;
    }
    if (extra[0].status === "open") {
      const opts = await loadOptions(extra[0].id);
      if (ballotNeedsRewrite(opts.map((o) => o.kind))) {
        const drafted = await draftSustain(key);
        await rewriteCycle(extra[0].id, key, drafted.drafts, drafted.brief);
      }
    }
  } finally {
    sustainBusy = false;
  }
}

async function installSeated(opts: {
  day: string;
  winnerKind: CiKind;
  brief: string;
  flyVotes?: number[];
}): Promise<number | null> {
  const db = await sql();
  const existing = await db<{ id: number }>`select id from ci_cycles where day_key = ${opts.day}`;
  if (existing[0]) return existing[0].id;
  const drafts = cannedOptions(opts.day);
  const winIdx = Math.max(
    0,
    drafts.findIndex((d) => d.kind === opts.winnerKind),
  );
  const votes = opts.flyVotes ?? drafts.map((_, i) => (i === winIdx ? 8 : 3));
  const opens = new Date(`${opts.day}T08:00:00.000Z`);
  const closes = new Date(opens.getTime() + CI_WINDOW_MS);
  const cyc = await db<{ id: number }>`
    insert into ci_cycles (day_key, status, opens_at, closes_at, brief)
    values (${opts.day}, ${"installed"}, ${opens.toISOString()}, ${closes.toISOString()}, ${opts.brief.slice(0, 280)})
    on conflict (day_key) do nothing
    returning id
  `;
  const cycleId = cyc[0]?.id;
  if (!cycleId) return null;
  const winner = drafts[winIdx] ?? drafts[0];
  let winnerOpt = 0;
  for (let i = 0; i < drafts.length; i++) {
    const d = drafts[i];
    const embedding = encodeEmbedding(embedText(`${d.title} ${d.body}`));
    const ins = await db<{ id: number }>`
      insert into ci_options (cycle_id, slot, kind, title, body, sponsor, role_id, spec_json, embedding, fly_votes)
      values (${cycleId}, ${i}, ${d.kind}, ${d.title}, ${d.body}, ${d.sponsor}, ${d.roleId}, ${visJson(d.visual)}, ${embedding}, ${votes[i] ?? 3})
      returning id
    `;
    if (i === winIdx) winnerOpt = ins[0]!.id;
  }
  const spec = {
    visual: winner.visual,
    materials: packMaterials(winner.kind),
    steps: packSteps(winner.kind),
    model: "seed",
  };
  const item = await db<{ id: number }>`
    insert into ci_items (cycle_id, option_id, kind, title, body, spec_json, model, cost_usd, installed_at)
    values (${cycleId}, ${winnerOpt}, ${winner.kind}, ${winner.title}, ${winner.body}, ${JSON.stringify(spec)}, ${"seed"}, ${0}, ${closes.toISOString()})
    returning id
  `;
  await db`update ci_cycles set winner_option_id = ${winnerOpt}, item_id = ${item[0]!.id} where id = ${cycleId}`;
  await addMessage(cycleId, item[0]!.id, winner.sponsor, "fly", `${winner.title} is seated. We voted it in.`);
  await addMessage(cycleId, item[0]!.id, "venice", "venice", "Seated pack. Inference runs on the next winner.");
  await insertEvent({
    kind: "consensus",
    flow: "out",
    actor: winner.sponsor,
    title: "CI seated",
    body: `${winner.title} is in the hall. Flies voted it in.`,
    meta: { cycle: cycleId, item: item[0]!.id, kind: winner.kind },
    claimKey: `ci-pack:${winner.kind}`,
    fact: `${winner.title} is installed in the hall.`,
  });
  return cycleId;
}

async function ensurePacks() {
  await installSeated({
    day: dayKey(new Date(Date.now() - 24 * 60 * 60 * 1000)),
    winnerKind: "reactor",
    brief: "First seated CI pack. Trim coil won on fly votes.",
    flyVotes: [7, 3, 3, 3],
  });
  await installSeated({
    day: dayKey(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
    winnerKind: "workplace",
    brief: "Tool crib won. Pad is labeled.",
    flyVotes: [3, 8, 3, 2],
  });
  await installSeated({
    day: dayKey(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)),
    winnerKind: "outfit",
    brief: "Welders took the argon visor.",
    flyVotes: [2, 3, 9, 2],
  });
}

const fabricating = new Set<number>();
const imageTried = new Set<number>();
let backfilling = false;
let prBusy = false;

async function saveOptionPr(id: number, pr: CiPr) {
  const db = await sql();
  const rows = await db<{ spec_json: string }>`select spec_json from ci_options where id = ${id}`;
  let spec: Record<string, unknown> = {};
  try {
    spec = JSON.parse(rows[0]?.spec_json ?? "{}") as Record<string, unknown>;
  } catch {
    spec = {};
  }
  const prev = parseStoredPr(spec.pr);
  if (samePr(prev, pr)) return;
  spec.pr = pr;
  await db`update ci_options set spec_json = ${JSON.stringify(spec)} where id = ${id}`;
}

async function ensureProposalPrs() {
  if (prBusy) return;
  prBusy = true;
  try {
    const db = await sql();
    const open = await db<{ id: number; day_key: string }>`
      select id, day_key from ci_cycles where status = ${"open"} order by id desc limit 2
    `;
    const token = githubToken();
    const ledger = await ledgerByBranch();
    for (const cycle of open) {
      const options = await loadOptions(cycle.id);
      for (const opt of options) {
        if (opt.pr && opt.pr.state !== "queued") continue;
        if (opt.pr?.state === "queued" && !token && !ledger[opt.pr.branch]) continue;
        const bundle = proposalBundle({
          day: cycle.day_key,
          slot: opt.slot,
          kind: opt.kind,
          title: opt.title,
          body: opt.body,
          sponsor: opt.sponsor,
          visual: opt.visual,
        });
        const filed = await openProposalPr(bundle);
        await saveOptionPr(opt.id, filed);
        if (filed.number) {
          await addMessage(
            cycle.id,
            null,
            "github",
            "github",
            `${opt.title} is pull request #${filed.number}. It reaches main only if it wins.`,
          );
        }
      }
    }
  } catch (e) {
    console.error("ci proposals", e);
  } finally {
    prBusy = false;
  }
}

async function upsampleWinner(winner: CiOptionView): Promise<{ packet: UpsamplePacket; cost: number }> {
  const chat = await veniceChat({
    system:
      "You upsample a winning DROSOCORE proposal into a build that adds parts and modifies something already in the hall. JSON only. Private/TEE/E2EE. Keep the same job. No magic.",
    maxTokens: 700,
    prompt: `Winner ${winner.kind}: ${winner.title}. ${winner.body}
Sponsor ${winner.sponsor}. Ballot visual ${JSON.stringify(winner.visual)}.
Build it out. extraModules may rise. Keep visual.site, visual.rule, and visual.strip when set.
Return {"summary":"one sentence: what this adds and what it changes","adds":["2 to 5 concrete parts"],"modifies":["1 to 3 changes to existing installs"],"materials":["..."],"steps":["..."],"visual":{"glowAdd":0-2.6,"extraModules":0-6,"prop":"none|rack|lamp|crate|decal","gear":"none|hood|cape|harness|goggles|antenna","roleId":${JSON.stringify(winner.roleId)},"tint":null,"site":${JSON.stringify(winner.visual.site ?? null)},"rule":${JSON.stringify(winner.visual.rule ?? null)},"strip":${JSON.stringify(winner.visual.strip ?? "none")}},"imagePrompt":"photoreal industrial hall, fruit-fly workers, the built-out upgrade, no text"}`,
  });
  const packet = parseUpsample(
    chat?.json,
    { kind: winner.kind, title: winner.title, body: winner.body, visual: winner.visual },
    chat?.model ?? "canned-upsample",
  );
  return { packet, cost: chat?.costUsd ?? 0 };
}

async function persistImage(id: number, bytes: Uint8Array, mime: string): Promise<{ cid: string | null; url: string }> {
  try {
    const { pinBytesToIpfs } = await import("./pinata.server");
    return await pinBytesToIpfs(bytes, `drosocore-ci-${id}.png`, mime);
  } catch (e) {
    console.error("ci image pin", e);
  }
  try {
    const { mkdir, writeFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const dir = join(process.cwd(), "public", "ci");
    await mkdir(dir, { recursive: true });
    const ext = mime.includes("jpeg") || mime.includes("jpg") ? "jpg" : "png";
    await writeFile(join(dir, `${id}.${ext}`), Buffer.from(bytes));
    return { cid: null, url: `/ci/${id}.${ext}` };
  } catch (e) {
    console.error("ci image disk", e);
  }
  if (bytes.length < 180_000) {
    return { cid: null, url: `data:${mime};base64,${Buffer.from(bytes).toString("base64")}` };
  }
  return { cid: null, url: "" };
}

async function persistJson(name: string, body: unknown): Promise<{ cid: string | null; url: string | null }> {
  try {
    const { pinJsonToIpfs } = await import("./pinata.server");
    const pin = await pinJsonToIpfs(body, name);
    return { cid: pin.cid, url: pin.url };
  } catch (e) {
    console.error("ci json pin", e);
    return { cid: null, url: null };
  }
}

async function backfillImages() {
  if (backfilling) return;
  backfilling = true;
  try {
    const bud = await budgetLeft();
    if (bud.left < 0.5) return;
    const db = await sql();
    const missing = await db<ItemRow>`
      select id, cycle_id, option_id, kind, title, body, spec_json, image_cid, image_url, meta_cid, meta_url, model, cost_usd, installed_at, created_at
      from ci_items
      where image_cid is null and (image_url is null or image_url = '')
      order by id desc
      limit 1
    `;
    const row = missing[0];
    if (!row) return;
    if (imageTried.has(row.id)) return;
    imageTried.add(row.id);
    const prompt = `Photoreal industrial fusion hall, dark fruit flies in PPE seating ${row.title}, steel, tungsten, tokamak, no text, no watermark.`;
    const img = await veniceImage(prompt);
    if (!img) return;
    const stored = await persistImage(row.id, img.bytes, img.mime);
    const spec = (() => {
      try {
        return JSON.parse(row.spec_json) as Record<string, unknown>;
      } catch {
        return {};
      }
    })();
    const meta = await persistJson(`drosocore-ci-${row.id}.json`, {
      name: row.title,
      description: row.body,
      kind: row.kind,
      cycle: row.cycle_id,
      visual: spec.visual ?? spec,
      materials: spec.materials ?? packMaterials(isCiKind(row.kind) ? row.kind : "reactor"),
      steps: spec.steps ?? packSteps(isCiKind(row.kind) ? row.kind : "reactor"),
      image: stored.url,
      model: `${row.model || "seed"}+${img.model}`,
      costUsd: (Number(row.cost_usd) || 0) + img.costUsd,
    });
    const model = `${row.model || "seed"}+${img.model}`;
    const cost = (Number(row.cost_usd) || 0) + img.costUsd;
    const cid = stored.cid || meta.cid;
    await db`
      update ci_items
      set image_cid = ${cid}, image_url = ${stored.url || null}, meta_cid = ${meta.cid}, meta_url = ${meta.url}, model = ${model}, cost_usd = ${cost}
      where id = ${row.id} and (image_url is null or image_url = '')
    `;
    await addMessage(
      row.cycle_id,
      row.id,
      "venice",
      "venice",
      `Packed plate on ${img.model}.${cid ? ` ipfs ${cid}.` : " Local plate until pin lands."}`,
    );
  } catch (e) {
    console.error("ci backfill", e);
  } finally {
    backfilling = false;
  }
}

async function fabricate(cycleId: number, winner: CiOptionView) {
  if (fabricating.has(cycleId)) return;
  fabricating.add(cycleId);
  const db = await sql();
  try {
    await db`update ci_cycles set status = ${"fabricating"} where id = ${cycleId}`;
    await addMessage(cycleId, null, "venice", "venice", `Fabricating ${winner.title} on ${CI_TEXT_MODEL}.`);
    const chat = await veniceChat({
      system: "You write tokamak fabrication packets as JSON only. Private/TEE inference.",
      maxTokens: 650,
      prompt: `Winning CI upgrade: ${winner.kind} — ${winner.title}. ${winner.body}
Sponsor ${winner.sponsor}. Current visual ${JSON.stringify(winner.visual)}.
Keep visual.site, visual.rule, and visual.strip when this is a location or a retirement.
Return {"title":"...","body":"...","materials":["..."],"steps":["..."],"visual":{"glowAdd":0-2,"extraModules":0-4,"prop":"none|rack|lamp|crate|decal","gear":"none|hood|cape|harness|goggles|antenna","roleId":${JSON.stringify(winner.roleId)},"tint":null,"site":${JSON.stringify(winner.visual.site ?? null)},"rule":${JSON.stringify(winner.visual.rule ?? null)},"strip":${JSON.stringify(winner.visual.strip ?? "none")}},"imagePrompt":"photoreal industrial hall, fruit-fly scale workers, tokamak, the upgrade, no text"}`,
    });
    let title = winner.title;
    let body = winner.body;
    let visual = winner.visual;
    let materials: string[] = [];
    let steps: string[] = [];
    let imagePrompt = `Photoreal industrial fusion hall, dark fruit flies in PPE seating ${winner.title}, steel, tungsten, no text.`;
    let model = chat?.model ?? "canned";
    let cost = chat?.costUsd ?? 0;
    if (chat?.json && typeof chat.json === "object") {
      const j = chat.json as Record<string, unknown>;
      if (typeof j.title === "string" && j.title.trim()) title = j.title.trim().slice(0, 56);
      if (typeof j.body === "string" && j.body.trim()) body = j.body.trim().slice(0, 280);
      if (Array.isArray(j.materials)) materials = j.materials.filter((x) => typeof x === "string").slice(0, 8) as string[];
      if (Array.isArray(j.steps)) steps = j.steps.filter((x) => typeof x === "string").slice(0, 8) as string[];
      visual = keepBallotVisual(winner.visual, parseVisual(j.visual ?? visual));
      if (typeof j.imagePrompt === "string" && j.imagePrompt.length > 12) imagePrompt = j.imagePrompt;
    }
    visual = attachNeeds({
      kind: winner.kind,
      title,
      body,
      sponsor: winner.sponsor,
      roleId: winner.roleId,
      visual,
    }).visual;
    const up = await upsampleWinner({ ...winner, title, body, visual });
    cost += up.cost;
    if (up.packet.model && up.packet.model !== "canned-upsample") model = `${model}+${up.packet.model}`;
    visual = up.packet.visual;
    materials = up.packet.materials;
    steps = up.packet.steps;
    if (up.packet.imagePrompt) imagePrompt = up.packet.imagePrompt;
    body = body.slice(0, 220);
    const cycleRow = await db<{ day_key: string }>`select day_key from ci_cycles where id = ${cycleId}`;
    const day = cycleRow[0]?.day_key ?? dayKey();
    const bundle = proposalBundle({
      day,
      slot: winner.slot,
      kind: winner.kind,
      title: winner.title,
      body: winner.body,
      sponsor: winner.sponsor,
      visual: winner.visual,
    });
    const siblings = await loadOptions(cycleId);
    const plan = mergePlan(
      siblings.map((o) => ({
        slot: o.slot,
        branch: o.pr?.branch || proposalBundle({ day, slot: o.slot, kind: o.kind, title: o.title, body: o.body, sponsor: o.sponsor, visual: o.visual }).branch,
      })),
      winner.slot,
    );
    const branch = winner.pr?.branch || plan.merge || bundle.branch;
    const prevState = await readMainHallState();
    const staged = applyWinnerToState(prevState, {
      day,
      slot: winner.slot,
      kind: winner.kind,
      title,
      body,
      visual,
      packet: up.packet,
      branch,
      prNumber: winner.pr?.number ?? null,
      prUrl: winner.pr?.url ?? null,
    });
    const note = installNote({
      day,
      title,
      kind: winner.kind,
      sponsor: winner.sponsor,
      packet: up.packet,
      prUrl: winner.pr?.url ?? null,
    });
    const landed = await landWinnerPr({
      branch,
      title: `CI ${day}: ${title}`.slice(0, 72),
      body: `${bundle.body}\n\n## Upsample\n\n${up.packet.summary}\n\nAdds: ${up.packet.adds.join("; ")}\n\nModifies: ${up.packet.modifies.join("; ")}`,
      files: [
        { path: "hall/state.json", content: renderHallState(staged) },
        { path: installNotePath(day, winner.slot, winner.title), content: note },
        {
          path: bundle.files[0]!.path,
          content:
            proposalMarkdown({
              day,
              slot: winner.slot,
              kind: winner.kind,
              title: winner.title,
              body: winner.body,
              sponsor: winner.sponsor,
              visual,
            }) +
            `\n## Upsample\n\n${up.packet.summary}\n\n### Adds\n\n${up.packet.adds.map((a) => `- ${a}`).join("\n")}\n\n### Modifies\n\n${up.packet.modifies.map((a) => `- ${a}`).join("\n")}\n`,
        },
      ],
      close: siblings
        .filter((o) => o.slot !== winner.slot)
        .map((o) => ({
          branch: o.pr?.branch ?? "",
          number: o.pr?.number ?? null,
          title: o.title,
        })),
    });
    await saveOptionPr(winner.id, landed);
    let imageCid: string | null = null;
    let imageUrl: string | null = null;
    const img = await veniceImage(imagePrompt);
    if (img) {
      cost += img.costUsd;
      model = `${model}+${img.model}`;
      const stored = await persistImage(cycleId * 1000, img.bytes, img.mime);
      imageCid = stored.cid;
      imageUrl = stored.url || null;
    }
    const spec = {
      visual,
      materials,
      steps,
      imagePrompt,
      venice: model,
      pr: landed,
      upsample: {
        summary: up.packet.summary,
        adds: up.packet.adds,
        modifies: up.packet.modifies,
        model: up.packet.model,
      },
    };
    const meta = await persistJson(`drosocore-ci-${cycleId}.json`, {
      name: title,
      description: body,
      kind: winner.kind,
      cycle: cycleId,
      option: winner.id,
      visual,
      materials,
      steps,
      adds: up.packet.adds,
      modifies: up.packet.modifies,
      image: imageUrl,
      model,
      costUsd: cost,
      pullRequest: landed.url,
      merged: landed.state === "merged",
    });
    const metaCid = meta.cid;
    const metaUrl = meta.url;
    const item = await db<ItemRow>`
      insert into ci_items (cycle_id, option_id, kind, title, body, spec_json, image_cid, image_url, meta_cid, meta_url, model, cost_usd, installed_at)
      values (${cycleId}, ${winner.id}, ${winner.kind}, ${title}, ${body}, ${JSON.stringify(spec)}, ${imageCid}, ${imageUrl}, ${metaCid}, ${metaUrl}, ${model}, ${cost}, ${new Date().toISOString()})
      returning id, cycle_id, option_id, kind, title, body, spec_json, image_cid, image_url, meta_cid, meta_url, model, cost_usd, installed_at, created_at
    `;
    const itemId = item[0]!.id;
    await db`update ci_cycles set status = ${"installed"}, item_id = ${itemId} where id = ${cycleId}`;
    await addMessage(cycleId, itemId, winner.sponsor, "fly", `${winner.sponsor}: ${title} is on the pad. We are installing it.`);
    await addMessage(
      cycleId,
      itemId,
      "venice",
      "venice",
      `Upsampled ${title}. Adds ${up.packet.adds[0] ?? "a fitting"}. Changes ${up.packet.modifies[0] ?? "the seated install"}.`,
    );
    await addMessage(
      cycleId,
      itemId,
      "github",
      "github",
      landed.state === "merged"
        ? `Merged to main${landed.number ? ` as #${landed.number}` : ""}. That merge is the change.`
        : `Pull request ${landed.number ? `#${landed.number}` : landed.branch} holds the upsample. Main updates when it merges.`,
    );
    await insertEvent({
      kind: "construction",
      flow: "out",
      actor: winner.sponsor,
      title: "CI installed",
      body: `${title} won the ballot, was built out, and ${landed.state === "merged" ? "merged to main" : "is on a pull request"}.`,
      meta: { cycle: cycleId, item: itemId, kind: winner.kind, pr: landed.url ?? landed.branch },
      claimKey: `ci:${cycleId}`,
      fact:
        landed.state === "merged"
          ? `${title} is on main via pull request ${landed.number ?? landed.branch}.`
          : `${title} is installed. Pull request ${landed.branch} tracks the change.`,
    });
  } catch (e) {
    console.error("ci fabricate", e);
    await db`update ci_cycles set status = ${"failed"} where id = ${cycleId} and status = ${"fabricating"}`;
    await addMessage(cycleId, null, "system", "system", "Fabrication stalled. Crew will retry next tick.");
  } finally {
    fabricating.delete(cycleId);
  }
}

async function tabulate(cycle: CiCycleView) {
  const db = await sql();
  const options = await loadOptions(cycle.id);
  const winner = pickWinner(
    options.map((o) => ({ optionId: o.id, slot: o.slot, flyVotes: o.flyVotes, stakeEth: o.stakeEth })),
  );
  if (!winner) {
    await db`update ci_cycles set status = ${"failed"} where id = ${cycle.id}`;
    return;
  }
  const payload = {
    cycle: cycle.id,
    day: cycle.dayKey,
    closedAt: new Date().toISOString(),
    options: options.map((o) => ({
      id: o.id,
      kind: o.kind,
      title: o.title,
      flyVotes: o.flyVotes,
      stakeEth: o.stakeEth,
      voters: o.voterCount,
    })),
    winner: winner.optionId,
  };
  let tallyCid: string | null = null;
  let tallyUrl: string | null = null;
  const pinned = await persistJson(`drosocore-ci-tally-${cycle.id}.json`, payload);
  tallyCid = pinned.cid;
  tallyUrl = pinned.url;
  await db`
    update ci_cycles
    set status = ${"closed"}, winner_option_id = ${winner.optionId}, tally_cid = ${tallyCid}, tally_url = ${tallyUrl}
    where id = ${cycle.id}
  `;
  const winOpt = options.find((o) => o.id === winner.optionId);
  await addMessage(
    cycle.id,
    null,
    "crew",
    "system",
    `Tally closed. ${winOpt?.title ?? "upgrade"} wins. ${tallyCid ? `Pinned ${tallyCid}.` : "Pin pending."}`,
  );
  await insertEvent({
    kind: "consensus",
    flow: "out",
    actor: "crew",
    title: "CI tally",
    body: `${winOpt?.title ?? "upgrade"} won the ${cycle.dayKey} ballot.`,
    meta: { cycle: cycle.id, winner: winner.optionId, cid: tallyCid ?? "" },
  });
  if (winOpt) void fabricate(cycle.id, winOpt);
}

async function tick() {
  await ensurePacks();
  const db = await sql();
  const open = await db<CycleRow>`
    select id, day_key, status, opens_at, closes_at, tally_cid, tally_url, winner_option_id, item_id, brief
    from ci_cycles
    where status in ('open', 'closed', 'fabricating')
    order by id desc
    limit 8
  `;
  const now = Date.now();
  for (const row of open) {
    const c = asCycle(row);
    if (c.status === "open" && Date.parse(c.closesAt) <= now) {
      await tabulate(c);
    } else if (c.status === "closed" && c.winnerOptionId && !c.itemId) {
      const opts = await loadOptions(c.id);
      const win = opts.find((o) => o.id === c.winnerOptionId);
      if (win) await fabricate(c.id, win);
    }
  }
  await ensureOpenSustain();
  await ensureProposalPrs();
  void backfillImages();
}

export async function loadDesk(address?: string | null, opts?: { skipTick?: boolean }): Promise<CiDesk> {
  if (!opts?.skipTick) {
    try {
      await tick();
    } catch (e) {
      console.error("ci tick", e);
    }
  }
  const db = await sql();
  const today = dayKey();
  const current = await db<CycleRow>`
    select id, day_key, status, opens_at, closes_at, tally_cid, tally_url, winner_option_id, item_id, brief
    from ci_cycles
    order by
      case status
        when 'open' then 0
        when 'fabricating' then 1
        when 'closed' then 2
        else 3
      end,
      day_key desc,
      id desc
    limit 1
  `;
  const cycle = current[0] ? asCycle(current[0]) : null;
  const options = cycle ? await loadOptions(cycle.id) : [];
  const stake = await stakeOf(address);
  let myVote: CiDesk["myVote"] = null;
  if (cycle && address) {
    try {
      const addr = getAddress(address as `0x${string}`).toLowerCase();
      const v = await db<{ option_id: number; weight_eth: number }>`
        select option_id, weight_eth from ci_votes where cycle_id = ${cycle.id} and address = ${addr}
      `;
      if (v[0]) myVote = { optionId: v[0].option_id, weightEth: Number(v[0].weight_eth) };
    } catch {
      myVote = null;
    }
  }
  const itemRows = await db<ItemRow>`
    select id, cycle_id, option_id, kind, title, body, spec_json, image_cid, image_url, meta_cid, meta_url, model, cost_usd, installed_at, created_at
    from ci_items order by id desc limit 24
  `;
  const hist = await db<CycleRow>`
    select id, day_key, status, opens_at, closes_at, tally_cid, tally_url, winner_option_id, item_id, brief
    from ci_cycles order by day_key desc, id desc limit 14
  `;
  const msg = await db<MsgRow>`
    select id, cycle_id, item_id, actor, kind, body, created_at
    from ci_messages order by id desc limit 40
  `;
  const bud = await budgetLeft(today);
  return {
    cycle,
    options,
    myVote,
    stake,
    items: itemRows.map(asItem),
    history: hist.map(asCycle),
    messages: msg.map(asMsg),
    budget: { dayKey: today, spentUsd: bud.spent, capUsd: CI_BUDGET_USD },
    now: new Date().toISOString(),
  };
}

export async function castVote(input: {
  address: string;
  cycleId: number;
  optionId: number;
  signature: string;
}): Promise<CiDesk> {
  const addr = getAddress(input.address as `0x${string}`);
  const desk = await loadDesk(addr);
  if (!desk.cycle || desk.cycle.id !== input.cycleId) throw new Error("cycle");
  const msg = voteMessage(input.cycleId, input.optionId, desk.cycle.dayKey);
  const recovered = await recoverMessageAddress({
    message: msg,
    signature: input.signature as `0x${string}`,
  });
  if (getAddress(recovered) !== addr) throw new Error("sig");
  return castVoteAs(addr, input.cycleId, input.optionId);
}

export async function castVoteAs(address: string, cycleId: number, optionId: number): Promise<CiDesk> {
  const desk = await loadDesk(address);
  if (!desk.cycle || desk.cycle.id !== cycleId) throw new Error("cycle");
  if (desk.cycle.status !== "open") throw new Error("closed");
  if (Date.parse(desk.cycle.closesAt) <= Date.now()) {
    await tick();
    throw new Error("closed");
  }
  const opt = desk.options.find((o) => o.id === optionId);
  if (!opt) throw new Error("option");
  const addr = getAddress(address as `0x${string}`);
  const stake = await stakeOf(addr);
  if (!stake.eligible) throw new Error("stake");
  const db = await sql();
  const lower = addr.toLowerCase();
  await db`
    insert into ci_votes (cycle_id, address, option_id, weight_eth)
    values (${cycleId}, ${lower}, ${optionId}, ${stake.eth})
    on conflict (cycle_id, address) do update set option_id = excluded.option_id, weight_eth = excluded.weight_eth
  `;
  await addMessage(
    cycleId,
    null,
    `${lower.slice(0, 6)}…${lower.slice(-4)}`,
    "vote",
    `Staked ${stake.eth} ETH on ${opt.title}.`,
  );
  await insertEvent({
    kind: "user",
    flow: "in",
    actor: `${lower.slice(0, 6)}…`,
    title: "CI vote",
    body: `A contributor staked ${stake.eth} ETH on ${opt.title}.`,
    meta: { cycle: cycleId, option: optionId },
  });
  return loadDesk(addr);
}

export async function addCiComment(input: {
  address: string;
  body: string;
  cycleId?: number | null;
  itemId?: number | null;
}): Promise<CiDesk> {
  const addr = getAddress(input.address as `0x${string}`);
  const stake = await stakeOf(addr);
  if (!stake.eligible) throw new Error("stake");
  const text = input.body.trim().slice(0, 400);
  if (text.length < 2) throw new Error("body");
  const desk = await loadDesk(addr);
  const cycleId = input.cycleId ?? desk.cycle?.id ?? null;
  const itemId = input.itemId ?? null;
  const lower = addr.toLowerCase();
  await addMessage(cycleId, itemId, `${lower.slice(0, 6)}…${lower.slice(-4)}`, "stakeholder", text);
  await insertEvent({
    kind: "user",
    flow: "in",
    actor: `${lower.slice(0, 6)}…`,
    title: "CI note",
    body: text,
    meta: { cycle: cycleId ?? null, item: itemId ?? null },
  });
  return loadDesk(addr);
}

export async function forceClose(cycleId?: number): Promise<CiDesk> {
  const db = await sql();
  if (cycleId) {
    await db`update ci_cycles set closes_at = ${new Date().toISOString()} where id = ${cycleId} and status = ${"open"}`;
  } else {
    await db`update ci_cycles set closes_at = ${new Date().toISOString()} where status = ${"open"}`;
  }
  await tick();
  const row = await db<{ id: number }>`
    select id from ci_cycles
    order by
      case status
        when 'open' then 0
        when 'fabricating' then 1
        when 'closed' then 2
        else 3
      end,
      day_key desc,
      id desc
    limit 1
  `;
  const id = cycleId ?? row[0]?.id;
  const t0 = Date.now();
  while (id && Date.now() - t0 < 40_000) {
    const cur = await db<{ status: string; item_id: number | null }>`
      select status, item_id from ci_cycles where id = ${id}
    `;
    const st = cur[0]?.status;
    if (st === "installed" || st === "failed") break;
    if (st === "closed" && fabricating.has(id)) {
      await new Promise((r) => setTimeout(r, 400));
      continue;
    }
    if (st === "closed" && !cur[0]?.item_id) {
      await new Promise((r) => setTimeout(r, 400));
      continue;
    }
    break;
  }
  return loadDesk(null, { skipTick: true });
}

export async function searchCi(text: string): Promise<{ items: CiItemView[]; messages: CiMessageView[] }> {
  const q = embedText(text);
  const { decodeEmbedding, topK } = await import("./hive-embed");
  const db = await sql();
  const items = await db<ItemRow & { embedding?: string }>`
    select i.id, i.cycle_id, i.option_id, i.kind, i.title, i.body, i.spec_json, i.image_cid, i.image_url, i.meta_cid, i.meta_url, i.model, i.cost_usd, i.installed_at, i.created_at, o.embedding
    from ci_items i
    left join ci_options o on o.id = i.option_id
    order by i.id desc
    limit 40
  `;
  const msgs = await db<MsgRow & { embedding: string }>`
    select id, cycle_id, item_id, actor, kind, body, created_at, embedding
    from ci_messages order by id desc limit 80
  `;
  const iVecs = items.map((r) => decodeEmbedding(r.embedding ?? "") ?? embedText(`${r.title} ${r.body}`));
  const mVecs = msgs.map((r) => decodeEmbedding(r.embedding) ?? embedText(r.body));
  const iHits = topK(q, iVecs, 6, 0.08);
  const mHits = topK(q, mVecs, 8, 0.1);
  return {
    items: iHits.map((h) => asItem(items[h.i])),
    messages: mHits.map((h) => asMsg(msgs[h.i])),
  };
}
