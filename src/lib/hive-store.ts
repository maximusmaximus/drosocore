import { create } from "zustand";
import { applyVote, emptyVoteBook, type HiveEvent, type HiveKind, type HiveMemory, type VoteBook } from "./hive";
import { drainHiveQueue, onHiveQueued } from "./hive-log";
import { listHiveLog, recordHiveLog, voteHiveClaim } from "./hive-api";
import { recallMemory } from "./fly-talk";

type HiveState = {
  events: HiveEvent[];
  memories: HiveMemory[];
  loaded: boolean;
  logOpen: boolean;
  filter: "all" | HiveKind;
  mobileIndex: number;
  book: VoteBook;
  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
  flush: () => Promise<void>;
  openLog: () => void;
  closeLog: () => void;
  setFilter: (f: HiveState["filter"]) => void;
  cycleMobile: (dir?: 1 | -1) => void;
  nearestFact: (text: string) => HiveMemory | null;
  vote: (flyIndex: number, claimKey: string, fact: string) => Promise<boolean>;
};

function mergeEvents(cur: HiveEvent[], extra: HiveEvent[]): HiveEvent[] {
  const map = new Map<number, HiveEvent>();
  for (const e of [...extra, ...cur]) map.set(e.id, e);
  return [...map.values()].sort((a, b) => b.id - a.id).slice(0, 120);
}

function mergeMem(cur: HiveMemory[], extra: HiveMemory[]): HiveMemory[] {
  const map = new Map<string, HiveMemory>();
  for (const m of [...extra, ...cur]) map.set(m.claimKey, m);
  return [...map.values()].sort((a, b) => b.support - a.support || b.id - a.id);
}

let flushTimer: ReturnType<typeof setTimeout> | null = null;
let bound = false;

export const useHive = create<HiveState>((set, get) => ({
  events: [],
  memories: [],
  loaded: false,
  logOpen: false,
  filter: "all",
  mobileIndex: 0,
  book: emptyVoteBook(),
  hydrate: async () => {
    if (!bound && typeof window !== "undefined") {
      bound = true;
      onHiveQueued(() => {
        if (flushTimer) return;
        flushTimer = setTimeout(() => {
          flushTimer = null;
          void get().flush();
        }, 900);
      });
      window.setInterval(() => {
        void get().refresh();
        void get().flush();
      }, 12000);
    }
    await get().refresh();
  },
  refresh: async () => {
    try {
      const snap = await listHiveLog();
      set({
        events: mergeEvents(get().events, snap.events),
        memories: mergeMem(get().memories, snap.memories),
        loaded: true,
      });
    } catch {
      set({ loaded: true });
    }
  },
  flush: async () => {
    const items = drainHiveQueue();
    if (!items.length) return;
    try {
      const res = await recordHiveLog({ data: { items } });
      if (res.events.length) {
        set({ events: mergeEvents(get().events, res.events), mobileIndex: 0 });
      }
    } catch {
      const fakes = items.map((item, i) => ({
        id: Date.now() + i,
        kind: item.kind,
        flow: item.flow ?? "in",
        actor: item.actor,
        title: item.title,
        body: item.body,
        meta: item.meta ?? {},
        agreed: 0,
        status: "live" as const,
        createdAt: new Date().toISOString(),
      }));
      set({ events: mergeEvents(get().events, fakes) });
    }
  },
  openLog: () => set({ logOpen: true }),
  closeLog: () => set({ logOpen: false }),
  setFilter: (filter) => set({ filter, mobileIndex: 0 }),
  cycleMobile: (dir = 1) => {
    const list = visibleEvents(get().events, get().filter);
    if (list.length === 0) return;
    const i = (get().mobileIndex + dir + list.length) % list.length;
    set({ mobileIndex: i });
  },
  nearestFact: (text) => recallMemory(text, get().memories),
  vote: async (flyIndex, claimKey, fact) => {
    const local = applyVote(get().book, claimKey, fact, flyIndex);
    set({ book: new Map(get().book) });
    try {
      const res = await voteHiveClaim({ data: { claimKey, fact, flyIndex } });
      if (res.memory) set({ memories: mergeMem(get().memories, [res.memory]) });
      if (res.event) set({ events: mergeEvents(get().events, [res.event]) });
      return res.newlyAgreed || local.newlyAgreed;
    } catch {
      return local.newlyAgreed;
    }
  },
}));

export function visibleEvents(events: HiveEvent[], filter: HiveState["filter"]): HiveEvent[] {
  if (filter === "all") return events;
  return events.filter((e) => e.kind === filter);
}
