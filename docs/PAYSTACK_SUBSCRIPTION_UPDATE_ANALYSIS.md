# Paystack Subscription Update API Analysis

## Issue Identified

We're currently calling `PUT https://api.paystack.co/subscription/${subscriptionCode}` to update subscriptions, but this endpoint may not be officially documented or may not work as expected.

## What Paystack Documentation Says

### 1. Update Plan API (Not What We Need)

**Endpoint**: `PUT /plan/{plan_code}`

**Purpose**: Updates the PLAN itself (name, amount, interval), not individual subscriptions

**Documentation Reference**: 
- From `paystackBilling.md` line 643-648:
  > "To make changes to a subscription, you'll use the Update Plan API endpoint... When set to true: All subscriptions will be updated, and the changes will apply on the next billing cycle."

**Problem**: This updates ALL subscriptions on that plan, not a single subscription.

### 2. Create Subscription with start_date (For Plan Switching)

**Endpoint**: `POST /subscription`

**Documentation Reference**: 
- From `paystackBilling.md` line 154:
  > "You can also pass a start_date parameter, which lets you set the date for the first debit. This makes this method useful for situations where you'd like to give a customer a free period before you start charging them, **or when you want to switch a customer to a different plan**."

**This suggests**: To switch plans, you might need to:
1. Create a NEW subscription with the new plan and `start_date`
2. Cancel the old subscription

### 3. Management Link (For Card Updates Only)

**Endpoint**: `GET /subscription/:code/manage/link`

**Purpose**: Allows customers to update their payment card, not change plans

## What We're Currently Doing

### Current Implementation

**File**: `supabase/functions/paystack-billing/index.ts` (line 406)

```typescript
const response = await fetch(`https://api.paystack.co/subscription/${subscriptionCode}`, {
  method: "PUT",
  headers: {
    "Authorization": `Bearer ${paystackSecretKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    plan: planCode,  // Trying to change plan
    authorization: authorizationCode  // Trying to change card
  }),
});
```

### Potential Issues

1. **Undocumented Endpoint**: `PUT /subscription/:code` is not clearly documented in Paystack's public API docs
2. **May Not Work**: This endpoint might not support changing plans
3. **Error Handling**: We might be getting errors that we're not properly handling

## Recommended Approach Based on Documentation

### Option 1: Create New Subscription + Cancel Old (Recommended)

Based on the documentation hint about using `start_date` for plan switching:

```typescript
async function switchSubscriptionPlan(
  oldSubscriptionCode: string,
  newPlanCode: string,
  customerCode: string,
  authorizationCode: string
) {
  // 1. Create new subscription with new plan
  const newSubscription = await fetch('https://api.paystack.co/subscription', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${paystackSecretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customer: customerCode,
      plan: newPlanCode,
      authorization: authorizationCode,
      start_date: new Date().toISOString(), // Start immediately or set future date
    }),
  });

  // 2. Cancel old subscription (set to non-renewing)
  await fetch('https://api.paystack.co/subscription/disable', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${paystackSecretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code: oldSubscriptionCode,
    }),
  });

  return newSubscription;
}
```

### Option 2: Verify PUT Endpoint Works

Test if `PUT /subscription/:code` actually works:

```typescript
// Test endpoint
const testResponse = await fetch(`https://api.paystack.co/subscription/${subscriptionCode}`, {
  method: "PUT",
  headers: {
    "Authorization": `Bearer ${paystackSecretKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    plan: newPlanCode,
  }),
});

// Check response
if (!testResponse.ok) {
  console.error('PUT endpoint failed:', await testResponse.json());
  // Fall back to Option 1
}
```

### Option 3: Use Management Link (Limited)

The management link only allows customers to:
- Update payment card
- Cancel subscription

**Cannot**: Change plans programmatically

## Action Items

### 1. Test Current Implementation

Check if `PUT /subscription/:code` is actually working:

```bash
# Test with curl
curl -X PUT https://api.paystack.co/subscription/SUB_xxxxx \
  -H "Authorization: Bearer YOUR_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"plan": "PLN_xxxxx"}'
```

### 2. Check Error Logs

Review logs for any errors when switching plans:
- Check `paystack-billing` edge function logs
- Check browser console errors
- Check Paystack dashboard for failed API calls

### 3. Verify Paystack API Response

Add better error logging:

```typescript
const data = await response.json();

if (!data.status) {
  console.error('[PaystackBilling] Update subscription failed:', {
    status: response.status,
    statusText: response.statusText,
    error: data.message,
    subscriptionCode,
    planCode,
  });
  // Log full response for debugging
  console.error('[PaystackBilling] Full response:', JSON.stringify(data, null, 2));
}
```

### 4. Implement Fallback Strategy

If PUT doesn't work, implement Option 1 (create new + cancel old):

```typescript
async function switchSubscriptionPlan(...) {
  try {
    // Try PUT first (if it exists)
    const putResponse = await updateSubscriptionViaPUT(...);
    if (putResponse.success) {
      return putResponse;
    }
  } catch (error) {
    console.warn('PUT endpoint failed, using create+cancel method');
  }
  
  // Fallback: Create new + cancel old
  return await switchPlanViaCreateAndCancel(...);
}
```

## Questions to Answer

1. **Is `PUT /subscription/:code` working?**
   - Check if we're getting successful responses
   - Check if plans are actually switching

2. **What errors are we getting?**
   - Review error logs
   - Check Paystack API responses

3. **Does Paystack support direct subscription updates?**
   - May need to contact Paystack support
   - Check their latest API documentation

## Next Steps

1. ✅ **Add comprehensive error logging** to see what's actually happening
2. ✅ **Test the PUT endpoint** with a real subscription
3. ✅ **Implement fallback strategy** (create new + cancel old) if PUT doesn't work
4. ✅ **Update documentation** once we confirm the correct approach

## References

- Paystack Subscription API: https://paystack.com/docs/api/subscription/
- Our implementation: `supabase/functions/paystack-billing/index.ts`
- Paystack billing docs: `docs/paystackBilling.md`

