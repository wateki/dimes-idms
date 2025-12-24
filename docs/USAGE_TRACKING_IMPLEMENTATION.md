# Usage Tracking Implementation

## Overview
This document describes the implementation of usage tracking for all system features as per `FEATURE_USAGE_ANALYSIS.md` section 3.2. The tracking mechanism is now fully integrated into all relevant services.

---

## Implementation Summary

### ✅ Completed: Usage Tracking Service
**File**: `dimes-idms/src/services/supabaseUsageTrackingService.ts`

**Features**:
- `incrementUsage(metric, amount)` - Increment usage count for a metric
- `decrementUsage(metric, amount)` - Decrement usage count for a metric
- `setUsage(metric, count)` - Set usage count (for recalculation)
- `getCurrentUsage(metric)` - Get current usage for a metric
- `getAllCurrentUsage()` - Get all current usage metrics
- `recalculateUsage(metric)` - Recalculate usage by counting actual records
- `recalculateAllUsage()` - Recalculate all usage metrics

**Metrics Tracked**:
1. `users` - Total active users
2. `projects` - Total active projects
3. `forms` - Total forms created
4. `form_responses` - Total completed form responses
5. `reports` - Total reports uploaded
6. `feedback_forms` - Total feedback forms created
7. `feedback_submissions` - Total feedback submissions
8. `kobo_tables` - Total Kobo tables assigned
9. `strategic_plans` - Total strategic plans
10. `storage_gb` - Total storage used (media + reports) in GB

**Period Management**:
- Tracks usage per monthly billing period
- Automatically creates usage records for current period if they don't exist
- Uses `periodStart` and `periodEnd` to track monthly cycles

---

## Service Integration

### ✅ User Management Service
**File**: `dimes-idms/src/services/supabaseUserManagementService.ts`

**Tracking Points**:
- ✅ `createUser()` - Increments `users` if user is active
- ✅ `updateUser()` - Handles `isActive` changes (increment/decrement)
- ✅ `deleteUser()` - Decrements `users` if user was active

**Logic**:
- Only tracks active users (`isActive = true`)
- Tracks status changes when `isActive` is updated

---

### ✅ Projects Service
**File**: `dimes-idms/src/services/supabaseProjectsService.ts`

**Tracking Points**:
- ✅ `createProject()` - Increments `projects`
- ✅ `deleteProject()` - Decrements `projects`

---

### ✅ Forms Service
**File**: `dimes-idms/src/services/supabaseFormsService.ts`

**Tracking Points**:
- ✅ `createForm()` - Increments `forms`
- ✅ `deleteForm()` - Decrements `forms`
- ✅ `createResponse()` - Increments `form_responses` if `isComplete = true`
- ✅ `updateFormResponse()` - Handles `isComplete` changes (increment/decrement)
- ✅ `deleteFormResponse()` - Decrements `form_responses` if response was complete
- ✅ `uploadMediaFile()` - Increments `storage_gb` (calculates from file size)
- ✅ `uploadDirectMediaFile()` - Increments `storage_gb` (calculates from file size)
- ✅ `deleteMediaFile()` - Decrements `storage_gb` (calculates from file size)

**Logic**:
- Only tracks completed form responses (`isComplete = true`)
- Tracks storage in GB (bytes / 1024³)
- Handles status changes when responses are completed/uncompleted

---

### ✅ Reports Service
**File**: `dimes-idms/src/services/supabaseReportService.ts`

**Tracking Points**:
- ✅ `uploadReportFile()` - Increments `reports` and `storage_gb`
- ✅ `deleteReportFile()` - Decrements `reports` and `storage_gb`

**Logic**:
- Tracks both report count and storage usage
- Calculates storage from file size

---

### ✅ Feedback Service
**File**: `dimes-idms/src/services/supabaseFeedbackService.ts`

**Tracking Points**:
- ✅ `createForm()` - Increments `feedback_forms`
- ✅ `deleteForm()` - Decrements `feedback_forms`
- ✅ `createSubmission()` - Increments `feedback_submissions`
- ✅ `deleteSubmission()` - Decrements `feedback_submissions`

---

### ✅ Kobo Data Service
**File**: `dimes-idms/src/services/supabaseKoboDataService.ts`

**Tracking Points**:
- ✅ `createProjectKoboTable()` - Increments `kobo_tables`
- ✅ `deleteProjectKoboTable()` - Decrements `kobo_tables`

---

### ✅ Strategic Plans Service
**File**: `dimes-idms/src/services/supabaseStrategicPlanService.ts`

**Tracking Points**:
- ✅ `createStrategicPlan()` - Increments `strategic_plans`
- ✅ `deleteStrategicPlan()` - Decrements `strategic_plans`

---

## Database Schema

The tracking uses the existing `subscription_usage` table:

```sql
CREATE TABLE public.subscription_usage (
  id TEXT PRIMARY KEY,
  organizationId TEXT REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  metric VARCHAR(50) NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  periodStart TIMESTAMP NOT NULL,
  periodEnd TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW(),
  UNIQUE(organizationId, metric, periodStart, periodEnd)
);
```

**Indexes**:
- `idx_subscription_usage_organizationId` on `organizationId`
- `idx_subscription_usage_metric` on `metric`
- `idx_subscription_usage_period` on `periodStart, periodEnd`

---

## Usage Patterns

