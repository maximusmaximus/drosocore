import type { NftTraits, StageId } from "./tiers";

export type MembershipCard = {
  kind: "fly" | "supporter";
  name: string;
  job: string;
  rank: string;
  stage: StageId;
  eth: string;
  designation?: string;
  tool?: string;
  accent: string;
  txHash?: string;
  spaceLabel?: string;
  portraitDataUrl?: string | null;
};

const FACE = "'IBM Plex Mono', ui-monospace, monospace";

export function composeMembershipCard(opts: MembershipCard): Promise<string> {
  const portrait = opts.portraitDataUrl;
  if (!portrait) return Promise.resolve(paintCard(opts, null));
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(paintCard(opts, img));
    img.onerror = () => resolve(paintCard(opts, null));
    img.src = portrait;
  });
}

export function renderNftCard(traits: NftTraits, portraitDataUrl?: string | null): Promise<string> {
  return composeMembershipCard({
    kind: "fly",
    name: traits.name,
    job: traits.job,
    rank: traits.level,
    stage: traits.stage,
    eth: `${traits.contributionEth} ETH`,
    designation: traits.designation,
    tool: traits.tool,
    accent: traits.accent,
    portraitDataUrl,
  });
}

export function renderSupporterCard(
  opts: {
    spaceLabel: string;
    priceEth: string;
    txHash: string;
  },
  portraitDataUrl?: string | null,
): Promise<string> {
  return composeMembershipCard({
    kind: "supporter",
    name: "I supported fly reactor!",
    job: opts.spaceLabel,
    rank: "supporter",
    stage: "imago",
    eth: `${opts.priceEth} ETH`,
    accent: "#5eead4",
    txHash: opts.txHash,
    spaceLabel: opts.spaceLabel,
    portraitDataUrl,
  });
}

function paintCard(opts: MembershipCard, portrait: CanvasImageSource | null): string {
  const s = 1024;
  const c = document.createElement("canvas");
  c.width = s;
  c.height = s;
  const ctx = c.getContext("2d");
  if (!ctx) return "";

  ctx.fillStyle = "#12161b";
  ctx.fillRect(0, 0, s, s);
  const wash = ctx.createRadialGradient(s / 2, 380, 20, s / 2, 420, 560);
  wash.addColorStop(0, "#1c2228");
  wash.addColorStop(1, "#12161b");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, s, s);

  ctx.strokeStyle = "rgba(94,234,212,0.07)";
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.ellipse(s / 2, 418, 360, 148, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#5eead4";
  ctx.font = `600 26px ${FACE}`;
  ctx.textAlign = "left";
  ctx.fillText("DROSOCORE", 56, 64);
  ctx.textAlign = "right";
  ctx.fillStyle = "#9aa3ad";
  ctx.font = `500 22px ${FACE}`;
  ctx.fillText(opts.rank.toUpperCase(), s - 56, 64);

  ctx.strokeStyle = "rgba(232,236,239,0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(56, 84);
  ctx.lineTo(s - 56, 84);
  ctx.stroke();

  const cx = s / 2;
  const cy = 392;
  const r = 288;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  if (portrait) {
    ctx.drawImage(portrait, cx - r, cy - r, r * 2, r * 2);
  } else {
    ctx.fillStyle = "#1a1e24";
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    drawFly(ctx, cx, cy + 16, opts.stage, opts.accent);
  }
  ctx.restore();
  ctx.strokeStyle = opts.accent || "#5eead4";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(232,236,239,0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 10, 0, Math.PI * 2);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "#e8ecef";
  ctx.font = `600 44px ${FACE}`;
  if (opts.kind === "supporter") {
    wrapLine(ctx, opts.name, s / 2, 742, 900, 48);
  } else {
    ctx.fillText(opts.name, s / 2, 758);
  }
  ctx.fillStyle = "#9aa3ad";
  ctx.font = `400 24px ${FACE}`;
  ctx.fillText(opts.job, s / 2, opts.kind === "supporter" ? 838 : 802);
  ctx.fillStyle = "#5eead4";
  ctx.font = `500 22px ${FACE}`;
  ctx.fillText(`${opts.rank}  ·  ${opts.eth}`, s / 2, opts.kind === "supporter" ? 878 : 848);
  ctx.fillStyle = "#6b7380";
  ctx.font = `400 18px ${FACE}`;
  const foot =
    opts.kind === "supporter"
      ? trimHash(opts.txHash)
      : [opts.tool, opts.designation].filter(Boolean).join("  ·  ");
  if (foot) ctx.fillText(foot, s / 2, opts.kind === "supporter" ? 920 : 888);

  return c.toDataURL("image/jpeg", 0.92);
}

