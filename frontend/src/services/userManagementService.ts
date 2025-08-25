import axios from 'axios';
import { API_BASE_URL } from '../config/api.config';

export interface UserProfile {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  account_id: string;
  mobile?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  company?: string;
  designation?: string;
  is_active: boolean;
  is_admin: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface AdminUserCreate {
  email: string;
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  mobile?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  company?: string;
  designation?: string;
  is_admin?: boolean;
}

export interface UserStatusUpdate {
  is_active: boolean;
}

class UserManagementService {
  private getAuthHeaders() {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  async getOrganizationUsers(): Promise<UserProfile[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/user-management/users`, {
        headers: this.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching organization users:', error);
      throw error;
    }
  }

  async getOrganizationUser(userId: number): Promise<UserProfile> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/user-management/users/${userId}`, {
        headers: this.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching organization user:', error);
      throw error;
    }
  }

  // Admin-only functions
  async createUser(userData: AdminUserCreate): Promise<UserProfile> {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/user-management/admin/users`, userData, {
        headers: this.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUserStatus(userId: number, statusUpdate: UserStatusUpdate): Promise<UserProfile> {
    try {
      const response = await axios.patch(`${API_BASE_URL}/api/user-management/admin/users/${userId}/status`, statusUpdate, {
        headers: this.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  }

  async deleteUser(userId: number): Promise<{ message: string; deleted_user_id: number }> {
    try {
      const response = await axios.delete(`${API_BASE_URL}/api/user-management/admin/users/${userId}`, {
        headers: this.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
}

export const userManagementService = new UserManagementService();
