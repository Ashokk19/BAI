import apiService from './apiService';

export interface Vendor {
  id: number;
  account_id: string;
  vendor_code: string;
  vendor_name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  website?: string;
  gst_number?: string;
  pan_number?: string;
  billing_address?: string;
  shipping_address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  payment_terms?: string;
  credit_limit: number;
  opening_balance: number;
  current_balance: number;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface VendorCreate {
  vendor_code: string;
  vendor_name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  website?: string;
  gst_number?: string;
  pan_number?: string;
  billing_address?: string;
  shipping_address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  payment_terms?: string;
  credit_limit?: number;
  opening_balance?: number;
  is_active?: boolean;
  notes?: string;
}

export interface VendorUpdate {
  vendor_name?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  website?: string;
  gst_number?: string;
  pan_number?: string;
  billing_address?: string;
  shipping_address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  payment_terms?: string;
  credit_limit?: number;
  is_active?: boolean;
  notes?: string;
}

export const vendorsApi = {
  async getVendors(params?: {
    skip?: number;
    limit?: number;
    search?: string;
    is_active?: boolean;
  }) {
    const response = await apiService.get<{
      total: number;
      vendors: Vendor[];
      skip: number;
      limit: number;
    }>('/api/purchases/vendors/', params);
    return response;
  },

  async getVendor(id: number) {
    const response = await apiService.get<Vendor>(`/api/purchases/vendors/${id}`);
    return response;
  },

  async createVendor(vendor: VendorCreate) {
    const response = await apiService.post<{
      message: string;
      vendor: Vendor;
    }>('/api/purchases/vendors/', vendor);
    return response;
  },

  async updateVendor(id: number, vendor: VendorUpdate) {
    const response = await apiService.put<{
      message: string;
      vendor: Vendor;
    }>(`/api/purchases/vendors/${id}`, vendor);
    return response;
  },

  async deleteVendor(id: number) {
    const response = await apiService.delete<{ message: string }>(`/api/purchases/vendors/${id}`);
    return response;
  },

  async generateVendorCode() {
    const response = await apiService.get<{ vendor_code: string }>('/api/purchases/vendors/generate-code/next');
    return response;
  },
};
