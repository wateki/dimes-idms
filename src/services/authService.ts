import { supabaseAuthService } from './supabaseAuthService';

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
}

class AuthService {
  async changePassword(data: ChangePasswordRequest): Promise<ChangePasswordResponse> {
    await supabaseAuthService.changePassword( data.newPassword);
    return { message: 'Password changed successfully' };
  }

  async getProfile(): Promise<any> {
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      return null;
    }
    return supabaseAuthService.getUserProfile(currentUser.id);
  }
}

export const authService = new AuthService();
