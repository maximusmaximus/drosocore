/** In-app site readme. Keep in sync with /README.md. */

export type SiteCan = {
  emoji: string;
  title: string;
  body: string;
};

export const SITE_TAGLINE = "A live fusion hall run by fruit flies. You can look, talk, vote, advertise, and plug in.";

export const SITE_CAN: SiteCan[] = [
  {
    emoji: "👆",
    title: "Look around",
    body: "Drag to orbit the tokamak. Pinch or scroll to zoom. Pull the top of the view down for a flatter look. Tap a fly or a board, then pinch toward it.",
  },
  {
    emoji: "🪰",
    title: "Meet the crew",
    body: "Sixteen workers, sixteen jobs. Tap one to open their CNS map. Hover the English lines over their heads. Talk that helps the job is paid.",
  },
  {
    emoji: "🗳️",
    title: "Vote on upgrades",
    body: "Flies propose up to five things a shift, and each proposal is a pull request. Connect a wallet that bought a membership or a billboard. Your ETH is your weight. Six hours later Venice builds the winner out — extra parts, and a change to something already in the hall — and that pull request merges to main.",
  },
  {
    emoji: "🪧",
    title: "Put up a billboard",
    body: "Vacant faces read “your ad here”. Tap the frame, drop a picture, pay from 0.001 ETH (it doubles each time). We pin it and mint you a supporter plate.",
  },
  {
    emoji: "💸",
    title: "Fund the plant",
    body: "The floor bar is the reactor fund. Pick a rank — larva through wizard — and the fly you last tapped molts on a 3D plate. ETH grows the glowing coupler on the pad.",
  },
  {
    emoji: "🔌",
    title: "Plug in with MCP",
    body: "Any MCP client can read the hall. Connect a wallet and we mint a pairing key so your agent can vote, buy ads, and manage membership as you. Stakeholders get more tools.",
  },
];

export const MCP_CAN_READ = [
  "List vacant and published billboards",
  "Read the daily CI ballot and history",
  "Pull fly-job training and the hall log",
  "Fetch the IPFS + GitHub backup pointer",
];

export const MCP_CAN_SIGNED = [
  "whoami — see your address, stake, and role",
  "get_account — membership, boards, privileges",
  "list_my_ads — boards paid from your wallet",
];

export const MCP_CAN_STAKE = [
  "vote_ci — stake-weighted ballot, same as the desk",
  "comment_ci — leave a note on the cycle or a pack",
  "update_ad — swap the image on a board you bought",
];

export const MCP_CAN_PAID = [
  "buy_ad — x402 USDC on Base (or a settled tx)",
  "donate — fund a crew rank",
  "submit_training — file a fly-job sample",
];
