import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSubscriptionPaymentListener } from '@/hooks/useSubscriptionPaymentListener';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Mail, Lock, User, Building2, Check, Loader2, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import { supabaseOrganizationSignupService, type OrganizationSignupRequest } from '@/services/supabaseOrganizationSignupService';
import { supabaseOrganizationService } from '@/services/supabaseOrganizationService';
import { PlanSelection, type Plan } from '@/components/shared/PlanSelection';
import { supabase } from '@/lib/supabaseClient';


// Plan selection component for signup (uses same plans as PlansPricing)
function PlanSelectionSignup({ 
  selectedPlanCode, 
  onPlanSelect, 
  processing 
}: { 
  selectedPlanCode: string;
  onPlanSelect: (planCode: string) => void | Promise<void>;
  processing: boolean;
}) {
  const [isAnnual, setIsAnnual] = useState(false);

  // Plan code to amount mapping (amounts in cents for USD) - same as PlansPricing
  const monthlyPlanAmounts: Record<string, number> = {
    'PLN_FREE': 0,
    'PLN_x8752w7duvhue0t': 15000,   // Basic: $150 = 15,000 cents
    'PLN_t3qtrit2np45wvo': 40000,  // Professional: $400 = 40,000 cents
    'PLN_lh20uejhvnhmz4p': 80000,  // Enterprise: $800 = 80,000 cents
  };

  const annualPlanCodes: Record<string, string> = {
    'PLN_x8752w7duvhue0t': 'PLN_hv3sniccdhtpxrj',
    'PLN_t3qtrit2np45wvo': 'PLN_ip8j113wkze07eu',
    'PLN_lh20uejhvnhmz4p': 'PLN_p3w1zvxzffgo1hu',
  };

  const annualPlanAmounts: Record<string, number> = {
    'PLN_hv3sniccdhtpxrj': Math.round(15000 * 12 * 0.9),    // Basic annual: $1,620 = 162,000 cents
    'PLN_ip8j113wkze07eu': Math.round(40000 * 12 * 0.9),   // Professional annual: $4,320 = 432,000 cents
    'PLN_p3w1zvxzffgo1hu': Math.round(80000 * 12 * 0.9),  // Enterprise annual: $8,640 = 864,000 cents
  };

  const planAmounts: Record<string, number> = {
    ...monthlyPlanAmounts,
    ...annualPlanAmounts,
  };

  const getPlanCode = (monthlyCode: string): string => {
    if (monthlyCode === 'PLN_FREE') return monthlyCode;
    if (isAnnual && annualPlanCodes[monthlyCode]) {
      return annualPlanCodes[monthlyCode];
    }
    return monthlyCode;
  };

  const getAnnualPrice = (monthlyAmount: number): string => {
    const annualAmount = Math.round(monthlyAmount * 12 * 0.9);
    const usd = annualAmount / 100;
    return `$${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getMonthlyEquivalent = (monthlyAmount: number): string => {
    const annualAmount = Math.round(monthlyAmount * 12 * 0.9);
    const monthlyEquivalent = annualAmount / 12 / 100;
    return `$${monthlyEquivalent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const plans: Plan[] = [
    {
      code: 'PLN_FREE',
      name: 'Free',
      price: '$0',
      period: 'month',
      amount: planAmounts['PLN_FREE'],
      maxUsers: 2,
      maxProjects: 1,
      features: [
        'Up to 2 users',
        'Up to 1 project',
        '5 forms and reports',
        '500 form submissions',
        'Dimes Collect Mobile App Access',
        'Email support',
        'Basic features',
      ],
    },
    {
      code: 'PLN_x8752w7duvhue0t',
      name: 'Basic',
      price: '$150',
      period: 'month',
      amount: planAmounts['PLN_x8752w7duvhue0t'],
      maxUsers: 7,
      maxProjects: 4,
      features: [
        'Up to 7 users',
        'Up to 4 projects',
        'Unlimited forms and reports',
        '2500 form submissions per month',
        'Dimes Collect Mobile App Access',
        'Priority support',
        'Advanced features',
      ],
    },
    {
      code: 'PLN_t3qtrit2np45wvo',
      name: 'Professional',
      price: '$400',
      period: 'month',
      amount: planAmounts['PLN_t3qtrit2np45wvo'],
      maxUsers: 20,
      maxProjects: 10,
      features: [
        'Up to 20 users',
        'Up to 10 projects',
        'Unlimited forms and reports',
        '10,000 form submissions per month',
        'Dimes Collect Mobile App Access',
        'Dedicated Server Instance',
        'Priority support',
        'Advanced analytics',
        'Custom integrations',
      ],
    },
    {
      code: 'PLN_lh20uejhvnhmz4p',
      name: 'Enterprise',
      price: '$800',
      period: 'month',
      amount: planAmounts['PLN_lh20uejhvnhmz4p'],
      maxUsers: -1,
      maxProjects: -1,
      features: [
        'Unlimited users',
        'Unlimited projects',
        'Unlimited forms and reports',
        'Unlimited form submissions per month',
        'Dimes Collect Mobile App Access',
        'Multi-region Dedicated Server Instances',
        'Dedicated support',
        'Advanced analytics',
        'Custom integrations',
        'SLA guarantee',
        'Custom training',
      ],
    },
  ];

  return (
    <PlanSelection
      plans={plans}
      selectedPlanCode={selectedPlanCode}
      onPlanSelect={onPlanSelect}
      processing={processing}
      showAnnualToggle={true}
      isAnnual={isAnnual}
      onAnnualToggle={setIsAnnual}
      getAnnualPrice={getAnnualPrice}
      getMonthlyEquivalent={getMonthlyEquivalent}
      getPlanCode={getPlanCode}
    />
  );
}

export function OrganizationSignup() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize step from URL parameter, default to 1
  const stepFromUrl = searchParams.get('step');
  const initialStep = stepFromUrl ? parseInt(stepFromUrl, 10) : 1;
  const [step, setStep] = useState(initialStep);
  const [loading, setLoading] = useState(false);
  
  // Check for error messages from URL (e.g., expired email link)
  const urlError = searchParams.get('error');
  const urlErrorMessage = searchParams.get('message');
  const initialError = urlError && urlErrorMessage ? decodeURIComponent(urlErrorMessage) : '';
  const [error, setError] = useState(initialError);
  const [waitingForPayment, setWaitingForPayment] = useState(false);
  
  // Clear error from URL after displaying it
  useEffect(() => {
    if (urlError) {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('error');
      newSearchParams.delete('message');
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [urlError, searchParams, setSearchParams]);

  // Listen for subscription status changes when waiting for payment
  useSubscriptionPaymentListener(waitingForPayment);

  // Step 1: Admin user info + Organization info (combined)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [organizationName, setOrganizationName] = useState('');
  const [organizationDomain, setOrganizationDomain] = useState('');

  // Step 2: Subscription plan
  const [selectedPlan, setSelectedPlan] = useState<string>('PLN_FREE');
  // Initialize organizationId from URL parameter if present (from email confirmation redirect)
  const orgIdFromUrl = searchParams.get('orgId');
  const [organizationId, setOrganizationId] = useState<string | null>(orgIdFromUrl);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [checkingEmailStatus, setCheckingEmailStatus] = useState(false);
  
      // Update URL when step changes (except when coming from URL params on mount)
  useEffect(() => {
    // Don't update URL for step 1.5 (email confirmation) - it's an intermediate step
    if (stepFromUrl !== String(step) && step !== 1.5) {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set('step', String(step));
      if (organizationId) {
        newSearchParams.set('orgId', organizationId);
      }
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [step, organizationId, stepFromUrl, searchParams, setSearchParams]);
  
  // Check email confirmation status when on step 1.5 (email confirmation step) or step 2 (from URL)
  // Use Supabase auth state change listener (realtime) instead of polling
  useEffect(() => {
    // If on step 2 from URL but email not confirmed, check and redirect to step 1.5 if needed
    const checkInitialStatus = async () => {
      if (step === 2 && !organizationId && orgIdFromUrl) {
        // User came from email confirmation redirect - verify they have a session
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.email_confirmed_at) {
            // Email is confirmed, set organizationId and allow step 2
            setOrganizationId(orgIdFromUrl);
            setEmailConfirmed(true);
          } else {
            // Email not confirmed yet, redirect to step 1.5
            setStep(1.5);
          }
        } catch (error) {
          console.error('Error checking email confirmation status:', error);
          // If we can't verify, redirect to step 1.5
          setStep(1.5);
        }
      } else if (step === 1.5 && authUserId) {
        // Check initial status when on step 1.5
        setCheckingEmailStatus(true);
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.email_confirmed_at) {
            setEmailConfirmed(true);
            setStep(2);
            setCheckingEmailStatus(false);
            return;
          }
          
          // Also check via getUser
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser?.email_confirmed_at) {
            setEmailConfirmed(true);
            setStep(2);
          }
        } catch (error) {
          console.error('Error checking email confirmation:', error);
        } finally {
          setCheckingEmailStatus(false);
        }
      }
    };
    
    // Check initial status immediately
    if ((step === 1.5 && authUserId) || (step === 2 && !organizationId && orgIdFromUrl)) {
      checkInitialStatus();
    }
    
    // Set up realtime auth state change listener for email confirmation
    let authSubscription: { data: { subscription: { unsubscribe: () => void } } } | null = null;
    
    if (step === 1.5 && authUserId && !emailConfirmed) {
      console.log('[Organization Signup] Setting up auth state change listener for email confirmation');
      
      authSubscription = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('[Organization Signup] Auth state changed:', event, session?.user?.id);
        
        // Handle various events that might indicate email confirmation
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (session?.user?.email_confirmed_at) {
            console.log('[Organization Signup] Email confirmed via realtime listener');
            setEmailConfirmed(true);
            setCheckingEmailStatus(false);
            // Proceed to step 2
            setStep(2);
          }
        }
      });
    }
    
    return () => {
      if (authSubscription?.data?.subscription) {
        console.log('[Organization Signup] Cleaning up auth state change listener');
        authSubscription.data.subscription.unsubscribe();
      }
    };
  }, [step, authUserId, emailConfirmed, organizationId, orgIdFromUrl]);

  const validateStep1 = (): boolean => {
    // Validate admin account fields
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

    // Validate organization fields
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

  const handleNext = async () => {
    setError('');

    if (step === 1) {
      if (validateStep1()) {
        // Check if email already exists before proceeding
        setLoading(true);
        try {
          const emailExists = await supabaseOrganizationSignupService.checkEmailExists(email);
          if (emailExists) {
            setError('This email is already registered. Please use a different email or sign in instead.');
            setLoading(false);
            return;
          }
          
          // Email doesn't exist, create organization and proceed to email confirmation
          const signupRequest: OrganizationSignupRequest = {
            email,
            password,
            firstName,
            lastName,
            organizationName: organizationName.trim(),
            organizationDomain: organizationDomain.trim() || undefined,
            // Don't pass subscriptionTier - will be set at step 2
          };

          const result = await supabaseOrganizationSignupService.signupOrganization(signupRequest);
          
          // Store org ID and auth user ID
          setOrganizationId(result.organizationId);
          setAuthUserId(result.authUserId);
          
          // Proceed to email confirmation step (step 1.5)
          setStep(1.5);
        } catch (err: any) {
          console.error('Signup error:', err);
          setError(err.message || 'Failed to create organization. Please try again.');
        } finally {
          setLoading(false);
        }
      }
    }
  };

  const handleBack = () => {
    setError('');
    // If on step 1.5 (email confirmation), go back to step 1
    if (step === 1.5) {
      setStep(1);
    } else if (step === 2) {
      // If on step 2 (plan selection), go back to step 1.5 if email not confirmed, otherwise step 1
      if (emailConfirmed) {
        setStep(1);
      } else {
        setStep(1.5);
      }
    }
  };

  const handlePlanSelection = async (planCode: string) => {
    if (!organizationId) {
      setError('Organization ID not found. Please go back and try again.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Map plan code to subscription tier
      const planToTierMap: Record<string, 'free' | 'basic' | 'professional' | 'enterprise'> = {
        'PLN_FREE': 'free',
        'PLN_x8752w7duvhue0t': 'basic',
        'PLN_t3qtrit2np45wvo': 'professional',
        'PLN_lh20uejhvnhmz4p': 'enterprise',
      };

      // Handle annual plans (extract base plan)
      let basePlanCode = planCode;
      if (planCode.includes('hv3sniccdhtpxrj')) basePlanCode = 'PLN_x8752w7duvhue0t'; // Basic annual
      if (planCode.includes('ip8j113wkze07eu')) basePlanCode = 'PLN_t3qtrit2np45wvo'; // Professional annual
      if (planCode.includes('p3w1zvxzffgo1hu')) basePlanCode = 'PLN_lh20uejhvnhmz4p'; // Enterprise annual

      const subscriptionTier = planToTierMap[basePlanCode] || 'free';

      // Update organization subscription tier
      await supabaseOrganizationSignupService.updateOrganizationSubscriptionTier(organizationId, subscriptionTier);

      // If free plan, signup is complete - redirect to login
      if (planCode === 'PLN_FREE') {
        // Show success message and redirect to login
        navigate(`/login?signup=success&email=${encodeURIComponent(email)}`);
        return;
      }

      // For paid plans, initialize payment flow
      // First, check if we have a session (user should be authenticated after email confirmation)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // If no session, redirect to login with a message to complete payment after login
        navigate(`/login?signup=success&paymentPending=true&email=${encodeURIComponent(email)}`);
        return;
      }

      // Get plan amounts for payment (in cents for USD)
      const planAmounts: Record<string, number> = {
        'PLN_x8752w7duvhue0t': 15000, // Basic monthly: $150 = 15,000 cents
        'PLN_hv3sniccdhtpxrj': Math.round(15000 * 12 * 0.9), // Basic annual: $1,620 = 162,000 cents
        'PLN_t3qtrit2np45wvo': 40000, // Professional monthly: $400 = 40,000 cents
        'PLN_ip8j113wkze07eu': Math.round(40000 * 12 * 0.9), // Professional annual: $4,320 = 432,000 cents
        'PLN_lh20uejhvnhmz4p': 80000, // Enterprise monthly: $800 = 80,000 cents
        'PLN_p3w1zvxzffgo1hu': Math.round(80000 * 12 * 0.9), // Enterprise annual: $8,640 = 864,000 cents
      };

      const amount = planAmounts[planCode] || 0;
      if (amount === 0) {
        throw new Error('Invalid plan code or amount');
      }

      // Initialize payment using the organization service
      // Note: This requires the user to be authenticated, which they should be after email confirmation
      const paymentResult = await supabaseOrganizationService.initializeSubscriptionPayment(
        planCode,
        session.user.email || email,
        amount,
        { organizationId, subscriptionTier }
      );

      // Set waiting for payment flag and redirect to Paystack payment page
      setWaitingForPayment(true);
      window.location.href = paymentResult.authorization_url;
    } catch (err: any) {
      console.error('Plan selection error:', err);
      setError(err.message || 'Failed to process plan selection. Please try again.');
      setLoading(false);
    }
  };

  // Determine container width and height constraints based on step
  const containerWidth = step === 2 ? 'max-w-6xl' : 'max-w-2xl';
  const isPlanSelection = step === 2;

  return (
    <div 
      className={`min-h-screen w-screen flex ${isPlanSelection ? 'items-start py-6' : 'items-center'} justify-center bg-grid-pattern p-3 sm:p-4 md:p-6`}
      style={{
        backgroundImage: `
          linear-gradient(to bottom, var(--gradient-start), var(--gradient-middle), var(--gradient-end)),
          linear-gradient(0deg, transparent 24%, var(--grid-color) 25%, var(--grid-color) 26%, transparent 27%, transparent 74%, var(--grid-color) 75%, var(--grid-color) 76%, transparent 77%, transparent),
          linear-gradient(90deg, transparent 24%, var(--grid-color) 25%, var(--grid-color) 26%, transparent 27%, transparent 74%, var(--grid-color) 75%, var(--grid-color) 76%, transparent 77%, transparent)
        `,
        backgroundSize: '100% 100%, 120px 120px, 120px 120px'
      }}
    >
      <div className={`w-full ${containerWidth} ${isPlanSelection ? '' : 'max-h-[90vh]'} flex flex-col`}>
        <Card className={`shadow-xl flex flex-col ${isPlanSelection ? '' : 'max-h-full overflow-hidden'}`}>
          {!isPlanSelection && (
            <CardHeader className="text-center pb-4 px-4 sm:px-6 pt-6 sm:pt-8 flex-shrink-0">
              <div className="flex justify-center mb-4">
                <Building2 className="h-10 w-10 sm:h-12 sm:w-12 text-blue-600" />
              </div>
              <CardTitle className="text-2xl sm:text-3xl font-bold">Create Your Account</CardTitle>
              <CardDescription className="text-base sm:text-lg mt-2">
                Get started with your account in just a few steps
              </CardDescription>
            </CardHeader>
          )}

          <CardContent className={`space-y-6 p-4 sm:p-6 md:p-8 ${isPlanSelection ? '' : 'overflow-y-auto'} flex-1 ${isPlanSelection ? 'pt-6 sm:pt-8' : ''}`}>
            {/* Progress indicator */}
            {!isPlanSelection && (
            <div className="flex items-center justify-center space-x-2 sm:space-x-4 mb-6 md:mb-8">
              {[1, 2].map((s) => {
                // For step indicator, treat step 1.5 as step 1 (email confirmation happens between 1 and 2)
                const isActive = step >= s || (step === 1.5 && s === 1);
                const isPast = step > s || (step === 1.5 && s < 1) || (step === 2 && s < 2);
                
                return (
                  <React.Fragment key={s}>
                    <div className="flex items-center">
                      <div
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold text-sm sm:text-base ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {isPast ? <Check className="h-4 w-4 sm:h-5 sm:w-5" /> : s}
                      </div>
                    </div>
                    {s < 2 && (
                      <div
                        className={`h-1 w-8 sm:w-12 md:w-16 ${
                          isPast ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
            )}

            {/* Error alert */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Step 1: Admin Account + Organization Details (Combined) */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-semibold mb-2"> Account Details</h2>
                  <p className="text-muted-foreground">Create your administrator account </p>
                </div>

                {/* Admin Account Section */}
                <div className="space-y-4 pb-4 border-b">
                  <h3 className="text-lg font-medium">Admin Account</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                          className="pl-10 w-full max-w-full"
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
                          className="pl-10 w-full max-w-full"
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
                        placeholder="e.g john@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 w-full max-w-full"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="At least 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 w-full max-w-full"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10 p-1"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                      <Input
                        id="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 pr-10 w-full max-w-full"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10 p-1"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Organization Details Section */}
                <div className="space-y-4 pt-4">
                  <h3 className="text-lg font-medium">Organization Details</h3>
                  
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
                        className="pl-10 w-full max-w-full"
                      />
                    </div>
                   
                  </div>

                  
                </div>

                <Button
                  onClick={handleNext}
                  className="w-full"
                  size="lg"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Next: Choose Plan
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Step 1.5: Email Confirmation */}
            {step === 1.5 && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="relative">
                      <Mail className="h-16 w-16 text-blue-600" />
                      {emailConfirmed ? (
                        <CheckCircle className="h-8 w-8 text-green-500 absolute -bottom-1 -right-1 bg-white rounded-full" />
                      ) : (
                        <Loader2 className="h-8 w-8 text-blue-500 absolute -bottom-1 -right-1 bg-white rounded-full animate-spin" />
                      )}
                    </div>
                  </div>
                  <h2 className="text-2xl font-semibold mb-2">Check Your Email</h2>
                  <p className="text-muted-foreground">
                    We've sent a confirmation link to your email address
                  </p>
                </div>

                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Please check your inbox at
                  </p>
                  <p className="font-semibold text-lg">{email}</p>
                  <p className="text-sm text-muted-foreground">
                    and click the confirmation link to activate your account.
                  </p>
                </div>

                {checkingEmailStatus && (
                  <div className="text-center">
                    <p className="text-sm text-blue-600">
                      Checking confirmation status...
                    </p>
                  </div>
                )}

                {emailConfirmed && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Email confirmed! Redirecting to plan selection...
                    </AlertDescription>
                  </Alert>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                  <p className="text-sm text-blue-900">
                    <strong>Didn't receive the email?</strong>
                  </p>
                  <ul className="text-sm text-blue-800 mt-2 space-y-1 list-disc list-inside">
                    <li>Check your spam or junk folder</li>
                    <li>Make sure you entered the correct email address</li>
                    <li>Wait a few minutes and try again</li>
                  </ul>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    onClick={handleBack}
                    variant="outline"
                    className="flex-1"
                    size="lg"
                    disabled={checkingEmailStatus}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  After confirming your email, you'll be able to select your plan and complete the signup.
                </p>
              </div>
            )}

            {/* Step 2: Subscription Plan */}
            {step === 2 && organizationId && (
              <div className="space-y-6 md:space-y-8">
                <div className="text-center md:text-left">
                  <h2 className="text-2xl md:text-3xl font-semibold mb-2">Choose Your Plan</h2>
                  <p className="text-muted-foreground text-sm md:text-base">Select a plan that suits your organization</p>
                </div>

                <PlanSelectionSignup 
                  selectedPlanCode={selectedPlan}
                  onPlanSelect={handlePlanSelection}
                  processing={loading}
                />

               {/*  <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
                  <Button
                    onClick={handleBack}
                    variant="outline"
                    className="w-full sm:flex-1"
                    size="lg"
                    disabled={loading}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Account Details
                  </Button>
                </div> */}

                <p className="text-xs text-center text-muted-foreground px-2">
                  By proceeding, you agree to our Terms of Service and Privacy Policy
                </p>
              </div>
            )}

            {/* Login link */}
            <div className="text-center pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
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

