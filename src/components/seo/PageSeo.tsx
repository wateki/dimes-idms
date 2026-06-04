import { useEffect } from 'react';
import { getSiteUrl, SITE_NAME } from '@/config/site';

export type PageSeoProps = {
  title: string;
  description: string;
  path?: string;
  /** Prevent indexing (signup, login) */
  noIndex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

function upsertMeta(name: string, content: string, attribute: 'name' | 'property' = 'name') {
  let el = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attribute, name);
    document.head.appendChild(el);
  }
  el.content = content;
}

function upsertLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

function upsertJsonLd(data: Record<string, unknown> | Record<string, unknown>[]) {
  const id = 'page-seo-jsonld';
  let script = document.getElementById(id) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

export function PageSeo({ title, description, path = '', noIndex = false, jsonLd }: PageSeoProps) {
  const jsonLdKey = jsonLd ? JSON.stringify(jsonLd) : '';

  useEffect(() => {
    const siteUrl = getSiteUrl();
    const canonical = `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;

    document.title = fullTitle;
    upsertMeta('description', description);
    upsertMeta('robots', noIndex ? 'noindex, nofollow' : 'index, follow');
    upsertLink('canonical', canonical);

    upsertMeta('og:title', fullTitle, 'property');
    upsertMeta('og:description', description, 'property');
    upsertMeta('og:url', canonical, 'property');
    upsertMeta('og:type', 'website', 'property');
    upsertMeta('og:site_name', SITE_NAME, 'property');
    upsertMeta('og:image', `${siteUrl}/logo.png`, 'property');

    upsertMeta('twitter:card', 'summary_large_image');
    upsertMeta('twitter:title', fullTitle);
    upsertMeta('twitter:description', description);

    if (jsonLd) {
      upsertJsonLd(jsonLd);
    } else {
      document.getElementById('page-seo-jsonld')?.remove();
    }

    return () => {
      document.getElementById('page-seo-jsonld')?.remove();
    };
  }, [title, description, path, noIndex, jsonLdKey]);

  return null;
}
