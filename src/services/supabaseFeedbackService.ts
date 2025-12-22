import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/types/supabase';
import { supabaseAuthService } from './supabaseAuthService';
import type { CreateFeedbackSubmissionRequest } from '@/types/feedback';

type FeedbackForm = Database['public']['Tables']['feedback_forms']['Row'];
type FeedbackSubmission = Database['public']['Tables']['feedback_submissions']['Row'];
type FeedbackCategory = Database['public']['Tables']['feedback_categories']['Row'];
type FeedbackNote = Database['public']['Tables']['feedback_notes']['Row'];
type FeedbackCommunication = Database['public']['Tables']['feedback_communications']['Row'];

class SupabaseFeedbackService {
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

  /**
   * Verify project belongs to user's organization
   */
  private async verifyProjectOwnership(projectId: string): Promise<void> {
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { data, error } = await supabase
      .from('projects')
      .select('id, organizationid')
      .eq('id', projectId)
      .eq('organizationid', organizationId)
      .single();

    if (error || !data) {
      throw new Error('Project not found or access denied');
    }
  }

  // Forms
  async getForms(projectId?: string) {
    // Multi-tenant: Filter by organizationId
    const organizationId = await this.getCurrentUserOrganizationId();
    
    // If projectId is provided, verify ownership
    if (projectId) {
      await this.verifyProjectOwnership(projectId);
    }
    
    let query = supabase
      .from('feedback_forms')
      .select(`
        *,
        category:feedback_categories(*),
        sections:feedback_form_sections(
          *,
          questions:feedback_questions(*)
        )
      `)
      .eq('isActive', true)
      .eq('organizationid', organizationId); // Filter by organization

    if (projectId) {
      query = query.eq('projectId', projectId);
    }

    const { data, error } = await query.order('createdAt', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Failed to fetch feedback forms');
    }

    // Format sections with ordered questions
    return (data || []).map((form: any) => ({
      ...form,
      sections: (form.sections || []).sort((a: any, b: any) => a.order - b.order).map((section: any) => ({
        ...section,
        questions: (section.questions || []).sort((a: any, b: any) => a.order - b.order),
      })),
    }));
  }

  async getFormById(id: string) {
    // Multi-tenant: Filter by organizationId
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { data, error } = await supabase
      .from('feedback_forms')
      .select(`
        *,
        category:feedback_categories(*),
        sections:feedback_form_sections(
          *,
          questions:feedback_questions(*)
        ),
        submissions:feedback_submissions(
          *,
          category:feedback_categories(*)
        )
      `)
      .eq('id', id)
      .eq('organizationid', organizationId) // Ensure ownership
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Feedback form not found or access denied');
    }

