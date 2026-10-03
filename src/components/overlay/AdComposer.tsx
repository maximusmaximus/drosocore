import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ImagePlus, Wallet, X } from "lucide-react";
import { AD_SECTION_LABEL, adSpaceById, spacesBySection, type AdSpace } from "@/lib/ad-spaces";
import { adPriceEth, nextAdPriceEth } from "@/lib/ads";
import { useAds } from "@/lib/ads-store";
import { afterAdPayment } from "@/lib/donate";
import { sendEth } from "@/lib/eth";
import { fileToAdDataUrl, filesFromDrop, isImageFile } from "@/lib/image";
import { useSim } from "@/lib/store";
import { useWallet } from "@/lib/wallet-store";

function SlotCard({
  space,
  taken,
  active,
  onPick,
}: {
  space: AdSpace;
  taken: boolean;
  active: boolean;
  onPick: () => void;
}) {
  const thumb = useAds((s) => s.byId[space.id]?.imageUrl);
  return (
    <button
      type="button"
      onClick={onPick}
      className={
        "flex min-h-11 items-center gap-2 rounded-md border px-2.5 py-2 text-left " +
        (active
          ? "border-accent bg-accent text-accent-fg"
          : taken
            ? "border-border bg-surface-2 text-muted"
            : "border-border bg-surface text-fg")
      }
    >
      <span
        className={
          "size-8 shrink-0 overflow-hidden rounded-xs border border-border " + (taken ? "bg-surface" : "bg-surface-2")
        }
      >
        {thumb ? (
          <img src={thumb} alt="" className="size-full object-cover outline outline-1 -outline-offset-1 outline-fg/10" />
        ) : (
          <span className={"block size-full " + (taken ? "bg-muted/30" : "bg-accent/20")} />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-sans text-xs font-medium">{space.label}</span>
        <span className="block font-mono text-[0.6rem] uppercase tracking-[0.08em] opacity-70">
          {taken ? "taken" : "vacant"}
        </span>
      </span>
    </button>
  );
}

export function AdComposer() {
  const pickerOpen = useAds((s) => s.pickerOpen);
  const spaceId = useAds((s) => s.selectedSpace);
  const pending = useAds((s) => s.pendingImage);
  const paying = useAds((s) => s.paying);
  const payError = useAds((s) => s.payError);
  const purchaseCount = useAds((s) => s.purchaseCount);
  const byId = useAds((s) => s.byId);
  const taken = spaceId ? byId[spaceId] : null;
  const connected = useWallet((s) => s.status === "connected" && Boolean(s.address));
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const space = spaceId ? adSpaceById(spaceId) : undefined;
  const occupied = Boolean(taken);
  const price = adPriceEth(purchaseCount);
  const groups = useMemo(() => spacesBySection(), []);

  useEffect(() => {
    setErr(null);
  }, [spaceId, pending]);

  if (!pickerOpen && !spaceId) return null;

  const onFiles = async (files: File[]) => {
    const f = files.find(isImageFile);
    if (!f) {
      setErr("image");
      return;
    }
    try {
      const url = await fileToAdDataUrl(f);
      useAds.getState().setPendingImage(url);
      setErr(null);
    } catch {
      setErr("image");
    }
  };

  const pay = async () => {
    if (occupied || !space) return;
    const wallet = useWallet.getState();
    if (wallet.status !== "connected" || !wallet.address) {
      wallet.openModal();
      setErr("wallet");
      return;
    }
    if (!pending) return;
    useSim.getState().setSendState("pending");
    try {
      const hash = await sendEth(price, wallet.address);
      await useAds.getState().buy(hash);
      afterAdPayment({
        txHash: hash,
        spaceLabel: space.label,
        spaceId: space.id,
        priceEth: price,
      });
      useSim.getState().setSendState("idle");
    } catch {
      setErr("rejected");
      useSim.getState().setSendState("error", "rejected");
    }
  };

  const picking = !space;

  return (
    <>
      <button
        type="button"
        aria-label="close"
        data-no-pinch
        className="pointer-events-auto absolute right-3 top-16 z-[56] inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface text-fg shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
        onClick={() => useAds.getState().closeComposer()}
      >
        <X className="size-4" />
      </button>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[55] flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div
          data-no-pinch
          className="pointer-events-auto relative w-full max-w-lg rounded-xl border border-border bg-surface/94 px-4 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
        >
          {picking ? (
            <>
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-subtle">select a board</p>
              <p className="mt-1 font-sans text-sm text-fg">Pick a vacant face, then drop your image to publish.</p>
              <p className="mt-0.5 font-mono text-[0.65rem] text-subtle">
                {price} ETH · {AD_SECTION_LABEL.wall} first · pinned to IPFS
              </p>
              <div className="mt-3 max-h-[42vh] space-y-3 overflow-y-auto overscroll-contain pr-0.5">
                {groups.map((g) => (
                  <div key={g.section}>
                    <p className="mb-1.5 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-subtle">{g.label}</p>
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                      {g.spaces.map((s) => (
                        <SlotCard
                          key={s.id}
                          space={s}
                          taken={Boolean(byId[s.id])}
                          active={false}
                          onPick={() => useAds.getState().openSpace(s.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : space ? (
            <>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex size-9 items-center justify-center rounded-sm border border-border bg-surface-2 text-fg"
                  aria-label="all boards"
                  onClick={() => useAds.getState().backToPicker()}
                >
                  <ChevronLeft className="size-4" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-subtle">
                    {AD_SECTION_LABEL[space.section]}
                  </p>
                  <p className="truncate font-sans text-sm font-medium text-fg">{space.label}</p>
                </div>
              </div>
              <button
                type="button"
                disabled={occupied}
                className={
                  "mt-3 flex h-36 w-full items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-surface-2 " +
                  (drag ? "ring-1 ring-accent" : "")
                }
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!occupied) setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  if (!occupied) void onFiles(filesFromDrop(e.dataTransfer));
                }}
                onClick={() => {
                  if (!occupied) inputRef.current?.click();
                }}
                aria-label="drop or select image"
              >
                {pending || taken?.imageUrl ? (
                  <img
                    src={pending || taken?.imageUrl}
                    alt=""
                    className="size-full object-cover outline outline-1 -outline-offset-1 outline-fg/10"
                  />
                ) : (
                  <span className="flex flex-col items-center gap-1 text-muted">
                    <ImagePlus className="size-6" />
                    <span className="font-sans text-sm">drop image here</span>
                    <span className="font-mono text-[0.65rem] text-subtle">or tap to choose</span>
                  </span>
                )}
              </button>
              <p className="mt-2 font-mono text-[0.65rem] text-subtle">
                {occupied
                  ? taken?.cid
                    ? `published · ipfs ${taken.cid.slice(0, 8)}`
                    : "already published on this face"
                  : `${price} ETH · next ${nextAdPriceEth(purchaseCount)} · pinned to IPFS + GitHub`}
              </p>
              {!occupied ? (
                <button
                  type="button"
                  disabled={paying || (connected && !pending)}
                  className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-accent px-3 text-sm font-medium text-accent-fg disabled:opacity-50"
                  onClick={() => void pay()}
                >
                  <Wallet className="size-4" />
                  {paying ? "publishing…" : connected ? (pending ? `publish ${price}` : "add an image first") : "connect wallet"}
                </button>
              ) : null}
            </>
          ) : null}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const list = e.target.files ? Array.from(e.target.files) : [];
              void onFiles(list);
              e.target.value = "";
            }}
          />
          {err === "wallet" || payError === "copy" ? (
            <p className="mt-2 font-mono text-[0.65rem] text-muted">sign in with a wallet to publish</p>
          ) : null}
          {err === "rejected" ? (
            <p className="mt-2 font-mono text-[0.65rem] text-muted">transaction dismissed</p>
          ) : null}
          {err === "image" ? (
            <p className="mt-2 font-mono text-[0.65rem] text-muted">needs an image file</p>
          ) : null}
        </div>
      </div>
    </>
  );
}
