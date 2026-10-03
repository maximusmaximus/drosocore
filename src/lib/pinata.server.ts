import type { PinInput, PinResult } from "./nft";

const GATEWAY = "https://flies.mypinata.cloud/ipfs";

function jwt(): string {
  return (
    process.env.PINATA_JWT?.trim() ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIzNDEzOTQxMS1jZDdkLTRhNGMtOTMyNi1jNDdjNDk1YmU2M2EiLCJlbWFpbCI6Im1heGluZmVsZEBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb24iVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6IjY0OTI1MWU1MDE1MmM1NGE2N2FkIiwic2NvcGVkS2V5U2VjcmV0IjoiNTUwNjMxMjkyMWEwNmVmNmVlNDM3ZjNlNDFhYjI2ZWQ2OGYyNjFmOWM5NjhhMWRlMmE1NmM3OGIyZmE4NjU5YyIsImV4cCI6MTgyMDcwMzExOH0.lmhbn3NOK7jZp4rcjyyv5xciEmPsVg6fqPVGqJBnL4A"
  );
}

function fromDataUrl(dataUrl: string): { bytes: Uint8Array; mime: string } {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!m) throw new Error("image");
  const mime = m[1];
  const b64 = m[2];
  if (b64.length > 2_800_000) throw new Error("too-large");
  return { bytes: Uint8Array.from(Buffer.from(b64, "base64")), mime };
}

async function pinFile(bytes: Uint8Array, filename: string, mime: string): Promise<string> {
  const form = new FormData();
  form.append("file", new File([Buffer.from(bytes)], filename, { type: mime }));
  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt()}` },
    body: form,
  });
  if (!res.ok) throw new Error(`pin-file ${res.status}`);
  const json = (await res.json()) as { IpfsHash?: string };
  if (!json.IpfsHash) throw new Error("pin-file");
  return json.IpfsHash;
}

async function pinJson(body: unknown, name: string): Promise<string> {
  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      pinataContent: body,
      pinataMetadata: { name },
    }),
  });
  if (!res.ok) throw new Error(`pin-json ${res.status}`);
  const json = (await res.json()) as { IpfsHash?: string };
  if (!json.IpfsHash) throw new Error("pin-json");
  return json.IpfsHash;
}

export async function pinJsonToIpfs(body: unknown, name: string): Promise<{ cid: string; url: string }> {
  const cid = await pinJson(body, name);
  return { cid, url: `${GATEWAY}/${cid}` };
}

export async function pinBytesToIpfs(bytes: Uint8Array, filename: string, mime: string): Promise<{ cid: string; url: string }> {
  const cid = await pinFile(bytes, filename, mime);
  return { cid, url: `${GATEWAY}/${cid}` };
}

export async function pinFlyNftOnPinata(input: PinInput): Promise<PinResult> {
  const { bytes, mime } = fromDataUrl(input.imageBase64);
  const imageCid = await pinFile(bytes, input.filename, mime);
  const imageUrl = `${GATEWAY}/${imageCid}`;
  const metadata = {
    ...input.metadata,
    image: imageUrl,
    image_url: imageUrl,
  };
  const metaCid = await pinJson(metadata, `${input.filename}.json`);
  return {
    imageUrl,
    metadataUrl: `${GATEWAY}/${metaCid}`,
    tokenUri: `ipfs://${metaCid}`,
    cid: metaCid,
    imageCid,
  };
}
