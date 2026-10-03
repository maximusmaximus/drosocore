import { create } from "zustand";
import { CELEBRATION_MS, ETH_LS } from "./constants";
import { GUIDE_LS, GUIDE_VERSION, TOUR, type FeatureId } from "./guide";
import { logHive } from "./hive-log";
import { ROLES, type Role, type RoleId } from "./roles";
import { TIERS, type NftTraits, type StageId } from "./tiers";

export type SelectedFly = {
  index: number;
  role: Role;
  seed: number;
  name: string;
};

export type MintKind = "fly" | "supporter";

export type MintedNft = {
  kind: MintKind;
  traits: NftTraits | null;
  title: string;
  spaceLabel: string | null;
  spaceId: string | null;
  priceEth: string | null;
  cardDataUrl: string | null;
  txHash: string;
  imageUrl: string | null;
  metadataUrl: string | null;
  tokenUri: string | null;
  cid: string | null;
};

export type CueId = "wallet" | "info" | "donate" | "github" | "audio" | "mcp";

const CUE_IDS: CueId[] = ["wallet", "info", "donate", "github", "audio", "mcp"];

function freshCues(): Record<CueId, boolean> {
  return { wallet: true, info: true, donate: true, github: true, audio: true, mcp: true };
}

function loadContrib(): number {
  if (typeof window === "undefined") return 0;
  try {
    const n = Number(window.localStorage.getItem(ETH_LS) ?? "0");
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function saveContrib(n: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ETH_LS, String(n));
  } catch {
    /* ignore */
  }
}

type SimState = {
  selected: SelectedFly | null;
  hovered: number | null;
  celebrating: boolean;
  celebrationUntil: number;
  donationOpen: boolean;
  muted: boolean;
  copied: boolean;
  sendState: "idle" | "pending" | "error";
  sendError: string | null;
  clickCounts: Record<string, number>;
  lastByRole: Record<string, SelectedFly>;
  donateEth: number;
  contributedEth: number;
  minted: MintedNft | null;
  mintStatus: "idle" | "pinning" | "ready" | "error";
  mintError: string | null;
  infoOn: boolean;
  tipId: FeatureId | null;
  guideStep: number | null;
  cues: Record<CueId, boolean>;
  worldReady: boolean;
  markWorldReady: () => void;
  select: (fly: SelectedFly | null) => void;
  setHovered: (i: number | null) => void;
  startCelebration: () => void;
  setDonationOpen: (open: boolean) => void;
  toggleMuted: () => void;
  setCopied: (v: boolean) => void;
  setSendState: (s: SimState["sendState"], err?: string | null) => void;
  setDonateEth: (n: number) => void;
  addContribution: (eth: number) => void;
  hydrateGrowth: () => void;
  markCue: (id: CueId) => void;
  mostClicked: () => SelectedFly;
  beginMint: (payload: {
    kind?: MintKind;
    traits?: NftTraits | null;
    txHash: string;
    title?: string;
    spaceLabel?: string | null;
    spaceId?: string | null;
    priceEth?: string | null;
    cardDataUrl?: string | null;
  }) => void;
  finishMint: (urls: Pick<MintedNft, "imageUrl" | "metadataUrl" | "tokenUri" | "cid">) => void;
  failMint: (err: string) => void;
  closeMinted: () => void;
  toggleInfo: () => void;
  setInfoOn: (on: boolean) => void;
  openTip: (id: FeatureId | null) => void;
  startGuide: () => void;
  nextGuide: () => void;
  skipGuide: () => void;
};

let celebrateTimer: ReturnType<typeof setTimeout> | null = null;

function markGuideSeen() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GUIDE_LS, String(GUIDE_VERSION));
  } catch {
    /* ignore */
  }
}

export function shouldAutoGuide(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const v = Number(window.localStorage.getItem(GUIDE_LS) ?? "0");
    return v < GUIDE_VERSION;
  } catch {
    return true;
  }
}

