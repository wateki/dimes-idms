# Schema Compatibility Updates Summary

## Overview
All migration files have been updated to match the actual database schema conventions discovered through Supabase MCP inspection.

## Key Changes Made

### 1. Column Naming Convention
- **Changed from**: `organization_id` (snake_case)
- **Changed to**: `organizationId` (camelCase)
- **Reason**: Database uses camelCase for all columns (e.g., `projectId`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`)

### 2. ID Column Types
- **Changed from**: `UUID` type
- **Changed to**: `TEXT` type
- **Reason**: All `id` columns in the database are `text` type, not `UUID`

### 3. Foreign Key Column Names
- **Updated all references** to use camelCase:
  - `projectId` (not `project_id`)
  - `formId` (not `form_id`)
  - `responseId` (not `response_id`)
  - `activityId` (not `activity_id`)
  - `projectKoboTableId` (not `table_id`)

### 4. Default Organization ID
- **Changed from**: `'00000000-0000-0000-0000-000000000001'` (UUID format)
- **Changed to**: `'default-org-00000000-0000-0000-0000-000000000001'` (text format)

### 5. Organizations Table Schema
- Updated to use camelCase column names:
  - `logoUrl` (not `logo_url`)
  - `subscriptionTier` (not `subscription_tier`)
  - `subscriptionStatus` (not `subscription_status`)
  - `subscriptionExpiresAt` (not `subscription_expires_at`)
  - `maxUsers` (not `max_users`)
  - `maxProjects` (not `max_projects`)
  - `isActive` (not `is_active`)
  - `createdAt` (not `created_at`)
  - `updatedAt` (not `updated_at`)
  - `createdBy` (not `created_by`)

### 6. Added Missing Tables
The following tables were added to migrations:
- `sub_activities` - inherits from activities
- `milestones` - inherits from activities
- `form_workflows` - inherits from forms/form_responses
- `form_analytics` - inherits from forms
- `form_permissions` - inherits from forms
- `report_approval_steps` - inherits from report_workflows
- `report_comments` - inherits from report_workflows
- `report_workflow_status_history` - inherits from report_workflows
- `report_workflow_versions` - inherits from report_workflows
- `strategic_plans` - organization-level
- `strategic_goals` - inherits from strategic_plans
- `strategic_subgoals` - inherits from strategic_goals
- `strategic_kpis` - inherits from strategic_subgoals

### 7. RLS Helper Function
- **Function name**: Remains `get_user_organization_id()` (snake_case is fine for function names)
- **Return type**: Changed from `UUID` to `TEXT`
- **Column reference**: Changed to `organizationId` (camelCase)

### 8. RLS Policies
- All policies updated to use `organizationId` (camelCase)
- Added RLS policies for all newly added tables
- All policies use `get_user_organization_id()` function

## Migration Files Updated

1. ✅ `20250101000001_create_organizations_table.sql`
2. ✅ `20250101000002_add_organization_id_to_users.sql`
3. ✅ `20250101000003_add_organization_id_to_core_tables.sql`
4. ✅ `20250101000004_add_organization_id_to_financial_tables.sql`
5. ✅ `20250101000005_add_organization_id_to_forms_tables.sql`
6. ✅ `20250101000006_add_organization_id_to_reports_tables.sql`
7. ✅ `20250101000007_add_organization_id_to_feedback_tables.sql`
8. ✅ `20250101000008_add_organization_id_to_kobo_tables.sql`
9. ✅ `20250101000009_add_organization_id_to_auth_tables.sql`
10. ✅ `20250101000009b_add_organization_id_to_strategic_tables.sql` (NEW)
11. ✅ `20250101000010_create_rls_helper_function.sql`
12. ✅ `20250101000011_enable_rls_and_create_policies.sql`
13. ✅ `20250101000012_create_subscription_tables.sql`

## Verification Checklist

Before running migrations, verify:
- [ ] All column names use camelCase
- [ ] All ID types are `TEXT` (not `UUID`)
- [ ] All foreign key references use camelCase column names
- [ ] Default organization ID uses text format
- [ ] RLS helper function returns `TEXT`
- [ ] All RLS policies reference `organizationId` (camelCase)

## Testing Recommendations

After running migrations:
1. Verify organizations table created with correct schema
2. Check default organization exists with correct ID format
3. Verify all tables have `organizationId` column (camelCase, TEXT type)
4. Test RLS policies by querying as different users
5. Verify data migration assigned all existing records to default organization

