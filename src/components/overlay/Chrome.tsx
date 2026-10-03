import { Frame, Github, Info, Volume2, VolumeX, Wallet } from "lucide-react";
import { GITHUB_URL } from "@/lib/constants";
import { useAds } from "@/lib/ads-store";
import { setMuted, unlockAudio } from "@/lib/audio";
import { shortAddress } from "@/lib/eth";
import { useSim } from "@/lib/store";
import { useWallet } from "@/lib/wallet-store";
import { InfoMark } from "./InfoMark";
import { McpChip } from "./McpDesk";

function cue(on: boolean, pop = true) {
  return on ? (pop ? " cue-pulse cue-pop" : " cue-pulse") : "";
}

export function Chrome() {
  const muted = useSim((s) => s.muted);
  const infoOn = useSim((s) => s.infoOn);
  const cues = useSim((s) => s.cues);
  const address = useWallet((s) => s.address);
  const connected = useWallet((s) => s.status === "connected" && Boolean(s.address));
  const adsOpen = useAds((s) => s.pickerOpen || Boolean(s.selectedSpace));

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-50 flex items-start justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="flex items-start gap-2">
        <div className="relative">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="DROSOCORE on GitHub"
            className={
              "pointer-events-auto inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface-2 text-fg" +
              cue(cues.github)
            }
            onClick={() => useSim.getState().markCue("github")}
          >
            <Github className="size-5" />
          </a>
          <div className="absolute -right-2 -top-2">
            <InfoMark id="github" />
          </div>
        </div>
        <McpChip />
      </div>
      <div className="flex items-start gap-2">
        <div className="relative">
          <button
            type="button"
            aria-label="billboards"
            aria-pressed={adsOpen}
            className={
              "pointer-events-auto inline-flex size-11 items-center justify-center rounded-full border border-border " +
              (adsOpen ? "bg-accent text-accent-fg" : "bg-surface-2 text-fg")
            }
            onClick={() => {
              useSim.getState().select(null);
              useSim.getState().setDonationOpen(false);
              useAds.getState().openPicker();
            }}
          >
            <Frame className="size-4" />
          </button>
          <div className="absolute -left-2 -top-2">
            <InfoMark id="ads" />
          </div>
        </div>
        <div className="relative">
          <button
            type="button"
            aria-label={connected && address ? `wallet ${shortAddress(address)}` : "connect wallet"}
            aria-pressed={connected}
            className={
              "pointer-events-auto inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-border px-3 " +
              (connected ? "bg-accent text-accent-fg" : "bg-surface-2 text-fg") +
              cue(cues.wallet && !connected)
            }
            onClick={() => {
              useSim.getState().markCue("wallet");
              useWallet.getState().openModal();
            }}
          >
            <Wallet className="size-4" />
            <span className="hidden font-mono text-[0.7rem] sm:inline">
              {connected && address ? shortAddress(address) : "wallet"}
            </span>
          </button>
          <div className="absolute -left-2 -top-2">
            <InfoMark id="wallet" />
          </div>
        </div>
        <button
          type="button"
          aria-label={infoOn ? "hide info" : "show info"}
          aria-pressed={infoOn}
          className={
            "pointer-events-auto inline-flex size-11 items-center justify-center rounded-full border border-border " +
            (infoOn ? "bg-accent text-accent-fg" : "bg-surface-2 text-fg") +
            cue(cues.info && !infoOn)
          }
          onClick={() => {
            const was = useSim.getState().infoOn;
            useSim.getState().toggleInfo();
            if (!was) useSim.getState().openTip("info");
          }}
        >
          <Info className="size-5" />
        </button>
        <div className="relative">
          <button
            type="button"
            aria-label={muted ? "unmute" : "mute"}
            className={
              "pointer-events-auto inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface-2 text-fg" +
              cue(cues.audio)
            }
            onClick={() => {
              unlockAudio();
              useSim.getState().toggleMuted();
              setMuted(!muted);
            }}
          >
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </button>
          <div className="absolute -left-2 -top-2">
            <InfoMark id="audio" />
          </div>
        </div>
      </div>
    </div>
  );
}
