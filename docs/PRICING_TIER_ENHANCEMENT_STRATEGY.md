# Pricing Tier Enhancement Strategy

## Overview
This document outlines the strategic approach to enhance existing ICS Dashboard features to align with the new pricing tiers: Foundation ($30–$50/mo), Professional ($150–$350/mo), and Enterprise (Custom Quote).

---

## 1. Data Volume Tracking with Rollover Credits

### Current State
- Form responses are tracked in `form_responses` table
- No usage tracking or limits enforced
- No credit/rollover system

### Required Enhancements

#### 1.1 Credit System Architecture
- **Credit Allocation**: Monthly credits based on tier (1,000 for Foundation, 10,000 for Professional)
- **Credit Tracking**: Track used vs. allocated credits per billing period
- **Rollover Logic**: 
  - Foundation: 3-month rollover window
  - Professional: 6-month rollover window
  - Enterprise: Unlimited (no tracking needed)
- **Credit Expiration**: FIFO (First In, First Out) - oldest credits expire first

#### 1.2 Submission Counting
- **What Counts**: Only completed form submissions (`isComplete = true`)
- **What Doesn't Count**: 
  - Draft/incomplete responses
  - Internal operations forms (for Professional+)
  - Test submissions (if marked as such)
- **Real-time Tracking**: Increment counter on submission completion

#### 1.3 Database Schema Additions
- Add `subscription_credits` table to track:
  - Allocated credits per period
  - Used credits per period
  - Rollover credits with expiration dates
  - Credit transactions (allocations, usage, expirations)
- Extend `subscription_usage` table to include:
  - Credit-based metrics
  - Rollover tracking

#### 1.4 Enforcement Points
- Before allowing form submission completion
- Check available credits (allocated + rollover - used)
- Block submission if no credits available
- Show credit balance in UI

---

## 2. Form Management Limits

### Current State
- Forms stored in `forms` table
- No limit on number of forms
- No distinction between active/inactive forms
- No categorization (internal vs. external)

### Required Enhancements

#### 2.1 Form Status Management
- **Active Forms**: Forms with status `PUBLISHED` and not `ARCHIVED`
- **Inactive Forms**: Forms with status `DRAFT`, `CLOSED`, or `ARCHIVED`
- **Limit Enforcement**: Count only active forms toward limit

#### 2.2 Form Categorization
- **Internal Operations Forms**: 
  - Category field: `internal_ops` or similar
  - Professional+: Unlimited responses
  - Foundation: Counts toward submission limit
- **External/Public Forms**: 
  - All other forms
  - Count toward both form limit and submission limit

#### 2.3 Tier Limits
- **Foundation**: 10 active forms
- **Professional**: 50 active forms
- **Enterprise**: Unlimited active forms

#### 2.4 Enforcement Strategy
- **Before Form Publishing**: Check active form count
- **On Form Status Change**: Recalculate active count
- **UI Indicators**: Show form limit progress (X/10 active forms)
- **Upgrade Prompts**: When approaching limit

---

## 3. Internal Operations Forms

### Current State
- No distinction between form types
- All forms treated equally

### Required Enhancements

#### 3.1 Form Type Classification
- Add `formType` or `category` field to forms table
- Values: `internal_ops`, `public`, `admin`, `hr`, etc.
- Default: `public` (counts toward limits)

#### 3.2 Response Counting Logic
- **Internal Ops Forms** (Professional+):
  - Responses don't count toward submission limit
  - Still tracked for analytics
  - Unlimited responses allowed
- **Public Forms**:
  - All responses count toward limit
  - Enforced credit system

#### 3.3 Access Control
- Internal ops forms may require authentication
- Can be restricted to specific user roles
- May have different deployment options

---

## 4. Analytics Engine Enhancements

### Current State
- Standard PostgreSQL queries
- Basic analytics on form responses
- No specialized analytics infrastructure

### Required Enhancements

#### 4.1 Foundation Tier (PostgreSQL)
- **Current State**: Already using PostgreSQL
- **Enhancements Needed**:
  - Optimize queries with proper indexes
  - Add materialized views for common reports
  - Implement query result caching
  - Add query performance monitoring

