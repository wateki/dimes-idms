import { supabaseReportWorkflowService } from './supabaseReportWorkflowService';
import type {
  WorkflowReportSummary,
  WorkflowListResponse,
} from './supabaseReportWorkflowService';

// Re-export types for backwards compatibility
export type { WorkflowReportSummary, WorkflowListResponse };

class ReportWorkflowService {

  async getPendingReviews(projectId?: string): Promise<WorkflowListResponse> {
    return supabaseReportWorkflowService.getPendingReviews(projectId);
  }

  async getMyReports(projectId?: string, status?: string): Promise<WorkflowListResponse> {
    return supabaseReportWorkflowService.getMyReports(projectId, status);
  }

  async getReportById(reportId: string): Promise<WorkflowReportSummary> {
    return supabaseReportWorkflowService.getReportById(reportId);
  }

  async getByFile(fileReportId: string): Promise<WorkflowReportSummary> {
    return supabaseReportWorkflowService.getByFile(fileReportId);
  }

  async review(reportId: string, action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'SKIP', comment?: string, reasoning?: string, skipToFinalApproval?: boolean): Promise<WorkflowReportSummary> {
    return supabaseReportWorkflowService.review(reportId, action, comment, reasoning, skipToFinalApproval);
  }

  async addComment(reportId: string, content: string, isInternal?: boolean, replyToCommentId?: string): Promise<void> {
    return supabaseReportWorkflowService.addComment(reportId, content, isInternal, replyToCommentId);
  }

  async resubmitWorkflow(reportId: string, fileIds?: string[]): Promise<WorkflowReportSummary> {
    return supabaseReportWorkflowService.resubmitWorkflow(reportId, fileIds);
  }

  async cancelWorkflow(reportId: string, reason?: string): Promise<WorkflowReportSummary> {
    return supabaseReportWorkflowService.cancelWorkflow(reportId, reason);
  }

  async delegateReview(stepId: string, delegateToUserId: string, reason: string): Promise<void> {
    return supabaseReportWorkflowService.delegateReview(stepId, delegateToUserId, reason);
  }

  async escalateReview(reportId: string, escalationReason: string, escalateToUserId: string): Promise<WorkflowReportSummary> {
    return supabaseReportWorkflowService.escalateReview(reportId, escalationReason, escalateToUserId);
  }

  async setStepDueDate(stepId: string, dueDate: Date): Promise<void> {
    return supabaseReportWorkflowService.setStepDueDate(stepId, dueDate);
  }

  async updateStatus(
    reportId: string,
    status: string,
    assignedTo?: string,
    reason?: string,
    details?: string
  ): Promise<WorkflowReportSummary> {
    return supabaseReportWorkflowService.updateStatus(reportId, status, assignedTo, reason, details);
  }

  async startReview(stepId: string): Promise<void> {
    return supabaseReportWorkflowService.startReview(stepId);
  }

  async requestInformation(
    reportId: string,
    requestedFrom: string,
    informationNeeded: string,
    deadline?: Date
  ): Promise<void> {
    return supabaseReportWorkflowService.requestInformation(reportId, requestedFrom, informationNeeded, deadline);
  }

  async conditionalApprove(reportId: string, conditions: string[], comment: string): Promise<WorkflowReportSummary> {
    return supabaseReportWorkflowService.conditionalApprove(reportId, conditions, comment);
  }

  async createWorkflowVersion(reportId: string, checkpointNote: string): Promise<{ versionNumber: number; checkpointNote: string }> {
    return supabaseReportWorkflowService.createWorkflowVersion(reportId, checkpointNote);
  }

  async returnToStep(reportId: string, returnToStepId: string, reason: string): Promise<WorkflowReportSummary> {
    return supabaseReportWorkflowService.returnToStep(reportId, returnToStepId, reason);
  }

  async getWeightedApproval(reportId: string): Promise<{
    isApproved: boolean;
    totalWeight: number;
    approvedWeight: number;
    requiredWeight: number;
  }> {
    return supabaseReportWorkflowService.getWeightedApproval(reportId);
  }

  async bulkApprove(reportIds: string[], comment?: string): Promise<{ success: number; failed: number; errors: string[] }> {
    return supabaseReportWorkflowService.bulkApprove(reportIds, comment);
  }

  async bulkReject(reportIds: string[], reason: string): Promise<{ success: number; failed: number; errors: string[] }> {
    return supabaseReportWorkflowService.bulkReject(reportIds, reason);
  }

  async bulkReassign(reportIds: string[], reassignToUserId: string, reason?: string): Promise<{ success: number; failed: number; errors: string[] }> {
    return supabaseReportWorkflowService.bulkReassign(reportIds, reassignToUserId, reason);
  }

  async getReviewerWorkload(projectId?: string, reviewerId?: string): Promise<{
    reviewers: Array<{
      reviewerId: string;
      reviewerName: string;
      pendingCount: number;
      completedCount: number;
      overdueCount: number;
      averageReviewTime: number;
      reports: Array<{
        reportId: string;
        reportName: string;
        stepOrder: number;
        dueDate?: Date;
        isOverdue: boolean;
        daysPending: number;
      }>;
    }>;
  }> {
    return supabaseReportWorkflowService.getReviewerWorkload(projectId, reviewerId);
  }
}

export const reportWorkflowService = new ReportWorkflowService();


