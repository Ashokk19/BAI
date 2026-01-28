"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DatePopover } from "@/components/ui/date-popover"
import { CalendarIcon, Plus, Search, CreditCard, DollarSign, TrendingUp, Users, AlertCircle, Eye, Download, ChevronLeft, ChevronRight } from "lucide-react"
import { creditApi, CustomerCredit, CustomerCreditCreate } from "../../services/creditApi"
import { customerApi, Customer } from "../../services/customerApi"
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

// Using CustomerCredit interface from creditApi

export default function CreditTracking() {
  const notifications = useNotifications()
  const [credits, setCredits] = useState<CustomerCredit[]>([])
  const [allCredits, setAllCredits] = useState<CustomerCredit[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [expiryDate, setExpiryDate] = useState<Date>()
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const recordsPerPage = 10
  const [formData, setFormData] = useState({
    customer_id: 0,
    original_amount: 0,
    credit_reason: "",
    credit_type: "Adjustment",
  })

  // Load credits on component mount
  useEffect(() => {
    loadCredits()
    loadAllCredits()
    loadCustomers()
  }, [])

  // Reload when search or page changes
  useEffect(() => {
    loadCredits()
    // Don't reload allCredits on search - summary should always show all data
    // loadAllCredits()
  }, [searchTerm, currentPage])

  const loadCredits = async () => {
    try {
      setLoading(true)
      const skip = (currentPage - 1) * recordsPerPage
      const params: any = {
        limit: recordsPerPage,
        skip: skip,
        sort_by: 'id',
        sort_order: 'desc'
      }
      
      if (searchTerm) {
        params.search = searchTerm
      }

      const response = await creditApi.getCustomerCredits(params)
      setCredits(response.credits)
      
      // Calculate pagination info
      const total = response.total || response.credits?.length || 0
      setTotalRecords(total)
      setTotalPages(Math.ceil(total / recordsPerPage))
    } catch (error) {
      console.error('Error loading credits:', error)
      notifications.error('Loading Failed', 'Unable to load credits. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const loadAllCredits = async () => {
    try {
      // Use the same API call that works for the table, but without pagination
      const params: any = {
        limit: 1000, // Get all credits for summary calculations
        skip: 0
        // Remove sort_by and sort_order as they might be causing the 422 error
      }
      
      // Don't apply search filter for summary calculations
      // if (searchTerm) {
      //   params.search = searchTerm
      // }

      const response = await creditApi.getCustomerCredits(params)
      console.log('All credits loaded:', response.credits.length, response.credits)
      setAllCredits(response.credits)
    } catch (error) {
      console.error('Error loading all credits:', error)
      // If the API call fails, try to get credits from the existing credits array
      // This ensures we at least have some data for calculations
      if (credits.length > 0) {
        console.log('Using existing credits for summary calculations:', credits.length)
        setAllCredits(credits)
      }
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

  const handleCreateCredit = async () => {
    try {
      const creditData: CustomerCreditCreate = {
        customer_id: formData.customer_id,
        credit_date: selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        credit_type: formData.credit_type,
        credit_reason: formData.credit_reason,
        original_amount: formData.original_amount,
        remaining_amount: formData.original_amount,
        expiry_date: expiryDate ? expiryDate.toISOString().split('T')[0] : undefined,
      }

      await creditApi.createCustomerCredit(creditData)
      
      // Reset form
      setFormData({
        customer_id: 0,
        original_amount: 0,
        credit_reason: "",
        credit_type: "Adjustment",
      })
      setSelectedDate(undefined)
      setExpiryDate(undefined)
      setIsDialogOpen(false)
      
      // Reload data
      loadCredits()
      loadAllCredits()
      notifications.success('Credit Created!', 'The customer credit has been created successfully.')
    } catch (error) {
      console.error('Error creating credit:', error)
      notifications.error('Creation Failed', 'Unable to create customer credit. Please try again.')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800"
      case "Used":
        return "bg-gray-100 text-gray-800"
      case "Expired":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

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

  // Use allCredits if available, otherwise fall back to credits
  const creditsForCalculation = allCredits.length > 0 ? allCredits : credits
  
  const totalCredits = creditsForCalculation.length
  const totalCreditAmount = creditsForCalculation.reduce((sum, credit) => {
    const amount = typeof credit.original_amount === 'string' ? parseFloat(credit.original_amount) : credit.original_amount
    return sum + (isNaN(amount) ? 0 : amount)
  }, 0)
  const totalRemainingAmount = creditsForCalculation.reduce((sum, credit) => {
    const amount = typeof credit.remaining_amount === 'string' ? parseFloat(credit.remaining_amount) : credit.remaining_amount
    return sum + (isNaN(amount) ? 0 : amount)
  }, 0)
  const activeCredits = creditsForCalculation.filter((credit) => credit.status === "active").length

  // Debug logging
  console.log('Summary calculations:', {
    allCreditsLength: allCredits.length,
    creditsLength: credits.length,
    creditsForCalculationLength: creditsForCalculation.length,
    totalCredits,
    totalCreditAmount,
    totalRemainingAmount,
    activeCredits,
    sampleCredit: creditsForCalculation[0],
    sampleOriginalAmount: creditsForCalculation[0]?.original_amount,
    sampleRemainingAmount: creditsForCalculation[0]?.remaining_amount,
    sampleStatus: creditsForCalculation[0]?.status
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-700 bg-clip-text text-transparent">
            Credit Management
          </h1>
          <p className="text-gray-600 mt-1">Track and manage customer credits</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Credit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-xl border-white/20">
            <DialogHeader>
              <DialogTitle>Create Customer Credit</DialogTitle>
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
                  <Label htmlFor="amount">Credit Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.original_amount}
                    onChange={(e) => setFormData({ ...formData, original_amount: Number.parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="bg-white/50 border-white/20"
                  />
                </div>
              </div>
              <div>
                <Label>Credit Date</Label>
                <input
                  type="date"
                  value={selectedDate ? selectedDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => setSelectedDate(e.target.value ? new Date(e.target.value) : undefined)}
                  className="w-full p-2 border border-white/20 rounded-md bg-white/50"
                />
              </div>
              <div>
                <Label>Expiry Date (Optional)</Label>
                <input
                  type="date"
                  value={expiryDate ? expiryDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => setExpiryDate(e.target.value ? new Date(e.target.value) : undefined)}
                  className="w-full p-2 border border-white/20 rounded-md bg-white/50"
                />
              </div>
              <div>
                <Label htmlFor="type">Credit Type</Label>
                <Select
                  value={formData.credit_type}
                  onValueChange={(value: any) => setFormData({ ...formData, credit_type: value })}
                >
                  <SelectTrigger className="bg-white/50 border-white/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Return Credit">Return Credit</SelectItem>
                    <SelectItem value="Adjustment">Adjustment</SelectItem>
                    <SelectItem value="Promotional">Promotional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  value={formData.credit_reason}
                  onChange={(e) => setFormData({ ...formData, credit_reason: e.target.value })}
                  placeholder="Reason for credit"
                  className="bg-white/50 border-white/20"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateCredit} className="bg-gradient-to-r from-violet-500 to-purple-600">
                  Create Credit
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden group cursor-pointer hover:scale-105 transition-all duration-200">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-violet-600/20"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-gray-700">Total Credits</CardTitle>
            <div className="p-2 rounded-lg bg-violet-500/20">
              <CreditCard className="w-4 h-4 text-violet-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-violet-600">{totalCredits}</div>
            <p className="text-xs text-gray-600 mt-1">All credit records</p>
          </CardContent>
        </Card>

        <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden group cursor-pointer hover:scale-105 transition-all duration-200">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-600/20"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-gray-700">Total Credit Amount</CardTitle>
            <div className="p-2 rounded-lg bg-green-500/20">
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-green-600">₹{totalCreditAmount.toLocaleString()}</div>
            <p className="text-xs text-gray-600 mt-1">Total issued amount</p>
          </CardContent>
        </Card>

        <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden group cursor-pointer hover:scale-105 transition-all duration-200">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/20"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-gray-700">Remaining Amount</CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/20">
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-blue-600">₹{totalRemainingAmount.toLocaleString()}</div>
            <p className="text-xs text-gray-600 mt-1">Available balance</p>
          </CardContent>
        </Card>

        <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden group cursor-pointer hover:scale-105 transition-all duration-200">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-orange-600/20"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-gray-700">Active Credits</CardTitle>
            <div className="p-2 rounded-lg bg-orange-500/20">
              <Users className="w-4 h-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-orange-600">{activeCredits}</div>
            <p className="text-xs text-gray-600 mt-1">Currently active</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-white/40 backdrop-blur-3xl border-white/20 shadow-xl">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search credits..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 bg-white/50 border-white/20"
            />
          </div>
        </CardContent>
      </Card>

      {/* Credits Table */}
      <Card className="bg-white/40 backdrop-blur-3xl border-white/20 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Customer Credits ({totalRecords} total)
            </div>
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Credit Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Credit Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Used Amount</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600"></div>
                      <span className="ml-2">Loading credits...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : credits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="text-gray-500">No credits found</div>
                  </TableCell>
                </TableRow>
              ) : (
                credits.map((credit) => (
                  <TableRow key={credit.id}>
                    <TableCell>
                      <div className="font-medium">{credit.credit_number}</div>
                    </TableCell>
                    <TableCell>{getCustomerName(credit.customer_id)}</TableCell>
                    <TableCell>{formatDate(new Date(credit.credit_date), "MMM dd, yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{credit.credit_type}</Badge>
                    </TableCell>
                    <TableCell>₹{credit.original_amount.toLocaleString()}</TableCell>
                    <TableCell>₹{credit.used_amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <span className="font-medium text-green-600">₹{credit.remaining_amount.toLocaleString()}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(credit.status)}>{credit.status}</Badge>
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
                ))
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
