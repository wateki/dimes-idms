import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { 
  ArrowRight,
  Menu,
  X,
  BookOpen,
  GraduationCap,
  Users,
  Headphones
} from 'lucide-react';

const testimonials = [
  {
    quote: "Dimes IDMS support doesn't just answer tickets, they open doors. Onboarding was a masterclass.",
    name: 'Fatima N., Digital MEAL Lead',
    org: 'Save Africa Coalition',
  },
  {
    quote: 'Their team feels like an extension of ours. Fast, strategic, and real expertise.',
    name: 'Carlos V., Head of Data',
    org: 'OneWorld Responders',
  },
  {
    quote: 'Training with Dimes IDMS got us reporting results—even our field teams rave about it.',
    name: 'Josephine K., Project Manager',
    org: 'Global Youth Fund',
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
    features: ['24/7 email support', 'Priority response', 'Video consultations', 'Implementation assistance'],
  }
];

export function SupportPage() {
  const navigate = useNavigate();
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTestimonial(t => (t + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);
  
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
              <Link to="/about" className="text-sm font-medium text-gray-700 hover:text-emerald-600 transition-colors">
                About
              </Link>
              <Link to="/support" className="text-sm font-medium text-emerald-600">
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
                <Link to="/about" className="text-sm font-medium text-gray-700 hover:text-emerald-600" onClick={() => setMobileMenuOpen(false)}>
                  About
                </Link>
                <Link to="/support" className="text-sm font-medium text-emerald-600" onClick={() => setMobileMenuOpen(false)}>
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

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-emerald-50 to-white text-center">
        <div className="max-w-4xl mx-auto animate-fade-in">
          <span className="mb-6 inline-block px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold">ENTERPRISE SUPPORT</span>
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Built-in Success,
            <br />
            <span className="bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent">By Design</span>
          </h1>
          <div className="text-xl text-gray-700 max-w-3xl mx-auto mb-8 leading-relaxed">
            Enterprise-grade support that scales with your organization. From implementation to optimization, 
            we're committed to your long-term success.
          </div>
          <Button size="lg" className="text-lg px-8 py-6 h-auto bg-emerald-600 hover:bg-emerald-700 shadow-lg animate-slide-in-up" onClick={() => navigate('/signup')}>
            Talk to Our Team
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Support Avenues Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Comprehensive Support Ecosystem</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Multi-channel support designed to ensure your success at every stage of your journey with Dimes IDMS.
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
      <section className="py-20 px-4 bg-gradient-to-br from-emerald-50 to-white">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Trusted by Leading Organizations</h2>
            <p className="text-gray-600">Real results from humanitarian teams worldwide</p>
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

      {/* Final CTA Card */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-4xl">
          <Card className="rounded-2xl border-2 border-emerald-300 shadow-2xl bg-gradient-to-br from-white to-emerald-50">
            <CardHeader className="pb-4">
              <h2 className="text-4xl font-bold mb-3 text-gray-900">Ready to Get Started?</h2>
              <CardDescription className="text-xl text-gray-700">
                Join humanitarian organizations worldwide who trust Dimes IDMS to power their data infrastructure.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mt-4">
                <Button size="lg" className="flex-1 text-lg bg-emerald-600 hover:bg-emerald-700 shadow-lg" onClick={() => navigate('/signup')}>
                  Start Free Trial
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button size="lg" variant="outline" className="flex-1 text-lg border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 shadow" onClick={() => navigate('/about')}>
                  Contact Sales
                </Button>
              </div>
              <p className="text-sm text-gray-500 text-center mt-6">
                No credit card required • 14-day free trial • Cancel anytime
              </p>
            </CardContent>
          </Card>
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
