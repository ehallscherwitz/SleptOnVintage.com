import { SITE_NAME, SITE_DOMAIN } from '../constants/legal';
import { SITE_SEO_KEYWORDS, SITE_TAGLINE, SITE_URL } from '../constants/site';
import type { Product } from '../services/productService';

export type ProductSeoFields = Pick<Product, 'id' | 'name' | 'size' | 'category' | 'price' | 'available' | 'image'>;

const CATEGORY_SINGULAR: Record<Product['category'], string> = {
  shirts: 'shirt',
  sweaters: 'sweater',
  hoodies: 'hoodie',
  jackets: 'jacket',
  pants: 'pants',
  shorts: 'shorts',
};

const CATEGORY_PLURAL: Record<Product['category'], string> = {
  shirts: 'shirts',
  sweaters: 'sweaters',
  hoodies: 'hoodies',
  jackets: 'jackets',
  pants: 'pants',
  shorts: 'shorts',
};

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1).trim()}…`;
}

export function categorySingular(category: Product['category']): string {
  return CATEGORY_SINGULAR[category] ?? category;
}

export function categoryPlural(category: Product['category']): string {
  return CATEGORY_PLURAL[category] ?? category;
}

export function categoryDisplayTitle(category: Product['category']): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

/** Detect common vintage keywords already present in the listing title. */
function vintageDescriptorsFromName(name: string): string[] {
  const lower = name.toLowerCase();
  const hints: string[] = [];
  const patterns: [RegExp, string][] = [
    [/\b90s\b|\b1990s\b/, '90s'],
    [/\b80s\b|\b1980s\b/, '80s'],
    [/\b70s\b/, '70s'],
    [/\by2k\b/, 'Y2K'],
    [/\bsingle\s*stitch\b/, 'single stitch'],
    [/\bband\b|\btour\b/, 'band'],
    [/\bgraphic\b/, 'graphic'],
    [/\bnike\b|\badidas\b|\brebook\b|\bcarhartt\b|\bchampion\b/, 'streetwear'],
    [/\bharley\b|\bmetallica\b|\bnirvana\b|\brolling\s+stones\b/i, 'band tee'],
  ];
  for (const [re, label] of patterns) {
    if (re.test(lower) && !hints.includes(label)) hints.push(label);
  }
  return hints;
}

function baseVintagePhrase(product: ProductSeoFields): string {
  const nameLower = product.name.toLowerCase();
  const hasVintage = /\bvintage\b/.test(nameLower);
  const descriptors = vintageDescriptorsFromName(product.name);
  const cat = product.category ? categorySingular(product.category) : 'clothing';
  const parts: string[] = [];
  if (!hasVintage) parts.push('Vintage');
  parts.push(product.name);
  if (descriptors.length) parts.push(descriptors.join(' '));
  parts.push(`pre-owned thrift ${cat}`);
  parts.push(`size ${product.size}`);
  return normalizeWhitespace(parts.join(' '));
}

export type ProductImageAltOptions = {
  photoIndex?: number;
  totalPhotos?: number;
  /** listing = grid/cart; gallery = detail page */
  context?: 'listing' | 'gallery' | 'thumb';
};

/**
 * Descriptive alt for Google Image Search and accessibility.
 * Example: "Vintage 90s single stitch graphic tee — pre-owned thrift shirt size L — photo 2 of 5 | Slept On Vintage"
 */
export function buildProductImageAlt(product: ProductSeoFields, options: ProductImageAltOptions = {}): string {
  const { photoIndex, totalPhotos, context = 'listing' } = options;
  let alt = baseVintagePhrase(product);

  if (context === 'thumb' && photoIndex != null && totalPhotos != null && totalPhotos > 1) {
    alt = `${alt} — thumbnail ${photoIndex + 1}`;
  } else if (photoIndex != null && totalPhotos != null && totalPhotos > 1) {
    alt = `${alt} — photo ${photoIndex + 1} of ${totalPhotos}`;
  } else if (photoIndex != null && photoIndex > 0) {
    alt = `${alt} — photo ${photoIndex + 1}`;
  }

  if (product.available === false) {
    alt = `${alt} (sold)`;
  }

  return truncate(`${alt} | ${SITE_NAME}`, 250);
}

export function buildProductPageTitle(product: ProductSeoFields): string {
  const cat = categorySingular(product.category);
  return truncate(`${product.name} — Vintage ${cat} size ${product.size} | ${SITE_NAME}`, 70);
}

/** Short og:title for Pinterest / social saves (listing name only). */
export function buildProductOgTitle(product: ProductSeoFields): string {
  return truncate(normalizeWhitespace(product.name), 120);
}

/** Pinterest Save / og:description — full listing title, size, brand. */
export function buildProductPinDescription(product: ProductSeoFields): string {
  return truncate(
    `${normalizeWhitespace(product.name)} · Size ${product.size} · sleptonvintage`,
    500,
  );
}

/**
 * Main image alt on product detail — kept short so Pinterest Save does not paste a paragraph.
 * Grid/cart thumbnails use buildProductImageAlt() for Google Image SEO.
 */
export function buildProductImageAltShort(product: ProductSeoFields): string {
  return truncate(`${normalizeWhitespace(product.name)} — size ${product.size}`, 200);
}

/** Google meta description (includes listing name for search snippets). */
export function buildProductMetaDescription(product: ProductSeoFields): string {
  return truncate(
    `${normalizeWhitespace(product.name)}. Size ${product.size}. One-of-one vintage & thrift · Free US shipping. ${SITE_NAME}.`,
    160,
  );
}

export function buildProductKeywords(product: ProductSeoFields): string {
  const extra = [
    product.name,
    `size ${product.size}`,
    categorySingular(product.category),
    categoryPlural(product.category),
    ...vintageDescriptorsFromName(product.name),
    'vintage clothing',
    'thrift store online',
    'buy vintage online',
  ];
  return [...new Set([...SITE_SEO_KEYWORDS.split(', '), ...extra.map((k) => k.trim()).filter(Boolean)])].join(', ');
}

export function buildProductCanonicalPath(product: ProductSeoFields): string {
  return `/product/${product.id}`;
}

export function buildProductCanonicalUrl(product: ProductSeoFields): string {
  return `${SITE_URL}${buildProductCanonicalPath(product)}`;
}

export function buildCategoryPageTitle(category: Product['category']): string {
  return `Vintage ${categoryDisplayTitle(category)} — Thrift & Pre-Owned | ${SITE_NAME}`;
}

export function buildCategoryMetaDescription(category: Product['category']): string {
  return truncate(
    `Browse vintage & thrift ${categoryPlural(category)} in size-listed, one-of-one pre-owned pieces. ` +
      `Free US shipping on ${SITE_DOMAIN}. ${SITE_TAGLINE}.`,
    160,
  );
}

export function buildProductJsonLd(
  product: ProductSeoFields,
  imageUrls: string[],
): Record<string, unknown> {
  const url = buildProductCanonicalUrl(product);
  const images = imageUrls.filter(Boolean);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: `${product.name}. Size ${product.size}. One-of-one vintage from ${SITE_NAME}.`,
    image: images.length > 0 ? images : undefined,
    sku: String(product.id),
    brand: { '@type': 'Brand', name: SITE_NAME },
    category: categoryDisplayTitle(product.category),
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'USD',
      price: (product.price / 100).toFixed(2),
      availability: product.available
        ? 'https://schema.org/InStock'
        : 'https://schema.org/SoldOut',
      itemCondition: 'https://schema.org/UsedCondition',
      seller: { '@type': 'Organization', name: SITE_NAME },
    },
  };
}

export function buildProductOgImage(imageUrls: string[]): string | undefined {
  return imageUrls[0];
}