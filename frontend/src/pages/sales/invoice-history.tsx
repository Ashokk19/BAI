"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Search, FileText, Eye, Download, Send, TrendingUp, DollarSign, Clock, CheckCircle, Plus, RefreshCw } from "lucide-react"
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
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [deliveryNotes, setDeliveryNotes] = useState<{ [invoiceId: number]: DeliveryNote[] }>({})
  const [deliveryStatuses, setDeliveryStatuses] = useState<{[key: number]: string}>({})
  const [paymentStatuses, setPaymentStatuses] = useState<{[key: number]: string}>({})
  const [deliveryStatusesLoaded, setDeliveryStatusesLoaded] = useState(false)
  const [paymentStatusesLoaded, setPaymentStatusesLoaded] = useState(false)
  const [isLoadingDeliveryStatuses, setIsLoadingDeliveryStatuses] = useState(false)
  const [isLoadingPaymentStatuses, setIsLoadingPaymentStatuses] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})

  // Load invoices and customers on component mount
  useEffect(() => {
    loadInvoices()
    loadCustomers()
  }, [])

  // Reload invoices when filters change
  useEffect(() => {
    loadInvoices()
  }, [searchTerm, statusFilter, dateRange])

  // Load payment statuses when invoices change (but only once)
  useEffect(() => {
    if (invoices.length > 0 && !paymentStatusesLoaded && !isLoadingPaymentStatuses) {
      console.log('🔄 useEffect: Loading payment statuses because invoices changed')
      loadPaymentStatuses(invoices)
    }
  }, [invoices, paymentStatusesLoaded, isLoadingPaymentStatuses])

  const loadInvoices = async () => {
    try {
      setLoading(true)
      const filters: InvoiceFilters = {
        limit: 100,
        skip: 0
      }
      
      if (searchTerm) {
        filters.search = searchTerm
      }
      
      if (statusFilter !== "all") {
        filters.status = statusFilter
      }
      
      if (dateRange.from) {
        filters.date_from = dateRange.from.toISOString().split('T')[0]
      }
      
      if (dateRange.to) {
        filters.date_to = dateRange.to.toISOString().split('T')[0]
      }

      const response = await invoiceApi.getInvoices(filters)
      setInvoices(response.invoices)
      
      // Load delivery notes for all invoices
      if (response.invoices.length > 0) {
        const invoiceIds = response.invoices.map(invoice => invoice.id)
        const notesMap = await loadDeliveryNotes(invoiceIds)
        console.log('📝 Delivery notes loaded, now loading delivery statuses...')
        // Load delivery statuses with the fresh delivery notes data
        loadDeliveryStatuses(notesMap)
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

  const loadDeliveryNotes = async (invoiceIds: number[]) => {
    try {
      const deliveryNotesMap: { [invoiceId: number]: DeliveryNote[] } = {}
      
      console.log('📝 Loading delivery notes for invoices:', invoiceIds)
      
      for (const invoiceId of invoiceIds) {
        try {
          const notes = await shipmentApi.getDeliveryNotesByInvoice(invoiceId)
          deliveryNotesMap[invoiceId] = notes
          console.log(`📝 Invoice ${invoiceId}: Loaded ${notes.length} delivery notes:`, notes)
        } catch (error) {
          console.error(`Error loading delivery notes for invoice ${invoiceId}:`, error)
          deliveryNotesMap[invoiceId] = []
        }
      }
      
      console.log('📝 Final delivery notes map:', deliveryNotesMap)
      setDeliveryNotes(deliveryNotesMap)
      return deliveryNotesMap
    } catch (error) {
      console.error('Error loading delivery notes:', error)
      return {}
    }
  }

  // Reset delivery and payment statuses when invoices change
  useEffect(() => {
    if (invoices.length > 0) {
      console.log('🔄 useEffect: Invoices changed, resetting delivery and payment statuses')
      setDeliveryStatusesLoaded(false)
      setDeliveryStatuses({})
      setPaymentStatusesLoaded(false)
      setPaymentStatuses({})
    }
  }, [invoices])

  // Load delivery statuses when delivery notes change or when we have invoices but no statuses
  useEffect(() => {
    console.log('🔄 useEffect triggered:', {
      deliveryStatusesLoaded,
      isLoadingDeliveryStatuses,
      deliveryNotesCount: Object.keys(deliveryNotes).length,
      invoicesCount: invoices.length
    })
    
    if (!deliveryStatusesLoaded && !isLoadingDeliveryStatuses) {
      if (Object.keys(deliveryNotes).length > 0 || invoices.length > 0) {
        console.log('🔄 useEffect: Loading delivery statuses because delivery notes changed or invoices available')
        loadDeliveryStatuses()
      }
    }
  }, [deliveryNotes, deliveryStatusesLoaded, isLoadingDeliveryStatuses, invoices.length])

  // Load delivery notes when invoices are loaded (but don't auto-create them)
  useEffect(() => {
    if (invoices.length > 0 && Object.keys(deliveryNotes).length === 0) {
      // Load existing delivery notes for all invoices
      const invoiceIds = invoices.map(invoice => invoice.id)
      loadDeliveryNotes(invoiceIds)
    }
  }, [invoices])

  const getDeliveryStatus = (invoiceId: number): string => {
    // Debug logging
    console.log(`🔍 getDeliveryStatus for invoice ${invoiceId}:`, {
      deliveryStatusesLoaded,
      hasStatus: !!deliveryStatuses[invoiceId],
      status: deliveryStatuses[invoiceId],
      hasNotes: !!deliveryNotes[invoiceId]?.length
    })
    
    // If delivery statuses haven't been loaded yet, show loading state
    if (!deliveryStatusesLoaded) {
      return 'Loading...'
    }
    
    // If we have a status for this invoice, return it (this should be the processed status from loadDeliveryStatuses)
    if (deliveryStatuses[invoiceId]) {
      return deliveryStatuses[invoiceId]
    }
    
    // If no status found, this means the loadDeliveryStatuses function hasn't processed this invoice yet
    // or there was an error. Return loading state and trigger a reload if needed.
    if (deliveryStatuses[invoiceId] === undefined && !isLoadingDeliveryStatuses) {
      console.log(`🔄 Invoice ${invoiceId}: No delivery status found, triggering reload`)
      setTimeout(() => loadDeliveryStatuses(), 100)
      return 'Loading...'
    }
    
    // Final fallback
    return 'Pending'
  }

  const getPaymentStatus = (invoiceId: number): string => {
    // If payment statuses haven't been loaded yet, show loading state
    if (!paymentStatusesLoaded) {
      return 'Loading...'
    }
    return paymentStatuses[invoiceId] || 'Pending'
  }

  const loadDeliveryStatuses = async (notesMap?: { [invoiceId: number]: DeliveryNote[] }) => {
    const currentDeliveryNotes = notesMap || deliveryNotes
    console.log('🚀 loadDeliveryStatuses called', {
      invoicesCount: invoices.length,
      deliveryNotesCount: Object.keys(currentDeliveryNotes).length,
      alreadyLoaded: deliveryStatusesLoaded,
      usingPassedNotes: !!notesMap
    })
    
    // Prevent unnecessary reloading if we already have statuses
    if (deliveryStatusesLoaded) {
      console.log('⏭️ Skipping loadDeliveryStatuses - already loaded')
      return
    }
    
    // Prevent multiple simultaneous calls
    if (isLoadingDeliveryStatuses) {
      console.log('⏭️ Skipping loadDeliveryStatuses - already in progress')
      return
    }
    
    setIsLoadingDeliveryStatuses(true)
    
    try {
      const statuses: {[key: number]: string} = {}
      
      for (const invoice of invoices) {
        try {
          // First, check shipments for this invoice (primary source)
          console.log(`🚚 Invoice ${invoice.id}: Checking shipments first...`)
          const shipments = await shipmentApi.getShipmentsByInvoice(invoice.id)
          
          if (shipments.length > 0) {
            // If shipments exist, use shipment status as the primary source
            const latestShipment = shipments.sort((a, b) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0]
            
            // Debug: Log the actual shipment status
            console.log(`🚚 Invoice ${invoice.id}: Raw shipment status: "${latestShipment.status}" (type: ${typeof latestShipment.status})`)
            
            // Map shipment status to delivery status
            let deliveryStatus = 'Pending'
            const statusLower = latestShipment.status?.toLowerCase()
            console.log(`🚚 Invoice ${invoice.id}: Status after toLowerCase: "${statusLower}"`)
            
            switch (statusLower) {
              case 'delivered':
                deliveryStatus = 'Delivered'
                break
              case 'in_transit':
              case 'in transit':
                deliveryStatus = 'In Transit'
                break
              case 'shipped':
                deliveryStatus = 'In Transit'
                break
              case 'cancelled':
                deliveryStatus = 'Failed'
                break
              case 'failed':
                deliveryStatus = 'Failed'
                break
              case 'refused':
                deliveryStatus = 'Refused'
                break
              case 'pending':
              default:
                deliveryStatus = 'Pending'
                console.log(`🚚 Invoice ${invoice.id}: Status "${statusLower}" not matched, defaulting to Pending`)
                break
            }
            
            console.log(`🚚 Invoice ${invoice.id}: Final delivery status: ${deliveryStatus}`)
            statuses[invoice.id] = deliveryStatus
          } else {
            // Only check delivery notes if there are NO shipments
            console.log(`📝 Invoice ${invoice.id}: No shipments, checking delivery notes...`)
            console.log(`📝 Invoice ${invoice.id}: Available delivery notes data:`, currentDeliveryNotes)
            console.log(`📝 Invoice ${invoice.id}: Checking currentDeliveryNotes[${invoice.id}]:`, currentDeliveryNotes[invoice.id])
            const notes = currentDeliveryNotes[invoice.id] || []
            console.log(`📝 Invoice ${invoice.id}: Found ${notes.length} delivery notes:`, notes)
            
            if (notes.length > 0) {
              // Get the most recent delivery note status
              const latestNote = notes.sort((a, b) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              )[0]
              
              // Use the delivery note status as fallback
              let deliveryStatus = latestNote.delivery_status || 'Pending'
              
              // Ensure delivery status matches our expected values (capitalize first letter)
              const statusLower = deliveryStatus.toLowerCase()
              switch (statusLower) {
                case 'delivered':
                  deliveryStatus = 'Delivered'
                  break
                case 'in transit':
                case 'in_transit':
                  deliveryStatus = 'In Transit'
                  break
                case 'failed':
                  deliveryStatus = 'Failed'
                  break
                case 'refused':
                  deliveryStatus = 'Refused'
                  break
                case 'pending':
                default:
                  deliveryStatus = 'Pending'
                  break
              }
              
              console.log(`📝 Invoice ${invoice.id}: Using delivery note status: ${deliveryStatus}`)
              statuses[invoice.id] = deliveryStatus
            } else {
              // No shipments or delivery notes - default to pending
              console.log(`❌ Invoice ${invoice.id}: No shipments or delivery notes, defaulting to Pending`)
              statuses[invoice.id] = 'Pending'
            }
          }
        } catch (error) {
          console.error(`Error getting delivery status for invoice ${invoice.id}:`, error)
          statuses[invoice.id] = 'Pending' // Fallback to pending status
        }
      }
      
      console.log('✅ Setting delivery statuses:', statuses)
      setDeliveryStatuses(statuses)
      setDeliveryStatusesLoaded(true)
      console.log('✅ Delivery statuses loaded successfully')
    } catch (error) {
      console.error('Error loading delivery statuses:', error)
    } finally {
      setIsLoadingDeliveryStatuses(false)
    }
  }

  const loadPaymentStatuses = async (invoiceList: Invoice[]) => {
    console.log('🚀 loadPaymentStatuses called for', invoiceList.length, 'invoices')
    
    // Prevent unnecessary reloading if we already have payment statuses
    if (paymentStatusesLoaded) {
      console.log('⏭️ Skipping loadPaymentStatuses - already loaded')
      return
    }
    
    // Prevent multiple simultaneous calls
    if (isLoadingPaymentStatuses) {
      console.log('⏭️ Skipping loadPaymentStatuses - already in progress')
      return
    }
    
    setIsLoadingPaymentStatuses(true)
    
    try {
      const statuses: {[key: number]: string} = {}
      
      for (const invoice of invoiceList) {
        try {
          // Get all payments for this invoice
          const payments = await paymentApi.getPayments({ 
            invoice_id: invoice.id,
            limit: 100 
          })
          
          console.log(`Found ${payments.payments.length} payments for invoice ${invoice.id}`)
          
          if (payments.payments.length === 0) {
            // No payments found, check if there's a pending payment
            statuses[invoice.id] = 'Pending'
          } else {
            // Calculate total amount paid
            const totalPaid = payments.payments.reduce((sum, payment) => {
              const amount = typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount
              return sum + amount
            }, 0)
            
            const invoiceAmount = typeof invoice.total_amount === 'string' ? parseFloat(invoice.total_amount) : invoice.total_amount
            
            if (totalPaid >= invoiceAmount) {
              statuses[invoice.id] = 'Completed'
            } else if (totalPaid > 0) {
              statuses[invoice.id] = 'Partial'
            } else {
              statuses[invoice.id] = 'Pending'
            }
          }
        } catch (error) {
          console.error(`Error getting payment status for invoice ${invoice.id}:`, error)
          statuses[invoice.id] = 'Pending' // Fallback to default status
        }
      }
      
      console.log('✅ Final payment statuses:', statuses)
      setPaymentStatuses(statuses)
      setPaymentStatusesLoaded(true)
      console.log('✅ Payment statuses loaded successfully')
    } catch (error) {
      console.error('Error loading payment statuses:', error)
    } finally {
      setIsLoadingPaymentStatuses(false)
    }
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

  const handleRefreshDeliveryStatuses = async () => {
    try {
      // Reload delivery statuses for existing invoices
      if (invoices.length > 0) {
        setDeliveryStatusesLoaded(false)
        await loadDeliveryStatuses()
        toast.success('Delivery statuses refreshed!')
      }
    } catch (error) {
      console.error('Error refreshing delivery statuses:', error)
      toast.error('Failed to refresh delivery statuses')
    }
  }

  const handleRefreshPaymentStatuses = async () => {
    try {
      // Reload payment statuses for existing invoices
      if (invoices.length > 0) {
        setPaymentStatusesLoaded(false)
        await loadPaymentStatuses(invoices)
        toast.success('Payment statuses refreshed!')
      }
    } catch (error) {
      console.error('Error refreshing payment statuses:', error)
      toast.error('Failed to refresh payment statuses')
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
                border-bottom: 2px solid #4c1d95;
                padding-bottom: 12px;
                margin-bottom: 15px;
              }
              
              .company-info h1 {
                font-size: 24px;
                font-weight: bold;
                color: #4c1d95;
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
                color: #4c1d95;
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
                color: #4c1d95;
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
                border: 2px solid #4c1d95;
                border-radius: 4px;
                overflow: hidden;
              }
              
              .items-table thead {
                background: #4c1d95;
              }
              
              .items-table th {
                padding: 8px 6px;
                text-align: left;
                font-weight: bold;
                font-size: 12px;
                color: white;
                text-transform: uppercase;
                border: 1px solid #3730a3;
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
                border-bottom: 2px solid #4c1d95;
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
                border: 2px solid #4c1d95;
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
                background: #4c1d95;
              }
              
              .total-row .label,
              .total-row .value {
                color: white;
                font-size: 14px;
                font-weight: bold;
                padding: 8px 10px;
                border: 1px solid #3730a3;
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
                color: #4c1d95;
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
                  background: #4c1d95 !important;
                  -webkit-print-color-adjust: exact;
                  color-adjust: exact;
                }
                .total-row {
                  background: #4c1d95 !important;
                  -webkit-print-color-adjust: exact;
                  color-adjust: exact;
                }
                .company-info h1 {
                  color: #4c1d95 !important;
                }
                .invoice-number {
                  color: #4c1d95 !important;
                }
                .section-title {
                  color: #4c1d95 !important;
                }
                .bank-details .title {
                  color: #4c1d95 !important;
                }
              }
            </style>
          </head>
          <body>
            <div class="invoice-container">
              <!-- Header -->
              <div class="header">
                <div class="company-info">
                  <h1>${organization?.company_name || 'Your Company Name'}</h1>
                  <p>${[
                    organization?.address,
                    organization?.city,
                    organization?.state,
                    organization?.postal_code
                  ].filter(Boolean).join(', ') || 'Address Line 1, City, State - PIN'}</p>
                  <p>Phone: ${organization?.phone || '+91 XXXXX-XXXXX'} | Email: ${organization?.email || 'contact@yourcompany.com'}</p>
                  <p>GST: ${organization?.gst_number || 'XXAXXXXXXXX'} | PAN: ${organization?.pan_number || 'XXXXXXXXXX'}</p>
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
                      <td style="text-align: center;">-</td>
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
                    <td class="label">Total Amount After Tax</td>
                    <td class="value">₹${roundedTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </table>
              </div>
              
              ${invoice.notes ? `
              <div style="background: #f8f9fa; padding: 8px; border-radius: 4px; border-left: 2px solid #4c1d95; margin-bottom: 12px;">
                <div style="font-weight: bold; margin-bottom: 3px; color: #4c1d95; font-size: 11px;">Notes:</div>
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
        newWindow.print();
        newWindow.close();
        
        toast.success('PDF Generated! Invoice PDF has been generated and opened for printing.');
      } else {
        toast.error('PDF Failed: Unable to open PDF window. Please check your browser popup settings.');
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Download Failed: Unable to download invoice. Please try again.');
    }
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
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={handleCreateDeliveryNotesForInvoices}
              className="bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 hover:bg-white/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Delivery Notes for Invoices
            </Button>
          </div>
        </div>

        {/* Enhanced Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white/60 backdrop-blur-xl border-white/30 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Invoices</p>
                  <p className="text-3xl font-bold text-gray-900">{invoices.length}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {overdueInvoices > 0 && `${overdueInvoices} overdue`}
                  </p>
                </div>
                <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-violet-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/60 backdrop-blur-xl border-white/30 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Amount</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
                  <p className="text-xs text-green-600 mt-1 flex items-center">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    All time revenue
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/60 backdrop-blur-xl border-white/30 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Paid Amount</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(paidAmount)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {totalAmount > 0 ? `${((paidAmount / totalAmount) * 100).toFixed(1)}% collected` : '0% collected'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/60 backdrop-blur-xl border-white/30 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Pending Amount</p>
                  <p className="text-2xl font-bold text-orange-600">{formatCurrency(pendingAmount)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {invoices.filter(i => !i.is_paid).length} invoices pending
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
              </div>
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
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/70 border-white/30 focus:bg-white focus:border-violet-300"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48 bg-white/70 border-white/30 focus:bg-white focus:border-violet-300">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="bg-white/70 border-white/30 hover:bg-white hover:border-violet-300">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    Date Range
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="range" numberOfMonths={2} />
                </PopoverContent>
              </Popover>
              
              <Button 
                variant="outline" 
                onClick={handleRefreshDeliveryStatuses}
                className="bg-white/70 border-white/30 hover:bg-white hover:border-violet-300"
                title="Refresh delivery statuses"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Delivery Status
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleRefreshPaymentStatuses}
                className="bg-white/70 border-white/30 hover:bg-white hover:border-violet-300"
                title="Refresh payment statuses"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Payment Status
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleCreateDeliveryNotesForInvoices}
                className="bg-white/70 border-white/30 hover:bg-white hover:border-violet-300"
                title="Create delivery notes for existing invoices"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Delivery Notes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Invoice Table */}
        <Card className="bg-white/60 backdrop-blur-xl border-white/30 shadow-xl">
          <CardHeader className="border-b border-white/20 bg-gray-50/30">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-violet-600" />
              </div>
              Invoices ({invoices.length})
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
                    <TableHead className="font-semibold text-gray-700">Invoice Status</TableHead>
                    <TableHead className="font-semibold text-gray-700">Delivery Status</TableHead>
                    <TableHead className="font-semibold text-gray-700">Payment Status</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
                          <span className="ml-3 text-gray-600">Loading invoices...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12">
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
                          <Badge className={`${getStatusColor(invoice.status)} font-medium`}>
                            {invoice.status}
                          </Badge>
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
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  )
}
