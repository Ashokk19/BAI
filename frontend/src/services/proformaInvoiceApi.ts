import { apiService } from './api';

// Types for Proforma Invoice API
export interface ProformaInvoice {
  id: number;
  account_id: string;
  proforma_number: string;
  customer_id: number;
  customer_name: string;
  proforma_date: string;
  valid_until?: string;
  status: string;
  payment_terms?: string;
  currency: string;
  subtotal: number;
  tax_amount: number;
  total_cgst: number;
  total_sgst: number;
  total_igst: number;
  discount_amount: number;
  total_amount: number;
  billing_address?: string;
  shipping_address?: string;
  notes?: string;
  terms_conditions?: string;
  customer_state?: string;
  company_state?: string;
  items: ProformaInvoiceItem[];
  created_by: number;
  created_at: string;
  updated_at?: string;
}

export interface ProformaInvoiceItem {
  id: number;
  proforma_invoice_id: number;
  item_id: number;
  item_name: string;
  item_description?: string;
  item_sku: string;
  hsn_code?: string;
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

export interface ProformaInvoiceCreate {
  account_id?: string;
  customer_id: number;
  proforma_date: string;
  valid_until?: string;
  status?: string;
  payment_terms?: string;
  currency?: string;
  billing_address?: string;
  shipping_address?: string;
  notes?: string;
  terms_conditions?: string;
  customer_state?: string;
  company_state?: string;
  items: ProformaInvoiceItemCreate[];
}

export interface ProformaInvoiceItemCreate {
  item_id: number;
  item_name: string;
  item_description?: string;
  item_sku: string;
  hsn_code?: string;
  quantity: number;
  unit_price: number;
  discount_rate?: number;
  discount_amount?: number;
  gst_rate: number;
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
}

export interface ProformaInvoiceUpdate extends Partial<ProformaInvoiceCreate> {}

export interface ProformaInvoiceListResponse {
  proforma_invoices: ProformaInvoice[];
  invoices: ProformaInvoice[]; // Alias for compatibility
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ProformaInvoiceFilters {
  skip?: number;
  limit?: number;
  search?: string;
  status?: string;
  customer_id?: number;
}

class ProformaInvoiceApiService {
  async getInvoices(filters: ProformaInvoiceFilters = {}): Promise<ProformaInvoiceListResponse> {
    const params = new URLSearchParams();
    
    if (filters.skip !== undefined) params.append('skip', filters.skip.toString());
    if (filters.limit !== undefined) params.append('limit', filters.limit.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);
    if (filters.customer_id) params.append('customer_id', filters.customer_id.toString());
    
    const queryString = params.toString();
    const url = `/api/sales/proforma-invoices/${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiService.get<ProformaInvoiceListResponse>(url);
    // Add invoices alias for compatibility
    return { ...response, invoices: response.proforma_invoices };
  }

  async getProformaInvoice(id: number): Promise<ProformaInvoice> {
    return await apiService.get<ProformaInvoice>(`/api/sales/proforma-invoices/${id}`);
  }

  async getInvoice(id: number): Promise<ProformaInvoice> {
    return this.getProformaInvoice(id);
  }

  async createProformaInvoice(proformaData: ProformaInvoiceCreate): Promise<ProformaInvoice> {
    return await apiService.post<ProformaInvoice>('/api/sales/proforma-invoices/', proformaData);
  }

  async updateProformaInvoice(id: number, proformaData: ProformaInvoiceUpdate): Promise<ProformaInvoice> {
    return await apiService.put<ProformaInvoice>(`/api/sales/proforma-invoices/${id}`, proformaData);
  }

  async deleteProformaInvoice(id: number): Promise<void> {
    try {
      return await apiService.delete<void>(`/api/sales/proforma-invoices/${id}`);
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Failed to delete proforma invoice';
      throw new Error(errorMessage);
    }
  }

  async deleteInvoice(id: number): Promise<void> {
    return this.deleteProformaInvoice(id);
  }

  async convertToInvoice(id: number): Promise<{ message: string; proforma_id: number; proforma_number: string }> {
    return await apiService.post<{ message: string; proforma_id: number; proforma_number: string }>(
      `/api/sales/proforma-invoices/${id}/convert-to-invoice`,
      {}
    );
  }
}

export const proformaInvoiceApi = new ProformaInvoiceApiService();
