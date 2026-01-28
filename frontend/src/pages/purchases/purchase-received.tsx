"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, Edit, Eye, Package, CheckCircle, Clock, AlertCircle, Filter } from "lucide-react"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"

import { purchaseReceiptApi, PurchaseReceiptDetail, PurchaseReceiptListItem, PurchaseReceiptCreatePayload } from "@/services/purchaseReceiptApi"
import { getPurchaseOrders, getPurchaseOrder, PurchaseOrder, PurchaseOrderDetail } from "@/services/purchaseOrderApi"
import { billExistsForPurchaseOrder } from "@/services/billsApi"

type ReceiptStatusUi = "Fully Received" | "Partially Received" | "Pending"

type PurchaseReceivedRow = {
  id: number
  receiptNumber: string
  purchaseOrderId: number | null
  purchaseOrderNumber: string | null
  vendorName: string
  receivedDate: string
  status: ReceiptStatusUi
  totalItems: number
  receivedItems: number
  totalAmount: number
  receivedAmount: number
  notes: string
  receivedBy: string
}

type ReceiptFormLine = {
  po_item_id: number
  item_id: number
  item_name: string
  ordered_qty: number
  already_received: number
  remaining_qty: number
  unit_price: number
  quantity_received: number
  quantity_accepted: number
  quantity_rejected: number
}

const today = () => new Date().toISOString().slice(0, 10)

