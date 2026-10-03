import { create } from "zustand";
import {
  remainingMs,
  reduceInstalls,
  type CiDesk,
  type CiItemView,
  type CiMessageView,
  type CiWorld,
} from "./ci";
import { getCiDesk, castCiVote, creditCiStake, closeCiNow, searchCiMemory } from "./ci-api";
import { personalSign } from "./eth";
import { voteMessage } from "./ci";
import { setCiTalk } from "./fly-talk";
import { useWallet } from "./wallet-store";
import { type DeliveryJob, warnMarks } from "./ci-delivery";
import { logHive } from "./hive-log";
import { useNotify } from "./notify";
import { playCrate, playNotify } from "./audio";

const emptyWorld: CiWorld = {
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

type Tab = "ballot" | "installed" | "history";

const BALLOT_LS = "drosocore.ci.ballot";

function worldFrom(desk: CiDesk | null, seated: number[]): CiWorld {
  if (!desk) return emptyWorld;
  const ok = new Set(seated);
  const installed = desk.items
    .filter((i) => i.installedAt && ok.has(i.id))
    .slice()
    .sort((a, b) => a.id - b.id);
  return reduceInstalls(installed.map((i) => ({ kind: i.kind, visual: i.visual })));
}

function pushNotice(
  kind: "vote" | "vote-end" | "generate" | "delivery",
  title: string,
  body: string,
  tag: string,
  extra?: { cycleId?: number; itemId?: number },
) {
  const n = useNotify.getState().push({ kind, title, body, tag, ...extra });
  if (n) playNotify(kind);
}

type CiState = {
  open: boolean;
  tab: Tab;
  loaded: boolean;
  desk: CiDesk | null;
  world: CiWorld;
  error: string | null;
  voting: boolean;
  detailItem: CiItemView | null;
  query: string;
  hits: { items: CiItemView[]; messages: CiMessageView[] } | null;
  remainMs: number;
  seatedIds: number[];
  queue: DeliveryJob[];
  delivery: DeliveryJob | null;
  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
  setOpen: (v: boolean) => void;
  setTab: (t: Tab) => void;
  vote: (optionId: number) => Promise<void>;
  credit: (eth: number, kind: "ads" | "membership" | "preview", txHash: string, address?: string) => Promise<void>;
  closeNow: () => Promise<void>;
  setDetail: (item: CiItemView | null) => void;
  search: (text: string) => Promise<void>;
  tickClock: () => void;
  finishDelivery: () => void;
  startDrop: (item: CiItemView) => void;
};

let bound = false;
let clock: number | null = null;
let firstDesk = true;
const warned = new Set<string>();
let lastStatus = "";
let lastCycleId = 0;
let lastMyVote: number | null = null;
let lastStakeVotes = "";

function applyDesk(desk: CiDesk, get: () => CiState, set: (p: Partial<CiState>) => void) {
  const prev = get();
  const installed = desk.items.filter((i) => i.installedAt);
  let seatedIds = prev.seatedIds;
  const queue = [...prev.queue];
  let delivery = prev.delivery;
  const wasFirst = firstDesk;

  if (firstDesk) {
    seatedIds = installed.map((i) => i.id);
    firstDesk = false;
  } else {
    const known = new Set([...seatedIds, ...queue.map((q) => q.itemId), delivery?.itemId ?? -1]);
    for (const item of installed) {
      if (known.has(item.id)) continue;
      queue.push({
        itemId: item.id,
        cycleId: item.cycleId,
        kind: item.kind,
        title: item.title,
        visual: item.visual,
        startedAt: 0,
      });
    }
  }

  if (!delivery && queue.length) {
    const next = queue.shift()!;
    delivery = { ...next, startedAt: Date.now() };
    playCrate();
    pushNotice(
      "delivery",
      "Gary has the pack",
      `${delivery.title} is on the crane. Air-mail inbound.`,
      `drop:${delivery.itemId}`,
      { cycleId: delivery.cycleId, itemId: delivery.itemId },
    );
    logHive({
      kind: "construction",
      flow: "out",
      actor: "Gary",
      title: "air-mail",
      body: `${delivery.title} is coming down the well.`,
      meta: { item: delivery.itemId, kind: delivery.kind },
    });
  }

  const cycle = desk.cycle;
  if (cycle) {
    if (cycle.status === "open") {
      const mark = `${cycle.dayKey}:${desk.options.map((o) => o.id).join(".")}`;
      const seen = typeof window !== "undefined" ? window.localStorage.getItem(BALLOT_LS) : mark;
      if (seen !== mark) {
        try {
          window.localStorage.setItem(BALLOT_LS, mark);
        } catch {
          /* ignore */
        }
        pushNotice(
          "vote",
          "ballot is open",
          "Up to five proposals. A site, an add, or a retirement. Six hours. Flies already voted.",
          `open:${mark}`,
          { cycleId: cycle.id },
        );
      }
    }
    if (!wasFirst) {
      if (lastStatus === "open" && (cycle.status === "closed" || cycle.status === "fabricating" || cycle.status === "installed")) {
        const winner = desk.options.find((o) => o.id === cycle.winnerOptionId);
        pushNotice(
          "vote-end",
          "window closed",
          winner ? `${winner.title} won the tally.` : "Tally is in. Fabrication next.",
          `tally:${cycle.id}`,
          { cycleId: cycle.id },
        );
      }
      if (lastStatus !== "fabricating" && cycle.status === "fabricating") {
        const winner = desk.options.find((o) => o.id === cycle.winnerOptionId);
        pushNotice(
          "generate",
          "Venice is packing",
          winner ? `Fabricating ${winner.title} under the dollar cap.` : "Winner is on the printer.",
          `gen:${cycle.id}`,
          { cycleId: cycle.id },
        );
      }
      if (desk.myVote && desk.myVote.optionId !== lastMyVote) {
        const opt = desk.options.find((o) => o.id === desk.myVote?.optionId);
        pushNotice(
          "vote",
          "stake landed",
          opt ? `Your weight is on ${opt.title}.` : "Vote recorded.",
          `myvote:${cycle.id}:${desk.myVote.optionId}`,
          { cycleId: cycle.id },
        );
      }
      const stakeKey = desk.options.map((o) => `${o.id}:${o.voterCount}:${o.stakeEth}`).join("|");
      if (lastCycleId === cycle.id && lastStakeVotes && lastStakeVotes !== stakeKey && cycle.status === "open") {
        const changed = desk.options.find((o, i) => {
          const prevPart = lastStakeVotes.split("|")[i];
          return prevPart && !prevPart.startsWith(`${o.id}:${o.voterCount}:`);
        });
        if (changed && (!desk.myVote || changed.id !== desk.myVote.optionId)) {
          pushNotice(
            "vote",
            "new stake on the board",
            `${changed.title} just picked up weight.`,
            `stake:${cycle.id}:${changed.id}:${changed.voterCount}`,
            { cycleId: cycle.id },
          );
        }
      }
      lastStakeVotes = stakeKey;
    } else {
      lastStakeVotes = desk.options.map((o) => `${o.id}:${o.voterCount}:${o.stakeEth}`).join("|");
    }
    lastMyVote = desk.myVote?.optionId ?? null;
    lastStatus = cycle.status;
    lastCycleId = cycle.id;
  }

  setCiTalk({
    seated: installed.filter((i) => seatedIds.includes(i.id)).map((i) => i.title),
    ballot: cycle?.status === "open" ? desk.options.map((o) => o.title) : [],
  });

  set({
    desk,
    seatedIds,
    queue,
    delivery,
    world: worldFrom(desk, seatedIds),
    loaded: true,
    remainMs: cycle && cycle.status === "open" ? remainingMs(cycle.closesAt) : 0,
    error: null,
  });
}

export const useCi = create<CiState>((set, get) => ({
  open: false,
  tab: "ballot",
  loaded: false,
  desk: null,
  world: emptyWorld,
  error: null,
  voting: false,
  detailItem: null,
  query: "",
  hits: null,
  remainMs: 0,
  seatedIds: [],
  queue: [],
  delivery: null,
  hydrate: async () => {
    if (!bound && typeof window !== "undefined") {
      bound = true;
      window.setInterval(() => void get().refresh(), 20000);
      if (clock) window.clearInterval(clock);
      clock = window.setInterval(() => get().tickClock(), 1000);
    }
    await get().refresh();
  },
  refresh: async () => {
    const address = useWallet.getState().address;
    try {
      const desk = await getCiDesk({ data: { address } });
      applyDesk(desk, get, set);
    } catch {
      set({ loaded: true });
    }
  },
  setOpen: (v) => {
    set({ open: v, error: null });
    if (v) void get().refresh();
  },
  setTab: (t) => set({ tab: t }),
  vote: async (optionId) => {
    const desk = get().desk;
    const wallet = useWallet.getState();
    if (!desk?.cycle || !wallet.address) {
      wallet.openModal();
      set({ error: "wallet" });
      return;
    }
    if (!desk.stake.eligible) {
      set({ error: "stake" });
      return;
    }
    set({ voting: true, error: null });
    try {
      const msg = voteMessage(desk.cycle.id, optionId, desk.cycle.dayKey);
      const { getActiveProvider } = await import("./eth");
      const provider = getActiveProvider();
      if (!provider) {
        wallet.openModal();
        set({ voting: false, error: "wallet" });
        return;
      }
      const signature = await personalSign(provider, wallet.address, msg);
      const next = await castCiVote({
        data: { address: wallet.address, cycleId: desk.cycle.id, optionId, signature },
      });
      set({ voting: false });
      applyDesk(next, get, set);
    } catch (e) {
      const code = e instanceof Error ? e.message : "vote";
      set({ voting: false, error: code.includes("stake") ? "stake" : code.includes("sig") ? "sig" : "vote" });
    }
  },
  credit: async (eth, kind, txHash, address) => {
    const addr = address ?? useWallet.getState().address;
    if (!addr) return;
    try {
      await creditCiStake({ data: { address: addr, eth, kind, txHash } });
      await get().refresh();
    } catch {
      /* preview still local */
    }
  },
  closeNow: async () => {
    try {
      const desk = await closeCiNow({ data: { cycleId: get().desk?.cycle?.id } });
      applyDesk(desk, get, set);
      set({ remainMs: 0, tab: "installed" });
    } catch {
      set({ error: "close" });
    }
  },
  setDetail: (item) => set({ detailItem: item, tab: item ? "installed" : get().tab }),
  search: async (text) => {
    set({ query: text });
    if (text.trim().length < 2) {
      set({ hits: null });
      return;
    }
    try {
      const hits = await searchCiMemory({ data: { text } });
      set({ hits });
    } catch {
      set({ hits: null });
    }
  },
  tickClock: () => {
    const desk = get().desk;
    if (!desk?.cycle || desk.cycle.status !== "open") {
      if (get().remainMs !== 0) set({ remainMs: 0 });
      return;
    }
    const ms = remainingMs(desk.cycle.closesAt);
    set({ remainMs: ms });
    for (const mark of warnMarks(ms)) {
      const key = `${desk.cycle.id}:${mark}`;
      if (warned.has(key)) continue;
      warned.add(key);
      const label = mark === "15m" ? "fifteen minutes" : mark === "5m" ? "five minutes" : "one minute";
      pushNotice(
        "vote-end",
        `window closing · ${label}`,
        "Stake now or the flies keep the tally.",
        `warn:${key}`,
        { cycleId: desk.cycle.id },
      );
    }
    if (ms <= 0) void get().refresh();
  },
  finishDelivery: () => {
    const cur = get().delivery;
    if (!cur) return;
    const seatedIds = get().seatedIds.includes(cur.itemId) ? get().seatedIds : [...get().seatedIds, cur.itemId];
    const queue = [...get().queue];
    let delivery: DeliveryJob | null = null;
    if (queue.length) {
      const next = queue.shift()!;
      delivery = { ...next, startedAt: Date.now() };
      playCrate();
      pushNotice(
        "delivery",
        "Gary has the pack",
        `${delivery.title} is on the crane. Air-mail inbound.`,
        `drop:${delivery.itemId}`,
        { cycleId: delivery.cycleId, itemId: delivery.itemId },
      );
    } else {
      pushNotice(
        "delivery",
        "pack seated",
        `${cur.title} is in the hall.`,
        `seated:${cur.itemId}`,
        { cycleId: cur.cycleId, itemId: cur.itemId },
      );
      logHive({
        kind: "construction",
        flow: "out",
        actor: "crew",
        title: "seated",
        body: `${cur.title} is bolted in.`,
        meta: { item: cur.itemId },
      });
    }
    set({
      seatedIds,
      queue,
      delivery,
      world: worldFrom(get().desk, seatedIds),
    });
  },
  startDrop: (item) => {
    const known = new Set([
      ...get().seatedIds,
      ...get().queue.map((q) => q.itemId),
      get().delivery?.itemId ?? -1,
    ]);
    if (known.has(item.id)) return;
    const job: DeliveryJob = {
      itemId: item.id,
      cycleId: item.cycleId,
      kind: item.kind,
      title: item.title,
      visual: item.visual,
      startedAt: Date.now(),
    };
    if (get().delivery) {
      set({ queue: [...get().queue, { ...job, startedAt: 0 }] });
      return;
    }
    playCrate();
    pushNotice(
      "delivery",
      "Gary has the pack",
      `${job.title} is on the crane. Air-mail inbound.`,
      `drop:${job.itemId}`,
      { cycleId: job.cycleId, itemId: job.itemId },
    );
    set({ delivery: job });
  },
}));