#### 4.2 Professional Tier (Apache Druid)
- **Why Druid**: High-speed interactive queries for large datasets
- **Integration Points**:
  - Real-time ingestion from form submissions
  - Pre-aggregated metrics for dashboards
  - Fast time-series queries
  - Sub-second query response times
- **Migration Strategy**:
  - Dual-write: PostgreSQL (source of truth) + Druid (analytics)
  - Gradual migration of analytics queries
  - Keep PostgreSQL for transactional data

#### 4.3 Enterprise Tier (Apache Kafka + Real-time)
- **Why Kafka**: Event streaming for real-time pattern detection
- **Integration Points**:
  - Event-driven architecture
  - Real-time analytics pipelines
  - Pattern detection and alerts
  - Complex event processing
- **Architecture**:
  - Kafka streams for event processing
  - Real-time dashboards
  - Automated anomaly detection
  - Predictive analytics

#### 4.4 Implementation Phases
1. **Phase 1**: Optimize PostgreSQL (Foundation ready)
2. **Phase 2**: Add Druid integration (Professional tier)
3. **Phase 3**: Implement Kafka streaming (Enterprise tier)

---

## 5. Core Integration Enhancements

### Current State
- Kobo Collect integration exists
- Web forms available
- Polling mechanism (every 15 mins)

### Required Enhancements

#### 5.1 Foundation Tier (Current)
- **Kobo Collect Integration**: 
  - Polling every 15 minutes
  - Web forms support
  - Basic data sync
- **No Changes Needed**: Already meets Foundation requirements

#### 5.2 Professional Tier (Add MS Dynamics 365)
- **Integration Requirements**:
  - MS Dynamics 365 connector
  - Sync every 2 hours
  - Bidirectional data sync
  - Field mapping configuration
- **Implementation Considerations**:
  - OAuth authentication with Dynamics
  - API rate limiting handling
  - Error handling and retry logic
  - Data transformation layer

#### 5.3 Enterprise Tier (Add Financial Systems)
- **QuickBooks Integration**:
  - Real-time financial data sync
  - Transaction import/export
  - Chart of accounts mapping
  - Budget vs. actual tracking
- **Sage Integration**:
  - Similar to QuickBooks
  - Multi-currency support
  - Project accounting
- **Real-time Webhooks**:
  - Event-driven integrations
  - Push notifications
  - Custom webhook endpoints
  - Webhook security (signatures, tokens)

#### 5.4 Integration Architecture
- **Integration Hub**: Central service for all integrations
- **Connector Pattern**: Pluggable connectors per system
- **Data Transformation**: ETL layer for data mapping
- **Error Handling**: Retry queues, dead letter queues
- **Monitoring**: Integration health dashboards

---

## 6. M&E / Finance Feature Tiers

### Current State
- Basic KPI tracking
- Standard financial data tracking
- Basic indicator tracking

### Required Enhancements

#### 6.1 Foundation Tier (Standard Indicator Tracking)
- **Current Features**: Already implemented
- **Enhancements**:
  - Improve UI/UX
  - Add more standard indicators
  - Basic reporting templates
- **No Major Changes**: Meets requirements

#### 6.2 Professional Tier (Advanced Disaggregation)
- **Disaggregation Features**:
  - Multi-dimensional breakdowns (gender, age, location, etc.)
  - Custom calculation methods
  - Advanced filtering and grouping
  - Cross-tabulation reports
- **Custom Calculation Methods**:
  - User-defined formulas
  - Weighted averages
  - Composite indicators
  - Trend analysis
- **Implementation**:
  - Flexible data model for disaggregation
  - Calculation engine
  - Report builder with advanced options

#### 6.3 Enterprise Tier (Value for Money Engine)
- **Cost-per-Outcome Analysis**:
  - Link financial data to outcomes
  - Calculate cost per beneficiary
  - ROI calculations
  - Efficiency metrics
- **Advanced Analytics**:
  - Predictive modeling
  - Scenario planning
  - What-if analysis
  - Benchmarking
- **Implementation**:
  - Financial-outcome linking system
  - Advanced analytics engine
  - Custom reporting framework

---

## 7. Storage & Media Limits

### Current State
- Media attachments stored in `media_attachments` table
- File storage in Supabase Storage
- No storage limits enforced
- No file type/size restrictions

### Required Enhancements

#### 7.1 Storage Tracking
- **Calculate Storage Usage**:
  - Sum of all media attachment file sizes
  - Include report file sizes
  - Track in GB (convert from bytes)
