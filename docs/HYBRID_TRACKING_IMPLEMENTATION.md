# Hybrid Usage Tracking Implementation

## Overview

This document describes the hybrid approach to usage tracking, combining database-level triggers for simple operations with service-level tracking for complex logic.

## Architecture

### Database-Level Triggers (Simple Operations)

**Handled Automatically by Database Triggers:**
- ✅ Projects (create/delete) - All projects tracked (active and archived)
- ✅ Forms (create/delete) - All forms tracked (active and archived)
- ✅ Form Responses (create/delete) - All responses tracked (complete and incomplete)
- ✅ Reports (create/delete)
- ✅ Feedback Forms (create/delete)
- ✅ Feedback Submissions (create/delete)
- ✅ Kobo Tables (create/delete)
- ✅ Strategic Plans (create/delete)

**Benefits:**
- **Atomic**: All operations succeed or fail together
- **Fast**: ~5ms overhead vs ~50ms with service-level
- **Consistent**: No data drift possible
- **Automatic**: No code changes needed in services

### Service-Level Tracking (Complex Logic)

**Handled by Service Code:**
- ✅ User isActive changes (need to check previous state)
- ✅ Storage calculations (need file size from application)

**Benefits:**
- **Flexible**: Can add complex conditional logic
- **Debuggable**: Easy to add logging and breakpoints
- **Testable**: Can mock services for unit tests

## Migration Details

### Migration File
`supabase/migrations/20250124000001_add_usage_tracking_triggers.sql`

### What It Does
1. Creates helper functions:
   - `get_current_billing_period()` - Returns current month's start/end
   - `increment_usage_metric()` - Increments usage count atomically
   - `decrement_usage_metric()` - Decrements usage count atomically

2. Creates triggers for:
   - Projects (INSERT/DELETE)
   - Forms (INSERT/DELETE)
   - Reports (INSERT/DELETE)
   - Feedback Forms (INSERT/DELETE)
   - Feedback Submissions (INSERT/DELETE)
   - Kobo Tables (INSERT/DELETE)
   - Strategic Plans (INSERT/DELETE)

### Column Name Notes
- `projects`: Uses `organizationId` (camelCase)
- `forms`: Uses `organizationId` (camelCase)
- `reports`: Uses `organizationId` (camelCase)
- `feedback_forms`: Uses `organizationId` (camelCase)
- `feedback_submissions`: Uses `organizationId` (camelCase)
- `project_kobo_tables`: Uses `organizationId` (camelCase)
- `strategic_plans`: Uses `organizationId` (camelCase)

## Service Changes

### Removed Service-Level Tracking

The following services have had their tracking calls removed (now handled by triggers):

1. **supabaseProjectsService.ts**
   - Removed tracking from `createProject()`
   - Removed tracking from `deleteProject()`

2. **supabaseFormsService.ts**
   - Removed tracking from `createForm()`
   - Removed tracking from `deleteForm()`
   - Removed tracking from `createResponse()` (now handled by trigger)
   - Removed tracking from `updateFormResponse()` (no longer tracks status changes)
   - Removed tracking from `deleteFormResponse()` (now handled by trigger)

3. **supabaseReportService.ts**
   - Removed tracking from `uploadReportFile()` (reports count)
   - Removed tracking from `deleteReportFile()` (reports count)
   - **Kept** storage tracking (needs file size calculation)

4. **supabaseFeedbackService.ts**
   - Removed tracking from `createForm()` (feedback_forms)
   - Removed tracking from `deleteForm()` (feedback_forms)
   - Removed tracking from `createSubmission()` (feedback_submissions)
   - Removed tracking from `deleteSubmission()` (feedback_submissions)

5. **supabaseKoboDataService.ts**
   - Removed tracking from `createProjectKoboTable()`
   - Removed tracking from `deleteProjectKoboTable()`

6. **supabaseStrategicPlanService.ts**
   - Removed tracking from `createStrategicPlan()`
   - Removed tracking from `deleteStrategicPlan()`

### Kept Service-Level Tracking

The following services still use service-level tracking (complex logic):

