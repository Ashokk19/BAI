"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/utils/AuthContext"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { DatePopover } from "@/components/ui/date-popover"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Search, FileText, Eye, Download, Send, TrendingUp, DollarSign, Clock, CheckCircle, Plus, RefreshCw, Trash2, ChevronLeft, ChevronRight, Truck } from "lucide-react"
import { toast } from "sonner"
import { invoiceApi, Invoice, InvoiceFilters } from "../../services/invoiceApi"
import { customerApi, Customer } from "../../services/customerApi"
import { organizationService } from "../../services/organizationService"
import { shipmentApi, DeliveryNote } from "../../services/shipmentApi"
import { paymentApi, Payment } from "../../services/paymentApi"

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

// Convert number to words utility
const convertNumberToWords = (amount: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  
  const convertLessThanOneThousand = (num: number): string => {
    if (num === 0) return '';
    
    if (num < 10) return ones[num];
    
    if (num < 20) return teens[num - 10];
    
    if (num < 100) {
      return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
    }
    
    return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' and ' + convertLessThanOneThousand(num % 100) : '');
  };
  
  const convert = (num: number): string => {
    if (num === 0) return 'Zero';
    
    const crore = Math.floor(num / 10000000);
    const lakh = Math.floor((num % 10000000) / 100000);
    const thousand = Math.floor((num % 100000) / 1000);
    const remainder = num % 1000;
    
    let result = '';
    
    if (crore > 0) {
      result += convertLessThanOneThousand(crore) + ' Crore';
    }
    
    if (lakh > 0) {
      result += (result ? ' ' : '') + convertLessThanOneThousand(lakh) + ' Lakh';
    }
    
    if (thousand > 0) {
      result += (result ? ' ' : '') + convertLessThanOneThousand(thousand) + ' Thousand';
    }
    
    if (remainder > 0) {
      result += (result ? ' ' : '') + convertLessThanOneThousand(remainder);
    }
    
    return result;
  };
  
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  
  let result = convert(rupees) + ' Rupees';
  
  if (paise > 0) {
    result += ' and ' + convert(paise) + ' Paise';
  }
  
  return result;
}

