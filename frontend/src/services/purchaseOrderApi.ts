/**
 * Purchase Order API Service
 * Handles all purchase order-related API calls
 */

import { apiService } from './api';

export interface PurchaseOrderItem {
  id: number;
  purchase_order_id: number;
  item_id: number;
  item_name: string;
  item_description?: string;
  item_sku: string;
  quantity_ordered: number;
  unit_price: number;
  discount_rate: number;
  tax_rate: number;
  discount_amount: number;
  tax_amount: number;
  line_total: number;
  created_at: string;
  updated_at?: string;
}

export interface PurchaseOrder {
  id: number;
  po_number: string;
  po_date: string;
  expected_delivery_date?: string;
  vendor_id: number;
  status: string;
  priority: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_terms: string;
  currency: string;
  shipping_address?: string;
  shipping_method?: string;
  shipping_cost: number;
  notes?: string;
  terms_conditions?: string;
  created_by: number;
  items: PurchaseOrderItem[];
  created_at: string;
  updated_at?: string;
}

export interface PurchaseOrderListResponse {
  purchase_orders: PurchaseOrder[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface PurchaseOrderItemCreatePayload {
  item_id: number;
  item_name: string;
  item_sku: string;
  quantity_ordered: number;
  unit_price: number;
  discount_rate?: number;
  tax_rate?: number;
}

export interface PurchaseOrderCreatePayload {
  po_number: string;
  po_date: string;
  expected_delivery_date?: string;
  vendor_id: number;
  status?: string;
  priority?: string;
  payment_terms?: string;
  currency?: string;
  shipping_address?: string;
  shipping_method?: string;
  shipping_cost?: number;
  notes?: string;
  terms_conditions?: string;
  items: PurchaseOrderItemCreatePayload[];
}

export const getPurchaseOrders = async (): Promise<PurchaseOrderListResponse> => {
  const response = await apiService.get<PurchaseOrderListResponse>('/purchases/purchase-orders');
  return response;
};

export const createPurchaseOrder = async (orderData: PurchaseOrderCreatePayload): Promise<PurchaseOrder> => {
  const response = await apiService.post<PurchaseOrder>('/purchases/purchase-orders', orderData);
  return response;
};

export const deletePurchaseOrder = async (orderId: number): Promise<void> => {
  try {
    await apiService.delete(`/purchases/purchase-orders/${orderId}`);
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || 'Failed to delete purchase order';
    throw new Error(errorMessage);
  }
}; 