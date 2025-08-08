"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Search, FileText, Eye, Download, Send, TrendingUp, DollarSign, Clock, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { invoiceApi, Invoice, InvoiceFilters } from "../../services/invoiceApi"
import { customerApi, Customer } from "../../services/customerApi"

// Currency formatting utility
const formatCurrency = (amount: number | string): string => {
  // Convert to number and handle potential NaN or null values
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  
  // Handle invalid numbers
  if (isNaN(numericAmount) || numericAmount === null || numericAmount === undefined) {
    return '₹0.00'
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numericAmount)
}

// Safe number conversion utility
const safeNumber = (value: number | string): number => {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return isNaN(num) || num === null || num === undefined ? 0 : num
}

// Native date formatting utility
const formatDate = (date: Date, format: string) => {
  if (format === "yyyy-MM-dd") {
    return date.toISOString().split('T')[0]
  }
  
  if (format === "PPP") {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
  
  if (format === "MMM dd, yyyy") {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    })
  }
  
  return date.toLocaleDateString()
}

export default function InvoiceHistory() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})

  // Load invoices and customers on component mount
  useEffect(() => {
    loadInvoices()
    loadCustomers()
  }, [])

  // Reload invoices when filters change
  useEffect(() => {
    loadInvoices()
  }, [searchTerm, statusFilter, dateRange])

  const loadInvoices = async () => {
    try {
      setLoading(true)
      const filters: InvoiceFilters = {
        limit: 100,
        skip: 0
      }
      
      if (searchTerm) {
        filters.search = searchTerm
      }
      
      if (statusFilter !== "all") {
        filters.status = statusFilter
      }
      
      if (dateRange.from) {
        filters.date_from = dateRange.from.toISOString().split('T')[0]
      }
      
      if (dateRange.to) {
        filters.date_to = dateRange.to.toISOString().split('T')[0]
      }

      const response = await invoiceApi.getInvoices(filters)
      setInvoices(response.invoices)
    } catch (error) {
      console.error('Error loading invoices:', error)
      toast.error('Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }

  const loadCustomers = async () => {
    try {
      const response = await customerApi.getCustomers({ limit: 1000 })
      setCustomers(response.customers)
    } catch (error) {
      console.error('Error loading customers:', error)
    }
  }

  const getCustomerName = (customerId: number): string => {
    const customer = customers.find(c => c.id === customerId)
    if (customer) {
      return customer.company_name || `${customer.first_name} ${customer.last_name}`
    }
    return 'Unknown Customer'
  }

  // Calculate totals with safe number conversion
  const totalAmount = invoices.reduce((sum, invoice) => sum + safeNumber(invoice.total_amount), 0)
  const paidAmount = invoices
    .filter((invoice) => invoice.is_paid)
    .reduce((sum, invoice) => sum + safeNumber(invoice.total_amount), 0)
  const pendingAmount = totalAmount - paidAmount

  // Calculate additional metrics
  const overdueInvoices = invoices.filter(invoice => {
    if (!invoice.due_date || invoice.is_paid) return false
    return new Date(invoice.due_date) < new Date()
  }).length

  const handleSendReminder = (invoiceId: number) => {
    toast.success("Payment reminder sent!")
  }

  const handleViewInvoice = (invoiceId: number) => {
    // TODO: Implement view invoice functionality
    toast.info("View invoice functionality coming soon!")
  }

  const handleDownloadInvoice = (invoiceId: number) => {
    // TODO: Implement download invoice functionality
    toast.info("Download invoice functionality coming soon!")
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return "bg-green-100 text-green-800 border-green-200"
      case "sent":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "draft":
        return "bg-gray-100 text-gray-800 border-gray-200"
      case "overdue":
        return "bg-red-100 text-red-800 border-red-200"
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
              Invoice History
            </h1>
            <p className="text-gray-600 text-lg">Track and manage all your invoices efficiently</p>
          </div>
        </div>

        {/* Enhanced Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white/60 backdrop-blur-xl border-white/30 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Invoices</p>
                  <p className="text-3xl font-bold text-gray-900">{invoices.length}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {overdueInvoices > 0 && `${overdueInvoices} overdue`}
                  </p>
                </div>
                <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-violet-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/60 backdrop-blur-xl border-white/30 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Amount</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
                  <p className="text-xs text-green-600 mt-1 flex items-center">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    All time revenue
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/60 backdrop-blur-xl border-white/30 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Paid Amount</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(paidAmount)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {totalAmount > 0 ? `${((paidAmount / totalAmount) * 100).toFixed(1)}% collected` : '0% collected'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/60 backdrop-blur-xl border-white/30 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Pending Amount</p>
                  <p className="text-2xl font-bold text-orange-600">{formatCurrency(pendingAmount)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {invoices.filter(i => !i.is_paid).length} invoices pending
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Filters */}
        <Card className="bg-white/60 backdrop-blur-xl border-white/30 shadow-xl">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search by invoice number, customer..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/70 border-white/30 focus:bg-white focus:border-violet-300"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48 bg-white/70 border-white/30 focus:bg-white focus:border-violet-300">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="bg-white/70 border-white/30 hover:bg-white hover:border-violet-300">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    Date Range
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="range" numberOfMonths={2} />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Invoice Table */}
        <Card className="bg-white/60 backdrop-blur-xl border-white/30 shadow-xl">
          <CardHeader className="border-b border-white/20 bg-white/30">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-violet-600" />
              </div>
              Invoices ({invoices.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/20 bg-gray-50/30">
                    <TableHead className="font-semibold text-gray-700">Invoice Number</TableHead>
                    <TableHead className="font-semibold text-gray-700">Customer</TableHead>
                    <TableHead className="font-semibold text-gray-700">Invoice Date</TableHead>
                    <TableHead className="font-semibold text-gray-700">Due Date</TableHead>
                    <TableHead className="font-semibold text-gray-700">Amount</TableHead>
                    <TableHead className="font-semibold text-gray-700">Status</TableHead>
                    <TableHead className="font-semibold text-gray-700">Payment</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
                          <span className="ml-3 text-gray-600">Loading invoices...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12">
                        <div className="text-gray-500">
                          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p className="text-lg font-medium">No invoices found</p>
                          <p className="text-sm">Try adjusting your search or filters</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoices.map((invoice) => (
                      <TableRow key={invoice.id} className="border-white/20 hover:bg-white/50 transition-colors">
                        <TableCell>
                          <div className="font-semibold text-gray-900">{invoice.invoice_number}</div>
                          <div className="text-sm text-gray-500">{invoice.items?.length || 0} items</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-gray-800">{getCustomerName(invoice.customer_id)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-gray-700">{formatDate(new Date(invoice.invoice_date), "MMM dd, yyyy")}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-gray-700">
                            {invoice.due_date ? formatDate(new Date(invoice.due_date), "MMM dd, yyyy") : 'No due date'}
                            {invoice.due_date && new Date(invoice.due_date) < new Date() && !invoice.is_paid && (
                              <span className="block text-xs text-red-600 font-medium">Overdue</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-gray-900">{formatCurrency(invoice.total_amount)}</div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(invoice.status)} font-medium`}>
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={invoice.is_paid ? "default" : "secondary"} 
                                 className={invoice.is_paid ? "bg-green-100 text-green-800 border-green-200" : ""}>
                            {invoice.is_paid ? "Paid" : safeNumber(invoice.balance_due) > 0 ? "Pending" : "Partial"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-center">
                            <Button size="sm" variant="outline" onClick={() => handleViewInvoice(invoice.id)} 
                                    className="hover:bg-blue-50 hover:border-blue-300">
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDownloadInvoice(invoice.id)}
                                    className="hover:bg-green-50 hover:border-green-300">
                              <Download className="w-3 h-3" />
                            </Button>
                            {!invoice.is_paid && (
                              <Button size="sm" variant="outline" onClick={() => handleSendReminder(invoice.id)}
                                      className="hover:bg-orange-50 hover:border-orange-300">
                                <Send className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
