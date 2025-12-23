# Feature Usage Analysis & Tracking Plan

## Overview
This document provides a comprehensive analysis of all features in the ICS Dashboard system, their usage patterns, and recommendations for tracking and limiting access based on subscription plans.

---

## 1. Core Features Inventory

### 1.1 User Management
**Service**: `supabaseUserManagementService.ts`

**Features**:
- ✅ **User CRUD Operations**
  - Create users (`createUser`)
  - Read/List users (`getUsers`, `getUserById`, `getProjectUsers`)
  - Update users (`updateUser`)
  - Delete users (`deleteUser`)
  
- ✅ **Role Management**
  - Create roles (`createRole`)
  - Update roles (`updateRole`)
  - Delete roles (`deleteRole`)
  - Get role permissions (`getRolePermissions`)
  - List available roles (`getAvailableRoles`)
  
- ✅ **Project Access Management**
  - Assign project access levels (`updateProjectAccessLevel`)
  - View project-specific users

**Usage Metrics to Track**:
- Total number of users in organization
- Number of active users
- Number of roles created
- Number of project access assignments

**Current Limits** (from `organizations` table):
- `maxUsers`: Default 10 (configurable per tier)

---

### 1.2 Project Management
**Service**: `supabaseProjectsService.ts`

**Features**:
- ✅ **Project CRUD Operations**
  - Create projects (`createProject`)
  - Read/List projects (`getAllProjects`, `getProjectById`, `getProjectsByCountry`)
  - Update projects (`updateProject`)
  - Delete projects (`deleteProject`)

**Usage Metrics to Track**:
- Total number of projects
- Number of active projects
- Number of projects by status (PLANNING, ACTIVE, COMPLETED, ON_HOLD, ARCHIVED)
- Number of projects by country

**Current Limits** (from `organizations` table):
- `maxProjects`: Default 5 (configurable per tier)

---

### 1.3 Project Data Management
**Service**: `supabaseProjectDataService.ts`

**Features**:
- ✅ **Outcomes Management**
  - Create/Read/Update/Delete outcomes (`createProjectOutcome`, `getProjectOutcomes`, `updateProjectOutcome`, `deleteProjectOutcome`)
  
- ✅ **Activities Management**
  - Create/Read/Update/Delete activities (`createProjectActivity`, `getProjectActivities`, `updateProjectActivity`, `deleteProjectActivity`)
  
- ✅ **Sub-Activities Management**
  - Get sub-activities (`getProjectSubActivities`)
  
- ✅ **Outputs Management**
  - Get outputs (`getProjectOutputs`)
  
- ✅ **KPIs Management**
  - Create/Read/Update/Delete KPIs (`createProjectKPI`, `getProjectKPIs`, `updateProjectKPI`, `deleteProjectKPI`)
  
- ✅ **Project Reports**
  - Get project reports (`getProjectReports`)

**Usage Metrics to Track**:
- Number of outcomes per project
- Number of activities per project
- Number of sub-activities per project
- Number of outputs per project
- Number of KPIs per project
- Number of reports per project

**Potential Limits**:
- Max outcomes per project
- Max activities per project
- Max KPIs per project

---

### 1.4 Forms Management
**Service**: `supabaseFormsService.ts`

**Features**:
- ✅ **Form Design & Management**
  - Create forms (`createForm`)
  - Read forms (`getProjectForms`, `getForm`)
  - Update forms (`updateForm`)
  - Delete forms (`deleteForm`)
  - Form templates (`createTemplate`, `getPublicTemplates`, `getUserTemplates`, `createFormFromTemplate`)
  
- ✅ **Form Responses**
  - Create responses (`createResponse`)
  - Read responses (`getFormResponses`, `getAllFormResponsesForExport`, `getFormResponse`)
  - Update responses (`updateFormResponse`)
  - Delete responses (`deleteFormResponse`)
  
- ✅ **Form Deployment**
  - Public forms (`getPublicForm`)
  - Secure forms (`getSecureForm`)
  
- ✅ **Media Management**
  - Upload media files (`uploadMediaFile`, `uploadDirectMediaFile`)
  - Get media files (`getFormMediaFiles`, `getProjectMediaFiles`)
  - Delete media files (`deleteMediaFile`)
  - Update media metadata (`updateMediaFileMetadata`)
  
