"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Search, Plus, Edit, Trash2, Phone, Mail, MapPin, Building2, DollarSign, Package, FileText } from "lucide-react"
import { toast } from "sonner"

interface Vendor {
  id: number
  vendor_code: string
  company_name: string
  contact_person: string
  email: string
  phone: string
  mobile: string
  website: string
  billing_address: string
  shipping_address: string
  city: string
  state: string
  country: string
  postal_code: string
  vendor_type: string
  tax_number: string
  gst_number: string
  payment_terms: string
  currency: string
  bank_name: string
  bank_account_number: string
  routing_number: string
  swift_code: string
  is_active: boolean
  is_verified: boolean
  rating: number
  performance_score: number
  notes: string
  created_at: string
  updated_at: string
}

export default function VendorList() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    vendor_code: "",
    company_name: "",
    contact_person: "",
    email: "",
    phone: "",
    mobile: "",
    website: "",
    billing_address: "",
    shipping_address: "",
    city: "",
    state: "",
    country: "",
    postal_code: "",
    vendor_type: "supplier",
    tax_number: "",
    gst_number: "",
    payment_terms: "net_30",
    currency: "INR",
    bank_name: "",
    bank_account_number: "",
    routing_number: "",
    swift_code: "",
    is_active: true,
    is_verified: false,
    rating: 0,
    performance_score: 0,
    notes: "",
  })

  // Fetch vendors from API
  useEffect(() => {
    fetchVendors()
  }, [])

  const fetchVendors = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://127.0.0.1:8001/api/purchases/vendors/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setVendors(data.vendors || [])
      } else {
        toast.error('Failed to fetch vendors')
      }
    } catch (error) {
      console.error('Error fetching vendors:', error)
      toast.error('Failed to fetch vendors')
    } finally {
      setLoading(false)
    }
  }

  const filteredVendors = vendors.filter(
    (vendor) =>
      vendor.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.phone.includes(searchTerm) ||
      vendor.gst_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.vendor_code.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token')
      const url = editingVendor 
        ? `http://127.0.0.1:8001/api/purchases/vendors/${editingVendor.id}`
        : 'http://127.0.0.1:8001/api/purchases/vendors/'
      
      const method = editingVendor ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })
      
      if (response.ok) {
        toast.success(editingVendor ? "Vendor updated successfully!" : "Vendor added successfully!")
        fetchVendors()
        resetForm()
      } else {
        const errorData = await response.json()
        toast.error(errorData.detail || 'Failed to save vendor')
      }
    } catch (error) {
      console.error('Error saving vendor:', error)
      toast.error('Failed to save vendor')
    }
  }

  const resetForm = () => {
    setFormData({
      vendor_code: "",
      company_name: "",
      contact_person: "",
      email: "",
      phone: "",
      mobile: "",
      website: "",
      billing_address: "",
      shipping_address: "",
      city: "",
      state: "",
      country: "",
      postal_code: "",
      vendor_type: "supplier",
      tax_number: "",
      gst_number: "",
      payment_terms: "net_30",
      currency: "INR",
      bank_name: "",
      bank_account_number: "",
      routing_number: "",
      swift_code: "",
      is_active: true,
      is_verified: false,
      rating: 0,
      performance_score: 0,
      notes: "",
    })
    setEditingVendor(null)
    setIsDialogOpen(false)
  }

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor)
    setFormData({
      vendor_code: vendor.vendor_code,
      company_name: vendor.company_name,
      contact_person: vendor.contact_person || "",
      email: vendor.email,
      phone: vendor.phone || "",
      mobile: vendor.mobile || "",
      website: vendor.website || "",
      billing_address: vendor.billing_address || "",
      shipping_address: vendor.shipping_address || "",
      city: vendor.city || "",
      state: vendor.state || "",
      country: vendor.country || "",
      postal_code: vendor.postal_code || "",
      vendor_type: vendor.vendor_type,
      tax_number: vendor.tax_number || "",
      gst_number: vendor.gst_number || "",
      payment_terms: vendor.payment_terms,
      currency: vendor.currency,
      bank_name: vendor.bank_name || "",
      bank_account_number: vendor.bank_account_number || "",
      routing_number: vendor.routing_number || "",
      swift_code: vendor.swift_code || "",
      is_active: vendor.is_active,
      is_verified: vendor.is_verified,
      rating: vendor.rating,
      performance_score: vendor.performance_score,
      notes: vendor.notes || "",
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://127.0.0.1:8001/api/purchases/vendors/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      
      if (response.ok) {
        toast.success("Vendor deleted successfully!")
        fetchVendors()
      } else {
        toast.error('Failed to delete vendor')
      }
    } catch (error) {
      console.error('Error deleting vendor:', error)
      toast.error('Failed to delete vendor')
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-700 bg-clip-text text-transparent mb-2">
          Vendor Management
        </h1>
        <p className="text-gray-500">
          A centralized hub to manage all your vendors, from suppliers to contractors.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
            <Building2 className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vendors.length}</div>
            <p className="text-xs text-gray-500">All registered vendors</p>
          </CardContent>
        </Card>
        <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Vendors</CardTitle>
            <Package className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vendors.filter(v => v.is_active).length}</div>
            <p className="text-xs text-gray-500">Currently active partners</p>
          </CardContent>
        </Card>
        <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified Vendors</CardTitle>
            <FileText className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vendors.filter(v => v.is_verified).length}</div>
            <p className="text-xs text-gray-500">KYC/AML verified</p>
          </CardContent>
        </Card>
        <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Rated (Avg.)</CardTitle>
            <DollarSign className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(vendors.reduce((acc, v) => acc + v.rating, 0) / (vendors.length || 1)).toFixed(1)}/5.0
            </div>
            <p className="text-xs text-gray-500">Average vendor rating</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Add Vendor */}
      <Card className="mb-8 bg-white/60 backdrop-blur-sm border-white/20 shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search by name, email, GST, or vendor code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setIsDialogOpen(true)} className="bg-gradient-to-r from-violet-600 to-purple-700 text-white">
                  <Plus className="mr-2 h-4 w-4" /> Add Vendor
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[800px] bg-white/80 backdrop-blur-lg border-white/30 shadow-2xl">
                <DialogHeader>
                  <DialogTitle>{editingVendor ? "Edit Vendor" : "Add New Vendor"}</DialogTitle>
                  <DialogDescription>
                    {editingVendor
                      ? "Update the details for this vendor."
                      : "Fill in the form to add a new vendor to your system."}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4 max-h-[70vh] overflow-y-auto">
                  {/* Form fields... */}
                  <div>
                    <Label htmlFor="vendor_code">Vendor Code</Label>
                    <Input
                      id="vendor_code"
                      value={formData.vendor_code}
                      onChange={(e) => setFormData({ ...formData, vendor_code: e.target.value })}
                      placeholder="e.g., VEN-00123"
                    />
                  </div>
                  <div>
                    <Label htmlFor="company_name">Company Name</Label>
                    <Input
                      id="company_name"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      placeholder="e.g., Acme Corporation"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact_person">Contact Person</Label>
                    <Input
                      id="contact_person"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                      placeholder="e.g., John Doe"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g., contact@acme.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="e.g., +91-9876543210"
                    />
                  </div>
                  <div>
                    <Label htmlFor="mobile">Mobile</Label>
                    <Input
                      id="mobile"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      placeholder="e.g., +91-9876543210"
                    />
                  </div>
                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="e.g., https://acme.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="billing_address">Billing Address</Label>
                    <Input
                      id="billing_address"
                      value={formData.billing_address}
                      onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
                      placeholder="123 Billing St."
                    />
                  </div>
                  <div>
                    <Label htmlFor="shipping_address">Shipping Address</Label>
                    <Input
                      id="shipping_address"
                      value={formData.shipping_address}
                      onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })}
                      placeholder="456 Shipping Ave."
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="e.g., Mumbai"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="e.g., Maharashtra"
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      placeholder="e.g., India"
                    />
                  </div>
                  <div>
                    <Label htmlFor="postal_code">Postal Code</Label>
                    <Input
                      id="postal_code"
                      value={formData.postal_code}
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                      placeholder="e.g., 400001"
                    />
                  </div>
                  <div>
                    <Label htmlFor="vendor_type">Vendor Type</Label>
                    <Select
                      value={formData.vendor_type}
                      onValueChange={(value) => setFormData({ ...formData, vendor_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select vendor type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="supplier">Supplier</SelectItem>
                        <SelectItem value="contractor">Contractor</SelectItem>
                        <SelectItem value="service_provider">Service Provider</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="tax_number">Tax Number (PAN)</Label>
                    <Input
                      id="tax_number"
                      value={formData.tax_number}
                      onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                      placeholder="e.g., ABCDE1234F"
                    />
                  </div>
                  <div>
                    <Label htmlFor="gst_number">GST Number</Label>
                    <Input
                      id="gst_number"
                      value={formData.gst_number}
                      onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                      placeholder="e.g., 27ABCDE1234F1Z5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="payment_terms">Payment Terms</Label>
                    <Select
                      value={formData.payment_terms}
                      onValueChange={(value) => setFormData({ ...formData, payment_terms: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment terms" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="net_15">Net 15</SelectItem>
                        <SelectItem value="net_30">Net 30</SelectItem>
                        <SelectItem value="net_45">Net 45</SelectItem>
                        <SelectItem value="net_60">Net 60</SelectItem>
                        <SelectItem value="due_on_receipt">Due on Receipt</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(value) => setFormData({ ...formData, currency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">INR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="bank_name">Bank Name</Label>
                    <Input
                      id="bank_name"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      placeholder="e.g., State Bank of India"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bank_account_number">Bank Account Number</Label>
                    <Input
                      id="bank_account_number"
                      value={formData.bank_account_number}
                      onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                      placeholder="1234567890123456789"
                    />
                  </div>
                  <div>
                    <Label htmlFor="routing_number">Routing Number</Label>
                    <Input
                      id="routing_number"
                      value={formData.routing_number}
                      onChange={(e) => setFormData({ ...formData, routing_number: e.target.value })}
                      placeholder="123456789"
                    />
                  </div>
                  <div>
                    <Label htmlFor="swift_code">SWIFT Code</Label>
                    <Input
                      id="swift_code"
                      value={formData.swift_code}
                      onChange={(e) => setFormData({ ...formData, swift_code: e.target.value })}
                      placeholder="SBININBB001"
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="mr-2 h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <Label htmlFor="is_active" className="text-sm text-gray-700">
                      Is Active
                    </Label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_verified"
                      checked={formData.is_verified}
                      onChange={(e) => setFormData({ ...formData, is_verified: e.target.checked })}
                      className="mr-2 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <Label htmlFor="is_verified" className="text-sm text-gray-700">
                      Is Verified
                    </Label>
                  </div>
                  <div>
                    <Label htmlFor="rating">Rating (Out of 5)</Label>
                    <Input
                      id="rating"
                      type="number"
                      value={formData.rating}
                      onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) || 0 })}
                      min="0"
                      max="5"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="performance_score">Performance Score (%)</Label>
                    <Input
                      id="performance_score"
                      type="number"
                      value={formData.performance_score}
                      onChange={(e) => setFormData({ ...formData, performance_score: parseFloat(e.target.value) || 0 })}
                      min="0"
                      max="100"
                      step="1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes for this vendor"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit}>{editingVendor ? "Update Vendor" : "Add Vendor"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Vendors Table */}
      <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-xl">
        <CardHeader>
          <CardTitle>Vendors ({filteredVendors.length})</CardTitle>
          <CardDescription>Manage your vendor information and track purchase history</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor Details</TableHead>
                <TableHead>Contact Info</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Performance Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVendors.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{vendor.company_name}</div>
                      <div className="text-sm text-gray-500">{vendor.vendor_code}</div>
                      <div className="text-xs text-gray-400">{vendor.vendor_type}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center text-sm">
                        <Mail className="w-3 h-3 mr-1 text-gray-400" />
                        {vendor.email}
                      </div>
                      <div className="flex items-center text-sm">
                        <Phone className="w-3 h-3 mr-1 text-gray-400" />
                        {vendor.phone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-sm">
                      <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                      <div>
                        <div>
                          {vendor.city}, {vendor.state}
                        </div>
                        <div className="text-xs text-gray-500">{vendor.postal_code}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-blue-700">{vendor.rating.toFixed(1)}/5.0</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-green-700">{vendor.performance_score.toFixed(0)}%</div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={vendor.is_active ? "default" : "secondary"}
                      className={vendor.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                    >
                      {vendor.is_active ? "Active" : "Inactive"}
                    </Badge>
                    {vendor.is_verified && (
                      <Badge variant="outline" className="ml-1 bg-blue-100 text-blue-800">
                        Verified
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(vendor)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(vendor.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
