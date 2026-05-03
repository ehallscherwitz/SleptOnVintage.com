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

export function getPublicProductImageUrlFromPath(path: string): string {
  return supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl
}

function looksLikeStoragePath(s: string): boolean {
  return s.startsWith('products/') || s.startsWith('items/')
}

/** Primary image for listing pages: if `image` is a Storage path → public URL; else treat it as a URL. */
export function getPrimaryProductImageUrl(product: Pick<Product, 'image'>): string {
  const raw = (product.image || '').trim()
  if (!raw) return ''
  if (looksLikeStoragePath(raw)) return getPublicProductImageUrlFromPath(raw)
  return raw
}

/** Public URLs under `images/products/<storage_prefix|id>/`; sorted by filename (lexical). Errors → []. */
export async function getProductGalleryPublicUrls(product: Pick<Product, 'id' | 'storage_prefix'>): Promise<string[]> {
  const prefix = getProductStorageObjectPrefix(product)

  const { data: entries, error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).list(prefix, {
    limit: 100,
    offset: 0,
    // Dashboard bulk uploads often share the same second; filename order is the reliable way to
    // preserve "sequence" — use names like 01.webp, 02.webp before dragging many files at once.
    sortBy: { column: 'name', order: 'asc' },
  })

  if (error) {
    console.error(`Storage list failed for ${prefix}:`, error)
    return []
  }

  const files = (entries || [])
    .filter((e) => Boolean(e?.name) && !IGNORED_STORAGE_NAMES.has(e.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))

  return files.map((f) =>
    supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(`${prefix}/${f.name}`).data.publicUrl
  )
}

/** Gallery from storage first; otherwise single `fallback` URL if present */
export async function resolveProductImageUrls(
  product: Pick<Product, 'id' | 'storage_prefix' | 'image'>,
  fallback: string | null
): Promise<string[]> {
  const fromStorage = await getProductGalleryPublicUrls(product)
  if (fromStorage.length > 0) return fromStorage
  if (fallback) return [fallback]
  return []
}

const listingThumbPromises = new Map<string, Promise<string>>()

function listingThumbCacheKey(product: Pick<Product, 'id' | 'storage_prefix' | 'image'>): string {
  return `${product.id}|${(product.storage_prefix || '').trim()}|${(product.image || '').trim()}`
}

/**
 * Thumbnail for grids/cart: first Storage object (filename order), else `products.image`.
 */
export function getListingThumbnailUrl(product: Pick<Product, 'id' | 'storage_prefix' | 'image'>): Promise<string> {
  const key = listingThumbCacheKey(product)
  const existing = listingThumbPromises.get(key)
  if (existing) return existing

  const p = (async () => {
    const gallery = await getProductGalleryPublicUrls(product)
    if (gallery.length > 0) return gallery[0]
    return getPrimaryProductImageUrl(product)
  })()

  listingThumbPromises.set(key, p)
  return p
}

export const productService = {
  // Fetch all products
  async getAllProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
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
      .order('id', { ascending: true })

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
