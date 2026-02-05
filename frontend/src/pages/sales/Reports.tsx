"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { 
  CalendarIcon, 
  Download, 
  FileSpreadsheet, 
  TrendingUp, 
  TrendingDown,
  IndianRupee,
  Users,
  Building2,
  FileText,
  Filter,
  RefreshCw
} from "lucide-react"
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from "date-fns"
import { invoiceApi, Invoice } from "../../services/invoiceApi"
import { customerApi, Customer } from "../../services/customerApi"
import { salesReturnApi, SalesReturn } from "../../services/salesReturnApi"
import { toast } from "sonner"

// Financial year helper (April to March in India)
const getFinancialYearDates = (year: number) => {
  return {
    start: new Date(year, 3, 1), // April 1
    end: new Date(year + 1, 2, 31) // March 31
  }
}

const getCurrentFinancialYear = () => {
  const now = new Date()
  const month = now.getMonth()
  // If month is Jan-March, FY started last year
  return month < 3 ? now.getFullYear() - 1 : now.getFullYear()
}

interface ReportSummary {
  totalSales: number
  totalPurchases: number
  netTurnover: number
  invoiceCount: number
  purchaseCount: number
  averageInvoiceValue: number
  gstCollected: number
  gstPaid: number
  totalReturns: number
  returnCount: number
  netSales: number
}

