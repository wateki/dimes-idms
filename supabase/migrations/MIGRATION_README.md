# Multi-Tenant Migration Files

This directory contains all migration files for converting the ICS Dashboard to a multi-tenant SaaS platform.

## Migration Order

The migrations must be run in the following order:

1. **20250101000001_create_organizations_table.sql**
   - Creates the `organizations` table
   - Sets up organization/tenant structure

2. **20250101000002_add_organization_id_to_users.sql**
   - Adds `organization_id` to `users` table
   - Creates default organization
   - Migrates existing users to default organization

3. **20250101000003_add_organization_id_to_core_tables.sql**
   - Adds `organization_id` to: `projects`, `activities`, `outcomes`, `kpis`, `activity_progress_entries`
   - Migrates existing data based on project creators

4. **20250101000004_add_organization_id_to_financial_tables.sql**
   - Adds `organization_id` to: `project_financial_data`, `activity_financial_data`
   - Migrates existing financial data

5. **20250101000005_add_organization_id_to_forms_tables.sql**
   - Adds `organization_id` to: `forms`, `form_responses`, `form_question_responses`, `media_attachments`
   - Adds nullable `organization_id` to `form_templates` (can be global or org-specific)

6. **20250101000006_add_organization_id_to_reports_tables.sql**
   - Adds `organization_id` to: `reports`, `report_workflows`

7. **20250101000007_add_organization_id_to_feedback_tables.sql**
   - Adds `organization_id` to: `feedback_forms`, `feedback_submissions`, `feedback_status_history`, `feedback_communications`, `feedback_notes`
   - Adds nullable `organization_id` to `feedback_categories` (can be global or org-specific)

8. **20250101000008_add_organization_id_to_kobo_tables.sql**
   - Adds `organization_id` to: `project_kobo_tables`, `kobo_kpi_mappings`

9. **20250101000009_add_organization_id_to_auth_tables.sql**
   - Adds nullable `organization_id` to: `roles`, `permissions` (global templates or org-specific)
   - Adds `organization_id` to: `user_roles`, `user_permissions`, `user_project_access`

10. **20250101000010_create_rls_helper_function.sql**
    - Creates `get_user_organization_id()` helper function
    - Used by RLS policies to get current user's organization

11. **20250101000011_enable_rls_and_create_policies.sql**
    - Enables Row Level Security on all tenant tables
    - Creates SELECT, INSERT, UPDATE, DELETE policies for all tables
    - Ensures complete data isolation between organizations

12. **20250101000012_create_subscription_tables.sql**
    - Creates `subscriptions` table for billing management
    - Creates `subscription_usage` table for usage tracking
    - Sets up RLS policies for subscription tables

## Running the Migrations

### Using Supabase CLI (Local Development)

```bash
# Apply all migrations
supabase db reset

# Or apply migrations incrementally
supabase migration up
```

### Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run each migration file in order
4. Verify each migration completes successfully

### Using psql

```bash
# Connect to your database
psql -h <host> -U <user> -d <database>

# Run migrations in order
\i 20250101000001_create_organizations_table.sql
\i 20250101000002_add_organization_id_to_users.sql
# ... continue for all files
```

## Important Notes

### Default Organization

All existing data will be migrated to a default organization with:
- ID: `default-org-00000000-0000-0000-0000-000000000001`
- Name: "Default Organization"
- Slug: "default"

### Data Migration Strategy

- **Users**: Assigned to default organization
- **Projects**: Assigned based on creator's organization
- **Child records**: Inherit organization from parent (e.g., activities from projects)
- **Standalone records**: Assigned based on creator's organization or default

### RLS Policies

All RLS policies use the `get_user_organization_id()` function which:
- Gets the current authenticated user's `auth_user_id` from `auth.uid()`
- Looks up the user's `organization_id` from the `users` table
- Returns the organization ID for policy checks

**Important**: The RLS policies require that:
1. Users are authenticated via Supabase Auth
2. The `users` table has a matching record with `auth_user_id` set
3. The user has an `organization_id` assigned

### Testing After Migration

1. **Verify default organization exists:**
   ```sql
   SELECT * FROM organizations WHERE slug = 'default';
   ```

2. **Check all users have organizationId:**
   ```sql
   SELECT COUNT(*) FROM users WHERE organizationId IS NULL;
   -- Should return 0
   ```

3. **Verify data migration:**
   ```sql
   SELECT COUNT(*) FROM projects WHERE organizationId IS NULL;
   -- Should return 0
   ```

4. **Test RLS policies:**
   - Log in as a user
   - Verify they can only see their organization's data
   - Verify they cannot see other organizations' data

## Rollback

If you need to rollback:

1. **Disable RLS policies:**
   ```sql
   ALTER TABLE <table_name> DISABLE ROW LEVEL SECURITY;
   ```

2. **Remove organization_id columns (if needed):**
   ```sql
   ALTER TABLE <table_name> DROP COLUMN organization_id;
   ```

3. **Drop organizations table:**
   ```sql
   DROP TABLE IF EXISTS organizations CASCADE;
   ```

**Warning**: Rolling back will require manual data cleanup. Consider backing up your database before running migrations.

## Next Steps

After running migrations:

1. Update application code to use organization context
2. Update all service methods to filter by `organization_id`
3. Create organization management UI
4. Implement subscription and billing logic
5. Test multi-tenant data isolation

See `MULTI_TENANT_IMPLEMENTATION_GUIDE.md` for code implementation details.