export const useSim = create<SimState>((set, get) => ({
  selected: null,
  hovered: null,
  celebrating: false,
  celebrationUntil: 0,
  donationOpen: false,
  muted: false,
  copied: false,
  sendState: "idle",
  sendError: null,
  clickCounts: {},
  lastByRole: {},
  donateEth: TIERS[0].eth,
  contributedEth: 0,
  minted: null,
  mintStatus: "idle",
  mintError: null,
  infoOn: false,
  tipId: null,
  guideStep: null,
  cues: freshCues(),
  worldReady: false,
  markWorldReady: () => {
    if (get().worldReady) return;
    if (shouldAutoGuide()) {
      set({
        worldReady: true,
        guideStep: 0,
        infoOn: true,
        tipId: TOUR[0],
      });
      return;
    }
    set({ worldReady: true });
  },
  select: (fly) => {
    if (!fly) {
      set({ selected: null });
      return;
    }
    const clickCounts = { ...get().clickCounts };
    clickCounts[fly.role.id] = (clickCounts[fly.role.id] ?? 0) + 1;
    logHive({
      kind: "user",
      actor: "visitor",
      title: "tapped a worker",
      body: `Visitor selected ${fly.name}, ${fly.role.title}.`,
      meta: { fly: fly.index, role: fly.role.id },
    });
    set({
      selected: fly,
      donationOpen: false,
      clickCounts,
      lastByRole: { ...get().lastByRole, [fly.role.id]: fly },
    });
  },
  setHovered: (i) => set({ hovered: i }),
  startCelebration: () => {
    if (celebrateTimer) clearTimeout(celebrateTimer);
    const until = performance.now() + CELEBRATION_MS;
    logHive({
      kind: "user",
      actor: "visitor",
      title: "hall celebration",
      body: "Visitor funded the plant. Crew is dancing.",
    });
    set({ celebrating: true, celebrationUntil: until, donationOpen: false, selected: null });
    celebrateTimer = setTimeout(() => {
      set({ celebrating: false });
    }, CELEBRATION_MS);
  },
  setDonationOpen: (open) => {
    if (open) get().markCue("donate");
    set({ donationOpen: open, selected: open ? null : get().selected });
  },
  toggleMuted: () => {
    get().markCue("audio");
    set({ muted: !get().muted });
  },
  setCopied: (v) => set({ copied: v }),
  setSendState: (s, err = null) => set({ sendState: s, sendError: err }),
  setDonateEth: (n) => set({ donateEth: n }),
  addContribution: (eth) => {
    const n = Number(eth);
    if (!Number.isFinite(n) || n <= 0) return;
    const next = get().contributedEth + n;
    saveContrib(next);
    logHive({
      kind: "user",
      actor: "visitor",
      title: "reactor fund",
      body: `Visitor sent ${n} ETH through the floor bar.`,
      meta: { eth: n },
    });
    set({ contributedEth: next });
  },
  hydrateGrowth: () => set({ contributedEth: loadContrib() }),
  markCue: (id) => {
    if (!CUE_IDS.includes(id)) return;
    if (!get().cues[id]) return;
    set({ cues: { ...get().cues, [id]: false } });
  },
  mostClicked: () => {
    const { clickCounts, lastByRole } = get();
    let bestId: RoleId = ROLES[0].id;
    let best = -1;
    for (const [id, n] of Object.entries(clickCounts)) {
      if (n > best) {
        best = n;
        bestId = id as RoleId;
      }
    }
    const hit = lastByRole[bestId];
    if (hit) return hit;
    const role = ROLES.find((r) => r.id === bestId) ?? ROLES[0];
    return { index: 0, role, seed: 11.3, name: "Helix" };
  },
  beginMint: ({
    kind = "fly",
    traits = null,
    txHash,
    title,
    spaceLabel = null,
    spaceId = null,
    priceEth = null,
    cardDataUrl = null,
  }) =>
    set({
      minted: {
        kind,
        traits,
        title: title ?? (kind === "supporter" ? "I supported fly reactor!" : traits?.name ?? "DROSOCORE"),
        spaceLabel,
        spaceId,
        priceEth,
        cardDataUrl,
        txHash,
        imageUrl: cardDataUrl,
        metadataUrl: null,
        tokenUri: null,
        cid: null,
      },
      mintStatus: "pinning",
      mintError: null,
      donationOpen: false,
      selected: null,
    }),
  finishMint: (urls) => {
    const minted = get().minted;
    if (!minted) return;
    set({ minted: { ...minted, ...urls }, mintStatus: "ready" });
  },
  failMint: (err) => set({ mintStatus: "error", mintError: err }),
  closeMinted: () => set({ minted: null, mintStatus: "idle", mintError: null }),
  toggleInfo: () => {
    get().markCue("info");
    const on = !get().infoOn;
    set({ infoOn: on, tipId: on ? get().tipId : null });
  },
  setInfoOn: (on) => set({ infoOn: on, tipId: on ? get().tipId : null }),
  openTip: (id) => set({ tipId: id, infoOn: true }),
  startGuide: () => set({ guideStep: 0, infoOn: true, tipId: TOUR[0], selected: null, donationOpen: false }),
  nextGuide: () => {
    const step = get().guideStep;
    if (step === null) return;
    const n = step + 1;
    if (n >= TOUR.length) {
      markGuideSeen();
      set({ guideStep: null, tipId: null, infoOn: false });
      return;
    }
    set({ guideStep: n, tipId: TOUR[n], infoOn: true });
  },
  skipGuide: () => {
    markGuideSeen();
    set({ guideStep: null, tipId: null, infoOn: false });
  },
}));

export function stageOfMint(): StageId {
  return useSim.getState().minted?.traits?.stage ?? "imago";
}
