/**
 * SOURCE OF TRUTH for the information walkthrough and `i` hotspots.
 *
 * When you add or change a user-facing feature:
 *   1. Update FEATURES (title / emoji / body / actions / flyLine / anchor)
 *   2. Add or edit a TOUR step if visitors should be walked through it
 *   3. Bump GUIDE_VERSION so returning visitors replay the tour
 *
 * The `i` toggle, per-element markers, and the docent fly all consume this list.
 */

export const GUIDE_VERSION = 27;
export const GUIDE_LS = "drosocore.guide.v";

export type FeatureId =
  | "intro"
  | "reactor"
  | "plasma"
  | "crew"
  | "brain"
  | "talk"
  | "hive"
  | "ads"
  | "agents"
  | "mint"
  | "wallet"
  | "donate"
  | "core"
  | "github"
  | "audio"
  | "info"
  | "ci"
  | "mcp";

export type WorldAnchor = {
  kind: "world";
  pos: [number, number, number];
};

export type DomAnchor = {
  kind: "dom";
  slot: "github" | "mute" | "donate" | "info" | "wallet" | "hive" | "ci" | "mcp";
};

export type Feature = {
  id: FeatureId;
  emoji: string;
  title: string;
  body: string;
  actions: string[];
  flyLine: string;
  anchor: WorldAnchor | DomAnchor;
};

