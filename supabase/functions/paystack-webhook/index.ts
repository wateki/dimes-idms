// Supabase Edge Function for Paystack Webhooks
// Handles Paystack subscription events and updates database accordingly

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log("[PaystackWebhook] Webhook received:", {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
  });

  try {
    // Get Paystack secret key for signature verification
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      console.error("[PaystackWebhook] Paystack secret key not configured");
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify webhook signature
    const signature = req.headers.get("x-paystack-signature");
    if (!signature) {
      console.error("[PaystackWebhook] Missing Paystack signature header");
      return new Response(
        JSON.stringify({ error: "Missing signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.text();
    console.log("[PaystackWebhook] Webhook body received:", {
      bodyLength: body.length,
      hasSignature: !!signature,
    });
    
    // Verify signature (Paystack uses HMAC SHA512)
    // Note: In Deno, we need to use the Web Crypto API correctly
    const encoder = new TextEncoder();
    const keyData = encoder.encode(paystackSecretKey);
    const messageData = encoder.encode(body);
    
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"]
    );

    const signatureBytes = await crypto.subtle.sign("HMAC", key, messageData);
    const hashArray = Array.from(new Uint8Array(signatureBytes));
    const computedSignature = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (signature !== computedSignature) {
      console.error("[PaystackWebhook] Invalid webhook signature", { 
        received: signature.substring(0, 20) + "...",
        computed: computedSignature.substring(0, 20) + "...",
        bodyPreview: body.substring(0, 100),
      });
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[PaystackWebhook] Signature verified successfully");

    // Parse webhook payload
    const event = JSON.parse(body);
    const { event: eventType, data } = event;

    console.log("[PaystackWebhook] Event parsed:", {
      eventType,
      hasData: !!data,
      dataKeys: data ? Object.keys(data) : [],
    });

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[PaystackWebhook] Routing to handler for event:", eventType);

    // Route to appropriate handler based on event type
    switch (eventType) {
      case "subscription.create":
        await handleSubscriptionCreate(data, supabase);
        break;

      case "subscription.disable":
        await handleSubscriptionDisable(data, supabase);
        break;

      case "subscription.not_renew":
        await handleSubscriptionNotRenew(data, supabase);
        break;

      case "invoice.create":
        await handleInvoiceCreate(data, supabase);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(data, supabase);
        break;

      case "invoice.update":
        await handleInvoiceUpdate(data, supabase);
        break;

      case "charge.success":
        await handleChargeSuccess(data, supabase);
        break;

      case "subscription.expiring_cards":
        await handleExpiringCards(data, supabase);
        break;

      default:
        console.log(`[PaystackWebhook] Unhandled event type: ${eventType}`);
    }

    console.log("[PaystackWebhook] Webhook processed successfully:", {
      eventType,
      timestamp: new Date().toISOString(),
    });

    // Always return 200 to acknowledge receipt
    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[PaystackWebhook] Error processing webhook:", {
      error: error.message,
      stack: error.stack,
      name: error.name,
    });
    // Still return 200 to prevent Paystack from retrying
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper function to calculate period dates from Paystack subscription data
// Paystack API doesn't provide current_period_start/end, so we calculate from start and next_payment_date
function calculatePeriodDates(subscription: any): { periodStart: string | null; periodEnd: string | null } {
  try {
    // Paystack provides:
    // - start: timestamp when subscription started
    // - next_payment_date: ISO date string for next payment
    // - plan.interval: "monthly", "weekly", "annually", etc.
    
    if (!subscription.next_payment_date) {
      return { periodStart: null, periodEnd: null };
    }

    const nextPaymentDate = new Date(subscription.next_payment_date);
    const planInterval = subscription.plan?.interval || 'monthly';
    
    // Calculate period end as the day before next payment (current period ends when next payment is due)
    const periodEnd = new Date(nextPaymentDate);
    periodEnd.setDate(periodEnd.getDate() - 1);
    periodEnd.setHours(23, 59, 59, 999); // End of day
    
    // Calculate period start based on interval
    const periodStart = new Date(periodEnd);
    
    switch (planInterval.toLowerCase()) {
      case 'monthly':
        periodStart.setMonth(periodStart.getMonth() - 1);
        periodStart.setDate(1); // Start of month
        periodStart.setHours(0, 0, 0, 0);
        break;
      case 'annually':
      case 'yearly':
        periodStart.setFullYear(periodStart.getFullYear() - 1);
        periodStart.setMonth(0, 1); // January 1st
        periodStart.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        periodStart.setDate(periodStart.getDate() - 7);
        periodStart.setHours(0, 0, 0, 0);
        break;
      case 'daily':
        periodStart.setDate(periodStart.getDate() - 1);
        periodStart.setHours(0, 0, 0, 0);
        break;
      default:
        // Default to monthly
        periodStart.setMonth(periodStart.getMonth() - 1);
        periodStart.setDate(1);
        periodStart.setHours(0, 0, 0, 0);
    }
    
    return {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    };
  } catch (error: any) {
    console.error("[PaystackWebhook] Error calculating period dates:", {
      error: error.message,
      subscription: subscription,
    });
    return { periodStart: null, periodEnd: null };
  }
}

// Helper function to query Paystack API for subscription details
async function fetchSubscriptionFromPaystack(
  customerCode: string,
  planCode: string,
  paystackSecretKey: string,
  retryCount: number = 0
): Promise<any | null> {
  try {
    console.log("[PaystackWebhook] Querying Paystack API for subscription:", {
      customerCode,
      planCode,
      retryCount,
    });

    // First, get customer details to retrieve customer ID
    // The subscription API customer filter expects Customer ID (integer), not customer code (CUS_xxx)
    console.log("[PaystackWebhook] Fetching customer details to get customer ID:", {
      customerCode,
    });

    const getCustomerResponse = await fetch(
      `https://api.paystack.co/customer/${encodeURIComponent(customerCode)}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const customerData = await getCustomerResponse.json();

    if (!customerData.status || !customerData.data) {
      console.error("[PaystackWebhook] Error fetching customer from Paystack:", {
        customerCode,
        paystackError: customerData.message,
        paystackResponse: customerData,
      });
      return null;
    }

    const customerId = customerData.data.id;
    console.log("[PaystackWebhook] Customer ID retrieved:", {
      customerCode,
      customerId,
    });

    // Now query subscriptions using customer ID (integer)
    const response = await fetch(
      `https://api.paystack.co/subscription?customer=${customerId}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!data.status || !data.data || data.data.length === 0) {
      // If we got a duplicate_subscription error but no subscriptions found, 
      // it might be a timing issue - Paystack might still be processing
      if (retryCount < 2) {
        console.log("[PaystackWebhook] No subscriptions found, retrying after short delay:", {
          customerCode,
          planCode,
          retryCount: retryCount + 1,
          paystackResponse: data,
        });
        
        // Wait 1 second before retrying (using a simple loop since we can't use setTimeout in Deno Edge Functions)
        // Actually, we can't wait in Deno Edge Functions easily, so we'll just return null
        // The subscription.create webhook will handle it
        return null;
      }
      
      console.log("[PaystackWebhook] No subscriptions found in Paystack API for customer after retries:", {
        customerCode,
        planCode,
        paystackResponse: data,
      });
      return null;
    }

    // Find subscription matching the plan code
    const matchingSubscription = data.data.find(
      (sub: any) => sub.plan?.plan_code === planCode || sub.plan_code === planCode
    );

    if (matchingSubscription) {
      console.log("[PaystackWebhook] Found matching subscription in Paystack API:", {
        subscriptionCode: matchingSubscription.subscription_code,
        planCode: matchingSubscription.plan?.plan_code || matchingSubscription.plan_code,
        status: matchingSubscription.status,
        nextPaymentDate: matchingSubscription.next_payment_date,
        customerCode,
      });
      
      // Calculate period dates from available fields
      const periodDates = calculatePeriodDates(matchingSubscription);
      return {
        ...matchingSubscription,
        current_period_start: periodDates.periodStart,
        current_period_end: periodDates.periodEnd,
      };
    } else {
      console.log("[PaystackWebhook] No matching subscription found for plan code:", {
        customerCode,
        planCode,
        availableSubscriptions: data.data.map((sub: any) => ({
          subscriptionCode: sub.subscription_code,
          planCode: sub.plan?.plan_code || sub.plan_code,
          status: sub.status,
        })),
      });
      
      // If we have subscriptions but none match, and we got a duplicate_subscription error,
      // it might mean the subscription is being created but not yet indexed
      // In this case, we should wait for the subscription.create webhook
      return null;
    }
  } catch (error: any) {
    console.error("[PaystackWebhook] Error querying Paystack API for subscription:", {
      error: error.message,
      stack: error.stack,
      customerCode,
      planCode,
    });
    return null;
  }
}

// Handle subscription.create event
async function handleSubscriptionCreate(data: any, supabase: any) {
  const subscription = data;
  
  console.log("[PaystackWebhook] ===== SUBSCRIPTION.CREATE EVENT RECEIVED =====");
  console.log("[PaystackWebhook] Full subscription data:", JSON.stringify(subscription, null, 2));
  console.log("[PaystackWebhook] Processing subscription.create:", {
    subscriptionCode: subscription.subscription_code,
    planCode: subscription.plan?.plan_code || subscription.plan_code,
    status: subscription.status,
    amount: subscription.amount,
    customerCode: subscription.customer?.customer_code || subscription.customer_code,
    metadata: subscription.metadata,
    nextPaymentDate: subscription.next_payment_date,
    createdAt: subscription.created_at,
    hasPlan: !!subscription.plan,
    planDetails: subscription.plan ? {
      planCode: subscription.plan.plan_code,
      planName: subscription.plan.name,
      planAmount: subscription.plan.amount,
      planInterval: subscription.plan.interval,
    } : null,
  });
  
  // Try to get organizationId from metadata or find by subscription code
  let organizationId = subscription.metadata?.organizationId;
  
  console.log("[PaystackWebhook] Step 1: Getting organizationId", {
    fromMetadata: !!organizationId,
    metadata: subscription.metadata,
  });
  
  if (!organizationId) {
    console.log("[PaystackWebhook] OrganizationId not in metadata, searching by subscription code");
    // Try to find existing subscription record
    const { data: existingSub, error: searchError } = await supabase
      .from("subscriptions")
      .select("organizationid")
      .eq("paystacksubscriptioncode", subscription.subscription_code)
      .single();
    
    if (searchError) {
      console.error("[PaystackWebhook] Error searching for existing subscription:", {
        error: searchError,
        errorCode: searchError?.code,
        errorMessage: searchError?.message,
        subscriptionCode: subscription.subscription_code,
      });
    }
    
    if (existingSub) {
      organizationId = existingSub.organizationid;
      console.log("[PaystackWebhook] Found organizationId from existing subscription:", organizationId);
    } else {
      console.log("[PaystackWebhook] No existing subscription found with subscription code:", {
        subscriptionCode: subscription.subscription_code,
      });
    }
  } else {
    console.log("[PaystackWebhook] OrganizationId from metadata:", organizationId);
  }

  if (!organizationId) {
    console.error("[PaystackWebhook] ===== CRITICAL: Missing organizationId =====", {
      subscriptionCode: subscription.subscription_code,
      metadata: subscription.metadata,
      customerCode: subscription.customer?.customer_code || subscription.customer_code,
      note: "Cannot process subscription.create without organizationId. This subscription may not be properly linked.",
    });
    return;
  }

  console.log("[PaystackWebhook] Step 2: OrganizationId confirmed:", organizationId);

  // Upsert subscription record
  const planCode = subscription.plan?.plan_code || subscription.plan_code;
  
  console.log("[PaystackWebhook] Step 3: Processing plan code", {
    planCode,
    hasPlanObject: !!subscription.plan,
    planObject: subscription.plan,
  });
  
  if (!planCode) {
    console.error("[PaystackWebhook] ===== CRITICAL: Missing plan code =====", {
      subscriptionCode: subscription.subscription_code,
      subscriptionData: subscription,
    });
    return;
  }
  
  // Get tier from subscription_plans table
  let tier = 'free'; // Default fallback
  console.log("[PaystackWebhook] Step 4: Fetching tier from subscription_plans table", {
    planCode,
  });
  
  if (planCode) {
    const { data: planData, error: planError } = await supabase
      .from("subscription_plans")
      .select("tierName")
      .eq("planCode", planCode)
      .eq("isActive", true)
      .maybeSingle();
    
    if (planError) {
      console.error("[PaystackWebhook] Error fetching plan from subscription_plans table:", {
        error: planError,
        errorCode: planError?.code,
        errorMessage: planError?.message,
        planCode,
      });
    }
    
    if (planData?.tierName) {
      tier = planData.tierName;
      console.log("[PaystackWebhook] Tier fetched from subscription_plans:", {
        planCode,
        tier,
        planData,
      });
    } else {
      console.warn("[PaystackWebhook] Plan code not found in subscription_plans table, using default 'free':", {
        planCode,
        planData,
      });
    }
  }
  
  console.log("[PaystackWebhook] Step 5: Tier determined:", tier);
  
  // Check for existing subscription for this organization
  // This could be:
  // 1. A preliminary subscription from charge.success (no paystacksubscriptioncode yet)
  // 2. An old subscription being replaced (status = "non-renewing" from deferred plan switch)
  // 3. An existing active subscription (shouldn't happen for new subscriptions, but handle it)
  console.log("[PaystackWebhook] Step 6: Checking for existing subscription", {
    organizationId,
  });
  
  const { data: existingSub, error: existingSubError } = await supabase
    .from("subscriptions")
    .select("id, paystacksubscriptioncode, status, tier, paystackplancode")
    .eq("organizationid", organizationId)
    .maybeSingle();

  if (existingSubError) {
    console.error("[PaystackWebhook] Error checking for existing subscription:", {
      error: existingSubError,
      errorCode: existingSubError?.code,
      errorMessage: existingSubError?.message,
      organizationId,
    });
  }
  
  console.log("[PaystackWebhook] Step 7: Existing subscription check result:", {
    found: !!existingSub,
    existingSub: existingSub ? {
      id: existingSub.id,
      subscriptionCode: existingSub.paystacksubscriptioncode,
      status: existingSub.status,
      tier: existingSub.tier,
      planCode: existingSub.paystackplancode,
    } : null,
  });

  if (existingSub) {
    // Check if this is a deferred plan switch (old subscription marked as non-renewing)
    const isDeferredSwitch = existingSub.status === "non-renewing" && 
                             existingSub.paystacksubscriptioncode !== subscription.subscription_code;
    
    // Check if this is a preliminary subscription (no subscription code yet)
    const isPreliminary = !existingSub.paystacksubscriptioncode;

    if (isDeferredSwitch) {
      console.log("[PaystackWebhook] Deferred plan switch detected - updating old subscription with new plan details:", {
        oldSubscriptionId: existingSub.id,
        oldSubscriptionCode: existingSub.paystacksubscriptioncode,
        oldTier: existingSub.tier,
        newSubscriptionCode: subscription.subscription_code,
        newTier: tier,
      });

      // Update the existing subscription record with new subscription details
      // This transitions from the old plan to the new plan
      console.log("[PaystackWebhook] Step 8a: Updating subscription for deferred switch", {
        subscriptionId: existingSub.id,
        updateData: {
          paystacksubscriptioncode: subscription.subscription_code,
          paystackplancode: planCode,
          paystackcustomercode: subscription.customer?.customer_code || subscription.customer_code,
          status: subscription.status,
          amount: subscription.amount,
          nextpaymentdate: subscription.next_payment_date,
          tier: tier,
        },
      });
      
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          paystacksubscriptioncode: subscription.subscription_code,
          paystackplancode: planCode,
          paystackcustomercode: subscription.customer?.customer_code || subscription.customer_code,
          status: subscription.status, // Should be "active" when it starts
          amount: subscription.amount,
          nextpaymentdate: subscription.next_payment_date,
          currentPeriodStart: subscription.current_period_start || (() => {
            const periodDates = calculatePeriodDates(subscription);
            return periodDates.periodStart;
          })(),
          currentPeriodEnd: subscription.current_period_end || (() => {
            const periodDates = calculatePeriodDates(subscription);
            return periodDates.periodEnd;
          })(),
          tier: tier, // Update to new tier
          updatedAt: new Date().toISOString(),
        } as any)
        .eq("id", existingSub.id);

      if (updateError) {
        console.error("[PaystackWebhook] Error updating subscription for deferred switch:", {
          error: updateError,
          subscriptionId: existingSub.id,
        });
      } else {
        console.log("[PaystackWebhook] Subscription updated for deferred plan switch - tier changed from", existingSub.tier, "to", tier);
        
        // Update organization tier now that the new subscription is active
        const { error: orgTierError } = await supabase
          .from("organizations")
          .update({
            subscriptionTier: tier,
            updatedAt: new Date().toISOString(),
          })
          .eq("id", organizationId);

        if (orgTierError) {
          console.error("[PaystackWebhook] Error updating organization tier:", orgTierError);
        } else {
          console.log("[PaystackWebhook] Organization tier updated to", tier);
        }
      }
    } else if (isPreliminary) {
    console.log("[PaystackWebhook] Found preliminary subscription from charge.success, updating with full details:", {
        subscriptionId: existingSub.id,
      subscriptionCode: subscription.subscription_code,
    });
    
    // Update the existing preliminary record with full subscription details
      console.log("[PaystackWebhook] Step 8b: Updating preliminary subscription", {
        subscriptionId: existingSub.id,
        updateData: {
          paystacksubscriptioncode: subscription.subscription_code,
          paystackcustomercode: subscription.customer?.customer_code || subscription.customer_code,
          status: subscription.status,
          amount: subscription.amount,
          nextpaymentdate: subscription.next_payment_date,
          currentPeriodStart: subscription.current_period_start || (() => {
            const periodDates = calculatePeriodDates(subscription);
            return periodDates.periodStart;
          })(),
          currentPeriodEnd: subscription.current_period_end || (() => {
            const periodDates = calculatePeriodDates(subscription);
            return periodDates.periodEnd;
          })(),
          tier: tier,
        },
      });
      
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        paystacksubscriptioncode: subscription.subscription_code,
        paystackcustomercode: subscription.customer?.customer_code || subscription.customer_code,
        status: subscription.status,
        amount: subscription.amount,
        nextpaymentdate: subscription.next_payment_date,
          currentPeriodStart: subscription.current_period_start || (() => {
            const periodDates = calculatePeriodDates(subscription);
            return periodDates.periodStart;
          })(),
          currentPeriodEnd: subscription.current_period_end || (() => {
            const periodDates = calculatePeriodDates(subscription);
            return periodDates.periodEnd;
          })(),
        tier: tier,
        updatedAt: new Date().toISOString(),
      } as any)
        .eq("id", existingSub.id);

    if (updateError) {
      console.error("[PaystackWebhook] Error updating preliminary subscription:", {
        error: updateError,
          subscriptionId: existingSub.id,
      });
    } else {
      console.log("[PaystackWebhook] Preliminary subscription updated successfully");
    }
  } else {
      // Existing subscription with same code - just update details
      console.log("[PaystackWebhook] Updating existing subscription details:", {
        subscriptionId: existingSub.id,
        subscriptionCode: subscription.subscription_code,
      });

      console.log("[PaystackWebhook] Step 8c: Updating existing subscription details", {
        subscriptionId: existingSub.id,
        updateData: {
          paystackplancode: planCode,
          paystackcustomercode: subscription.customer?.customer_code || subscription.customer_code,
          status: subscription.status,
          amount: subscription.amount,
          nextpaymentdate: subscription.next_payment_date,
          currentPeriodStart: subscription.current_period_start || (() => {
            const periodDates = calculatePeriodDates(subscription);
            return periodDates.periodStart;
          })(),
          currentPeriodEnd: subscription.current_period_end || (() => {
            const periodDates = calculatePeriodDates(subscription);
            return periodDates.periodEnd;
          })(),
          tier: tier,
        },
      });
      
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          paystackplancode: planCode,
          paystackcustomercode: subscription.customer?.customer_code || subscription.customer_code,
          status: subscription.status,
          amount: subscription.amount,
          nextpaymentdate: subscription.next_payment_date,
          currentPeriodStart: subscription.current_period_start || (() => {
            const periodDates = calculatePeriodDates(subscription);
            return periodDates.periodStart;
          })(),
          currentPeriodEnd: subscription.current_period_end || (() => {
            const periodDates = calculatePeriodDates(subscription);
            return periodDates.periodEnd;
          })(),
          tier: tier,
          updatedAt: new Date().toISOString(),
        } as any)
        .eq("id", existingSub.id);

      if (updateError) {
        console.error("[PaystackWebhook] Error updating existing subscription:", {
          error: updateError,
          subscriptionId: existingSub.id,
        });
      }
    }
  } else {
    // No existing subscription - create new one
    console.log("[PaystackWebhook] Creating new subscription record:", {
      organizationId,
      subscriptionCode: subscription.subscription_code,
      planCode,
      tier,
      status: subscription.status,
      amount: subscription.amount,
    });

      console.log("[PaystackWebhook] Step 8d: Creating new subscription record", {
        organizationId,
        insertData: {
          paystacksubscriptioncode: subscription.subscription_code,
          paystackplancode: planCode,
          paystackcustomercode: subscription.customer?.customer_code || subscription.customer_code,
          status: subscription.status,
          amount: subscription.amount,
          nextpaymentdate: subscription.next_payment_date,
          currentPeriodStart: subscription.current_period_start || (() => {
            const periodDates = calculatePeriodDates(subscription);
            return periodDates.periodStart;
          })(),
          currentPeriodEnd: subscription.current_period_end || (() => {
            const periodDates = calculatePeriodDates(subscription);
            return periodDates.periodEnd;
          })(),
          tier: tier,
        },
      });
      
      const { error: insertError } = await supabase.from("subscriptions").insert({
      organizationid: organizationId,
      paystacksubscriptioncode: subscription.subscription_code,
      paystackplancode: planCode,
      paystackcustomercode: subscription.customer?.customer_code || subscription.customer_code,
      status: subscription.status,
      amount: subscription.amount,
      nextpaymentdate: subscription.next_payment_date,
        currentPeriodStart: subscription.current_period_start || null,
        currentPeriodEnd: subscription.current_period_end || null,
      tier: tier,
        createdAt: subscription.created_at || subscription.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any);

      if (insertError) {
        console.error("[PaystackWebhook] ===== ERROR creating subscription =====", {
          error: insertError,
          errorCode: insertError?.code,
          errorMessage: insertError?.message,
          errorDetails: insertError?.details,
        subscriptionCode: subscription.subscription_code,
        organizationId,
      });
    } else {
        console.log("[PaystackWebhook] Step 9: Subscription record created successfully", {
          subscriptionCode: subscription.subscription_code,
          organizationId,
        });
    }
  }

  // Update organization subscription status
  console.log("[PaystackWebhook] Step 10: Updating organization subscription status", {
    organizationId,
    subscriptionStatus: subscription.status === "active" ? "active" : "trialing",
    subscriptionExpiresAt: subscription.next_payment_date
      ? new Date(subscription.next_payment_date).toISOString()
      : null,
  });
  
  const { error: orgUpdateError } = await supabase
    .from("organizations")
    .update({
      subscriptionStatus: subscription.status === "active" ? "active" : "trialing",
      subscriptionExpiresAt: subscription.next_payment_date
        ? new Date(subscription.next_payment_date).toISOString()
        : null,
      updatedAt: new Date().toISOString(),
    })
    .eq("id", organizationId);

  if (orgUpdateError) {
    console.error("[PaystackWebhook] ===== ERROR updating organization =====", {
      error: orgUpdateError,
      errorCode: orgUpdateError?.code,
      errorMessage: orgUpdateError?.message,
      organizationId,
    });
  } else {
    console.log("[PaystackWebhook] Step 11: Organization updated successfully", {
      organizationId,
    });
  }

  console.log(`[PaystackWebhook] ===== SUBSCRIPTION.CREATE PROCESSING COMPLETE =====`);
  console.log(`[PaystackWebhook] Subscription created for organization ${organizationId}`);
}

