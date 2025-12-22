# Multi-Tenant Implementation Guide

## 📋 **Quick Reference**

This guide provides step-by-step implementation details for the multi-tenant migration.

## 🗄️ **Database Migrations**

### **Migration 1: Create Organizations Table**

```sql
-- Create organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  domain VARCHAR(255) UNIQUE,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  subscription_tier VARCHAR(50) DEFAULT 'free',
  subscription_status VARCHAR(50) DEFAULT 'active',
  subscription_expires_at TIMESTAMP,
  max_users INTEGER DEFAULT 10,
  max_projects INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_domain ON organizations(domain) WHERE domain IS NOT NULL;
CREATE INDEX idx_organizations_active ON organizations(is_active) WHERE is_active = true;
```

### **Migration 2: Add Organization ID to Users**

```sql
-- Add organization_id to users
ALTER TABLE users 
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT;

-- Create default organization for migration
INSERT INTO organizations (id, name, slug, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Default Organization',
  'default',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Migrate existing users
UPDATE users 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Make organization_id required
ALTER TABLE users 
ALTER COLUMN organization_id SET NOT NULL;

-- Add index
CREATE INDEX idx_users_organization_id ON users(organization_id);

-- Add composite index for common queries
CREATE INDEX idx_users_org_active ON users(organization_id, is_active) WHERE is_active = true;
```

### **Migration 3: Add Organization ID to Projects**

```sql
-- Add organization_id to projects
ALTER TABLE projects 
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT;

-- Migrate existing projects
UPDATE projects 
SET organization_id = (
  SELECT organization_id FROM users WHERE users.id = projects.created_by LIMIT 1
)
WHERE organization_id IS NULL;

-- Set to default org if no creator found
UPDATE projects 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Make organization_id required
ALTER TABLE projects 
ALTER COLUMN organization_id SET NOT NULL;

-- Add index
CREATE INDEX idx_projects_organization_id ON projects(organization_id);

-- Add composite index
CREATE INDEX idx_projects_org_status ON projects(organization_id, status);
```

### **Migration 4: Add Organization ID to All Child Tables**

