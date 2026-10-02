# DROSOCORE

## Information guide (mandatory)

User-facing features of this app — 3D interactions, ads, ETH, NFTs, chrome —
are documented in **`src/lib/guide.ts`**.

When you add, rename, or change a feature:

1. Update `FEATURES` (title, body, flyLine, anchor) in `src/lib/guide.ts`.
2. Add or edit a tour step in `TOUR` if visitors should be walked through it.
3. Bump `GUIDE_VERSION` so returning visitors get the new walkthrough.
4. Attach an `InfoMark` on any new DOM chrome, or a world anchor for 3D.

The `i` toggle, per-element markers, and the docent-fly walkthrough all read
from that file. Do not scatter feature copy into random overlays.
