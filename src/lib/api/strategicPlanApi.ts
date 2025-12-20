import { supabaseStrategicPlanService } from '@/services/supabaseStrategicPlanService';
import type {
  StrategicKPI,
  StrategicActivityLink,
  StrategicSubGoal,
  StrategicGoal,
  StrategicPlan,
} from '@/services/supabaseStrategicPlanService';

// Re-export types for backwards compatibility
export type {
  StrategicKPI,
  StrategicActivityLink,
  StrategicSubGoal,
  StrategicGoal,
  StrategicPlan,
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

  async deleteStrategicPlan(id: string): Promise<void> {
    return supabaseStrategicPlanService.deleteStrategicPlan(id);
  }
}

export const strategicPlanApi = new StrategicPlanApi();
