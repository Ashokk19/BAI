"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Plus, Search, RotateCcw, Eye, Download, Package, ArrowLeft, CheckCircle, XCircle } from "lucide-react"
import { format } from "date-fns"
import { salesReturnApi, SalesReturn as ApiSalesReturn, SalesReturnCreate } from "../../services/salesReturnApi"
import { customerApi, Customer } from "../../services/customerApi"
import { useNotifications, NotificationContainer } from "../../components/ui/notification"

// Using SalesReturn interface from salesReturnApi as ApiSalesReturn

export default function SalesReturns() {
  const notifications = useNotifications()
  const [returns, setReturns] = useState<ApiSalesReturn[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [formData, setFormData] = useState({
    customer_id: 0,
    invoice_id: 0,
    return_reason: "",
    refund_method: "Credit Note",
    total_return_amount: 0,
    refund_amount: 0,
  })

  // Load sales returns on component mount
  useEffect(() => {
    loadSalesReturns()
    loadCustomers()
  }, [])

  // Reload when search changes
  useEffect(() => {
    loadSalesReturns()
  }, [searchTerm])

  const loadSalesReturns = async () => {
    try {
      setLoading(true)
      const params: any = {
        limit: 100,
        skip: 0
      }
      
      if (searchTerm) {
        params.search = searchTerm
      }

      const response = await salesReturnApi.getSalesReturns(params)
      setReturns(response.returns)
    } catch (error) {
      console.error('Error loading sales returns:', error)
      notifications.error('Loading Failed', 'Unable to load sales returns. Please check your connection.')
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

  const handleCreateReturn = async () => {
    try {
      const returnData: SalesReturnCreate = {
        invoice_id: formData.invoice_id,
        customer_id: formData.customer_id,
        return_date: selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        return_reason: formData.return_reason,
        total_return_amount: formData.total_return_amount,
        refund_amount: formData.refund_amount,
        refund_method: formData.refund_method,
        items: [] // Would need to be populated based on form
      }

      await salesReturnApi.createSalesReturn(returnData)
      
      // Reset form
      setFormData({
        customer_id: 0,
        invoice_id: 0,
        return_reason: "",
        refund_method: "Credit Note",
        total_return_amount: 0,
        refund_amount: 0,
      })
      setSelectedDate(undefined)
      setIsDialogOpen(false)
      
      // Reload data
      loadSalesReturns()
      notifications.success('Sales Return Created!', 'The sales return has been created successfully.')
    } catch (error) {
      console.error('Error creating sales return:', error)
      notifications.error('Creation Failed', 'Unable to create sales return. Please try again.')
    }
  }

  const updateStatus = async (id: number, status: string) => {
    try {
      // TODO: Implement status update API call when available
      notifications.success('Status Updated!', `Return status changed to ${status}.`)
      loadSalesReturns() // Reload to get updated data
    } catch (error) {
      console.error('Error updating status:', error)
      notifications.error('Update Failed', 'Unable to update return status. Please try again.')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Processed":
        return "bg-green-100 text-green-800"
      case "Approved":
        return "bg-blue-100 text-blue-800"
      case "Pending":
        return "bg-yellow-100 text-yellow-800"
      case "Rejected":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const totalReturns = returns.length
  const totalRefundAmount = returns.reduce((sum, returnItem) => sum + returnItem.refund_amount, 0)
  const pendingReturns = returns.filter((returnItem) => returnItem.status === "pending").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-700 bg-clip-text text-transparent">
            Sales Returns
          </h1>
          <p className="text-gray-600 mt-1">Manage product returns and refunds</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Return
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-xl border-white/20">
            <DialogHeader>
              <DialogTitle>Create Sales Return</DialogTitle>
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
                  <Label htmlFor="invoice">Invoice ID</Label>
                  <Input
                    id="invoice"
                    type="number"
                    value={formData.invoice_id || ''}
                    onChange={(e) => setFormData({ ...formData, invoice_id: parseInt(e.target.value) || 0 })}
                    placeholder="Enter invoice ID"
                    className="bg-white/50 border-white/20"
                  />
                </div>
              </div>
              <div>
                <Label>Return Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start bg-white/50 border-white/20">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="reason">Return Reason</Label>
                <Textarea
                  id="reason"
                  value={formData.return_reason}
                  onChange={(e) => setFormData({ ...formData, return_reason: e.target.value })}
                  placeholder="Reason for return"
                  className="bg-white/50 border-white/20"
                />
              </div>
              <div>
                <Label htmlFor="refundMethod">Refund Method</Label>
                <Select
                  value={formData.refund_method}
                  onValueChange={(value: any) => setFormData({ ...formData, refund_method: value })}
                >
                  <SelectTrigger className="bg-white/50 border-white/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Credit Note">Credit Note</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateReturn} className="bg-gradient-to-r from-violet-500 to-purple-600">
                  Create Return
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white/40 backdrop-blur-3xl border-white/20 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Returns</p>
                <p className="text-2xl font-bold text-gray-900">{totalReturns}</p>
              </div>
              <RotateCcw className="w-8 h-8 text-violet-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/40 backdrop-blur-3xl border-white/20 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Refund Amount</p>
                <p className="text-2xl font-bold text-red-600">₹{totalRefundAmount.toLocaleString()}</p>
              </div>
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 font-bold">₹</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/40 backdrop-blur-3xl border-white/20 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Returns</p>
                <p className="text-2xl font-bold text-orange-600">{pendingReturns}</p>
              </div>
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-orange-600 font-bold">⏳</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-white/40 backdrop-blur-3xl border-white/20 shadow-xl">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search returns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/50 border-white/20"
            />
          </div>
        </CardContent>
      </Card>

      {/* Returns Table */}
      <Card className="bg-white/40 backdrop-blur-3xl border-white/20 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5" />
            Sales Returns ({returns.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Return Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Return Date</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Refund Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600"></div>
                      <span className="ml-2">Loading sales returns...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : returns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="text-gray-500">No sales returns found</div>
                  </TableCell>
                </TableRow>
              ) : (
                returns.map((returnItem) => (
                  <TableRow key={returnItem.id}>
                    <TableCell>
                      <div className="font-medium">{returnItem.return_number}</div>
                    </TableCell>
                    <TableCell>{returnItem.customer_name}</TableCell>
                    <TableCell>{returnItem.invoice_number}</TableCell>
                    <TableCell>{format(new Date(returnItem.return_date), "MMM dd, yyyy")}</TableCell>
                    <TableCell>
                      <div className="max-w-32 truncate" title={returnItem.return_reason}>
                        {returnItem.return_reason}
                      </div>
                    </TableCell>
                    <TableCell>₹{returnItem.refund_amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Select
                        value={returnItem.status}
                        onValueChange={(value: any) => updateStatus(returnItem.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                          <SelectItem value="processed">Processed</SelectItem>
                        </SelectContent>
                      </Select>
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
      </Card>
      
      {/* Notification Container */}
      <NotificationContainer position="top-right" />
    </div>
  )
}