- ✅ **Form Analytics**
  - Get form analytics (`getFormAnalytics`)

**Usage Metrics to Track**:
- Number of forms created
- Number of form responses submitted
- Number of form templates created
- Total storage used for media attachments
- Number of media files uploaded

**Potential Limits**:
- Max forms per project
- Max form responses per form
- Max storage per organization (GB)
- Max file size per upload

---

### 1.5 Financial Management
**Service**: `supabaseFinancialService.ts`

**Features**:
- ✅ **Project Financial Data**
  - Create/Read/Update project financial data (`createProjectFinancialData`, `getProjectFinancialData`, `updateProjectFinancialData`)
  
- ✅ **Activity Financial Data**
  - Create/Read/Update activity financial data (`createActivityFinancialData`, `getActivityFinancialData`, `updateActivityFinancialData`)
  
- ✅ **Financial Analytics**
  - Get financial summary (`getFinancialSummary`)
  - Get quarterly financial data (`getQuarterlyFinancialData`)

**Usage Metrics to Track**:
- Number of financial records per project
- Number of financial records per activity
- Number of years tracked per project

**Potential Limits**:
- Max financial records per project
- Max years of historical data

---

### 1.6 Reports Management
**Service**: `supabaseReportService.ts`

**Features**:
- ✅ **Report CRUD Operations**
  - Upload reports (`uploadReportFile`)
  - Read reports (`getReports`, `getReport`)
  - Update reports (`updateReport`)
  - Delete reports (`deleteReportFile`)
  
- ✅ **Report Access**
  - Download reports (`downloadReportFile`)
  - Preview reports (`getPreviewUrl`)

**Usage Metrics to Track**:
- Number of reports uploaded
- Total storage used for reports
- Number of report downloads

**Potential Limits**:
- Max reports per project
- Max storage per organization (GB)
- Max file size per report

---

### 1.7 Report Workflows
**Service**: `supabaseReportWorkflowService.ts`

**Features**:
- ✅ **Workflow Management**
  - Create workflow versions (`createWorkflowVersion`)
  - Get pending reviews (`getPendingReviews`)
  - Get my reports (`getMyReports`)
  - Get report by ID (`getReportById`, `getByFile`)
  - Update workflow status (`updateStatus`)
  
- ✅ **Workflow Analytics**
  - Get weighted approval (`getWeightedApproval`)
  - Get reviewer workload (`getReviewerWorkload`)

**Usage Metrics to Track**:
- Number of workflow reports created
- Number of approval steps per workflow
- Number of reviewers assigned
- Average workflow completion time

**Potential Limits**:
- Max workflow reports per project
- Max approval steps per workflow
- Max reviewers per workflow

---

### 1.8 Feedback Management
**Service**: `supabaseFeedbackService.ts`

**Features**:
- ✅ **Feedback Forms**
  - Create/Read/Update/Delete feedback forms (`createForm`, `getForms`, `getFormById`, `updateForm`, `deleteForm`)
  
- ✅ **Feedback Submissions**
  - Create submissions (`createSubmission`)
  - Read submissions (`getSubmissions`, `getSubmissionById`)
  - Update submission status (`updateSubmissionStatus`)
  - Delete submissions (`deleteSubmission`)
  
- ✅ **Feedback Categories**
  - Get categories (`getCategories`, `getCategoryById`)
  
- ✅ **Feedback Analytics**
  - Get analytics (`getAnalytics`, `getFormAnalytics`)

**Usage Metrics to Track**:
- Number of feedback forms created
- Number of feedback submissions
- Number of feedback categories
- Average resolution time

**Potential Limits**:
- Max feedback forms per project
- Max feedback submissions per form
- Max feedback categories

---

### 1.9 Kobo Data Integration
**Service**: `supabaseKoboDataService.ts`

**Features**:
- ✅ **Kobo Table Management**
  - Assign Kobo tables (`assignKoboTable`)
  - Get Kobo tables (`getKoboTables`, `getKoboTableById`)
  - Update Kobo tables (`updateKoboTable`)
  - Delete Kobo tables (`deleteKoboTable`)
  - Get available Kobo tables (`getAvailableKoboTables`)
  
