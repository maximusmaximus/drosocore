import { create } from "zustand";
import { adSpaceById } from "./ad-spaces";
import {
  adPriceEth,
  loadAdsLocal,
  recordsMap,
  saveAdsLocal,
  type AdRecord,
} from "./ads";
import { listAds, purchaseAd } from "./ads-api";
import { logHive } from "./hive-log";
import { useWallet } from "./wallet-store";

type AdsState = {
  byId: Record<string, AdRecord>;
  purchaseCount: number;
  selectedSpace: string | null;
  pendingImage: string | null;
  hoveredSpace: string | null;
  pickerOpen: boolean;
  paying: boolean;
  payError: string | null;
  loaded: boolean;
  hydrate: () => void;
  refresh: () => Promise<void>;
  hover: (id: string | null) => void;
  openPicker: () => void;
  openSpace: (id: string) => void;
  backToPicker: () => void;
  closeComposer: () => void;
  setPendingImage: (url: string | null) => void;
  placeLocal: (record: AdRecord) => void;
  buy: (txHash: string) => Promise<AdRecord>;
};

function persist(get: () => AdsState) {
  saveAdsLocal({
    records: Object.values(get().byId),
    purchaseCount: get().purchaseCount,
  });
}

export const useAds = create<AdsState>((set, get) => ({
  byId: {},
  purchaseCount: 0,
  selectedSpace: null,
  pendingImage: null,
  hoveredSpace: null,
  pickerOpen: false,
  paying: false,
  payError: null,
  loaded: false,
  hydrate: () => {
    const snap = loadAdsLocal();
    set({
      byId: recordsMap(snap.records),
      purchaseCount: snap.purchaseCount,
      loaded: true,
    });
  },
  refresh: async () => {
    try {
      const remote = await listAds();
      const local = get().byId;
      const merged = { ...recordsMap(remote.records), ...local };
      const count = Math.max(remote.purchaseCount, get().purchaseCount);
      set({ byId: merged, purchaseCount: count, loaded: true });
      persist(get);
    } catch {
      set({ loaded: true });
    }
  },
  hover: (id) => set({ hoveredSpace: id }),
  openPicker: () => {
    const { pickerOpen, selectedSpace } = get();
    if (pickerOpen && !selectedSpace) {
      set({ pickerOpen: false, pendingImage: null, payError: null, paying: false });
      return;
    }
    set({
      pickerOpen: true,
      selectedSpace: null,
      pendingImage: null,
      payError: null,
      paying: false,
    });
  },
  openSpace: (id) => {
    if (!adSpaceById(id)) return;
    const taken = get().byId[id];
    set({
      selectedSpace: id,
      pendingImage: taken?.imageUrl ?? null,
      payError: null,
      pickerOpen: true,
    });
  },
  backToPicker: () =>
    set({ selectedSpace: null, pendingImage: null, payError: null, paying: false, pickerOpen: true }),
  closeComposer: () =>
    set({ selectedSpace: null, pendingImage: null, payError: null, paying: false, pickerOpen: false }),
  setPendingImage: (url) => set({ pendingImage: url, payError: null }),
  placeLocal: (record) => {
    const byId = { ...get().byId, [record.spaceId]: record };
    const purchaseCount = Math.max(get().purchaseCount, Object.keys(byId).length);
    set({ byId, purchaseCount, selectedSpace: null, pendingImage: null, paying: false, pickerOpen: false });
    persist(get);
    logHive({
      kind: "user",
      actor: "visitor",
      title: "billboard",
      body: `Visitor published a board on ${record.spaceId}.`,
      meta: { space: record.spaceId },
    });
  },
  buy: async (txHash) => {
    const spaceId = get().selectedSpace;
    const image = get().pendingImage;
    if (!spaceId || !image) throw new Error("empty");
    if (get().byId[spaceId]) throw new Error("taken");
    set({ paying: true, payError: null });
    const optimistic: AdRecord = {
      spaceId,
      imageUrl: image,
      txHash,
      priceEth: adPriceEth(get().purchaseCount),
    };
    try {
      const res = await purchaseAd({
        data: { spaceId, imageBase64: image, txHash, payer: useWallet.getState().address ?? undefined },
      });
      const record = res.record ?? optimistic;
      const byId = { ...get().byId, [record.spaceId]: record };
      set({
        byId,
        purchaseCount: Math.max(res.purchaseCount, get().purchaseCount + 1),
        selectedSpace: null,
        pendingImage: null,
        paying: false,
        pickerOpen: false,
      });
      persist(get);
      return record;
    } catch (e) {
      const byId = { ...get().byId, [spaceId]: optimistic };
      set({
        byId,
        purchaseCount: get().purchaseCount + 1,
        selectedSpace: null,
        pendingImage: null,
        paying: false,
        pickerOpen: false,
        payError: e instanceof Error ? e.message : "buy",
      });
      persist(get);
      return optimistic;
    }
  },
}));

export function currentAdPrice(): string {
  return adPriceEth(useAds.getState().purchaseCount);
}
