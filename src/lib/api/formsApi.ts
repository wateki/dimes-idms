import { supabaseFormsService } from '@/services/supabaseFormsService';
import { supabaseAuthService } from '@/services/supabaseAuthService';
import { Form, FormResponse, FormTemplate } from '@/components/dashboard/form-creation-wizard/types';

// Helper function to convert Supabase form (with string dates) to Form type (with Date objects)
function convertSupabaseFormToForm(supabaseForm: any): Form {
  return {
    ...supabaseForm,
    createdAt: new Date(supabaseForm.createdAt),
    updatedAt: new Date(supabaseForm.updatedAt),
    lastResponseAt: supabaseForm.lastResponseAt ? new Date(supabaseForm.lastResponseAt) : undefined,
  } as Form;
}

// Helper function to convert Supabase form response (with string dates) to FormResponse type (with Date objects)
function convertSupabaseResponseToFormResponse(supabaseResponse: any): FormResponse {
  return {
    ...supabaseResponse,
    startedAt: new Date(supabaseResponse.startedAt),
    submittedAt: supabaseResponse.submittedAt ? new Date(supabaseResponse.submittedAt) : undefined,
    attachments: supabaseResponse.attachments?.map((att: any) => ({
      ...att,
      uploadedAt: new Date(att.uploadedAt),
    })) || [],
  } as FormResponse;
}

// Helper function to convert Supabase template to FormTemplate type
function convertSupabaseTemplateToFormTemplate(supabaseTemplate: any): FormTemplate {
  return {
    ...supabaseTemplate,
    tags: supabaseTemplate.tags || [],
  } as FormTemplate;
}

// DTO interfaces that match backend expectations
export interface CreateFormDto {
  title: string;
  description?: string;
  projectId: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';
  tags?: string[];
  category?: string;
  sections?: any[];
  settings?: any;
}

export interface UpdateFormDto {
  title?: string;
  description?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';
  tags?: string[];
  category?: string;
  sections?: any[];
  settings?: any;
}

export interface CreateFormResponseDto {
  formId: string;
  respondentId?: string;
  respondentEmail?: string;
  isComplete?: boolean;
  ipAddress?: string;
  userAgent?: string;
  source?: string;
  data: Record<string, any>;
}

export interface UpdateFormResponseDto {
  respondentEmail?: string;
  isComplete?: boolean;
  data?: Record<string, any>;
}

export interface CreateFormTemplateDto {
  name: string;
  description: string;
  category: string;
  tags?: string[];
  previewImage?: string;
  isPublic?: boolean;
  sections: any[];
  settings: any;
}


