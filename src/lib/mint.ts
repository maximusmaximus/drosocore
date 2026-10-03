import { createServerFn } from "@tanstack/react-start";
import type { PinInput, PinResult } from "./nft";

export const pinFlyNft = createServerFn({ method: "POST" })
  .validator((d: PinInput) => {
    if (!d || typeof d.imageBase64 !== "string" || typeof d.filename !== "string") {
      throw new Error("invalid");
    }
    if (d.imageBase64.length > 3_500_000) throw new Error("too-large");
    return d;
  })
  .handler(async ({ data }): Promise<PinResult> => {
    const { pinFlyNftOnPinata } = await import("./pinata.server");
    return pinFlyNftOnPinata(data);
  });
