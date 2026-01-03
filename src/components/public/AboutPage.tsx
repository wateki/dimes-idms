import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowRight,
  Globe,
  Target,
  Users,
  Heart,
  Shield,
  Zap,
  Menu,
  X,
  CheckCircle2
} from 'lucide-react';
import { useState } from 'react';

export function AboutPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-md border-b border-emerald-100 z-50">
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
              <Link to="/pricing" className="text-sm font-medium text-gray-700 hover:text-emerald-600 transition-colors">
                Pricing
              </Link>
              <Link to="/about" className="text-sm font-medium text-emerald-600">
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
                <Link to="/pricing" className="text-sm font-medium text-gray-700 hover:text-emerald-600" onClick={() => setMobileMenuOpen(false)}>
                  Pricing
                </Link>
                <Link to="/about" className="text-sm font-medium text-emerald-600" onClick={() => setMobileMenuOpen(false)}>
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
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-emerald-50 to-white">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6">
            Built for <span className="bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">Humanitarian Impact</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            We're on a mission to help humanitarian organizations spend less time managing data and more time changing lives.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
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
                Dimes IDMS was born from a simple truth: humanitarian organizations shouldn't struggle with data. 
                We built a platform that harmonizes information across teams, projects, and partners—automatically 
                and reliably—so you can focus on your mission, not your spreadsheets.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed mt-6">
                Whether you're coordinating multi-country programs or tracking impact across partners, 
                Dimes IDMS works quietly in the background, ensuring your data is always accurate, accessible, and actionable.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
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

      {/* Why IDMS */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why IDMS?</h2>
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
                description: 'IDMS works quietly in the background, harmonizing data and synchronizing information so you can focus on your mission, not on managing infrastructure.',
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

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-emerald-600 to-emerald-500">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Your Organization?
          </h2>
          <p className="text-xl text-emerald-50 mb-8">
            Join humanitarian organizations worldwide who trust IDMS
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
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-900 text-gray-400">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <img 
                  src="/logo.jpg" 
                  alt="Dimes IDMS Logo" 
                  className="w-8 h-8 object-contain"
                />
                <span className="text-white font-bold">Dimes IDMS</span>
              </div>
              <p className="text-sm">
                Integrated Data Management System for humanitarian organizations
              </p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="/features" className="hover:text-emerald-400 transition-colors">Features</Link></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Mobile App</a></li>
                <li><Link to="/pricing" className="hover:text-emerald-400 transition-colors">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="/support" className="hover:text-emerald-400 transition-colors">Documentation</Link></li>
                <li><Link to="/support" className="hover:text-emerald-400 transition-colors">Support</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="/about" className="hover:text-emerald-400 transition-colors">About</Link></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} Dimes IDMS. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
