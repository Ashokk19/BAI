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
import { CalendarIcon, Plus, Search, CreditCard, DollarSign, TrendingUp, Users, AlertCircle, Eye, Download } from "lucide-react"
import { creditApi, CustomerCredit, CustomerCreditCreate } from "../../services/creditApi"
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

// Using CustomerCredit interface from creditApi

export default function CreditTracking() {
  const notifications = useNotifications()
  const [credits, setCredits] = useState<CustomerCredit[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [expiryDate, setExpiryDate] = useState<Date>()
  const [formData, setFormData] = useState({
    customer_id: 0,
    original_amount: 0,
    credit_reason: "",
    credit_type: "Adjustment",
  })

  // Load credits on component mount
  useEffect(() => {
    loadCredits()
    loadCustomers()
  }, [])

  // Reload when search changes
  useEffect(() => {
    loadCredits()
  }, [searchTerm])

  const loadCredits = async () => {
    try {
      setLoading(true)
      const params: any = {
        limit: 100,
        skip: 0
      }
      
      if (searchTerm) {
        params.search = searchTerm
      }

      const response = await creditApi.getCustomerCredits(params)
      setCredits(response.credits)
    } catch (error) {
      console.error('Error loading credits:', error)
      notifications.error('Loading Failed', 'Unable to load credits. Please check your connection.')
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

  const totalCredits = credits.length
  const totalCreditAmount = credits.reduce((sum, credit) => sum + credit.original_amount, 0)
  const totalRemainingAmount = credits.reduce((sum, credit) => sum + credit.remaining_amount, 0)
  const activeCredits = credits.filter((credit) => credit.status === "active").length

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
                <Label>Expiry Date (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start bg-white/50 border-white/20">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expiryDate ? formatDate(expiryDate, "PPP") : "Pick expiry date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={expiryDate} onSelect={setExpiryDate} initialFocus />
                  </PopoverContent>
                </Popover>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-white/40 backdrop-blur-3xl border-white/20 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Credits</p>
                <p className="text-2xl font-bold text-gray-900">{totalCredits}</p>
              </div>
              <CreditCard className="w-8 h-8 text-violet-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/40 backdrop-blur-3xl border-white/20 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Credit Amount</p>
                <p className="text-2xl font-bold text-gray-900">₹{totalCreditAmount.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-violet-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/40 backdrop-blur-3xl border-white/20 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Remaining Amount</p>
                <p className="text-2xl font-bold text-green-600">₹{totalRemainingAmount.toLocaleString()}</p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold">₹</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/40 backdrop-blur-3xl border-white/20 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Credits</p>
                <p className="text-2xl font-bold text-blue-600">{activeCredits}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold">✓</span>
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
              placeholder="Search credits..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/50 border-white/20"
            />
          </div>
        </CardContent>
      </Card>

      {/* Credits Table */}
      <Card className="bg-white/40 backdrop-blur-3xl border-white/20 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Customer Credits ({credits.length})
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
      </Card>
      
      {/* Notification Container */}
      <NotificationContainer position="top-right" />
    </div>
  )
}
