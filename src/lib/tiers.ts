import type { Role } from "./roles";

export type StageId = "larva" | "pupa" | "imago" | "foreman" | "wizard";

export type Tier = {
  id: StageId;
  eth: number;
  label: string;
  subtitle: string;
  blurb: string;
};

export const TIERS: Tier[] = [
  { id: "larva", eth: 0.01, label: "larva", subtitle: "hatch", blurb: "first instar · named crew" },
  { id: "pupa", eth: 0.05, label: "pupa", subtitle: "molt", blurb: "chrysalis · same worker" },
  { id: "imago", eth: 0.15, label: "imago", subtitle: "worker", blurb: "on shift · full anatomy" },
  { id: "foreman", eth: 0.4, label: "foreman", subtitle: "lead", blurb: "pad boss · white hat" },
  { id: "wizard", eth: 1, label: "wizard", subtitle: "archon", blurb: "connectome · cape and staff" },
];

export const MIN_NFT_ETH = 0.01;

export function tierFromEth(eth: number): Tier {
  let found = TIERS[0];
  for (const t of TIERS) {
    if (eth + 1e-9 >= t.eth) found = t;
  }
  return found;
}

export function clampEth(n: number): number {
  if (!Number.isFinite(n)) return MIN_NFT_ETH;
  return Math.min(1, Math.max(MIN_NFT_ETH, Math.round(n * 100) / 100));
}

export type NftTraits = {
  name: string;
  job: string;
  tool: string;
  designation: string;
  roleId: string;
  stage: StageId;
  level: string;
  contributionEth: number;
  seed: number;
  accent: string;
};

export function traitsFrom(role: Role, name: string, seed: number, eth: number): NftTraits {
  const tier = tierFromEth(eth);
  return {
    name,
    job: role.title,
    tool: role.tool,
    designation: role.designation,
    roleId: role.id,
    stage: tier.id,
    level: tier.label,
    contributionEth: eth,
    seed,
    accent: role.accent,
  };
}
