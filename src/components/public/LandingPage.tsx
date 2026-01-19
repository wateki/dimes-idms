import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Database, 
  Users, 
  BarChart3, 
  Globe,
  ArrowRight,
  CheckCircle2,
  Smartphone,
  Shield,
  Zap,
  Network,
  TrendingUp,
  FileText,
  Target,
  Activity,
  Sparkles,
  Play,
  ChevronRight,
  Crown,
  Building2,
  Menu,
  X,
  Map,
  Upload,
  FileCheck,
  FolderKanban
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Footer } from '@/components/shared/Footer';

const features = [
  {
    icon: Database,
    title: 'Unified Data Harmonization',
    description: 'Break down data silos across organizations. Standardize, consolidate, and harmonize data from multiple sources into a single source of truth.',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  {
    icon: Target,
    title: 'Integrated KPI Analytics',
    description: 'Track and visualize Key Performance Indicators in real-time. Link organizational goals with project objectives for comprehensive performance monitoring.',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  {
    icon: Map,
    title: 'Spatial Analytics & Mapping',
    description: 'Visualize project data geographically with advanced spatial analytics. Map interventions, track coverage, and analyze geographic patterns.',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  {
    icon: Upload,
    title: 'Data Import & Integration',
    description: 'Import data from multiple sources seamlessly. Support for Excel, CSV, KoboToolbox, ODK, and custom integrations.',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  {
    icon: FolderKanban,
    title: 'Inbuilt FCRM System',
    description: 'Field Case Relationship Management built-in. Track cases, manage beneficiary relationships, and monitor interventions from the field.',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  {
    icon: FileCheck,
    title: 'Review & Approval Workflows',
    description: 'Integrated reports upload with built-in review and approval workflows. Ensure data quality and accountability at every step.',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  {
    icon: Smartphone,
    title: 'Mobile-First Collection',
    description: 'Seamless offline data collection with Dimes Collect mobile app. Sync automatically when connectivity returns.',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  {
    icon: Network,
    title: 'Cross-Organization Collaboration',
    description: 'Enable secure data sharing and collaboration across humanitarian organizations while maintaining data sovereignty.',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Bank-level security with role-based access control, audit trails, and compliance-ready data governance.',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
];

const organizationLogos = [
  { src: '/organization-logos/ics.png', alt: 'ICS' },
  { src: '/organization-logos/chmpLogo.png', alt: 'CHMP' },
  { src: '/organization-logos/girls-education-challenge.png', alt: 'Girls Education Challenge' },
  { src: '/organization-logos/kakenya.jpg', alt: 'Kakenya' },
  { src: '/organization-logos/Leonard_Cheshire_logo_RGB_Colour_AW.svg', alt: 'Leonard Cheshire' },
  { src: '/organization-logos/merti.jpg', alt: 'Merti' },
  { src: '/organization-logos/sign-of-hope.png', alt: 'Sign of Hope' },
];

export function LandingPage() {
  const navigate = useNavigate();
  const [heroVisible, setHeroVisible] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [visibleFeatures, setVisibleFeatures] = useState<Set<number>>(new Set());
  const featuresRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reset and trigger animation independently for this page
    setHeroVisible(false);
    const heroTimer = setTimeout(() => {
      setHeroVisible(true);
    }, 50);
    
    // Intersection Observer for scroll animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-feature-index') || '0', 10);
            setVisibleFeatures(prev => {
              const newSet = new Set(prev);
              newSet.add(index);
              return newSet;
            });
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.01, rootMargin: '50px' }
    );

    // Use a small delay to ensure DOM is ready, then observe all feature cards
    let fallbackTimer: NodeJS.Timeout;
    const timer = setTimeout(() => {
      const elements = document.querySelectorAll('[data-feature-index]');
      if (elements.length > 0) {
        elements.forEach((el) => observer.observe(el));
        // Fallback: if observer doesn't trigger within 1 second, show all cards
        fallbackTimer = setTimeout(() => {
          setVisibleFeatures(prev => {
            if (prev.size === 0) {
              // Show all cards if none are visible yet
              return new Set(Array.from({ length: features.length }, (_, i) => i));
            }
            return prev;
          });
        }, 1000);
      } else {
        // If no elements found, show all cards immediately
        setVisibleFeatures(new Set(Array.from({ length: features.length }, (_, i) => i)));
      }
    }, 100);

    return () => {
      clearTimeout(heroTimer);
      clearTimeout(timer);
      if (fallbackTimer) clearTimeout(fallbackTimer);
      observer.disconnect();
    };
  }, []);

  const benefits = [
    'Track KPIs and link organizational goals to projects',
    'Visualize data geographically with spatial analytics',
    'Import data from multiple sources seamlessly',
    'Manage field cases with built-in FCRM system',
    'Streamline approvals with review workflows',
    'Reduce data collection time by 60%',
    'Mobile data collection with offline capabilities',
    'Cross-organization collaboration and data sharing',
  ];

  const useCases = [
    {
      title: 'Humanitarian Organizations',
      description: 'Coordinate multi-partner programs with unified data standards and real-time monitoring.',
      icon: Globe,
    },
    {
      title: 'MEAL Organizations',
      description: 'Streamline monitoring and evaluation workflows with automated data collection and analysis.',
      icon: Activity,
    },
    {
      title: 'Project Management Organizations',
      description: 'Gain complete visibility into project performance, outcomes, and impact metrics.',
      icon: TrendingUp,
    },
    {
      title: 'Data-Driven Organizations',
      description: 'Access harmonized, clean data ready for analysis without manual preprocessing.',
      icon: FileText,
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
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <Link to="/" className="text-sm font-medium text-emerald-600">
                Home
              </Link>
              <Link to="/features" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                Features
              </Link>
              <Link to="/pricing" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                Pricing
              </Link>
              <Link to="/about" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                About
              </Link>
              <Link to="/support" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                Support
              </Link>
              <Link to="/contact" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                Contact
              </Link>
              <Button variant="ghost" onClick={() => navigate('/login')}>
                Sign In
              </Button>
              <Button onClick={() => navigate('/signup')}>
                Get Started
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-emerald-100 dark:border-gray-800">
              <div className="flex flex-col space-y-3">
                <Link to="/" className="text-sm font-medium text-emerald-600" onClick={() => setMobileMenuOpen(false)}>
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
                <Link to="/support" className="text-sm font-medium text-gray-700 hover:text-emerald-600" onClick={() => setMobileMenuOpen(false)}>
                  Support
                </Link>
                <Link to="/contact" className="text-sm font-medium text-gray-700 hover:text-emerald-600" onClick={() => setMobileMenuOpen(false)}>
                  Contact
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
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-grid-pattern overflow-hidden relative" style={{ backgroundImage: 'linear-gradient(to bottom, rgba(209, 250, 229, 0.3), rgba(255, 255, 255, 0.5), rgba(209, 250, 229, 0.2)), linear-gradient(0deg, transparent 24%, #E1E1E1 25%, #E1E1E1 26%, transparent 27%, transparent 74%, #E1E1E1 75%, #E1E1E1 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, #E1E1E1 25%, #E1E1E1 26%, transparent 27%, transparent 74%, #E1E1E1 75%, #E1E1E1 76%, transparent 77%, transparent)', backgroundSize: '100% 100%, 120px 120px, 120px 120px' }}>
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Text Content */}
            <div className={cn(
              "transition-all duration-1000",
              heroVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-10"
            )}>
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4 mr-2" />
                Trusted by humanitarian organizations worldwide
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6 leading-tight">
                  Streamline Scattered Humanitarian Program Data & Workflows
                <br />
                <span className="bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">In real-time</span>
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
              Humanitarian organizations spend weeks consolidating data from field teams, donors, and partners in scattered formats. DIMES ends that — automatically collecting, standardizing, validating, and analyzing all your data in real-time so your team can focus on impact.
              </p>
              <div className="flex flex-col sm:flex-row items-start gap-4 mb-8">
                <Button 
                  size="lg" 
                  className="text-base px-7 py-4 h-auto bg-emerald-600 hover:bg-emerald-700 shadow-md font-semibold"
                  onClick={() => navigate('/signup')}
                >
                  Start Today
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="text-base px-7 py-4 h-auto border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 font-semibold"
                  onClick={() => window.open('https://www.youtube.com/@GARTSEasternAfrica', '_blank')}
                >
                  <Play className="mr-2 w-4 h-4" />
                  Watch Demo
                </Button>
              </div>
              
              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-2" />
                  <span>Setup instantly</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-2" />
                  <span>No credit card required</span>
                </div>
                {/* <div className="flex items-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-2" />
                  <span>Setup in minutes</span>
                </div> */}
              </div>
            </div>

            {/* Right Column - Hero Image */}
            <div className={cn(
              "relative transition-all duration-1000 delay-300",
              heroVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-10"
            )}>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border-8 border-white">
                <div className="aspect-video bg-gradient-to-br from-emerald-100 via-emerald-50 to-white relative overflow-hidden">
                  <img 
                    src="/home-screenshot.png" 
                    alt="Dimes Cloud System Dashboard - Data harmonization and analytics platform"
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Decorative elements */}
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-emerald-200 rounded-full opacity-20 blur-2xl"></div>
                <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-emerald-300 rounded-full opacity-10 blur-3xl"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section 
        id="features" 
        className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-grid-pattern"
        style={{
          backgroundImage: `
            linear-gradient(to bottom, var(--gradient-start), var(--gradient-middle), var(--gradient-end)),
            linear-gradient(0deg, transparent 24%, var(--grid-color) 25%, var(--grid-color) 26%, transparent 27%, transparent 74%, var(--grid-color) 75%, var(--grid-color) 76%, transparent 77%, transparent),
            linear-gradient(90deg, transparent 24%, var(--grid-color) 25%, var(--grid-color) 26%, transparent 27%, transparent 74%, var(--grid-color) 75%, var(--grid-color) 76%, transparent 77%, transparent)
          `,
          backgroundSize: '100% 100%, 120px 120px, 120px 120px'
        }}
      >
        {/* Decorative background elements */}
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-200 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute top-20 left-0 w-96 h-96 bg-emerald-300 rounded-full opacity-10 blur-3xl"></div>
        
        <div className="container mx-auto max-w-6xl relative z-10">
          {/* Trusted By Organizations - Scrolling Logos */}
          <div className="text-center mb-12">
            <p className="text-base text-gray-500 dark:text-gray-400 mb-6 font-medium">
              Join organizations already cutting data prep time by weeks
            </p>
            <div className="overflow-hidden relative max-w-2xl mx-auto">
              <div className="flex animate-scroll-left gap-12 items-center">
                {/* Duplicate logos twice for seamless infinite loop */}
                {[...Array(2)].map((_, loopIndex) => (
                  <React.Fragment key={loopIndex}>
                    {organizationLogos.map((logo, logoIndex) => (
                      <div 
                        key={`${loopIndex}-${logoIndex}`}
                        className="flex-shrink-0 h-8 flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
                      >
                        <img 
                          src={logo.src} 
                          alt={logo.alt} 
                          className="h-full w-auto object-contain max-w-[120px]"
                        />
                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Everything Your Organization Needs
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              A complete platform for organizations, built to harmonize data and streamline project management
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8" ref={featuresRef}>
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={index}
                  data-feature-index={index}
                  className={cn(
                    "transition-all duration-500",
                    visibleFeatures.has(index) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                  )}
                  style={{ 
                    transitionDelay: `${index * 100}ms`,
                    transitionProperty: 'opacity, transform'
                  }}
                >
                  <div className="flex gap-6">
                    <div className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 bg-emerald-100 border border-emerald-200"
                    )}>
                      <Icon className="w-8 h-8 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">{feature.title}</h3>
                      <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Mobile App Highlight */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-grid-pattern relative" style={{ backgroundImage: 'linear-gradient(to bottom, var(--gradient-start), var(--gradient-middle), var(--gradient-end)), linear-gradient(0deg, transparent 24%, var(--grid-color) 25%, var(--grid-color) 26%, transparent 27%, transparent 74%, var(--grid-color) 75%, var(--grid-color) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, var(--grid-color) 25%, var(--grid-color) 26%, transparent 27%, transparent 74%, var(--grid-color) 75%, var(--grid-color) 76%, transparent 77%, transparent)', backgroundSize: '100% 100%, 120px 120px, 120px 120px' }}>
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium mb-6">
                <Smartphone className="w-4 h-4 mr-2" />
                Mobile App Available
              </div>
              <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                Collect Data Anywhere, Anytime
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
                <strong>Dimes Collect</strong> complements the platform with powerful offline-first mobile data collection. 
                Your field teams can work without connectivity, and data syncs automatically when they're back online.
              </p>
              <div className="space-y-4 mb-8">
                {[
                  'Offline data collection',
                  'Automatic sync when online',
                  'GPS and media capture',
                  'Native mobile experience',
                ].map((item, index) => (
                  <div key={index} className="flex items-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
              <Button size="lg" variant="outline" className="border-emerald-600 text-emerald-600 hover:bg-emerald-50">
                Learn More About Mobile App
                <ChevronRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
            <div className="relative order-1 lg:order-2">
              {/* Phone Frame with App Screenshot */}
              <div className="relative w-64 h-[500px] mx-auto lg:mx-0">
                {/* Phone Frame */}
                <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 rounded-[2.5rem] shadow-2xl p-2">
                  <div className="w-full h-full bg-white rounded-[2rem] overflow-hidden relative">
                    {/* Status Bar */}
                   {/*  <div className="h-8 bg-emerald-600 flex items-center justify-between px-4 text-white text-xs">
                      <span>9:41</span>
                      <div className="flex gap-1">
                        <div className="w-4 h-2 border border-white rounded-sm"></div>
                        <div className="w-1 h-1 bg-white rounded-full"></div>
                      </div>
                    </div> */}
                    {/* App Content */}
                    <div className="h-full bg-gradient-to-br from-emerald-50 to-white flex items-center justify-center relative overflow-hidden">
                      <img 
                        src="/DIMES-Collect.jpg" 
                        alt="Dimes Collect Mobile App - Offline data collection"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
                {/* Decorative glow */}
                <div className="absolute -inset-4 bg-emerald-200 rounded-[3rem] opacity-20 blur-2xl -z-10"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-grid-pattern">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              The Silent Partner Your Organization Needs
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              DIMES doesn't disrupt your workflow—it enhances it. Working quietly in the background, 
              harmonizing data, synchronizing organizations, and ensuring your organization's data infrastructure 
              is always ready when you need it.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <Card className="border-2 hover:border-emerald-200 transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-emerald-600" />
                </div>
                <CardTitle className="text-2xl">KPI Analytics & Goal Alignment</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Link organizational goals with project objectives. Track KPIs in real-time and monitor 
                  performance across all levels with integrated analytics and spatial mapping.
                </p>
                <ul className="space-y-2">
                  {['Real-time KPI tracking', 'Goal-to-project linkage', 'Spatial analytics & mapping', 'Performance benchmarking'].map((item, i) => (
                    <li key={i} className="flex items-center text-sm text-gray-600">
                      <ChevronRight className="w-4 h-4 text-emerald-600 mr-2" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-emerald-200 transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                  <FileCheck className="w-6 h-6 text-emerald-600" />
                </div>
                <CardTitle className="text-2xl">FCRM & Workflow Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Built-in Field Case Relationship Management with integrated review and approval workflows. 
                  Upload reports, manage cases, and ensure accountability at every step.
                </p>
                <ul className="space-y-2">
                  {['Inbuilt FCRM system', 'Review & approval workflows', 'Report upload & versioning', 'Case tracking & management'].map((item, i) => (
                    <li key={i} className="flex items-center text-sm text-gray-600">
                      <ChevronRight className="w-4 h-4 text-emerald-600 mr-2" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-emerald-200 transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                  <Upload className="w-6 h-6 text-emerald-600" />
                </div>
                <CardTitle className="text-2xl">Data Import & Integration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Import data from multiple sources seamlessly. Support for Excel, CSV, KoboToolbox, ODK, 
                  and custom APIs with automated validation and mapping.
                </p>
                <ul className="space-y-2">
                  {['Multi-format data import', 'KoboToolbox & ODK integration', 'Custom API connections', 'Automated data validation'].map((item, i) => (
                    <li key={i} className="flex items-center text-sm text-gray-600">
                      <ChevronRight className="w-4 h-4 text-emerald-600 mr-2" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-emerald-200 transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                  <Network className="w-6 h-6 text-emerald-600" />
                </div>
                <CardTitle className="text-2xl">Cross-Organization Collaboration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Break down data silos. Standardize data formats, consolidate information, and enable 
                  seamless collaboration across humanitarian organizations.
                </p>
                <ul className="space-y-2">
                  {['Multi-organization support', 'Data standardization', 'Secure data sharing', 'Cross-partner analytics'].map((item, i) => (
                    <li key={i} className="flex items-center text-sm text-gray-600">
                      <ChevronRight className="w-4 h-4 text-emerald-600 mr-2" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-grid-pattern">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Built for Your Organization
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Whether you're a humanitarian organization, MEAL organization, or project management organization, DIMES adapts to your workflow
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {useCases.map((useCase, index) => {
              const Icon = useCase.icon;
              return (
                <Card key={index} className="text-center hover:shadow-lg transition-shadow border-2 hover:border-emerald-200">
                  <CardHeader>
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-8 h-8 text-emerald-600" />
                    </div>
                    <CardTitle>{useCase.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {useCase.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-grid-pattern">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Transform Your Data Operations
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {benefits.map((benefit, index) => (
              <div 
                key={index} 
                className="flex items-start"
              >
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mr-3 flex-shrink-0 mt-1" />
                <span className="text-lg text-gray-700">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-green-700 to-green-600">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Your Data Operations?
          </h2>
          <p className="text-xl text-green-50 mb-8 max-w-2xl mx-auto">
            Join humanitarian organizations worldwide who trust DIMES to harmonize their data 
            and streamline their MEAL operations.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              variant="secondary"
              className="text-base px-7 py-4 h-auto bg-white text-green-600 hover:bg-neutral-50 font-semibold shadow-md"
              onClick={() => navigate('/signup')}
            >
              Start Free Trial
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-base px-7 py-4 h-auto border-2 border-white bg-transparent text-white hover:bg-white/20 hover:text-white font-semibold shadow-sm"
              onClick={() => navigate('/pricing')}
            >
              View Pricing
            </Button>
          </div>
          <p className="text-sm text-green-100 mt-6">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
