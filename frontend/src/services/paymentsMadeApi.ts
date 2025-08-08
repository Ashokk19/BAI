/**
 * Payments Made API Service
 * Handles all payments made to vendors API calls
 */

import { apiService } from './api';

// Payment Made interface
export interface PaymentMade {
  id: number;
  payment_number: string;
  payment_date: string;
  vendor_id: number;
  bill_id?: number;
  payment_method: string;
  payment_status: string;
  amount: number;
  currency: string;
  reference_number?: string;
  transaction_id?: string;
  notes?: string;
  created_by: number;
  created_at: string;
  updated_at?: string;
}

// Payment Made list response interface
export interface PaymentMadeListResponse {
  payments: PaymentMade[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Payment Made summary interface
export interface PaymentMadeSummary {
  total_payments: number;
  pending_payments: number;
  completed_payments: number;
  failed_payments: number;
  total_amount: number;
  payment_methods: Record<string, { count: number; total: number }>;
}

// Payment Made create/update interfaces
export interface PaymentMadeCreate {
  payment_number?: string;
  payment_date: string;
  vendor_id: number;
  bill_id?: number;
  payment_method: string;
  payment_status?: string;
  amount: number;
  currency?: string;
  reference_number?: string;
  transaction_id?: string;
  notes?: string;
}

export interface PaymentMadeUpdate {
  payment_number?: string;
  payment_date?: string;
  vendor_id?: number;
  bill_id?: number;
  payment_method?: string;
  payment_status?: string;
  amount?: number;
  currency?: string;
  reference_number?: string;
  transaction_id?: string;
  notes?: string;
}

/**
 * Get all payments made with pagination and filters
 */
export const getPaymentsMade = async (
  params: {
    skip?: number;
    limit?: number;
    search?: string;
    payment_status?: string;
    payment_method?: string;
    vendor_id?: number;
    bill_id?: number;
    start_date?: string;
    end_date?: string;
  } = {}
): Promise<PaymentMadeListResponse> => {
  const searchParams = new URLSearchParams();
  
  if (params.skip !== undefined) searchParams.append('skip', params.skip.toString());
  if (params.limit !== undefined) searchParams.append('limit', params.limit.toString());
  if (params.search) searchParams.append('search', params.search);
  if (params.payment_status) searchParams.append('payment_status', params.payment_status);
  if (params.payment_method) searchParams.append('payment_method', params.payment_method);
  if (params.vendor_id) searchParams.append('vendor_id', params.vendor_id.toString());
  if (params.bill_id) searchParams.append('bill_id', params.bill_id.toString());
  if (params.start_date) searchParams.append('start_date', params.start_date);
  if (params.end_date) searchParams.append('end_date', params.end_date);

  return await apiService.get<PaymentMadeListResponse>(`/api/purchases/payments-made/?${searchParams.toString()}`);
};

/**
 * Get a specific payment made by ID
 */
export const getPaymentMade = async (paymentId: number): Promise<PaymentMade> => {
  return await apiService.get<PaymentMade>(`/api/purchases/payments-made/${paymentId}`);
};

/**
 * Create a new payment made
 */
export const createPaymentMade = async (paymentData: PaymentMadeCreate): Promise<PaymentMade> => {
  return await apiService.post<PaymentMade, PaymentMadeCreate>('/api/purchases/payments-made/', paymentData);
};

/**
 * Update an existing payment made
 */
export const updatePaymentMade = async (paymentId: number, paymentData: PaymentMadeUpdate): Promise<PaymentMade> => {
  return await apiService.put<PaymentMade, PaymentMadeUpdate>(`/api/purchases/payments-made/${paymentId}`, paymentData);
};

/**
 * Delete a payment made
 */
export const deletePaymentMade = async (paymentId: number): Promise<void> => {
  try {
    await apiService.delete<void>(`/api/purchases/payments-made/${paymentId}`);
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || 'Failed to delete payment';
    throw new Error(errorMessage);
  }
};

/**
 * Get payments made summary statistics
 */
export const getPaymentsMadeSummary = async (): Promise<PaymentMadeSummary> => {
  return await apiService.get<PaymentMadeSummary>('/api/purchases/payments-made/summary/stats');
};

/**
 * Get payments made for a specific vendor
 */
export const getPaymentsMadeByVendor = async (vendorId: number): Promise<PaymentMade[]> => {
  const response = await getPaymentsMade({ vendor_id: vendorId, limit: 1000 });
  return response.payments;
};

/**
 * Get payments made by status
 */
export const getPaymentsMadeByStatus = async (status: string): Promise<PaymentMade[]> => {
  const response = await getPaymentsMade({ payment_status: status, limit: 1000 });
  return response.payments;
};

/**
 * Get pending payments made
 */
export const getPendingPaymentsMade = async (): Promise<PaymentMade[]> => {
  return await getPaymentsMadeByStatus('pending');
};

/**
 * Get completed payments made
 */
export const getCompletedPaymentsMade = async (): Promise<PaymentMade[]> => {
  return await getPaymentsMadeByStatus('completed');
};

/**
 * Get failed payments made
 */
export const getFailedPaymentsMade = async (): Promise<PaymentMade[]> => {
  return await getPaymentsMadeByStatus('failed');
};

/**
 * Get payments made by method
 */
export const getPaymentsMadeByMethod = async (method: string): Promise<PaymentMade[]> => {
  const response = await getPaymentsMade({ payment_method: method, limit: 1000 });
  return response.payments;
};

/**
 * Get payments made for a specific bill
 */
export const getPaymentsMadeByBill = async (billId: number): Promise<PaymentMade[]> => {
  const response = await getPaymentsMade({ bill_id: billId, limit: 1000 });
  return response.payments;
};

/**
 * Get recent payments made
 */
export const getRecentPaymentsMade = async (limit: number = 10): Promise<PaymentMade[]> => {
  const response = await getPaymentsMade({ limit });
  return response.payments;
};

/**
 * Get payments made this month
 */
export const getPaymentsMadeThisMonth = async (): Promise<PaymentMade[]> => {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const response = await getPaymentsMade({ 
    start_date: firstDayOfMonth.toISOString().split('T')[0],
    end_date: lastDayOfMonth.toISOString().split('T')[0],
    limit: 1000 
  });
  
  return response.payments;
};

/**
 * Get payments made this year
 */
export const getPaymentsMadeThisYear = async (): Promise<PaymentMade[]> => {
  const today = new Date();
  const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
  const lastDayOfYear = new Date(today.getFullYear(), 11, 31);
  
  const response = await getPaymentsMade({ 
    start_date: firstDayOfYear.toISOString().split('T')[0],
    end_date: lastDayOfYear.toISOString().split('T')[0],
    limit: 1000 
  });
  
  return response.payments;
}; 