// Homepage component - converted from homepage.html
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { ProductThumbnail } from '../components/ProductThumbnail';
import { supabase } from '../lib/supabase';
import { productService, type Product } from '../services/productService';
import { Seo } from '../components/Seo';
import { SITE_SEO_KEYWORDS, SITE_TAGLINE, SITE_URL } from '../constants/site';
import { SITE_NAME } from '../constants/legal';

const HOMEPAGE_VIDEO_BUCKET =
  (import.meta.env.VITE_HOMEPAGE_VIDEO_BUCKET as string | undefined)?.trim() || 'videos';
const HOMEPAGE_VIDEO_OBJECT_PATH =
  (import.meta.env.VITE_HOMEPAGE_VIDEO_STORAGE_PATH as string | undefined)?.trim() ||
  'sov black bg.mp4';

function publicHeroVideoUrl(): string {
  return supabase.storage.from(HOMEPAGE_VIDEO_BUCKET).getPublicUrl(HOMEPAGE_VIDEO_OBJECT_PATH).data
    .publicUrl;
}

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
  const [heroVideoSrc, setHeroVideoSrc] = useState(() => publicHeroVideoUrl());
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const heroTriedSignedUrl = useRef(false);

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

  useEffect(() => {
    const el = heroVideoRef.current;
    if (!el) return;
    el.defaultMuted = true;
    el.muted = true;
    const tryPlay = () => {
      void el.play().catch(() => {
        /* autoplay policies; muted + playsInline usually succeed */
      });
    };
    tryPlay();
    el.addEventListener('canplay', tryPlay);
    return () => el.removeEventListener('canplay', tryPlay);
  }, [heroVideoSrc]);

  async function retryHeroVideoWithSignedUrl() {
    if (heroTriedSignedUrl.current) return;
    heroTriedSignedUrl.current = true;
    const { data, error } = await supabase.storage
      .from(HOMEPAGE_VIDEO_BUCKET)
      .createSignedUrl(HOMEPAGE_VIDEO_OBJECT_PATH, 60 * 60 * 24 * 7);
    if (error || !data?.signedUrl) {
      if (import.meta.env.DEV) {
        console.error(
          '[Homepage hero video] Signed URL fallback failed:',
          error?.message ?? 'no URL',
          { bucket: HOMEPAGE_VIDEO_BUCKET, path: HOMEPAGE_VIDEO_OBJECT_PATH },
        );
      }
      return;
    }
    setHeroVideoSrc(data.signedUrl);
  }

  return (
    <div className="homepage">
      <Seo
        title={`${SITE_NAME} — Vintage & Thrift Clothing Online`}
        description={`${SITE_TAGLINE} Shop one-of-one pre-owned 90s, band tees, single stitch shirts, hoodies & jackets. Free US shipping.`}
        keywords={SITE_SEO_KEYWORDS}
        canonicalPath="/"
        ogImage={`${SITE_URL}/photos/SOV_PFP.jpg`}
      />
      <h1 className="visually-hidden">{SITE_NAME} — vintage thrift clothing online</h1>
      <Header />
      <div className="homepage-hero-video-wrap">
        <video
          key={heroVideoSrc}
          ref={heroVideoRef}
          className="homepage-hero-video"
          src={heroVideoSrc}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          tabIndex={-1}
          aria-hidden="true"
          onError={() => {
            if (import.meta.env.DEV) {
              console.error('[Homepage hero video] Load failed (check bucket is public or path matches):', heroVideoSrc);
            }
            void retryHeroVideoWithSignedUrl();
          }}
        />
      </div>
      <div className="category-grid">
        {CATEGORY_TILES.map(({ name, path, slug }) => {
          const sample = sampleByCategory[slug];
          return (
            <Link key={name} to={path}>
              <button type="button" className="category">
                <div className="thumbnail-row">
                  {sample ? (
                    <ProductThumbnail product={sample} className="thumbnail" />
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
      <div className="homepage-all-items-wrap">
        <Link to="/search" className="homepage-all-items-btn">
          ALL ITEMS <i className="fa-solid fa-arrow-right" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
};

export default Homepage;
