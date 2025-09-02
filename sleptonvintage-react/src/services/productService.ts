// Product service for fetching data from Supabase
import { supabase } from '../lib/supabase'

export interface Product {
  id: number;
  name: string;
  price: number;
  size: string;
  image: string;
  available: boolean;
  category: 'shirts' | 'sweaters' | 'hoodies' | 'jackets' | 'pants' | 'shorts';
  created_at?: string;
  updated_at?: string;
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
