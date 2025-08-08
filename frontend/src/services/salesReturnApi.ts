/**
 * Sales Return API Service
 * 
 * This module provides API functions for sales return operations.
 */

import { API_BASE_URL, API_ENDPOINTS, buildApiUrl, getAuthHeaders } from '../config/api.config';

// Types for Sales Return API
export interface SalesReturnItem {
  id?: number;
  invoice_item_id: number;
  item_id: number;
  item_name: string;
  item_sku: string;
  original_quantity: number;
  return_quantity: number;
  unit_price: number;
  return_amount: number;
  refund_amount: number;
  condition_on_return?: string;
  return_reason?: string;
  restockable?: boolean;
  notes?: string;
}

export interface SalesReturn {
  id: number;
  return_number: string;
  customer_name: string;
  invoice_number: string;
  return_date: string;
  total_return_amount: number;
  refund_amount: number;
  status: string;
  refund_status: string;
  return_reason: string;
  return_type?: string;
  refund_method?: string;
  items?: SalesReturnItem[];
}

export interface SalesReturnCreate {
  invoice_id: number;
  customer_id: number;
  return_date: string;
  return_reason: string;
  return_type?: string;
  status?: string;
  total_return_amount: number;
  refund_amount: number;
  restocking_fee?: number;
  refund_method?: string;
  refund_status?: string;
  refund_date?: string;
  refund_reference?: string;
  return_reason_details?: string;
  internal_notes?: string;
  customer_notes?: string;
  items_condition?: string;
  quality_check_notes?: string;
  items: SalesReturnItem[];
}

export interface SalesReturnListResponse {
  returns: SalesReturn[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// API Functions
export const salesReturnApi = {
  /**
   * Get all sales returns with optional filtering
   */
  async getSalesReturns(params?: {
    skip?: number;
    limit?: number;
    search?: string;
    status?: string;
    customer_id?: number;
  }): Promise<SalesReturnListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.customer_id) queryParams.append('customer_id', params.customer_id.toString());

    const response = await fetch(buildApiUrl(API_ENDPOINTS.sales.returns, Object.fromEntries(queryParams.entries())), {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  /**
   * Get a specific sales return by ID
   */
  async getSalesReturn(returnId: number): Promise<SalesReturn> {
    const response = await fetch(buildApiUrl(`${API_ENDPOINTS.sales.returns}/${returnId}`), {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  /**
   * Create a new sales return
   */
  async createSalesReturn(salesReturn: SalesReturnCreate): Promise<SalesReturn> {
    const response = await fetch(buildApiUrl(API_ENDPOINTS.sales.returns), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(salesReturn),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  /**
   * Update an existing sales return
   */
  async updateSalesReturn(returnId: number, salesReturn: Partial<SalesReturnCreate>): Promise<SalesReturn> {
    const response = await fetch(buildApiUrl(`${API_ENDPOINTS.sales.returns}/${returnId}`), {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(salesReturn),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  /**
   * Delete a sales return
   */
  async deleteSalesReturn(returnId: number): Promise<{ message: string }> {
    const response = await fetch(buildApiUrl(`${API_ENDPOINTS.sales.returns}/${returnId}`), {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail || `HTTP error! status: ${response.status}`;
      throw new Error(errorMessage);
    }
    return response.json();
  },

  /**
   * Get sales returns summary
   */
  async getSalesReturnsSummary(): Promise<SalesReturn[]> {
    const response = await fetch(buildApiUrl(`${API_ENDPOINTS.sales.returns}/summary/list`), {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  /**
   * Seed sample sales returns for testing
   */
  async seedSampleReturns(): Promise<{ message: string; created_returns: string[] }> {
    const response = await fetch(buildApiUrl(`${API_ENDPOINTS.sales.returns}/seed-sample-returns`), {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }
}; 