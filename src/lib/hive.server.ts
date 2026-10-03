import { embedText, encodeEmbedding, topK, decodeEmbedding } from "./hive-embed";
import { CONSENSUS_N, type HiveDraft, type HiveEvent, type HiveKind, type HiveMemory, type HiveStatus, type HiveFlow } from "./hive";

async function sql() {
  const { getSql } = await import("./db");
  return getSql();
}

type EventRow = {
  id: number;
  kind: string;
  flow: string;
  actor: string;
  title: string;
  body: string;
  meta: string;
  agreed: number;
  status: string;
  created_at: string;
};

type MemoryRow = {
  id: number;
  claim_key: string;
  fact: string;
  support: number;
  created_at: string;
};

function parseMeta(raw: string): HiveEvent["meta"] {
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== "object") return {};
    return v as HiveEvent["meta"];
  } catch {
    return {};
  }
}

function asEvent(r: EventRow): HiveEvent {
  return {
    id: r.id,
    kind: r.kind as HiveKind,
    flow: r.flow === "out" ? "out" : "in",
    actor: r.actor,
    title: r.title,
    body: r.body,
    meta: parseMeta(r.meta),
    agreed: Number(r.agreed) || 0,
    status: (r.status as HiveStatus) || "live",
    createdAt: typeof r.created_at === "string" ? r.created_at : new Date(r.created_at).toISOString(),
  };
}

function asMemory(r: MemoryRow): HiveMemory {
  return {
    id: r.id,
    claimKey: r.claim_key,
    fact: r.fact,
    support: Number(r.support) || 0,
    createdAt: typeof r.created_at === "string" ? r.created_at : new Date(r.created_at).toISOString(),
  };
}

const SEED: HiveDraft[] = [
  {
    kind: "construction",
    actor: "crew",
    title: "vessel gap",
    body: "TF coil 14 gap is still open. Welders are on it.",
  },
  {
    kind: "construction",
    actor: "crew",
    title: "ETH plant",
    body: "Cable trays run from the pad coupler back into the vessel.",
  },
  {
    kind: "discussion",
    actor: "Helix",
    title: "shift talk",
    body: "Hold the seam. Torch is hot.",
  },
];

export async function ensureHiveSeed() {
  const db = await sql();
  const n = await db<{ c: number }>`select count(*)::int as c from hive_events`;
  if ((n[0]?.c ?? 0) > 0) return;
  for (const d of SEED) {
    await insertEvent({ ...d, flow: "in" });
  }
  const fact = "Coil work on the vessel gap is holding.";
  const embedding = encodeEmbedding(embedText(fact));
  await db`
    insert into hive_memory (claim_key, fact, embedding, support)
    values (${"build:coil"}, ${fact}, ${embedding}, ${3})
    on conflict (claim_key) do nothing
  `;
  await insertEvent({
    kind: "consensus",
    flow: "out",
    actor: "crew",
    title: "three agreed",
    body: fact,
    meta: { claimKey: "build:coil", votes: 3 },
  });
}

function clampDraft(d: HiveDraft): HiveDraft {
  const kinds: HiveKind[] = ["movement", "discussion", "construction", "user", "query", "consensus"];
  const kind = kinds.includes(d.kind) ? d.kind : "movement";
  return {
    kind,
    flow: d.flow === "out" ? "out" : "in",
    actor: String(d.actor ?? "crew").slice(0, 48),
    title: String(d.title ?? "event").slice(0, 80),
    body: String(d.body ?? "").slice(0, 280),
    meta: d.meta ?? {},
    flyIndex: typeof d.flyIndex === "number" ? d.flyIndex : undefined,
    claimKey: d.claimKey?.slice(0, 80),
    fact: d.fact?.slice(0, 200),
  };
}

export async function insertEvent(raw: HiveDraft): Promise<HiveEvent> {
  const d = clampDraft(raw);
  const db = await sql();
  const embedding = encodeEmbedding(embedText(`${d.title} ${d.body}`));
  const meta = JSON.stringify(d.meta ?? {});
  const flow: HiveFlow = d.flow ?? "in";
  const rows = await db<EventRow>`
    insert into hive_events (kind, flow, actor, title, body, meta, embedding, status)
    values (${d.kind}, ${flow}, ${d.actor}, ${d.title}, ${d.body}, ${meta}, ${embedding}, ${"live"})
    returning id, kind, flow, actor, title, body, meta, agreed, status, created_at
  `;
  const cap = await db<{ min_id: number | null }>`
    select min(id) as min_id from hive_events where id < (select coalesce(max(id), 0) - 1500 from hive_events)
  `;
  if (cap[0]?.min_id) {
    await db`delete from hive_events where id <= ${cap[0].min_id}`;
  }
  const row = rows[0];
  if (!row) throw new Error("hive-insert");
  return asEvent(row);
}

