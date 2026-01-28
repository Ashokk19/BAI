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
  Package,
  TrendingDown,
  Sparkles,
  RefreshCw,
  DollarSign,
  ShoppingCart,
  Truck,
  Bell,
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
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
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
import { Badge } from "@/components/ui/badge"
import { dashboardService } from '../services/dashboardService'
import type { DashboardData, KPI } from '../types/dashboard'

interface KPICardProps {
  kpi: KPI
  index: number
}

const KPICard: React.FC<KPICardProps> = ({ kpi, index }) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 100)
    return () => clearTimeout(timer)
  }, [index])

  const getIcon = (title: string) => {
    switch (title) {
      case "Total Stock Value":
        return Package
      case "Sales":
        return DollarSign
      case "Active Customers":
        return Users
      case "Pending Shipments":
        return Truck
      case "Low Stock Items":
        return AlertTriangle
      case "Revenue Growth":
        return TrendingUp
      default:
        return Activity
    }
  }

  const getGradient = (title: string) => {
    switch (title) {
      case "Total Stock Value":
        return "from-purple-500 to-indigo-600"
      case "Sales":
        return "from-emerald-500 to-teal-600"
      case "Active Customers":
        return "from-blue-500 to-cyan-600"
      case "Pending Shipments":
        return "from-amber-500 to-orange-600"
      case "Low Stock Items":
        return "from-red-500 to-pink-600"
      case "Revenue Growth":
        return "from-violet-500 to-purple-600"
      default:
        return "from-gray-500 to-gray-600"
    }
  }

  const Icon = getIcon(kpi.title)
  const gradient = getGradient(kpi.title)

  return (
    <Card 
      className={`
        relative overflow-hidden border-0 shadow-lg bg-white
        transform transition-all duration-500 hover:scale-105 hover:shadow-2xl
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5`}></div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
      
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
        <CardTitle className="text-sm font-semibold text-gray-700">{kpi.title}</CardTitle>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          {kpi.value}
        </div>
        {kpi.change && (
          <div className="flex items-center gap-1 mt-2">
            {kpi.change_type === 'positive' ? (
              <TrendingUp className="h-3 w-3 text-emerald-500" />
            ) : kpi.change_type === 'negative' ? (
              <TrendingDown className="h-3 w-3 text-red-500" />
            ) : null}
            <p className={`text-xs font-medium ${
              kpi.change_type === 'positive' ? 'text-emerald-600' : 
              kpi.change_type === 'negative' ? 'text-red-600' : 
              'text-gray-600'
            }`}>
              {kpi.change}
            </p>
          </div>
        )}
        <p className="text-xs text-gray-500 mt-1">{kpi.description}</p>
      </CardContent>
    </Card>
  )
}

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeline, setTimeline] = useState("Today")
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await dashboardService.getDashboardData(timeline)
      setData(result)
      setLastUpdated(new Date())
    } catch (err) {
      console.error("Failed to fetch dashboard data", err)
      setError("Failed to load dashboard data. Please try again.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [timeline])

  const handleTimelineChange = (newTimeline: string) => {
    setTimeline(newTimeline)
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchData()
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

  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899']

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 min-h-screen">
      {/* Header with futuristic styling */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-purple-600" />
            Dashboard
          </h2>
          <p className="text-sm text-gray-600 mt-1 font-medium">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg">
                <Calendar className="mr-2 h-4 w-4" />
                {timeline}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Select Timeline</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleTimelineChange("Today")}>
                <Activity className="mr-2 h-4 w-4" />
                Today
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTimelineChange("This Week")}>
                <Calendar className="mr-2 h-4 w-4" />
                This Week
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTimelineChange("This Month")}>
                <Calendar className="mr-2 h-4 w-4" />
                This Month
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTimelineChange("This Year")}>
                <Calendar className="mr-2 h-4 w-4" />
                This Year
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* KPI Cards - Enhanced with animations */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {data.kpis.slice(0, 6).map((kpi, index) => (
          <KPICard key={`${kpi.title}-${index}`} kpi={kpi} index={index} />
        ))}
      </div>

      {/* Charts Section - Enhanced */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-0 shadow-lg overflow-hidden bg-white">
          <CardHeader className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  Sales Overview
                </CardTitle>
                <CardDescription>Sales performance over time</CardDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Calendar className="h-4 w-4" />
                    {timeline}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleTimelineChange("Today")}>Today</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleTimelineChange("This Week")}>This Week</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleTimelineChange("This Month")}>This Month</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="pl-2 relative z-10">
            <div className="h-[350px]">
              {data.sales_overview && data.sales_overview.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.sales_overview}>
                    <defs>
                      <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickFormatter={(value) => `₹${value}`}
                    />
                    <Tooltip 
                      formatter={(value: any) => [`₹${parseFloat(value).toLocaleString()}`, 'Sales']}
                      labelFormatter={(label) => `${label}`}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="#8b5cf6" 
                      strokeWidth={3}
                      fill="url(#salesGradient)"
                      dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center border-2 border-dashed border-purple-200 rounded-xl bg-white/50">
                  <div className="text-center">
                    <div className="relative">
                      <BarChart3 className="h-16 w-16 text-purple-400 mx-auto mb-4 animate-pulse" />
                      <Sparkles className="h-6 w-6 text-purple-500 absolute top-0 right-12 animate-bounce" />
                    </div>
                    <p className="text-gray-600 font-medium">No sales data available</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Data will appear here when sales are recorded
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 border-0 shadow-lg overflow-hidden bg-white">
          <CardHeader className="relative z-10">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Package className="h-5 w-5 text-emerald-600" />
              Inventory Status
            </CardTitle>
            <CardDescription>Stock levels by category</CardDescription>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="space-y-3">
              {data.inventory_status.length > 0 ? (
                data.inventory_status.map((item, index) => {
                  const percentage = data.inventory_status.reduce((sum, i) => sum + i.value, 0) > 0
                    ? (item.value / data.inventory_status.reduce((sum, i) => sum + i.value, 0)) * 100
                    : 0
                  return (
                    <div key={`${item.name}-${index}`} className="group">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-gray-700 group-hover:text-emerald-600 transition-colors">
                          {item.name}
                        </span>
                        <span className="text-sm font-bold text-emerald-600">
                          {item.value} units
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-3 animate-pulse" />
                  <p className="text-sm text-gray-500">No inventory data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Activity - Enhanced */}
      <Card className="border-0 shadow-lg overflow-hidden bg-white">
        <CardHeader className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-600" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest transactions and updates</CardDescription>
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              Live
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {data.recent_activity.length > 0 ? (
              data.recent_activity.map((activity, index) => {
                const getActivityIcon = (action: string) => {
                  if (action.includes('Invoice')) return ShoppingCart
                  if (action.includes('Delivery')) return Truck
                  if (action.includes('Payment')) return DollarSign
                  return Activity
                }
                const Icon = getActivityIcon(activity.action)
                const colors = ['from-purple-500 to-indigo-600', 'from-emerald-500 to-teal-600', 'from-blue-500 to-cyan-600', 'from-amber-500 to-orange-600']
                const gradient = colors[index % colors.length]
                
                return (
                  <div 
                    key={`activity-${index}`} 
                    className="flex items-start gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100"
                  >
                    <div className={`p-3 rounded-lg bg-gradient-to-br ${gradient} shrink-0`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900">{activity.action}</p>
                      <p className="text-xs text-gray-600 mt-1 truncate">{activity.details}</p>
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap shrink-0">{activity.time}</span>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-12">
                <div className="relative">
                  <Bell className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <Sparkles className="h-6 w-6 text-blue-500 absolute top-0 right-1/3 animate-pulse" />
                </div>
                <p className="text-gray-600 font-medium">No recent activity</p>
                <p className="text-sm text-gray-400 mt-2">Activity will appear here as actions occur</p>
              </div>
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