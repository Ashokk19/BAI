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
import { Search, Plus, Edit, Trash2, Eye, FileText, Package, DollarSign, Clock, Filter } from "lucide-react"
import {
  deletePurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  PurchaseOrder,
  PurchaseOrderDetail,
  PurchaseOrderCreatePayload,
  PurchaseOrderItemCreatePayload
} from "@/services/purchaseOrderApi"
import { getVendor, getVendors, Vendor } from "@/services/vendorApi"
import { inventoryApi, Item } from "@/services/inventoryApi"
import { organizationService } from "@/services/organizationService"
import { toast } from "sonner"

type POFormItem = PurchaseOrderItemCreatePayload & { amount: number; unit_price_overridden?: boolean }

const initialFormData: PurchaseOrderCreatePayload & { items: POFormItem[] } = {
  vendor_id: 0,
  po_date: new Date().toISOString().split("T")[0],
  expected_delivery_date: '',
  notes: '',
  terms_and_conditions: '',
  items: [{ item_id: 0, item_name: '', description: '', quantity: 1, unit_price: 0, tax_rate: 0, discount_percentage: 0, amount: 0, unit_price_overridden: false }]
};

export default function PurchaseOrders() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrderDetail | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrderDetail | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PurchaseOrder | null>(null);
  const [formData, setFormData] = useState(initialFormData)

  const [isNewItemDialogOpen, setIsNewItemDialogOpen] = useState(false)
  const [newItemTargetIndex, setNewItemTargetIndex] = useState<number | null>(null)
  const [newItemForm, setNewItemForm] = useState({
    name: "",
    sku: "",
    unit_price: 0,
    selling_price: 0,
    tax_rate: 0,
    description: "",
  })

  const handleDeleteConfirmation = (order: PurchaseOrder) => {
    setDeleteTarget(order);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteOrder = async () => {
    if (deleteTarget) {
      try {
        await deletePurchaseOrder(deleteTarget.id);
        setOrders(orders.filter(order => order.id !== deleteTarget.id));
        toast.success("Purchase order deleted successfully!");
        setIsDeleteDialogOpen(false);
        setDeleteTarget(null);
      } catch (error) {
        console.error("Failed to delete purchase order", error);
        toast.error("Failed to delete purchase order");
      }
    }
  };

  const handleEditOrder = async (order: PurchaseOrder) => {
    try {
      const full = await getPurchaseOrder(order.id);
      setEditingOrder(full);
      // Ensure latest inventory items/prices are available while editing
      fetchItems();
      setFormData({
        vendor_id: full.vendor_id,
        po_date: (full.po_date || '').toString().slice(0, 10),
        expected_delivery_date: full.expected_delivery_date ? (full.expected_delivery_date as any).toString().slice(0, 10) : '',
        notes: full.notes || '',
        terms_and_conditions: full.terms_and_conditions || '',
        items: (full.items || []).map(it => {
          const quantity = Number((it as any).quantity ?? 0);
          const unit_price = Number((it as any).unit_price ?? 0);
          return {
            item_id: Number((it as any).item_id ?? 0),
            item_name: String((it as any).item_name ?? ''),
            description: String((it as any).description ?? ''),
            quantity,
            unit_price,
            tax_rate: Number((it as any).tax_rate ?? 0),
            discount_percentage: Number((it as any).discount_percentage ?? 0),
            amount: quantity * unit_price,
            unit_price_overridden: true,
          };
        }),
      });
      setIsDialogOpen(true);
    } catch (error) {
      console.error("Failed to load purchase order", error);
      toast.error("Failed to load purchase order");
    }
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

  const fetchVendors = async () => {
    try {
      const response = await getVendors();
      setVendors(response.vendors);
    } catch (error) {
      console.error("Failed to fetch vendors", error);
    }
  };

  const fetchItems = async () => {
    try {
      const list = await inventoryApi.getItems({ limit: 200 });
      setItems(list);
    } catch (error) {
      console.error("Failed to fetch items", error);
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
    fetchVendors();
    fetchItems();
  }, []);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.vendor_id.toString().toLowerCase().includes(searchTerm.toLowerCase())
    const normalize = (value: string) => (value || "").toLowerCase().replace(/[\s_]/g, "")
    const normalizedStatus = normalize(order.status)
    const normalizedFilter = normalize(statusFilter)

    const matchesStatus =
      statusFilter === "all" ||
      (normalizedFilter === "pending" ? ["sent", "confirmed"].includes(normalizedStatus) : normalizedStatus === normalizedFilter)
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch ((status || "").toLowerCase()) {
      case "draft":
        return "bg-gray-100 text-gray-800"
      case "sent":
        return "bg-blue-100 text-blue-800"
      case "confirmed":
        return "bg-green-100 text-green-800"
      case "partially_received":
      case "partially received":
        return "bg-yellow-100 text-yellow-800"
      case "received":
        return "bg-emerald-100 text-emerald-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleDownloadOrder = async (order: PurchaseOrder) => {
    try {
      const full = await getPurchaseOrder(order.id);

      const [vendor, organization] = await Promise.all([
        (async () => {
          try {
            return await getVendor(full.vendor_id);
          } catch {
            return vendors.find(v => v.id === full.vendor_id) || null;
          }
        })(),
        (async () => {
          try {
            return await organizationService.getOrganizationProfile();
          } catch {
            return null;
          }
        })(),
      ]);

      const formatDate = (value?: string) => {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleDateString("en-IN");
      };

      const formatMoney = (value: any) => {
        const num = Number(value);
        if (!Number.isFinite(num)) return "₹0.00";
        return `₹${num.toFixed(2)}`;
      };

      const calcLineTotal = (it: any) => {
        const quantity = Number(it?.quantity ?? 0);
        const unitPrice = Number(it?.unit_price ?? 0);
        const base = quantity * unitPrice;
        const discountPct = Number(it?.discount_percentage ?? 0);
        const discountAmt = base * (discountPct / 100);
        const taxable = base - discountAmt;
        const taxRate = Number(it?.tax_rate ?? 0);
        const taxAmt = taxable * (taxRate / 100);
        const fallback = taxable + taxAmt;
        const lineTotal = Number(it?.line_total);
        return Number.isFinite(lineTotal) ? lineTotal : fallback;
      };

      const vendorAddress = [
        vendor?.billing_address,
        [vendor?.city, vendor?.state, vendor?.postal_code].filter(Boolean).join(", "),
        vendor?.country,
      ].filter(Boolean);

      const orgAddress = [
        organization?.address,
        [organization?.city, organization?.state, organization?.postal_code].filter(Boolean).join(", "),
        organization?.country,
      ].filter(Boolean);

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Purchase Order ${full.po_number}</title>
            <style>
              * { box-sizing: border-box; }
              body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #111; }
              .page { max-width: 900px; margin: 0 auto; }
              .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
              .doc-title { font-size: 20px; font-weight: 700; letter-spacing: 0.5px; margin: 0; }
              .muted { color: #444; font-size: 12px; }
              .company { font-size: 12px; line-height: 1.4; }
              .company .name { font-weight: 700; font-size: 14px; }
              .pill { display: inline-block; border: 1px solid #111; padding: 6px 10px; font-size: 12px; font-weight: 700; }
              .section { margin-top: 16px; }
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
              .box { border: 1px solid #111; padding: 10px; }
              .box-title { font-size: 12px; font-weight: 700; margin: 0 0 6px 0; }
              .kv { font-size: 12px; display: grid; grid-template-columns: 140px 1fr; row-gap: 4px; column-gap: 8px; }
              .kv div:nth-child(odd) { color: #444; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th, td { border: 1px solid #111; padding: 8px; font-size: 12px; vertical-align: top; }
              th { background: #f3f3f3; text-align: left; }
              td.num { text-align: right; white-space: nowrap; }
              .totals { width: 360px; margin-left: auto; margin-top: 10px; }
              .totals td { border: none; padding: 4px 0; }
              .totals .label { color: #444; }
              .totals .grand { font-weight: 700; border-top: 1px solid #111; padding-top: 8px; }
              .footer { margin-top: 18px; font-size: 11px; color: #444; display: flex; justify-content: space-between; gap: 12px; }
              @media print {
                body { padding: 0; }
                .page { padding: 0 18px; }
              }
            </style>
          </head>
          <body>
            <div class="page">
              <div class="header">
                <div class="company">
                  <div class="name">${organization?.company_name || "Company"}</div>
                  ${orgAddress.length ? orgAddress.map(line => `<div>${line}</div>`).join("") : ""}
                  ${organization?.gst_number ? `<div><strong>GST:</strong> ${organization.gst_number}</div>` : ""}
                  ${organization?.phone ? `<div><strong>Phone:</strong> ${organization.phone}</div>` : ""}
                  ${organization?.email ? `<div><strong>Email:</strong> ${organization.email}</div>` : ""}
                </div>

                <div style="text-align:right;">
                  <div class="pill">PURCHASE ORDER</div>
                  <div style="margin-top: 8px;">
                    <div class="doc-title">${full.po_number}</div>
                    <div class="muted">Date: ${formatDate(full.po_date)}</div>
                  </div>
                </div>
              </div>

              <div class="section grid">
                <div class="box">
                  <div class="box-title">Vendor</div>
                  <div style="font-size: 12px; line-height: 1.4;">
                    <div style="font-weight:700;">${vendor?.vendor_name || full.vendor_name || ""}</div>
                    ${vendor?.vendor_code ? `<div><strong>Code:</strong> ${vendor.vendor_code}</div>` : ""}
                    ${vendor?.gst_number ? `<div><strong>GST:</strong> ${vendor.gst_number}</div>` : ""}
                    ${vendor?.mobile || vendor?.phone ? `<div><strong>Phone:</strong> ${(vendor?.mobile || vendor?.phone) ?? ""}</div>` : ""}
                    ${vendor?.email ? `<div><strong>Email:</strong> ${vendor.email}</div>` : ""}
                    ${vendorAddress.length ? `<div style="margin-top: 6px;">${vendorAddress.map(line => `<div>${line}</div>`).join("")}</div>` : ""}
                  </div>
                </div>

                <div class="box">
                  <div class="box-title">Order Details</div>
                  <div class="kv">
                    <div>Status</div><div>${full.status || ""}</div>
                    <div>PO Number</div><div>${full.po_number}</div>
                    <div>PO Date</div><div>${formatDate(full.po_date)}</div>
                    <div>Expected Delivery</div><div>${formatDate(full.expected_delivery_date) || "-"}</div>
                    <div>Reference</div><div>${full.reference_number || "-"}</div>
                  </div>
                </div>
              </div>

              <div class="section">
                <table>
                  <thead>
                    <tr>
                      <th style="width: 42px;">#</th>
                      <th>Item</th>
                      <th style="width: 70px;">Qty</th>
                      <th style="width: 110px;">Unit Price</th>
                      <th style="width: 70px;">Tax %</th>
                      <th style="width: 90px;">Disc %</th>
                      <th style="width: 120px;">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${(full.items || []).map((it, idx) => {
                      const lineTotal = calcLineTotal(it);
                      return `
                        <tr>
                          <td class="num">${idx + 1}</td>
                          <td>
                            <div style="font-weight:700;">${(it as any).item_name || ""}</div>
                            ${(it as any).description ? `<div class="muted">${(it as any).description}</div>` : ""}
                          </td>
                          <td class="num">${Number((it as any).quantity ?? 0)}</td>
                          <td class="num">${formatMoney((it as any).unit_price ?? 0)}</td>
                          <td class="num">${Number((it as any).tax_rate ?? 0).toFixed(2)}</td>
                          <td class="num">${Number((it as any).discount_percentage ?? 0).toFixed(2)}</td>
                          <td class="num">${formatMoney(lineTotal)}</td>
                        </tr>
                      `;
                    }).join("")}
                  </tbody>
                </table>

                <table class="totals">
                  <tbody>
                    <tr><td class="label">Subtotal</td><td class="num">${formatMoney(full.subtotal)}</td></tr>
                    <tr><td class="label">Discount</td><td class="num">${formatMoney(full.discount_amount)}</td></tr>
                    <tr><td class="label">Tax</td><td class="num">${formatMoney(full.tax_amount)}</td></tr>
                    <tr><td class="grand">Total</td><td class="num grand">${formatMoney(full.total_amount)}</td></tr>
                  </tbody>
                </table>
              </div>

              ${(full.notes || full.terms_and_conditions) ? `
                <div class="section grid">
                  ${full.notes ? `
                    <div class="box">
                      <div class="box-title">Notes</div>
                      <div style="font-size: 12px; white-space: pre-wrap;">${full.notes}</div>
                    </div>
                  ` : ""}
                  ${full.terms_and_conditions ? `
                    <div class="box">
                      <div class="box-title">Terms & Conditions</div>
                      <div style="font-size: 12px; white-space: pre-wrap;">${full.terms_and_conditions}</div>
                    </div>
                  ` : ""}
                </div>
              ` : ""}

              <div class="footer">
                <div>
                  Generated: ${new Date().toLocaleDateString("en-IN")}<br/>
                  This is a computer generated purchase order
                </div>
                <div style="text-align:right;">
                  For queries: ${organization?.email || ""}
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(html);
        newWindow.document.close();
        newWindow.focus();
        newWindow.onafterprint = () => {
          try { newWindow.close(); } catch {}
        };
        newWindow.print();

        toast.success('PDF Generated! Purchase order opened for printing.');
      } else {
        toast.error('PDF Failed: Unable to open PDF window. Please check popup settings.');
      }
    } catch (error) {
      console.error('Failed to download purchase order', error);
      toast.error('Failed to download purchase order');
    }
  };

  const openNewItemDialog = (targetIndex: number) => {
    setNewItemTargetIndex(targetIndex)
    setNewItemForm({
      name: "",
      sku: "",
      unit_price: 0,
      selling_price: 0,
      tax_rate: 0,
      description: "",
    })
    setIsNewItemDialogOpen(true)
  }

  const handleCreateNewItem = async () => {
    if (!newItemForm.name.trim() || !newItemForm.sku.trim()) {
      toast.error("Name and SKU are required")
      return
    }
    if (newItemTargetIndex === null) return

    try {
      const created = await inventoryApi.createItem({
        name: newItemForm.name.trim(),
        sku: newItemForm.sku.trim(),
        category_id: 1,
        unit_price: Number(newItemForm.unit_price) || 0,
        selling_price: Number(newItemForm.selling_price) || 0,
        current_stock: 0,
        minimum_stock: 0,
        unit_of_measure: "pcs",
        has_expiry: false,
        is_active: true,
        is_serialized: false,
        tax_rate: Number(newItemForm.tax_rate) || 0,
        tax_type: "inclusive",
        description: newItemForm.description?.trim() || "",
      })

      await fetchItems()
      selectPOItem(newItemTargetIndex, created)
      toast.success("Item created")
      setIsNewItemDialogOpen(false)
      setNewItemTargetIndex(null)
    } catch (error) {
      console.error("Failed to create item", error)
      toast.error("Failed to create item")
    }
  }

  const handleSubmit = async () => {
    try {
      if (!formData.vendor_id) {
        toast.error("Please select a vendor");
        return;
      }
      if (formData.items.some(i => !i.item_id || i.item_id === 0)) {
        toast.error("Please select an item for each row");
        return;
      }
      if (formData.items.some(i => !i.quantity || i.quantity <= 0)) {
        toast.error("Quantity must be greater than 0");
        return;
      }

      const payload: PurchaseOrderCreatePayload = {
        vendor_id: formData.vendor_id,
        po_date: formData.po_date,
        expected_delivery_date: formData.expected_delivery_date || undefined,
        notes: formData.notes,
        terms_and_conditions: formData.terms_and_conditions,
        items: formData.items.map(item => ({
          item_id: item.item_id,
          item_name: item.item_name,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          discount_percentage: item.discount_percentage,
        })),
      };

      if (editingOrder) {
        const result = await updatePurchaseOrder(editingOrder.id, payload);
        toast.success(`Purchase order ${result.po_number} updated!`)
        await fetchPurchaseOrders();
      } else {
        const result = await createPurchaseOrder(payload);
        toast.success(`Purchase order ${result.po_number} created!`)
        await fetchPurchaseOrders();
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
      items: [...formData.items, { item_id: 0, item_name: '', description: '', quantity: 1, unit_price: 0, tax_rate: 0, discount_percentage: 0, amount: 0, unit_price_overridden: false }],
    })
  }

  const updateItem = (index: number, field: string, value: any) => {
    const updatedItems = formData.items.map((item, i) => {
      if (i === index) {
        const updatedItem: any = { ...item, [field]: value }
        if (field === "unit_price") {
          updatedItem.unit_price_overridden = true
        }
        if (field === "quantity" || field === "unit_price") {
          updatedItem.amount = updatedItem.quantity * updatedItem.unit_price
        }
        return updatedItem
      }
      return item
    })
    setFormData({ ...formData, items: updatedItems })
  }

  const selectPOItem = (index: number, selected: Item) => {
    const updatedItems = formData.items.map((it, i) => {
      if (i !== index) return it;
      const isDifferentItem = it.item_id !== selected.id;

      const selectedUnitPrice = Number((selected as any).unit_price ?? 0);
      const selectedTaxRate = Number((selected as any).tax_rate ?? 0);
      const selectedDescription = String((selected as any).description ?? "");

      // Default fields from the selected item when picking a different item.
      // If re-picking the same item, refresh unit price only if user didn't manually override it.
      const shouldRefreshUnitPrice = isDifferentItem || !it.unit_price_overridden;
      const unit_price = shouldRefreshUnitPrice ? selectedUnitPrice : Number(it.unit_price ?? selectedUnitPrice ?? 0);
      const tax_rate = isDifferentItem ? selectedTaxRate : Number(it.tax_rate ?? selectedTaxRate ?? 0);
      const description = isDifferentItem ? selectedDescription : String(it.description ?? selectedDescription ?? "");
      const quantity = it.quantity || 1;
      const amount = quantity * unit_price;
      return {
        ...it,
        item_id: selected.id,
        item_name: selected.name,
        description,
        unit_price,
        tax_rate,
        amount,
        unit_price_overridden: isDifferentItem ? false : it.unit_price_overridden,
      };
    });
    setFormData({ ...formData, items: updatedItems });
  }

  const handleViewOrder = async (order: PurchaseOrder) => {
    try {
      const full = await getPurchaseOrder(order.id);
      setSelectedOrder(full);
      setIsViewDialogOpen(true);
    } catch (error) {
      console.error('Failed to load purchase order', error);
      toast.error('Failed to load purchase order');
    }
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
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-25 to-indigo-50 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-r from-violet-100 to-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-r from-purple-50 to-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-indigo-50 to-violet-100 rounded-full mix-blend-multiply filter blur-3xl opacity-25 animate-pulse delay-500"></div>
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

      <div className="relative z-10 p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Purchase Orders</h1>
            <p className="text-gray-600 font-medium mt-1">Create and manage purchase orders for your vendors • {orders.length} orders total</p>
          </div>
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
            <CardTitle className="text-sm font-semibold text-gray-700">Total Orders</CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/20">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-gray-900 mb-1">{orders.length}</div>
            <p className="text-xs text-gray-600 mt-2 font-medium">All time</p>
          </CardContent>
        </Card>

        <Card
          role="button"
          tabIndex={0}
          onClick={() => setStatusFilter("pending")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              setStatusFilter("pending")
            }
          }}
          className={`bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl hover:bg-white/50 hover:shadow-2xl transition-all duration-300 ring-1 ring-white/60 relative overflow-hidden group hover:scale-105 cursor-pointer select-none outline-none ${
            statusFilter === "pending" ? "ring-2 ring-violet-500 shadow-2xl" : ""
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-yellow-600/20"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-gray-700">Pending Orders</CardTitle>
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <Clock className="w-4 h-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {orders.filter((o) => ["sent", "confirmed"].includes((o.status || "").toLowerCase())).length}
            </div>
            <p className="text-xs text-gray-600 mt-2 font-medium">Awaiting delivery</p>
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
            <CardTitle className="text-sm font-semibold text-gray-700">Total Value</CardTitle>
            <div className="p-2 rounded-lg bg-green-500/20">
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-gray-900 mb-1">₹{orders.reduce((sum, o) => sum + o.total_amount, 0).toLocaleString()}</div>
            <p className="text-xs text-gray-600 mt-2 font-medium">Order value</p>
          </CardContent>
        </Card>

        <Card
          role="button"
          tabIndex={0}
          onClick={() => setStatusFilter("received")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              setStatusFilter("received")
            }
          }}
          className={`bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl hover:bg-white/50 hover:shadow-2xl transition-all duration-300 ring-1 ring-white/60 relative overflow-hidden group hover:scale-105 cursor-pointer select-none outline-none ${
            statusFilter === "received" ? "ring-2 ring-violet-500 shadow-2xl" : ""
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-indigo-600/20"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-gray-700">Received</CardTitle>
            <div className="p-2 rounded-lg bg-indigo-500/20">
              <Package className="w-4 h-4 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-gray-900 mb-1">{orders.filter((o) => (o.status || "").toLowerCase() === "received").length}</div>
            <p className="text-xs text-gray-600 mt-2 font-medium">Completed orders</p>
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
                  placeholder="Search orders..."
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
                    <SelectItem value="pending">Pending (Sent/Confirmed)</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="partially received">Partially Received</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open)
              if (open) {
                // Pull latest inventory prices whenever the PO dialog opens
                fetchItems()
              }
            }}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg h-12 px-6 font-semibold">
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
                      <Label htmlFor="vendorId">Vendor *</Label>
                      <Select
                        value={formData.vendor_id ? String(formData.vendor_id) : ""}
                        onValueChange={(val) => setFormData({ ...formData, vendor_id: Number(val) })}
                      >
                        <SelectTrigger className="bg-white/50 border-white/20">
                          <SelectValue placeholder="Select a vendor" />
                        </SelectTrigger>
                        <SelectContent>
                          {vendors.map(v => (
                            <SelectItem key={v.id} value={String(v.id)}>
                              {v.vendor_name} {v.vendor_code ? `(${v.vendor_code})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      {formData.items.map((item, index) => {
                        const base = Number(item.quantity || 0) * Number(item.unit_price || 0)
                        const taxPct = Number((item as any).tax_rate || 0)
                        const taxAmt = base * (taxPct / 100)
                        const amountWithTax = base + taxAmt
                        return (
                        <div key={index} className="grid grid-cols-8 gap-2 items-end">
                          <div>
                            <Label>Item</Label>
                            <Select
                              value={item.item_id ? String(item.item_id) : ""}
                              onValueChange={(val) => {
                                if (val === "__add_new__") {
                                  openNewItemDialog(index)
                                  return
                                }
                                const sel = items.find(it => String(it.id) === val);
                                if (sel) selectPOItem(index, sel);
                              }}
                            >
                              <SelectTrigger className="bg-white/50 border-white/20">
                                <SelectValue placeholder="Select item" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__add_new__">+ Add new item</SelectItem>
                                {items.map(it => (
                                  <SelectItem key={it.id} value={String(it.id)}>
                                    {it.name} {it.sku ? `(${it.sku})` : ""}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-2">
                            <Label>Description</Label>
                            <Input
                              value={item.description}
                              onChange={(e) => updateItem(index, "description", e.target.value)}
                              placeholder="Optional description"
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
                              value={item.unit_price}
                              onChange={(e) => updateItem(index, "unit_price", Number.parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <Label>Tax %</Label>
                            <Input value={(item as any).tax_rate?.toString() ?? "0"} readOnly className="bg-gray-50" />
                          </div>
                          <div>
                            <Label>Amount</Label>
                            <Input value={(item.quantity * item.unit_price).toFixed(2)} readOnly className="bg-gray-50" />
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
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        )
                      })}
                    </div>
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      {(() => {
                        const subtotal = formData.items.reduce((sum, it: any) => sum + Number(it.quantity || 0) * Number(it.unit_price || 0), 0)
                        const taxTotal = formData.items.reduce((sum, it: any) => sum + (Number(it.quantity || 0) * Number(it.unit_price || 0)) * (Number(it.tax_rate || 0) / 100), 0)
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

            <Dialog open={isNewItemDialogOpen} onOpenChange={(open) => {
              setIsNewItemDialogOpen(open)
              if (!open) setNewItemTargetIndex(null)
            }}>
              <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                  <DialogTitle>Add New Item</DialogTitle>
                  <DialogDescription>Create an inventory item and select it for this line.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Name *</Label>
                    <Input value={newItemForm.name} onChange={(e) => setNewItemForm({ ...newItemForm, name: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>SKU *</Label>
                    <Input value={newItemForm.sku} onChange={(e) => setNewItemForm({ ...newItemForm, sku: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Unit Price</Label>
                      <Input type="number" value={newItemForm.unit_price} onChange={(e) => setNewItemForm({ ...newItemForm, unit_price: Number(e.target.value) || 0 })} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Selling Price</Label>
                      <Input type="number" value={newItemForm.selling_price} onChange={(e) => setNewItemForm({ ...newItemForm, selling_price: Number(e.target.value) || 0 })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Tax Rate</Label>
                      <Input type="number" value={newItemForm.tax_rate} onChange={(e) => setNewItemForm({ ...newItemForm, tax_rate: Number(e.target.value) || 0 })} />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Description</Label>
                    <Textarea value={newItemForm.description} onChange={(e) => setNewItemForm({ ...newItemForm, description: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsNewItemDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateNewItem} className="bg-gradient-to-r from-violet-600 to-purple-600">Create</Button>
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
                      <div className="text-sm text-gray-500">{Array.isArray(order.items) ? order.items.length : 0} items</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{(order as any).vendor_name ?? order.vendor_id}</div>
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
                      <Button variant="outline" size="sm" onClick={() => handleDownloadOrder(order)}>
                        <FileText className="h-4 w-4" />
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
                      <TableHead>Description</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(selectedOrder.items || []).map((item: any) => (
                      <TableRow key={item.id ?? item.item_id}>
                        <TableCell>{item.item_name}</TableCell>
                        <TableCell>{item.description ?? ""}</TableCell>
                        <TableCell>{item.quantity ?? 0}</TableCell>
                        <TableCell>₹{Number(item.unit_price ?? 0)}</TableCell>
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
              This action cannot be undone. This will permanently delete the purchase order {deleteTarget?.po_number}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteOrder}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}