function trimHash(hash?: string): string {
  if (!hash) return "";
  return hash.length > 18 ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : hash;
}

function wrapLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lh: number,
) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lh;
    } else line = next;
  }
  if (line) ctx.fillText(line, x, yy);
}

/** Fallback plate art if the WebGL studio cannot capture. Still Drosophila, not a sticker. */
function drawFly(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  stage: StageId,
  accent: string,
) {
  ctx.save();
  ctx.translate(x, y);
  if (stage === "larva") {
    ctx.fillStyle = "#d8c08a";
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.ellipse(-108 + i * 30, Math.sin(i * 0.9) * 7, 26 - i * 1.4, 20 - i * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#3a2014";
    ctx.beginPath();
    ctx.arc(-118, -4, 3, 0, Math.PI * 2);
    ctx.arc(-118, 8, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  if (stage === "pupa") {
    ctx.fillStyle = "#8a5a32";
    ctx.beginPath();
    ctx.ellipse(0, 8, 64, 118, 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(40,20,10,0.45)";
    ctx.lineWidth = 4;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(0, -40 + i * 36, 52 - i * 4, 16, 0.08, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  ctx.strokeStyle = "rgba(210,228,236,0.55)";
  ctx.lineWidth = 2;
  ctx.fillStyle = "rgba(216,236,246,0.32)";
  ctx.beginPath();
  ctx.ellipse(-86, -18, 128, 36, -0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(86, -18, 128, 36, 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(80,100,110,0.45)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-20, -12);
  ctx.quadraticCurveTo(-90, -40, -180, -8);
  ctx.moveTo(20, -12);
  ctx.quadraticCurveTo(90, -40, 180, -8);
  ctx.stroke();

  ctx.strokeStyle = "#2a1c14";
  ctx.lineWidth = 3.2;
  const legs: [number, number, number, number][] = [
    [-18, 18, -70, 78],
    [18, 18, 70, 78],
    [-8, 28, -52, 96],
    [8, 28, 52, 96],
    [4, 38, 38, 108],
    [-4, 38, -38, 108],
  ];
  for (const [ax, ay, bx, by] of legs) {
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo((ax + bx) / 2 - 6, (ay + by) / 2 + 8);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }

  ctx.fillStyle = "#c4a06a";
  ctx.beginPath();
  ctx.ellipse(0, 8, 58, 48, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e0c080";
  ctx.beginPath();
  ctx.ellipse(0, 78, 42, 70, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(40,22,10,0.55)";
  for (const yy of [48, 72, 96, 118]) {
    ctx.fillRect(-36, yy, 72, 7);
  }

  ctx.fillStyle = "#4a3020";
  ctx.beginPath();
  ctx.ellipse(0, -28, 44, 36, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e23a32";
  ctx.beginPath();
  ctx.ellipse(-26, -34, 22, 26, -0.18, 0, Math.PI * 2);
  ctx.ellipse(26, -34, 22, 26, 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,220,200,0.25)";
  ctx.beginPath();
  ctx.ellipse(-22, -40, 8, 10, 0, 0, Math.PI * 2);
  ctx.ellipse(30, -40, 8, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#1a120c";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-10, -58);
  ctx.quadraticCurveTo(-18, -88, -8, -108);
  ctx.moveTo(10, -58);
  ctx.quadraticCurveTo(18, -88, 8, -108);
  ctx.stroke();

  ctx.fillStyle = accent;
  ctx.fillRect(-18, -62, 36, 10);

  if (stage === "foreman" || stage === "wizard") {
    ctx.fillStyle = stage === "wizard" ? "#1a2430" : "#e8ecef";
    ctx.beginPath();
    ctx.moveTo(-34, -64);
    ctx.lineTo(34, -64);
    ctx.lineTo(22, -92);
    ctx.lineTo(-22, -92);
    ctx.closePath();
    ctx.fill();
  }
  if (stage === "wizard") {
    ctx.strokeStyle = "#c9d0d6";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(78, 90);
    ctx.lineTo(108, -70);
    ctx.stroke();
    ctx.fillStyle = "#5eead4";
    ctx.beginPath();
    ctx.arc(112, -82, 14, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
