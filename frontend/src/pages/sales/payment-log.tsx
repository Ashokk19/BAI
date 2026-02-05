"use client"

import React, { useState, useEffect } from "react"
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
import { CalendarIcon, Plus, Search, Receipt, Eye, Download, Edit, Trash2, ChevronDown, ChevronRight, ChevronLeft } from "lucide-react"
import { paymentApi, Payment as ApiPayment, PaymentCreate } from "../../services/paymentApi"
import { customerApi, Customer } from "../../services/customerApi"
import { invoiceApi, Invoice } from "../../services/invoiceApi"
import { useNotifications, NotificationContainer } from "../../components/ui/notification"

// Native date formatting utility
const formatDate = (date: Date, format: string) => {
  if (format === "yyyy-MM-dd") {
    return date.toISOString().split('T')[0]
  }
  
  if (format === "dd/mm/yyyy") {
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
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
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>()
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const recordsPerPage = 10
  
  // Invoice search states
  const [invoiceSearch, setInvoiceSearch] = useState("")
  const [showInvoiceDropdown, setShowInvoiceDropdown] = useState(false)
  
  // Edit/Delete states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<ApiPayment | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [paymentToDelete, setPaymentToDelete] = useState<ApiPayment | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  
  const [formData, setFormData] = useState({
    customer_id: 0,
    invoice_id: 0,
    invoice_amount: 0,
    amount_paid: 0,
    payment_method: "Bank Transfer",
    reference_number: "",
    notes: "",
  })

  // Load payments on component mount
  useEffect(() => {
    loadPayments()
    loadCustomers()
    loadInvoices()
  }, [])



  // Reload when search or page changes
  useEffect(() => {
    loadPayments()
  }, [searchTerm, currentPage])

  const loadPayments = async () => {
    try {
      setLoading(true)
      // Load all payments to group them properly
      const params: any = {
        limit: 1000, // Load all payments to group them
        skip: 0
      }
      
      // Note: Backend doesn't support search parameter, so we filter on frontend
      const response = await paymentApi.getPayments(params)
      setPayments(response.payments)
      
      // Group payments by invoice ID to count main rows
      const groupedPayments = response.payments.reduce((groups: {[key: string]: typeof response.payments}, payment) => {
        const invoiceId = payment.invoice_id ? payment.invoice_id.toString() : 'no-invoice'
        if (!groups[invoiceId]) {
          groups[invoiceId] = []
        }
        groups[invoiceId].push(payment)
        return groups
      }, {})
      
      // Count unique invoice groups (main rows)
      const totalGroups = Object.keys(groupedPayments).length
      setTotalRecords(totalGroups)
      setTotalPages(Math.ceil(totalGroups / recordsPerPage))
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

  const loadInvoices = async () => {
    try {
      const response = await invoiceApi.getInvoices({ limit: 1000 })
      setInvoices(response.invoices)
    } catch (error) {
      console.error('Error loading invoices:', error)
    }
  }

  const [statusFilter, setStatusFilter] = useState("all")
  const [methodFilter, setMethodFilter] = useState("all")

  // Handle tile clicks for filtering
  const handleTileClick = (filterType: string) => {
    if (filterType === 'all') {
      setStatusFilter('all')
    } else if (filterType === 'completed') {
      setStatusFilter('completed')
    } else if (filterType === 'partial') {
      setStatusFilter('partial')
    } else if (filterType === 'pending') {
      setStatusFilter('pending')
    }
    // Clear search when filtering
    setSearchTerm('')
  }

  // Create pending payments for existing invoices
  const handleCreatePendingForInvoices = async () => {
    try {
      const response = await paymentApi.createPendingForInvoices()
      notifications.success('Pending Payments Created!', response.message)
      await loadPayments() // Reload payments to show new pending records
    } catch (error) {
      console.error('Error creating pending payments:', error)
      notifications.error('Creation Failed', 'Failed to create pending payments for invoices')
    }
  }

  const getCustomerName = (customerId?: number): string => {
    if (!customerId) return 'N/A'
    const customer = customers.find(c => c.id === customerId)
    if (customer) {
      return customer.company_name || `${customer.first_name} ${customer.last_name}`
    }
    return 'Unknown Customer'
  }

  const getInvoiceNumber = (invoiceId: number): string => {
    const invoice = invoices.find(i => i.id === invoiceId)
    return invoice ? invoice.invoice_number : 'Unknown Invoice'
  }

  const getFullInvoiceName = (invoiceId: number): string => {
    const invoice = invoices.find(i => i.id === invoiceId)
    if (!invoice) return 'Unknown Invoice'
    
    const customerName = getCustomerName(invoice.customer_id)
    return `${invoice.invoice_number} - ${customerName}`
  }

  const getInvoiceAmount = (invoiceId: number): number => {
    const invoice = invoices.find(i => i.id === invoiceId)
    return invoice ? invoice.total_amount : 0
  }

  const getBalanceAmount = (invoiceId: number): number => {
    const invoiceAmount = getInvoiceAmount(invoiceId)
    const paidAmount = getTotalPaidAmount(invoiceId)
    return invoiceAmount - paidAmount
  }

  const getTotalPaidAmount = (invoiceId: number): number => {
    return payments
      .filter(payment => payment.invoice_id === invoiceId && payment.payment_status !== 'pending')
      .reduce((sum, payment) => {
        const amount = typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount
        return sum + amount
      }, 0)
  }

  const getPaymentStatus = (invoiceId: number): string => {
    const invoiceAmount = getInvoiceAmount(invoiceId)
    const invoicePayments = payments.filter(payment => payment.invoice_id === invoiceId)
    
    // Use the same logic as getTotalAmountPaidForInvoice
    let totalPaid = 0
    let hasCreditPayments = false
    
    invoicePayments.forEach(payment => {
      const paymentAmount = typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount
      
      // Check if this is a credit payment
      if (payment.payment_status === 'credit' || payment.payment_method === 'credit') {
        hasCreditPayments = true
        // For credit payments, DON'T add to totalPaid - it's a loan, not actual payment
      } else if (payment.payment_status !== 'pending') {
        // Only add to totalPaid if it's NOT a credit payment and NOT pending
        totalPaid += paymentAmount
      }
    })
    
    // Check if there are any pending payments
    const hasPendingPayments = invoicePayments.some(payment => payment.payment_status === 'pending')
    
    // If there are credit payments, show as "Credit" regardless of paid amount
    if (hasCreditPayments) {
      return 'Credit'
    }
    
    // For non-credit payments, check if fully paid
    if (totalPaid >= invoiceAmount) {
      return 'Completed'
    } else if (totalPaid > 0) {
      return 'Partial'
    } else if (hasPendingPayments) {
      return 'Pending'
    } else {
      return 'Pending'
    }
  }

  const toggleGroupExpansion = (invoiceId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(invoiceId)) {
        newSet.delete(invoiceId)
      } else {
        newSet.add(invoiceId)
      }
      return newSet
    })
  }

  // Filter functions for searchable dropdowns
  const getFilteredInvoices = () => {
    if (!invoiceSearch) return invoices;
    return invoices.filter(invoice => {
      const invoiceNumber = invoice.invoice_number.toLowerCase();
      const customerName = getCustomerName(invoice.customer_id).toLowerCase();
      const searchLower = invoiceSearch.toLowerCase();
      return invoiceNumber.includes(searchLower) || customerName.includes(searchLower);
    });
  }

  // Handle invoice selection
  const handleInvoiceChange = (invoiceId: number) => {
    const invoiceAmount = getInvoiceAmount(invoiceId)
    const balanceAmount = getBalanceAmount(invoiceId)
    setFormData(prev => ({ 
      ...prev, 
      invoice_id: invoiceId, 
      invoice_amount: invoiceAmount,
      amount_paid: balanceAmount // Pre-populate with balance amount
    }))
    setInvoiceSearch('') // Clear search when invoice is selected
    setShowInvoiceDropdown(false)
    
    if (invoiceId > 0) {
      const selectedInvoice = invoices.find(i => i.id === invoiceId)
      if (selectedInvoice) {
        // Auto-populate invoice amount from invoice
        setFormData(prev => ({ 
          ...prev, 
          invoice_id: invoiceId,
          invoice_amount: selectedInvoice.total_amount,
          amount_paid: selectedInvoice.total_amount, // Default to full amount
          customer_id: selectedInvoice.customer_id
        }))
      }
    }
  }

  // Handle invoice input changes
  const handleInvoiceInputChange = (value: string) => {
    setInvoiceSearch(value);
    setShowInvoiceDropdown(true);
    // Clear selected invoice if user starts typing
    if (value && formData.invoice_id > 0) {
      setFormData(prev => ({ ...prev, invoice_id: 0 }));
    }
  };

  // Get display value for invoice input
  const getInvoiceInputValue = () => {
    if (formData.invoice_id > 0) {
      const invoice = invoices.find(i => i.id === formData.invoice_id)
      if (invoice) {
        return `${invoice.invoice_number} - ${getCustomerName(invoice.customer_id)}`
      }
    }
    return invoiceSearch;
  };

  // Calculate total amount paid for a specific invoice and check payment types
  const getTotalAmountPaidForInvoice = (invoiceId: number): { totalPaid: number, hasCreditPayments: boolean } => {
    const invoicePayments = payments.filter(payment => payment.invoice_id === invoiceId)
    let totalPaid = 0
    let hasCreditPayments = false
    
    invoicePayments.forEach(payment => {
      const paymentAmount = typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount
      
      // Check if this is a credit payment
      if (payment.payment_status === 'credit' || payment.payment_method === 'credit') {
        hasCreditPayments = true
        // For credit payments, DON'T add to totalPaid - it's a loan, not actual payment
      } else {
        // Only add to totalPaid if it's NOT a credit payment
        totalPaid += paymentAmount
      }
    })
    
    return { totalPaid, hasCreditPayments }
  }

  // Determine payment status based on cumulative amount paid vs invoice amount
  const calculatePaymentStatus = (amountPaid: number, invoiceAmount: number, invoiceId?: number, isNewPayment: boolean = false): string => {
    // Ensure we're comparing numbers
    const paid = typeof amountPaid === 'string' ? parseFloat(amountPaid) : amountPaid
    const invoice = typeof invoiceAmount === 'string' ? parseFloat(invoiceAmount) : invoiceAmount
    
    if (invoiceId && !isNewPayment) {
      // For existing payments in the table, calculate cumulative amount paid
      const { totalPaid, hasCreditPayments } = getTotalAmountPaidForInvoice(invoiceId)
      
      // If there are credit payments, show as "Credit" regardless of paid amount
      if (hasCreditPayments) {
        return "Credit"
      }
      
      // For non-credit payments, check if fully paid
      if (totalPaid >= invoice) {
        return "Completed"
      } else if (totalPaid > 0) {
        return "Partial"
      } else {
        return "Pending"
      }
    } else {
      // For new payments or form display, use the individual amount
      if (paid >= invoice) {
        return "Completed"
      } else if (paid > 0) {
        return "Partial"
      } else {
        return "Pending"
      }
    }
  }

  const resetForm = () => {
    setFormData({
      customer_id: 0,
      invoice_id: 0,
      invoice_amount: 0,
      amount_paid: 0,
      payment_method: "Bank Transfer",
      reference_number: "",
      notes: "",
    })
    setSelectedDate(undefined)
    setInvoiceSearch("")
    setShowInvoiceDropdown(false)
  }

  const handleCreatePayment = async () => {
    try {
      const paymentData = {
        payment_date: selectedDate ? formatDate(selectedDate, "yyyy-MM-dd") : new Date().toISOString().split("T")[0],
        payment_type: "customer",
        payment_direction: "received",
        amount: formData.amount_paid,
        payment_method: formData.payment_method,
        payment_status: calculatePaymentStatus(formData.amount_paid, formData.invoice_amount, formData.invoice_id, true),
        reference_number: formData.reference_number,
        notes: formData.notes,
        invoice_id: formData.invoice_id > 0 ? formData.invoice_id : undefined,
        customer_id: formData.customer_id,
      }

      await paymentApi.createPayment(paymentData)
      await loadPayments() // Reload payments from database
      setIsDialogOpen(false)
      resetForm()
      notifications.success('Payment Recorded!', 'The payment has been successfully recorded.')
    } catch (error) {
      console.error('Error creating payment:', error)
      notifications.error('Creation Failed', 'Unable to record payment. Please try again.')
    }
  }

  const handleEditPayment = (payment: ApiPayment) => {
    setEditingPayment(payment)
    setFormData({
      customer_id: payment.customer_id || 0,
      invoice_id: payment.invoice_id || 0,
      invoice_amount: getInvoiceAmount(payment.invoice_id || 0),
      amount_paid: payment.amount,
      payment_method: payment.payment_method || "Bank Transfer",
      reference_number: payment.reference_number || "",
      notes: payment.notes || "",
    })
    setSelectedDate(new Date(payment.payment_date))
    setIsEditDialogOpen(true)
  }

  const handleUpdatePayment = async () => {
    if (!editingPayment) return

    try {
      const paymentData = {
        payment_date: selectedDate ? formatDate(selectedDate, "yyyy-MM-dd") : new Date().toISOString().split("T")[0],
        payment_type: "customer",
        payment_direction: "received",
        amount: formData.amount_paid,
        currency: "INR",
        payment_method: formData.payment_method,
        payment_status: calculatePaymentStatus(formData.amount_paid, formData.invoice_amount, formData.invoice_id, true),
        reference_number: formData.reference_number,
        notes: formData.notes,
        invoice_id: formData.invoice_id > 0 ? formData.invoice_id : undefined,
        customer_id: formData.customer_id > 0 ? formData.customer_id : undefined,
      }

      await paymentApi.updatePayment(editingPayment.id, paymentData)
      await loadPayments() // Reload payments from database
      setIsEditDialogOpen(false)
      setEditingPayment(null)
      resetForm()
      notifications.success('Payment Updated!', 'The payment has been successfully updated.')
    } catch (error) {
      console.error('Error updating payment:', error)
      notifications.error('Update Failed', 'Failed to update payment. Please try again.')
    }
  }

  const handleDeleteClick = (payment: ApiPayment) => {
    setPaymentToDelete(payment)
    setDeleteDialogOpen(true)
  }

  const handleDeletePayment = async () => {
    if (!paymentToDelete) return

    try {
      await paymentApi.deletePayment(paymentToDelete.id)
      await loadPayments() // Reload payments from database
      setDeleteDialogOpen(false)
      setPaymentToDelete(null)
      notifications.success('Payment Deleted!', 'The payment has been successfully deleted.')
    } catch (error) {
      console.error('Error deleting payment:', error)
      notifications.error('Delete Failed', 'Failed to delete payment. Please try again.')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800"
      case "Credit":
        return "bg-orange-100 text-orange-800"
      case "Partial":
        return "bg-blue-100 text-blue-800"
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
      payment.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getInvoiceNumber(payment.invoice_id || 0).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getFullInvoiceName(payment.invoice_id || 0).toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || 
      payment.payment_status?.toLowerCase() === statusFilter.toLowerCase() ||
      (statusFilter === "pending" && payment.payment_method === "pending")
    const matchesMethod = methodFilter === "all" || payment.payment_method?.toLowerCase() === methodFilter.toLowerCase()
    
    return matchesSearch && matchesStatus && matchesMethod
  })

  // Group payments by invoice ID
  const groupedPayments = filteredPayments.reduce((groups: {[key: string]: typeof filteredPayments}, payment) => {
    const invoiceId = payment.invoice_id ? payment.invoice_id.toString() : 'no-invoice'
    if (!groups[invoiceId]) {
      groups[invoiceId] = []
    }
    groups[invoiceId].push(payment)
    return groups
  }, {})

  // Sort groups by invoice ID in descending order (latest first, no-invoice group at the end)
  const sortedGroupKeys = Object.keys(groupedPayments).sort((a, b) => {
    if (a === 'no-invoice') return 1
    if (b === 'no-invoice') return -1
    
    // Sort by invoice ID in descending order (latest first)
    const invoiceIdA = parseInt(a)
    const invoiceIdB = parseInt(b)
    
    return invoiceIdB - invoiceIdA
  })

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  // Reset to first page when search changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }

  const totalPayments = payments.length
  const totalAmount = payments.reduce((sum, payment) => {
    // Ensure we're adding numbers, not concatenating strings
    const amount = typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount
    return sum + amount
  }, 0)
  const completedPayments = payments.filter((payment) => 
    payment.payment_status === "Completed" || 
    (payment.payment_status === "completed" && payment.payment_method !== "pending")
  ).length
  const partialPayments = payments.filter((payment) => 
    payment.payment_status === "Partial" || 
    payment.payment_status === "partial"
  ).length
  const pendingPayments = payments.filter((payment) => 
    payment.payment_status === "Pending" || 
    payment.payment_status === "pending" ||
    payment.payment_method === "pending"
  ).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-25 to-indigo-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-r from-violet-100 to-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-r from-purple-50 to-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-indigo-50 to-violet-100 rounded-full mix-blend-multiply filter blur-3xl opacity-25 animate-pulse delay-500"></div>
      </div>

      {/* Enhanced grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

      <div className="relative z-10 p-8 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payment Log</h1>
            <p className="text-gray-600 font-medium mt-1">Track and manage customer payments • {payments.length} payments total</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={handleCreatePendingForInvoices}
              className="bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 hover:bg-white/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Pending for Invoices
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            resetForm();
          }
        }}>
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
                  <Label htmlFor="invoice">Invoice</Label>
                  <div className="relative">
                    <Input
                      placeholder="Search invoices..."
                      value={getInvoiceInputValue()}
                      onChange={(e) => handleInvoiceInputChange(e.target.value)}
                      onFocus={() => setShowInvoiceDropdown(true)}
                      onBlur={() => setTimeout(() => setShowInvoiceDropdown(false), 200)}
                      className="w-full bg-white/50 border-white/20"
                    />
                    {showInvoiceDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {getFilteredInvoices().map(invoice => (
                          <div
                            key={invoice.id}
                            onClick={() => handleInvoiceChange(invoice.id)}
                            className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium text-gray-900">
                              {invoice.invoice_number}
                            </div>
                            <div className="text-sm text-gray-500">
                              {getCustomerName(invoice.customer_id)}
                            </div>
                            <div className="text-xs text-gray-400">
                              ₹{invoice.total_amount.toLocaleString()} • {new Date(invoice.invoice_date).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                        {getFilteredInvoices().length === 0 && (
                          <div className="p-3 text-gray-500 text-sm">No invoices found</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invoice_amount">Invoice Amount</Label>
                  <Input
                    id="invoice_amount"
                    type="number"
                    value={formData.invoice_amount}
                    onChange={(e) => setFormData({ ...formData, invoice_amount: Number.parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="bg-white/50 border-white/20"
                    readOnly
                  />
                </div>
                <div>
                  <Label htmlFor="amount_paid">Amount Paid</Label>
                  <Input
                    id="amount_paid"
                    type="number"
                    value={formData.amount_paid}
                    onChange={(e) => setFormData({ ...formData, amount_paid: Number.parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="bg-white/50 border-white/20"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <Label>Payment Status</Label>
                  <div className="flex items-center h-10 px-3 bg-white/50 border border-white/20 rounded-md">
                    <Badge className={getStatusColor(calculatePaymentStatus(formData.amount_paid, formData.invoice_amount, formData.invoice_id, true))}>
                      {calculatePaymentStatus(formData.amount_paid, formData.invoice_amount, formData.invoice_id, true)}
                    </Badge>
                  </div>
                </div>
              </div>
              <div>
                <Label>Payment Date</Label>
                <input
                  type="date"
                  value={selectedDate ? formatDate(selectedDate, "yyyy-MM-dd") : ''}
                  onChange={(e) => setSelectedDate(e.target.value ? new Date(e.target.value) : undefined)}
                  className="w-full p-2 border border-white/20 rounded-md bg-white/50"
                />
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
                <Button variant="outline" onClick={() => {
                  setIsDialogOpen(false)
                  resetForm()
                }}>
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
        </div>

        {/* Edit Payment Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            setEditingPayment(null);
            resetForm();
          }
        }}>
          <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-xl border-white/20">
            <DialogHeader>
              <DialogTitle>Edit Payment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invoice">Invoice</Label>
                  <Input
                    value={formData.invoice_id > 0 ? getFullInvoiceName(formData.invoice_id) : 'No invoice selected'}
                    className="w-full bg-gray-100 border-gray-300"
                    readOnly
                  />
                </div>
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invoice_amount">Invoice Amount</Label>
                  <Input
                    id="invoice_amount"
                    type="number"
                    value={formData.invoice_amount}
                    onChange={(e) => setFormData({ ...formData, invoice_amount: Number.parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="bg-white/50 border-white/20"
                    readOnly
                  />
                </div>
                <div>
                  <Label htmlFor="amount_paid">Amount Paid</Label>
                  <Input
                    id="amount_paid"
                    type="number"
                    value={formData.amount_paid}
                    onChange={(e) => setFormData({ ...formData, amount_paid: Number.parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="bg-white/50 border-white/20"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <Label>Payment Status</Label>
                  <div className="flex items-center h-10 px-3 bg-white/50 border border-white/20 rounded-md">
                    <Badge className={getStatusColor(calculatePaymentStatus(formData.amount_paid, formData.invoice_amount, formData.invoice_id, true))}>
                      {calculatePaymentStatus(formData.amount_paid, formData.invoice_amount, formData.invoice_id, true)}
                    </Badge>
                  </div>
                </div>
              </div>
              <div>
                <Label>Payment Date</Label>
                <input
                  type="date"
                  value={selectedDate ? formatDate(selectedDate, "yyyy-MM-dd") : ''}
                  onChange={(e) => setSelectedDate(e.target.value ? new Date(e.target.value) : undefined)}
                  className="w-full p-2 border border-white/20 rounded-md bg-white/50"
                />
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
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes"
                  className="bg-white/50 border-white/20"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => {
                  setIsEditDialogOpen(false)
                  setEditingPayment(null)
                  resetForm()
                }}>
                  Cancel
                </Button>
                <Button onClick={handleUpdatePayment} className="bg-gradient-to-r from-violet-500 to-purple-600">
                  Update Payment
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-md bg-white/95 backdrop-blur-xl border-white/20">
            <DialogHeader>
              <DialogTitle>Delete Payment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-gray-600">
                Are you sure you want to delete payment <strong>{paymentToDelete?.payment_number}</strong>? 
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleDeletePayment} variant="destructive">
                  Delete Payment
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
        {[
          {
            title: "Total Payments",
            value: totalPayments.toString(),
            icon: Receipt,
            description: "All payment records",
            color: "blue",
            filterType: "all"
          },
          {
            title: "Total Amount",
            value: `₹${totalAmount.toLocaleString()}`,
            icon: Receipt,
            description: "Total amount received",
            color: "violet",
            filterType: "all"
          },
          {
            title: "Completed",
            value: completedPayments.toString(),
            icon: Receipt,
            description: "Fully paid invoices",
            color: "green",
            filterType: "completed"
          },
          {
            title: "Partial",
            value: partialPayments.toString(),
            icon: Receipt,
            description: "Partially paid invoices",
            color: "yellow",
            filterType: "partial"
          },
          {
            title: "Pending",
            value: pendingPayments.toString(),
            icon: Receipt,
            description: "Pending payments",
            color: "red",
            filterType: "pending"
          }
        ].map((stat) => {
          const isSelected = (stat.filterType === "all" && statusFilter === "all") ||
                            (stat.filterType === "completed" && statusFilter === "completed") ||
                            (stat.filterType === "partial" && statusFilter === "partial") ||
                            (stat.filterType === "pending" && statusFilter === "pending");
          
          return (
            <Card 
              key={stat.title} 
              className={`bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl hover:bg-white/50 hover:shadow-2xl transition-all duration-300 ring-1 ring-white/60 relative overflow-hidden group cursor-pointer hover:scale-105 ${
                isSelected ? 'ring-2 ring-violet-500 shadow-2xl' : ''
              }`}
              onClick={() => handleTileClick(stat.filterType)}
            >
            <div className={`absolute inset-0 ${
              stat.color === "blue" ? "bg-gradient-to-br from-blue-500/10 to-blue-600/20" : 
              stat.color === "violet" ? "bg-gradient-to-br from-violet-500/10 to-violet-600/20" : 
              stat.color === "green" ? "bg-gradient-to-br from-green-500/10 to-green-600/20" : 
              stat.color === "yellow" ? "bg-gradient-to-br from-yellow-500/10 to-yellow-600/20" : 
              "bg-gradient-to-br from-red-500/10 to-red-600/20"
            }`}></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-semibold text-gray-700">{stat.title}</CardTitle>
              
              <div className={`p-2 rounded-lg ${
                stat.color === "blue" ? "bg-blue-500/20" : 
                stat.color === "violet" ? "bg-violet-500/20" : 
                stat.color === "green" ? "bg-green-500/20" : 
                stat.color === "yellow" ? "bg-yellow-500/20" : 
                "bg-red-500/20"
              }`}>
                <stat.icon className={`w-4 h-4 ${
                  stat.color === "blue" ? "text-blue-600" : 
                  stat.color === "violet" ? "text-violet-600" : 
                  stat.color === "green" ? "text-green-600" : 
                  stat.color === "yellow" ? "text-yellow-600" : 
                  "text-red-600"
                }`} />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
              <p className="text-xs text-gray-600 mt-2 font-medium">{stat.description}</p>
            </CardContent>
          </Card>
        );
        })}
      </div>

      {/* Search and Filter */}
      <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-white/20"></div>
        <CardContent className="p-6 relative z-10">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search payments by number, customer, or reference..."
                className="pl-10 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 placeholder:text-gray-600 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 h-12 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <div className="relative">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="pl-10 pr-4 py-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 h-12 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-md appearance-none w-40">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="relative">
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="pl-10 pr-4 py-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 h-12 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-md appearance-none w-40">
                  <SelectValue placeholder="All Methods" />
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
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-white/20"></div>
        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center justify-between text-gray-900">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Payment Records ({totalRecords} total)
            </div>
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Invoice Amount</TableHead>
                <TableHead>Paid Amount</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Payments</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedGroupKeys.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage).map((invoiceId) => {
                const groupPayments = groupedPayments[invoiceId]
                const isNoInvoiceGroup = invoiceId === 'no-invoice'
                const invoiceNumber = isNoInvoiceGroup ? 'No Invoice' : getInvoiceNumber(parseInt(invoiceId))
                const totalGroupAmount = groupPayments.reduce((sum, payment) => {
                  const amount = typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount
                  return sum + amount
                }, 0)

                const invoiceIdNum = isNoInvoiceGroup ? 0 : parseInt(invoiceId)
                const customerName = isNoInvoiceGroup ? 'N/A' : getCustomerName(groupPayments[0].customer_id)
                const invoiceAmount = isNoInvoiceGroup ? 0 : getInvoiceAmount(invoiceIdNum)
                
                // Calculate paid amount excluding credit payments (same logic as getTotalAmountPaidForInvoice)
                let paidAmount = 0
                groupPayments.forEach(payment => {
                  const paymentAmount = typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount
                  
                  // Add to paidAmount for all completed payments (including credit)
                  if (payment.payment_status === 'completed' || payment.payment_status === 'credit') {
                    paidAmount += paymentAmount
                  }
                })
                
                const balanceAmount = Math.max(0, invoiceAmount - paidAmount)
                const paymentStatus = isNoInvoiceGroup ? 'N/A' : getPaymentStatus(invoiceIdNum)
                const isExpanded = expandedGroups.has(invoiceId)
                
                // Check if any payment was made with credit
                const hasCreditPayment = groupPayments.some(payment => 
                  payment.payment_method?.toLowerCase() === 'credit' || 
                  payment.payment_status?.toLowerCase() === 'credit'
                )

                return (
                  <React.Fragment key={invoiceId}>
                    {/* Main Invoice Row */}
                    <TableRow 
                      className="bg-white hover:bg-gray-50 cursor-pointer border-b-2"
                      onClick={() => toggleGroupExpansion(invoiceId)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          {invoiceNumber}
                        </div>
                      </TableCell>
                      <TableCell>{customerName}</TableCell>
                      <TableCell>₹{invoiceAmount.toLocaleString()}</TableCell>
                      <TableCell>₹{paidAmount.toLocaleString()}</TableCell>
                      <TableCell>₹{balanceAmount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {groupPayments.length} payment{groupPayments.length !== 1 ? 's' : ''}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(paymentStatus)}>
                          {paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (!isNoInvoiceGroup) {
                              handleInvoiceChange(invoiceIdNum)
                              setIsDialogOpen(true)
                            }
                          }}
                          disabled={isNoInvoiceGroup || paymentStatus === "Completed" || hasCreditPayment}
                          title={hasCreditPayment ? "Invoice paid with credit - no additional payment needed" : ""}
                        >
                          Add Payment
                        </Button>
                      </TableCell>
                    </TableRow>
                    
                    {/* Expanded Sub-Payment Rows */}
                    {isExpanded && groupPayments.map((payment) => (
                      <TableRow key={payment.id} className="bg-gray-50 border-l-4 border-l-blue-200">
                        <TableCell className="pl-8">
                          <div className="text-sm text-gray-600">{payment.payment_number}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{formatDate(new Date(payment.payment_date), "MMM dd, yyyy")}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{payment.payment_method}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">₹{payment.amount.toLocaleString()}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{payment.reference_number || 'N/A'}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {payment.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(
                            payment.payment_status === "completed" ? "Completed" :
                            payment.payment_status === "pending" ? "Pending" :
                            payment.payment_status === "credit" ? "Credit" :
                            payment.payment_status === "partial" ? "Partial" : "Completed"
                          )}>
                            {payment.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditPayment(payment)
                              }}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteClick(payment)
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                )
              })}
              {payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="text-gray-500">No payments found</div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/20">
            <div className="text-sm text-gray-600">
              Showing {((currentPage - 1) * recordsPerPage) + 1} to {Math.min(currentPage * recordsPerPage, totalRecords)} of {totalRecords} results
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className="bg-white/50 border-white/30 hover:bg-white/70"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      className={
                        currentPage === pageNum
                          ? "bg-violet-600 hover:bg-violet-700 text-white"
                          : "bg-white/50 border-white/30 hover:bg-white/70"
                      }
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="bg-white/50 border-white/30 hover:bg-white/70"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
      
      {/* Notification Container */}
      <NotificationContainer position="top-right" />
    </div>
  )
}
