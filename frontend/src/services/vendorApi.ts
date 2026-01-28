/**
 * Vendor API Service
 * Handles all vendor-related API calls
 */

import { apiService } from './api';

export interface Vendor {
  id: number;
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
  current_balance?: number;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface VendorListResponse {
  vendors: Vendor[];
  total: number;
  skip: number;
  limit: number;
}

export interface VendorCreatePayload {
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

export const getVendors = async (): Promise<VendorListResponse> => {
  const response = await apiService.get<VendorListResponse>('/api/purchases/vendors/');
  return response;
};

export const getVendor = async (vendorId: number): Promise<Vendor> => {
  const response = await apiService.get<Vendor>(`/api/purchases/vendors/${vendorId}`);
  return response;
};

export const createVendor = async (vendorData: VendorCreatePayload): Promise<Vendor> => {
  const response = await apiService.post<{ message: string; vendor: Vendor }, VendorCreatePayload>('/api/purchases/vendors/', vendorData);
  return response.vendor;
}; 

export const updateVendor = async (vendorId: number, vendorData: Partial<VendorCreatePayload>): Promise<Vendor> => {
  const response = await apiService.put<Vendor, Partial<VendorCreatePayload>>(`/api/purchases/vendors/${vendorId}`, vendorData);
  return response;
};

export const deleteVendor = async (vendorId: number): Promise<void> => {
  try {
    await apiService.delete(`/api/purchases/vendors/${vendorId}`);
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || 'Failed to delete vendor';
    throw new Error(errorMessage);
  }
};