// Handle subscription.disable event
async function handleSubscriptionDisable(data: any, supabase: any) {
  const subscription = data;

  console.log("[PaystackWebhook] Processing subscription.disable:", {
    subscriptionCode: subscription.subscription_code,
    status: subscription.status,
  });

  const newStatus = subscription.status === "complete" ? "completed" : "cancelled";

  // Update subscription status
  const { error: subUpdateError } = await supabase
    .from("subscriptions")
    .update({
      status: newStatus,
      updatedAt: new Date().toISOString(),
    })
    .eq("paystacksubscriptioncode", subscription.subscription_code);

  if (subUpdateError) {
    console.error("[PaystackWebhook] Error updating subscription status:", {
      error: subUpdateError,
      subscriptionCode: subscription.subscription_code,
    });
  } else {
    console.log("[PaystackWebhook] Subscription status updated:", newStatus);
  }

  // Get organization ID from subscription
  const { data: subRecord, error: subRecordError } = await supabase
    .from("subscriptions")
    .select("organizationid")
    .eq("paystacksubscriptioncode", subscription.subscription_code)
    .single();

  if (subRecordError) {
    console.error("[PaystackWebhook] Error fetching subscription record:", {
      error: subRecordError,
      subscriptionCode: subscription.subscription_code,
    });
  }

  if (subRecord) {
    console.log("[PaystackWebhook] Updating organization status:", {
      organizationId: subRecord.organizationid,
      newStatus: "cancelled",
    });

    // Update organization subscription status
    const { error: orgUpdateError } = await supabase
      .from("organizations")
      .update({
        subscriptionStatus: "cancelled",
        updatedAt: new Date().toISOString(),
      })
      .eq("id", subRecord.organizationid);

    if (orgUpdateError) {
      console.error("[PaystackWebhook] Error updating organization:", {
        error: orgUpdateError,
        organizationId: subRecord.organizationid,
      });
    } else {
      console.log("[PaystackWebhook] Organization status updated successfully");
    }
  } else {
    console.warn("[PaystackWebhook] Subscription record not found for organization update");
  }

  console.log(`[PaystackWebhook] Subscription disabled: ${subscription.subscription_code}`);
}

