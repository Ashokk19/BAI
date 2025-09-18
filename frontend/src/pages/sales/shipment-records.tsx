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
import { CalendarIcon, Plus, Search, Ship, Eye, Download, Truck, Package, ChevronLeft, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import { shipmentApi, Shipment as ApiShipment, ShipmentCreate } from "../../services/shipmentApi"
import { customerApi, Customer } from "../../services/customerApi"
import { invoiceApi, Invoice } from "../../services/invoiceApi"
import { useNotifications, NotificationContainer } from "../../components/ui/notification"

// Using Shipment interface from shipmentApi as ApiShipment

export default function ShipmentRecords() {
  const notifications = useNotifications()
  const [shipments, setShipments] = useState<ApiShipment[]>([])
  const [allShipments, setAllShipments] = useState<ApiShipment[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [invoicesLoading, setInvoicesLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [customerFilter, setCustomerFilter] = useState("all")
  const [shipmentStatusFilter, setShipmentStatusFilter] = useState("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [expectedDate, setExpectedDate] = useState<Date>()
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const recordsPerPage = 10
  const [formData, setFormData] = useState({
    customer_id: 0,
    invoice_id: 0,
    shipping_address: "",
    carrier: "",
    shipping_method: "",
    tracking_number: "",
    notes: "",
    total_weight: 0,
    shipping_cost: 0,
    package_count: 1,
    dimensions: "",
    insurance_cost: 0,
    special_instructions: "",
  })

  // Load shipments on component mount
  useEffect(() => {
    loadShipments()
    loadCustomers()
    loadInvoices()
  }, [])

  // Reload when search, customer filter, or page changes
  useEffect(() => {
    loadShipments()
  }, [searchTerm, customerFilter, currentPage])

  // Apply shipment status filter when it changes
  useEffect(() => {
    if (allShipments.length > 0) {
      applyShipmentStatusFilter(shipmentStatusFilter)
    }
  }, [shipmentStatusFilter, allShipments])

  const loadShipments = async () => {
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

      if (customerFilter !== "all") {
        params.customer_id = parseInt(customerFilter)
      }

      const response = await shipmentApi.getShipments(params)
      
      // Store all shipments for tile count calculations
      setAllShipments(response.shipments)
      
      // The shipments array will be updated by the useEffect that applies status filter
      
      // Calculate pagination info
      const total = response.total || response.shipments?.length || 0
      setTotalRecords(total)
      setTotalPages(Math.ceil(total / recordsPerPage))
    } catch (error) {
      console.error('Error loading shipments:', error)
      notifications.error('Loading Failed', 'Unable to load shipments. Please check your connection.')
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
      setInvoicesLoading(true)
      console.log('Loading invoices...')
      const response = await invoiceApi.getInvoices({ limit: 1000 })
      console.log('Invoices loaded:', response)
      console.log('Number of invoices:', response.invoices.length)
      setInvoices(response.invoices)
    } catch (error: any) {
      console.error('Error loading invoices:', error)
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      })
    } finally {
      setInvoicesLoading(false)
    }
  }

  const handleInvoiceChange = (invoiceId: number) => {
    const selectedInvoice = invoices.find(invoice => invoice.id === invoiceId)
    if (selectedInvoice) {
      
      // Get customer details for fallback address
      const customer = customers.find(c => c.id === selectedInvoice.customer_id)
      
      // Try to get shipping address with fallbacks
      let shippingAddress = selectedInvoice.shipping_address || ''
      
      // Fallback 1: Use billing address if shipping address is empty
      if (!shippingAddress && selectedInvoice.billing_address) {
        shippingAddress = selectedInvoice.billing_address
      }
      
      // Fallback 2: Use customer address if both invoice addresses are empty
      if (!shippingAddress && customer) {
        // Try customer shipping address first, then billing address
        let customerAddress = customer.shipping_address || customer.billing_address || ''
        
        // If no address field, construct from individual fields
        if (!customerAddress) {
          customerAddress = [
            customer.city,
            customer.state,
            customer.postal_code
          ].filter(Boolean).join(', ')
        }
        
        if (customerAddress) {
          shippingAddress = customerAddress
        }
      }
      
      setFormData({
        ...formData,
        invoice_id: invoiceId,
        customer_id: selectedInvoice.customer_id,
        shipping_address: shippingAddress
      })
    }
  }

  const getCustomerName = (customerId: number): string => {
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


  const validateForm = (): boolean => {
    if (!formData.customer_id) {
      notifications.error('Validation Error', 'Please select a customer')
      return false
    }
    if (!formData.shipping_address.trim()) {
      notifications.error('Validation Error', 'Please enter shipping address')
      return false
    }
    if (!formData.carrier) {
      notifications.error('Validation Error', 'Please select a carrier')
      return false
    }
    if (!formData.shipping_method) {
      notifications.error('Validation Error', 'Please select shipping method')
      return false
    }
    return true
  }

  const handleCreateShipment = async () => {
    if (!validateForm()) {
      return
    }
    
    try {
      const shipmentData: ShipmentCreate = {
        customer_id: formData.customer_id,
        invoice_id: formData.invoice_id || undefined,
        shipping_address: formData.shipping_address,
        carrier: formData.carrier,
        shipping_method: formData.shipping_method,
        tracking_number: formData.tracking_number || undefined,
        notes: formData.notes,
        ship_date: selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        expected_delivery_date: expectedDate ? expectedDate.toISOString().split('T')[0] : undefined,
        total_weight: formData.total_weight,
        shipping_cost: formData.shipping_cost,
        package_count: formData.package_count,
        dimensions: formData.dimensions,
        insurance_cost: formData.insurance_cost,
        special_instructions: formData.special_instructions,
      }

      await shipmentApi.createShipment(shipmentData)
      
      // Reset form and reload data
      setFormData({
        customer_id: 0,
        invoice_id: 0,
        shipping_address: "",
        carrier: "",
        shipping_method: "",
        tracking_number: "",
        notes: "",
        total_weight: 0,
        shipping_cost: 0,
        package_count: 1,
        dimensions: "",
        insurance_cost: 0,
        special_instructions: "",
      })
      setSelectedDate(undefined)
      setExpectedDate(undefined)
      setIsDialogOpen(false)
      
      loadShipments()
      notifications.success('Shipment Created!', 'The shipment has been created successfully.')
    } catch (error) {
      console.error('Error creating shipment:', error)
      notifications.error('Creation Failed', 'Unable to create shipment. Please try again.')
    }
  }

  const updateStatus = async (id: number, status: string) => {
    try {
      await shipmentApi.updateShipment(id, { status: status })
      notifications.success('Status Updated!', `Shipment status changed to ${status}.`)
      loadShipments() // Reload to get updated data
    } catch (error) {
      console.error('Error updating status:', error)
      notifications.error('Update Failed', 'Unable to update shipment status. Please try again.')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Delivered":
        return "bg-green-100 text-green-800"
      case "In Transit":
        return "bg-blue-100 text-blue-800"
      case "Pending":
        return "bg-yellow-100 text-yellow-800"
      case "Failed":
        return "bg-red-100 text-red-800"
      case "Refused":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Filter handlers
  const handleCustomerFilterChange = (value: string) => {
    setCustomerFilter(value)
    setCurrentPage(1)
  }

  const handleShipmentStatusTileClick = (status: string) => {
    setShipmentStatusFilter(status)
    setCurrentPage(1)
    applyShipmentStatusFilter(status)
  }

  // Apply shipment status filter to shipments
  const applyShipmentStatusFilter = (status: string) => {
    if (status === "all") {
      setShipments(allShipments)
    } else {
      const filtered = allShipments.filter(shipment => {
        // Handle "in-transit" -> "In Transit" mapping
        const shipmentStatus = shipment.status?.toLowerCase()
        const filterStatus = status === "in-transit" ? "in transit" : status.toLowerCase()
        return shipmentStatus === filterStatus
      })
      setShipments(filtered)
    }
  }

  // Calculate shipment status counts from all shipments (not filtered)
  const getShipmentStatusCounts = () => {
    const counts = {
      all: allShipments.length,
      pending: 0,
      'in-transit': 0,
      delivered: 0,
      failed: 0,
      refused: 0
    }
    
    allShipments.forEach(shipment => {
      const status = shipment.status?.toLowerCase()
      switch (status) {
        case 'pending':
          counts.pending++
          break
        case 'in transit':
          counts['in-transit']++
          break
        case 'delivered':
          counts.delivered++
          break
        case 'failed':
          counts.failed++
          break
        case 'refused':
          counts.refused++
          break
      }
    })
    
    return counts
  }

  // Get tile styling based on status and active state
  const getTileClassName = (status: string) => {
    const isActive = shipmentStatusFilter === status
    const baseClasses = "bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden group cursor-pointer hover:scale-105 transition-all duration-200"
    const activeClasses = "ring-2 ring-violet-500 shadow-2xl scale-105"
    
    return `${baseClasses} ${isActive ? activeClasses : ''}`
  }

  // Get status-specific styling
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Package className="w-4 h-4 text-yellow-600" />
      case 'in-transit':
        return <Truck className="w-4 h-4 text-blue-600" />
      case 'delivered':
        return <Ship className="w-4 h-4 text-green-600" />
      case 'failed':
        return <Package className="w-4 h-4 text-red-600" />
      case 'refused':
        return <Package className="w-4 h-4 text-red-600" />
      default:
        return <Ship className="w-4 h-4 text-gray-600" />
    }
  }

  const getTileStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600'
      case 'in-transit':
        return 'text-blue-600'
      case 'delivered':
        return 'text-green-600'
      case 'failed':
        return 'text-red-600'
      case 'refused':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusGradient = (status: string) => {
    switch (status) {
      case 'pending':
        return 'from-yellow-500/10 to-yellow-600/20'
      case 'in-transit':
        return 'from-blue-500/10 to-blue-600/20'
      case 'delivered':
        return 'from-green-500/10 to-green-600/20'
      case 'failed':
        return 'from-red-500/10 to-red-600/20'
      case 'refused':
        return 'from-red-500/10 to-red-600/20'
      default:
        return 'from-gray-500/10 to-gray-600/20'
    }
  }

  const statusCounts = getShipmentStatusCounts()

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


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-700 bg-clip-text text-transparent">
            Shipment Records
          </h1>
          <p className="text-gray-600 mt-1">Track and manage product shipments</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Shipment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-xl border-white/20">
            <DialogHeader>
              <DialogTitle>Create New Shipment</DialogTitle>
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
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.company_name || `${customer.first_name} ${customer.last_name}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="invoice">Invoice Number</Label>
                  <Select
                    value={formData.invoice_id.toString()}
                    onValueChange={(value) => handleInvoiceChange(parseInt(value))}
                  >
                    <SelectTrigger className="bg-white/50 border-white/20">
                      <SelectValue placeholder={invoicesLoading ? "Loading invoices..." : "Select invoice"} />
                    </SelectTrigger>
                    <SelectContent>
                      {invoices.length === 0 ? (
                        <SelectItem value="" disabled>
                          {invoicesLoading ? "Loading invoices..." : "No invoices found"}
                        </SelectItem>
                      ) : (
                        invoices.map((invoice) => (
                          <SelectItem key={invoice.id} value={invoice.id.toString()}>
                            {invoice.invoice_number} - {getCustomerName(invoice.customer_id)}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {invoices.length === 0 && !invoicesLoading && (
                    <p className="text-sm text-gray-500 mt-1">No invoices available. Create an invoice first.</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="carrier">Carrier</Label>
                  <Select
                    value={formData.carrier}
                    onValueChange={(value) => setFormData({ ...formData, carrier: value })}
                  >
                    <SelectTrigger className="bg-white/50 border-white/20">
                      <SelectValue placeholder="Select carrier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Blue Dart">Blue Dart</SelectItem>
                      <SelectItem value="DTDC">DTDC</SelectItem>
                      <SelectItem value="FedEx">FedEx</SelectItem>
                      <SelectItem value="DHL">DHL</SelectItem>
                      <SelectItem value="India Post">India Post</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="shipping_method">Shipping Method</Label>
                  <Select
                    value={formData.shipping_method}
                    onValueChange={(value) => setFormData({ ...formData, shipping_method: value })}
                  >
                    <SelectTrigger className="bg-white/50 border-white/20">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Express">Express</SelectItem>
                      <SelectItem value="Standard">Standard</SelectItem>
                      <SelectItem value="Economy">Economy</SelectItem>
                      <SelectItem value="Same Day">Same Day</SelectItem>
                      <SelectItem value="Next Day">Next Day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="tracking_number">Tracking Number</Label>
                <Input
                  id="tracking_number"
                  value={formData.tracking_number}
                  onChange={(e) => setFormData({ ...formData, tracking_number: e.target.value })}
                  placeholder="Enter tracking number (optional - will be auto-generated if left empty)"
                  className="bg-white/50 border-white/20"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Leave empty to auto-generate a tracking number
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Shipment Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start bg-white/50 border-white/20">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? selectedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>Expected Delivery</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start bg-white/50 border-white/20">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {expectedDate ? expectedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={expectedDate}
                        onSelect={setExpectedDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    value={formData.total_weight}
                    onChange={(e) => setFormData({ ...formData, total_weight: Number.parseFloat(e.target.value) || 0 })}
                    placeholder="0.0"
                    className="bg-white/50 border-white/20"
                  />
                </div>
                <div>
                  <Label htmlFor="cost">Shipping Cost</Label>
                  <Input
                    id="cost"
                    type="number"
                    value={formData.shipping_cost}
                    onChange={(e) =>
                      setFormData({ ...formData, shipping_cost: Number.parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0.00"
                    className="bg-white/50 border-white/20"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Shipping Address</Label>
                <Textarea
                  id="address"
                  value={formData.shipping_address}
                  onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })}
                  placeholder="Complete shipping address (will be auto-filled when invoice is selected)"
                  className="bg-white/50 border-white/20"
                />
                {formData.invoice_id > 0 && formData.shipping_address && (
                  <p className="text-sm text-green-600 mt-1">
                    ✓ Address auto-populated from invoice/customer data
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="package_count">Package Count</Label>
                  <Input
                    id="package_count"
                    type="number"
                    value={formData.package_count}
                    onChange={(e) => setFormData({ ...formData, package_count: parseInt(e.target.value) || 1 })}
                    placeholder="1"
                    className="bg-white/50 border-white/20"
                  />
                </div>
                <div>
                  <Label htmlFor="dimensions">Dimensions</Label>
                  <Input
                    id="dimensions"
                    value={formData.dimensions}
                    onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                    placeholder="L x W x H (cm)"
                    className="bg-white/50 border-white/20"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="insurance_cost">Insurance Cost</Label>
                  <Input
                    id="insurance_cost"
                    type="number"
                    value={formData.insurance_cost}
                    onChange={(e) => setFormData({ ...formData, insurance_cost: Number.parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
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
              </div>
              <div>
                <Label htmlFor="special_instructions">Special Instructions</Label>
                <Textarea
                  id="special_instructions"
                  value={formData.special_instructions}
                  onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
                  placeholder="Special handling instructions"
                  className="bg-white/50 border-white/20"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateShipment} className="bg-gradient-to-r from-violet-500 to-purple-600">
                  Create Shipment
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Shipment Status Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card 
          className={getTileClassName("all")}
          onClick={() => handleShipmentStatusTileClick("all")}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-violet-600/20"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-gray-700">All Status</CardTitle>
            <div className="p-2 rounded-lg bg-violet-500/20">
              <Ship className="w-4 h-4 text-violet-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-violet-600">{statusCounts.all}</div>
            <p className="text-xs text-gray-600 mt-1">Total shipments</p>
          </CardContent>
        </Card>

        <Card 
          className={getTileClassName("pending")}
          onClick={() => handleShipmentStatusTileClick("pending")}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${getStatusGradient('pending')}`}></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-gray-700">Pending</CardTitle>
            <div className="p-2 rounded-lg bg-yellow-500/20">
              {getStatusIcon('pending')}
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className={`text-2xl font-bold ${getTileStatusColor('pending')}`}>{statusCounts.pending}</div>
            <p className="text-xs text-gray-600 mt-1">Awaiting shipment</p>
          </CardContent>
        </Card>

        <Card 
          className={getTileClassName("in-transit")}
          onClick={() => handleShipmentStatusTileClick("in-transit")}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${getStatusGradient('in-transit')}`}></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-gray-700">In Transit</CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/20">
              {getStatusIcon('in-transit')}
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className={`text-2xl font-bold ${getTileStatusColor('in-transit')}`}>{statusCounts['in-transit']}</div>
            <p className="text-xs text-gray-600 mt-1">On the way</p>
          </CardContent>
        </Card>

        <Card 
          className={getTileClassName("delivered")}
          onClick={() => handleShipmentStatusTileClick("delivered")}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${getStatusGradient('delivered')}`}></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-gray-700">Delivered</CardTitle>
            <div className="p-2 rounded-lg bg-green-500/20">
              {getStatusIcon('delivered')}
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className={`text-2xl font-bold ${getTileStatusColor('delivered')}`}>{statusCounts.delivered}</div>
            <p className="text-xs text-gray-600 mt-1">Successfully delivered</p>
          </CardContent>
        </Card>

        <Card 
          className={getTileClassName("failed")}
          onClick={() => handleShipmentStatusTileClick("failed")}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${getStatusGradient('failed')}`}></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-gray-700">Failed</CardTitle>
            <div className="p-2 rounded-lg bg-red-500/20">
              {getStatusIcon('failed')}
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className={`text-2xl font-bold ${getTileStatusColor('failed')}`}>{statusCounts.failed}</div>
            <p className="text-xs text-gray-600 mt-1">Delivery failed</p>
          </CardContent>
        </Card>

        <Card 
          className={getTileClassName("refused")}
          onClick={() => handleShipmentStatusTileClick("refused")}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${getStatusGradient('refused')}`}></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-gray-700">Refused</CardTitle>
            <div className="p-2 rounded-lg bg-red-500/20">
              {getStatusIcon('refused')}
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className={`text-2xl font-bold ${getTileStatusColor('refused')}`}>{statusCounts.refused}</div>
            <p className="text-xs text-gray-600 mt-1">Package refused</p>
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
                  placeholder="Search shipments..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 bg-white/50 border-white/20"
                />
              </div>
            </div>
            <Select value={customerFilter} onValueChange={handleCustomerFilterChange}>
              <SelectTrigger className="w-48 bg-white/50 border-white/20">
                <SelectValue placeholder="Filter by customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id.toString()}>
                    {customer.company_name || `${customer.first_name} ${customer.last_name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Shipments Table */}
      <Card className="bg-white/40 backdrop-blur-3xl border-white/20 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ship className="w-5 h-5" />
              Shipment Records ({totalRecords} total)
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
                <TableHead>Shipment Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Carrier</TableHead>
                <TableHead>Tracking Number</TableHead>
                <TableHead>Ship Date</TableHead>
                <TableHead>Expected Delivery</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipments.map((shipment) => (
                <TableRow key={shipment.id}>
                  <TableCell>
                    <div className="font-medium">{shipment.shipment_number}</div>
                    <div className="text-sm text-gray-500 flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      {shipment.package_count || 0} packages
                    </div>
                  </TableCell>
                  <TableCell>{getCustomerName(shipment.customer_id)}</TableCell>
                  <TableCell>{shipment.invoice_id ? getInvoiceNumber(shipment.invoice_id) : 'N/A'}</TableCell>
                  <TableCell>{shipment.carrier || 'N/A'}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">{shipment.tracking_number || 'N/A'}</code>
                  </TableCell>
                  <TableCell>{shipment.ship_date ? new Date(shipment.ship_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }) : 'N/A'}</TableCell>
                  <TableCell>
                    {shipment.expected_delivery_date ? new Date(shipment.expected_delivery_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }) : "-"}
                  </TableCell>
                  <TableCell>
                    <Select value={shipment.status} onValueChange={(value: any) => updateStatus(shipment.id, value)}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="In Transit">In Transit</SelectItem>
                        <SelectItem value="Delivered">Delivered</SelectItem>
                        <SelectItem value="Failed">Failed</SelectItem>
                        <SelectItem value="Refused">Refused</SelectItem>
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
              ))}
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