    // Format sections with ordered questions
    return {
      ...data,
      sections: ((data as any).sections || []).sort((a: any, b: any) => a.order - b.order).map((section: any) => ({
        ...section,
        questions: (section.questions || []).sort((a: any, b: any) => a.order - b.order),
      })),
      submissions: ((data as any).submissions || []).sort((a: any, b: any) => 
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      ),
    };
  }

  async createForm(data: any) {
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile || !userProfile.organizationId) {
      throw new Error('User profile not found or user is not associated with an organization');
    }

    // Multi-tenant: Verify project ownership if projectId is provided
    if (data.projectId) {
      await this.verifyProjectOwnership(data.projectId);
    }

    const now = new Date().toISOString();
    const { data: form, error } = await supabase
      .from('feedback_forms')
      .insert({
        id: crypto.randomUUID(),
        title: data.title,
        description: data.description,
        categoryId: data.categoryId,
        organizationid: userProfile.organizationId, // Multi-tenant: Set organizationId (database column is lowercase)
        projectId: data.projectId || null,
        isActive: data.isActive ?? true,
        allowAnonymous: data.allowAnonymous ?? false,
        requireAuthentication: data.requireAuthentication ?? false,
        settings: data.settings || {},
        createdBy: userProfile.id,
        createdAt: now,
        updatedAt: now,
      } as Database['public']['Tables']['feedback_forms']['Insert'])
      .select()
      .single();

    if (error || !form) {
      throw new Error(error?.message || 'Failed to create feedback form');
    }

    return form;
  }

  async updateForm(id: string, data: any) {
    // Multi-tenant: Verify ownership first
    const organizationId = await this.getCurrentUserOrganizationId();
    
    // If projectId is being updated, verify ownership
    if (data.projectId !== undefined && data.projectId) {
      await this.verifyProjectOwnership(data.projectId);
    }
    
    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.projectId !== undefined) updateData.projectId = data.projectId || null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.allowAnonymous !== undefined) updateData.allowAnonymous = data.allowAnonymous;
    if (data.requireAuthentication !== undefined) updateData.requireAuthentication = data.requireAuthentication;
    if (data.settings !== undefined) updateData.settings = data.settings;

    // Multi-tenant: Ensure ownership
    const { data: updated, error } = await supabase
      .from('feedback_forms')
      .update(updateData)
      .eq('id', id)
      .eq('organizationid', organizationId) // Ensure ownership
      .select()
      .single();

    if (error || !updated) {
      throw new Error(error?.message || 'Failed to update feedback form or access denied');
    }

    return updated;
  }

  async deleteForm(id: string) {
    // Multi-tenant: Verify ownership
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { error } = await supabase
      .from('feedback_forms')
      .delete()
      .eq('id', id)
      .eq('organizationid', organizationId); // Ensure ownership

    if (error) {
      throw new Error(error.message || 'Failed to delete feedback form or access denied');
    }
  }

  // Submissions
  async getSubmissions(projectId?: string, formId?: string) {
    // Multi-tenant: Filter by organizationId
    const organizationId = await this.getCurrentUserOrganizationId();
    
    // If projectId is provided, verify ownership
    if (projectId) {
      await this.verifyProjectOwnership(projectId);
    }
    
    let query = supabase
      .from('feedback_submissions')
      .select(`
        *,
        form:feedback_forms(
          *,
          category:feedback_categories(*)
        ),
        category:feedback_categories(*),
        communications:feedback_communications(*),
        notes:feedback_notes(*),
        statusHistory:feedback_status_history(*)
      `)
      .eq('organizationid', organizationId); // Filter by organization

    if (projectId) {
      query = query.eq('projectId', projectId);
    }

    if (formId) {
      query = query.eq('formId', formId);
    }

    const { data, error } = await query.order('submittedAt', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Failed to fetch feedback submissions');
    }

    return (data || []).map((submission: any) => ({
      ...submission,
      communications: (submission.communications || []).sort((a: any, b: any) => 
        new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
      ),
      internalNotes: (submission.notes || []).filter((n: any) => n.isInternal).sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
      statusHistory: (submission.statusHistory || []).sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    }));
  }

  async getSubmissionById(id: string) {
    // Multi-tenant: Filter by organizationId
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { data, error } = await supabase
      .from('feedback_submissions')
      .select(`
        *,
        form:feedback_forms(
          *,
          category:feedback_categories(*),
          sections:feedback_form_sections(
            *,
            questions:feedback_questions(*)
          )
        ),
        category:feedback_categories(*),
        communications:feedback_communications(*),
        notes:feedback_notes(*),
        statusHistory:feedback_status_history(*)
      `)
      .eq('id', id)
      .eq('organizationid', organizationId) // Ensure ownership
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Feedback submission not found or access denied');
    }

    return {
      ...data,
      form: {
        ...(data as any).form,
        sections: ((data as any).form?.sections || []).sort((a: any, b: any) => a.order - b.order).map((section: any) => ({
          ...section,
          questions: (section.questions || []).sort((a: any, b: any) => a.order - b.order),
        })),
      },
      communications: ((data as any).communications || []).sort((a: any, b: any) => 
        new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
      ),
      internalNotes: ((data as any).notes || []).filter((n: any) => n.isInternal).sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
      statusHistory: ((data as any).statusHistory || []).sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    };
  }

  async createSubmission(data: CreateFeedbackSubmissionRequest) {
    // Multi-tenant: Get organizationId from form
    const organizationId = await this.getCurrentUserOrganizationId();
    
    // Verify form belongs to user's organization
    const { data: form, error: formError } = await supabase
      .from('feedback_forms')
      .select('id, organizationid, projectId')
      .eq('id', data.formId)
      .eq('organizationid', organizationId)
      .single();

    if (formError || !form) {
      throw new Error('Feedback form not found or access denied');
    }
    
    // If projectId is provided, verify it matches form's projectId or verify ownership
    if (data.projectId && form.projectId && data.projectId !== form.projectId) {
      throw new Error('Project ID mismatch');
    }
    if (data.projectId) {
      await this.verifyProjectOwnership(data.projectId);
    }
    
    const now = new Date().toISOString();
    const { data: submission, error } = await supabase
      .from('feedback_submissions')
      .insert({
        formId: data.formId,
        categoryId: data.categoryId,
        projectId: data.projectId || form.projectId || null,
        priority: data.priority as Database['public']['Enums']['FeedbackPriority'],
        sensitivity: data.sensitivity as Database['public']['Enums']['FeedbackSensitivity'],
        escalationLevel: data.escalationLevel as Database['public']['Enums']['EscalationLevel'],
        submitterId: data.submitterId || null,
        submitterName: data.submitterName || null,
        submitterEmail: data.submitterEmail || null,
        stakeholderType: data.stakeholderType || null,
        isAnonymous: data.isAnonymous ?? false,
        data: data.data,
        attachments: data.attachments || [],
        status: 'SUBMITTED' as Database['public']['Enums']['FeedbackStatus'],
        organizationid: organizationId, // Multi-tenant: Set organizationId (database column is lowercase)
        submittedAt: now,
        updatedAt: now,
      } as unknown as Database['public']['Tables']['feedback_submissions']['Insert'])
      .select(`
        *,
        form:feedback_forms(
          *,
          category:feedback_categories(*)
        ),
        category:feedback_categories(*)
      `)
      .single();

    if (error || !submission) {
      throw new Error(error?.message || 'Failed to create feedback submission');
    }

    // Format submission to include all required fields
    const formattedSubmission = {
      ...submission,
      category: (submission as any).category || null,
      attachments: Array.isArray((submission as any).attachments) 
        ? (submission as any).attachments 
        : [],
      communications: [],
      internalNotes: [],
      statusHistory: [],
      submittedAt: new Date(submission.submittedAt),
      updatedAt: new Date(submission.updatedAt),
      assignedAt: submission.assignedAt ? new Date(submission.assignedAt) : undefined,
      resolvedAt: submission.resolvedAt ? new Date(submission.resolvedAt) : undefined,
      closedAt: submission.closedAt ? new Date(submission.closedAt) : undefined,
    };
    
    return formattedSubmission as any; // Type assertion needed due to complex type conversion
  }

  async updateSubmissionStatus(id: string, data: { status: string; assignedTo?: string }) {
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

    const now = new Date().toISOString();
    const updateData: any = {
      status: data.status as Database['public']['Enums']['FeedbackStatus'],
      updatedAt: now,
    };

    if (data.assignedTo) {
      updateData.assignedTo = data.assignedTo;
      updateData.assignedAt = now;
    }

    if (data.status === 'RESOLVED' || data.status === 'CLOSED') {
      updateData.resolvedAt = now;
    }

    if (data.status === 'CLOSED') {
      updateData.closedAt = now;
    }

    // Multi-tenant: Ensure ownership
    const { data: updated, error } = await supabase
      .from('feedback_submissions')
      .update(updateData)
      .eq('id', id)
      .eq('organizationid', organizationId) // Ensure ownership
      .select()
      .single();

    if (error || !updated) {
      throw new Error(error?.message || 'Failed to update submission status or access denied');
    }

    // Create status history entry
    await supabase
      .from('feedback_status_history')
      .insert({
        id: crypto.randomUUID(),
        submissionId: id,
        status: data.status as Database['public']['Enums']['FeedbackStatus'],
        organizationid: organizationId, // Multi-tenant: Set organizationId (database column is lowercase)
        changedBy: userProfile.id,
        changedByName: `${userProfile.firstName} ${userProfile.lastName}`.trim() || userProfile.email,
        createdAt: now,
      } as unknown as Database['public']['Tables']['feedback_status_history']['Insert']);

    // Format submission to include all required fields
    const formattedSubmission = {
      ...updated,
      category: null, // Will be populated if needed via getSubmissionById
      attachments: Array.isArray((updated as any).attachments) 
        ? (updated as any).attachments 
        : [],
      communications: [],
      internalNotes: [],
      statusHistory: [],
      submittedAt: new Date(updated.submittedAt),
      updatedAt: new Date(updated.updatedAt),
      assignedAt: updated.assignedAt ? new Date(updated.assignedAt) : undefined,
      resolvedAt: updated.resolvedAt ? new Date(updated.resolvedAt) : undefined,
      closedAt: updated.closedAt ? new Date(updated.closedAt) : undefined,
    };
    
    return formattedSubmission as any; // Type assertion needed due to complex type conversion
  }

  async deleteSubmission(id: string) {
    // Multi-tenant: Verify ownership
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { error } = await supabase
      .from('feedback_submissions')
      .delete()
      .eq('id', id)
      .eq('organizationid', organizationId); // Ensure ownership

    if (error) {
      throw new Error(error.message || 'Failed to delete feedback submission or access denied');
    }
  }

  // Categories
  async getCategories() {
    // Multi-tenant: Filter by organizationId
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { data, error } = await supabase
      .from('feedback_categories')
      .select('*')
      .eq('organizationid', organizationId) // Filter by organization
      .order('name', { ascending: true });

    if (error) {
      throw new Error(error.message || 'Failed to fetch feedback categories');
    }

    return data || [];
  }

  async getCategoryById(id: string) {
    // Multi-tenant: Filter by organizationId
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { data, error } = await supabase
      .from('feedback_categories')
      .select('*')
      .eq('id', id)
      .eq('organizationid', organizationId) // Ensure ownership
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Feedback category not found or access denied');
    }

    return data;
  }

  // Communications and Notes
  async addCommunication(submissionId: string, data: any) {
    // Multi-tenant: Verify submission belongs to user's organization
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { data: submission, error: submissionError } = await supabase
      .from('feedback_submissions')
      .select('id, organizationid')
      .eq('id', submissionId)
      .eq('organizationid', organizationId)
      .single();

    if (submissionError || !submission) {
      throw new Error('Feedback submission not found or access denied');
    }
    
    const currentUser = await supabaseAuthService.getCurrentUser();
    const userProfile = currentUser ? await supabaseAuthService.getUserProfile(currentUser.id) : null;

    const now = new Date().toISOString();
    const { data: communication, error } = await supabase
      .from('feedback_communications')
      .insert({
        id: crypto.randomUUID(),
        submissionId,
        content: data.content,
        type: data.type || 'EMAIL' as Database['public']['Enums']['CommunicationType'],
        direction: data.direction as Database['public']['Enums']['CommunicationDirection'],
        organizationid: organizationId, // Multi-tenant: Set organizationId (database column is lowercase)
        sentBy: userProfile?.id || null,
        sentTo: data.sentTo || null,
        sentAt: now,
      } as unknown as Database['public']['Tables']['feedback_communications']['Insert'])
      .select()
      .single();

    if (error || !communication) {
      throw new Error(error?.message || 'Failed to add communication');
    }

    return communication;
  }

  async addNote(submissionId: string, data: any) {
    // Multi-tenant: Verify submission belongs to user's organization
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { data: submission, error: submissionError } = await supabase
      .from('feedback_submissions')
      .select('id, organizationid')
      .eq('id', submissionId)
      .eq('organizationid', organizationId)
      .single();

    if (submissionError || !submission) {
      throw new Error('Feedback submission not found or access denied');
    }
    
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile || !userProfile.organizationId) {
      throw new Error('User profile not found or user is not associated with an organization');
    }

    const now = new Date().toISOString();
    const { data: note, error } = await supabase
      .from('feedback_notes')
      .insert({
        id: crypto.randomUUID(),
        submissionId,
        content: data.content,
        isInternal: data.isInternal ?? true,
        organizationid: organizationId, // Multi-tenant: Set organizationId (database column is lowercase)
        authorId: userProfile.id,
        authorName: `${userProfile.firstName} ${userProfile.lastName}`.trim() || userProfile.email,
        createdAt: now,
      } as unknown as Database['public']['Tables']['feedback_notes']['Insert'])
      .select()
      .single();

    if (error || !note) {
      throw new Error(error?.message || 'Failed to add note');
    }

    return note;
  }

  // Analytics
  async getAnalytics(projectId?: string, formId?: string) {
    // Multi-tenant: Filter by organizationId
    const organizationId = await this.getCurrentUserOrganizationId();
    
    // If projectId is provided, verify ownership
    if (projectId) {
      await this.verifyProjectOwnership(projectId);
    }
    
    let query = supabase
      .from('feedback_submissions')
      .select('status, priority, categoryId, formId, submittedAt')
      .eq('organizationid', organizationId); // Filter by organization

    if (projectId) {
      query = query.eq('projectId', projectId);
    }

    if (formId) {
      query = query.eq('formId', formId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message || 'Failed to fetch analytics');
    }

    // Calculate analytics
    const total = (data || []).length;
    const byStatus = (data || []).reduce((acc: any, s: any) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {});
    const byPriority = (data || []).reduce((acc: any, s: any) => {
      acc[s.priority] = (acc[s.priority] || 0) + 1;
      return acc;
    }, {});

    return {
      total,
      byStatus,
      byPriority,
      submissions: data || [],
    };
  }

  async getFormAnalytics(formId: string) {
    // Multi-tenant: Verify form belongs to user's organization
    const organizationId = await this.getCurrentUserOrganizationId();
    
    // First verify form ownership
    const { data: form, error: formError } = await supabase
      .from('feedback_forms')
      .select('id, organizationid')
      .eq('id', formId)
      .eq('organizationid', organizationId)
      .single();

    if (formError || !form) {
      throw new Error('Feedback form not found or access denied');
    }
    
    const { data, error } = await supabase
      .from('form_analytics')
      .select('*')
      .eq('formId', formId)
      .eq('organizationid', organizationId) // Filter by organization
      .single();

    if (error) {
      // If analytics don't exist, return basic stats (filtered by organization)
      const { data: submissions } = await supabase
        .from('feedback_submissions')
        .select('id, submittedAt')
        .eq('formId', formId)
        .eq('organizationid', organizationId); // Filter by organization

      return {
        formId,
        totalViews: 0,
        totalStarted: (submissions || []).length,
        totalCompleted: (submissions || []).length,
        completionRate: 1,
        averageCompletionTime: 0,
        responsesByDay: {},
        questionAnalytics: {},
        abandonmentPoints: {},
        lastCalculatedAt: new Date().toISOString(),
      };
    }

    return data;
  }
}

export const supabaseFeedbackService = new SupabaseFeedbackService();

