"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Plus, Search, Truck, Package, Eye, Download } from "lucide-react"
import { shipmentApi, DeliveryNote as ApiDeliveryNote, DeliveryNoteCreate } from "../../services/shipmentApi"
import { customerApi, Customer } from "../../services/customerApi"
import { useNotifications, NotificationContainer } from "../../components/ui/notification"

// Native date formatting utility
const formatDate = (date: Date, format: string) => {
  if (format === "yyyy-MM-dd") {
    return date.toISOString().split('T')[0]
  }
  
  if (format === "PPP") {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
  
  if (format === "MMM dd, yyyy") {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    })
  }
  
  return date.toLocaleDateString()
}

export default function DeliveryNote() {
  const notifications = useNotifications()
  const [deliveryNotes, setDeliveryNotes] = useState<ApiDeliveryNote[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [formData, setFormData] = useState({
    customer_id: 0,
    shipment_id: 0,
    delivery_address: "",
    delivery_notes: "",
    special_instructions: "",
  })

  // Load delivery notes on component mount
  useEffect(() => {
    loadDeliveryNotes()
    loadCustomers()
  }, [])

  // Reload delivery notes when search changes
  useEffect(() => {
    loadDeliveryNotes()
  }, [searchTerm])

  const loadDeliveryNotes = async () => {
    try {
      setLoading(true)
      const params: any = {
        limit: 100,
        skip: 0
      }
      
      if (searchTerm) {
        params.search = searchTerm
      }

      const response = await shipmentApi.getDeliveryNotes(params)
      setDeliveryNotes(response.delivery_notes)
    } catch (error) {
      console.error('Error loading delivery notes:', error)
      notifications.error('Failed to load delivery notes', 'Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const loadCustomers = async () => {
    try {
      const response = await customerApi.getCustomers({ limit: 1000 })
      setCustomers(response.customers)
    } catch (error) {
      console.error('Error loading customers:', error)
    }
  }

  const getCustomerName = (customerId: number): string => {
    const customer = customers.find(c => c.id === customerId)
    if (customer) {
      return customer.company_name || `${customer.first_name} ${customer.last_name}`
    }
    return 'Unknown Customer'
  }

  const handleCreateDeliveryNote = async () => {
    try {
      const deliveryNoteData: DeliveryNoteCreate = {
        customer_id: formData.customer_id,
        shipment_id: formData.shipment_id,
        delivery_date: selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        delivery_address: formData.delivery_address,
        delivery_notes: formData.delivery_notes,
        special_instructions: formData.special_instructions,
        delivery_status: "Pending"
      }

      await shipmentApi.createDeliveryNote(deliveryNoteData)
      
      // Reset form
      setFormData({
        customer_id: 0,
        shipment_id: 0,
        delivery_address: "",
        delivery_notes: "",
        special_instructions: "",
      })
      setSelectedDate(undefined)
      setIsDialogOpen(false)
      
      // Reload data
      loadDeliveryNotes()
      notifications.success('Delivery Note Created!', 'The delivery note has been created successfully.')
    } catch (error) {
      console.error('Error creating delivery note:', error)
      notifications.error('Creation Failed', 'Unable to create delivery note. Please try again.')
    }
  }

  const updateStatus = async (id: number, status: string) => {
    try {
      // TODO: Implement status update API call when available
      notifications.success('Status Updated!', `Delivery note status changed to ${status}.`)
      loadDeliveryNotes() // Reload to get updated data
    } catch (error) {
      console.error('Error updating status:', error)
      notifications.error('Update Failed', 'Unable to update delivery note status. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-700 bg-clip-text text-transparent">
            Delivery Notes
          </h1>
          <p className="text-gray-600 mt-1">Manage delivery notes and track shipments</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Delivery Note
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-xl border-white/20">
              <DialogHeader>
                <DialogTitle>Create New Delivery Note</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customer">Customer</Label>
                    <Select
                      value={formData.customer_id.toString()}
                      onValueChange={(value) => setFormData({ ...formData, customer_id: parseInt(value) })}
                    >
                      <SelectTrigger className="bg-white/50 border-white/20">
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map(customer => (
                          <SelectItem key={customer.id} value={customer.id.toString()}>
                            {customer.company_name || `${customer.first_name} ${customer.last_name}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="shipment">Shipment ID</Label>
                    <Input
                      id="shipment"
                      type="number"
                      value={formData.shipment_id || ''}
                      onChange={(e) => setFormData({ ...formData, shipment_id: parseInt(e.target.value) || 0 })}
                      placeholder="Enter shipment ID"
                      className="bg-white/50 border-white/20"
                    />
                  </div>
                </div>
                <div>
                  <Label>Delivery Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start bg-white/50 border-white/20">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? formatDate(selectedDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label htmlFor="address">Delivery Address</Label>
                  <Textarea
                    id="address"
                    value={formData.delivery_address}
                    onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                    placeholder="Enter complete delivery address"
                    className="bg-white/50 border-white/20"
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Delivery Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.delivery_notes}
                    onChange={(e) => setFormData({ ...formData, delivery_notes: e.target.value })}
                    placeholder="Any special delivery instructions"
                    className="bg-white/50 border-white/20"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateDeliveryNote} className="bg-gradient-to-r from-violet-500 to-purple-600">
                    Create Delivery Note
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <Card className="bg-white/40 backdrop-blur-3xl border-white/20 shadow-xl">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search delivery notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/50 border-white/20"
            />
          </div>
        </CardContent>
      </Card>

      {/* Delivery Notes Table */}
      <Card className="bg-white/40 backdrop-blur-3xl border-white/20 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Delivery Notes ({deliveryNotes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Delivery Note</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600"></div>
                      <span className="ml-2">Loading delivery notes...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : deliveryNotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="text-gray-500">No delivery notes found</div>
                  </TableCell>
                </TableRow>
              ) : (
                deliveryNotes.map((note) => (
                  <TableRow key={note.id}>
                    <TableCell>
                      <div className="font-medium">{note.delivery_note_number}</div>
                    </TableCell>
                    <TableCell>{getCustomerName(note.customer_id)}</TableCell>
                    <TableCell>{formatDate(new Date(note.delivery_date), "MMM dd, yyyy")}</TableCell>
                    <TableCell>
                      <Select value={note.delivery_status} onValueChange={(value: any) => updateStatus(note.id, value)}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="In Transit">In Transit</SelectItem>
                          <SelectItem value="Delivered">Delivered</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{note.delivery_address}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Download className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Notification Container */}
      <NotificationContainer position="top-right" />
    </div>
  )
} 