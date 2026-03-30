import { apiService } from './api';

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  invoiceAlerts: boolean;
  stockAlerts: boolean;
  paymentReminders: boolean;
  deliveryAlerts: boolean;
}

class NotificationPreferencesService {
  async getPreferences(): Promise<NotificationPreferences> {
    return apiService.get<NotificationPreferences>('/api/auth/notification-preferences');
  }

  async updatePreferences(payload: NotificationPreferences): Promise<NotificationPreferences> {
    return apiService.put<NotificationPreferences, NotificationPreferences>('/api/auth/notification-preferences', payload);
  }

  async runScan(): Promise<{ message: string }> {
    return apiService.post<{ message: string }>('/api/auth/notification-preferences/scan');
  }
}

export const notificationPreferencesService = new NotificationPreferencesService();
export default notificationPreferencesService;
