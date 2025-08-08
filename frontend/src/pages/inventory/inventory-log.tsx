"use client"

import { useState, useEffect } from "react"
import { ScrollText, Search, Filter, Plus, Minus, Edit, AlertTriangle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { inventoryApi, type InventoryLog } from "@/services/inventoryApi"
import { toast } from "sonner"

// Use the InventoryLog interface from the API service

export default function InventoryLog() {
  const [logEntries, setLogEntries] = useState<InventoryLog[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [actionFilter, setActionFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = async () => {
    try {
      setIsLoading(true)
      const data = await inventoryApi.getInventoryLogs()
      setLogEntries(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching logs:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch logs')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const filteredEntries = logEntries.filter((entry) => {
    const matchesSearch =
      entry.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.item_sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.user_name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesAction = actionFilter === "all" || entry.action === actionFilter

    return matchesSearch && matchesAction
  })

  const getActionBadge = (action: string) => {
    switch (action) {
      case "added":
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <Plus className="w-3 h-3 mr-1" />
            Added
          </Badge>
        )
      case "updated":
        return (
          <Badge className="bg-blue-500 hover:bg-blue-600">
            <Edit className="w-3 h-3 mr-1" />
            Updated
          </Badge>
        )
      case "removed":
        return (
          <Badge variant="destructive">
            <Minus className="w-3 h-3 mr-1" />
            Removed
          </Badge>
        )
      case "stock_in":
        return (
          <Badge className="bg-violet-500 hover:bg-violet-600">
            <Plus className="w-3 h-3 mr-1" />
            Stock In
          </Badge>
        )
      case "stock_out":
        return (
          <Badge className="bg-orange-500 hover:bg-orange-600">
            <Minus className="w-3 h-3 mr-1" />
            Stock Out
          </Badge>
        )
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const getActionCounts = () => {
    return {
      added: logEntries.filter((entry) => entry.action === "added").length,
      updated: logEntries.filter((entry) => entry.action === "updated").length,
      removed: logEntries.filter((entry) => entry.action === "removed").length,
      stockIn: logEntries.filter((entry) => entry.action === "stock_in").length,
      stockOut: logEntries.filter((entry) => entry.action === "stock_out").length,
    }
  }

  const actionCounts = getActionCounts()

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
              <p className="text-gray-600 font-medium">Loading inventory logs...</p>
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
              <h3 className="text-lg font-bold text-gray-900 mb-2">Error Loading Logs</h3>
              <p className="text-gray-600 font-medium mb-4">{error}</p>
              <Button onClick={fetchLogs} className="bg-gradient-to-r from-violet-500 to-purple-600">
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Inventory Log</h1>
          <p className="text-gray-600 font-medium">Track all inventory changes and user activities • {logEntries.length} log entries</p>
        </div>

        {/* Activity Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-600/20"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-semibold text-gray-700">Added</CardTitle>
              <Plus className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-bold text-green-600">{actionCounts.added}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/20"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-semibold text-gray-700">Updated</CardTitle>
              <Edit className="w-4 h-4 text-blue-600" />
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-bold text-blue-600">{actionCounts.updated}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-red-600/20"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-semibold text-gray-700">Removed</CardTitle>
              <Minus className="w-4 h-4 text-red-600" />
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-bold text-red-600">{actionCounts.removed}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-violet-600/20"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-semibold text-gray-700">Stock In</CardTitle>
              <Plus className="w-4 h-4 text-violet-600" />
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-bold text-violet-600">{actionCounts.stockIn}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-orange-600/20"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-semibold text-gray-700">Stock Out</CardTitle>
              <Minus className="w-4 h-4 text-orange-600" />
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-bold text-orange-600">{actionCounts.stockOut}</div>
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
                  placeholder="Search by item name, SKU, or user..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/50 border-white/60"
                />
              </div>
              <div className="flex gap-2 items-center">
                <Filter className="w-4 h-4 text-gray-500" />
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-40 bg-white/50 border-white/60">
                    <SelectValue placeholder="Filter by action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="added">Added</SelectItem>
                    <SelectItem value="updated">Updated</SelectItem>
                    <SelectItem value="removed">Removed</SelectItem>
                    <SelectItem value="stock_in">Stock In</SelectItem>
                    <SelectItem value="stock_out">Stock Out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Log Table */}
        <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60">
          <CardHeader>
            <CardTitle className="flex items-center">
              <ScrollText className="w-5 h-5 mr-2 text-violet-600" />
              Activity Log ({filteredEntries.length} entries)
            </CardTitle>
            <CardDescription>Complete history of inventory changes and user activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Quantity Change</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => (
                    <TableRow key={entry.id} className="hover:bg-white/20">
                      <TableCell>
                        <div>
                          <div className="font-medium">{entry.item_name}</div>
                          <div className="text-sm text-gray-500 font-mono">{entry.item_sku}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getActionBadge(entry.action)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>
                              {entry.user_name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm">{entry.user_name}</div>
                            <div className="text-xs text-gray-500">User ID: {entry.user_id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {entry.quantity_before !== undefined && entry.quantity_after !== undefined ? (
                          <div className="space-y-1">
                            <div
                              className={`font-semibold ${
                                entry.quantity_after > entry.quantity_before ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {entry.quantity_after > entry.quantity_before ? "+" : ""}
                              {entry.quantity_after - entry.quantity_before}
                            </div>
                            <div className="text-xs text-gray-500">
                              {entry.quantity_before} → {entry.quantity_after}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate text-sm text-gray-600">{entry.notes || "-"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{new Date(entry.created_at).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500">{new Date(entry.created_at).toLocaleTimeString()}</div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {filteredEntries.length === 0 && !isLoading && (
          <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden mt-8">
            <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-white/20"></div>
            <CardContent className="text-center py-12 relative z-10">
              <ScrollText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">No log entries found</h3>
              <p className="text-gray-600 font-medium">No activity logs match your search criteria</p>
            </CardContent>
          </Card>
        )}
        
        {/* Footer spacing */}
        <div className="h-20"></div>
      </div>
    </div>
  )
}
