"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, Plus, Search, Truck, Package, Eye, Download, ChevronLeft, ChevronRight } from "lucide-react"
import { shipmentApi, DeliveryNote as ApiDeliveryNote, DeliveryNoteCreate, Shipment } from "../../services/shipmentApi"
import { customerApi, Customer } from "../../services/customerApi"
import { invoiceApi, Invoice } from "../../services/invoiceApi"
import { organizationService } from "../../services/organizationService"
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

export default function DeliveryNote() {
  const notifications = useNotifications()
  const [deliveryNotes, setDeliveryNotes] = useState<ApiDeliveryNote[]>([])
  const [allDeliveryNotes, setAllDeliveryNotes] = useState<ApiDeliveryNote[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [shipmentsLoaded, setShipmentsLoaded] = useState(false)
  const [organization, setOrganization] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [customerFilter, setCustomerFilter] = useState("all")
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>()
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const recordsPerPage = 10
  
  // Search states for dropdowns
  const [invoiceSearch, setInvoiceSearch] = useState("")
  const [customerSearch, setCustomerSearch] = useState("")
  const [showInvoiceDropdown, setShowInvoiceDropdown] = useState(false)
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  
  const [formData, setFormData] = useState({
    customer_id: 0,
    invoice_id: 0,
    shipment_id: 0,
    delivery_address: "",
    delivery_notes: "",
    special_instructions: "",
  })
  
  const [useSameAddress, setUseSameAddress] = useState(false)

  // Load delivery notes on component mount
  useEffect(() => {
    const loadAllData = async () => {
      await loadCustomers()
      await loadInvoices()
      await loadShipments()
      await loadOrganization()
      await loadDeliveryNotes()
    }
    loadAllData()
  }, [])

  // Reload delivery notes when search, customer filter, or page changes
  useEffect(() => {
    loadDeliveryNotes()
  }, [searchTerm, customerFilter, currentPage])

  // Apply delivery status filter when it changes (client-side only)
  useEffect(() => {
    if (allDeliveryNotes.length > 0) {
      applyDeliveryStatusFilter(deliveryStatusFilter)
    }
  }, [deliveryStatusFilter, allDeliveryNotes])



  const loadDeliveryNotes = async () => {
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
      
      if (customerFilter && customerFilter !== "all") {
        params.customer_id = parseInt(customerFilter)
      }

      const response = await shipmentApi.getDeliveryNotes(params)
      console.log('Delivery notes response:', response)
      console.log('Delivery notes loaded:', response.delivery_notes)
      console.log('Delivery notes count:', response.delivery_notes?.length || 0)
      
      // Store all delivery notes for counting
      const allNotes = response.delivery_notes || []
      setAllDeliveryNotes(allNotes)
      
      let filteredNotes = allNotes
      
      // Apply delivery status filter client-side
      if (deliveryStatusFilter && deliveryStatusFilter !== "all") {
        filteredNotes = filteredNotes.filter(note => note.delivery_status === deliveryStatusFilter)
      }
      
      setDeliveryNotes(filteredNotes)
      
      // Calculate pagination info
      const total = filteredNotes.length
      setTotalRecords(total)
      setTotalPages(Math.ceil(total / recordsPerPage))
    } catch (error: any) {
      console.error('Error loading delivery notes:', error)
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      })
      notifications.error('Failed to load delivery notes', 'Please check your connection and try again.')
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
      console.log('Loading invoices...')
      console.log('API endpoint:', '/api/sales/invoices')
      console.log('Auth token:', localStorage.getItem('access_token') || sessionStorage.getItem('access_token') ? 'Present' : 'Missing')
      
      const response = await invoiceApi.getInvoices({ limit: 1000 })
      console.log('Invoices loaded successfully:', response.invoices.length)
      setInvoices(response.invoices)
    } catch (error: any) {
      console.error('Error loading invoices:', error)
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      })
      notifications.error('Failed to load invoices', 'Please check your connection and try again.')
    }
  }

  const loadShipments = async () => {
    try {
      console.log('Loading shipments...')
              const response = await shipmentApi.getShipments({ limit: 100 })
      console.log('Shipments response:', response)
      console.log('Shipments loaded:', response.shipments)
      console.log('Shipments count:', response.shipments?.length || 0)
      setShipments(response.shipments || [])
      setShipmentsLoaded(true)
    } catch (error: any) {
      console.error('Error loading shipments:', error)
      console.error('Error details:', error.response?.data || error.message)
      setShipments([])
    }
  }

  const loadOrganization = async () => {
    try {
      const response = await organizationService.getOrganizationProfile()
      setOrganization(response)
    } catch (error: any) {
      console.error('Error loading organization:', error)
    }
  }

  const getCustomerName = (customerId: number): string => {
    const customer = customers.find(c => c.id === customerId)
    if (customer) {
      return customer.company_name || `${customer.first_name} ${customer.last_name}`
    }
    return 'Unknown Customer'
  }

  // Helpers to align status with invoice-history logic (shipment-first)
  const mapShipmentToDeliveryStatus = (raw?: string): string => {
    const s = (raw || '').toLowerCase()
    if (s === 'delivered') return 'Delivered'
    if (s === 'in_transit' || s === 'in transit' || s === 'shipped') return 'In Transit'
    if (s === 'cancelled' || s === 'failed') return 'Failed'
    if (s === 'refused') return 'Refused'
    return 'Pending'
  }

  const normalizeStatus = (label: string): string => label.toLowerCase().replace(/[_\s]+/g, '-')

  const getEffectiveDeliveryStatus = (note: any): string => {
    if (note?.invoice_id) {
      const relatedShipment = shipments.find(s => s.invoice_id === note.invoice_id)
      if (relatedShipment) {
        return mapShipmentToDeliveryStatus(relatedShipment.status)
      }
    }
    return note?.delivery_status || 'Pending'
  }

  // Calculate delivery status counts
  const getDeliveryStatusCounts = () => {
    const counts = {
      all: allDeliveryNotes.length,
      pending: 0,
      'in-transit': 0,
      delivered: 0,
      failed: 0,
      refused: 0
    }
    
    allDeliveryNotes.forEach(note => {
      const label = getEffectiveDeliveryStatus(note)
      const status = normalizeStatus(label)
      switch (status) {
        case 'pending':
          counts.pending++
          break
        case 'in-transit':
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
    const isActive = deliveryStatusFilter === status
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
        return <Package className="w-4 h-4 text-green-600" />
      case 'failed':
        return <Package className="w-4 h-4 text-red-600" />
      case 'refused':
        return <Package className="w-4 h-4 text-gray-600" />
      default:
        return <Package className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
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
        return 'text-gray-600'
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
        return 'from-gray-500/10 to-gray-600/20'
      default:
        return 'from-gray-500/10 to-gray-600/20'
    }
  }

  const statusCounts = getDeliveryStatusCounts()

  const getInvoiceNumber = (invoiceId: number): string => {
    const invoice = invoices.find(i => i.id === invoiceId)
    return invoice ? invoice.invoice_number : 'Unknown Invoice'
  }

  const getShipmentNumber = (shipmentId: number): string => {
    const shipment = shipments.find(s => s.id === shipmentId)
    if (shipment) {
      return shipment.shipment_number
    }
    // If shipment not found in state, try to find by invoice
    const deliveryNote = deliveryNotes.find(dn => dn.shipment_id === shipmentId)
    if (deliveryNote && deliveryNote.invoice_id) {
      const shipmentByInvoice = shipments.find(s => s.invoice_id === deliveryNote.invoice_id)
      if (shipmentByInvoice) {
        return shipmentByInvoice.shipment_number
      }
    }
    return 'Unknown Shipment'
  }

  // Helper functions to get display text for selected items
  const getSelectedInvoiceDisplay = () => {
    if (formData.invoice_id === 0) return '';
    const invoice = invoices.find(i => i.id === formData.invoice_id);
    if (!invoice) return '';
    return `${invoice.invoice_number} - ${getCustomerName(invoice.customer_id)}`;
  };

  const getSelectedCustomerDisplay = () => {
    if (formData.customer_id === 0) return '';
    const customer = customers.find(c => c.id === formData.customer_id);
    if (!customer) return '';
    return customer.company_name || `${customer.first_name} ${customer.last_name}`;
  };

  // Filter functions for searchable dropdowns
  const getFilteredInvoices = () => {
    if (!invoiceSearch) return invoices;
    return invoices.filter(invoice => {
      const invoiceNumber = invoice.invoice_number.toLowerCase();
      const customerName = getCustomerName(invoice.customer_id).toLowerCase();
      const searchLower = invoiceSearch.toLowerCase();
      return invoiceNumber.includes(searchLower) || customerName.includes(searchLower);
    });
  };

  const getFilteredCustomers = () => {
    if (!customerSearch) return customers;
    return customers.filter(customer => {
      const companyName = (customer.company_name || '').toLowerCase();
      const firstName = (customer.first_name || '').toLowerCase();
      const lastName = (customer.last_name || '').toLowerCase();
      const email = (customer.email || '').toLowerCase();
      const searchLower = customerSearch.toLowerCase();
      return companyName.includes(searchLower) || 
             firstName.includes(searchLower) || 
             lastName.includes(searchLower) || 
             email.includes(searchLower);
    });
  };

  // Get minimum delivery date based on invoice date
  const getMinimumDeliveryDate = (): Date => {
    if (formData.invoice_id > 0) {
      const selectedInvoice = invoices.find(i => i.id === formData.invoice_id)
      if (selectedInvoice && selectedInvoice.invoice_date) {
        const invoiceDate = new Date(selectedInvoice.invoice_date)
        invoiceDate.setHours(0, 0, 0, 0)
        return invoiceDate
      }
    }
    // Default to today if no invoice selected
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  }

  // Auto-populate delivery address when invoice is selected
  const handleInvoiceChange = (invoiceId: number) => {
    console.log('Invoice selected:', invoiceId)
    setFormData(prev => ({ ...prev, invoice_id: invoiceId }))
    setInvoiceSearch('') // Clear search when invoice is selected
    setShowInvoiceDropdown(false)
    
    if (invoiceId > 0) {
      const selectedInvoice = invoices.find(i => i.id === invoiceId)
      if (selectedInvoice) {
        console.log('Selected invoice:', selectedInvoice)
        
        // Find shipment for this invoice
        const relatedShipment = shipments.find(s => s.invoice_id === invoiceId)
        console.log('Related shipment:', relatedShipment)
        
        // Use shipping address from invoice, fallback to billing address
        const address = selectedInvoice.shipping_address || selectedInvoice.billing_address || ""
        setFormData(prev => ({ 
          ...prev, 
          delivery_address: address,
          customer_id: selectedInvoice.customer_id,
          shipment_id: relatedShipment ? relatedShipment.id : 0
        }))
      }
    }
  }

  const handleCustomerChange = (customerId: number) => {
    setFormData(prev => ({ ...prev, customer_id: customerId }))
    setCustomerSearch('') // Clear search when customer is selected
    setShowCustomerDropdown(false)
    
    // If "use same address" is checked, populate address from customer
    if (useSameAddress && customerId > 0) {
      const customer = customers.find(c => c.id === customerId)
      if (customer) {
        const customerAddress = buildCustomerAddress(customer)
        setFormData(prev => ({ ...prev, delivery_address: customerAddress }))
      }
    }
  }
  
  // Build full customer address starting with billing_address
  const buildCustomerAddress = (customer: Customer): string => {
    const parts = []
    // Start with billing_address if available, otherwise use address
    if (customer.billing_address) {
      parts.push(customer.billing_address)
    } else if (customer.address) {
      parts.push(customer.address)
    }
    // Add city and postal_code
    if (customer.city) parts.push(customer.city)
    if (customer.postal_code) parts.push(customer.postal_code)
    if (customer.state) parts.push(customer.state)
    if (customer.country) parts.push(customer.country)
    return parts.join(', ')
  }
  
  // Handle "use same address" checkbox change
  const handleUseSameAddressChange = (checked: boolean) => {
    setUseSameAddress(checked)
    
    if (checked && formData.customer_id > 0) {
      const customer = customers.find(c => c.id === formData.customer_id)
      if (customer) {
        const customerAddress = buildCustomerAddress(customer)
        setFormData(prev => ({ ...prev, delivery_address: customerAddress }))
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

  // Handle customer input changes
  const handleCustomerInputChange = (value: string) => {
    setCustomerSearch(value);
    setShowCustomerDropdown(true);
    // Clear selected customer if user starts typing
    if (value && formData.customer_id > 0) {
      setFormData(prev => ({ ...prev, customer_id: 0 }));
    }
  };

  // Get display value for invoice input
  const getInvoiceInputValue = () => {
    if (formData.invoice_id > 0) {
      return getSelectedInvoiceDisplay();
    }
    return invoiceSearch;
  };

  // Get display value for customer input
  const getCustomerInputValue = () => {
    if (formData.customer_id > 0) {
      return getSelectedCustomerDisplay();
    }
    return customerSearch;
  };

  const resetForm = () => {
    setFormData({
      customer_id: 0,
      invoice_id: 0,
      shipment_id: 0,
      delivery_address: "",
      delivery_notes: "",
      special_instructions: "",
    })
    setSelectedDate(undefined)
    setInvoiceSearch("")
    setCustomerSearch("")
    setShowInvoiceDropdown(false)
    setShowCustomerDropdown(false)
    setUseSameAddress(false)
    setIsDialogOpen(false)
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

  // Reset to first page when customer filter changes
  const handleCustomerFilterChange = (value: string) => {
    setCustomerFilter(value)
    setCurrentPage(1)
  }

  // Handle delivery status tile click
  const handleDeliveryStatusTileClick = (status: string) => {
    setDeliveryStatusFilter(status)
    setCurrentPage(1)
    
    // Apply the filter immediately to the current data
    applyDeliveryStatusFilter(status)
  }

  // Apply delivery status filter to current data
  const applyDeliveryStatusFilter = (status: string) => {
    if (status === "all") {
      setDeliveryNotes(allDeliveryNotes)
    } else {
      const filtered = allDeliveryNotes.filter(note => note.delivery_status === status)
      setDeliveryNotes(filtered)
    }
  }

  const handleCreateDeliveryNote = async () => {
    try {
      // Validate required fields
      if (!formData.customer_id) {
        notifications.error('Validation Error', 'Please select a customer.')
        return
      }
      
      if (!formData.delivery_address.trim()) {
        notifications.error('Validation Error', 'Please enter a delivery address.')
        return
      }

      const deliveryNoteData: DeliveryNoteCreate = {
        customer_id: formData.customer_id,
        invoice_id: formData.invoice_id > 0 ? formData.invoice_id : undefined,
        shipment_id: formData.shipment_id > 0 ? formData.shipment_id : undefined,
        delivery_date: selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        delivery_address: formData.delivery_address,
        delivery_notes: formData.delivery_notes,
        special_instructions: formData.special_instructions,
        delivery_status: "Pending"
      }

      console.log('Creating delivery note with data:', deliveryNoteData)
      await shipmentApi.createDeliveryNote(deliveryNoteData)
      
      // Reset form completely
      resetForm()
      
      // Reload data
      loadDeliveryNotes()
      notifications.success('Delivery Note Created!', 'The delivery note has been created successfully.')
    } catch (error: any) {
      console.error('Error creating delivery note:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Unable to create delivery note. Please try again.'
      notifications.error('Creation Failed', errorMessage)
    }
  }

  const updateStatus = async (id: number, status: string) => {
    try {
      console.log('Updating delivery note status:', { id, status })
      await shipmentApi.updateDeliveryNote(id, { delivery_status: status })
      console.log('Status updated successfully')
      notifications.success('Status Updated!', `Delivery note status changed to ${status}.`)
      await loadDeliveryNotes() // Reload to get updated data
    } catch (error) {
      console.error('Error updating status:', error)
      notifications.error('Update Failed', 'Unable to update delivery note status. Please try again.')
    }
  }

  const handleViewDeliveryNote = async (deliveryNote: ApiDeliveryNote) => {
    try {
      // Ensure organization data is loaded
      if (!organization) {
        await loadOrganization()
      }
      
      // Fetch full delivery note data with invoice items if invoice_id exists
      let invoiceItems: any[] = []
      let invoiceData: any = null
      
      if (deliveryNote.invoice_id) {
        try {
          const invoiceResponse = await invoiceApi.getInvoice(deliveryNote.invoice_id)
          invoiceData = invoiceResponse
          invoiceItems = invoiceResponse.items || []
        } catch (error) {
          console.error('Error fetching invoice data:', error)
        }
      }

      // Get customer data
      const customer = customers.find(c => c.id === deliveryNote.customer_id)
      

      
      // Create delivery note content for viewing
      const deliveryNoteContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Delivery Note - ${deliveryNote.delivery_note_number}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              color: #333;
              line-height: 1.6;
              background-color: #f5f5f5;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
              background-color: white;
              padding: 30px;
              box-shadow: 0 0 20px rgba(0,0,0,0.1);
              border-radius: 8px;
            }
            .header {
              text-align: center;
              border-bottom: 3px solid #2c3e50;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .company-name {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 8px;
              color: #2c3e50;
            }
            .company-details {
              font-size: 14px;
              color: #666;
              line-height: 1.4;
            }
            .delivery-note-title {
              font-size: 24px;
              font-weight: bold;
              margin: 30px 0;
              text-align: center;
              color: #2c3e50;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            .info-section {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
              gap: 20px;
            }
            .info-box {
              flex: 1;
              padding: 15px;
              border: 1px solid #ddd;
              border-radius: 5px;
              background-color: #f9f9f9;
            }
            .info-box h3 {
              margin: 0 0 15px 0;
              font-size: 16px;
              border-bottom: 2px solid #3498db;
              padding-bottom: 8px;
              color: #2c3e50;
            }
            .info-row {
              margin-bottom: 10px;
              font-size: 14px;
              display: flex;
              justify-content: space-between;
            }
            .info-label {
              font-weight: bold;
              color: #555;
              min-width: 120px;
            }
            .info-value {
              color: #333;
              text-align: right;
            }
            .items-section {
              margin: 30px 0;
            }
            .items-section h3 {
              font-size: 18px;
              color: #2c3e50;
              margin-bottom: 15px;
              border-bottom: 2px solid #3498db;
              padding-bottom: 8px;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .items-table th,
            .items-table td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
              font-size: 11px;
            }
            .items-table th {
              background-color: #3498db;
              color: white;
              font-weight: bold;
            }
            .items-table tr:nth-child(even) {
              background-color: #f8f9fa;
            }
            .items-table tr:hover {
              background-color: #e3f2fd;
            }
            .delivery-address {
              margin: 20px 0;
              padding: 20px;
              border: 2px solid #3498db;
              border-radius: 5px;
              background-color: #f8f9fa;
            }
            .delivery-address h3 {
              margin: 0 0 15px 0;
              font-size: 16px;
              color: #2c3e50;
            }
            .signature-section {
              margin-top: 50px;
              display: flex;
              justify-content: space-between;
              gap: 40px;
            }
            .signature-box {
              flex: 1;
              text-align: center;
              padding: 20px;
              border: 1px solid #ddd;
              border-radius: 5px;
              background-color: #f9f9f9;
            }
            .signature-line {
              border-top: 2px solid #333;
              margin-top: 60px;
              padding-top: 15px;
              font-weight: bold;
              color: #2c3e50;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 12px;
              color: #666;
              border-top: 1px solid #ccc;
              padding-top: 20px;
            }
            .status-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: bold;
              text-transform: uppercase;
            }
            .status-pending { background-color: #fff3cd; color: #856404; }
            .status-delivered { background-color: #d4edda; color: #155724; }
            .status-failed { background-color: #f8d7da; color: #721c24; }
            .status-in-transit { background-color: #cce5ff; color: #004085; }
            .status-refused { background-color: #f8d7da; color: #721c24; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="company-name">${organization?.company_name || 'Company Name'}</div>
              <div class="company-details">
                ${[organization?.address, organization?.city, organization?.state, organization?.postal_code].filter(Boolean).join(', ')}<br>
                ${organization?.phone ? `Phone: ${organization.phone}` : ''} ${organization?.phone && organization?.email ? '|' : ''} ${organization?.email ? `Email: ${organization.email}` : ''}<br>
                ${organization?.gst_number ? `GST: ${organization.gst_number}` : ''} ${organization?.gst_number && organization?.pan_number ? '|' : ''} ${organization?.pan_number ? `PAN: ${organization.pan_number}` : ''}
              </div>
            </div>

            <div class="delivery-note-title">Delivery Note</div>

            <div class="info-section">
              <div class="info-box">
                <h3>Delivery Note Details</h3>
                <div class="info-row">
                  <span class="info-label">Delivery Note No:</span>
                  <span class="info-value">${deliveryNote.delivery_note_number}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Date:</span>
                  <span class="info-value">${new Date(deliveryNote.delivery_date).toLocaleDateString('en-GB')}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Status:</span>
                  <span class="info-value">
                    ${(() => {
                      // If there's a shipment for this invoice, show shipment status
                      if (deliveryNote.invoice_id) {
                        const shipment = shipments.find(s => s.invoice_id === deliveryNote.invoice_id)
                        if (shipment) {
                          return `<span class="status-badge status-${shipment.status.toLowerCase().replace(' ', '-')}">
                            ${shipment.status} (Shipment)
                          </span>`
                        }
                      }
                      // Otherwise show delivery note status
                      return `<span class="status-badge status-${deliveryNote.delivery_status.toLowerCase().replace(' ', '-')}">
                        ${deliveryNote.delivery_status}
                      </span>`
                    })()}
                  </span>
                </div>
                ${deliveryNote.invoice_id ? `
                <div class="info-row">
                  <span class="info-label">Invoice No:</span>
                  <span class="info-value">${invoiceData?.invoice_number || 'N/A'}</span>
                </div>
                ` : ''}
              </div>

              <div class="info-box">
                <h3>Customer Details</h3>
                <div class="info-row">
                  <span class="info-label">Name:</span>
                  <span class="info-value">${customer?.company_name || `${customer?.first_name || ''} ${customer?.last_name || ''}`}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Email:</span>
                  <span class="info-value">${customer?.email || 'N/A'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Phone:</span>
                  <span class="info-value">${customer?.phone || customer?.mobile || 'N/A'}</span>
                </div>
              </div>
            </div>

            ${invoiceItems.length > 0 ? `
            <div class="items-section">
              <h3>Items to be Delivered</h3>
              <table class="items-table">
                <thead>
                  <tr>
                    <th>Sr. No.</th>
                    <th>Item Name</th>
                    <th>Description</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${invoiceItems.map((item, index) => `
                    <tr>
                      <td>${index + 1}</td>
                      <td>${item.item_name}</td>
                      <td>${item.item_description || 'N/A'}</td>
                      <td>${item.quantity}</td>
                      <td>₹${parseFloat(item.unit_price).toFixed(2)}</td>
                      <td>₹${parseFloat(item.line_total).toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            ` : ''}

            <div class="delivery-address">
              <h3>Delivery Address</h3>
              <div>${deliveryNote.delivery_address.replace(/\n/g, '<br>')}</div>
            </div>

            ${deliveryNote.delivery_notes ? `
            <div class="delivery-address">
              <h3>Delivery Notes</h3>
              <div>${deliveryNote.delivery_notes.replace(/\n/g, '<br>')}</div>
            </div>
            ` : ''}

            ${deliveryNote.special_instructions ? `
            <div class="delivery-address">
              <h3>Special Instructions</h3>
              <div>${deliveryNote.special_instructions.replace(/\n/g, '<br>')}</div>
            </div>
            ` : ''}

            <div class="signature-section">
              <div class="signature-box">
                <div class="signature-line">Customer Signature</div>
              </div>
              <div class="signature-box">
                <div class="signature-line">Authorized Signature</div>
              </div>
            </div>

            <div class="footer">
              <p>This is a computer generated delivery note. No signature required for electronic delivery.</p>
              <p>Generated on: ${new Date().toLocaleString('en-GB')}</p>
            </div>
          </div>
        </body>
        </html>
      `

      // Open in new window
      const newWindow = window.open('', '_blank')
      if (newWindow) {
        newWindow.document.write(deliveryNoteContent)
        newWindow.document.close()
      }
    } catch (error: any) {
      console.error('Error viewing delivery note:', error)
      notifications.error('View Failed', 'Unable to view delivery note. Please try again.')
    }
  }

  const handleDownloadDeliveryNote = async (deliveryNote: ApiDeliveryNote) => {
    try {
      // Ensure organization data is loaded
      if (!organization) {
        await loadOrganization()
      }
      
      // Fetch full delivery note data with invoice items if invoice_id exists
      let invoiceItems: any[] = []
      let invoiceData: any = null
      
      if (deliveryNote.invoice_id) {
        try {
          const invoiceResponse = await invoiceApi.getInvoice(deliveryNote.invoice_id)
          invoiceData = invoiceResponse
          invoiceItems = invoiceResponse.items || []
        } catch (error) {
          console.error('Error fetching invoice data:', error)
        }
      }

      // Get customer data
      const customer = customers.find(c => c.id === deliveryNote.customer_id)
      

      
      // Create delivery note PDF content optimized for printing
      const deliveryNoteContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Delivery Note - ${deliveryNote.delivery_note_number}</title>
          <style>
            @media print {
              body { margin: 0; padding: 15px; }
              .no-print { display: none; }
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              color: #333;
              line-height: 1.6;
              font-size: 12px;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .company-name {
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .company-details {
              font-size: 14px;
              color: #666;
            }
            .delivery-note-title {
              font-size: 18px;
              font-weight: bold;
              margin: 20px 0;
              text-align: center;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .info-section {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
            }
            .info-box {
              flex: 1;
              margin: 0 10px;
            }
            .info-box h3 {
              margin: 0 0 10px 0;
              font-size: 16px;
              border-bottom: 1px solid #ccc;
              padding-bottom: 5px;
            }
            .info-row {
              margin-bottom: 8px;
              font-size: 14px;
            }
            .info-label {
              font-weight: bold;
              color: #555;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            .items-table th,
            .items-table td {
              border: 1px solid #ddd;
              padding: 12px;
              text-align: left;
            }
            .items-table th {
              background-color: #f5f5f5;
              font-weight: bold;
              font-size: 11px;
            }
            .items-table tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .delivery-address {
              margin: 20px 0;
              padding: 15px;
              border: 1px solid #ddd;
              background-color: #f9f9f9;
            }
            .delivery-address h3 {
              margin: 0 0 10px 0;
              font-size: 16px;
            }
            .signature-section {
              margin-top: 40px;
              display: flex;
              justify-content: space-between;
            }
            .signature-box {
              width: 45%;
              text-align: center;
            }
            .signature-line {
              border-top: 1px solid #333;
              margin-top: 50px;
              padding-top: 10px;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 12px;
              color: #666;
              border-top: 1px solid #ccc;
              padding-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">${organization?.company_name || 'Company Name'}</div>
            <div class="company-details">
              ${[organization?.address, organization?.city, organization?.state, organization?.postal_code].filter(Boolean).join(', ')}<br>
              ${organization?.phone ? `Phone: ${organization.phone}` : ''} ${organization?.phone && organization?.email ? '|' : ''} ${organization?.email ? `Email: ${organization.email}` : ''}<br>
              ${organization?.gst_number ? `GST: ${organization.gst_number}` : ''} ${organization?.gst_number && organization?.pan_number ? '|' : ''} ${organization?.pan_number ? `PAN: ${organization.pan_number}` : ''}
            </div>
          </div>

          <div class="delivery-note-title">DELIVERY NOTE</div>

          <div class="info-section">
            <div class="info-box">
              <h3>Delivery Note Details</h3>
              <div class="info-row">
                <span class="info-label">Delivery Note No:</span> ${deliveryNote.delivery_note_number}
              </div>
              <div class="info-row">
                <span class="info-label">Date:</span> ${new Date(deliveryNote.delivery_date).toLocaleDateString('en-GB')}
              </div>
              <div class="info-row">
                <span class="info-label">Status:</span> ${(() => {
                  // If there's a shipment for this invoice, show shipment status
                  if (deliveryNote.invoice_id) {
                    const shipment = shipments.find(s => s.invoice_id === deliveryNote.invoice_id)
                    if (shipment) {
                      return `${shipment.status} (Shipment)`
                    }
                  }
                  // Otherwise show delivery note status
                  return deliveryNote.delivery_status
                })()}
              </div>
              ${deliveryNote.invoice_id ? `
              <div class="info-row">
                <span class="info-label">Invoice No:</span> ${invoiceData?.invoice_number || 'N/A'}
              </div>
              ` : ''}
            </div>

            <div class="info-box">
              <h3>Customer Details</h3>
              <div class="info-row">
                <span class="info-label">Name:</span> ${customer?.company_name || `${customer?.first_name || ''} ${customer?.last_name || ''}`}
              </div>
              <div class="info-row">
                <span class="info-label">Email:</span> ${customer?.email || 'N/A'}
              </div>
              <div class="info-row">
                <span class="info-label">Phone:</span> ${customer?.phone || customer?.mobile || 'N/A'}
              </div>
            </div>
          </div>

          ${invoiceItems.length > 0 ? `
          <h3>Items to be Delivered</h3>
          <table class="items-table">
            <thead>
              <tr>
                <th>Sr. No.</th>
                <th>Item Name</th>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceItems.map((item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.item_name}</td>
                  <td>${item.item_description || 'N/A'}</td>
                  <td>${item.quantity}</td>
                  <td>₹${parseFloat(item.unit_price).toFixed(2)}</td>
                  <td>₹${parseFloat(item.line_total).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ` : ''}

          <div class="delivery-address">
            <h3>Delivery Address</h3>
            <div>${deliveryNote.delivery_address.replace(/\n/g, '<br>')}</div>
          </div>

          ${deliveryNote.delivery_notes ? `
          <div class="delivery-address">
            <h3>Delivery Notes</h3>
            <div>${deliveryNote.delivery_notes.replace(/\n/g, '<br>')}</div>
          </div>
          ` : ''}

          ${deliveryNote.special_instructions ? `
          <div class="delivery-address">
            <h3>Special Instructions</h3>
            <div>${deliveryNote.special_instructions.replace(/\n/g, '<br>')}</div>
          </div>
          ` : ''}

          <div class="signature-section">
            <div class="signature-box">
              <div class="signature-line">Customer Signature</div>
            </div>
            <div class="signature-box">
              <div class="signature-line">Authorized Signature</div>
            </div>
          </div>

          <div class="footer">
            <p>This is a computer generated delivery note. No signature required for electronic delivery.</p>
            <p>Generated on: ${new Date().toLocaleString('en-GB')}</p>
          </div>
        </body>
        </html>
      `

      // Create blob and download
      const blob = new Blob([deliveryNoteContent], { type: 'text/html' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Delivery_Note_${deliveryNote.delivery_note_number}_${new Date(deliveryNote.delivery_date).toISOString().split('T')[0]}.html`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      notifications.success('Delivery Note Downloaded!', `Delivery note ${deliveryNote.delivery_note_number} has been downloaded.`)
    } catch (error: any) {
      console.error('Error downloading delivery note:', error)
      notifications.error('Download Failed', 'Unable to download delivery note. Please try again.')
    }
  }

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
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-700 bg-clip-text text-transparent">
            Delivery Notes
          </h1>
          <p className="text-gray-600 mt-1">Manage delivery notes and track shipments</p>

        </div>
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              // Reset form when dialog closes
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Delivery Note
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Delivery Note</DialogTitle>
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
                        className="w-full"
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
                                {new Date(invoice.invoice_date).toLocaleDateString()}
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
                    <div className="relative">
                      <Input
                        placeholder="Search customers..."
                        value={getCustomerInputValue()}
                        onChange={(e) => handleCustomerInputChange(e.target.value)}
                        onFocus={() => setShowCustomerDropdown(true)}
                        onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                        className="w-full"
                      />
                      {showCustomerDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {getFilteredCustomers().map(customer => (
                            <div
                              key={customer.id}
                              onClick={() => handleCustomerChange(customer.id)}
                              className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              <div className="font-medium text-gray-900">
                                {customer.company_name || `${customer.first_name} ${customer.last_name}`}
                              </div>
                              <div className="text-sm text-gray-500">
                                {customer.email}
                              </div>
                              {customer.city && customer.state && (
                                <div className="text-xs text-gray-400">
                                  {customer.city}, {customer.state}
                                </div>
                              )}
                            </div>
                          ))}
                          {getFilteredCustomers().length === 0 && (
                            <div className="p-3 text-gray-500 text-sm">No customers found</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="shipment">Shipment</Label>
                  <Input
                    id="shipment"
                    type="text"
                    value={formData.shipment_id > 0 ? getShipmentNumber(formData.shipment_id) : ''}
                    onChange={(e) => setFormData({ ...formData, shipment_id: parseInt(e.target.value) || 0 })}
                    placeholder="Will be auto-filled when invoice is selected"
                    readOnly={formData.shipment_id > 0}
                    className={formData.shipment_id > 0 ? "bg-gray-50" : ""}
                  />
                  {formData.shipment_id > 0 && (
                    <p className="text-sm text-green-600 mt-1">
                      ✓ Shipment auto-linked from invoice
                    </p>
                  )}
                </div>
                <div>
                  <Label>Delivery Date</Label>
                  <input
                    type="date"
                    value={selectedDate ? selectedDate.toISOString().split('T')[0] : ''}
                    onChange={(e) => setSelectedDate(e.target.value ? new Date(e.target.value) : undefined)}
                    min={formatDate(getMinimumDeliveryDate(), "yyyy-MM-dd")}
                    className="w-full p-2 border border-white/20 rounded-md bg-white/50"
                  />
                  {formData.invoice_id > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      ℹ Delivery date must be on or after invoice date
                    </p>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="address">Delivery Address</Label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="useSameAddress"
                        checked={useSameAddress}
                        onChange={(e) => handleUseSameAddressChange(e.target.checked)}
                        className="w-4 h-4 text-violet-600 bg-gray-100 border-gray-300 rounded focus:ring-violet-500 focus:ring-2"
                      />
                      <Label htmlFor="useSameAddress" className="text-sm font-normal text-gray-600 cursor-pointer">
                        Same as customer address
                      </Label>
                    </div>
                  </div>
                  <Textarea
                    id="address"
                    value={formData.delivery_address}
                    onChange={(e) => {
                      setFormData({ ...formData, delivery_address: e.target.value })
                      // Uncheck the checkbox if user manually edits
                      if (useSameAddress) setUseSameAddress(false)
                    }}
                    placeholder="Enter complete delivery address"
                    readOnly={useSameAddress}
                    className={useSameAddress ? "bg-gray-50 cursor-not-allowed" : ""}
                  />
                  {useSameAddress && (
                    <p className="text-sm text-green-600 mt-1">
                      ✓ Using customer's registered address
                    </p>
                  )}
                  {!formData.customer_id && useSameAddress && (
                    <p className="text-sm text-red-500 mt-1">
                      ⚠ Please select a customer first
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="notes">Delivery Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.delivery_notes}
                    onChange={(e) => setFormData({ ...formData, delivery_notes: e.target.value })}
                    placeholder="Any special delivery instructions"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateDeliveryNote} className="bg-gradient-to-r from-violet-500 to-purple-600">
                    Create Delivery Note
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Delivery Status Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card 
          className={getTileClassName("all")}
          onClick={() => handleDeliveryStatusTileClick("all")}
        >
          <div className={`absolute inset-0 bg-gradient-to-br from-violet-500/10 to-violet-600/20`}></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-gray-700">All Status</CardTitle>
            <div className="p-2 rounded-lg bg-violet-500/20">
              <Package className="w-4 h-4 text-violet-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-violet-600">{statusCounts.all}</div>
            <p className="text-xs text-gray-600 mt-1">Total delivery notes</p>
          </CardContent>
        </Card>

        <Card 
          className={getTileClassName("Pending")}
          onClick={() => handleDeliveryStatusTileClick("Pending")}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${getStatusGradient('pending')}`}></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-gray-700">Pending</CardTitle>
            <div className="p-2 rounded-lg bg-yellow-500/20">
              {getStatusIcon('pending')}
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className={`text-2xl font-bold ${getStatusColor('pending')}`}>{statusCounts.pending}</div>
            <p className="text-xs text-gray-600 mt-1">Awaiting processing</p>
          </CardContent>
        </Card>

        <Card 
          className={getTileClassName("In Transit")}
          onClick={() => handleDeliveryStatusTileClick("In Transit")}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${getStatusGradient('in-transit')}`}></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-gray-700">In Transit</CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/20">
              {getStatusIcon('in-transit')}
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className={`text-2xl font-bold ${getStatusColor('in-transit')}`}>{statusCounts['in-transit']}</div>
            <p className="text-xs text-gray-600 mt-1">On the way</p>
          </CardContent>
        </Card>

        <Card 
          className={getTileClassName("Delivered")}
          onClick={() => handleDeliveryStatusTileClick("Delivered")}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${getStatusGradient('delivered')}`}></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-gray-700">Delivered</CardTitle>
            <div className="p-2 rounded-lg bg-green-500/20">
              {getStatusIcon('delivered')}
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className={`text-2xl font-bold ${getStatusColor('delivered')}`}>{statusCounts.delivered}</div>
            <p className="text-xs text-gray-600 mt-1">Successfully delivered</p>
          </CardContent>
        </Card>

        <Card 
          className={getTileClassName("Failed")}
          onClick={() => handleDeliveryStatusTileClick("Failed")}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${getStatusGradient('failed')}`}></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-gray-700">Failed</CardTitle>
            <div className="p-2 rounded-lg bg-red-500/20">
              {getStatusIcon('failed')}
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className={`text-2xl font-bold ${getStatusColor('failed')}`}>{statusCounts.failed}</div>
            <p className="text-xs text-gray-600 mt-1">Delivery failed</p>
          </CardContent>
        </Card>

        <Card 
          className={getTileClassName("Refused")}
          onClick={() => handleDeliveryStatusTileClick("Refused")}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${getStatusGradient('refused')}`}></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-gray-700">Refused</CardTitle>
            <div className="p-2 rounded-lg bg-gray-500/20">
              {getStatusIcon('refused')}
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className={`text-2xl font-bold ${getStatusColor('refused')}`}>{statusCounts.refused}</div>
            <p className="text-xs text-gray-600 mt-1">Delivery refused</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="bg-white/60 backdrop-blur-xl border-white/30 shadow-2xl hover:shadow-3xl transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search delivery notes..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 bg-white/70 border-white/30 focus:bg-white focus:border-violet-300"
                />
              </div>
            </div>
            <Select value={customerFilter} onValueChange={handleCustomerFilterChange}>
              <SelectTrigger className="w-48 bg-white/70 border-white/30 focus:bg-white focus:border-violet-300">
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

      {/* Delivery Notes Table */}
      <Card className="bg-white/60 backdrop-blur-xl border-white/30 shadow-2xl hover:shadow-3xl transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Delivery Notes ({totalRecords} total)
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
                <TableHead>Delivery Note</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Shipment</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
                      <span className="ml-3 text-gray-600">Loading delivery notes...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : deliveryNotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="text-gray-500">No delivery notes found</div>
                  </TableCell>
                </TableRow>
              ) : (
                deliveryNotes.map((note) => (
                  <TableRow key={note.id}>
                    <TableCell>
                      <div className="font-medium">{note.delivery_note_number}</div>
                    </TableCell>
                    <TableCell>
                      {note.invoice_id ? getInvoiceNumber(note.invoice_id) : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        if (!shipmentsLoaded) {
                          return 'Loading shipments...'
                        }
                        if (shipments.length === 0) {
                          return 'No shipments found'
                        }
                        const shipmentId = note.shipment_id
                        const shipment = shipments.find(s => s.id === shipmentId)
                        if (shipment) {
                          return shipment.shipment_number
                        }
                        return shipmentId ? 'Unknown Shipment' : 'N/A'
                      })()}
                    </TableCell>
                    <TableCell>{getCustomerName(note.customer_id)}</TableCell>
                    <TableCell>{formatDate(new Date(note.delivery_date), "MMM dd, yyyy")}</TableCell>
                    <TableCell>
                      {(() => {
                        // If there's a shipment for this invoice, show shipment status
                        if (note.invoice_id) {
                          const shipment = shipments.find(s => s.invoice_id === note.invoice_id)
                          if (shipment) {
                            return (
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  {shipment.status}
                                </Badge>
                                <span className="text-xs text-gray-500">(Shipment)</span>
                              </div>
                            )
                          }
                        }
                        
                        // Otherwise, show delivery note status with dropdown
                        return (
                          <Select value={note.delivery_status} onValueChange={(value: any) => updateStatus(note.id, value)}>
                            <SelectTrigger className="w-32">
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
                        )
                      })()}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{note.delivery_address}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleViewDeliveryNote(note)}
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDownloadDeliveryNote(note)}
                        >
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
    </div>
  )
} 