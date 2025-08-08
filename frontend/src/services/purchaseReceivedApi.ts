/**
 * Purchase Received API Service
 * Handles all purchase received-related API calls
 */

import { apiService } from './api';

// Purchase Received interface
export interface PurchaseReceived {
  id: number;
  receipt_number: string;
  receipt_date: string;
  purchase_order_id: number;
  purchase_order_item_id: number;
  item_id: number;
  quantity_received: number;
  quantity_accepted: number;
  quantity_rejected: number;
  quality_status: string;
  quality_notes?: string;
  storage_location?: string;
  batch_number?: string;
  expiry_date?: string;
  received_by: number;
  created_at: string;
  updated_at?: string;
}

// Purchase Received list response interface
export interface PurchaseReceivedListResponse {
  purchase_received: PurchaseReceived[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Purchase Received summary interface
export interface PurchaseReceivedSummary {
  total_receipts: number;
  pending_receipts: number;
  passed_receipts: number;
  failed_receipts: number;
  total_received: number;
  total_accepted: number;
  total_rejected: number;
  acceptance_rate: number;
}

// Purchase Received create/update interfaces
export interface PurchaseReceivedCreate {
  receipt_number?: string;
  receipt_date: string;
  purchase_order_id: number;
  purchase_order_item_id: number;
  item_id: number;
  quantity_received: number;
  quantity_accepted: number;
  quantity_rejected: number;
  quality_status?: string;
  quality_notes?: string;
  storage_location?: string;
  batch_number?: string;
  expiry_date?: string;
}

export interface PurchaseReceivedUpdate {
  receipt_number?: string;
  receipt_date?: string;
  purchase_order_id?: number;
  purchase_order_item_id?: number;
  item_id?: number;
  quantity_received?: number;
  quantity_accepted?: number;
  quantity_rejected?: number;
  quality_status?: string;
  quality_notes?: string;
  storage_location?: string;
  batch_number?: string;
  expiry_date?: string;
}

/**
 * Get all purchase received records with pagination and filters
 */
export const getPurchaseReceived = async (
  params: {
    skip?: number;
    limit?: number;
    search?: string;
    quality_status?: string;
    purchase_order_id?: number;
    item_id?: number;
    start_date?: string;
    end_date?: string;
  } = {}
): Promise<PurchaseReceivedListResponse> => {
  const searchParams = new URLSearchParams();
  
  if (params.skip !== undefined) searchParams.append('skip', params.skip.toString());
  if (params.limit !== undefined) searchParams.append('limit', params.limit.toString());
  if (params.search) searchParams.append('search', params.search);
  if (params.quality_status) searchParams.append('quality_status', params.quality_status);
  if (params.purchase_order_id) searchParams.append('purchase_order_id', params.purchase_order_id.toString());
  if (params.item_id) searchParams.append('item_id', params.item_id.toString());
  if (params.start_date) searchParams.append('start_date', params.start_date);
  if (params.end_date) searchParams.append('end_date', params.end_date);

  return await apiService.get<PurchaseReceivedListResponse>(`/api/purchases/purchase-received/?${searchParams.toString()}`);
};

/**
 * Get a specific purchase received record by ID
 */
export const getPurchaseReceivedById = async (receiptId: number): Promise<PurchaseReceived> => {
  return await apiService.get<PurchaseReceived>(`/api/purchases/purchase-received/${receiptId}`);
};

/**
 * Create a new purchase received record
 */
export const createPurchaseReceived = async (receiptData: PurchaseReceivedCreate): Promise<PurchaseReceived> => {
  return await apiService.post<PurchaseReceived, PurchaseReceivedCreate>('/api/purchases/purchase-received/', receiptData);
};

/**
 * Update an existing purchase received record
 */
export const updatePurchaseReceived = async (receiptId: number, receiptData: PurchaseReceivedUpdate): Promise<PurchaseReceived> => {
  return await apiService.put<PurchaseReceived, PurchaseReceivedUpdate>(`/api/purchases/purchase-received/${receiptId}`, receiptData);
};

/**
 * Delete a purchase received record
 */
export const deletePurchaseReceived = async (receiptId: number): Promise<void> => {
  try {
    await apiService.delete<void>(`/api/purchases/purchase-received/${receiptId}`);
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || 'Failed to delete purchase received record';
    throw new Error(errorMessage);
  }
};

/**
 * Get purchase received summary statistics
 */
export const getPurchaseReceivedSummary = async (): Promise<PurchaseReceivedSummary> => {
  return await apiService.get<PurchaseReceivedSummary>('/api/purchases/purchase-received/summary/stats');
};

/**
 * Get purchase received records for a specific purchase order
 */
export const getPurchaseReceivedByOrder = async (purchaseOrderId: number): Promise<PurchaseReceived[]> => {
  const response = await getPurchaseReceived({ purchase_order_id: purchaseOrderId, limit: 1000 });
  return response.purchase_received;
};

/**
 * Get purchase received records by quality status
 */
export const getPurchaseReceivedByQualityStatus = async (qualityStatus: string): Promise<PurchaseReceived[]> => {
  const response = await getPurchaseReceived({ quality_status: qualityStatus, limit: 1000 });
  return response.purchase_received;
};

/**
 * Get pending quality control receipts
 */
export const getPendingQualityReceipts = async (): Promise<PurchaseReceived[]> => {
  return await getPurchaseReceivedByQualityStatus('pending');
};

/**
 * Get passed quality control receipts
 */
export const getPassedQualityReceipts = async (): Promise<PurchaseReceived[]> => {
  return await getPurchaseReceivedByQualityStatus('passed');
};

/**
 * Get failed quality control receipts
 */
export const getFailedQualityReceipts = async (): Promise<PurchaseReceived[]> => {
  return await getPurchaseReceivedByQualityStatus('failed');
};

/**
 * Get purchase received records for a specific item
 */
export const getPurchaseReceivedByItem = async (itemId: number): Promise<PurchaseReceived[]> => {
  const response = await getPurchaseReceived({ item_id: itemId, limit: 1000 });
  return response.purchase_received;
};

/**
 * Get recent purchase received records
 */
export const getRecentPurchaseReceived = async (limit: number = 10): Promise<PurchaseReceived[]> => {
  const response = await getPurchaseReceived({ limit });
  return response.purchase_received;
}; 