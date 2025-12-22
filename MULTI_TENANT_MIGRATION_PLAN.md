# Multi-Tenant SaaS Migration Plan

## 🎯 **Overview**

This document outlines the comprehensive plan to migrate the ICS Dashboard from a single-tenant application to a multi-tenant SaaS platform where multiple organizations can independently use the system to manage their programs and projects.

## 📊 **Current Architecture Analysis**

### **Current State:**
- Single-tenant system (all data in one organization)
- Supabase Auth with custom user management
- Hierarchical role-based access control (6 levels)
- Project-scoped permissions
- No organization-level isolation

### **Key Tables Identified:**
1. **Core Entities:**
   - `users` - User accounts
   - `projects` - Project information
   - `activities` - Project activities
   - `outcomes` - Project outcomes
   - `kpis` - Key performance indicators

2. **Financial Data:**
   - `project_financial_data` - Project-level finances
   - `activity_financial_data` - Activity-level finances

3. **Forms & Data Collection:**
   - `forms` - Dynamic forms
   - `form_sections` - Form sections
   - `form_questions` - Form questions
   - `form_responses` - Form submissions
   - `form_question_responses` - Individual question responses
   - `media_attachments` - Form attachments

4. **Reports & Workflows:**
   - `reports` - Generated reports
   - `report_workflows` - Report workflow definitions

5. **Feedback System:**
   - `feedback_categories` - Feedback categories
   - `feedback_forms` - Feedback forms
   - `feedback_form_sections` - Feedback form sections
   - `feedback_questions` - Feedback questions
   - `feedback_submissions` - Feedback submissions
   - `feedback_status_history` - Status changes
   - `feedback_communications` - Communications log
   - `feedback_notes` - Internal notes

6. **Kobo Integration:**
   - `project_kobo_tables` - Kobo table mappings
   - `kobo_kpi_mappings` - Kobo to KPI mappings
   - `kobo_asset_tracking` - Kobo asset tracking

7. **Auth & Permissions:**
   - `roles` - System roles
   - `permissions` - System permissions
   - `user_roles` - User role assignments
   - `user_permissions` - Direct user permissions
   - `user_project_access` - Project access control

8. **Other:**
   - `activity_progress_entries` - Activity progress tracking
   - `form_templates` - Form templates

## 🏗️ **Multi-Tenancy Strategy**

### **Approach: Shared Database with Organization Isolation**

**Benefits:**
- Cost-effective (single database instance)
- Easier maintenance and updates
- Centralized analytics and reporting
- Simpler backup and disaster recovery

**Implementation:**
- Add `organization_id` to all tenant-scoped tables
- Use Row Level Security (RLS) policies for data isolation
- Organization context in JWT tokens
- Organization-aware queries in all services

### **Organization Model**

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL, -- URL-friendly identifier
  domain VARCHAR(255) UNIQUE, -- Optional custom domain
  logo_url TEXT,
  settings JSONB DEFAULT '{}', -- Organization-specific settings
  subscription_tier VARCHAR(50) DEFAULT 'free', -- free, basic, pro, enterprise
  subscription_status VARCHAR(50) DEFAULT 'active', -- active, suspended, cancelled
  subscription_expires_at TIMESTAMP,
  max_users INTEGER DEFAULT 10,
  max_projects INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_domain ON organizations(domain);
