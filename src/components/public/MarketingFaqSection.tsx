import type { MarketingFaq } from '@/data/marketingFaqs';

type Props = {
  faqs: MarketingFaq[];
  title?: string;
  subtitle?: string;
};

export function MarketingFaqSection({
  faqs,
  title = 'Frequently asked questions',
  subtitle = 'Quick answers for MEAL and program teams evaluating DIMES IDMS',
}: Props) {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900" aria-labelledby="faq-heading">
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-12">
          <h2 id="faq-heading" className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            {title}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">{subtitle}</p>
        </div>
        <dl className="space-y-6">
          {faqs.map((faq) => (
            <div
              key={faq.question}
              className="rounded-lg border border-emerald-100 dark:border-gray-700 p-6 bg-emerald-50/30 dark:bg-gray-800/50"
            >
              <dt className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {faq.question}
              </dt>
              <dd className="text-gray-600 dark:text-gray-300 leading-relaxed">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
