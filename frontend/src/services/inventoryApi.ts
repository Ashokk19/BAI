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
  expiry_date?: string;
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

export interface ItemCategoryWithStats {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  // Statistics from items table
  total_items: number;
  active_items: number;
  total_stock_value: number;
  total_current_stock: number;
  low_stock_items: number;
  out_of_stock_items: number;
  expiry_items: number;
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
  expiry_date?: string;
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
  expiry_date?: string;
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
  status: string;
}

const toNumber = (value: any): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

const normalizeItem = (raw: any): Item => {
  const sku = (raw?.sku ?? raw?.item_code ?? raw?.itemCode ?? '') as string;
  const sellingPrice = toNumber(raw?.selling_price ?? raw?.mrp);
  let unitPrice = toNumber(raw?.unit_price ?? raw?.purchase_price ?? raw?.cost_price);
  // Many backends store price in selling_price; if unit_price is missing/zero but selling_price exists, display selling.
  if (unitPrice <= 0 && sellingPrice > 0) unitPrice = sellingPrice;

  const currentStock = toNumber(raw?.current_stock ?? raw?.stock_quantity);
  const minimumStock = toNumber(raw?.minimum_stock ?? raw?.reorder_level);
  const stockValue = raw?.stock_value !== undefined ? toNumber(raw?.stock_value) : currentStock * unitPrice;

  return {
    id: raw?.id,
    name: raw?.name ?? '',
    description: raw?.description ?? '',
    sku,
    barcode: raw?.barcode ?? undefined,
    category_id: raw?.category_id ?? 1,
    unit_price: unitPrice,
    cost_price: raw?.cost_price !== undefined ? toNumber(raw?.cost_price) : toNumber(raw?.purchase_price) || unitPrice,
    selling_price: sellingPrice || unitPrice,
    current_stock: currentStock,
    minimum_stock: minimumStock,
    maximum_stock: raw?.maximum_stock !== undefined ? toNumber(raw?.maximum_stock) : undefined,
    unit_of_measure: raw?.unit_of_measure ?? raw?.unit ?? 'pcs',
    weight: raw?.weight !== undefined ? toNumber(raw?.weight) : undefined,
    dimensions: raw?.dimensions ?? undefined,
    has_expiry: Boolean(raw?.has_expiry ?? raw?.hasExpiry ?? false),
    shelf_life_days: raw?.shelf_life_days ?? undefined,
    expiry_date: raw?.expiry_date ?? undefined,
    is_active: Boolean(raw?.is_active ?? true),
    is_serialized: Boolean(raw?.is_serialized ?? false),
    tax_rate: toNumber(raw?.tax_rate ?? raw?.gst_rate),
    tax_type: raw?.tax_type ?? 'inclusive',
    created_at: raw?.created_at ?? new Date().toISOString(),
    is_low_stock: Boolean(raw?.is_low_stock ?? (currentStock <= minimumStock)),
    stock_value: stockValue,
  };
};

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
    const resp = await apiService.get<any>(url);
    // Backend may return either an array or an object { items, total }
    const rows = Array.isArray(resp) ? resp : (resp && Array.isArray(resp.items) ? resp.items : []);
    return (rows as any[]).map(normalizeItem);
  }

  async getItem(id: number): Promise<Item> {
    const raw = await apiService.get<any>(`/api/inventory/items/${id}`);
    return normalizeItem(raw);
  }

  async createItem(item: ItemCreate): Promise<Item> {
    const raw = await apiService.post<any>('/api/inventory/items', item);
    return normalizeItem(raw);
  }

  async updateItem(id: number, item: ItemUpdate): Promise<Item> {
    const raw = await apiService.put<any>(`/api/inventory/items/${id}`, item);
    return normalizeItem(raw);
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
    return apiService.get<ItemCategory[]>(API_ENDPOINTS.inventory.categories);
  }

  async getCategoriesWithStats(): Promise<ItemCategoryWithStats[]> {
    return apiService.get<ItemCategoryWithStats[]>(API_ENDPOINTS.inventory.categoriesWithStats);
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

  // Import/Export API
  async exportItems(format: 'csv' | 'xlsx' = 'csv'): Promise<Blob> {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(buildApiUrl(API_ENDPOINTS.inventory.export, { format }), {
      method: 'GET',
      headers,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Export failed' }));
      throw new Error(errorData.detail || 'Export failed');
    }
    
    return response.blob();
  }

  async importItems(file: File): Promise<{ success: boolean; message: string; errors?: string[]; imported_count?: number; total_rows?: number }> {
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
      const errorData = await response.json().catch(() => ({ detail: 'Import failed' }));
      throw new Error(errorData.detail || 'Import failed');
    }
    
    return response.json();
  }
}

export const inventoryApi = new InventoryApiService(); 