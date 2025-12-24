import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/types/supabase';
import { supabaseAuthService } from './supabaseAuthService';
import { supabaseUsageTrackingService } from './supabaseUsageTrackingService';

type StrategicPlanRow = Database['public']['Tables']['strategic_plans']['Row'];
type StrategicGoalRow = Database['public']['Tables']['strategic_goals']['Row'];
type StrategicSubGoalRow = Database['public']['Tables']['strategic_subgoals']['Row'];
type StrategicKpiRow = Database['public']['Tables']['strategic_kpis']['Row'];
type StrategicActivityLinkRow = Database['public']['Tables']['strategic_activity_links']['Row'];

export interface StrategicKPI {
  currentValue: number;
  targetValue: number;
  unit: string;
  type: string;
}

export interface StrategicActivityLink {
  projectId: string;
  projectName: string;
  activityId: string;
  activityTitle: string;
  contribution: number;
  status: 'contributing' | 'at-risk' | 'not-contributing';
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
   * Get current user's organizationId
   */
  private async getCurrentUserOrganizationId(): Promise<string> {
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile || !userProfile.organizationId) {
      throw new Error('User is not associated with an organization');
    }

    return userProfile.organizationId;
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

            const links: StrategicActivityLink[] = (activityLinks || []).map(link => ({
              projectId: link.projectId,
              projectName: link.projectName || '',
              activityId: link.activityId,
              activityTitle: link.activityTitle || '',
              contribution: link.contribution || 0,
              status: (link.status?.toLowerCase().replace('_', '-') || 'not-contributing') as 'contributing' | 'at-risk' | 'not-contributing',
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
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile || !userProfile.organizationId) {
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
        organizationid: userProfile.organizationId, // Multi-tenant: Set organizationid (database column is lowercase)
        createdBy: userProfile.id,
        updatedBy: userProfile.id,
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
          organizationid: userProfile.organizationId, // Multi-tenant: Set organizationid (database column is lowercase)
          createdBy: userProfile.id,
          updatedBy: userProfile.id,
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
            createdBy: userProfile.id,
            updatedBy: userProfile.id,
            createdAt: now,
            updatedAt: now,
            organizationid: userProfile.organizationId, // Multi-tenant: Set organizationid (database column is lowercase)
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
              createdBy: userProfile.id,
              updatedBy: userProfile.id,
              organizationid: userProfile.organizationId, // Multi-tenant: Set organizationid (database column is lowercase)
              createdAt: now,
              updatedAt: now,
            });

          if (kpiError) {
            throw new Error(kpiError.message || 'Failed to create strategic KPI');
          }
        }

        // Create activity links
        for (const activityLink of subGoal.activityLinks) {
          const linkId = crypto.randomUUID();
          const { error: linkError } = await supabase
            .from('strategic_activity_links')
            .insert({
              id: linkId,
              strategicSubGoalId: subGoalId,
              projectId: activityLink.projectId,
              projectName: activityLink.projectName,
              activityId: activityLink.activityId,
              activityTitle: activityLink.activityTitle,
              contribution: activityLink.contribution,
              status: activityLink.status.toUpperCase().replace('-', '_') as Database['public']['Enums']['ActivityLinkStatus'],
              createdBy: userProfile.id,
              updatedBy: userProfile.id,
              organizationid: userProfile.organizationId, // Multi-tenant: Set organizationid (database column is lowercase)
              createdAt: now,
              updatedAt: now,
            });

          if (linkError) {
            throw new Error(linkError.message || 'Failed to create strategic activity link');
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
    
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile || !userProfile.organizationId) {
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
      updatedBy: userProfile.id,
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
          createdBy: userProfile.id,
          updatedBy: userProfile.id,
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
            createdBy: userProfile.id,
            updatedBy: userProfile.id,
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
              createdBy: userProfile.id,
              updatedBy: userProfile.id,
              createdAt: now,
              updatedAt: now,
            });

          if (kpiError) {
            throw new Error(kpiError.message || 'Failed to update strategic KPI');
          }
        }

        // Create activity links
        for (const activityLink of subGoal.activityLinks) {
          // Multi-tenant: Verify project belongs to user's organization
          const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('id, organizationid')
            .eq('id', activityLink.projectId)
            .eq('organizationid', organizationId)
            .single();

          if (projectError || !project) {
            throw new Error(`Project ${activityLink.projectId} not found or access denied`);
          }
          
          const linkId = crypto.randomUUID();
          const { error: linkError } = await supabase
            .from('strategic_activity_links')
            .insert({
              id: linkId,
              strategicSubGoalId: subGoalId,
              projectId: activityLink.projectId,
              projectName: activityLink.projectName,
              activityId: activityLink.activityId,
              activityTitle: activityLink.activityTitle,
              contribution: activityLink.contribution,
              status: activityLink.status.toUpperCase().replace('-', '_') as Database['public']['Enums']['ActivityLinkStatus'],
              organizationid: organizationId, // Multi-tenant: Set organizationid (database column is lowercase)
              createdBy: userProfile.id,
              updatedBy: userProfile.id,
              createdAt: now,
              updatedAt: now,
            });

          if (linkError) {
            throw new Error(linkError.message || 'Failed to update strategic activity link');
          }
        }
      }
    }

    return this.formatStrategicPlan(updatedPlan);
  }

  async getStrategicPlans(): Promise<StrategicPlan[]> {
    // Multi-tenant: Filter by organizationId
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { data, error } = await supabase
      .from('strategic_plans')
      .select('*')
      .eq('organizationid', organizationId) // Filter by organization
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

    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile || !userProfile.organizationId) {
      throw new Error('User profile not found or user is not associated with an organization');
    }

    // Deactivate all other plans (within organization)
    await supabase
      .from('strategic_plans')
      .update({ isActive: false, updatedBy: userProfile.id, updatedAt: new Date().toISOString() })
      .eq('organizationid', organizationId) // Filter by organization
      .neq('id', id);

    // Activate this plan (ensure ownership)
    const { data, error } = await supabase
      .from('strategic_plans')
      .update({
        isActive: true,
        updatedBy: userProfile.id,
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
}

export const supabaseStrategicPlanService = new SupabaseStrategicPlanService();