```sql
-- Activities (inherits from projects)
ALTER TABLE activities 
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT;

UPDATE activities 
SET organization_id = (
  SELECT organization_id FROM projects WHERE projects.id = activities.project_id
)
WHERE organization_id IS NULL;

ALTER TABLE activities ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX idx_activities_organization_id ON activities(organization_id);

-- Outcomes (inherits from projects)
ALTER TABLE outcomes 
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT;

UPDATE outcomes 
SET organization_id = (
  SELECT organization_id FROM projects WHERE projects.id = outcomes.project_id
)
WHERE organization_id IS NULL;

ALTER TABLE outcomes ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX idx_outcomes_organization_id ON outcomes(organization_id);

-- KPIs (inherits from projects)
ALTER TABLE kpis 
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT;

UPDATE kpis 
SET organization_id = (
  SELECT organization_id FROM projects WHERE projects.id = kpis.project_id
)
WHERE organization_id IS NULL;

ALTER TABLE kpis ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX idx_kpis_organization_id ON kpis(organization_id);

-- Project Financial Data (inherits from projects)
ALTER TABLE project_financial_data 
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT;

UPDATE project_financial_data 
SET organization_id = (
  SELECT organization_id FROM projects WHERE projects.id = project_financial_data.project_id
)
WHERE organization_id IS NULL;

ALTER TABLE project_financial_data ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX idx_project_financial_data_organization_id ON project_financial_data(organization_id);

-- Activity Financial Data (inherits from project_financial_data)
ALTER TABLE activity_financial_data 
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT;

UPDATE activity_financial_data 
SET organization_id = (
  SELECT organization_id FROM project_financial_data 
  WHERE project_financial_data.id = activity_financial_data.project_financial_id
)
WHERE organization_id IS NULL;

ALTER TABLE activity_financial_data ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX idx_activity_financial_data_organization_id ON activity_financial_data(organization_id);

-- Forms (belongs to organization)
ALTER TABLE forms 
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT;

UPDATE forms 
SET organization_id = (
  SELECT organization_id FROM users WHERE users.id = forms.created_by LIMIT 1
)
WHERE organization_id IS NULL;

UPDATE forms 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

ALTER TABLE forms ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX idx_forms_organization_id ON forms(organization_id);

-- Form Responses (inherits from forms)
ALTER TABLE form_responses 
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT;

UPDATE form_responses 
SET organization_id = (
  SELECT organization_id FROM forms WHERE forms.id = form_responses.form_id
)
WHERE organization_id IS NULL;

ALTER TABLE form_responses ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX idx_form_responses_organization_id ON form_responses(organization_id);

-- Reports (belongs to organization)
ALTER TABLE reports 
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT;

UPDATE reports 
SET organization_id = (
  SELECT organization_id FROM users WHERE users.id = reports.created_by LIMIT 1
)
WHERE organization_id IS NULL;

UPDATE reports 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

ALTER TABLE reports ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX idx_reports_organization_id ON reports(organization_id);

-- Report Workflows (belongs to organization)
ALTER TABLE report_workflows 
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT;

UPDATE report_workflows 
SET organization_id = (
  SELECT organization_id FROM users WHERE users.id = report_workflows.created_by LIMIT 1
)
WHERE organization_id IS NULL;

UPDATE report_workflows 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

ALTER TABLE report_workflows ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX idx_report_workflows_organization_id ON report_workflows(organization_id);

-- Feedback Forms (belongs to organization)
ALTER TABLE feedback_forms 
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT;

UPDATE feedback_forms 
SET organization_id = COALESCE(
  (SELECT organization_id FROM projects WHERE projects.id = feedback_forms.project_id),
  (SELECT organization_id FROM users WHERE users.id = feedback_forms.created_by LIMIT 1),
  '00000000-0000-0000-0000-000000000001'
)
WHERE organization_id IS NULL;

ALTER TABLE feedback_forms ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX idx_feedback_forms_organization_id ON feedback_forms(organization_id);

-- Feedback Submissions (inherits from feedback_forms)
ALTER TABLE feedback_submissions 
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT;

UPDATE feedback_submissions 
SET organization_id = (
  SELECT organization_id FROM feedback_forms WHERE feedback_forms.id = feedback_submissions.form_id
)
WHERE organization_id IS NULL;

ALTER TABLE feedback_submissions ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX idx_feedback_submissions_organization_id ON feedback_submissions(organization_id);

-- Project Kobo Tables (inherits from projects)
ALTER TABLE project_kobo_tables 
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT;

UPDATE project_kobo_tables 
SET organization_id = (
  SELECT organization_id FROM projects WHERE projects.id = project_kobo_tables.project_id
)
WHERE organization_id IS NULL;

ALTER TABLE project_kobo_tables ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX idx_project_kobo_tables_organization_id ON project_kobo_tables(organization_id);

-- Kobo KPI Mappings (inherits from project_kobo_tables)
ALTER TABLE kobo_kpi_mappings 
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT;

UPDATE kobo_kpi_mappings 
SET organization_id = (
  SELECT organization_id FROM project_kobo_tables 
  WHERE project_kobo_tables.id = kobo_kpi_mappings.table_id
)
WHERE organization_id IS NULL;

ALTER TABLE kobo_kpi_mappings ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX idx_kobo_kpi_mappings_organization_id ON kobo_kpi_mappings(organization_id);

-- User Roles (organization-scoped)
ALTER TABLE user_roles 
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT;

UPDATE user_roles 
SET organization_id = (
  SELECT organization_id FROM users WHERE users.id = user_roles.user_id
)
WHERE organization_id IS NULL;

ALTER TABLE user_roles ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX idx_user_roles_organization_id ON user_roles(organization_id);

-- User Permissions (organization-scoped)
ALTER TABLE user_permissions 
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT;

UPDATE user_permissions 
SET organization_id = (
  SELECT organization_id FROM users WHERE users.id = user_permissions.user_id
)
WHERE organization_id IS NULL;

ALTER TABLE user_permissions ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX idx_user_permissions_organization_id ON user_permissions(organization_id);

-- User Project Access (already project-scoped, add org for consistency)
ALTER TABLE user_project_access 
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT;

UPDATE user_project_access 
SET organization_id = (
  SELECT organization_id FROM projects WHERE projects.id = user_project_access.project_id
)
WHERE organization_id IS NULL;

ALTER TABLE user_project_access ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX idx_user_project_access_organization_id ON user_project_access(organization_id);

-- Roles (nullable - global templates or org-specific)
ALTER TABLE roles 
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT;

-- Keep existing roles as global templates (NULL organization_id)
-- New roles will be organization-specific
CREATE INDEX idx_roles_organization_id ON roles(organization_id);
```

### **Migration 5: Row Level Security Policies**

```sql
-- Enable RLS on all tenant tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_financial_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_financial_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_kobo_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE kobo_kpi_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_project_access ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's organization_id
CREATE OR REPLACE FUNCTION get_user_organization_id(user_id UUID)
RETURNS UUID AS $$
  SELECT organization_id FROM users WHERE id = user_id;
$$ LANGUAGE SQL STABLE;

-- RLS Policy for users (users can see users in their organization)
CREATE POLICY "Users can view users in their organization"
ON users FOR SELECT
USING (
  organization_id = get_user_organization_id(auth.uid()::UUID)
);

-- RLS Policy for projects
CREATE POLICY "Users can view projects in their organization"
ON projects FOR SELECT
USING (
  organization_id = get_user_organization_id(auth.uid()::UUID)
);

CREATE POLICY "Users can insert projects in their organization"
ON projects FOR INSERT
WITH CHECK (
  organization_id = get_user_organization_id(auth.uid()::UUID)
);

CREATE POLICY "Users can update projects in their organization"
ON projects FOR UPDATE
USING (
  organization_id = get_user_organization_id(auth.uid()::UUID)
)
WITH CHECK (
  organization_id = get_user_organization_id(auth.uid()::UUID)
);

CREATE POLICY "Users can delete projects in their organization"
ON projects FOR DELETE
USING (
  organization_id = get_user_organization_id(auth.uid()::UUID)
);

-- Similar policies for all other tenant tables...
-- (Pattern: SELECT, INSERT, UPDATE, DELETE with organization_id check)
```

