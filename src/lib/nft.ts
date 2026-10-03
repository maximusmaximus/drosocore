export type PinInput = {
  imageBase64: string;
  filename: string;
  metadata: Record<string, unknown>;
};

export type PinResult = {
  imageUrl: string;
  metadataUrl: string;
  tokenUri: string;
  cid: string;
  imageCid: string;
};

export function buildNftMetadata(opts: {
  name: string;
  job: string;
  tool: string;
  designation: string;
  level: string;
  contributionEth: number;
  stage: string;
  roleId: string;
  txHash: string;
  seed: number;
}) {
  return {
    name: `DROSOCORE ${opts.name}`,
    description: `${opts.name} is a DROSOCORE crew membership. The token image is the hall worker — ${opts.job} — at rank ${opts.level}. Contribution: ${opts.contributionEth} ETH.`,
    external_url: "https://github.com/maximusmaximus/drosocore",
    background_color: "0c0e10",
    attributes: [
      { trait_type: "Name", value: opts.name },
      { trait_type: "Job", value: opts.job },
      { trait_type: "Tool", value: opts.tool },
      { trait_type: "Designation", value: opts.designation },
      { trait_type: "Contribution Level", value: opts.level },
      { trait_type: "Contribution", value: `${opts.contributionEth} ETH` },
      { trait_type: "Stage", value: opts.stage },
      { trait_type: "Role", value: opts.roleId },
      { trait_type: "Tx", value: opts.txHash },
      { trait_type: "Seed", value: String(Math.round(opts.seed * 1000) / 1000) },
    ],
  };
}

export function buildSupporterMetadata(opts: {
  spaceLabel: string;
  priceEth: string;
  txHash: string;
  spaceId: string;
}) {
  return {
    name: "I supported fly reactor!",
    description:
      "DROSOCORE supporter plate. The token shows the hall worker in 3D — same anatomy as the crew on the pad — minted with a billboard placement.",
    external_url: "https://github.com/maximusmaximus/drosocore",
    background_color: "0c0e10",
    attributes: [
      { trait_type: "Type", value: "Supporter" },
      { trait_type: "Message", value: "I supported fly reactor!" },
      { trait_type: "Billboard", value: opts.spaceLabel },
      { trait_type: "Space", value: opts.spaceId },
      { trait_type: "Contribution", value: `${opts.priceEth} ETH` },
      { trait_type: "Tx", value: opts.txHash },
    ],
  };
}
