# DROSOCORE fly CNS

Each hall worker runs a **reduced male *Drosophila* central nervous system**, not a 166k-cell simulation.

Source map: [FlyEM male CNS connectome](https://www.janelia.org/project-team/flyem/male-cns-connectome) — Google Research + HHMI Janelia, *Cell*, 3 Sep 2026. 166,700 neurons, ~125 million synapses, three partitions (optic lobes, central brain, ventral nerve cord).

## Why reduced

A browser tab cannot integrate 166,700 cells at 60 Hz for sixteen workers. The product model is a leaky integrator over the **named neuropils** those papers map, plus a job-trained policy. Motor output (wing beat, tripod gait, head yaw, grasp) is the only thing the body mesh reads.

## Atlas

| Region | Partition | Neuropil | Color (Janelia figure) |
| --- | --- | --- | --- |
| optic lobe | optic | ME / LO / LOP | purple |
| AOTU | central | AOTU008 pathway | green |
| antennal lobe | central | AL glomeruli | green |
| mushroom body | central | KC / MBON / DAN | green |
| central complex | central | EB / FB / PB | green |
| lateral horn | central | LH / PNs | green |
| gnathal ganglion | central | GNG | green |
| SEZ | central | proboscis / tool | green |
| descending neurons | vnc | DNs to VNC | blue |
| VNC T1–T3 | vnc | leg neuropils | blue |
| VNC wing | vnc | wing / haltere | blue |

## Training

`ROLE_TRAINING` weights which neuropils a role practices. Completing a fetch or a haul calls `rewardJob`, which:

1. Credits the role's trained regions (activity bump).
2. Credits mushroom body (DAN-like reward).
3. Increments `jobsDone`.
4. Sets `skill = 1 - exp(-(jobs + 0.45 * talks) / 11)`.

A finished conversation calls `rewardTalk`. Social chatter is a small antennal / lateral-horn bump. Shop talk (same job) trains the role. Coordination with a partner trade (`ROLE_COLLAB`) is the big one — that is the talk that helps the next job. It also sets `talkBoost`, which shortens the next plug and slightly speeds the next haul.

Skill fattens thorax, lengthens legs, and scales the tool. Bodies look more specialized the longer they work and the more useful conversations they finish.

## Policy

Sensory drive (distance to target, heading error, nearby conspecifics, cargo, grounded) leaks into neuropils. Intents:

- **navigate** — central complex + optic + AOTU. Spatial map, path integrate, visual fixate.
- **talk** — lateral horn + gnathal + antennal lobe. Conspecific signal, talk pulse. Paid on finish (`talk_reward`): shop talk, job coordination, or social chatter.
- **work** — mushroom body + SEZ. Job execute, tool grasp.

VNC walk vs wing is gated on whether the fly is on the pad or in the air.

## Code

- [`src/lib/fly-brain.ts`](../src/lib/fly-brain.ts) — atlas, leak, policy, motor, job reward, talk reward.
- [`src/lib/fly-sim.ts`](../src/lib/fly-sim.ts) — 16 workers, fetch/haul, talk, job complete → reward, useful talk → faster next haul.
- [`src/lib/roles.ts`](../src/lib/roles.ts) — specialized jobs on the energy-producing structure.

Citation: Azevedo et al. / FlyEM + Google Research, *Cell* 2026. Male *Drosophila* CNS connectome, 166,700 neurons.
