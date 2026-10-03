import { create } from "zustand";
import { useWallet } from "./wallet-store";

type Tab = "pair" | "tools" | "readme";

type McpUi = {
  open: boolean;
  tab: Tab;
  copied: "key" | "config" | null;
  setOpen: (v: boolean) => void;
  setTab: (t: Tab) => void;
  markCopied: (v: "key" | "config" | null) => void;
};

let copyTimer: ReturnType<typeof setTimeout> | null = null;

export const useMcp = create<McpUi>((set, get) => ({
  open: false,
  tab: "pair",
  copied: null,
  setOpen: (v) => {
    const connected = useWallet.getState().status === "connected";
    set({
      open: v,
      copied: null,
      tab: v && !connected ? "readme" : v ? "pair" : get().tab,
    });
  },
  setTab: (t) => set({ tab: t }),
  markCopied: (v) => {
    if (copyTimer) clearTimeout(copyTimer);
    set({ copied: v });
    if (v) {
      copyTimer = setTimeout(() => {
        set({ copied: null });
        copyTimer = null;
      }, 1600);
    }
  },
}));