export default function PurchaseReceived() {
  const navigate = useNavigate()

  const [received, setReceived] = useState<PurchaseReceivedRow[]>([])
  const [receiptDetails, setReceiptDetails] = useState<PurchaseReceiptDetail | null>(null)

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null)
  const [selectedPoId, setSelectedPoId] = useState<number | null>(null)
  const [selectedPoDetail, setSelectedPoDetail] = useState<PurchaseOrderDetail | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [createForm, setCreateForm] = useState<{ receipt_date: string; received_by: string; notes: string; lines: ReceiptFormLine[] }>({
    receipt_date: today(),
    received_by: "",
    notes: "",
    lines: [],
  })

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<PurchaseReceivedRow | null>(null)

  const filteredReceived = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return received.filter((item) => {
      const matchesSearch =
        !term ||
        String(item.id).includes(term) ||
        (item.receiptNumber || "").toLowerCase().includes(term) ||
        String(item.purchaseOrderId ?? "").includes(term) ||
        (item.purchaseOrderNumber || "").toLowerCase().includes(term) ||
        (item.vendorName || "").toLowerCase().includes(term)
      const matchesStatus =
        statusFilter === "all" || item.status.toLowerCase().replace(/\s/g, "").includes(statusFilter.toLowerCase())
      return matchesSearch && matchesStatus
    })
  }, [received, searchTerm, statusFilter])

  const toBackendStatusFilter = (value: string): string | undefined => {
    switch ((value || "").toLowerCase()) {
      case "fullyreceived":
        return "received"
      case "partiallyreceived":
        return "partially_received"
      default:
        return undefined
    }
  }

  const mapStatus = (poStatus?: string | null): ReceiptStatusUi => {
    const s = (poStatus || "").toLowerCase()
    if (s === "received") return "Fully Received"
    if (s === "partially_received") return "Partially Received"
    return "Pending"
  }

  const loadReceipts = async () => {
    try {
      const res = await purchaseReceiptApi.getReceipts({
        limit: 200,
        search: searchTerm || undefined,
        status: toBackendStatusFilter(statusFilter),
      })

      const rows: PurchaseReceivedRow[] = (res.receipts || []).map((r: PurchaseReceiptListItem) => {
        const totalItems = Number(r.total_items ?? 0)
        const receivedItems = Number(r.received_items ?? 0)
        return {
          id: Number(r.id),
          receiptNumber: r.receipt_number,
          purchaseOrderId: r.po_id ?? null,
          purchaseOrderNumber: r.po_number ?? null,
          vendorName: (r.vendor_name || "").toString(),
          receivedDate: (r.receipt_date || "").toString().slice(0, 10),
          status: mapStatus(r.po_status),
          totalItems,
          receivedItems,
          totalAmount: Number(r.total_amount ?? 0),
          receivedAmount: Number(r.received_amount ?? 0),
          notes: (r.notes || "").toString(),
          receivedBy: (r.received_by || "").toString(),
        }
      })

      setReceived(rows)
    } catch (error) {
      console.error("Failed to fetch purchase receipts", error)
      toast.error("Failed to fetch purchase receipts")
    }
  }

  const loadPurchaseOrders = async () => {
    try {
      const res = await getPurchaseOrders()
      setPurchaseOrders(res.purchase_orders || [])
    } catch (error) {
      console.error("Failed to fetch purchase orders", error)
    }
  }

  useEffect(() => {
    loadPurchaseOrders()
    // initial list load
    purchaseReceiptApi
      .getReceipts({ limit: 200 })
      .then((res) => {
        const rows: PurchaseReceivedRow[] = (res.receipts || []).map((r) => {
          const totalItems = Number(r.total_items ?? 0)
          const receivedItems = Number(r.received_items ?? 0)
          return {
            id: Number(r.id),
            receiptNumber: r.receipt_number,
            purchaseOrderId: r.po_id ?? null,
            purchaseOrderNumber: r.po_number ?? null,
            vendorName: (r.vendor_name || "").toString(),
            receivedDate: (r.receipt_date || "").toString().slice(0, 10),
            status: mapStatus(r.po_status),
            totalItems,
            receivedItems,
            totalAmount: Number(r.total_amount ?? 0),
            receivedAmount: Number(r.received_amount ?? 0),
            notes: (r.notes || "").toString(),
            receivedBy: (r.received_by || "").toString(),
          }
        })
        setReceived(rows)
      })
      .catch((error) => {
        console.error("Failed to fetch purchase receipts", error)
      })
  }, [])

  useEffect(() => {
    const handle = setTimeout(() => {
      loadReceipts()
    }, 250)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, statusFilter])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Fully Received":
        return "bg-green-100 text-green-800"
      case "Partially Received":
        return "bg-yellow-100 text-yellow-800"
      case "Pending":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getProgressPercentage = (received: number, total: number) => {
    return total > 0 ? (received / total) * 100 : 0
  }

  const handleViewDetails = async (item: PurchaseReceivedRow) => {
    try {
      const detail = await purchaseReceiptApi.getReceipt(item.id)
      setReceiptDetails(detail)
      setSelectedOrder(item)
      setIsDialogOpen(true)
    } catch (error) {
      console.error("Failed to load receipt details", error)
      toast.error("Failed to load receipt details")
    }
  }

  const openCreateDialog = async () => {
    setIsCreateDialogOpen(true)
    setSelectedVendorId(null)
    setSelectedPoId(null)
    setSelectedPoDetail(null)
    setCreateForm({ receipt_date: today(), received_by: "", notes: "", lines: [] })
    // ensure POs are fresh
    loadPurchaseOrders()
  }

  const vendorOptions = useMemo(() => {
    const map = new Map<number, string>()
    for (const po of purchaseOrders) {
      if (po.vendor_id && !map.has(po.vendor_id)) {
        map.set(po.vendor_id, (po.vendor_name || `Vendor #${po.vendor_id}`).toString())
      }
    }
    return Array.from(map.entries())
      .map(([vendor_id, vendor_name]) => ({ vendor_id, vendor_name }))
      .sort((a, b) => a.vendor_name.localeCompare(b.vendor_name))
  }, [purchaseOrders])

  const filteredPoOptions = useMemo(() => {
    return purchaseOrders
      .filter((po) => {
        if (!selectedVendorId) return false
        // Do not show fully received POs
        if ((po.status || "").toLowerCase() === "received") return false
        return po.vendor_id === selectedVendorId
      })
      .sort((a, b) => {
        // newest first
        const aId = Number(a.id) || 0
        const bId = Number(b.id) || 0
        return bId - aId
      })
  }, [purchaseOrders, selectedVendorId])

  const onSelectPo = async (value: string) => {
    const poId = Number(value)
    if (!Number.isFinite(poId) || poId <= 0) return
    setSelectedPoId(poId)
    try {
      const detail = await getPurchaseOrder(poId)
      setSelectedPoDetail(detail)
      const lines: ReceiptFormLine[] = (detail.items || []).map((it: any) => {
        const ordered = Number(it.quantity ?? 0)
        const already = Number(it.received_quantity ?? 0)
        const remaining = Math.max(0, ordered - already)
        const unitPrice = Number(it.unit_price ?? 0)
        return {
          po_item_id: Number(it.id),
          item_id: Number(it.item_id),
          item_name: String(it.item_name ?? ""),
          ordered_qty: ordered,
          already_received: already,
          remaining_qty: remaining,
          unit_price: unitPrice,
          quantity_received: remaining,
          quantity_accepted: remaining,
          quantity_rejected: 0,
        }
      })
      setCreateForm((prev) => ({ ...prev, lines }))
    } catch (error) {
      console.error("Failed to load PO details", error)
      toast.error("Failed to load purchase order")
    }
  }

  const updateLine = (index: number, patch: Partial<ReceiptFormLine>) => {
    setCreateForm((prev) => {
      const next = [...prev.lines]
      const existing = next[index]
      const merged = { ...existing, ...patch }
      // auto keep rejected = received - accepted (min 0)
      const receivedQty = Number(merged.quantity_received ?? 0)
      const acceptedQty = Number(merged.quantity_accepted ?? 0)
      const rejectedQty = Math.max(0, receivedQty - acceptedQty)
      merged.quantity_rejected = rejectedQty
      next[index] = merged
      return { ...prev, lines: next }
    })
  }

  const handleCreateReceipt = async () => {
    if (!selectedPoDetail || !selectedPoId) {
      toast.error("Please select a purchase order")
      return
    }

    const vendorId = Number((selectedPoDetail as any).vendor_id)
    if (!vendorId) {
      toast.error("Selected PO has no vendor")
      return
    }

    const items = createForm.lines
      .filter((l) => Number(l.quantity_received) > 0)
      .map((l) => {
        const receivedQty = Math.min(Number(l.quantity_received) || 0, l.remaining_qty)
        const acceptedQty = Math.min(Number(l.quantity_accepted) || 0, receivedQty)
        const rejectedQty = Math.max(0, receivedQty - acceptedQty)
        return {
          po_item_id: l.po_item_id,
          item_id: l.item_id,
          item_name: l.item_name,
          quantity_received: receivedQty,
          quantity_accepted: acceptedQty,
          quantity_rejected: rejectedQty,
          unit_price: Number(l.unit_price) || 0,
          notes: "",
        }
      })

    if (!items.length) {
      toast.error("Please enter received quantities")
      return
    }

    const payload: PurchaseReceiptCreatePayload = {
      po_id: selectedPoId,
      vendor_id: vendorId,
      receipt_date: createForm.receipt_date,
      notes: createForm.notes,
      received_by: createForm.received_by,
      items,
    }

    try {
      await purchaseReceiptApi.createReceipt(payload)
      toast.success("Purchase receipt recorded")
      setIsCreateDialogOpen(false)
      await loadReceipts()
      await loadPurchaseOrders()

      try {
        const exists = await billExistsForPurchaseOrder(selectedPoId)
        if (!exists) {
          const ok = window.confirm("Receipt recorded. Create a bill for this purchase order now?")
          if (ok) {
            navigate(`/purchases/bills?po_id=${selectedPoId}`)
          }
        }
      } catch {
        // Non-blocking; receipt creation already succeeded.
      }
    } catch (error: any) {
      console.error("Failed to create receipt", error)
      const msg = error?.message || "Failed to record receipt"
      toast.error(msg)
    }
  }

  const totalValue = received.reduce((sum, r) => sum + (Number(r.receivedAmount) || 0), 0)

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
          <h1 className="text-3xl font-bold text-gray-900">Purchase Received</h1>
          <p className="text-gray-600 font-medium mt-1">Track and manage received purchase orders • {received.length} receipts total</p>
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
              <CardTitle className="text-sm font-semibold text-gray-700">Total Received</CardTitle>
              <div className="p-2 rounded-lg bg-violet-500/20">
                <Package className="h-4 w-4 text-violet-600" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-bold text-gray-900 mb-1">{received.length}</div>
              <p className="text-xs text-gray-600 mt-2 font-medium">Purchase receipts</p>
            </CardContent>
          </Card>

          <Card
            role="button"
            tabIndex={0}
            onClick={() => setStatusFilter("fullyreceived")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                setStatusFilter("fullyreceived")
              }
            }}
            className={`bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden cursor-pointer select-none outline-none ${
              statusFilter === "fullyreceived" ? "ring-2 ring-violet-500 shadow-2xl" : ""
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-600/20"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-semibold text-gray-700">Fully Received</CardTitle>
              <div className="p-2 rounded-lg bg-green-500/20">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-bold text-gray-900 mb-1">{received.filter((r) => r.status === "Fully Received").length}</div>
              <p className="text-xs text-gray-600 mt-2 font-medium">Complete orders</p>
            </CardContent>
          </Card>

          <Card
            role="button"
            tabIndex={0}
            onClick={() => setStatusFilter("partiallyreceived")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                setStatusFilter("partiallyreceived")
              }
            }}
            className={`bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden cursor-pointer select-none outline-none ${
              statusFilter === "partiallyreceived" ? "ring-2 ring-violet-500 shadow-2xl" : ""
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-yellow-600/20"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-semibold text-gray-700">Partial Received</CardTitle>
              <div className="p-2 rounded-lg bg-yellow-500/20">
                <Clock className="h-4 w-4 text-yellow-600" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-bold text-gray-900 mb-1">{received.filter((r) => r.status === "Partially Received").length}</div>
              <p className="text-xs text-gray-600 mt-2 font-medium">Pending items</p>
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
              <CardTitle className="text-sm font-semibold text-gray-700">Total Value</CardTitle>
              <div className="p-2 rounded-lg bg-blue-500/20">
                <AlertCircle className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-bold text-gray-900 mb-1">₹{totalValue.toLocaleString()}</div>
              <p className="text-xs text-gray-600 mt-2 font-medium">Received value</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-white/20"></div>
          <CardContent className="p-6 relative z-10">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 w-5 h-5" />
                  <Input
                    placeholder="Search received orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 placeholder:text-gray-600 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 h-12 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold"
                  />
                </div>

                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 w-5 h-5" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[220px] pl-10 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 h-12 shadow-lg ring-1 ring-white/50 font-semibold">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="fullyreceived">Fully Received</SelectItem>
                      <SelectItem value="partiallyreceived">Partially Received</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg h-12"
                onClick={openCreateDialog}
              >
                <Plus className="w-4 h-4 mr-2" />
                Record Receipt
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Received Orders Table */}
        <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-white/20"></div>
          <CardHeader className="relative z-10">
            <CardTitle>Purchase Receipts ({filteredReceived.length})</CardTitle>
            <CardDescription>Track received items and delivery status</CardDescription>
          </CardHeader>
          <CardContent className="relative z-10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt Details</TableHead>
                <TableHead>Purchase Order</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReceived.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{item.receiptNumber}</div>
                      <div className="text-sm text-gray-500">Received: {item.receivedDate}</div>
                      <div className="text-xs text-gray-400">By: {item.receivedBy}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-blue-700">
                      {item.purchaseOrderNumber ? item.purchaseOrderNumber : item.purchaseOrderId ? `PO #${item.purchaseOrderId}` : "-"}
                    </div>
                    {item.purchaseOrderId ? <div className="text-xs text-gray-500">ID: {item.purchaseOrderId}</div> : null}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{item.vendorName}</div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>
                          Items: {item.receivedItems}/{item.totalItems}
                        </span>
                        <span>{Math.round(getProgressPercentage(item.receivedItems, item.totalItems))}%</span>
                      </div>
                      <Progress value={getProgressPercentage(item.receivedItems, item.totalItems)} className="h-2" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-green-700">₹{item.receivedAmount.toLocaleString()}</div>
                      <div className="text-sm text-gray-500">of ₹{item.totalAmount.toLocaleString()}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewDetails(item)}>
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

      {/* Record Receipt Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[820px]">
          <DialogHeader>
            <DialogTitle>Record Purchase Receipt</DialogTitle>
            <DialogDescription>Select a Purchase Order and record received quantities</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Select
                value={selectedVendorId ? String(selectedVendorId) : ""}
                onValueChange={(value) => {
                  const id = Number(value)
                  setSelectedVendorId(Number.isFinite(id) && id > 0 ? id : null)
                  setSelectedPoId(null)
                  setSelectedPoDetail(null)
                  setCreateForm((p) => ({ ...p, lines: [] }))
                }}
              >
                <SelectTrigger className="bg-white/50 border-white/20">
                  <SelectValue placeholder="Select Vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendorOptions.map((v) => (
                    <SelectItem key={v.vendor_id} value={String(v.vendor_id)}>
                      {v.vendor_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Receipt Date</Label>
              <Input
                type="date"
                value={createForm.receipt_date}
                onChange={(e) => setCreateForm((p) => ({ ...p, receipt_date: e.target.value }))}
                className="bg-white/50 border-white/20"
              />
            </div>

            <div className="space-y-2">
              <Label>Received By</Label>
              <Input
                placeholder="Receiver name"
                value={createForm.received_by}
                onChange={(e) => setCreateForm((p) => ({ ...p, received_by: e.target.value }))}
                className="bg-white/50 border-white/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-3">
              <Label>Purchase Order (by Vendor)</Label>
              <Select
                value={selectedPoId ? String(selectedPoId) : ""}
                onValueChange={onSelectPo}
                disabled={!selectedVendorId}
              >
                <SelectTrigger className="bg-white/50 border-white/20">
                  <SelectValue placeholder={selectedVendorId ? "Select Purchase Order" : "Select Vendor first"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredPoOptions.map((po) => (
                    <SelectItem key={po.id} value={String(po.id)}>
                      {`PO ID: ${po.id} (${po.po_number})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedVendorId && filteredPoOptions.length === 0 ? (
                <div className="text-xs text-gray-500">No pending/partial POs available for this vendor.</div>
              ) : null}
            </div>
          </div>

          {selectedPoDetail ? (
            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                {selectedPoDetail.po_number} — {(selectedPoDetail as any).vendor_name || ""}
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Ordered</TableHead>
                    <TableHead>Already Received</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Received Now</TableHead>
                    <TableHead>Accepted</TableHead>
                    <TableHead>Rejected</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {createForm.lines.map((line, idx) => (
                    <TableRow key={line.po_item_id}>
                      <TableCell>
                        <div className="font-medium">{line.item_name}</div>
                        <div className="text-xs text-gray-500">Item ID: {line.item_id}</div>
                      </TableCell>
                      <TableCell>{line.ordered_qty}</TableCell>
                      <TableCell>{line.already_received}</TableCell>
                      <TableCell>{line.remaining_qty}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={line.remaining_qty}
                          step={0.001}
                          value={line.quantity_received}
                          onChange={(e) => {
                            const next = Math.min(Number(e.target.value || 0), line.remaining_qty)
                            updateLine(idx, { quantity_received: next, quantity_accepted: Math.min(line.quantity_accepted, next) })
                          }}
                          className="w-28 bg-white/50 border-white/20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={line.quantity_received}
                          step={0.001}
                          value={line.quantity_accepted}
                          onChange={(e) => {
                            const next = Math.min(Number(e.target.value || 0), Number(line.quantity_received || 0))
                            updateLine(idx, { quantity_accepted: next })
                          }}
                          className="w-28 bg-white/50 border-white/20"
                        />
                      </TableCell>
                      <TableCell>{line.quantity_rejected}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  placeholder="Notes (optional)"
                  value={createForm.notes}
                  onChange={(e) => setCreateForm((p) => ({ ...p, notes: e.target.value }))}
                  className="bg-white/50 border-white/20"
                />
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">Select a Purchase Order to load items.</div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateReceipt} className="bg-violet-600 hover:bg-violet-700 text-white">
              Save Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Receipt Details - {selectedOrder?.receiptNumber}</DialogTitle>
            <DialogDescription>
              Purchase Order: {selectedOrder?.purchaseOrderNumber ? selectedOrder.purchaseOrderNumber : selectedOrder?.purchaseOrderId ? `PO #${selectedOrder.purchaseOrderId}` : "-"}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Vendor</Label>
                  <div className="font-medium">{selectedOrder.vendorName}</div>
                </div>
                <div>
                  <Label>Received Date</Label>
                  <div className="font-medium">{selectedOrder.receivedDate}</div>
                </div>
                <div>
                  <Label>Received By</Label>
                  <div className="font-medium">{selectedOrder.receivedBy}</div>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge className={getStatusColor(selectedOrder.status)}>{selectedOrder.status}</Badge>
                </div>
              </div>

              <div>
                <Label>Items Received</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead>Accepted</TableHead>
                      <TableHead>Rejected</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(receiptDetails?.items || []).map((it) => (
                      <TableRow key={it.id}>
                        <TableCell>{it.item_name}</TableCell>
                        <TableCell>{Number(it.quantity_received)}</TableCell>
                        <TableCell>{Number(it.quantity_accepted)}</TableCell>
                        <TableCell>{Number(it.quantity_rejected)}</TableCell>
                        <TableCell>₹{Number(it.unit_price ?? 0).toLocaleString()}</TableCell>
                        <TableCell>{it.notes || ""}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {selectedOrder.notes && (
                <div>
                  <Label>Notes</Label>
                  <div className="p-3 bg-gray-50 rounded-md text-sm">{selectedOrder.notes}</div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}
