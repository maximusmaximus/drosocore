import { create } from "zustand";

export const NOTICE_CAP = 40;
export const TOAST_CAP = 3;
export const TOAST_MS = 6400;
export const NOTIFY_LS = "drosocore.notify.v1";

export type NoticeKind = "vote" | "vote-end" | "generate" | "delivery";

export type NoticeDraft = {
  kind: NoticeKind;
  title: string;
  body: string;
  tag: string;
  cycleId?: number;
  itemId?: number;
};

export type Notice = NoticeDraft & {
  id: string;
  at: number;
  read: boolean;
};

type Persist = {
  log: Notice[];
  permissionAsked: boolean;
};

function loadPersist(): Persist {
  if (typeof window === "undefined") return { log: [], permissionAsked: false };
  try {
    const raw = window.localStorage.getItem(NOTIFY_LS);
    if (!raw) return { log: [], permissionAsked: false };
    const j = JSON.parse(raw) as Persist;
    const log = Array.isArray(j.log)
      ? j.log.filter((n) => n && typeof n.id === "string" && typeof n.title === "string").slice(-NOTICE_CAP)
      : [];
    return { log, permissionAsked: Boolean(j.permissionAsked) };
  } catch {
    return { log: [], permissionAsked: false };
  }
}

function savePersist(log: Notice[], permissionAsked: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NOTIFY_LS, JSON.stringify({ log: log.slice(-NOTICE_CAP), permissionAsked }));
  } catch {
    /* ignore */
  }
}

function newId(): string {
  return `n-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4).toString(36)}`;
}

function browserSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

function currentPermission(): NotificationPermission | "unsupported" {
  if (!browserSupported()) return "unsupported";
  return window.Notification.permission;
}

type NotifyState = {
  toasts: Notice[];
  log: Notice[];
  unread: number;
  open: boolean;
  permission: NotificationPermission | "unsupported";
  permissionAsked: boolean;
  push: (draft: NoticeDraft) => Notice | null;
  dismiss: (id: string) => void;
  setOpen: (v: boolean) => void;
  markAllRead: () => void;
  requestPermission: () => Promise<NotificationPermission | "unsupported">;
};

const seeded = loadPersist();

export const useNotify = create<NotifyState>((set, get) => ({
  toasts: [],
  log: seeded.log,
  unread: seeded.log.filter((n) => !n.read).length,
  open: false,
  permission: currentPermission(),
  permissionAsked: seeded.permissionAsked,
  push: (draft) => {
    const now = Date.now();
    const recent = get().log.find((n) => n.tag === draft.tag && now - n.at < 12_000);
    if (recent) return null;
    const notice: Notice = {
      ...draft,
      title: draft.title.trim().slice(0, 80),
      body: draft.body.trim().slice(0, 180),
      tag: draft.tag.slice(0, 80),
      id: newId(),
      at: now,
      read: false,
    };
    const log = [...get().log, notice].slice(-NOTICE_CAP);
    const toasts = [...get().toasts.filter((t) => t.tag !== notice.tag), notice].slice(-TOAST_CAP);
    savePersist(log, get().permissionAsked);
    set({ log, toasts, unread: get().unread + 1 });
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== notice.id) }));
      }, TOAST_MS);
    }
    void maybeBrowser(notice, get().permission);
    return notice;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setOpen: (v) => {
    if (v) {
      const log = get().log.map((n) => ({ ...n, read: true }));
      savePersist(log, get().permissionAsked);
      set({ open: true, log, unread: 0 });
    } else set({ open: false });
  },
  markAllRead: () => {
    const log = get().log.map((n) => ({ ...n, read: true }));
    savePersist(log, get().permissionAsked);
    set({ log, unread: 0 });
  },
  requestPermission: async () => {
    if (!browserSupported()) {
      set({ permission: "unsupported", permissionAsked: true });
      savePersist(get().log, true);
      return "unsupported";
    }
    try {
      const perm = await window.Notification.requestPermission();
      savePersist(get().log, true);
      set({ permission: perm, permissionAsked: true });
      return perm;
    } catch {
      savePersist(get().log, true);
      set({ permissionAsked: true });
      return currentPermission();
    }
  },
}));

async function maybeBrowser(notice: Notice, perm: NotificationPermission | "unsupported") {
  if (perm !== "granted" || typeof window === "undefined") return;
  try {
    const n = new window.Notification(`DROSOCORE · ${notice.title}`, {
      body: notice.body,
      tag: notice.tag,
      silent: false,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* ignored — some embeds block the constructor */
  }
}

export function kindLabel(kind: NoticeKind): string {
  switch (kind) {
    case "vote":
      return "vote";
    case "vote-end":
      return "tally";
    case "generate":
      return "pack";
    case "delivery":
      return "drop";
  }
}
