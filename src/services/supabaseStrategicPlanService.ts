import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/types/supabase';
import { supabaseAuthService } from './supabaseAuthService';
import { supabaseUsageTrackingService } from './supabaseUsageTrackingService';
import { getCurrentUserOrganizationId } from './getCurrentUserOrganizationId';
import { userProfileCache } from './userProfileCache';

type StrategicPlanRow = Database['public']['Tables']['strategic_plans']['Row'];
type StrategicGoalRow = Database['public']['Tables']['strategic_goals']['Row'];
type StrategicSubGoalRow = Database['public']['Tables']['strategic_subgoals']['Row'];
type StrategicKpiRow = Database['public']['Tables']['strategic_kpis']['Row'];
type StrategicActivityLinkRow = Database['public']['Tables']['strategic_activity_links']['Row'];
type StrategicActivityLinkInsert = Database['public']['Tables']['strategic_activity_links']['Insert'];
type StrategicActivityInsert = Database['public']['Tables']['strategic_activities']['Insert'];
type StrategicKpiAnnualTargetInsert = Database['public']['Tables']['strategic_kpi_annual_targets']['Insert'];
type StrategicKpiInsert = Database['public']['Tables']['strategic_kpis']['Insert'];

export interface StrategicKPI {
  currentValue: number;
  targetValue: number;
  unit: string;
  type: string;
}

export interface StrategicActivityLink {
  projectId?: string;
  projectName?: string;
  activityId?: string;
  activityTitle?: string;
  /** When set, link references an organisation-wide activity */
  strategicActivityId?: string;
  contribution: number;
  status: 'contributing' | 'at-risk' | 'not-contributing';
  code?: string;
  responsibleCountry?: string;
  timeframeQ1?: boolean;
  timeframeQ2?: boolean;
  timeframeQ3?: boolean;
  timeframeQ4?: boolean;
  annualTarget?: number;
  indicatorText?: string;
  plannedBudget?: number;
  strategicKpiId?: string;
}

/** Plan-level KPI (organisation-wide) */
export interface PlanKpi {
  id: string;
  name?: string | null;
  currentValue: number;
  targetValue: number;
  unit: string;
  type: string;
  baseYear?: number | null;
  baseYearValue?: number | null;
  annualTargets?: { year: number; targetValue: number }[];
}

/** Organisation-wide activity at plan level */
export interface StrategicActivity {
  id: string;
  strategicPlanId: string;
  title: string;
  description?: string;
  code?: string;
  order: number;
  timeframeQ1?: boolean;
  timeframeQ2?: boolean;
  timeframeQ3?: boolean;
  timeframeQ4?: boolean;
  annualTarget?: number;
  indicatorText?: string;
  plannedBudget?: number;
  strategicKpiId?: string;
}

export interface StrategicSubGoal {
  id: string;
  title: string;
  description: string;
  kpi: StrategicKPI;
  activityLinks: StrategicActivityLink[];
}

export interface StrategicGoal {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  targetOutcome: string;
  subgoals: StrategicSubGoal[];
}

export interface StrategicPlan {
  id: string;
  title: string;
  description?: string;
  version: string;
  startYear: number;
  endYear: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  goals: StrategicGoal[];
}

class SupabaseStrategicPlanService {
  /**
   * Get current user's organizationId (uses shared cache helper)
   */
  private async getCurrentUserOrganizationId(): Promise<string> {
    return getCurrentUserOrganizationId();
  }