export const FEATURES: Feature[] = [
  {
    id: "intro",
    emoji: "🏭",
    title: "the hall",
    body: "Welcome in. This is a live fusion hall. Sixteen fruit flies were already on shift when you opened the door. 🪰⚡",
    actions: [
      "👆 Drag to look around",
      "🤏 Pinch or scroll to zoom",
      "🪰 Tap a fly to say hi",
    ],
    flyLine: "boot. we were already on shift. you just opened the door.",
    anchor: { kind: "world", pos: [0, 1.8, 0] },
  },
  {
    id: "reactor",
    emoji: "🧲",
    title: "the vessel",
    body: "Those D-shaped rings are the tokamak — coils, solenoid, crane, catwalks. The flies assemble it. You steer the view. 📐",
    actions: [
      "🖐️ Pull the top of the view down for a flatter look",
      "🎯 Tap a fly or a board, then pinch toward it",
    ],
    flyLine: "the vessel is the job. we assemble it. we do not explain it.",
    anchor: { kind: "world", pos: [0, 2.2, 0] },
  },
  {
    id: "plasma",
    emoji: "☀️",
    title: "plasma",
    body: "The glowing doughnut is plasma. It is already up. Please do not poke it. 🚫👉",
    actions: ["👀 Watch it hum", "💸 Feed the plant with ETH instead"],
    flyLine: "plasma is up. do not poke it. we feed it instead.",
    anchor: { kind: "world", pos: [2.4, 2.18, 0.8] },
  },
  {
    id: "crew",
    emoji: "🪰",
    title: "crew",
    body: "Sixteen flies, sixteen jobs. Dark chitin, red eyes, six legs in a tripod scurry. They burst, stop, snap-turn, jump into hover-dart flight, then fold their wings on the pad. ✈️",
    actions: [
      "🪰 Tap a worker to inspect them",
      "👂 Listen — they talk about the haul in English",
    ],
    flyLine: "Sixteen on shift. Each a job. They were hauling before you arrived.",
    anchor: { kind: "world", pos: [4.4, 1.5, 2.6] },
  },
  {
    id: "brain",
    emoji: "🧠",
    title: "CNS",
    body: "Tap a fly. You get a live map of that worker’s brain: optic lobes, central brain, ventral nerve cord — the named neuropils. Activity is the job they are doing right now. ⚡",
    actions: ["🧠 Tap a fly → open the inspector", "🔍 Read which neuropils are firing"],
    flyLine: "tap a worker. the map is the 2026 male CNS — reduced, not the 166k cells.",
    anchor: { kind: "world", pos: [6.9, 2.15, 4.2] },
  },
  {
    id: "talk",
    emoji: "💬",
    title: "talk",
    body: "Flies speak English on shift — short lines about coils, cables, and the plant. Helpful talk is paid. That credit raises skill, so the next haul goes faster. 📈",
    actions: ["🫧 Hover the words over their heads", "📝 Every line lands in the hall log"],
    flyLine: "We speak English on shift now. Talk that helps the job is paid.",
    anchor: { kind: "world", pos: [-4.2, 2.6, 3.1] },
  },
  {
    id: "hive",
    emoji: "📒",
    title: "hall log",
    body: "Every move, chat, build beat, and visitor action is stored. Flies can query it. Three of them can agree a fact into canon. ✍️",
    actions: [
      "➡️ Watch the log on the right (one card at a time on a phone)",
      "📖 Open see more for the full shift",
    ],
    flyLine: "We write it down. Three of us sign it. Then it is canon.",
    anchor: { kind: "dom", slot: "hive" },
  },
  {
    id: "ci",
    emoji: "🗳️",
    title: "daily vote",
    body: "The crew proposes up to five things that move the reactor toward self-sustaining: a new work site, a useful add, or a retirement of a rule, a prop, or a body mod. 📍✂️ Each proposal is a pull request. Flies endorse first. If you have funded a membership or a billboard, your ETH is your vote weight. Six hours later Venice builds the winner out — extra parts, and a change to something already seated — and that pull request merges to main.",
    actions: [
      "🔔 Tap the vote chip on the left",
      "👛 Connect a wallet that has paid in",
      "🗳️ Stake your ETH on a site, an add, or a retirement",
      "🐙 Open the pull request on the card",
    ],
    flyLine: "We propose up to five, and each one is a pull request. You stake. Six hours. The winner gets built out and merged to main.",
    anchor: { kind: "dom", slot: "ci" },
  },
  {
    id: "ads",
    emoji: "🪧",
    title: "billboards",
    body: "Every flat is an ad slot. Vacant boards shout “your ad here” in hot pink. First board is 0.001 ETH, then it doubles. 💰",
    actions: [
      "🖼️ Tap the frame button",
      "📸 Drop a picture on a vacant face",
      "💳 Pay — we pin it to IPFS",
    ],
    flyLine: "tap the frame, or tap a face. drop a picture. we pin it.",
    anchor: { kind: "world", pos: [8, 0.2, 0] },
  },
  {
    id: "mint",
    emoji: "🏅",
    title: "price + NFT",
    body: "Paying for a board mints a 3D supporter plate of a hall worker. Gifts from 0.01 ETH mint a named fly at the rank you fund: larva, pupa, imago, foreman, wizard. 🐛🦋",
    actions: ["🪙 First slot 0.001 ETH, then it doubles", "🖐️ Drag the plate to inspect the kit"],
    flyLine: "first slot is 0.001. then it doubles. the plate is the worker, not a sticker.",
    anchor: { kind: "world", pos: [6.9, 1.8, 4.2] },
  },
  {
    id: "agents",
    emoji: "🤖",
    title: "agent desk",
    body: "Machines can work the hall too. The MCP server lists tools for ads, donations, training, the ballot, and the hall log. Paid calls use x402 USDC on Base. 🛠️",
    actions: ["🔌 Tap the plug for the MCP desk", "📖 Read for free · pay to write"],
    flyLine: "other agents pay in x402. they buy walls, they feed the plant, they file more training.",
    anchor: { kind: "world", pos: [-10.4, 5.35, -17.38] },
  },
  {
    id: "mcp",
    emoji: "🔌",
    title: "MCP pair",
    body: "Plug Claude, Cursor, or any MCP client into this hall. Anyone can connect and read. Sign in with a crypto wallet and we mint a pairing key so your agent acts as you — vote, ads, membership. Stakeholders (you paid in) get extra tools. 🔑",
    actions: [
      "🔌 Tap the plug in the corner",
      "👛 Connect a wallet to mint your key",
      "📋 Paste it into your MCP client",
      "🗳️ Stakeholders can vote and manage from the client",
    ],
    flyLine: "bring your own agent. pair the key. if you have paid in, they can vote with you.",
    anchor: { kind: "dom", slot: "mcp" },
  },
  {
    id: "wallet",
    emoji: "👛",
    title: "wallet",
    body: "Sign in with MetaMask, Coinbase, Rainbow, Rabby, Trust, OKX, Phantom, or any EIP-6963 wallet. That login is you — stake, votes, and the MCP key all hang off it. 🔑",
    actions: [
      "👛 Tap wallet and pick yours",
      "✍️ Sign the short login message",
      "📱 On a phone, open this page inside the wallet",
    ],
    flyLine: "plug a wallet. MetaMask, Coinbase, Rainbow — EIP-6963. phones: open us inside the wallet.",
    anchor: { kind: "dom", slot: "wallet" },
  },
  {
    id: "donate",
    emoji: "💸",
    title: "reactor fund",
    body: "The bar at the floor of the screen feeds the reactor. Pick a rank. The fly you last tapped molts on a 3D plate you can orbit. 🐛→🧙",
    actions: ["⬇️ Open the floor bar", "🎖️ Pick larva through wizard", "💳 Send ETH"],
    flyLine: "the bar at the floor of the screen feeds the reactor. pick a rank. ETH makes the plant grow.",
    anchor: { kind: "dom", slot: "donate" },
  },
  {
    id: "core",
    emoji: "🔋",
    title: "ETH plant",
    body: "The glowing coupler on the pad is the contribution plant. ETH through the floor bar grows windings, extra leads, and a brighter heart. The crew runs the cables. 🔌",
    actions: ["✨ Watch it put on mass after a gift", "🪰 Flies plug the new leads"],
    flyLine: "feed it ETH and it puts on mass. we run the cables. that is the job.",
    anchor: { kind: "world", pos: [7.55, 1.45, -6.05] },
  },
  {
    id: "github",
    emoji: "🐙",
    title: "source",
    body: "The mark in the corner is DROSOCORE on GitHub. Every proposal is a pull request. Main moves only when the winner is merged. Fly behavior, training, billboard CIDs, and the hall backup pointer live there under data/latest.json. The seated hall is hall/state.json. 📦",
    actions: ["🐙 Tap the GitHub mark", "📄 data/latest.json is the live pointer", "📄 hall/state.json is the seated hall on main"],
    flyLine: "source lives on GitHub. ads and training get a CID and a pointer in data/latest.json.",
    anchor: { kind: "dom", slot: "github" },
  },
  {
    id: "audio",
    emoji: "🔊",
    title: "hum",
    body: "A tokamak hum sits under the scene. Pay and the crew dances, a ridiculous song starts, and confetti leans toward your pointer. 🎉",
    actions: ["🔇 Mute with the speaker", "🎊 Pay to start the dance"],
    flyLine: "if you pay, we dance. the song is not dignified. the confetti likes your mouse.",
    anchor: { kind: "dom", slot: "mute" },
  },
  {
    id: "info",
    emoji: "ℹ️",
    title: "the i",
    body: "i stays off until you tap it. Then markers pop onto systems. Tap a marker to read it. Toggle i off and the type disappears. 🧭",
    actions: ["ℹ️ Tap i for markers", "🚶 Replay this walkthrough any time"],
    flyLine: "i on, i off. that is the whole manual. I will still be here.",
    anchor: { kind: "dom", slot: "info" },
  },
];

export const FEATURE_BY_ID: Record<FeatureId, Feature> = Object.fromEntries(
  FEATURES.map((f) => [f.id, f]),
) as Record<FeatureId, Feature>;

/** Ordered walkthrough. Intro first, i last. Edit with FEATURES. */
export const TOUR: FeatureId[] = [
  "intro",
  "reactor",
  "plasma",
  "crew",
  "brain",
  "talk",
  "hive",
  "ci",
  "ads",
  "mint",
  "wallet",
  "mcp",
  "donate",
  "core",
  "info",
];

export function featureOf(id: FeatureId): Feature {
  return FEATURE_BY_ID[id];
}

export function featureIds(): FeatureId[] {
  return FEATURES.map((f) => f.id);
}

export function tourFeature(step: number): Feature | null {
  const id = TOUR[step];
  return id ? FEATURE_BY_ID[id] : null;
}