1. **supabaseUserManagementService.ts**
   - `createUser()` - Increments users count
   - `updateUser()` - Handles isActive status changes
   - `deleteUser()` - Decrements users count

2. **supabaseFormsService.ts**
   - `uploadMediaFile()` - Tracks storage_gb (needs file size)
   - `uploadDirectMediaFile()` - Tracks storage_gb (needs file size)
   - `deleteMediaFile()` - Decrements storage_gb (needs file size)

3. **supabaseReportService.ts**
   - `uploadReportFile()` - Tracks storage_gb (needs file size)
   - `deleteReportFile()` - Decrements storage_gb (needs file size)

## Important Notes

### All Projects, Forms, and Responses Are Tracked

**Both active and archived projects/forms are tracked** because they:
- Occupy database storage
- Consume backup resources
- Require maintenance
- May be reactivated

**All form responses (complete and incomplete) are tracked** because:
- Submissions are typically made after completion (majority are complete)
- All responses occupy database storage
- Incomplete responses may be completed later
- Simpler tracking logic (no need to check isComplete status)

The triggers do not filter by status - they track all INSERT/DELETE operations.

### Recalculation

The `recalculateUsage()` function in `supabaseUsageTrackingService.ts` has been updated to count **all** projects, forms, and form responses (not just active/complete ones), matching the trigger behavior.

### Active Subscriptions Only

**Important**: Usage tracking is only performed against **active subscriptions**. 

- The `get_organization_billing_period()` function filters for `status = 'active'`
- Cancelled, expired, or inactive subscriptions are ignored
- Organizations without active subscriptions fall back to monthly billing periods
- This ensures only paying customers get subscription-specific billing periods (annual vs monthly)

## Performance Improvements

### Expected Improvements
- **Latency**: ~45% faster for create/delete operations
- **Throughput**: ~50% higher (90-120 ops/sec vs 50-80 ops/sec)
- **Database Queries**: ~66% fewer (1 query vs 3 queries per operation)
- **Consistency**: 100% (atomic operations)

### Example Performance

**Before (Service-Level)**:
```
Create Project: ~100ms
  - Insert project: 50ms
  - Get/create usage record: 30ms
  - Update usage: 20ms
```

**After (Database Trigger)**:
```
Create Project: ~55ms
  - Insert project: 50ms
  - Trigger execution: 5ms (automatic, same transaction)
```

## Testing

### Manual Testing

1. **Create a project**:
   ```typescript
   await supabaseProjectsService.createProject({...});
   // Check subscription_usage table - should see projects count incremented
   ```

2. **Delete a project**:
   ```typescript
   await supabaseProjectsService.deleteProject(projectId);
   // Check subscription_usage table - should see projects count decremented
   ```

3. **Create a form**:
   ```typescript
   await supabaseFormsService.createForm({...});
   // Check subscription_usage table - should see forms count incremented
   ```

### Verification

Check the `subscription_usage` table:
```sql
SELECT * FROM subscription_usage 
WHERE organizationId = 'your-org-id' 
  AND metric = 'projects'
  AND periodStart >= date_trunc('month', CURRENT_DATE);
```

## Rollback Plan

If issues arise, you can:

1. **Disable triggers**:
   ```sql
   DROP TRIGGER IF EXISTS track_project_insert ON projects;
   DROP TRIGGER IF EXISTS track_project_delete ON projects;
   -- Repeat for other tables
   ```

2. **Re-enable service-level tracking**:
   - Restore the tracking calls in the service files
   - The service-level tracking code is still available in git history

## Next Steps

1. ✅ Migration created
2. ✅ Service code updated
3. ⏳ Apply migration to database
4. ⏳ Test end-to-end
5. ⏳ Monitor performance improvements
6. ⏳ Verify usage counts match actual data

## Related Documentation

- `TRACKING_ARCHITECTURE_COMPARISON.md` - Detailed performance comparison
- `FEATURE_USAGE_ANALYSIS.md` - Feature inventory and tracking requirements
- `USAGE_TRACKING_IMPLEMENTATION.md` - Original service-level implementation

