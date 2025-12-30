import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/types/supabase';
import { supabaseAuthService } from './supabaseAuthService';
import { supabaseUsageTrackingService } from './supabaseUsageTrackingService';
import { getCurrentUserOrganizationId } from './getCurrentUserOrganizationId';

type Form = Database['public']['Tables']['forms']['Row'];
type FormInsert = Database['public']['Tables']['forms']['Insert'];
type FormUpdate = Database['public']['Tables']['forms']['Update'];
type FormSection = Database['public']['Tables']['form_sections']['Row'];
type FormSectionInsert = Database['public']['Tables']['form_sections']['Insert'];
type FormQuestion = Database['public']['Tables']['form_questions']['Row'];
type FormQuestionInsert = Database['public']['Tables']['form_questions']['Insert'];
type FormResponse = Database['public']['Tables']['form_responses']['Row'];
type FormResponseInsert = Database['public']['Tables']['form_responses']['Insert'];
type FormResponseUpdate = Database['public']['Tables']['form_responses']['Update'];
type FormTemplate = Database['public']['Tables']['form_templates']['Row'];
type FormTemplateInsert = Database['public']['Tables']['form_templates']['Insert'];
type MediaAttachment = Database['public']['Tables']['media_attachments']['Row'];
type MediaAttachmentInsert = Database['public']['Tables']['media_attachments']['Insert'];
type MediaAttachmentUpdate = Database['public']['Tables']['media_attachments']['Update'];

// Extended types with nested relations
type FormWithSections = Form & {
  sections?: (FormSection & {
    questions?: FormQuestion[];
  })[];
};

type FormResponseWithAttachments = FormResponse & {
  data?: Record<string, any>;
  attachments?: MediaAttachment[];
};

