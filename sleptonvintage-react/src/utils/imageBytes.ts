export function mimeFromFileName(fileName: string): string {
  const ext = fileName.replace(/^.*\./, '').toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  return 'image/jpeg';
}

export function resolveImageMime(contentType: string, fileName?: string): string {
  if (contentType && contentType.startsWith('image/')) return contentType;
  return mimeFromFileName(fileName || '');
}

export function base64ToBlob(dataBase64: string, contentType: string): Blob {
  const binary = atob(dataBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: contentType });
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = String(reader.result || '');
      resolve(res.includes(',') ? res.split(',')[1] : res);
    };
    reader.onerror = () => reject(new Error('Could not read image'));
    reader.readAsDataURL(blob);
  });
}

export function outputMimeForSource(mime: string): { mime: string; quality?: number } {
  if (mime === 'image/png' || mime === 'image/webp' || mime === 'image/gif') return { mime };
  return { mime: 'image/jpeg', quality: 0.92 };
}

export async function canvasToBase64(
  canvas: HTMLCanvasElement,
  sourceMime: string
): Promise<{ base64: string; contentType: string }> {
  const { mime, quality } = outputMimeForSource(sourceMime);
  const outBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode image'))), mime, quality);
  });
  const base64 = await blobToBase64(outBlob);
  return { base64, contentType: mime };
}
