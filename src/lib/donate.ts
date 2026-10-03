import { playCelebration, unlockAudio } from "./audio";
import { sendEth } from "./eth";
import { buildNftMetadata, buildSupporterMetadata } from "./nft";
import { useSim } from "./store";
import { traitsFrom } from "./tiers";
import { useWallet } from "./wallet-store";
import { useCi } from "./ci-store";

export async function contribute(amount: number): Promise<"ok" | "copy" | "need-wallet" | "rejected"> {
  unlockAudio();
  const wallet = useWallet.getState();
  if (wallet.status !== "connected" || !wallet.address) {
    wallet.openModal();
    return "need-wallet";
  }
  const hash = await sendEth(amount, wallet.address);
  afterPayment(hash, amount);
  return "ok";
}

export function afterPayment(txHash: string, amount: number) {
  const fly = useSim.getState().mostClicked();
  const traits = traitsFrom(fly.role, fly.name, fly.seed, amount);
  useSim.getState().addContribution(amount);
  useSim.getState().beginMint({ kind: "fly", traits, txHash });
  void useCi.getState().credit(amount, "membership", txHash);
  window.setTimeout(() => {
    useSim.getState().startCelebration();
    playCelebration();
  }, 120);
}

export function afterAdPayment(opts: {
  txHash: string;
  spaceLabel: string;
  spaceId: string;
  priceEth: string;
  cardDataUrl?: string;
}) {
  const eth = Number(opts.priceEth);
  if (Number.isFinite(eth) && eth > 0) {
    useSim.getState().addContribution(eth);
    void useCi.getState().credit(eth, "ads", opts.txHash);
  }
  useSim.getState().beginMint({
    kind: "supporter",
    traits: null,
    txHash: opts.txHash,
    title: "I supported fly reactor!",
    spaceLabel: opts.spaceLabel,
    spaceId: opts.spaceId,
    priceEth: opts.priceEth,
    cardDataUrl: opts.cardDataUrl,
  });
  window.setTimeout(() => {
    useSim.getState().startCelebration();
    playCelebration();
  }, 120);
}

export function metadataForMint() {
  const minted = useSim.getState().minted;
  if (!minted) return null;
  if (minted.kind === "supporter") {
    return buildSupporterMetadata({
      spaceLabel: minted.spaceLabel ?? "billboard",
      priceEth: minted.priceEth ?? "0.001",
      txHash: minted.txHash,
      spaceId: minted.spaceId ?? "ad",
    });
  }
  const t = minted.traits;
  if (!t) return null;
  return buildNftMetadata({
    name: t.name,
    job: t.job,
    tool: t.tool,
    designation: t.designation,
    level: t.level,
    contributionEth: t.contributionEth,
    stage: t.stage,
    roleId: t.roleId,
    txHash: minted.txHash,
    seed: t.seed,
  });
}
