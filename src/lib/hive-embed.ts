/** Deterministic hashed bag-of-words embeddings. PGLite has no pgvector. */

export const HIVE_DIM = 48;

const STOP = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "to",
  "of",
  "in",
  "on",
  "is",
  "it",
  "we",
  "i",
  "at",
  "for",
  "with",
  "that",
  "this",
  "as",
]);

export function hiveTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function embedText(text: string): number[] {
  const v = new Array<number>(HIVE_DIM).fill(0);
  const toks = hiveTokens(text);
  if (toks.length === 0) return v;
  for (let i = 0; i < toks.length; i++) {
    const tok = toks[i];
    const h = hash32(tok);
    const slot = h % HIVE_DIM;
    v[slot] += h & 1 ? 1 : -1;
    if (i + 1 < toks.length) {
      const h2 = hash32(tok + "_" + toks[i + 1]);
      v[h2 % HIVE_DIM] += h2 & 2 ? 0.6 : -0.6;
    }
  }
  return l2(v);
}

export function l2(v: number[]): number[] {
  let s = 0;
  for (const x of v) s += x * x;
  const n = Math.sqrt(s) || 1;
  return v.map((x) => x / n);
}

export function cosine(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

export function encodeEmbedding(v: number[]): string {
  return JSON.stringify(v.map((x) => Math.round(x * 1e5) / 1e5));
}

export function decodeEmbedding(raw: string | null | undefined): number[] | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v) || v.length !== HIVE_DIM) return null;
    return v.map((x) => Number(x) || 0);
  } catch {
    return null;
  }
}

export function nearestIndex(query: number[], corpus: number[][], min = 0.18): number {
  let best = -1;
  let score = min;
  for (let i = 0; i < corpus.length; i++) {
    const c = cosine(query, corpus[i]);
    if (c > score) {
      score = c;
      best = i;
    }
  }
  return best;
}

export function topK(query: number[], corpus: number[][], k = 6, min = 0.12): { i: number; score: number }[] {
  const hits: { i: number; score: number }[] = [];
  for (let i = 0; i < corpus.length; i++) {
    const score = cosine(query, corpus[i]);
    if (score >= min) hits.push({ i, score });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, k);
}
