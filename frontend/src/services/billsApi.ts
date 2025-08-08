/**
 * Bills API Service
 * Handles all bill-related API calls
 */

import { apiService } from './api';

// Bill interface
export interface Bill {
  id: number;
  bill_number: string;
  bill_date: string;
  due_date: string;
  vendor_id: number;
  purchase_order_id?: number;
  status: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  currency: string;
  payment_terms: string;
  notes?: string;
  reference_number?: string;
  created_by: number;
  created_at: string;
  updated_at?: string;
}

// Bill list response interface
export interface BillListResponse {
  bills: Bill[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Bill summary interface
export interface BillSummary {
  total_bills: number;
  pending_bills: number;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
}

// Bill create/update interfaces
export interface BillCreate {
  bill_number?: string;
  bill_date: string;
  due_date: string;
  vendor_id: number;
  purchase_order_id?: number;
  status?: string;
  subtotal?: number;
  tax_amount?: number;
  discount_amount?: number;
  total_amount?: number;
  paid_amount?: number;
  currency?: string;
  payment_terms?: string;
  notes?: string;
  reference_number?: string;
}

export interface BillUpdate {
  bill_number?: string;
  bill_date?: string;
  due_date?: string;
  vendor_id?: number;
  purchase_order_id?: number;
  status?: string;
  subtotal?: number;
  tax_amount?: number;
  discount_amount?: number;
  total_amount?: number;
  paid_amount?: number;
  currency?: string;
  payment_terms?: string;
  notes?: string;
  reference_number?: string;
}

/**
 * Get all bills with pagination and filters
 */
export const getBills = async (
  params: {
    skip?: number;
    limit?: number;
    search?: string;
    status?: string;
    vendor_id?: number;
    purchase_order_id?: number;
    start_date?: string;
    end_date?: string;
  } = {}
): Promise<BillListResponse> => {
  const searchParams = new URLSearchParams();
  
  if (params.skip !== undefined) searchParams.append('skip', params.skip.toString());
  if (params.limit !== undefined) searchParams.append('limit', params.limit.toString());
  if (params.search) searchParams.append('search', params.search);
  if (params.status) searchParams.append('status', params.status);
  if (params.vendor_id) searchParams.append('vendor_id', params.vendor_id.toString());
  if (params.purchase_order_id) searchParams.append('purchase_order_id', params.purchase_order_id.toString());
  if (params.start_date) searchParams.append('start_date', params.start_date);
  if (params.end_date) searchParams.append('end_date', params.end_date);

  return await apiService.get<BillListResponse>(`/api/purchases/bills/?${searchParams.toString()}`);
};

/**
 * Get a specific bill by ID
 */
export const getBill = async (billId: number): Promise<Bill> => {
  return await apiService.get<Bill>(`/api/purchases/bills/${billId}`);
};

/**
 * Create a new bill
 */
export const createBill = async (billData: BillCreate): Promise<Bill> => {
  return await apiService.post<Bill, BillCreate>('/api/purchases/bills/', billData);
};

/**
 * Update an existing bill
 */
export const updateBill = async (billId: number, billData: BillUpdate): Promise<Bill> => {
  return await apiService.put<Bill, BillUpdate>(`/api/purchases/bills/${billId}`, billData);
};

/**
 * Delete a bill
 */
export const deleteBill = async (billId: number): Promise<void> => {
  try {
    await apiService.delete<void>(`/api/purchases/bills/${billId}`);
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || 'Failed to delete bill';
    throw new Error(errorMessage);
  }
};

/**
 * Get bill summary statistics
 */
export const getBillSummary = async (): Promise<BillSummary> => {
  return await apiService.get<BillSummary>('/api/purchases/bills/summary/stats');
};

/**
 * Get bills for a specific vendor
 */
export const getBillsByVendor = async (vendorId: number): Promise<Bill[]> => {
  const response = await getBills({ vendor_id: vendorId, limit: 1000 });
  return response.bills;
};

/**
 * Get bills by status
 */
export const getBillsByStatus = async (status: string): Promise<Bill[]> => {
  const response = await getBills({ status, limit: 1000 });
  return response.bills;
};

/**
 * Get pending bills
 */
export const getPendingBills = async (): Promise<Bill[]> => {
  return await getBillsByStatus('pending');
};

/**
 * Get paid bills
 */
export const getPaidBills = async (): Promise<Bill[]> => {
  return await getBillsByStatus('paid');
};

/**
 * Get overdue bills
 */
export const getOverdueBills = async (): Promise<Bill[]> => {
  const today = new Date().toISOString().split('T')[0];
  const response = await getBills({ end_date: today, status: 'pending', limit: 1000 });
  return response.bills.filter(bill => new Date(bill.due_date) < new Date());
};

/**
 * Get bills due this week
 */
export const getBillsDueThisWeek = async (): Promise<Bill[]> => {
  const today = new Date();
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + 7);
  
  const response = await getBills({ 
    start_date: today.toISOString().split('T')[0],
    end_date: endOfWeek.toISOString().split('T')[0],
    status: 'pending',
    limit: 1000 
  });
  
  return response.bills;
}; 