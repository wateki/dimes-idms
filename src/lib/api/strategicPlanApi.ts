import { supabaseStrategicPlanService } from '@/services/supabaseStrategicPlanService';
import type {
  StrategicKPI,
  StrategicActivityLink,
  StrategicSubGoal,
  StrategicGoal,
  StrategicPlan,
  PlanKpi,
  StrategicActivity,
} from '@/services/supabaseStrategicPlanService';

// Re-export types for backwards compatibility
export type {
  StrategicKPI,
  StrategicActivityLink,
  StrategicSubGoal,
  StrategicGoal,
  StrategicPlan,
  PlanKpi,
  StrategicActivity,
};

class StrategicPlanApi {
  async createStrategicPlan(data: StrategicGoal[], startYear?: number, endYear?: number): Promise<StrategicPlan> {
    return supabaseStrategicPlanService.createStrategicPlan(data, startYear, endYear);
  }

  async updateStrategicPlan(id: string, data: StrategicGoal[], startYear?: number, endYear?: number): Promise<StrategicPlan> {
    return supabaseStrategicPlanService.updateStrategicPlan(id, data, startYear, endYear);
  }

  async getStrategicPlans(): Promise<StrategicPlan[]> {
    return supabaseStrategicPlanService.getStrategicPlans();
  }

  async getActiveStrategicPlan(): Promise<StrategicPlan | null> {
    return supabaseStrategicPlanService.getActiveStrategicPlan();
  }

  async getStrategicPlan(id: string): Promise<StrategicPlan> {
    return supabaseStrategicPlanService.getStrategicPlan(id);
  }

  async activateStrategicPlan(id: string): Promise<StrategicPlan> {
    return supabaseStrategicPlanService.activateStrategicPlan(id);
  }

  async getStrategicPlansByYearRange(startYear: number, endYear: number): Promise<StrategicPlan[]> {
    return supabaseStrategicPlanService.getStrategicPlansByYearRange(startYear, endYear);
  }

  /** Returns all plans (including inactive) for plan selector. */
  async getStrategicPlansAll(): Promise<StrategicPlan[]> {
    return supabaseStrategicPlanService.getStrategicPlansAll();
  }

  async getKpisByPlanId(planId: string): Promise<PlanKpi[]> {
    return supabaseStrategicPlanService.getKpisByPlanId(planId);
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
    return supabaseStrategicPlanService.createKpi(planId, data);
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
    return supabaseStrategicPlanService.updateKpi(kpiId, data);
  }

  async deleteKpi(kpiId: string): Promise<void> {
    return supabaseStrategicPlanService.deleteKpi(kpiId);
  }

  async getActivitiesByPlanId(planId: string): Promise<StrategicActivity[]> {
    return supabaseStrategicPlanService.getActivitiesByPlanId(planId);
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
    return supabaseStrategicPlanService.createActivity(planId, data);
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
    return supabaseStrategicPlanService.updateActivity(activityId, data);
  }

  async deleteActivity(activityId: string): Promise<void> {
    return supabaseStrategicPlanService.deleteActivity(activityId);
  }

  async deleteStrategicPlan(id: string): Promise<void> {
    return supabaseStrategicPlanService.deleteStrategicPlan(id);
  }

  /** Permanently delete all inactive strategic plans for the current organization. */
  async purgeInactivePlans(): Promise<{ purged: number }> {
    return supabaseStrategicPlanService.purgeInactivePlans();
  }
}

export const strategicPlanApi = new StrategicPlanApi();
