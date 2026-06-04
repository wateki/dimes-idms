import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowRight,
  Mail,
  MessageCircle,
  X,
  Phone,
  MapPin,
  Send,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Footer } from '@/components/shared/Footer';
import { supabaseContactService } from '@/services/supabaseContactService';
import { PageSeo } from '@/components/seo/PageSeo';
import { faqPageJsonLd } from '@/components/seo/marketingJsonLd';
import { PublicNav } from '@/components/public/layout/PublicNav';
import { PublicCtaBand } from '@/components/public/layout/PublicCtaBand';
import { MarketingFaqSection } from '@/components/public/MarketingFaqSection';
import { contactFaqs } from '@/data/marketingFaqs';
import { CTA } from '@/data/marketingCopy';
import { CONTACT_EMAIL, whatsappUrl } from '@/config/site';

const SUBJECT_SUGGESTIONS = [
  'Demo request',
  'NGO / non-profit pricing',
  'Technical support',
  'Partnership inquiry',
];

const contactInfo = [
  {
    icon: Mail,
    title: 'Email Us',
    description: 'Send us an email anytime',
    value: CONTACT_EMAIL,
    link: `mailto:${CONTACT_EMAIL}`,
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
    description: 'Mon-Fri from 9am to 5pm EAT',
    value: '+254 758 132 144',
    link: 'tel:+254758132144',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp',
    description: 'Fast help for onboarding questions',
    value: 'Chat on WhatsApp',
    link: whatsappUrl(),
  },
];

export function ContactPage() {
  const navigate = useNavigate();
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
      <PageSeo
        title="Contact Sales & Support"
        description={`Contact the DIMES IDMS team for demos, NGO pricing, onboarding, and technical support. Email ${CONTACT_EMAIL} or call +254 114 904 624.`}
        path="/contact"
        jsonLd={faqPageJsonLd(contactFaqs)}
      />
      <PublicNav activePage="contact" />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-grid-pattern text-center relative" style={{ backgroundImage: 'linear-gradient(to bottom, rgba(209, 250, 229, 0.3), rgba(255, 255, 255, 0.5)), linear-gradient(0deg, transparent 24%, #E1E1E1 25%, #E1E1E1 26%, transparent 27%, transparent 74%, #E1E1E1 75%, #E1E1E1 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, #E1E1E1 25%, #E1E1E1 26%, transparent 27%, transparent 74%, #E1E1E1 75%, #E1E1E1 76%, transparent 77%, transparent)', backgroundSize: '100% 100%, 120px 120px, 120px 120px' }}>
        <div className={cn(
          "max-w-4xl mx-auto transition-all duration-1000",
          heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        )}>
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Get in <span className="bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent">Touch</span>
          </h1>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-8 leading-relaxed">
            Demos, NGO pricing, rollout planning, or technical questions — we typically reply within one business day.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => navigate('/signup')}>
              {CTA.primary}
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline" className="border-emerald-600 text-emerald-700" asChild>
              <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer">
                WhatsApp us
              </a>
            </Button>
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
                        list="contact-subjects"
                        value={formData.subject}
                        onChange={handleInputChange}
                        placeholder="e.g. Demo request"
                        className="h-11"
                      />
                      <datalist id="contact-subjects">
                        {SUBJECT_SUGGESTIONS.map((s) => (
                          <option key={s} value={s} />
                        ))}
                      </datalist>
                      <p className="text-xs text-gray-500">Tip: choose a preset or describe your program size and tools (Kobo, Excel, etc.).</p>
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

      <MarketingFaqSection faqs={contactFaqs} title="Before you write" subtitle="Common questions about demos, pricing, and support" />

      <PublicCtaBand showSecondary={false} />

      {/* Footer */}
      <Footer />
    </div>
  );
}
