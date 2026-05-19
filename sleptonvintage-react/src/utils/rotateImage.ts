import { base64ToBlob, canvasToBase64, resolveImageMime } from './imageBytes';

export type RotateDegrees = 90 | -90 | 180;

/** Rotate image bytes in-browser; returns base64 suitable for admin upload. */
export async function rotateImageBase64(
  dataBase64: string,
  contentType: string,
  degrees: RotateDegrees,
  fileName?: string
): Promise<{ base64: string; contentType: string }> {
  const mime = resolveImageMime(contentType, fileName);
  const blob = base64ToBlob(dataBase64, mime);
  const bitmap = await createImageBitmap(blob);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  const swap = degrees === 90 || degrees === -90;
  canvas.width = swap ? bitmap.height : bitmap.width;
  canvas.height = swap ? bitmap.width : bitmap.height;

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
  bitmap.close();

  return canvasToBase64(canvas, mime);
}
