import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Globe,
  Target,
  Users,
  Heart,
  Shield,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Footer } from '@/components/shared/Footer';
import { PageSeo } from '@/components/seo/PageSeo';
import { organizationAndSoftwareJsonLd } from '@/components/seo/marketingJsonLd';
import { PublicNav } from '@/components/public/layout/PublicNav';
import { PublicCtaBand } from '@/components/public/layout/PublicCtaBand';
import { PRODUCT_NAME } from '@/data/marketingCopy';

export function AboutPage() {
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    // Reset and trigger animation independently for this page
    setHeroVisible(false);
    const timer = setTimeout(() => {
      setHeroVisible(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const values = [
    {
      icon: Heart,
      title: 'Mission-Driven',
      description: 'We believe technology should serve humanity. Our platform empowers organizations to make data-driven decisions that create lasting impact.',
    },
    {
      icon: Shield,
      title: 'Security First',
      description: 'Your data is your most valuable asset. We implement enterprise-grade security measures to protect sensitive humanitarian information.',
    },
    {
      icon: Globe,
      title: 'Global Reach',
      description: 'Built for organizations working across borders, languages, and cultures. We understand the unique challenges of humanitarian work.',
    },
    {
      icon: Zap,
      title: 'Innovation',
      description: 'Continuously evolving to meet the changing needs of humanitarian organizations with cutting-edge technology and best practices.',
    },
  ];

  const team = [
    {
      name: 'Our Team',
      role: 'Dedicated to Your Success',
      description: 'We are a team of technologists, data scientists, and humanitarian professionals committed to making data work for good.',
    },
  ];

  return (
    <div className="min-h-screen bg-grid-pattern">
      <PageSeo
        title="About — Mission-Driven MEAL Technology"
        description="Learn about DIMES IDMS and GARTS Eastern Africa: mission-driven data platforms for humanitarian organizations with security-first design and global MEAL expertise."
        path="/about"
        jsonLd={organizationAndSoftwareJsonLd()}
      />
      <PublicNav activePage="about" />

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-grid-pattern relative" style={{ backgroundImage: 'linear-gradient(to bottom, var(--gradient-start), var(--gradient-middle), var(--gradient-end)), linear-gradient(0deg, transparent 24%, var(--grid-color) 25%, var(--grid-color) 26%, transparent 27%, transparent 74%, var(--grid-color) 75%, var(--grid-color) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, var(--grid-color) 25%, var(--grid-color) 26%, transparent 27%, transparent 74%, var(--grid-color) 75%, var(--grid-color) 76%, transparent 77%, transparent)', backgroundSize: '100% 100%, 120px 120px, 120px 120px' }}>
        <div className={cn(
          "container mx-auto max-w-4xl text-center transition-all duration-1000",
          heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        )}>
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6">
            Built for <span className="bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">Humanitarian Impact</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            We're on a mission to help humanitarian organizations spend less time managing data and more time changing lives.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-grid-pattern">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Mission</h2>
            <p className="text-xl text-gray-600">
              Transform data from a burden into your strategic advantage.
            </p>
          </div>

          <Card className="border-2 border-emerald-100 bg-gradient-to-br from-white to-emerald-50/30">
            <CardContent className="p-8">
              <p className="text-lg text-gray-700 leading-relaxed">
                {PRODUCT_NAME} is built by GARTS Eastern Africa for a simple truth: humanitarian organizations should not lose weeks to spreadsheet merges. 
                We harmonize information across teams, projects, and partners so MEAL leads can report with confidence.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed mt-6">
                Whether you coordinate multi-country programs or track impact with donors, {PRODUCT_NAME} keeps field, partner, and HQ data aligned — 
                without forcing every team onto a new collection tool.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-grid-pattern">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Values</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <Card key={index} className="border-2 hover:border-emerald-200 transition-all">
                  <CardHeader>
                    <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-emerald-600" />
                    </div>
                    <CardTitle className="text-2xl">{value.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {value.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why DIMES */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-grid-pattern">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why DIMES?</h2>
          </div>

          <div className="space-y-6">
            {[
              {
                title: 'Built for Organizations',
                description: 'We understand that humanitarian organizations have unique needs. Our platform is designed specifically for organizations working across borders, languages, and cultures.',
              },
              {
                title: 'Data Harmonization First',
                description: 'Break down data silos and standardize information across your organization and partners. Our platform ensures data consistency without disrupting your workflow.',
              },
              {
                title: 'Silent Operation',
                description: 'DIMES works quietly in the background, harmonizing data and synchronizing information so you can focus on your mission, not on managing infrastructure.',
              },
              {
                title: 'Mobile-First Approach',
                description: 'With Dimes Collect, your field teams can collect data offline and sync automatically when connectivity returns. No more lost data or manual transfers.',
              },
            ].map((item, index) => (
              <Card key={index} className="border-2 hover:border-emerald-200 transition-all">
                <CardHeader>
                  <CardTitle className="text-xl">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <PublicCtaBand
        title="Work with a team that understands MEAL"
        subtitle="Talk to us about rollout, training, or NGO pricing — or start on the Free plan today."
        secondaryLabel="Contact us"
        secondaryPath="/contact"
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}
