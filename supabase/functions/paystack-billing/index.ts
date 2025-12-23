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
    currency: transactionData.currency,
    hasAmount: !!transactionData.amount,
    amount: transactionData.amount,
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
        email,
        organizationId,
      });
      return new Response(
        JSON.stringify({ error: data.message || "Failed to initialize subscription" }),
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

// Update subscription
async function handleUpdateSubscription(
  body: UpdateSubscriptionRequest,
  paystackSecretKey: string,
  supabase: any,
  userId: string
) {
  const { subscriptionCode, planCode, authorizationCode } = body;

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

  const paystackUpdateData: any = {};
  if (planCode) paystackUpdateData.plan = planCode;
  if (authorizationCode) paystackUpdateData.authorization = authorizationCode;

  const response = await fetch(`https://api.paystack.co/subscription/${subscriptionCode}`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${paystackSecretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(paystackUpdateData),
  });

  const data = await response.json();

  if (!data.status) {
    return new Response(
      JSON.stringify({ error: data.message || "Failed to update subscription" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Update subscription in database
  const dbUpdateData: any = {
    status: data.data.status,
    nextpaymentdate: data.data.next_payment_date,
    updatedat: new Date().toISOString(),
  };
  
  if (planCode) {
    dbUpdateData.paystackplancode = planCode;
    dbUpdateData.tier = planCode.includes('FREE') ? 'free' : planCode.includes('BASIC') ? 'basic' : planCode.includes('PRO') ? 'pro' : 'enterprise';
  }
  
  await supabase
    .from("subscriptions")
    .update(dbUpdateData)
    .eq("paystacksubscriptioncode", subscriptionCode);

  return new Response(
    JSON.stringify({ success: true, data: data.data }),
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

  const response = await fetch(`https://api.paystack.co/subscription/disable`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${paystackSecretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      code: subscriptionCode,
      token,
    }),
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

