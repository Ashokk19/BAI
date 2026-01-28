/**
 * Bills API Service
 * Handles all bill-related API calls
 */

import { apiService } from './api';

export interface BillListItem {
  id: number;
  bill_number: string;
  bill_date: string;
  due_date: string;
  vendor_id: number;
  vendor_name?: string;
  vendor_code?: string;
  po_id?: number | null;
  vendor_invoice_number?: string | null;
  status: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  payment_terms?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface BillItem {
  id: number;
  item_id?: number | null;
  item_name: string;
  description?: string | null;
  quantity: number;
  unit_price: number;
  tax_rate?: number | null;
  tax_amount?: number | null;
  discount_amount?: number | null;
  line_total?: number | null;
}

export interface BillDetail extends BillListItem {
  items: BillItem[];
}

export interface BillListResponse {
  bills: BillListItem[];
  total: number;
  skip: number;
  limit: number;
}

export interface BillItemCreatePayload {
  item_id?: number;
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  tax_rate?: number;
  discount_amount?: number;
}

export interface BillCreatePayload {
  vendor_id: number;
  vendor_invoice_number?: string;
  po_id?: number;
  bill_date: string;
  due_date: string;
  payment_terms?: string;
  notes?: string;
  items: BillItemCreatePayload[];
}

export interface BillCreateResponse {
  message: string;
  bill_number: string;
  bill_id: number;
}

export interface BillUpdateResponse {
  message: string;
  bill_id: number;
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
    po_id?: number;
    purchase_order_id?: number;
  } = {}
): Promise<BillListResponse> => {
  const searchParams = new URLSearchParams();
  
  if (params.skip !== undefined) searchParams.append('skip', params.skip.toString());
  if (params.limit !== undefined) searchParams.append('limit', params.limit.toString());
  if (params.search) searchParams.append('search', params.search);
  if (params.status) searchParams.append('status', params.status);
  if (params.vendor_id) searchParams.append('vendor_id', params.vendor_id.toString());
  if (params.po_id) searchParams.append('po_id', params.po_id.toString());
  if (params.purchase_order_id) searchParams.append('purchase_order_id', params.purchase_order_id.toString());

  return await apiService.get<BillListResponse>(`/api/purchases/bills/?${searchParams.toString()}`);
};

/**
 * Get a specific bill by ID
 */
export const getBill = async (billId: number): Promise<BillDetail> => {
  return await apiService.get<BillDetail>(`/api/purchases/bills/${billId}`);
};

/**
 * Create a new bill
 */
export const createBill = async (billData: BillCreate): Promise<BillCreateResponse> => {
  return await apiService.post<BillCreateResponse, BillCreatePayload>('/api/purchases/bills/', billData as any);
};

export const updateBill = async (billId: number, billData: BillCreate): Promise<BillUpdateResponse> => {
  return await apiService.put<BillUpdateResponse, BillCreatePayload>(`/api/purchases/bills/${billId}`, billData as any);
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

export type Bill = BillDetail;
export type BillCreate = BillCreatePayload;

export const billExistsForPurchaseOrder = async (poId: number): Promise<boolean> => {
  const res = await getBills({ po_id: poId, limit: 1 });
  return (res.total || 0) > 0;
};