import React, { useState, useEffect } from 'react';
import { Plus, Minus, Save, Send, FileText, Calculator, User, Package, MessageCircle, Search, Download } from 'lucide-react';
import { customerApi, Customer, CustomerCreditInfo } from '../../services/customerApi';
import { inventoryApi } from '../../services/inventoryApi';
import { organizationService, OrganizationProfile } from '../../services/organizationService';
import { useNotifications, NotificationContainer } from '../../components/ui/notification';
import { useAuth } from '../../utils/AuthContext';

interface Item {
  id: number;
  name: string;
  sku: string;
  hsn_code?: string;
  selling_price: number;
  current_stock: number;
  unit_of_measure: string;
  tax_rate: number;
  gst_slab?: {
    id: number;
    name: string;
    rate: number;
    cgst_rate: number;
    sgst_rate: number;
    igst_rate: number;
  };
}

interface GSTSlab {
  id: number;
  name: string;
  rate: number;
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
}

interface InvoiceItem {
  id?: number;
  item_id: number;
  item_name: string;
  item_sku: string;
  hsn_code?: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  gst_rate: number;
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  tax_amount: number;
  line_total: number;
}

interface Invoice {
  customer_id: number;
  invoice_date: string;
  due_date: string;
  customer_state: string;
  company_state: string;
  notes: string;
  items: InvoiceItem[];
}

