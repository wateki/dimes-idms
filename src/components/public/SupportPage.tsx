import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { 
  ArrowRight,
  BookOpen,
  GraduationCap,
  Users,
  Headphones
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Footer } from '@/components/shared/Footer';
import { PageSeo } from '@/components/seo/PageSeo';
import { PublicNav } from '@/components/public/layout/PublicNav';
import { PublicCtaBand } from '@/components/public/layout/PublicCtaBand';
import { CTA, PRODUCT_NAME } from '@/data/marketingCopy';

const testimonials = [
  {
    quote: 'Onboarding helped us connect Kobo exports to KPI views in the first week — field staff did not need a new workflow.',
    name: 'MEAL lead',
    org: 'Humanitarian program team',
  },
  {
    quote: 'Support understood donor reporting deadlines. We got clear answers on approvals and data imports, not generic IT tickets.',
    name: 'Program manager',
    org: 'Multi-partner consortium',
  },
  {
    quote: 'Training focused on what our M&E team actually does: harmonize indicators, map activities, and publish dashboards.',
    name: 'Monitoring officer',
    org: 'Regional NGO',
  },
];

const supportAvenues = [
  {
    key: 'documentation',
    icon: BookOpen,
    title: 'Comprehensive Documentation',
    description: 'Access detailed guides, API references, and best practices written by practitioners who understand humanitarian operations.',
    features: ['Step-by-step tutorials', 'API documentation', 'Integration guides', 'Video walkthroughs'],
  },
  {
    key: 'training',
    icon: GraduationCap,
    title: 'Expert Training & Onboarding',
    description: 'Customized training programs designed to get your team productive quickly with role-specific learning paths.',
    features: ['Live onboarding sessions', 'Role-based training', 'Certification programs', 'Recorded workshops'],
  },
  {
    key: 'community',
    icon: Users,
    title: 'Active Community',
    description: 'Connect with other humanitarian organizations, share insights, and learn from real-world implementations.',
    features: ['Community forums', 'Monthly webinars', 'User groups', 'Feature requests'],
  },
  {
    key: 'live',
    icon: Headphones,
    title: 'Dedicated Support Team',
    description: 'Direct access to our support specialists who understand the unique challenges of humanitarian data management.',
    features: ['Email support on all plans', 'Priority response on paid plans', 'Video consultations', 'Implementation assistance'],
  }
];

export function SupportPage() {
  const navigate = useNavigate();
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [heroVisible, setHeroVisible] = useState(false);
  
  useEffect(() => {
    // Reset and trigger animation independently for this page
    setHeroVisible(false);
    const heroTimer = setTimeout(() => {
      setHeroVisible(true);
    }, 50);
    
    const testimonialTimer = setInterval(() => {
      setActiveTestimonial(t => (t + 1) % testimonials.length);
    }, 5000);
    
    return () => {
      clearTimeout(heroTimer);
      clearInterval(testimonialTimer);
    };
  }, []);
  
  return (
    <div className="min-h-screen bg-grid-pattern">
      <PageSeo
        title="Support & Documentation"
        description="DIMES IDMS support: documentation, training, community resources, and dedicated help for humanitarian MEAL and data teams."
        path="/support"
      />
      <PublicNav activePage="support" />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-grid-pattern text-center relative" style={{ backgroundImage: 'linear-gradient(to bottom, rgba(209, 250, 229, 0.3), rgba(255, 255, 255, 0.5)), linear-gradient(0deg, transparent 24%, #E1E1E1 25%, #E1E1E1 26%, transparent 27%, transparent 74%, #E1E1E1 75%, #E1E1E1 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, #E1E1E1 25%, #E1E1E1 26%, transparent 27%, transparent 74%, #E1E1E1 75%, #E1E1E1 76%, transparent 77%, transparent)', backgroundSize: '100% 100%, 120px 120px, 120px 120px' }}>
        <div className={cn(
          "max-w-4xl mx-auto transition-all duration-1000",
          heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        )}>
          <span className="mb-6 inline-block px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold">MEAL & DATA SUPPORT</span>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Onboarding and support for
            <br />
            <span className="bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent">humanitarian data teams</span>
          </h1>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-8 leading-relaxed">
            Documentation, training, and direct help from people who understand Kobo, donor reporting, and multi-partner MEAL — not generic SaaS tickets.
          </p>
          <Button size="lg" className="text-lg px-8 py-6 h-auto bg-emerald-600 hover:bg-emerald-700 shadow-lg" onClick={() => navigate('/contact')}>
            {CTA.contact}
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Support Avenues Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-grid-pattern">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Comprehensive Support Ecosystem</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Multi-channel support designed for every stage of your journey with {PRODUCT_NAME}.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {supportAvenues.map((avenue) => {
              const Icon = avenue.icon;
              return (
                <Card 
                  key={avenue.key} 
                  className="border border-gray-200 hover:border-emerald-300 transition-all duration-300 hover:shadow-lg overflow-hidden group"
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">{avenue.title}</h3>
                        <p className="text-gray-600 leading-relaxed">{avenue.description}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {avenue.features.map((feature: string, idx: number) => (
                        <li key={idx} className="flex items-center text-gray-700">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-3" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonial Carousel */}
      <section className="py-20 px-4 bg-grid-pattern relative" style={{ backgroundImage: 'linear-gradient(to bottom, var(--gradient-start), var(--gradient-middle), var(--gradient-end)), linear-gradient(0deg, transparent 24%, var(--grid-color) 25%, var(--grid-color) 26%, transparent 27%, transparent 74%, var(--grid-color) 75%, var(--grid-color) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, var(--grid-color) 25%, var(--grid-color) 26%, transparent 27%, transparent 74%, var(--grid-color) 75%, var(--grid-color) 76%, transparent 77%, transparent)', backgroundSize: '100% 100%, 120px 120px, 120px 120px' }}>
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">What teams value in rollout</h2>
            <p className="text-gray-600">Typical feedback themes from MEAL and program leads</p>
          </div>
          <div className="max-w-3xl mx-auto text-center relative">
            <div className="shadow-xl rounded-2xl p-10 bg-white border-2 border-emerald-200">
              <div className="mb-6 text-2xl text-emerald-700 font-semibold min-h-[80px] transition-all duration-500 leading-relaxed" key={testimonials[activeTestimonial].quote}>
                "{testimonials[activeTestimonial].quote}"
              </div>
              <div className="text-gray-700 text-base">
                <strong className="text-gray-900">{testimonials[activeTestimonial].name}</strong>
                <span className="text-gray-500"> • {testimonials[activeTestimonial].org}</span>
              </div>
            </div>
            {/* Carousel Controls */}
            <div className="flex justify-center mt-6 gap-2">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveTestimonial(idx)}
                  aria-label={`Show testimonial ${idx + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${activeTestimonial === idx ? 'bg-emerald-600 w-8' : 'bg-emerald-200 w-2 hover:w-4'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <PublicCtaBand
        secondaryLabel={CTA.contact}
        secondaryPath="/contact"
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}