### Increment Pattern
```typescript
// After successful resource creation
try {
  await supabaseUsageTrackingService.incrementUsage('metric_name');
} catch (error) {
  console.error('Failed to track usage:', error);
  // Don't throw - tracking failure shouldn't break main operation
}
```

### Decrement Pattern
```typescript
// After successful resource deletion
try {
  await supabaseUsageTrackingService.decrementUsage('metric_name');
} catch (error) {
  console.error('Failed to track usage:', error);
  // Don't throw - tracking failure shouldn't break main operation
}
```

### Status Change Pattern
```typescript
// When resource status changes (e.g., isActive, isComplete)
const wasActive = currentResource.isActive;
const isNowActive = updateData.isActive;

if (!wasActive && isNowActive) {
  await supabaseUsageTrackingService.incrementUsage('metric_name');
} else if (wasActive && !isNowActive) {
  await supabaseUsageTrackingService.decrementUsage('metric_name');
}
```

### Storage Tracking Pattern
```typescript
// For file uploads
const fileSizeGB = file.size / (1024 * 1024 * 1024);
await supabaseUsageTrackingService.incrementUsage('storage_gb', fileSizeGB);

// For file deletions
const fileSizeGB = parseInt(file.fileSize || '0', 10) / (1024 * 1024 * 1024);
if (fileSizeGB > 0) {
  await supabaseUsageTrackingService.decrementUsage('storage_gb', fileSizeGB);
}
```

---

## Error Handling

**Design Decision**: Tracking failures are logged but do not throw errors. This ensures that:
- Main operations (create, update, delete) are not blocked by tracking issues
- System remains functional even if tracking service has issues
- Errors are logged for debugging and monitoring

**Error Logging**:
- All tracking errors are logged with `console.error`
- Includes context about which operation failed
- Does not interrupt the main operation flow

---

## Recalculation

The service includes a `recalculateUsage()` method that can:
- Count actual records in the database
- Update usage records to match reality
- Useful for:
  - Initial setup
  - Data reconciliation
  - Fixing discrepancies

**Usage**:
```typescript
// Recalculate a specific metric
await supabaseUsageTrackingService.recalculateUsage('users');

// Recalculate all metrics
await supabaseUsageTrackingService.recalculateAllUsage();
```

---

## Period Management

**Current Period**: Monthly billing cycle
- `periodStart`: First day of current month (00:00:00)
- `periodEnd`: Last day of current month (23:59:59)

**Automatic Record Creation**:
- If no usage record exists for current period, one is automatically created
- Initial count is set to 0
- Subsequent operations increment/decrement from this base

---

## Testing Recommendations

### Manual Testing
1. **Create Resources**: Create users, projects, forms, etc. and verify usage increments
2. **Delete Resources**: Delete resources and verify usage decrements
3. **Status Changes**: Activate/deactivate users, complete/uncomplete responses
4. **Storage**: Upload/delete files and verify storage_gb tracking
5. **Period Boundaries**: Test behavior at month boundaries

### Verification Queries
```sql
-- Check current usage for an organization
SELECT * FROM subscription_usage
WHERE organizationId = 'your-org-id'
  AND periodStart >= date_trunc('month', CURRENT_DATE)
  AND periodEnd <= date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day'
ORDER BY metric;

-- Recalculate usage manually
-- (Use the recalculateUsage method in the service)
```

---

## Next Steps

### Phase 2: Access Control & Gating
Once tracking is verified end-to-end:
1. Add limit checking before create operations
2. Add UI indicators for usage and limits
3. Add upgrade prompts when limits are reached
4. Implement hard/soft limits based on subscription tier

### Phase 3: Usage Dashboard
1. Create usage dashboard component
2. Display current usage vs. limits
3. Show usage trends over time
4. Add usage alerts and notifications

---

## Notes

- **Storage Calculation**: Storage is tracked in GB with 2 decimal precision
- **Active Users Only**: Only users with `isActive = true` are counted
- **Completed Responses Only**: Only form responses with `isComplete = true` are counted
- **Period-Based**: All usage is tracked per monthly billing period
- **Non-Blocking**: Tracking failures do not block main operations

---

## Files Modified

1. ✅ `dimes-idms/src/services/supabaseUsageTrackingService.ts` (NEW)
2. ✅ `dimes-idms/src/services/supabaseUserManagementService.ts`
3. ✅ `dimes-idms/src/services/supabaseProjectsService.ts`
4. ✅ `dimes-idms/src/services/supabaseFormsService.ts`
5. ✅ `dimes-idms/src/services/supabaseReportService.ts`
6. ✅ `dimes-idms/src/services/supabaseFeedbackService.ts`
7. ✅ `dimes-idms/src/services/supabaseKoboDataService.ts`
8. ✅ `dimes-idms/src/services/supabaseStrategicPlanService.ts`

---

## Verification Checklist

- [ ] Test user creation/deletion tracking
- [ ] Test project creation/deletion tracking
- [ ] Test form creation/deletion tracking
- [ ] Test form response completion tracking
- [ ] Test report upload/delete tracking
- [ ] Test feedback form/submission tracking
- [ ] Test Kobo table assignment/deletion tracking
- [ ] Test strategic plan creation/deletion tracking
- [ ] Test storage tracking (media upload/delete)
- [ ] Test storage tracking (report upload/delete)
- [ ] Test status change tracking (user isActive, response isComplete)
- [ ] Verify period-based tracking (monthly cycles)
- [ ] Test recalculateUsage for all metrics
- [ ] Verify error handling (tracking failures don't break operations)

