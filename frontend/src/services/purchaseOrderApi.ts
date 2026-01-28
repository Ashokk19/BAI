/**
 * Purchase Order API Service
 * Handles all purchase order-related API calls
 */

import { apiService } from './api';

export interface PurchaseOrderItem {
  item_id: number;
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  tax_rate?: number;
  discount_percentage?: number;
}

export interface PurchaseOrder {
  id: number;
  po_number: string;
  po_date: string;
  expected_delivery_date?: string;
  vendor_id: number;
  vendor_name?: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  notes?: string;
  terms_and_conditions?: string;
}

export interface PurchaseOrderDetailItem {
  id: number;
  item_id: number;
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  tax_rate?: number;
  tax_amount?: number;
  discount_percentage?: number;
  discount_amount?: number;
  line_total?: number;
}

export interface PurchaseOrderDetail extends PurchaseOrder {
  vendor_code?: string;
  reference_number?: string;
  items: PurchaseOrderDetailItem[];
}

export interface PurchaseOrderListResponse {
  purchase_orders: PurchaseOrder[];
  total: number;
  skip: number;
  limit: number;
}

export interface PurchaseOrderItemCreatePayload {
  item_id: number;
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  tax_rate?: number;
  discount_percentage?: number;
}

export interface PurchaseOrderCreatePayload {
  vendor_id: number;
  po_date: string; // ISO date string
  expected_delivery_date?: string; // ISO date string
  reference_number?: string;
  status?: string;
  notes?: string;
  terms_and_conditions?: string;
  items: PurchaseOrderItemCreatePayload[];
}

export const getPurchaseOrders = async (): Promise<PurchaseOrderListResponse> => {
  const response = await apiService.get<PurchaseOrderListResponse>('/api/purchases/orders/');
  return response;
};

export const createPurchaseOrder = async (orderData: PurchaseOrderCreatePayload): Promise<{ po_id: number; po_number: string; message: string }> => {
  const response = await apiService.post<{ po_id: number; po_number: string; message: string }, PurchaseOrderCreatePayload>('/api/purchases/orders/', orderData);
  return response;
};

export const getPurchaseOrder = async (orderId: number): Promise<PurchaseOrderDetail> => {
  const response = await apiService.get<PurchaseOrderDetail>(`/api/purchases/orders/${orderId}`);
  return response;
};

export const updatePurchaseOrder = async (orderId: number, orderData: PurchaseOrderCreatePayload): Promise<{ message: string; po_id: number; po_number: string }> => {
  const response = await apiService.put<{ message: string; po_id: number; po_number: string }, PurchaseOrderCreatePayload>(`/api/purchases/orders/${orderId}`, orderData);
  return response;
};

export const deletePurchaseOrder = async (orderId: number): Promise<void> => {
  try {
    await apiService.delete(`/api/purchases/orders/${orderId}`);
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || 'Failed to delete purchase order';
    throw new Error(errorMessage);
  }
}; 