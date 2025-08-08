import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';

interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_admin: boolean;
  is_verified: boolean;
  created_at: string;
  last_login: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string, full_name: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
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

  const API_BASE_URL = 'http://localhost:8001';

  useEffect(() => {
    // Check for token in both localStorage and sessionStorage
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    if (token) {
      // Set default Authorization header for all axios instances
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Verify token and get user info
      axios.get(`${API_BASE_URL}/api/auth/me`)
        .then(response => {
          setUser(response.data);
        })
        .catch(() => {
          // Token is invalid, remove it from both storages
          localStorage.removeItem('access_token');
          sessionStorage.removeItem('access_token');
          localStorage.removeItem('remember_me');
          localStorage.removeItem('user_email');
          delete axios.defaults.headers.common['Authorization'];
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean = false): Promise<void> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email,
        password,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const { access_token, user: userData } = response.data;
      
      // Store token based on remember me preference
      if (rememberMe) {
        // Store in localStorage for persistent login
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('remember_me', 'true');
        localStorage.setItem('user_email', email);
      } else {
        // Store in sessionStorage for session-only login
        sessionStorage.setItem('access_token', access_token);
        localStorage.removeItem('remember_me');
        localStorage.removeItem('user_email');
      }
      
      // Set default Authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // Set user data
      setUser(userData);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.detail || 'Login failed');
      }
      throw new Error('Login failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    sessionStorage.removeItem('access_token');
    localStorage.removeItem('remember_me');
    localStorage.removeItem('user_email');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
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
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.detail || 'Failed to send reset email');
      }
      throw new Error('Failed to send reset email');
    }
  };

  const register = async (email: string, password: string, full_name: string): Promise<void> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/register`, {
        email,
        password,
        full_name,
      });

      const { access_token, user: userData } = response.data;
      
      // Store token
      localStorage.setItem('access_token', access_token);
      
      // Set default Authorization header for all axios instances
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // Set user data
      setUser(userData);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.detail || 'Registration failed');
      }
      throw new Error('Registration failed');
    }
  };

  const value = {
    user,
    isLoading,
    login,
    logout,
    register,
    forgotPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 