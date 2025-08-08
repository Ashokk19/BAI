"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Plus, Trash2, Save, Send, Eye } from "lucide-react"
import { toast } from "sonner"

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

interface InvoiceItem {
  id: string
  itemName: string
  description: string
  quantity: number
  rate: number
  amount: number
}

export default function InvoiceCreation() {
  const [invoiceDate, setInvoiceDate] = useState<Date>(new Date())
  const [dueDate, setDueDate] = useState<Date>()
  const [customer, setCustomer] = useState("")
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: "1", itemName: "", description: "", quantity: 1, rate: 0, amount: 0 },
  ])
  const [notes, setNotes] = useState("")
  const [terms, setTerms] = useState("")

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      itemName: "",
      description: "",
      quantity: 1,
      rate: 0,
      amount: 0,
    }
    setItems([...items, newItem])
  }

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id))
  }

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value }
          if (field === "quantity" || field === "rate") {
            updatedItem.amount = updatedItem.quantity * updatedItem.rate
          }
          return updatedItem
        }
        return item
      }),
    )
  }

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0)
  const taxRate = 0.18 // 18% GST
  const taxAmount = subtotal * taxRate
  const total = subtotal + taxAmount

  const handleSave = () => {
    toast.success("Invoice saved as draft!")
  }

  const handleSend = () => {
    toast.success("Invoice sent to customer!")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-700 bg-clip-text text-transparent">
            Create Tax Invoice
          </h1>
          <p className="text-gray-600 mt-1">Generate professional invoices for your customers</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleSave} className="bg-white/50 backdrop-blur-sm border-white/20">
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
          <Button variant="outline" className="bg-white/50 backdrop-blur-sm border-white/20">
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button
            onClick={handleSend}
            className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
          >
            <Send className="w-4 h-4 mr-2" />
            Send Invoice
          </Button>
        </div>
      </div>

        {/* Invoice Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Invoice Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-white/40 backdrop-blur-3xl border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle>Invoice Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customer">Customer</Label>
                    <Select value={customer} onValueChange={setCustomer}>
                      <SelectTrigger className="bg-white/50 border-white/20">
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CUST001">Rajesh Kumar</SelectItem>
                        <SelectItem value="CUST002">Priya Sharma</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Invoice Number</Label>
                    <Input value="INV-2024-001" disabled className="bg-gray-100/50 border-white/20" />
                  </div>
                  <div>
                    <Label>Invoice Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start bg-white/50 border-white/20">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {invoiceDate ? formatDate(invoiceDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={invoiceDate} onSelect={setInvoiceDate} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>Due Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start bg-white/50 border-white/20">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dueDate ? formatDate(dueDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items Table */}
            <Card className="bg-white/40 backdrop-blur-3xl border-white/20 shadow-xl">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Invoice Items</CardTitle>
                  <Button onClick={addItem} size="sm" className="bg-gradient-to-r from-violet-500 to-purple-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Input
                            value={item.itemName}
                            onChange={(e) => updateItem(item.id, "itemName", e.target.value)}
                            placeholder="Item name"
                            className="bg-white/50 border-white/20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(item.id, "description", e.target.value)}
                            placeholder="Description"
                            className="bg-white/50 border-white/20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, "quantity", Number.parseInt(e.target.value) || 0)}
                            className="bg-white/50 border-white/20 w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.rate}
                            onChange={(e) => updateItem(item.id, "rate", Number.parseFloat(e.target.value) || 0)}
                            className="bg-white/50 border-white/20 w-24"
                          />
                        </TableCell>
                        <TableCell>₹{item.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeItem(item.id)}
                            disabled={items.length === 1}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Notes and Terms */}
            <Card className="bg-white/40 backdrop-blur-3xl border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes for the customer"
                    className="bg-white/50 border-white/20"
                  />
                </div>
                <div>
                  <Label htmlFor="terms">Terms & Conditions</Label>
                  <Textarea
                    id="terms"
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    placeholder="Payment terms and conditions"
                    className="bg-white/50 border-white/20"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Invoice Summary */}
          <div className="space-y-6">
            <Card className="bg-white/40 backdrop-blur-3xl border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle>Invoice Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST (18%):</span>
                  <span>₹{taxAmount.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>₹{total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
    </div>
  )
}
