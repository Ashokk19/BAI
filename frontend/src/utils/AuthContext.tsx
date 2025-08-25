import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api.config';

export interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  account_id: string;
  phone?: string;
  address?: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string, account_id: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  register: (userData: RegisterData) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
}

interface RegisterData {
  email: string;
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  account_id: string;
  phone?: string;
  address?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored token on app load
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    if (token) {
      // Verify token and get user info
      verifyToken(token);
    } else {
      setIsLoading(false);
    }
  }, []);

  const verifyToken = async (token: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (error) {
      // Token is invalid, remove it
      localStorage.removeItem('access_token');
      sessionStorage.removeItem('access_token');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (identifier: string, password: string, account_id: string, rememberMe: boolean = false): Promise<void> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        identifier,
        password,
        account_id,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const { access_token, user: userData } = response.data;

      // Store token based on remember me preference
      if (rememberMe) {
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('remember_me', 'true');
        localStorage.setItem('user_identifier', identifier);
      } else {
        sessionStorage.setItem('access_token', access_token);
        localStorage.removeItem('remember_me');
        localStorage.removeItem('user_identifier');
      }

      // Set axios default authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

      setUser(userData);
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    sessionStorage.removeItem('access_token');
    localStorage.removeItem('remember_me');
    localStorage.removeItem('user_identifier');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const register = async (userData: RegisterData): Promise<void> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/register`, userData);
      console.log('Registration successful:', response.data);
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.response?.data?.detail || 'Registration failed');
    }
  };

  const forgotPassword = async (email: string): Promise<void> => {
    try {
      await axios.post(`${API_BASE_URL}/api/auth/forgot-password`, {
        email,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.detail || 'Failed to send reset email');
      }
      throw new Error('Failed to send reset email');
    }
  };

  const isAuthenticated = !!user;

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    register,
    forgotPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 