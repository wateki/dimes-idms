/** Canonical site URL for SEO, sitemap, and JSON-LD. Override with VITE_SITE_URL in production. */
export const DEFAULT_SITE_URL = 'https://idms.dimes.africa';

export const SITE_NAME = 'DIMES IDMS';
export const SITE_TAGLINE =
  'Integrated Data Management System for humanitarian and MEAL organizations';

export const CONTACT_EMAIL = 'ian_warutere@gartsafrica.com';

/** E.164 without + — used for wa.me links */
export const WHATSAPP_NUMBER = '254114904624';

export const WHATSAPP_DEFAULT_MESSAGE =
  'Hi, I would like to learn more about DIMES IDMS.';

export function whatsappUrl(message: string = WHATSAPP_DEFAULT_MESSAGE): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function getSiteUrl(): string {
  const fromEnv = import.meta.env.VITE_SITE_URL as string | undefined;
  if (fromEnv?.trim()) {
    return fromEnv.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return DEFAULT_SITE_URL;
}
