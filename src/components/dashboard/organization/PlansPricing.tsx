import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptionPaymentListener } from '@/hooks/useSubscriptionPaymentListener';
import { supabaseOrganizationService } from '@/services/supabaseOrganizationService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, ArrowLeft } from 'lucide-react';
import { useNotification } from '@/hooks/useNotification';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export function PlansPricing() {
  const navigate = useNavigate();
  const { organization, refreshOrganization } = useOrganization();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);
  const [waitingForPayment, setWaitingForPayment] = useState(false);

  // Listen for subscription status changes when waiting for payment
  useSubscriptionPaymentListener(waitingForPayment);

  // Memoize loadSubscription to prevent unnecessary re-renders
  const loadSubscription = useCallback(async () => {
    try {
      setLoading(true);
      const sub = await supabaseOrganizationService.getSubscription();
      setSubscription(sub);
    } catch (error) {
      console.error('Failed to load subscription:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Use organization?.id instead of organization object to prevent infinite loops
  useEffect(() => {
    if (organization?.id) {
      loadSubscription();
    }
  }, [organization?.id, loadSubscription]);

  // Plan code to amount mapping (amounts in cents for USD)
  // Monthly plans (amounts in cents for USD) - matching PricingPage.tsx
  const monthlyPlanAmounts: Record<string, number> = {
    'PLN_FREE': 0,                    // Free plan (local only, not in Paystack)
    'PLN_5jjsgz1ivndtnxp': 15000,    // Basic Plan: $150 = 15,000 cents
    'PLN_a7qqm2p4q9ejdpt': 40000,    // Professional Plan: $400 = 40,000 cents
    'PLN_9jsfo4c1d35od5q': 80000,    // Enterprise Plan: $800 = 80,000 cents
  };

  // Annual plan codes
  const annualPlanCodes: Record<string, string> = {
    'PLN_5jjsgz1ivndtnxp': 'PLN_f5n4d3g6x7cb3or',   // Basic annual
    'PLN_a7qqm2p4q9ejdpt': 'PLN_zekf4yw2rvdy957',   // Professional annual
    'PLN_9jsfo4c1d35od5q': 'PLN_2w2w7d02awcarg9',   // Enterprise annual
  };

  // Calculate annual amounts (monthly * 12 * 0.9 for 10% savings) - matching PricingPage.tsx
  const annualPlanAmounts: Record<string, number> = {
    'PLN_f5n4d3g6x7cb3or': Math.round(15000 * 12 * 0.9),      // Basic annual: $1,620 = 162,000 cents
    'PLN_zekf4yw2rvdy957': Math.round(40000 * 12 * 0.9),    // Professional annual: $4,320 = 432,000 cents
    'PLN_2w2w7d02awcarg9': Math.round(80000 * 12 * 0.9),    // Enterprise annual: $8,640 = 864,000 cents
  };

  // Combined plan amounts mapping
  const planAmounts: Record<string, number> = {
    ...monthlyPlanAmounts,
    ...annualPlanAmounts,
  };

  // Helper function to get plan code based on annual toggle
  const getPlanCode = (monthlyCode: string): string => {
    if (monthlyCode === 'PLN_FREE') return monthlyCode;
    if (isAnnual && annualPlanCodes[monthlyCode]) {
      return annualPlanCodes[monthlyCode];
    }
    return monthlyCode;
  };

  // Helper function to calculate annual price with savings
  const getAnnualPrice = (monthlyAmount: number): string => {
    const annualAmount = Math.round(monthlyAmount * 12 * 0.9);
    const usd = annualAmount / 100;
    return `$${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Helper function to get monthly equivalent for annual plans
  const getMonthlyEquivalent = (monthlyAmount: number): string => {
    const annualAmount = Math.round(monthlyAmount * 12 * 0.9);
    const monthlyEquivalent = annualAmount / 12 / 100;
    return `$${monthlyEquivalent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Helper function to check if a plan code is annual
  const isAnnualPlanCode = (planCode: string): boolean => {
    return planCode.includes('f5n4d3g6x7cb3or') || // Basic annual
           planCode.includes('zekf4yw2rvdy957') || // Professional annual
           planCode.includes('2w2w7d02awcarg9');    // Enterprise annual
  };

  // Helper function to get the base monthly plan code from an annual plan code
  const getMonthlyPlanCodeFromAnnual = (annualCode: string): string | null => {
    if (annualCode.includes('f5n4d3g6x7cb3or')) return 'PLN_5jjsgz1ivndtnxp';
    if (annualCode.includes('zekf4yw2rvdy957')) return 'PLN_a7qqm2p4q9ejdpt';
    if (annualCode.includes('2w2w7d02awcarg9')) return 'PLN_9jsfo4c1d35od5q';
    return null;
  };

  // Determine if current subscription is annual or monthly
  // Try multiple possible field names (database uses lowercase, but might be transformed)
  // Also check paystackDetails which contains the full Paystack subscription object
  const currentSubscriptionPlanCode = useMemo(() => 
    subscription?.paystackPlanCode || 
    subscription?.paystackplancode || 
    subscription?.paystack_plan_code ||
    subscription?.planCode ||
    subscription?.plan_code ||
    subscription?.paystackDetails?.subscription?.plan?.plan_code ||
    subscription?.paystackDetails?.plan?.plan_code ||
    subscription?.paystackDetails?.plan_code,
    [subscription]
  );
  
  const isCurrentSubscriptionAnnual = useMemo(() => 
    currentSubscriptionPlanCode ? isAnnualPlanCode(currentSubscriptionPlanCode) : false,
    [currentSubscriptionPlanCode]
  );

  // Memoize subscription tier to prevent unnecessary recalculations
  const subscriptionTier = useMemo(() => organization?.subscriptionTier, [organization?.subscriptionTier]);

  // Plan definitions matching Paystack plans - memoized to prevent infinite loops
  const plans = useMemo(() => [
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
      isCurrent: subscriptionTier === 'free',
    },
    {
      code: 'PLN_5jjsgz1ivndtnxp',
      name: 'Basic',
      price: '$150',
      period: 'month',
      amount: planAmounts['PLN_5jjsgz1ivndtnxp'],
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
      isCurrent: (() => {
        const tierMatch = subscriptionTier === 'basic';
        if (!tierMatch) return false;
        if (!currentSubscriptionPlanCode) return true; // Fallback if no plan code
        // Only show as current if toggle matches subscription type
        const planCodeMatch = currentSubscriptionPlanCode.includes('5jjsgz1ivndtnxp') || 
                             currentSubscriptionPlanCode.includes('f5n4d3g6x7cb3or');
        if (!planCodeMatch) return false;
        if (isAnnual) {
          // Toggle is on (annual), only show current if subscription is annual
          return isCurrentSubscriptionAnnual && currentSubscriptionPlanCode.includes('f5n4d3g6x7cb3or');
        } else {
          // Toggle is off (monthly), only show current if subscription is monthly
          return !isCurrentSubscriptionAnnual && currentSubscriptionPlanCode.includes('5jjsgz1ivndtnxp');
        }
      })(),
    },
    {
      code: 'PLN_a7qqm2p4q9ejdpt',
      name: 'Professional',
      price: '$400',
      period: 'month',
      amount: planAmounts['PLN_a7qqm2p4q9ejdpt'],
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
      isCurrent: (() => {
        const tierMatch = organization?.subscriptionTier === 'professional' || organization?.subscriptionTier === 'pro';
        if (!tierMatch) return false;
        if (!currentSubscriptionPlanCode) return true; // Fallback if no plan code
        const planCodeMatch = currentSubscriptionPlanCode.includes('a7qqm2p4q9ejdpt') || 
                             currentSubscriptionPlanCode.includes('zekf4yw2rvdy957');
        if (!planCodeMatch) return false;
        // Only show as current if toggle matches subscription type
        if (isAnnual) {
          // Toggle is on (annual), only show current if subscription is annual
          return isCurrentSubscriptionAnnual && currentSubscriptionPlanCode.includes('zekf4yw2rvdy957');
        } else {
          // Toggle is off (monthly), only show current if subscription is monthly
          return !isCurrentSubscriptionAnnual && currentSubscriptionPlanCode.includes('a7qqm2p4q9ejdpt');
        }
      })(),
    },
    {
      code: 'PLN_9jsfo4c1d35od5q',
      name: 'Enterprise',
      price: '$800',
      period: 'month',
      amount: planAmounts['PLN_9jsfo4c1d35od5q'],
      maxUsers: -1, // Unlimited
      maxProjects: -1, // Unlimited
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
      isCurrent: (() => {
        const tierMatch = subscriptionTier === 'enterprise';
        if (!tierMatch) return false;
        if (!currentSubscriptionPlanCode) return true; // Fallback if no plan code
        const planCodeMatch = currentSubscriptionPlanCode.includes('9jsfo4c1d35od5q') || 
                             currentSubscriptionPlanCode.includes('2w2w7d02awcarg9');
        if (!planCodeMatch) return false;
        // Only show as current if toggle matches subscription type
        if (isAnnual) {
          // Toggle is on (annual), only show current if subscription is annual
          return isCurrentSubscriptionAnnual && currentSubscriptionPlanCode.includes('2w2w7d02awcarg9');
        } else {
          // Toggle is off (monthly), only show current if subscription is monthly
          return !isCurrentSubscriptionAnnual && currentSubscriptionPlanCode.includes('9jsfo4c1d35od5q');
        }
      })(),
    },
  ], [subscriptionTier, currentSubscriptionPlanCode, isCurrentSubscriptionAnnual, isAnnual]);

  const handleInitializeSubscription = async (planCode: string) => {
    if (!user?.email) {
      console.error('[Subscription] User email not found');
      showError('User email not found');
      return;
    }

    if (!organization?.id) {
      console.error('[Subscription] Organization ID not found');
      showError('Organization ID not found');
      return;
    }

    // Check if user has an active subscription
    // The subscription object uses lowercase field names from the database
    const paystackSubscriptionCode = subscription?.paystackSubscriptionCode || 
                                    subscription?.paystacksubscriptioncode ||
                                    subscription?.paystack_subscription_code;
    const subscriptionStatus = subscription?.status || subscription?.Status;
    const subscriptionTier = subscription?.tier || subscription?.Tier || organization?.subscriptionTier;
    
    // User has an active subscription if:
    // 1. They have a subscription code AND status is active/trialing, OR
    // 2. They have a paid tier (not free) - even if subscription code isn't set yet
    const hasActiveSubscription = (
      (paystackSubscriptionCode && (subscriptionStatus === 'active' || subscriptionStatus === 'trialing'))
    ) || (
      subscriptionTier && 
      subscriptionTier !== 'free' && 
      (subscriptionStatus === 'active' || subscriptionStatus === 'trialing' || !subscriptionStatus)
    );

    // Determine if this is a switch from free to paid plan
    // immediate = true ONLY when switching FROM free TO a paid plan
    const isFreeToPaidSwitch = (subscriptionTier === 'free' || !subscriptionTier) && planCode !== 'PLN_FREE';
    const shouldSwitchImmediately = isFreeToPaidSwitch;

    // If user has an active subscription, switch plans instead of creating new one
    if (hasActiveSubscription && planCode !== 'PLN_FREE') {
      try {
        setProcessing(true);
        console.log('[Subscription] Switching subscription plan:', {
          subscriptionCode: paystackSubscriptionCode,
          currentTier: subscriptionTier,
          newPlanCode: planCode,
          isFreeToPaid: isFreeToPaidSwitch,
          immediate: shouldSwitchImmediately,
          organizationId: organization.id,
        });

        await supabaseOrganizationService.switchSubscriptionPlan(planCode, shouldSwitchImmediately);
        
        if (shouldSwitchImmediately) {
          showSuccess('Subscription plan switched successfully. Changes are effective immediately.');
        } else {
          showSuccess('Subscription plan switch scheduled. Your current plan will remain active until the next billing cycle, when your new plan will begin.');
        }
        
        // Refresh subscription and organization data
        await loadSubscription();
        await refreshOrganization();
        
        // Navigate back to subscription page
        navigate('/dashboard/organization/subscription');
      } catch (error: any) {
        console.error('[Subscription] Failed to switch plan:', {
          error,
          message: error?.message,
          stack: error?.stack,
          planCode,
          subscriptionCode: paystackSubscriptionCode,
        });
        showError(error?.message || 'Failed to switch subscription plan');
      } finally {
        setProcessing(false);
      }
      return;
    }

    // For new subscriptions or free plan, initialize payment
    // Get amount for the plan code
    const amount = planAmounts[planCode];
    if (amount === undefined) {
      console.error('[Subscription] Invalid plan code:', planCode);
      showError('Invalid plan selected');
      return;
    }

    // For annual plans, use the annual amount
    const finalAmount = amount;

    try {
      setProcessing(true);
      console.log('[Subscription] Initializing subscription payment:', {
        planCode,
        amount: finalAmount,
        amountInKES: finalAmount / 100,
        email: user.email,
        organizationId: organization.id,
      });

      const result = await supabaseOrganizationService.initializeSubscriptionPayment(
        planCode,
        user.email,
        finalAmount,
        { organizationId: organization.id }
      );

      console.log('[Subscription] Payment initialization successful:', {
        authorization_url: result.authorization_url,
        access_code: result.access_code,
        reference: result.reference,
      });
      
      // Set waiting for payment flag and redirect to Paystack payment page
      setWaitingForPayment(true);
      window.location.href = result.authorization_url;
    } catch (error: any) {
      console.error('[Subscription] Failed to initialize subscription:', {
        error,
        message: error?.message,
        stack: error?.stack,
        planCode,
        amount: finalAmount,
        email: user?.email,
        organizationId: organization?.id,
      });
      showError(error?.message || 'Failed to initialize subscription payment');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-64 bg-gray-200 rounded mb-4"></div>
          <div className="h-96 w-full bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard/organization/subscription')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Plans and Pricing</h1>
          <p className="text-muted-foreground mt-1">
            Choose the perfect plan for your organization
          </p>
        </div>
      </div>
      
      {/* Annual/Monthly Toggle - Only show for paid plans */}
      <div className="p-4 bg-muted rounded-lg border">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="annual-toggle" className="text-base font-medium cursor-pointer">
              Annual billing
            </Label>
            <p className="text-sm text-muted-foreground">
              {isAnnual 
                ? 'Save 10% with annual billing. You\'ll be charged once per year.'
                : 'Switch to annual billing to save 10% on your subscription.'}
            </p>
          </div>
          <Switch
            id="annual-toggle"
            checked={isAnnual}
            onCheckedChange={setIsAnnual}
          />
        </div>
      </div>
      
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          // Professional plan is the popular one
          const isPopular = plan.code === 'PLN_a7qqm2p4q9ejdpt';
          const isFree = plan.code === 'PLN_FREE';
          // Only show current badge for paid plans, not for Free
          const showCurrentBadge = plan.isCurrent && !isFree;
          return (
            <div key={plan.code} className="flex flex-col h-full">
              <Card 
                className={`relative flex flex-col h-full ${
                  isPopular 
                    ? 'ring-2 ring-teal-500 border-teal-500 shadow-lg' 
                    : plan.isCurrent && !isFree
                      ? 'ring-2 ring-primary' 
                      : ''
                }`}
              >
              {showCurrentBadge && (
                <Badge className="absolute top-4 right-4" variant="default">
                  CURRENT
                </Badge>
              )}
              {isPopular && !showCurrentBadge && (
                <Badge className="absolute top-4 right-4 bg-pink-500" variant="default">
                  POPULAR
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="mt-2">
                  {isFree ? (
                    <>
                      <span className="text-3xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground">/{plan.period}</span>
                    </>
                  ) : isAnnual ? (
                    <>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold">{getAnnualPrice(plan.amount)}</span>
                        <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-300">
                          Save 10%
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {getMonthlyEquivalent(plan.amount)}/month billed annually
                      </div>
                      <div className="text-xs text-muted-foreground line-through mt-0.5">
                        {plan.price}/month × 12
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-3xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground">/{plan.period}</span>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 min-w-0 overflow-hidden">
                <ul className="space-y-3 mb-6 flex-1 min-w-0">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                {plan.isCurrent ? (
                  <Button disabled variant="outline" className="w-full mt-auto">
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      const selectedPlanCode = getPlanCode(plan.code);
                      handleInitializeSubscription(selectedPlanCode);
                    }}
                    className={`w-full mt-auto ${
                      isPopular 
                        ? 'bg-teal-600 hover:bg-teal-700 text-white' 
                        : ''
                    }`}
                    variant={isPopular ? 'default' : 'outline'}
                    disabled={processing}
                  >
                    {processing 
                      ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      )
                      : (() => {
                          const paystackCode = subscription?.paystackSubscriptionCode || 
                                              subscription?.paystacksubscriptioncode ||
                                              subscription?.paystack_subscription_code;
                          const status = subscription?.status || subscription?.Status;
                          return paystackCode && (status === 'active' || status === 'trialing');
                        })()
                        ? 'Switch Plan'
                        : 'Select Plan'}
                  </Button>
                )}
              </CardContent>
            </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}

