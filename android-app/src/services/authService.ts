import { apiService } from './api';
import * as SecureStore from 'expo-secure-store';
import { LoginRequest, AuthResponse, User } from '../types/auth';

class AuthService {
    async login(credentials: LoginRequest): Promise<AuthResponse> {
        // Note: Backend expects form data for OAuth2PasswordRequestForm usually, 
        // but frontend code sent JSON to /auth/login.
        // Let's assume JSON is fine based on frontend inspection.
        const response = await apiService.post<AuthResponse>('/api/auth/login', credentials);

        await SecureStore.setItemAsync('access_token', response.access_token);
        await SecureStore.setItemAsync('user', JSON.stringify(response.user));

        return response;
    }

    async logout(): Promise<void> {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('user');
    }

    async getCurrentUser(): Promise<User | null> {
        const userStr = await SecureStore.getItemAsync('user');
        if (userStr) {
            return JSON.parse(userStr);
        }
        return null;
    }

    async isAuthenticated(): Promise<boolean> {
        const token = await SecureStore.getItemAsync('access_token');
        return !!token;
    }
}

export const authService = new AuthService();