**Note:** Since Supabase Auth uses `auth.uid()`, we need to ensure the user's `auth_user_id` matches. You may need to adjust the helper function based on your auth setup.

## 🔧 **Code Implementation**

### **1. Organization Context Hook**

```typescript
// src/contexts/OrganizationContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface Organization {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  logo_url?: string;
  subscription_tier: string;
  max_users: number;
  max_projects: number;
}

interface OrganizationContextType {
  organization: Organization | null;
  organizationId: string | null;
  loading: boolean;
  switchOrganization: (orgId: string) => Promise<void>;
  refreshOrganization: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.organization_id) {
      loadOrganization(user.organization_id);
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadOrganization = async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();

      if (error) throw error;
      setOrganization(data);
    } catch (error) {
      console.error('Failed to load organization:', error);
    } finally {
      setLoading(false);
    }
  };

  const switchOrganization = async (orgId: string) => {
    // For multi-org support, update user's active organization
    // For now, this is a placeholder
    await loadOrganization(orgId);
  };

  const refreshOrganization = async () => {
    if (organization?.id) {
      await loadOrganization(organization.id);
    }
  };

  return (
    <OrganizationContext.Provider
      value={{
        organization,
        organizationId: organization?.id || null,
        loading,
        switchOrganization,
        refreshOrganization,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return context;
};
```

### **2. Updated Service Pattern**

```typescript
// Example: supabaseProjectsService.ts
import { useOrganization } from '@/contexts/OrganizationContext';

export const supabaseProjectsService = {
  async getProjects(organizationId: string): Promise<Project[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getProject(projectId: string, organizationId: string): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('organization_id', organizationId)
      .single();

    if (error) throw error;
    return data;
  },

  async createProject(projectData: CreateProjectData, organizationId: string): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        ...projectData,
        organization_id: organizationId,
        id: crypto.randomUUID(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // ... other methods with organizationId parameter
};
```

### **3. Updated Component Pattern**

```typescript
// Example: ProjectsList.tsx
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabaseProjectsService } from '@/services/supabaseProjectsService';

export const ProjectsList: React.FC = () => {
  const { organizationId, loading: orgLoading } = useOrganization();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organizationId) {
      loadProjects();
    }
  }, [organizationId]);

  const loadProjects = async () => {
    if (!organizationId) return;
    
    try {
      setLoading(true);
      const data = await supabaseProjectsService.getProjects(organizationId);
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  if (orgLoading || loading) return <LoadingSpinner />;
  if (!organizationId) return <div>No organization selected</div>;

  return (
    <div>
      {projects.map(project => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
};
```

### **4. Updated Auth Service**

```typescript
// supabaseAuthService.ts - Update login to include organization
export const supabaseAuthService = {
  async login(email: string, password: string) {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Login failed');

    // Get user profile with organization
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*, organization:organizations(*)')
      .eq('auth_user_id', authData.user.id)
      .single();

    if (profileError) throw profileError;
    if (!userProfile) throw new Error('User profile not found');

    // Update JWT with organization context
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      // Set organization in user metadata
      await supabase.auth.updateUser({
        data: {
          organization_id: userProfile.organization_id,
          organization_slug: userProfile.organization?.slug,
        },
      });
    }

    return {
      user: authData.user,
      profile: userProfile,
      organization: userProfile.organization,
    };
  },
};
```

## 🧪 **Testing Checklist**

### **Data Isolation Tests:**
- [ ] User from Org A cannot see Org B's projects
- [ ] User from Org A cannot create projects in Org B
- [ ] User from Org A cannot update Org B's data
- [ ] All queries filter by organization_id
- [ ] RLS policies block cross-organization access

### **Multi-Organization Tests:**
- [ ] Create two test organizations
- [ ] Create users in each organization
- [ ] Verify independent operation
- [ ] Test organization switching (if implemented)
- [ ] Test billing per organization

### **Performance Tests:**
- [ ] Query performance with organization filter
- [ ] Index effectiveness
- [ ] RLS policy overhead
- [ ] Concurrent operations

## 📝 **Next Steps**

1. Review and approve migration plan
2. Create database migration scripts
3. Test migrations on staging
4. Update service layer
5. Update frontend components
6. Implement organization management UI
7. Add billing/subscription system
8. Comprehensive testing
9. Production deployment

