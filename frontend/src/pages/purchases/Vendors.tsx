import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Mail, Phone, MapPin, Building, Filter } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getVendors, createVendor, updateVendor, deleteVendor, Vendor, VendorCreatePayload } from '@/services/vendorApi';
import { toast } from 'sonner';


const Vendors: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
  const [isEditVendorOpen, setIsEditVendorOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [newVendor, setNewVendor] = useState<Omit<VendorCreatePayload, 'vendor_code'>>({
    vendor_name: '',
    email: '',
    phone: '',
    contact_person: '',
    billing_address: '',
    shipping_address: '',
    city: '',
    state: '',
    country: '',
    postal_code: '',
    gst_number: '',
    payment_terms: 'net_30',
  });

  const [editVendor, setEditVendor] = useState<Vendor | null>(null);
  const [deleteTargetVendor, setDeleteTargetVendor] = useState<Vendor | null>(null);

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

  const fetchCityStateByPincode = async (pin: string) => {
    if (!pin || pin.length < 6) return;
    try {
      const resp = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await resp.json();
      if (Array.isArray(data) && data[0]?.Status === 'Success' && Array.isArray(data[0]?.PostOffice) && data[0].PostOffice.length) {
        const po = data[0].PostOffice[0];
        setNewVendor(prev => ({ ...prev, city: po.District || '', state: po.State || '', country: 'India' }));
      }
    } catch (e) {
      // Silent fail; user can still type if needed
      console.warn('Pincode lookup failed', e);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const openEditDialog = (vendor: Vendor) => {
    setEditVendor({ ...vendor });
    setIsEditVendorOpen(true);
  };

  const submitEditVendor = async () => {
    if (!editVendor) return;
    try {
      const payload: Partial<VendorCreatePayload> = {
        vendor_name: editVendor.vendor_name,
        email: editVendor.email,
        phone: editVendor.phone,
        contact_person: editVendor.contact_person,
        billing_address: editVendor.billing_address,
        shipping_address: editVendor.shipping_address,
        city: editVendor.city,
        state: editVendor.state,
        country: editVendor.country,
        postal_code: editVendor.postal_code,
        gst_number: editVendor.gst_number,
        payment_terms: editVendor.payment_terms || 'net_30',
        is_active: editVendor.is_active,
      };
      await updateVendor(editVendor.id, payload);
      toast.success('Vendor updated');
      setIsEditVendorOpen(false);
      setEditVendor(null);
      await fetchVendors();
    } catch (error) {
      console.error('Failed to update vendor:', error);
      toast.error('Failed to update vendor');
    }
  };

  const openDeleteConfirm = (vendor: Vendor) => {
    setDeleteTargetVendor(vendor);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteVendor = async () => {
    if (!deleteTargetVendor) return;
    try {
      await deleteVendor(deleteTargetVendor.id);
      setVendors(prev => prev.filter(v => v.id !== deleteTargetVendor.id));
      toast.success('Vendor deleted');
      setIsDeleteConfirmOpen(false);
      setDeleteTargetVendor(null);
    } catch (error: any) {
      console.error('Failed to delete vendor:', error);
      const msg = error?.message || 'Failed to delete vendor';
      toast.error(msg);
    }
  };

  const handleAddVendor = async () => {
    try {
      const vendorData: VendorCreatePayload = {
        ...newVendor,
        vendor_code: `VC-${Date.now()}`, // Temporary unique code
      };
      const created = await createVendor(vendorData);
      setVendors(prev => [...prev, created]);
      setIsAddVendorOpen(false);
      // Reset form
      setNewVendor({
        vendor_name: '',
        email: '',
        phone: '',
        contact_person: '',
        billing_address: '',
        shipping_address: '',
        city: '',
        state: '',
        country: '',
        postal_code: '',
        gst_number: '',
        payment_terms: 'net_30',
      });
    } catch (error) {
      console.error("Failed to add vendor:", error);
      // Handle error (e.g., show a notification to the user)
    }
  };

  const filteredVendors = vendors.filter(vendor => {
    const searchLower = searchTerm.toLowerCase();
    const name = (vendor.vendor_name || '').toLowerCase();
    const email = (vendor.email || '').toLowerCase();
    
    const matchesSearch = name.includes(searchLower) || email.includes(searchLower);
    const matchesFilter = filterStatus === 'all' || (vendor.is_active ? 'active' : 'inactive') === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: boolean) => {
    return status
      ? 'bg-green-500/20 text-green-700 border border-green-200/50'
      : 'bg-gray-500/20 text-gray-700 border border-gray-200/50';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-25 to-indigo-50 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-r from-violet-100 to-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-r from-purple-50 to-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-indigo-50 to-violet-100 rounded-full mix-blend-multiply filter blur-3xl opacity-25 animate-pulse delay-500"></div>
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

      <div className="relative z-10 p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Vendors</h1>
            <p className="text-gray-600 font-medium mt-1">Manage your vendor relationships • {vendors.length} vendors total</p>
          </div>
          <Button
            onClick={() => setIsAddVendorOpen(true)}
            className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Vendor
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {[
            {
              title: 'Total Vendors',
              value: vendors.length,
              description: 'All registered vendors',
              tone: 'blue',
              filterValue: 'all',
            },
            {
              title: 'Active',
              value: vendors.filter(v => v.is_active).length,
              description: 'Currently active vendors',
              tone: 'green',
              filterValue: 'active',
            },
            {
              title: 'Inactive',
              value: vendors.filter(v => !v.is_active).length,
              description: 'Inactive vendors',
              tone: 'red',
              filterValue: 'inactive',
            },
          ].map((stat) => (
            (() => {
              const isSelected = filterStatus === stat.filterValue;

              return (
            <Card
              key={stat.title}
              role="button"
              tabIndex={0}
              onClick={() => setFilterStatus(stat.filterValue)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setFilterStatus(stat.filterValue);
                }
              }}
              className={`bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl hover:bg-white/50 hover:shadow-2xl transition-all duration-300 ring-1 ring-white/60 relative overflow-hidden group hover:scale-105 cursor-pointer select-none outline-none ${
                isSelected ? 'ring-2 ring-violet-500 shadow-2xl' : ''
              }`}
            >
              <div
                className={`absolute inset-0 ${
                  stat.tone === 'blue'
                    ? 'bg-gradient-to-br from-blue-500/10 to-blue-600/20'
                    : stat.tone === 'green'
                      ? 'bg-gradient-to-br from-green-500/10 to-green-600/20'
                      : 'bg-gradient-to-br from-red-500/10 to-red-600/20'
                }`}
              ></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-semibold text-gray-700">{stat.title}</CardTitle>
                <div
                  className={`p-2 rounded-lg ${
                    stat.tone === 'blue'
                      ? 'bg-blue-500/20'
                      : stat.tone === 'green'
                        ? 'bg-green-500/20'
                        : 'bg-red-500/20'
                  }`}
                >
                  <Building
                    className={`w-4 h-4 ${
                      stat.tone === 'blue'
                        ? 'text-blue-600'
                        : stat.tone === 'green'
                          ? 'text-green-600'
                          : 'text-red-600'
                    }`}
                  />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <p className="text-xs text-gray-600 mt-2 font-medium">{stat.description}</p>
              </CardContent>
            </Card>
              );
            })()
          ))}
        </div>

        {/* Search and Filter */}
        <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-white/20"></div>
          <CardContent className="p-6 relative z-10">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search vendors by name or email..."
                  className="pl-10 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 placeholder:text-gray-600 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 h-12 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 w-5 h-5" />
                <select
                  className="pl-10 pr-4 py-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 h-12 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-md appearance-none w-44"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vendors Table */}
        <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-white/20"></div>
          <CardContent className="p-0 relative z-10">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/30 border-b border-white/40">
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
                <tbody className="divide-y divide-white/20">
                  {filteredVendors.map((vendor) => (
                <tr key={vendor.id} className="hover:bg-white/20 transition-all duration-200">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-violet-500/20 rounded-full flex items-center justify-center">
                        <Building className="w-5 h-5 text-violet-600" />
                      </div>
                        <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{vendor.vendor_name}</div>
                            <div className="text-sm text-gray-500">GST: {vendor.gst_number || '—'}</div>
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
                    {vendor.vendor_name}
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
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(vendor.is_active)}`}>
                      {vendor.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button className="text-violet-600 hover:text-violet-900" onClick={() => openEditDialog(vendor)}>
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900" onClick={() => openDeleteConfirm(vendor)}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
                </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {filteredVendors.length === 0 && (
        <div className="text-center py-12">
          <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No vendors found</h3>
          <p className="text-gray-500">Try adjusting your search or filter criteria</p>
        </div>
      )}

      <Dialog open={isAddVendorOpen} onOpenChange={setIsAddVendorOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Vendor</DialogTitle>
            <DialogDescription>
              Fill in the details below to add a new vendor.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input id="name" value={newVendor.vendor_name} onChange={(e) => setNewVendor({...newVendor, vendor_name: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input id="email" type="email" value={newVendor.email} onChange={(e) => setNewVendor({...newVendor, email: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Phone
              </Label>
              <Input id="phone" value={newVendor.phone} onChange={(e) => setNewVendor({...newVendor, phone: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="contact_person" className="text-right">
                Contact Person
              </Label>
              <Input id="contact_person" value={newVendor.contact_person} onChange={(e) => setNewVendor({...newVendor, contact_person: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-right">
                Address
              </Label>
              <Input id="address" value={newVendor.billing_address} onChange={(e) => setNewVendor({...newVendor, billing_address: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="city" className="text-right">
                City
              </Label>
              <Input id="city" value={newVendor.city} onChange={(e) => setNewVendor({...newVendor, city: e.target.value})} className="col-span-3" placeholder="City (auto-filled or enter manually)" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="state" className="text-right">
                State
              </Label>
              <Input id="state" value={newVendor.state} onChange={(e) => setNewVendor({...newVendor, state: e.target.value})} className="col-span-3" placeholder="State (auto-filled or enter manually)" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="zip" className="text-right">
                Zip
              </Label>
              <Input id="zip" value={newVendor.postal_code} onChange={(e) => { const v = e.target.value; setNewVendor({...newVendor, postal_code: v}); fetchCityStateByPincode(v);} } className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="gst" className="text-right">
                GST Number
              </Label>
              <Input id="gst" value={newVendor.gst_number} onChange={(e) => setNewVendor({...newVendor, gst_number: e.target.value})} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleAddVendor}>Add Vendor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Vendor Dialog */}
      <Dialog open={isEditVendorOpen} onOpenChange={setIsEditVendorOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Vendor</DialogTitle>
            <DialogDescription>Update vendor details and save changes.</DialogDescription>
          </DialogHeader>
          {editVendor && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Active</Label>
                <div className="col-span-3">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={!!editVendor.is_active} onChange={(e) => setEditVendor({ ...editVendor, is_active: e.target.checked })} />
                    <span className="text-sm text-gray-600">Mark vendor active</span>
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Name</Label>
                <Input className="col-span-3" value={editVendor.vendor_name} onChange={(e) => setEditVendor({ ...editVendor, vendor_name: e.target.value })} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Email</Label>
                <Input className="col-span-3" value={editVendor.email || ''} onChange={(e) => setEditVendor({ ...editVendor, email: e.target.value })} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Phone</Label>
                <Input className="col-span-3" value={editVendor.phone || ''} onChange={(e) => setEditVendor({ ...editVendor, phone: e.target.value })} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">GST Number</Label>
                <Input className="col-span-3" value={editVendor.gst_number || ''} onChange={(e) => setEditVendor({ ...editVendor, gst_number: e.target.value })} />
              </div>
              {/* City and State are read-only and auto-filled from pincode during add. Removed from edit. */}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditVendorOpen(false)}>Cancel</Button>
            <Button onClick={submitEditVendor}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Delete Vendor</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deleteTargetVendor?.vendor_name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteVendor}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};

export default Vendors; 