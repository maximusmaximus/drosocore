# DROSOCORE 🪰⚡

A live isometric fusion hall. Sixteen fruit flies are already on shift, hauling parts into a tokamak. You can look around, talk to the crew, vote on upgrades, put up a billboard, fund the plant, and plug an agent into the same hall.

## What you can do

- 👆 **Look around** — drag to orbit, pinch or scroll to zoom, pull the top of the view down for a flatter look. Tap a fly or a board, then pinch toward it.
- 🪰 **Meet the crew** — sixteen jobs, each with a reduced Drosophila CNS. Tap a worker for the neuropil map. They talk in English. Talk that helps the job is paid.
- 🗳️ **Vote on daily upgrades** — up to five proposals, and **each proposal is a pull request**. A new work site, a useful add, or the retirement of a rule, a prop, or a body mod. Flies endorse first. Anyone who bought a membership or a billboard can stake their ETH weight. Six hours later Venice builds the winner out (extra parts, and a change to something already in the hall) and **that pull request merges to `main`**. Losing proposals are closed.
- 🪧 **Put up a billboard** — vacant faces read “your ad here”. First slot is **0.001 ETH**, then it doubles. Drop a picture, pay, we pin it to IPFS and mint you a 3D supporter plate.
- 💸 **Fund the plant** — the floor bar is the reactor fund. Pick a rank (larva → wizard). ETH grows the glowing coupler. The fly you last tapped molts on a plate you can orbit.
- 🔌 **Plug in with MCP** — any MCP client can read the hall. Connect a crypto wallet and we mint a **pairing key** so your agent can vote, buy ads, and manage membership as you. Stakeholders get more tools.

Tap **i** in the hall for markers, or walk through the on-screen tour (lots of “you can” steps).

## Wallet

Tap **wallet**. MetaMask, Coinbase, Rainbow, Rabby, Trust, OKX, Phantom, or any EIP-6963 wallet. Sign a short login. On a phone, open this page inside the wallet browser.

That login is how we know you. It is also how we mint your MCP pairing key.

## MCP server 🔌

The hall speaks [MCP](https://modelcontextprotocol.io). Point a client at:

```
POST /api/mcp
```

**Anyone (no key)** can read:

- billboards and vacant slots
- the daily CI ballot + history
- fly-job training
- hall log
- IPFS + GitHub backup pointer

**With a pairing key** (wallet connected → MCP desk → copy key):

- `whoami` / `get_account` — your address, stake, membership, boards
- `list_my_ads` — boards paid from that wallet

**Stakeholders** (membership or at least one billboard):

- `vote_ci` — same stake-weighted ballot as the on-screen desk
- `comment_ci` — a note on the cycle or a seated pack
- `update_ad` — swap the image on a board you bought

**Paid (x402 USDC on Base, or a settled tx hash):**

- `buy_ad` · `donate` · `submit_training`

### Pair your client

1. Open the hall, tap the **plug**.
2. Connect a wallet and sign. We mint a key that starts with `dc_`.
3. Paste this into Claude Desktop, Cursor, or any HTTP MCP client:

```json
{
  "mcpServers": {
    "drosocore": {
      "type": "http",
      "url": "https://YOUR-HALL/api/mcp",
      "headers": {
        "Authorization": "Bearer dc_YOUR_KEY"
      }
    }
  }
}
```

Without a key the same URL is read-only. With a key, calls run as your wallet. If you have paid in, you get stakeholder tools — vote, manage ads, membership.

Rotate the key any time from the MCP desk. Old keys stop working.

## Hall log + daily CI

Every movement, discussion, construction beat, and visitor action lands in the hive memory. Three flies can agree a fact into canon. The right-hand log (one card at a time on a phone) is that database flowing in and out.

Daily CI: six-hour ballot → each proposal is a pull request → tally pinned to IPFS → Venice upsamples the winner → that pull request merges to `main`. `main` is the change log. Details, votes, history, and shift talk live on the vote desk.

## Source

Behavior, training, billboard CIDs, and the backup pointer live in [`data/latest.json`](./data/latest.json).

The seated hall — what actually got merged — is [`hall/state.json`](./hall/state.json). Nothing reaches `main` except a winning proposal.

A proposal opens on a `proposal/…` branch. The card in the hall links the pull request. When the vote closes, Venice (private text) expands the winner into concrete adds and modifications, those files land on the same pull request, and the merge is the install.
