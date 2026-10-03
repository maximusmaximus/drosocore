import { AD_SPACES, adSpaceById } from "./ad-spaces";
import { adPriceEth, isAdSpaceId, type AdRecord } from "./ads";
import { ETH_ADDRESS, GITHUB_URL } from "./constants";
import { isWorkspacePreview } from "./env.server";
import { catalogTraining, parseTrainingSample, type TrainingSample } from "./training";
import { adPriceUsdc, donatePriceUsdc, parsePaymentPayload, paymentRequired, readPaymentHeader, TRAINING_PRICE_USDC, type X402PaymentRequired } from "./x402";
import { TIERS, type StageId } from "./tiers";

export const AGENT_CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, PAYMENT-SIGNATURE, X-PAYMENT, PAYMENT-REQUIRED, Authorization, X-DROSOCORE-KEY",
  "Access-Control-Expose-Headers": "PAYMENT-REQUIRED, PAYMENT-RESPONSE, X-PAYMENT-RESPONSE",
};

export function json(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...AGENT_CORS, ...extra },
  });
}

export function optionsOk(): Response {
  return new Response(null, { status: 204, headers: AGENT_CORS });
}

async function sql() {
  const { getSql } = await import("./db");
  return getSql();
}

export async function loadAdsCatalog(): Promise<{ records: AdRecord[]; purchaseCount: number }> {
  try {
    const db = await sql();
    const rows = await db<{
      space_id: string;
      image_url: string;
      tx_hash: string;
      price_eth: string;
      cid: string | null;
      source: string | null;
      payer: string | null;
    }>`select space_id, image_url, tx_hash, price_eth, cid, source, payer from ads`;
    const meta = await db<{ purchase_count: number }>`select purchase_count from ad_meta where id = 1`;
    return {
      records: rows.map((r) => ({
        spaceId: r.space_id,
        imageUrl: r.image_url,
        txHash: r.tx_hash,
        priceEth: r.price_eth,
        cid: r.cid ?? undefined,
        source: r.source ?? undefined,
        payer: r.payer ?? undefined,
      })),
      purchaseCount: meta[0]?.purchase_count ?? 0,
    };
  } catch (e) {
    console.error("loadAdsCatalog", e);
    return { records: [], purchaseCount: 0 };
  }
}

export function vacantSpaces(taken: Set<string>) {
  return AD_SPACES.filter((s) => !taken.has(s.id)).map((s) => ({
    id: s.id,
    label: s.label,
    section: s.section,
    mount: s.mount,
    size: s.size,
  }));
}

export async function placeAd(input: {
  spaceId: string;
  imageBase64?: string;
  imageUrl?: string;
  txHash: string;
  source: string;
  payer?: string;
}): Promise<AdRecord> {
  if (!isAdSpaceId(input.spaceId)) throw new Error("space");
  const db = await sql();
  const taken = await db<{ id: number }>`select id from ads where space_id = ${input.spaceId}`;
  if (taken.length) throw new Error("taken");
  const meta = await db<{ purchase_count: number }>`select purchase_count from ad_meta where id = 1`;
  const count = meta[0]?.purchase_count ?? 0;
  const priceEth = adPriceEth(count);

  let imageUrl = input.imageUrl ?? "";
  let cid: string | undefined;
  if (input.imageBase64) {
    try {
      const { pinFlyNftOnPinata } = await import("./pinata.server");
      const pin = await pinFlyNftOnPinata({
        imageBase64: input.imageBase64,
        filename: `drosocore-ad-${input.spaceId}.jpg`,
        metadata: {
          name: `DROSOCORE billboard ${input.spaceId}`,
          description: "Reactor billboard placement",
          space: input.spaceId,
          tx: input.txHash,
        },
      });
      imageUrl = pin.imageUrl;
      cid = pin.imageCid;
    } catch (e) {
      console.error("ad pin", e);
      imageUrl = input.imageBase64;
      if (imageUrl.length > 450_000) throw new Error("too-large");
    }
  }
  if (!cid && imageUrl) {
    const m = /\/ipfs\/([A-Za-z0-9]+)/.exec(imageUrl) || /^ipfs:\/\/([A-Za-z0-9]+)/.exec(imageUrl);
    if (m) cid = m[1];
  }
  if (!imageUrl) throw new Error("image");

  await db`
    insert into ads (space_id, image_url, tx_hash, price_eth, cid, payer, source)
    values (${input.spaceId}, ${imageUrl}, ${input.txHash}, ${priceEth}, ${cid ?? null}, ${input.payer ?? null}, ${input.source})
  `;
  await db`update ad_meta set purchase_count = purchase_count + 1 where id = 1`;
  if (input.payer) {
    try {
      const { creditStake } = await import("./ci.server");
      const eth = Number(priceEth);
      if (Number.isFinite(eth) && eth > 0) {
        await creditStake({ address: input.payer, eth, kind: "ads", txHash: input.txHash });
      }
    } catch (e) {
      console.error("ci stake ad", e);
    }
  }
  const record: AdRecord = { spaceId: input.spaceId, imageUrl, txHash: input.txHash, priceEth, cid, source: input.source, payer: input.payer };
  try {
    await publishBundle();
  } catch (e) {
    console.error("bundle", e);
  }
  return record;
}

