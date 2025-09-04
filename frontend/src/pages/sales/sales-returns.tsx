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
import { Checkbox } from "@/components/ui/checkbox"
import { CalendarIcon, Plus, Search, RotateCcw, Eye, Download, Package, ArrowLeft, CheckCircle, XCircle, FileText, Clock } from "lucide-react"
import { format } from "date-fns"
import { salesReturnApi, SalesReturn as ApiSalesReturn, SalesReturnCreate, SalesReturnItem } from "../../services/salesReturnApi"
import { customerApi, Customer } from "../../services/customerApi"
import { invoiceApi, Invoice, InvoiceItem } from "../../services/invoiceApi"
import { useNotifications, NotificationContainer } from "../../components/ui/notification"

// Enhanced form data interface
interface ReturnFormData {
  customer_id: number;
  invoice_id: number;
  return_reason: string;
  refund_method: string;
  total_return_amount: number;
  refund_amount: number;
  return_reason_details: string;
  internal_notes: string;
  customer_notes: string;
  items_condition: string;
  quality_check_notes: string;
}

// Item selection interface
interface ItemToReturn {
  invoice_item_id: number;
  item_id: number;
  item_name: string;
  item_sku: string;
  original_quantity: number;
  return_quantity: number;
  unit_price: number;
  return_amount: number;
  refund_amount: number;
  condition_on_return: string;
  return_reason: string;
  restockable: boolean;
  notes: string;
  selected: boolean;
}

