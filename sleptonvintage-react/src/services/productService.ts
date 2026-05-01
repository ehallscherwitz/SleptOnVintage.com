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

/** Public URLs under `images/products/{id}/`; sorted by upload time when available. Errors → []. */
export async function getProductGalleryPublicUrls(productId: number): Promise<string[]> {
  const prefix = `products/${productId}`

  const { data: entries, error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).list(prefix, {
    limit: 100,
    offset: 0,
    // This is the closest thing to "the order I uploaded them in".
    // If Storage doesn't support this sort column in your project, we can fall back to filename ordering.
    sortBy: { column: 'created_at', order: 'asc' },
  })

  if (error) {
    console.error(`Storage list failed for ${prefix}:`, error)
    return []
  }

  const files = (entries || []).filter((e) => e?.id && e.name && !IGNORED_STORAGE_NAMES.has(e.name))

  return files.map((f) =>
    supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(`${prefix}/${f.name}`).data.publicUrl
  )
}

/** Gallery from storage first; otherwise single `fallback` URL if present */
export async function resolveProductImageUrls(productId: number, fallback: string | null): Promise<string[]> {
  const fromStorage = await getProductGalleryPublicUrls(productId)
  if (fromStorage.length > 0) return fromStorage
  if (fallback) return [fallback]
  return []
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
