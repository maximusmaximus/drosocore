/** Map contributed ETH → the contribution plant's visual growth. Pure numbers. */

export type Growth = {
  level: number;
  scale: number;
  height: number;
  glow: number;
  wires: number;
  modules: number;
  pulse: number;
  radius: number;
};

export function growthFromEth(eth: number): Growth {
  const e = Number.isFinite(eth) && eth > 0 ? eth : 0;
  const t = 1 - Math.exp(-e * 2.15);
  const level = Math.min(12, Math.floor(Math.log2(1 + e * 96)));
  return {
    level,
    scale: 0.95 + t * 1.45,
    height: 1.18 + t * 2.55 + level * 0.08,
    glow: 0.72 + t * 4.15,
    wires: 2 + level,
    modules: Math.min(9, Math.max(2, Math.floor(2 + t * 7 + level * 0.35))),
    pulse: 1.05 + t * 2.9,
    radius: 0.48 + t * 0.62,
  };
}
