/** House creatives + vacant-board copy. Paint happens in the scene. */

import { AD_SPACES, adSection, houseSpaceIds, type AdSection, type AdSpace } from "./ad-spaces.ts";

export const HOT_PINK = "#FF1493";
export const VACANT_COPY = "your ad here";
export const AD_FONT = '"Open Sans", "IBM Plex Sans", sans-serif';

export type HouseCreative = {
  title: string;
  line: string;
  sub: string;
};

export const HOUSE_ADS: Record<AdSection, HouseCreative> = {
  floor: {
    title: "FLYMIND CLOUD",
    line: "Rent 140,000 neurons by the hour.",
    sub: "Connectome-as-a-Service",
  },
  cabinet: {
    title: "BRAINJAR",
    line: "We pickle the thoughts you don't need.",
    sub: "Synapse Union Local 140k",
  },
  crate: {
    title: "PUPA OS",
    line: "Metamorphosis. Now with SSO.",
    sub: "Instar 3 certified",
  },
  nbi: {
    title: "NEUTRON THOUGHTS",
    line: "We fire ideas at your optic lobe.",
    sub: "Beamline psychiatry",
  },
  scaffold: {
    title: "KENYON CELLS",
    line: "Mushroom-body hosting, 99.9% uptime.",
    sub: "No larvae in production",
  },
  crane: {
    title: "HALTERE LINK",
    line: "Cloud gyroscopes for flies who fall.",
    sub: "Never miss the jib",
  },
  shield: {
    title: "OPTIC LOBE VR",
    line: "Compound vision. Simple billing.",
    sub: "720 ommatidia, one invoice",
  },
  walk: {
    title: "CAMPANIFORM",
    line: "Feel every footstep in the cloud.",
    sub: "Strain-gauge SaaS",
  },
  wall: {
    title: "VENTRAL CORD VPN",
    line: "Tunnel into the nerve cord.",
    sub: "Six-leg SSO",
  },
};

export function isHouseSpace(id: string, spaces: AdSpace[] = AD_SPACES): boolean {
  return houseSpaceIds(spaces).includes(id);
}

export function houseCreativeFor(id: string, spaces: AdSpace[] = AD_SPACES): HouseCreative | null {
  if (!isHouseSpace(id, spaces)) return null;
  return HOUSE_ADS[adSection(id)];
}
