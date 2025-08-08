/**
 * Credit API Service
 * 
 * This module provides API functions for customer credit management operations.
 */

import { API_BASE_URL, API_ENDPOINTS, buildApiUrl, getAuthHeaders } from '../config/api.config';

// Types for Credit API
export interface CreditTransaction {
  id: number;
  credit_id: number;
  transaction_type: string;
  transaction_date: string;
  amount: number;
  running_balance: number;
  description?: string;
  reference_number?: string;
  invoice_id?: number;
  performed_by: number;
  created_at: string;
}

export interface CustomerCredit {
  id: number;
  credit_number: string;
  customer_name: string;
  credit_type: string;
  original_amount: number;
  remaining_amount: number;
  status: string;
  expiry_date?: string;
  credit_date: string;
  credit_reason: string;
  used_amount: number;
  is_expired: boolean;
  is_usable: boolean;
  description?: string;
  transactions?: CreditTransaction[];
}

export interface CustomerCreditCreate {
  customer_id: number;
  credit_date: string;
  credit_type: string;
  credit_reason: string;
  original_amount: number;
  remaining_amount: number;
  expiry_date?: string;
  auto_expire?: boolean;
  minimum_order_amount?: number;
  usage_limit_per_order?: number;
  description?: string;
  internal_notes?: string;
  customer_notes?: string;
  invoice_id?: number;
  sales_return_id?: number;
}

export interface CustomerCreditListResponse {
  credits: CustomerCredit[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface CreditTransactionCreate {
  transaction_type: string;
  transaction_date: string;
  amount: number;
  description?: string;
  reference_number?: string;
  invoice_id?: number;
}

// API Functions
export const creditApi = {
  /**
   * Get all customer credits with optional filtering
   */
  async getCustomerCredits(params?: {
    skip?: number;
    limit?: number;
    search?: string;
    status?: string;
    customer_id?: number;
    credit_type?: string;
  }): Promise<CustomerCreditListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.customer_id) queryParams.append('customer_id', params.customer_id.toString());
    if (params?.credit_type) queryParams.append('credit_type', params.credit_type);

    const response = await fetch(buildApiUrl(API_ENDPOINTS.sales.credits, Object.fromEntries(queryParams.entries())), {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  /**
   * Get a specific customer credit by ID
   */
  async getCustomerCredit(creditId: number): Promise<CustomerCredit> {
    const response = await fetch(buildApiUrl(`${API_ENDPOINTS.sales.credits}/${creditId}`), {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  /**
   * Create a new customer credit
   */
  async createCustomerCredit(credit: CustomerCreditCreate): Promise<CustomerCredit> {
    const response = await fetch(buildApiUrl(API_ENDPOINTS.sales.credits), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(credit),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  /**
   * Update an existing customer credit
   */
  async updateCustomerCredit(creditId: number, credit: Partial<CustomerCreditCreate>): Promise<CustomerCredit> {
    const response = await fetch(buildApiUrl(`${API_ENDPOINTS.sales.credits}/${creditId}`), {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(credit),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  /**
   * Delete a customer credit
   */
  async deleteCustomerCredit(creditId: number): Promise<{ message: string }> {
    const response = await fetch(buildApiUrl(`${API_ENDPOINTS.sales.credits}/${creditId}`), {
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
   * Create a credit transaction
   */
  async createCreditTransaction(creditId: number, transaction: CreditTransactionCreate): Promise<CreditTransaction> {
    const response = await fetch(buildApiUrl(`${API_ENDPOINTS.sales.credits}/${creditId}/transactions`), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(transaction),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  /**
   * Get customer credits summary
   */
  async getCustomerCreditsSummary(): Promise<CustomerCredit[]> {
    const response = await fetch(buildApiUrl(`${API_ENDPOINTS.sales.credits}/summary/list`), {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  /**
   * Seed sample customer credits for testing
   */
  async seedSampleCredits(): Promise<{ message: string; created_credits: string[] }> {
    const response = await fetch(buildApiUrl(`${API_ENDPOINTS.sales.credits}/seed-sample-credits`), {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }
}; 