```

## 📋 **Migration Phases**

### **Phase 1: Database Schema Migration**

#### **1.1 Create Organizations Table**
- Create `organizations` table
- Migrate existing data to a default organization
- Create organization for existing users

#### **1.2 Add Organization ID to All Tables**

**Tables Requiring `organization_id`:**
1. `users` - Users belong to organizations
2. `projects` - Projects belong to organizations
3. `activities` - Inherits from projects
4. `outcomes` - Inherits from projects
5. `kpis` - Inherits from projects
6. `project_financial_data` - Inherits from projects
7. `activity_financial_data` - Inherits from projects
8. `forms` - Forms belong to organizations
9. `form_responses` - Inherits from forms
10. `reports` - Reports belong to organizations
11. `report_workflows` - Workflows belong to organizations
12. `feedback_forms` - Feedback forms belong to organizations
13. `feedback_submissions` - Inherits from feedback_forms
14. `project_kobo_tables` - Inherits from projects
15. `kobo_kpi_mappings` - Inherits from projects
16. `user_roles` - User roles within organization context
17. `user_permissions` - User permissions within organization
18. `user_project_access` - Already project-scoped, but needs org context

**Tables That May Be Global or Org-Specific:**
- `roles` - Can be global templates or org-specific: will be org specific
- `permissions` - Can be global templates or org-specific: will be org specific
- `feedback_categories` - Can be global templates or org-specific
- `form_templates` - Can be global templates or org-specific

**Migration SQL Pattern:**
```sql
-- Example for projects table
ALTER TABLE projects 
ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- Create default organization
INSERT INTO organizations (id, name, slug, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Default Organization',
  'default',
  NOW(),
  NOW()
);

-- Migrate existing data
UPDATE projects 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Make organization_id required
ALTER TABLE projects 
ALTER COLUMN organization_id SET NOT NULL;

-- Add index
CREATE INDEX idx_projects_organization_id ON projects(organization_id);
```

#### **1.3 Update Foreign Key Relationships**
- Ensure all foreign keys account for organization context
- Add composite indexes for (organization_id, id) where needed

#### **1.4 Row Level Security (RLS) Policies**

**Enable RLS on all tenant tables:**
```sql
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see projects from their organization
CREATE POLICY "Users can view projects in their organization"
ON projects FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

-- Policy: Users can only insert projects in their organization
CREATE POLICY "Users can insert projects in their organization"
ON projects FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

-- Similar policies for UPDATE and DELETE
```

**Note:** Since we're using Supabase Auth, we'll need to:
1. Store `organization_id` in user metadata or a separate table: it will be in the users table
2. Use service role for admin operations
3. Implement organization context in application layer

### **Phase 2: Authentication & Authorization Changes**

#### **2.1 User-Organization Relationship**

**Option A: Users belong to single organization (Recommended for MVP)**: this is what we will work with. users can belong to only a single org
```sql
ALTER TABLE users ADD COLUMN organization_id UUID REFERENCES organizations(id) NOT NULL;
```

**Option B: Users can belong to multiple organizations (Future enhancement)**
```sql
CREATE TABLE user_organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member', -- member, admin, owner
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);
```

**Recommendation:** Start with Option A, migrate to Option B later if needed.

#### **2.2 JWT Token Changes**

**Current JWT Payload:**
```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "roles": [...],
  "permissions": [...]
}
```

**New JWT Payload:**
```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "organization_id": "org-id",
  "organization_slug": "org-slug",
  "roles": [...],
  "permissions": [...]
}
```

#### **2.3 Login Flow Changes**

**Current Flow:**
1. User enters email/password
2. Authenticate with Supabase Auth
3. Get user profile
4. Load roles and permissions
5. Return JWT

**New Flow:**
1. User enters email/password
2. Authenticate with Supabase Auth
3. Get user profile (includes organization_id)
4. Load organization context
5. Load roles and permissions (scoped to organization)
6. Return JWT with organization context

**Multi-Organization Support (Future):**: NO
1. User enters email/password
2. Authenticate with Supabase Auth
3. Get user profile
4. Load all organizations user belongs to
5. User selects organization (or use primary)
6. Load roles and permissions for selected organization
7. Return JWT with organization context

#### **2.4 Organization Context Middleware**

Create middleware to:
- Extract organization_id from JWT
- Validate user has access to organization
- Set organization context for all queries
- Filter queries by organization_id automatically

### **Phase 3: Service Layer Updates**

#### **3.1 Update All Service Methods**

**Pattern for all services:**
```typescript
// Before
async getProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*');
  return data || [];
}

