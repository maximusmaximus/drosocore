import { createContext, useContext } from "react";
import { gfxProfile, type GfxProfile } from "@/lib/gfx-tier";
import type { SurfPack } from "./surf-maps";

export type GfxValue = {
  profile: GfxProfile;
  maps: SurfPack | null;
};

export const GfxContext = createContext<GfxValue>({
  profile: gfxProfile("mid"),
  maps: null,
});

export function useGfx(): GfxValue {
  return useContext(GfxContext);
}
