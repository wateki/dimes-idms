import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/lib/supabaseClient';

const WAITING_FOR_PAYMENT_KEY = 'waiting_for_subscription_payment';

/**
 * Hook to listen for subscription status changes after payment initiation
 * Navigates to subscription page when payment is successful (status becomes 'active')
 * 
 * The waiting state is persisted in localStorage so it survives redirects to Paystack
 */
export function useSubscriptionPaymentListener(isWaitingForPayment: boolean) {
  const navigate = useNavigate();
  const location = useLocation();
  const { organization, refreshOrganization } = useOrganization();
  const previousStatusRef = useRef<string | null>(null);
  const hasNavigatedRef = useRef(false);
  
  // Check localStorage on mount to see if we're waiting for payment
  useEffect(() => {
    const stored = localStorage.getItem(WAITING_FOR_PAYMENT_KEY);
    if (stored === 'true') {
      // If we have organization data, we can start listening
      // Otherwise, we'll wait for organization to load
      console.log('[useSubscriptionPaymentListener] Found stored waiting-for-payment state');
    }
  }, []);

  // Store waiting state in localStorage
  useEffect(() => {
    if (isWaitingForPayment) {
      localStorage.setItem(WAITING_FOR_PAYMENT_KEY, 'true');
      console.log('[useSubscriptionPaymentListener] Stored waiting-for-payment state');
    } else if (!isWaitingForPayment && localStorage.getItem(WAITING_FOR_PAYMENT_KEY) === 'true') {
      // Only clear if explicitly set to false (not on initial mount)
      // This allows the flag to persist across redirects
    }
  }, [isWaitingForPayment]);

  // Determine if we should listen (either from prop or localStorage)
  // Use state to track this so it updates when localStorage changes
  const [shouldListen, setShouldListen] = useState(
    isWaitingForPayment || localStorage.getItem(WAITING_FOR_PAYMENT_KEY) === 'true'
  );

  // Update shouldListen when isWaitingForPayment changes or on mount
  useEffect(() => {
    const stored = localStorage.getItem(WAITING_FOR_PAYMENT_KEY) === 'true';
    setShouldListen(isWaitingForPayment || stored);
  }, [isWaitingForPayment]);

  useEffect(() => {
    // Track the initial subscription status
    // Use organization?.id and organization?.subscriptionStatus to prevent infinite loops
    if (organization?.id && organization?.subscriptionStatus && !previousStatusRef.current) {
      previousStatusRef.current = organization.subscriptionStatus;
    }
  }, [organization?.id, organization?.subscriptionStatus]);

  useEffect(() => {
    if (!shouldListen || !organization?.id || hasNavigatedRef.current) {
      return;
    }

    console.log('[useSubscriptionPaymentListener] Setting up real-time listener for subscription payment', {
      organizationId: organization.id,
      currentStatus: organization.subscriptionStatus,
    });

    // Set up real-time subscription for organization changes
    const channel = supabase
      .channel(`organization-subscription-${organization.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'organizations',
          filter: `id=eq.${organization.id}`,
        },
        async (payload) => {
          console.log('[useSubscriptionPaymentListener] Organization updated:', payload);
          
          const newData = payload.new as any;
          const newStatus = newData.subscriptionStatus;
          const previousStatus = previousStatusRef.current;

          console.log('[useSubscriptionPaymentListener] Status change detected:', {
            previousStatus,
            newStatus,
            organizationId: organization.id,
          });

          // Check if subscription status changed to 'active'
          if (newStatus === 'active' && previousStatus !== 'active') {
            console.log('[useSubscriptionPaymentListener] Subscription activated! Navigating to subscription page...');
            
            // Prevent multiple navigations
            hasNavigatedRef.current = true;
            
            // Clear the waiting state
            localStorage.removeItem(WAITING_FOR_PAYMENT_KEY);
            
            // Update the organization context
            await refreshOrganization();
            
            // Navigate to subscription page
            navigate('/dashboard/organization/subscription', { replace: true });
          }

          // Update previous status
          previousStatusRef.current = newStatus;
        }
      )
      .subscribe((status) => {
        console.log('[useSubscriptionPaymentListener] Subscription status:', status);
      });

    // Cleanup function
    return () => {
      console.log('[useSubscriptionPaymentListener] Cleaning up real-time listener');
      supabase.removeChannel(channel);
    };
  }, [shouldListen, organization?.id, navigate, refreshOrganization]);

  // Also check periodically in case real-time misses the update
  // This is a fallback to ensure we catch the status change even if real-time fails
  useEffect(() => {
    if (!shouldListen || !organization?.id || hasNavigatedRef.current) {
      return;
    }

    let checkCount = 0;
    const maxChecks = 40; // Check for up to 2 minutes (40 * 3 seconds)

    const checkInterval = setInterval(async () => {
      checkCount++;
      
      if (checkCount > maxChecks) {
        console.log('[useSubscriptionPaymentListener] Stopping periodic checks (max attempts reached)');
        clearInterval(checkInterval);
        return;
      }

      try {
        await refreshOrganization();
        
        // The organization state will be updated by refreshOrganization
        // We'll check it on the next render via the real-time listener
        // This polling is just a fallback
      } catch (error) {
        console.error('[useSubscriptionPaymentListener] Error checking subscription status:', error);
      }
    }, 3000); // Check every 3 seconds

    return () => clearInterval(checkInterval);
  }, [shouldListen, organization?.id, refreshOrganization]);

  // Check subscription status when organization updates
  useEffect(() => {
    if (!shouldListen || !organization || hasNavigatedRef.current) {
      return;
    }

    const currentStatus = organization.subscriptionStatus;
    const previousStatus = previousStatusRef.current;

    // Only navigate if we're not already on the subscription page
    const isOnSubscriptionPage = location.pathname === '/dashboard/organization/subscription';

    if (currentStatus === 'active' && previousStatus !== 'active' && !isOnSubscriptionPage) {
      console.log('[useSubscriptionPaymentListener] Subscription activated! Navigating to subscription page...');
      hasNavigatedRef.current = true;
      localStorage.removeItem(WAITING_FOR_PAYMENT_KEY);
      navigate('/dashboard/organization/subscription', { replace: true });
    }

    previousStatusRef.current = currentStatus;
  }, [organization?.subscriptionStatus, shouldListen, navigate, location.pathname]);
}

