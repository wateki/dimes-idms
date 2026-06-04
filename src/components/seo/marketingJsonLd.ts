import { CONTACT_EMAIL, getSiteUrl, SITE_NAME, SITE_TAGLINE } from '@/config/site';
import type { MarketingFaq } from '@/data/marketingFaqs';

export function organizationAndSoftwareJsonLd() {
  const url = getSiteUrl();
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: SITE_NAME,
      url,
      logo: `${url}/logo.png`,
      description: SITE_TAGLINE,
      email: CONTACT_EMAIL,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: SITE_NAME,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        description: 'Free tier available; paid plans from $150/month',
      },
      description: SITE_TAGLINE,
      url,
    },
  ];
}

export function faqPageJsonLd(faqs: MarketingFaq[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}
