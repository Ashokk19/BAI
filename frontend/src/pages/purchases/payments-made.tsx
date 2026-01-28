"use client"

import { useEffect, useMemo, useState } from "react"
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
import { Search, Plus, DollarSign, CheckCircle, Filter } from "lucide-react"
import { toast } from "sonner"

import { getVendors } from "@/services/vendorApi"
import { getBills } from "@/services/billsApi"
import { getVendorCredits } from "@/services/vendorCreditsApi"
import { createVendorPayment, getVendorPayments, VendorPayment, VendorPaymentMode } from "@/services/paymentsMadeApi"

type VendorOption = { id: number; vendor_name: string; vendor_code: string }
type BillOption = { id: number; bill_number: string; balance_due: number; total_amount: number; paid_amount: number }

const todayIso = () => new Date().toISOString().slice(0, 10)

export default function PaymentsMade() {
  const [payments, setPayments] = useState<VendorPayment[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const [vendors, setVendors] = useState<VendorOption[]>([])
  const [vendorBills, setVendorBills] = useState<BillOption[]>([])
  const [availableCreditTotal, setAvailableCreditTotal] = useState(0)

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [methodFilter, setMethodFilter] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    vendor_id: "",
    bill_id: "",
    payment_date: todayIso(),
    cash_amount: 0,
    payment_mode: "cash" as VendorPaymentMode,
    reference_number: "",
    notes: "",
    use_credit: false,
    credit_amount: 0,
  })

  const selectedBill = useMemo(() => {
    const billId = Number(formData.bill_id)
    if (!Number.isFinite(billId) || billId <= 0) return null
    return vendorBills.find((b) => b.id === billId) || null
  }, [formData.bill_id, vendorBills])

  const maxCreditForBill = useMemo(() => {
    if (!formData.use_credit || !selectedBill) return 0
    const remainingAfterCash = Math.max(0, Number(selectedBill.balance_due || 0) - Number(formData.cash_amount || 0))
    return Math.max(0, Math.min(Number(availableCreditTotal || 0), remainingAfterCash))
  }, [availableCreditTotal, formData.cash_amount, formData.use_credit, selectedBill])

  const filteredPayments = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return payments.filter((p) => {
      const matchesSearch =
        !q ||
        (p.payment_number || "").toLowerCase().includes(q) ||
        (p.vendor_name || "").toLowerCase().includes(q) ||
        (p.first_bill_number || "").toLowerCase().includes(q) ||
        (p.reference_number || "").toLowerCase().includes(q)

      // Backend vendor payments don't currently expose a payment_status; treat all as completed.
      const matchesStatus = statusFilter === "all" || statusFilter === "completed"

      const normalizedMode = (p.payment_mode || "").toLowerCase().replace(/\s/g, "")
      const matchesMethod = methodFilter === "all" || normalizedMode === methodFilter.toLowerCase()
      return matchesSearch && matchesStatus && matchesMethod
    })
  }, [payments, searchTerm, methodFilter, statusFilter])

  const getMethodColor = (mode: string) => {
    switch ((mode || "").toLowerCase()) {
      case "cash":
        return "bg-green-100 text-green-800"
      case "bank_transfer":
        return "bg-blue-100 text-blue-800"
      case "cheque":
        return "bg-purple-100 text-purple-800"
      case "card":
        return "bg-orange-100 text-orange-800"
      case "upi":
        return "bg-indigo-100 text-indigo-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const fetchVendors = async () => {
    try {
      const res = await getVendors({ limit: 500 })
      setVendors(res.vendors || [])
    } catch (e: any) {
      toast.error(e?.message || "Failed to load vendors")
    }
  }

  const fetchPayments = async () => {
    setIsLoading(true)
    try {
      const res = await getVendorPayments({ limit: 300 })
      setPayments(res.payments || [])
    } catch (e: any) {
      toast.error(e?.message || "Failed to load payments")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchBillsAndCreditsForVendor = async (vendorId: number) => {
    try {
      const [billsRes, creditsRes] = await Promise.all([
        getBills({ vendor_id: vendorId, limit: 200 }),
        getVendorCredits({ vendor_id: vendorId, limit: 200 }),
      ])

      const bills = (billsRes.bills || [])
        .map((b) => ({
          id: b.id,
          bill_number: b.bill_number,
          balance_due: Number(b.balance_due || 0),
          total_amount: Number(b.total_amount || 0),
          paid_amount: Number(b.paid_amount || 0),
        }))
        .filter((b) => b.balance_due > 0)

      setVendorBills(bills)

      const credits = creditsRes.credits || []
      const available = credits.reduce((sum, c) => sum + Number(c.balance_amount || 0), 0)
      setAvailableCreditTotal(available)
    } catch (e: any) {
      setVendorBills([])
      setAvailableCreditTotal(0)
      toast.error(e?.message || "Failed to load vendor bills/credits")
    }
  }

  useEffect(() => {
    fetchVendors()
    fetchPayments()
  }, [])

  useEffect(() => {
    const vendorId = Number(formData.vendor_id)
    if (!Number.isFinite(vendorId) || vendorId <= 0) {
      setVendorBills([])
      setAvailableCreditTotal(0)
      return
    }
    fetchBillsAndCreditsForVendor(vendorId)
  }, [formData.vendor_id])

  const handleSubmit = async () => {
    const vendorId = Number(formData.vendor_id)
    const billId = Number(formData.bill_id)
    if (!Number.isFinite(vendorId) || vendorId <= 0) {
      toast.error("Please select a vendor")
      return
    }
    if (!Number.isFinite(billId) || billId <= 0) {
      toast.error("Please select a bill")
      return
    }

    const cashAmount = Number(formData.cash_amount || 0)
    const creditAmount = formData.use_credit ? Number(formData.credit_amount || 0) : 0

    if (cashAmount < 0 || creditAmount < 0) {
      toast.error("Amounts must be non-negative")
      return
    }

    const bill = vendorBills.find((b) => b.id === billId)
    if (!bill) {
      toast.error("Selected bill not available")
      return
    }

    const totalSettlement = cashAmount + creditAmount
    if (totalSettlement <= 0) {
      toast.error("Enter a cash or credit amount")
      return
    }
    if (totalSettlement > Number(bill.balance_due || 0) + 0.0001) {
      toast.error("Total exceeds bill balance due")
      return
    }
    if (formData.use_credit && creditAmount > maxCreditForBill + 0.0001) {
      toast.error("Credit amount exceeds available/allowed")
      return
    }

    try {
      await createVendorPayment({
        vendor_id: vendorId,
        payment_date: formData.payment_date,
        payment_mode: formData.payment_mode,
        reference_number: formData.reference_number || undefined,
        amount: cashAmount,
        bank_charges: 0,
        tds_amount: 0,
        notes: formData.notes || undefined,
        allocations: [{ bill_id: billId, amount_allocated: cashAmount }],
        apply_vendor_credit_amount: formData.use_credit ? creditAmount : 0,
      })

      toast.success("Payment recorded successfully")
      resetForm()
      fetchPayments()
      fetchBillsAndCreditsForVendor(vendorId)
    } catch (e: any) {
      toast.error(e?.message || "Failed to record payment")
    }
  }

  const resetForm = () => {
    setFormData({
      vendor_id: "",
      bill_id: "",
      payment_date: todayIso(),
      cash_amount: 0,
      payment_mode: "cash",
      reference_number: "",
      notes: "",
      use_credit: false,
      credit_amount: 0,
    })
    setIsDialogOpen(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-25 to-indigo-50 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-r from-violet-100 to-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-r from-purple-50 to-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-indigo-50 to-violet-100 rounded-full mix-blend-multiply filter blur-3xl opacity-25 animate-pulse delay-500"></div>
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

      <div className="relative z-10 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Payments Made</h1>
          <p className="text-gray-600 font-medium mt-1">Track and manage payments made to vendors • {payments.length} payments total</p>
        </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setStatusFilter("all")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              setStatusFilter("all")
            }
          }}
          className={`bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden cursor-pointer select-none outline-none ${
            statusFilter === "all" ? "ring-2 ring-violet-500 shadow-2xl" : ""
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-violet-600/20"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-gray-700">Total Payments</CardTitle>
            <div className="p-2 rounded-lg bg-violet-500/20">
              <DollarSign className="h-4 w-4 text-violet-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-gray-900 mb-1">{payments.length}</div>
            <p className="text-xs text-gray-600 mt-2 font-medium">All payments</p>
          </CardContent>
        </Card>

        <Card
          role="button"
          tabIndex={0}
          onClick={() => setStatusFilter("completed")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              setStatusFilter("completed")
            }
          }}
          className={`bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden cursor-pointer select-none outline-none ${
            statusFilter === "completed" ? "ring-2 ring-violet-500 shadow-2xl" : ""
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-600/20"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-gray-700">Completed</CardTitle>
            <div className="p-2 rounded-lg bg-green-500/20">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-gray-900 mb-1">{payments.length}</div>
            <p className="text-xs text-gray-600 mt-2 font-medium">Recorded payments</p>
          </CardContent>
        </Card>

        <Card
          role="button"
          tabIndex={0}
          onClick={() => setStatusFilter("all")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              setStatusFilter("all")
            }
          }}
          className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden cursor-pointer select-none outline-none"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/20"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-gray-700">Total Amount</CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/20">
              <DollarSign className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              ₹{payments.reduce((sum, p) => sum + Number(p.amount || 0), 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-600 mt-2 font-medium">Total paid</p>
          </CardContent>
        </Card>

        <Card
          role="button"
          tabIndex={0}
          onClick={() => setStatusFilter("all")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              setStatusFilter("all")
            }
          }}
          className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden cursor-pointer select-none outline-none"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-orange-600/20"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-gray-700">Vendors</CardTitle>
            <div className="p-2 rounded-lg bg-orange-500/20">
              <CheckCircle className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-gray-900 mb-1">{vendors.length}</div>
            <p className="text-xs text-gray-600 mt-2 font-medium">Available vendors</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-white/20"></div>
        <CardContent className="p-6 relative z-10">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 w-5 h-5" />
                <Input
                  placeholder="Search payments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 placeholder:text-gray-600 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 h-12 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold"
                />
              </div>

              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 w-5 h-5" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px] pl-10 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 h-12 shadow-lg ring-1 ring-white/50 font-semibold">
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
              </div>

              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 w-5 h-5" />
                <Select value={methodFilter} onValueChange={setMethodFilter}>
                  <SelectTrigger className="w-[170px] pl-10 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 h-12 shadow-lg ring-1 ring-white/50 font-semibold">
                    <SelectValue placeholder="Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                  <DialogTitle>Record New Payment</DialogTitle>
                  <DialogDescription>
                    Record a payment made to vendor (optionally apply vendor credit)
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Vendor *</Label>
                      <Select value={formData.vendor_id} onValueChange={(value) => setFormData((p) => ({ ...p, vendor_id: value, bill_id: "" }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vendor" />
                        </SelectTrigger>
                        <SelectContent>
                          {vendors.map((v) => (
                            <SelectItem key={v.id} value={String(v.id)}>
                              {v.vendor_name} ({v.vendor_code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Payment Date *</Label>
                      <Input
                        type="date"
                        value={formData.payment_date}
                        onChange={(e) => setFormData((p) => ({ ...p, payment_date: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Bill *</Label>
                      <Select value={formData.bill_id} onValueChange={(value) => setFormData((p) => ({ ...p, bill_id: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder={formData.vendor_id ? "Select bill" : "Select vendor first"} />
                        </SelectTrigger>
                        <SelectContent>
                          {vendorBills.map((b) => (
                            <SelectItem key={b.id} value={String(b.id)}>
                              {b.bill_number} (Due: ₹{Number(b.balance_due || 0).toLocaleString()})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Payment Method *</Label>
                      <Select value={formData.payment_mode} onValueChange={(value: VendorPaymentMode) => setFormData((p) => ({ ...p, payment_mode: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="cheque">Cheque</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="upi">UPI</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Cash Amount *</Label>
                      <Input
                        type="number"
                        value={formData.cash_amount}
                        onChange={(e) => setFormData((p) => ({ ...p, cash_amount: Number.parseFloat(e.target.value) || 0 }))}
                        placeholder="0.00"
                      />
                      {selectedBill ? (
                        <div className="text-xs text-gray-500 mt-1">Bill balance due: ₹{Number(selectedBill.balance_due || 0).toLocaleString()}</div>
                      ) : null}
                    </div>
                    <div>
                      <Label>Use Vendor Credit</Label>
                      <Select
                        value={formData.use_credit ? "yes" : "no"}
                        onValueChange={(value) => setFormData((p) => ({ ...p, use_credit: value === "yes", credit_amount: 0 }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="yes">Yes</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="text-xs text-gray-500 mt-1">Available credits: ₹{Number(availableCreditTotal || 0).toLocaleString()}</div>
                    </div>
                  </div>

                  {formData.use_credit ? (
                    <div>
                      <Label>Credit Amount to Apply</Label>
                      <Input
                        type="number"
                        value={formData.credit_amount}
                        onChange={(e) => setFormData((p) => ({ ...p, credit_amount: Number.parseFloat(e.target.value) || 0 }))}
                        placeholder="0.00"
                      />
                      <div className="text-xs text-gray-500 mt-1">Max for this bill: ₹{Number(maxCreditForBill || 0).toLocaleString()}</div>
                    </div>
                  ) : null}
                  <div>
                    <Label>Reference Number</Label>
                    <Input
                      value={formData.reference_number}
                      onChange={(e) => setFormData((p) => ({ ...p, reference_number: e.target.value }))}
                      placeholder="Transaction reference"
                    />
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                      placeholder="Additional notes"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit}>Record Payment</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-white/20"></div>
        <CardHeader className="relative z-10">
          <CardTitle>Payment Records ({filteredPayments.length})</CardTitle>
          <CardDescription>Track all payments made to vendors</CardDescription>
        </CardHeader>
        <CardContent className="relative z-10">
          {isLoading ? <div className="text-sm text-gray-500 mb-3">Loading payments…</div> : null}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment Details</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Bill Reference</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{payment.payment_number}</div>
                      <div className="text-sm text-gray-500">{payment.payment_date}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{payment.vendor_name || `Vendor #${payment.vendor_id}`}</div>
                      <div className="text-sm text-gray-500">{payment.vendor_code || ""}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-blue-700">{payment.first_bill_number || "—"}</div>
                      <div className="text-sm text-gray-500">{payment.first_bill_id ? `Bill #${payment.first_bill_id}` : ""}</div>
                      {payment.reference_number ? <div className="text-xs text-gray-400">Ref: {payment.reference_number}</div> : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-green-700">₹{Number(payment.amount || 0).toLocaleString()}</div>
                    {Number(payment.credit_used_amount || 0) > 0 ? (
                      <div className="text-xs text-purple-700">Credit used: ₹{Number(payment.credit_used_amount || 0).toLocaleString()}</div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge className={getMethodColor(payment.payment_mode)}>{payment.payment_mode}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    </div>
  )
}
