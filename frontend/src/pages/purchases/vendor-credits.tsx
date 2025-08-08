"use client"

import { useState } from "react"
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
import { Search, Plus, Edit, Trash2, Phone, Mail, MapPin, Building2, DollarSign, Package, FileText, Calendar, Receipt, CheckCircle, Clock, Eye } from "lucide-react"
import { toast } from "sonner"

interface VendorCredit {
  id: string
  creditNumber: string
  vendorName: string
  vendorId: string
  creditDate: string
  amount: number
  reason: "Return" | "Overpayment" | "Discount" | "Adjustment" | "Other"
  status: "Open" | "Applied" | "Expired"
  appliedAmount: number
  balanceAmount: number
  billId?: string
  billNumber?: string
  notes: string
  expiryDate?: string
  createdBy: string
}

const mockCredits: VendorCredit[] = [
  {
    id: "VC001",
    creditNumber: "CR-2024-001",
    vendorName: "ABC Suppliers",
    vendorId: "VEN001",
    creditDate: "2024-01-25",
    amount: 5000,
    reason: "Return",
    status: "Open",
    appliedAmount: 0,
    balanceAmount: 5000,
    billId: "BILL001",
    billNumber: "INV-2024-001",
    notes: "Defective items returned",
    expiryDate: "2024-07-25",
    createdBy: "John Doe",
  },
  {
    id: "VC002",
    creditNumber: "CR-2024-002",
    vendorName: "XYZ Trading Co.",
    vendorId: "VEN002",
    creditDate: "2024-01-28",
    amount: 2000,
    reason: "Overpayment",
    status: "Applied",
    appliedAmount: 2000,
    balanceAmount: 0,
    notes: "Excess payment adjustment",
    createdBy: "Jane Smith",
  },
]

