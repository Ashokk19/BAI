import { apiService } from './api';

export interface Customer {
  id: number;
  customer_code: string;
  company_name?: string;
  contact_person?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  mobile?: string;
  website?: string;
  billing_address?: string;
  shipping_address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  customer_type: 'individual' | 'business';
  tax_number?: string;
  gst_number?: string;
  credit_limit?: number;
  payment_terms?: string;
  currency?: string;
  is_active: boolean;
  is_verified: boolean;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface CustomerCreate {
  customer_code: string;
  company_name?: string;
  contact_person?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  mobile?: string;
  website?: string;
  billing_address?: string;
  shipping_address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  customer_type: 'individual' | 'business';
  tax_number?: string;
  gst_number?: string;
  credit_limit?: number;
  payment_terms?: string;
  currency?: string;
  is_active?: boolean;
  is_verified?: boolean;
  notes?: string;
}

export interface CustomerUpdate extends Partial<CustomerCreate> {}

export interface CustomerListResponse {
  customers: Customer[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface CustomerFilters {
  skip?: number;
  limit?: number;
  search?: string;
  status?: string;
  state?: string;
}

export interface CustomerCreditInfo {
  customer_id: number;
  customer_name: string;
  credit_limit: number;
  total_available_credit: number;
  number_of_active_credits: number;
  credits: Array<{
    credit_number: string;
    credit_type: string;
    original_amount: number;
    remaining_amount: number;
    credit_date: string;
  }>;
}

class CustomerApiService {
  async getCustomers(filters: CustomerFilters = {}): Promise<CustomerListResponse> {
    const params = new URLSearchParams();
    
    if (filters.skip !== undefined) params.append('skip', filters.skip.toString());
    if (filters.limit !== undefined) params.append('limit', filters.limit.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);
    if (filters.state) params.append('state', filters.state);
    
    const queryString = params.toString();
    const url = `/api/customers/${queryString ? `?${queryString}` : ''}`;
    
    return await apiService.get<CustomerListResponse>(url);
  }

  async getCustomer(id: number): Promise<Customer> {
    return await apiService.get<Customer>(`/api/customers/${id}`);
  }

  async createCustomer(customerData: CustomerCreate): Promise<Customer> {
    return await apiService.post<Customer>('/api/customers/', customerData);
  }

  async updateCustomer(id: number, customerData: CustomerUpdate): Promise<Customer> {
    return await apiService.put<Customer>(`/api/customers/${id}`, customerData);
  }

  async deleteCustomer(id: number): Promise<void> {
    try {
      return await apiService.delete<void>(`/api/customers/${id}`);
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Failed to delete customer';
      throw new Error(errorMessage);
    }
  }

  async getCustomerCreditInfo(customerId: number): Promise<CustomerCreditInfo> {
    return await apiService.get<CustomerCreditInfo>(`/api/customers/${customerId}/credit-info`);
  }

  async toggleCustomerStatus(id: number): Promise<Customer> {
    return await apiService.patch<Customer>(`/api/customers/${id}/toggle-status`);
  }

  async getCustomerSummary(): Promise<any> {
    return await apiService.get<any>('/api/customers/summary');
  }
}

export const customerApi = new CustomerApiService(); 