/**
 * Vendor Payments (Payments Made) API Service
 * PostgreSQL-backed purchases payments endpoints.
 */

import { apiService } from './api';

export type VendorPaymentMode = 'cash' | 'cheque' | 'bank_transfer' | 'card' | 'upi' | 'other';

export interface VendorPaymentAllocation {
  bill_id: number;
  amount_allocated: number;
}

export interface VendorPayment {
  id: number;
  payment_number: string;
  vendor_id: number;
  vendor_name?: string;
  vendor_code?: string;
  payment_date: string;
  payment_mode: string;
  reference_number?: string;
  amount: number;
  bank_charges?: number;
  tds_amount?: number;
  notes?: string;
  created_at: string;
  updated_at?: string;
  first_bill_id?: number;
  first_bill_number?: string;
  allocated_amount?: number;
  credit_used_amount?: number;
}

export interface VendorPaymentsListResponse {
  payments: VendorPayment[];
  total: number;
  skip: number;
  limit: number;
}

export interface VendorPaymentCreate {
  vendor_id: number;
  payment_date: string;
  payment_mode: VendorPaymentMode;
  reference_number?: string;
  amount: number;
  bank_charges?: number;
  tds_amount?: number;
  notes?: string;
  allocations: VendorPaymentAllocation[];
  apply_vendor_credit_amount?: number;
}

export interface VendorPaymentCreateResponse {
  message: string;
  payment_id: number;
  payment_number: string;
  credit_applied_amount?: number;
}

/**
 * Get all payments made with pagination and filters
 */
export const getVendorPayments = async (
  params: {
    skip?: number;
    limit?: number;
    vendor_id?: number;
  } = {}
): Promise<VendorPaymentsListResponse> => {
  const searchParams = new URLSearchParams();
  if (params.skip !== undefined) searchParams.append('skip', params.skip.toString());
  if (params.limit !== undefined) searchParams.append('limit', params.limit.toString());
  if (params.vendor_id !== undefined) searchParams.append('vendor_id', params.vendor_id.toString());
  const qs = searchParams.toString();
  return await apiService.get<VendorPaymentsListResponse>(`/api/purchases/payments/${qs ? `?${qs}` : ''}`);
};

/**
 * Get a specific payment made by ID
 */
export const getVendorPayment = async (paymentId: number): Promise<VendorPayment & { allocations?: any[] }> => {
  return await apiService.get<VendorPayment & { allocations?: any[] }>(`/api/purchases/payments/${paymentId}`);
};

/**
 * Create a new payment made
 */
export const createVendorPayment = async (paymentData: VendorPaymentCreate): Promise<VendorPaymentCreateResponse> => {
  return await apiService.post<VendorPaymentCreateResponse, VendorPaymentCreate>('/api/purchases/payments/', paymentData);
};

/**
 * Update an existing payment made
 */
// Update endpoint is not implemented on the backend router currently.

/**
 * Delete a payment made
 */
export const deleteVendorPayment = async (paymentId: number): Promise<void> => {
  try {
    await apiService.delete<void>(`/api/purchases/payments/${paymentId}`);
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || 'Failed to delete payment';
    throw new Error(errorMessage);
  }
};
