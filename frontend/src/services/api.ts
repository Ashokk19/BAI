import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Debug: surface base URL once
    try {
      // eslint-disable-next-line no-console
      console.info('[ApiService] Base URL:', API_BASE_URL);
    } catch {}

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        // Try multiple token sources for better compatibility
        const token = localStorage.getItem('access_token') || 
                     sessionStorage.getItem('access_token');
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          // Debug logging (remove in production)
          console.log('🔐 ApiService: Token added', {
            baseURL: (config.baseURL || API_BASE_URL),
            url: config.url,
            method: (config.method || 'get').toUpperCase(),
          });
        } else {
          console.warn('⚠️ ApiService: No token found in storage');
        }
        // Always log the outbound request target for diagnostics
        try {
          console.log('➡️ ApiService: Request', {
            baseURL: (config.baseURL || API_BASE_URL),
            url: config.url,
            method: (config.method || 'get').toUpperCase(),
          });
        } catch {}
        return config;
      },
      (error) => {
        console.error('❌ ApiService: Request interceptor error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle auth errors
    this.api.interceptors.response.use(
      (response) => {
        // Debug logging for successful responses
        console.log('✅ ApiService: Successful response', {
          url: response.config.url,
          status: response.status
        });
        return response;
      },
      (error) => {
        console.error('❌ ApiService: Response error', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.response?.data?.detail || error.message
        });
        
        if (error.response?.status === 401 || error.response?.status === 403) {
          console.warn('🚫 ApiService: Authentication failed, clearing tokens');
          localStorage.removeItem('access_token');
          sessionStorage.removeItem('access_token');
          localStorage.removeItem('user');
          
          // Redirect to login if not already there
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string): Promise<T> {
    const response: AxiosResponse<T> = await this.api.get(url);
    return response.data;
  }

  async post<T, D = any>(url: string, data?: D): Promise<T> {
    const response: AxiosResponse<T> = await this.api.post(url, data);
    return response.data;
  }

  async put<T, D = any>(url: string, data?: D): Promise<T> {
    const response: AxiosResponse<T> = await this.api.put(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response: AxiosResponse<T> = await this.api.delete(url);
    return response.data;
  }

  async patch<T, D = any>(url: string, data?: D): Promise<T> {
    const response: AxiosResponse<T> = await this.api.patch(url, data);
    return response.data;
  }
}

export const apiService = new ApiService(); 