export const formsApi = {
  // ========================================
  // PROJECT FORM MANAGEMENT
  // ========================================

  async createForm(projectId: string, formData: CreateFormDto): Promise<Form> {
    const user = await supabaseAuthService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    const supabaseForm = await supabaseFormsService.createForm(projectId, formData, user.id);
    return convertSupabaseFormToForm(supabaseForm);
  },

  async getProjectForms(projectId: string): Promise<Form[]> {
    const supabaseForms = await supabaseFormsService.getProjectForms(projectId);
    return supabaseForms.map(convertSupabaseFormToForm);
  },

  async getForm(projectId: string, formId: string): Promise<Form> {
    const supabaseForm = await supabaseFormsService.getForm(projectId, formId);
    return convertSupabaseFormToForm(supabaseForm);
  },

  async updateForm(projectId: string, formId: string, updates: UpdateFormDto): Promise<Form> {
    const supabaseForm = await supabaseFormsService.updateForm(projectId, formId, updates);
    return convertSupabaseFormToForm(supabaseForm);
  },

  async deleteForm(projectId: string, formId: string): Promise<void> {
    await supabaseFormsService.deleteForm(projectId, formId);
  },

  async duplicateForm(projectId: string, formId: string): Promise<Form> {
    const user = await supabaseAuthService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    const supabaseForm = await supabaseFormsService.duplicateForm(projectId, formId, user.id);
    return convertSupabaseFormToForm(supabaseForm);
  },

  async archiveForm(projectId: string, formId: string): Promise<Form> {
    const supabaseForm = await supabaseFormsService.archiveForm(projectId, formId);
    return convertSupabaseFormToForm(supabaseForm);
  },

  async disableForm(projectId: string, formId: string): Promise<Form> {
    const supabaseForm = await supabaseFormsService.disableForm(projectId, formId);
    return convertSupabaseFormToForm(supabaseForm);
  },

  async restoreForm(projectId: string, formId: string): Promise<Form> {
    const supabaseForm = await supabaseFormsService.restoreForm(projectId, formId);
    return convertSupabaseFormToForm(supabaseForm);
  },


  // ========================================
  // FORM RESPONSES
  // ========================================

  async submitResponse(responseData: CreateFormResponseDto): Promise<FormResponse> {
    const supabaseResponse = await supabaseFormsService.createResponse(responseData);
    return convertSupabaseResponseToFormResponse(supabaseResponse);
  },

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
    responses: FormResponse[]; 
    total: number; 
    page: number; 
    limit: number; 
    totalPages: number;
    stats: { totalAll: number; totalComplete: number; totalIncomplete: number }
  }> {
    const result = await supabaseFormsService.getFormResponses(projectId, formId, options);
    return {
      ...result,
      responses: result.responses.map(convertSupabaseResponseToFormResponse),
    };
  },

  async getFormResponse(projectId: string, formId: string, responseId: string): Promise<FormResponse> {
    const supabaseResponse = await supabaseFormsService.getFormResponse(projectId, formId, responseId);
    return convertSupabaseResponseToFormResponse(supabaseResponse);
  },

  // Optimized endpoint for exporting ALL responses (no pagination limit)
  async getFormResponsesForExport(
    projectId: string, 
    formId: string,
    options?: {
      status?: 'all' | 'complete' | 'incomplete';
    }
  ): Promise<{ responses: FormResponse[]; total: number }> {
    const result = await supabaseFormsService.getAllFormResponsesForExport(projectId, formId, options);
    return {
      ...result,
      responses: result.responses.map(convertSupabaseResponseToFormResponse),
    };
  },

  async updateFormResponse(projectId: string, formId: string, responseId: string, updates: UpdateFormResponseDto): Promise<FormResponse> {
    const supabaseResponse = await supabaseFormsService.updateFormResponse(projectId, formId, responseId, updates);
    return convertSupabaseResponseToFormResponse(supabaseResponse);
  },

  async deleteFormResponse(projectId: string, formId: string, responseId: string): Promise<void> {
    await supabaseFormsService.deleteFormResponse(projectId, formId, responseId);
  },

  // ========================================
  // FORM ANALYTICS
  // ========================================

  async getFormAnalytics(projectId: string, formId: string): Promise<any> {
    return await supabaseFormsService.getFormAnalytics(projectId, formId);
  },

  // ========================================
  // FORM TEMPLATES
  // ========================================

  async createTemplate(templateData: CreateFormTemplateDto): Promise<FormTemplate> {
    const user = await supabaseAuthService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    const supabaseTemplate = await supabaseFormsService.createTemplate(templateData, user.id);
    return convertSupabaseTemplateToFormTemplate(supabaseTemplate);
  },

  async getPublicTemplates(): Promise<FormTemplate[]> {
    const supabaseTemplates = await supabaseFormsService.getPublicTemplates();
    return supabaseTemplates.map(convertSupabaseTemplateToFormTemplate);
  },

  async getUserTemplates(): Promise<FormTemplate[]> {
    const user = await supabaseAuthService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    const supabaseTemplates = await supabaseFormsService.getUserTemplates(user.id);
    return supabaseTemplates.map(convertSupabaseTemplateToFormTemplate);
  },

  async createFormFromTemplate(projectId: string, templateId: string, title: string): Promise<Form> {
    const user = await supabaseAuthService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    const supabaseForm = await supabaseFormsService.createFormFromTemplate(projectId, templateId, title, user.id);
    return convertSupabaseFormToForm(supabaseForm);
  },

  // ========================================
  // MEDIA ATTACHMENTS
  // ========================================

  async uploadMediaFile(
    projectId: string,
    formId: string,
    file: File,
    questionId: string,
    responseId: string,
    metadata: {
      tags?: string[];
      description?: string;
      location?: {
        latitude: number;
        longitude: number;
        accuracy?: number;
        address?: string;
      };
    }
  ): Promise<any> {
    const user = await supabaseAuthService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    return await supabaseFormsService.uploadMediaFile(
      projectId,
      formId,
      questionId,
      responseId,
      file,
      metadata,
      user.id
    );
  },

  async uploadDirectMediaFile(
    projectId: string,
    file: File,
    description?: string,
    tags?: string
  ): Promise<any> {
    const user = await supabaseAuthService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    const tagsArray = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    return await supabaseFormsService.uploadDirectMediaFile(
      projectId,
      file,
      { description, tags: tagsArray },
      user.id
    );
  },

  async getFormMediaFiles(projectId: string, formId: string): Promise<any[]> {
    return await supabaseFormsService.getFormMediaFiles(projectId, formId);
  },

  async getProjectMediaFiles(projectId: string, search?: string, mediaType?: string): Promise<any[]> {
    return await supabaseFormsService.getProjectMediaFiles(projectId, search, mediaType);
  },

  async deleteMediaFile(projectId: string, formId: string, mediaId: string): Promise<void> {
    await supabaseFormsService.deleteMediaFile(projectId, formId, mediaId);
  },

  async updateMediaFileMetadata(projectId: string, formId: string, mediaId: string, updates: any): Promise<any> {
    return await supabaseFormsService.updateMediaFileMetadata(projectId, formId, mediaId, updates);
  },

  // ========================================
  // PUBLIC FORM ACCESS
  // ========================================

  async getPublicForm(formId: string): Promise<Form> {
    const supabaseForm = await supabaseFormsService.getPublicForm(formId);
    return convertSupabaseFormToForm(supabaseForm);
  },

  async getSecureForm(formId: string): Promise<Form> {
    const supabaseForm = await supabaseFormsService.getSecureForm(formId);
    return convertSupabaseFormToForm(supabaseForm);
  },

  // ========================================
  // UTILITY METHODS
  // ========================================

  async getFormByIdOnly(formId: string): Promise<Form | null> {
    try {
      // If user is authenticated, try secure first
      const session = await supabaseAuthService.getSession();
      if (session) {
        try {
          return await this.getSecureForm(formId);
        } catch {
          // Fallback to public endpoint
        }
      }
      return await this.getPublicForm(formId);
    } catch (error) {
      console.error('Error fetching form:', error);
      return null;
    }
  },

  async getAllUserForms(): Promise<Form[]> {
    try {
      // This would require an endpoint that returns all forms for the current user across all projects
      // For now, return empty array - this method needs to be implemented
      return [];
    } catch (error) {
      console.error('Error fetching user forms:', error);
      return [];
    }
  },

  // ========================================
  // OFFLINE SUPPORT UTILITIES
  // ========================================

  async syncOfflineData(offlineQueue: any[]): Promise<{ success: boolean; failedItems: any[] }> {
    const failedItems: any[] = [];
    
    for (const item of offlineQueue) {
      try {
        switch (item.type) {
          case 'form_create':
            await this.createForm(item.data.projectId, item.data);
            break;
          case 'form_update':
            await this.updateForm(item.data.projectId, item.data.id, item.data);
            break;
          case 'form_response':
            // Defensive mapping to allowed DTO fields
            // Note: item.data.data should already contain properly merged conditional responses
            // (processed by PublicFormFiller.handleSubmit before being queued)
            await this.submitResponse({
              formId: item.data.formId,
              respondentId: item.data.respondentId,
              respondentEmail: item.data.respondentEmail,
              isComplete: item.data.isComplete,
              ipAddress: item.data.ipAddress,
              userAgent: item.data.userAgent,
              source: item.data.source,
              data: item.data.data // Should already contain nested conditional responses
            });
            break;
          case 'form_delete':
            await this.deleteForm(item.data.projectId, item.data.id);
            break;
          default:
            console.warn('Unknown offline queue item type:', item.type);
        }
      } catch (error) {
        console.error('Failed to sync offline item:', item, error);
        failedItems.push(item);
      }
    }

    return {
      success: failedItems.length === 0,
      failedItems
    };
  }
};