export async function loadAdsForPayer(address: string): Promise<AdRecord[]> {
  const ads = await loadAdsCatalog();
  const want = address.toLowerCase();
  return ads.records.filter((r) => (r.payer ?? "").toLowerCase() === want);
}

export async function updateAd(input: {
  spaceId: string;
  imageBase64?: string;
  imageUrl?: string;
  payer: string;
}): Promise<AdRecord> {
  if (!isAdSpaceId(input.spaceId)) throw new Error("space");
  const db = await sql();
  const rows = await db<{
    space_id: string;
    image_url: string;
    tx_hash: string;
    price_eth: string;
    cid: string | null;
    source: string | null;
    payer: string | null;
  }>`select space_id, image_url, tx_hash, price_eth, cid, source, payer from ads where space_id = ${input.spaceId}`;
  const row = rows[0];
  if (!row) throw new Error("missing");
  if (!row.payer || row.payer.toLowerCase() !== input.payer.toLowerCase()) throw new Error("owner");

  let imageUrl = input.imageUrl ?? "";
  let cid: string | undefined;
  if (input.imageBase64) {
    try {
      const { pinFlyNftOnPinata } = await import("./pinata.server");
      const pin = await pinFlyNftOnPinata({
        imageBase64: input.imageBase64,
        filename: `drosocore-ad-${input.spaceId}.jpg`,
        metadata: {
          name: `DROSOCORE billboard ${input.spaceId}`,
          description: "Reactor billboard update",
          space: input.spaceId,
          payer: input.payer,
        },
      });
      imageUrl = pin.imageUrl;
      cid = pin.imageCid;
    } catch (e) {
      console.error("ad update pin", e);
      imageUrl = input.imageBase64;
      if (imageUrl.length > 450_000) throw new Error("too-large");
    }
  }
  if (!cid && imageUrl) {
    const m = /\/ipfs\/([A-Za-z0-9]+)/.exec(imageUrl) || /^ipfs:\/\/([A-Za-z0-9]+)/.exec(imageUrl);
    if (m) cid = m[1];
  }
  if (!imageUrl) throw new Error("image");
  await db`
    update ads set image_url = ${imageUrl}, cid = ${cid ?? row.cid}
    where space_id = ${input.spaceId}
  `;
  try {
    await publishBundle();
  } catch (e) {
    console.error("bundle", e);
  }
  return {
    spaceId: row.space_id,
    imageUrl,
    txHash: row.tx_hash,
    priceEth: row.price_eth,
    cid: cid ?? row.cid ?? undefined,
    source: row.source ?? undefined,
    payer: row.payer ?? undefined,
  };
}

