import React, { useEffect } from 'react';
import { SITE_NAME } from '../constants/legal';
import { SITE_SEO_KEYWORDS, SITE_URL } from '../constants/site';

type SeoProps = {
  title: string;
  description?: string;
  keywords?: string;
  canonicalPath?: string;
  ogType?: 'website' | 'product' | 'article';
  /** Defaults to `title` — use shorter copy for Pinterest/social saves */
  ogTitle?: string;
  /**
   * Defaults to `description`. Pass `''` on product pages so Pinterest Save does not
   * duplicate title + blurb into one description field.
   */
  ogDescription?: string;
  ogImage?: string;
  /** Pinterest / Facebook product Rich Pins */
  productPriceCents?: number;
  productAvailable?: boolean;
  noindex?: boolean;
  children?: React.ReactNode;
};

function upsertMeta(name: string, content: string, attr: 'name' | 'property' = 'name') {
  if (content === '') {
    const existing = document.querySelector(`meta[${attr}="${name}"]`);
    existing?.remove();
    return;
  }
  if (!content) return;
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  if (!href) return;
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export const Seo: React.FC<SeoProps> = ({
  title,
  description,
  keywords,
  canonicalPath,
  ogType = 'website',
  ogTitle,
  ogDescription,
  ogImage,
  productPriceCents,
  productAvailable,
  noindex = false,
  children,
}) => {
  const socialTitle = ogTitle ?? title;
  const socialDescription = ogDescription !== undefined ? ogDescription : (description ?? '');

  useEffect(() => {
    document.title = title;

    if (description) upsertMeta('description', description);
    upsertMeta('keywords', keywords ?? SITE_SEO_KEYWORDS);

    const canonical = canonicalPath ? `${SITE_URL}${canonicalPath.startsWith('/') ? '' : '/'}${canonicalPath}` : SITE_URL;
    upsertLink('canonical', canonical);

    upsertMeta('robots', noindex ? 'noindex, nofollow' : 'index, follow');

    upsertMeta('og:title', socialTitle, 'property');
    upsertMeta('og:description', socialDescription, 'property');
    upsertMeta('og:type', ogType, 'property');
    upsertMeta('og:url', canonical, 'property');
    upsertMeta('og:site_name', SITE_NAME, 'property');
    if (ogImage) upsertMeta('og:image', ogImage, 'property');

    if (ogType === 'product' && productPriceCents != null) {
      upsertMeta('product:price:amount', (productPriceCents / 100).toFixed(2), 'property');
      upsertMeta('product:price:currency', 'USD', 'property');
    }
    if (ogType === 'product' && productAvailable != null) {
      const availability = productAvailable ? 'instock' : 'out of stock';
      upsertMeta('product:availability', availability, 'property');
      upsertMeta('og:availability', availability, 'property');
    }

    upsertMeta('twitter:card', ogImage ? 'summary_large_image' : 'summary');
    upsertMeta('twitter:title', socialTitle);
    if (socialDescription) upsertMeta('twitter:description', socialDescription);
    if (ogImage) upsertMeta('twitter:image', ogImage);
  }, [
    title,
    description,
    ogTitle,
    ogDescription,
    keywords,
    canonicalPath,
    ogType,
    ogImage,
    productPriceCents,
    productAvailable,
    noindex,
  ]);

  return <>{children}</>;
};

type JsonLdProps = {
  data: Record<string, unknown> | Record<string, unknown>[];
};

export const JsonLd: React.FC<JsonLdProps> = ({ data }) => (
  <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
);
