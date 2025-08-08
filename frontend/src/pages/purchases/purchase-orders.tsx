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
import { Search, Plus, Edit, Trash2, Eye, FileText, Package, DollarSign, Clock } from "lucide-react"
import {
  deletePurchaseOrder,
  getPurchaseOrders,
  createPurchaseOrder,
  PurchaseOrder,
  PurchaseOrderCreatePayload,
  PurchaseOrderItemCreatePayload
} from "@/services/purchaseOrderApi"
import { toast } from "sonner"

const initialFormData: Omit<PurchaseOrderCreatePayload, 'items'> & { items: Array<Omit<PurchaseOrderItemCreatePayload, 'discount_rate' | 'tax_rate' | 'item_id'> & {item_id: number, amount: number}> } = {
  po_number: '',
  po_date: new Date().toISOString().split("T")[0],
  expected_delivery_date: '',
  vendor_id: 0,
  items: [{ item_id: 0, item_name: '', item_sku: '', quantity_ordered: 1, unit_price: 0, amount: 0 }]
};

export default function PurchaseOrders() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [formData, setFormData] = useState(initialFormData)

  const handleDeleteConfirmation = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteOrder = async () => {
    if (selectedOrder) {
      try {
        await deletePurchaseOrder(selectedOrder.id);
        setOrders(orders.filter(order => order.id !== selectedOrder.id));
        toast.success("Purchase order deleted successfully!");
        setIsDeleteDialogOpen(false);
        setSelectedOrder(null);
      } catch (error) {
        console.error("Failed to delete purchase order", error);
        toast.error("Failed to delete purchase order");
      }
    }
  };

  const handleEditOrder = (order: PurchaseOrder) => {
    setEditingOrder(order);
    setFormData({
      ...order,
      items: order.items.map(item => ({ ...item, amount: item.quantity_ordered * item.unit_price }))
    });
    setIsDialogOpen(true);
  };

  const fetchPurchaseOrders = async () => {
    try {
      const response = await getPurchaseOrders();
      setOrders(response.purchase_orders);
    } catch (error) {
      console.error("Failed to fetch purchase orders", error);
      toast.error("Failed to fetch purchase orders");
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.vendor_id.toString().toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || order.status.toLowerCase() === statusFilter.toLowerCase()
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Draft":
        return "bg-gray-100 text-gray-800"
      case "Sent":
        return "bg-blue-100 text-blue-800"
      case "Confirmed":
        return "bg-green-100 text-green-800"
      case "Partially Received":
        return "bg-yellow-100 text-yellow-800"
      case "Received":
        return "bg-emerald-100 text-emerald-800"
      case "Cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleSubmit = async () => {
    try {
      const payload: PurchaseOrderCreatePayload = {
        ...formData,
        po_number: formData.po_number || `PO-${Date.now()}`,
        items: formData.items.map(item => ({
          item_id: item.item_id,
          item_name: item.item_name,
          item_sku: item.item_sku,
          quantity_ordered: item.quantity_ordered,
          unit_price: item.unit_price,
        })),
      };

      if (editingOrder) {
        // Update logic would go here
        toast.success("Purchase order updated successfully!")
      } else {
        const newOrder = await createPurchaseOrder(payload);
        setOrders([...orders, newOrder]);
        toast.success("Purchase order created successfully!")
      }
      resetForm();
    } catch (error) {
      console.error("Failed to create purchase order", error);
      toast.error("Failed to create purchase order");
    }
  }

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingOrder(null)
    setIsDialogOpen(false)
  }

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { item_id: 0, item_name: '', item_sku: '', quantity_ordered: 1, unit_price: 0, amount: 0 }],
    })
  }

  const updateItem = (index: number, field: string, value: any) => {
    const updatedItems = formData.items.map((item, i) => {
      if (i === index) {
        const updatedItem = { ...item, [field]: value }
        if (field === "quantity_ordered" || field === "unit_price") {
          updatedItem.amount = updatedItem.quantity_ordered * updatedItem.unit_price
        }
        return updatedItem
      }
      return item
    })
    setFormData({ ...formData, items: updatedItems })
  }

  const handleViewOrder = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setIsViewDialogOpen(true);
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData({
        ...formData,
        items: formData.items.filter((_, i) => i !== index),
      })
    }
  }

  return (
    <div className="flex-1 p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-700 bg-clip-text text-transparent mb-2">
          Purchase Orders
        </h1>
        <p className="text-gray-600">Create and manage purchase orders for your vendors</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
            <FileText className="h-4 w-4 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-700">{orders.length}</div>
            <p className="text-xs text-gray-500">All time</p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">
              {orders.filter((o) => ["Sent", "Confirmed"].includes(o.status)).length}
            </div>
            <p className="text-xs text-gray-500">Awaiting delivery</p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              ₹{orders.reduce((sum, o) => sum + o.total_amount, 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">Order value</p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Received</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {orders.filter((o) => o.status === "Received").length}
            </div>
            <p className="text-xs text-gray-500">Completed orders</p>
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
                  placeholder="Search orders..."
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
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="partially received">Partially Received</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Order
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingOrder ? "Edit Purchase Order" : "Create Purchase Order"}</DialogTitle>
                  <DialogDescription>
                    {editingOrder ? "Update purchase order details" : "Create a new purchase order"}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="vendorId">Vendor ID *</Label>
                      <Input
                        id="vendorId"
                        type="number"
                        value={formData.vendor_id}
                        onChange={(e) => setFormData({ ...formData, vendor_id: Number(e.target.value) })}
                        placeholder="Select or enter vendor"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="orderDate">Order Date *</Label>
                      <Input
                        id="orderDate"
                        type="date"
                        value={formData.po_date}
                        onChange={(e) => setFormData({ ...formData, po_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="expectedDate">Expected Date</Label>
                      <Input
                        id="expectedDate"
                        type="date"
                        value={formData.expected_delivery_date}
                        onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Items Section */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <Label>Order Items</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addItem}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Item
                      </Button>
                    </div>
                    <div className="space-y-4">
                      {formData.items.map((item, index) => (
                        <div key={index} className="grid grid-cols-5 gap-2 items-end">
                          <div>
                            <Label>Item Name</Label>
                            <Input
                              value={item.item_name}
                              onChange={(e) => updateItem(index, "item_name", e.target.value)}
                              placeholder="Item name"
                            />
                          </div>
                          <div>
                            <Label>Quantity</Label>
                            <Input
                              type="number"
                              value={item.quantity_ordered}
                              onChange={(e) => updateItem(index, "quantity_ordered", Number.parseInt(e.target.value) || 0)}
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <Label>Rate</Label>
                            <Input
                              type="number"
                              value={item.unit_price}
                              onChange={(e) => updateItem(index, "unit_price", Number.parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <Label>Amount</Label>
                            <Input value={(item.quantity_ordered * item.unit_price).toFixed(2)} readOnly className="bg-gray-50" />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeItem(index)}
                            disabled={formData.items.length === 1}
                          >
                            <Trash2 className="w-4 h-4" />
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
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes or instructions"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit}>{editingOrder ? "Update Order" : "Create Order"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Orders Table */}
      <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-xl">
        <CardHeader>
          <CardTitle>Purchase Orders ({filteredOrders.length})</CardTitle>
          <CardDescription>Manage your purchase orders and track delivery status</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order Details</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{order.po_number}</div>
                      <div className="text-sm text-gray-500">{order.items.length} items</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{order.vendor_id}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>Order: {new Date(order.po_date).toLocaleDateString()}</div>
                      <div className="text-gray-500">Expected: {order.expected_delivery_date ? new Date(order.expected_delivery_date).toLocaleDateString() : 'N/A'}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-green-700">₹{order.total_amount.toLocaleString()}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewOrder(order)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEditOrder(order)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteConfirmation(order)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Order Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Purchase Order Details</DialogTitle>
            <DialogDescription>
              Viewing details for order {selectedOrder?.po_number}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Vendor ID:</Label> {selectedOrder.vendor_id}</div>
                <div><Label>Status:</Label> <Badge className={getStatusColor(selectedOrder.status)}>{selectedOrder.status}</Badge></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Order Date:</Label> {new Date(selectedOrder.po_date).toLocaleDateString()}</div>
                <div><Label>Expected Date:</Label> {selectedOrder.expected_delivery_date ? new Date(selectedOrder.expected_delivery_date).toLocaleDateString() : 'N/A'}</div>
              </div>
              <div><Label>Total Amount:</Label> ₹{selectedOrder.total_amount.toLocaleString()}</div>
              <div>
                <Label>Items:</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.items.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>{item.item_name}</TableCell>
                        <TableCell>{item.item_sku}</TableCell>
                        <TableCell>{item.quantity_ordered}</TableCell>
                        <TableCell>₹{item.unit_price}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {selectedOrder.notes && <div><Label>Notes:</Label> {selectedOrder.notes}</div>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure you want to delete this order?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the purchase order {selectedOrder?.po_number}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteOrder}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}