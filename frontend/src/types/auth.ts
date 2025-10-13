export interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  account_id: string;
  phone?: string;
  address?: string;
  is_active: boolean;
  is_admin: boolean;
  is_verified?: boolean;
  created_at: string;
  last_login?: string;
}

export interface LoginRequest {
  identifier: string;  // Can be either email or username
  password: string;
  account_id: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  address?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
} 