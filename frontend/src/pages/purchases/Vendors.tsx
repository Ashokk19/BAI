import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, User, Mail, Phone, MapPin, Building } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getVendors, createVendor, updateVendor, deleteVendor, Vendor, VendorCreatePayload, VendorUpdatePayload } from '@/services/vendorApi';


const Vendors: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<number | null>(null);
  const [newVendor, setNewVendor] = useState<Omit<VendorCreatePayload, 'vendor_code'>>({
    company_name: '',
    email: '',
    phone: '',
    contact_person: '',
    billing_address: '',
    shipping_address: '',
    city: '',
    state: '',
    country: '',
    postal_code: '',
    vendor_type: 'supplier',
    tax_number: '',
    gst_number: '',
    payment_terms: 'net_30',
    currency: 'INR',
    is_active: true,
  });

  const fetchVendors = async () => {
    try {
      // Assuming getVendors will be updated to return a list of vendors
      const response = await getVendors();
      // This is a placeholder, adapt based on the actual API response structure
      setVendors(response.vendors || []); 
    } catch (error) {
      console.error("Failed to fetch vendors:", error);
      // Handle error appropriately
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleSaveVendor = async () => {
    try {
      if (editingVendorId) {
        const payload: VendorUpdatePayload = { ...newVendor };
        const updated = await updateVendor(editingVendorId, payload);
        setVendors(prev => prev.map(v => (v.id === editingVendorId ? updated : v)));
      } else {
        const vendorData: VendorCreatePayload = {
          ...newVendor,
          vendor_code: `VC-${Date.now()}`,
        };
        const created = await createVendor(vendorData);
        setVendors(prev => [...prev, created]);
      }
      setIsAddVendorOpen(false);
      // Reset form
      setNewVendor({
        company_name: '',
        email: '',
        phone: '',
        contact_person: '',
        billing_address: '',
        shipping_address: '',
        city: '',
        state: '',
        country: '',
        postal_code: '',
        vendor_type: 'supplier',
        tax_number: '',
        gst_number: '',
        payment_terms: 'net_30',
        currency: 'INR',
        is_active: true,
      });
      setEditingVendorId(null);
    } catch (error) {
      console.error("Failed to add vendor:", error);
      // Handle error (e.g., show a notification to the user)
    }
  };

  const onEditVendor = (vendor: Vendor) => {
    setEditingVendorId(vendor.id);
    setNewVendor({
      company_name: vendor.company_name,
      email: vendor.email,
      phone: vendor.phone || '',
      contact_person: vendor.contact_person || '',
      billing_address: vendor.billing_address || '',
      shipping_address: vendor.shipping_address || '',
      city: vendor.city || '',
      state: vendor.state || '',
      country: vendor.country || '',
      postal_code: vendor.postal_code || '',
      vendor_type: vendor.vendor_type,
      tax_number: vendor.tax_number || '',
      gst_number: vendor.gst_number || '',
      payment_terms: vendor.payment_terms,
      currency: vendor.currency,
      is_active: vendor.is_active,
    });
    setIsAddVendorOpen(true);
  };

  const onDeleteVendor = async (vendorId: number) => {
    try {
      await deleteVendor(vendorId);
      setVendors(prev => prev.filter(v => v.id !== vendorId));
    } catch (error) {
      console.error('Failed to delete vendor', error);
    }
  };

  const filteredVendors = vendors.filter(vendor => {
    const searchLower = searchTerm.toLowerCase();
    const name = vendor.company_name.toLowerCase();
    const email = vendor.email.toLowerCase();
    
    const matchesSearch = name.includes(searchLower) || email.includes(searchLower);
    const matchesFilter = filterStatus === 'all' || (vendor.is_active ? 'active' : 'inactive') === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: boolean) => {
    return status ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
          <p className="text-gray-600">Manage your vendor relationships</p>
        </div>
        <button 
          onClick={() => setIsAddVendorOpen(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add New Vendor
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-white/70 border-white/40">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-gray-700">Total Vendors</CardTitle>
            <Building className="w-5 h-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{vendors.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-white/70 border-white/40">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-gray-700">Active</CardTitle>
            <Building className="w-5 h-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{vendors.filter(v => v.is_active).length}</div>
          </CardContent>
        </Card>
        <Card className="bg-white/70 border-white/40">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-gray-700">Inactive</CardTitle>
            <Building className="w-5 h-5 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{vendors.filter(v => !v.is_active).length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search vendors by name, email, or company..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Vendors Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Paid
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredVendors.map((vendor) => (
                <tr key={vendor.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <Building className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{vendor.company_name}</div>
                            <div className="text-sm text-gray-500">Tax ID: {vendor.tax_number}</div>
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div className="flex items-center gap-2 mb-1">
                        <Mail className="w-4 h-4 text-gray-400" />
                        {vendor.email}
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {vendor.phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {vendor.company_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <div>
                            <div>{vendor.city}, {vendor.state}</div>
                            <div className="text-gray-500">{vendor.postal_code}</div>
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {/* These fields do not exist on the vendor model, will be removed for now */}
                    {/* <div>
                        <div className="font-medium">{vendor.total_orders}</div>
                        <div className="text-gray-500">Last: {vendor.last_order}</div>
                    </div> */}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {/* <div className="font-medium">${vendor.total_paid.toFixed(2)}</div> */}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(vendor.is_active)}`}>
                      {vendor.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                       <button className="text-purple-600 hover:text-purple-900" onClick={() => onEditVendor(vendor)}>
                        <Edit className="w-4 h-4" />
                      </button>
                       <button className="text-red-600 hover:text-red-900" onClick={() => onDeleteVendor(vendor.id)}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {filteredVendors.length === 0 && (
        <div className="text-center py-12">
          <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No vendors found</h3>
          <p className="text-gray-500">Try adjusting your search or filter criteria</p>
        </div>
      )}

      <Dialog open={isAddVendorOpen} onOpenChange={setIsAddVendorOpen}>
        <DialogContent className="sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>Add New Vendor</DialogTitle>
            <DialogDescription>
              Fill in the details below to add a new vendor.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={newVendor.company_name} onChange={(e) => setNewVendor({ ...newVendor, company_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={newVendor.email} onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={newVendor.phone} onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_person">Contact Person</Label>
              <Input id="contact_person" value={newVendor.contact_person} onChange={(e) => setNewVendor({ ...newVendor, contact_person: e.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={newVendor.billing_address} onChange={(e) => setNewVendor({ ...newVendor, billing_address: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={newVendor.city} onChange={(e) => setNewVendor({ ...newVendor, city: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" value={newVendor.state} onChange={(e) => setNewVendor({ ...newVendor, state: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">Zip</Label>
              <Input id="zip" value={newVendor.postal_code} onChange={(e) => setNewVendor({ ...newVendor, postal_code: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" value={newVendor.country} onChange={(e) => setNewVendor({ ...newVendor, country: e.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="tax_id">Tax ID</Label>
              <Input id="tax_id" value={newVendor.tax_number} onChange={(e) => setNewVendor({ ...newVendor, tax_number: e.target.value })} />
            </div>
            <div className="flex items-center gap-3 md:col-span-2">
              <input
                id="is_active"
                type="checkbox"
                checked={!!newVendor.is_active}
                onChange={(e) => setNewVendor({ ...newVendor, is_active: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleSaveVendor}>{editingVendorId ? 'Update Vendor' : 'Add Vendor'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Vendors; 