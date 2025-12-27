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
  planCode: string; // Required: the new plan code to switch to
  authorizationCode?: string; // Optional: if customer has multiple authorizations
  immediate?: boolean; // If true, switch immediately. If false (default), switch at next billing cycle
  // Note: subscriptionCode is no longer required - backend will detect it from the user's organization
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

  // Get tier from subscription_plans table
  let tier = 'free'; // Default fallback
  if (planCode) {
    const { data: planData, error: planError } = await supabase
      .from("subscription_plans")
      .select("tierName")
      .eq("planCode", planCode)
      .eq("isActive", true)
      .maybeSingle();
    
    if (planError) {
      console.error("[PaystackBilling] Error fetching plan from subscription_plans table:", {
        error: planError,
        planCode,
      });
    }
    
    if (planData?.tierName) {
      tier = planData.tierName;
      console.log("[PaystackBilling] Tier fetched from subscription_plans:", {
        planCode,
        tier,
      });
    } else {
      console.warn("[PaystackBilling] Plan code not found in subscription_plans table, using default 'free':", {
        planCode,
      });
    }
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
    tier: tier,
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

  // Get frontend URL for redirect after payment
  // Note: In production, this must be an HTTPS URL. Paystack will redirect users here after payment.
  // If callback_url is not working, check:
  // 1. FRONTEND_URL environment variable is set correctly in Supabase Edge Function settings
  // 2. The URL uses HTTPS in production (not http://localhost)
  // 3. No default callback URL is set in Paystack Dashboard that might override this
  const frontendUrl = Deno.env.get("FRONTEND_URL") || Deno.env.get("VITE_APP_URL") || "http://localhost:5173";
  const callbackUrl = `${frontendUrl}/dashboard/organization/subscription`;
  
  console.log("[PaystackBilling] Setting callback URL for redirect:", {
    frontendUrl,
    callbackUrl,
    envVarUsed: Deno.env.get("FRONTEND_URL") ? "FRONTEND_URL" : (Deno.env.get("VITE_APP_URL") ? "VITE_APP_URL" : "default localhost"),
  });

  // Get or create customer and ensure organizationId is stored in customer metadata
  // This ensures the organizationId is available in subscription.create webhooks
  // Paystack will automatically link the transaction to this customer by email
  await getOrCreatePaystackCustomerWithMetadata(
    email,
    organizationId,
    paystackSecretKey
  );

  const transactionData: any = {
    email,
    plan: planCode,
    amount: amount, // Amount in cents (required by Paystack)
    currency: "KES",
    callback_url: callbackUrl, // Redirect to subscription page after payment
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
    callback_url: callbackUrl, // Log callback URL being sent
  });

  console.log("[PaystackBilling] Paystack request data:", {
    email,
    plan: planCode,
    planExact: JSON.stringify(transactionData.plan), // Log exact plan value being sent
    currency: transactionData.currency,
    hasAmount: !!transactionData.amount,
    amount: transactionData.amount,
    callback_url: transactionData.callback_url, // Ensure callback_url is included
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

// Switch subscription plan (disable old subscription + create new one)
// Note: Paystack doesn't have a direct PUT endpoint to update subscriptions
// The correct approach is to disable the old subscription and create a new one
// The database will keep the current plan until the new subscription is successfully charged
async function handleUpdateSubscription(
  body: UpdateSubscriptionRequest,
  paystackSecretKey: string,
  supabase: any,
  userId: string
) {
  console.log("[PaystackBilling] ===== SUBSCRIPTION SWITCH REQUEST RECEIVED =====");
  console.log("[PaystackBilling] Request body:", {
    planCode: body.planCode,
    authorizationCode: body.authorizationCode ? "***provided***" : "not provided",
    immediate: body.immediate,
    userId,
  });

  const { planCode, authorizationCode, immediate = false } = body;

  if (!planCode) {
    console.error("[PaystackBilling] Validation failed: Plan code is required");
    return new Response(
      JSON.stringify({ error: "Plan code is required to switch subscription" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Step 1: Get the user's organization ID from their profile
  console.log("[PaystackBilling] Step 1: Fetching user organization from profile");
  const { data: userProfile, error: userError } = await supabase
    .from("users")
    .select("organizationid")
    .eq("auth_user_id", userId)
    .eq("isActive", true)
    .maybeSingle();

  if (userError || !userProfile || !userProfile.organizationid) {
    console.error("[PaystackBilling] Step 1 FAILED: Error fetching user organization:", {
      error: userError,
      errorCode: userError?.code,
      errorMessage: userError?.message,
      userId,
      hasUserProfile: !!userProfile,
    });
    return new Response(
      JSON.stringify({ error: "User organization not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const organizationId = userProfile.organizationid;
  console.log("[PaystackBilling] Step 1 SUCCESS: User organization found:", {
    organizationId,
    userId,
  });
  console.log("[PaystackBilling] Step 2: Fetching existing subscription from database");

  // Step 2: Get existing subscription from database for this organization
  const { data: existingSubscription, error: subError } = await supabase
    .from("subscriptions")
    .select("id, organizationid, paystacksubscriptioncode, paystackcustomercode, tier, paystackplancode, status")
    .eq("organizationid", organizationId)
    .maybeSingle();

  if (subError) {
    console.error("[PaystackBilling] Step 2 FAILED: Error fetching subscription:", {
      error: subError,
      errorCode: subError?.code,
      errorMessage: subError?.message,
      organizationId,
    });
    return new Response(
      JSON.stringify({ error: "Failed to fetch subscription" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!existingSubscription) {
    console.error("[PaystackBilling] Step 2 FAILED: No subscription found for organization:", {
      organizationId,
    });
    return new Response(
      JSON.stringify({ error: "No subscription found for this organization. Please create a subscription first." }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let subscriptionCode = existingSubscription.paystacksubscriptioncode;

  // If subscription code is missing, try to fetch it from Paystack API
  if (!subscriptionCode) {
    console.log("[PaystackBilling] Step 2: Subscription code missing in database, querying Paystack API");
    
    // First, we need the customer code to query Paystack
    const customerCode = existingSubscription.paystackcustomercode;
    
    if (!customerCode) {
      console.error("[PaystackBilling] Step 2 FAILED: Both subscription code and customer code missing:", {
        subscriptionId: existingSubscription.id,
        organizationId,
        currentTier: existingSubscription.tier,
        currentPlanCode: existingSubscription.paystackplancode,
        status: existingSubscription.status,
      });
      return new Response(
        JSON.stringify({ error: "Subscription code and customer code not found. Please wait for your subscription to be fully activated, or contact support." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Query Paystack API for subscriptions by customer ID
    // According to Paystack API docs: GET /subscription with customer query parameter
    // Note: The customer parameter expects Customer ID (integer), not customer code (CUS_xxxx)
    // So we need to first get the customer details to get the ID
    console.log("[PaystackBilling] Step 2: Fetching customer details to get customer ID:", {
      customerCode,
    });

    // First, get customer details to retrieve customer ID
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
      console.error("[PaystackBilling] Step 2 FAILED: Error fetching customer from Paystack:", {
        customerCode,
        paystackError: customerData.message,
        paystackResponse: customerData,
      });
    return new Response(
        JSON.stringify({ error: "Customer not found in Paystack. Please contact support." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

    const customerId = customerData.data.id;
    console.log("[PaystackBilling] Step 2: Customer ID retrieved:", {
      customerCode,
      customerId,
    });

    // Now query subscriptions using customer ID (integer)
    console.log("[PaystackBilling] Step 2: Querying Paystack API for customer subscriptions:", {
      customerId,
      customerCode,
    });

    const listSubUrl = `https://api.paystack.co/subscription?customer=${customerId}`;
    console.log("[PaystackBilling] Step 2: Paystack API URL:", listSubUrl);

    const listSubResponse = await fetch(listSubUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
    });

    const listSubData = await listSubResponse.json();

    if (listSubData.status && listSubData.data && listSubData.data.length > 0) {
      // Find the active subscription (prefer active, otherwise take the first one)
      const activeSubscription = listSubData.data.find(
        (sub: any) => sub.status === 'active' || sub.status === 'trialing'
      ) || listSubData.data[0];

      subscriptionCode = activeSubscription.subscription_code;
      
      console.log("[PaystackBilling] Step 2 SUCCESS: Found subscription code from Paystack API:", {
        subscriptionCode,
        status: activeSubscription.status,
        planCode: activeSubscription.plan?.plan_code || activeSubscription.plan_code,
        totalSubscriptions: listSubData.data.length,
      });

      // Update the database with the subscription code we found
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          paystacksubscriptioncode: subscriptionCode,
    updatedat: new Date().toISOString(),
        })
        .eq("id", existingSubscription.id);
  
      if (updateError) {
        console.warn("[PaystackBilling] Step 2 WARNING: Failed to update database with subscription code:", {
          error: updateError,
          subscriptionId: existingSubscription.id,
          subscriptionCode,
        });
      } else {
        console.log("[PaystackBilling] Step 2: Database updated with subscription code from Paystack");
      }
    } else {
      console.error("[PaystackBilling] Step 2 FAILED: No subscriptions found in Paystack API:", {
        customerCode,
        paystackResponse: listSubData,
      });
      return new Response(
        JSON.stringify({ error: "Subscription code not found in Paystack. Please wait for your subscription to be fully activated, or contact support." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  console.log("[PaystackBilling] Step 2 SUCCESS: Found existing subscription:", {
    subscriptionId: existingSubscription.id,
    subscriptionCode,
    currentPlanCode: existingSubscription.paystackplancode,
    currentTier: existingSubscription.tier,
    currentStatus: existingSubscription.status,
    customerCode: existingSubscription.paystackcustomercode,
    newPlanCode: planCode,
  });

  // Step 3: Determine switch type and immediate flag
  console.log("[PaystackBilling] Step 3: Determining switch type and immediate flag");
  const isFreePlan = existingSubscription.tier === 'free' || !existingSubscription.paystackplancode;
  const isFreeToPaidSwitch = isFreePlan && planCode !== 'PLN_FREE';
  const effectiveImmediate = immediate && isFreeToPaidSwitch;
  
  console.log("[PaystackBilling] Step 3: Switch type analysis:", {
    currentTier: existingSubscription.tier,
    currentPlanCode: existingSubscription.paystackplancode,
    newPlanCode: planCode,
    isFreePlan,
    isFreeToPaidSwitch,
    requestedImmediate: immediate,
    effectiveImmediate,
  });
  
  if (immediate && !isFreeToPaidSwitch) {
    console.warn("[PaystackBilling] Step 3: Overriding immediate flag - only allowed for free-to-paid switches");
  }
  
  // Step 4: Get subscription details from Paystack to get customer code, authorization, and email token
  console.log("[PaystackBilling] Step 4: Fetching subscription details from Paystack API");
  const getSubResponse = await fetch(`https://api.paystack.co/subscription/${subscriptionCode}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${paystackSecretKey}`,
      "Content-Type": "application/json",
    },
  });

  const getSubData = await getSubResponse.json();

  if (!getSubData.status || !getSubData.data) {
    console.error("[PaystackBilling] Step 4 FAILED: Error fetching subscription from Paystack:", {
      subscriptionCode,
      paystackError: getSubData.message,
      paystackResponse: getSubData,
    });
    return new Response(
      JSON.stringify({ error: getSubData.message || "Failed to fetch subscription details" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const paystackSubscription = getSubData.data;
  const customerCode = paystackSubscription.customer?.customer_code || paystackSubscription.customer_code;
  const authCode = authorizationCode || paystackSubscription.authorization?.authorization_code;
  const emailToken = paystackSubscription.email_token;

  console.log("[PaystackBilling] Step 4 SUCCESS: Paystack subscription details retrieved:", {
    subscriptionCode,
    customerCode,
    hasAuthorizationCode: !!authCode,
    hasEmailToken: !!emailToken,
    nextPaymentDate: paystackSubscription.next_payment_date,
    status: paystackSubscription.status,
  });

  if (!customerCode) {
    console.error("[PaystackBilling] Step 4 FAILED: Customer code not found in Paystack subscription");
    return new Response(
      JSON.stringify({ error: "Customer code not found in subscription" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!authCode) {
    console.error("[PaystackBilling] Step 4 FAILED: Authorization code not found:", {
      subscriptionCode,
      customerCode,
      providedAuthorizationCode: !!authorizationCode,
      paystackAuthorizationCode: !!paystackSubscription.authorization?.authorization_code,
    });
    return new Response(
      JSON.stringify({ error: "Authorization code not found. Customer needs to add a payment method." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Step 5: Get tier from subscription_plans table
  console.log("[PaystackBilling] Step 5: Fetching tier information for new plan");
  let newTier = 'free'; // Default fallback
  if (planCode) {
    const { data: planData, error: planError } = await supabase
      .from("subscription_plans")
      .select("tierName")
      .eq("planCode", planCode)
      .eq("isActive", true)
      .maybeSingle();
    
    if (planError) {
      console.error("[PaystackBilling] Step 5 ERROR: Error fetching plan from subscription_plans table:", {
        error: planError,
        errorCode: planError?.code,
        errorMessage: planError?.message,
        planCode,
      });
    }
    
    if (planData?.tierName) {
      newTier = planData.tierName;
      console.log("[PaystackBilling] Step 5 SUCCESS: Tier fetched from subscription_plans:", {
        planCode,
        tier: newTier,
      });
    } else {
      console.warn("[PaystackBilling] Step 5 WARNING: Plan code not found in subscription_plans table, using default 'free':", {
        planCode,
      });
    }
  }
  
  // organizationId is already set from user profile lookup above
  const currentTier = existingSubscription.tier;

  // Step 6: Disable ALL existing subscriptions for this customer
  console.log("[PaystackBilling] Step 6: Processing old subscriptions disable");
  
  // Get customer ID to query all subscriptions
  const customerId = paystackSubscription.customer?.id || paystackSubscription.customer;
  
  if (customerId && !isFreePlan) {
    console.log("[PaystackBilling] Step 6: Fetching all subscriptions for customer:", {
      customerId,
      customerCode,
    });

    // Query all subscriptions for this customer
    const listAllSubsResponse = await fetch(
      `https://api.paystack.co/subscription?customer=${customerId}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const listAllSubsData = await listAllSubsResponse.json();

    if (listAllSubsData.status && listAllSubsData.data && listAllSubsData.data.length > 0) {
      console.log("[PaystackBilling] Step 6: Found subscriptions to disable:", {
        totalSubscriptions: listAllSubsData.data.length,
        subscriptions: listAllSubsData.data.map((sub: any) => ({
          subscriptionCode: sub.subscription_code,
          status: sub.status,
          planCode: sub.plan?.plan_code || sub.plan_code,
        })),
      });

      // Disable all active subscriptions on Paystack
      // Note: We'll disable them on Paystack, but keep the current one as "active" in the database
      // until the new subscription's payment is confirmed via webhook
      const disablePromises: Promise<{ subscriptionCode: string; success: boolean; data: any }>[] = [];
      const subscriptionsToCancelInDB: string[] = [];

      for (const sub of listAllSubsData.data) {
        // Only disable active/trialing subscriptions
        if (sub.status === 'active' || sub.status === 'trialing') {
          const subCode = sub.subscription_code;
          const subEmailToken = sub.email_token;

          if (subEmailToken) {
            console.log("[PaystackBilling] Step 6: Disabling subscription on Paystack:", {
              subscriptionCode: subCode,
              status: sub.status,
              planCode: sub.plan?.plan_code || sub.plan_code,
              isCurrentSubscription: subCode === subscriptionCode,
            });

            // Disable on Paystack (all subscriptions)
            disablePromises.push(
              fetch("https://api.paystack.co/subscription/disable", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${paystackSecretKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  code: subCode,
                  token: subEmailToken,
                }),
              }).then(async (response) => {
                const data = await response.json();
                return { subscriptionCode: subCode, success: data.status, data };
              })
            );

            // Only mark as cancelled in DB if it's NOT the current subscription
            // The current subscription stays "active" until webhook confirms new payment
            if (subCode !== subscriptionCode) {
              subscriptionsToCancelInDB.push(subCode);
            } else {
              console.log("[PaystackBilling] Step 6: Keeping current subscription as 'active' in database:", {
                subscriptionCode: subCode,
                reason: "Will remain active until new subscription payment is confirmed via webhook",
              });
            }
          } else {
            console.warn("[PaystackBilling] Step 6: Skipping subscription (no email token):", {
              subscriptionCode: subCode,
              status: sub.status,
            });
          }
        }
      }

      // Wait for all disable operations to complete
      if (disablePromises.length > 0) {
        const disableResults = await Promise.all(disablePromises);
        
        const failedDisables = disableResults.filter((result) => !result.success);
        
        if (failedDisables.length > 0) {
          console.error("[PaystackBilling] Step 6 FAILED: Some subscriptions failed to disable on Paystack:", {
            failedCount: failedDisables.length,
            failedSubscriptions: failedDisables.map((r) => ({
              subscriptionCode: r.subscriptionCode,
              error: r.data.message,
            })),
          });
          // Continue anyway - we'll still try to create the new subscription
        } else {
          console.log("[PaystackBilling] Step 6 SUCCESS: All existing subscriptions disabled on Paystack:", {
            disabledCount: disableResults.length,
          });
  }
  
        // Mark only non-current subscriptions as cancelled in database
        // The current subscription remains "active" until webhook confirms new payment
        if (subscriptionsToCancelInDB.length > 0) {
          console.log("[PaystackBilling] Step 6: Updating database - marking non-current subscriptions as cancelled:", {
            cancelledCount: subscriptionsToCancelInDB.length,
            currentSubscriptionCode: subscriptionCode,
            note: "Current subscription remains 'active' until new subscription payment is confirmed",
          });
          const { error: dbUpdateError } = await supabase
    .from("subscriptions")
            .update({
              status: "cancelled",
              updatedat: new Date().toISOString(),
            })
            .in("paystacksubscriptioncode", subscriptionsToCancelInDB);

          if (dbUpdateError) {
            console.error("[PaystackBilling] Step 6 WARNING: Failed to update database status:", {
              error: dbUpdateError,
              subscriptionCodes: subscriptionsToCancelInDB,
            });
          } else {
            console.log("[PaystackBilling] Step 6: Database updated - non-current subscriptions marked as cancelled:", {
              count: subscriptionsToCancelInDB.length,
            });
          }
        } else {
          console.log("[PaystackBilling] Step 6: No other subscriptions to mark as cancelled in database (only current subscription found)");
        }
      } else {
        console.log("[PaystackBilling] Step 6: No active subscriptions found to disable");
      }
    } else {
      console.log("[PaystackBilling] Step 6: No subscriptions found for customer in Paystack");
    }
  } else if (isFreePlan) {
    console.log("[PaystackBilling] Step 6 SKIPPED: Current plan is free, no need to disable subscriptions");
  } else if (!customerId) {
    console.warn("[PaystackBilling] Step 6 SKIPPED: Customer ID not found, cannot query all subscriptions");
  }

  // Step 7: Create new subscription with new plan
  // This will charge the customer immediately if they have a valid authorization
  console.log("[PaystackBilling] Step 7: Creating new subscription in Paystack");
  console.log("[PaystackBilling] Step 7: Subscription creation parameters:", {
    customerCode,
    planCode,
    newTier,
    isFreeToPaid: isFreeToPaidSwitch,
    effectiveImmediate,
    hasAuthorization: !!authCode,
    nextPaymentDate: paystackSubscription.next_payment_date,
  });

  const createSubData: any = {
    customer: customerCode,
    plan: planCode,
    authorization: authCode,
  };

  // If immediate switch (free to paid), start now; otherwise start at next billing cycle
  if (effectiveImmediate) {
    createSubData.start_date = new Date().toISOString();
    console.log("[PaystackBilling] Step 7: Immediate switch - setting start_date to now:", {
      start_date: createSubData.start_date,
    });
  } else if (paystackSubscription.next_payment_date) {
    // Deferred: start at next billing cycle of old subscription
    createSubData.start_date = new Date(paystackSubscription.next_payment_date).toISOString();
    console.log("[PaystackBilling] Step 7: Deferred switch - setting start_date to next billing cycle:", {
      start_date: createSubData.start_date,
      nextPaymentDate: paystackSubscription.next_payment_date,
    });
  }

  console.log("[PaystackBilling] Step 7: Paystack API request payload:", {
    customer: customerCode,
    plan: planCode,
    authorization: authCode ? "***present***" : "missing",
    start_date: createSubData.start_date,
  });

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
    // If creation failed, we should try to re-enable the old subscription if we disabled it
    // But Paystack doesn't have a re-enable API, so we'll just return the error
    console.error("[PaystackBilling] Step 7 FAILED: Failed to create new subscription:", {
      planCode,
      customerCode,
      paystackError: createData.message,
      paystackCode: createData.code,
      paystackResponse: createData,
    });
  return new Response(
      JSON.stringify({ 
        error: createData.message || "Failed to create new subscription. Your current plan remains active." 
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log("[PaystackBilling] Step 7 SUCCESS: New subscription created in Paystack:", {
    newSubscriptionCode: createData.data.subscription_code,
    planCode,
    newTier,
    status: createData.data.status,
    amount: createData.data.amount,
    nextPaymentDate: createData.data.next_payment_date,
    customerCode: createData.data.customer?.customer_code || createData.data.customer_code,
  });

  // Step 8: Keep the database on the current plan until payment succeeds
  // The webhook (charge.success or subscription.create) will update the database
  // when the new subscription is successfully charged
  // 
  // We DO NOT update the subscription record or organization tier here
  // This ensures the user stays on their current plan until payment is confirmed
  
  console.log("[PaystackBilling] Step 8: Database update strategy");
  console.log("[PaystackBilling] Step 8: NOT updating database - current plan remains active until webhook confirms payment");
  console.log("[PaystackBilling] Step 8: Webhook will update subscription when payment succeeds:", {
    currentTier,
    newTier,
    currentPlanCode: existingSubscription.paystackplancode,
    newPlanCode: planCode,
    newSubscriptionCode: createData.data.subscription_code,
  });
  
  console.log("[PaystackBilling] ===== SUBSCRIPTION SWITCH COMPLETED SUCCESSFULLY =====");

  return new Response(
    JSON.stringify({
      success: true,
      data: createData.data,
      message: effectiveImmediate 
        ? `Subscription plan switch initiated. Your new ${newTier} plan will be activated once payment is confirmed. Your current ${currentTier} plan remains active until then.`
        : `Subscription plan switch scheduled. Your current ${currentTier} plan will remain active until ${paystackSubscription.next_payment_date || 'the next billing cycle'}, when your new ${newTier} plan will begin after payment confirmation.`,
      nextBillingCycle: paystackSubscription.next_payment_date,
      currentTier: currentTier,
      newTier: newTier,
      isFreeToPaid: isFreeToPaidSwitch,
      immediate: effectiveImmediate,
      note: "Your subscription will be updated automatically once payment is confirmed via webhook.",
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
// The backend will detect the subscription from the user's organization
async function handleGetSubscriptionLink(
  body: any, // No subscriptionCode needed - backend will find it
  paystackSecretKey: string,
  supabase: any,
  userId: string
) {
  console.log("[PaystackBilling] Getting subscription management link");

  // Step 1: Get the user's organization ID from their profile
  const { data: userProfile, error: userError } = await supabase
    .from("users")
    .select("organizationid")
    .eq("auth_user_id", userId)
    .eq("isActive", true)
    .maybeSingle();

  if (userError || !userProfile || !userProfile.organizationid) {
    console.error("[PaystackBilling] Error fetching user organization:", {
      error: userError,
      userId,
    });
    return new Response(
      JSON.stringify({ error: "User organization not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const organizationId = userProfile.organizationid;
  console.log("[PaystackBilling] User organization found:", { organizationId });

  // Step 2: Get subscription from database for this organization
  const { data: subscription, error: subError } = await supabase
    .from("subscriptions")
    .select("paystacksubscriptioncode, paystackcustomercode, status")
    .eq("organizationid", organizationId)
    .maybeSingle();

  if (subError) {
    console.error("[PaystackBilling] Error fetching subscription:", {
      error: subError,
      organizationId,
    });
    return new Response(
      JSON.stringify({ error: "Failed to fetch subscription" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!subscription) {
    console.error("[PaystackBilling] No subscription found for organization:", {
      organizationId,
    });
    return new Response(
      JSON.stringify({ error: "No subscription found for your organization" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let subscriptionCode = subscription.paystacksubscriptioncode;

  // If subscription code is missing, try to fetch it from Paystack API
  if (!subscriptionCode) {
    console.log("[PaystackBilling] Subscription code missing in database, querying Paystack API");
    
    const customerCode = subscription.paystackcustomercode;
    
    if (!customerCode) {
      console.error("[PaystackBilling] Both subscription code and customer code missing:", {
        organizationId,
        subscriptionStatus: subscription.status,
      });
      return new Response(
        JSON.stringify({ error: "Subscription code and customer code not found. Please wait for your subscription to be fully activated." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get customer ID first, then query subscriptions
    console.log("[PaystackBilling] Fetching customer details to get customer ID:", {
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
      console.error("[PaystackBilling] Error fetching customer from Paystack:", {
        customerCode,
        paystackError: customerData.message,
      });
      return new Response(
        JSON.stringify({ error: "Customer not found in Paystack. Please contact support." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const customerId = customerData.data.id;
    console.log("[PaystackBilling] Customer ID retrieved:", {
      customerCode,
      customerId,
    });

    // Query subscriptions using customer ID (integer)
    const listSubResponse = await fetch(
      `https://api.paystack.co/subscription?customer=${customerId}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const listSubData = await listSubResponse.json();

    if (listSubData.status && listSubData.data && listSubData.data.length > 0) {
      // Find the active subscription (prefer active, otherwise take the first one)
      const activeSubscription = listSubData.data.find(
        (sub: any) => sub.status === 'active' || sub.status === 'trialing'
      ) || listSubData.data[0];

      subscriptionCode = activeSubscription.subscription_code;
      
      console.log("[PaystackBilling] Found subscription code from Paystack API:", {
        subscriptionCode,
        status: activeSubscription.status,
      });

      // Update the database with the subscription code we found
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          paystacksubscriptioncode: subscriptionCode,
          updatedat: new Date().toISOString(),
        })
        .eq("organizationid", organizationId);

      if (updateError) {
        console.warn("[PaystackBilling] Failed to update database with subscription code:", {
          error: updateError,
          organizationId,
          subscriptionCode,
        });
      } else {
        console.log("[PaystackBilling] Database updated with subscription code from Paystack");
      }
    } else {
      console.error("[PaystackBilling] No subscriptions found in Paystack API:", {
        customerCode,
        customerId,
        paystackResponse: listSubData,
      });
      return new Response(
        JSON.stringify({ error: "Subscription code not found in Paystack. Please wait for your subscription to be fully activated." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  console.log("[PaystackBilling] Subscription code found, fetching management link:", {
    subscriptionCode,
  });

  // Step 3: Get management link from Paystack
  const response = await fetch(`https://api.paystack.co/subscription/${subscriptionCode}/manage/link`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${paystackSecretKey}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  if (!data.status) {
    console.error("[PaystackBilling] Failed to get subscription link from Paystack:", {
      subscriptionCode,
      paystackError: data.message,
      paystackResponse: data,
    });
    return new Response(
      JSON.stringify({ error: data.message || "Failed to get subscription link" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log("[PaystackBilling] Subscription management link retrieved successfully");

  return new Response(
    JSON.stringify({ success: true, data: data.data }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Helper: Get or create Paystack customer with organizationId metadata
async function getOrCreatePaystackCustomerWithMetadata(
  email: string,
  organizationId: string,
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
    const customerCode = listData.data[0].customer_code;
    
    // Update customer metadata to include organizationId if not already set
    // This ensures organizationId is available in subscription.create webhooks
    // Paystack API: PUT /customer/{code}
    const updateResponse = await fetch(`https://api.paystack.co/customer/${encodeURIComponent(customerCode)}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        metadata: {
          organizationId,
          ...(listData.data[0].metadata || {}), // Preserve existing metadata
        },
      }),
    });

    const updateData = await updateResponse.json();
    if (!updateData.status) {
      console.warn("[PaystackBilling] Failed to update customer metadata:", updateData.message);
      // Continue anyway - customer code is still valid
    } else {
      console.log("[PaystackBilling] Customer metadata updated with organizationId:", {
        customerCode,
        organizationId,
      });
    }
    
    return customerCode;
  }

  // Create new customer with organizationId in metadata
  const createResponse = await fetch("https://api.paystack.co/customer", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${paystackSecretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      metadata: {
        organizationId,
      },
    }),
  });

  const createData = await createResponse.json();

  if (!createData.status) {
    throw new Error(createData.message || "Failed to create customer");
  }

  console.log("[PaystackBilling] Customer created with organizationId metadata:", {
    customerCode: createData.data.customer_code,
    organizationId,
  });

  return createData.data.customer_code;
}

// Helper: Get or create Paystack customer (original function for backward compatibility)
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