export async function loadTraining(limit = 40): Promise<TrainingSample[]> {
  try {
    const db = await sql();
    const rows = await db<{
      id: number;
      role: string;
      region: string;
      fn: string;
      note: string;
      reward: number;
      source: string;
      created_at: string;
    }>`select id, role, region, fn, note, reward, source, created_at from fly_training order by id desc limit ${limit}`;
    return rows.map((r) => ({
      id: r.id,
      role: r.role as TrainingSample["role"],
      region: r.region as TrainingSample["region"],
      fn: r.fn,
      note: r.note,
      reward: Number(r.reward),
      source: r.source,
      createdAt: String(r.created_at),
    }));
  } catch (e) {
    console.error("loadTraining", e);
    return [];
  }
}

export async function addTraining(raw: unknown, source: string, txHash: string): Promise<TrainingSample> {
  const sample = parseTrainingSample(raw);
  if (!sample) throw new Error("sample");
  const db = await sql();
  const rows = await db<{ id: number }>`
    insert into fly_training (role, region, fn, note, reward, source)
    values (${sample.role}, ${sample.region}, ${sample.fn}, ${sample.note}, ${sample.reward}, ${source})
    returning id
  `;
  sample.id = rows[0]?.id;
  sample.source = source;
  try {
    await publishBundle();
  } catch (e) {
    console.error("bundle", e);
  }
  return sample;
}

export async function addDonation(tier: StageId, amountUsdc: string, txHash: string, source: string, payer?: string, amountEth?: number) {
  const db = await sql();
  await db`
    insert into donations (tier, amount_usdc, tx_hash, source, payer, amount_eth)
    values (${tier}, ${amountUsdc}, ${txHash}, ${source}, ${payer ?? null}, ${amountEth ?? null})
  `;
  if (payer && amountEth && amountEth > 0) {
    try {
      const { creditStake } = await import("./ci.server");
      await creditStake({ address: payer, eth: amountEth, kind: "membership", txHash });
    } catch (e) {
      console.error("ci stake donate", e);
    }
  }
  try {
    await publishBundle();
  } catch (e) {
    console.error("bundle", e);
  }
}

export type HallBundle = {
  version: 1;
  updatedAt: string;
  payTo: string;
  github: string;
  ads: { records: AdRecord[]; purchaseCount: number };
  training: TrainingSample[];
  catalog: ReturnType<typeof catalogTraining>;
  donations: { tier: string; amountUsdc: string; txHash: string; createdAt: string }[];
};

export async function buildBundle(): Promise<HallBundle> {
  const ads = await loadAdsCatalog();
  const training = await loadTraining(80);
  let donations: HallBundle["donations"] = [];
  try {
    const db = await sql();
    const rows = await db<{
      tier: string;
      amount_usdc: string;
      tx_hash: string;
      created_at: string;
    }>`select tier, amount_usdc, tx_hash, created_at from donations order by id desc limit 40`;
    donations = rows.map((r) => ({
      tier: r.tier,
      amountUsdc: r.amount_usdc,
      txHash: r.tx_hash,
      createdAt: String(r.created_at),
    }));
  } catch {
    donations = [];
  }
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    payTo: ETH_ADDRESS,
    github: GITHUB_URL,
    ads,
    training,
    catalog: catalogTraining(),
    donations,
  };
}

export async function publishBundle(): Promise<{ cid: string; url: string; githubUrl?: string }> {
  const bundle = await buildBundle();
  const { pinJsonToIpfs } = await import("./pinata.server");
  const pin = await pinJsonToIpfs(bundle, `drosocore-bundle-${bundle.updatedAt.slice(0, 10)}.json`);
  let githubUrl: string | undefined;
  try {
    githubUrl = await pushGithubPointer(pin.cid, pin.url, bundle.updatedAt);
  } catch (e) {
    console.error("github pointer", e);
  }
  try {
    const db = await sql();
    await db`
      insert into hall_bundle (id, cid, github_url, payload, updated_at)
      values (1, ${pin.cid}, ${githubUrl ?? null}, ${JSON.stringify(bundle)}, now())
      on conflict (id) do update set cid = excluded.cid, github_url = excluded.github_url, payload = excluded.payload, updated_at = now()
    `;
  } catch (e) {
    console.error("bundle row", e);
  }
  return { cid: pin.cid, url: pin.url, githubUrl };
}

