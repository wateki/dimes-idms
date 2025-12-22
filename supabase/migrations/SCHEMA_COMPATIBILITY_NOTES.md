# Schema Compatibility Notes

## Key Findings from Database Inspection

### Column Naming Convention
- **Primary convention**: **camelCase** (e.g., `projectId`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `isActive`, `lastLoginAt`)
- **Exception**: `auth_user_id` uses snake_case (already exists in users table)

### ID Column Types
- All `id` columns are **`text`** type, NOT `UUID`
- This means `organization_id` should also be `text` type to match
- Foreign key references should use `text` type

### Foreign Key Column Names
- Use camelCase: `projectId`, `formId`, `responseId`, `activityId`, etc.
- Example: `kobo_kpi_mappings.projectKoboTableId` (not `table_id`)

### Missing Tables That Need organization_id
1. `sub_activities` - inherits from activities
2. `milestones` - inherits from activities  
3. `form_workflows` - inherits from forms/form_responses
4. `form_analytics` - inherits from forms
5. `form_permissions` - inherits from forms
6. `report_approval_steps` - inherits from report_workflows
7. `report_comments` - inherits from report_workflows
8. `report_workflow_status_history` - inherits from report_workflows
9. `report_workflow_versions` - inherits from report_workflows
10. `strategic_plans` - organization-level (needs organization_id)
11. `strategic_goals` - inherits from strategic_plans
12. `strategic_subgoals` - inherits from strategic_goals
13. `strategic_kpis` - inherits from strategic_subgoals

## Migration Updates Required

1. Change `organization_id` type from `UUID` to `text`
2. Change column name from `organization_id` to `organizationId` (camelCase)
3. Update all foreign key references to use camelCase
4. Add missing tables to migrations
5. Update RLS helper function to use camelCase
6. Update all SQL queries to use camelCase column names

