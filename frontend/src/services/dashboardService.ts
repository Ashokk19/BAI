import { apiService } from './api';
import type { DashboardData } from '../types/dashboard';

class DashboardService {
  async getDashboardData(timeline: string): Promise<DashboardData> {
    const response = await apiService.get<DashboardData>(`/api/dashboard/?timeline=${timeline}`);
    return response;
  }
}

export const dashboardService = new DashboardService(); 