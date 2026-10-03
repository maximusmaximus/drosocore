import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { MemberStudio } from "@/components/scene/MemberStudio";
import { gearForRole } from "@/lib/ci";
import { useCi } from "@/lib/ci-store";
import { roleById } from "@/lib/roles";
import { metadataForMint } from "@/lib/donate";
import { pinFlyNft } from "@/lib/mint";
import { composeMembershipCard } from "@/lib/nft-card";
import { useSim } from "@/lib/store";

export function NftReveal() {
  const minted = useSim((s) => s.minted);
  const status = useSim((s) => s.mintStatus);
  const err = useSim((s) => s.mintError);
  const world = useCi((s) => s.world);
  const sealed = useRef(false);
  const [ready, setReady] = useState(false);
  const [card, setCard] = useState<string | null>(null);

  useEffect(() => {
    if (!minted) {
      sealed.current = false;
      setReady(false);
      setCard(null);
      return;
    }
    const show = window.setTimeout(() => setReady(true), 80);
    const fallback = window.setTimeout(() => {
      void seal(null);
    }, 3200);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(fallback);
    };
  }, [minted]);

  const seal = async (portrait: string | null) => {
    const current = useSim.getState().minted;
    if (!current || sealed.current) return;
    sealed.current = true;
    const meta = metadataForMint();
    if (!meta) {
      useSim.getState().failMint("meta");
      return;
    }
    let dataUrl = current.cardDataUrl ?? "";
    try {
      if (!dataUrl) {
        dataUrl = current.traits
          ? await composeMembershipCard({
              kind: "fly",
              name: current.traits.name,
              job: current.traits.job,
              rank: current.traits.level,
              stage: current.traits.stage,
              eth: `${current.traits.contributionEth} ETH`,
              designation: current.traits.designation,
              tool: current.traits.tool,
              accent: current.traits.accent,
              portraitDataUrl: portrait,
            })
          : await composeMembershipCard({
              kind: "supporter",
              name: current.title,
              job: current.spaceLabel ?? "billboard",
              rank: "supporter",
              stage: "imago",
              eth: `${current.priceEth ?? "0.001"} ETH`,
              accent: "#5eead4",
              txHash: current.txHash,
              spaceLabel: current.spaceLabel ?? "billboard",
              portraitDataUrl: portrait,
            });
      }
    } catch {
      dataUrl = "";
    }
    setCard(dataUrl || null);
    if (!dataUrl) {
      useSim.getState().failMint("capture");
      return;
    }
    const filename =
      current.kind === "supporter"
        ? `drosocore-supporter-${current.spaceId ?? "ad"}.jpg`
        : `drosocore-${(current.traits?.name ?? "fly").toLowerCase()}-${current.traits?.stage ?? "imago"}.jpg`;
    void pinFlyNft({
      data: {
        imageBase64: dataUrl,
        filename,
        metadata: meta,
      },
    })
      .then((r) => {
        useSim.getState().finishMint({
          imageUrl: r.imageUrl,
          metadataUrl: r.metadataUrl,
          tokenUri: r.tokenUri,
          cid: r.cid,
        });
      })
      .catch((e: unknown) => {
        console.error("pin", e);
        useSim.getState().failMint("pin");
      });
  };

  if (!minted) return null;
  const supporter = minted.kind === "supporter";
  const role = minted.traits ? roleById(minted.traits.roleId) : roleById("inspector");
  const stage = minted.traits?.stage ?? "imago";
  const seed = minted.traits?.seed ?? 77.7;
  const upgrade = gearForRole(world, role.id);

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center p-3">
      <button
        type="button"
        aria-label="close minted"
        className="pointer-events-auto absolute inset-0 bg-bg/55"
        onClick={() => useSim.getState().closeMinted()}
      />
      <div className="pointer-events-auto relative flex w-full max-w-2xl flex-col items-center gap-3">
        <button
          type="button"
          aria-label="close"
          className="absolute -top-1 right-0 z-10 inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface text-fg"
          onClick={() => useSim.getState().closeMinted()}
        >
          <X className="size-4" />
        </button>
        <div
          data-no-pinch
          className="h-[min(62dvh,28rem)] w-full overflow-hidden rounded-xl border border-border bg-surface shadow-[0_24px_70px_rgba(0,0,0,0.6)]"
        >
          {ready ? (
            <MemberStudio
              role={role}
              stage={stage}
              seed={seed}
              upgrade={upgrade}
              className="size-full"
              capture={(url) => {
                void seal(url || null);
              }}
            />
          ) : (
            <div className="size-full bg-surface-2" />
          )}
        </div>
        <div className="w-full rounded-lg border border-border bg-surface/90 px-4 py-3 text-center">
          <p className="font-mono text-[0.65rem] uppercase tracking-wide text-accent">
            {supporter ? "supporter plate" : `${stage} membership`}
          </p>
          <p className="mt-1 font-mono text-sm text-fg">{minted.title}</p>
          {supporter ? (
            <p className="mt-1 font-mono text-xs text-muted">
              {minted.spaceLabel} · {minted.priceEth} ETH
            </p>
          ) : minted.traits ? (
            <>
              <p className="mt-1 font-mono text-xs text-muted">
                {minted.traits.job} · {minted.traits.level} · {minted.traits.contributionEth} ETH
              </p>
              <p className="mt-1 font-mono text-[0.7rem] text-subtle">{minted.traits.tool}</p>
            </>
          ) : null}
          {status === "pinning" ? (
            <p className="mt-2 font-mono text-[0.7rem] text-accent">minting the 3D plate to ipfs…</p>
          ) : null}
          {status === "ready" && minted.imageUrl ? (
            <a
              href={minted.metadataUrl ?? minted.imageUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block font-mono text-[0.7rem] text-accent underline"
            >
              token metadata
            </a>
          ) : null}
          {status === "error" ? (
            <p className="mt-2 font-mono text-[0.7rem] text-muted">
              {err === "pin" ? "ipfs pin delayed · token still minted locally" : "capture delayed"}
            </p>
          ) : null}
        </div>
        {card ? (
          <img
            src={card}
            alt=""
            className="w-full max-w-[16rem] rounded-md border border-border outline outline-1 -outline-offset-1 outline-white/10"
          />
        ) : null}
      </div>
    </div>
  );
}