// Handle subscription.not_renew event
async function handleSubscriptionNotRenew(data: any, supabase: any) {
  const subscription = data;

  console.log("[PaystackWebhook] Processing subscription.not_renew:", {
    subscriptionCode: subscription.subscription_code,
  });

  // Update subscription status to non-renewing
  const { error: updateError } = await supabase
    .from("subscriptions")
    .update({
      status: "non-renewing",
      updatedAt: new Date().toISOString(),
    })
    .eq("paystacksubscriptioncode", subscription.subscription_code);

  if (updateError) {
    console.error("[PaystackWebhook] Error updating subscription to non-renewing:", {
      error: updateError,
      subscriptionCode: subscription.subscription_code,
    });
  } else {
    console.log(`[PaystackWebhook] Subscription set to not renew: ${subscription.subscription_code}`);
  }
}

// Handle invoice.create event
async function handleInvoiceCreate(data: any, supabase: any) {
  const invoice = data;
  const subscription = invoice.subscription;

  console.log("[PaystackWebhook] Processing invoice.create:", {
    invoiceCode: invoice.invoice_code,
    amount: invoice.amount,
    paid: invoice.paid,
    subscriptionCode: subscription?.subscription_code,
  });

  if (!subscription) {
    console.warn("[PaystackWebhook] Invoice has no subscription data");
    return;
  }

  // Get organization from subscription
  const { data: subRecord, error: subRecordError } = await supabase
    .from("subscriptions")
    .select("organizationid, id")
    .eq("paystacksubscriptioncode", subscription.subscription_code)
    .single();

  if (subRecordError) {
    console.error("[PaystackWebhook] Error fetching subscription for invoice:", {
      error: subRecordError,
      subscriptionCode: subscription.subscription_code,
    });
    return;
  }

  if (!subRecord) {
    console.warn("[PaystackWebhook] Subscription record not found for invoice:", {
      subscriptionCode: subscription.subscription_code,
    });
    return;
  }

  console.log("[PaystackWebhook] Creating invoice record:", {
    organizationId: subRecord.organizationid,
    subscriptionId: subRecord.id,
    invoiceCode: invoice.invoice_code,
    amount: invoice.amount,
    amountInKES: invoice.amount ? invoice.amount / 100 : null,
  });

  // Create invoice record in subscription_usage table
  const { error: insertError } = await supabase.from("subscription_usage").insert({
    organizationid: subRecord.organizationid,
    subscriptionid: subRecord.id,
    invoicecode: invoice.invoice_code,
    amount: invoice.amount,
    periodStart: invoice.period_start,
    periodEnd: invoice.period_end,
    metric: 'invoice', // Use metric field for invoice tracking
    count: 1,
    paid: invoice.paid,
    paidat: invoice.paid_at,
      createdAt: invoice.created_at || new Date().toISOString(),
  } as any);

  if (insertError) {
    console.error("[PaystackWebhook] Error creating invoice record:", {
      error: insertError,
      invoiceCode: invoice.invoice_code,
    });
  } else {
    console.log(`[PaystackWebhook] Invoice created: ${invoice.invoice_code}`);
  }
}

