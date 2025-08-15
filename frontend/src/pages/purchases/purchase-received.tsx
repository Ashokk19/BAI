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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Search, Plus, Edit, Eye, Package, CheckCircle, Clock, AlertCircle, Check, ChevronsUpDown } from "lucide-react"
import {
  getPurchaseReceived,
  createPurchaseReceived,
  updatePurchaseReceived,
} from "@/services/purchaseReceivedApi"
import type {
  PurchaseReceived as PurchaseReceivedRow,
  PurchaseReceivedCreate,
  PurchaseReceivedUpdate,
} from "@/services/purchaseReceivedApi"
import { getPurchaseOrders, getPurchaseOrderById } from "@/services/purchaseOrderApi"
import type { PurchaseOrder, PurchaseOrderItem } from "@/services/purchaseOrderApi"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const today = () => new Date().toISOString().split("T")[0]

export default function PurchaseReceived() {
  const [received, setReceived] = useState<PurchaseReceivedRow[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editing, setEditing] = useState<PurchaseReceivedRow | null>(null)
  const [selected, setSelected] = useState<PurchaseReceivedRow | null>(null)
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)
  const [orderItems, setOrderItems] = useState<PurchaseOrderItem[]>([])
  const [poSearchOpen, setPoSearchOpen] = useState(false)
  const [poItemSearchOpen, setPoItemSearchOpen] = useState(false)
  const [poSearchValue, setPoSearchValue] = useState("")

  const [form, setForm] = useState<PurchaseReceivedCreate>({
    receipt_date: today(),
    receipt_number: "",
    purchase_order_id: 0,
    purchase_order_item_id: 0,
    item_id: 0,
    quantity_received: 0,
    quantity_accepted: 0,
    quantity_rejected: 0,
    quality_status: "pending",
    quality_notes: "",
    storage_location: "",
    batch_number: "",
    expiry_date: undefined,
  })

  const loadData = async () => {
    try {
      const data = await getPurchaseReceived({ limit: 200 })
      setReceived(data.purchase_received)
    } catch (e) {
      toast.error("Failed to load receipts")
    }
  }

  useEffect(() => {
    loadData()
    ;(async () => {
      try {
        const list = await getPurchaseOrders()
        setOrders(list.purchase_orders || [])
      } catch (e) {
        // ignore
      }
    })()
  }, [])

  const filteredReceived = useMemo(() => {
    return received.filter((item) => {
      const matchesSearch =
        item.receipt_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(item.purchase_order_id).includes(searchTerm)
      const matchesStatus = statusFilter === "all" || item.quality_status.toLowerCase() === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [received, searchTerm, statusFilter])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "passed":
        return "bg-green-100 text-green-800"
      case "failed":
        return "bg-red-100 text-red-800"
      case "partial":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getProgressPercentage = (accepted: number, receivedQty: number) => {
    return receivedQty > 0 ? (Number(accepted) / Number(receivedQty)) * 100 : 0
  }

  const openCreate = () => {
    setEditing(null)
    setSelectedOrder(null)
    setOrderItems([])
    setPoSearchValue("")
    setForm({
      receipt_date: today(),
      receipt_number: "",
      purchase_order_id: 0,
      purchase_order_item_id: 0,
      item_id: 0,
      quantity_received: 0,
      quantity_accepted: 0,
      quantity_rejected: 0,
      quality_status: "pending",
      quality_notes: "",
      storage_location: "",
      batch_number: "",
      expiry_date: undefined,
    })
    setIsFormOpen(true)
  }

  const openEdit = async (r: PurchaseReceivedRow) => {
    setEditing(r)
    
    // Load the purchase order details for editing
    try {
      const po = await getPurchaseOrderById(r.purchase_order_id)
      setSelectedOrder(po)
      setOrderItems(po.items || [])
      setPoSearchValue(`${po.po_number} (Vendor ${po.vendor_id})`)
    } catch (e) {
      toast.error("Failed to load purchase order details")
    }
    
    setForm({
      receipt_number: r.receipt_number,
      receipt_date: r.receipt_date.split("T")[0],
      purchase_order_id: r.purchase_order_id,
      purchase_order_item_id: r.purchase_order_item_id,
      item_id: r.item_id,
      quantity_received: Number(r.quantity_received),
      quantity_accepted: Number(r.quantity_accepted),
      quantity_rejected: Number(r.quantity_rejected),
      quality_status: r.quality_status,
      quality_notes: r.quality_notes,
      storage_location: r.storage_location,
      batch_number: r.batch_number,
      expiry_date: r.expiry_date ? r.expiry_date.split("T")[0] : undefined,
    })
    setIsFormOpen(true)
  }

  const submitForm = async () => {
    try {
      if (form.quantity_accepted + form.quantity_rejected !== form.quantity_received) {
        return toast.error("Accepted + Rejected must equal Received")
      }
      if (!form.purchase_order_id || !form.purchase_order_item_id || !form.item_id) {
        return toast.error("Please select PO, PO Item and Item")
      }
      if (editing) {
        const resp = await updatePurchaseReceived(editing.id, form as PurchaseReceivedUpdate)
        toast.success("Receipt updated")
      } else {
        const resp = await createPurchaseReceived(form)
        toast.success("Receipt recorded")
      }
      setIsFormOpen(false)
      loadData()
    } catch (e: any) {
      const msg = e?.message || "Failed to save receipt"
      toast.error(msg)
    }
  }

  const handleViewDetails = (item: PurchaseReceivedRow) => {
    setSelected(item)
    setIsViewOpen(true)
  }

  const handleSelectPurchaseOrder = async (order: PurchaseOrder) => {
    setSelectedOrder(order)
    setPoSearchValue(`${order.po_number} (Vendor ${order.vendor_id})`)
    setPoSearchOpen(false)
    
    // Load order items
    try {
      const fullOrder = await getPurchaseOrderById(order.id)
      setOrderItems(fullOrder.items || [])
    } catch (e) {
      toast.error("Failed to load order items")
      setOrderItems([])
    }
    
    // Update form
    setForm({
      ...form,
      purchase_order_id: order.id,
      purchase_order_item_id: 0,
      item_id: 0,
    })
  }

  const handleSelectPurchaseOrderItem = (item: PurchaseOrderItem) => {
    setForm({
      ...form,
      purchase_order_item_id: item.id,
      item_id: item.item_id,
    })
    setPoItemSearchOpen(false)
  }

  const filteredOrders = useMemo(() => {
    if (!poSearchValue) return orders
    return orders.filter(order => 
      order.po_number.toLowerCase().includes(poSearchValue.toLowerCase()) ||
      String(order.vendor_id).includes(poSearchValue)
    )
  }, [orders, poSearchValue])

  return (
    <div className="flex-1 p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-700 bg-clip-text text-transparent mb-2">
          Purchase Received
        </h1>
        <p className="text-gray-600">Track and manage received purchase orders</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Received</CardTitle>
            <Package className="h-4 w-4 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-700">{received.length}</div>
            <p className="text-xs text-gray-500">Purchase receipts</p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending QC</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">
              {received.filter((r) => r.quality_status === "pending").length}
            </div>
            <p className="text-xs text-gray-500">Awaiting quality check</p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Passed QC</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {received.filter((r) => r.quality_status === "passed").length}
            </div>
            <p className="text-xs text-gray-500">Quality passed</p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Failed QC</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {received.filter((r) => r.quality_status === "failed").length}
            </div>
            <p className="text-xs text-gray-500">Requires action</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-xl mb-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search receipts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/50 border-white/20"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] bg-white/50 border-white/20">
                  <SelectValue placeholder="Filter by QC status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="passed">Passed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={openCreate} className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg">
              <Plus className="w-4 h-4 mr-2" />
              Record Receipt
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Received Orders Table */}
      <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-xl">
        <CardHeader>
          <CardTitle>Purchase Receipts ({filteredReceived.length})</CardTitle>
          <CardDescription>Track received items and quality status</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt</TableHead>
                <TableHead>PO</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>QC</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReceived.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{r.receipt_number}</div>
                      <div className="text-sm text-gray-500">{new Date(r.receipt_date).toLocaleDateString()}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-blue-700">{r.purchase_order_id}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">Item ID: {r.item_id}</div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>
                          Accepted: {Number(r.quantity_accepted)}/{Number(r.quantity_received)}
                        </span>
                        <span>{Math.round(getProgressPercentage(Number(r.quantity_accepted), Number(r.quantity_received)))}%</span>
                      </div>
                      <Progress value={getProgressPercentage(Number(r.quantity_accepted), Number(r.quantity_received))} className="h-2" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(r.quality_status)}>{r.quality_status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewDetails(r)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEdit(r)}>
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

      {/* View Details Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Receipt Details - {selected?.receipt_number}</DialogTitle>
            <DialogDescription>Purchase Order: {selected?.purchase_order_id}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Item ID</Label>
                  <div className="font-medium">{selected.item_id}</div>
                </div>
                <div>
                  <Label>Received Date</Label>
                  <div className="font-medium">{new Date(selected.receipt_date).toLocaleDateString()}</div>
                </div>
                <div>
                  <Label>Accepted</Label>
                  <div className="font-medium">{Number(selected.quantity_accepted)}</div>
                </div>
                <div>
                  <Label>Rejected</Label>
                  <div className="font-medium">{Number(selected.quantity_rejected)}</div>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge className={getStatusColor(selected.quality_status)}>{selected.quality_status}</Badge>
                </div>
              </div>
              {selected.quality_notes && (
                <div>
                  <Label>Notes</Label>
                  <div className="p-3 bg-gray-50 rounded-md text-sm">{selected.quality_notes}</div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Receipt" : "Record Receipt"}</DialogTitle>
            <DialogDescription>Enter receipt details</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Receipt Date *</Label>
                <Input type="date" value={form.receipt_date} onChange={(e) => setForm({ ...form, receipt_date: e.target.value })} />
              </div>
              <div>
                <Label>Purchase Order *</Label>
                <Popover open={poSearchOpen} onOpenChange={setPoSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={poSearchOpen}
                      className="w-full justify-between"
                    >
                      {selectedOrder
                        ? `${selectedOrder.po_number} (Vendor ${selectedOrder.vendor_id})`
                        : "Select purchase order..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput
                        placeholder="Search purchase orders..."
                        value={poSearchValue}
                        onValueChange={setPoSearchValue}
                      />
                      <CommandEmpty>No purchase order found.</CommandEmpty>
                      <CommandGroup>
                        {filteredOrders.map((order) => (
                          <CommandItem
                            key={order.id}
                            value={`${order.po_number} ${order.vendor_id}`}
                            onSelect={() => handleSelectPurchaseOrder(order)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedOrder?.id === order.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{order.po_number}</span>
                              <span className="text-sm text-gray-500">
                                Vendor {order.vendor_id} • ₹{Number(order.total_amount).toLocaleString()}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Purchase Order Item *</Label>
                <Popover open={poItemSearchOpen} onOpenChange={setPoItemSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={poItemSearchOpen}
                      className="w-full justify-between"
                      disabled={!selectedOrder}
                    >
                      {form.purchase_order_item_id > 0
                        ? (() => {
                            const item = orderItems.find(i => i.id === form.purchase_order_item_id)
                            return item ? `${item.item_name} (${item.item_sku})` : "Select item..."
                          })()
                        : "Select item..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search items..." />
                      <CommandEmpty>No items found.</CommandEmpty>
                      <CommandGroup>
                        {orderItems.map((item) => (
                          <CommandItem
                            key={item.id}
                            value={`${item.item_name} ${item.item_sku}`}
                            onSelect={() => handleSelectPurchaseOrderItem(item)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                form.purchase_order_item_id === item.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{item.item_name}</span>
                              <span className="text-sm text-gray-500">
                                {item.item_sku} • Qty: {item.quantity_ordered} • ₹{Number(item.unit_price).toLocaleString()}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Item ID *</Label>
                <Input type="number" value={form.item_id} readOnly className="bg-gray-50" />
              </div>
              <div>
                <Label>Received Qty *</Label>
                <Input type="number" value={form.quantity_received as number} onChange={(e) => setForm({ ...form, quantity_received: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Accepted Qty *</Label>
                <Input type="number" value={form.quantity_accepted as number} onChange={(e) => setForm({ ...form, quantity_accepted: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Rejected Qty *</Label>
                <Input type="number" value={form.quantity_rejected as number} onChange={(e) => setForm({ ...form, quantity_rejected: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>QC Status</Label>
                <select className="w-full border rounded px-3 py-2" value={form.quality_status} onChange={(e) => setForm({ ...form, quality_status: e.target.value })}>
                  <option value="pending">Pending</option>
                  <option value="passed">Passed</option>
                  <option value="failed">Failed</option>
                  <option value="partial">Partial</option>
                </select>
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={form.quality_notes || ""} onChange={(e) => setForm({ ...form, quality_notes: e.target.value })} placeholder="Quality notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            <Button onClick={submitForm}>{editing ? "Update" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

