import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { 
  ArrowRight,
  CheckCircle2,
  Crown,
  Building2,
  Globe,
  Menu,
  X
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Footer } from '@/components/shared/Footer';


export function PricingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    // Reset and trigger animation independently for this page
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
      monthlyPrice: 0,
      annualPrice: 0,
      description: 'Perfect for small organizations getting started',
      features: [
        'Up to 2 users',
        'Up to 1 project',
        '5 forms and reports',
        '500 form submissions',
        'Dimes Mobile App Access',
        'Email support',
        'Basic features',
      ],
      cta: 'Start Free Trial',
      popular: false,
    },
    {
      name: 'Basic',
      icon: Building2,
      monthlyPrice: 99,
      annualPrice: 1069, // 99 * 12 * 0.9 (10% discount)
      description: 'For small to medium organizations',
      features: [
        'Up to 5 users',
        'Up to 3 projects',
        'Unlimited forms and reports',
        '2500 form submissions per month',
        'Dimes Mobile App Access',
        'Priority support',
        'Advanced features',
      ],
      cta: 'Start Today',
      popular: false,
    },
    {
      name: 'Professional',
      icon: Crown,
      monthlyPrice: 400,
      annualPrice: 4320, // 400 * 12 * 0.9 (10% discount)
      description: 'For growing organizations with advanced needs',
      features: [
        'Up to 20 users',
        'Up to 10 projects',
        'Unlimited forms and reports',
        '10,000 form submissions per month',
        'Dimes Mobile App Access',
        'Dedicated Server Instance',
        'Priority support',
        'Advanced analytics',
        'Custom integrations',
      ],
      cta: 'Start Today',
      popular: true,
    },
    {
      name: 'Enterprise',
      icon: Globe,
      monthlyPrice: 800,
      annualPrice: 8640, // 800 * 12 * 0.9 (10% discount)
      description: 'For large organizations with complex requirements',
      features: [
        'Unlimited users',
        'Unlimited projects',
        'Unlimited forms and reports',
        'Unlimited form submissions per month',
        'Dimes Mobile App Access',
        'Multi-region Dedicated Server Instances',
        'Dedicated support',
        'Advanced analytics',
        'Custom integrations',
        'SLA guarantee',
        'Custom training',
      ],
      cta: 'Start Today',
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-grid-pattern">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-emerald-100 dark:border-gray-800 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center">
              <img 
                src="/logo.png" 
                alt="Dimes IDMS Logo" 
                className="h-20 object-contain"
              />
            </Link>
            
            <div className="hidden md:flex items-center space-x-8">
              <Link to="/" className="text-sm font-medium text-gray-700 hover:text-emerald-600 transition-colors">
                Home
              </Link>
              <Link to="/features" className="text-sm font-medium text-gray-700 hover:text-emerald-600 transition-colors">
                Features
              </Link>
              <Link to="/pricing" className="text-sm font-medium text-emerald-600">
                Pricing
              </Link>
              <Link to="/about" className="text-sm font-medium text-gray-700 hover:text-emerald-600 transition-colors">
                About
              </Link>
              <Link to="/support" className="text-sm font-medium text-gray-700 hover:text-emerald-600 transition-colors">
                Support
              </Link>
              <Button variant="ghost" onClick={() => navigate('/login')}>
                Sign In
              </Button>
              <Button onClick={() => navigate('/signup')}>
                Get Started
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>

            <div className="md:hidden">
              <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-emerald-100">
              <div className="flex flex-col space-y-3">
                <Link to="/" className="text-sm font-medium text-gray-700 hover:text-emerald-600" onClick={() => setMobileMenuOpen(false)}>
                  Home
                </Link>
                <Link to="/features" className="text-sm font-medium text-gray-700 hover:text-emerald-600" onClick={() => setMobileMenuOpen(false)}>
                  Features
                </Link>
                <Link to="/pricing" className="text-sm font-medium text-emerald-600" onClick={() => setMobileMenuOpen(false)}>
                  Pricing
                </Link>
                <Link to="/about" className="text-sm font-medium text-gray-700 hover:text-emerald-600" onClick={() => setMobileMenuOpen(false)}>
                  About
                </Link>
                <Link to="/support" className="text-sm font-medium text-gray-700 hover:text-emerald-600" onClick={() => setMobileMenuOpen(false)}>
                  Support
                </Link>
                <Button variant="ghost" className="justify-start" onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}>
                  Sign In
                </Button>
                <Button className="justify-start" onClick={() => { navigate('/signup'); setMobileMenuOpen(false); }}>
                  Get Started
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-grid-pattern relative" style={{ backgroundImage: 'linear-gradient(to bottom, var(--gradient-start), var(--gradient-middle), var(--gradient-end)), linear-gradient(0deg, transparent 24%, var(--grid-color) 25%, var(--grid-color) 26%, transparent 27%, transparent 74%, var(--grid-color) 75%, var(--grid-color) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, var(--grid-color) 25%, var(--grid-color) 26%, transparent 27%, transparent 74%, var(--grid-color) 75%, var(--grid-color) 76%, transparent 77%, transparent)', backgroundSize: '100% 100%, 120px 120px, 120px 120px' }}>
        <div className={cn(
          "container mx-auto max-w-4xl text-center transition-all duration-1000",
          heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        )}>
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Choose the plan that fits your organization's needs. All plans include our core features.
          </p>
          
          {/* Billing Toggle */}
          <div className="relative inline-flex items-center p-1 bg-gray-100 rounded-lg">
            {/* Animated sliding background */}
            <div
              className={cn(
                "absolute top-1 bottom-1 left-1 rounded-md bg-white shadow-sm transition-all duration-300 ease-in-out",
                billingCycle === 'monthly' ? 'translate-x-0' : 'translate-x-full'
              )}
              style={{ width: 'calc(50% - 0.25rem)' }}
            />
            <ToggleGroup
              type="single"
              value={billingCycle}
              onValueChange={(value) => {
                if (value) setBillingCycle(value as 'monthly' | 'annual');
              }}
              className="relative z-10 inline-flex items-center"
            >
              <ToggleGroupItem
                value="monthly"
                aria-label="Monthly billing"
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-colors duration-300",
                  "data-[state=on]:text-emerald-600",
                  "data-[state=off]:text-gray-600 hover:data-[state=off]:text-gray-900",
                  "bg-transparent"
                )}
              >
                Monthly
              </ToggleGroupItem>
              <ToggleGroupItem
                value="annual"
                aria-label="Annual billing"
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-colors duration-300",
                  "data-[state=on]:text-emerald-600",
                  "data-[state=off]:text-gray-600 hover:data-[state=off]:text-gray-900",
                  "bg-transparent"
                )}
              >
                Annual
                <span className={cn(
                  "ml-2 text-xs px-2 py-0.5 rounded-full transition-all duration-300",
                  billingCycle === 'annual'
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-transparent text-gray-600'
                )}>
                  Save 10%
                </span>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-grid-pattern">
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, index) => {
              const Icon = plan.icon;
              const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
              const displayPrice = price ? (billingCycle === 'annual' ? price / 12 : price) : null;
              
              return (
                <div className="relative flex flex-col h-full">
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                      <span className="bg-emerald-600 text-white px-4 py-1 rounded-full text-sm font-medium shadow-lg">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <Card 
                    key={index}
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
                      {displayPrice !== null ? (
                        <>
                          {displayPrice === 0 ? (
                            <div key={`${plan.name}-${billingCycle}-free`} className="animate-fade-in">
                              <span className="text-4xl font-bold text-gray-900 dark:text-gray-100">$0</span>
                              <span className="text-gray-600 dark:text-gray-400">/month</span>
                            </div>
                          ) : (
                            <>
                              <div key={`${plan.name}-${billingCycle}-price`} className="flex flex-wrap items-baseline gap-1 min-w-0 animate-fade-in">
                                <span className="text-4xl font-bold text-gray-900 dark:text-gray-100 break-words min-w-0">${displayPrice.toLocaleString('en-US', { minimumFractionDigits: displayPrice % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}</span>
                                <span className="text-gray-600 dark:text-gray-400 flex-shrink-0">/{billingCycle === 'annual' ? 'month' : 'month'}</span>
                              </div>
                              {billingCycle === 'annual' && plan.annualPrice > 0 && (
                                <p key={`${plan.name}-${billingCycle}-billed`} className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-words max-w-full animate-fade-in" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                  Billed annually (${plan.annualPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/year)
                                </p>
                              )}
                            </>
                          )}
                        </>
                      ) : (
                        <span key={`${plan.name}-${billingCycle}-custom`} className="text-4xl font-bold text-gray-900 dark:text-gray-100 animate-fade-in">$0</span>
                      )}
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
            <p className="text-gray-600 mb-4">
              All plans include a 14-day free trial. No credit card required.
            </p>
            <Button variant="link" onClick={() => navigate('/signup')}>
              Compare all features
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-grid-pattern">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-6">
            {[
              {
                q: 'Can I change plans later?',
                a: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.',
              },
              {
                q: 'What happens after my free trial?',
                a: 'After your 14-day free trial, you can choose to continue with a paid plan or your account will be paused. No charges until you decide to continue.',
              },
              {
                q: 'Do you offer discounts for non-profits?',
                a: 'Yes, we offer special pricing for registered non-profit organizations. Contact our sales team for more information.',
              },
              {
                q: 'Is there a setup fee?',
                a: 'No, there are no setup fees. You only pay for your chosen plan.',
              },
            ].map((faq, index) => (
              <Card key={index} className="border-2">
                <CardHeader>
                  <CardTitle className="text-lg">{faq.q}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-emerald-600 to-emerald-500">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-emerald-50 mb-8">
            Start your free trial today. No credit card required.
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            className="text-lg px-8 py-6 h-auto bg-white text-emerald-600 hover:bg-gray-100"
            onClick={() => navigate('/signup')}
          >
            Start Free Trial
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