- **Real-time Tracking**:
  - Update on file upload
  - Update on file deletion
  - Periodic reconciliation

#### 7.2 Tier Limits
- **Foundation**: 2 GB (standard photos)
- **Professional**: 20 GB (high-res media + audio)
- **Enterprise**: Elastic storage (GIS layers, 4K video)

#### 7.3 File Type Restrictions
- **Foundation**: 
  - Standard photos (JPEG, PNG)
  - Max file size: 5 MB
- **Professional**:
  - High-res photos
  - Audio files (MP3, WAV)
  - Max file size: 50 MB
- **Enterprise**:
  - All file types
  - GIS layers (Shapefiles, GeoJSON)
  - 4K video
  - Max file size: 500 MB or unlimited

#### 7.4 Enforcement
- **Before Upload**: Check available storage
- **During Upload**: Validate file type and size
- **After Upload**: Update storage usage
- **UI Indicators**: Show storage usage (X/2 GB used)

---

## 8. Security & Scale Enhancements

### Current State
- Shared Supabase environment
- Basic RLS (Row Level Security)
- Standard authentication

### Required Enhancements

#### 8.1 Foundation Tier (Shared Cloud)
- **Current State**: Already using shared Supabase
- **Enhancements**:
  - Optimize database queries
  - Add connection pooling
  - Implement caching strategies
  - Basic monitoring

#### 8.2 Professional Tier (Dedicated Instance)
- **Infrastructure**:
  - Dedicated Supabase project
  - Isolated database instance
  - Dedicated compute resources
- **Auto Scaling**:
  - Automatic scaling based on load
  - Horizontal scaling for API servers
  - Database read replicas
- **Performance**:
  - Reduced latency
  - Higher throughput
  - Better isolation

#### 8.3 Enterprise Tier (Multi-region Kubernetes)
- **Infrastructure**:
  - Kubernetes cluster deployment
  - Multi-region setup
  - Load balancing across regions
  - CDN for static assets
- **High Availability**:
  - 99.9% uptime SLA
  - Automatic failover
  - Disaster recovery
  - Backup and replication
- **Security**:
  - Enhanced security policies
  - Network isolation
  - Advanced monitoring
  - Compliance certifications

---

## 9. Implementation Roadmap

### Phase 1: Foundation Tier (Immediate)
1. **Credit System**:
   - Database schema for credits
   - Credit allocation logic
   - Rollover mechanism (3 months)
   - Submission counting
2. **Form Limits**:
   - Active form counting
   - Limit enforcement
   - UI indicators
3. **Storage Tracking**:
   - Storage calculation
   - Limit enforcement (2 GB)
   - File type restrictions

### Phase 2: Professional Tier (3-6 months)
1. **Advanced Features**:
   - Internal ops forms
   - Form categorization
   - 6-month rollover
2. **Analytics Upgrade**:
   - Apache Druid integration
   - Query optimization
   - Real-time dashboards
3. **Integration**:
   - MS Dynamics 365 connector
   - Enhanced sync mechanisms
4. **M&E Enhancements**:
   - Advanced disaggregation
   - Custom calculations

### Phase 3: Enterprise Tier (6-12 months)
1. **Infrastructure**:
   - Kubernetes migration
   - Multi-region setup
   - High availability
2. **Analytics**:
   - Kafka integration
   - Real-time streaming
   - Pattern detection
3. **Integrations**:
   - Financial systems (QuickBooks, Sage)
   - Real-time webhooks
4. **Advanced Features**:
   - Value for Money engine
   - Predictive analytics

---

## 10. Database Schema Changes Required

### New Tables
1. **subscription_credits**:
   - Credit allocations per period
   - Rollover tracking
   - Credit transactions
2. **form_categories** (or extend forms table):
   - Form type classification
   - Internal vs. external flag
3. **integration_configs**:
   - Integration settings
   - API credentials (encrypted)
   - Sync schedules
4. **storage_usage** (or extend subscription_usage):
   - Storage tracking per organization
   - File type breakdowns

### Table Modifications
1. **forms**:
   - Add `formType` or `category` field
   - Add `isInternalOps` boolean
2. **form_responses**:
   - Add `countsTowardLimit` boolean
   - Add `creditUsed` tracking