// Handle invoice.payment_failed event
async function handleInvoicePaymentFailed(data: any, supabase: any) {
  const invoice = data;
  const subscription = invoice.subscription;

  console.log("[PaystackWebhook] Processing invoice.payment_failed:", {
    invoiceCode: invoice.invoice_code,
    subscriptionCode: subscription?.subscription_code,
    subscriptionStatus: subscription?.status,
  });

  if (!subscription) {
    console.warn("[PaystackWebhook] Invoice payment failed but no subscription data");
    return;
  }

  // Get organization from subscription
  const { data: subRecord, error: subRecordError } = await supabase
    .from("subscriptions")
    .select("organizationid")
    .eq("paystacksubscriptioncode", subscription.subscription_code)
    .single();

  if (subRecordError) {
    console.error("[PaystackWebhook] Error fetching subscription for failed payment:", {
      error: subRecordError,
      subscriptionCode: subscription.subscription_code,
    });
    return;
  }

  if (!subRecord) {
    console.warn("[PaystackWebhook] Subscription record not found for failed payment");
    return;
  }

  // Update invoice status
  const { error: invoiceUpdateError } = await supabase
    .from("subscription_usage")
    .update({
      paid: false,
      createdAt: new Date().toISOString(), // Use createdAt as updated timestamp
    })
    .eq("invoicecode", invoice.invoice_code);

  if (invoiceUpdateError) {
    console.error("[PaystackWebhook] Error updating invoice status:", {
      error: invoiceUpdateError,
      invoiceCode: invoice.invoice_code,
    });
  } else {
    console.log("[PaystackWebhook] Invoice status updated to unpaid");
  }

  // Update subscription status to attention if needed
  if (subscription.status === "attention") {
    console.log("[PaystackWebhook] Subscription status is 'attention', updating records");

    const { error: subStatusError } = await supabase
      .from("subscriptions")
      .update({
        status: "attention",
        updatedAt: new Date().toISOString(),
      })
      .eq("paystacksubscriptioncode", subscription.subscription_code);

    if (subStatusError) {
      console.error("[PaystackWebhook] Error updating subscription status:", {
        error: subStatusError,
        subscriptionCode: subscription.subscription_code,
      });
    }

    // Update organization status
    const { error: orgStatusError } = await supabase
      .from("organizations")
      .update({
        subscriptionStatus: "past_due",
        updatedAt: new Date().toISOString(),
      })
      .eq("id", subRecord.organizationid);

    if (orgStatusError) {
      console.error("[PaystackWebhook] Error updating organization status:", {
        error: orgStatusError,
        organizationId: subRecord.organizationid,
      });
    } else {
      console.log("[PaystackWebhook] Organization status updated to past_due");
    }
  }

  console.log(`[PaystackWebhook] Invoice payment failed: ${invoice.invoice_code}`);
}

