import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/types/supabase';
import { supabaseAuthService } from './supabaseAuthService';

type ReportWorkflow = Database['public']['Tables']['report_workflows']['Row'];
type ReportApprovalStep = Database['public']['Tables']['report_approval_steps']['Row'];
type ReportComment = Database['public']['Tables']['report_comments']['Row'];

export interface WorkflowReportSummary {
  id: string;
  name: string;
  description?: string;
  category: string;
  status: string;
  submittedAt: string;
  lastReviewAt?: string;
  completedAt?: string;
  approvalSteps?: Array<{
    id: string;
    stepOrder: number;
    isCompleted: boolean;
    reviewerId: string;
  }>;
}

export interface WorkflowListResponse {
  reports: WorkflowReportSummary[];
  total: number;
}

class SupabaseReportWorkflowService {
  private formatWorkflowSummary(workflow: ReportWorkflow, steps?: ReportApprovalStep[]): WorkflowReportSummary {
    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description || undefined,
      category: workflow.category,
      status: workflow.status,
      submittedAt: workflow.submittedAt,
      lastReviewAt: workflow.lastReviewAt || undefined,
      completedAt: workflow.completedAt || undefined,
      approvalSteps: steps?.map(s => ({
        id: s.id,
        stepOrder: s.stepOrder,
        isCompleted: s.isCompleted,
        reviewerId: s.reviewerId,
      })),
    };
  }

  async getPendingReviews(projectId?: string): Promise<WorkflowListResponse> {
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile) {
      throw new Error('User profile not found');
    }

    // Get workflows with pending approval steps for current user
    let query = supabase
      .from('report_workflows')
      .select(`
        *,
        approvalSteps:report_approval_steps(*)
      `)
      .or('status.eq.PENDING,status.eq.IN_REVIEW,status.eq.CHANGES_REQUESTED');

    if (projectId) {
      query = query.eq('projectId', projectId);
    }

    const { data: workflows, error } = await query
      .order('submittedAt', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Failed to fetch pending reviews');
    }

    // Filter workflows where user has an incomplete approval step
    const filtered = (workflows || []).filter((w: any) => {
      const steps = w.approvalSteps || [];
      return steps.some((s: ReportApprovalStep) => 
        s.reviewerId === userProfile.id && !s.isCompleted
      );
    });

    return {
      reports: filtered.map((w: any) => this.formatWorkflowSummary(w, w.approvalSteps)),
      total: filtered.length,
    };
  }

  async getMyReports(projectId?: string, status?: string): Promise<WorkflowListResponse> {
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile) {
      throw new Error('User profile not found');
    }

    let query = supabase
      .from('report_workflows')
      .select(`
        *,
        approvalSteps:report_approval_steps(*)
      `)
      .eq('submittedBy', userProfile.id);

    if (projectId) {
      query = query.eq('projectId', projectId);
    }

    if (status) {
      query = query.eq('status', status as Database['public']['Enums']['WorkflowStatus']);
    }

    const { data: workflows, error } = await query
      .order('submittedAt', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Failed to fetch my reports');
    }

    return {
      reports: (workflows || []).map((w: any) => this.formatWorkflowSummary(w, w.approvalSteps)),
      total: workflows?.length || 0,
    };
  }

  async getReportById(reportId: string): Promise<WorkflowReportSummary> {
    const { data: workflow, error } = await supabase
      .from('report_workflows')
      .select(`
        *,
        approvalSteps:report_approval_steps(*)
      `)
      .eq('id', reportId)
      .single();

    if (error || !workflow) {
      throw new Error(error?.message || 'Report workflow not found');
    }

    return this.formatWorkflowSummary(workflow, (workflow as any).approvalSteps);
  }

  async getByFile(fileReportId: string): Promise<WorkflowReportSummary> {
    // Find workflow that contains this file ID
    const { data: workflows, error } = await supabase
      .from('report_workflows')
      .select(`
        *,
        approvalSteps:report_approval_steps(*)
      `)
      .contains('fileIds', [fileReportId]);

    if (error || !workflows || workflows.length === 0) {
      throw new Error(error?.message || 'Workflow not found for this file');
    }

    return this.formatWorkflowSummary(workflows[0], (workflows[0] as any).approvalSteps);
  }

  async review(
    reportId: string,
    action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'SKIP',
    comment?: string,
    reasoning?: string,
    skipToFinalApproval?: boolean
  ): Promise<WorkflowReportSummary> {
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile) {
      throw new Error('User profile not found');
    }

    // Get workflow and approval steps
    const { data: workflow, error: workflowError } = await supabase
      .from('report_workflows')
      .select(`
        *,
        approvalSteps:report_approval_steps(*)
      `)
      .eq('id', reportId)
      .single();

    if (workflowError || !workflow) {
      throw new Error(workflowError?.message || 'Report workflow not found');
    }

    const steps = (workflow as any).approvalSteps as ReportApprovalStep[];
    const userStep = steps.find(s => s.reviewerId === userProfile.id && !s.isCompleted);

    if (!userStep) {
      throw new Error('You are not authorized to review this report or have already completed your review');
    }

    // Check if this is the earliest pending step
    const earliestPending = steps
      .filter(s => !s.isCompleted)
      .sort((a, b) => a.stepOrder - b.stepOrder)[0];

    if (earliestPending && earliestPending.id !== userStep.id) {
      throw new Error('You must wait for prior approvals before taking action');
    }

    // Update approval step
    const now = new Date().toISOString();
    const { error: stepError } = await supabase
      .from('report_approval_steps')
      .update({
        action: action as Database['public']['Enums']['ReviewAction'],
        comment: comment || null,
        reasoning: reasoning || null,
        isCompleted: true,
        completedAt: now,
        updatedAt: now,
      })
      .eq('id', userStep.id);

    if (stepError) {
      throw new Error(stepError.message || 'Failed to update approval step');
    }

    // Add comment if provided
    if (comment) {
      await this.addComment(reportId, comment, false);
    }

    // Determine new status
    let newStatus: Database['public']['Enums']['WorkflowStatus'] = workflow.status;
    if (action === 'REJECT') {
      newStatus = 'REJECTED';
    } else if (action === 'REQUEST_CHANGES') {
      newStatus = 'CHANGES_REQUESTED';
    } else if (action === 'APPROVE' || action === 'SKIP') {
      // Check if all required steps are complete
      const allComplete = steps.every(s => s.isCompleted || !s.isRequired);
      if (allComplete || skipToFinalApproval) {
        newStatus = 'APPROVED';
      } else {
        newStatus = 'IN_REVIEW';
      }
    }

    // Update workflow status
    const updateData: any = {
      status: newStatus,
      lastReviewAt: now,
      updatedAt: now,
    };

    if (newStatus === 'APPROVED' || newStatus === 'REJECTED') {
      updateData.completedAt = now;
    }

    const { data: updatedWorkflow, error: updateError } = await supabase
      .from('report_workflows')
      .update(updateData)
      .eq('id', reportId)
      .select(`
        *,
        approvalSteps:report_approval_steps(*)
      `)
      .single();

    if (updateError || !updatedWorkflow) {
      throw new Error(updateError?.message || 'Failed to update workflow');
    }

    return this.formatWorkflowSummary(updatedWorkflow, (updatedWorkflow as any).approvalSteps);
  }

  async addComment(
    reportId: string,
    content: string,
    isInternal?: boolean,
    replyToCommentId?: string
  ): Promise<void> {
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile) {
      throw new Error('User profile not found');
    }

    // Calculate thread depth if this is a reply
    let threadDepth = 0;
    if (replyToCommentId) {
      const { data: parentComment } = await supabase
        .from('report_comments')
        .select('threadDepth')
        .eq('id', replyToCommentId)
        .single();

      if (parentComment) {
        threadDepth = parentComment.threadDepth + 1;
      }
    }

    const now = new Date().toISOString();
    // Generate UUID for comment ID
    const commentId = crypto.randomUUID();
    const { error } = await supabase
      .from('report_comments')
      .insert({
        id: commentId,
        reportWorkflowId: reportId,
        authorId: userProfile.id,
        content,
        isInternal: isInternal || false,
        parentCommentId: replyToCommentId || null,
        threadDepth,
        createdAt: now,
        updatedAt: now,
      });

    if (error) {
      throw new Error(error.message || 'Failed to add comment');
    }
  }

  async resubmitWorkflow(reportId: string, fileIds?: string[]): Promise<WorkflowReportSummary> {
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile) {
      throw new Error('User profile not found');
    }

    // Get current workflow
    const workflow = await this.getReportById(reportId);

    // Update workflow with new file IDs and reset status
    const now = new Date().toISOString();
    const updateData: any = {
      status: 'PENDING',
      lastReviewAt: null,
      completedAt: null,
      updatedAt: now,
    };

    if (fileIds) {
      updateData.fileIds = fileIds;
    }

    // Reset all approval steps
    await supabase
      .from('report_approval_steps')
      .update({
        isCompleted: false,
        completedAt: null,
        action: null,
        comment: null,
        reasoning: null,
        updatedAt: now,
      })
      .eq('reportWorkflowId', reportId);

    const { data: updated, error } = await supabase
      .from('report_workflows')
      .update(updateData)
      .eq('id', reportId)
      .select(`
        *,
        approvalSteps:report_approval_steps(*)
      `)
      .single();

    if (error || !updated) {
      throw new Error(error?.message || 'Failed to resubmit workflow');
    }

    return this.formatWorkflowSummary(updated, (updated as any).approvalSteps);
  }

  async cancelWorkflow(reportId: string, reason?: string): Promise<WorkflowReportSummary> {
    const now = new Date().toISOString();
    const { data: updated, error } = await supabase
      .from('report_workflows')
      .update({
        status: 'CANCELLED',
        notes: reason || null,
        completedAt: now,
        updatedAt: now,
      })
      .eq('id', reportId)
      .select(`
        *,
        approvalSteps:report_approval_steps(*)
      `)
      .single();

    if (error || !updated) {
      throw new Error(error?.message || 'Failed to cancel workflow');
    }

    if (reason) {
      await this.addComment(reportId, `Workflow cancelled: ${reason}`, false);
    }

    return this.formatWorkflowSummary(updated, (updated as any).approvalSteps);
  }

  async delegateReview(stepId: string, delegateToUserId: string, reason: string): Promise<void> {
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile) {
      throw new Error('User profile not found');
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('report_approval_steps')
      .update({
        isDelegated: true,
        delegatedTo: delegateToUserId,
        delegatedBy: userProfile.id,
        delegatedAt: now,
        delegationReason: reason,
        updatedAt: now,
      })
      .eq('id', stepId);

    if (error) {
      throw new Error(error.message || 'Failed to delegate review');
    }
  }

  async escalateReview(
    reportId: string,
    escalationReason: string,
    escalateToUserId: string
  ): Promise<WorkflowReportSummary> {
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile) {
      throw new Error('User profile not found');
    }

    // Create a new approval step for escalation
    const workflow = await this.getReportById(reportId);
    const { data: steps } = await supabase
      .from('report_approval_steps')
      .select('stepOrder')
      .eq('reportWorkflowId', reportId)
      .order('stepOrder', { ascending: false })
      .limit(1)
      .single();

    const maxStepOrder = steps?.stepOrder || 0;
    const now = new Date().toISOString();
    const stepId = crypto.randomUUID();

    await supabase
      .from('report_approval_steps')
      .insert({
        id: stepId,
        reportWorkflowId: reportId,
        reviewerId: escalateToUserId,
        stepOrder: maxStepOrder + 1,
        isRequired: true,
        isCompleted: false,
        approvalType: 'SEQUENTIAL',
        approvalWeight: 1,
        canSkip: false,
        escalationLevel: 1,
        escalationReason,
        escalatedBy: userProfile.id,
        escalatedAt: now,
        createdBy: userProfile.id,
        createdAt: now,
        updatedAt: now,
      });

    // Update workflow
    const { data: updated, error } = await supabase
      .from('report_workflows')
      .update({
        status: 'IN_REVIEW',
        lastEscalationAt: now,
        updatedAt: now,
      })
      .eq('id', reportId)
      .select(`
        *,
        approvalSteps:report_approval_steps(*)
      `)
      .single();

    if (error || !updated) {
      throw new Error(error?.message || 'Failed to escalate review');
    }

    return this.formatWorkflowSummary(updated, (updated as any).approvalSteps);
  }

  async setStepDueDate(stepId: string, dueDate: Date): Promise<void> {
    const { error } = await supabase
      .from('report_approval_steps')
      .update({
        dueDate: dueDate.toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .eq('id', stepId);

    if (error) {
      throw new Error(error.message || 'Failed to set due date');
    }
  }

  async updateStatus(
    reportId: string,
    status: string,
    assignedTo?: string,
    reason?: string,
    details?: string
  ): Promise<WorkflowReportSummary> {
    const updateData: any = {
      status: status as Database['public']['Enums']['WorkflowStatus'],
      updatedAt: new Date().toISOString(),
    };

    if (assignedTo) updateData.assignedTo = assignedTo;
    if (reason) updateData.notes = reason;
    if (status === 'APPROVED' || status === 'REJECTED') {
      updateData.completedAt = new Date().toISOString();
    }

    const { data: updated, error } = await supabase
      .from('report_workflows')
      .update(updateData)
      .eq('id', reportId)
      .select(`
        *,
        approvalSteps:report_approval_steps(*)
      `)
      .single();

    if (error || !updated) {
      throw new Error(error?.message || 'Failed to update status');
    }

    if (reason) {
      await this.addComment(reportId, reason, false);
    }

    return this.formatWorkflowSummary(updated, (updated as any).approvalSteps);
  }

  async startReview(stepId: string): Promise<void> {
    const { error } = await supabase
      .from('report_approval_steps')
      .update({
        reviewStartedAt: new Date().toISOString(),
        lastViewedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .eq('id', stepId);

    if (error) {
      throw new Error(error.message || 'Failed to start review tracking');
    }
  }

  async requestInformation(
    reportId: string,
    requestedFrom: string,
    informationNeeded: string,
    deadline?: Date
  ): Promise<void> {
    const comment = `Information requested from ${requestedFrom}: ${informationNeeded}${deadline ? ` (Deadline: ${deadline.toISOString()})` : ''}`;
    await this.addComment(reportId, comment, false);
  }

  async conditionalApprove(
    reportId: string,
    conditions: string[],
    comment: string
  ): Promise<WorkflowReportSummary> {
    const conditionsText = conditions.join(', ');
    const fullComment = `Conditionally approved with conditions: ${conditionsText}. ${comment}`;
    await this.addComment(reportId, fullComment, false);
    return this.review(reportId, 'APPROVE', fullComment);
  }

  async createWorkflowVersion(
    reportId: string,
    checkpointNote: string
  ): Promise<{ versionNumber: number; checkpointNote: string }> {
    const workflow = await this.getReportById(reportId);
    const currentVersion = (workflow as any).currentVersion || 0;
    const newVersion = currentVersion + 1;

    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile) {
      throw new Error('User profile not found');
    }

    // Get current file IDs from workflow
    const { data: currentWorkflow } = await supabase
      .from('report_workflows')
      .select('fileIds')
      .eq('id', reportId)
      .single();

    const now = new Date().toISOString();
    const versionId = crypto.randomUUID();
    await supabase
      .from('report_workflow_versions')
      .insert({
        id: versionId,
        reportWorkflowId: reportId,
        versionNumber: newVersion,
        fileIds: currentWorkflow?.fileIds || [],
        checkpointNote,
        submittedBy: userProfile.id,
        submittedAt: now,
        createdAt: now,
      });

    // Update workflow version
    await supabase
      .from('report_workflows')
      .update({
        currentVersion: newVersion,
        updatedAt: now,
      })
      .eq('id', reportId);

    return { versionNumber: newVersion, checkpointNote };
  }

  async returnToStep(
    reportId: string,
    returnToStepId: string,
    reason: string
  ): Promise<WorkflowReportSummary> {
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile) {
      throw new Error('User profile not found');
    }

    // Get the step to return to
    const { data: targetStep } = await supabase
      .from('report_approval_steps')
      .select('stepOrder')
      .eq('id', returnToStepId)
      .single();

    if (!targetStep) {
      throw new Error('Target step not found');
    }

    // Reset all steps after the target step
    const now = new Date().toISOString();
    await supabase
      .from('report_approval_steps')
      .update({
        isCompleted: false,
        completedAt: null,
        action: null,
        comment: null,
        reasoning: null,
        hasBeenReturned: true,
        returnedAt: now,
        returnedBy: userProfile.id,
        returnReason: reason,
        updatedAt: now,
      })
      .eq('reportWorkflowId', reportId)
      .gt('stepOrder', targetStep.stepOrder);

    // Update workflow status
    const { data: updated, error } = await supabase
      .from('report_workflows')
      .update({
        status: 'CHANGES_REQUESTED',
        updatedAt: now,
      })
      .eq('id', reportId)
      .select(`
        *,
        approvalSteps:report_approval_steps(*)
      `)
      .single();

    if (error || !updated) {
      throw new Error(error?.message || 'Failed to return to step');
    }

    await this.addComment(reportId, `Returned to step: ${reason}`, false);

    return this.formatWorkflowSummary(updated, (updated as any).approvalSteps);
  }

  async getWeightedApproval(reportId: string): Promise<{
    isApproved: boolean;
    totalWeight: number;
    approvedWeight: number;
    requiredWeight: number;
  }> {
    const { data: steps } = await supabase
      .from('report_approval_steps')
      .select('approvalWeight, isCompleted, isRequired')
      .eq('reportWorkflowId', reportId);

    const totalWeight = (steps || []).reduce((sum, s) => sum + (s.approvalWeight || 0), 0);
    const approvedWeight = (steps || [])
      .filter(s => s.isCompleted)
      .reduce((sum, s) => sum + (s.approvalWeight || 0), 0);
    const requiredWeight = (steps || [])
      .filter(s => s.isRequired)
      .reduce((sum, s) => sum + (s.approvalWeight || 0), 0);

    return {
      isApproved: approvedWeight >= requiredWeight,
      totalWeight,
      approvedWeight,
      requiredWeight,
    };
  }

  async bulkApprove(
    reportIds: string[],
    comment?: string
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = await Promise.allSettled(
      reportIds.map(id => this.review(id, 'APPROVE', comment))
    );

    const success = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    const errors = results
      .filter(r => r.status === 'rejected')
      .map(r => (r as PromiseRejectedResult).reason?.message || 'Unknown error');

    return { success, failed, errors };
  }

  async bulkReject(
    reportIds: string[],
    reason: string
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = await Promise.allSettled(
      reportIds.map(id => this.review(id, 'REJECT', reason))
    );

    const success = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    const errors = results
      .filter(r => r.status === 'rejected')
      .map(r => (r as PromiseRejectedResult).reason?.message || 'Unknown error');

    return { success, failed, errors };
  }

  async bulkReassign(
    reportIds: string[],
    reassignToUserId: string,
    reason?: string
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    // Get all pending steps for these workflows
    const { data: steps } = await supabase
      .from('report_approval_steps')
      .select('id, reportWorkflowId')
      .in('reportWorkflowId', reportIds)
      .eq('isCompleted', false);

    const stepIds = (steps || []).map(s => s.id);
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('report_approval_steps')
      .update({
        reviewerId: reassignToUserId,
        updatedAt: now,
      })
      .in('id', stepIds);

    if (error) {
      return { success: 0, failed: reportIds.length, errors: [error.message] };
    }

    return { success: reportIds.length, failed: 0, errors: [] };
  }

  async getReviewerWorkload(
    projectId?: string,
    reviewerId?: string
  ): Promise<{
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
    // First get workflows if projectId is specified
    let workflowIds: string[] | undefined;
    if (projectId) {
      const { data: workflows } = await supabase
        .from('report_workflows')
        .select('id')
        .eq('projectId', projectId);
      workflowIds = workflows?.map(w => w.id);
      if (!workflowIds || workflowIds.length === 0) {
        return { reviewers: [] };
      }
    }

    let stepsQuery = supabase
      .from('report_approval_steps')
      .select(`
        *,
        workflow:report_workflows(*)
      `)
      .eq('isCompleted', false);

    if (reviewerId) {
      stepsQuery = stepsQuery.eq('reviewerId', reviewerId);
    }

    if (workflowIds) {
      stepsQuery = stepsQuery.in('reportWorkflowId', workflowIds);
    }

    const { data: steps, error } = await stepsQuery;

    if (error) {
      throw new Error(error.message || 'Failed to get reviewer workload');
    }

    // Group by reviewer
    const reviewerMap = new Map<string, any>();

    (steps || []).forEach((step: any) => {
      const reviewerId = step.reviewerId;
      if (!reviewerMap.has(reviewerId)) {
        reviewerMap.set(reviewerId, {
          reviewerId,
          reviewerName: 'Unknown', // Will need to fetch user details
          pendingCount: 0,
          completedCount: 0,
          overdueCount: 0,
          averageReviewTime: 0,
          reports: [],
        });
      }

      const reviewer = reviewerMap.get(reviewerId);
      reviewer.pendingCount++;
      
      const workflow = step.workflow;
      const dueDate = step.dueDate ? new Date(step.dueDate) : undefined;
      const isOverdue = dueDate ? dueDate < new Date() : false;
      const daysPending = step.assignedAt 
        ? Math.floor((Date.now() - new Date(step.assignedAt).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      if (isOverdue) reviewer.overdueCount++;

      reviewer.reports.push({
        reportId: workflow.id,
        reportName: workflow.name,
        stepOrder: step.stepOrder,
        dueDate,
        isOverdue,
        daysPending,
      });
    });

    // Fetch reviewer names
    const reviewerIds = Array.from(reviewerMap.keys());
    const { data: users } = await supabase
      .from('users')
      .select('id, firstName, lastName, email')
      .in('id', reviewerIds);

    const reviewers = Array.from(reviewerMap.values()).map(reviewer => {
      const user = users?.find(u => u.id === reviewer.reviewerId);
      reviewer.reviewerName = user 
        ? `${user.firstName} ${user.lastName}`.trim() || user.email
        : 'Unknown';
      return reviewer;
    });

    return { reviewers };
  }
}

export const supabaseReportWorkflowService = new SupabaseReportWorkflowService();

