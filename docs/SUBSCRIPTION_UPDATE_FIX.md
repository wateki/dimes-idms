# Subscription Update API Fix

## Issue Identified

We were calling a **non-existent endpoint** `PUT /subscription/:code` to update subscriptions. According to Paystack's official API documentation (`subscriptionsAPI.md`), this endpoint does not exist.

## What Paystack Actually Supports

Based on `subscriptionsAPI.md`, Paystack provides these subscription endpoints:

1. ✅ `POST /subscription` - Create Subscription
2. ✅ `GET /subscription` - List Subscriptions
3. ✅ `GET /subscription/:id_or_code` - Fetch Subscription
4. ✅ `POST /subscription/enable` - Enable Subscription
5. ✅ `POST /subscription/disable` - Disable Subscription
6. ✅ `GET /subscription/:code/manage/link` - Generate Update Subscription Link (for card updates only)
7. ✅ `POST /subscription/:code/manage/email` - Send Update Subscription Link

**❌ NO `PUT /subscription/:code` endpoint exists!**

## Correct Approach for Switching Plans

To switch a customer to a different plan, we must:

1. **Create a new subscription** with the new plan using `POST /subscription`
2. **Disable the old subscription** using `POST /subscription/disable`

This is the recommended approach based on Paystack's documentation (line 154 in `paystackBilling.md` mentions using `start_date` parameter for plan switching).

## Changes Made

### 1. Updated `handleUpdateSubscription` Function

**File**: `supabase/functions/paystack-billing/index.ts`

**Old Implementation** (WRONG):
```typescript
// Called non-existent PUT endpoint
const response = await fetch(`https://api.paystack.co/subscription/${subscriptionCode}`, {
  method: "PUT",
  body: JSON.stringify({ plan: planCode }),
});
```

**New Implementation** (CORRECT):
```typescript
// 1. Get existing subscription details from Paystack
const getSubResponse = await fetch(`https://api.paystack.co/subscription/${subscriptionCode}`, {
  method: "GET",
});

// 2. Extract customer code and authorization code
const customerCode = paystackSubscription.customer?.customer_code;
const authCode = authorizationCode || paystackSubscription.authorization?.authorization_code;

// 3. Create new subscription with new plan
const createResponse = await fetch("https://api.paystack.co/subscription", {
  method: "POST",
  body: JSON.stringify({
    customer: customerCode,
    plan: planCode,
    authorization: authCode,
    start_date: nextPaymentDate, // Start at next billing cycle
  }),
});

// 4. Disable old subscription
const disableResponse = await fetch("https://api.paystack.co/subscription/disable", {
  method: "POST",
  body: JSON.stringify({
    code: subscriptionCode,
    token: emailToken,
  }),
});
```

### 2. Updated `handleCancelSubscription` Function

**File**: `supabase/functions/paystack-billing/index.ts`

**Change**: Now fetches `email_token` from Paystack if not provided, as it's required for the disable endpoint.

```typescript
// Get email_token from Paystack if not provided
if (!emailToken) {
  const getSubResponse = await fetch(`https://api.paystack.co/subscription/${subscriptionCode}`);
  emailToken = getSubData.data.email_token;
}
```

## Database Updates

When switching plans:

1. **Old subscription**: Status updated to `"cancelled"`
2. **New subscription**: New record created with new `subscription_code` and `plan_code`
3. **Organization**: `subscriptionTier` updated to match new plan

## Behavior

### Plan Switching Flow

1. User selects a new plan
2. System fetches current subscription details from Paystack
3. Creates new subscription with new plan (starts at next billing cycle)
4. Disables old subscription
5. Updates database records
6. Updates organization tier

### Error Handling

- If new subscription creation fails: Returns error, old subscription remains active
- If old subscription disable fails: Logs warning but continues (new subscription is already created)
- If customer/authorization not found: Returns clear error message

## Testing Checklist

- [ ] Test switching from Basic to Professional plan
- [ ] Test switching from Professional to Enterprise plan
- [ ] Test switching from Enterprise to Basic plan (downgrade)
- [ ] Test switching when customer has multiple authorizations
- [ ] Test switching when authorization is missing (should show error)
- [ ] Verify old subscription is marked as cancelled in database
- [ ] Verify new subscription is created with correct plan code
- [ ] Verify organization tier is updated correctly
- [ ] Test cancellation flow still works

## Notes

- The `start_date` parameter is set to the old subscription's `next_payment_date` to ensure smooth transition
- If `next_payment_date` is not available, it defaults to current date (immediate start)
- The `email_token` is fetched from Paystack if not provided, as it's required for disabling subscriptions

## References

- Paystack Subscription API Docs: `docs/subscriptionsAPI.md`
- Paystack Billing Docs: `docs/paystackBilling.md`
- Implementation: `supabase/functions/paystack-billing/index.ts`

