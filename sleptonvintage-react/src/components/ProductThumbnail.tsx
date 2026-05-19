import React, { useEffect, useState } from 'react';
import { getListingThumbnailUrl, type Product } from '../services/productService';
import { buildProductImageAlt, type ProductSeoFields } from '../utils/productSeo';

export type ThumbnailProduct = {
  id: number;
  name: string;
  image?: string | null;
  storage_prefix?: string | null;
  updated_at?: string;
  size?: string;
  category?: Product['category'] | string;
  available?: boolean;
};

interface ProductThumbnailProps {
  product: ThumbnailProduct;
  className?: string;
  /** Override auto-generated SEO alt text */
  alt?: string;
  photoIndex?: number;
  totalPhotos?: number;
}

/** Listing thumbnail: first file in `products/{id}/` by filename order, else `products.image`. */
export const ProductThumbnail: React.FC<ProductThumbnailProps> = ({
  product,
  className,
  alt,
  photoIndex,
  totalPhotos,
}) => {
  const [src, setSrc] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    setSrc(undefined);
    void getListingThumbnailUrl(product).then((url) => {
      if (!cancelled) setSrc(url || '');
    });
    return () => {
      cancelled = true;
    };
  }, [product.id, product.image, product.storage_prefix, product.updated_at]);

  const seoProduct = product as ProductSeoFields;
  const resolvedAlt =
    alt ??
    buildProductImageAlt(seoProduct, {
      photoIndex,
      totalPhotos,
      context: photoIndex != null ? 'thumb' : 'listing',
    });

  if (src === undefined) {
    return <div className={className} aria-hidden style={{ background: 'rgba(255,255,255,0.06)' }} />;
  }
  if (!src) {
    return <div className={className} aria-hidden style={{ background: 'rgba(255,255,255,0.06)' }} />;
  }

  return <img className={className} src={src} alt={resolvedAlt} loading="lazy" decoding="async" />;
};
