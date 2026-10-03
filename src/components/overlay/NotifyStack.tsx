import { Bell, Factory, Package, Vote, X } from "lucide-react";
import { kindLabel, useNotify, type Notice, type NoticeKind } from "@/lib/notify";
import { useCi } from "@/lib/ci-store";
import { useSim } from "@/lib/store";

function KindIcon({ kind }: { kind: NoticeKind }) {
  const cls = "size-3.5 shrink-0";
  switch (kind) {
    case "vote":
      return <Vote className={cls} />;
    case "vote-end":
      return <Vote className={cls} />;
    case "generate":
      return <Factory className={cls} />;
    case "delivery":
      return <Package className={cls} />;
  }
}

function openFrom(n: Notice) {
  useSim.getState().select(null);
  useSim.getState().setDonationOpen(false);
  const ci = useCi.getState();
  ci.setOpen(true);
  if (n.kind === "delivery" || n.kind === "generate") {
    ci.setTab("installed");
    const item = ci.desk?.items.find((i) => i.id === n.itemId);
    if (item) ci.setDetail(item);
  } else {
    ci.setTab("ballot");
  }
}

function ToastCard({ n }: { n: Notice }) {
  return (
    <button
      type="button"
      onClick={() => {
        openFrom(n);
        useNotify.getState().dismiss(n.id);
      }}
      className="flex w-full max-w-sm items-start gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-left shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
    >
      <span className="mt-0.5 text-accent">
        <KindIcon kind={n.kind} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-mono text-[0.6rem] uppercase tracking-wide text-subtle">{kindLabel(n.kind)}</span>
        <span className="mt-0.5 block font-mono text-sm text-fg">{n.title}</span>
        <span className="mt-0.5 block text-sm leading-snug text-muted">{n.body}</span>
      </span>
      <span
        role="presentation"
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted"
        onClick={(e) => {
          e.stopPropagation();
          useNotify.getState().dismiss(n.id);
        }}
      >
        <X className="size-3.5" />
      </span>
    </button>
  );
}

export function NotifyToasts() {
  const toasts = useNotify((s) => s.toasts);
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[4.6rem] z-[72] flex flex-col items-center gap-2 px-3 sm:top-[4.8rem]">
      {toasts.map((n) => (
        <div key={n.id} className="notice-in pointer-events-auto w-full max-w-sm">
          <ToastCard n={n} />
        </div>
      ))}
    </div>
  );
}

export function NotifyBell() {
  const unread = useNotify((s) => s.unread);
  const open = useNotify((s) => s.open);
  const log = useNotify((s) => s.log);
  const permission = useNotify((s) => s.permission);
  const asked = useNotify((s) => s.permissionAsked);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="shift alerts"
        aria-pressed={open}
        className={
          "pointer-events-auto relative inline-flex size-11 items-center justify-center rounded-full border border-border " +
          (open ? "bg-accent text-accent-fg" : "bg-surface-2 text-fg")
        }
        onClick={() => useNotify.getState().setOpen(!open)}
      >
        <Bell className="size-4" />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 font-mono text-[0.55rem] text-accent-fg">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          data-no-pinch
          className="pointer-events-auto absolute left-0 top-12 z-[74] w-[min(92vw,20rem)] rounded-xl border border-border bg-surface p-3 shadow-[0_18px_48px_rgba(0,0,0,0.5)]"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-mono text-[0.65rem] uppercase tracking-wide text-subtle">shift alerts</p>
            <button
              type="button"
              aria-label="close alerts"
              className="inline-flex size-9 items-center justify-center rounded-md text-fg"
              onClick={() => useNotify.getState().setOpen(false)}
            >
              <X className="size-4" />
            </button>
          </div>
          {permission !== "granted" && permission !== "unsupported" ? (
            <button
              type="button"
              className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-md bg-accent text-sm font-medium text-accent-fg"
              onClick={() => void useNotify.getState().requestPermission()}
            >
              {asked ? "allow browser alerts" : "notify me of votes and drops"}
            </button>
          ) : permission === "granted" ? (
            <p className="mt-1 font-mono text-[0.65rem] text-accent">browser alerts on</p>
          ) : null}
          <div className="mt-2 max-h-[min(50dvh,22rem)] space-y-2 overflow-y-auto">
            {log.length === 0 ? (
              <p className="py-6 text-center font-mono text-xs text-subtle">quiet on this shift</p>
            ) : (
              [...log].reverse().map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className="flex w-full items-start gap-2 rounded-md border border-border bg-surface-2 p-2.5 text-left"
                  onClick={() => {
                    openFrom(n);
                    useNotify.getState().setOpen(false);
                  }}
                >
                  <span className="mt-0.5 text-muted">
                    <KindIcon kind={n.kind} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-mono text-[0.6rem] uppercase tracking-wide text-subtle">
                      {kindLabel(n.kind)}
                    </span>
                    <span className="mt-0.5 block font-mono text-sm text-fg">{n.title}</span>
                    <span className="mt-0.5 block text-sm leading-snug text-muted">{n.body}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
