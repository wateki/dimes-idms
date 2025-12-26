# Paystack API Field Verification

This document verifies that all fields used in the `paystack-webhook` function match the Paystack Subscriptions API as documented in `subscriptionsAPI.md`.

## Verified Fields from Paystack API

### Subscription Object Fields (from API responses)

| Field Used in Code | Paystack API Field | Status | Notes |
|-------------------|-------------------|--------|-------|
| `subscription_code` | `subscription_code` | ✅ Verified | Documented in all API responses |
| `status` | `status` | ✅ Verified | Documented (e.g., "active", "cancelled") |
| `amount` | `amount` | ✅ Verified | Documented in all responses |
| `next_payment_date` | `next_payment_date` | ✅ Verified | Documented in Fetch/List responses |
| `start` | `start` | ✅ Verified | Timestamp when subscription started |
| `created_at` / `createdAt` | `createdAt` | ⚠️ Note | API uses `createdAt` (camelCase), webhooks may use `created_at` (snake_case) |
| `customer.customer_code` | `customer.customer_code` | ✅ Verified | Documented in all responses |
| `customer` (object) | `customer` (object) | ✅ Verified | Full customer object in responses |
| `plan.plan_code` | `plan.plan_code` | ✅ Verified | Documented in all responses |
| `plan.name` | `plan.name` | ✅ Verified | Documented |
| `plan.amount` | `plan.amount` | ✅ Verified | Documented |
| `plan.interval` | `plan.interval` | ✅ Verified | Documented (e.g., "monthly", "annually") |
| `metadata` | `metadata` | ✅ Verified | Available in customer object and subscription metadata |

### Fields NOT in Paystack API

| Field Used in Code | Status | Solution |
|-------------------|--------|----------|
| `current_period_start` | ❌ Not in API | **Calculated** from `start` and `next_payment_date` based on `plan.interval` |
| `current_period_end` | ❌ Not in API | **Calculated** from `next_payment_date` (day before next payment) |

## Implementation Details

### Period Date Calculation

Since Paystack API doesn't provide `current_period_start` and `current_period_end`, we calculate them:

1. **Period End**: Day before `next_payment_date` (current period ends when next payment is due)
2. **Period Start**: Calculated based on `plan.interval`:
   - **Monthly**: 1 month before period end, set to start of month
   - **Annually/Yearly**: 1 year before period end, set to January 1st
   - **Weekly**: 7 days before period end
   - **Daily**: 1 day before period end
   - **Default**: Falls back to monthly calculation

### API Query Endpoint

The `fetchSubscriptionFromPaystack` function uses:
- **Endpoint**: `GET /subscription?customer={customerCode}`
- **Documentation**: Matches "List Subscriptions" endpoint with `customer` query parameter
- **Note**: According to docs, `customer` parameter accepts either customer ID (integer) or customer code (string). We use customer code.

### Field Name Handling

- **API Responses**: Use camelCase (e.g., `createdAt`, `customerCode`)
- **Webhook Payloads**: May use snake_case (e.g., `created_at`, `customer_code`)
- **Code**: Handles both formats with fallbacks:
  ```typescript
  subscription.customer?.customer_code || subscription.customer_code
  subscription.created_at || subscription.createdAt
  ```

## Verification Checklist

- [x] `subscription_code` - Verified in all API responses
- [x] `status` - Verified in all API responses
- [x] `amount` - Verified in all API responses
- [x] `next_payment_date` - Verified in Fetch/List responses
- [x] `customer.customer_code` - Verified in all responses
- [x] `plan.plan_code` - Verified in all responses
- [x] `plan.interval` - Verified in all responses
- [x] `current_period_start` - **Calculated** (not in API)
- [x] `current_period_end` - **Calculated** (not in API)
- [x] API query endpoint matches documentation
- [x] Field name variations handled (camelCase vs snake_case)

## Conclusion

All fields used in the webhook handler are either:
1. **Directly available** in the Paystack API (verified against documentation)
2. **Calculated** from available fields (`current_period_start`/`current_period_end`)
3. **Handled with fallbacks** for field name variations (camelCase vs snake_case)

The implementation correctly maps Paystack API fields to our database schema while handling cases where certain fields need to be calculated or may have different naming conventions in webhooks vs API responses.


