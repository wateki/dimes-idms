import { config } from '@/config/env';
import { supabase } from '@/lib/supabaseClient';

export interface CreatePlanRequest {
  name: string;
  interval: "hourly" | "daily" | "weekly" | "monthly" | "quarterly" | "biannually" | "annually";
  amount: number; // Amount in cents (smallest currency unit for KES)
  description?: string;
  invoice_limit?: number;
}

export interface CreateSubscriptionRequest {
  organizationId: string;
  planCode: string;
  email: string;
  authorizationCode?: string;
  startDate?: string;
}

export interface InitializeSubscriptionRequest {
  organizationId: string;
  planCode: string;
  email: string;
  amount?: number;
  metadata?: Record<string, any>;
}

export interface UpdateSubscriptionRequest {
  planCode: string; // Required: the new plan code to switch to
  authorizationCode?: string; // Optional: if customer has multiple authorizations
  immediate?: boolean; // If true, switch immediately. If false (default), switch at next billing cycle
  // Note: subscriptionCode is no longer required - backend will detect it from the user's organization
}

export interface PaystackPlan {
  id: number;
  name: string;
  plan_code: string;
  description: string | null;
  amount: number;
  interval: string;
  send_invoices: boolean;
  send_sms: boolean;
  currency: string;
  invoice_limit: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaystackSubscription {
  id: number;
  domain: string;
  status: string;
  subscription_code: string;
  email_token: string;
  amount: number;
  cron_expression: string;
  next_payment_date: string;
  open_invoice: string | null;
  plan: PaystackPlan;
  authorization: {
    authorization_code: string;
    bin: string;
    last4: string;
    exp_month: string;
    exp_year: string;
    channel: string;
    card_type: string;
    bank: string;
    country_code: string;
    brand: string;
    reusable: boolean;
    signature: string;
    account_name: string | null;
  };
  customer: {
    id: number;
    first_name: string | null;
    last_name: string | null;
    email: string;
    customer_code: string;
    phone: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

class PaystackService {
  private async callEdgeFunction(action: string, body: any) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('[PaystackService] No session found');
      throw new Error('Not authenticated');
    }

    const edgeFunctionUrl = `${config.SUPABASE_URL}/functions/v1/paystack-billing`;
    const requestBody = { action, ...body };
    
    console.log('[PaystackService] Calling edge function:', {
      action,
      url: edgeFunctionUrl,
      body: { ...requestBody, ...(requestBody.email && { email: requestBody.email }) }, // Log email but be careful with sensitive data
    });

    try {
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': config.SUPABASE_ANON_KEY || '',
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('[PaystackService] Edge function error:', {
          status: response.status,
          statusText: response.statusText,
          error: responseData.error,
          action,
        });
        throw new Error(responseData.error || 'Failed to process request');
      }

      console.log('[PaystackService] Edge function success:', {
        action,
        success: responseData.success,
      });

      return responseData;
    } catch (error: any) {
      console.error('[PaystackService] Network or parsing error:', {
        error,
        message: error?.message,
        stack: error?.stack,
        action,
      });
      throw error;
    }
  }

  /**
   * Create a Paystack plan
   */
  async createPlan(request: CreatePlanRequest): Promise<PaystackPlan> {
    const result = await this.callEdgeFunction('create_plan', request);
    return result.data;
  }

  /**
   * Create a subscription (requires existing customer authorization)
   */
  async createSubscription(request: CreateSubscriptionRequest): Promise<PaystackSubscription> {
    const result = await this.callEdgeFunction('create_subscription', request);
    return result.data;
  }

  /**
   * Initialize subscription payment (creates transaction with plan)
   * Returns authorization URL for customer to complete payment
   */
  async initializeSubscription(request: InitializeSubscriptionRequest): Promise<{
    authorization_url: string;
    access_code: string;
    reference: string;
  }> {
    console.log('[PaystackService] Initializing subscription:', {
      planCode: request.planCode,
      organizationId: request.organizationId,
      email: request.email,
      amount: request.amount,
      hasMetadata: !!request.metadata,
    });

    try {
      const result = await this.callEdgeFunction('initialize_subscription', request);
      
      if (!result.data || !result.data.authorization_url) {
        console.error('[PaystackService] Invalid response from edge function:', result);
        throw new Error('Invalid response from payment service');
      }

      return result.data;
    } catch (error: any) {
      console.error('[PaystackService] Failed to initialize subscription:', {
        error,
        message: error?.message,
        request: {
          planCode: request.planCode,
          organizationId: request.organizationId,
          email: request.email,
        },
      });
      throw error;
    }
  }

  /**
   * Update subscription (change plan or authorization)
   */
  async updateSubscription(request: UpdateSubscriptionRequest): Promise<PaystackSubscription> {
    const result = await this.callEdgeFunction('update_subscription', request);
    return result.data;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionCode: string, token?: string): Promise<void> {
    await this.callEdgeFunction('cancel_subscription', {
      subscriptionCode,
      token,
    });
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionCode: string): Promise<PaystackSubscription> {
    const result = await this.callEdgeFunction('get_subscription', {
      subscriptionCode,
    });
    return result.data;
  }

  /**
   * Get subscription management link
   * Note: subscriptionCode is no longer required - backend will detect it from the user's organization
   */
  async getSubscriptionLink(): Promise<{ link: string }> {
    const result = await this.callEdgeFunction('get_subscription_link', {});
    return result.data;
  }
}

export const paystackService = new PaystackService();

