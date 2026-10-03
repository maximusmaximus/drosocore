import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import type { SpeechBillboard } from "@/lib/fly-sim";
import { CALLSIGNS } from "@/lib/fly-sim";
import { ROLES } from "@/lib/roles";
import { fetchBalanceWei } from "@/lib/eth";
import { afterAdPayment, afterPayment } from "@/lib/donate";
import { playCelebration, resumeIfNeeded, unlockAudio } from "@/lib/audio";
import { useSim } from "@/lib/store";
import { useAds } from "@/lib/ads-store";
import { useWallet } from "@/lib/wallet-store";
import { useHive } from "@/lib/hive-store";
import { useCi } from "@/lib/ci-store";
import { useNotify } from "@/lib/notify";
import { useMcp } from "@/lib/mcp-store";
import { AD_SPACES } from "@/lib/ad-spaces";
import { adPriceEth } from "@/lib/ads";
import { fileToAdDataUrl, filesFromDrop } from "@/lib/image";
import { useClientMounted } from "@/lib/client-mount";
import type { ProjectedAnchor } from "./scene/InfoAnchors";
import { DonationBar } from "./overlay/DonationBar";
import { ConfettiLayer } from "./overlay/ConfettiLayer";
import { Chrome } from "./overlay/Chrome";
import { SpeechHud } from "./overlay/SpeechLayer";
import { NftBanner } from "./overlay/NftBanner";
import { InfoLayer } from "./overlay/InfoLayer";
import { AdComposer } from "./overlay/AdComposer";
import { WalletModal } from "./overlay/WalletModal";
import { BootScreen } from "./overlay/BootScreen";
import { HiveFeed } from "./overlay/HiveFeed";
import { CiDesk } from "./overlay/CiDesk";
import { NotifyToasts } from "./overlay/NotifyStack";
import { McpDesk } from "./overlay/McpDesk";

const loadWorld = () => import("./scene/World").then((m) => ({ default: m.World }));
const World = lazy(loadWorld);
if (typeof window !== "undefined") void loadWorld();

const FlyInspector = lazy(() => import("./overlay/FlyInspector").then((m) => ({ default: m.FlyInspector })));
const Walkthrough = lazy(() => import("./overlay/Walkthrough").then((m) => ({ default: m.Walkthrough })));
const NftReveal = lazy(() => import("./overlay/NftReveal").then((m) => ({ default: m.NftReveal })));

