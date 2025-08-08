/**
 * Shipment API Service
 * 
 * This module provides API functions for shipment and delivery note operations.
 */

import { API_BASE_URL, API_ENDPOINTS, buildApiUrl, getAuthHeaders } from '../config/api.config';

// Types for Shipment API
export interface Shipment {
  id: number;
  shipment_number: string;
  customer_name: string;
  tracking_number?: string;
  status: string;
  ship_date?: string;
  expected_delivery_date?: string;
  carrier?: string;
  customer_id: number;
  invoice_id?: number;
  priority?: string;
  actual_delivery_date?: string;
  shipping_method?: string;
  service_type?: string;
  shipping_address: string;
  billing_address?: string;
  package_count?: number;
  total_weight?: number;
  dimensions?: string;
  shipping_cost?: number;
  insurance_cost?: number;
  special_instructions?: string;
  notes?: string;
  created_by: number;
  created_at: string;
  updated_at?: string;
}

export interface ShipmentCreate {
  customer_id: number;
  invoice_id?: number;
  status?: string;
  priority?: string;
  ship_date?: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  shipping_method?: string;
  carrier?: string;
  service_type?: string;
  shipping_address: string;
  billing_address?: string;
  package_count?: number;
  total_weight?: number;
  dimensions?: string;
  shipping_cost?: number;
  insurance_cost?: number;
  special_instructions?: string;
  notes?: string;
}

export interface ShipmentListResponse {
  shipments: Shipment[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface DeliveryNote {
  id: number;
  delivery_note_number: string;
  customer_name: string;
  delivery_date: string;
  delivery_status: string;
  packages_delivered: number;
  shipment_id: number;
  customer_id: number;
  invoice_id?: number;
  delivery_time?: string;
  received_by?: string;
  recipient_signature?: string;
  delivery_address: string;
  condition_on_delivery?: string;
  photo_proof?: string;
  delivery_notes?: string;
  special_instructions?: string;
  recorded_by: number;
  created_at: string;
  updated_at?: string;
}

export interface DeliveryNoteCreate {
  shipment_id: number;
  customer_id: number;
  invoice_id?: number;
  delivery_date: string;
  delivery_time?: string;
  delivery_status?: string;
  received_by?: string;
  recipient_signature?: string;
  delivery_address: string;
  packages_delivered?: number;
  condition_on_delivery?: string;
  photo_proof?: string;
  delivery_notes?: string;
  special_instructions?: string;
}

export interface DeliveryNoteListResponse {
  delivery_notes: DeliveryNote[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// API Functions
export const shipmentApi = {
  /**
   * Get all shipments with optional filtering
   */
  async getShipments(params?: {
    skip?: number;
    limit?: number;
    search?: string;
    status?: string;
    customer_id?: number;
    carrier?: string;
  }): Promise<ShipmentListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.customer_id) queryParams.append('customer_id', params.customer_id.toString());
    if (params?.carrier) queryParams.append('carrier', params.carrier);

    const response = await fetch(buildApiUrl(API_ENDPOINTS.sales.shipments, Object.fromEntries(queryParams.entries())), {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  /**
   * Get a specific shipment by ID
   */
  async getShipment(shipmentId: number): Promise<Shipment> {
    const response = await fetch(buildApiUrl(`${API_ENDPOINTS.sales.shipments}/${shipmentId}`), {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  /**
   * Create a new shipment
   */
  async createShipment(shipment: ShipmentCreate): Promise<Shipment> {
    const response = await fetch(buildApiUrl(API_ENDPOINTS.sales.shipments), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(shipment),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  /**
   * Update an existing shipment
   */
  async updateShipment(shipmentId: number, shipment: Partial<ShipmentCreate>): Promise<Shipment> {
    const response = await fetch(buildApiUrl(`${API_ENDPOINTS.sales.shipments}/${shipmentId}`), {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(shipment),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  /**
   * Delete a shipment
   */
  async deleteShipment(shipmentId: number): Promise<{ message: string }> {
    const response = await fetch(buildApiUrl(`${API_ENDPOINTS.sales.shipments}/${shipmentId}`), {
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

  // Delivery Note Functions
  /**
   * Get all delivery notes with optional filtering
   */
  async getDeliveryNotes(params?: {
    skip?: number;
    limit?: number;
    search?: string;
    customer_id?: number;
  }): Promise<DeliveryNoteListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.customer_id) queryParams.append('customer_id', params.customer_id.toString());

    const response = await fetch(buildApiUrl(API_ENDPOINTS.sales.deliveryNotes, Object.fromEntries(queryParams.entries())), {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  /**
   * Create a new delivery note
   */
  async createDeliveryNote(deliveryNote: DeliveryNoteCreate): Promise<DeliveryNote> {
    const response = await fetch(buildApiUrl(API_ENDPOINTS.sales.deliveryNotes), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(deliveryNote),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  /**
   * Get shipments summary
   */
  async getShipmentsSummary(): Promise<Shipment[]> {
    const response = await fetch(buildApiUrl(`${API_ENDPOINTS.sales.shipments}/summary/list`), {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  /**
   * Seed sample shipments
   */
  async seedSampleShipments(): Promise<{ message: string; created_shipments: string[] }> {
    const response = await fetch(buildApiUrl(`${API_ENDPOINTS.sales.shipments}/seed-sample-shipments`), {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },
}; 