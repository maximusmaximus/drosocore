import { CI_BUDGET_USD, dayKey } from "./ci";

const VENICE_URL = "https://api.venice.ai/api/v1";

/** Server-only. Prefer env; fall back to the hall inference key. */
function veniceKey(): string {
  return (
    process.env.VENICE_API_KEY?.trim() ||
    process.env.VENICE_INFERENCE_KEY?.trim() ||
    "VENICE_INFERENCE_KEY_A5tPweAcj58YSsbuYmLgEp036OtLFVpEpzfgQshA0F"
  );
}

/** TEE + E2EE + Private. Cheap enough for a $1 day. */
export const CI_TEXT_MODEL = "e2ee-deepseek-v4-flash";
export const CI_TEXT_FALLBACK = "zai-org-glm-4.7-flash";
/** Private image, one cent. */
export const CI_IMAGE_MODEL = "z-image-turbo";

const TEXT_IN = 0.182;
const TEXT_OUT = 0.373;
const IMAGE_USD = 0.01;

function estTextUsd(inTok: number, outTok: number): number {
  return (inTok / 1_000_000) * TEXT_IN + (outTok / 1_000_000) * TEXT_OUT;
}

async function sql() {
  const { getSql } = await import("./db");
  return getSql();
}

export async function budgetLeft(day = dayKey()): Promise<{ spent: number; left: number; calls: number }> {
  try {
    const db = await sql();
    const rows = await db<{ spent_usd: number; calls: number }>`
      select spent_usd, calls from ci_budget where day_key = ${day}
    `;
    const spent = Number(rows[0]?.spent_usd ?? 0);
    return { spent, left: Math.max(0, CI_BUDGET_USD - spent), calls: Number(rows[0]?.calls ?? 0) };
  } catch {
    return { spent: 0, left: CI_BUDGET_USD, calls: 0 };
  }
}

async function charge(usd: number, day = dayKey()) {
  const db = await sql();
  await db`
    insert into ci_budget (day_key, spent_usd, calls)
    values (${day}, ${usd}, ${1})
    on conflict (day_key) do update
      set spent_usd = ci_budget.spent_usd + excluded.spent_usd,
          calls = ci_budget.calls + 1
  `;
}

function extractJson(text: string): unknown {
  const t = text.trim();
  const fence = /```(?:json)?\s*([\s\S]*?)```/.exec(t);
  const body = fence ? fence[1] : t;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch {
    return null;
  }
}

export type VeniceChat = {
  text: string;
  json: unknown;
  model: string;
  costUsd: number;
};

export async function veniceChat(opts: {
  prompt: string;
  system: string;
  maxTokens?: number;
}): Promise<VeniceChat | null> {
  const bud = await budgetLeft();
  const guess = estTextUsd(900, opts.maxTokens ?? 700);
  if (bud.left < guess + 0.002) return null;
  const models = [CI_TEXT_MODEL, CI_TEXT_FALLBACK];
  for (const model of models) {
    try {
      const res = await fetch(`${VENICE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${veniceKey()}`,
          "content-type": "application/json",
        },
        signal: AbortSignal.timeout(10_000),
        body: JSON.stringify({
          model,
          temperature: 0.4,
          max_tokens: opts.maxTokens ?? 700,
          messages: [
            { role: "system", content: opts.system },
            { role: "user", content: opts.prompt },
          ],
          venice_parameters: { include_venice_system_prompt: false },
        }),
      });
      if (!res.ok) continue;
      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const text = json.choices?.[0]?.message?.content ?? "";
      if (!text) continue;
      const inTok = json.usage?.prompt_tokens ?? 800;
      const outTok = json.usage?.completion_tokens ?? 400;
      const costUsd = estTextUsd(inTok, outTok);
      await charge(costUsd);
      return { text, json: extractJson(text), model, costUsd };
    } catch {
      continue;
    }
  }
  return null;
}

export type VeniceImage = { bytes: Uint8Array; mime: string; model: string; costUsd: number };

function b64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(Buffer.from(b64, "base64"));
}

export async function veniceImage(prompt: string): Promise<VeniceImage | null> {
  const bud = await budgetLeft();
  if (bud.left < IMAGE_USD) return null;
  try {
    const res = await fetch(`${VENICE_URL}/images/generations`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${veniceKey()}`,
        "content-type": "application/json",
      },
      signal: AbortSignal.timeout(20_000),
      body: JSON.stringify({
        model: CI_IMAGE_MODEL,
        prompt: prompt.slice(0, 900),
        n: 1,
        size: "1024x1024",
        response_format: "b64_json",
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: { b64_json?: string; url?: string }[];
    };
    const row = json.data?.[0];
    let bytes: Uint8Array | null = null;
    if (row?.b64_json) bytes = b64ToBytes(row.b64_json);
    else if (row?.url) {
      const img = await fetch(row.url);
      if (img.ok) bytes = new Uint8Array(await img.arrayBuffer());
    }
    if (!bytes || bytes.length < 80) return null;
    await charge(IMAGE_USD);
    return { bytes, mime: "image/png", model: CI_IMAGE_MODEL, costUsd: IMAGE_USD };
  } catch {
    return null;
  }
}