// After
async getProjects(organizationId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('organization_id', organizationId);
  return data || [];
}
```

**Services to Update:**
1. `supabaseProjectsService.ts`
2. `supabaseProjectDataService.ts` (activities, outcomes, kpis)
3. `supabaseFinancialService.ts`
4. `supabaseFormsService.ts`
5. `supabaseReportService.ts`
6. `supabaseFeedbackService.ts`
7. `supabaseKoboDataService.ts`
8. `supabaseUserManagementService.ts`
9. `supabasePermissionsService.ts`

#### **3.2 Organization Context Hook**

Create React hook to provide organization context:
```typescript
// useOrganizationContext.tsx
export const OrganizationContext = createContext<{
  organization: Organization | null;
  organizationId: string | null;
  switchOrganization: (orgId: string) => void;
}>({
  organization: null,
  organizationId: null,
  switchOrganization: () => {},
});

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return context;
};
```

#### **3.3 Update All Components**

- Extract organization_id from context
- Pass organization_id to all service calls
- Update data fetching logic
- Update form submissions

### **Phase 4: Role & Permission System**

#### **4.1 Organization-Scoped Roles**

**Option A: Global Roles with Organization Overrides**
- Keep global role templates
- Allow organizations to customize permissions
- Organization-specific role assignments

**Option B: Organization-Specific Roles (Recommended)**: THis is what we will work with
- Each organization has its own roles
- Roles can be copied from templates
- Full customization per organization

**Implementation:**
```sql
ALTER TABLE roles ADD COLUMN organization_id UUID REFERENCES organizations(id);
-- NULL = global template, UUID = organization-specific

ALTER TABLE user_roles ADD COLUMN organization_id UUID REFERENCES organizations(id) NOT NULL;
```

#### **4.2 Permission System**

**Global Permissions:**: 
- System-defined permissions (e.g., `projects:create`, `users:read`)
- Cannot be modified by organizations
- Used as templates

**Organization Permissions:**
- Organizations can enable/disable permissions
- Organizations can create custom permissions
- Permissions scoped to organization

### **Phase 5: Billing & Subscription**

#### **5.1 Subscription Tiers**

**Tiers:**
- **Free:** 5 users, 3 projects, basic features
- **Basic:** 25 users, 20 projects, advanced features
- **Pro:** 100 users, unlimited projects, all features
- **Enterprise:** Custom limits, dedicated support, SLA

#### **5.2 Subscription Management**

**Tables:**
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) UNIQUE NOT NULL,
  tier VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL, -- active, cancelled, past_due, trialing
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT false,
  stripe_subscription_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE subscription_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  metric VARCHAR(50) NOT NULL, -- users, projects, storage_gb
  count INTEGER NOT NULL,
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### **5.3 Usage Limits Enforcement**

- Check limits before creating resources
- Show usage in organization settings
- Warn when approaching limits
- Block actions when limits exceeded

### **Phase 6: Organization Management**

#### **6.1 Organization Settings**

**Features:**
- Organization profile (name, logo, domain)
- User management
- Role management
- Permission management
- Subscription management
- Usage statistics
- Billing information

#### **6.2 Organization Admin UI**

**Pages:**
- Organization dashboard
- Organization settings
- Team management
- Subscription & billing
- Usage & limits
- Audit logs

### **Phase 7: Data Migration**

#### **7.1 Existing Data Migration**

**Steps:**
1. Create default organization
2. Assign all existing users to default organization
3. Update all existing records with organization_id
4. Verify data integrity
5. Test RLS policies

**Migration Script:**
```sql
-- Create default organization
INSERT INTO organizations (id, name, slug, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Default Organization',
  'default',
  NOW(),
  NOW()
);

