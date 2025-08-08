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
import { Search, Plus, Edit, Trash2, Phone, Mail, MapPin, Building2, DollarSign, Package, FileText, Calendar, CheckCircle, Clock, Eye } from "lucide-react"
import { toast } from "sonner"

interface Payment {
  id: string
  paymentNumber: string
  vendorName: string
  vendorId: string
  billId: string
  billNumber: string
  paymentDate: string
  amount: number
  paymentMethod: "Cash" | "Bank Transfer" | "Check" | "Credit Card" | "UPI"
  status: "Completed" | "Pending" | "Failed" | "Cancelled"
  reference: string
  notes: string
  createdBy: string
}

const mockPayments: Payment[] = [
  {
    id: "PAY001",
    paymentNumber: "PMT-2024-001",
    vendorName: "ABC Suppliers",
    vendorId: "VEN001",
    billId: "BILL001",
    billNumber: "INV-2024-001",
    paymentDate: "2024-01-20",
    amount: 25000,
    paymentMethod: "Bank Transfer",
    status: "Completed",
    reference: "TXN123456789",
    notes: "Payment for office furniture",
    createdBy: "John Doe",
  },
  {
    id: "PAY002",
    paymentNumber: "PMT-2024-002",
    vendorName: "XYZ Trading Co.",
    vendorId: "VEN002",
    billId: "BILL002",
    billNumber: "INV-2024-002",
    paymentDate: "2024-01-22",
    amount: 15000,
    paymentMethod: "UPI",
    status: "Completed",
    reference: "UPI789123456",
    notes: "Payment for laptops",
    createdBy: "Jane Smith",
  },
]

export default function PaymentsMade() {
  const [payments, setPayments] = useState<Payment[]>(mockPayments)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [methodFilter, setMethodFilter] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  const [formData, setFormData] = useState({
    paymentNumber: "",
    vendorName: "",
    vendorId: "",
    billId: "",
    billNumber: "",
    paymentDate: "",
    amount: 0,
    paymentMethod: "Bank Transfer" as Payment["paymentMethod"],
    reference: "",
    notes: "",
  })

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.paymentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.reference.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || payment.status.toLowerCase() === statusFilter.toLowerCase()
    const matchesMethod =
      methodFilter === "all" || payment.paymentMethod.toLowerCase().replace(" ", "") === methodFilter.toLowerCase()
    return matchesSearch && matchesStatus && matchesMethod
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800"
      case "Pending":
        return "bg-yellow-100 text-yellow-800"
      case "Failed":
        return "bg-red-100 text-red-800"
      case "Cancelled":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getMethodColor = (method: string) => {
    switch (method) {
      case "Cash":
        return "bg-green-100 text-green-800"
      case "Bank Transfer":
        return "bg-blue-100 text-blue-800"
      case "Check":
        return "bg-purple-100 text-purple-800"
      case "Credit Card":
        return "bg-orange-100 text-orange-800"
      case "UPI":
        return "bg-indigo-100 text-indigo-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleSubmit = () => {
    if (editingPayment) {
      setPayments(
        payments.map((payment) =>
          payment.id === editingPayment.id
            ? { ...payment, ...formData, status: "Completed", createdBy: "Current User" }
            : payment,
        ),
      )
      toast.success("Payment updated successfully!")
    } else {
      const newPayment: Payment = {
        id: `PAY${String(payments.length + 1).padStart(3, "0")}`,
        ...formData,
        status: "Completed",
        createdBy: "Current User",
      }
      setPayments([...payments, newPayment])
      toast.success("Payment recorded successfully!")
    }
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      paymentNumber: "",
      vendorName: "",
      vendorId: "",
      billId: "",
      billNumber: "",
      paymentDate: "",
      amount: 0,
      paymentMethod: "Bank Transfer",
      reference: "",
      notes: "",
    })
    setEditingPayment(null)
    setIsDialogOpen(false)
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-700 bg-clip-text text-transparent mb-2">
          Payments Made
        </h1>
        <p className="text-gray-600">Track and manage payments made to vendors</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Payments</CardTitle>
            <DollarSign className="h-4 w-4 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-700">{payments.length}</div>
            <p className="text-xs text-gray-500">All payments</p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {payments.filter((p) => p.status === "Completed").length}
            </div>
            <p className="text-xs text-gray-500">Successful payments</p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              ₹{payments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">Total paid</p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">
              {payments.filter((p) => p.status === "Pending").length}
            </div>
            <p className="text-xs text-gray-500">Processing</p>
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
                  placeholder="Search payments..."
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
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="w-[150px] bg-white/50 border-white/20">
                  <SelectValue placeholder="Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="banktransfer">Bank Transfer</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="creditcard">Credit Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg">
                  <Plus className="w-4 h-4 mr-2" />
                  Record Payment
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>{editingPayment ? "Edit Payment" : "Record New Payment"}</DialogTitle>
                  <DialogDescription>
                    {editingPayment ? "Update payment information" : "Record a payment made to vendor"}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="paymentNumber">Payment Number *</Label>
                      <Input
                        id="paymentNumber"
                        value={formData.paymentNumber}
                        onChange={(e) => setFormData({ ...formData, paymentNumber: e.target.value })}
                        placeholder="PMT-2024-001"
                      />
                    </div>
                    <div>
                      <Label htmlFor="paymentDate">Payment Date *</Label>
                      <Input
                        id="paymentDate"
                        type="date"
                        value={formData.paymentDate}
                        onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
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
                      <Label htmlFor="billNumber">Bill Number</Label>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="amount">Amount *</Label>
                      <Input
                        id="amount"
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: Number.parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="paymentMethod">Payment Method *</Label>
                      <Select
                        value={formData.paymentMethod}
                        onValueChange={(value: Payment["paymentMethod"]) =>
                          setFormData({ ...formData, paymentMethod: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                          <SelectItem value="Check">Check</SelectItem>
                          <SelectItem value="Credit Card">Credit Card</SelectItem>
                          <SelectItem value="UPI">UPI</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="reference">Reference Number</Label>
                    <Input
                      id="reference"
                      value={formData.reference}
                      onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                      placeholder="Transaction reference"
                    />
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
                  <Button onClick={handleSubmit}>{editingPayment ? "Update Payment" : "Record Payment"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Payments Table */}
      <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-xl">
        <CardHeader>
          <CardTitle>Payment Records ({filteredPayments.length})</CardTitle>
          <CardDescription>Track all payments made to vendors</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment Details</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Bill Reference</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{payment.paymentNumber}</div>
                      <div className="text-sm text-gray-500">{payment.paymentDate}</div>
                      <div className="text-xs text-gray-400">By: {payment.createdBy}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{payment.vendorName}</div>
                      <div className="text-sm text-gray-500">{payment.vendorId}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-blue-700">{payment.billNumber}</div>
                      <div className="text-sm text-gray-500">{payment.billId}</div>
                      {payment.reference && <div className="text-xs text-gray-400">Ref: {payment.reference}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-green-700">₹{payment.amount.toLocaleString()}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getMethodColor(payment.paymentMethod)}>{payment.paymentMethod}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(payment.status)}>{payment.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
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
