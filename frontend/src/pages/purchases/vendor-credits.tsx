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
import { Search, Plus, Edit, Trash2, DollarSign, Receipt, CheckCircle, Clock, Eye, Filter } from "lucide-react"
import { toast } from "sonner"

import {
  createVendorCredit,
  deleteVendorCredit,
  getVendorCredit,
  getVendorCredits,
  updateVendorCredit,
  VendorCreditCreate,
  VendorCreditListItem,
} from "@/services/vendorCreditsApi"
import { getVendors, Vendor } from "@/services/vendorApi"
import organizationService from "@/services/organizationService"

const today = () => new Date().toISOString().slice(0, 10)

const escapeHtml = (unsafe: string) => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export default function VendorCredits() {
  const [credits, setCredits] = useState<VendorCreditListItem[]>([])
  const [creditsTotal, setCreditsTotal] = useState(0)
  const [isLoadingCredits, setIsLoadingCredits] = useState(false)

  const [vendors, setVendors] = useState<Vendor[]>([])

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCreditId, setEditingCreditId] = useState<number | null>(null)

  const [formData, setFormData] = useState({
    credit_note_number: "",
    vendor_id: "",
    bill_id: "",
    credit_date: today(),
    credit_amount: 0,
    reason: "",
    status: "open",
    notes: "",
  })

  const fetchVendors = async () => {
    try {
      const res = await getVendors()
      setVendors(res.vendors || [])
    } catch (e: any) {
      toast.error(e?.message || "Failed to load vendors")
    }
  }

  const fetchCredits = async () => {
    setIsLoadingCredits(true)
    try {
      const res = await getVendorCredits({ limit: 200 })
      setCredits(res.credits)
      setCreditsTotal(res.total)
    } catch (e: any) {
      toast.error(e?.message || "Failed to load vendor credits")
    } finally {
      setIsLoadingCredits(false)
    }
  }

  useEffect(() => {
    fetchVendors()
    fetchCredits()
  }, [])

  const vendorById = useMemo(() => {
    const map = new Map<number, Vendor>()
    for (const v of vendors) map.set(v.id, v)
    return map
  }, [vendors])

  const filteredCredits = useMemo(() => {
    return credits.filter((c) => {
      const q = searchTerm.trim().toLowerCase()
      const matchesSearch =
        !q ||
        c.credit_note_number?.toLowerCase().includes(q) ||
        (c.vendor_name || "")?.toLowerCase().includes(q) ||
        (c.reason || "")?.toLowerCase().includes(q)

      const matchesStatus = statusFilter === "all" || (c.status || "").toLowerCase() === statusFilter.toLowerCase()

      return matchesSearch && matchesStatus
    })
  }, [credits, searchTerm, statusFilter])

  const getStatusColor = (statusLower: string) => {
    switch (statusLower) {
      case "open":
        return "bg-green-100 text-green-800"
      case "applied":
        return "bg-blue-100 text-blue-800"
      case "closed":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const resetForm = () => {
    setFormData({
      credit_note_number: "",
      vendor_id: "",
      bill_id: "",
      credit_date: today(),
      credit_amount: 0,
      reason: "",
      status: "open",
      notes: "",
    })
    setEditingCreditId(null)
    setIsDialogOpen(false)
  }

  const handleSubmit = async () => {
    const vendorId = Number(formData.vendor_id)
    if (!Number.isFinite(vendorId) || vendorId <= 0) {
      toast.error("Please select a vendor")
      return
    }
    if (!formData.credit_date) {
      toast.error("Credit date is required")
      return
    }
    if (!formData.credit_amount || formData.credit_amount <= 0) {
      toast.error("Credit amount must be greater than 0")
      return
    }

    const payload: VendorCreditCreate = {
      vendor_id: vendorId,
      bill_id: formData.bill_id ? Number(formData.bill_id) : undefined,
      credit_date: formData.credit_date,
      reason: formData.reason || undefined,
      credit_amount: Number(formData.credit_amount),
      notes: formData.notes || undefined,
    }

    try {
      if (editingCreditId) {
        await updateVendorCredit(editingCreditId, {
          vendor_id: vendorId,
          bill_id: formData.bill_id ? Number(formData.bill_id) : undefined,
          credit_date: formData.credit_date,
          reason: formData.reason || undefined,
          credit_amount: Number(formData.credit_amount),
          status: formData.status || undefined,
          notes: formData.notes || undefined,
        })
        toast.success("Vendor credit updated")
      } else {
        const res = await createVendorCredit(payload)
        toast.success(`Vendor credit created: ${res.credit_note_number}`)
      }

      await fetchCredits()
      resetForm()
    } catch (e: any) {
      toast.error(e?.message || (editingCreditId ? "Failed to update vendor credit" : "Failed to create vendor credit"))
    }
  }

  const startEdit = async (creditId: number) => {
    try {
      const c = await getVendorCredit(creditId)
      setEditingCreditId(creditId)
      setFormData({
        credit_note_number: c.credit_note_number,
        vendor_id: String(c.vendor_id),
        bill_id: c.bill_id ? String(c.bill_id) : "",
        credit_date: c.credit_date,
        credit_amount: Number(c.credit_amount || 0),
        reason: c.reason || "",
        status: c.status || "open",
        notes: c.notes || "",
      })
      setIsDialogOpen(true)
    } catch (e: any) {
      toast.error(e?.message || "Failed to load vendor credit")
    }
  }

  const handleDelete = async (creditId: number) => {
    try {
      await deleteVendorCredit(creditId)
      toast.success("Vendor credit deleted")
      await fetchCredits()
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete vendor credit")
    }
  }

  const downloadCredit = async (creditId: number) => {
    try {
      const credit = await getVendorCredit(creditId)

      let org: any = null
      try {
        org = await organizationService.getOrganizationProfile()
      } catch {
        org = null
      }

      const accent = "#7c3aed" // violet
      const currency = org?.currency || "INR"
      const fmt = (n: number) => {
        try {
          return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(n || 0)
        } catch {
          return `₹${(n || 0).toFixed(2)}`
        }
      }

      const orgAddress = [org?.address, org?.city, org?.state, org?.postal_code].filter(Boolean).join(", ")
      const creditDate = credit.credit_date ? new Date(credit.credit_date) : null

      const html = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Vendor Credit - ${escapeHtml(credit.credit_note_number)}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; color-adjust: exact; }
              body { font-family: Arial, sans-serif; color: #333; background: #fff; padding: 12mm; }
              .container { max-width: 195mm; margin: 0 auto; }
              .header { display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid ${accent}; padding-bottom: 12px; margin-bottom: 14px; }
              .company h1 { font-size: 24px; color: ${accent}; margin-bottom: 4px; }
              .company p { font-size: 12px; color: #666; margin: 1px 0; }
              .title { text-align:right; }
              .title h2 { font-size: 28px; }
              .number { font-size: 14px; color: ${accent}; font-weight: bold; }
              .panel { background:#f8f9fa; border:1px solid #e9ecef; border-radius: 4px; padding: 10px 12px; margin-bottom: 12px; display:flex; justify-content:space-between; gap: 10px; }
              .panel .group { flex: 1; text-align:center; }
              .label { font-size: 10px; text-transform: uppercase; color: #666; font-weight:bold; margin-bottom: 2px; }
              .value { font-size: 13px; font-weight:bold; }
              .two-col { display:flex; gap: 10px; margin-bottom: 12px; }
              .box { flex:1; border:1px solid #e9ecef; border-radius: 4px; background:#fafafa; padding: 10px; }
              .box .box-title { font-size: 12px; font-weight:bold; color:${accent}; text-transform: uppercase; margin-bottom: 6px; border-bottom:1px solid #e9ecef; padding-bottom: 2px; }
              .box .name { font-size: 16px; font-weight:bold; margin-bottom: 6px; }
              .box p { font-size: 12px; color:#555; margin-bottom: 2px; }
              table { width: 100%; border-collapse: collapse; border: 2px solid ${accent}; border-radius: 4px; overflow: hidden; margin-bottom: 12px; }
              thead { background: ${accent}; }
              th { color: #fff; font-size: 11px; text-transform: uppercase; padding: 8px 6px; text-align: left; }
              td { font-size: 12px; padding: 8px 6px; border-bottom: 1px solid #e9ecef; }
              tbody tr:nth-child(even) { background: #f8f9fa; }
              .footer { border-top:2px solid ${accent}; padding-top:10px; font-size: 11px; color:#666; display:flex; justify-content:space-between; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="company">
                  <h1>${escapeHtml(org?.company_name || "Your Company Name")}</h1>
                  <p>${escapeHtml(orgAddress || "")}</p>
                  <p>Phone: ${escapeHtml(org?.phone || "")} | Email: ${escapeHtml(org?.email || "")}</p>
                </div>
                <div class="title">
                  <h2>VENDOR CREDIT</h2>
                  <div class="number">${escapeHtml(credit.credit_note_number)}</div>
                </div>
              </div>

              <div class="panel">
                <div class="group">
                  <div class="label">Credit Date</div>
                  <div class="value">${creditDate ? creditDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}</div>
                </div>
                <div class="group">
                  <div class="label">Status</div>
                  <div class="value">${escapeHtml((credit.status || "").toUpperCase())}</div>
                </div>
                <div class="group">
                  <div class="label">Vendor</div>
                  <div class="value">${escapeHtml(credit.vendor_name || "")}</div>
                </div>
              </div>

              <div class="two-col">
                <div class="box">
                  <div class="box-title">Vendor</div>
                  <div class="name">${escapeHtml(credit.vendor_name || "")}</div>
                  ${credit.vendor_code ? `<p><strong>Code:</strong> ${escapeHtml(String(credit.vendor_code))}</p>` : ""}
                  ${credit.bill_id ? `<p><strong>Related Bill ID:</strong> ${credit.bill_id}</p>` : ""}
                </div>
                <div class="box">
                  <div class="box-title">Credit Details</div>
                  ${credit.reason ? `<p><strong>Reason:</strong> ${escapeHtml(String(credit.reason))}</p>` : ""}
                  ${credit.notes ? `<p><strong>Notes:</strong> ${escapeHtml(String(credit.notes))}</p>` : ""}
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th style="text-align:right;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Credit Amount</td>
                    <td style="text-align:right;">${fmt(Number(credit.credit_amount || 0))}</td>
                  </tr>
                  <tr>
                    <td>Used Amount</td>
                    <td style="text-align:right;">${fmt(Number(credit.used_amount || 0))}</td>
                  </tr>
                  <tr>
                    <td><strong>Balance Amount</strong></td>
                    <td style="text-align:right;"><strong>${fmt(Number(credit.balance_amount || 0))}</strong></td>
                  </tr>
                </tbody>
              </table>

              <div class="footer">
                <div><strong>Generated:</strong> ${new Date().toLocaleDateString("en-IN")}</div>
                <div>This is a computer generated credit note</div>
              </div>
            </div>
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
      toast.error(e?.message || "Failed to download vendor credit")
    }
  }

  const totalCreditAmount = credits.reduce((sum, c) => sum + (Number(c.credit_amount) || 0), 0)
  const totalBalanceAmount = credits.reduce((sum, c) => sum + (Number(c.balance_amount) || 0), 0)
  const openCount = credits.filter((c) => (c.status || "").toLowerCase() === "open").length

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
          <h1 className="text-3xl font-bold text-gray-900">Vendor Credits</h1>
          <p className="text-gray-600 font-medium mt-1">Manage vendor credit notes and adjustments • {creditsTotal} credits</p>
        </div>

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
            className={`bg-white/40 backdrop-blur-3xl border border-white/50 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105 group relative overflow-hidden ring-1 ring-white/60 cursor-pointer select-none outline-none ${
              statusFilter === "all" ? "ring-2 ring-violet-500" : ""
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-indigo-500/10"></div>
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-700 uppercase tracking-wider">Total Credits</p>
                  <p className="text-3xl font-black text-gray-900 mt-1">{creditsTotal}</p>
                  <p className="text-xs text-gray-600 mt-1 font-medium">Credit notes</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-500">
                  <Receipt className="w-7 h-7 text-white" />
                </div>
              </div>
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
            className={`bg-white/40 backdrop-blur-3xl border border-white/50 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105 group relative overflow-hidden ring-1 ring-white/60 cursor-pointer select-none outline-none ${
              statusFilter === "open" ? "ring-2 ring-violet-500" : ""
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 via-emerald-500/5 to-teal-500/10"></div>
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-700 uppercase tracking-wider">Open Credits</p>
                  <p className="text-3xl font-black text-gray-900 mt-1">{openCount}</p>
                  <p className="text-xs text-gray-600 mt-1 font-medium">Available to use</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-500">
                  <CheckCircle className="w-7 h-7 text-white" />
                </div>
              </div>
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
            className="bg-white/40 backdrop-blur-3xl border border-white/50 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105 group relative overflow-hidden ring-1 ring-white/60 cursor-pointer select-none outline-none"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-cyan-500/10"></div>
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-700 uppercase tracking-wider">Total Value</p>
                  <p className="text-3xl font-black text-gray-900 mt-1">₹{totalCreditAmount.toLocaleString()}</p>
                  <p className="text-xs text-gray-600 mt-1 font-medium">Credit amount</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-500">
                  <DollarSign className="w-7 h-7 text-white" />
                </div>
              </div>
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
            className={`bg-white/40 backdrop-blur-3xl border border-white/50 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105 group relative overflow-hidden ring-1 ring-white/60 cursor-pointer select-none outline-none ${
              statusFilter === "open" ? "ring-2 ring-violet-500" : ""
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-orange-500/5 to-red-500/10"></div>
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-700 uppercase tracking-wider">Available Balance</p>
                  <p className="text-3xl font-black text-gray-900 mt-1">₹{totalBalanceAmount.toLocaleString()}</p>
                  <p className="text-xs text-gray-600 mt-1 font-medium">Unused credits</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-500">
                  <Clock className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white/40 backdrop-blur-3xl border border-white/50 shadow-2xl mb-6 relative overflow-hidden ring-1 ring-white/60">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-purple-500/3 to-indigo-500/5"></div>
          <CardHeader className="relative z-10">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                  <Input
                    placeholder="Search credits..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/80 backdrop-blur-lg border border-white/90 shadow-lg ring-1 ring-white/50 text-gray-900 placeholder:text-gray-500 focus:bg-white/90 h-12 font-semibold"
                  />
                </div>

                <div className="relative w-full sm:w-[200px]">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4 z-10" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="pl-10 w-full bg-white/80 backdrop-blur-lg border border-white/90 shadow-lg ring-1 ring-white/50 text-gray-900 h-12 font-semibold">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="applied">Applied</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg h-12 px-6 font-semibold">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Credit
                  </Button>
                </DialogTrigger>

              <DialogContent className="sm:max-w-[750px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingCreditId ? "Edit Vendor Credit" : "Create Vendor Credit"}</DialogTitle>
                  <DialogDescription>{editingCreditId ? "Update vendor credit note" : "Add a vendor credit note"}</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  {editingCreditId ? (
                    <div>
                      <Label>Credit Note Number</Label>
                      <Input value={formData.credit_note_number} readOnly className="bg-gray-50" />
                    </div>
                  ) : null}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Vendor *</Label>
                      <Select
                        value={formData.vendor_id}
                        onValueChange={(value) => setFormData((p) => ({ ...p, vendor_id: value }))}
                      >
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
                      <Label>Related Bill ID (optional)</Label>
                      <Input
                        value={formData.bill_id}
                        onChange={(e) => setFormData((p) => ({ ...p, bill_id: e.target.value }))}
                        placeholder="Bill ID"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Credit Date *</Label>
                      <Input
                        type="date"
                        value={formData.credit_date}
                        onChange={(e) => setFormData((p) => ({ ...p, credit_date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Amount *</Label>
                      <Input
                        type="number"
                        value={formData.credit_amount}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, credit_amount: Number.parseFloat(e.target.value) || 0 }))
                        }
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select value={formData.status} onValueChange={(value) => setFormData((p) => ({ ...p, status: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="applied">Applied</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Reason</Label>
                    <Input
                      value={formData.reason}
                      onChange={(e) => setFormData((p) => ({ ...p, reason: e.target.value }))}
                      placeholder="Reason"
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
                  <Button onClick={handleSubmit}>{editingCreditId ? "Update Credit" : "Create Credit"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

        <Card className="bg-white/40 backdrop-blur-3xl border border-white/50 shadow-2xl relative overflow-hidden ring-1 ring-white/60">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-purple-500/3 to-indigo-500/5"></div>
          <CardHeader className="relative z-10">
            <CardTitle className="text-gray-900">Vendor Credits ({filteredCredits.length})</CardTitle>
            <CardDescription className="text-gray-600 font-medium">Credit notes received from vendors</CardDescription>
          </CardHeader>
          <CardContent className="relative z-10">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-violet-50/50 to-purple-50/50 border-b border-white/40">
                  <TableHead className="font-bold text-gray-700 uppercase tracking-wider">Credit Note</TableHead>
                  <TableHead className="font-bold text-gray-700 uppercase tracking-wider">Vendor</TableHead>
                  <TableHead className="font-bold text-gray-700 uppercase tracking-wider">Date</TableHead>
                  <TableHead className="font-bold text-gray-700 uppercase tracking-wider">Amount</TableHead>
                  <TableHead className="font-bold text-gray-700 uppercase tracking-wider">Used</TableHead>
                  <TableHead className="font-bold text-gray-700 uppercase tracking-wider">Balance</TableHead>
                  <TableHead className="font-bold text-gray-700 uppercase tracking-wider">Status</TableHead>
                  <TableHead className="font-bold text-gray-700 uppercase tracking-wider">Actions</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {isLoadingCredits ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-gray-500">
                    Loading credits...
                  </TableCell>
                </TableRow>
              ) : null}

              {!isLoadingCredits && filteredCredits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-gray-500">
                    No vendor credits found
                  </TableCell>
                </TableRow>
              ) : null}

              {filteredCredits.map((c) => {
                const v = vendorById.get(c.vendor_id)
                return (
                  <TableRow key={c.id} className="hover:bg-white/30 transition-colors">
                    <TableCell>
                      <div>
                        <div className="font-medium text-blue-700">{c.credit_note_number}</div>
                        {c.reason ? <div className="text-xs text-gray-500">{c.reason}</div> : null}
                        {c.bill_id ? <div className="text-xs text-gray-400">Bill: {c.bill_id}</div> : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{c.vendor_name || v?.vendor_name || ""}</div>
                        <div className="text-xs text-gray-500">{c.vendor_code || v?.vendor_code || c.vendor_id}</div>
                      </div>
                    </TableCell>
                    <TableCell>{c.credit_date}</TableCell>
                    <TableCell className="font-medium text-green-700">₹{Number(c.credit_amount || 0).toLocaleString()}</TableCell>
                    <TableCell className="font-medium text-blue-700">₹{Number(c.used_amount || 0).toLocaleString()}</TableCell>
                    <TableCell className="font-medium text-orange-700">₹{Number(c.balance_amount || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor((c.status || "").toLowerCase())}>{(c.status || "").toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={() => downloadCredit(c.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => startEdit(c.id)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(c.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
        </Card>
      </div>
    </div>
  )
}