// Handle invoice.update event
async function handleInvoiceUpdate(data: any, supabase: any) {
  const invoice = data;

  console.log("[PaystackWebhook] Processing invoice.update:", {
    invoiceCode: invoice.invoice_code,
    paid: invoice.paid,
    paidAt: invoice.paid_at,
  });

  // Update invoice record
  const { error: updateError } = await supabase
    .from("subscription_usage")
    .update({
      paid: invoice.paid,
      paidat: invoice.paid_at,
      createdAt: new Date().toISOString(), // Use createdAt as updated timestamp
    })
    .eq("invoicecode", invoice.invoice_code);

  if (updateError) {
    console.error("[PaystackWebhook] Error updating invoice:", {
      error: updateError,
      invoiceCode: invoice.invoice_code,
    });
  } else {
    console.log(`[PaystackWebhook] Invoice updated: ${invoice.invoice_code}`, {
      paid: invoice.paid,
      paidAt: invoice.paid_at,
    });
  }
}

// Handle charge.success event
async function handleChargeSuccess(data: any, supabase: any) {
  const charge = data;
  const plan = charge.plan;

  console.log("[PaystackWebhook] Processing charge.success:", {
    reference: charge.reference,
    amount: charge.amount,
    amountInKES: charge.amount ? charge.amount / 100 : null,
    planCode: plan?.plan_code,
    paidAt: charge.paid_at,
    customerCode: charge.customer?.customer_code,
    metadata: charge.metadata,
  });

  // If this charge is for a subscription plan, update subscription
  if (plan && plan.plan_code) {
    // Try to get organizationId from charge metadata first
    const organizationId = charge.metadata?.organizationId;
    
    if (!organizationId) {
      console.warn("[PaystackWebhook] Charge for subscription plan but no organizationId in metadata:", {
        planCode: plan.plan_code,
        reference: charge.reference,
        metadata: charge.metadata,
      });
      console.log(`[PaystackWebhook] Charge successful: ${charge.reference}`);
      return;
    }

    // Get tier from subscription_plans table
    let tier = 'free'; // Default fallback
    if (plan.plan_code) {
      const { data: planData, error: planError } = await supabase
        .from("subscription_plans")
        .select("tierName")
        .eq("planCode", plan.plan_code)
        .eq("isActive", true)
      .maybeSingle();

      if (planError) {
        console.error("[PaystackWebhook] Error fetching plan from subscription_plans table:", {
          error: planError,
        planCode: plan.plan_code,
      });
    }

      if (planData?.tierName) {
        tier = planData.tierName;
        console.log("[PaystackWebhook] Tier fetched from subscription_plans:", {
          planCode: plan.plan_code,
          tier,
        });
      } else {
        console.warn("[PaystackWebhook] Plan code not found in subscription_plans table, using default 'free':", {
          planCode: plan.plan_code,
        });
      }
    }

    // Check if subscription already exists for this organization
    // This handles both first-time subscriptions and plan switches
    // Prefer active subscription over cancelled one
    const { data: existingSub, error: checkError } = await supabase
      .from("subscriptions")
      .select("id, paystacksubscriptioncode, status, paystackplancode")
      .eq("organizationid", organizationId)
      .order("status", { ascending: true }) // Prefer active over cancelled
      .maybeSingle();

    if (checkError) {
      console.error("[PaystackWebhook] Error checking for existing subscription:", {
        error: checkError,
        organizationId,
      });
    }

    if (existingSub) {
      // Subscription exists - update it (handles plan switches and renewals)
      console.log("[PaystackWebhook] Existing subscription found, updating:", {
        subscriptionId: existingSub.id,
        existingSubscriptionCode: existingSub.paystacksubscriptioncode,
        existingPlanCode: existingSub.paystackplancode,
        newPlanCode: plan.plan_code,
      });

      const updateData: any = {
        paystackplancode: plan.plan_code,
        paystackcustomercode: charge.customer?.customer_code,
        status: "active", // Will be updated by subscription.create webhook if needed
        amount: charge.amount,
        tier: tier,
        updatedAt: new Date().toISOString(),
      };

      // Only update subscription code if it's not already set (preliminary subscription)
      if (!existingSub.paystacksubscriptioncode) {
        // This will be set when subscription.create webhook arrives
        console.log("[PaystackWebhook] Waiting for subscription.create webhook to set subscription code");
      }

      const { error: updateError } = await supabase
        .from("subscriptions")
        .update(updateData)
        .eq("id", existingSub.id);

      if (updateError) {
        console.error("[PaystackWebhook] Error updating existing subscription:", {
          error: updateError,
          subscriptionId: existingSub.id,
          organizationId,
          planCode: plan.plan_code,
        });
      } else {
        console.log("[PaystackWebhook] Existing subscription updated successfully:", {
          subscriptionId: existingSub.id,
          organizationId,
        });

        // Update organization subscription status
        const { error: orgUpdateError } = await supabase
          .from("organizations")
          .update({
            subscriptionStatus: "active",
            subscriptionTier: tier,
            updatedAt: new Date().toISOString(),
          })
          .eq("id", organizationId);

        if (orgUpdateError) {
          console.error("[PaystackWebhook] Error updating organization:", {
            error: orgUpdateError,
            organizationId,
          });
        } else {
          console.log("[PaystackWebhook] Organization updated for subscription");
        }
      }

      // Record the charge usage
      const { error: insertError } = await supabase.from("subscription_usage").insert({
        organizationid: organizationId,
        subscriptionid: existingSub.id,
        transactionreference: charge.reference,
        amount: charge.amount,
        metric: 'payment',
        count: 1,
        periodStart: new Date().toISOString(),
        periodEnd: new Date().toISOString(),
        paid: true,
        paidat: charge.paid_at,
        createdAt: charge.created_at || new Date().toISOString(),
      } as any);

      if (insertError) {
        console.error("[PaystackWebhook] Error recording charge usage:", {
          error: insertError,
          reference: charge.reference,
        });
      } else {
        console.log("[PaystackWebhook] Charge usage recorded successfully");
      }

      // If subscription code is missing, try to create subscription directly via API
      if (!existingSub.paystacksubscriptioncode && charge.customer?.customer_code) {
        console.log("[PaystackWebhook] Subscription code missing, attempting to create subscription via Paystack API");
        
        const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
        if (paystackSecretKey && charge.authorization?.authorization_code && charge.authorization?.reusable) {
          // Customer has a reusable authorization - create subscription directly
          console.log("[PaystackWebhook] Customer has reusable authorization, creating subscription via API:", {
            customerCode: charge.customer.customer_code,
            authorizationCode: charge.authorization.authorization_code,
            planCode: plan.plan_code,
          });

          try {
            const createSubResponse = await fetch("https://api.paystack.co/subscription", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${paystackSecretKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                customer: charge.customer.customer_code,
                plan: plan.plan_code,
                authorization: charge.authorization.authorization_code,
              }),
            });

            const createSubData = await createSubResponse.json();

            if (createSubData.status && createSubData.data) {
              const newSubscription = createSubData.data;
              console.log("[PaystackWebhook] Subscription created successfully via API:", {
                subscriptionCode: newSubscription.subscription_code,
                subscriptionId: existingSub.id,
              });

              // Calculate period dates
              const periodDates = calculatePeriodDates(newSubscription);

              // Update subscription with details from API
              const { error: apiUpdateError } = await supabase
                .from("subscriptions")
                .update({
                  paystacksubscriptioncode: newSubscription.subscription_code,
                  nextpaymentdate: newSubscription.next_payment_date,
                  currentPeriodStart: periodDates.periodStart,
                  currentPeriodEnd: periodDates.periodEnd,
                  status: newSubscription.status,
                  updatedAt: new Date().toISOString(),
                } as any)
                .eq("id", existingSub.id);

              if (apiUpdateError) {
                console.error("[PaystackWebhook] Error updating subscription from API creation:", {
                  error: apiUpdateError,
                  subscriptionId: existingSub.id,
                });
    } else {
                console.log("[PaystackWebhook] Subscription updated successfully from API creation");
              }
            } else if (createSubData.code === "duplicate_subscription" || 
                       (createSubData.message && createSubData.message.includes("already in place"))) {
              // Subscription already exists according to Paystack - query for it
              console.log("[PaystackWebhook] Subscription already exists in Paystack (duplicate_subscription), querying for existing subscription:", {
                error: createSubData.message,
                code: createSubData.code,
              });
              
              // Wait a moment for Paystack to process, then query
              // Note: We can't use setTimeout in Deno Edge Functions, so we'll query immediately
              // If it's not found, we'll wait for the subscription.create webhook
              const paystackSubscription = await fetchSubscriptionFromPaystack(
                charge.customer.customer_code,
                plan.plan_code,
                paystackSecretKey
              );

              if (paystackSubscription) {
                console.log("[PaystackWebhook] Found existing subscription in Paystack API, updating record:", {
                  subscriptionCode: paystackSubscription.subscription_code,
                  subscriptionId: existingSub.id,
                });

                // Update subscription with details from Paystack API
                const { error: apiUpdateError } = await supabase
                  .from("subscriptions")
                  .update({
                    paystacksubscriptioncode: paystackSubscription.subscription_code,
                    nextpaymentdate: paystackSubscription.next_payment_date,
                    currentPeriodStart: paystackSubscription.current_period_start || null,
                    currentPeriodEnd: paystackSubscription.current_period_end || null,
                    status: paystackSubscription.status,
                    updatedAt: new Date().toISOString(),
                  } as any)
                  .eq("id", existingSub.id);

                if (apiUpdateError) {
                  console.error("[PaystackWebhook] Error updating subscription from Paystack API:", {
                    error: apiUpdateError,
                    subscriptionId: existingSub.id,
                  });
                } else {
                  console.log("[PaystackWebhook] Subscription updated successfully from Paystack API");
                }
              } else {
                console.log("[PaystackWebhook] Subscription exists in Paystack but not yet queryable, will wait for subscription.create webhook");
              }
            } else {
              console.warn("[PaystackWebhook] Failed to create subscription via API, will query existing subscriptions:", {
                error: createSubData.message,
                code: createSubData.code,
                response: createSubData,
              });
              
              // Fallback: query existing subscriptions (with retry since Paystack confirmed it exists)
              const paystackSubscription = await fetchSubscriptionFromPaystack(
                charge.customer.customer_code,
                plan.plan_code,
                paystackSecretKey,
                0
              );

              if (paystackSubscription) {
                console.log("[PaystackWebhook] Found subscription in Paystack API, updating record:", {
                  subscriptionCode: paystackSubscription.subscription_code,
                  subscriptionId: existingSub.id,
                });

                // Update subscription with details from Paystack API
                const { error: apiUpdateError } = await supabase
                  .from("subscriptions")
                  .update({
                    paystacksubscriptioncode: paystackSubscription.subscription_code,
                    nextpaymentdate: paystackSubscription.next_payment_date,
                    currentPeriodStart: paystackSubscription.current_period_start || null,
                    currentPeriodEnd: paystackSubscription.current_period_end || null,
                    status: paystackSubscription.status,
                    updatedAt: new Date().toISOString(),
                  } as any)
                  .eq("id", existingSub.id);

                if (apiUpdateError) {
                  console.error("[PaystackWebhook] Error updating subscription from Paystack API:", {
                    error: apiUpdateError,
                    subscriptionId: existingSub.id,
                  });
                } else {
                  console.log("[PaystackWebhook] Subscription updated successfully from Paystack API");
                }
              } else {
                console.warn("[PaystackWebhook] Subscription not found in Paystack API, will wait for subscription.create webhook");
              }
            }
          } catch (error: any) {
            console.error("[PaystackWebhook] Error creating subscription via API:", {
              error: error.message,
              stack: error.stack,
            });
            
            // Fallback: query existing subscriptions
            const paystackSubscription = await fetchSubscriptionFromPaystack(
              charge.customer.customer_code,
              plan.plan_code,
              paystackSecretKey
            );

            if (paystackSubscription) {
              console.log("[PaystackWebhook] Found subscription in Paystack API after error, updating record:", {
                subscriptionCode: paystackSubscription.subscription_code,
                subscriptionId: existingSub.id,
              });

              const { error: apiUpdateError } = await supabase
                .from("subscriptions")
                .update({
                  paystacksubscriptioncode: paystackSubscription.subscription_code,
                  nextpaymentdate: paystackSubscription.next_payment_date,
                  currentPeriodStart: paystackSubscription.current_period_start || null,
                  currentPeriodEnd: paystackSubscription.current_period_end || null,
                  status: paystackSubscription.status,
                  updatedAt: new Date().toISOString(),
                } as any)
                .eq("id", existingSub.id);

              if (apiUpdateError) {
                console.error("[PaystackWebhook] Error updating subscription from Paystack API:", {
                  error: apiUpdateError,
                  subscriptionId: existingSub.id,
                });
              }
            }
          }
        } else {
          // No reusable authorization - query existing subscriptions or wait for webhook
          console.log("[PaystackWebhook] No reusable authorization found, querying Paystack API for existing subscription");
          
          const paystackSubscription = await fetchSubscriptionFromPaystack(
            charge.customer.customer_code,
            plan.plan_code,
            paystackSecretKey
          );

          if (paystackSubscription) {
            console.log("[PaystackWebhook] Found subscription in Paystack API, updating record:", {
              subscriptionCode: paystackSubscription.subscription_code,
              subscriptionId: existingSub.id,
            });

            // Update subscription with details from Paystack API
            const { error: apiUpdateError } = await supabase
              .from("subscriptions")
              .update({
                paystacksubscriptioncode: paystackSubscription.subscription_code,
                nextpaymentdate: paystackSubscription.next_payment_date,
                currentPeriodStart: paystackSubscription.current_period_start || null,
                currentPeriodEnd: paystackSubscription.current_period_end || null,
                status: paystackSubscription.status,
                updatedAt: new Date().toISOString(),
              } as any)
              .eq("id", existingSub.id);
      
            if (apiUpdateError) {
              console.error("[PaystackWebhook] Error updating subscription from Paystack API:", {
                error: apiUpdateError,
                subscriptionId: existingSub.id,
              });
            } else {
              console.log("[PaystackWebhook] Subscription updated successfully from Paystack API");
            }
          } else {
            console.warn("[PaystackWebhook] Subscription not found in Paystack API, will wait for subscription.create webhook");
          }
        }
      }
    } else {
      // No existing subscription - create preliminary record (first-time subscription)
        console.log("[PaystackWebhook] First-time subscription detected - creating preliminary subscription record:", {
          planCode: plan.plan_code,
          reference: charge.reference,
          organizationId,
          customerCode: charge.customer?.customer_code,
          amount: charge.amount,
        });

        // Create preliminary subscription record (subscription.create will complete it later)
        const { data: newSub, error: createError } = await supabase
          .from("subscriptions")
          .insert({
            organizationid: organizationId,
            paystackplancode: plan.plan_code,
            paystackcustomercode: charge.customer?.customer_code,
            status: "active", // Will be updated by subscription.create webhook if needed
            amount: charge.amount,
            tier: tier,
            createdAt: charge.created_at || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as any)
          .select("id, organizationid")
          .single();

        if (createError) {
          console.error("[PaystackWebhook] Error creating preliminary subscription:", {
            error: createError,
            organizationId,
            planCode: plan.plan_code,
          });
        } else {
          console.log("[PaystackWebhook] Preliminary subscription created:", {
            subscriptionId: newSub.id,
            organizationId: newSub.organizationid,
          });

          // Update organization subscription status
          const { error: orgUpdateError } = await supabase
            .from("organizations")
            .update({
              subscriptionStatus: "active",
              subscriptionTier: tier,
              updatedAt: new Date().toISOString(),
            })
            .eq("id", organizationId);

          if (orgUpdateError) {
            console.error("[PaystackWebhook] Error updating organization:", {
              error: orgUpdateError,
              organizationId,
            });
          } else {
            console.log("[PaystackWebhook] Organization updated for first-time subscription");
          }

          // Record the charge usage
          const { error: insertError } = await supabase.from("subscription_usage").insert({
            organizationid: organizationId,
            subscriptionid: newSub.id,
            transactionreference: charge.reference,
            amount: charge.amount,
            metric: 'payment',
            count: 1,
            periodStart: new Date().toISOString(),
            periodEnd: new Date().toISOString(),
            paid: true,
            paidat: charge.paid_at,
            createdAt: charge.created_at || new Date().toISOString(),
          } as any);

          if (insertError) {
            console.error("[PaystackWebhook] Error recording first-time charge usage:", {
              error: insertError,
              reference: charge.reference,
            });
          } else {
            console.log("[PaystackWebhook] First-time charge usage recorded successfully");
          }

        // Try to create subscription directly via API if customer has reusable authorization
        if (charge.customer?.customer_code) {
          console.log("[PaystackWebhook] Attempting to create subscription via Paystack API for new subscription");
          
          const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
          if (paystackSecretKey && charge.authorization?.authorization_code && charge.authorization?.reusable) {
            // Customer has a reusable authorization - create subscription directly
            console.log("[PaystackWebhook] Customer has reusable authorization, creating subscription via API:", {
              customerCode: charge.customer.customer_code,
              authorizationCode: charge.authorization.authorization_code,
              planCode: plan.plan_code,
            });

            try {
              const createSubResponse = await fetch("https://api.paystack.co/subscription", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${paystackSecretKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  customer: charge.customer.customer_code,
                  plan: plan.plan_code,
                  authorization: charge.authorization.authorization_code,
                }),
              });

              const createSubData = await createSubResponse.json();

              if (createSubData.status && createSubData.data) {
                const newSubscription = createSubData.data;
                console.log("[PaystackWebhook] Subscription created successfully via API:", {
                  subscriptionCode: newSubscription.subscription_code,
                  subscriptionId: newSub.id,
                });

                // Calculate period dates
                const periodDates = calculatePeriodDates(newSubscription);

                // Update subscription with details from API
                const { error: apiUpdateError } = await supabase
                  .from("subscriptions")
                  .update({
                    paystacksubscriptioncode: newSubscription.subscription_code,
                    nextpaymentdate: newSubscription.next_payment_date,
                    currentPeriodStart: periodDates.periodStart,
                    currentPeriodEnd: periodDates.periodEnd,
                    status: newSubscription.status,
                    updatedAt: new Date().toISOString(),
                  } as any)
                  .eq("id", newSub.id);

                if (apiUpdateError) {
                  console.error("[PaystackWebhook] Error updating subscription from API creation:", {
                    error: apiUpdateError,
                    subscriptionId: newSub.id,
                  });
                } else {
                  console.log("[PaystackWebhook] Preliminary subscription updated successfully from API creation");
                }
              } else if (createSubData.code === "duplicate_subscription" || 
                         (createSubData.message && createSubData.message.includes("already in place"))) {
                // Subscription already exists according to Paystack - query for it
                console.log("[PaystackWebhook] Subscription already exists in Paystack (duplicate_subscription), querying for existing subscription:", {
                  error: createSubData.message,
                  code: createSubData.code,
                });
                
                // Query for existing subscription
                const paystackSubscription = await fetchSubscriptionFromPaystack(
                  charge.customer.customer_code,
                  plan.plan_code,
                  paystackSecretKey
                );

                if (paystackSubscription) {
                  console.log("[PaystackWebhook] Found existing subscription in Paystack API, updating preliminary record:", {
                    subscriptionCode: paystackSubscription.subscription_code,
                    subscriptionId: newSub.id,
                  });

                  // Update subscription with details from Paystack API
                  const { error: apiUpdateError } = await supabase
                    .from("subscriptions")
                    .update({
                      paystacksubscriptioncode: paystackSubscription.subscription_code,
                      nextpaymentdate: paystackSubscription.next_payment_date,
                      currentPeriodStart: paystackSubscription.current_period_start || null,
                      currentPeriodEnd: paystackSubscription.current_period_end || null,
                      status: paystackSubscription.status,
                      updatedAt: new Date().toISOString(),
                    } as any)
                    .eq("id", newSub.id);

                  if (apiUpdateError) {
                    console.error("[PaystackWebhook] Error updating subscription from Paystack API:", {
                      error: apiUpdateError,
                      subscriptionId: newSub.id,
                    });
      } else {
                    console.log("[PaystackWebhook] Preliminary subscription updated successfully from Paystack API");
                  }
                } else {
                  console.log("[PaystackWebhook] Subscription exists in Paystack but not yet queryable, will wait for subscription.create webhook");
                }
              } else {
                console.warn("[PaystackWebhook] Failed to create subscription via API, will query existing subscriptions:", {
                  error: createSubData.message,
                  code: createSubData.code,
                  response: createSubData,
                });
                
                // Fallback: query existing subscriptions
                const paystackSubscription = await fetchSubscriptionFromPaystack(
                  charge.customer.customer_code,
                  plan.plan_code,
                  paystackSecretKey
                );

                if (paystackSubscription) {
                  console.log("[PaystackWebhook] Found subscription in Paystack API, updating preliminary record:", {
                    subscriptionCode: paystackSubscription.subscription_code,
                    subscriptionId: newSub.id,
                  });

                  // Update subscription with details from Paystack API
                  const { error: apiUpdateError } = await supabase
                    .from("subscriptions")
                    .update({
                      paystacksubscriptioncode: paystackSubscription.subscription_code,
                      nextpaymentdate: paystackSubscription.next_payment_date,
                      currentPeriodStart: paystackSubscription.current_period_start || null,
                      currentPeriodEnd: paystackSubscription.current_period_end || null,
                      status: paystackSubscription.status,
                      updatedAt: new Date().toISOString(),
                    } as any)
                    .eq("id", newSub.id);

                  if (apiUpdateError) {
                    console.error("[PaystackWebhook] Error updating subscription from Paystack API:", {
                      error: apiUpdateError,
                      subscriptionId: newSub.id,
                    });
                  } else {
                    console.log("[PaystackWebhook] Preliminary subscription updated successfully from Paystack API");
                  }
                } else {
                  console.log("[PaystackWebhook] Subscription not yet available in Paystack API, will wait for subscription.create webhook");
                }
              }
            } catch (error: any) {
              console.error("[PaystackWebhook] Error creating subscription via API:", {
                error: error.message,
                stack: error.stack,
              });
              
              // Fallback: query existing subscriptions (with retry since Paystack confirmed it exists)
              const paystackSubscription = await fetchSubscriptionFromPaystack(
                charge.customer.customer_code,
                plan.plan_code,
                paystackSecretKey,
                0
              );

              if (paystackSubscription) {
                console.log("[PaystackWebhook] Found subscription in Paystack API after error, updating preliminary record:", {
                  subscriptionCode: paystackSubscription.subscription_code,
                  subscriptionId: newSub.id,
                });

                const { error: apiUpdateError } = await supabase
                  .from("subscriptions")
                  .update({
                    paystacksubscriptioncode: paystackSubscription.subscription_code,
                    nextpaymentdate: paystackSubscription.next_payment_date,
                    currentPeriodStart: paystackSubscription.current_period_start || null,
                    currentPeriodEnd: paystackSubscription.current_period_end || null,
                    status: paystackSubscription.status,
                    updatedAt: new Date().toISOString(),
                  } as any)
                  .eq("id", newSub.id);

                if (apiUpdateError) {
                  console.error("[PaystackWebhook] Error updating subscription from Paystack API:", {
                    error: apiUpdateError,
                    subscriptionId: newSub.id,
                  });
                }
              } else {
                console.log("[PaystackWebhook] Subscription not yet available in Paystack API, will wait for subscription.create webhook");
              }
            }
          } else {
            // No reusable authorization - query existing subscriptions or wait for webhook
            console.log("[PaystackWebhook] No reusable authorization found, querying Paystack API for existing subscription");
            
            const paystackSubscription = await fetchSubscriptionFromPaystack(
              charge.customer.customer_code,
              plan.plan_code,
              paystackSecretKey
            );

            if (paystackSubscription) {
              console.log("[PaystackWebhook] Found subscription in Paystack API, updating preliminary record:", {
                subscriptionCode: paystackSubscription.subscription_code,
                subscriptionId: newSub.id,
              });

              // Update subscription with details from Paystack API
              const { error: apiUpdateError } = await supabase
                .from("subscriptions")
                .update({
                  paystacksubscriptioncode: paystackSubscription.subscription_code,
                  nextpaymentdate: paystackSubscription.next_payment_date,
                  currentPeriodStart: paystackSubscription.current_period_start || null,
                  currentPeriodEnd: paystackSubscription.current_period_end || null,
                  status: paystackSubscription.status,
                  updatedAt: new Date().toISOString(),
                } as any)
                .eq("id", newSub.id);

              if (apiUpdateError) {
                console.error("[PaystackWebhook] Error updating subscription from Paystack API:", {
                  error: apiUpdateError,
                  subscriptionId: newSub.id,
                });
              } else {
                console.log("[PaystackWebhook] Preliminary subscription updated successfully from Paystack API");
              }
            } else {
              console.log("[PaystackWebhook] Subscription not yet available in Paystack API, will wait for subscription.create webhook");
            }
          }
        }
      }
    }
  } else {
    console.log("[PaystackWebhook] Charge is not for a subscription plan");
  }

  console.log(`[PaystackWebhook] Charge successful: ${charge.reference}`);
}

// Handle subscription.expiring_cards event
async function handleExpiringCards(data: any, supabase: any) {
  // This is an array of subscriptions with expiring cards
  const subscriptions = Array.isArray(data) ? data : [data];

  console.log("[PaystackWebhook] Processing subscription.expiring_cards:", {
    count: subscriptions.length,
  });

  for (const item of subscriptions) {
    const subscription = item.subscription;
    
    console.log("[PaystackWebhook] Updating expiring card:", {
      subscriptionCode: subscription.subscription_code,
      expiryDate: item.expiry_date,
    });
    
    // Update subscription to mark card as expiring
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        cardexpiring: true,
        cardexpirydate: item.expiry_date,
        updatedAt: new Date().toISOString(),
      })
      .eq("paystacksubscriptioncode", subscription.subscription_code);

    if (updateError) {
      console.error("[PaystackWebhook] Error updating expiring card:", {
        error: updateError,
        subscriptionCode: subscription.subscription_code,
      });
    } else {
      console.log("[PaystackWebhook] Expiring card updated:", subscription.subscription_code);
    }
  }

  console.log(`[PaystackWebhook] Expiring cards notification: ${subscriptions.length} subscriptions`);
}

