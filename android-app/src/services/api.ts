import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../config/api.config';
import { router } from 'expo-router';

class ApiService {
    private api: AxiosInstance;

    constructor() {
        this.api = axios.create({
            baseURL: API_BASE_URL,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Request interceptor
        this.api.interceptors.request.use(
            async (config) => {
                try {
                    const token = await SecureStore.getItemAsync('access_token');
                    if (token) {
                        config.headers.Authorization = `Bearer ${token}`;
                    }
                } catch (error) {
                    console.warn('Error reading token', error);
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        // Response interceptor
        this.api.interceptors.response.use(
            (response) => response,
            async (error) => {
                if (error.response?.status === 401 || error.response?.status === 403) {
                    // Clear token and redirect
                    await SecureStore.deleteItemAsync('access_token');
                    await SecureStore.deleteItemAsync('user');
                    // Navigate to login
                    router.replace('/(auth)/login');
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
}

export const apiService = new ApiService();