const TaxInvoice: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [gstSlabs, setGstSlabs] = useState<GSTSlab[]>([]);
  const [organization, setOrganization] = useState<OrganizationProfile | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [invoice, setInvoice] = useState<Invoice>({
    customer_id: 0,
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date().toISOString().split('T')[0],
    customer_state: '',
    company_state: 'Tamil Nadu',
    notes: '',
    items: []
  });
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppMessage, setWhatsAppMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showCreditPaymentDialog, setShowCreditPaymentDialog] = useState(false);
  const [customerCreditInfo, setCustomerCreditInfo] = useState<any>(null);
  const [paymentFormData, setPaymentFormData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'Bank Transfer',
    payment_status: 'completed',
    reference_number: '',
    notes: '',
    amount: 0
  });
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [itemSearches, setItemSearches] = useState<{[key: number]: string}>({});
  const [showItemDropdowns, setShowItemDropdowns] = useState<{[key: number]: boolean}>({});
  const [isAdhocCustomer, setIsAdhocCustomer] = useState(false);
  const [adhocCustomer, setAdhocCustomer] = useState({
    company_name: '',
    first_name: '',
    last_name: '',
    email: '',
    mobile: '',
    phone: '',
    gst_number: '',
    billing_address: '',
    city: '',
    state: '',
    postal_code: '',
    payment_terms: 'Immediate'
  });
  
  // BAI Notification System
  const notifications = useNotifications();
  
  // Auth context to get current user's account_id
  const { user } = useAuth();

  // Load data on component mount
  useEffect(() => {
    loadCustomers();
    loadItems();
    loadGSTSlabs();
    loadOrganization();
  }, []);

  // Initialize item search states for existing items
  useEffect(() => {
    const newItemSearches: {[key: number]: string} = {};
    const newShowItemDropdowns: {[key: number]: boolean} = {};
    
    invoiceItems.forEach((item, index) => {
      if (item.item_id > 0) {
        newItemSearches[index] = getItemDisplayName(item.item_id);
      } else {
        newItemSearches[index] = '';
      }
      newShowItemDropdowns[index] = false;
    });
    
    setItemSearches(newItemSearches);
    setShowItemDropdowns(newShowItemDropdowns);
  }, [invoiceItems.length]); // Only when item count changes

  // Reload customers when search changes
  useEffect(() => {
    loadCustomers();
  }, [customerSearch]);

  const loadCustomers = async () => {
    try {
      // Use multiple requests to get all customers since API limit is 100
      let allCustomers: Customer[] = [];
      let skip = 0;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        const response = await customerApi.getCustomers({ 
          skip, 
          limit, 
          search: customerSearch || undefined 
        });
        allCustomers = [...allCustomers, ...response.customers];
        
        // Check if we have more customers to load
        hasMore = response.customers.length === limit;
        skip += limit;
        
        // Safety break to avoid infinite loop
        if (skip > 1000) break;
      }
      
      const activeCustomers = allCustomers.filter(c => c.is_active);
      console.log('Loaded customers:', activeCustomers.length);
      setCustomers(activeCustomers);
    } catch (error) {
      console.error('Error loading customers:', error);
      setCustomers([]);
    }
  };

  const loadItems = async () => {
    try {
      // Use pagination to get all items
      let allItems: any[] = [];
      let skip = 0;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        const itemsData = await inventoryApi.getItems({ skip, limit });
        allItems = [...allItems, ...itemsData];
        
        // Check if we have more items to load
        hasMore = itemsData.length === limit;
        skip += limit;
        
        // Safety break to avoid infinite loop
        if (skip > 2000) break;
      }

      // Map inventory items to our Item interface
      const mappedItems: Item[] = allItems.map((item: any) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        hsn_code: item.hsn_code,
        selling_price: item.selling_price,
        current_stock: item.current_stock,
        unit_of_measure: item.unit_of_measure,
        tax_rate: item.tax_rate || 18, // Use tax_rate from item or default to 18%
        gst_slab: {
          id: 1,
          name: `${item.tax_rate || 18}% GST`,
          rate: item.tax_rate || 18,
          cgst_rate: (item.tax_rate || 18) / 2,
          sgst_rate: (item.tax_rate || 18) / 2,
          igst_rate: item.tax_rate || 18
        }
      }));
      setItems(mappedItems.filter(item => item.current_stock > 0)); // Only show items in stock
    } catch (error) {
      console.error('Error loading items:', error);
      // Fallback to empty array if API fails
      setItems([]);
    }
  };

  const loadGSTSlabs = async () => {
    const mockGSTSlabs: GSTSlab[] = [
      { id: 1, name: '0% GST', rate: 0, cgst_rate: 0, sgst_rate: 0, igst_rate: 0 },
      { id: 2, name: '5% GST', rate: 5, cgst_rate: 2.5, sgst_rate: 2.5, igst_rate: 5 },
      { id: 3, name: '12% GST', rate: 12, cgst_rate: 6, sgst_rate: 6, igst_rate: 12 },
      { id: 4, name: '18% GST', rate: 18, cgst_rate: 9, sgst_rate: 9, igst_rate: 18 },
      { id: 5, name: '28% GST', rate: 28, cgst_rate: 14, sgst_rate: 14, igst_rate: 28 }
    ];
    setGstSlabs(mockGSTSlabs);
  };

  const loadOrganization = async () => {
    try {
      const orgData = await organizationService.getOrganizationProfile();
      setOrganization(orgData);
      console.log('Organization data loaded:', orgData);
    } catch (error) {
      console.error('Error loading organization:', error);
      // Organization is optional, continue without it
      setOrganization(null);
    }
  };

  const getCustomerDisplayName = (customer: Customer) => {
    const displayName = customer.company_name || `${customer.first_name} ${customer.last_name}`;
    console.log('getCustomerDisplayName for:', customer.email, 'result:', displayName);
    return displayName;
  };

  const getAdhocCustomerDisplayName = (): string => {
    return adhocCustomer.company_name || `${adhocCustomer.first_name} ${adhocCustomer.last_name}`;
  };

  const filteredCustomers = customers.filter(customer => {
    const displayName = getCustomerDisplayName(customer);
    const searchLower = customerSearch.toLowerCase();
    const matches = displayName.toLowerCase().includes(searchLower) ||
           customer.customer_code.toLowerCase().includes(searchLower) ||
           customer.email.toLowerCase().includes(searchLower);
    if (customerSearch && matches) {
      console.log('Customer matches search:', customer.email, 'display:', displayName);
    }
    return matches;
  });

  const handleCustomerSelect = (customer: Customer) => {
    console.log('handleCustomerSelect called with:', customer.email);
    setSelectedCustomer(customer);
    setInvoice(prev => ({
      ...prev,
      customer_id: customer.id,
      customer_state: customer.state || ''
    }));
    setCustomerSearch(getCustomerDisplayName(customer));
    setShowCustomerDropdown(false);
    console.log('Customer selection completed');
  };

  const getFilteredItems = (searchTerm: string) => {
    if (!searchTerm) return items;
    return items.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const handleItemSelect = (index: number, item: Item) => {
    console.log('Selecting item:', item.name, 'for index:', index);
    updateInvoiceItem(index, 'item_id', item.id);
    setItemSearches(prev => ({ ...prev, [index]: `${item.name} (${item.sku})` }));
    setShowItemDropdowns(prev => ({ ...prev, [index]: false }));
  };

  const getItemDisplayName = (itemId: number) => {
    const item = items.find(i => i.id === itemId);
    return item ? `${item.name} (${item.sku})` : '';
  };

  const addInvoiceItem = () => {
    const newIndex = invoiceItems.length;
    const newItem: InvoiceItem = {
      item_id: 0,
      item_name: '',
      item_sku: '',
      hsn_code: '',
      quantity: 1,
      unit_price: 0,
      discount_amount: 0,
      gst_rate: 18,
      cgst_rate: 0,
      sgst_rate: 0,
      igst_rate: 0,
      cgst_amount: 0,
      sgst_amount: 0,
      igst_amount: 0,
      tax_amount: 0,
      line_total: 0
    };
    setInvoiceItems([...invoiceItems, newItem]);
    // Initialize search states for the new item
    setItemSearches(prev => ({ ...prev, [newIndex]: '' }));
    setShowItemDropdowns(prev => ({ ...prev, [newIndex]: false }));
  };

  const removeInvoiceItem = (index: number) => {
    const newItems = invoiceItems.filter((_, i) => i !== index);
    setInvoiceItems(newItems);
    
    // Clean up search states
    const newItemSearches = { ...itemSearches };
    const newShowItemDropdowns = { ...showItemDropdowns };
    delete newItemSearches[index];
    delete newShowItemDropdowns[index];
    
    // Reindex remaining items
    const reindexedSearches: {[key: number]: string} = {};
    const reindexedDropdowns: {[key: number]: boolean} = {};
    
    Object.keys(newItemSearches).forEach(key => {
      const oldIndex = parseInt(key);
      if (oldIndex > index) {
        reindexedSearches[oldIndex - 1] = newItemSearches[oldIndex];
        reindexedDropdowns[oldIndex - 1] = newShowItemDropdowns[oldIndex];
      } else if (oldIndex < index) {
        reindexedSearches[oldIndex] = newItemSearches[oldIndex];
        reindexedDropdowns[oldIndex] = newShowItemDropdowns[oldIndex];
      }
    });
    
    setItemSearches(reindexedSearches);
    setShowItemDropdowns(reindexedDropdowns);
  };

  const updateInvoiceItem = (index: number, field: keyof InvoiceItem, value: any) => {
    console.log('updateInvoiceItem called:', { index, field, value });
    const newItems = [...invoiceItems];
    
    // Validate stock quantity before updating
    if (field === 'quantity') {
      const currentItem = newItems[index];
      const itemData = items.find(i => i.id === currentItem.item_id);
      
      if (itemData && value > itemData.current_stock) {
        notifications.warning(
          'Insufficient Stock',
          `Cannot order ${value} units. Only ${itemData.current_stock} units available for '${itemData.name}'.`,
          {
            autoClose: true,
            autoCloseDelay: 4000
          }
        );
        // Don't update the value, keep the current quantity
        return;
      }
    }
    
    newItems[index] = { ...newItems[index], [field]: value };
    
    // If item is selected, update item details
    if (field === 'item_id' && value > 0) {
      const item = items.find(i => i.id === value);
      console.log('Found item:', item);
      if (item) {
        newItems[index].item_name = item.name;
        newItems[index].item_sku = item.sku;
        newItems[index].hsn_code = item.hsn_code || '';
        newItems[index].unit_price = item.selling_price;
        
        // Reset quantity to 1 if it exceeds available stock
        if (newItems[index].quantity > item.current_stock) {
          newItems[index].quantity = Math.min(1, item.current_stock);
        }
        
        // Use tax_rate from inventory item
        newItems[index].gst_rate = item.tax_rate || 18; // Default to 18% for existing items
        newItems[index].cgst_rate = newItems[index].gst_rate / 2;
        newItems[index].sgst_rate = newItems[index].gst_rate / 2;
        newItems[index].igst_rate = newItems[index].gst_rate;
        console.log('Updated item:', newItems[index]);
      }
    }
    
    // GST rate is now read-only and comes from inventory items
    
    // Recalculate amounts
    const item = newItems[index];
    const baseAmount = (item.quantity * item.unit_price) - item.discount_amount;
    item.tax_amount = (baseAmount * item.gst_rate) / 100;
    item.line_total = baseAmount + item.tax_amount;
    
    setInvoiceItems(newItems);
  };

  const calculateTotals = () => {
    const subtotal = invoiceItems.reduce((sum, item) => sum + ((item.quantity * item.unit_price) - item.discount_amount), 0);
    const totalTax = invoiceItems.reduce((sum, item) => sum + item.tax_amount, 0);
    const totalAmount = subtotal + totalTax;
    
    // Calculate GST breakdown for UI display
    const customerState = selectedCustomer?.state || adhocCustomer.state || '';
    const organizationState = organization?.state || '';
    const isInterState = customerState.toLowerCase() !== organizationState.toLowerCase();
    
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;
    
    if (isInterState) {
      totalIGST = totalTax;
    } else {
      totalCGST = totalTax / 2;
      totalSGST = totalTax / 2;
    }
    
    return {
      subtotal,
      totalTax,
      totalAmount,
      totalCGST,
      totalSGST,
      totalIGST,
      isInterState
    };
  };

  const [generatedInvoice, setGeneratedInvoice] = useState<any>(null);

  const generateInvoice = async () => {
    const hasValidCustomer = selectedCustomer || (isAdhocCustomer && (adhocCustomer.first_name || adhocCustomer.company_name));
    if (!hasValidCustomer || invoiceItems.length === 0) {
      notifications.warning(
        'Incomplete Invoice',
        'Please select a customer and add at least one item before generating the invoice.',
        {
          autoClose: true,
          autoCloseDelay: 4000
        }
      );
      return;
    }
    
    setIsLoading(true);
    try {
      const invoiceData = {
        account_id: user?.account_id || 'TestAccount', // Use current user's account_id
        customer_id: selectedCustomer?.id || 0,
        invoice_date: new Date(invoice.invoice_date).toISOString(),
        due_date: invoice.due_date ? new Date(invoice.due_date).toISOString() : undefined,
        status: 'sent',
        invoice_type: 'sale',
        payment_terms: selectedCustomer?.payment_terms || adhocCustomer.payment_terms || 'immediate',
        currency: 'INR',
        billing_address: selectedCustomer?.billing_address || adhocCustomer.billing_address || undefined,
        shipping_address: selectedCustomer?.shipping_address,
        notes: invoice.notes,
        terms_conditions: undefined,
        customer_state: selectedCustomer?.state || adhocCustomer.state,
        company_state: organization?.state || 'Tamil Nadu',
        items: invoiceItems.map(item => ({
          item_id: item.item_id,
          item_name: item.item_name,
          item_description: undefined,
          item_sku: item.item_sku,
          hsn_code: item.hsn_code,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_rate: 0,
          discount_amount: item.discount_amount,
          gst_rate: item.gst_rate,
          cgst_rate: item.cgst_rate,
          sgst_rate: item.sgst_rate,
          igst_rate: item.igst_rate
        }))
      };
      
      // Import invoiceApi dynamically to avoid circular imports
      const { invoiceApi } = await import('../../services/invoiceApi');
      const savedInvoice = await invoiceApi.createInvoice(invoiceData);
      
      setGeneratedInvoice(savedInvoice);
      
      notifications.success(
        'Invoice Generated!',
        'Invoice has been saved to database and is ready for download/sending.',
        {
          autoClose: true,
          autoCloseDelay: 3000
        }
      );
      
      // Auto-open payment dialog after invoice generation
      setPaymentFormData(prev => ({
        ...prev,
        amount: totals.totalAmount,
        payment_date: new Date().toISOString().split('T')[0]
      }));
      setShowPaymentDialog(true);
      
      // Don't clear form data here - keep it for download/sending functionality
      
    } catch (error: any) {
      console.error('Error generating invoice:', error);
      
      // Parse error message from backend
      let errorTitle = 'Generation Failed';
      let errorMessage = 'Unable to generate invoice. Please check your connection and try again.';
      
      if (error?.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (detail.includes('Stock validation failed')) {
          errorTitle = 'Insufficient Stock';
          errorMessage = detail.replace('Stock validation failed: ', '');
        } else if (detail.includes('Insufficient stock')) {
          errorTitle = 'Insufficient Stock';
          errorMessage = detail;
        } else {
          errorMessage = detail;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      notifications.error(
        errorTitle,
        errorMessage,
        {
          autoClose: false
        }
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreditPurchaseClick = async () => {
    if (!selectedCustomer) {
      notifications.error(
        'No Customer Selected',
        'Please select a customer first.',
        {
          autoClose: true,
          autoCloseDelay: 4000
        }
      );
      return;
    }

    if (!generatedInvoice) {
      notifications.error(
        'No Invoice Generated',
        'Please generate an invoice first.',
        {
          autoClose: true,
          autoCloseDelay: 4000
        }
      );
      return;
    }

    try {
      const creditInfo = await customerApi.getCustomerCreditInfo(selectedCustomer.id);
      console.log('💳 Fetched credit info:', creditInfo);
      console.log('💰 Total available credit:', creditInfo.total_available_credit);
      console.log('📋 Credits array:', creditInfo.credits);
      setCustomerCreditInfo(creditInfo);
      
      // Set the payment amount to the invoice total for credit purchase
      const invoiceTotal = calculateTotals().totalAmount;
      setPaymentFormData(prev => ({ ...prev, amount: invoiceTotal }));
      
      setShowCreditPaymentDialog(true);
    } catch (error) {
      console.error('Error fetching credit info:', error);
      notifications.error(
        'Error',
        'Failed to fetch customer credit information.',
        {
          autoClose: true,
          autoCloseDelay: 4000
        }
      );
    }
  };

  const handleConfirmCreditPurchase = async () => {
    if (!generatedInvoice || !customerCreditInfo) return;

    const invoiceTotal = calculateTotals().totalAmount;
    
    // Check if customer has sufficient credit
    if (customerCreditInfo.total_available_credit < invoiceTotal) {
      notifications.error(
        'Insufficient Credit',
        `Customer has $${customerCreditInfo.total_available_credit.toFixed(2)} available credit, but invoice total is $${invoiceTotal.toFixed(2)}.`,
        {
          autoClose: true,
          autoCloseDelay: 5000
        }
      );
      return;
    }

    setIsLoading(true);
    try {
      const { paymentApi } = await import('../../services/paymentApi');
      
      const paymentData = {
        payment_date: new Date().toISOString(),
        payment_type: 'customer',
        payment_direction: 'incoming', // No actual payment direction since it's credit
        amount: invoiceTotal,
        payment_method: 'credit', // Method is credit
        payment_status: 'credit', // Status is credit (not completed)
        reference_number: `Credit-${generatedInvoice.invoice_number}`,
        notes: `Purchase on credit - Amount: $${invoiceTotal}, Available credit before: $${customerCreditInfo.total_available_credit}`,
        invoice_id: generatedInvoice.id,
        customer_id: selectedCustomer?.id || 0
      };
      
      await paymentApi.createPayment(paymentData);
      
      setShowCreditPaymentDialog(false);
      setShowPaymentDialog(false);
      
      notifications.success(
        'Credit Purchase Recorded!',
        `Invoice of $${invoiceTotal.toFixed(2)} has been recorded as credit purchase. Customer's available credit will be reduced.`,
        {
          autoClose: true,
          autoCloseDelay: 5000
        }
      );
      
    } catch (error) {
      console.error('Error recording credit purchase:', error);
      notifications.error(
        'Credit Purchase Failed',
        'Failed to record credit purchase. Please try again.',
        {
          autoClose: true,
          autoCloseDelay: 4000
        }
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateInvoiceWithPayment = async (isPending = false) => {
    if (!generatedInvoice) {
      notifications.error(
        'No Invoice Found',
        'Please generate an invoice first before recording payment.',
        {
          autoClose: true,
          autoCloseDelay: 4000
        }
      );
      return;
    }

    setIsLoading(true);
    try {
      // Create payment record only - no new invoice
      const { paymentApi } = await import('../../services/paymentApi');
      const invoiceTotal = calculateTotals().totalAmount;
      const amountPaid = isPending ? 0 : paymentFormData.amount;
      
      // Determine payment status based on amount
      let status = 'pending';
      if (isPending) {
        status = 'pending';
      } else if (amountPaid >= invoiceTotal) {
        status = 'paid';
      } else if (amountPaid > 0) {
        status = 'partial';
      } else {
        status = 'pending';
      }
      
      const paymentData = {
        payment_date: new Date(paymentFormData.payment_date).toISOString(),
        payment_type: 'customer',
        payment_direction: 'received',
        amount: amountPaid,
        payment_method: paymentFormData.payment_method,
        payment_status: status,
        reference_number: paymentFormData.reference_number,
        notes: isPending ? 'Payment marked as pending' : paymentFormData.notes,
        invoice_id: generatedInvoice.id,
        customer_id: selectedCustomer?.id || 0
      };
      
      await paymentApi.createPayment(paymentData);
      
      setShowPaymentDialog(false);
      
      notifications.success(
        isPending ? 'Payment Marked as Pending!' : 'Payment Recorded!',
        isPending ? 'Payment has been marked as pending for the invoice.' : 'Payment has been recorded for the invoice.',
        {
          autoClose: true,
          autoCloseDelay: 3000
        }
      );
      
    } catch (error: any) {
      console.error('Error recording payment:', error);
      
      // Parse error message from backend
      let errorTitle = 'Payment Recording Failed';
      let errorMessage = 'Unable to record payment. Please check your connection and try again.';
      
      if (error?.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (detail.includes('Stock validation failed')) {
          errorTitle = 'Insufficient Stock';
          errorMessage = detail.replace('Stock validation failed: ', '');
        } else if (detail.includes('Insufficient stock')) {
          errorTitle = 'Insufficient Stock';
          errorMessage = detail;
        } else {
          errorMessage = detail;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      notifications.error(
        errorTitle,
        errorMessage,
        {
          autoClose: false
        }
      );
    } finally {
      setIsLoading(false);
    }
  };

    const handleDownloadInvoice = async () => {
    if (!generatedInvoice) {
      notifications.warning(
        'Invoice Not Generated',
        'Please generate the invoice first before downloading.',
        {
          autoClose: true,
          autoCloseDelay: 4000
        }
      );
      return;
    }

    // Ensure organization is loaded (for terms and signature block)
    let orgForPdf = organization as OrganizationProfile | null;
    if (!organization) {
      try {
        const orgData = await organizationService.getOrganizationProfile();
        setOrganization(orgData);
        orgForPdf = orgData;
      } catch (e) {
        // If org fetch fails, continue with empty terms/company
      }
    }
    orgForPdf = orgForPdf || organization || null;

    const totals = calculateTotals();
    const customerName = selectedCustomer ? getCustomerDisplayName(selectedCustomer) : getAdhocCustomerDisplayName();
    const currentCustomer = selectedCustomer || adhocCustomer;
    const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;
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
    // Derive a darker border shade by reducing brightness
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
    const itemsWithGSTBreakdown = invoiceItems.map(item => {
      const baseAmount = (item.quantity * item.unit_price) - item.discount_amount;
      let cgstAmount = 0;
      let sgstAmount = 0;
      let igstAmount = 0;
      
      if (isInterState) {
        // Inter-state: Use IGST
        igstAmount = (baseAmount * item.gst_rate) / 100;
      } else {
        // Intra-state: Split into CGST and SGST
        cgstAmount = (baseAmount * (item.gst_rate / 2)) / 100;
        sgstAmount = (baseAmount * (item.gst_rate / 2)) / 100;
      }
      
      return {
        ...item,
        cgstAmount,
        sgstAmount,
        igstAmount
      };
    });
    
    // Calculate totals with GST breakdown
    const subtotal = itemsWithGSTBreakdown.reduce((sum, item) => sum + ((item.quantity * item.unit_price) - item.discount_amount), 0);
    const totalCGST = itemsWithGSTBreakdown.reduce((sum, item) => sum + item.cgstAmount, 0);
    const totalSGST = itemsWithGSTBreakdown.reduce((sum, item) => sum + item.sgstAmount, 0);
    const totalIGST = itemsWithGSTBreakdown.reduce((sum, item) => sum + item.igstAmount, 0);
    const totalTax = totalCGST + totalSGST + totalIGST;
    const totalAmount = subtotal + totalTax;

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
                <div class="detail-value">${new Date(invoice.due_date).toLocaleDateString('en-IN', { 
                  day: '2-digit', 
                  month: 'short', 
                  year: 'numeric' 
                })}</div>
              </div>
              <div class="detail-group">
                <div class="detail-label">Payment Terms</div>
                <div class="detail-value">${currentCustomer.payment_terms || 'Immediate'}</div>
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
                  ${selectedCustomer && selectedCustomer.shipping_address ? `<p><strong>Address:</strong> ${selectedCustomer.shipping_address}</p>` : 
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
                    <td style="text-align: right;">₹${((item.quantity * item.unit_price) - item.discount_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    ${isInterState ? `
                    <td style="text-align: center;">${item.gst_rate}%</td>
                    <td style="text-align: right;">₹${item.igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    ` : `
                    <td style="text-align: center;">${(item.gst_rate / 2).toFixed(1)}%</td>
                    <td style="text-align: right;">₹${item.cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style="text-align: center;">${(item.gst_rate / 2).toFixed(1)}%</td>
                    <td style="text-align: right;">₹${item.sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    `}
                    <td style="text-align: right;">₹${item.line_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                `).join('')}
                <!-- Total Row -->
                <tr>
                  <td colspan="5" style="text-align: center; font-weight: bold;">Total</td>
                  <td style="text-align: right; font-weight: bold;">₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  ${isInterState ? `
                  <td></td>
                  <td style="text-align: right; font-weight: bold;">₹${totalIGST.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  ` : `
                  <td></td>
                  <td style="text-align: right; font-weight: bold;">₹${totalCGST.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td></td>
                  <td style="text-align: right; font-weight: bold;">₹${totalSGST.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  `}
                  <td style="text-align: right; font-weight: bold;">₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>
            
            <!-- Summary Section -->
            <div class="summary-section">
              <table class="summary-table">
                <tr>
                  <td class="label">Taxable Amount</td>
                  <td class="value">₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
                ${isInterState ? `
                <tr>
                  <td class="label">Add : IGST</td>
                  <td class="value">₹${totalIGST.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
                ` : `
                <tr>
                  <td class="label">Add : CGST</td>
                  <td class="value">₹${totalCGST.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td class="label">Add : SGST</td>
                  <td class="value">₹${totalSGST.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
                `}
                <tr>
                  <td class="label">Total Tax</td>
                  <td class="value">₹${totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
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
              <div class="value">${convertNumberToWords(totalAmount)} Rupees Only</div>
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
                <div style="font-style: italic; color: #555; white-space: pre-wrap; line-height: 1.35; font-size: 12px; text-align: left;">
${(orgForPdf?.terms_and_conditions || '').trim()}
                </div>
              </div>
              <div style="border: 1px solid #ddd; border-radius: 6px; padding: 8px 10px; display: flex; flex-direction: column; justify-content: space-between;">
                <div style="text-align: right; font-size: 12px; color: #444;">For <strong>${orgForPdf?.company_name || ''}</strong></div>
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
      
      // Show success notification
      notifications.success(
        'PDF Generated!',
        'Invoice PDF has been generated and opened for printing.',
        {
          autoClose: true,
          autoCloseDelay: 3000
        }
      );
    } else {
      notifications.error(
        'PDF Failed',
        'Unable to open PDF window. Please check your browser popup settings.',
        {
          autoClose: false
        }
      );
    }
    
    // Show success notification
    notifications.success(
      'PDF Generated!',
      'Invoice PDF has been generated and opened for printing.',
      {
        autoClose: true,
        autoCloseDelay: 3000
      }
    );
  };

  // Helper function to convert numbers to words (basic implementation)
  const convertNumberToWords = (amount: number): string => {
    if (amount === 0) return 'Zero';
    
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const convertHundreds = (num: number): string => {
      let result = '';
      if (num >= 100) {
        result += ones[Math.floor(num / 100)] + ' Hundred ';
        num %= 100;
      }
      if (num >= 20) {
        result += tens[Math.floor(num / 10)] + ' ';
        num %= 10;
      } else if (num >= 10) {
        result += teens[num - 10] + ' ';
        return result;
      }
      if (num > 0) {
        result += ones[num] + ' ';
      }
      return result;
    };
    
    let integerPart = Math.floor(amount);
    const decimalPart = Math.round((amount - integerPart) * 100);
    
    let result = '';
    
    if (integerPart >= 10000000) {
      result += convertHundreds(Math.floor(integerPart / 10000000)) + 'Crore ';
      integerPart %= 10000000;
    }
    if (integerPart >= 100000) {
      result += convertHundreds(Math.floor(integerPart / 100000)) + 'Lakh ';
      integerPart %= 100000;
    }
    if (integerPart >= 1000) {
      result += convertHundreds(Math.floor(integerPart / 1000)) + 'Thousand ';
      integerPart %= 1000;
    }
    if (integerPart > 0) {
      result += convertHundreds(integerPart);
    }
    
    if (decimalPart > 0) {
      result += 'and ' + convertHundreds(decimalPart) + 'Paise ';
    }
    
    return result.trim();
  };

  const handleSendWhatsApp = () => {
    if (!generatedInvoice) {
      notifications.warning(
        'Invoice Not Generated',
        'Please generate the invoice first before sending WhatsApp.',
        {
          autoClose: true,
          autoCloseDelay: 4000
        }
      );
      return;
    }
    
    const totals = calculateTotals();
    const defaultMessage = `Thank you for your business! Your invoice total is ₹${totals.totalAmount.toFixed(2)}. Please make payment as per terms.`;
    setWhatsAppMessage(defaultMessage);
    setShowWhatsAppModal(true);
  };

  const sendWhatsAppMessage = async () => {
    const customerMobile = selectedCustomer?.mobile || adhocCustomer.mobile;
    if (!customerMobile) {
      notifications.warning(
        'Mobile Number Required',
        'Customer mobile number is required to send WhatsApp messages.',
        {
          autoClose: true,
          autoCloseDelay: 4000
        }
      );
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('Sending WhatsApp message:', {
        phone: customerMobile,
        message: whatsAppMessage,
        invoice: invoice
      });
      
      notifications.success(
        'WhatsApp Sent!',
        `Invoice successfully sent to ${customerMobile}`,
        {
          autoClose: true,
          autoCloseDelay: 4000
        }
      );
      setShowWhatsAppModal(false);
      setWhatsAppMessage('');
      
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      notifications.error(
        'WhatsApp Failed',
        'Unable to send WhatsApp message. Please check the mobile number and try again.',
        {
          autoClose: false
        }
      );
    } finally {
      setIsLoading(false);
    }
  };

  const totals = calculateTotals();

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

      <div className="relative z-10 p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-8 h-8 text-purple-600" />
            Tax Invoice
          </h1>
          <p className="text-gray-600">Create GST compliant invoices with automatic calculations</p>
        </div>
        <div className="flex gap-3">
          {!generatedInvoice ? (
            <button
              onClick={generateInvoice}
              disabled={isLoading}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {isLoading ? 'Generating...' : 'Generate Invoice'}
            </button>
          ) : (
            <button
              onClick={() => {
                setGeneratedInvoice(null);
                // Clear all form data for new invoice
                setInvoiceItems([]);
                setSelectedCustomer(null);
                setCustomerSearch('');
                setInvoice({
                  customer_id: 0,
                  invoice_date: new Date().toISOString().split('T')[0],
                  due_date: new Date().toISOString().split('T')[0],
                  customer_state: '',
                  company_state: 'Tamil Nadu',
                  notes: '',
                  items: []
                });
                setIsAdhocCustomer(false);
                setAdhocCustomer({
                  company_name: '',
                  first_name: '',
                  last_name: '',
                  email: '',
                  mobile: '',
                  phone: '',
                  gst_number: '',
                  billing_address: '',
                  city: '',
                  state: '',
                  postal_code: '',
                  payment_terms: 'Immediate'
                });
              }}
              className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Invoice
            </button>
          )}
          <button
            onClick={handleDownloadInvoice}
            disabled={isLoading || !generatedInvoice}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-5 h-5" />
            Download PDF
          </button>
          <button
            onClick={handleSendWhatsApp}
            disabled={isLoading || !generatedInvoice}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
          >
            <MessageCircle className="w-5 h-5" />
            Send WhatsApp
          </button>
        </div>
      </div>

      {/* Single Column Layout */}
      <div className="space-y-6">
        
        {/* Customer Selection */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <User className="w-5 h-5 text-purple-600" />
              Customer Information
            </h2>
            
            {/* Customer Type Toggle */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">
                Adhoc Customer
              </label>
              <button
                onClick={() => {
                  setIsAdhocCustomer(!isAdhocCustomer);
                  setSelectedCustomer(null);
                  setCustomerSearch('');
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isAdhocCustomer ? 'bg-purple-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isAdhocCustomer ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!isAdhocCustomer ? (
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Customer
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => {
                      console.log('Customer search changed to:', e.target.value);
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                      console.log('Customer dropdown shown, filtered customers:', filteredCustomers.length);
                    }}
                    onFocus={() => {
                      console.log('Customer input focused');
                      setShowCustomerDropdown(true);
                    }}
                    onBlur={() => {
                      console.log('Customer input blurred, closing dropdown in 500ms');
                      setTimeout(() => setShowCustomerDropdown(false), 500);
                    }}
                    placeholder="Search customers..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-10"
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  
                  {showCustomerDropdown && filteredCustomers.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredCustomers.slice(0, 10).map(customer => (
                        <div
                          key={customer.id}
                          onClick={() => {
                            console.log('Customer dropdown item clicked:', customer.email);
                            handleCustomerSelect(customer);
                          }}
                          className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">
                            {getCustomerDisplayName(customer)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {customer.customer_code} • {customer.email}
                          </div>
                          {customer.city && customer.state && (
                            <div className="text-xs text-gray-400">
                              {customer.city}, {customer.state}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={adhocCustomer.company_name}
                    onChange={(e) => setAdhocCustomer(prev => ({ ...prev, company_name: e.target.value }))}
                    placeholder="Company Name (optional)"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={adhocCustomer.first_name}
                    onChange={(e) => setAdhocCustomer(prev => ({ ...prev, first_name: e.target.value }))}
                    placeholder="First Name"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={adhocCustomer.last_name}
                    onChange={(e) => setAdhocCustomer(prev => ({ ...prev, last_name: e.target.value }))}
                    placeholder="Last Name"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={adhocCustomer.email}
                    onChange={(e) => setAdhocCustomer(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Email Address"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mobile
                  </label>
                  <input
                    type="tel"
                    value={adhocCustomer.mobile}
                    onChange={(e) => setAdhocCustomer(prev => ({ ...prev, mobile: e.target.value }))}
                    placeholder="Mobile Number"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GST Number
                  </label>
                  <input
                    type="text"
                    value={adhocCustomer.gst_number}
                    onChange={(e) => setAdhocCustomer(prev => ({ ...prev, gst_number: e.target.value }))}
                    placeholder="GST Number (optional)"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={adhocCustomer.city}
                    onChange={(e) => setAdhocCustomer(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="City"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    value={adhocCustomer.state}
                    onChange={(e) => setAdhocCustomer(prev => ({ ...prev, state: e.target.value }))}
                    placeholder="State"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Billing Address
                  </label>
                  <textarea
                    value={adhocCustomer.billing_address}
                    onChange={(e) => setAdhocCustomer(prev => ({ ...prev, billing_address: e.target.value }))}
                    placeholder="Complete Billing Address"
                    rows={2}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice Date
              </label>
              <input
                type="date"
                value={invoice.invoice_date || ''}
                onChange={(e) => setInvoice(prev => ({ ...prev, invoice_date: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          
          {(selectedCustomer || (isAdhocCustomer && (adhocCustomer.first_name || adhocCustomer.company_name))) && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Customer Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p><strong>Email:</strong> {selectedCustomer?.email || adhocCustomer.email}</p>
                  <p><strong>Phone:</strong> {selectedCustomer?.phone || adhocCustomer.phone}</p>
                  <p><strong>Mobile:</strong> {selectedCustomer?.mobile || adhocCustomer.mobile}</p>
                </div>
                <div>
                  <p><strong>State:</strong> {selectedCustomer?.state || adhocCustomer.state}</p>
                  <p><strong>GST No:</strong> {selectedCustomer?.gst_number || adhocCustomer.gst_number}</p>
                  <p><strong>Address:</strong> {selectedCustomer?.billing_address || adhocCustomer.billing_address}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Invoice Items */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-600" />
              Invoice Items
            </h2>
            <button
              onClick={addInvoiceItem}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>
          
          <div className="space-y-4">
            {invoiceItems.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex flex-wrap gap-3 items-end">
                  {/* Item Selection */}
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={itemSearches[index] || (item.item_id > 0 ? getItemDisplayName(item.item_id) : '')}
                        onChange={(e) => {
                          setItemSearches(prev => ({ ...prev, [index]: e.target.value }));
                          setShowItemDropdowns(prev => ({ ...prev, [index]: true }));
                        }}
                        onFocus={() => setShowItemDropdowns(prev => ({ ...prev, [index]: true }))}
                        onBlur={() => setTimeout(() => setShowItemDropdowns(prev => ({ ...prev, [index]: false })), 500)}
                        placeholder="Search items..."
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-8"
                      />
                      <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      
                      {showItemDropdowns[index] && (
                                                 <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                     {getFilteredItems(itemSearches[index] || '').slice(0, 10).map(availableItem => (
                             <div
                               key={availableItem.id}
                               onClick={() => {
                                 console.log('Dropdown item clicked:', availableItem.name);
                                 handleItemSelect(index, availableItem);
                               }}
                               className="p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                             >
                               <div className="font-medium text-gray-900 text-sm">
                                 {availableItem.name}
                               </div>
                               <div className="text-xs text-gray-500">
                                 SKU: {availableItem.sku} • Stock: {availableItem.current_stock} • ₹{availableItem.selling_price}
                               </div>
                             </div>
                           ))}
                          {getFilteredItems(itemSearches[index] || '').length === 0 && (
                            <div className="p-2 text-gray-500 text-sm">No items found</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Quantity */}
                  <div className="w-20">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateInvoiceItem(index, 'quantity', parseInt(e.target.value))}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      min="0"
                      max={(() => {
                        const itemData = items.find(i => i.id === item.item_id);
                        return itemData ? itemData.current_stock : undefined;
                      })()}
                      step="1"
                      title={(() => {
                        const itemData = items.find(i => i.id === item.item_id);
                        return itemData ? `Maximum available: ${itemData.current_stock}` : '';
                      })()}
                    />
                  </div>
                  
                  {/* Unit Price */}
                  <div className="w-24">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Price
                    </label>
                    <input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) => updateInvoiceItem(index, 'unit_price', parseInt(e.target.value))}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      min="0"
                      step="1"
                    />
                  </div>
                  
                  {/* GST Rate - Display Only */}
                  <div className="w-24">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      GST Rate
                    </label>
                    <div className="p-2 bg-gray-50 rounded text-center font-medium">
                      {item.gst_rate}%
                    </div>
                  </div>
                  
                  {/* Tax Amount */}
                  <div className="w-28">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tax Amount
                    </label>
                    <div className="p-2 bg-gray-50 rounded text-right font-medium">
                      ₹{item.tax_amount.toFixed(2)}
                    </div>
                  </div>
                  
                  {/* Line Total */}
                  <div className="w-28">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Line Total
                    </label>
                    <div className="p-2 bg-gray-50 rounded text-right font-medium">
                      ₹{item.line_total.toFixed(2)}
                    </div>
                  </div>
                  
                  {/* Remove Button */}
                  <div className="w-12">
                    <button
                      onClick={() => removeInvoiceItem(index)}
                      className="text-red-600 hover:text-red-800 p-2"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                

              </div>
            ))}
          </div>
        </div>
        
        {/* Invoice Summary - Concise */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Invoice Summary
              {generatedInvoice && (
                <span className="ml-2 px-2 py-1 bg-green-500 text-white text-xs rounded-full">
                  Generated ✓
                </span>
              )}
            </h2>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Amount Breakdown */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-semibold">₹{totals.subtotal.toFixed(2)}</span>
                  </div>
                  
                  {totals.isInterState ? (
                    <div className="flex justify-between">
                      <span className="text-gray-600">IGST:</span>
                      <span className="font-semibold">₹{totals.totalIGST.toFixed(2)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">CGST:</span>
                        <span className="font-semibold">₹{totals.totalCGST.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">SGST:</span>
                        <span className="font-semibold">₹{totals.totalSGST.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-600">Total Tax:</span>
                    <span className="font-semibold">₹{totals.totalTax.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between bg-purple-100 rounded px-2 py-1 border border-purple-200">
                    <span className="font-bold text-purple-900">Total Amount:</span>
                    <span className="text-lg font-bold text-purple-600">₹{totals.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              {/* Quick Stats */}
              <div className="space-y-3">
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-purple-700">Items: {invoiceItems.length}</span>
                    <span className="text-purple-700">Qty: {invoiceItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
                    <span className="text-purple-700">
                      GST: {invoiceItems.length > 0 ? (invoiceItems.reduce((sum, item) => sum + item.gst_rate, 0) / invoiceItems.length).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="mt-2 text-xs">
                    <span className={`px-2 py-1 rounded-full ${totals.isInterState ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                      {totals.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}
                    </span>
                  </div>
                </div>
                
                {(selectedCustomer || (isAdhocCustomer && (adhocCustomer.first_name || adhocCustomer.company_name))) && (
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <div className="text-sm space-y-1">
                      <div className="font-medium text-blue-900 truncate">
                        {selectedCustomer ? getCustomerDisplayName(selectedCustomer) : getAdhocCustomerDisplayName()}
                      </div>
                      <div className="text-blue-700 text-xs truncate">{selectedCustomer?.email || adhocCustomer.email}</div>
                      <div className="text-blue-700 text-xs">
                        GST: {selectedCustomer?.gst_number || adhocCustomer.gst_number || 'N/A'} • {selectedCustomer?.state || adhocCustomer.state}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">Notes</h2>
          <textarea
            value={invoice.notes}
            onChange={(e) => setInvoice(prev => ({ ...prev, notes: e.target.value }))}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            rows={3}
            placeholder="Add any additional notes or terms..."
          />
        </div>
      </div>

      {/* Payment Dialog */}
      {showPaymentDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Record Payment Transaction</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invoice
                  </label>
                  <input
                    type="text"
                    value={generatedInvoice ? `${generatedInvoice.invoice_number} - ${selectedCustomer ? (selectedCustomer.company_name || `${selectedCustomer.first_name} ${selectedCustomer.last_name}`) : getAdhocCustomerDisplayName()}` : 'No invoice generated'}
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer
                  </label>
                  <input
                    type="text"
                    value={selectedCustomer ? (selectedCustomer.company_name || `${selectedCustomer.first_name} ${selectedCustomer.last_name}`) : getAdhocCustomerDisplayName()}
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100"
                    readOnly
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invoice Amount
                  </label>
                  <input
                    type="number"
                    value={calculateTotals().totalAmount}
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount Paid
                  </label>
                  <input
                    type="number"
                    value={paymentFormData.amount}
                    onChange={(e) => setPaymentFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method
                  </label>
                  <select
                    value={paymentFormData.payment_method}
                    onChange={(e) => setPaymentFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Check">Check</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="UPI">UPI</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Status
                  </label>
                  <div className="flex items-center h-12 px-3 bg-gray-100 border border-gray-300 rounded-lg">
                    <span className={`px-2 py-1 rounded text-sm font-medium ${
                      paymentFormData.amount >= calculateTotals().totalAmount 
                        ? 'bg-green-100 text-green-800' 
                        : paymentFormData.amount > 0 
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                    }`}>
                      {paymentFormData.amount >= calculateTotals().totalAmount 
                        ? 'Paid' 
                        : paymentFormData.amount > 0 
                          ? 'Partial'
                          : 'Unpaid'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={paymentFormData.payment_date || ''}
                  onChange={(e) => setPaymentFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reference Number
                </label>
                <input
                  type="text"
                  value={paymentFormData.reference_number}
                  onChange={(e) => setPaymentFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Transaction/Reference number"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={paymentFormData.notes}
                  onChange={(e) => setPaymentFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={3}
                  placeholder="Additional payment notes..."
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => handleCreateInvoiceWithPayment(false)}
                disabled={isLoading}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {isLoading ? 'Recording...' : 'Record Payment'}
              </button>
              <button
                onClick={handleCreditPurchaseClick}
                disabled={isLoading || !selectedCustomer || !generatedInvoice}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Buy on Credit
              </button>
              <button
                onClick={() => handleCreateInvoiceWithPayment(true)}
                disabled={isLoading}
                className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 disabled:opacity-50"
              >
                {isLoading ? 'Recording...' : 'Mark as Pending'}
              </button>
              <button
                onClick={() => setShowPaymentDialog(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credit Purchase Confirmation Dialog */}
      {showCreditPaymentDialog && customerCreditInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-orange-600">Credit Purchase Confirmation</h3>
            
            <div className="space-y-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Customer Credit Information</h4>
                <p className="text-sm text-blue-700">
                  <strong>Customer:</strong> {customerCreditInfo.customer_name}
                </p>
                <p className="text-sm text-blue-700">
                  <strong>Available Credit:</strong> ₹{customerCreditInfo.total_available_credit.toFixed(2)}
                </p>
                <p className="text-sm text-blue-700">
                  <strong>Active Credits:</strong> {customerCreditInfo.number_of_active_credits}
                </p>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg">
                <h4 className="font-medium text-orange-800 mb-2">Purchase Details</h4>
                <p className="text-sm text-orange-700">
                  <strong>Invoice Total:</strong> ${calculateTotals().totalAmount.toFixed(2)}
                </p>
                <p className="text-sm text-orange-700">
                  <strong>Purchase Type:</strong> Credit Purchase (No payment made)
                </p>
                <p className="text-sm text-orange-700">
                  <strong>Invoice:</strong> {generatedInvoice?.invoice_number || 'N/A'}
                </p>
              </div>
              
              <div className={`p-4 rounded-lg ${
                customerCreditInfo.total_available_credit >= calculateTotals().totalAmount 
                  ? 'bg-green-50' 
                  : 'bg-red-50'
              }`}>
                {customerCreditInfo.total_available_credit >= calculateTotals().totalAmount ? (
                  <>
                    <p className="text-sm text-green-700 font-medium">
                      ✓ Customer has sufficient credit for this purchase.
                    </p>
                    <p className="text-sm text-green-600 mt-1">
                      Remaining credit after purchase: ${(customerCreditInfo.total_available_credit - calculateTotals().totalAmount).toFixed(2)}
                    </p>
                    <p className="text-sm text-green-600 mt-1">
                      <strong>Note:</strong> No payment will be recorded - this is a credit purchase (loan).
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-red-700 font-medium">
                    ❌ Insufficient credit. Customer needs ${(calculateTotals().totalAmount - customerCreditInfo.total_available_credit).toFixed(2)} more credit.
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleConfirmCreditPurchase}
                disabled={isLoading || customerCreditInfo.total_available_credit < calculateTotals().totalAmount}
                className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : 'Confirm Credit Purchase'}
              </button>
              <button
                onClick={() => setShowCreditPaymentDialog(false)}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Send Invoice via WhatsApp</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer: {selectedCustomer ? getCustomerDisplayName(selectedCustomer) : 'None'}
              </label>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mobile: {selectedCustomer?.mobile}
              </label>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <textarea
                value={whatsAppMessage}
                onChange={(e) => setWhatsAppMessage(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={4}
                placeholder="Enter your message..."
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={sendWhatsAppMessage}
                disabled={isLoading}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? 'Sending...' : 'Send Message'}
              </button>
              <button
                onClick={() => setShowWhatsAppModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-8 bg-gray-50 p-6 rounded-lg border">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            <p>© 2025 BAI - Billing and Inventory Management. All rights reserved.</p>
            <p>For support, contact: support@bai.com | +91 9876543210</p>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p>Invoice generated on: {new Date().toLocaleDateString()}</p>
            <p>System Time: {new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      </footer>

      {/* BAI Notification Container */}
      <NotificationContainer position="top-center" />
      </div>
    </div>
  );
};

export default TaxInvoice; 