3. **organizations**:
   - Add tier-specific feature flags
   - Add integration enablement flags

---

## 11. Service Architecture Changes

### New Services Needed
1. **Credit Management Service**:
   - Credit allocation
   - Usage tracking
   - Rollover logic
   - Expiration handling
2. **Feature Access Service**:
   - Tier-based feature checks
   - Limit enforcement
   - Upgrade prompts
3. **Integration Hub Service**:
   - Connector management
   - Sync scheduling
   - Error handling
4. **Storage Management Service**:
   - Storage calculation
   - Limit enforcement
   - File type validation

### Service Modifications
1. **Forms Service**:
   - Add form limit checks
   - Add internal ops handling
   - Add credit deduction
2. **Analytics Service**:
   - Add Druid query support
   - Add Kafka streaming
   - Tier-based query routing
3. **Organization Service**:
   - Add tier management
   - Add feature flags
   - Add usage reporting

---

## 12. UI/UX Enhancements

### Dashboard Additions
1. **Usage Dashboard**:
   - Credit balance display
   - Form limit progress
   - Storage usage meter
   - Feature availability indicators
2. **Upgrade Prompts**:
   - When approaching limits
   - Feature unlock notifications
   - Tier comparison tooltips

### Form Management UI
1. **Form Type Selection**:
   - Internal ops checkbox
   - Category dropdown
   - Limit indicators
2. **Submission UI**:
   - Credit balance display
   - Remaining submissions counter

---

## 13. Migration Strategy

### Existing Organizations
1. **Credit Allocation**:
   - Allocate credits based on current tier
   - Set rollover windows
   - Initialize credit balances
2. **Form Classification**:
   - Default all forms to "public"
   - Allow manual reclassification
   - Audit form types
3. **Storage Calculation**:
   - One-time calculation of current usage
   - Set baseline for tracking
4. **Feature Enablement**:
   - Enable features based on tier
   - Gradual rollout of new features

### Data Migration
1. **Historical Data**:
   - Calculate historical submission counts
   - Set initial credit balances
   - Migrate form classifications
2. **Backward Compatibility**:
   - Support existing integrations
   - Maintain API compatibility
   - Gradual deprecation

---

## 14. Monitoring & Analytics

### Key Metrics to Track
1. **Usage Metrics**:
   - Credit consumption rates
   - Form creation rates
   - Storage growth
   - Feature adoption
2. **Performance Metrics**:
   - Query response times
   - Integration sync success rates
   - Storage upload speeds
3. **Business Metrics**:
   - Tier distribution
   - Upgrade conversion rates
   - Feature utilization
   - Churn indicators

---

## 15. Risk Mitigation

### Technical Risks
1. **Credit System Complexity**:
   - Risk: Rollover logic bugs
   - Mitigation: Extensive testing, gradual rollout
2. **Integration Failures**:
   - Risk: Third-party API changes
   - Mitigation: Robust error handling, monitoring
3. **Storage Calculation**:
   - Risk: Inaccurate tracking
   - Mitigation: Reconciliation jobs, audits

### Business Risks
1. **User Confusion**:
   - Risk: Unclear limits/features
   - Mitigation: Clear UI, documentation, support
2. **Upgrade Friction**:
   - Risk: Users hit limits unexpectedly
   - Mitigation: Proactive warnings, grace periods

---

## 16. Success Criteria

### Foundation Tier
- ✅ Credit system operational
- ✅ Form limits enforced
- ✅ Storage limits enforced
- ✅ Basic analytics optimized

### Professional Tier
- ✅ Internal ops forms working
- ✅ Druid integration complete
- ✅ MS Dynamics integration live
- ✅ Advanced disaggregation available

### Enterprise Tier
- ✅ Multi-region infrastructure
- ✅ Kafka streaming operational
- ✅ Financial integrations complete
- ✅ VfM engine functional
- ✅ 99.9% uptime achieved

---

## 17. Next Steps

1. **Review & Approval**: Stakeholder review of this strategy
2. **Detailed Design**: Create detailed technical designs for each component
3. **Resource Planning**: Allocate development resources
4. **Pilot Program**: Start with Foundation tier features
5. **Iterative Rollout**: Gradual feature release
6. **Monitoring & Optimization**: Continuous improvement based on usage data