  private async formatStrategicPlan(plan: StrategicPlanRow): Promise<StrategicPlan> {
    // Multi-tenant: Filter by organizationId
    const organizationId = await this.getCurrentUserOrganizationId();
    
    // Fetch related goals, subgoals, KPIs, and activity links (filtered by organization)
    const { data: goals } = await supabase
      .from('strategic_goals')
      .select('*')
      .eq('strategicPlanId', plan.id)
      .eq('organizationid', organizationId) // Filter by organization
      .order('order', { ascending: true });

    const formattedGoals: StrategicGoal[] = [];

    if (goals) {
      for (const goal of goals) {
        const { data: subgoals } = await supabase
          .from('strategic_subgoals')
          .select('*')
          .eq('strategicGoalId', goal.id)
          .eq('organizationid', organizationId) // Filter by organization
          .order('order', { ascending: true });

        const formattedSubgoals: StrategicSubGoal[] = [];

        if (subgoals) {
          for (const subgoal of subgoals) {
            // Get KPI (filtered by organization)
            const { data: kpiData } = await supabase
              .from('strategic_kpis')
              .select('*')
              .eq('strategicSubGoalId', subgoal.id)
              .eq('organizationid', organizationId) // Filter by organization
              .single();

            // Get activity links (filtered by organization)
            const { data: activityLinks } = await supabase
              .from('strategic_activity_links')
              .select('*')
              .eq('strategicSubGoalId', subgoal.id)
              .eq('organizationid', organizationId); // Filter by organization

            const kpi: StrategicKPI = kpiData ? {
              currentValue: kpiData.currentValue,
              targetValue: kpiData.targetValue,
              unit: kpiData.unit,
              type: kpiData.type,
            } : {
              currentValue: 0,
              targetValue: 0,
              unit: '',
              type: '',
            };

            const links: StrategicActivityLink[] = (activityLinks || []).map((link: Record<string, unknown>) => ({
              projectId: link.projectId as string | undefined,
              projectName: link.projectName as string | undefined,
              activityId: link.activityId as string | undefined,
              activityTitle: link.activityTitle as string | undefined,
              strategicActivityId: link.strategicActivityId as string | undefined,
              contribution: (link.contribution as number) || 0,
              status: ((link.status as string)?.toLowerCase().replace('_', '-') || 'not-contributing') as 'contributing' | 'at-risk' | 'not-contributing',
              code: link.code as string | undefined,
              responsibleCountry: link.responsibleCountry as string | undefined,
              timeframeQ1: link.timeframeQ1 as boolean | undefined,
              timeframeQ2: link.timeframeQ2 as boolean | undefined,
              timeframeQ3: link.timeframeQ3 as boolean | undefined,
              timeframeQ4: link.timeframeQ4 as boolean | undefined,
              annualTarget: link.annualTarget != null ? Number(link.annualTarget) : undefined,
              indicatorText: link.indicatorText as string | undefined,
              plannedBudget: link.plannedBudget != null ? Number(link.plannedBudget) : undefined,
              strategicKpiId: link.strategicKpiId as string | undefined,
            }));

            formattedSubgoals.push({
              id: subgoal.id,
              title: subgoal.title,
              description: subgoal.description || '',
              kpi,
              activityLinks: links,
            });
          }
        }

        formattedGoals.push({
          id: goal.id,
          title: goal.title,
          description: goal.description || '',
          priority: (goal.priority?.toLowerCase() || 'medium') as 'high' | 'medium' | 'low',
          targetOutcome: goal.targetOutcome || '',
          subgoals: formattedSubgoals,
        });
      }
    }

    return {
      id: plan.id,
      title: plan.title,
      description: plan.description || undefined,
      version: plan.version,
      startYear: plan.startYear,
      endYear: plan.endYear,
      isActive: plan.isActive,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      goals: formattedGoals,
    };
  }