export default function VendorCredits() {
  const [credits, setCredits] = useState<VendorCredit[]>(mockCredits)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [reasonFilter, setReasonFilter] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCredit, setEditingCredit] = useState<VendorCredit | null>(null)
  const [formData, setFormData] = useState({
    creditNumber: "",
    vendorName: "",
    vendorId: "",
    creditDate: "",
    amount: 0,
    reason: "Return" as VendorCredit["reason"],
    billId: "",
    billNumber: "",
    notes: "",
    expiryDate: "",
  })

  const filteredCredits = credits.filter((credit) => {
    const matchesSearch =
      credit.creditNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      credit.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (credit.billNumber && credit.billNumber.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === "all" || credit.status.toLowerCase() === statusFilter.toLowerCase()
    const matchesReason = reasonFilter === "all" || credit.reason.toLowerCase() === reasonFilter.toLowerCase()
    return matchesSearch && matchesStatus && matchesReason
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Open":
        return "bg-green-100 text-green-800"
      case "Applied":
        return "bg-blue-100 text-blue-800"
      case "Expired":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getReasonColor = (reason: string) => {
    switch (reason) {
      case "Return":
        return "bg-orange-100 text-orange-800"
      case "Overpayment":
        return "bg-blue-100 text-blue-800"
      case "Discount":
        return "bg-green-100 text-green-800"
      case "Adjustment":
        return "bg-purple-100 text-purple-800"
      case "Other":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleSubmit = () => {
    if (editingCredit) {
      setCredits(
        credits.map((credit) =>
          credit.id === editingCredit.id
            ? {
                ...credit,
                ...formData,
                status: "Open",
                appliedAmount: 0,
                balanceAmount: formData.amount,
              }
            : credit,
        ),
      )
      toast.success("Vendor credit updated successfully!")
    } else {
      const newCredit: VendorCredit = {
        id: `VC${String(credits.length + 1).padStart(3, "0")}`,
        ...formData,
        status: "Open",
        appliedAmount: 0,
        balanceAmount: formData.amount,
        createdBy: "Current User",
      }
      setCredits([...credits, newCredit])
      toast.success("Vendor credit created successfully!")
    }
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      creditNumber: "",
      vendorName: "",
      vendorId: "",
      creditDate: "",
      amount: 0,
      reason: "Return",
      billId: "",
      billNumber: "",
      notes: "",
      expiryDate: "",
    })
    setEditingCredit(null)
    setIsDialogOpen(false)
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-700 bg-clip-text text-transparent mb-2">
          Vendor Credits
        </h1>
        <p className="text-gray-600">Manage vendor credit notes and adjustments</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Credits</CardTitle>
            <Receipt className="h-4 w-4 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-700">{credits.length}</div>
            <p className="text-xs text-gray-500">Credit notes</p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Open Credits</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {credits.filter((c) => c.status === "Open").length}
            </div>
            <p className="text-xs text-gray-500">Available to use</p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              ₹{credits.reduce((sum, c) => sum + c.amount, 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">Credit amount</p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Available Balance</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">
              ₹{credits.reduce((sum, c) => sum + c.balanceAmount, 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">Unused credits</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-xl mb-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search credits..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/50 border-white/20"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px] bg-white/50 border-white/20">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
              <Select value={reasonFilter} onValueChange={setReasonFilter}>
                <SelectTrigger className="w-[150px] bg-white/50 border-white/20">
                  <SelectValue placeholder="Reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reasons</SelectItem>
                  <SelectItem value="return">Return</SelectItem>
                  <SelectItem value="overpayment">Overpayment</SelectItem>
                  <SelectItem value="discount">Discount</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Credit
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>{editingCredit ? "Edit Vendor Credit" : "Create Vendor Credit"}</DialogTitle>
                  <DialogDescription>
                    {editingCredit ? "Update credit note information" : "Create a new vendor credit note"}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="creditNumber">Credit Number *</Label>
                      <Input
                        id="creditNumber"
                        value={formData.creditNumber}
                        onChange={(e) => setFormData({ ...formData, creditNumber: e.target.value })}
                        placeholder="CR-2024-001"
                      />
                    </div>
                    <div>
                      <Label htmlFor="creditDate">Credit Date *</Label>
                      <Input
                        id="creditDate"
                        type="date"
                        value={formData.creditDate}
                        onChange={(e) => setFormData({ ...formData, creditDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="vendorName">Vendor Name *</Label>
                      <Input
                        id="vendorName"
                        value={formData.vendorName}
                        onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                        placeholder="Select vendor"
                      />
                    </div>
                    <div>
                      <Label htmlFor="vendorId">Vendor ID</Label>
                      <Input
                        id="vendorId"
                        value={formData.vendorId}
                        onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                        placeholder="VEN001"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="amount">Credit Amount *</Label>
                      <Input
                        id="amount"
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: Number.parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="reason">Reason *</Label>
                      <Select
                        value={formData.reason}
                        onValueChange={(value: VendorCredit["reason"]) => setFormData({ ...formData, reason: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Return">Return</SelectItem>
                          <SelectItem value="Overpayment">Overpayment</SelectItem>
                          <SelectItem value="Discount">Discount</SelectItem>
                          <SelectItem value="Adjustment">Adjustment</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="billNumber">Related Bill Number</Label>
                      <Input
                        id="billNumber"
                        value={formData.billNumber}
                        onChange={(e) => setFormData({ ...formData, billNumber: e.target.value })}
                        placeholder="INV-2024-001"
                      />
                    </div>
                    <div>
                      <Label htmlFor="billId">Bill ID</Label>
                      <Input
                        id="billId"
                        value={formData.billId}
                        onChange={(e) => setFormData({ ...formData, billId: e.target.value })}
                        placeholder="BILL001"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="expiryDate">Expiry Date (Optional)</Label>
                    <Input
                      id="expiryDate"
                      type="date"
                      value={formData.expiryDate}
                      onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Reason for credit note"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit}>{editingCredit ? "Update Credit" : "Create Credit"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Credits Table */}
      <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-xl">
        <CardHeader>
          <CardTitle>Vendor Credits ({filteredCredits.length})</CardTitle>
          <CardDescription>Manage vendor credit notes and track usage</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Credit Details</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCredits.map((credit) => (
                <TableRow key={credit.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{credit.creditNumber}</div>
                      <div className="text-sm text-gray-500">{credit.creditDate}</div>
                      {credit.billNumber && <div className="text-xs text-blue-600">Bill: {credit.billNumber}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{credit.vendorName}</div>
                      <div className="text-sm text-gray-500">{credit.vendorId}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-green-700">₹{credit.amount.toLocaleString()}</div>
                      {credit.appliedAmount > 0 && (
                        <div className="text-sm text-gray-500">Applied: ₹{credit.appliedAmount.toLocaleString()}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getReasonColor(credit.reason)}>{credit.reason}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-blue-700">₹{credit.balanceAmount.toLocaleString()}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(credit.status)}>{credit.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      {credit.status === "Open" && credit.balanceAmount > 0 && (
                        <Button variant="outline" size="sm" className="text-blue-600 bg-transparent">
                          Apply
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