export default function SalesReturns() {
  const notifications = useNotifications()
  const [returns, setReturns] = useState<ApiSalesReturn[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerInvoices, setCustomerInvoices] = useState<Invoice[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [itemsToReturn, setItemsToReturn] = useState<ItemToReturn[]>([])
  const [loading, setLoading] = useState(true)

  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [formData, setFormData] = useState<ReturnFormData>({
    customer_id: 0,
    invoice_id: 0,
    return_reason: "",
    refund_method: "Bank Transfer",
    total_return_amount: 0,
    refund_amount: 0,
    return_reason_details: "",
    internal_notes: "",
    customer_notes: "",
    items_condition: "good",
    quality_check_notes: "",
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

  // Load invoices when customer is selected
  useEffect(() => {
    if (formData.customer_id > 0) {
      loadCustomerInvoices(formData.customer_id)
    } else {
      setCustomerInvoices([])
      setSelectedInvoice(null)
      setItemsToReturn([])
    }
  }, [formData.customer_id])

  // Load invoice items when invoice is selected
  useEffect(() => {
    if (formData.invoice_id > 0) {
      loadInvoiceItems(formData.invoice_id)
    } else {
      setSelectedInvoice(null)
      setItemsToReturn([])
    }
  }, [formData.invoice_id])

  // Recalculate totals when items change
  useEffect(() => {
    calculateTotals()
  }, [itemsToReturn])

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

  const loadCustomerInvoices = async (customerId: number) => {
    try {
      console.log('Loading invoices for customer:', customerId)
      const response = await invoiceApi.getInvoices({ 
        customer_id: customerId,
        limit: 100,
        status: 'sent' // Only load sent/completed invoices
      })
      console.log('Customer invoices loaded:', response.invoices)
      setCustomerInvoices(response.invoices)
    } catch (error) {
      console.error('Error loading customer invoices:', error)
      notifications.error('Loading Failed', 'Unable to load customer invoices.')
      setCustomerInvoices([])
    }
  }

  const loadInvoiceItems = async (invoiceId: number) => {
    try {
      console.log('Loading items for invoice:', invoiceId)
      const invoice = await invoiceApi.getInvoice(invoiceId)
      setSelectedInvoice(invoice)
      
      // Convert invoice items to returnable items
      const returnableItems: ItemToReturn[] = invoice.items.map(item => ({
        invoice_item_id: item.id,
        item_id: item.item_id,
        item_name: item.item_name,
        item_sku: item.item_sku,
        original_quantity: item.quantity,
        return_quantity: 1,
        unit_price: item.unit_price,
        return_amount: item.unit_price,
        refund_amount: item.unit_price,
        condition_on_return: "good",
        return_reason: "",
        restockable: true,
        notes: "",
        selected: false
      }))
      
      setItemsToReturn(returnableItems)
      console.log('Returnable items set:', returnableItems)
    } catch (error) {
      console.error('Error loading invoice items:', error)
      notifications.error('Loading Failed', 'Unable to load invoice items.')
    }
  }

  const calculateTotals = () => {
    const selectedItems = itemsToReturn.filter(item => item.selected)
    const totalReturnAmount = selectedItems.reduce((sum, item) => sum + item.return_amount, 0)
    const totalRefundAmount = selectedItems.reduce((sum, item) => sum + item.refund_amount, 0)
    
    setFormData(prev => ({
      ...prev,
      total_return_amount: totalReturnAmount,
      refund_amount: totalRefundAmount
    }))
  }

  const updateItemToReturn = (index: number, field: keyof ItemToReturn, value: any) => {
    const newItems = [...itemsToReturn]
    newItems[index] = { ...newItems[index], [field]: value }
    
    // Recalculate amounts when quantity changes
    if (field === 'return_quantity') {
      const item = newItems[index]
      item.return_amount = item.unit_price * value
      item.refund_amount = item.return_amount // Can be adjusted later
    }
    
    setItemsToReturn(newItems)
  }

  const toggleItemSelection = (index: number) => {
    updateItemToReturn(index, 'selected', !itemsToReturn[index].selected)
  }

  const getCustomerName = (customerId: number): string => {
    const customer = customers.find(c => c.id === customerId)
    if (customer) {
      return customer.company_name || `${customer.first_name} ${customer.last_name}`
    }
    return 'Unknown Customer'
  }

  const resetForm = () => {
    setFormData({
      customer_id: 0,
      invoice_id: 0,
      return_reason: "",
      refund_method: "Bank Transfer",
      total_return_amount: 0,
      refund_amount: 0,
      return_reason_details: "",
      internal_notes: "",
      customer_notes: "",
      items_condition: "good",
      quality_check_notes: "",
    })
    setSelectedDate(undefined)
    setCustomerInvoices([])
    setSelectedInvoice(null)
    setItemsToReturn([])
    setIsDialogOpen(false)
  }

  const handleCreateReturn = async () => {
    try {
      // Validation
      if (formData.customer_id === 0) {
        notifications.error('Validation Error', 'Please select a customer.')
        return
      }
      
      if (formData.invoice_id === 0) {
        notifications.error('Validation Error', 'Please select an invoice.')
        return
      }
      
      if (!formData.return_reason.trim()) {
        notifications.error('Validation Error', 'Please enter a return reason.')
        return
      }
      
      const selectedItems = itemsToReturn.filter(item => item.selected)
      if (selectedItems.length === 0) {
        notifications.error('Validation Error', 'Please select at least one item to return.')
        return
      }

      // Prepare return data
      const returnItems: SalesReturnItem[] = selectedItems.map(item => ({
        invoice_item_id: item.invoice_item_id,
        item_id: item.item_id,
        item_name: item.item_name,
        item_sku: item.item_sku,
        original_quantity: item.original_quantity,
        return_quantity: item.return_quantity,
        unit_price: item.unit_price,
        return_amount: item.return_amount,
        refund_amount: item.refund_amount,
        condition_on_return: item.condition_on_return,
        return_reason: item.return_reason,
        restockable: item.restockable,
        notes: item.notes
      }))

      const returnData: SalesReturnCreate = {
        invoice_id: formData.invoice_id,
        customer_id: formData.customer_id,
        return_date: selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        return_reason: formData.return_reason,
        return_type: "partial",
        status: "pending",
        total_return_amount: formData.total_return_amount,
        refund_amount: formData.refund_amount,
        restocking_fee: 0,
        refund_method: formData.refund_method,
        refund_status: "pending",
        return_reason_details: formData.return_reason_details,
        internal_notes: formData.internal_notes,
        customer_notes: formData.customer_notes,
        items_condition: formData.items_condition,
        quality_check_notes: formData.quality_check_notes,
        items: returnItems
      }

      console.log('Creating sales return with data:', returnData)
      await salesReturnApi.createSalesReturn(returnData)
      
      // Reset form and reload data
      resetForm()
      loadSalesReturns()
      notifications.success('Sales Return Created!', 'The sales return has been created successfully and inventory will be updated.')
    } catch (error: any) {
      console.error('Error creating sales return:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Unable to create sales return. Please try again.'
      notifications.error('Creation Failed', errorMessage)
    }
  }

  const updateStatus = async (id: number, status: string) => {
    try {
      console.log('Updating return status:', { id, status })
      await salesReturnApi.updateSalesReturn(id, { status })
      notifications.success('Status Updated!', `Return status changed to ${status}.`)
      loadSalesReturns() // Reload to get updated data
    } catch (error: any) {
      console.error('Error updating status:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Unable to update return status. Please try again.'
      notifications.error('Update Failed', errorMessage)
    }
  }

  const updateRefundStatus = async (id: number, refund_status: string) => {
    try {
      console.log('Updating refund status:', { id, refund_status })
      await salesReturnApi.updateSalesReturn(id, { refund_status })
      notifications.success('Refund Status Updated!', `Refund status changed to ${refund_status}.`)
      loadSalesReturns() // Reload to get updated data
    } catch (error: any) {
      console.error('Error updating refund status:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Unable to update refund status. Please try again.'
      notifications.error('Update Failed', errorMessage)
    }
  }

  const downloadCreditReport = async (returnId: number) => {
    try {
      console.log('Generating credit report for return ID:', returnId)
      const htmlContent = await salesReturnApi.downloadCreditReport(returnId)
      
      // Open HTML content in new window for printing/saving (like invoice)
      const newWindow = window.open('', '_blank')
      if (newWindow) {
        newWindow.document.write(htmlContent)
        newWindow.document.close()
        newWindow.print()
        newWindow.close()
        
        notifications.success('Credit Report Generated!', 'The credit report has been generated and opened for printing.')
      } else {
        notifications.error('Popup Blocked', 'Unable to open credit report window. Please check your browser popup settings.')
      }
    } catch (error: any) {
      console.error('Error generating credit report:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Unable to generate credit report. Please try again.'
      notifications.error('Generation Failed', errorMessage)
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
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-xl border-white/20">
            <DialogHeader>
              <DialogTitle>Create Sales Return</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Step 1: Customer and Invoice Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer">Customer *</Label>
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
                  <Label htmlFor="invoice">Invoice *</Label>
                  <Select
                    value={formData.invoice_id.toString()}
                    onValueChange={(value) => setFormData({ ...formData, invoice_id: parseInt(value) })}
                    disabled={formData.customer_id === 0}
                  >
                    <SelectTrigger className="bg-white/50 border-white/20">
                      <SelectValue placeholder={formData.customer_id === 0 ? "Select customer first" : "Select invoice"} />
                    </SelectTrigger>
                    <SelectContent>
                      {customerInvoices.map(invoice => (
                        <SelectItem key={invoice.id} value={invoice.id.toString()}>
                          {invoice.invoice_number} - ₹{parseFloat(invoice.total_amount.toString()).toFixed(2)} ({format(new Date(invoice.invoice_date), 'MMM dd, yyyy')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Step 2: Items Selection */}
              {selectedInvoice && itemsToReturn.length > 0 && (
                <div>
                  <Label>Select Items to Return *</Label>
                  <div className="mt-2 border rounded-lg p-4 bg-gray-50/50">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-medium">Invoice Items: {selectedInvoice.invoice_number}</h4>
                      <div className="text-sm text-gray-600">
                        Total Invoice Amount: ₹{parseFloat(selectedInvoice.total_amount.toString()).toFixed(2)}
                      </div>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Select</TableHead>
                          <TableHead>Item</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Original Qty</TableHead>
                          <TableHead>Return Qty</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Return Amount</TableHead>
                          <TableHead>Condition</TableHead>
                          <TableHead>Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itemsToReturn.map((item, index) => (
                          <TableRow key={item.invoice_item_id}>
                            <TableCell>
                              <Checkbox
                                checked={item.selected}
                                onCheckedChange={() => toggleItemSelection(index)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{item.item_name}</TableCell>
                            <TableCell>{item.item_sku}</TableCell>
                            <TableCell>{item.original_quantity}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.return_quantity}
                                onChange={(e) => updateItemToReturn(index, 'return_quantity', parseFloat(e.target.value) || 0)}
                                min="0"
                                max={item.original_quantity}
                                className="w-20"
                                disabled={!item.selected}
                              />
                            </TableCell>
                            <TableCell>₹{parseFloat(item.unit_price.toString()).toFixed(2)}</TableCell>
                            <TableCell>₹{parseFloat(item.return_amount.toString()).toFixed(2)}</TableCell>
                            <TableCell>
                              <Select
                                value={item.condition_on_return}
                                onValueChange={(value) => updateItemToReturn(index, 'condition_on_return', value)}
                                disabled={!item.selected}
                              >
                                <SelectTrigger className="w-28">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="good">Good</SelectItem>
                                  <SelectItem value="damaged">Damaged</SelectItem>
                                  <SelectItem value="defective">Defective</SelectItem>
                                  <SelectItem value="used">Used</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                value={item.return_reason}
                                onChange={(e) => updateItemToReturn(index, 'return_reason', e.target.value)}
                                placeholder="Reason"
                                className="w-32"
                                disabled={!item.selected}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Step 3: Return Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="return_reason">Return Reason *</Label>
                  <Select
                    value={formData.return_reason}
                    onValueChange={(value) => setFormData({ ...formData, return_reason: value })}
                  >
                    <SelectTrigger className="bg-white/50 border-white/20">
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Defective Product">Defective Product</SelectItem>
                      <SelectItem value="Wrong Item Sent">Wrong Item Sent</SelectItem>
                      <SelectItem value="Customer Changed Mind">Customer Changed Mind</SelectItem>
                      <SelectItem value="Damaged in Transit">Damaged in Transit</SelectItem>
                      <SelectItem value="Quality Issues">Quality Issues</SelectItem>
                      <SelectItem value="Not as Described">Not as Described</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="refund_method">Refund Method *</Label>
                  <Select
                    value={formData.refund_method}
                    onValueChange={(value) => setFormData({ ...formData, refund_method: value })}
                  >
                    <SelectTrigger className="bg-white/50 border-white/20">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Original Payment">Original Payment Method</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="return_date">Return Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal bg-white/50 border-white/20"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label htmlFor="items_condition">Overall Items Condition</Label>
                  <Select
                    value={formData.items_condition}
                    onValueChange={(value) => setFormData({ ...formData, items_condition: value })}
                  >
                    <SelectTrigger className="bg-white/50 border-white/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="damaged">Damaged</SelectItem>
                      <SelectItem value="defective">Defective</SelectItem>
                      <SelectItem value="used">Used</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="return_reason_details">Return Reason Details</Label>
                <Textarea
                  value={formData.return_reason_details}
                  onChange={(e) => setFormData({ ...formData, return_reason_details: e.target.value })}
                  placeholder="Provide detailed explanation of the return reason..."
                  className="bg-white/50 border-white/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer_notes">Customer Notes</Label>
                  <Textarea
                    value={formData.customer_notes}
                    onChange={(e) => setFormData({ ...formData, customer_notes: e.target.value })}
                    placeholder="Customer feedback and notes..."
                    className="bg-white/50 border-white/20"
                  />
                </div>
                <div>
                  <Label htmlFor="internal_notes">Internal Notes</Label>
                  <Textarea
                    value={formData.internal_notes}
                    onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                    placeholder="Internal notes for processing team..."
                    className="bg-white/50 border-white/20"
                  />
                </div>
              </div>

              {/* Summary */}
              {formData.total_return_amount > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">Return Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>Total Return Amount: <span className="font-semibold">₹{parseFloat(formData.total_return_amount.toString()).toFixed(2)}</span></div>
                    <div>Refund Amount: <span className="font-semibold">₹{parseFloat(formData.refund_amount.toString()).toFixed(2)}</span></div>
                    <div>Selected Items: <span className="font-semibold">{itemsToReturn.filter(item => item.selected).length}</span></div>
                    <div>Refund Method: <span className="font-semibold">{formData.refund_method}</span></div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button onClick={handleCreateReturn} className="bg-gradient-to-r from-violet-500 to-purple-600">
                  Create Sales Return
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Returns</p>
                <p className="text-3xl font-bold text-blue-900">{totalReturns}</p>
              </div>
              <RotateCcw className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Total Return Amount</p>
                <p className="text-3xl font-bold text-green-900">₹{parseFloat(totalRefundAmount.toString()).toFixed(2)}</p>
              </div>
              <Package className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Pending Returns</p>
                <p className="text-3xl font-bold text-yellow-900">{pendingReturns}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Returns Table */}
      <Card className="bg-white/60 backdrop-blur-xl border-white/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-violet-600" />
              Sales Returns ({totalReturns})
            </CardTitle>
            <div className="flex items-center space-x-2 w-96">
              <Search className="w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search returns by customer, invoice number, or return number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white/50 border-white/20"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Return Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Return Date</TableHead>
                  <TableHead>Return Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Refund Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.map((returnItem) => (
                  <TableRow key={returnItem.id}>
                    <TableCell className="font-medium">{returnItem.return_number}</TableCell>
                    <TableCell>{returnItem.customer_name}</TableCell>
                    <TableCell>{returnItem.invoice_number}</TableCell>
                    <TableCell>{format(new Date(returnItem.return_date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>₹{parseFloat(returnItem.total_return_amount.toString()).toFixed(2)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(returnItem.status)}`}>
                        {returnItem.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(returnItem.refund_status)}`}>
                        {returnItem.refund_status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadCreditReport(returnItem.id)}
                          title="Download Credit Report"
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                        <div className="flex items-start space-x-2">
                          <div className="w-28">
                            <label className="text-xs font-medium text-gray-600 mb-1 block">Return Status</label>
                            <Select
                              value={returnItem.status}
                              onValueChange={(value) => updateStatus(returnItem.id, value)}
                            >
                              <SelectTrigger className="w-full h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="processed">Processed</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-28">
                            <label className="text-xs font-medium text-gray-600 mb-1 block">Refund Status</label>
                            <Select
                              value={returnItem.refund_status}
                              onValueChange={(value) => updateRefundStatus(returnItem.id, value)}
                            >
                              <SelectTrigger className="w-full h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="processed">Processed</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="failed">Failed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Notification Container */}
      <NotificationContainer position="top-center" />
    </div>
  )
}