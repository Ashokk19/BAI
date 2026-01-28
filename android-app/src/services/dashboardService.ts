import { apiService } from './api';
import { DashboardData } from '../types/dashboard';

class DashboardService {
    async getDashboardData(timeline: string = 'this_month'): Promise<DashboardData> {
        const response = await apiService.get<DashboardData>(`/api/dashboard/?timeline=${timeline}`);
        return response;
    }
}

export const dashboardService = new DashboardService();
