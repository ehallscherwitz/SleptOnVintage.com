// Homepage component - converted from homepage.html
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { ProductThumbnail } from '../components/ProductThumbnail';
import { supabase } from '../lib/supabase';
import { productService, type Product } from '../services/productService';

const HOMEPAGE_HERO_VIDEO_SRC = supabase.storage
  .from('videos')
  .getPublicUrl('sov black bg.mp4')
  .data.publicUrl;

const CATEGORY_TILES: { name: string; path: string; slug: Product['category'] }[] = [
  { name: 'Shirts', path: '/shirts', slug: 'shirts' },
  { name: 'Sweaters', path: '/sweaters', slug: 'sweaters' },
  { name: 'Hoodies', path: '/hoodies', slug: 'hoodies' },
  { name: 'Jackets', path: '/jackets', slug: 'jackets' },
  { name: 'Pants', path: '/pants', slug: 'pants' },
  { name: 'Shorts', path: '/shorts', slug: 'shorts' },
];

function pickRandomListingProduct(products: Product[], slug: Product['category']): Product | null {
  const inCategory = products.filter((p) => p.category === slug);
  const available = inCategory.filter((p) => p.available);
  const pool = available.length > 0 ? available : inCategory;
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

const Homepage: React.FC = () => {
  const [sampleByCategory, setSampleByCategory] = useState<
    Partial<Record<Product['category'], Product | null>>
  >({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = await productService.getAllProducts();
        if (cancelled) return;
        const next: Partial<Record<Product['category'], Product | null>> = {};
        for (const { slug } of CATEGORY_TILES) {
          next[slug] = pickRandomListingProduct(all, slug);
        }
        setSampleByCategory(next);
      } catch (e) {
        console.error('Homepage category thumbnails:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="homepage">
      <Header />
      <div className="homepage-hero-video-wrap">
        <video
          className="homepage-hero-video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          tabIndex={-1}
          aria-hidden="true"
        >
          <source src={HOMEPAGE_HERO_VIDEO_SRC} type="video/mp4" />
        </video>
      </div>
      <div className="subheader">FREE SHIPPING ON ALL ORDERS</div>
      <div className="category-grid">
        {CATEGORY_TILES.map(({ name, path, slug }) => {
          const sample = sampleByCategory[slug];
          return (
            <Link key={name} to={path}>
              <button type="button" className="category">
                <div className="thumbnail-row">
                  {sample ? (
                    <ProductThumbnail product={sample} className="thumbnail" alt={name} />
                  ) : (
                    <div className="category-thumbnail-placeholder thumbnail" aria-hidden />
                  )}
                </div>
                <div className="category-info-row">
                  <div className="category-title">
                    {name} <i className="fa-solid fa-arrow-right"></i>
                  </div>
                </div>
              </button>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default Homepage;
