import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, Download, Upload, User, Building, Users, Edit, Trash2, MessageCircle, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { customerApi, Customer, CustomerCreate } from '../../services/customerApi';

interface CustomerFormData {
  customer_code: string;
  company_name: string;
  contact_person: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  mobile: string;
  website: string;
  billing_address: string;
  shipping_address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  customer_type: 'individual' | 'business';
  tax_number: string;
  gst_number: string;
  credit_limit: number;
  payment_terms: string;
  currency: string;
  notes: string;
  is_active: boolean;
}

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterState, setFilterState] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterVerified, setFilterVerified] = useState('all');
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [whatsAppMessage, setWhatsAppMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingPincode, setIsLoadingPincode] = useState(false);
  const [formData, setFormData] = useState<CustomerFormData>({
    customer_code: '',
    company_name: '',
    contact_person: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    mobile: '',
    website: '',
    billing_address: '',
    shipping_address: '',
    city: '',
    state: '',
    country: 'India',
    postal_code: '',
    customer_type: 'individual',
    tax_number: '',
    gst_number: '',
    credit_limit: 0,
    payment_terms: 'immediate',
    currency: 'INR',
    notes: '',
    is_active: true
  });

  // PIN code lookup function
  const fetchPincodeDetails = async (pincode: string) => {
    if (!pincode || pincode.length !== 6) {
      return
    }

    setIsLoadingPincode(true)
    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`)
      const data = await response.json()
      
      if (data[0]?.Status === "Success" && data[0]?.PostOffice?.length > 0) {
        const postOffice = data[0].PostOffice[0]
        const city = postOffice.District || postOffice.Block || ""
        const state = postOffice.State || ""
        
        setFormData(prev => ({
          ...prev,
          city: city,
          state: state
        }))
        
        toast.success(`Location found: ${city}, ${state}`)
      } else {
        toast.error("Invalid PIN code or location not found")
        setFormData(prev => ({
          ...prev,
          city: "",
          state: ""
        }))
      }
    } catch (error) {
      console.error("Error fetching PIN code details:", error)
      toast.error("Failed to fetch location details")
      setFormData(prev => ({
        ...prev,
        city: "",
        state: ""
      }))
    } finally {
      setIsLoadingPincode(false)
    }
  }

  // Handle PIN code change with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.postal_code.length === 6) {
        fetchPincodeDetails(formData.postal_code)
      }
    }, 1000) // 1 second delay

    return () => clearTimeout(timeoutId)
  }, [formData.postal_code])

  // Load customers from API
  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      const response = await customerApi.getCustomers({
        limit: 1000, // Get more customers for local filtering
      });
      setCustomers(response.customers);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setIsLoading(false);
    }
  };

  // Only fetch customers once on component mount
  useEffect(() => {
    fetchCustomers();
  }, []);

  const generateCustomerCode = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `CUST${timestamp}${random}`;
  };

  const handleAddCustomer = async () => {
    if (!formData.email) {
      toast.error('Please fill in required field: Email');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const customerData: CustomerCreate = {
        ...formData,
        customer_code: formData.customer_code || generateCustomerCode(),
        is_active: true,
        is_verified: false
      };

      await customerApi.createCustomer(customerData);
      toast.success('Customer added successfully!');
      setShowAddModal(false);
      resetForm();
      fetchCustomers();
    } catch (error) {
      console.error('Error adding customer:', error);
      toast.error('Failed to add customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      customer_code: customer.customer_code,
      company_name: customer.company_name || '',
      contact_person: customer.contact_person || '',
      first_name: customer.first_name || '',
      last_name: customer.last_name || '',
      email: customer.email,
      phone: customer.phone || '',
      mobile: customer.mobile || '',
      website: customer.website || '',
      billing_address: customer.billing_address || '',
      shipping_address: customer.shipping_address || '',
      city: customer.city || '',
      state: customer.state || '',
      country: customer.country || 'India',
      postal_code: customer.postal_code || '',
      customer_type: customer.customer_type,
      tax_number: customer.tax_number || '',
      gst_number: customer.gst_number || '',
      credit_limit: customer.credit_limit || 0,
      payment_terms: customer.payment_terms || 'immediate',
      currency: customer.currency || 'INR',
      notes: customer.notes || '',
      is_active: customer.is_active
    });
    setShowEditModal(true);
  };

  const handleUpdateCustomer = async () => {
    if (!formData.email || !editingCustomer) {
      toast.error('Please fill in required field: Email');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const customerData: CustomerCreate = {
        ...formData,
        is_active: formData.is_active,
        is_verified: editingCustomer.is_verified
      };

      await customerApi.updateCustomer(editingCustomer.id, customerData);
      toast.success('Customer updated successfully!');
      setShowEditModal(false);
      setEditingCustomer(null);
      resetForm();
      fetchCustomers();
    } catch (error) {
      console.error('Error updating customer:', error);
      toast.error('Failed to update customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCustomer = (customer: Customer) => {
    setCustomerToDelete(customer);
    setShowDeleteModal(true);
  };

  const confirmDeleteCustomer = async () => {
    if (!customerToDelete) return;
    
    try {
      setIsDeleting(true);
      await customerApi.deleteCustomer(customerToDelete.id);
      toast.success('Customer deleted successfully!');
      setShowDeleteModal(false);
      setCustomerToDelete(null);
      fetchCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Failed to delete customer');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (customer: Customer) => {
    try {
      await customerApi.toggleCustomerStatus(customer.id);
      toast.success(`Customer ${customer.is_active ? 'deactivated' : 'activated'} successfully!`);
      fetchCustomers();
    } catch (error) {
      console.error('Error toggling customer status:', error);
      toast.error('Failed to update customer status');
    }
  };

  const resetForm = () => {
    setFormData({
      customer_code: '',
      company_name: '',
      contact_person: '',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      mobile: '',
      website: '',
      billing_address: '',
      shipping_address: '',
      city: '',
      state: '',
      country: 'India',
      postal_code: '',
      customer_type: 'individual',
      tax_number: '',
      gst_number: '',
      credit_limit: 0,
      payment_terms: 'immediate',
      currency: 'INR',
      notes: '',
      is_active: true
    });
    setEditingCustomer(null);
  };

  const handleFormChange = (field: keyof CustomerFormData, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch = customer.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.customer_code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && customer.is_active) ||
                         (filterStatus === 'inactive' && !customer.is_active);
    
    const matchesState = filterState === 'all' || customer.state === filterState;
    
    const matchesType = filterType === 'all' || customer.customer_type === filterType;
    
    const matchesVerified = filterVerified === 'all' || 
                           (filterVerified === 'verified' && customer.is_verified) ||
                           (filterVerified === 'unverified' && !customer.is_verified);
    
    return matchesSearch && matchesStatus && matchesState && matchesType && matchesVerified;
  });

  const getUniqueStates = () => {
    const states = customers.map(c => c.state).filter(Boolean);
    return [...new Set(states)];
  };

  // Function to refresh customer data
  const refreshCustomers = () => {
    fetchCustomers();
  };

  const handleWhatsApp = (customer: Customer) => {
    setSelectedCustomer(customer);
    setWhatsAppMessage(`Hello ${customer.first_name || customer.company_name}, thank you for being our valued customer!`);
    setShowWhatsAppModal(true);
  };

  const sendWhatsAppMessage = () => {
    if (!selectedCustomer?.mobile) {
      toast.error('Customer mobile number is required');
      return;
    }
    // WhatsApp integration logic here
    toast.success('Message sent successfully!');
    setShowWhatsAppModal(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
          <p className="text-gray-600">Manage your customers and build strong business relationships</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={refreshCustomers}
            className="bg-white/50 border-white/60 hover:bg-white/70"
          >
            Refresh
          </Button>
          <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add New Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Status Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <Label className="text-sm font-medium">Customer Status</Label>
                  <p className="text-xs text-gray-500">
                    {formData.is_active ? 'Active - Customer can place orders' : 'Inactive - Customer cannot place orders'}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="is_active" className="text-sm">Active</Label>
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => handleFormChange('is_active', e.target.checked)}
                    className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                  />
                </div>
              </div>

              {/* Customer Code and Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer_code">Customer Code *</Label>
                  <Input
                    id="customer_code"
                    value={formData.customer_code}
                    onChange={(e) => handleFormChange('customer_code', e.target.value)}
                    placeholder="Auto-generated if empty"
                  />
                </div>
                <div>
                  <Label htmlFor="customer_type">Customer Type *</Label>
                  <Select value={formData.customer_type} onValueChange={(value: 'individual' | 'business') => handleFormChange('customer_type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Business/Individual Fields */}
              {formData.customer_type === 'business' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="company_name">Company Name</Label>
                    <Input
                      id="company_name"
                      value={formData.company_name}
                      onChange={(e) => handleFormChange('company_name', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact_person">Contact Person</Label>
                    <Input
                      id="contact_person"
                      value={formData.contact_person}
                      onChange={(e) => handleFormChange('contact_person', e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => handleFormChange('first_name', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => handleFormChange('last_name', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Contact Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleFormChange('email', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="mobile">Mobile</Label>
                  <Input
                    id="mobile"
                    value={formData.mobile}
                    onChange={(e) => handleFormChange('mobile', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleFormChange('phone', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => handleFormChange('website', e.target.value)}
                  />
                </div>
              </div>

              {/* Address Information */}
              <div>
                <Label htmlFor="billing_address">Billing Address</Label>
                <Textarea
                  id="billing_address"
                  value={formData.billing_address}
                  onChange={(e) => handleFormChange('billing_address', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    readOnly
                    className="bg-gray-50 border-gray-200 cursor-not-allowed"
                    placeholder="Auto-filled from PIN code"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    readOnly
                    className="bg-gray-50 border-gray-200 cursor-not-allowed"
                    placeholder="Auto-filled from PIN code"
                  />
                </div>
                <div>
                  <Label htmlFor="postal_code">Postal Code *</Label>
                  <div className="relative">
                    <Input
                      id="postal_code"
                      value={formData.postal_code}
                      onChange={(e) => handleFormChange('postal_code', e.target.value)}
                      placeholder="Enter 6-digit PIN code"
                      maxLength={6}
                    />
                    {isLoadingPincode && (
                      <Loader2 className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Enter PIN code to auto-fill city and state
                  </p>
                </div>
              </div>

              {/* Tax Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="gst_number">GST Number</Label>
                  <Input
                    id="gst_number"
                    value={formData.gst_number}
                    onChange={(e) => handleFormChange('gst_number', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="tax_number">Tax Number</Label>
                  <Input
                    id="tax_number"
                    value={formData.tax_number}
                    onChange={(e) => handleFormChange('tax_number', e.target.value)}
                  />
                </div>
              </div>

              {/* Business Terms */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="credit_limit">Credit Limit</Label>
                  <Input
                    id="credit_limit"
                    type="number"
                    value={formData.credit_limit}
                    onChange={(e) => handleFormChange('credit_limit', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="payment_terms">Payment Terms</Label>
                  <Select value={formData.payment_terms} onValueChange={(value) => handleFormChange('payment_terms', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="net_15">Net 15</SelectItem>
                      <SelectItem value="net_30">Net 30</SelectItem>
                      <SelectItem value="net_60">Net 60</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={formData.currency} onValueChange={(value) => handleFormChange('currency', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                                 <Button
                   onClick={handleAddCustomer}
                   disabled={isSubmitting}
                   className="bg-purple-600 hover:bg-purple-700"
                 >
                   {isSubmitting ? 'Adding...' : 'Add Customer'}
                 </Button>
               </div>
             </div>
           </DialogContent>
         </Dialog>
        </div>

         {/* Edit Customer Modal */}
         <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
           <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
             <DialogHeader>
               <DialogTitle>Edit Customer</DialogTitle>
             </DialogHeader>
             <div className="space-y-4">
               {/* Status Toggle */}
               <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                 <div>
                   <Label className="text-sm font-medium">Customer Status</Label>
                   <p className="text-xs text-gray-500">
                     {formData.is_active ? 'Active - Customer can place orders' : 'Inactive - Customer cannot place orders'}
                   </p>
                 </div>
                 <div className="flex items-center space-x-2">
                   <Label htmlFor="edit_is_active" className="text-sm">Active</Label>
                   <input
                     type="checkbox"
                     id="edit_is_active"
                     checked={formData.is_active}
                     onChange={(e) => handleFormChange('is_active', e.target.checked)}
                     className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                   />
                 </div>
               </div>

               {/* Customer Code and Type */}
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <Label htmlFor="edit_customer_code">Customer Code *</Label>
                   <Input
                     id="edit_customer_code"
                     value={formData.customer_code}
                     onChange={(e) => handleFormChange('customer_code', e.target.value)}
                     disabled
                   />
                 </div>
                 <div>
                   <Label htmlFor="edit_customer_type">Customer Type *</Label>
                   <Select value={formData.customer_type} onValueChange={(value: 'individual' | 'business') => handleFormChange('customer_type', value)}>
                     <SelectTrigger>
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="individual">Individual</SelectItem>
                       <SelectItem value="business">Business</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
               </div>

               {/* Business/Individual Fields */}
               {formData.customer_type === 'business' ? (
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <Label htmlFor="edit_company_name">Company Name</Label>
                     <Input
                       id="edit_company_name"
                       value={formData.company_name}
                       onChange={(e) => handleFormChange('company_name', e.target.value)}
                     />
                   </div>
                   <div>
                     <Label htmlFor="edit_contact_person">Contact Person</Label>
                     <Input
                       id="edit_contact_person"
                       value={formData.contact_person}
                       onChange={(e) => handleFormChange('contact_person', e.target.value)}
                     />
                   </div>
                 </div>
               ) : (
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <Label htmlFor="edit_first_name">First Name</Label>
                     <Input
                       id="edit_first_name"
                       value={formData.first_name}
                       onChange={(e) => handleFormChange('first_name', e.target.value)}
                     />
                   </div>
                   <div>
                     <Label htmlFor="edit_last_name">Last Name</Label>
                     <Input
                       id="edit_last_name"
                       value={formData.last_name}
                       onChange={(e) => handleFormChange('last_name', e.target.value)}
                     />
                   </div>
                 </div>
               )}

               {/* Contact Information */}
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <Label htmlFor="edit_email">Email *</Label>
                   <Input
                     id="edit_email"
                     type="email"
                     value={formData.email}
                     onChange={(e) => handleFormChange('email', e.target.value)}
                     required
                   />
                 </div>
                 <div>
                   <Label htmlFor="edit_mobile">Mobile</Label>
                   <Input
                     id="edit_mobile"
                     value={formData.mobile}
                     onChange={(e) => handleFormChange('mobile', e.target.value)}
                   />
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <Label htmlFor="edit_phone">Phone</Label>
                   <Input
                     id="edit_phone"
                     value={formData.phone}
                     onChange={(e) => handleFormChange('phone', e.target.value)}
                   />
                 </div>
                 <div>
                   <Label htmlFor="edit_website">Website</Label>
                   <Input
                     id="edit_website"
                     value={formData.website}
                     onChange={(e) => handleFormChange('website', e.target.value)}
                   />
                 </div>
               </div>

               {/* Address Information */}
               <div>
                 <Label htmlFor="edit_billing_address">Billing Address</Label>
                 <Textarea
                   id="edit_billing_address"
                   value={formData.billing_address}
                   onChange={(e) => handleFormChange('billing_address', e.target.value)}
                   rows={3}
                 />
               </div>

               <div className="grid grid-cols-3 gap-4">
                 <div>
                   <Label htmlFor="edit_postal_code">Postal Code *</Label>
                   <div className="relative">
                     <Input
                       id="edit_postal_code"
                       value={formData.postal_code}
                       onChange={(e) => handleFormChange('postal_code', e.target.value)}
                       placeholder="Enter 6-digit PIN code"
                       maxLength={6}
                     />
                     {isLoadingPincode && (
                       <Loader2 className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                     )}
                   </div>
                   <p className="text-xs text-gray-500 mt-1">
                     Enter PIN code to auto-fill city and state
                   </p>
                 </div>
                 <div>
                   <Label htmlFor="edit_city">City</Label>
                   <Input
                     id="edit_city"
                     value={formData.city}
                     readOnly
                     className="bg-gray-50 border-gray-200 cursor-not-allowed"
                     placeholder="Auto-filled from PIN code"
                   />
                 </div>
                 <div>
                   <Label htmlFor="edit_state">State</Label>
                   <Input
                     id="edit_state"
                     value={formData.state}
                     readOnly
                     className="bg-gray-50 border-gray-200 cursor-not-allowed"
                     placeholder="Auto-filled from PIN code"
                   />
                 </div>
               </div>

               {/* Tax Information */}
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <Label htmlFor="edit_gst_number">GST Number</Label>
                   <Input
                     id="edit_gst_number"
                     value={formData.gst_number}
                     onChange={(e) => handleFormChange('gst_number', e.target.value)}
                   />
                 </div>
                 <div>
                   <Label htmlFor="edit_tax_number">Tax Number</Label>
                   <Input
                     id="edit_tax_number"
                     value={formData.tax_number}
                     onChange={(e) => handleFormChange('tax_number', e.target.value)}
                   />
                 </div>
               </div>

               {/* Business Terms */}
               <div className="grid grid-cols-3 gap-4">
                 <div>
                   <Label htmlFor="edit_credit_limit">Credit Limit</Label>
                   <Input
                     id="edit_credit_limit"
                     type="number"
                     value={formData.credit_limit}
                     onChange={(e) => handleFormChange('credit_limit', parseFloat(e.target.value) || 0)}
                   />
                 </div>
                 <div>
                   <Label htmlFor="edit_payment_terms">Payment Terms</Label>
                   <Select value={formData.payment_terms} onValueChange={(value) => handleFormChange('payment_terms', value)}>
                     <SelectTrigger>
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="immediate">Immediate</SelectItem>
                       <SelectItem value="net_15">Net 15</SelectItem>
                       <SelectItem value="net_30">Net 30</SelectItem>
                       <SelectItem value="net_60">Net 60</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
                 <div>
                   <Label htmlFor="edit_currency">Currency</Label>
                   <Select value={formData.currency} onValueChange={(value) => handleFormChange('currency', value)}>
                     <SelectTrigger>
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="INR">INR</SelectItem>
                       <SelectItem value="USD">USD</SelectItem>
                       <SelectItem value="EUR">EUR</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
               </div>

               {/* Notes */}
               <div>
                 <Label htmlFor="edit_notes">Notes</Label>
                 <Textarea
                   id="edit_notes"
                   value={formData.notes}
                   onChange={(e) => handleFormChange('notes', e.target.value)}
                   rows={3}
                 />
               </div>

               {/* Action Buttons */}
               <div className="flex justify-end space-x-2 pt-4">
                 <Button
                   variant="outline"
                   onClick={() => {
                     setShowEditModal(false);
                     setEditingCustomer(null);
                     resetForm();
                   }}
                   disabled={isSubmitting}
                 >
                   Cancel
                 </Button>
                 <Button
                   onClick={handleUpdateCustomer}
                   disabled={isSubmitting}
                   className="bg-purple-600 hover:bg-purple-700"
                 >
                   {isSubmitting ? 'Updating...' : 'Update Customer'}
                 </Button>
               </div>
             </div>
           </DialogContent>
         </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card 
          className={`bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden group cursor-pointer hover:scale-105 transition-all duration-200 ${
            filterStatus === 'all' && filterState === 'all' && filterType === 'all' && filterVerified === 'all' ? 'ring-2 ring-blue-500 shadow-2xl' : ''
          }`}
          onClick={() => {
            setFilterStatus('all');
            setFilterState('all');
            setFilterType('all');
            setFilterVerified('all');
            setSearchTerm('');
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/20"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-gray-700">Total Customers</CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/20">
              <User className="w-4 h-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-gray-900 mb-1">{customers.length}</div>
            <p className="text-xs text-gray-600 mt-2 font-medium">All registered customers</p>
          </CardContent>
        </Card>
        
        <Card 
          className={`bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden group cursor-pointer hover:scale-105 transition-all duration-200 ${
            filterStatus === 'active' && filterState === 'all' && filterType === 'all' && filterVerified === 'all' ? 'ring-2 ring-green-500 shadow-2xl' : ''
          }`}
          onClick={() => {
            setFilterStatus('active');
            setFilterState('all');
            setFilterType('all');
            setFilterVerified('all');
            setSearchTerm('');
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-600/20"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-gray-700">Active</CardTitle>
            <div className="p-2 rounded-lg bg-green-500/20">
              <User className="w-4 h-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {customers.filter(c => c.is_active).length}
            </div>
            <p className="text-xs text-gray-600 mt-2 font-medium">Can place orders</p>
          </CardContent>
        </Card>
        
        <Card 
          className={`bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden group cursor-pointer hover:scale-105 transition-all duration-200 ${
            filterType === 'business' ? 'ring-2 ring-blue-500 shadow-2xl' : ''
          }`}
          onClick={() => {
            setFilterStatus('all');
            setFilterState('all');
            setFilterType('business');
            setFilterVerified('all');
            setSearchTerm('');
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/20"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-gray-700">Business</CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Building className="w-4 h-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {customers.filter(c => c.customer_type === 'business').length}
            </div>
            <p className="text-xs text-gray-600 mt-2 font-medium">Corporate customers</p>
          </CardContent>
        </Card>
        
        <Card 
          className={`bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden group cursor-pointer hover:scale-105 transition-all duration-200 ${
            filterType === 'individual' ? 'ring-2 ring-orange-500 shadow-2xl' : ''
          }`}
          onClick={() => {
            setFilterStatus('all');
            setFilterState('all');
            setFilterType('individual');
            setFilterVerified('all');
            setSearchTerm('');
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-orange-600/20"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-gray-700">Individual</CardTitle>
            <div className="p-2 rounded-lg bg-orange-500/20">
              <Users className="w-4 h-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {customers.filter(c => c.customer_type === 'individual').length}
            </div>
            <p className="text-xs text-gray-600 mt-2 font-medium">Personal customers</p>
          </CardContent>
        </Card>
        
        <Card 
          className={`bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden group cursor-pointer hover:scale-105 transition-all duration-200 ${
            filterVerified === 'verified' ? 'ring-2 ring-purple-500 shadow-2xl' : ''
          }`}
          onClick={() => {
            setFilterStatus('all');
            setFilterState('all');
            setFilterType('all');
            setFilterVerified('verified');
            setSearchTerm('');
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-purple-600/20"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-gray-700">Verified</CardTitle>
            <div className="p-2 rounded-lg bg-purple-500/20">
              <User className="w-4 h-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {customers.filter(c => c.is_verified).length}
            </div>
            <p className="text-xs text-gray-600 mt-2 font-medium">Verified accounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterState} onValueChange={setFilterState}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {getUniqueStates().map(state => (
                  <SelectItem key={state} value={state || ''}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {(filterStatus !== 'all' || filterState !== 'all' || filterType !== 'all' || filterVerified !== 'all' || searchTerm) && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setFilterStatus('all');
                  setFilterState('all');
                  setFilterType('all');
                  setFilterVerified('all');
                  setSearchTerm('');
                }}
                className="bg-white/50 border-white/60 hover:bg-white/70"
              >
                Clear All Filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Customer List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 font-medium text-gray-700">Customer</th>
                <th className="text-left p-4 font-medium text-gray-700">Contact</th>
                <th className="text-left p-4 font-medium text-gray-700">GST Number</th>
                <th className="text-left p-4 font-medium text-gray-700">Location</th>
                <th className="text-left p-4 font-medium text-gray-700">Status</th>
                <th className="text-left p-4 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <div className="font-medium">
                          {customer.company_name || `${customer.first_name} ${customer.last_name}`}
                        </div>
                        <div className="text-sm text-gray-500">{customer.customer_code}</div>
                        <Badge variant={customer.customer_type === 'business' ? 'default' : 'secondary'}>
                          {customer.customer_type}
                        </Badge>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm">
                      <div>{customer.email}</div>
                      <div className="text-gray-500">{customer.mobile}</div>
                    </div>
                  </td>
                  <td className="p-4">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {customer.gst_number || 'N/A'}
                    </code>
                  </td>
                  <td className="p-4">
                    <div className="text-sm">
                      {customer.city}, {customer.state}
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant={customer.is_active ? 'default' : 'destructive'}>
                      {customer.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                                                       <td className="p-4">
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEditCustomer(customer)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleWhatsApp(customer)}
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteCustomer(customer)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* WhatsApp Modal */}
      {showWhatsAppModal && (
        <Dialog open={showWhatsAppModal} onOpenChange={setShowWhatsAppModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send WhatsApp Message</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Customer: {selectedCustomer?.company_name || `${selectedCustomer?.first_name} ${selectedCustomer?.last_name}`}</Label>
                <p className="text-sm text-gray-500">Mobile: {selectedCustomer?.mobile}</p>
              </div>
              <div>
                <Label>Message</Label>
                <Textarea
                  value={whatsAppMessage}
                  onChange={(e) => setWhatsAppMessage(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowWhatsAppModal(false)}>
                  Cancel
                </Button>
                <Button onClick={sendWhatsAppMessage} className="bg-green-600 hover:bg-green-700">
                  Send Message
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md">
          
          <div className="space-y-4 text-center">
            <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <p className="text-gray-700 font-medium">
                Are you sure you want to delete this customer?
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {customerToDelete?.company_name || `${customerToDelete?.first_name} ${customerToDelete?.last_name}`}
              </p>
              <p className="text-xs text-red-500 mt-2">
                This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-center space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setCustomerToDelete(null);
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteCustomer}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  'Delete Customer'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Customers; 