  async createStrategicPlan(
    data: StrategicGoal[],
    startYear?: number,
    endYear?: number
  ): Promise<StrategicPlan> {
    // Use cached user profile
    const cachedProfile = await userProfileCache.getCachedProfile();
    if (!cachedProfile) {
      throw new Error('User profile not found or user is not associated with an organization');
    }

    const now = new Date().toISOString();
    const planId = crypto.randomUUID();
    const currentYear = new Date().getFullYear();

    // Create strategic plan
    const { data: plan, error: planError } = await supabase
      .from('strategic_plans')
      .insert({
        id: planId,
        title: `Strategic Plan ${startYear || currentYear}-${endYear || currentYear + 4}`,
        description: null,
        version: '1.0',
        startYear: startYear || currentYear,
        endYear: endYear || currentYear + 4,
        isActive: false,
        organizationid: cachedProfile.organizationId, // Multi-tenant: Set organizationid (database column is lowercase)
        createdBy: cachedProfile.user.id,
        updatedBy: cachedProfile.user.id,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();

    if (planError || !plan) {
      // Handle subscription limit errors from RLS policies
      const { handleSubscriptionError } = await import('@/utils/subscriptionErrorHandler');
      throw await handleSubscriptionError(planError || { message: 'Failed to create strategic plan' }, 'strategic_plans', 'create');
    }

    // Create goals, subgoals, KPIs, and activity links
    for (let goalIndex = 0; goalIndex < data.length; goalIndex++) {
      const goal = data[goalIndex];
      const goalId = crypto.randomUUID();

      const { error: goalError } = await supabase
        .from('strategic_goals')
        .insert({
          id: goalId,
          strategicPlanId: planId,
          title: goal.title,
          description: goal.description || null,
          priority: goal.priority.toUpperCase() as Database['public']['Enums']['StrategicPriority'],
          targetOutcome: goal.targetOutcome || null,
          order: goalIndex,
          organizationid: cachedProfile.organizationId, // Multi-tenant: Set organizationid (database column is lowercase)
          createdBy: cachedProfile.user.id,
          updatedBy: cachedProfile.user.id,
          createdAt: now,
          updatedAt: now,
        });

      if (goalError) {
        throw new Error(goalError.message || 'Failed to create strategic goal');
      }

      // Create subgoals
      for (let subGoalIndex = 0; subGoalIndex < goal.subgoals.length; subGoalIndex++) {
        const subGoal = goal.subgoals[subGoalIndex];
        const subGoalId = crypto.randomUUID();

        const { error: subGoalError } = await supabase
          .from('strategic_subgoals')
          .insert({
            id: subGoalId,
            strategicGoalId: goalId,
            title: subGoal.title,
            description: subGoal.description || null,
            order: subGoalIndex,
            createdBy: cachedProfile.user.id,
            updatedBy: cachedProfile.user.id,
            createdAt: now,
            updatedAt: now,
            organizationid: cachedProfile.organizationId, // Multi-tenant: Set organizationid (database column is lowercase)
          });

        if (subGoalError) {
          throw new Error(subGoalError.message || 'Failed to create strategic subgoal');
        }

        // Create KPI
        if (subGoal.kpi) {
          const kpiId = crypto.randomUUID();
          const { error: kpiError } = await supabase
            .from('strategic_kpis')
            .insert({
              id: kpiId,
              strategicSubGoalId: subGoalId,
              currentValue: subGoal.kpi.currentValue,
              targetValue: subGoal.kpi.targetValue,
              unit: subGoal.kpi.unit,
              type: subGoal.kpi.type,
            createdBy: cachedProfile.user.id,
            updatedBy: cachedProfile.user.id,
            organizationid: cachedProfile.organizationId, // Multi-tenant: Set organizationid (database column is lowercase)
              createdAt: now,
              updatedAt: now,
            });

          if (kpiError) {
            throw new Error(kpiError.message || 'Failed to create strategic KPI');
          }
        }

        // Create activity links (project or org-wide)
        for (const activityLink of subGoal.activityLinks) {
          const isOrgWide = Boolean(activityLink.strategicActivityId);
          if (isOrgWide) {
            // Org-wide: strategicActivityId required, project fields optional
            const linkId = crypto.randomUUID();
            const insertPayload: StrategicActivityLinkInsert = {
              id: linkId,
              strategicSubGoalId: subGoalId,
              contribution: activityLink.contribution,
              status: activityLink.status.toUpperCase().replace('-', '_') as Database['public']['Enums']['ActivityLinkStatus'],
              createdBy: cachedProfile.user.id,
              updatedBy: cachedProfile.user.id,
              organizationid: cachedProfile.organizationId,
              createdAt: now,
              updatedAt: now,
              strategicActivityId: activityLink.strategicActivityId ?? null,
              code: activityLink.code || null,
              responsibleCountry: activityLink.responsibleCountry || null,
              timeframeQ1: activityLink.timeframeQ1 ?? false,
              timeframeQ2: activityLink.timeframeQ2 ?? false,
              timeframeQ3: activityLink.timeframeQ3 ?? false,
              timeframeQ4: activityLink.timeframeQ4 ?? false,
              annualTarget: activityLink.annualTarget ?? null,
              indicatorText: activityLink.indicatorText || null,
              plannedBudget: activityLink.plannedBudget ?? null,
              strategicKpiId: activityLink.strategicKpiId || null,
            };
            const { error: linkError } = await supabase
              .from('strategic_activity_links')
              .insert(insertPayload);
            if (linkError) throw new Error(linkError.message || 'Failed to create org-wide activity link');
          } else {
            // Project link: projectId and activityId required
            if (!activityLink.projectId || !activityLink.activityId) {
              throw new Error('Activity link must have either strategicActivityId (org-wide) or projectId and activityId (project)');
            }
            const { data: project } = await supabase
              .from('projects')
              .select('id, organizationid')
              .eq('id', activityLink.projectId)
              .eq('organizationid', cachedProfile.organizationId)
              .single();
            if (!project) throw new Error(`Project ${activityLink.projectId} not found or access denied`);
            const linkId = crypto.randomUUID();
            const insertPayload: StrategicActivityLinkInsert = {
              id: linkId,
              strategicSubGoalId: subGoalId,
              projectId: activityLink.projectId,
              projectName: activityLink.projectName || '',
              activityId: activityLink.activityId,
              activityTitle: activityLink.activityTitle || '',
              contribution: activityLink.contribution,
              status: activityLink.status.toUpperCase().replace('-', '_') as Database['public']['Enums']['ActivityLinkStatus'],
              createdBy: cachedProfile.user.id,
              updatedBy: cachedProfile.user.id,
              organizationid: cachedProfile.organizationId,
              createdAt: now,
              updatedAt: now,
              code: activityLink.code || null,
              responsibleCountry: activityLink.responsibleCountry || null,
              timeframeQ1: activityLink.timeframeQ1 ?? false,
              timeframeQ2: activityLink.timeframeQ2 ?? false,
              timeframeQ3: activityLink.timeframeQ3 ?? false,
              timeframeQ4: activityLink.timeframeQ4 ?? false,
              annualTarget: activityLink.annualTarget ?? null,
              indicatorText: activityLink.indicatorText || null,
              plannedBudget: activityLink.plannedBudget ?? null,
              strategicKpiId: activityLink.strategicKpiId || null,
            };
            const { error: linkError } = await supabase
              .from('strategic_activity_links')
              .insert(insertPayload);
            if (linkError) throw new Error(linkError.message || 'Failed to create project activity link');
          }
        }
      }
    }

    // Note: Usage tracking is now handled by database trigger (track_strategic_plan_insert)
    // This ensures atomicity and better performance

    return this.formatStrategicPlan(plan);
  }

  async updateStrategicPlan(
    id: string,
    data: StrategicGoal[],
    startYear?: number,
    endYear?: number
  ): Promise<StrategicPlan> {
    // Multi-tenant: Verify ownership first
    const organizationId = await this.getCurrentUserOrganizationId();
    
    // Use cached user profile
    const cachedProfile = await userProfileCache.getCachedProfile();
    if (!cachedProfile) {
      throw new Error('User profile not found or user is not associated with an organization');
    }

    // Get existing plan (verify ownership)
    const { data: existingPlan, error: planError } = await supabase
      .from('strategic_plans')
      .select('id, organizationid')
      .eq('id', id)
      .eq('organizationid', organizationId) // Ensure ownership
      .single();

    if (planError || !existingPlan) {
      throw new Error('Strategic plan not found or access denied');
    }

    // Delete existing goals and related data (filtered by organization)
    await supabase
      .from('strategic_goals')
      .delete()
      .eq('strategicPlanId', id)
      .eq('organizationid', organizationId); // Filter by organization

    // Update plan
    const now = new Date().toISOString();
    const updateData: any = {
      updatedBy: cachedProfile.user.id,
      updatedAt: now,
    };

    if (startYear !== undefined) updateData.startYear = startYear;
    if (endYear !== undefined) updateData.endYear = endYear;

    // Multi-tenant: Ensure ownership
    const { data: updatedPlan, error: updatedPlanError } = await supabase
      .from('strategic_plans')
      .update(updateData)
      .eq('id', id)
      .eq('organizationid', organizationId) // Ensure ownership
      .select()
      .single();

    if (updatedPlanError || !updatedPlan) {
      throw new Error(updatedPlanError?.message || 'Failed to update strategic plan');
    }

    // Recreate goals, subgoals, KPIs, and activity links (same logic as create)
    for (let goalIndex = 0; goalIndex < data.length; goalIndex++) {
      const goal = data[goalIndex];
      const goalId = crypto.randomUUID();

      const { error: goalError } = await supabase
        .from('strategic_goals')
        .insert({
          id: goalId,
          strategicPlanId: id,
          title: goal.title,
          description: goal.description || null,
          priority: goal.priority.toUpperCase() as Database['public']['Enums']['StrategicPriority'],
          targetOutcome: goal.targetOutcome || null,
          order: goalIndex,
          organizationid: organizationId, // Multi-tenant: Set organizationid (database column is lowercase)
          createdBy: cachedProfile.user.id,
          updatedBy: cachedProfile.user.id,
          createdAt: now,
          updatedAt: now,
        });

      if (goalError) {
        throw new Error(goalError.message || 'Failed to update strategic goal');
      }

      // Create subgoals
      for (let subGoalIndex = 0; subGoalIndex < goal.subgoals.length; subGoalIndex++) {
        const subGoal = goal.subgoals[subGoalIndex];
        const subGoalId = crypto.randomUUID();

        const { error: subGoalError } = await supabase
          .from('strategic_subgoals')
          .insert({
            id: subGoalId,
            strategicGoalId: goalId,
            title: subGoal.title,
            description: subGoal.description || null,
            order: subGoalIndex,
            organizationid: organizationId, // Multi-tenant: Set organizationid (database column is lowercase)
            createdBy: cachedProfile.user.id,
            updatedBy: cachedProfile.user.id,
            createdAt: now,
            updatedAt: now,
          });

        if (subGoalError) {
          throw new Error(subGoalError.message || 'Failed to update strategic subgoal');
        }

        // Create KPI
        if (subGoal.kpi) {
          const kpiId = crypto.randomUUID();
          const { error: kpiError } = await supabase
            .from('strategic_kpis')
            .insert({
              id: kpiId,
              strategicSubGoalId: subGoalId,
              currentValue: subGoal.kpi.currentValue,
              targetValue: subGoal.kpi.targetValue,
              unit: subGoal.kpi.unit,
              type: subGoal.kpi.type,
              organizationid: organizationId, // Multi-tenant: Set organizationid (database column is lowercase)
              createdBy: cachedProfile.user.id,
              updatedBy: cachedProfile.user.id,
              createdAt: now,
              updatedAt: now,
            });

          if (kpiError) {
            throw new Error(kpiError.message || 'Failed to update strategic KPI');
          }
        }

        // Create activity links (project or org-wide)
        for (const activityLink of subGoal.activityLinks) {
          const isOrgWide = Boolean(activityLink.strategicActivityId);
          if (isOrgWide) {
            const linkId = crypto.randomUUID();
            const insertPayload: StrategicActivityLinkInsert = {
              id: linkId,
              strategicSubGoalId: subGoalId,
              contribution: activityLink.contribution,
              status: activityLink.status.toUpperCase().replace('-', '_') as Database['public']['Enums']['ActivityLinkStatus'],
              organizationid: organizationId,
              createdBy: cachedProfile.user.id,
              updatedBy: cachedProfile.user.id,
              createdAt: now,
              updatedAt: now,
              strategicActivityId: activityLink.strategicActivityId ?? null,
              code: activityLink.code || null,
              responsibleCountry: activityLink.responsibleCountry || null,
              timeframeQ1: activityLink.timeframeQ1 ?? false,
              timeframeQ2: activityLink.timeframeQ2 ?? false,
              timeframeQ3: activityLink.timeframeQ3 ?? false,
              timeframeQ4: activityLink.timeframeQ4 ?? false,
              annualTarget: activityLink.annualTarget ?? null,
              indicatorText: activityLink.indicatorText || null,
              plannedBudget: activityLink.plannedBudget ?? null,
              strategicKpiId: activityLink.strategicKpiId || null,
            };
            const { error: linkError } = await supabase
              .from('strategic_activity_links')
              .insert(insertPayload);
            if (linkError) throw new Error(linkError.message || 'Failed to create org-wide activity link');
          } else {
            if (!activityLink.projectId || !activityLink.activityId) {
              throw new Error('Activity link must have either strategicActivityId (org-wide) or projectId and activityId (project)');
            }
            const { data: project } = await supabase
              .from('projects')
              .select('id, organizationid')
              .eq('id', activityLink.projectId)
              .eq('organizationid', organizationId)
              .single();
            if (!project) throw new Error(`Project ${activityLink.projectId} not found or access denied`);
            const linkId = crypto.randomUUID();
            const insertPayload: StrategicActivityLinkInsert = {
              id: linkId,
              strategicSubGoalId: subGoalId,
              projectId: activityLink.projectId,
              projectName: activityLink.projectName || '',
              activityId: activityLink.activityId,
              activityTitle: activityLink.activityTitle || '',
              contribution: activityLink.contribution,
              status: activityLink.status.toUpperCase().replace('-', '_') as Database['public']['Enums']['ActivityLinkStatus'],
              organizationid: organizationId,
              createdBy: cachedProfile.user.id,
              updatedBy: cachedProfile.user.id,
              createdAt: now,
              updatedAt: now,
              code: activityLink.code || null,
              responsibleCountry: activityLink.responsibleCountry || null,
              timeframeQ1: activityLink.timeframeQ1 ?? false,
              timeframeQ2: activityLink.timeframeQ2 ?? false,
              timeframeQ3: activityLink.timeframeQ3 ?? false,
              timeframeQ4: activityLink.timeframeQ4 ?? false,
              annualTarget: activityLink.annualTarget ?? null,
              indicatorText: activityLink.indicatorText || null,
              plannedBudget: activityLink.plannedBudget ?? null,
              strategicKpiId: activityLink.strategicKpiId || null,
            };
            const { error: linkError } = await supabase
              .from('strategic_activity_links')
              .insert(insertPayload);
            if (linkError) throw new Error(linkError.message || 'Failed to create project activity link');
          }
        }
      }
    }

    return this.formatStrategicPlan(updatedPlan);
  }

  async getStrategicPlans(): Promise<StrategicPlan[]> {
    // Multi-tenant: Filter by organizationId; only active plans (align with backend/ics-dashboard)
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { data, error } = await supabase
      .from('strategic_plans')
      .select('*')
      .eq('organizationid', organizationId) // Filter by organization
      .eq('isActive', true) // Only return active plans
      .order('createdAt', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Failed to fetch strategic plans');
    }

    const plans: StrategicPlan[] = [];
    for (const plan of (data || [])) {
      plans.push(await this.formatStrategicPlan(plan));
    }

    return plans;
  }

  async getActiveStrategicPlan(): Promise<StrategicPlan | null> {
    // Multi-tenant: Filter by organizationId
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { data, error } = await supabase
      .from('strategic_plans')
      .select('*')
      .eq('isActive', true)
      .eq('organizationid', organizationId) // Filter by organization
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No active plan found
      }
      throw new Error(error.message || 'Failed to fetch active strategic plan');
    }

    if (!data) {
      return null;
    }

    return this.formatStrategicPlan(data);
  }

