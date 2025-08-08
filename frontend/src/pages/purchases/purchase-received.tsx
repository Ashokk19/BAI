"use client"

import { useState } from "react"
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
import { Search, Plus, Edit, Eye, Package, CheckCircle, Clock, AlertCircle } from "lucide-react"

interface PurchaseReceived {
  id: string
  purchaseOrderId: string
  vendorName: string
  receivedDate: string
  status: "Partially Received" | "Fully Received" | "Pending"
  totalItems: number
  receivedItems: number
  totalAmount: number
  receivedAmount: number
  items: Array<{
    name: string
    ordered: number
    received: number
    rate: number
    amount: number
  }>
  notes: string
  receivedBy: string
}

const mockReceived: PurchaseReceived[] = [
  {
    id: "PR001",
    purchaseOrderId: "PO001",
    vendorName: "ABC Suppliers",
    receivedDate: "2024-01-20",
    status: "Fully Received",
    totalItems: 15,
    receivedItems: 15,
    totalAmount: 25000,
    receivedAmount: 25000,
    items: [
      { name: "Office Chairs", ordered: 10, received: 10, rate: 2000, amount: 20000 },
      { name: "Desk Lamps", ordered: 5, received: 5, rate: 1000, amount: 5000 },
    ],
    notes: "All items received in good condition",
    receivedBy: "John Doe",
  },
  {
    id: "PR002",
    purchaseOrderId: "PO002",
    vendorName: "XYZ Trading Co.",
    receivedDate: "2024-01-22",
    status: "Partially Received",
    totalItems: 2,
    receivedItems: 1,
    totalAmount: 15000,
    receivedAmount: 7500,
    items: [{ name: "Laptops", ordered: 2, received: 1, rate: 7500, amount: 7500 }],
    notes: "One laptop pending delivery",
    receivedBy: "Jane Smith",
  },
]

export default function PurchaseReceived() {
  const [received, setReceived] = useState<PurchaseReceived[]>(mockReceived)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<PurchaseReceived | null>(null)

  const filteredReceived = received.filter((item) => {
    const matchesSearch =
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.purchaseOrderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.vendorName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus =
      statusFilter === "all" || item.status.toLowerCase().replace(" ", "").includes(statusFilter.toLowerCase())
    return matchesSearch && matchesStatus
  })

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

  const handleViewDetails = (item: PurchaseReceived) => {
    setSelectedOrder(item)
    setIsDialogOpen(true)
  }

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
            <CardTitle className="text-sm font-medium text-gray-600">Fully Received</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {received.filter((r) => r.status === "Fully Received").length}
            </div>
            <p className="text-xs text-gray-500">Complete orders</p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Partial Received</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">
              {received.filter((r) => r.status === "Partially Received").length}
            </div>
            <p className="text-xs text-gray-500">Pending items</p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Value</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              ₹{received.reduce((sum, r) => sum + r.receivedAmount, 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">Received value</p>
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
                  placeholder="Search received orders..."
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
                  <SelectItem value="fullyreceived">Fully Received</SelectItem>
                  <SelectItem value="partiallyreceived">Partially Received</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg">
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
          <CardDescription>Track received items and delivery status</CardDescription>
        </CardHeader>
        <CardContent>
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
                      <div className="font-medium">{item.id}</div>
                      <div className="text-sm text-gray-500">Received: {item.receivedDate}</div>
                      <div className="text-xs text-gray-400">By: {item.receivedBy}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-blue-700">{item.purchaseOrderId}</div>
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

      {/* View Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Receipt Details - {selectedOrder?.id}</DialogTitle>
            <DialogDescription>Purchase Order: {selectedOrder?.purchaseOrderId}</DialogDescription>
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
                      <TableHead>Ordered</TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.ordered}</TableCell>
                        <TableCell>{item.received}</TableCell>
                        <TableCell>₹{item.rate}</TableCell>
                        <TableCell>₹{item.amount.toLocaleString()}</TableCell>
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
  )
}
