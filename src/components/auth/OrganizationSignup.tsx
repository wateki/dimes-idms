import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Mail, Lock, User, Building2, Check, Loader2, ArrowRight, ArrowLeft, CreditCard } from 'lucide-react';
import { supabaseOrganizationSignupService, type OrganizationSignupRequest } from '@/services/supabaseOrganizationSignupService';

interface SubscriptionPlan {
  id: 'free' | 'basic' | 'professional' | 'enterprise';
  name: string;
  price: string;
  description: string;
  features: string[];
  maxUsers: number | null;
  maxProjects: number | null;
}

const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 'KSh 0',
    description: 'Perfect for getting started',
    features: [
      'Up to 5 users',
      'Up to 3 projects',
      'Basic features',
      'Community support',
    ],
    maxUsers: 5,
    maxProjects: 3,
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 'KSh 7,000',
    description: 'For growing teams',
    features: [
      'Up to 25 users',
      'Up to 20 projects',
      'All basic features',
      'Email support',
    ],
    maxUsers: 25,
    maxProjects: 20,
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 'KSh 15,000',
    description: 'For established organizations',
    features: [
      'Up to 100 users',
      'Unlimited projects',
      'Advanced features',
      'Priority support',
    ],
    maxUsers: 100,
    maxProjects: null,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    description: 'For large organizations',
    features: [
      'Unlimited users',
      'Unlimited projects',
      'All features',
      'Dedicated support',
      'Custom integrations',
    ],
    maxUsers: null,
    maxProjects: null,
  },
];

export function OrganizationSignup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Admin user info
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 2: Organization info
  const [organizationName, setOrganizationName] = useState('');
  const [organizationDomain, setOrganizationDomain] = useState('');

  // Step 3: Subscription plan
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'basic' | 'professional' | 'enterprise'>('free');

  const validateStep1 = (): boolean => {
    if (!email || !password || !firstName || !lastName) {
      setError('Please fill in all required fields');
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const validateStep2 = (): boolean => {
    if (!organizationName.trim()) {
      setError('Organization name is required');
      return false;
    }

    if (organizationName.length < 3) {
      setError('Organization name must be at least 3 characters long');
      return false;
    }

    // Validate domain if provided
    if (organizationDomain && !/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(organizationDomain)) {
      setError('Please enter a valid domain name (e.g., example.com)');
      return false;
    }

    return true;
  };

  const handleNext = () => {
    setError('');

    if (step === 1) {
      if (validateStep1()) {
        setStep(2);
      }
    } else if (step === 2) {
      if (validateStep2()) {
        setStep(3);
      }
    }
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  const handleSignup = async () => {
    setError('');
    setLoading(true);

    try {
      const signupRequest: OrganizationSignupRequest = {
        email,
        password,
        firstName,
        lastName,
        organizationName: organizationName.trim(),
        organizationDomain: organizationDomain.trim() || undefined,
        subscriptionTier: selectedPlan,
      };

      const result = await supabaseOrganizationSignupService.signupOrganization(signupRequest);

      // Signup successful - show email confirmation message
      // User needs to confirm email before they can access the system
      navigate(`/signup/confirm-email?email=${encodeURIComponent(email)}&orgId=${result.organizationId}`);
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to create organization. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-4xl">
        <Card className="shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <Building2 className="h-12 w-12 text-blue-600" />
            </div>
            <CardTitle className="text-3xl font-bold">Create Your Organization</CardTitle>
            <CardDescription className="text-lg mt-2">
              Get started with your organization account in just a few steps
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Progress indicator */}
            <div className="flex items-center justify-center space-x-4 mb-8">
              {[1, 2, 3].map((s) => (
                <React.Fragment key={s}>
                  <div className="flex items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                        step >= s
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {step > s ? <Check className="h-5 w-5" /> : s}
                    </div>
                  </div>
                  {s < 3 && (
                    <div
                      className={`h-1 w-16 ${
                        step > s ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Error alert */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Step 1: Admin User Info */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">Admin Account</h2>
                  <p className="text-muted-foreground">Create your administrator account</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="John"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Doe"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@organization.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleNext}
                  className="w-full"
                  size="lg"
                >
                  Next: Organization Details
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Step 2: Organization Info */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">Organization Details</h2>
                  <p className="text-muted-foreground">Tell us about your organization</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organizationName">Organization Name *</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="organizationName"
                      type="text"
                      placeholder="Acme Corporation"
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This will be used to create a unique URL for your organization
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organizationDomain">Custom Domain (Optional)</Label>
                  <Input
                    id="organizationDomain"
                    type="text"
                    placeholder="example.com"
                    value={organizationDomain}
                    onChange={(e) => setOrganizationDomain(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    You can configure this later in settings
                  </p>
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={handleBack}
                    variant="outline"
                    className="flex-1"
                    size="lg"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    onClick={handleNext}
                    className="flex-1"
                    size="lg"
                  >
                    Next: Choose Plan
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Subscription Plan */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">Choose Your Plan</h2>
                  <p className="text-muted-foreground">Select a plan that fits your organization</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {SUBSCRIPTION_PLANS.map((plan) => (
                    <Card
                      key={plan.id}
                      className={`cursor-pointer transition-all ${
                        selectedPlan === plan.id
                          ? 'border-blue-600 border-2 shadow-lg'
                          : 'hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedPlan(plan.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{plan.name}</CardTitle>
                          {selectedPlan === plan.id && (
                            <Check className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                        <div className="flex items-baseline mt-2">
                          <span className="text-2xl font-bold">{plan.price}</span>
                          {plan.price !== 'Custom' && (
                            <span className="text-sm text-muted-foreground ml-1">/month</span>
                          )}
                        </div>
                        <CardDescription className="mt-1">{plan.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-sm">
                          {plan.features.map((feature, idx) => (
                            <li key={idx} className="flex items-start">
                              <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    onClick={handleBack}
                    variant="outline"
                    className="flex-1"
                    size="lg"
                    disabled={loading}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    onClick={handleSignup}
                    className="flex-1"
                    size="lg"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Organization...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Create Organization
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  By creating an organization, you agree to our Terms of Service and Privacy Policy
                </p>
              </div>
            )}

            {/* Login link */}
            <div className="text-center pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Already have an organization?{' '}
                <a href="/login" className="text-blue-600 hover:underline font-medium">
                  Sign in
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

