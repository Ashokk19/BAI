/**
 * Centralized API configuration
 * All backend API endpoints should be defined here
 */

// Base API URL from environment variable or default
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

// API endpoint configuration
export const API_ENDPOINTS = {
  // Authentication endpoints
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    logout: '/auth/logout',
    profile: '/auth/profile',
  },
  
  // Sales module endpoints
  sales: {
    customers: '/sales/customers',
    invoices: '/sales/invoices',
    payments: '/sales/payments',
    credits: '/sales/credits',
    returns: '/sales/returns',
    shipments: '/sales/shipments',
    deliveryNotes: '/sales/shipments/delivery-notes',
  },
  
  // Inventory module endpoints
  inventory: {
    items: '/api/inventory/items',
    categories: '/api/inventory/categories',
    categoriesWithStats: '/api/inventory/categories/with-stats',
    movements: '/api/inventory/movements',
    export: '/api/inventory/items/export',
    import: '/api/inventory/items/import',
  },
  
  // Purchase module endpoints
  purchases: {
    vendors: '/purchases/vendors',
    purchaseOrders: '/purchases/purchase-orders',
    bills: '/purchases/bills',
    purchaseReceived: '/purchases/purchase-received',
    vendorCredits: '/purchases/vendor-credits',
    paymentsMade: '/purchases/payments-made',
  },
  
  // Dashboard endpoints
  dashboard: {
    stats: '/dashboard/stats',
    recentActivities: '/dashboard/recent-activities',
  },
} as const;

// Helper function to build full URL
export function buildApiUrl(endpoint: string, params?: Record<string, string>): string {
  const url = new URL(endpoint, API_BASE_URL);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });
  }
  
  return url.toString();
}

// Type-safe endpoint getter
export function getEndpoint<T extends keyof typeof API_ENDPOINTS>(
  module: T,
  endpoint: keyof typeof API_ENDPOINTS[T]
): string {
  return API_ENDPOINTS[module][endpoint] as string;
}

// Helper function to get common headers including auth
export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
} 