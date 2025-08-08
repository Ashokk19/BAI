"use client"

import { useState, useEffect } from "react"
import { AlertTriangle, Calendar, Search, Filter, Package, Clock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { inventoryApi, type ExpiryItem, type ItemCategory } from "@/services/inventoryApi"
import { toast } from "sonner"

export default function ExpiryTracking() {
  const [items, setItems] = useState<ExpiryItem[]>([])
  const [categories, setCategories] = useState<ItemCategory[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchExpiryData = async () => {
    try {
      setIsLoading(true)
      const [expiryData, categoriesData] = await Promise.all([
        inventoryApi.getExpiryTracking(),
        inventoryApi.getCategories()
      ])
      
      setItems(expiryData)
      setCategories(categoriesData)
      setError(null)
    } catch (err) {
      console.error('Error fetching expiry data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch expiry data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchExpiryData()
  }, [])

  const getCategoryName = (categoryId: number) => {
    const category = categories.find(cat => cat.id === categoryId)
    return category ? category.name : 'Unknown'
  }

  const filteredItems = items.filter((item) => {
    const categoryName = getCategoryName(item.category_id)
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      categoryName.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || item.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "expired":
        return <Badge variant="destructive">Expired</Badge>
      case "expiring-soon":
        return <Badge className="bg-orange-500 hover:bg-orange-600">Expiring Soon</Badge>
      case "warning":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Warning</Badge>
      case "good":
        return <Badge className="bg-green-500 hover:bg-green-600">Good</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const getStatusCounts = () => {
    return {
      expired: items.filter((item) => item.status === "expired").length,
      expiringSoon: items.filter((item) => item.status === "expiring-soon").length,
      warning: items.filter((item) => item.status === "warning").length,
      good: items.filter((item) => item.status === "good").length,
    }
  }

  const statusCounts = getStatusCounts()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-25 to-indigo-50 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-r from-violet-100 to-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-r from-purple-50 to-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-1000"></div>
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        <div className="relative z-10 p-8 flex items-center justify-center min-h-screen">
          <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60">
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Loading expiry data...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-25 to-indigo-50 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-r from-violet-100 to-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-r from-purple-50 to-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-1000"></div>
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        <div className="relative z-10 p-8 flex items-center justify-center min-h-screen">
          <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Error Loading Expiry Data</h3>
              <p className="text-gray-600 font-medium mb-4">{error}</p>
              <Button onClick={fetchExpiryData} className="bg-gradient-to-r from-violet-500 to-purple-600">
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-25 to-indigo-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-r from-violet-100 to-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-r from-purple-50 to-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-1000"></div>
      </div>

      {/* Enhanced grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

      {/* Main Content */}
      <div className="p-8 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Proactive Expiry Tracking</h1>
          <p className="text-gray-600 font-medium">Monitor product expiry dates and prevent waste • {items.length} items with expiry dates</p>
        </div>

        {/* Status Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-red-600/20"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-semibold text-gray-700">Expired Items</CardTitle>
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-bold text-red-600">{statusCounts.expired}</div>
              <p className="text-xs text-gray-600 mt-1">Immediate attention required</p>
            </CardContent>
          </Card>

          <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-orange-600/20"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-semibold text-gray-700">Expiring Soon</CardTitle>
              <Clock className="w-4 h-4 text-orange-600" />
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-bold text-orange-600">{statusCounts.expiringSoon}</div>
              <p className="text-xs text-gray-600 mt-1">Within 7 days</p>
            </CardContent>
          </Card>

          <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-yellow-600/20"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-semibold text-gray-700">Warning</CardTitle>
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-bold text-yellow-600">{statusCounts.warning}</div>
              <p className="text-xs text-gray-600 mt-1">Within 30 days</p>
            </CardContent>
          </Card>

          <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-600/20"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-semibold text-gray-700">Good</CardTitle>
              <Package className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-bold text-green-600">{statusCounts.good}</div>
              <p className="text-xs text-gray-600 mt-1">More than 30 days</p>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card className="mb-6 bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search items by name, SKU, or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/50 border-white/60"
                />
              </div>
              <div className="flex gap-2 items-center">
                <Filter className="w-4 h-4 text-gray-500" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40 bg-white/50 border-white/60">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="expiring-soon">Expiring Soon</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expiry Table */}
        <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-violet-600" />
              Expiry Tracking ({filteredItems.length} items)
            </CardTitle>
            <CardDescription>Monitor product expiry dates and take proactive action</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Days Until Expiry</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id} className="hover:bg-white/20">
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-medium">
                          {getCategoryName(item.category_id)}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{new Date(item.expiry_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <span
                          className={`font-semibold ${
                            item.days_until_expiry < 0
                              ? "text-red-600"
                              : item.days_until_expiry <= 7
                                ? "text-orange-600"
                                : item.days_until_expiry <= 30
                                  ? "text-yellow-600"
                                  : "text-green-600"
                          }`}
                        >
                          {item.days_until_expiry < 0
                            ? `${Math.abs(item.days_until_expiry)} days ago`
                            : `${item.days_until_expiry} days`}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                          {item.current_stock}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {filteredItems.length === 0 && !isLoading && (
          <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden mt-8">
            <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-white/20"></div>
            <CardContent className="text-center py-12 relative z-10">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">No expiry data found</h3>
              <p className="text-gray-600 font-medium">No items with expiry dates match your criteria</p>
            </CardContent>
          </Card>
        )}
        
        {/* Footer spacing */}
        <div className="h-20"></div>
      </div>
    </div>
  )
}
