import axios from 'axios';
import { API_BASE_URL } from '../config/api.config';

export interface OrganizationProfile {
  id: number;
  account_id: string;
  company_name: string;
  business_type?: string;
  industry?: string;
  founded_year?: string;
  employee_count?: string;
  registration_number?: string;
  tax_id?: string;
  gst_number?: string;
  pan_number?: string;
  phone?: string;
  email?: string;
  website?: string;
  currency: string;
  timezone: string;
  fiscal_year_start?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country: string;
  // Banking Information
  bank_name?: string;
  bank_account_number?: string;
  bank_account_holder_name?: string;
  bank_ifsc_code?: string;
  bank_branch_name?: string;
  bank_branch_address?: string;
  bank_account_type?: string;
  bank_swift_code?: string;
  description?: string;
  logo_url?: string;
  is_verified: boolean;
  created_at: string;
  updated_at?: string;
}

export interface OrganizationCreate {
  company_name: string;
  business_type?: string;
  industry?: string;
  founded_year?: string;
  employee_count?: string;
  registration_number?: string;
  tax_id?: string;
  gst_number?: string;
  pan_number?: string;
  phone?: string;
  email?: string;
  website?: string;
  currency?: string;
  timezone?: string;
  fiscal_year_start?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  // Banking Information
  bank_name?: string;
  bank_account_number?: string;
  bank_account_holder_name?: string;
  bank_ifsc_code?: string;
  bank_branch_name?: string;
  bank_branch_address?: string;
  bank_account_type?: string;
  bank_swift_code?: string;
  description?: string;
  logo_url?: string;
  is_verified?: boolean;
}

export interface OrganizationUpdate {
  company_name?: string;
  business_type?: string;
  industry?: string;
  founded_year?: string;
  employee_count?: string;
  registration_number?: string;
  tax_id?: string;
  gst_number?: string;
  pan_number?: string;
  phone?: string;
  email?: string;
  website?: string;
  currency?: string;
  timezone?: string;
  fiscal_year_start?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  // Banking Information
  bank_name?: string;
  bank_account_number?: string;
  bank_account_holder_name?: string;
  bank_ifsc_code?: string;
  bank_branch_name?: string;
  bank_branch_address?: string;
  bank_account_type?: string;
  bank_swift_code?: string;
  description?: string;
  logo_url?: string;
  is_verified?: boolean;
}

class OrganizationService {
  private getAuthHeaders() {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get organization profile for the current user's account
   */
  async getOrganizationProfile(): Promise<OrganizationProfile> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/organization/profile`, {
        headers: this.getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching organization profile:', error);
      throw new Error('Failed to fetch organization profile');
    }
  }

  /**
   * Create organization profile for the current user's account
   */
  async createOrganizationProfile(profileData: OrganizationCreate): Promise<OrganizationProfile> {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/organization/profile`, profileData, {
        headers: this.getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error creating organization profile:', error);
      throw new Error('Failed to create organization profile');
    }
  }

  /**
   * Update organization profile for the current user's account
   */
  async updateOrganizationProfile(profileData: OrganizationUpdate): Promise<OrganizationProfile> {
    try {
      const response = await axios.put(`${API_BASE_URL}/api/organization/profile`, profileData, {
        headers: this.getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error updating organization profile:', error);
      throw new Error('Failed to update organization profile');
    }
  }

  /**
   * Delete organization profile for the current user's account
   */
  async deleteOrganizationProfile(): Promise<{ message: string }> {
    try {
      const response = await axios.delete(`${API_BASE_URL}/api/organization/profile`, {
        headers: this.getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting organization profile:', error);
      throw new Error('Failed to delete organization profile');
    }
  }
}

export const organizationService = new OrganizationService();
export default organizationService;
