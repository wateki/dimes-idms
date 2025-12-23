// Supabase Edge Function for Paystack Billing
// Handles subscription plan creation, subscription management, and payment initialization

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreatePlanRequest {
  name: string;
  interval: "hourly" | "daily" | "weekly" | "monthly" | "quarterly" | "biannually" | "annually";
  amount: number; // Amount in cents (smallest currency unit for KES)
  description?: string;
  invoice_limit?: number;
}

interface CreateSubscriptionRequest {
  organizationId: string;
  planCode: string;
  email: string;
  authorizationCode?: string; // Optional: if customer has existing authorization
  startDate?: string; // Optional: ISO date string for first charge
}

interface InitializeSubscriptionRequest {
  organizationId: string;
  planCode: string;
  email: string;
  amount?: number; // Override amount if needed
  metadata?: Record<string, any>;
}

interface UpdateSubscriptionRequest {
  subscriptionCode: string;
  planCode?: string;
  authorizationCode?: string;
  immediate?: boolean; // If true, switch immediately. If false (default), switch at next billing cycle
}

interface CancelSubscriptionRequest {
  subscriptionCode: string;
  token?: string; // Email token for cancellation
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is authenticated
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Paystack secret key
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      return new Response(
        JSON.stringify({ error: "Paystack secret key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action } = body;

    // Route to appropriate handler
    switch (action) {
      case "create_plan":
        return await handleCreatePlan(body, paystackSecretKey, supabase, user.id);
      
      case "create_subscription":
        return await handleCreateSubscription(body, paystackSecretKey, supabase, user.id);
      
      case "initialize_subscription":
        return await handleInitializeSubscription(body, paystackSecretKey, supabase, user.id);
      
      case "update_subscription":
        return await handleUpdateSubscription(body, paystackSecretKey, supabase, user.id);
      
      case "cancel_subscription":
        return await handleCancelSubscription(body, paystackSecretKey, supabase, user.id);
      
      case "get_subscription":
        return await handleGetSubscription(body, paystackSecretKey, supabase, user.id);
      
      case "get_subscription_link":
        return await handleGetSubscriptionLink(body, paystackSecretKey, supabase, user.id);
      
      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error: any) {
    console.error("Error in paystack-billing function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Create a Paystack plan
async function handleCreatePlan(
  body: CreatePlanRequest,
  paystackSecretKey: string,
  supabase: any,
  userId: string
) {
  const { name, interval, amount, description, invoice_limit } = body;

  const response = await fetch("https://api.paystack.co/plan", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${paystackSecretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      interval,
      amount,
      currency: "KES",
      description,
      invoice_limit,
    }),
  });

  const data = await response.json();

  if (!data.status) {
    return new Response(
      JSON.stringify({ error: data.message || "Failed to create plan" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, data: data.data }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Create a subscription (requires existing customer authorization)
async function handleCreateSubscription(
  body: CreateSubscriptionRequest,
  paystackSecretKey: string,
  supabase: any,
  userId: string
) {
  const { organizationId, planCode, email, authorizationCode, startDate } = body;

  // Verify organization ownership
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("id", organizationId)
    .single();

  if (orgError || !org) {
    return new Response(
      JSON.stringify({ error: "Organization not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get or create Paystack customer
  const customerCode = await getOrCreatePaystackCustomer(email, paystackSecretKey);

  const subscriptionData: any = {
    customer: customerCode,
    plan: planCode,
  };

  if (authorizationCode) {
    subscriptionData.authorization = authorizationCode;
  }

  if (startDate) {
    subscriptionData.start_date = startDate;
  }

  const response = await fetch("https://api.paystack.co/subscription", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${paystackSecretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(subscriptionData),
  });

  const data = await response.json();

  if (!data.status) {
    return new Response(
      JSON.stringify({ error: data.message || "Failed to create subscription" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Store subscription in database
  // Note: Column names are lowercase due to PostgreSQL unquoted identifier behavior
  await supabase.from("subscriptions").upsert({
    organizationid: organizationId,
    paystacksubscriptioncode: data.data.subscription_code,
    paystackplancode: planCode,
    paystackcustomercode: data.data.customer?.customer_code || data.data.customer_code,
    status: data.data.status,
    amount: data.data.amount,
    nextpaymentdate: data.data.next_payment_date,
    tier: planCode.includes('FREE') ? 'free' : planCode.includes('BASIC') ? 'basic' : planCode.includes('PRO') ? 'pro' : 'enterprise',
    createdat: new Date().toISOString(),
    updatedat: new Date().toISOString(),
  } as any);

  return new Response(
    JSON.stringify({ success: true, data: data.data }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Initialize subscription payment (creates transaction with plan)
async function handleInitializeSubscription(
  body: InitializeSubscriptionRequest,
  paystackSecretKey: string,
  supabase: any,
  userId: string
) {
  const { organizationId, planCode, email, amount, metadata } = body;

  console.log("[PaystackBilling] Initializing subscription:", {
    organizationId,
    planCode,
    planCodeType: typeof planCode,
    planCodeLength: planCode?.length,
    planCodeExact: JSON.stringify(planCode), // Log exact value to catch any encoding issues
    email,
    amount,
    hasMetadata: !!metadata,
  });

  // Verify organization ownership
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("id", organizationId)
    .single();

  if (orgError || !org) {
    console.error("[PaystackBilling] Organization not found:", {
      organizationId,
      error: orgError,
    });
    return new Response(
      JSON.stringify({ error: "Organization not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Build transaction data
  // Paystack requires amount to be specified even when using a plan code
  // Amount should be in cents (smallest currency unit for KES)
  if (!amount || amount < 0) {
    console.error("[PaystackBilling] Amount is required:", {
      amount,
      planCode,
    });
    return new Response(
      JSON.stringify({ error: "Amount is required for subscription initialization" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const transactionData: any = {
    email,
    plan: planCode,
    amount: amount, // Amount in cents (required by Paystack)
    currency: "KES",
    metadata: {
      organizationId,
      ...metadata,
    },
  };

  console.log("[PaystackBilling] Transaction data:", {
    email,
    plan: planCode,
    amount,
    amountInKES: amount / 100, // Convert cents to KES for logging
    currency: transactionData.currency,
  });

  console.log("[PaystackBilling] Paystack request data:", {
    email,
    plan: planCode,
    planExact: JSON.stringify(transactionData.plan), // Log exact plan value being sent
    currency: transactionData.currency,
    hasAmount: !!transactionData.amount,
    amount: transactionData.amount,
    fullRequestBody: JSON.stringify(transactionData), // Log full request for debugging
  });

  try {
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(transactionData),
    });

    const data = await response.json();

    if (!data.status) {
      console.error("[PaystackBilling] Paystack API error:", {
        status: data.status,
        message: data.message,
        planCode,
        planCodeLength: planCode?.length,
        planCodeReceived: planCode, // Log exactly what we received
        email,
        organizationId,
        paystackResponse: data, // Log full Paystack response for debugging
      });
      return new Response(
        JSON.stringify({ 
          error: data.message || "Failed to initialize subscription",
          planCode: planCode, // Include plan code in error response for debugging
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[PaystackBilling] Subscription initialized successfully:", {
      authorization_url: data.data?.authorization_url,
      access_code: data.data?.access_code,
      reference: data.data?.reference,
      planCode,
    });

    return new Response(
      JSON.stringify({ success: true, data: data.data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[PaystackBilling] Network or parsing error:", {
      error: error.message,
      stack: error.stack,
      planCode,
      email,
      organizationId,
    });
    return new Response(
      JSON.stringify({ error: error.message || "Failed to initialize subscription" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

// Switch subscription plan (create new subscription + disable old)
// Note: Paystack doesn't have a direct PUT endpoint to update subscriptions
// The correct approach is to create a new subscription with the new plan and disable the old one
async function handleUpdateSubscription(
  body: UpdateSubscriptionRequest,
  paystackSecretKey: string,
  supabase: any,
  userId: string
) {
  const { subscriptionCode, planCode, authorizationCode, immediate = false } = body;

  if (!planCode) {
    return new Response(
      JSON.stringify({ error: "Plan code is required to switch subscription" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get existing subscription from database to verify ownership and get customer details
  const { data: existingSubscription, error: subError } = await supabase
    .from("subscriptions")
    .select("organizationid, paystackcustomercode, tier")
    .eq("paystacksubscriptioncode", subscriptionCode)
    .single();

  if (subError || !existingSubscription) {
    return new Response(
      JSON.stringify({ error: "Subscription not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get subscription details from Paystack to get customer code and authorization
  const getSubResponse = await fetch(`https://api.paystack.co/subscription/${subscriptionCode}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${paystackSecretKey}`,
      "Content-Type": "application/json",
    },
  });

  const getSubData = await getSubResponse.json();

  if (!getSubData.status || !getSubData.data) {
    return new Response(
      JSON.stringify({ error: getSubData.message || "Failed to fetch subscription details" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const paystackSubscription = getSubData.data;
  const customerCode = paystackSubscription.customer?.customer_code || paystackSubscription.customer_code;
  const authCode = authorizationCode || paystackSubscription.authorization?.authorization_code;

  if (!customerCode) {
    return new Response(
      JSON.stringify({ error: "Customer code not found in subscription" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!authCode) {
    return new Response(
      JSON.stringify({ error: "Authorization code not found. Customer needs to add a payment method." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Helper function to map plan code to tier
  const getTierFromPlanCode = (code: string): string => {
    if (code.includes('FREE') || code === 'PLN_FREE') return 'free';
    // Monthly plans
    if (code.includes('5jjsgz1ivndtnxp')) return 'basic';
    if (code.includes('a7qqm2p4q9ejdpt')) return 'professional';
    if (code.includes('9jsfo4c1d35od5q')) return 'enterprise';
    // Annual plans
    if (code.includes('f5n4d3g6x7cb3or')) return 'basic';      // Basic annual: PLN_f5n4d3g6x7cb3or
    if (code.includes('zekf4yw2rvdy957')) return 'professional'; // Professional annual: PLN_zekf4yw2rvdy957
    if (code.includes('2w2w7d02awcarg9')) return 'enterprise';   // Enterprise annual: PLN_2w2w7d02awcarg9
    // Fallback for other plan codes
    if (code.includes('BASIC')) return 'basic';
    if (code.includes('PRO') || code.includes('PROFESSIONAL')) return 'professional';
    return 'free';
  };

  const newTier = getTierFromPlanCode(planCode);
  const organizationId = existingSubscription.organizationid;
  const currentTier = existingSubscription.tier;

  // Create new subscription with new plan
  const createSubData: any = {
    customer: customerCode,
    plan: planCode,
    authorization: authCode,
  };

  if (immediate) {
    // Immediate switch: start new subscription now
    createSubData.start_date = new Date().toISOString();
  } else {
    // Deferred switch: start new subscription at next billing cycle
    // This preserves current usage and billing until the switch happens
    const startDate = paystackSubscription.next_payment_date 
      ? new Date(paystackSubscription.next_payment_date).toISOString()
      : new Date().toISOString();
    createSubData.start_date = startDate;
  }

  const createResponse = await fetch("https://api.paystack.co/subscription", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${paystackSecretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(createSubData),
  });

  const createData = await createResponse.json();

  if (!createData.status) {
    return new Response(
      JSON.stringify({ error: createData.message || "Failed to create new subscription" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Handle old subscription based on immediate flag
  if (immediate) {
    // Immediate switch: disable old subscription now
    const emailToken = paystackSubscription.email_token;
    
    if (!emailToken) {
      return new Response(
        JSON.stringify({ error: "Email token not found for subscription, cannot disable old subscription" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const disablePayload = {
      code: subscriptionCode,
      token: emailToken,
    };

    const disableResponse = await fetch("https://api.paystack.co/subscription/disable", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(disablePayload),
    });

    const disableData = await disableResponse.json();

    if (!disableData.status) {
      console.error("[PaystackBilling] Failed to disable old subscription:", disableData.message);
      return new Response(
        JSON.stringify({ 
          error: `Failed to disable old subscription: ${disableData.message}. New subscription created but old one may still be active.` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark old subscription as cancelled in database
    await supabase
      .from("subscriptions")
      .update({
        status: "cancelled",
        updatedat: new Date().toISOString(),
      })
      .eq("paystacksubscriptioncode", subscriptionCode);

    // Update organization tier immediately
    const { error: orgError } = await supabase
      .from("organizations")
      .update({
        subscriptionTier: newTier,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", organizationId);

    if (orgError) {
      console.error("[PaystackBilling] Failed to update organization tier:", orgError);
    }
  } else {
    // Deferred switch: mark old subscription to cancel at period end
    // Keep it active until the new subscription starts
    await supabase
      .from("subscriptions")
      .update({
        status: "non-renewing", // Mark as non-renewing but keep active
        updatedat: new Date().toISOString(),
      })
      .eq("paystacksubscriptioncode", subscriptionCode);

    // DON'T update organization tier yet - it will be updated when the new subscription starts
    // The webhook will handle the tier transition when the new subscription becomes active
  }

  // Handle database record based on immediate flag
  if (immediate) {
    // Immediate switch: update existing subscription record with new subscription details
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        paystacksubscriptioncode: createData.data.subscription_code,
        paystackplancode: planCode,
        paystackcustomercode: customerCode,
        status: createData.data.status,
        amount: createData.data.amount,
        nextpaymentdate: createData.data.next_payment_date,
        tier: newTier,
        updatedat: new Date().toISOString(),
      } as any)
      .eq("organizationid", organizationId);

    if (updateError) {
      console.error("[PaystackBilling] Failed to update subscription record:", updateError);
      // Continue anyway - the webhook will handle it
    }
  } else {
    // Deferred switch: DON'T create a new subscription record yet
    // The old subscription is marked as "non-renewing" and will remain active
    // The webhook will update the existing record when the new subscription becomes active
    console.log("[PaystackWebhook] Deferred switch - subscription record will be updated by webhook when new subscription becomes active");
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: createData.data,
      message: immediate 
        ? "Subscription plan switched successfully. Changes are effective immediately."
        : `Subscription plan switch scheduled. Your current plan (${currentTier}) will remain active until ${paystackSubscription.next_payment_date || 'the next billing cycle'}, when your new plan (${newTier}) will begin.`,
      nextBillingCycle: paystackSubscription.next_payment_date,
      currentTier: currentTier,
      newTier: newTier,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Cancel subscription
async function handleCancelSubscription(
  body: CancelSubscriptionRequest,
  paystackSecretKey: string,
  supabase: any,
  userId: string
) {
  const { subscriptionCode, token } = body;

  // Get subscription from database to verify ownership
  const { data: subscription, error: subError } = await supabase
    .from("subscriptions")
    .select("organizationid")
    .eq("paystacksubscriptioncode", subscriptionCode)
    .single();

  if (subError || !subscription) {
    return new Response(
      JSON.stringify({ error: "Subscription not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get subscription details from Paystack to get email_token if not provided
  // According to Paystack docs, disable requires both code and token (email_token)
  let emailToken = token;
  if (!emailToken) {
    const getSubResponse = await fetch(`https://api.paystack.co/subscription/${subscriptionCode}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
    });

    const getSubData = await getSubResponse.json();
    if (getSubData.status && getSubData.data?.email_token) {
      emailToken = getSubData.data.email_token;
    }
  }

  const disablePayload: any = {
    code: subscriptionCode,
  };

  if (emailToken) {
    disablePayload.token = emailToken;
  }

  const response = await fetch(`https://api.paystack.co/subscription/disable`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${paystackSecretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(disablePayload),
  });

  const data = await response.json();

  if (!data.status) {
    return new Response(
      JSON.stringify({ error: data.message || "Failed to cancel subscription" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Update subscription status in database
  await supabase
    .from("subscriptions")
    .update({
      status: "cancelled",
      updatedat: new Date().toISOString(),
    })
    .eq("paystacksubscriptioncode", subscriptionCode);

  return new Response(
    JSON.stringify({ success: true, data: data.data }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Get subscription details
async function handleGetSubscription(
  body: { subscriptionCode: string },
  paystackSecretKey: string,
  supabase: any,
  userId: string
) {
  const { subscriptionCode } = body;

  const response = await fetch(`https://api.paystack.co/subscription/${subscriptionCode}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${paystackSecretKey}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  if (!data.status) {
    return new Response(
      JSON.stringify({ error: data.message || "Failed to get subscription" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, data: data.data }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Get subscription management link
async function handleGetSubscriptionLink(
  body: { subscriptionCode: string },
  paystackSecretKey: string,
  supabase: any,
  userId: string
) {
  const { subscriptionCode } = body;

  const response = await fetch(`https://api.paystack.co/subscription/${subscriptionCode}/manage/link`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${paystackSecretKey}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  if (!data.status) {
    return new Response(
      JSON.stringify({ error: data.message || "Failed to get subscription link" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, data: data.data }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Helper: Get or create Paystack customer
async function getOrCreatePaystackCustomer(
  email: string,
  paystackSecretKey: string
): Promise<string> {
  // First, try to find existing customer
  const listResponse = await fetch(
    `https://api.paystack.co/customer?email=${encodeURIComponent(email)}`,
    {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  const listData = await listResponse.json();

  if (listData.status && listData.data && listData.data.length > 0) {
    return listData.data[0].customer_code;
  }

  // Create new customer
  const createResponse = await fetch("https://api.paystack.co/customer", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${paystackSecretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  const createData = await createResponse.json();

  if (!createData.status) {
    throw new Error(createData.message || "Failed to create customer");
  }

  return createData.data.customer_code;
}