- ✅ **KPI Mapping**
  - Create KPI mappings (`createKpiMapping`)
  - Get KPI mappings (`getKpiMappings`, `getKpiMappingById`)
  - Update KPI mappings (`updateKpiMapping`)
  - Delete KPI mappings (`deleteKpiMapping`)
  
- ✅ **Data Viewing & Analysis**
  - Get table data (`getTableData`)
  - Get table stats (`getTableStats`)
  - Calculate KPIs (`calculateKpis`)

**Usage Metrics to Track**:
- Number of Kobo tables assigned
- Number of KPI mappings created
- Number of data sync operations
- Amount of data imported from Kobo

**Potential Limits**:
- Max Kobo tables per project
- Max KPI mappings per table
- Max data rows imported per sync

---

### 1.10 Strategic Planning
**Service**: `supabaseStrategicPlanService.ts`

**Features**:
- ✅ **Strategic Plans**
  - Create strategic plans (`createStrategicPlan`)
  - Read strategic plans (`getStrategicPlans`, `getStrategicPlan`, `getActiveStrategicPlan`, `getStrategicPlansByYearRange`)
  - Update strategic plans (`updateStrategicPlan`)
  - Delete strategic plans (`deleteStrategicPlan`)

**Usage Metrics to Track**:
- Number of strategic plans created
- Number of goals per plan
- Number of sub-goals per goal
- Number of strategic KPIs

**Potential Limits**:
- Max strategic plans per organization
- Max goals per plan
- Max sub-goals per goal

---

### 1.11 Organization Management
**Service**: `supabaseOrganizationService.ts`

**Features**:
- ✅ **Organization Settings**
  - Get organization (`getOrganization`)
  - Update organization (`updateOrganization`)
  - Get organization stats (`getOrganizationStats`)
  - Get usage stats (`getUsageStats`)
  
- ✅ **Subscription Management**
  - Get subscription (`getSubscription`)
  - Get subscription management link (`getSubscriptionManagementLink`)
  - Get billing history (`getBillingHistory`)
  - Get invoices (`getMostRecentInvoice`, `getInvoiceDetails`, `getFailedInvoices`)

**Usage Metrics to Track**:
- Organization-level usage across all features
- Subscription tier and status
- Billing history

---

### 1.12 Analytics & Dashboards
**Features**:
- ✅ **Project Analytics**
  - Project overview dashboards
  - KPI analytics (`KPIAnalytics.tsx`)
  - Financial charts (`FinancialCharts.tsx`)
  - Activity progress tracking
  
- ✅ **Form Analytics**
  - Form response analytics
  - Submission trends
  
- ✅ **Feedback Analytics**
  - Feedback resolution dashboard
  - Status tracking
  
- ✅ **Global Overview**
  - Organization-wide dashboards
  - Cross-project analytics

**Usage Metrics to Track**:
- Number of dashboard views
- Number of custom reports generated
- Number of analytics queries executed

**Potential Limits**:
- Max custom dashboards
- Max analytics queries per day
- Data retention period

---

## 2. Feature Categories for Plan Tiers

### Category A: Core Features (All Plans)
- User Management (limited by `maxUsers`)
- Project Management (limited by `maxProjects`)
- Basic Forms (limited by forms per project)
- Basic Reports (limited by reports per project)
- Basic Analytics

### Category B: Advanced Features (Professional+)
- Advanced Forms (templates, workflows)
- Report Workflows (approval processes)
- Advanced Analytics (custom dashboards)
- Kobo Integration
- Strategic Planning

### Category C: Enterprise Features (Enterprise Only)
- Unlimited users/projects
- Custom integrations
- Advanced API access
- Dedicated support
- Custom training
- SLA guarantees

---

## 3. Usage Tracking Implementation

### 3.1 Database Schema
The `subscription_usage` table already exists with:
- `organizationId`: TEXT
- `metric`: VARCHAR(50) - e.g., 'users', 'projects', 'forms', 'storage_gb'
- `count`: INTEGER
- `periodStart`: TIMESTAMP
- `periodEnd`: TIMESTAMP