  async getStrategicPlan(id: string): Promise<StrategicPlan> {
    // Multi-tenant: Filter by organizationId
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { data, error } = await supabase
      .from('strategic_plans')
      .select('*')
      .eq('id', id)
      .eq('organizationid', organizationId) // Ensure ownership
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Strategic plan not found or access denied');
    }

    return this.formatStrategicPlan(data);
  }

  async activateStrategicPlan(id: string): Promise<StrategicPlan> {
    // Multi-tenant: Verify ownership first
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    // Use cached user profile
    const cachedProfile = await userProfileCache.getCachedProfile();
    if (!cachedProfile) {
      throw new Error('User profile not found or user is not associated with an organization');
    }

    // Deactivate all other plans (within organization)
    await supabase
      .from('strategic_plans')
      .update({ isActive: false, updatedBy: cachedProfile.user.id, updatedAt: new Date().toISOString() })
      .eq('organizationid', organizationId) // Filter by organization
      .neq('id', id);

    // Activate this plan (ensure ownership)
    const { data, error } = await supabase
      .from('strategic_plans')
      .update({
        isActive: true,
        updatedBy: cachedProfile.user.id,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organizationid', organizationId) // Ensure ownership
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to activate strategic plan');
    }

    return this.formatStrategicPlan(data);
  }

  async getStrategicPlansByYearRange(startYear: number, endYear: number): Promise<StrategicPlan[]> {
    // Multi-tenant: Filter by organizationId
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { data, error } = await supabase
      .from('strategic_plans')
      .select('*')
      .eq('organizationid', organizationId) // Filter by organization
      .gte('startYear', startYear)
      .lte('endYear', endYear)
      .order('createdAt', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Failed to fetch strategic plans by year range');
    }

    const plans: StrategicPlan[] = [];
    for (const plan of (data || [])) {
      plans.push(await this.formatStrategicPlan(plan));
    }

    return plans;
  }

  /** Returns all plans (including inactive) for plan selector / edit UI */
  async getStrategicPlansAll(): Promise<StrategicPlan[]> {
    const organizationId = await this.getCurrentUserOrganizationId();
    const { data, error } = await supabase
      .from('strategic_plans')
      .select('*')
      .eq('organizationid', organizationId)
      .order('createdAt', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Failed to fetch strategic plans');
    }

    const plans: StrategicPlan[] = [];
    for (const plan of (data || [])) {
      plans.push(await this.formatStrategicPlan(plan));
    }
    return plans;
  }

  async getKpisByPlanId(planId: string): Promise<PlanKpi[]> {
    const organizationId = await this.getCurrentUserOrganizationId();
    const { data: kpis, error } = await supabase
      .from('strategic_kpis')
      .select('*')
      .eq('strategicPlanId', planId)
      .eq('organizationid', organizationId)
      .order('createdAt', { ascending: true });

    if (error) {
      throw new Error(error.message || 'Failed to fetch plan KPIs');
    }

    const result: PlanKpi[] = [];
    for (const k of kpis || []) {
      const row = k as Record<string, unknown>;
      const { data: targets } = await supabase
        .from('strategic_kpi_annual_targets')
        .select('year, targetValue')
        .eq('strategicKpiId', k.id)
        .eq('organizationid', organizationId);
      const annualTargets = (targets || []).map((t) => ({ year: t.year, targetValue: t.targetValue }));
      result.push({
        id: k.id,
        name: (row.name as string) || undefined,
        currentValue: k.currentValue,
        targetValue: k.targetValue,
        unit: k.unit,
        type: k.type,
        baseYear: (row.baseYear as number) ?? null,
        baseYearValue: (row.baseYearValue as number) ?? null,
        annualTargets: annualTargets.length ? annualTargets : undefined,
      });
    }
    return result;
  }

  async getActivitiesByPlanId(planId: string): Promise<StrategicActivity[]> {
    const organizationId = await this.getCurrentUserOrganizationId();
    const { data, error } = await supabase
      .from('strategic_activities')
      .select('*')
      .eq('strategicPlanId', planId)
      .eq('organizationid', organizationId)
      .order('order', { ascending: true });

    if (error) {
      throw new Error(error.message || 'Failed to fetch plan activities');
    }

    return (data || []).map((a: Record<string, unknown>) => ({
      id: a.id as string,
      strategicPlanId: a.strategicPlanId as string,
      title: a.title as string,
      description: a.description as string | undefined,
      code: a.code as string | undefined,
      order: (a.order as number) ?? 0,
      timeframeQ1: a.timeframeQ1 as boolean | undefined,
      timeframeQ2: a.timeframeQ2 as boolean | undefined,
      timeframeQ3: a.timeframeQ3 as boolean | undefined,
      timeframeQ4: a.timeframeQ4 as boolean | undefined,
      annualTarget: a.annualTarget != null ? Number(a.annualTarget) : undefined,
      indicatorText: a.indicatorText as string | undefined,
      plannedBudget: a.plannedBudget != null ? Number(a.plannedBudget) : undefined,
      strategicKpiId: a.strategicKpiId as string | undefined,
    }));
  }

  async createKpi(planId: string, data: {
    name?: string;
    currentValue: number;
    targetValue: number;
    unit: string;
    type?: string;
    baseYear?: number;
    baseYearValue?: number;
    annualTargets?: { year: number; targetValue: number }[];
  }): Promise<PlanKpi> {
    const organizationId = await this.getCurrentUserOrganizationId();
    const cachedProfile = await userProfileCache.getCachedProfile();
    if (!cachedProfile) throw new Error('User profile not found');

    const kpiId = crypto.randomUUID();
    const now = new Date().toISOString();
    const kpiInsert: StrategicKpiInsert = {
      id: kpiId,
      strategicPlanId: planId,
      strategicSubGoalId: null,
      name: data.name || null,
      currentValue: data.currentValue,
      targetValue: data.targetValue,
      unit: data.unit,
      type: data.type || 'radialGauge',
      baseYear: data.baseYear ?? null,
      baseYearValue: data.baseYearValue ?? null,
      organizationid: organizationId,
      createdBy: cachedProfile.user.id,
      updatedBy: cachedProfile.user.id,
      createdAt: now,
      updatedAt: now,
    };
    const { error: kpiError } = await supabase
      .from('strategic_kpis')
      .insert(kpiInsert);

    if (kpiError) throw new Error(kpiError.message || 'Failed to create KPI');

    if (data.annualTargets?.length) {
      for (const at of data.annualTargets) {
        const targetInsert: StrategicKpiAnnualTargetInsert = {
          id: crypto.randomUUID(),
          strategicKpiId: kpiId,
          year: at.year,
          targetValue: at.targetValue,
          organizationid: organizationId,
          createdAt: now,
          updatedAt: now,
        };
        await supabase.from('strategic_kpi_annual_targets').insert(targetInsert);
      }
    }

    const created = await this.getKpisByPlanId(planId);
    return created.find((k) => k.id === kpiId) ?? created[0];
  }

  async updateKpi(kpiId: string, data: {
    name?: string | null;
    currentValue?: number;
    targetValue?: number;
    unit?: string;
    type?: string;
    baseYear?: number | null;
    baseYearValue?: number | null;
    annualTargets?: { year: number; targetValue: number }[];
  }): Promise<PlanKpi> {
    const organizationId = await this.getCurrentUserOrganizationId();
    const cachedProfile = await userProfileCache.getCachedProfile();
    if (!cachedProfile) throw new Error('User profile not found');

    const now = new Date().toISOString();
    const updatePayload: Record<string, unknown> = {
      updatedBy: cachedProfile.user.id,
      updatedAt: now,
    };
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.currentValue !== undefined) updatePayload.currentValue = data.currentValue;
    if (data.targetValue !== undefined) updatePayload.targetValue = data.targetValue;
    if (data.unit !== undefined) updatePayload.unit = data.unit;
    if (data.type !== undefined) updatePayload.type = data.type;
    if (data.baseYear !== undefined) updatePayload.baseYear = data.baseYear;
    if (data.baseYearValue !== undefined) updatePayload.baseYearValue = data.baseYearValue;

    const { error } = await supabase
      .from('strategic_kpis')
      .update(updatePayload)
      .eq('id', kpiId)
      .eq('organizationid', organizationId);

    if (error) throw new Error(error.message || 'Failed to update KPI');

    if (data.annualTargets !== undefined) {
      await supabase
        .from('strategic_kpi_annual_targets')
        .delete()
        .eq('strategicKpiId', kpiId)
        .eq('organizationid', organizationId);
      for (const at of data.annualTargets) {
        const targetInsert: StrategicKpiAnnualTargetInsert = {
          id: crypto.randomUUID(),
          strategicKpiId: kpiId,
          year: at.year,
          targetValue: at.targetValue,
          organizationid: organizationId,
          createdAt: now,
          updatedAt: now,
        };
        await supabase.from('strategic_kpi_annual_targets').insert(targetInsert);
      }
    }

    const { data: kpi } = await supabase.from('strategic_kpis').select('strategicPlanId').eq('id', kpiId).single();
    const planId = (kpi as { strategicPlanId?: string } | null)?.strategicPlanId;
    if (planId) {
      const list = await this.getKpisByPlanId(planId);
      return list.find((k) => k.id === kpiId) ?? list[0];
    }
    throw new Error('KPI plan not found');
  }

  async deleteKpi(kpiId: string): Promise<void> {
    const organizationId = await this.getCurrentUserOrganizationId();
    const { error } = await supabase
      .from('strategic_kpis')
      .delete()
      .eq('id', kpiId)
      .eq('organizationid', organizationId);
    if (error) throw new Error(error.message || 'Failed to delete KPI');
  }

  async createActivity(planId: string, data: {
    title: string;
    description?: string;
    code?: string;
    timeframeQ1?: boolean;
    timeframeQ2?: boolean;
    timeframeQ3?: boolean;
    timeframeQ4?: boolean;
    annualTarget?: number;
    indicatorText?: string;
    plannedBudget?: number;
    strategicKpiId?: string;
  }): Promise<StrategicActivity> {
    const organizationId = await this.getCurrentUserOrganizationId();
    const cachedProfile = await userProfileCache.getCachedProfile();
    if (!cachedProfile) throw new Error('User profile not found');

    const activityId = crypto.randomUUID();
    const now = new Date().toISOString();
    const { count } = await supabase
      .from('strategic_activities')
      .select('id', { count: 'exact', head: true })
      .eq('strategicPlanId', planId);
    const order = count ?? 0;

    const activityInsert: StrategicActivityInsert = {
      id: activityId,
      strategicPlanId: planId,
      title: data.title,
      description: data.description || null,
      code: data.code || null,
      order,
      timeframeQ1: data.timeframeQ1 ?? false,
      timeframeQ2: data.timeframeQ2 ?? false,
      timeframeQ3: data.timeframeQ3 ?? false,
      timeframeQ4: data.timeframeQ4 ?? false,
      annualTarget: data.annualTarget ?? null,
      indicatorText: data.indicatorText || null,
      plannedBudget: data.plannedBudget ?? null,
      strategicKpiId: data.strategicKpiId || null,
      organizationid: organizationId,
      createdBy: cachedProfile.user.id,
      updatedBy: cachedProfile.user.id,
      createdAt: now,
      updatedAt: now,
    };
    const { error } = await supabase.from('strategic_activities').insert(activityInsert);

    if (error) throw new Error(error.message || 'Failed to create activity');

    const list = await this.getActivitiesByPlanId(planId);
    return list.find((a) => a.id === activityId) ?? list[0];
  }

  async updateActivity(activityId: string, data: {
    title?: string;
    description?: string;
    code?: string;
    timeframeQ1?: boolean;
    timeframeQ2?: boolean;
    timeframeQ3?: boolean;
    timeframeQ4?: boolean;
    annualTarget?: number;
    indicatorText?: string;
    plannedBudget?: number;
    strategicKpiId?: string;
  }): Promise<StrategicActivity> {
    const organizationId = await this.getCurrentUserOrganizationId();
    const cachedProfile = await userProfileCache.getCachedProfile();
    if (!cachedProfile) throw new Error('User profile not found');

    const now = new Date().toISOString();
    const updatePayload: Record<string, unknown> = {
      updatedBy: cachedProfile.user.id,
      updatedAt: now,
    };
    if (data.title !== undefined) updatePayload.title = data.title;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.code !== undefined) updatePayload.code = data.code;
    if (data.timeframeQ1 !== undefined) updatePayload.timeframeQ1 = data.timeframeQ1;
    if (data.timeframeQ2 !== undefined) updatePayload.timeframeQ2 = data.timeframeQ2;
    if (data.timeframeQ3 !== undefined) updatePayload.timeframeQ3 = data.timeframeQ3;
    if (data.timeframeQ4 !== undefined) updatePayload.timeframeQ4 = data.timeframeQ4;
    if (data.annualTarget !== undefined) updatePayload.annualTarget = data.annualTarget;
    if (data.indicatorText !== undefined) updatePayload.indicatorText = data.indicatorText;
    if (data.plannedBudget !== undefined) updatePayload.plannedBudget = data.plannedBudget;
    if (data.strategicKpiId !== undefined) updatePayload.strategicKpiId = data.strategicKpiId;

    const { error } = await supabase
      .from('strategic_activities')
      .update(updatePayload)
      .eq('id', activityId)
      .eq('organizationid', organizationId);

    if (error) throw new Error(error.message || 'Failed to update activity');

    const { data: act } = await supabase.from('strategic_activities').select('strategicPlanId').eq('id', activityId).single();
    const planId = (act as { strategicPlanId?: string } | null)?.strategicPlanId;
    if (planId) {
      const list = await this.getActivitiesByPlanId(planId);
      return list.find((a) => a.id === activityId) ?? list[0];
    }
    throw new Error('Activity plan not found');
  }

  async deleteActivity(activityId: string): Promise<void> {
    const organizationId = await this.getCurrentUserOrganizationId();
    const { error } = await supabase
      .from('strategic_activities')
      .delete()
      .eq('id', activityId)
      .eq('organizationid', organizationId);
    if (error) throw new Error(error.message || 'Failed to delete activity');
  }

  async deleteStrategicPlan(id: string): Promise<void> {
    // Multi-tenant: Verify ownership first
    const organizationId = await this.getCurrentUserOrganizationId();
    
    // Verify plan belongs to user's organization
    const { data: plan, error: planError } = await supabase
      .from('strategic_plans')
      .select('id, organizationid')
      .eq('id', id)
      .eq('organizationid', organizationId)
      .single();

    if (planError || !plan) {
      throw new Error('Strategic plan not found or access denied');
    }
    
    // Delete goals (filtered by organization)
    await supabase
      .from('strategic_goals')
      .delete()
      .eq('strategicPlanId', id)
      .eq('organizationid', organizationId); // Filter by organization

    // Delete plan (ensure ownership)
    const { error } = await supabase
      .from('strategic_plans')
      .delete()
      .eq('id', id)
      .eq('organizationid', organizationId); // Ensure ownership

    if (error) {
      throw new Error(error.message || 'Failed to delete strategic plan or access denied');
    }

    // Note: Usage tracking is now handled by database trigger (track_strategic_plan_delete)
    // This ensures atomicity and better performance
  }

  /** Permanently delete all inactive strategic plans for the current organization (align with backend/ics-dashboard). */
  async purgeInactivePlans(): Promise<{ purged: number }> {
    const organizationId = await this.getCurrentUserOrganizationId();
    const { data: inactivePlans, error: fetchError } = await supabase
      .from('strategic_plans')
      .select('id')
      .eq('organizationid', organizationId)
      .eq('isActive', false);

    if (fetchError) {
      throw new Error(fetchError.message || 'Failed to fetch inactive plans');
    }
    const ids = (inactivePlans || []).map((p) => p.id);
    if (ids.length === 0) {
      return { purged: 0 };
    }
    for (const id of ids) {
      await supabase
        .from('strategic_goals')
        .delete()
        .eq('strategicPlanId', id)
        .eq('organizationid', organizationId);
      await supabase
        .from('strategic_plans')
        .delete()
        .eq('id', id)
        .eq('organizationid', organizationId);
    }
    return { purged: ids.length };
  }
}

export const supabaseStrategicPlanService = new SupabaseStrategicPlanService();