export async function insertEvents(items: HiveDraft[]): Promise<HiveEvent[]> {
  const out: HiveEvent[] = [];
  for (const item of items.slice(0, 12)) {
    if (!item?.title || !item?.body) continue;
    out.push(await insertEvent(item));
  }
  return out;
}

export async function listHive(limit = 60): Promise<{ events: HiveEvent[]; memories: HiveMemory[] }> {
  await ensureHiveSeed();
  const db = await sql();
  const take = Math.max(8, Math.min(120, limit | 0));
  const events = await db<EventRow>`
    select id, kind, flow, actor, title, body, meta, agreed, status, created_at
    from hive_events
    order by id desc
    limit ${take}
  `;
  const memories = await db<MemoryRow>`
    select id, claim_key, fact, support, created_at
    from hive_memory
    order by support desc, updated_at desc
    limit 40
  `;
  return { events: events.map(asEvent), memories: memories.map(asMemory) };
}

export async function queryHive(text: string, k = 6): Promise<{ events: HiveEvent[]; memories: HiveMemory[] }> {
  const q = embedText(text);
  const db = await sql();
  const eventRows = await db<EventRow & { embedding: string }>`
    select id, kind, flow, actor, title, body, meta, agreed, status, created_at, embedding
    from hive_events
    order by id desc
    limit 180
  `;
  const memRows = await db<MemoryRow & { embedding: string }>`
    select id, claim_key, fact, support, created_at, embedding
    from hive_memory
    order by id desc
    limit 80
  `;
  const eVecs = eventRows.map((r) => decodeEmbedding(r.embedding) ?? embedText(`${r.title} ${r.body}`));
  const mVecs = memRows.map((r) => decodeEmbedding(r.embedding) ?? embedText(r.fact));
  const eHits = topK(q, eVecs, k, 0.12);
  const mHits = topK(q, mVecs, Math.max(3, Math.floor(k / 2)), 0.14);
  return {
    events: eHits.map((h) => asEvent(eventRows[h.i])),
    memories: mHits.map((h) => asMemory(memRows[h.i])),
  };
}

export async function voteClaim(input: {
  claimKey: string;
  fact: string;
  flyIndex: number;
}): Promise<{ votes: number; agreed: boolean; newlyAgreed: boolean; memory: HiveMemory | null; event: HiveEvent | null }> {
  const key = input.claimKey.slice(0, 80);
  const fact = input.fact.slice(0, 200);
  const fly = Math.max(0, Math.min(31, input.flyIndex | 0));
  const db = await sql();
  await db`
    insert into hive_votes (claim_key, fly_index, fact)
    values (${key}, ${fly}, ${fact})
    on conflict (claim_key, fly_index) do nothing
  `;
  const count = await db<{ c: number }>`select count(*)::int as c from hive_votes where claim_key = ${key}`;
  const votes = count[0]?.c ?? 0;
  const existing = await db<MemoryRow>`select id, claim_key, fact, support, created_at from hive_memory where claim_key = ${key}`;
  let newlyAgreed = false;
  let memory: HiveMemory | null = existing[0] ? asMemory(existing[0]) : null;
  let event: HiveEvent | null = null;
  if (votes >= CONSENSUS_N && !existing[0]) {
    newlyAgreed = true;
    const embedding = encodeEmbedding(embedText(fact));
    const rows = await db<MemoryRow>`
      insert into hive_memory (claim_key, fact, embedding, support)
      values (${key}, ${fact}, ${embedding}, ${votes})
      on conflict (claim_key) do update set support = excluded.support, updated_at = now()
      returning id, claim_key, fact, support, created_at
    `;
    const memRow = rows[0];
    if (!memRow) throw new Error("hive-memory");
    memory = asMemory(memRow);
    event = await insertEvent({
      kind: "consensus",
      flow: "out",
      actor: "crew",
      title: "three agreed",
      body: fact,
      meta: { claimKey: key, votes },
    });
  } else if (existing[0]) {
    await db`update hive_memory set support = ${votes}, updated_at = now() where claim_key = ${key}`;
    memory = { ...asMemory(existing[0]), support: votes };
  }
  return { votes, agreed: votes >= CONSENSUS_N, newlyAgreed, memory, event };
}
