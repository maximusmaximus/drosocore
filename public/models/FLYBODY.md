# Drosophila body model

The adult fly mesh in `drosophila.glb` is derived from **flybody**, an
anatomically detailed *Drosophila melanogaster* model by Google DeepMind and
HHMI Janelia Research Campus.

- Source: https://github.com/google-deepmind/mujoco_menagerie/tree/main/flybody
- Upstream: https://github.com/TuragaLab/flybody
- License: Apache-2.0 (see `FLYBODY-LICENSE.txt`)
- Citation: Vaxenburg et al., *Whole-body simulation of realistic fruit fly
  locomotion with deep reinforcement learning*, bioRxiv 2024.
  https://doi.org/10.1101/2024.03.11.584515

Meshes were welded, lightly decimated, re-parented for wing/leg animation, and
reoriented from MuJoCo Z-up to three.js Y-up. Hats, tools, and cargo are
original Drosocore overlays.
