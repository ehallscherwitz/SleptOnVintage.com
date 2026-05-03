/** Folder segment inside bucket `images` → `products/<segment>/…` */

export function storageFolderSegment(row: { id: number; storage_prefix?: string | null }): string {
  const s = (row.storage_prefix || '').trim();
  if (s) return s;
  return String(row.id);
}

export function productStorageObjectPrefix(row: { id: number; storage_prefix?: string | null }): string {
  return `products/${storageFolderSegment(row)}`;
}