export function ReactorSim() {
  const onClient = useClientMounted();
  const [hud, setHud] = useState<SpeechBillboard[]>([]);
  const [anchors, setAnchors] = useState<ProjectedAnchor[]>([]);
  const onSpeech = useCallback((items: SpeechBillboard[]) => {
    setHud(items);
  }, []);
  const onAnchors = useCallback((items: ProjectedAnchor[]) => {
    setAnchors(items);
  }, []);

  useEffect(() => {
    useAds.getState().hydrate();
    void useAds.getState().refresh();
    useWallet.getState().hydrate();
    useSim.getState().hydrateGrowth();
    void useHive.getState().hydrate();
    void useCi.getState().hydrate();
    void fetch("/api/agent/training")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j && Array.isArray(j.samples)) {
          return import("@/lib/fly-brain").then((m) => m.ingestTraining(j.samples));
        }
      })
      .catch(() => {});

    const onFirst = () => unlockAudio();
    window.addEventListener("pointerdown", onFirst, { once: true });
    window.addEventListener("keydown", onFirst, { once: true });
    const vis = () => {
      if (document.visibilityState === "visible") resumeIfNeeded();
    };
    document.addEventListener("visibilitychange", vis);

    const celebrate = () => {
      useSim.getState().startCelebration();
      playCelebration();
    };
    window.addEventListener("drosocore:celebrate", celebrate);

    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      const files = filesFromDrop(e.dataTransfer);
      if (!files.length) return;
      e.preventDefault();
      const ads = useAds.getState();
      const target =
        ads.hoveredSpace && !ads.byId[ads.hoveredSpace]
          ? ads.hoveredSpace
          : ads.selectedSpace && !ads.byId[ads.selectedSpace]
            ? ads.selectedSpace
            : AD_SPACES.find((s) => !ads.byId[s.id])?.id;
      if (!target) return;
      void fileToAdDataUrl(files[0]).then((url) => {
        ads.openSpace(target);
        ads.setPendingImage(url);
      });
    };
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);

    (window as unknown as {
      __drosocore?: {
        celebrate: () => void;
        selectFly: (i: number) => void;
        mintPreview: (eth?: number) => void;
        toggleInfo: () => void;
        startGuide: () => void;
        skipGuide: () => void;
        skipBoot: () => void;
        worldReady: () => boolean;
        openAd: (id?: string) => void;
        placeAd: (id?: string) => void;
        openPicker: () => void;
        openWallet: () => void;
        cam: () => { zoom: number; target: { x: number; y: number; z: number }; polar: number | null } | null;
        pinch: (mul: number, x?: number, y?: number) => void;
        tilt: (p: number) => void;
        addEth: (n: number) => void;
        openLog: () => void;
        openCi: () => void;
        closeCi: () => void;
        openMcp: () => void;
        closeMcp: () => void;
        grantStake: (eth?: number) => void;
        deliver: () => void;
        notify: (kind?: "vote" | "vote-end" | "generate" | "delivery") => void;
      };
    }).__drosocore = {
      celebrate,
      selectFly: (i: number) => {
        const role = ROLES[i % ROLES.length];
        useSim.getState().select({
          index: i,
          role,
          seed: i * 17.13 + 2.4,
          name: CALLSIGNS[i % CALLSIGNS.length],
        });
      },
      mintPreview: (eth = 0.15) => afterPayment("preview", eth),
      toggleInfo: () => useSim.getState().toggleInfo(),
      startGuide: () => useSim.getState().startGuide(),
      skipGuide: () => useSim.getState().skipGuide(),
      skipBoot: () => useSim.getState().markWorldReady(),
      worldReady: () => useSim.getState().worldReady,
      openAd: (id) => {
        const ads = useAds.getState();
        const space =
          AD_SPACES.find((s) => s.id === id) ?? AD_SPACES.find((s) => !ads.byId[s.id]) ?? AD_SPACES[0];
        useSim.getState().select(null);
        useSim.getState().setDonationOpen(false);
        ads.openSpace(space.id);
      },
      openPicker: () => {
        useSim.getState().select(null);
        useSim.getState().setDonationOpen(false);
        useAds.getState().openPicker();
      },
      placeAd: (id) => {
        const ads = useAds.getState();
        const space = AD_SPACES.find((s) => s.id === id) ?? AD_SPACES.find((s) => !ads.byId[s.id]) ?? AD_SPACES[0];
        const price = adPriceEth(ads.purchaseCount);
        const c = document.createElement("canvas");
        c.width = 512;
        c.height = 320;
        const g = c.getContext("2d")!;
        g.fillStyle = "#1a222a";
        g.fillRect(0, 0, 512, 320);
        g.fillStyle = "#5eead4";
        g.font = "600 28px IBM Plex Mono, monospace";
        g.fillText("DROSOCORE", 36, 80);
        g.fillStyle = "#e8ecef";
        g.font = "400 22px IBM Plex Mono, monospace";
        g.fillText(space.label, 36, 130);
        const url = c.toDataURL("image/jpeg", 0.8);
        ads.openSpace(space.id);
        ads.setPendingImage(url);
        const record = {
          spaceId: space.id,
          imageUrl: url,
          txHash: "preview",
          priceEth: price,
        };
        ads.placeLocal(record);
        afterAdPayment({
          txHash: "preview",
          spaceLabel: space.label,
          spaceId: space.id,
          priceEth: price,
        });
      },
      openWallet: () => useWallet.getState().openModal(),
      cam: () => {
        const api = (window as unknown as {
          __drosocoreCam?: {
            zoom: () => number;
            target: () => { x: number; y: number; z: number };
            polar: () => number;
            pinchTo: (mul: number, x?: number, y?: number) => void;
            tiltTo: (p: number) => void;
          };
        }).__drosocoreCam;
        if (!api) return null;
        return { zoom: api.zoom(), target: api.target(), polar: api.polar() };
      },
      pinch: (mul: number, x?: number, y?: number) => {
        (window as unknown as { __drosocoreCam?: { pinchTo: (n: number, x?: number, y?: number) => void } }).__drosocoreCam?.pinchTo(mul, x, y);
      },
      tilt: (p: number) => {
        (window as unknown as { __drosocoreCam?: { tiltTo: (n: number) => void } }).__drosocoreCam?.tiltTo(p);
      },
      addEth: (n: number) => useSim.getState().addContribution(n),
      openLog: () => useHive.getState().openLog(),
      openCi: () => {
        useSim.getState().select(null);
        useSim.getState().setDonationOpen(false);
        useCi.getState().setOpen(true);
      },
      closeCi: () => void useCi.getState().closeNow(),
      openMcp: () => {
        useSim.getState().select(null);
        useSim.getState().setDonationOpen(false);
        useMcp.getState().setOpen(true);
      },
      closeMcp: () => useMcp.getState().setOpen(false),
      grantStake: (eth = 0.01) => {
        const addr = useWallet.getState().address ?? "0xdAB2758BDCD16C6FB62c8626206084e4F3B88776";
        void useCi.getState().credit(eth, "preview", `preview:${Date.now()}`, addr);
        useSim.getState().addContribution(eth);
      },
      deliver: () => {
        const desk = useCi.getState().desk;
        const item = desk?.items.find((i) => i.installedAt) ?? desk?.items[0];
        if (item) useCi.getState().startDrop({ ...item, id: item.id + 9000, title: `${item.title} drop` });
      },
      notify: (kind = "vote") => {
        const titles = {
          vote: "ballot is open",
          "vote-end": "window closing · five minutes",
          generate: "Venice is packing",
          delivery: "Gary has the pack",
        } as const;
        const bodies = {
          vote: "Five proposals on the board.",
          "vote-end": "Stake now or the flies keep the tally.",
          generate: "Winner is on the printer.",
          delivery: "Crate on the hook. Air-mail inbound.",
        } as const;
        useNotify.getState().push({
          kind,
          title: titles[kind],
          body: bodies[kind],
          tag: `qa:${kind}:${Date.now()}`,
        });
      },
    };

    let lastBal: bigint | null = null;
    let cancelled = false;
    const poll = async () => {
      const bal = await fetchBalanceWei();
      if (cancelled || bal === null) return;
      if (lastBal !== null && bal > lastBal) {
        const deltaEth = Number(bal - lastBal) / 1e18;
        if (Number.isFinite(deltaEth) && deltaEth > 0) useSim.getState().addContribution(deltaEth);
        celebrate();
      }
      lastBal = bal;
    };
    void poll();
    const id = window.setInterval(() => void poll(), 16000);

    return () => {
      window.removeEventListener("pointerdown", onFirst);
      window.removeEventListener("keydown", onFirst);
      document.removeEventListener("visibilitychange", vis);
      window.removeEventListener("drosocore:celebrate", celebrate);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
      window.clearInterval(id);
      cancelled = true;
    };
  }, []);

  return (
    <main className="relative isolate z-0 h-dvh w-full overflow-hidden bg-bg" onPointerDown={() => unlockAudio()}>
      <Suspense fallback={null}>
        <World onSpeech={onSpeech} onAnchors={onAnchors} />
      </Suspense>
      <SpeechHud items={hud} />
      <InfoLayer anchors={anchors} />
      <HiveFeed />
      <CiDesk />
      <McpDesk />
      <NotifyToasts />
      <Chrome />
      <NftBanner />
      <DonationBar />
      <AdComposer />
      <WalletModal />
      {onClient ? (
        <Suspense fallback={null}>
          <FlyInspector />
          <Walkthrough />
          <NftReveal />
        </Suspense>
      ) : null}
      <ConfettiLayer />
      <BootScreen />
    </main>
  );
}

