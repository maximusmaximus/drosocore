# DROSOCORE

**A hydrogen fusion tokamak maintained and extended by fruit flies.**

Each of the sixteen workers runs a reduced male *Drosophila* CNS grounded in the [Google Research + HHMI Janelia complete male fruit-fly connectome](https://www.janelia.org/project-team/flyem/male-cns-connectome) (*Cell*, 3 Sep 2026): 166,700 neurons, ~125 million synapses, optic lobes / central brain / VNC.

We do not simulate 166k cells in the tab. Each fly is a leaky integrator over the named neuropils those papers map, plus a job-trained policy. Bodies walk, talk, and grasp from that motor output. Completing a specialized job on the energy-producing structure credits mushroom body (DAN-like reward) and fattens the worker.

## Crew + training

| Role | Tool | Trained neuropils |
| --- | --- | --- |
| vessel welder | MIG gun + hood | SEZ, VNC T1–T3, MB, DNs |
| TF coil tech | winding bobbin | VNC T1–T3, DNs, CX, MB |
| plasma physicist | tablet + goggles | MB, CX, optic, AOTU |
| cryoline fitter | pipe wrench | SEZ, VNC T1–T3, CX |
| crane operator | pendant remote | AOTU, optic, DNs, VNC wing |
| QA inspector | clipboard + loupe | optic, MB, AL |
| busbar electrician | voltage tester | SEZ, MB, VNC T1–T3 |
| cryogenics | LHe dewar | SEZ, GNG, VNC T1–T3 |
| scaffold builder | I-beam + belt | VNC T1–T3, CX, DNs |
| safety officer | stop paddle | optic, LH, GNG |
| diagnostics | RF probe | optic, MB, AOTU |
| PCS systems | field laptop | MB, CX, SEZ |
| divertor tech | tungsten tile | VNC T1–T3, SEZ, CX |
| vacuum tech | turbo pump | SEZ, VNC T1–T3, AL |
| PF magnet tech | field magnet | MB, DNs, VNC T1–T3 |
| custodian | push broom | VNC T1–T3, AL, GNG |

They speak only in collapsed math. Do not attempt to unionize them.

## Behavior module

| File | What |
| --- | --- |
| [`src/lib/fly-brain.ts`](src/lib/fly-brain.ts) | Atlas, leaky integrator, talk / spatial / tool policy, VNC motor, `rewardJob` |
| [`src/lib/fly-sim.ts`](src/lib/fly-sim.ts) | Sixteen workers: fetch, haul, talk when antennal lobe fires, reward on job complete |
| [`src/lib/roles.ts`](src/lib/roles.ts) | Specialized jobs on the tokamak |
| [`docs/fly-cns.md`](docs/fly-cns.md) | Neuropil map, training, citation |

```bash
node --experimental-strip-types --test src/lib/*.test.ts
```

## Support reactor development

ETH: `0xdAB2758BDCD16C6FB62c8626206084e4F3B88776`

Successful support is acknowledged by a site-wide dance.

## Disclaimer

This is a simulated product. No fruit flies were confined to a vacuum vessel. Plasma is a shader. The brains are a region-level reduction of the 2026 male CNS, not a spike-by-spike replay of 166,700 cells.

Citation: Azevedo et al. / FlyEM + Google Research, *Cell* 2026. Male *Drosophila* CNS connectome, 166,700 neurons.
