import { apiService } from './api';
import type { LoginRequest, RegisterRequest, AuthResponse, User } from '../types/auth';

class AuthService {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>('/auth/login', credentials);
    
    // Store token and user in localStorage
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('user', JSON.stringify(response.user));
    
    return response;
  }

  async register(userData: RegisterRequest): Promise<User> {
    const response = await apiService.post<User>('/auth/register', userData);
    return response;
  }

  async getCurrentUser(): Promise<User> {
    const response = await apiService.get<User>('/auth/me');
    return response;
  }

  async updateProfile(userData: Partial<User>): Promise<User> {
    const response = await apiService.put<User>('/auth/me', userData);
    return response;
  }

  async changePassword(data: { current_password: string; new_password: string }): Promise<{ message: string }> {
    const response = await apiService.post<{ message: string }>('/auth/change-password', data);
    return response;
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  }

  getStoredToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  isAuthenticated(): boolean {
    const token = this.getStoredToken();
    return !!token;
  }
}

export const authService = new AuthService(); 