/**
 * Shipment API Service
 * 
 * This module provides API functions for shipment and delivery note operations.
 */

import { apiService } from './api';

// Types for Shipment API
export interface Shipment {
  id: number;
  account_id: string;
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
  account_id?: string; // Optional as it will be set by backend
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
  tracking_number?: string;
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
  account_id: string;
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
  account_id?: string; // Optional as it will be set by backend
  shipment_id?: number; // Optional as it will be set by backend
  customer_id: number;
  invoice_id?: number;
  delivery_date: string;
  delivery_status?: string;
  packages_delivered?: number;
  delivery_time?: string;
  received_by?: string;
  recipient_signature?: string;
  delivery_address: string;
  condition_on_delivery?: string;
  photo_proof?: string;
  delivery_notes?: string;
  special_instructions?: string;
}

export interface DeliveryNoteUpdate {
  delivery_status?: string;
  packages_delivered?: number;
  delivery_time?: string;
  received_by?: string;
  recipient_signature?: string;
  delivery_address?: string;
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

// Shipment API Service
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
  }): Promise<ShipmentListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.customer_id) queryParams.append('customer_id', params.customer_id.toString());

    const queryString = queryParams.toString();
    const url = `/api/sales/shipments/${queryString ? `?${queryString}` : ''}`;
    
    return await apiService.get<ShipmentListResponse>(url);
  },

  /**
   * Get a single shipment by ID
   */
  async getShipment(shipmentId: number): Promise<Shipment> {
    return await apiService.get<Shipment>(`/api/sales/shipments/${shipmentId}`);
  },

  /**
   * Create a new shipment
   */
  async createShipment(shipment: ShipmentCreate): Promise<Shipment> {
    return await apiService.post<Shipment>('/api/sales/shipments/', shipment);
  },

  /**
   * Update an existing shipment
   */
  async updateShipment(shipmentId: number, shipment: Partial<ShipmentCreate>): Promise<Shipment> {
    return await apiService.put<Shipment>(`/api/sales/shipments/${shipmentId}`, shipment);
  },

  /**
   * Delete a shipment
   */
  async deleteShipment(shipmentId: number): Promise<{ message: string }> {
    return await apiService.delete<{ message: string }>(`/api/sales/shipments/${shipmentId}`);
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

    const queryString = queryParams.toString();
    const url = `/api/sales/shipments/delivery-notes${queryString ? `?${queryString}` : ''}`;
    
    return await apiService.get<DeliveryNoteListResponse>(url);
  },

  /**
   * Get delivery notes for a specific invoice
   */
  async getDeliveryNotesByInvoice(invoiceId: number): Promise<DeliveryNote[]> {
    return await apiService.get<DeliveryNote[]>(`/api/sales/shipments/delivery-notes/by-invoice/${invoiceId}`);
  },

  /**
   * Get shipments for a specific invoice
   */
  async getShipmentsByInvoice(invoiceId: number): Promise<Shipment[]> {
    return await apiService.get<Shipment[]>(`/api/sales/shipments/by-invoice/${invoiceId}`);
  },

  /**
   * Create a new delivery note
   */
  async createDeliveryNote(deliveryNote: DeliveryNoteCreate): Promise<DeliveryNote> {
    return await apiService.post<DeliveryNote>('/api/sales/shipments/delivery-notes/', deliveryNote);
  },

  /**
   * Update an existing delivery note
   */
  async updateDeliveryNote(deliveryNoteId: number, deliveryNote: Partial<DeliveryNoteCreate>): Promise<DeliveryNote> {
    return await apiService.put<DeliveryNote>(`/api/sales/shipments/delivery-notes/${deliveryNoteId}`, deliveryNote);
  },

  /**
   * Delete a delivery note
   */
  async deleteDeliveryNote(deliveryNoteId: number): Promise<{ message: string }> {
    return await apiService.delete<{ message: string }>(`/api/sales/shipments/delivery-notes/${deliveryNoteId}`);
  },

  /**
   * Get shipments summary
   */
  async getShipmentsSummary(): Promise<Shipment[]> {
    return await apiService.get<Shipment[]>('/api/sales/shipments/summary/list');
  },

  /**
   * Seed sample shipments
   */
  async seedSampleShipments(): Promise<{ message: string; created_shipments: string[] }> {
    return await apiService.post<{ message: string; created_shipments: string[] }>('/api/sales/shipments/seed-sample-shipments');
  },

  /**
   * Create delivery note records for existing invoices
   */
  async createDeliveryNotesForInvoices(): Promise<{ message: string }> {
    return await apiService.post<{ message: string }>('/api/sales/shipments/create-delivery-notes-for-invoices');
  },
}; 