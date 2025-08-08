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
import { Search, Plus, Edit, Trash2, Phone, Mail, MapPin, Building2, DollarSign, Package, FileText, Calendar, AlertTriangle, CheckCircle, Eye } from "lucide-react"
import { toast } from "sonner"

interface Bill {
  id: string
  billNumber: string
  vendorName: string
  vendorId: string
  billDate: string
  dueDate: string
  status: "Draft" | "Pending" | "Paid" | "Overdue" | "Partially Paid"
  totalAmount: number
  paidAmount: number
  balanceAmount: number
  purchaseOrderId?: string
  items: Array<{
    description: string
    quantity: number
    rate: number
    amount: number
  }>
  notes: string
  paymentTerms: string
}

const mockBills: Bill[] = [
  {
    id: "BILL001",
    billNumber: "INV-2024-001",
    vendorName: "ABC Suppliers",
    vendorId: "VEN001",
    billDate: "2024-01-15",
    dueDate: "2024-02-14",
    status: "Pending",
    totalAmount: 25000,
    paidAmount: 0,
    balanceAmount: 25000,
    purchaseOrderId: "PO001",
    items: [
      { description: "Office Chairs", quantity: 10, rate: 2000, amount: 20000 },
      { description: "Desk Lamps", quantity: 5, rate: 1000, amount: 5000 },
    ],
    notes: "Payment due within 30 days",
    paymentTerms: "Net 30",
  },
  {
    id: "BILL002",
    billNumber: "INV-2024-002",
    vendorName: "XYZ Trading Co.",
    vendorId: "VEN002",
    billDate: "2024-01-18",
    dueDate: "2024-02-02",
    status: "Paid",
    totalAmount: 15000,
    paidAmount: 15000,
    balanceAmount: 0,
    purchaseOrderId: "PO002",
    items: [{ description: "Laptops", quantity: 2, rate: 7500, amount: 15000 }],
    notes: "Paid in full",
    paymentTerms: "Net 15",
  },
]

