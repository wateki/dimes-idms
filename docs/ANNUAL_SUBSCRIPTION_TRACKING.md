# Annual Subscription Usage Tracking

## Overview

The usage tracking system now supports both **monthly** and **annual** subscription billing periods. Usage is tracked according to the organization's subscription type.

## How It Works

### Database Level (Triggers)

The `get_organization_billing_period(organizationId)` function determines the billing period by:

1. **First Priority**: Uses **active subscription's** `currentPeriodStart` and `currentPeriodEnd` if available (most accurate)
   - **Important**: Only queries subscriptions with `status = 'active'`
   - Cancelled, expired, or inactive subscriptions are ignored
2. **Second Priority**: Detects plan type from `paystackplancode` (only for active subscriptions):
   - **Annual Plans**: `PLN_f5n4d3g6x7cb3or`, `PLN_zekf4yw2rvdy957`, `PLN_2w2w7d02awcarg9`
   - **Monthly Plans**: All other plan codes
3. **Fallback**: Defaults to monthly period if no **active** subscription found

### Service Level

The `supabaseUsageTrackingService.getCurrentPeriod()` method mirrors the database logic:
- Checks subscription for explicit period dates
- Falls back to plan code detection
- Defaults to monthly if subscription not found

## Annual Plan Codes

- **Basic Annual**: `PLN_f5n4d3g6x7cb3or`
- **Professional Annual**: `PLN_zekf4yw2rvdy957`
- **Enterprise Annual**: `PLN_2w2w7d02awcarg9`

## Billing Periods

### Monthly Subscriptions
- **Period**: Current month (e.g., Dec 1 - Dec 31, 2025)
- **Usage Reset**: First day of each month
- **Example**: `2025-12-01` to `2025-12-31`

### Annual Subscriptions
- **Period**: Current year (e.g., Jan 1 - Dec 31, 2025)
- **Usage Reset**: January 1st of each year
- **Example**: `2025-01-01` to `2025-12-31`

## Implementation Details

### Database Functions

```sql
-- Get organization-specific billing period
get_organization_billing_period(organizationId) 
  → Returns monthly or annual period based on subscription

-- Increment usage (uses organization-specific period)
increment_usage_metric(organizationId, metric)
  → Automatically uses correct billing period

-- Decrement usage (uses organization-specific period)
decrement_usage_metric(organizationId, metric)
  → Automatically uses correct billing period
```

### Service Methods

```typescript
// Get current period based on subscription
getCurrentPeriod(organizationId: string): Promise<{periodStart: Date, periodEnd: Date}>
  → Returns monthly or annual period

// All usage tracking methods automatically use subscription-aware periods
getCurrentUsage(metric: string)
getAllCurrentUsage()
recalculateUsage(organizationId, metric)
```

## Benefits

1. **Accurate Tracking**: Annual subscribers' usage is tracked per year, not per month
2. **Automatic**: No manual configuration needed - detects from subscription
3. **Flexible**: Uses subscription's actual period dates when available
4. **Backward Compatible**: Falls back to monthly for free/default subscriptions

## Example Scenarios

### Scenario 1: Monthly Subscription
- **Plan Code**: `PLN_5jjsgz1ivndtnxp` (Basic Monthly)
- **Billing Period**: `2025-12-01` to `2025-12-31`
- **Usage Reset**: January 1st, 2026

### Scenario 2: Annual Subscription
- **Plan Code**: `PLN_f5n4d3g6x7cb3or` (Basic Annual)
- **Billing Period**: `2025-01-01` to `2025-12-31`
- **Usage Reset**: January 1st, 2026

### Scenario 3: Subscription with Explicit Dates
- **Plan Code**: `PLN_f5n4d3g6x7cb3or` (Basic Annual)
- **currentPeriodStart**: `2025-06-01`
- **currentPeriodEnd**: `2026-05-31`
- **Billing Period**: Uses explicit dates (`2025-06-01` to `2026-05-31`)

## Testing

### Verified Working ✅
- ✅ Annual plan code detection
- ✅ Yearly period calculation (Jan 1 - Dec 31)
- ✅ Monthly period calculation (month start - month end)
- ✅ Usage tracking with annual subscriptions
- ✅ Usage tracking with monthly subscriptions

### Test Results
```
Annual Subscription:
- Period: 2025-01-01 to 2025-12-31 (364 days)
- Usage increments correctly
- Usage decrements correctly

Monthly Subscription:
- Period: 2025-12-01 to 2025-12-31 (30 days)
- Usage increments correctly
- Usage decrements correctly
```

## Migration Status

✅ **Completed**:
- Database function `get_organization_billing_period()` created
- `increment_usage_metric()` updated to use organization-specific periods
- `decrement_usage_metric()` updated to use organization-specific periods
- Service-level `getCurrentPeriod()` updated to match database logic
- All usage tracking methods updated

## Edge Cases Handled

1. **No Active Subscription**: Falls back to monthly period (usage still tracked, but with default monthly period)
2. **Cancelled/Inactive Subscription**: Ignored - falls back to monthly period
3. **Subscription Without Period Dates**: Calculates based on plan code (only for active subscriptions)
4. **Plan Code Not Found**: Falls back to monthly period
5. **Multiple Active Subscriptions**: Uses first one found (shouldn't happen due to UNIQUE constraint on organizationId)
6. **Subscription Status Not 'active'**: Ignored - falls back to monthly period

## Important: Active Subscriptions Only

**Usage tracking is ONLY performed against active subscriptions.**

- ✅ **Active subscriptions** (`status = 'active'`): Usage tracked with subscription-specific billing period
- ❌ **Inactive subscriptions** (`status = 'cancelled'`, `'expired'`, `'past_due'`, etc.): Ignored - usage tracked with default monthly period
- ❌ **No subscription**: Usage tracked with default monthly period

This ensures that:
- Organizations with cancelled subscriptions don't get annual billing periods
- Usage tracking continues even when subscription is inactive (using monthly fallback)
- Only paying/active customers get subscription-specific billing periods

## Related Documentation

- `HYBRID_TRACKING_IMPLEMENTATION.md` - Overall tracking architecture
- `TRACKING_ARCHITECTURE_COMPARISON.md` - Performance comparison
- `FEATURE_USAGE_ANALYSIS.md` - Feature inventory
