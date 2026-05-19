import { base64ToBlob, canvasToBase64, resolveImageMime } from './imageBytes';

/** Square crop region in source-image pixels (x, y = top-left). */
export type CropRegion = { x: number; y: number; size: number };

export async function cropImageBase64(
  dataBase64: string,
  contentType: string,
  region: CropRegion,
  fileName?: string
): Promise<{ base64: string; contentType: string }> {
  const mime = resolveImageMime(contentType, fileName);
  const blob = base64ToBlob(dataBase64, mime);
  const bitmap = await createImageBitmap(blob);

  const size = Math.round(Math.max(1, Math.min(region.size, bitmap.width, bitmap.height)));
  const x = Math.round(Math.max(0, Math.min(region.x, bitmap.width - size)));
  const y = Math.round(Math.max(0, Math.min(region.y, bitmap.height - size)));

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  ctx.drawImage(bitmap, x, y, size, size, 0, 0, size, size);
  bitmap.close();

  return canvasToBase64(canvas, mime);
}
