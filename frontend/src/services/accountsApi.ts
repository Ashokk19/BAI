import { apiService } from './api';

export interface PublicAccount {
  account_id: string;
  display_name?: string;
  is_master?: boolean;
}

export interface Account extends PublicAccount {
  id: number;
  is_active: boolean;
  created_at: string;
}

class AccountsApiService {
  async getPublicAccounts(): Promise<PublicAccount[]> {
    return apiService.get<PublicAccount[]>(`/api/accounts/public`);
  }

  async listAccounts(): Promise<Account[]> {
    return apiService.get<Account[]>(`/api/accounts/`);
  }

  async getAccount(account_id: string): Promise<Account> {
    return apiService.get<Account>(`/api/accounts/${encodeURIComponent(account_id)}`);
  }

  async createAccount(payload: { account_id: string; display_name?: string; is_master?: boolean }): Promise<Account> {
    return apiService.post<Account>(`/api/accounts/`, payload);
  }

  async updateAccount(account_id: string, payload: { display_name?: string; is_active?: boolean }): Promise<Account> {
    return apiService.put<Account>(`/api/accounts/${encodeURIComponent(account_id)}`, payload);
  }

  async deleteAccount(account_id: string): Promise<{ message: string; account_id: string }> {
    return apiService.delete(`/api/accounts/${encodeURIComponent(account_id)}`);
  }
}

export const accountsApi = new AccountsApiService();
