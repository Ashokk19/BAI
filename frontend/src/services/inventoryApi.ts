import { apiService } from './api';
import { API_BASE_URL, API_ENDPOINTS, buildApiUrl, getAuthHeaders } from '../config/api.config';

export interface Item {
  id: number;
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  category_id: number;
  unit_price: number;
  cost_price?: number;
  selling_price: number;
  current_stock: number;
  minimum_stock: number;
  maximum_stock?: number;
  unit_of_measure: string;
  weight?: number;
  dimensions?: string;
  has_expiry: boolean;
  shelf_life_days?: number;
  is_active: boolean;
  is_serialized: boolean;
  tax_rate: number;
  tax_type: string;
  created_at: string;
  is_low_stock: boolean;
  stock_value: number;
}

export interface ItemCategory {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface ItemCreate {
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  category_id: number;
  unit_price: number;
  cost_price?: number;
  selling_price: number;
  current_stock: number;
  minimum_stock: number;
  maximum_stock?: number;
  unit_of_measure: string;
  weight?: number;
  dimensions?: string;
  has_expiry: boolean;
  shelf_life_days?: number;
  is_active: boolean;
  is_serialized: boolean;
  tax_rate: number;
  tax_type: string;
}

export interface ItemUpdate {
  name?: string;
  description?: string;
  sku?: string;
  barcode?: string;
  category_id?: number;
  unit_price?: number;
  cost_price?: number;
  selling_price?: number;
  current_stock?: number;
  minimum_stock?: number;
  maximum_stock?: number;
  unit_of_measure?: string;
  weight?: number;
  dimensions?: string;
  has_expiry?: boolean;
  shelf_life_days?: number;
  is_active?: boolean;
  is_serialized?: boolean;
  tax_rate?: number;
  tax_type?: string;
}

export interface CategoryCreate {
  name: string;
  description?: string;
  is_active: boolean;
}

export interface CategoryUpdate {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface InventoryLog {
  id: number;
  item_id: number;
  item_name: string;
  item_sku: string;
  action: string;
  user_id: number;
  user_name: string;
  quantity_before?: number;
  quantity_after?: number;
  notes?: string;
  created_at: string;
}

export interface ExpiryItem {
  id: number;
  name: string;
  sku: string;
  category_id: number;
  current_stock: number;
  has_expiry: boolean;
  shelf_life_days?: number;
  created_at: string;
  days_until_expiry: number;
  expiry_date: string;
  status: string;
}

class InventoryApiService {
  // Items API
  async getItems(params?: { 
    skip?: number; 
    limit?: number; 
    search?: string; 
    category_id?: number; 
  }): Promise<Item[]> {
    const queryParams = new URLSearchParams();
    if (params?.skip) queryParams.append('skip', params.skip.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.category_id) queryParams.append('category_id', params.category_id.toString());
    
    const url = `/api/inventory/items${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiService.get<Item[]>(url);
  }

  async getItem(id: number): Promise<Item> {
    return apiService.get<Item>(`/api/inventory/items/${id}`);
  }

  async createItem(item: ItemCreate): Promise<Item> {
    return apiService.post<Item>('/api/inventory/items', item);
  }

  async updateItem(id: number, item: ItemUpdate): Promise<Item> {
    return apiService.put<Item>(`/api/inventory/items/${id}`, item);
  }

  async deleteItem(id: number): Promise<void> {
    try {
      await apiService.delete<void>(`/api/inventory/items/${id}`);
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Failed to delete item';
      throw new Error(errorMessage);
    }
  }

  // Categories API
  async getCategories(): Promise<ItemCategory[]> {
    return apiService.get<ItemCategory[]>('/api/inventory/categories');
  }

  async createCategory(category: CategoryCreate): Promise<ItemCategory> {
    return apiService.post<ItemCategory>('/api/inventory/categories', category);
  }

  async updateCategory(id: number, category: CategoryUpdate): Promise<ItemCategory> {
    return apiService.put<ItemCategory>(`/api/inventory/categories/${id}`, category);
  }

  async deleteCategory(id: number): Promise<void> {
    try {
      await apiService.delete<void>(`/api/inventory/categories/${id}`);
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Failed to delete category';
      throw new Error(errorMessage);
    }
  }

  // Inventory Logs API
  async getInventoryLogs(params?: {
    skip?: number;
    limit?: number;
    item_id?: number;
    transaction_type?: string;
  }): Promise<InventoryLog[]> {
    const queryParams = new URLSearchParams();
    if (params?.skip) queryParams.append('skip', params.skip.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.item_id) queryParams.append('item_id', params.item_id.toString());
    if (params?.transaction_type) queryParams.append('transaction_type', params.transaction_type);
    
    const url = `/api/inventory/logs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiService.get<InventoryLog[]>(url);
  }

  // Expiry Tracking API
  async getExpiryTracking(): Promise<ExpiryItem[]> {
    return apiService.get<ExpiryItem[]>('/api/inventory/expiry-tracking');
  }

  // Low Stock API
  async getLowStockItems(): Promise<{ low_stock_count: number; items: any[] }> {
    return apiService.get<{ low_stock_count: number; items: any[] }>('/api/inventory/low-stock');
  }

  // Inventory Summary API
  async getInventorySummary(): Promise<{
    total_items: number;
    low_stock_items: number;
    total_stock_value: number;
    active_categories: number;
    total_value_formatted: string;
  }> {
    return apiService.get('/api/inventory/');
  }

  // Stock Adjustment API (placeholder for future implementation)
  async adjustStock(itemId: number, quantity: number, reason: string): Promise<void> {
    return apiService.post(`/api/inventory/items/${itemId}/adjust-stock`, {
      quantity,
      reason
    });
  }

  // Import/Export API (placeholder for future implementation)
  async exportItems(format: 'csv' | 'xlsx' = 'csv'): Promise<Blob> {
    const response = await fetch(buildApiUrl(API_ENDPOINTS.inventory.export, { format }), {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Export failed');
    }
    
    return response.blob();
  }

  async importItems(file: File): Promise<{ success: boolean; message: string; errors?: string[] }> {
    const formData = new FormData();
    formData.append('file', file);
    
    // Don't set Content-Type for FormData, browser will set it automatically with boundary
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(buildApiUrl(API_ENDPOINTS.inventory.import), {
      method: 'POST',
      headers,
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Import failed');
    }
    
    return response.json();
  }
}

export const inventoryApi = new InventoryApiService(); 