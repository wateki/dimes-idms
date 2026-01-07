import { supabase } from '@/lib/supabaseClient';

export interface ContactMessage {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface ContactMessageResponse {
  success: boolean;
  error?: string;
  id?: string;
}

/**
 * Service for handling contact form submissions
 */
class SupabaseContactService {
  /**
   * Submit a contact form message
   */
  async submitContactMessage(data: ContactMessage): Promise<ContactMessageResponse> {
    try {
      console.log('[Contact Service] Submitting contact message:', { email: data.email, subject: data.subject });

      const { data: result, error } = await supabase
        .from('contact_messages')
        .insert({
          name: data.name.trim(),
          email: data.email.trim().toLowerCase(),
          subject: data.subject.trim(),
          message: data.message.trim(),
          status: 'new', // new, read, replied, archived
          // createdAt and updatedAt will be set automatically by the database
        })
        .select()
        .single();

      if (error) {
        console.error('[Contact Service] Error submitting contact message:', error);
        return {
          success: false,
          error: error.message || 'Failed to submit contact message. Please try again.',
        };
      }

      console.log('[Contact Service] Contact message submitted successfully:', result?.id);
      return {
        success: true,
        id: result?.id,
      };
    } catch (err: any) {
      console.error('[Contact Service] Exception submitting contact message:', err);
      return {
        success: false,
        error: err.message || 'An unexpected error occurred. Please try again.',
      };
    }
  }
}

export const supabaseContactService = new SupabaseContactService();
