/**
 * Vendor Credits API Service
 * Handles all vendor credit-related API calls
 */

import { apiService } from './api';

// Vendor Credit interface
export interface VendorCredit {
  id: number;
  vendor_id: number;
  credit_type: string;
  amount: number;
  reason: string;
  reference_number?: string;
  expiry_date?: string;
  status: string;
  notes?: string;
  created_by: number;
  created_at: string;
  updated_at?: string;
}

// Vendor Credit list response interface
export interface VendorCreditListResponse {
  vendor_credits: VendorCredit[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Vendor Credit summary interface
export interface VendorCreditSummary {
  total_credits: number;
  active_credits: number;
  inactive_credits: number;
  total_amount: number;
  used_amount: number;
  available_amount: number;
}

// Vendor Credit create/update interfaces
export interface VendorCreditCreate {
  vendor_id: number;
  credit_type: string;
  amount: number;
  reason: string;
  reference_number?: string;
  expiry_date?: string;
  status?: string;
  notes?: string;
}

export interface VendorCreditUpdate {
  vendor_id?: number;
  credit_type?: string;
  amount?: number;
  reason?: string;
  reference_number?: string;
  expiry_date?: string;
  status?: string;
  notes?: string;
}

/**
 * Get all vendor credits with pagination and filters
 */
export const getVendorCredits = async (
  params: {
    skip?: number;
    limit?: number;
    search?: string;
    status?: string;
    vendor_id?: number;
    credit_type?: string;
    start_date?: string;
    end_date?: string;
  } = {}
): Promise<VendorCreditListResponse> => {
  const searchParams = new URLSearchParams();
  
  if (params.skip !== undefined) searchParams.append('skip', params.skip.toString());
  if (params.limit !== undefined) searchParams.append('limit', params.limit.toString());
  if (params.search) searchParams.append('search', params.search);
  if (params.status) searchParams.append('status', params.status);
  if (params.vendor_id) searchParams.append('vendor_id', params.vendor_id.toString());
  if (params.credit_type) searchParams.append('credit_type', params.credit_type);
  if (params.start_date) searchParams.append('start_date', params.start_date);
  if (params.end_date) searchParams.append('end_date', params.end_date);

  return await apiService.get<VendorCreditListResponse>(`/api/purchases/vendor-credits/?${searchParams.toString()}`);
};

/**
 * Get a specific vendor credit by ID
 */
export const getVendorCredit = async (creditId: number): Promise<VendorCredit> => {
  return await apiService.get<VendorCredit>(`/api/purchases/vendor-credits/${creditId}`);
};

/**
 * Create a new vendor credit
 */
export const createVendorCredit = async (creditData: VendorCreditCreate): Promise<VendorCredit> => {
  return await apiService.post<VendorCredit, VendorCreditCreate>('/api/purchases/vendor-credits/', creditData);
};

/**
 * Update an existing vendor credit
 */
export const updateVendorCredit = async (creditId: number, creditData: VendorCreditUpdate): Promise<VendorCredit> => {
  return await apiService.put<VendorCredit, VendorCreditUpdate>(`/api/purchases/vendor-credits/${creditId}`, creditData);
};

/**
 * Delete a vendor credit
 */
export const deleteVendorCredit = async (creditId: number): Promise<void> => {
  try {
    await apiService.delete<void>(`/api/purchases/vendor-credits/${creditId}`);
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || 'Failed to delete vendor credit';
    throw new Error(errorMessage);
  }
};

/**
 * Get vendor credit summary statistics
 */
export const getVendorCreditSummary = async (): Promise<VendorCreditSummary> => {
  return await apiService.get<VendorCreditSummary>('/api/purchases/vendor-credits/summary/stats');
};

/**
 * Get vendor credits for a specific vendor
 */
export const getVendorCreditsByVendor = async (vendorId: number): Promise<VendorCredit[]> => {
  const response = await getVendorCredits({ vendor_id: vendorId, limit: 1000 });
  return response.vendor_credits;
};

/**
 * Get vendor credits by status
 */
export const getVendorCreditsByStatus = async (status: string): Promise<VendorCredit[]> => {
  const response = await getVendorCredits({ status, limit: 1000 });
  return response.vendor_credits;
};

/**
 * Get active vendor credits
 */
export const getActiveVendorCredits = async (): Promise<VendorCredit[]> => {
  return await getVendorCreditsByStatus('active');
};

/**
 * Get inactive vendor credits
 */
export const getInactiveVendorCredits = async (): Promise<VendorCredit[]> => {
  return await getVendorCreditsByStatus('inactive');
};

/**
 * Get vendor credits by type
 */
export const getVendorCreditsByType = async (creditType: string): Promise<VendorCredit[]> => {
  const response = await getVendorCredits({ credit_type: creditType, limit: 1000 });
  return response.vendor_credits;
};

/**
 * Get refund vendor credits
 */
export const getRefundVendorCredits = async (): Promise<VendorCredit[]> => {
  return await getVendorCreditsByType('refund');
};

/**
 * Get discount vendor credits
 */
export const getDiscountVendorCredits = async (): Promise<VendorCredit[]> => {
  return await getVendorCreditsByType('discount');
};

/**
 * Get expired vendor credits
 */
export const getExpiredVendorCredits = async (): Promise<VendorCredit[]> => {
  const today = new Date().toISOString().split('T')[0];
  const response = await getVendorCredits({ end_date: today, status: 'active', limit: 1000 });
  return response.vendor_credits.filter(credit => 
    credit.expiry_date && new Date(credit.expiry_date) < new Date()
  );
};

/**
 * Get vendor credits expiring soon
 */
export const getVendorCreditsExpiringSoon = async (days: number = 30): Promise<VendorCredit[]> => {
  const today = new Date();
  const expiryDate = new Date(today);
  expiryDate.setDate(today.getDate() + days);
  
  const response = await getVendorCredits({ 
    start_date: today.toISOString().split('T')[0],
    end_date: expiryDate.toISOString().split('T')[0],
    status: 'active',
    limit: 1000 
  });
  
  return response.vendor_credits.filter(credit => 
    credit.expiry_date && 
    new Date(credit.expiry_date) >= today &&
    new Date(credit.expiry_date) <= expiryDate
  );
}; 