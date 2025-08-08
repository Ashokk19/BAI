import React, { useState, useEffect } from "react"
import {
  TrendingUp,
  Activity,
  Calendar,
  BarChart3,
  Users,
  ClipboardList,
  AlertTriangle,
  Loader2,
} from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { dashboardService } from '../services/dashboardService'
import type { DashboardData, KPI } from '../types/dashboard'

interface KPICardProps {
  kpi: KPI
}

const KPICard: React.FC<KPICardProps> = ({ kpi }) => {
  const getIcon = (title: string) => {
    switch (title) {
      case "Total Stock Value":
        return TrendingUp
      case "Sales":
        return TrendingUp
      case "Active Customers":
        return Users
      case "Pending Orders":
        return ClipboardList
      case "Low Stock Items":
        return AlertTriangle
      case "Revenue Growth":
        return BarChart3
      default:
        return Activity
    }
  }

  const Icon = getIcon(kpi.title)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{kpi.value}</div>
        {kpi.change && (
          <p className={`text-xs ${kpi.change_type === 'positive' ? 'text-green-500' : 'text-red-500'}`}>
            {kpi.change}
          </p>
        )}
        <p className="text-xs text-muted-foreground">{kpi.description}</p>
      </CardContent>
    </Card>
  )
}

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeline, setTimeline] = useState("Today")

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await dashboardService.getDashboardData(timeline)
        setData(result)
      } catch (err) {
        console.error("Failed to fetch dashboard data", err)
        setError("Failed to load dashboard data. Please try again.")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [timeline])

  const handleTimelineChange = (newTimeline: string) => {
    setTimeline(newTimeline)
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-center h-96">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-lg">Loading dashboard...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg text-red-600">{error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              className="mt-4"
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-center h-96">
          <p className="text-lg">No data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Calendar className="mr-2 h-4 w-4" />
                {timeline}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Timeline</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleTimelineChange("Today")}>
                Today
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTimelineChange("This Week")}>
                This Week
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTimelineChange("This Month")}>
                This Month
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTimelineChange("This Year")}>
                This Year
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* KPI Cards - 2 rows, 3 columns */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.kpis.slice(0, 6).map((kpi, index) => (
          <KPICard key={`${kpi.title}-${index}`} kpi={kpi} />
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Sales Overview</CardTitle>
            <CardDescription>Sales performance over time</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[350px]">
              {data.sales_overview && data.sales_overview.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.sales_overview}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      axisLine={{ stroke: '#e0e0e0' }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      axisLine={{ stroke: '#e0e0e0' }}
                      tickFormatter={(value) => `₹${value}`}
                    />
                    <Tooltip 
                      formatter={(value: any) => [`₹${value}`, 'Sales']}
                      labelFormatter={(label) => `Date: ${label}`}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e0e0e0',
                        borderRadius: '6px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="#8b5cf6" 
                      strokeWidth={3}
                      dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#8b5cf6', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No sales data available</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Data will appear here when sales are recorded
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Inventory Status</CardTitle>
            <CardDescription>Stock levels by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.inventory_status.length > 0 ? (
                data.inventory_status.map((item, index) => (
                  <div key={`${item.name}-${index}`} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-sm text-gray-600">{item.value} units</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No inventory data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest transactions and updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.recent_activity.length > 0 ? (
              data.recent_activity.map((activity, index) => (
                <div key={`activity-${index}`} className="flex justify-between items-start p-3 bg-gray-50 rounded">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{activity.action}</p>
                    <p className="text-xs text-gray-600 mt-1">{activity.details}</p>
                  </div>
                  <span className="text-xs text-gray-500 ml-4">{activity.time}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No recent activity</p>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Footer spacing */}
      <div className="h-20"></div>
    </div>
  )
}

export default Dashboard 