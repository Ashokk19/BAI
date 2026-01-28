import axios from 'axios';
import { API_BASE_URL } from '../config/api.config';

export interface UserProfile {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  account_id: string;
  phone?: string;
  mobile?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  company?: string;
  designation?: string;
  is_active: boolean;
  is_admin: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at?: string;
  last_login?: string;
  signature_name?: string;
  signature_style?: string;
}

export interface UserProfileUpdate {
  first_name?: string;
  last_name?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  company?: string;
  designation?: string;
  signature_name?: string;
  signature_style?: string;
}

export interface PasswordChange {
  current_password: string;
  new_password: string;
}

class UserService {
  private getAuthHeaders() {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get current user profile information
   */
  async getCurrentUser(): Promise<UserProfile> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/auth/me`, {
        headers: this.getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw new Error('Failed to fetch user profile');
    }
  }

  /**
   * Update current user profile information
   */
  async updateProfile(profileData: UserProfileUpdate): Promise<UserProfile> {
    try {
      const response = await axios.put(`${API_BASE_URL}/api/auth/me`, profileData, {
        headers: this.getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Error('Failed to update user profile');
    }
  }

  /**
   * Change user password
   */
  async changePassword(passwordData: PasswordChange): Promise<{ message: string }> {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/change-password`, passwordData, {
        headers: this.getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error changing password:', error);
      throw new Error('Failed to change password');
    }
  }

  /**
   * Upload user avatar (placeholder for future implementation)
   */
  async uploadAvatar(file: File): Promise<{ avatar_url: string }> {
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await axios.post(`${API_BASE_URL}/api/auth/upload-avatar`, formData, {
        headers: {
          'Authorization': this.getAuthHeaders().Authorization,
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw new Error('Failed to upload avatar');
    }
  }
}

export const userService = new UserService();
export default userService;

