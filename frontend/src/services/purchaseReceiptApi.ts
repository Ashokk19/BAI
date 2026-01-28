/**
 * Purchase Receipt (Purchase Received) API Service
 * Handles purchase receipt-related API calls
 */

import { apiService } from './api';

export interface PurchaseReceiptListItem {
  id: number;
  receipt_number: string;
  receipt_date: string;
  po_id?: number | null;
  po_number?: string | null;
  vendor_id: number;
  vendor_name?: string | null;
  po_status?: string | null;
  receipt_status?: string | null;
  received_by?: string | null;
  notes?: string | null;
  total_amount?: number | null;
  received_amount?: number | null;
  total_items?: number | null;
  received_items?: number | null;
}

export interface PurchaseReceiptListResponse {
  receipts: PurchaseReceiptListItem[];
  total: number;
  skip: number;
  limit: number;
}

export interface PurchaseReceiptItemCreatePayload {
  po_item_id?: number;
  item_id: number;
  item_name: string;
  quantity_received: number;
  quantity_accepted: number;
  quantity_rejected: number;
  unit_price?: number;
  notes?: string;
}

export interface PurchaseReceiptCreatePayload {
  po_id: number;
  vendor_id: number;
  receipt_date: string; // ISO date (YYYY-MM-DD)
  reference_number?: string;
  notes?: string;
  received_by?: string;
  items: PurchaseReceiptItemCreatePayload[];
}

export interface PurchaseReceiptDetail extends PurchaseReceiptListItem {
  reference_number?: string | null;
  items: Array<{
    id: number;
    po_item_id?: number | null;
    item_id: number;
    item_name: string;
    quantity_received: number;
    quantity_accepted: number;
    quantity_rejected: number;
    unit_price?: number | null;
    notes?: string | null;
  }>;
}

export const purchaseReceiptApi = {
  async getReceipts(params?: { skip?: number; limit?: number; search?: string; status?: string }): Promise<PurchaseReceiptListResponse> {
    const query = new URLSearchParams();
    if (params?.skip != null) query.set('skip', String(params.skip));
    if (params?.limit != null) query.set('limit', String(params.limit));
    if (params?.search) query.set('search', params.search);
    if (params?.status && params.status !== 'all') query.set('status', params.status);

    const url = `/api/purchases/receipts/${query.toString() ? `?${query.toString()}` : ''}`;
    return apiService.get<PurchaseReceiptListResponse>(url);
  },

  async getReceipt(receiptId: number): Promise<PurchaseReceiptDetail> {
    return apiService.get<PurchaseReceiptDetail>(`/api/purchases/receipts/${receiptId}`);
  },

  async createReceipt(payload: PurchaseReceiptCreatePayload): Promise<{ message: string; receipt_id: number; receipt_number: string }> {
    return apiService.post<{ message: string; receipt_id: number; receipt_number: string }, PurchaseReceiptCreatePayload>(
      '/api/purchases/receipts/',
      payload
    );
  },
};