interface CustomerSummary {
  customerId: number
  customerName: string
  totalSales: number
  invoiceCount: number
  lastInvoiceDate: string
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState("sales")
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [salesReturns, setSalesReturns] = useState<SalesReturn[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filter states
  const [filterType, setFilterType] = useState<"financial_year" | "month" | "custom">("financial_year")
  const [selectedYear, setSelectedYear] = useState(getCurrentFinancialYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedMonthYear, setSelectedMonthYear] = useState(new Date().getFullYear())
  const [dateFrom, setDateFrom] = useState<Date | undefined>()
  const [dateTo, setDateTo] = useState<Date | undefined>()
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all")
  
  // Report data
  const [summary, setSummary] = useState<ReportSummary>({
    totalSales: 0,
    totalPurchases: 0,
    netTurnover: 0,
    invoiceCount: 0,
    purchaseCount: 0,
    averageInvoiceValue: 0,
    gstCollected: 0,
    gstPaid: 0,
    totalReturns: 0,
    returnCount: 0,
    netSales: 0
  })
  const [customerSummaries, setCustomerSummaries] = useState<CustomerSummary[]>([])

  // Get current date range based on filter type
  const getDateRange = useCallback(() => {
    switch (filterType) {
      case "financial_year":
        return getFinancialYearDates(selectedYear)
      case "month":
        const monthDate = new Date(selectedMonthYear, selectedMonth, 1)
        return {
          start: startOfMonth(monthDate),
          end: endOfMonth(monthDate)
        }
      case "custom":
        return {
          start: dateFrom || new Date(),
          end: dateTo || new Date()
        }
      default:
        return getFinancialYearDates(getCurrentFinancialYear())
    }
  }, [filterType, selectedYear, selectedMonth, selectedMonthYear, dateFrom, dateTo])

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const { start, end } = getDateRange()
      
      // Load invoices with date filter
      const invoiceResponse = await invoiceApi.getInvoices({
        date_from: format(start, 'yyyy-MM-dd'),
        date_to: format(end, 'yyyy-MM-dd'),
        limit: 10000
      })
      
      let filteredInvoices = invoiceResponse.invoices || []
      
      // Filter by customer if selected
      if (selectedCustomer !== "all") {
        filteredInvoices = filteredInvoices.filter(
          inv => inv.customer_id === parseInt(selectedCustomer)
        )
      }
      
      setInvoices(filteredInvoices)
      
      // Load sales returns
      const returnsResponse = await salesReturnApi.getSalesReturns({ limit: 10000 })
      let filteredReturns = returnsResponse.returns || []
      
      // Filter by customer if selected
      if (selectedCustomer !== "all") {
        filteredReturns = filteredReturns.filter(
          ret => ret.customer_name !== undefined // Returns don't have customer_id, filter by name if needed
        )
      }
      
      setSalesReturns(filteredReturns)
      
      // Load customers
      const customerResponse = await customerApi.getCustomers()
      setCustomers(customerResponse.customers || [])
      
      // Calculate summary with returns
      calculateSummary(filteredInvoices, filteredReturns)
      calculateCustomerSummaries(filteredInvoices)
      
    } catch (error) {
      console.error("Error loading report data:", error)
      toast.error("Failed to load report data")
    } finally {
      setLoading(false)
    }
  }, [getDateRange, selectedCustomer])

  const calculateSummary = (invoices: Invoice[], returns: SalesReturn[]) => {
    const totalSales = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
    const gstCollected = invoices.reduce((sum, inv) => sum + (inv.tax_amount || 0), 0)
    const totalReturns = returns.reduce((sum, ret) => sum + (ret.refund_amount || ret.total_return_amount || 0), 0)
    const netSales = totalSales - totalReturns
    
    setSummary({
      totalSales,
      totalPurchases: 0, // TODO: Add purchase data when available
      netTurnover: netSales,
      invoiceCount: invoices.length,
      purchaseCount: 0,
      averageInvoiceValue: invoices.length > 0 ? totalSales / invoices.length : 0,
      gstCollected,
      gstPaid: 0,
      totalReturns,
      returnCount: returns.length,
      netSales
    })
  }

  const calculateCustomerSummaries = (invoices: Invoice[]) => {
    const customerMap = new Map<number, CustomerSummary>()
    
    invoices.forEach(inv => {
      const existing = customerMap.get(inv.customer_id)
      if (existing) {
        existing.totalSales += inv.total_amount || 0
        existing.invoiceCount += 1
        if (new Date(inv.invoice_date) > new Date(existing.lastInvoiceDate)) {
          existing.lastInvoiceDate = inv.invoice_date
        }
      } else {
        customerMap.set(inv.customer_id, {
          customerId: inv.customer_id,
          customerName: inv.customer_name || 'Unknown',
          totalSales: inv.total_amount || 0,
          invoiceCount: 1,
          lastInvoiceDate: inv.invoice_date
        })
      }
    })
    
    const summaries = Array.from(customerMap.values())
      .sort((a, b) => b.totalSales - a.totalSales)
    
    setCustomerSummaries(summaries)
  }

  useEffect(() => {
    loadData()
  }, [loadData])

  // Export functions
  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast.error("No data to export")
      return
    }
    
    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header]
          // Handle values with commas or quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        }).join(',')
      )
    ].join('\n')
    
    // Add UTF-8 BOM for proper character display in Excel
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()
    
    toast.success("Report exported successfully")
  }

  const exportSalesReport = () => {
    const { start, end } = getDateRange()
    const reportData = invoices.map(inv => ({
      'Invoice Number': inv.invoice_number,
      'Date': format(new Date(inv.invoice_date), 'dd/MM/yyyy'),
      'Customer': inv.customer_name,
      'Subtotal': inv.subtotal?.toFixed(2) || '0.00',
      'Tax Amount': inv.tax_amount?.toFixed(2) || '0.00',
      'Total Amount': inv.total_amount?.toFixed(2) || '0.00',
      'Status': inv.status,
      'Payment Status': (inv as any).payment_status || inv.status || 'pending'
    }))
    
    const periodStr = filterType === 'financial_year' 
      ? `FY${selectedYear}-${selectedYear + 1}`
      : filterType === 'month'
        ? format(new Date(selectedMonthYear, selectedMonth), 'MMM-yyyy')
        : `${format(start, 'ddMMyyyy')}_to_${format(end, 'ddMMyyyy')}`
    
    exportToCSV(reportData, `Sales_Report_${periodStr}`)
  }

  const exportCustomerSummary = () => {
    const reportData = customerSummaries.map(cs => ({
      'Customer Name': cs.customerName,
      'Total Sales': cs.totalSales.toFixed(2),
      'Invoice Count': cs.invoiceCount,
      'Last Invoice Date': cs.lastInvoiceDate ? format(new Date(cs.lastInvoiceDate), 'dd/MM/yyyy') : '-'
    }))
    
    exportToCSV(reportData, 'Customer_Summary_Report')
  }

  const exportDetailedAuditReport = () => {
    const { start, end } = getDateRange()
    
    // Summary section with returns data
    const summaryData = [
      { 'Metric': 'Report Period', 'Value': `${format(start, 'dd/MM/yyyy')} to ${format(end, 'dd/MM/yyyy')}` },
      { 'Metric': 'Total Sales', 'Value': `Rs.${summary.totalSales.toFixed(2)}` },
      { 'Metric': 'Total Invoices', 'Value': summary.invoiceCount.toString() },
      { 'Metric': 'Average Invoice Value', 'Value': `Rs.${summary.averageInvoiceValue.toFixed(2)}` },
      { 'Metric': 'GST Collected', 'Value': `Rs.${summary.gstCollected.toFixed(2)}` },
      { 'Metric': 'Total Returns', 'Value': `Rs.${summary.totalReturns.toFixed(2)}` },
      { 'Metric': 'Return Count', 'Value': summary.returnCount.toString() },
      { 'Metric': 'Return Rate', 'Value': `${summary.totalSales > 0 ? ((summary.totalReturns / summary.totalSales) * 100).toFixed(2) : '0.00'}%` },
      { 'Metric': 'Net Sales (After Returns)', 'Value': `Rs.${summary.netSales.toFixed(2)}` },
      { 'Metric': 'Net Turnover', 'Value': `Rs.${summary.netTurnover.toFixed(2)}` },
    ]
    
    exportToCSV(summaryData, 'Audit_Summary_Report')
  }

  const exportReturnsReport = () => {
    const reportData = salesReturns.map(ret => ({
      'Return Number': ret.return_number,
      'Date': ret.return_date ? format(new Date(ret.return_date), 'dd/MM/yyyy') : '-',
      'Customer': ret.customer_name,
      'Invoice': ret.invoice_number,
      'Return Amount': (ret.total_return_amount || 0).toFixed(2),
      'Refund Amount': (ret.refund_amount || 0).toFixed(2),
      'Status': ret.status,
      'Refund Status': ret.refund_status,
      'Reason': ret.return_reason
    }))
    
    exportToCSV(reportData, 'Sales_Returns_Report')
  }

  // Generate year options for financial year dropdown
  const yearOptions = []
  const currentYear = new Date().getFullYear()
  for (let y = currentYear - 5; y <= currentYear + 1; y++) {
    yearOptions.push(y)
  }

  // Month options
  const monthOptions = [
    { value: 0, label: 'January' },
    { value: 1, label: 'February' },
    { value: 2, label: 'March' },
    { value: 3, label: 'April' },
    { value: 4, label: 'May' },
    { value: 5, label: 'June' },
    { value: 6, label: 'July' },
    { value: 7, label: 'August' },
    { value: 8, label: 'September' },
    { value: 9, label: 'October' },
    { value: 10, label: 'November' },
    { value: 11, label: 'December' },
  ]

  const { start: periodStart, end: periodEnd } = getDateRange()

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-25 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sales & Purchase Reports</h1>
            <p className="text-gray-600 mt-1">
              Generate reports for auditing and financial analysis
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Report Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Filter Type */}
              <div className="space-y-2">
                <Label>Report Period</Label>
                <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="financial_year">Financial Year</SelectItem>
                    <SelectItem value="month">Monthly</SelectItem>
                    <SelectItem value="custom">Custom Date Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Financial Year Selector */}
              {filterType === "financial_year" && (
                <div className="space-y-2">
                  <Label>Financial Year</Label>
                  <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map(year => (
                        <SelectItem key={year} value={year.toString()}>
                          FY {year}-{year + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Month Selector */}
              {filterType === "month" && (
                <>
                  <div className="space-y-2">
                    <Label>Month</Label>
                    <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {monthOptions.map(m => (
                          <SelectItem key={m.value} value={m.value.toString()}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Year</Label>
                    <Select value={selectedMonthYear.toString()} onValueChange={(v) => setSelectedMonthYear(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {yearOptions.map(year => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Custom Date Range */}
              {filterType === "custom" && (
                <>
                  <div className="space-y-2">
                    <Label>From Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'Select date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateFrom}
                          onSelect={setDateFrom}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>To Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateTo ? format(dateTo, 'dd/MM/yyyy') : 'Select date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateTo}
                          onSelect={setDateTo}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </>
              )}

              {/* Customer Filter */}
              <div className="space-y-2">
                <Label>Customer</Label>
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Customers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        {customer.company_name || `${customer.first_name} ${customer.last_name}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Period Display */}
            <div className="mt-4 p-3 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-700">
                <strong>Reporting Period:</strong> {format(periodStart, 'dd MMMM yyyy')} to {format(periodEnd, 'dd MMMM yyyy')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Sales</p>
                  <p className="text-2xl font-bold text-green-600">
                    ₹{summary.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Invoices</p>
                  <p className="text-2xl font-bold text-blue-600">{summary.invoiceCount}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Invoice Value</p>
                  <p className="text-2xl font-bold text-purple-600">
                    ₹{summary.averageInvoiceValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <IndianRupee className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">GST Collected</p>
                  <p className="text-2xl font-bold text-orange-600">
                    ₹{summary.gstCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-full">
                  <Building2 className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Returns & Net Sales Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Returns</p>
                  <p className="text-2xl font-bold text-red-600">
                    ₹{summary.totalReturns.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500">{summary.returnCount} returns</p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <TrendingDown className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Net Sales</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    ₹{summary.netSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500">Sales - Returns</p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-full">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Return Rate</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {summary.totalSales > 0 ? ((summary.totalReturns / summary.totalSales) * 100).toFixed(1) : '0.0'}%
                  </p>
                  <p className="text-xs text-gray-500">of total sales</p>
                </div>
                <div className="p-3 bg-amber-100 rounded-full">
                  <IndianRupee className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Export Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Export Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button onClick={exportSalesReport} className="bg-green-600 hover:bg-green-700">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Sales Report (CSV)
              </Button>
              <Button onClick={exportReturnsReport} className="bg-red-600 hover:bg-red-700">
                <TrendingDown className="w-4 h-4 mr-2" />
                Returns Report (CSV)
              </Button>
              <Button onClick={exportCustomerSummary} className="bg-blue-600 hover:bg-blue-700">
                <Users className="w-4 h-4 mr-2" />
                Customer Summary (CSV)
              </Button>
              <Button onClick={exportDetailedAuditReport} className="bg-purple-600 hover:bg-purple-700">
                <FileText className="w-4 h-4 mr-2" />
                Audit Summary (CSV)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for different views */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sales">Sales Transactions</TabsTrigger>
            <TabsTrigger value="returns">Sales Returns</TabsTrigger>
            <TabsTrigger value="customers">Customer Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="sales">
            <Card>
              <CardHeader>
                <CardTitle>Sales Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-gray-500">Loading...</div>
                ) : invoices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No sales data for selected period</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                          <TableHead className="text-right">Tax</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.slice(0, 50).map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                            <TableCell>{format(new Date(invoice.invoice_date), 'dd/MM/yyyy')}</TableCell>
                            <TableCell>{invoice.customer_name}</TableCell>
                            <TableCell className="text-right">₹{(invoice.subtotal || 0).toFixed(2)}</TableCell>
                            <TableCell className="text-right">₹{(invoice.tax_amount || 0).toFixed(2)}</TableCell>
                            <TableCell className="text-right font-semibold">₹{(invoice.total_amount || 0).toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                                {invoice.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {invoices.length > 50 && (
                      <p className="text-sm text-gray-500 mt-4 text-center">
                        Showing 50 of {invoices.length} records. Export to CSV for complete data.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="returns">
            <Card>
              <CardHeader>
                <CardTitle>Sales Returns</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-gray-500">Loading...</div>
                ) : salesReturns.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No returns data for selected period</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Return #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Invoice</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salesReturns.slice(0, 50).map((ret) => (
                          <TableRow key={ret.id}>
                            <TableCell className="font-medium">{ret.return_number}</TableCell>
                            <TableCell>{ret.return_date ? format(new Date(ret.return_date), 'dd/MM/yyyy') : '-'}</TableCell>
                            <TableCell>{ret.customer_name}</TableCell>
                            <TableCell>{ret.invoice_number}</TableCell>
                            <TableCell className="text-right font-semibold text-red-600">
                              ₹{(ret.refund_amount || ret.total_return_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>
                              <Badge variant={ret.status === 'processed' ? 'default' : 'secondary'}>
                                {ret.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[150px] truncate">{ret.return_reason}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {salesReturns.length > 50 && (
                      <p className="text-sm text-gray-500 mt-4 text-center">
                        Showing 50 of {salesReturns.length} records. Export to CSV for complete data.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers">
            <Card>
              <CardHeader>
                <CardTitle>Customer Sales Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-gray-500">Loading...</div>
                ) : customerSummaries.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No customer data for selected period</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead className="text-right">Total Sales</TableHead>
                          <TableHead className="text-right">Invoice Count</TableHead>
                          <TableHead>Last Invoice</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerSummaries.map((cs) => (
                          <TableRow key={cs.customerId}>
                            <TableCell className="font-medium">{cs.customerName}</TableCell>
                            <TableCell className="text-right font-semibold text-green-600">
                              ₹{cs.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right">{cs.invoiceCount}</TableCell>
                            <TableCell>
                              {cs.lastInvoiceDate ? format(new Date(cs.lastInvoiceDate), 'dd/MM/yyyy') : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer note for auditing */}
        <div className="text-center text-sm text-gray-500 mt-8">
          <p>Reports generated are suitable for auditing and GST compliance purposes.</p>
          <p>Financial Year in India: April 1 to March 31</p>
        </div>
      </div>
    </div>
  )
}
