import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowRight,
  CheckCircle2,
  Crown,
  Building2,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Footer } from '@/components/shared/Footer';
import { usePricingCurrency } from '@/hooks/usePricingCurrency';
import { PageSeo } from '@/components/seo/PageSeo';
import { faqPageJsonLd, organizationAndSoftwareJsonLd } from '@/components/seo/marketingJsonLd';
import { PublicNav } from '@/components/public/layout/PublicNav';
import { PublicCtaBand } from '@/components/public/layout/PublicCtaBand';
import { IntegrationsStrip } from '@/components/public/layout/IntegrationsStrip';
import { MarketingFaqSection } from '@/components/public/MarketingFaqSection';
import { pricingFaqs } from '@/data/marketingFaqs';
import { CTA } from '@/data/marketingCopy';

export function PricingPage() {
  const navigate = useNavigate();
  const [heroVisible, setHeroVisible] = useState(false);
  const [showInUsd, setShowInUsd] = useState(false);

  const {
    currency,
    rate,
    country,
    currencySymbol,
    loading: currencyLoading,
    error: currencyError,
    isConverted,
    formatPrice,
  } = usePricingCurrency();

  const useLocalCurrency = isConverted && !showInUsd;

  useEffect(() => {
    setHeroVisible(false);
    const timer = setTimeout(() => {
      setHeroVisible(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const plans = [
    {
      name: 'Free',
      icon: Building2,
      annualPrice: 0,
      description: 'Perfect for small organizations getting started',
      features: [
        'Up to 2 users',
        'Up to 1 project',
        '5 forms and reports',
        '500 form submissions',
        'Dimes Collect Mobile App Access',
        'Email support',
        'Basic features',
      ],
      cta: CTA.primary,
      popular: false,
    },
    {
      name: 'Basic',
      icon: Building2,
      annualPrice: 199,
      description: 'For small to medium organizations',
      features: [
        'Up to 7 users',
        'Up to 4 projects',
        'Unlimited forms and reports',
        '2500 form submissions per month',
        'Dimes Collect Mobile App Access',
        'Priority support',
        'Advanced features',
      ],
      cta: 'Choose Basic',
      popular: false,
    },
    {
      name: 'Professional',
      icon: Crown,
      annualPrice: 399,
      description: 'For growing organizations with advanced needs',
      features: [
        'Up to 20 users',
        'Up to 10 projects',
        'Unlimited forms and reports',
        '10,000 form submissions per month',
        'Dimes Collect Mobile App Access',
        'Dedicated Server Instance',
        'Priority support',
        'Advanced analytics',
        'Custom integrations',
      ],
      cta: 'Choose Professional',
      popular: true,
    },
    {
      name: 'Enterprise',
      icon: Globe,
      annualPrice: 799,
      description: 'For large organizations with complex requirements',
      features: [
        'Unlimited users',
        'Unlimited projects',
        'Unlimited forms and reports',
        'Unlimited form submissions per month',
        'Dimes Collect Mobile App Access',
        'Multi-region Dedicated Server Instances',
        'Dedicated support',
        'Advanced analytics',
        'Custom integrations',
        'SLA guarantee',
        'Custom training',
      ],
      cta: 'Choose Enterprise',
      popular: false,
    },
  ];

  const pricingJsonLd = [...organizationAndSoftwareJsonLd(), faqPageJsonLd(pricingFaqs)];

  return (
    <div className="min-h-screen bg-grid-pattern">
      <PageSeo
        title="Pricing — Free & Paid Plans for NGOs"
        description="DIMES IDMS pricing: Free plan (2 users, 1 project), Basic $150/year, Professional $400/year, Enterprise $800/year. No credit card required for Free."
        path="/pricing"
        jsonLd={pricingJsonLd}
      />
      <PublicNav activePage="pricing" />

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-grid-pattern relative" style={{ backgroundImage: 'linear-gradient(to bottom, var(--gradient-start), var(--gradient-middle), var(--gradient-end)), linear-gradient(0deg, transparent 24%, var(--grid-color) 25%, var(--grid-color) 26%, transparent 27%, transparent 74%, var(--grid-color) 75%, var(--grid-color) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, var(--grid-color) 25%, var(--grid-color) 26%, transparent 27%, transparent 74%, var(--grid-color) 75%, var(--grid-color) 76%, transparent 77%, transparent)', backgroundSize: '100% 100%, 120px 120px, 120px 120px' }}>
        <div className={cn(
          "container mx-auto max-w-4xl text-center transition-all duration-1000",
          heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        )}>
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-4">
            Start free, scale as programs grow. Every plan includes core MEAL workflows, Dimes Collect mobile access, and data import.
          </p>
          <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium mb-8">
            Free plan — no credit card required
          </p>

          {!currencyLoading && (isConverted || currencyError) && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm text-gray-600">
              {isConverted ? (
                <>
                  <span>
                    Prices in {currency} {country ? `(${country})` : ''} — converted from USD
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowInUsd(!showInUsd)}
                    className="text-emerald-600 hover:underline font-medium"
                  >
                    {showInUsd ? 'Show in ' + currency : 'Show in USD'}
                  </button>
                </>
              ) : (
                currencyError && (
                  <span className="text-gray-500">Showing USD (location unavailable)</span>
                )
              )}
            </div>
          )}
        </div>
      </section>

      <IntegrationsStrip />

      {/* Pricing Cards */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-grid-pattern">
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, index) => {
              const Icon = plan.icon;
              const displayPrice = plan.annualPrice;

              return (
                <div key={index} className="relative flex flex-col h-full">
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                      <span className="bg-emerald-600 text-white px-4 py-1 rounded-full text-sm font-medium shadow-lg">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <Card
                    className={cn(
                      "border-2 relative transition-all duration-300 hover:shadow-xl flex flex-col h-full overflow-hidden min-w-0",
                      plan.popular
                        ? "border-emerald-500"
                        : "border-emerald-100 hover:border-emerald-200"
                    )}
                  >
                    <CardHeader className={cn("flex-shrink-0 overflow-hidden", plan.popular && "pt-6")}>
                      <div className="flex items-center justify-between mb-4">
                        <CardTitle className="text-2xl">{plan.name}</CardTitle>
                        <div className={cn(
                          "w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0",
                          plan.popular ? "bg-emerald-100" : "bg-gray-100"
                        )}>
                          <Icon className={cn(
                            "w-6 h-6",
                            plan.popular ? "text-emerald-600" : "text-gray-600"
                          )} />
                        </div>
                      </div>
                      <div className="mb-4 min-w-0 relative">
                        <div className="flex flex-wrap items-baseline gap-1 min-w-0 animate-fade-in">
                          <span className="text-4xl font-bold text-gray-900 dark:text-gray-100 break-words min-w-0">
                            {displayPrice === 0
                              ? (useLocalCurrency ? formatPrice(0) : '$0')
                              : (useLocalCurrency
                                  ? formatPrice(displayPrice)
                                  : `$${displayPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`)
                            }
                          </span>
                          <span className="text-gray-600 dark:text-gray-400 flex-shrink-0">/year</span>
                        </div>
                      </div>
                      <CardDescription className="text-base min-h-[4.5rem]">
                        {plan.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col flex-1 min-w-0 overflow-hidden">
                      <ul className="space-y-3 mb-6 flex-1 min-w-0">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-center text-sm">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0" />
                            <span className="text-gray-600">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        className={cn(
                          "w-full mt-auto",
                          plan.popular
                            ? "bg-emerald-600 hover:bg-emerald-700"
                            : "border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                        )}
                        variant={plan.popular ? "default" : "outline"}
                        onClick={() => navigate('/signup')}
                      >
                        {plan.cta}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Need NGO pricing or multi-country rollout?{' '}
              <button type="button" className="text-emerald-600 hover:underline font-medium" onClick={() => navigate('/contact')}>
                Contact sales
              </button>
            </p>
            <Button variant="link" onClick={() => navigate('/features')}>
              Compare all features
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      <MarketingFaqSection faqs={pricingFaqs} title="Pricing questions" />

      <PublicCtaBand showSecondary={false} />

      {/* Footer */}
      <Footer />
    </div>
  );
}
