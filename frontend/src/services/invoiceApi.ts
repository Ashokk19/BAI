import { API_ENDPOINTS } from '../config/api.config';
import { apiService } from './api';

// Types for Invoice API
export interface Invoice {
  id: number;
  account_id: string;
  invoice_number: string;
  customer_id: number;
  customer_name: string;
  invoice_date: string;
  due_date?: string;
  status: string;
  invoice_type: string;
  payment_terms?: string;
  currency: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  is_paid: boolean;
  billing_address?: string;
  shipping_address?: string;
  notes?: string;
  terms_conditions?: string;
  customer_state?: string;
  company_state?: string;
  items: InvoiceItem[];
  created_by: number;
  created_at: string;
  updated_at?: string;
}

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  item_id: number;
  item_name: string;
  item_description?: string;
  item_sku: string;
  quantity: number;
  unit_price: number;
  discount_rate: number;
  discount_amount: number;
  gst_rate: number;
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  tax_amount: number;
  line_total: number;
  created_at: string;
  updated_at?: string;
}

export interface InvoiceCreate {
  account_id?: string;
  customer_id: number;
  invoice_date: string;
  due_date?: string;
  status?: string;
  invoice_type?: string;
  payment_terms?: string;
  currency?: string;
  billing_address?: string;
  shipping_address?: string;
  notes?: string;
  terms_conditions?: string;
  customer_state?: string;
  company_state?: string;
  items: InvoiceItemCreate[];
}

export interface InvoiceItemCreate {
  item_id: number;
  item_name: string;
  item_description?: string;
  item_sku: string;
  quantity: number;
  unit_price: number;
  discount_rate?: number;
  discount_amount?: number;
  gst_rate: number;
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
}

export interface InvoiceUpdate extends Partial<InvoiceCreate> {}

export interface InvoiceListResponse {
  invoices: Invoice[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface InvoiceSummary {
  id: number;
  invoice_number: string;
  customer_name: string;
  invoice_date: string;
  due_date?: string;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  status: string;
}

export interface InvoiceFilters {
  skip?: number;
  limit?: number;
  search?: string;
  status?: string;
  customer_id?: number;
  date_from?: string;
  date_to?: string;
  payment_status?: string;
}

export interface GSTSlab {
  id: number;
  name: string;
  rate: number;
  hsn_code?: string;
  description?: string;
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
  total_tax_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface GSTSlabCreate {
  name: string;
  rate: number;
  hsn_code?: string;
  description?: string;
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
  is_active?: boolean;
}

export interface WhatsAppInvoiceRequest {
  invoice_id: number;
  phone_number: string;
  message?: string;
}

export interface WhatsAppResponse {
  success: boolean;
  message: string;
  whatsapp_message_id?: string;
}

class InvoiceApiService {
  async getInvoices(filters: InvoiceFilters = {}): Promise<InvoiceListResponse> {
    const params = new URLSearchParams();
    
    if (filters.skip !== undefined) params.append('skip', filters.skip.toString());
    if (filters.limit !== undefined) params.append('limit', filters.limit.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);
    if (filters.customer_id) params.append('customer_id', filters.customer_id.toString());
    if (filters.date_from) params.append('date_from', filters.date_from);
    if (filters.date_to) params.append('date_to', filters.date_to);
    if (filters.payment_status) params.append('payment_status', filters.payment_status);
    
    const queryString = params.toString();
    const url = `/api/sales/invoices${queryString ? `?${queryString}` : ''}`;
    
    console.log('🔍 InvoiceApi: Calling URL:', url);
    console.log('🔍 InvoiceApi: Filters:', filters);
    
    return await apiService.get<InvoiceListResponse>(url);
  }

  async getInvoice(id: number): Promise<Invoice> {
    return await apiService.get<Invoice>(`/api/sales/invoices/${id}`);
  }

  async createInvoice(invoiceData: InvoiceCreate): Promise<Invoice> {
    return await apiService.post<Invoice>('/api/sales/invoices/', invoiceData);
  }

  async updateInvoice(id: number, invoiceData: InvoiceUpdate): Promise<Invoice> {
    return await apiService.put<Invoice>(`/api/sales/invoices/${id}`, invoiceData);
  }

  async deleteInvoice(id: number): Promise<void> {
    try {
      return await apiService.delete<void>(`/api/sales/invoices/${id}`);
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Failed to delete invoice';
      throw new Error(errorMessage);
    }
  }

  async getInvoiceSummary(): Promise<InvoiceSummary[]> {
    return await apiService.get<InvoiceSummary[]>('/api/sales/invoices/summary/list');
  }

  async getGSTSlabs(): Promise<GSTSlab[]> {
    return await apiService.get<GSTSlab[]>('/api/sales/invoices/gst-slabs');
  }

  async createGSTSlab(gstSlabData: GSTSlabCreate): Promise<GSTSlab> {
    return await apiService.post<GSTSlab>('/api/sales/invoices/gst-slabs/', gstSlabData);
  }

  async seedGSTSlabs(): Promise<{ message: string }> {
    return await apiService.post<{ message: string }>('/api/sales/invoices/seed-gst-slabs');
  }

  async sendWhatsApp(request: WhatsAppInvoiceRequest): Promise<WhatsAppResponse> {
    return await apiService.post<WhatsAppResponse>('/api/sales/invoices/send-whatsapp/', request);
  }
}

export const invoiceApi = new InvoiceApiService(); 