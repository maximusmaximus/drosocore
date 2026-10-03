const MAX_DIM = 768;
const QUALITY = 0.74;

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name);
}

export async function fileToAdDataUrl(file: File): Promise<string> {
  if (!isImageFile(file)) throw new Error("image");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("canvas");
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return c.toDataURL("image/jpeg", QUALITY);
}

export function filesFromDrop(dt: DataTransfer | null): File[] {
  if (!dt) return [];
  return Array.from(dt.files).filter(isImageFile);
}
