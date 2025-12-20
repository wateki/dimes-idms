import { config } from '@/config/env';
import { supabase } from '@/lib/supabaseClient';

const API_BASE_URL = config.API_BASE_URL;

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class APIClient {
  public async getAuthToken(): Promise<string | null> {
    // Get session from Supabase Auth
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }

  public getBaseUrl(): string {
    return API_BASE_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = await this.getAuthToken();

    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add auth header if token exists
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      });

      // Handle 401 - redirect to login
      if (response.status === 401) {
        // Sign out from Supabase Auth
        await supabase.auth.signOut();
        
        // Trigger auth context to handle logout
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        
        return {
          success: false,
          error: 'Authentication required',
        };
      }

      // Handle 204 No Content responses (empty body)
      if (response.status === 204) {
        return { success: true, data: undefined };
      }

      const data = await response.json();
      
      // Debug logging for duplicate form requests
      if (endpoint.includes('/duplicate')) {
        console.log('🔍 APIClient: Raw response for duplicate request:', {
          status: response.status,
          ok: response.ok,
          hasData: !!data,
          dataKeys: data ? Object.keys(data) : []
        });
        
        if (data && data.sections) {
          console.log('🔍 APIClient: Form sections in response:', data.sections.length);
          data.sections.forEach((section: any, sectionIndex: number) => {
            console.log(`🔍 APIClient: Section ${sectionIndex}:`, {
              title: section.title,
              questionsCount: section.questions?.length || 0
            });
            section.questions?.forEach((question: any, questionIndex: number) => {
              if (question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE') {
                console.log(`🔍 APIClient: Question ${sectionIndex}-${questionIndex} (${question.title}):`, {
                  type: question.type,
                  hasOptions: !!question.options,
                  optionsCount: question.options?.length || 0,
                  options: question.options?.map((opt: any) => ({ id: opt.id, label: opt.label, value: opt.value })) || []
                });
              }
            });
          });
        }
      }

      if (response.ok) {
        return { success: true, data };
      } else {
        return {
          success: false,
          error: data.message || `HTTP ${response.status}`,
        };
      }
    } catch (error: any) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error.message || 'Network error occurred',
      };
    }
  }

  // HTTP Methods
  async get<T>(endpoint: string): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, data?: any): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // Helper method for file uploads
  async upload<T>(endpoint: string, formData: FormData): Promise<APIResponse<T>> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (response.status === 401) {
        await supabase.auth.signOut();
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        
        return {
          success: false,
          error: 'Authentication required',
        };
      }

      // Handle 204 No Content responses (empty body)
      if (response.status === 204) {
        return { success: true, data: undefined };
      }

      const data = await response.json();
      
      // Debug logging for duplicate form requests
      if (endpoint.includes('/duplicate')) {
        console.log('🔍 APIClient: Raw response for duplicate request:', {
          status: response.status,
          ok: response.ok,
          hasData: !!data,
          dataKeys: data ? Object.keys(data) : []
        });
        
        if (data && data.sections) {
          console.log('🔍 APIClient: Form sections in response:', data.sections.length);
          data.sections.forEach((section: any, sectionIndex: number) => {
            console.log(`🔍 APIClient: Section ${sectionIndex}:`, {
              title: section.title,
              questionsCount: section.questions?.length || 0
            });
            section.questions?.forEach((question: any, questionIndex: number) => {
              if (question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE') {
                console.log(`🔍 APIClient: Question ${sectionIndex}-${questionIndex} (${question.title}):`, {
                  type: question.type,
                  hasOptions: !!question.options,
                  optionsCount: question.options?.length || 0,
                  options: question.options?.map((opt: any) => ({ id: opt.id, label: opt.label, value: opt.value })) || []
                });
              }
            });
          });
        }
      }

      if (response.ok) {
        return { success: true, data };
      } else {
        return {
          success: false,
          error: data.message || `HTTP ${response.status}`,
        };
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      return {
        success: false,
        error: error.message || 'Upload failed',
      };
    }
  }
}

// Export singleton instance
export const apiClient = new APIClient();

// Export for use in other API modules
export default apiClient;
