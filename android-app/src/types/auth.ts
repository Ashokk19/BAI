export interface User {
    id: string;
    email: string;
    full_name: string;
    role: string;
    // Add other fields as needed
}

export interface LoginRequest {
    email: string; // username in backend is email
    password: string;
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
    user: User;
}
