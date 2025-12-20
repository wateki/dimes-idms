import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/types/supabase';
import { supabaseAuthService } from './supabaseAuthService';

type FeedbackForm = Database['public']['Tables']['feedback_forms']['Row'];
type FeedbackSubmission = Database['public']['Tables']['feedback_submissions']['Row'];
type FeedbackCategory = Database['public']['Tables']['feedback_categories']['Row'];
type FeedbackNote = Database['public']['Tables']['feedback_notes']['Row'];
type FeedbackCommunication = Database['public']['Tables']['feedback_communications']['Row'];

class SupabaseFeedbackService {
  // Forms
  async getForms(projectId?: string) {
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
      .eq('isActive', true);

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
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Feedback form not found');
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
    if (!userProfile) {
      throw new Error('User profile not found');
    }

    const now = new Date().toISOString();
    const { data: form, error } = await supabase
      .from('feedback_forms')
      .insert({
        title: data.title,
        description: data.description,
        categoryId: data.categoryId,
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

    const { data: updated, error } = await supabase
      .from('feedback_forms')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !updated) {
      throw new Error(error?.message || 'Failed to update feedback form');
    }

    return updated;
  }

  async deleteForm(id: string) {
    const { error } = await supabase
      .from('feedback_forms')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message || 'Failed to delete feedback form');
    }
  }

  // Submissions
  async getSubmissions(projectId?: string, formId?: string) {
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
      `);

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
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Feedback submission not found');
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

  async createSubmission(data: any) {
    const now = new Date().toISOString();
    const { data: submission, error } = await supabase
      .from('feedback_submissions')
      .insert({
        formId: data.formId,
        categoryId: data.categoryId,
        projectId: data.projectId || null,
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
        submittedAt: now,
        updatedAt: now,
      } as Database['public']['Tables']['feedback_submissions']['Insert'])
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

    return submission;
  }

  async updateSubmissionStatus(id: string, data: { status: string; assignedTo?: string }) {
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile) {
      throw new Error('User profile not found');
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

    const { data: updated, error } = await supabase
      .from('feedback_submissions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !updated) {
      throw new Error(error?.message || 'Failed to update submission status');
    }

    // Create status history entry
    await supabase
      .from('feedback_status_history')
      .insert({
        submissionId: id,
        status: data.status as Database['public']['Enums']['FeedbackStatus'],
        changedBy: userProfile.id,
        changedByName: `${userProfile.firstName} ${userProfile.lastName}`.trim() || userProfile.email,
        createdAt: now,
      } as Database['public']['Tables']['feedback_status_history']['Insert']);

    return updated;
  }

  async deleteSubmission(id: string) {
    const { error } = await supabase
      .from('feedback_submissions')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message || 'Failed to delete feedback submission');
    }
  }

  // Categories
  async getCategories() {
    const { data, error } = await supabase
      .from('feedback_categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      throw new Error(error.message || 'Failed to fetch feedback categories');
    }

    return data || [];
  }

  async getCategoryById(id: string) {
    const { data, error } = await supabase
      .from('feedback_categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Feedback category not found');
    }

    return data;
  }

  // Communications and Notes
  async addCommunication(submissionId: string, data: any) {
    const currentUser = await supabaseAuthService.getCurrentUser();
    const userProfile = currentUser ? await supabaseAuthService.getUserProfile(currentUser.id) : null;

    const now = new Date().toISOString();
    const { data: communication, error } = await supabase
      .from('feedback_communications')
      .insert({
        submissionId,
        content: data.content,
        type: data.type || 'EMAIL' as Database['public']['Enums']['CommunicationType'],
        direction: data.direction as Database['public']['Enums']['CommunicationDirection'],
        sentBy: userProfile?.id || null,
        sentTo: data.sentTo || null,
        sentAt: now,
      } as Database['public']['Tables']['feedback_communications']['Insert'])
      .select()
      .single();

    if (error || !communication) {
      throw new Error(error?.message || 'Failed to add communication');
    }

    return communication;
  }

  async addNote(submissionId: string, data: any) {
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile) {
      throw new Error('User profile not found');
    }

    const now = new Date().toISOString();
    const { data: note, error } = await supabase
      .from('feedback_notes')
      .insert({
        submissionId,
        content: data.content,
        isInternal: data.isInternal ?? true,
        authorId: userProfile.id,
        authorName: `${userProfile.firstName} ${userProfile.lastName}`.trim() || userProfile.email,
        createdAt: now,
      } as Database['public']['Tables']['feedback_notes']['Insert'])
      .select()
      .single();

    if (error || !note) {
      throw new Error(error?.message || 'Failed to add note');
    }

    return note;
  }

  // Analytics
  async getAnalytics(projectId?: string, formId?: string) {
    let query = supabase
      .from('feedback_submissions')
      .select('status, priority, categoryId, formId, submittedAt');

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
    const { data, error } = await supabase
      .from('form_analytics')
      .select('*')
      .eq('formId', formId)
      .single();

    if (error) {
      // If analytics don't exist, return basic stats
      const { data: submissions } = await supabase
        .from('feedback_submissions')
        .select('id, submittedAt')
        .eq('formId', formId);

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

