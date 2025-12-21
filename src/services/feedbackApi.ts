import { supabaseFeedbackService } from './supabaseFeedbackService';
import type { CreateFeedbackSubmissionRequest } from '../types/feedback';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

class FeedbackApiService {

  // Forms
  async getForms(projectId?: string) {
    return supabaseFeedbackService.getForms(projectId);
  }

  async getFormById(id: string) {
    return supabaseFeedbackService.getFormById(id);
  }

  async createForm(data: any) {
    return supabaseFeedbackService.createForm(data);
  }

  async updateForm(id: string, data: any) {
    return supabaseFeedbackService.updateForm(id, data);
  }

  async deleteForm(id: string) {
    return supabaseFeedbackService.deleteForm(id);
  }

  // Submissions
  async getSubmissions(projectId?: string, formId?: string) {
    return supabaseFeedbackService.getSubmissions(projectId, formId);
  }

  async getSubmissionById(id: string) {
    return supabaseFeedbackService.getSubmissionById(id);
  }

  async createSubmission(data: CreateFeedbackSubmissionRequest) {
    return supabaseFeedbackService.createSubmission(data);
  }

  async updateSubmissionStatus(id: string, data: { status: string; assignedTo?: string }) {
    return supabaseFeedbackService.updateSubmissionStatus(id, data);
  }

  async deleteSubmission(id: string) {
    return supabaseFeedbackService.deleteSubmission(id);
  }

  // Categories
  async getCategories() {
    return supabaseFeedbackService.getCategories();
  }

  async getCategoryById(id: string) {
    return supabaseFeedbackService.getCategoryById(id);
  }

  // Communications and Notes
  async addCommunication(submissionId: string, data: any) {
    return supabaseFeedbackService.addCommunication(submissionId, data);
  }

  async addNote(submissionId: string, data: any) {
    return supabaseFeedbackService.addNote(submissionId, data);
  }

  // Analytics
  async getAnalytics(projectId?: string, formId?: string) {
    return supabaseFeedbackService.getAnalytics(projectId, formId);
  }

  async getFormAnalytics(formId: string) {
    return supabaseFeedbackService.getFormAnalytics(formId);
  }
}

export const feedbackApi = new FeedbackApiService();











