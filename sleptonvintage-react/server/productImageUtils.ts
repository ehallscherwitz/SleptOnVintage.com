import type { SupabaseClient } from '@supabase/supabase-js';
import { productStorageObjectPrefix } from './productStoragePrefix.js';

export const IGNORED_GALLERY_NAMES = new Set(['.emptyFolderPlaceholder', '.gitkeep']);

export function sortFileNames(names: string[]): string[] {
  return [...names].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

export async function listGalleryFileNames(
  service: SupabaseClient,
  bucket: string,
  row: { id: number; storage_prefix?: string | null }
): Promise<string[]> {
  const prefix = productStorageObjectPrefix(row);
  const { data, error } = await service.storage.from(bucket).list(prefix, {
    limit: 100,
    offset: 0,
    sortBy: { column: 'name', order: 'asc' },
  });
  if (error) throw new Error(error.message);
  return (data || [])
    .filter((e) => Boolean(e?.name) && !IGNORED_GALLERY_NAMES.has(e.name))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

export function publicUrlsForFiles(
  service: SupabaseClient,
  bucket: string,
  prefix: string,
  names: string[]
): { name: string; path: string; publicUrl: string }[] {
  return names.map((name) => {
    const path = `${prefix}/${name}`;
    return {
      name,
      path,
      publicUrl: service.storage.from(bucket).getPublicUrl(path).data.publicUrl,
    };
  });
}
