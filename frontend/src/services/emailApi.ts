import { apiService } from './api';

export interface SendInvoiceEmailRequest {
  to: string;
  customer_name: string;
  invoice_number: string;
  invoice_date: string;
  amount: string;
  pdf_base64: string;
  // Organization data
  company_name?: string;
  company_email?: string;
  user_name?: string;
}

export interface SendPaymentReminderRequest {
  to: string;
  customer_name: string;
  invoice_number: string;
  invoice_date: string;
  pending_amount: string;
  // Organization data
  company_name?: string;
  company_email?: string;
  user_name?: string;
}

export interface EmailResponse {
  success: boolean;
  message: string;
  data?: any;
}

export interface InvoiceItemForPDF {
  item_name: string;
  hsn_code?: string;
  quantity: number;
  unit_price: number;
  discount_amount?: number;
  gst_rate?: number;
  cgst_rate?: number;
  sgst_rate?: number;
  igst_rate?: number;
}

export interface CustomerInfoForPDF {
  company_name?: string;
  first_name?: string;
  last_name?: string;
  billing_address?: string;
  shipping_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  email?: string;
  gst_number?: string;
}

export interface OrganizationInfoForPDF {
  company_name?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  gst_number?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_ifsc_code?: string;
  bank_account_holder_name?: string;
  terms_and_conditions?: string;
  tax_invoice_color?: string;
  rcm_applicable?: boolean;
  logo_data?: string;
}

export interface GeneratePDFRequest {
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  payment_terms?: string;
  notes?: string;
  freight_charges?: number;
  freight_gst_rate?: number;
  items: InvoiceItemForPDF[];
  customer: CustomerInfoForPDF;
  organization: OrganizationInfoForPDF;
  signature_name?: string;
  signature_style?: string;
}

export interface GeneratePDFResponse {
  success: boolean;
  pdf_base64: string;
  filename: string;
}

class EmailApiService {
  /**
   * Generate a PDF invoice
   */
  async generateInvoicePDF(request: GeneratePDFRequest): Promise<GeneratePDFResponse> {
    return apiService.post<GeneratePDFResponse>('/api/pdf/generate-invoice-pdf', request);
  }

  /**
   * Send a tax invoice email with PDF attachment
   */
  async sendInvoiceEmail(request: SendInvoiceEmailRequest): Promise<EmailResponse> {
    return apiService.post<EmailResponse>('/api/email/send-invoice', request);
  }

  /**
   * Send a payment reminder email
   */
  async sendPaymentReminder(request: SendPaymentReminderRequest): Promise<EmailResponse> {
    return apiService.post<EmailResponse>('/api/email/send-payment-reminder', request);
  }
}

export const emailApi = new EmailApiService();