export default function InvoiceHistory() {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [deliveryNotes, setDeliveryNotes] = useState<{ [invoiceId: number]: DeliveryNote[] }>({})
  const [deliveryStatuses, setDeliveryStatuses] = useState<{[key: number]: string}>({})
  const [paymentStatuses, setPaymentStatuses] = useState<{[key: number]: string}>({})
  const [deliveryStatusesLoaded, setDeliveryStatusesLoaded] = useState(false)
  const [paymentStatusesLoaded, setPaymentStatusesLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [customerFilter, setCustomerFilter] = useState("all")
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const recordsPerPage = 10

  // Load customers on component mount (only once)
  useEffect(() => {
    loadCustomers()
  }, [])

  // Load invoices when filters or page change (includes initial mount)
  useEffect(() => {
    loadInvoices()
  }, [searchTerm, customerFilter, dateRange, currentPage])

  const loadInvoices = async () => {
    try {
      setLoading(true)
      const skip = (currentPage - 1) * recordsPerPage
      const filters: InvoiceFilters = {
        limit: recordsPerPage,
        skip: skip,
        sort_by: 'id',
        sort_order: 'desc'
      }
      
      if (searchTerm) {
        filters.search = searchTerm
      }
      
      if (customerFilter !== "all") {
        filters.customer_id = parseInt(customerFilter)
      }
      
      if (dateRange.from) {
        filters.date_from = dateRange.from.toISOString().split('T')[0]
      }
      
      if (dateRange.to) {
        filters.date_to = dateRange.to.toISOString().split('T')[0]
      }

      const response = await invoiceApi.getInvoices(filters)
      console.log('📊 Invoice API Response:', { total: response.total, invoiceCount: response.invoices?.length })
      setInvoices(response.invoices || [])
      
      // Calculate pagination info
      const total = response.total || response.invoices?.length || 0
      setTotalRecords(total)
      setTotalPages(Math.ceil(total / recordsPerPage))
      
      // Load all statuses in parallel for all invoices
      if (response.invoices.length > 0) {
        await loadAllStatusesInParallel(response.invoices)
      }
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

  // Consolidated function to load all statuses in parallel
  const loadAllStatusesInParallel = async (invoiceList: Invoice[]) => {
    console.log('🚀 Loading all statuses in parallel for', invoiceList.length, 'invoices')
    
    const invoiceIds = invoiceList.map(inv => inv.id)
    
    // Fetch all shipments and delivery notes in parallel using Promise.all
    const [shipmentsResults, deliveryNotesResults, paymentResults] = await Promise.all([
      // Fetch shipments for all invoices in parallel
      Promise.all(invoiceIds.map(async (id) => {
        try {
          const shipments = await shipmentApi.getShipmentsByInvoice(id)
          return { invoiceId: id, shipments }
        } catch (error) {
          console.error(`Error fetching shipments for invoice ${id}:`, error)
          return { invoiceId: id, shipments: [] }
        }
      })),
      // Fetch delivery notes for all invoices in parallel
      Promise.all(invoiceIds.map(async (id) => {
        try {
          const notes = await shipmentApi.getDeliveryNotesByInvoice(id)
          return { invoiceId: id, notes }
        } catch (error) {
          console.error(`Error fetching delivery notes for invoice ${id}:`, error)
          return { invoiceId: id, notes: [] }
        }
      })),
      // Fetch payments for all invoices in parallel
      Promise.all(invoiceIds.map(async (id) => {
        try {
          const payments = await paymentApi.getPayments({ invoice_id: id, limit: 100 })
          return { invoiceId: id, payments: payments.payments }
        } catch (error) {
          console.error(`Error fetching payments for invoice ${id}:`, error)
          return { invoiceId: id, payments: [] }
        }
      }))
    ])
    
    // Build maps from results
    const shipmentsMap: { [key: number]: any[] } = {}
    const notesMap: { [key: number]: DeliveryNote[] } = {}
    const paymentsMap: { [key: number]: Payment[] } = {}
    
    shipmentsResults.forEach(result => {
      shipmentsMap[result.invoiceId] = result.shipments
    })
    
    deliveryNotesResults.forEach(result => {
      notesMap[result.invoiceId] = result.notes
    })
    
    paymentResults.forEach(result => {
      paymentsMap[result.invoiceId] = result.payments
    })
    
    // Set delivery notes state
    setDeliveryNotes(notesMap)
    
    // Compute delivery statuses from shipments and delivery notes
    const deliveryStatusMap: { [key: number]: string } = {}
    for (const invoice of invoiceList) {
      const shipments = shipmentsMap[invoice.id] || []
      const notes = notesMap[invoice.id] || []
      
      // Priority: Check shipments first, then delivery notes
      if (shipments.length > 0) {
        const latestShipment = shipments.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0]
        
        const statusLower = latestShipment.status?.toLowerCase() || 'pending'
        switch (statusLower) {
          case 'delivered':
            deliveryStatusMap[invoice.id] = 'Delivered'
            break
          case 'in_transit':
          case 'in transit':
          case 'shipped':
            deliveryStatusMap[invoice.id] = 'In Transit'
            break
          case 'cancelled':
          case 'failed':
            deliveryStatusMap[invoice.id] = 'Failed'
            break
          case 'refused':
            deliveryStatusMap[invoice.id] = 'Refused'
            break
          default:
            deliveryStatusMap[invoice.id] = 'Pending'
        }
      } else if (notes.length > 0) {
        // Fallback to delivery notes if no shipments
        const latestNote = notes.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0]
        
        const statusLower = (latestNote.delivery_status || 'pending').toLowerCase()
        switch (statusLower) {
          case 'delivered':
            deliveryStatusMap[invoice.id] = 'Delivered'
            break
          case 'in transit':
          case 'in_transit':
            deliveryStatusMap[invoice.id] = 'In Transit'
            break
          case 'failed':
            deliveryStatusMap[invoice.id] = 'Failed'
            break
          case 'refused':
            deliveryStatusMap[invoice.id] = 'Refused'
            break
          default:
            deliveryStatusMap[invoice.id] = 'Pending'
        }
      } else {
        deliveryStatusMap[invoice.id] = 'Pending'
      }
    }
    
    // Compute payment statuses
    const paymentStatusMap: { [key: number]: string } = {}
    for (const invoice of invoiceList) {
      const payments = paymentsMap[invoice.id] || []
      
      if (payments.length === 0) {
        paymentStatusMap[invoice.id] = 'Pending'
      } else {
        let totalPaid = 0
        let hasCreditPayments = false
        
        payments.forEach((payment: any) => {
          const amount = typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount
          
          if (payment.payment_status === 'credit' || payment.payment_method === 'credit') {
            hasCreditPayments = true
          } else {
            totalPaid += amount
          }
        })
        
        const invoiceAmount = typeof invoice.total_amount === 'string' ? parseFloat(invoice.total_amount) : invoice.total_amount
        
        if (hasCreditPayments) {
          paymentStatusMap[invoice.id] = 'Credit'
        } else if (totalPaid >= invoiceAmount) {
          paymentStatusMap[invoice.id] = 'Completed'
        } else if (totalPaid > 0) {
          paymentStatusMap[invoice.id] = 'Partial'
        } else {
          paymentStatusMap[invoice.id] = 'Pending'
        }
      }
    }
    
    // Update all states at once
    setDeliveryStatuses(deliveryStatusMap)
    setDeliveryStatusesLoaded(true)
    setPaymentStatuses(paymentStatusMap)
    setPaymentStatusesLoaded(true)
    
    console.log('✅ All statuses loaded:', { delivery: deliveryStatusMap, payment: paymentStatusMap })
  }

  const getDeliveryStatus = (invoiceId: number): string => {
    if (!deliveryStatusesLoaded) {
      return 'Loading...'
    }
    return deliveryStatuses[invoiceId] || 'Pending'
  }

  const getPaymentStatus = (invoiceId: number): string => {
    // If payment statuses haven't been loaded yet, show loading state
    if (!paymentStatusesLoaded) {
      return 'Loading...'
    }
    return paymentStatuses[invoiceId] || 'Pending'
  }

  const getDeliveryStatusColor = (status: string): string => {
    switch (status) {
      case 'Delivered':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'In Transit':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Failed':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'Refused':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'Loading...':
        return 'bg-gray-100 text-gray-600 border-gray-300 animate-pulse'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPaymentStatusColor = (status: string): string => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'Credit':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'Partial':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Loading...':
        return 'bg-gray-100 text-gray-600 border-gray-300 animate-pulse'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
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

  const handleCreateDeliveryNotesForInvoices = async () => {
    try {
      const response = await shipmentApi.createDeliveryNotesForInvoices()
      toast.success('Delivery Notes Created!')
      // Reload data to show new delivery notes
      await loadInvoices()
    } catch (error) {
      console.error('Error creating delivery notes:', error)
      toast.error('Creation Failed')
    }
  }

  const handleRefreshStatuses = async () => {
    try {
      // Reload all statuses for existing invoices
      if (invoices.length > 0) {
        setDeliveryStatusesLoaded(false)
        setPaymentStatusesLoaded(false)
        await loadAllStatusesInParallel(invoices)
        toast.success('Statuses refreshed!')
      }
    } catch (error) {
      console.error('Error refreshing statuses:', error)
      toast.error('Failed to refresh statuses')
    }
  }

  const handleViewInvoice = (invoiceId: number) => {
    // TODO: Implement view invoice functionality
    toast.info("View invoice functionality coming soon!")
  }

  const handleDownloadInvoice = async (invoiceId: number) => {
    try {
      // Get the specific invoice data
      const invoice = await invoiceApi.getInvoice(invoiceId);
      const customer = customers.find(c => c.id === invoice.customer_id);
      
      if (!customer) {
        toast.error("Customer information not found");
        return;
      }

      // Get organization details
      const organization = await organizationService.getOrganizationProfile();

      const customerName = customer.company_name || `${customer.first_name} ${customer.last_name}`;
      const currentCustomer = customer;
      const invoiceNumber = invoice.invoice_number;
      const currentDate = new Date();

      // Fetch logo as base64 from DB for reliable PDF embedding
      let logoSrc = '';
      try {
        const logoResult = await organizationService.getLogo();
        if (logoResult.logo_data) logoSrc = logoResult.logo_data;
      } catch (e) {
        console.warn('Failed to load logo:', e);
      }

      // Dynamic accent color from organization settings
      const accentColor = (organization as any)?.tax_invoice_color || '#4c1d95';
      const darkerBorder = (() => {
        const hex = accentColor.replace('#', '');
        const r = Math.max(0, parseInt(hex.substring(0, 2), 16) - 30);
        const g = Math.max(0, parseInt(hex.substring(2, 4), 16) - 30);
        const b = Math.max(0, parseInt(hex.substring(4, 6), 16) - 30);
        return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
      })();
      
      // Determine GST type based on customer and organization states
      const customerState = currentCustomer.state || '';
      const organizationState = organization?.state || '';
      const isInterState = customerState.toLowerCase() !== organizationState.toLowerCase();
      
      // Calculate GST breakdown for each item
      const itemsWithGSTBreakdown = invoice.items.map(item => {
        const baseAmount = (item.quantity * item.unit_price) - (item.discount_amount || 0);
        
        // Get GST rate from the item - this should be the main GST rate
        let gstRate = item.gst_rate || 0;
        
        // If gst_rate is not available, try to calculate from other GST fields
        if (!gstRate) {
          if (item.igst_rate && item.igst_rate > 0) {
            gstRate = item.igst_rate;
          } else if (item.cgst_rate && item.sgst_rate) {
            gstRate = item.cgst_rate + item.sgst_rate;
          }
        }
        
        // Calculate GST amounts based on the determined rate
        let cgstAmount = 0;
        let sgstAmount = 0;
        let igstAmount = 0;
        
        if (gstRate > 0) {
          if (isInterState) {
            // Inter-state: Use IGST
            igstAmount = (baseAmount * gstRate) / 100;
          } else {
            // Intra-state: Split into CGST and SGST
            cgstAmount = (baseAmount * (gstRate / 2)) / 100;
            sgstAmount = (baseAmount * (gstRate / 2)) / 100;
          }
        }
        
        return {
          ...item,
          cgstAmount: Math.round(cgstAmount * 100) / 100, // Round to 2 decimal places
          sgstAmount: Math.round(sgstAmount * 100) / 100, // Round to 2 decimal places
          igstAmount: Math.round(igstAmount * 100) / 100, // Round to 2 decimal places
          gstRate: gstRate
        };
      });
      
      // Calculate totals with GST breakdown
      const subtotal = itemsWithGSTBreakdown.reduce((sum, item) => sum + ((item.quantity * item.unit_price) - (item.discount_amount || 0)), 0);
      const totalCGST = itemsWithGSTBreakdown.reduce((sum, item) => sum + item.cgstAmount, 0);
      const totalSGST = itemsWithGSTBreakdown.reduce((sum, item) => sum + item.sgstAmount, 0);
      const totalIGST = itemsWithGSTBreakdown.reduce((sum, item) => sum + item.igstAmount, 0);
      const totalTax = totalCGST + totalSGST + totalIGST;
      const totalAmount = subtotal + totalTax;
      
      // Round all totals to 2 decimal places
      const roundedSubtotal = Math.round(subtotal * 100) / 100;
      const roundedTotalCGST = Math.round(totalCGST * 100) / 100;
      const roundedTotalSGST = Math.round(totalSGST * 100) / 100;
      const roundedTotalIGST = Math.round(totalIGST * 100) / 100;
      const roundedTotalTax = Math.round(totalTax * 100) / 100;
      const roundedTotalAmount = Math.round(totalAmount * 100) / 100;
      
      // Signature preferences from current user
      const signatureName = ((user as any)?.signature_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username || '').toString();
      const signatureStyle = ((user as any)?.signature_style || 'handwritten') as string;
      const signatureStyleCss = (() => {
        switch (signatureStyle) {
          case 'cursive':
            return "font-family: cursive; font-size: 18px;";
          case 'print':
            return "font-family: 'Times New Roman', Times, serif; font-size: 16px; font-weight: 600;";
          case 'mono':
            return "font-family: 'Courier New', monospace; font-size: 16px; font-weight: 600;";
          case 'handwritten':
          default:
            return "font-family: 'Brush Script MT', 'Segoe Script', 'Lucida Handwriting', cursive; font-size: 20px; font-weight: 500;";
        }
      })();
      
      const invoiceContent = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Tax Invoice - ${customerName}</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
              }
              
              body {
                font-family: 'Arial', sans-serif;
                line-height: 1.3;
                color: #333;
                background: #ffffff;
                padding: 12mm;
                margin: 0;
              }
              
              .invoice-container {
                max-width: 195mm;
                margin: 0 auto;
                background: white;
              }
            
              /* Header Section */
              .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 2px solid ${accentColor};
                padding-bottom: 12px;
                margin-bottom: 15px;
              }
              
              .company-info h1 {
                font-size: 24px;
                font-weight: bold;
                color: ${accentColor};
                margin-bottom: 4px;
              }
              
              .company-info p {
                font-size: 13px;
                color: #666;
                margin: 1px 0;
                line-height: 1.2;
              }
              
              .invoice-title {
                text-align: right;
              }
              
              .invoice-title h2 {
                font-size: 28px;
                font-weight: bold;
                color: #333;
                margin-bottom: 4px;
              }
              
              .invoice-number {
                font-size: 15px;
                color: ${accentColor};
                font-weight: bold;
              }
              
              /* Invoice Details */
              .invoice-details {
                display: flex;
                justify-content: space-between;
                background: #f8f9fa;
                padding: 8px 12px;
                border-radius: 4px;
                margin-bottom: 15px;
                border: 1px solid #e9ecef;
              }
              
              .detail-group {
                flex: 1;
                text-align: center;
              }
              
              .detail-label {
                font-size: 11px;
                color: #666;
                text-transform: uppercase;
                font-weight: bold;
                margin-bottom: 2px;
              }
              
              .detail-value {
                font-size: 14px;
                font-weight: bold;
                color: #333;
              }
              
              /* Customer Information */
              .customer-section {
                display: flex;
                justify-content: space-between;
                margin-bottom: 15px;
              }
              
              .bill-to, .company-details {
                flex: 1;
                padding: 10px;
                border: 1px solid #e9ecef;
                border-radius: 4px;
                background: #fafafa;
              }
              
              .bill-to {
                margin-right: 10px;
              }
              
              .company-details {
                margin-left: 10px;
              }
              
              .section-title {
                font-size: 12px;
                font-weight: bold;
                color: ${accentColor};
                text-transform: uppercase;
                margin-bottom: 6px;
                border-bottom: 1px solid #e9ecef;
                padding-bottom: 2px;
              }
              
              .customer-name {
                font-size: 16px;
                font-weight: bold;
                color: #333;
                margin-bottom: 6px;
              }
              
              .customer-details p, .company-details p {
                margin-bottom: 2px;
                font-size: 12px;
                color: #555;
                line-height: 1.3;
              }
              
              .customer-details strong, .company-details strong {
                color: #333;
              }
              
              /* Items Table */
              .items-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 15px;
                border: 2px solid ${accentColor};
                border-radius: 4px;
                overflow: hidden;
              }
              
              .items-table thead {
                background: ${accentColor};
              }
              
              .items-table th {
                padding: 8px 6px;
                text-align: left;
                font-weight: bold;
                font-size: 12px;
                color: white;
                text-transform: uppercase;
                border: 1px solid ${darkerBorder};
                vertical-align: middle;
              }
              
              .items-table th:last-child,
              .items-table td:last-child {
                text-align: right;
              }
              
              .items-table tbody tr {
                border-bottom: 1px solid #e5e7eb;
              }
              
              .items-table tbody tr:nth-child(even) {
                background-color: #f8fafc;
              }
              
              .items-table tbody tr:nth-child(odd) {
                background-color: #ffffff;
              }
              
              .items-table td {
                padding: 6px;
                font-size: 12px;
                color: #333;
                line-height: 1.2;
                border: 1px solid #e5e7eb;
                vertical-align: middle;
              }
              
              .items-table tbody tr:last-child {
                border-bottom: 2px solid ${accentColor};
                background-color: #f1f5f9;
                font-weight: bold;
              }
              
              .item-name {
                font-weight: bold;
                color: #333;
                margin-bottom: 1px;
              }
              
              .item-sku {
                font-size: 10px;
                color: #666;
                font-style: italic;
              }
              
              /* Summary Section */
              .summary-section {
                display: flex;
                justify-content: flex-end;
                margin-bottom: 15px;
              }
              
              .summary-table {
                width: 280px;
                border-collapse: collapse;
                border: 2px solid ${accentColor};
                border-radius: 4px;
                overflow: hidden;
              }
              
              .summary-table tr {
                border-bottom: 1px solid #e5e7eb;
              }
              
              .summary-table tr:last-child {
                border-bottom: none;
              }
              
              .summary-table td {
                padding: 6px 10px;
                font-size: 12px;
                border: 1px solid #e5e7eb;
              }
              
              .summary-table .label {
                font-weight: bold;
                color: #555;
              }
              
              .summary-table .value {
                text-align: right;
                font-weight: bold;
                color: #333;
              }
              
              .tax-breakdown {
                background: #f8f9fa;
              }
              
              .total-row {
                background: ${accentColor};
              }
              
              .total-row .label,
              .total-row .value {
                color: white;
                font-size: 14px;
                font-weight: bold;
                padding: 8px 10px;
                border: 1px solid ${darkerBorder};
              }
              
              .amount-words {
                background: #f8f9fa;
                padding: 8px 12px;
                border-radius: 4px;
                border: 1px dashed #ccc;
                margin-bottom: 12px;
                text-align: center;
              }
              
              .amount-words .label {
                font-size: 11px;
                color: #666;
                margin-bottom: 2px;
              }
              
              .amount-words .value {
                font-size: 14px;
                font-weight: bold;
                color: #333;
              }
              
              /* Bank Details */
              .bank-details {
                background: #f8f9fa;
                padding: 8px 12px;
                border-radius: 4px;
                border: 1px solid #e9ecef;
                margin-bottom: 12px;
              }
              
              .bank-details .title {
                font-size: 12px;
                font-weight: bold;
                color: ${accentColor};
                margin-bottom: 4px;
                text-transform: uppercase;
              }
              
              .bank-details .bank-info {
                display: flex;
                justify-content: space-between;
                gap: 20px;
              }
              
              .bank-details .bank-item {
                flex: 1;
                font-size: 11px;
                color: #555;
              }
              
              .bank-details .bank-item strong {
                color: #333;
                font-weight: bold;
              }
              
              /* Footer */
              .footer-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: 20px;
                padding-top: 10px;
                border-top: 2px solid #e9ecef;
                font-size: 11px;
                color: #666;
              }
              
              /* Print Styles */
              @media print {
                @page {
                  margin: 10mm;
                  margin-bottom: 15mm;
                }
                body { 
                  margin: 0; 
                  padding: 6mm; 
                  -webkit-print-color-adjust: exact;
                  color-adjust: exact;
                }
                .invoice-container { 
                  margin: 0; 
                  max-width: 100%;
                }
                .items-table thead {
                  background: ${accentColor} !important;
                  -webkit-print-color-adjust: exact;
                  color-adjust: exact;
                }
                .total-row {
                  background: ${accentColor} !important;
                  -webkit-print-color-adjust: exact;
                  color-adjust: exact;
                }
                .company-info h1 {
                  color: ${accentColor} !important;
                }
                .invoice-number {
                  color: ${accentColor} !important;
                }
                .section-title {
                  color: ${accentColor} !important;
                }
                .bank-details .title {
                  color: ${accentColor} !important;
                }
                .footer-info {
                  position: fixed;
                  bottom: 0;
                  left: 0;
                  right: 0;
                  background: white;
                  padding: 8px 10mm;
                  border-top: 2px solid #e9ecef;
                }
              }
            </style>
          </head>
          <body>
            <div class="invoice-container">
              <!-- Header -->
              <div class="header">
                <div class="company-info">
                  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 4px;">
                    ${logoSrc ? `<img src="${logoSrc}" alt="Logo" style="height: 50px; width: auto; object-fit: contain;" crossorigin="anonymous" />` : ''}
                    <h1 style="margin-bottom: 0;">${organization?.company_name || 'Your Company Name'}</h1>
                  </div>
                  <p>${[
                    organization?.address,
                    organization?.city,
                    organization?.state,
                    organization?.postal_code
                  ].filter(Boolean).join(', ') || 'Address Line 1, City, State - PIN'}</p>
                  <p>Phone: ${organization?.phone || '+91 XXXXX-XXXXX'} | Email: ${organization?.email || 'contact@yourcompany.com'}</p>
                  <p>GST: ${organization?.gst_number || 'XXAXXXXXXXX'} | PAN: ${organization?.pan_number || 'XXXXXXXXXX'}</p>
                  ${organization?.state ? `<p><strong>Place of Supply:</strong> ${organization.state}</p>` : ''}
                </div>
                
                <div class="invoice-title">
                  <h2>TAX INVOICE</h2>
                  <div class="invoice-number">${invoiceNumber}</div>
                </div>
              </div>
              
              <!-- Invoice Details -->
              <div class="invoice-details">
                <div class="detail-group">
                  <div class="detail-label">Invoice Date</div>
                  <div class="detail-value">${new Date(invoice.invoice_date).toLocaleDateString('en-IN', { 
                    day: '2-digit', 
                    month: 'short', 
                    year: 'numeric' 
                  })}</div>
                </div>
                <div class="detail-group">
                  <div class="detail-label">Due Date</div>
                  <div class="detail-value">${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-IN', { 
                    day: '2-digit', 
                    month: 'short', 
                    year: 'numeric' 
                  }) : 'No due date'}</div>
                </div>
                <div class="detail-group">
                  <div class="detail-label">Payment Terms</div>
                  <div class="detail-value">${invoice.payment_terms || 'Immediate'}</div>
                </div>
              </div>
              
              <!-- Customer Information -->
              <div class="customer-section">
                <div class="bill-to">
                  <div class="section-title">Bill To</div>
                  <div class="customer-name">${customerName}</div>
                  <div class="customer-details">
                    ${currentCustomer.billing_address ? `<p><strong>Address:</strong> ${currentCustomer.billing_address}</p>` : ''}
                    ${currentCustomer.city || currentCustomer.state ? `<p>${[currentCustomer.city, currentCustomer.state].filter(Boolean).join(', ')}</p>` : ''}
                    <p><strong>Email:</strong> ${currentCustomer.email}</p>
                    ${currentCustomer.gst_number ? `<p><strong>GST:</strong> ${currentCustomer.gst_number}</p>` : ''}
                  </div>
                </div>
                
                <div class="company-details">
                  <div class="section-title">Ship To</div>
                  <div class="customer-name">${customerName}</div>
                  <div>
                    ${currentCustomer.shipping_address ? `<p><strong>Address:</strong> ${currentCustomer.shipping_address}</p>` : 
                      currentCustomer.billing_address ? `<p><strong>Address:</strong> ${currentCustomer.billing_address}</p>` : 
                      '<p><strong>Address:</strong> Same as billing address</p>'}
                    ${currentCustomer.city || currentCustomer.state ? `<p><strong>Location:</strong> ${[currentCustomer.city, currentCustomer.state, currentCustomer.postal_code].filter(Boolean).join(', ')}</p>` : ''}
                    ${currentCustomer.gst_number ? `<p><strong>GST:</strong> ${currentCustomer.gst_number}</p>` : ''}
                  </div>
                </div>
              </div>
              
              <!-- Items Table -->
              <table class="items-table">
                <thead>
                  <tr>
                    <th style="width: 5%;">SR. NO.</th>
                    <th style="width: 35%;">NAME OF PRODUCT / SERVICE</th>
                    <th style="width: 8%;">HSN / SAC</th>
                    <th style="width: 8%;">QTY</th>
                    <th style="width: 12%;">RATE</th>
                    <th style="width: 12%;">TAXABLE VALUE</th>
                    ${isInterState ? `
                    <th style="width: 10%;">IGST<br>%</th>
                    <th style="width: 10%;">IGST<br>AMOUNT</th>
                    ` : `
                    <th style="width: 5%;">CGST<br>%</th>
                    <th style="width: 5%;">CGST<br>AMOUNT</th>
                    <th style="width: 5%;">SGST<br>%</th>
                    <th style="width: 5%;">SGST<br>AMOUNT</th>
                    `}
                    <th style="width: 10%;">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsWithGSTBreakdown.map((item, index) => `
                    <tr>
                      <td style="text-align: center;">${index + 1}</td>
                      <td>
                        <div class="item-name">${item.item_name}</div>
                        <div class="item-sku">${item.item_sku}</div>
                      </td>
                      <td style="text-align: center;">${item.hsn_code || '-'}</td>
                      <td style="text-align: center;">${item.quantity}</td>
                      <td style="text-align: right;">₹${item.unit_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td style="text-align: right;">₹${((item.quantity * item.unit_price) - (item.discount_amount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      ${isInterState ? `
                      <td style="text-align: center;">${item.gstRate || 0}%</td>
                      <td style="text-align: right;">₹${item.igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      ` : `
                      <td style="text-align: center;">${((item.gstRate || 0) / 2).toFixed(1)}%</td>
                      <td style="text-align: right;">₹${item.cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td style="text-align: center;">${((item.gstRate || 0) / 2).toFixed(1)}%</td>
                      <td style="text-align: right;">₹${item.sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      `}
                      <td style="text-align: right;">₹${(item.line_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  `).join('')}
                  <!-- Total Row -->
                  <tr>
                    <td colspan="5" style="text-align: center; font-weight: bold;">Total</td>
                    <td style="text-align: right; font-weight: bold;">₹${roundedSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    ${isInterState ? `
                    <td></td>
                    <td style="text-align: right; font-weight: bold;">₹${roundedTotalIGST.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    ` : `
                    <td></td>
                    <td style="text-align: right; font-weight: bold;">₹${roundedTotalCGST.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td></td>
                    <td style="text-align: right; font-weight: bold;">₹${roundedTotalSGST.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    `}
                    <td style="text-align: right; font-weight: bold;">₹${roundedTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
              
              <!-- Summary Section -->
              <div class="summary-section">
                <table class="summary-table">
                  <tr>
                    <td class="label">Taxable Amount</td>
                    <td class="value">₹${roundedSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  ${isInterState ? `
                  <tr>
                    <td class="label">Add : IGST</td>
                    <td class="value">₹${roundedTotalIGST.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  ` : `
                  <tr>
                    <td class="label">Add : CGST</td>
                    <td class="value">₹${roundedTotalCGST.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr>
                    <td class="label">Add : SGST</td>
                    <td class="value">₹${roundedTotalSGST.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  `}
                  <tr>
                    <td class="label">Total Tax</td>
                    <td class="value">₹${roundedTotalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr class="total-row">
                  <td class="label" style="padding: 8px 10px;">Total Amount After Tax</td>
                  <td class="value" style="vertical-align: middle;">₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td colspan="2" style="padding: 6px 10px; font-size: 11px; color: #333; background: #f8f9fa; border-top: 1px solid #e5e7eb;">
                    <strong>Whether tax is payable on reverse charge:</strong> ${(organization as any)?.rcm_applicable ? 'Yes' : 'No'}
                  </td>
                </tr>
                </table>
              </div>
              
              ${invoice.notes ? `
              <div style="background: #f8f9fa; padding: 8px; border-radius: 4px; border-left: 2px solid ${accentColor}; margin-bottom: 12px;">
                <div style="font-weight: bold; margin-bottom: 3px; color: ${accentColor}; font-size: 11px;">Notes:</div>
                <div style="color: #555; font-size: 11px; line-height: 1.3;">${invoice.notes}</div>
              </div>
              ` : ''}

              <!-- Amount in Words -->
              <div class="amount-words">
                <div class="label">Amount in Words:</div>
                <div class="value">${convertNumberToWords(roundedTotalAmount)} Rupees Only</div>
              </div>
              
              <!-- Bank Details -->
              ${organization?.bank_name || organization?.bank_account_number || organization?.bank_ifsc_code ? `
              <div class="bank-details">
                <div class="title">Bank Details for Payment</div>
                <div class="bank-info">
                  ${organization?.bank_name ? `
                  <div class="bank-item">
                    <strong>Bank Name:</strong><br>
                    ${organization.bank_name}
                  </div>` : ''}
                  ${organization?.bank_account_number ? `
                  <div class="bank-item">
                    <strong>Account Number:</strong><br>
                    ${organization.bank_account_number}
                  </div>` : ''}
                  ${organization?.bank_ifsc_code ? `
                  <div class="bank-item">
                    <strong>IFSC Code:</strong><br>
                    ${organization.bank_ifsc_code}
                  </div>` : ''}
                </div>
                ${organization?.bank_account_holder_name ? `
                <div style="margin-top: 4px; font-size: 11px; color: #666;">
                  <strong>Account Holder:</strong> ${organization.bank_account_holder_name}
                </div>` : ''}
              </div>
              ` : ''}

              <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 12px; margin-top: 10px;">
                <div style="border: 1px solid #ddd; border-radius: 6px; padding: 8px 10px;">
                  <div style="font-weight: 700; color: ${accentColor}; margin-bottom: 6px;">Terms and Conditions :</div>
                  <div style="font-style: italic; color: #555; white-space: pre-wrap; line-height: 1.35; font-size: 12px;">
${(organization?.terms_and_conditions || '').trim()}
                  </div>
                </div>
                <div style="border: 1px solid #ddd; border-radius: 6px; padding: 8px 10px; display: flex; flex-direction: column; justify-content: space-between;">
                  <div style="text-align: right; font-size: 12px; color: #444;">For <strong>${organization?.company_name || ''}</strong></div>
                  <div style="height: 46px;"></div>
                  <div style="text-align: right;">
                    <div style="${signatureStyleCss}">${signatureName}</div>
                    <div style="font-size: 11px; color: #666;">Authorized Signatory</div>
                  </div>
                </div>
              </div>
              
              <!-- Footer -->
              <div class="footer-info">
                <div>
                  <strong>Thank you for your business!</strong><br>
                  For any queries: ${organization?.email || 'contact@yourcompany.com'}
                </div>
                <div style="text-align: right;">
                  Generated: ${currentDate.toLocaleDateString('en-IN')}<br>
                  This is a computer generated invoice
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(invoiceContent);
        newWindow.document.close();
        // Wait for images to load before printing
        const images = newWindow.document.images;
        if (images.length > 0) {
          let loaded = 0;
          const tryPrint = () => {
            loaded++;
            if (loaded >= images.length) {
              newWindow.print();
            }
          };
          for (let i = 0; i < images.length; i++) {
            if (images[i].complete) {
              loaded++;
            } else {
              images[i].addEventListener('load', tryPrint);
              images[i].addEventListener('error', tryPrint);
            }
          }
          if (loaded >= images.length) {
            newWindow.print();
          }
        } else {
          newWindow.print();
        }
        
        toast.success('PDF Generated! Invoice PDF has been generated and opened for printing.');
      } else {
        toast.error('PDF Failed: Unable to open PDF window. Please check your browser popup settings.');
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Download Failed: Unable to download invoice. Please try again.');
    }
  }

  const handleDeleteInvoice = async (invoiceId: number) => {
    if (!user?.is_admin) {
      toast.error('Only admin users can delete invoices')
      return
    }

    if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return
    }

    try {
      await invoiceApi.deleteInvoice(invoiceId)
      toast.success('Invoice deleted successfully!')
      // Reload invoices to update the list
      await loadInvoices()
    } catch (error) {
      console.error('Error deleting invoice:', error)
      toast.error('Failed to delete invoice. Please try again.')
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

  // Reset to first page when filters change
  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }

  const handleCustomerFilterChange = (value: string) => {
    setCustomerFilter(value)
    setCurrentPage(1)
  }

  const handleDateRangeChange = (range: { from?: Date; to?: Date }) => {
    setDateRange(range)
    setCurrentPage(1)
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
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-25 to-indigo-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-r from-violet-100 to-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-r from-purple-50 to-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-indigo-50 to-violet-100 rounded-full mix-blend-multiply filter blur-3xl opacity-25 animate-pulse delay-500"></div>
      </div>

      {/* Enhanced grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

      <div className="relative z-10 p-8">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden group cursor-pointer hover:scale-105 transition-all duration-200">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-violet-600/20"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-semibold text-gray-700">Total Invoices</CardTitle>
              <div className="p-2 rounded-lg bg-violet-500/20">
                <FileText className="w-4 h-4 text-violet-600" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-bold text-violet-600">{invoices.length}</div>
              <p className="text-xs text-gray-600 mt-1">
                {overdueInvoices > 0 ? `${overdueInvoices} overdue` : 'All invoices'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden group cursor-pointer hover:scale-105 transition-all duration-200">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/20"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-semibold text-gray-700">Total Amount</CardTitle>
              <div className="p-2 rounded-lg bg-blue-500/20">
                <DollarSign className="w-4 h-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalAmount)}</div>
              <p className="text-xs text-gray-600 mt-1 flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" />
                All time revenue
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden group cursor-pointer hover:scale-105 transition-all duration-200">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-600/20"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-semibold text-gray-700">Paid Amount</CardTitle>
              <div className="p-2 rounded-lg bg-green-500/20">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-bold text-green-600">{formatCurrency(paidAmount)}</div>
              <p className="text-xs text-gray-600 mt-1">
                {totalAmount > 0 ? `${((paidAmount / totalAmount) * 100).toFixed(1)}% collected` : '0% collected'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden group cursor-pointer hover:scale-105 transition-all duration-200">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-orange-600/20"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-semibold text-gray-700">Pending Amount</CardTitle>
              <div className="p-2 rounded-lg bg-orange-500/20">
                <Clock className="w-4 h-4 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(pendingAmount)}</div>
              <p className="text-xs text-gray-600 mt-1">
                {invoices.filter(i => !i.is_paid).length} invoices pending
              </p>
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
              <DatePopover
                mode="range"
                value={dateRange}
                onChange={handleDateRangeChange}
                className="bg-white/70 border-white/30 hover:bg-white hover:border-violet-300"
              />
              
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Invoice Table */}
        <Card className="bg-white/60 backdrop-blur-xl border-white/30 shadow-xl">
          <CardHeader className="border-b border-white/20 bg-gray-50/30">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xl">
                <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-violet-600" />
                </div>
                Invoices ({totalRecords} total)
              </div>
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
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
                    <TableHead className="font-semibold text-gray-700">Delivery Status</TableHead>
                    <TableHead className="font-semibold text-gray-700">Payment Status</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
                          <span className="ml-3 text-gray-600">Loading invoices...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
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
                          <Badge className={`${getDeliveryStatusColor(getDeliveryStatus(invoice.id))} font-medium`}>
                            {getDeliveryStatus(invoice.id)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPaymentStatusColor(getPaymentStatus(invoice.id))}>
                            {getPaymentStatus(invoice.id)}
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
                            {user?.is_admin && (
                              <Button size="sm" variant="outline" onClick={() => handleDeleteInvoice(invoice.id)}
                                      className="hover:bg-red-50 hover:border-red-300">
                                <Trash2 className="w-3 h-3" />
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
        </div>
      </div>
    </div>
  )
}
