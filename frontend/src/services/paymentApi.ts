/**
 * Payment API Service
 * 
 * This module provides API functions for payment management operations.
 */

import { API_BASE_URL, API_ENDPOINTS, buildApiUrl, getAuthHeaders } from '../config/api.config';

// Types for Payment API
export interface Payment {
  id: number;
  payment_number: string;
  customer_name?: string;
  vendor_name?: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  payment_status: string;
  reference_number?: string;
  transaction_id?: string;
  notes?: string;
  invoice_id?: number;
  customer_id?: number;
  vendor_id?: number;
}

export interface PaymentCreate {
  payment_date: string;
  payment_type: string;
  payment_direction: string;
  amount: number;
  currency?: string;
  payment_method: string;
  payment_status?: string;
  reference_number?: string;
  bank_account?: string;
  check_number?: string;
  transaction_id?: string;
  notes?: string;
  invoice_id?: number;
  customer_id?: number;
  vendor_id?: number;
}

export interface PaymentListResponse {
  payments: Payment[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// API Functions
export const paymentApi = {
  /**
   * Get all payments with optional filtering
   */
  async getPayments(params?: {
    skip?: number;
    limit?: number;
    search?: string;
    status?: string;
    payment_method?: string;
    payment_type?: string;
    customer_id?: number;
  }): Promise<PaymentListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.payment_method) queryParams.append('payment_method', params.payment_method);
    if (params?.payment_type) queryParams.append('payment_type', params.payment_type);
    if (params?.customer_id) queryParams.append('customer_id', params.customer_id.toString());

    const response = await fetch(buildApiUrl(API_ENDPOINTS.sales.payments, Object.fromEntries(queryParams.entries())), {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  /**
   * Get a specific payment by ID
   */
  async getPayment(paymentId: number): Promise<Payment> {
    const response = await fetch(buildApiUrl(`${API_ENDPOINTS.sales.payments}/${paymentId}`), {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  /**
   * Create a new payment
   */
  async createPayment(payment: PaymentCreate): Promise<Payment> {
    const response = await fetch(buildApiUrl(API_ENDPOINTS.sales.payments), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payment),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  /**
   * Update an existing payment
   */
  async updatePayment(paymentId: number, payment: Partial<PaymentCreate>): Promise<Payment> {
    const response = await fetch(buildApiUrl(`${API_ENDPOINTS.sales.payments}/${paymentId}`), {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payment),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  /**
   * Delete a payment
   */
  async deletePayment(paymentId: number): Promise<{ message: string }> {
    const response = await fetch(buildApiUrl(`${API_ENDPOINTS.sales.payments}/${paymentId}`), {
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
   * Get payments summary
   */
  async getPaymentsSummary(): Promise<Payment[]> {
    const response = await fetch(buildApiUrl(`${API_ENDPOINTS.sales.payments}/summary/list`), {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  /**
   * Seed sample payments for testing
   */
  async seedSamplePayments(): Promise<{ message: string; created_payments: string[] }> {
    const response = await fetch(buildApiUrl(`${API_ENDPOINTS.sales.payments}/seed-sample-payments`), {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }
}; 