class SupabaseFormsService {
  /**
   * Get current user's organizationId (uses shared cache helper)
   */
  private async getCurrentUserOrganizationId(): Promise<string> {
    return getCurrentUserOrganizationId();
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

  // ========================================
  // FORM MANAGEMENT
  // ========================================

  async createForm(projectId: string, formData: {
    title: string;
    description?: string;
    status?: 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';
    tags?: string[];
    category?: string;
    sections?: any[];
    settings?: any;
  }, createdBy: string): Promise<FormWithSections> {
    // Multi-tenant: Verify project ownership first
    await this.verifyProjectOwnership(projectId);
    
    const organizationId = await this.getCurrentUserOrganizationId();
    
    // Create form
    const { data: form, error: formError } = await supabase
      .from('forms')
      .insert({
        id: crypto.randomUUID(),
        projectId,
        title: formData.title,
        description: formData.description || null,
        status: formData.status || 'DRAFT',
        tags: formData.tags || null,
        category: formData.category || null,
        settings: formData.settings || {},
        organizationid: organizationId, // Multi-tenant: Set organizationid (database column is lowercase)
        createdBy,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      } as Database['public']['Tables']['forms']['Insert'])
      .select()
      .single();

    if (formError) {
      // Handle subscription limit errors from RLS policies
      const { handleSubscriptionError } = await import('@/utils/subscriptionErrorHandler');
      throw await handleSubscriptionError(formError, 'forms', 'create');
    }

    // Note: Usage tracking is now handled by database trigger (track_form_insert)
    // This ensures atomicity and better performance

    // Create sections and questions if provided
    if (formData.sections && formData.sections.length > 0) {
      const sectionsWithQuestions = await this.createFormSections(form.id, formData.sections);
      return { ...form, sections: sectionsWithQuestions };
    }

    return { ...form, sections: [] };
  }

  private async createFormSections(formId: string, sections: any[]): Promise<(FormSection & { questions?: FormQuestion[] })[]> {
    const createdSections: (FormSection & { questions?: FormQuestion[] })[] = [];

    for (const section of sections) {
      // Create section
      const { data: createdSection, error: sectionError } = await supabase
        .from('form_sections')
        .insert({
          id: section.id || crypto.randomUUID(),
          formId,
          title: section.title,
          description: section.description || null,
          order: section.order || 0,
          conditional: section.conditional || {},
        })
        .select()
        .single();

      if (sectionError) {
        console.error(`Failed to create section: ${sectionError.message}`);
        continue;
      }

      // Create questions for this section
      let questions: FormQuestion[] = [];
      if (section.questions && section.questions.length > 0) {
        const questionInserts: FormQuestionInsert[] = section.questions.map((question: any, index: number) => {
          const linkedActivities = question.linkedActivities || [];
          const primaryActivity = linkedActivities.length > 0 ? linkedActivities[0] : null;

          // Prepare config including options/statements and linked activities
          // Extract frontend-specific fields and store them in config (similar to backend prepareQuestionForStorage)
          const questionConfig: any = {
            ...(question.config || {}),
            isConditional: question.isConditional || false,
            // Extract options, statements, and other config properties from question object
            options: question.options || question.config?.options || [],
            statements: question.statements || question.config?.statements || [],
            allowOther: question.allowOther ?? question.config?.allowOther,
            minSelections: question.minSelections ?? question.config?.minSelections,
            maxSelections: question.maxSelections ?? question.config?.maxSelections,
            displayType: question.displayType || question.config?.displayType,
            enableHighAccuracy: question.enableHighAccuracy ?? question.config?.enableHighAccuracy,
            timeout: question.timeout ?? question.config?.timeout,
            accuracy: question.accuracy ?? question.config?.accuracy,
            allowManualInput: question.allowManualInput ?? question.config?.allowManualInput,
            captureAddress: question.captureAddress ?? question.config?.captureAddress,
            showMap: question.showMap ?? question.config?.showMap,
            maxFiles: question.maxFiles ?? question.config?.maxFiles,
            maxFileSize: question.maxFileSize ?? question.config?.maxFileSize,
            allowedFormats: question.allowedFormats || question.config?.allowedFormats,
            allowMultiple: question.allowMultiple ?? question.config?.allowMultiple,
            previewSize: question.previewSize ?? question.config?.previewSize,
            compressionQuality: question.compressionQuality ?? question.config?.compressionQuality,
            quality: question.quality ?? question.config?.quality,
            autoCompress: question.autoCompress ?? question.config?.autoCompress,
            showPreview: question.showPreview ?? question.config?.showPreview,
            min: question.min ?? question.config?.min,
            max: question.max ?? question.config?.max,
            step: question.step ?? question.config?.step,
            placeholder: question.placeholder || question.config?.placeholder,
            defaultScaleType: question.defaultScaleType || question.config?.defaultScaleType,
            defaultLabels: question.defaultLabels || question.config?.defaultLabels,
          };
          if (linkedActivities.length > 0) {
            questionConfig.linkedActivities = linkedActivities;
          }

          return {
            id: question.id || crypto.randomUUID(),
            sectionId: createdSection.id,
            type: question.type,
            title: question.title,
            description: question.description || null,
            order: question.order || index + 1,
            isRequired: question.isRequired || false,
            config: questionConfig,
            conditional: question.conditional || {},
            dbColumnName: question.dbColumnName || null,
            dbDataType: question.dbDataType || null,
            linkedActivityId: primaryActivity?.activityId || question.linkedActivityId || null,
            linkedOutcomeId: primaryActivity?.outcomeId || question.linkedOutcomeId || null,
            linkedKpiId: primaryActivity?.kpiContribution?.kpiId || question.linkedKpiId || null,
            kpiContribution: primaryActivity?.kpiContribution || question.kpiContribution || null,
          };
        });

        const { data: createdQuestions, error: questionsError } = await supabase
          .from('form_questions')
          .insert(questionInserts)
          .select();

        if (questionsError) {
          console.error(`Failed to create questions: ${questionsError.message}`);
        } else {
          questions = createdQuestions || [];
        }
      }

      createdSections.push({ ...createdSection, questions });
    }

    return createdSections;
  }

  async getProjectForms(projectId: string): Promise<FormWithSections[]> {
    // Multi-tenant: Verify project ownership first
    await this.verifyProjectOwnership(projectId);
    
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { data: forms, error } = await supabase
      .from('forms')
      .select(`
        *,
        sections:form_sections(
          *,
          questions:form_questions(*)
        )
      `)
      .eq('projectId', projectId)
      .eq('organizationid', organizationId) // Filter by organization
      .order('createdAt', { ascending: false });

    if (error) throw new Error(`Failed to fetch forms: ${error.message}`);

    // Fetch response counts and last response dates for all forms in a single query
    const formIds = (forms || []).map((f: any) => f.id);
    const responseStatsMap = new Map<string, { count: number; lastResponseAt: string | null }>();
    
    if (formIds.length > 0) {
      // Get response counts grouped by formId
      const { data: responseCounts, error: countError } = await supabase
        .from('form_responses')
        .select('formId, submittedAt')
        .eq('organizationid', organizationId)
        .in('formId', formIds);
      
      if (!countError && responseCounts) {
        // Group by formId and calculate stats
        const groupedByForm = responseCounts.reduce((acc: any, response: any) => {
          const formId = response.formId;
          if (!acc[formId]) {
            acc[formId] = { count: 0, lastResponseAt: null };
          }
          acc[formId].count++;
          
          // Track the latest submittedAt
          if (response.submittedAt) {
            const currentLast = acc[formId].lastResponseAt;
            if (!currentLast || new Date(response.submittedAt) > new Date(currentLast)) {
              acc[formId].lastResponseAt = response.submittedAt;
            }
          }
          return acc;
        }, {});
        
        // Convert to Map for easy lookup
        Object.entries(groupedByForm).forEach(([formId, stats]: [string, any]) => {
          responseStatsMap.set(formId, stats);
        });
      }
    }

    // Transform the data to match expected structure
    // Use the fetched response stats instead of making per-form queries
    const transformedForms = (forms || []).map((form: any) => {
      const stats = responseStatsMap.get(form.id) || { count: 0, lastResponseAt: null };
      const actualResponseCount = stats.count;
      const lastResponseAt = stats.lastResponseAt || form.lastResponseAt;
      
      // Update form if counts don't match (background sync)
      if (actualResponseCount !== (form.responseCount || 0)) {
        console.log('🔄 [supabaseFormsService.getProjectForms] Syncing responseCount for form:', {
          formId: form.id,
          storedCount: form.responseCount || 0,
          actualCount: actualResponseCount,
          updating: true
        });
        
        // Update in background (don't await to avoid blocking)
        supabase
          .from('forms')
          .update({ 
            responseCount: actualResponseCount,
            lastResponseAt: lastResponseAt || null
          })
          .eq('id', form.id)
          .then(({ error }) => {
            if (error) {
              console.error('❌ Failed to sync responseCount for form:', form.id, error);
            } else {
              console.log('✅ Synced responseCount for form:', form.id, 'to', actualResponseCount);
            }
          });
      }
      
      return {
        ...form,
        responseCount: actualResponseCount, // Use actual count
        lastResponseAt, // Use actual last response date
        sections: (form.sections || []).map((section: any) => ({
          ...section,
          questions: (section.questions || []).map((question: any) => {
            // Transform question to extract options and other config properties
            if (!question.config) return question;
            
            const config = typeof question.config === 'string' ? JSON.parse(question.config) : question.config;
            
            return {
              ...question,
              options: config.options || [],
              // Extract other config properties that might be expected at top level
              placeholder: config.placeholder,
              min: config.min,
              max: config.max,
              step: config.step,
              allowOther: config.allowOther,
              maxSelections: config.maxSelections,
              displayType: config.displayType,
              statements: config.statements,
              defaultScaleType: config.defaultScaleType,
              defaultLabels: config.defaultLabels,
              // Preserve the original config
              config
            };
          }),
        })).sort((a: any, b: any) => (a.order || 0) - (b.order || 0)),
      };
    });
    
    console.log('📋 [supabaseFormsService.getProjectForms] Loaded forms:', {
      projectId,
      formsCount: transformedForms.length,
      formsWithResponseCount: transformedForms.map(f => ({
        id: f.id,
        title: f.title,
        responseCount: f.responseCount,
        lastResponseAt: f.lastResponseAt,
        status: f.status
      }))
    });
    
    return transformedForms;
  }

  async getForm(projectId: string, formId: string): Promise<FormWithSections> {
    // Multi-tenant: Verify project ownership first
    await this.verifyProjectOwnership(projectId);
    
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { data: form, error } = await supabase
      .from('forms')
      .select(`
        *,
        sections:form_sections(
          *,
          questions:form_questions(*)
        )
      `)
      .eq('id', formId)
      .eq('projectId', projectId)
      .eq('organizationid', organizationId) // Ensure ownership
      .single();

    if (error) throw new Error(`Failed to fetch form: ${error.message}`);

    // Transform the data - extract options and other config properties from questions
    return {
      ...form,
      sections: (form.sections || []).map((section: any) => ({
        ...section,
        questions: (section.questions || []).map((question: any) => {
          // Transform question to extract options and other config properties
          if (!question.config) return question;
          
          const config = typeof question.config === 'string' ? JSON.parse(question.config) : question.config;
          
          return {
            ...question,
            options: config.options || [],
            // Extract other config properties that might be expected at top level
            placeholder: config.placeholder,
            min: config.min,
            max: config.max,
            step: config.step,
            allowOther: config.allowOther,
            maxSelections: config.maxSelections,
            displayType: config.displayType,
            statements: config.statements,
            defaultScaleType: config.defaultScaleType,
            defaultLabels: config.defaultLabels,
            // Preserve the original config
            config
          };
        }).sort((a: any, b: any) => (a.order || 0) - (b.order || 0)),
      })).sort((a: any, b: any) => (a.order || 0) - (b.order || 0)),
    };
  }

  async updateForm(projectId: string, formId: string, updates: {
    title?: string;
    description?: string;
    status?: 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';
    tags?: string[];
    category?: string;
    sections?: any[];
    settings?: any;
  }): Promise<FormWithSections> {
    // Update form basic fields
    const formUpdate: FormUpdate = {
      updatedAt: new Date().toISOString(),
    };
    if (updates.title !== undefined) formUpdate.title = updates.title;
    if (updates.description !== undefined) formUpdate.description = updates.description;
    if (updates.status !== undefined) formUpdate.status = updates.status;
    if (updates.tags !== undefined) formUpdate.tags = updates.tags;
    if (updates.category !== undefined) formUpdate.category = updates.category;
    if (updates.settings !== undefined) formUpdate.settings = updates.settings;

    // Multi-tenant: Verify project ownership first
    await this.verifyProjectOwnership(projectId);
    
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { error: updateError } = await supabase
      .from('forms')
      .update(formUpdate)
      .eq('id', formId)
      .eq('projectId', projectId)
      .eq('organizationid', organizationId); // Ensure ownership

    if (updateError) throw new Error(`Failed to update form: ${updateError.message}`);

    // If sections are provided, update them
    if (updates.sections !== undefined) {
      // Delete existing sections and questions
      const { data: existingSections } = await supabase
        .from('form_sections')
        .select('id')
        .eq('formId', formId);

      if (existingSections && existingSections.length > 0) {
        const sectionIds = existingSections.map(s => s.id);
        // Delete questions first
        await supabase
          .from('form_questions')
          .delete()
          .in('sectionId', sectionIds);
        // Then delete sections
        await supabase
          .from('form_sections')
          .delete()
          .in('id', sectionIds);
      }

      // Create new sections and questions
      const sectionsWithQuestions = await this.createFormSections(formId, updates.sections);
      return await this.getForm(projectId, formId);
    }

    return await this.getForm(projectId, formId);
  }

  async deleteForm(projectId: string, formId: string): Promise<void> {
    // Multi-tenant: Verify project ownership first
    await this.verifyProjectOwnership(projectId);
    
    const organizationId = await this.getCurrentUserOrganizationId();
    
    // Delete form (cascade should handle sections and questions)
    const { error } = await supabase
      .from('forms')
      .delete()
      .eq('id', formId)
      .eq('projectId', projectId)
      .eq('organizationid', organizationId); // Ensure ownership

    if (error) throw new Error(`Failed to delete form: ${error.message}`);

    // Note: Usage tracking is now handled by database trigger (track_form_delete)
    // This ensures atomicity and better performance
  }

  async duplicateForm(projectId: string, formId: string, createdBy: string): Promise<FormWithSections> {
    // Get original form
    const originalForm = await this.getForm(projectId, formId);

    // Create duplicate
    const duplicatedForm = await this.createForm(projectId, {
      title: `${originalForm.title} (Copy)`,
      description: originalForm.description || undefined,
      status: 'DRAFT',
      tags: originalForm.tags || undefined,
      category: originalForm.category || undefined,
      settings: originalForm.settings as any,
      sections: originalForm.sections?.map(section => ({
        title: section.title,
        description: section.description || undefined,
        order: section.order,
        conditional: section.conditional as any,
        questions: section.questions?.map(question => {
          const linkedActivities = (question.config as any)?.linkedActivities || [];
          const primaryActivity = linkedActivities.length > 0 ? linkedActivities[0] : null;

          return {
            type: question.type,
            title: question.title,
            description: question.description || undefined,
            order: question.order,
            isRequired: question.isRequired,
            config: question.config as any,
            conditional: question.conditional as any,
            dbColumnName: question.dbColumnName || undefined,
            dbDataType: question.dbDataType || undefined,
            linkedActivityId: primaryActivity?.activityId || question.linkedActivityId || undefined,
            linkedOutcomeId: primaryActivity?.outcomeId || question.linkedOutcomeId || undefined,
            linkedKpiId: primaryActivity?.kpiContribution?.kpiId || question.linkedKpiId || undefined,
            kpiContribution: primaryActivity?.kpiContribution || question.kpiContribution || undefined,
            linkedActivities: linkedActivities.length > 0 ? linkedActivities : (question.linkedActivityId ? [{
              activityId: question.linkedActivityId,
              outcomeId: question.linkedOutcomeId,
              projectId,
              kpiContribution: question.kpiContribution
            }] : []),
          };
        }) || [],
      })) || [],
    }, createdBy);

    return duplicatedForm;
  }

  async archiveForm(projectId: string, formId: string): Promise<FormWithSections> {
    const { error } = await supabase
      .from('forms')
      .update({ status: 'ARCHIVED', updatedAt: new Date().toISOString() })
      .eq('id', formId)
      .eq('projectId', projectId);

    if (error) throw new Error(`Failed to archive form: ${error.message}`);
    return await this.getForm(projectId, formId);
  }

  async disableForm(projectId: string, formId: string): Promise<FormWithSections> {
    const { error } = await supabase
      .from('forms')
      .update({ status: 'CLOSED', updatedAt: new Date().toISOString() })
      .eq('id', formId)
      .eq('projectId', projectId);

    if (error) throw new Error(`Failed to disable form: ${error.message}`);
    return await this.getForm(projectId, formId);
  }

  async restoreForm(projectId: string, formId: string): Promise<FormWithSections> {
    const { error } = await supabase
      .from('forms')
      .update({ status: 'PUBLISHED', updatedAt: new Date().toISOString() })
      .eq('id', formId)
      .eq('projectId', projectId);

    if (error) throw new Error(`Failed to restore form: ${error.message}`);
    return await this.getForm(projectId, formId);
  }

  async getPublicForm(formId: string): Promise<FormWithSections> {
    const { data: form, error } = await supabase
      .from('forms')
      .select(`
        *,
        sections:form_sections(
          *,
          questions:form_questions(*)
        )
      `)
      .eq('id', formId)
      .eq('status', 'PUBLISHED')
      .single();

    if (error) throw new Error(`Failed to fetch public form: ${error.message}`);

    // Check if form requires authentication
    const settings = form.settings as any;
    if (settings?.requireAuthentication) {
      throw new Error('Form requires authentication');
    }

    // Check if form has expired
    if (settings?.expiryDate && new Date(settings.expiryDate) < new Date()) {
      throw new Error('Form has expired');
    }

    // Transform the data - extract options and other config properties from questions
    return {
      ...form,
      sections: (form.sections || []).map((section: any) => ({
        ...section,
        questions: (section.questions || []).map((question: any) => {
          // Transform question to extract options and other config properties
          if (!question.config) return question;
          
          const config = typeof question.config === 'string' ? JSON.parse(question.config) : question.config;
          
          return {
            ...question,
            options: config.options || [],
            // Extract other config properties that might be expected at top level
            placeholder: config.placeholder,
            min: config.min,
            max: config.max,
            step: config.step,
            allowOther: config.allowOther,
            maxSelections: config.maxSelections,
            displayType: config.displayType,
            statements: config.statements,
            defaultScaleType: config.defaultScaleType,
            defaultLabels: config.defaultLabels,
            // Preserve the original config
            config
          };
        }).sort((a: any, b: any) => (a.order || 0) - (b.order || 0)),
      })).sort((a: any, b: any) => (a.order || 0) - (b.order || 0)),
    };
  }

  async getSecureForm(formId: string): Promise<FormWithSections> {
    const { data: form, error } = await supabase
      .from('forms')
      .select(`
        *,
        sections:form_sections(
          *,
          questions:form_questions(*)
        )
      `)
      .eq('id', formId)
      .eq('status', 'PUBLISHED')
      .single();

    if (error) throw new Error(`Failed to fetch secure form: ${error.message}`);

    // Transform the data - extract options and other config properties from questions
    return {
      ...form,
      sections: (form.sections || []).map((section: any) => ({
        ...section,
        questions: (section.questions || []).map((question: any) => {
          // Transform question to extract options and other config properties
          if (!question.config) return question;
          
          const config = typeof question.config === 'string' ? JSON.parse(question.config) : question.config;
          
          return {
            ...question,
            options: config.options || [],
            // Extract other config properties that might be expected at top level
            placeholder: config.placeholder,
            min: config.min,
            max: config.max,
            step: config.step,
            allowOther: config.allowOther,
            maxSelections: config.maxSelections,
            displayType: config.displayType,
            statements: config.statements,
            defaultScaleType: config.defaultScaleType,
            defaultLabels: config.defaultLabels,
            // Preserve the original config
            config
          };
        }).sort((a: any, b: any) => (a.order || 0) - (b.order || 0)),
      })).sort((a: any, b: any) => (a.order || 0) - (b.order || 0)),
    };
  }

  // ========================================
  // FORM RESPONSES
  // ========================================

  async createResponse(responseData: {
    formId: string;
    respondentId?: string;
    respondentEmail?: string;
    isComplete?: boolean;
    ipAddress?: string;
    userAgent?: string;
    source?: string;
    data: Record<string, any>;
  }): Promise<FormResponseWithAttachments> {
    // Multi-tenant: Verify form belongs to user's organization
    const organizationId = await this.getCurrentUserOrganizationId();
    
    // Get form version and verify ownership
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('version, responseCount, projectId, organizationid')
      .eq('id', responseData.formId)
      .eq('organizationid', organizationId) // Verify ownership
      .single();

    if (formError || !form) throw new Error(`Failed to fetch form or access denied: ${formError?.message}`);
    
    // Verify project ownership
    if (form.projectId) {
      await this.verifyProjectOwnership(form.projectId);
    }

    const responseId = crypto.randomUUID();

    // Create form response
    const { data: response, error: responseError } = await supabase
      .from('form_responses')
      .insert({
        id: responseId,
        formId: responseData.formId,
        formVersion: form.version,
        respondentId: responseData.respondentId || null,
        respondentEmail: responseData.respondentEmail || null,
        isComplete: responseData.isComplete || false,
        ipAddress: responseData.ipAddress || null,
        userAgent: responseData.userAgent || null,
        source: responseData.source || null,
        organizationid: organizationId, // Multi-tenant: Set organizationid (database column is lowercase)
        startedAt: new Date().toISOString(),
        submittedAt: responseData.isComplete ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (responseError) {
      // Handle subscription limit errors from RLS policies (only for complete responses)
      if (responseData.isComplete !== false) {
        const { handleSubscriptionError } = await import('@/utils/subscriptionErrorHandler');
        throw await handleSubscriptionError(responseError, 'form_responses', 'create');
      }
      throw new Error(`Failed to create response: ${responseError.message}`);
    }

    // Create question responses
    // Filter out null/undefined values and ensure all values are valid JSON
    const questionResponses = Object.entries(responseData.data)
      .filter(([questionId, value]) => {
        // Filter out null and undefined - these shouldn't be stored
        // Keep empty strings, empty arrays, empty objects, 0, false as they are valid responses
        return value !== null && value !== undefined;
      })
      .map(([questionId, value]) => {
        // Ensure value is a valid JSON-serializable value
        // The value column is JSON type, so it can accept strings, numbers, booleans, arrays, objects
        // But NOT null or undefined
        let jsonValue: any;
        
        if (Array.isArray(value)) {
          jsonValue = value;
        } else if (typeof value === 'object' && value !== null) {
          jsonValue = value;
        } else {
          // For primitives (string, number, boolean), use as-is
          jsonValue = value;
        }
        
        return {
          id: crypto.randomUUID(),
          responseId,
          questionId,
          value: jsonValue,
        } as unknown as Database['public']['Tables']['form_question_responses']['Insert'];
      });

    if (questionResponses.length > 0) {
      const { error: qrError } = await supabase
        .from('form_question_responses')
        .insert(questionResponses);

      if (qrError) {
        // Clean up response if question responses fail
        await supabase.from('form_responses').delete().eq('id', responseId);
        throw new Error(`Failed to create question responses: ${qrError.message}`);
      }
    }

    // Update form response count
    const currentResponseCount = form.responseCount || 0;
    const newResponseCount = currentResponseCount + 1;
    const lastResponseAt = new Date().toISOString();
    
    console.log('📊 [supabaseFormsService.createResponse] Updating form response count:', {
      formId: responseData.formId,
      currentResponseCount,
      newResponseCount,
      lastResponseAt
    });
    
    const { error: updateError, data: updatedForm } = await supabase
      .from('forms')
      .update({ 
        responseCount: newResponseCount,
        lastResponseAt: lastResponseAt,
      })
      .eq('id', responseData.formId)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ [supabaseFormsService.createResponse] Failed to update form response count:', updateError);
      // Don't throw - response was created successfully, just count update failed
    } else {
      console.log('✅ [supabaseFormsService.createResponse] Form response count updated:', {
        formId: responseData.formId,
        newResponseCount: updatedForm?.responseCount,
        lastResponseAt: updatedForm?.lastResponseAt
      });
    }

    // Note: Usage tracking is now handled by database trigger (track_form_response_insert)
    // This ensures atomicity and better performance. All responses are tracked (complete and incomplete).

    // Return response with data aggregated
    return {
      ...response,
      data: responseData.data,
      attachments: [],
    };
  }

  async getFormResponses(
    projectId: string,
    formId: string,
    options?: {
      page?: number;
      limit?: number;
      search?: string;
      status?: 'all' | 'complete' | 'incomplete';
    }
  ): Promise<{
    responses: FormResponseWithAttachments[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    stats: { totalAll: number; totalComplete: number; totalIncomplete: number };
  }> {
    // Multi-tenant: Verify project ownership first
    await this.verifyProjectOwnership(projectId);
    
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const page = options?.page || 1;
    const limit = options?.limit || 100;
    const skip = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('form_responses')
      .select(`
        *,
        attachments:media_attachments(*),
        questionResponses:form_question_responses(*)
      `, { count: 'exact' })
      .eq('formId', formId)
      .eq('organizationid', organizationId); // Filter by organization

    // Apply status filter
    if (options?.status === 'complete') {
      query = query.eq('isComplete', true);
    } else if (options?.status === 'incomplete') {
      query = query.eq('isComplete', false);
    }

    // Apply search filter (search in respondentEmail or question response values)
    if (options?.search) {
      query = query.ilike('respondentEmail', `%${options.search}%`);
    }

    // Apply pagination
    query = query.order('startedAt', { ascending: false }).range(skip, skip + limit - 1);

    const { data: responses, error, count } = await query;

    if (error) throw new Error(`Failed to fetch responses: ${error.message}`);

    // Get stats (filtered by organization)
    const { count: totalAll } = await supabase
      .from('form_responses')
      .select('*', { count: 'exact', head: true })
      .eq('formId', formId)
      .eq('organizationid', organizationId); // Filter by organization

    const { count: totalComplete } = await supabase
      .from('form_responses')
      .select('*', { count: 'exact', head: true })
      .eq('formId', formId)
      .eq('organizationid', organizationId) // Filter by organization
      .eq('isComplete', true);

    const { count: totalIncomplete } = await supabase
      .from('form_responses')
      .select('*', { count: 'exact', head: true })
      .eq('formId', formId)
      .eq('organizationid', organizationId) // Filter by organization
      .eq('isComplete', false);

    console.log('📋 [supabaseFormsService.getFormResponses] Raw responses from Supabase:', {
      responseCount: responses?.length || 0,
      emptyResponsesCount: responses?.filter(r => !r.questionResponses || r.questionResponses.length === 0).length || 0,
      responsesWithData: responses?.filter(r => r.questionResponses && r.questionResponses.length > 0).length || 0,
      responsesSummary: responses?.map(r => ({
        id: r.id,
        isComplete: r.isComplete,
        source: r.source,
        questionResponsesCount: r.questionResponses?.length || 0,
        startedAt: r.startedAt,
        submittedAt: r.submittedAt
      })) || [],
      sampleResponse: responses?.[0] ? {
        id: responses[0].id,
        formId: responses[0].formId,
        isComplete: responses[0].isComplete,
        source: responses[0].source,
        questionResponsesCount: responses[0].questionResponses?.length || 0,
        questionResponsesSample: responses[0].questionResponses?.slice(0, 3).map((qr: any) => ({
          questionId: qr.questionId,
          value: qr.value,
          valueType: typeof qr.value
        })) || []
      } : null
    });

    const mappedResponses = (responses || []).map((r: any) => {
      // Aggregate question responses into data object
      const data: Record<string, any> = {};
      if (r.questionResponses && Array.isArray(r.questionResponses)) {
        r.questionResponses.forEach((qr: any) => {
          // Parse JSONB value if it's a string, otherwise use as-is
          let parsedValue = qr.value;
          if (typeof qr.value === 'string') {
            try {
              parsedValue = JSON.parse(qr.value);
            } catch (e) {
              // Not JSON, use as string
              parsedValue = qr.value;
            }
          }
          data[qr.questionId] = parsedValue;
        });
      }
      
      const hasData = Object.keys(data).length > 0;
      if (!hasData) {
        console.warn('⚠️ [supabaseFormsService.getFormResponses] Response has no question data:', {
          responseId: r.id,
          isComplete: r.isComplete,
          source: r.source,
          startedAt: r.startedAt,
          submittedAt: r.submittedAt,
          questionResponsesRaw: r.questionResponses,
          possibleCause: r.questionResponses ? 'Question responses exist but failed to map' : 'No question responses in database'
        });
      } else {
        console.log('📋 [supabaseFormsService.getFormResponses] Mapped response:', {
          responseId: r.id,
          dataKeys: Object.keys(data),
          dataCount: Object.keys(data).length,
          dataSample: Object.entries(data).slice(0, 3).reduce((acc, [key, value]) => {
            acc[key] = typeof value === 'object' ? JSON.stringify(value).substring(0, 50) : value;
            return acc;
          }, {} as Record<string, any>)
        });
      }
      
      return {
        ...r,
        data,
        attachments: r.attachments || [],
      };
    });

    console.log('📊 [supabaseFormsService.getFormResponses] Final result:', {
      totalResponses: mappedResponses.length,
      totalCount: count || 0,
      stats: {
        totalAll: totalAll || 0,
        totalComplete: totalComplete || 0,
        totalIncomplete: totalIncomplete || 0,
      }
    });

    return {
      responses: mappedResponses,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
      stats: {
        totalAll: totalAll || 0,
        totalComplete: totalComplete || 0,
        totalIncomplete: totalIncomplete || 0,
      },
    };
  }

  async getAllFormResponsesForExport(
    projectId: string,
    formId: string,
    options?: {
      status?: 'all' | 'complete' | 'incomplete';
    }
  ): Promise<{ responses: FormResponseWithAttachments[]; total: number }> {
    // Build query
    let query = supabase
      .from('form_responses')
      .select(`
        *,
        attachments:media_attachments(*),
        questionResponses:form_question_responses(*)
      `, { count: 'exact' })
      .eq('formId', formId);

    // Apply status filter
    if (options?.status === 'complete') {
      query = query.eq('isComplete', true);
    } else if (options?.status === 'incomplete') {
      query = query.eq('isComplete', false);
    }

    // Order by startedAt ASC for export
    query = query.order('startedAt', { ascending: true });

    const { data: responses, error, count } = await query;

    if (error) throw new Error(`Failed to fetch responses for export: ${error.message}`);

    return {
      responses: (responses || []).map((r: any) => {
        // Aggregate question responses into data object
        const data: Record<string, any> = {};
        if (r.questionResponses) {
          r.questionResponses.forEach((qr: any) => {
            data[qr.questionId] = qr.value;
          });
        }
        return {
          ...r,
          data,
          attachments: r.attachments || [],
        };
      }),
      total: count || 0,
    };
  }

  async getFormResponse(projectId: string, formId: string, responseId: string): Promise<FormResponseWithAttachments> {
    // Multi-tenant: Verify project ownership first
    await this.verifyProjectOwnership(projectId);
    
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { data: response, error } = await supabase
      .from('form_responses')
      .select(`
        *,
        attachments:media_attachments(*),
        questionResponses:form_question_responses(*)
      `)
      .eq('id', responseId)
      .eq('formId', formId)
      .eq('organizationid', organizationId) // Ensure ownership
      .single();

    if (error) throw new Error(`Failed to fetch response: ${error.message}`);

    // Aggregate question responses into data object
    const data: Record<string, any> = {};
    if ((response as any).questionResponses) {
      (response as any).questionResponses.forEach((qr: any) => {
        data[qr.questionId] = qr.value;
      });
    }

    return {
      ...response,
      data,
      attachments: (response as any).attachments || [],
    };
  }

  async updateFormResponse(
    projectId: string,
    formId: string,
    responseId: string,
    updates: {
      respondentEmail?: string;
      isComplete?: boolean;
      data?: Record<string, any>;
    }
  ): Promise<FormResponseWithAttachments> {
    // Multi-tenant: Verify project ownership first
    await this.verifyProjectOwnership(projectId);
    
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const updateData: FormResponseUpdate = {};
    if (updates.respondentEmail !== undefined) updateData.respondentEmail = updates.respondentEmail;
    if (updates.isComplete !== undefined) {
      updateData.isComplete = updates.isComplete;
      if (updates.isComplete) {
        updateData.submittedAt = new Date().toISOString();
      }
    }

    // Update form response
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('form_responses')
        .update(updateData)
        .eq('id', responseId)
        .eq('formId', formId)
        .eq('organizationid', organizationId); // Ensure ownership

      if (updateError) throw new Error(`Failed to update response: ${updateError.message}`);

      // Note: Usage tracking is now handled by database trigger (track_form_response_insert)
      // All responses are tracked on creation, so status changes don't affect usage count.
      // The majority of responses are complete when created, so tracking all responses is appropriate.
    }

    // Update question responses if data is provided
    if (updates.data !== undefined) {
      // Delete existing question responses
      await supabase
        .from('form_question_responses')
        .delete()
        .eq('responseId', responseId);

      // Insert new question responses
      const questionResponses = Object.entries(updates.data)
        .filter(([questionId, value]) => value !== null && value !== undefined)
        .map(([questionId, value]) => {
          // Ensure value is a valid JSON-serializable value
          let jsonValue: any;
          
          if (Array.isArray(value)) {
            jsonValue = value;
          } else if (typeof value === 'object' && value !== null) {
            jsonValue = value;
          } else {
            // For primitives (string, number, boolean), use as-is
            jsonValue = value;
          }
          
          return {
            id: crypto.randomUUID(),
            responseId,
            questionId,
            value: jsonValue,
          } as unknown as Database['public']['Tables']['form_question_responses']['Insert'];
        });

      if (questionResponses.length > 0) {
        const { error: qrError } = await supabase
          .from('form_question_responses')
          .insert(questionResponses);

        if (qrError) throw new Error(`Failed to update question responses: ${qrError.message}`);
      }
    }

    // Fetch and return updated response
    return await this.getFormResponse(projectId, formId, responseId);
  }

  async deleteFormResponse(projectId: string, formId: string, responseId: string): Promise<void> {
    // Multi-tenant: Verify project ownership first
    await this.verifyProjectOwnership(projectId);
    
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { error } = await supabase
      .from('form_responses')
      .delete()
      .eq('id', responseId)
      .eq('formId', formId)
      .eq('organizationid', organizationId); // Ensure ownership

    if (error) throw new Error(`Failed to delete response: ${error.message}`);

    // Note: Usage tracking is now handled by database trigger (track_form_response_delete)
    // This ensures atomicity and better performance. All responses are tracked (complete and incomplete).
  }

  // ========================================
  // FORM ANALYTICS
  // ========================================

  async getFormAnalytics(projectId: string, formId: string): Promise<any> {
    // Get response counts
    const { count: totalResponses } = await supabase
      .from('form_responses')
      .select('*', { count: 'exact', head: true })
      .eq('formId', formId);

    const { count: completeResponses } = await supabase
      .from('form_responses')
      .select('*', { count: 'exact', head: true })
      .eq('formId', formId)
      .eq('isComplete', true);

    const { count: incompleteResponses } = await supabase
      .from('form_responses')
      .select('*', { count: 'exact', head: true })
      .eq('formId', formId)
      .eq('isComplete', false);

    // Get response data for question-level analytics
    const { data: responses } = await supabase
      .from('form_responses')
      .select('data, isComplete, submittedAt')
      .eq('formId', formId);

    return {
      totalResponses: totalResponses || 0,
      completeResponses: completeResponses || 0,
      incompleteResponses: incompleteResponses || 0,
      completionRate: totalResponses ? ((completeResponses || 0) / totalResponses) * 100 : 0,
      responses: responses || [],
    };
  }

  // ========================================
  // FORM TEMPLATES
  // ========================================

  async createTemplate(templateData: {
    name: string;
    description: string;
    category: string;
    tags?: string[];
    previewImage?: string;
    isPublic?: boolean;
    sections: any[];
    settings: any;
  }, createdBy: string): Promise<FormTemplate> {
    const { data: template, error } = await supabase
      .from('form_templates')
      .insert({
        name: templateData.name,
        description: templateData.description,
        category: templateData.category,
        tags: templateData.tags || null,
        previewImage: templateData.previewImage || null,
        isPublic: templateData.isPublic || false,
        sections: templateData.sections,
        settings: templateData.settings,
        createdBy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as unknown as Database['public']['Tables']['form_templates']['Insert'])
      .select()
      .single();

    if (error) throw new Error(`Failed to create template: ${error.message}`);
    return template;
  }

  async getPublicTemplates(): Promise<FormTemplate[]> {
    const { data: templates, error } = await supabase
      .from('form_templates')
      .select('*')
      .eq('isPublic', true)
      .order('createdAt', { ascending: false });

    if (error) throw new Error(`Failed to fetch templates: ${error.message}`);
    return templates || [];
  }

  async getUserTemplates(userId: string): Promise<FormTemplate[]> {
    const { data: templates, error } = await supabase
      .from('form_templates')
      .select('*')
      .or(`isPublic.eq.true,createdBy.eq.${userId}`)
      .order('createdAt', { ascending: false });

    if (error) throw new Error(`Failed to fetch user templates: ${error.message}`);
    return templates || [];
  }

  async createFormFromTemplate(projectId: string, templateId: string, title: string, createdBy: string): Promise<FormWithSections> {
    // Get template
    const { data: template, error: templateError } = await supabase
      .from('form_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError) throw new Error(`Failed to fetch template: ${templateError.message}`);

    // Create form from template
    return await this.createForm(projectId, {
      title,
      description: template.description,
      status: 'DRAFT',
      tags: template.tags || undefined,
      category: template.category || undefined,
      sections: template.sections as any[],
      settings: template.settings as any,
    }, createdBy);
  }

  // ========================================
  // MEDIA ATTACHMENTS
  // ========================================

  async uploadMediaFile(
    projectId: string,
    formId: string,
    questionId: string,
    responseId: string | null,
    file: File,
    metadata: {
      tags?: string[];
      description?: string;
      location?: {
        latitude: number;
        longitude: number;
        accuracy?: number;
        address?: string;
      };
    },
    uploadedBy: string
  ): Promise<MediaAttachment> {
    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `forms/${formId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(filePath, file);

    if (uploadError) throw new Error(`Failed to upload file: ${uploadError.message}`);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('media')
      .getPublicUrl(filePath);

    // Create media attachment record
    const { data: attachment, error: attachmentError } = await supabase
      .from('media_attachments')
      .insert({
        formId,
        questionId: questionId || null,
        responseId: responseId || null,
        fileName,
        filePath,
        originalName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        url: urlData.publicUrl,
        uploadedBy,
        uploadedAt: new Date().toISOString(),
        metadata: {
          ...metadata,
          mediaType: this.getMediaTypeFromMimeType(file.type),
        },
      } as unknown as Database['public']['Tables']['media_attachments']['Insert'])
      .select()
      .single();

    if (attachmentError) throw new Error(`Failed to create attachment record: ${attachmentError.message}`);

    // Track storage: increment storage_gb
    try {
      const fileSizeGB = file.size / (1024 * 1024 * 1024);
      await supabaseUsageTrackingService.incrementUsage('storage_gb', fileSizeGB);
    } catch (error) {
      console.error('Failed to track storage usage on media upload:', error);
      // Don't throw - tracking failure shouldn't break file upload
    }

    return attachment;
  }

  async uploadDirectMediaFile(
    projectId: string,
    file: File,
    metadata: {
      description?: string;
      tags?: string[];
    },
    uploadedBy: string
  ): Promise<MediaAttachment> {
    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `projects/${projectId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(filePath, file);

    if (uploadError) throw new Error(`Failed to upload file: ${uploadError.message}`);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('media')
      .getPublicUrl(filePath);

    // Create media attachment record
    const { data: attachment, error: attachmentError } = await supabase
      .from('media_attachments')
      .insert({
        formId: null,
        questionId: null,
        responseId: null,
        fileName,
        filePath,
        originalName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        url: urlData.publicUrl,
        uploadedBy,
        uploadedAt: new Date().toISOString(),
        metadata: {
          ...metadata,
          mediaType: this.getMediaTypeFromMimeType(file.type),
          projectId,
        },
      } as unknown as Database['public']['Tables']['media_attachments']['Insert'])
      .select()
      .single();

    if (attachmentError) throw new Error(`Failed to create attachment record: ${attachmentError.message}`);

    // Track storage: increment storage_gb
    try {
      const fileSizeGB = file.size / (1024 * 1024 * 1024);
      await supabaseUsageTrackingService.incrementUsage('storage_gb', fileSizeGB);
    } catch (error) {
      console.error('Failed to track storage usage on direct media upload:', error);
      // Don't throw - tracking failure shouldn't break file upload
    }

    return attachment;
  }

  async getFormMediaFiles(projectId: string, formId: string): Promise<MediaAttachment[]> {
    const { data: attachments, error } = await supabase
      .from('media_attachments')
      .select('*')
      .eq('formId', formId)
      .order('uploadedAt', { ascending: false });

    if (error) throw new Error(`Failed to fetch media files: ${error.message}`);
    return attachments || [];
  }

  async getProjectMediaFiles(projectId: string, search?: string, mediaType?: string): Promise<MediaAttachment[]> {
    // First, get all form IDs for this project
    const { data: forms, error: formsError } = await supabase
      .from('forms')
      .select('id')
      .eq('projectId', projectId);

    if (formsError) throw new Error(`Failed to fetch project forms: ${formsError.message}`);

    const formIds = (forms || []).map(f => f.id);

    // Build OR condition: formId in formIds OR metadata.projectId = projectId
    const orConditions: string[] = [];
    if (formIds.length > 0) {
      orConditions.push(`formId.in.(${formIds.join(',')})`);
    }
    orConditions.push(`metadata->>projectId.eq.${projectId}`);

    let query = supabase
      .from('media_attachments')
      .select('*')
      .or(orConditions.join(','));

    // Apply search filter
    if (search) {
      query = query.or(`originalName.ilike.%${search}%,fileName.ilike.%${search}%,metadata::text.ilike.%${search}%`);
    }

    // Apply media type filter
    if (mediaType) {
      query = query.eq('metadata->>mediaType', mediaType);
    }

    query = query.order('uploadedAt', { ascending: false });

    const { data: attachments, error } = await query;

    if (error) throw new Error(`Failed to fetch project media files: ${error.message}`);
    return attachments || [];
  }

  async deleteMediaFile(projectId: string, formId: string, mediaId: string): Promise<void> {
    // Get attachment to get file path and size
    const { data: attachment, error: fetchError } = await supabase
      .from('media_attachments')
      .select('filePath, fileSize')
      .eq('id', mediaId)
      .eq('formId', formId)
      .single();

    if (fetchError) throw new Error(`Failed to fetch attachment: ${fetchError.message}`);

    // Delete from storage
    if (attachment.filePath) {
      const { error: storageError } = await supabase.storage
        .from('media')
        .remove([attachment.filePath]);

      if (storageError) {
        console.error('Failed to delete file from storage:', storageError);
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('media_attachments')
      .delete()
      .eq('id', mediaId)
      .eq('formId', formId);

    if (deleteError) throw new Error(`Failed to delete attachment: ${deleteError.message}`);

    // Track storage: decrement storage_gb
    try {
      const fileSizeStr = String(attachment.fileSize || '0');
      const fileSizeGB = parseInt(fileSizeStr, 10) / (1024 * 1024 * 1024);
      if (fileSizeGB > 0) {
        await supabaseUsageTrackingService.decrementUsage('storage_gb', fileSizeGB);
      }
    } catch (error) {
      console.error('Failed to track storage usage on media deletion:', error);
      // Don't throw - tracking failure shouldn't break file deletion
    }
  }

  async updateMediaFileMetadata(
    projectId: string,
    formId: string,
    mediaId: string,
    updates: any
  ): Promise<MediaAttachment> {
    const { data: attachment, error } = await supabase
      .from('media_attachments')
      .update({
        metadata: updates,
      })
      .eq('id', mediaId)
      .eq('formId', formId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update metadata: ${error.message}`);
    return attachment;
  }

  private getMediaTypeFromMimeType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'file';
  }
}

export const supabaseFormsService = new SupabaseFormsService();

