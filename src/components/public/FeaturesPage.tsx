import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowRight,
  Database,
  Target,
  Smartphone,
  Network,
  BarChart3,
  Shield,
  Zap,
  Menu,
  X,
  CheckCircle2,
  FileText,
  Users,
  Globe,
  Activity
} from 'lucide-react';
import { useState } from 'react';

export function FeaturesPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const mainFeatures = [
    {
      icon: Database,
      title: 'Unified Data Harmonization',
      description: 'Break down data silos across organizations. Standardize, consolidate, and harmonize data from multiple sources into a single source of truth.',
      details: [
        'Multi-source data integration',
        'Automated data standardization',
        'Cross-organization data mapping',
        'Real-time data synchronization',
      ],
    },
    {
      icon: Target,
      title: 'MEAL Excellence',
      description: 'Comprehensive Monitoring, Evaluation, Accountability, and Learning framework built specifically for humanitarian organizations.',
      details: [
        'Indicator tracking and management',
        'Outcome and output monitoring',
        'Automated reporting workflows',
        'Impact assessment tools',
      ],
    },
    {
      icon: Smartphone,
      title: 'Mobile Data Collection',
      description: 'Seamless offline-first data collection with Dimes Collect mobile app. Your field teams can work anywhere, anytime.',
      details: [
        'Offline data collection',
        'Automatic sync when online',
        'GPS and media capture',
        'Native mobile experience',
      ],
    },
    {
      icon: Network,
      title: 'Cross-Organization Collaboration',
      description: 'Enable secure data sharing and collaboration across humanitarian organizations while maintaining data sovereignty.',
      details: [
        'Multi-organization support',
        'Secure data sharing protocols',
        'Role-based access control',
        'Cross-partner analytics',
      ],
    },
    {
      icon: BarChart3,
      title: 'Real-Time Analytics',
      description: 'Transform raw data into actionable insights with interactive dashboards and automated reporting.',
      details: [
        'Interactive dashboards',
        'Custom report generation',
        'Data visualization tools',
        'Automated KPI tracking',
      ],
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Bank-level security with role-based access control, audit trails, and compliance-ready data governance.',
      details: [
        'Role-based access control',
        'Comprehensive audit logs',
        'Data encryption at rest and in transit',
        'GDPR and compliance ready',
      ],
    },
  ];

  const additionalFeatures = [
    {
      icon: FileText,
      title: 'Project Management',
      description: 'Comprehensive project planning, tracking, and management tools built into the platform.',
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Work seamlessly with your team members across projects and organizations.',
    },
    {
      icon: Globe,
      title: 'Multi-Language Support',
      description: 'Support for multiple languages to serve organizations working globally.',
    },
    {
      icon: Activity,
      title: 'Activity Tracking',
      description: 'Track activities, subactivities, and their contributions to project outcomes.',
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
              <Link to="/features" className="text-sm font-medium text-emerald-600">
                Features
              </Link>
              <Link to="/pricing" className="text-sm font-medium text-gray-700 hover:text-emerald-600 transition-colors">
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
                <Link to="/features" className="text-sm font-medium text-emerald-600" onClick={() => setMobileMenuOpen(false)}>
                  Features
                </Link>
                <Link to="/pricing" className="text-sm font-medium text-gray-700 hover:text-emerald-600" onClick={() => setMobileMenuOpen(false)}>
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
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-emerald-50 to-white">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6">
            Powerful Features for Your Organization
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Everything you need to harmonize data, manage projects, and maximize impact—all in one platform.
          </p>
        </div>
      </section>

      {/* Main Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="space-y-12">
            {mainFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="border-2 hover:border-emerald-200 transition-all">
                  <CardHeader>
                    <div className="flex items-start gap-6">
                      <div className="w-16 h-16 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-8 h-8 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-3xl mb-3">{feature.title}</CardTitle>
                        <CardDescription className="text-lg mb-4">
                          {feature.description}
                        </CardDescription>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {feature.details.map((detail, i) => (
                            <div key={i} className="flex items-center">
                              <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-2 flex-shrink-0" />
                              <span className="text-gray-700">{detail}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Additional Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">And More</h2>
            <p className="text-xl text-gray-600">
              Additional features that make IDMS the complete solution for your organization
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {additionalFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="border-2 hover:border-emerald-200 transition-all">
                  <CardHeader>
                    <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-emerald-600" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-emerald-600 to-emerald-500">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Experience These Features?
          </h2>
          <p className="text-xl text-emerald-50 mb-8">
            Start your free trial and see how IDMS can transform your organization
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