export async function latestBundleMeta(): Promise<{ cid: string; url: string; githubUrl?: string; updatedAt?: string } | null> {
  try {
    const db = await sql();
    const rows = await db<{ cid: string; github_url: string | null; updated_at: string }>`select cid, github_url, updated_at from hall_bundle where id = 1`;
    const row = rows[0];
    if (!row) return null;
    return {
      cid: row.cid,
      url: `https://flies.mypinata.cloud/ipfs/${row.cid}`,
      githubUrl: row.github_url ?? undefined,
      updatedAt: String(row.updated_at),
    };
  } catch {
    return null;
  }
}

function githubToken(): string | undefined {
  return process.env.GITHUB_TOKEN?.trim() || process.env.GH_TOKEN?.trim() || process.env.DROSOCORE_GITHUB_TOKEN?.trim();
}

async function pushGithubPointer(cid: string, ipfsUrl: string, updatedAt: string): Promise<string | undefined> {
  const token = githubToken();
  if (!token) return undefined;
  const path = "data/latest.json";
  const api = `https://api.github.com/repos/maximusmaximus/drosocore/contents/${path}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "content-type": "application/json",
  };
  let sha: string | undefined;
  const existing = await fetch(`${api}?ref=main`, { headers });
  if (existing.ok) {
    const j = (await existing.json()) as { sha?: string };
    sha = j.sha;
  }
  const body = {
    cid,
    ipfs: ipfsUrl,
    ipfsUri: `ipfs://${cid}`,
    updatedAt,
    github: `${GITHUB_URL}/blob/main/${path}`,
  };
  const res = await fetch(api, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message: `backup hall bundle ${cid.slice(0, 8)}`,
      content: Buffer.from(JSON.stringify(body, null, 2) + "\n", "utf8").toString("base64"),
      branch: "main",
      sha,
    }),
  });
  if (!res.ok) throw new Error(`github ${res.status}`);
  return `${GITHUB_URL}/blob/main/${path}`;
}

export type PaymentOk = { txHash: string };

export async function requirePayment(
  request: Request,
  body: Record<string, unknown> | null,
  quote: { usdc: number; resource: string; description: string },
): Promise<{ ok: true; txHash: string } | { ok: false; required: X402PaymentRequired }> {
  const header = readPaymentHeader(request.headers);
  const fromHeader = header ? parsePaymentPayload(header) : null;
  const fromBody =
    typeof body?.txHash === "string"
      ? { txHash: body.txHash }
      : typeof body?.payment === "string"
        ? parsePaymentPayload(body.payment)
        : body?.payment && typeof body.payment === "object"
          ? parsePaymentPayload(JSON.stringify(body.payment))
          : null;
  const txHash = fromHeader?.txHash || fromBody?.txHash;
  if (txHash && /^0x[0-9a-fA-F]{8,}$/.test(txHash)) {
    return { ok: true, txHash };
  }
  if (isWorkspacePreview() && (header || body?.preview === true)) {
    return { ok: true, txHash: "0xpreview" };
  }
  return { ok: false, required: paymentRequired(quote) };
}

export function paymentResponse(required: X402PaymentRequired): Response {
  const encoded = Buffer.from(JSON.stringify(required), "utf8").toString("base64");
  return json(required, 402, {
    "PAYMENT-REQUIRED": encoded,
    "WWW-Authenticate": "Payment required",
  });
}

export function agentIndex() {
  return {
    name: "DROSOCORE",
    payTo: ETH_ADDRESS,
    github: GITHUB_URL,
    mcp: "/api/mcp",
    x402: "/api/x402",
    resources: {
      ads: "/api/agent/ads",
      buyAd: "/api/agent/ads/buy",
      donate: "/api/agent/donate",
      training: "/api/agent/training",
      backup: "/api/agent/backup",
      data: "/api/agent/data",
      mcp: "/api/mcp",
    },
    prices: {
      adUsdc: adPriceUsdc(0),
      trainingUsdc: TRAINING_PRICE_USDC,
      donate: Object.fromEntries(TIERS.map((t) => [t.id, donatePriceUsdc(t.id)])),
    },
  };
}

export { adSpaceById };

