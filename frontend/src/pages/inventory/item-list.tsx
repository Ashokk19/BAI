"use client"

import { useState, useEffect } from "react"
import { Search, Plus, Edit, Trash2, Download, Upload, Package, AlertTriangle, Filter, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { inventoryApi, type Item, type ItemCategory, type ItemCreate, type ItemUpdate } from "@/services/inventoryApi"
import { toast } from "sonner"

export default function ItemList() {
  const [items, setItems] = useState<Item[]>([])
  const [categories, setCategories] = useState<ItemCategory[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [formData, setFormData] = useState<Partial<ItemCreate>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const clearFormData = () => {
    setFormData({
      name: '',
      sku: '',
      category_id: undefined,
      unit_price: undefined,
      selling_price: undefined,
      current_stock: 0,
      minimum_stock: 0,
      unit_of_measure: 'pcs',
      is_active: true,
      has_expiry: false,
      is_serialized: false,
      tax_rate: 0,
      tax_type: 'inclusive',
      description: '',
      cost_price: undefined,
      maximum_stock: undefined,
      weight: undefined,
      dimensions: undefined,
      shelf_life_days: undefined,
      expiry_date: undefined,
      barcode: undefined
    })
  }

  const fetchItems = async () => {
    try {
      setIsLoading(true)
      const [itemsData, categoriesData] = await Promise.all([
        inventoryApi.getItems(),
        inventoryApi.getCategories()
      ])
      
      setItems(itemsData)
      setCategories(categoriesData)
      setError(null)
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [])

  useEffect(() => {
    // Check for category filter in URL params
    const urlParams = new URLSearchParams(window.location.search)
    const categoryId = urlParams.get('category')
    if (categoryId) {
      setCategoryFilter(categoryId)
      setFilterStatus('all')
      setSearchTerm('')
    }
  }, [items])

  const getItemStatus = (item: Item) => {
    if (item.current_stock === 0) return 'out_of_stock';
    if (item.current_stock <= item.minimum_stock) return 'low_stock';
    return 'in_stock';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock': return 'bg-green-500/20 text-green-700 border-green-200/50';
      case 'low_stock': return 'bg-yellow-500/20 text-yellow-700 border-yellow-200/50';
      case 'out_of_stock': return 'bg-red-500/20 text-red-700 border-red-200/50';
      default: return 'bg-gray-500/20 text-gray-700 border-gray-200/50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_stock': return <Package className="w-4 h-4" />;
      case 'low_stock': return <AlertTriangle className="w-4 h-4" />;
      case 'out_of_stock': return <AlertTriangle className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const status = getItemStatus(item);
    const matchesFilter = filterStatus === 'all' || status === filterStatus;
    
    // Check for category filter
    const matchesCategory = categoryFilter === 'all' || item.category_id === parseInt(categoryFilter);
    
    return matchesSearch && matchesFilter && matchesCategory;
  });

  const statsData = [
    {
      title: "Total Items",
      value: items.length.toString(),
      change: "+12%",
      changeType: "positive" as const,
      icon: Package,
      description: "All inventory items"
    },
    {
      title: "In Stock",
      value: items.filter(item => getItemStatus(item) === 'in_stock').length.toString(),
      change: "+8%",
      changeType: "positive" as const, 
      icon: Package,
      description: "Available items"
    },
    {
      title: "Low Stock",
      value: items.filter(item => getItemStatus(item) === 'low_stock').length.toString(),
      change: "+3",
      changeType: "negative" as const,
      icon: AlertTriangle,
      description: "Need reordering"
    },
    {
      title: "Total Value",
      value: `₹${items.reduce((sum, item) => sum + (item.current_stock * item.unit_price), 0).toLocaleString()}`,
      change: "+15.3%",
      changeType: "positive" as const,
      icon: Package,
      description: "Current inventory worth"
    }
  ];

  const handleCreateItem = async () => {
    if (!formData.name || !formData.sku || !formData.category_id || !formData.unit_price) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setIsSubmitting(true)
      const itemData: ItemCreate = {
        name: formData.name!,
        sku: formData.sku!,
        category_id: formData.category_id!,
        unit_price: formData.unit_price!,
        selling_price: formData.selling_price || formData.unit_price!,
        current_stock: formData.current_stock || 0,
        minimum_stock: formData.minimum_stock || 0,
        unit_of_measure: formData.unit_of_measure || 'pcs',
        is_active: formData.is_active ?? true,
        has_expiry: formData.has_expiry ?? false,
        is_serialized: formData.is_serialized ?? false,
        tax_rate: formData.tax_rate || 0,
        tax_type: formData.tax_type || 'inclusive',
        description: formData.description,
        cost_price: formData.cost_price,
        maximum_stock: formData.maximum_stock,
        weight: formData.weight,
        dimensions: formData.dimensions,
        shelf_life_days: formData.shelf_life_days,
        expiry_date: formData.expiry_date,
        barcode: formData.barcode
      }

      await inventoryApi.createItem(itemData)
      toast.success('Item created successfully')
      setIsAddDialogOpen(false)
      clearFormData()
      fetchItems()
    } catch (err) {
      console.error('Error creating item:', err)
      toast.error('Failed to create item')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditItem = async () => {
    if (!editingItem) return

    try {
      setIsSubmitting(true)
      const updateData: ItemUpdate = {
        name: formData.name,
        sku: formData.sku,
        category_id: formData.category_id,
        unit_price: formData.unit_price,
        selling_price: formData.selling_price,
        current_stock: formData.current_stock,
        minimum_stock: formData.minimum_stock,
        unit_of_measure: formData.unit_of_measure,
        is_active: formData.is_active,
        has_expiry: formData.has_expiry,
        is_serialized: formData.is_serialized,
        tax_rate: formData.tax_rate,
        tax_type: formData.tax_type,
        description: formData.description,
        cost_price: formData.cost_price,
        maximum_stock: formData.maximum_stock,
        weight: formData.weight,
        dimensions: formData.dimensions,
        shelf_life_days: formData.shelf_life_days,
        expiry_date: formData.expiry_date,
        barcode: formData.barcode
      }

      await inventoryApi.updateItem(editingItem.id, updateData)
      toast.success('Item updated successfully')
      setIsEditDialogOpen(false)
      setEditingItem(null)
      clearFormData()
      fetchItems()
    } catch (err) {
      console.error('Error updating item:', err)
      toast.error('Failed to update item')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteItem = async (item: Item) => {
    try {
      await inventoryApi.deleteItem(item.id)
      toast.success('Item deleted successfully')
      fetchItems()
    } catch (err) {
      console.error('Error deleting item:', err)
      toast.error('Failed to delete item')
    }
  }

  const handleExportItems = async () => {
    try {
      toast.loading('Exporting items...', { id: 'export-toast' })
      const blob = await inventoryApi.exportItems('csv')
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `items_export_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      toast.success(`Items exported successfully! Downloaded ${items.length} items.`, { id: 'export-toast' })
    } catch (err) {
      console.error('Error exporting items:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to export items'
      toast.error(errorMessage, { id: 'export-toast' })
    }
  }

  const handleImportItems = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      toast.error('Please select a CSV or Excel file')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB')
      return
    }

    try {
      toast.loading('Importing items...', { id: 'import-toast' })
      const result = await inventoryApi.importItems(file)
      
      if (result.success) {
        let message = `Successfully imported ${result.imported_count || 0} items`
        if (result.total_rows) {
          message += ` out of ${result.total_rows} rows`
        }
        
        if (result.errors && result.errors.length > 0) {
          message += ` with ${result.errors.length} errors`
          console.warn('Import errors:', result.errors)
          
          // Show detailed error message for first few errors
          const errorPreview = result.errors.slice(0, 3).join('\n')
          toast.warning(`${message}\n\nFirst errors:\n${errorPreview}`, { 
            id: 'import-toast',
            duration: 8000 
          })
        } else {
          toast.success(message, { id: 'import-toast' })
        }
        
        fetchItems()
        
        // Clear the file input
        event.target.value = ''
      } else {
        toast.error(result.message || 'Import failed', { id: 'import-toast' })
      }
    } catch (err) {
      console.error('Error importing items:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to import items'
      toast.error(errorMessage, { id: 'import-toast' })
      
      // Clear the file input on error
      event.target.value = ''
    }
  }

  const openEditDialog = (item: Item) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      sku: item.sku,
      category_id: item.category_id,
      unit_price: item.unit_price,
      selling_price: item.selling_price,
      current_stock: item.current_stock,
      minimum_stock: item.minimum_stock,
      unit_of_measure: item.unit_of_measure,
      is_active: item.is_active,
      has_expiry: item.has_expiry,
      is_serialized: item.is_serialized,
      tax_rate: item.tax_rate,
      tax_type: item.tax_type,
      description: item.description || '',
      cost_price: item.cost_price,
      maximum_stock: item.maximum_stock,
      weight: item.weight,
      dimensions: item.dimensions,
      shelf_life_days: item.shelf_life_days,
      expiry_date: item.expiry_date || '',
      barcode: item.barcode
    })
    setIsEditDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-25 to-indigo-50 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-r from-violet-100 to-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-r from-purple-50 to-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-1000"></div>
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        <div className="relative z-10 p-8 flex items-center justify-center min-h-screen">
          <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60">
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Loading inventory items...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-25 to-indigo-50 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-r from-violet-100 to-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-r from-purple-50 to-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-1000"></div>
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        <div className="relative z-10 p-8 flex items-center justify-center min-h-screen">
          <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Error Loading Items</h3>
              <p className="text-gray-600 font-medium mb-4">{error}</p>
              <Button onClick={fetchItems} className="bg-gradient-to-r from-violet-500 to-purple-600">
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-25 to-indigo-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-r from-violet-100 to-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-r from-purple-50 to-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-indigo-50 to-violet-100 rounded-full mix-blend-multiply filter blur-3xl opacity-25 animate-pulse delay-500"></div>
      </div>

      {/* Enhanced grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

      <div className="relative z-10 p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Items Management</h1>
            <p className="text-gray-600 font-medium mt-1">
              Manage your inventory items and track stock levels • {items.length} items total
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open)
            if (open) {
              clearFormData()
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg">
                <Plus className="w-4 h-4 mr-2" />
                Add New Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Item</DialogTitle>
                <DialogDescription>
                  Create a new inventory item with all necessary details.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Item name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU *</Label>
                  <Input
                    id="sku"
                    value={formData.sku || ''}
                    onChange={(e) => setFormData({...formData, sku: e.target.value})}
                    placeholder="Stock keeping unit"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select value={formData.category_id?.toString()} onValueChange={(value) => setFormData({...formData, category_id: parseInt(value)})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit_price">Unit Price *</Label>
                  <Input
                    id="unit_price"
                    type="number"
                    step="0.01"
                    value={formData.unit_price || ''}
                    onChange={(e) => setFormData({...formData, unit_price: parseFloat(e.target.value)})}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="selling_price">Selling Price</Label>
                  <Input
                    id="selling_price"
                    type="number"
                    step="0.01"
                    value={formData.selling_price || ''}
                    onChange={(e) => setFormData({...formData, selling_price: parseFloat(e.target.value)})}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="current_stock">Current Stock</Label>
                  <Input
                    id="current_stock"
                    type="number"
                    value={formData.current_stock || ''}
                    onChange={(e) => setFormData({...formData, current_stock: parseInt(e.target.value)})}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minimum_stock">Minimum Stock</Label>
                  <Input
                    id="minimum_stock"
                    type="number"
                    value={formData.minimum_stock || ''}
                    onChange={(e) => setFormData({...formData, minimum_stock: parseInt(e.target.value)})}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit_of_measure">Unit of Measure</Label>
                  <Input
                    id="unit_of_measure"
                    value={formData.unit_of_measure || ''}
                    onChange={(e) => setFormData({...formData, unit_of_measure: e.target.value})}
                    placeholder="pcs"
                  />
                </div>
                <div className="col-span-2 space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="has_expiry"
                      checked={formData.has_expiry || false}
                      onCheckedChange={(checked) => setFormData({...formData, has_expiry: checked as boolean, expiry_date: checked ? formData.expiry_date : undefined})}
                    />
                    <Label htmlFor="has_expiry" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Expirable item
                    </Label>
                  </div>
                  {formData.has_expiry && (
                    <div className="space-y-2">
                      <Label htmlFor="expiry_date">Expiry Date</Label>
                      <Input
                        id="expiry_date"
                        type="date"
                        value={formData.expiry_date ? new Date(formData.expiry_date).toISOString().split('T')[0] : ''}
                        onChange={(e) => setFormData({...formData, expiry_date: e.target.value ? new Date(e.target.value).toISOString() : undefined})}
                        className="bg-white/80 backdrop-blur-lg border border-white/90"
                      />
                    </div>
                  )}
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Item description"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateItem} disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Item'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsData.map((stat) => (
            <Card key={stat.title} className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl hover:bg-white/50 hover:shadow-2xl transition-all duration-300 ring-1 ring-white/60 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-white/20"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-semibold text-gray-700">{stat.title}</CardTitle>
                <div className={`p-2 rounded-lg ${stat.changeType === "positive" ? "bg-violet-500/20" : "bg-orange-500/20"}`}>
                  <stat.icon className={`w-4 h-4 ${stat.changeType === "positive" ? "text-violet-600" : "text-orange-600"}`} />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-semibold flex items-center ${stat.changeType === "positive" ? "text-green-600" : "text-red-600"}`}>
                    {stat.changeType === "positive" ? (
                      <ArrowUpRight className="w-3 h-3 mr-1" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3 mr-1" />
                    )}
                    {stat.change}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-2 font-medium">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search and Filter */}
        <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden mb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-white/20"></div>
          <CardContent className="p-6 relative z-10">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search items by name or SKU..."
                  className="pl-10 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 placeholder:text-gray-600 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 h-12 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
                             <div className="relative">
                 <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 w-5 h-5" />
                 <select
                   className="pl-10 pr-4 py-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 h-12 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-md appearance-none"
                   value={filterStatus}
                   onChange={(e) => setFilterStatus(e.target.value)}
                 >
                   <option value="all">All Status</option>
                   <option value="in_stock">In Stock</option>
                   <option value="low_stock">Low Stock</option>
                   <option value="out_of_stock">Out of Stock</option>
                 </select>
               </div>
               <div className="relative">
                 <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 w-5 h-5" />
                 <select
                   className="pl-10 pr-4 py-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 h-12 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-md appearance-none"
                   value={categoryFilter}
                   onChange={(e) => setCategoryFilter(e.target.value)}
                 >
                   <option value="all">All Categories</option>
                   {categories.map((category) => (
                     <option key={category.id} value={category.id.toString()}>
                       {category.name}
                     </option>
                   ))}
                 </select>
               </div>
                             <div className="flex gap-2">
                 {(categoryFilter !== 'all' || filterStatus !== 'all' || searchTerm) && (
                   <Button 
                     variant="outline" 
                     className="bg-white/80 backdrop-blur-lg border border-white/90 hover:bg-white/90"
                     onClick={() => {
                       setCategoryFilter('all')
                       setFilterStatus('all')
                       setSearchTerm('')
                       // Clear URL params
                       window.history.replaceState({}, '', window.location.pathname)
                     }}
                   >
                     Clear Filters
                   </Button>
                 )}
                 <Button 
                   variant="outline" 
                   className="bg-white/80 backdrop-blur-lg border border-white/90 hover:bg-white/90"
                   onClick={() => document.getElementById('import-file')?.click()}
                 >
                   <Upload className="w-4 h-4 mr-2" />
                   Import
                 </Button>
                <input
                  id="import-file"
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={handleImportItems}
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  className="bg-white/80 backdrop-blur-lg border border-white/90 hover:bg-white/90"
                  onClick={handleExportItems}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items Table */}
        <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-white/20"></div>
          <CardContent className="p-0 relative z-10">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/30 border-b border-white/40">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Item Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Stock Value
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/20">
                  {filteredItems.map((item) => {
                    const status = getItemStatus(item);
                    const stockValue = item.current_stock * item.unit_price;
                    return (
                      <tr key={item.id} className="hover:bg-white/20 transition-all duration-200">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="p-2 bg-violet-500/20 rounded-lg mr-4">
                              <Package className="w-6 h-6 text-violet-600" />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-gray-900">{item.name}</div>
                              <div className="text-sm text-gray-600 font-medium">
                                {item.unit_of_measure} • Created: {new Date(item.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.sku}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                          ₹{item.unit_price.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${item.current_stock <= item.minimum_stock ? 'text-red-600' : 'text-gray-900'}`}>
                              {item.current_stock}
                            </span>
                            <span className="text-gray-500">/ {item.minimum_stock} min</span>
                            {item.current_stock <= item.minimum_stock && (
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                          ₹{stockValue.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(status)}`}>
                            {getStatusIcon(status)}
                            {status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-violet-600 hover:text-violet-700 hover:bg-violet-50/50"
                              onClick={() => openEditDialog(item)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50/50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Item</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{item.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteItem(item)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {filteredItems.length === 0 && !isLoading && (
          <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden mt-8">
            <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-white/20"></div>
            <CardContent className="text-center py-12 relative z-10">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">No items found</h3>
              <p className="text-gray-600 font-medium">Try adjusting your search or filter criteria</p>
            </CardContent>
          </Card>
        )}
        
        {/* Footer spacing */}
        <div className="h-20"></div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>
              Update the item details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name || ''}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Item name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-sku">SKU *</Label>
              <Input
                id="edit-sku"
                value={formData.sku || ''}
                onChange={(e) => setFormData({...formData, sku: e.target.value})}
                placeholder="Stock keeping unit"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category *</Label>
              <Select value={formData.category_id?.toString()} onValueChange={(value) => setFormData({...formData, category_id: parseInt(value)})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-unit_price">Unit Price *</Label>
              <Input
                id="edit-unit_price"
                type="number"
                step="0.01"
                value={formData.unit_price || ''}
                onChange={(e) => setFormData({...formData, unit_price: parseFloat(e.target.value)})}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-selling_price">Selling Price</Label>
              <Input
                id="edit-selling_price"
                type="number"
                step="0.01"
                value={formData.selling_price || ''}
                onChange={(e) => setFormData({...formData, selling_price: parseFloat(e.target.value)})}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-current_stock">Current Stock</Label>
              <Input
                id="edit-current_stock"
                type="number"
                value={formData.current_stock || ''}
                onChange={(e) => setFormData({...formData, current_stock: parseInt(e.target.value)})}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-minimum_stock">Minimum Stock</Label>
              <Input
                id="edit-minimum_stock"
                type="number"
                value={formData.minimum_stock || ''}
                onChange={(e) => setFormData({...formData, minimum_stock: parseInt(e.target.value)})}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-unit_of_measure">Unit of Measure</Label>
              <Input
                id="edit-unit_of_measure"
                value={formData.unit_of_measure || ''}
                onChange={(e) => setFormData({...formData, unit_of_measure: e.target.value})}
                placeholder="pcs"
              />
            </div>
            <div className="col-span-2 space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-has_expiry"
                  checked={formData.has_expiry || false}
                  onCheckedChange={(checked) => setFormData({...formData, has_expiry: checked as boolean, expiry_date: checked ? formData.expiry_date : undefined})}
                />
                <Label htmlFor="edit-has_expiry" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Expirable item
                </Label>
              </div>
              {formData.has_expiry && (
                <div className="space-y-2">
                  <Label htmlFor="edit-expiry_date">Expiry Date</Label>
                  <Input
                    id="edit-expiry_date"
                    type="date"
                    value={formData.expiry_date ? new Date(formData.expiry_date).toISOString().split('T')[0] : ''}
                    onChange={(e) => setFormData({...formData, expiry_date: e.target.value ? new Date(e.target.value).toISOString() : undefined})}
                    className="bg-white/80 backdrop-blur-lg border border-white/90"
                  />
                </div>
              )}
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description || ''}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Item description"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditItem} disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Item'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}