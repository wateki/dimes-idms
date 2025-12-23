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

// Handle subscription.create event
async function handleSubscriptionCreate(data: any, supabase: any) {
  const subscription = data;
  
  console.log("[PaystackWebhook] Processing subscription.create:", {
    subscriptionCode: subscription.subscription_code,
    planCode: subscription.plan?.plan_code || subscription.plan_code,
    status: subscription.status,
    amount: subscription.amount,
    customerCode: subscription.customer?.customer_code || subscription.customer_code,
    metadata: subscription.metadata,
  });
  
  // Try to get organizationId from metadata or find by subscription code
  let organizationId = subscription.metadata?.organizationId;
  
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
        subscriptionCode: subscription.subscription_code,
      });
    }
    
    if (existingSub) {
      organizationId = existingSub.organizationid;
      console.log("[PaystackWebhook] Found organizationId from existing subscription:", organizationId);
    }
  } else {
    console.log("[PaystackWebhook] OrganizationId from metadata:", organizationId);
  }

  if (!organizationId) {
    console.error("[PaystackWebhook] Missing organizationId in subscription metadata", {
      subscriptionCode: subscription.subscription_code,
      metadata: subscription.metadata,
    });
    return;
  }

  // Upsert subscription record
  const planCode = subscription.plan?.plan_code || subscription.plan_code;
  const tier = planCode?.includes('FREE') ? 'free' : 
               planCode?.includes('BASIC') ? 'basic' : 
               planCode?.includes('PRO') ? 'pro' : 'enterprise';
  
  // Check if a preliminary subscription already exists from charge.success
  const { data: existingPreliminary } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("organizationid", organizationId)
    .eq("paystackplancode", planCode)
    .is("paystacksubscriptioncode", null)
    .maybeSingle();

  if (existingPreliminary) {
    console.log("[PaystackWebhook] Found preliminary subscription from charge.success, updating with full details:", {
      subscriptionId: existingPreliminary.id,
      subscriptionCode: subscription.subscription_code,
    });
    
    // Update the existing preliminary record with full subscription details
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        paystacksubscriptioncode: subscription.subscription_code,
        paystackcustomercode: subscription.customer?.customer_code || subscription.customer_code,
        status: subscription.status,
        amount: subscription.amount,
        nextpaymentdate: subscription.next_payment_date,
        tier: tier,
        updatedAt: new Date().toISOString(),
      } as any)
      .eq("id", existingPreliminary.id);

    if (updateError) {
      console.error("[PaystackWebhook] Error updating preliminary subscription:", {
        error: updateError,
        subscriptionId: existingPreliminary.id,
      });
    } else {
      console.log("[PaystackWebhook] Preliminary subscription updated successfully");
    }
  } else {
    console.log("[PaystackWebhook] Upserting new subscription record:", {
      organizationId,
      subscriptionCode: subscription.subscription_code,
      planCode,
      tier,
      status: subscription.status,
      amount: subscription.amount,
    });

    const { error: upsertError } = await supabase.from("subscriptions").upsert({
      organizationid: organizationId,
      paystacksubscriptioncode: subscription.subscription_code,
      paystackplancode: planCode,
      paystackcustomercode: subscription.customer?.customer_code || subscription.customer_code,
      status: subscription.status,
      amount: subscription.amount,
      nextpaymentdate: subscription.next_payment_date,
      tier: tier,
      createdAt: subscription.created_at || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any);

    if (upsertError) {
      console.error("[PaystackWebhook] Error upserting subscription:", {
        error: upsertError,
        subscriptionCode: subscription.subscription_code,
        organizationId,
      });
    } else {
      console.log("[PaystackWebhook] Subscription record upserted successfully");
    }
  }

  // Update organization subscription status
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
    console.error("[PaystackWebhook] Error updating organization:", {
      error: orgUpdateError,
      organizationId,
    });
  } else {
    console.log("[PaystackWebhook] Organization updated successfully");
  }

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
    const { data: subRecord, error: subRecordError } = await supabase
      .from("subscriptions")
      .select("organizationid, id")
      .eq("paystackplancode", plan.plan_code)
      .eq("status", "active")
      .maybeSingle();

    if (subRecordError) {
      console.error("[PaystackWebhook] Error fetching subscription for charge:", {
        error: subRecordError,
        planCode: plan.plan_code,
      });
    }

    if (subRecord) {
      console.log("[PaystackWebhook] Recording charge usage for existing subscription:", {
        organizationId: subRecord.organizationid,
        subscriptionId: subRecord.id,
        reference: charge.reference,
        amount: charge.amount,
      });

      // Record usage
      const { error: insertError } = await supabase.from("subscription_usage").insert({
        organizationid: subRecord.organizationid,
        subscriptionid: subRecord.id,
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
    } else {
      // First-time subscription - charge.success arrives before subscription.create
      // Try to get organizationId from charge metadata
      const organizationId = charge.metadata?.organizationId;
      
      if (organizationId) {
        console.log("[PaystackWebhook] First-time subscription detected - creating preliminary subscription record:", {
          planCode: plan.plan_code,
          reference: charge.reference,
          organizationId,
          customerCode: charge.customer?.customer_code,
          amount: charge.amount,
        });

        // Determine tier from plan code
        const tier = plan.plan_code.includes('FREE') ? 'free' : 
                     plan.plan_code.includes('5jjsgzlivndtnxp') ? 'basic' : 
                     plan.plan_code.includes('a7qqm2p4q9ejdpt') ? 'professional' : 
                     plan.plan_code.includes('9jsfo4c1d350d5q') ? 'enterprise' : 'basic';

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
        }
      } else {
        console.warn("[PaystackWebhook] First-time subscription but no organizationId in metadata:", {
          planCode: plan.plan_code,
          reference: charge.reference,
          metadata: charge.metadata,
          note: "Cannot create subscription record without organizationId. Ensure organizationId is included in transaction metadata."
        });
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

