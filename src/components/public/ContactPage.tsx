import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowRight,
  Menu,
  X,
  Mail,
  Phone,
  MapPin,
  Send,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Footer } from '@/components/shared/Footer';
import { supabaseContactService } from '@/services/supabaseContactService';

const contactInfo = [
  {
    icon: Mail,
    title: 'Email Us',
    description: 'Send us an email anytime',
    value: 'solutions@gartsafrica.com',
    link: 'mailto:solutions@gartsafrica.com',
  },
  {
    icon: Phone,
    title: 'Call Us',
    description: 'Mon-Fri from 9am to 5pm',
    value: '+254 114 904 624',
    link: 'tel:+254114904624',
  },
  {
    icon: Phone,
    title: 'Alternative Phone',
    description: 'Mon-Fri from 9am to 5pm',
    value: '+254 758 132 144',
    link: 'tel:+254758132144',
  },
  
];

export function ContactPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    // Reset and trigger animation independently for this page
    setHeroVisible(false);
    const timer = setTimeout(() => {
      setHeroVisible(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess(false);
    
    try {
      const result = await supabaseContactService.submitContactMessage({
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
      });

      if (result.success) {
        setSubmitSuccess(true);
        setFormData({ name: '', email: '', subject: '', message: '' });
        
        // Reset success message after 5 seconds
        setTimeout(() => {
          setSubmitSuccess(false);
        }, 5000);
      } else {
        setSubmitError(result.error || 'Failed to submit message. Please try again.');
      }
    } catch (error: any) {
      console.error('Error submitting contact form:', error);
      setSubmitError(error.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
              <Link to="/pricing" className="text-sm font-medium text-gray-700 hover:text-emerald-600 transition-colors">
                Pricing
              </Link>
              <Link to="/about" className="text-sm font-medium text-gray-700 hover:text-emerald-600 transition-colors">
                About
              </Link>
              <Link to="/support" className="text-sm font-medium text-gray-700 hover:text-emerald-600 transition-colors">
                Support
              </Link>
              <Link to="/contact" className="text-sm font-medium text-emerald-600">
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
                <Link to="/support" className="text-sm font-medium text-gray-700 hover:text-emerald-600" onClick={() => setMobileMenuOpen(false)}>
                  Support
                </Link>
                <Link to="/contact" className="text-sm font-medium text-emerald-600" onClick={() => setMobileMenuOpen(false)}>
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
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-grid-pattern text-center relative" style={{ backgroundImage: 'linear-gradient(to bottom, rgba(209, 250, 229, 0.3), rgba(255, 255, 255, 0.5)), linear-gradient(0deg, transparent 24%, #E1E1E1 25%, #E1E1E1 26%, transparent 27%, transparent 74%, #E1E1E1 75%, #E1E1E1 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, #E1E1E1 25%, #E1E1E1 26%, transparent 27%, transparent 74%, #E1E1E1 75%, #E1E1E1 76%, transparent 77%, transparent)', backgroundSize: '100% 100%, 120px 120px, 120px 120px' }}>
        <div className={cn(
          "max-w-4xl mx-auto transition-all duration-1000",
          heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        )}>
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Get in <span className="bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent">Touch</span>
          </h1>
          <div className="text-xl text-gray-700 max-w-3xl mx-auto mb-8 leading-relaxed">
            Have questions? We're here to help. Reach out to our team and we'll get back to you as soon as possible.
          </div>
        </div>
      </section>

      {/* Contact Form and Info Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-grid-pattern">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contact Information Cards */}
            <div className="lg:col-span-1 space-y-6">
              <div className="text-center lg:text-left mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Contact Information</h2>
                <p className="text-gray-600">
                  Choose the best way to reach us
                </p>
              </div>
              
              {contactInfo.map((info, index) => {
                const Icon = info.icon;
                return (
                  <Card 
                    key={index}
                    className="border-2 hover:border-emerald-300 transition-all duration-300 hover:shadow-lg"
                  >
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-500 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-1">{info.title}</CardTitle>
                          <CardDescription className="text-sm mb-2">{info.description}</CardDescription>
                          {info.link !== '#' ? (
                            <a 
                              href={info.link} 
                              className="text-emerald-600 hover:text-emerald-700 font-medium text-sm transition-colors"
                            >
                              {info.value}
                            </a>
                          ) : (
                            <p className="text-gray-700 text-sm">{info.value}</p>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <Card className="border-2 border-emerald-100 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-3xl mb-2">Send us a Message</CardTitle>
                  <CardDescription className="text-base">
                    Fill out the form below and we'll respond within 24 hours.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {submitSuccess && (
                    <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      <p className="text-emerald-700 font-medium">
                        Thank you! Your message has been sent successfully. We'll get back to you soon.
                      </p>
                    </div>
                  )}

                  {submitError && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                      <X className="w-5 h-5 text-red-600 flex-shrink-0" />
                      <p className="text-red-700 font-medium">
                        {submitError}
                      </p>
                    </div>
                  )}
                  
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          name="name"
                          type="text"
                          required
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="Your full name"
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          required
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="your.email@example.com"
                          className="h-11"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject *</Label>
                      <Input
                        id="subject"
                        name="subject"
                        type="text"
                        required
                        value={formData.subject}
                        onChange={handleInputChange}
                        placeholder="What is this regarding?"
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Message *</Label>
                      <Textarea
                        id="message"
                        name="message"
                        required
                        value={formData.message}
                        onChange={handleInputChange}
                        placeholder="Tell us how we can help..."
                        rows={6}
                        className="resize-none"
                      />
                    </div>

                    <Button 
                      type="submit" 
                      size="lg" 
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-lg h-12"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>Sending...</>
                      ) : (
                        <>
                          Send Message
                          <Send className="ml-2 w-5 h-5" />
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Info Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-grid-pattern">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-xl text-gray-600">
              Quick answers to common questions
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                question: 'How quickly will I receive a response?',
                answer: 'We typically respond to all inquiries within 24 hours during business days.',
              },
              {
                question: 'Do you offer custom solutions?',
                answer: 'Yes! We work with organizations to create tailored solutions that fit their specific needs.',
              },
              {
                question: 'Can I schedule a demo?',
                answer: 'Absolutely! Contact us to schedule a personalized demo of our platform.',
              },
              {
                question: 'What support options are available?',
                answer: 'We offer multiple support channels including email, documentation, training, and dedicated support for enterprise customers.',
              },
            ].map((faq, index) => (
              <Card key={index} className="border-2 hover:border-emerald-200 transition-all">
                <CardHeader>
                  <CardTitle className="text-lg">{faq.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-emerald-600 to-emerald-500">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-emerald-50 mb-8">
            Join humanitarian organizations worldwide who trust DIMES System
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
