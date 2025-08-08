export interface KPI {
  title: string;
  value: string;
  change: string;
  change_type: string;
  description: string;
}

export interface SalesDataPoint {
  name: string;
  sales: number;
}

export interface InventoryStatus {
  name: string;
  value: number;
}

export interface RecentActivity {
  action: string;
  details: string;
  time: string;
}

export interface DashboardData {
  kpis: KPI[];
  sales_overview: SalesDataPoint[];
  inventory_status: InventoryStatus[];
  recent_activity: RecentActivity[];
} 