### 3.2 Metrics to Track

**Quantitative Metrics**:
1. `users` - Total active users
2. `projects` - Total active projects
3. `forms` - Total forms created
4. `form_responses` - Total form responses submitted
5. `reports` - Total reports uploaded
6. `feedback_forms` - Total feedback forms created
7. `feedback_submissions` - Total feedback submissions
8. `kobo_tables` - Total Kobo tables assigned
9. `strategic_plans` - Total strategic plans
10. `storage_gb` - Total storage used (media + reports)

**Qualitative Metrics** (Feature Access):
- `report_workflows_enabled` - Boolean
- `kobo_integration_enabled` - Boolean
- `strategic_planning_enabled` - Boolean
- `advanced_analytics_enabled` - Boolean
- `api_access_enabled` - Boolean
- `custom_integrations_enabled` - Boolean

---

## 4. Access Control Points

### 4.1 Service-Level Checks
Each service should check:
1. **Organization subscription tier** (from `organizations.subscriptionTier`)
2. **Current usage** (from `subscription_usage` table)
3. **Feature limits** (from plan configuration)

### 4.2 Enforcement Points

**Before Create Operations**:
- Check if limit reached
- Increment usage counter
- Throw error if limit exceeded

**Before Read Operations**:
- Check feature access (for advanced features)
- Filter by organization (already implemented)

**Periodic Updates**:
- Update usage metrics daily/weekly
- Reset counters at billing cycle

---

## 5. Recommended Plan Structure

### Free Tier
- **Users**: 5
- **Projects**: 3
- **Forms**: 10 per project
- **Form Responses**: 100 per form
- **Reports**: 10 per project
- **Storage**: 1 GB
- **Features**: Core features only

### Basic Tier
- **Users**: 20
- **Projects**: 10
- **Forms**: 50 per project
- **Form Responses**: 1,000 per form
- **Reports**: 50 per project
- **Storage**: 10 GB
- **Features**: Core + Basic Analytics

### Professional Tier
- **Users**: 50
- **Projects**: 25
- **Forms**: Unlimited per project
- **Form Responses**: Unlimited per form
- **Reports**: Unlimited per project
- **Storage**: 100 GB
- **Features**: All Basic + Report Workflows + Kobo Integration + Strategic Planning + Advanced Analytics

### Enterprise Tier
- **Users**: Unlimited
- **Projects**: Unlimited
- **Forms**: Unlimited
- **Form Responses**: Unlimited
- **Reports**: Unlimited
- **Storage**: Unlimited
- **Features**: All Professional + Custom Integrations + API Access + Dedicated Support + SLA

---

## 6. Implementation Recommendations

### 6.1 Usage Tracking Service
Create a new service `supabaseUsageTrackingService.ts` with:
- `trackUsage(metric: string, count: number)`
- `getCurrentUsage(metric: string)`
- `checkLimit(metric: string, requested: number)`
- `incrementUsage(metric: string, amount: number)`

### 6.2 Feature Access Service
Create `supabaseFeatureAccessService.ts` with:
- `hasFeatureAccess(feature: string)`
- `getFeatureLimits()`
- `canCreateResource(resourceType: string, count: number)`

### 6.3 Middleware/Decorators
Add checks before critical operations:
- User creation → Check `maxUsers`
- Project creation → Check `maxProjects`
- Form creation → Check forms per project limit
- File upload → Check storage limit

### 6.4 UI Indicators
- Show usage progress bars
- Display upgrade prompts when limits reached
- Show feature availability badges

---

## 7. Next Steps

1. **Review this analysis** with stakeholders
2. **Finalize plan tiers** and limits
3. **Implement usage tracking service**
4. **Add feature access checks** to all services
5. **Create usage dashboard** for organizations
6. **Add upgrade prompts** in UI
7. **Test limits enforcement** across all features

---

## 8. Questions for Stakeholders

1. Are the proposed plan tiers appropriate?
2. What are the exact limits for each tier?
3. Should limits be hard (block) or soft (warn)?
4. How should storage be calculated (media + reports)?
5. Should there be rate limits (e.g., API calls per day)?
6. How should usage reset (monthly, annually)?
7. Should there be overage charges or hard stops?

