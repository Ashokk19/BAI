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
import { Search, Plus, Edit, Trash2, Phone, Mail, MapPin, Building2, DollarSign, Package, FileText, Calendar, AlertTriangle, CheckCircle, Eye, Filter } from "lucide-react"
import { toast } from "sonner"

import { getVendors, Vendor, getVendor } from "@/services/vendorApi"
import { getPurchaseOrder, getPurchaseOrders, PurchaseOrder } from "@/services/purchaseOrderApi"
import { createBill, getBill, getBills, updateBill, BillDetail, BillListItem } from "@/services/billsApi"
import { organizationService } from "@/services/organizationService"

const normalizeStatus = (value: string) => (value || "").toLowerCase().replace(/[\s_]/g, "")

const titleCaseStatus = (value: string) => {
  const raw = (value || "").toString().replace(/_/g, " ").trim()
  if (!raw) return "-"
  return raw
    .split(/\s+/g)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ")
}

const emptyFormData = {
  billNumber: "",
  vendorName: "",
  vendorId: "",
  billDate: "",
  dueDate: "",
  purchaseOrderId: "",
  paymentTerms: "Net 30",
  notes: "",
  items: [{ description: "", quantity: 1, rate: 0, amount: 0, taxRate: 0 }],
}

export default function Bills() {
  const [bills, setBills] = useState<BillListItem[]>([])
  const [billsTotal, setBillsTotal] = useState(0)
  const [isLoadingBills, setIsLoadingBills] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const [editingBillId, setEditingBillId] = useState<number | null>(null)
  const [isLoadingBillDetail, setIsLoadingBillDetail] = useState(false)
  const [isSavingBill, setIsSavingBill] = useState(false)

  const [vendors, setVendors] = useState<Vendor[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [selectedVendorDbId, setSelectedVendorDbId] = useState<string>("")
  const [selectedPoDbId, setSelectedPoDbId] = useState<string>("")
  const [isLoadingPoItems, setIsLoadingPoItems] = useState(false)

  const [formData, setFormData] = useState(emptyFormData)

  useEffect(() => {
    const load = async () => {
      try {
        const [vendorsRes, poRes] = await Promise.all([getVendors(), getPurchaseOrders()])
        setVendors(vendorsRes.vendors || [])
        setPurchaseOrders(poRes.purchase_orders || [])
      } catch (e: any) {
        toast.error(e?.message || "Failed to load vendors / purchase orders")
      }
    }
    load()
  }, [])

  const loadBills = async () => {
    setIsLoadingBills(true)
    try {
      const res = await getBills({ limit: 200 })
      setBills(res.bills || [])
      setBillsTotal(Number(res.total || 0))
    } catch (e: any) {
      toast.error(e?.message || "Failed to load bills")
      setBills([])
      setBillsTotal(0)
    } finally {
      setIsLoadingBills(false)
    }
  }

  useEffect(() => {
    loadBills()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const purchaseOrdersForVendor = useMemo(() => {
    const vendorId = Number(selectedVendorDbId)
    if (!Number.isFinite(vendorId) || vendorId <= 0) return []
    return purchaseOrders.filter((po) => Number(po.vendor_id) === vendorId)
  }, [purchaseOrders, selectedVendorDbId])

  const filteredBills = bills.filter((bill) => {
    const q = searchTerm.trim().toLowerCase()
    const matchesSearch =
      !q ||
      (bill.bill_number || "").toLowerCase().includes(q) ||
      (bill.vendor_name || "").toLowerCase().includes(q) ||
      String(bill.id).includes(q)

    const normalized = normalizeStatus(bill.status || "")
    const filterNorm = normalizeStatus(statusFilter || "")
    const matchesStatus =
      statusFilter === "all" || (filterNorm === "open" ? ["pending", "overdue"].includes(normalized) : normalized.includes(filterNorm))

    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (normalizeStatus(status)) {
      case "draft":
        return "bg-gray-100 text-gray-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "paid":
        return "bg-green-100 text-green-800"
      case "overdue":
        return "bg-red-100 text-red-800"
      case "partiallypaid":
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

  const handleSubmit = async () => {
    if (!selectedVendorDbId || !formData.vendorName) {
      toast.error("Please select a vendor")
      return
    }
    if (!formData.billDate) {
      toast.error("Bill date is required")
      return
    }
    if (!formData.dueDate) {
      toast.error("Due date is required")
      return
    }

    const vendorId = Number(selectedVendorDbId)
    if (!Number.isFinite(vendorId) || vendorId <= 0) {
      toast.error("Invalid vendor")
      return
    }

    const poId = selectedPoDbId ? Number(selectedPoDbId) : undefined

    const items = (formData.items || [])
      .map((it) => {
        const quantity = Number(it.quantity || 0)
        const unitPrice = Number(it.rate || 0)
        const description = (it.description || "").toString()
        return {
          item_name: description || "Item",
          description: description || undefined,
          quantity: quantity > 0 ? quantity : 1,
          unit_price: unitPrice >= 0 ? unitPrice : 0,
          tax_rate: Number((it as any).taxRate || 0) || undefined,
        }
      })
      .filter((it) => it.item_name && it.quantity)

    if (items.length === 0) {
      toast.error("Please add at least one bill item")
      return
    }

    try {
      setIsSavingBill(true)
      if (editingBillId) {
        const res = await updateBill(editingBillId, {
          vendor_id: vendorId,
          vendor_invoice_number: formData.billNumber || undefined,
          po_id: poId && Number.isFinite(poId) && poId > 0 ? poId : undefined,
          bill_date: formData.billDate,
          due_date: formData.dueDate,
          payment_terms: formData.paymentTerms || undefined,
          notes: formData.notes || undefined,
          items,
        })
        toast.success(res.message || "Bill updated")
      } else {
        const res = await createBill({
          vendor_id: vendorId,
          vendor_invoice_number: formData.billNumber || undefined,
          po_id: poId && Number.isFinite(poId) && poId > 0 ? poId : undefined,
          bill_date: formData.billDate,
          due_date: formData.dueDate,
          payment_terms: formData.paymentTerms || undefined,
          notes: formData.notes || undefined,
          items,
        })

        toast.success(`Bill created: ${res.bill_number}`)
      }

      resetForm()
      await loadBills()
    } catch (e: any) {
      toast.error(e?.message || (editingBillId ? "Failed to update bill" : "Failed to create bill"))
    } finally {
      setIsSavingBill(false)
    }
  }

  const resetForm = () => {
    setFormData(emptyFormData)
    setSelectedVendorDbId("")
    setSelectedPoDbId("")
    setEditingBillId(null)
    setIsDialogOpen(false)
  }

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: "", quantity: 1, rate: 0, amount: 0, taxRate: 0 }],
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

  const openCreateDialog = () => {
    setEditingBillId(null)
    setSelectedVendorDbId("")
    setSelectedPoDbId("")
    setFormData(emptyFormData)
    setIsDialogOpen(true)
  }

  const openEditBill = async (billId: number) => {
    setIsLoadingBillDetail(true)
    try {
      const detail: BillDetail = await getBill(billId)
      setEditingBillId(billId)
      setIsDialogOpen(true)

      setSelectedVendorDbId(String(detail.vendor_id))
      setSelectedPoDbId(detail.po_id ? String(detail.po_id) : "")

      const vendor = vendors.find((v) => v.id === detail.vendor_id)
      const vendorName = vendor?.vendor_name || detail.vendor_name || ""
      const vendorCode = vendor?.vendor_code || detail.vendor_code || ""

      const po = detail.po_id ? purchaseOrders.find((p) => p.id === detail.po_id) : undefined
      const poNumber = po?.po_number || ""

      setFormData({
        billNumber: detail.vendor_invoice_number || "",
        vendorName,
        vendorId: vendorCode,
        billDate: (detail.bill_date || "").toString().slice(0, 10),
        dueDate: (detail.due_date || "").toString().slice(0, 10),
        purchaseOrderId: poNumber,
        paymentTerms: detail.payment_terms || "Net 30",
        notes: detail.notes || "",
        items:
          (detail.items || []).length > 0
            ? (detail.items || []).map((it) => {
                const quantity = Number(it.quantity || 0)
                const rate = Number(it.unit_price || 0)
                return {
                  description: (it.description || it.item_name || "").toString(),
                  quantity: quantity > 0 ? quantity : 1,
                  rate: rate >= 0 ? rate : 0,
                  amount: (quantity > 0 ? quantity : 1) * (rate >= 0 ? rate : 0),
                  taxRate: Number((it as any).tax_rate || 0) || 0,
                }
              })
            : [{ description: "", quantity: 1, rate: 0, amount: 0, taxRate: 0 }],
      })
    } catch (e: any) {
      toast.error(e?.message || "Failed to load bill")
    } finally {
      setIsLoadingBillDetail(false)
    }
  }

  const downloadBill = async (billId: number) => {
    setIsLoadingBillDetail(true)
    try {
      const b: BillDetail = await getBill(billId)
      // Load vendor and organization details for richer PDF like invoice
      const [vendor, organization] = await Promise.all([
        (async () => {
          try { return await getVendor(b.vendor_id) } catch { return vendors.find(v => v.id === b.vendor_id) || null }
        })(),
        (async () => { try { return await organizationService.getOrganizationProfile() } catch { return null } })()
      ])

      const fmt = (n: number) => {
        try {
          return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n || 0)
        } catch {
          return `₹${Number(n || 0).toFixed(2)}`
        }
      }

      const escape = (s: string) => (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

      const itemsHtml = (b.items || [])
        .map((it, idx) => {
          const qty = Number(it.quantity || 0)
          const rate = Number(it.unit_price || 0)
          const taxPct = Number((it as any).tax_rate || 0)
          const taxAmt = Number((it as any).tax_amount ?? qty * rate * (taxPct / 100))
          const lineTotal = Number(it.line_total ?? qty * rate + taxAmt)
          const name = escape((it.description || it.item_name || "").toString())
          return `
            <tr>
              <td style="padding:10px;border-bottom:1px solid #eee;">${idx + 1}</td>
              <td style="padding:10px;border-bottom:1px solid #eee;">${name}</td>
              <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;">${qty}</td>
              <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;">${fmt(rate)}</td>
              <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;">${taxPct.toFixed(2)}%</td>
              <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;">${fmt(lineTotal)}</td>
            </tr>
          `
        })
        .join("")

      const html = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Bill - ${escape(String(b.bill_number || ""))}</title>
            <style>
              body { font-family: Arial, sans-serif; color: #111827; padding: 24px; }
              .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 16px; }
              .title { font-size: 20px; font-weight: 700; }
              .muted { color: #6b7280; font-size: 12px; }
              table { width: 100%; border-collapse: collapse; margin-top: 14px; }
              th { text-align:left; font-size:12px; color:#374151; padding:10px; border-bottom:2px solid #e5e7eb; background:#f9fafb; }
              .right { text-align:right; }
              .totals { margin-top: 14px; display:flex; justify-content:flex-end; }
              .totals table { width: 360px; }
              .totals td { padding:8px; border-bottom: 1px solid #eee; }
              .totals .label { color:#374151; }
              .totals .value { text-align:right; font-weight:700; }
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                <div class="title">${escape(String(organization?.company_name || 'Company'))}</div>
                ${organization?.address ? `<div class="muted">${escape(String(organization.address))}</div>` : ''}
                ${organization?.city || organization?.state || organization?.postal_code ? `<div class="muted">${escape([organization?.city, organization?.state, organization?.postal_code].filter(Boolean).join(', '))}</div>` : ''}
                ${organization?.gst_number ? `<div class="muted"><strong>GST:</strong> ${escape(String(organization.gst_number))}</div>` : ''}
              </div>
              <div style="text-align:right">
                <div class="title">BILL</div>
                <div class="muted">Bill No: ${escape(String(b.bill_number || "-"))}</div>
                <div class="muted">Bill Date: ${(b.bill_date || "").toString().slice(0,10)}</div>
                <div class="muted">Due Date: ${(b.due_date || "").toString().slice(0,10)}</div>
                <div class="muted">Status: ${escape(titleCaseStatus(b.status || ""))}</div>
              </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:8px;">
              <div style="border:1px solid #e5e7eb; padding:10px;">
                <div class="muted" style="font-weight:700; margin-bottom:6px;">Vendor</div>
                <div style="font-size:12px; line-height:1.4;">
                  <div style="font-weight:700;">${escape(String(vendor?.vendor_name || b.vendor_name || '-'))}</div>
                  ${vendor?.vendor_code ? `<div class="muted"><strong>Code:</strong> ${escape(String(vendor.vendor_code))}</div>` : ''}
                  ${vendor?.gst_number ? `<div class="muted"><strong>GST:</strong> ${escape(String(vendor.gst_number))}</div>` : ''}
                  ${vendor?.billing_address ? `<div class="muted">${escape(String(vendor.billing_address))}</div>` : ''}
                </div>
              </div>
              <div style="border:1px solid #e5e7eb; padding:10px;">
                <div class="muted" style="font-weight:700; margin-bottom:6px;">Bill Details</div>
                <div class="muted">Vendor Invoice: ${escape(String(b.vendor_invoice_number || '-'))}</div>
                ${b.po_id ? `<div class="muted">PO ID: ${b.po_id}</div>` : ''}
                ${b.payment_terms ? `<div class="muted">Payment Terms: ${escape(String(b.payment_terms))}</div>` : ''}
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width:40px">#</th>
                  <th>Description</th>
                  <th class="right" style="width:90px">Qty</th>
                  <th class="right" style="width:110px">Rate</th>
                  <th class="right" style="width:80px">Tax %</th>
                  <th class="right" style="width:140px">Line Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml || ""}
              </tbody>
            </table>

            <div class="totals">
              <table>
                <tr><td class="label">Subtotal</td><td class="value">${fmt(Number(b.subtotal || 0))}</td></tr>
                <tr><td class="label">Tax</td><td class="value">${fmt(Number(b.tax_amount || 0))}</td></tr>
                <tr><td class="label">Discount</td><td class="value">${fmt(Number(b.discount_amount || 0))}</td></tr>
                <tr><td class="label">Total</td><td class="value">${fmt(Number(b.total_amount || 0))}</td></tr>
                <tr><td class="label">Paid</td><td class="value">${fmt(Number(b.paid_amount || 0))}</td></tr>
                <tr><td class="label">Balance Due</td><td class="value">${fmt(Number(b.balance_due || 0))}</td></tr>
              </table>
            </div>

            ${b.notes ? `<div style="margin-top:14px" class="muted"><strong>Notes:</strong> ${escape(String(b.notes))}</div>` : ""}
          </body>
        </html>
      `

      const w = window.open("", "_blank")
      if (!w) {
        toast.error("Popup blocked. Please allow popups to download.")
        return
      }
      w.document.open()
      w.document.write(html)
      w.document.close()
      w.focus()
      w.print()
    } catch (e: any) {
      toast.error(e?.message || "Failed to download bill")
    } finally {
      setIsLoadingBillDetail(false)
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Bills Management</h1>
          <p className="text-gray-600 font-medium mt-1">Track and manage vendor bills and payments • {billsTotal || bills.length} bills</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
            className={`bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl hover:bg-white/50 hover:shadow-2xl transition-all duration-300 ring-1 ring-white/60 relative overflow-hidden group hover:scale-105 cursor-pointer select-none outline-none ${
              statusFilter === "all" ? "ring-2 ring-violet-500 shadow-2xl" : ""
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/20"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-semibold text-gray-700">Total Bills</CardTitle>
              <div className="p-2 rounded-lg bg-blue-500/20">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-bold text-gray-900 mb-1">{bills.length}</div>
              <p className="text-xs text-gray-600 mt-2 font-medium">All bills</p>
            </CardContent>
          </Card>

          <Card
            role="button"
            tabIndex={0}
            onClick={() => setStatusFilter("open")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                setStatusFilter("open")
              }
            }}
            className={`bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl hover:bg-white/50 hover:shadow-2xl transition-all duration-300 ring-1 ring-white/60 relative overflow-hidden group hover:scale-105 cursor-pointer select-none outline-none ${
              statusFilter === "open" ? "ring-2 ring-violet-500 shadow-2xl" : ""
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-yellow-600/20"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-semibold text-gray-700">Pending Bills</CardTitle>
              <div className="p-2 rounded-lg bg-yellow-500/20">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {bills.filter((b) => ["pending", "overdue"].includes(normalizeStatus(b.status || ""))).length}
              </div>
              <p className="text-xs text-gray-600 mt-2 font-medium">Awaiting payment</p>
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
            className={`bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl hover:bg-white/50 hover:shadow-2xl transition-all duration-300 ring-1 ring-white/60 relative overflow-hidden group hover:scale-105 cursor-pointer select-none outline-none ${
              statusFilter === "all" ? "ring-2 ring-violet-500 shadow-2xl" : ""
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-600/20"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-semibold text-gray-700">Total Amount</CardTitle>
              <div className="p-2 rounded-lg bg-green-500/20">
                <DollarSign className="w-4 h-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-bold text-gray-900 mb-1">₹{bills.reduce((sum, b) => sum + Number(b.total_amount || 0), 0).toLocaleString()}</div>
              <p className="text-xs text-gray-600 mt-2 font-medium">Total bill value</p>
            </CardContent>
          </Card>

          <Card
            role="button"
            tabIndex={0}
            onClick={() => setStatusFilter("open")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                setStatusFilter("open")
              }
            }}
            className={`bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl hover:bg-white/50 hover:shadow-2xl transition-all duration-300 ring-1 ring-white/60 relative overflow-hidden group hover:scale-105 cursor-pointer select-none outline-none ${
              statusFilter === "open" ? "ring-2 ring-violet-500 shadow-2xl" : ""
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-red-600/20"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-semibold text-gray-700">Outstanding</CardTitle>
              <div className="p-2 rounded-lg bg-red-500/20">
                <CheckCircle className="w-4 h-4 text-red-600" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-bold text-gray-900 mb-1">₹{bills.reduce((sum, b) => sum + Number(b.balance_due || 0), 0).toLocaleString()}</div>
              <p className="text-xs text-gray-600 mt-2 font-medium">Amount due</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card className="bg-white/40 backdrop-blur-3xl border border-white/50 shadow-2xl mb-6 relative overflow-hidden ring-1 ring-white/60">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-purple-500/3 to-indigo-500/5"></div>
          <CardHeader className="relative z-10">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                  <Input
                    placeholder="Search bills..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/80 backdrop-blur-lg border border-white/90 shadow-lg ring-1 ring-white/50 text-gray-900 placeholder:text-gray-500 focus:bg-white/90 h-12 font-semibold"
                  />
                </div>
                <div className="relative w-full sm:w-[180px]">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4 z-10" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="pl-10 w-full bg-white/80 backdrop-blur-lg border border-white/90 shadow-lg ring-1 ring-white/50 text-gray-900 h-12 font-semibold">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="open">Open (Pending/Overdue)</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="partiallypaid">Partially Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={openCreateDialog}
                    className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg h-12 px-6 font-semibold"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Bill
                  </Button>
                </DialogTrigger>
              <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingBillId ? "Edit Bill" : "Create New Bill"}</DialogTitle>
                  <DialogDescription>{editingBillId ? "Update bill information" : "Create a new vendor bill"}</DialogDescription>
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
                      <Label htmlFor="vendorName">Vendor Name *</Label>
                      <Select
                        value={selectedVendorDbId || ""}
                        onValueChange={(value) => {
                          setSelectedVendorDbId(value)
                          setSelectedPoDbId("")
                          const selected = vendors.find((v) => String(v.id) === value)
                          setFormData((prev) => ({
                            ...prev,
                            vendorName: selected?.vendor_name || "",
                            vendorId: selected?.vendor_code || "",
                            purchaseOrderId: "",
                            items: [{ description: "", quantity: 1, rate: 0, amount: 0, taxRate: 0 }],
                          }))
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select vendor" />
                        </SelectTrigger>
                        <SelectContent>
                          {vendors.map((v) => (
                            <SelectItem key={v.id} value={String(v.id)}>
                              {v.vendor_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="purchaseOrderId">Purchase Order</Label>
                      <Select
                        value={selectedPoDbId || ""}
                        onValueChange={async (value) => {
                          if (!value || value === "__none") return

                          setSelectedPoDbId(value)

                          const poId = Number(value)
                          const selectedPo = purchaseOrders.find((po) => Number(po.id) === poId)
                          setFormData((prev) => ({
                            ...prev,
                            purchaseOrderId: selectedPo?.po_number || "",
                          }))

                          if (!Number.isFinite(poId) || poId <= 0) return
                          setIsLoadingPoItems(true)
                          try {
                            const detail = await getPurchaseOrder(poId)
                            const mappedItems = (detail.items || [])
                              .map((it) => {
                                const quantity = Number(it.quantity || 0)
                                const rate = Number(it.unit_price || 0)
                                return {
                                  description: (it.description || it.item_name || "").toString(),
                                  quantity: quantity > 0 ? quantity : 1,
                                  rate: rate >= 0 ? rate : 0,
                                  amount: (quantity > 0 ? quantity : 1) * (rate >= 0 ? rate : 0),
                                  taxRate: Number((it as any).tax_rate || 0) || 0,
                                }
                              })
                              .filter((it) => it.description || it.quantity || it.rate)

                            setFormData((prev) => ({
                              ...prev,
                              items:
                                mappedItems.length > 0
                                  ? mappedItems
                                  : [{ description: "", quantity: 1, rate: 0, amount: 0, taxRate: 0 }],
                            }))
                          } catch (e: any) {
                            toast.error(e?.message || "Failed to load purchase order items")
                          } finally {
                            setIsLoadingPoItems(false)
                          }
                        }}
                        disabled={!selectedVendorDbId}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              !selectedVendorDbId
                                ? "Select vendor first"
                                : isLoadingPoItems
                                  ? "Loading items..."
                                  : "Select PO"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {purchaseOrdersForVendor.length === 0 ? (
                            <SelectItem value="__none" disabled>
                              No purchase orders
                            </SelectItem>
                          ) : (
                            purchaseOrdersForVendor.map((po) => (
                              <SelectItem key={po.id} value={String(po.id)}>
                                {po.po_number}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="vendorId">Vendor ID</Label>
                      <Input
                        id="vendorId"
                        value={formData.vendorId}
                        readOnly
                        placeholder="VEN001"
                        className="bg-gray-50"
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
                      {formData.items.map((item, index) => {
                        const base = Number(item.quantity || 0) * Number(item.rate || 0)
                        const taxPct = Number((item as any).taxRate || 0)
                        const taxAmt = base * (taxPct / 100)
                        const amountWithTax = base + taxAmt
                        return (
                        <div key={index} className="grid grid-cols-7 gap-2 items-end">
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
                            <Label>Tax %</Label>
                            <Input value={(item as any).taxRate?.toString() ?? "0"} readOnly className="bg-gray-50" />
                          </div>
                          <div>
                            <Label>Amount</Label>
                            <Input value={item.amount.toFixed(2)} readOnly className="bg-gray-50" />
                          </div>
                          <div>
                            <Label>Amount (with Tax)</Label>
                            <Input value={amountWithTax.toFixed(2)} readOnly className="bg-gray-50" />
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
                        )
                      })}
                    </div>
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      {(() => {
                        const subtotal = formData.items.reduce((sum, it) => sum + Number(it.amount || 0), 0)
                        const taxTotal = formData.items.reduce((sum, it: any) => sum + Number(it.amount || 0) * (Number(it.taxRate || 0) / 100), 0)
                        const grand = subtotal + taxTotal
                        return (
                          <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-2 font-medium">Subtotal</div>
                            <div className="text-right">₹{subtotal.toFixed(2)}</div>
                            <div className="col-span-2 font-medium">Tax</div>
                            <div className="text-right">₹{taxTotal.toFixed(2)}</div>
                            <div className="col-span-2 font-semibold">Total</div>
                            <div className="text-right font-bold text-green-700">₹{grand.toFixed(2)}</div>
                          </div>
                        )
                      })()}
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
                  <Button onClick={handleSubmit} disabled={isSavingBill || isLoadingBillDetail || isLoadingPoItems}>
                    {editingBillId ? "Update Bill" : "Create Bill"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

        {/* Bills Table */}
        <Card className="bg-white/40 backdrop-blur-3xl border border-white/50 shadow-2xl relative overflow-hidden ring-1 ring-white/60">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-purple-500/3 to-indigo-500/5"></div>
          <CardHeader className="relative z-10">
            <CardTitle className="text-gray-900">Bills ({filteredBills.length})</CardTitle>
            <CardDescription className="text-gray-600 font-medium">Manage vendor bills and track payment status</CardDescription>
          </CardHeader>
          <CardContent className="relative z-10">
            {isLoadingBills ? (
              <div className="py-8 text-center text-gray-600 font-medium">Loading bills...</div>
            ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-violet-50/50 to-purple-50/50 border-b border-white/40">
                  <TableHead className="font-bold text-gray-700 uppercase tracking-wider">Bill Details</TableHead>
                  <TableHead className="font-bold text-gray-700 uppercase tracking-wider">Vendor</TableHead>
                  <TableHead className="font-bold text-gray-700 uppercase tracking-wider">Dates</TableHead>
                  <TableHead className="font-bold text-gray-700 uppercase tracking-wider">Amount</TableHead>
                  <TableHead className="font-bold text-gray-700 uppercase tracking-wider">Balance</TableHead>
                  <TableHead className="font-bold text-gray-700 uppercase tracking-wider">Status</TableHead>
                  <TableHead className="font-bold text-gray-700 uppercase tracking-wider">Actions</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {filteredBills.map((bill) => (
                <TableRow key={bill.id} className="hover:bg-white/30 transition-colors">
                  <TableCell>
                    <div>
                      <div className="font-medium text-blue-700">{bill.bill_number}</div>
                      <div className="text-sm text-gray-500">BILL{String(bill.id).padStart(4, "0")}</div>
                      {bill.po_id ? <div className="text-xs text-gray-400">PO ID: {bill.po_id}</div> : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{bill.vendor_name || "-"}</div>
                      <div className="text-sm text-gray-500">{bill.vendor_code || `VEN${String(bill.vendor_id).padStart(4, "0")}`}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{(bill.bill_date || "").toString().slice(0, 10)}</div>
                      <div
                        className={`text-sm ${
                          getDaysUntilDue((bill.due_date || "").toString()) < 0 && normalizeStatus(bill.status || "") !== "paid"
                            ? "text-red-600"
                            : "text-gray-500"
                        }`}
                      >
                        Due: {(bill.due_date || "").toString().slice(0, 10)} ({getDaysUntilDue((bill.due_date || "").toString())} days)
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-green-700">₹{Number(bill.total_amount || 0).toLocaleString()}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-orange-700">₹{Number(bill.balance_due || 0).toLocaleString()}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(bill.status)}>{titleCaseStatus(bill.status || "")}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadBill(Number(bill.id))}
                        disabled={isLoadingBillDetail || isSavingBill}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditBill(Number(bill.id))}
                        disabled={isLoadingBillDetail || isSavingBill}
                      >
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
            )}
        </CardContent>
        </Card>
      </div>
    </div>
  )
}
