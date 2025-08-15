/**
 * Vendor API Service
 * Handles all vendor-related API calls
 */

import { apiService } from './api';

export interface Vendor {
  id: number;
  vendor_code: string;
  company_name: string;
  contact_person?: string;
  email: string;
  phone?: string;
  mobile?: string;
  website?: string;
  billing_address?: string;
  shipping_address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  vendor_type: string;
  tax_number?: string;
  gst_number?: string;
  payment_terms: string;
  currency: string;
  bank_name?: string;
  bank_account_number?: string;
  routing_number?: string;
  swift_code?: string;
  is_active: boolean;
  is_verified: boolean;
  rating?: number;
  performance_score?: number;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface VendorListResponse {
  vendors: Vendor[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface VendorCreatePayload {
  vendor_code: string;
  company_name: string;
  contact_person?: string;
  email: string;
  phone?: string;
  mobile?: string;
  website?: string;
  billing_address?: string;
  shipping_address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  vendor_type?: string;
  tax_number?: string;
  gst_number?: string;
  payment_terms?: string;
  currency?: string;
  is_active?: boolean;
}

export type VendorUpdatePayload = Partial<Omit<VendorCreatePayload, 'vendor_code'>> & {
  vendor_code?: string;
};

export const getVendors = async (): Promise<VendorListResponse> => {
  // Corrected path to include '/api' prefix as mounted by the backend
  const response = await apiService.get<VendorListResponse>('/api/purchases/vendors');
  return response;
};

export const createVendor = async (vendorData: VendorCreatePayload): Promise<Vendor> => {
  // Corrected path to include '/api' prefix as mounted by the backend
  const response = await apiService.post<Vendor>('/api/purchases/vendors', vendorData);
  return response;
};

export const updateVendor = async (vendorId: number, vendorData: VendorUpdatePayload): Promise<Vendor> => {
  const response = await apiService.put<Vendor, VendorUpdatePayload>(`/api/purchases/vendors/${vendorId}`, vendorData);
  return response;
};

export const deleteVendor = async (vendorId: number): Promise<{ message: string }> => {
  const response = await apiService.delete<{ message: string }>(`/api/purchases/vendors/${vendorId}`);
  return response;
};