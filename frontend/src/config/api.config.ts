/**
 * Centralized API configuration
 * All backend API endpoints should be defined here
 */

// Base API URL from environment variable or runtime origin (fallback to localhost for dev)
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8001');

// API endpoint configuration
export const API_ENDPOINTS = {
  // Authentication endpoints
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    logout: '/api/auth/logout',
    profile: '/api/auth/profile',
  },
  
  // Sales module endpoints
  sales: {
    customers: '/api/sales/customers',
    invoices: '/api/sales/invoices',
    payments: '/api/sales/payments/',
    credits: '/api/sales/credits/',
    returns: '/api/sales/returns/',
    shipments: '/api/sales/shipments/',
    deliveryNotes: '/api/sales/shipments/delivery-notes',
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
    vendors: '/api/purchases/vendors',
    purchaseOrders: '/api/purchases/purchase-orders',
    bills: '/api/purchases/bills',
    purchaseReceived: '/api/purchases/purchase-received',
    vendorCredits: '/api/purchases/vendor-credits',
    paymentsMade: '/api/purchases/payments-made',
  },
  
  // Dashboard endpoints
  dashboard: {
    stats: '/api/dashboard/stats',
    recentActivities: '/api/dashboard/recent-activities',
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