-- Update users
UPDATE users 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Update projects
UPDATE projects 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Continue for all tables...
```

### **Phase 8: Testing & Validation**

#### **8.1 Data Isolation Tests**

- Verify users can only see their organization's data
- Verify cross-organization access is blocked
- Test RLS policies
- Test service layer filters

#### **8.2 Multi-Organization Tests**

- Create multiple test organizations
- Verify independent operation
- Test organization switching (if implemented)
- Test billing and limits

#### **8.3 Performance Tests**

- Query performance with organization filters
- Index effectiveness
- RLS policy performance
- Concurrent multi-tenant operations

## 🔐 **Security Considerations**

### **1. Data Isolation**
- RLS policies on all tenant tables
- Application-level organization filtering
- No cross-organization data leakage

### **2. Authentication**
- Organization context in JWT
- Validate organization access on every request
- Organization switching requires re-authentication

### **3. Authorization**
- Organization-scoped permissions
- Role hierarchy within organization
- Project access within organization

### **4. API Security**
- Organization ID in all requests
- Validate organization ownership
- Audit logs per organization

## 📊 **Database Schema Changes Summary**

### **New Tables:**
1. `organizations` - Organization master table
2. `subscriptions` - Organization subscriptions
3. `subscription_usage` - Usage tracking

### **Modified Tables (Add organization_id):**
1. `users`
2. `projects`
3. `activities`
4. `outcomes`
5. `kpis`
6. `project_financial_data`
7. `activity_financial_data`
8. `forms`
9. `form_responses`
10. `reports`
11. `report_workflows`
12. `feedback_forms`
13. `feedback_submissions`
14. `project_kobo_tables`
15. `kobo_kpi_mappings`
16. `user_roles`
17. `user_permissions`
18. `roles` (nullable - for global templates)

### **New Indexes:**
- `idx_{table}_organization_id` on all tenant tables
- Composite indexes where needed: `(organization_id, id)`

### **New RLS Policies:**
- SELECT, INSERT, UPDATE, DELETE policies on all tenant tables
- Organization-scoped access control

## 🚀 **Implementation Timeline**

### **Week 1-2: Database Migration**
- Create organizations table
- Add organization_id to all tables
- Create migration scripts
- Test data migration

### **Week 3-4: Auth & Authorization**
- Update JWT payload
- Modify login flow
- Create organization context middleware
- Update permission system

### **Week 5-6: Service Layer**
- Update all service methods
- Add organization filtering
- Create organization context hook
- Update components

### **Week 7-8: Organization Management**
- Organization settings UI
- User management per organization
- Role management per organization
- Subscription management

### **Week 9-10: Testing & Polish**
- Comprehensive testing
- Performance optimization
- Documentation
- Deployment preparation

## 📝 **Migration Checklist**

### **Database:**
- [ ] Create organizations table
- [ ] Add organization_id to users
- [ ] Add organization_id to projects
- [ ] Add organization_id to all child tables
- [ ] Create indexes
- [ ] Create RLS policies
- [ ] Migrate existing data
- [ ] Verify data integrity

### **Backend:**
- [ ] Update JWT payload
- [ ] Modify login flow
- [ ] Create organization middleware
- [ ] Update all service methods
- [ ] Update permission checks
- [ ] Add organization validation

### **Frontend:**
- [ ] Create organization context
- [ ] Update all service calls
- [ ] Update components
- [ ] Organization settings UI
- [ ] Organization switching (if multi-org)
- [ ] Usage display

### **Testing:**
- [ ] Data isolation tests
- [ ] Multi-organization tests
- [ ] Performance tests
- [ ] Security tests
- [ ] Integration tests

## 🔄 **Rollback Plan**

If issues arise:
1. Disable RLS policies
2. Remove organization_id filters from queries
3. Revert JWT changes
4. Restore previous service implementations
5. Keep organization_id columns (nullable) for future migration

## 📚 **Additional Considerations**

### **1. Custom Domains**
- Allow organizations to use custom domains
- Subdomain routing (org-slug.yourdomain.com)
- Domain verification

### **2. Organization Templates**
- Pre-configured organization setups
- Industry-specific templates
- Quick start templates

### **3. Organization Analytics**
- Usage analytics per organization
- Performance metrics
- Cost tracking

### **4. White-Labeling**
- Custom branding per organization
- Custom themes
- Custom email templates

### **5. API Access**
- Organization-specific API keys
- Rate limiting per organization
- API usage tracking

## 🎯 **Success Criteria**

1. ✅ Multiple organizations can operate independently
2. ✅ Complete data isolation between organizations
3. ✅ Users can only access their organization's data
4. ✅ Billing and subscription management works
5. ✅ Performance is acceptable with multiple tenants
6. ✅ Security is maintained across all tenants
7. ✅ Migration of existing data is successful
8. ✅ All features work in multi-tenant context

