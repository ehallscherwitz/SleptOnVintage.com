import React, { useEffect, useState } from 'react';
import { getListingThumbnailUrl, type Product } from '../services/productService';

type ThumbnailProduct = Pick<Product, 'id' | 'image' | 'name'>;

interface ProductThumbnailProps {
  product: ThumbnailProduct;
  className?: string;
  alt?: string;
}

/** Listing thumbnail: first file in `products/{id}/` by filename order, else `products.image`. */
export const ProductThumbnail: React.FC<ProductThumbnailProps> = ({ product, className, alt }) => {
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
  }, [product.id, product.image]);

  if (src === undefined) {
    return <div className={className} aria-hidden style={{ background: 'rgba(255,255,255,0.06)' }} />;
  }
  if (!src) {
    return <div className={className} aria-hidden style={{ background: 'rgba(255,255,255,0.06)' }} />;
  }

  return <img className={className} src={src} alt={alt ?? product.name} loading="lazy" />;
};
