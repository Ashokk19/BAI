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
}

export const getVendors = async (): Promise<VendorListResponse> => {
  const response = await apiService.get<VendorListResponse>('/purchases/vendors');
  return response;
};

export const createVendor = async (vendorData: VendorCreatePayload): Promise<Vendor> => {
  const response = await apiService.post<Vendor>('/purchases/vendors', vendorData);
  return response;
}; 