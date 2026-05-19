// Product service for fetching data from Supabase
import { supabase } from '../lib/supabase'

/** Public bucket holding `products/{productId}/…` gallery files; must match Dashboard + supabase-product-images-storage.sql */
const PRODUCT_IMAGES_BUCKET =
  import.meta.env.VITE_SUPABASE_PRODUCT_IMAGES_BUCKET?.trim() || 'images'

const IGNORED_STORAGE_NAMES = new Set(['.emptyFolderPlaceholder', '.gitkeep'])

export interface Product {
  id: number;
  name: string;
  // stored in cents
  price: number;
  size: string;
  /** URL-safe folder segment: `images/products/<storage_prefix>/…`; null → use numeric `id` */
  storage_prefix?: string | null;
  /**
   * Primary image for listing pages.
   * Store either:
   * - a full URL (legacy), OR
   * - a Storage path like `products/123/01.webp`
   */
  image?: string | null;
  available: boolean;
  category: 'shirts' | 'sweaters' | 'hoodies' | 'jackets' | 'pants' | 'shorts';
  created_at?: string;
  updated_at?: string;
}

/** Slug for `storage_prefix`: lowercase, hyphens, safe for Storage paths. */
export function slugifyForStoragePrefix(raw: string): string {
  const s = raw
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
  return s || 'item'
}

export function getProductStorageObjectPrefix(product: Pick<Product, 'id' | 'storage_prefix'>): string {
  const seg = (product.storage_prefix || '').trim() || String(product.id)
  return `products/${seg}`
}

export function getPublicProductImageUrlFromPath(path: string, cacheKey?: string | null): string {
  const url = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl
  if (!cacheKey) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}v=${encodeURIComponent(cacheKey)}`
}

function looksLikeStoragePath(s: string): boolean {
  return s.startsWith('products/') || s.startsWith('items/')
}

/** Primary image for listing pages: if `image` is a Storage path → public URL; else treat it as a URL. */
export function getPrimaryProductImageUrl(product: Pick<Product, 'image' | 'updated_at'>): string {
  const raw = (product.image || '').trim()
  if (!raw) return ''
  if (looksLikeStoragePath(raw)) return getPublicProductImageUrlFromPath(raw, product.updated_at ?? null)
  return raw
}

function withImageCacheBust(url: string, product: Pick<Product, 'updated_at'>): string {
  if (!product.updated_at || !url) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}v=${encodeURIComponent(product.updated_at)}`
}

export type ProductGalleryFile = { name: string; path: string; publicUrl: string };

/** List gallery file names + public URLs from Storage (client). Same folder as storefront. */
export async function listProductGalleryFiles(
  product: Pick<Product, 'id' | 'storage_prefix' | 'updated_at'>
): Promise<ProductGalleryFile[]> {
  const prefix = getProductStorageObjectPrefix(product)

  const { data: entries, error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).list(prefix, {
    limit: 100,
    offset: 0,
    sortBy: { column: 'name', order: 'asc' },
  })

  if (error) {
    console.error(`Storage list failed for ${prefix}:`, error)
    return []
  }

  const names = (entries || [])
    .filter((e) => Boolean(e?.name) && !IGNORED_STORAGE_NAMES.has(e.name))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))

  return names.map((name) => {
    const path = `${prefix}/${name}`
    return {
      name,
      path,
      publicUrl: withImageCacheBust(getPublicProductImageUrlFromPath(path), product),
    }
  })
}

/** Public URLs under `images/products/<storage_prefix|id>/`; sorted by filename (lexical). Errors → []. */
export async function getProductGalleryPublicUrls(
  product: Pick<Product, 'id' | 'storage_prefix' | 'updated_at'>
): Promise<string[]> {
  const files = await listProductGalleryFiles(product)
  return files.map((f) => f.publicUrl)
}

/** Gallery from storage first; otherwise single `fallback` URL if present */
export async function resolveProductImageUrls(
  product: Pick<Product, 'id' | 'storage_prefix' | 'image' | 'updated_at'>,
  fallback: string | null
): Promise<string[]> {
  const fromStorage = await getProductGalleryPublicUrls(product)
  if (fromStorage.length > 0) return fromStorage
  if (fallback) return [withImageCacheBust(fallback, product)]
  return []
}

const listingThumbPromises = new Map<string, Promise<string>>()

function listingThumbCacheKey(product: Pick<Product, 'id' | 'storage_prefix' | 'image' | 'updated_at'>): string {
  return `${product.id}|${(product.storage_prefix || '').trim()}|${(product.image || '').trim()}|${product.updated_at || ''}`
}

export function getListingThumbnailUrl(product: Pick<Product, 'id' | 'storage_prefix' | 'image' | 'updated_at'>): Promise<string> {
  const key = listingThumbCacheKey(product)
  const existing = listingThumbPromises.get(key)
  if (existing) return existing

  const p = (async () => {
    const gallery = await getProductGalleryPublicUrls(product)
    if (gallery.length > 0) return withImageCacheBust(gallery[0], product)
    return getPrimaryProductImageUrl(product)
  })()

  listingThumbPromises.set(key, p)
  return p
}

/** Call after admin overwrites a Storage image so category/search grids refetch the thumbnail. */
export function invalidateListingThumbnailCacheForProduct(productId: number): void {
  const prefix = `${productId}|`
  for (const key of [...listingThumbPromises.keys()]) {
    if (key.startsWith(prefix)) listingThumbPromises.delete(key)
  }
}

export const productService = {
  // Fetch all products
  async getAllProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('available', { ascending: false })
      .order('id', { ascending: true })

    if (error) {
      console.error('Error fetching products:', error)
      throw error
    }

    return data || []
  },

  // Fetch products by category
  async getProductsByCategory(category: Product['category']): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('category', category)
      .order('available', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })

    if (error) {
      console.error(`Error fetching ${category} products:`, error)
      throw error
    }

    return data || []
  },

  // Fetch available products only
  async getAvailableProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('available', true)
      .order('id', { ascending: true })

    if (error) {
      console.error('Error fetching available products:', error)
      throw error
    }

    return data || []
  },

  // Fetch a single product by ID
  async getProductById(id: number): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error(`Error fetching product ${id}:`, error)
      return null
    }

    return data
  }
}