export default function Bills() {
  const [bills, setBills] = useState<Bill[]>(mockBills)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingBill, setEditingBill] = useState<Bill | null>(null)
  const [formData, setFormData] = useState({
    billNumber: "",
    vendorName: "",
    vendorId: "",
    billDate: "",
    dueDate: "",
    purchaseOrderId: "",
    paymentTerms: "Net 30",
    notes: "",
    items: [{ description: "", quantity: 1, rate: 0, amount: 0 }],
  })

  const filteredBills = bills.filter((bill) => {
    const matchesSearch =
      bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus =
      statusFilter === "all" || bill.status.toLowerCase().replace(" ", "").includes(statusFilter.toLowerCase())
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Draft":
        return "bg-gray-100 text-gray-800"
      case "Pending":
        return "bg-yellow-100 text-yellow-800"
      case "Paid":
        return "bg-green-100 text-green-800"
      case "Overdue":
        return "bg-red-100 text-red-800"
      case "Partially Paid":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const handleSubmit = () => {
    const totalAmount = formData.items.reduce((sum, item) => sum + item.amount, 0)

    if (editingBill) {
      setBills(
        bills.map((bill) =>
          bill.id === editingBill.id
            ? {
                ...bill,
                ...formData,
                totalAmount,
                balanceAmount: totalAmount - bill.paidAmount,
                items: formData.items,
              }
            : bill,
        ),
      )
      toast.success("Bill updated successfully!")
    } else {
      const newBill: Bill = {
        id: `BILL${String(bills.length + 1).padStart(3, "0")}`,
        ...formData,
        status: "Draft",
        totalAmount,
        paidAmount: 0,
        balanceAmount: totalAmount,
      }
      setBills([...bills, newBill])
      toast.success("Bill created successfully!")
    }
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      billNumber: "",
      vendorName: "",
      vendorId: "",
      billDate: "",
      dueDate: "",
      purchaseOrderId: "",
      paymentTerms: "Net 30",
      notes: "",
      items: [{ description: "", quantity: 1, rate: 0, amount: 0 }],
    })
    setEditingBill(null)
    setIsDialogOpen(false)
  }

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: "", quantity: 1, rate: 0, amount: 0 }],
    })
  }

  const updateItem = (index: number, field: string, value: any) => {
    const updatedItems = formData.items.map((item, i) => {
      if (i === index) {
        const updatedItem = { ...item, [field]: value }
        if (field === "quantity" || field === "rate") {
          updatedItem.amount = updatedItem.quantity * updatedItem.rate
        }
        return updatedItem
      }
      return item
    })
    setFormData({ ...formData, items: updatedItems })
  }

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData({
        ...formData,
        items: formData.items.filter((_, i) => i !== index),
      })
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-700 bg-clip-text text-transparent mb-2">
          Bills Management
        </h1>
        <p className="text-gray-600">Track and manage vendor bills and payments</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Bills</CardTitle>
            <FileText className="h-4 w-4 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-700">{bills.length}</div>
            <p className="text-xs text-gray-500">All bills</p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Bills</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">
              {bills.filter((b) => ["Pending", "Overdue"].includes(b.status)).length}
            </div>
            <p className="text-xs text-gray-500">Awaiting payment</p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              ₹{bills.reduce((sum, b) => sum + b.totalAmount, 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">Total bill value</p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Outstanding</CardTitle>
            <CheckCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">
              ₹{bills.reduce((sum, b) => sum + b.balanceAmount, 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">Amount due</p>
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
                  placeholder="Search bills..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/50 border-white/20"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] bg-white/50 border-white/20">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="partiallypaid">Partially Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Bill
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingBill ? "Edit Bill" : "Create New Bill"}</DialogTitle>
                  <DialogDescription>
                    {editingBill ? "Update bill information" : "Create a new vendor bill"}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="billNumber">Bill Number *</Label>
                      <Input
                        id="billNumber"
                        value={formData.billNumber}
                        onChange={(e) => setFormData({ ...formData, billNumber: e.target.value })}
                        placeholder="INV-2024-001"
                      />
                    </div>
                    <div>
                      <Label htmlFor="purchaseOrderId">Purchase Order</Label>
                      <Input
                        id="purchaseOrderId"
                        value={formData.purchaseOrderId}
                        onChange={(e) => setFormData({ ...formData, purchaseOrderId: e.target.value })}
                        placeholder="PO001"
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
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="billDate">Bill Date *</Label>
                      <Input
                        id="billDate"
                        type="date"
                        value={formData.billDate}
                        onChange={(e) => setFormData({ ...formData, billDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="dueDate">Due Date *</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="paymentTerms">Payment Terms</Label>
                      <Select
                        value={formData.paymentTerms}
                        onValueChange={(value) => setFormData({ ...formData, paymentTerms: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Net 15">Net 15</SelectItem>
                          <SelectItem value="Net 30">Net 30</SelectItem>
                          <SelectItem value="Net 45">Net 45</SelectItem>
                          <SelectItem value="Net 60">Net 60</SelectItem>
                          <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Items Section */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <Label>Bill Items</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addItem}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Item
                      </Button>
                    </div>
                    <div className="space-y-4">
                      {formData.items.map((item, index) => (
                        <div key={index} className="grid grid-cols-5 gap-2 items-end">
                          <div>
                            <Label>Description</Label>
                            <Input
                              value={item.description}
                              onChange={(e) => updateItem(index, "description", e.target.value)}
                              placeholder="Item description"
                            />
                          </div>
                          <div>
                            <Label>Quantity</Label>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, "quantity", Number.parseInt(e.target.value) || 0)}
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <Label>Rate</Label>
                            <Input
                              type="number"
                              value={item.rate}
                              onChange={(e) => updateItem(index, "rate", Number.parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <Label>Amount</Label>
                            <Input value={item.amount.toFixed(2)} readOnly className="bg-gray-50" />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeItem(index)}
                            disabled={formData.items.length === 1}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total Amount:</span>
                        <span className="text-lg font-bold text-green-700">
                          ₹{formData.items.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit}>{editingBill ? "Update Bill" : "Create Bill"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Bills Table */}
      <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-xl">
        <CardHeader>
          <CardTitle>Bills ({filteredBills.length})</CardTitle>
          <CardDescription>Manage vendor bills and track payment status</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill Details</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBills.map((bill) => (
                <TableRow key={bill.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium text-blue-700">{bill.billNumber}</div>
                      <div className="text-sm text-gray-500">{bill.id}</div>
                      {bill.purchaseOrderId && <div className="text-xs text-gray-400">PO: {bill.purchaseOrderId}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{bill.vendorName}</div>
                      <div className="text-sm text-gray-500">{bill.vendorId}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{bill.billDate}</div>
                      <div
                        className={`text-sm ${
                          getDaysUntilDue(bill.dueDate) < 0 && bill.status !== "Paid"
                            ? "text-red-600"
                            : "text-gray-500"
                        }`}
                      >
                        Due: {bill.dueDate} ({getDaysUntilDue(bill.dueDate)} days)
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-green-700">₹{bill.totalAmount.toLocaleString()}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-orange-700">₹{bill.balanceAmount.toLocaleString()}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(bill.status)}>{bill.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="text-green-600">
                        Pay
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
