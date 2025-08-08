"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Plus, Search, Receipt, Eye, Download } from "lucide-react"
import { paymentApi, Payment as ApiPayment, PaymentCreate } from "../../services/paymentApi"
import { customerApi, Customer } from "../../services/customerApi"
import { useNotifications, NotificationContainer } from "../../components/ui/notification"

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

// Using Payment interface from paymentApi as ApiPayment

export default function PaymentLog() {
  const notifications = useNotifications()
  const [payments, setPayments] = useState<ApiPayment[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [formData, setFormData] = useState({
    customer_id: 0,
    amount: 0,
    payment_method: "Bank Transfer",
    reference_number: "",
    notes: "",
  })

  // Load payments on component mount
  useEffect(() => {
    loadPayments()
    loadCustomers()
  }, [])

  // Reload when search changes
  useEffect(() => {
    loadPayments()
  }, [searchTerm])

  const loadPayments = async () => {
    try {
      setLoading(true)
      const params: any = {
        limit: 100,
        skip: 0
      }
      
      if (searchTerm) {
        params.search = searchTerm
      }

      const response = await paymentApi.getPayments(params)
      setPayments(response.payments)
    } catch (error) {
      console.error('Error loading payments:', error)
      notifications.error('Loading Failed', 'Unable to load payments. Please check your connection.')
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

  const [statusFilter, setStatusFilter] = useState("all")
  const [methodFilter, setMethodFilter] = useState("all")

  const getCustomerName = (customerId?: number): string => {
    if (!customerId) return 'N/A'
    const customer = customers.find(c => c.id === customerId)
    if (customer) {
      return customer.company_name || `${customer.first_name} ${customer.last_name}`
    }
    return 'Unknown Customer'
  }

  const handleCreatePayment = () => {
    const newPayment: ApiPayment = {
      id: payments.length + 1,
      payment_number: `PAY-2024-${String(payments.length + 1).padStart(3, "0")}`,
      customer_name: getCustomerName(formData.customer_id),
      payment_date: selectedDate ? formatDate(selectedDate, "yyyy-MM-dd") : new Date().toISOString().split("T")[0],
      amount: formData.amount,
      payment_method: formData.payment_method,
      payment_status: "completed",
      reference_number: formData.reference_number,
      notes: formData.notes,
      customer_id: formData.customer_id,
    }
    setPayments([...payments, newPayment])
    setIsDialogOpen(false)
    notifications.success('Payment Recorded!', 'The payment has been successfully recorded.')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800"
      case "Pending":
        return "bg-yellow-100 text-yellow-800"
      case "Failed":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Filter payments based on search term and filters
  const filteredPayments = payments.filter(payment => {
    const matchesSearch = !searchTerm || 
      payment.payment_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.reference_number?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || payment.payment_status?.toLowerCase() === statusFilter.toLowerCase()
    const matchesMethod = methodFilter === "all" || payment.payment_method?.toLowerCase() === methodFilter.toLowerCase()
    
    return matchesSearch && matchesStatus && matchesMethod
  })

  const totalPayments = payments.length
  const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0)
  const completedPayments = payments.filter((payment) => payment.payment_status === "completed").length
  const pendingPayments = payments.filter((payment) => payment.payment_status === "pending").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-700 bg-clip-text text-transparent">
            Payment Log
          </h1>
          <p className="text-gray-600 mt-1">Track and manage customer payments</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Record Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-xl border-white/20">
            <DialogHeader>
              <DialogTitle>Record New Payment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer">Customer</Label>
                  <Select
                    value={formData.customer_id.toString()}
                    onValueChange={(value) => setFormData({ ...formData, customer_id: parseInt(value) })}
                  >
                    <SelectTrigger className="bg-white/50 border-white/20">
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(customer => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.company_name || `${customer.first_name} ${customer.last_name}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="bg-white/50 border-white/20"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Payment Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number.parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="bg-white/50 border-white/20"
                  />
                </div>
                <div>
                  <Label htmlFor="method">Payment Method</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(value: any) => setFormData({ ...formData, payment_method: value })}
                  >
                    <SelectTrigger className="bg-white/50 border-white/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Payment Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start bg-white/50 border-white/20">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? formatDate(selectedDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="reference">Reference Number</Label>
                <Input
                  id="reference"
                  value={formData.reference_number}
                  onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                  placeholder="Transaction/Reference number"
                  className="bg-white/50 border-white/20"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreatePayment} className="bg-gradient-to-r from-violet-500 to-purple-600">
                  Record Payment
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-white/40 backdrop-blur-3xl border-white/20 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Payments</p>
                <p className="text-2xl font-bold text-gray-900">{totalPayments}</p>
              </div>
              <Receipt className="w-8 h-8 text-violet-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/40 backdrop-blur-3xl border-white/20 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900">₹{totalAmount.toLocaleString()}</p>
              </div>
              <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center">
                <span className="text-violet-600 font-bold">₹</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/40 backdrop-blur-3xl border-white/20 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{completedPayments}</p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold">✓</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/40 backdrop-blur-3xl border-white/20 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-orange-600">{pendingPayments}</p>
              </div>
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-orange-600 font-bold">⏳</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white/40 backdrop-blur-3xl border-white/20 shadow-xl">
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search payments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/50 border-white/20"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48 bg-white/50 border-white/20">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-48 bg-white/50 border-white/20">
                <SelectValue placeholder="Filter by method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank transfer">Bank Transfer</SelectItem>
                <SelectItem value="credit card">Credit Card</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card className="bg-white/40 backdrop-blur-3xl border-white/20 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Payment Records ({filteredPayments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Payment Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <div className="font-medium">{payment.payment_number}</div>
                  </TableCell>
                  <TableCell>{payment.customer_name || 'N/A'}</TableCell>
                  <TableCell>{payment.invoice_id ? `INV-${payment.invoice_id}` : 'N/A'}</TableCell>
                  <TableCell>{formatDate(new Date(payment.payment_date), "MMM dd, yyyy")}</TableCell>
                  <TableCell>₹{payment.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{payment.payment_method}</Badge>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">{payment.reference_number || 'N/A'}</code>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(payment.payment_status)}>{payment.payment_status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Download className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Notification Container */}
      <NotificationContainer position="top-right" />
    </div>
  )
}
