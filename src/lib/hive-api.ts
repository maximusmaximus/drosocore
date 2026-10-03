import { createServerFn } from "@tanstack/react-start";
import type { HiveDraft, HiveEvent, HiveMemory } from "./hive";
import { insertEvents, listHive, queryHive, voteClaim } from "./hive.server";

export type HiveSnapshot = {
  events: HiveEvent[];
  memories: HiveMemory[];
};

export const listHiveLog = createServerFn({ method: "GET" }).handler(async (): Promise<HiveSnapshot> => {
  return listHive(70);
});

type RecordInput = { items: HiveDraft[] };

export const recordHiveLog = createServerFn({ method: "POST" })
  .validator((d: RecordInput) => {
    if (!d || !Array.isArray(d.items)) throw new Error("items");
    return { items: d.items.slice(0, 12) };
  })
  .handler(async ({ data }): Promise<{ events: HiveEvent[] }> => {
    const events = await insertEvents(data.items);
    return { events };
  });

type QueryInput = { text: string };

export const searchHiveLog = createServerFn({ method: "POST" })
  .validator((d: QueryInput) => {
    if (!d || typeof d.text !== "string" || d.text.trim().length < 2) throw new Error("text");
    return { text: d.text.slice(0, 240) };
  })
  .handler(async ({ data }): Promise<HiveSnapshot> => {
    return queryHive(data.text, 8);
  });

type VoteInput = { claimKey: string; fact: string; flyIndex: number };

export const voteHiveClaim = createServerFn({ method: "POST" })
  .validator((d: VoteInput) => {
    if (!d || typeof d.claimKey !== "string" || d.claimKey.length < 3) throw new Error("claim");
    if (typeof d.fact !== "string" || d.fact.length < 4) throw new Error("fact");
    if (typeof d.flyIndex !== "number" || d.flyIndex < 0) throw new Error("fly");
    return { claimKey: d.claimKey.slice(0, 80), fact: d.fact.slice(0, 200), flyIndex: d.flyIndex | 0 };
  })
  .handler(async ({ data }) => {
    return voteClaim(data);
  });
