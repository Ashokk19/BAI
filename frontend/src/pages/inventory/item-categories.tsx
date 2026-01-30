"use client"

import { useState, useEffect } from "react"
import { Package2, Search, Plus, Edit, Trash2, GripVertical, AlertTriangle, DollarSign, TrendingUp, TrendingDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Textarea } from "@/components/ui/textarea"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { inventoryApi, type ItemCategoryWithStats } from '@/services/inventoryApi'
import { toast } from 'sonner'

type Category = ItemCategoryWithStats & { display_id?: number }

interface SortableCategoryProps {
  category: Category
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}

function SortableCategory({ category, onEdit, onDelete }: SortableCategoryProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id.toString() })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? "rotate-3 scale-105 z-50" : ""} transition-all duration-200`}
    >
      <Card
        className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 hover:shadow-2xl transition-shadow duration-300 relative overflow-hidden group"
      >
        <div
          {...attributes}
          {...listeners}
          className="absolute top-3 right-3 opacity-25 group-hover:opacity-100 transition-opacity duration-200 cursor-grab active:cursor-grabbing z-20"
        >
          <GripVertical className="w-4 h-4 text-gray-500" />
        </div>

        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-white/60 backdrop-blur-sm">
                <Package2 className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-gray-800">
                  {category.name}
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 font-medium">
                  Category ID: {(category as any).display_id ?? category.id}
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 hover:bg-white/60 backdrop-blur-sm"
                onClick={() => onEdit(category)}
              >
                <Edit className="w-4 h-4 text-gray-500" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-100/60 backdrop-blur-sm text-red-500 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-white/95 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Category</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{category.name}"? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(category)}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-3">
            {/* Status */}
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium text-gray-500">Status</span>
              <span className={`font-bold ${category.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                {category.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-2 gap-2 my-3">
              {/* Total Items */}
              <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                <div className="flex items-center justify-between">
                  <Package2 className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-800">{category.total_items}</span>
                </div>
                <p className="text-xs text-blue-600 font-medium mt-1">Total Items</p>
              </div>



              {/* Low Stock */}
              {category.low_stock_items > 0 && (
                <div className="bg-yellow-50 rounded-lg p-2 border border-yellow-200">
                  <div className="flex items-center justify-between">
                    <TrendingDown className="w-4 h-4 text-yellow-600" />
                    <span className="text-xs font-medium text-yellow-800">{category.low_stock_items}</span>
                  </div>
                  <p className="text-xs text-yellow-600 font-medium mt-1">Low Stock</p>
                </div>
              )}

              {/* Out of Stock */}
              {category.out_of_stock_items > 0 && (
                <div className="bg-red-50 rounded-lg p-2 border border-red-200">
                  <div className="flex items-center justify-between">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span className="text-xs font-medium text-red-800">{category.out_of_stock_items}</span>
                  </div>
                  <p className="text-xs text-red-600 font-medium mt-1">Out of Stock</p>
                </div>
              )}

              {/* Current Stock */}
              <div className="bg-indigo-50 rounded-lg p-2 border border-indigo-200">
                <div className="flex items-center justify-between">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-medium text-indigo-800">{category.total_current_stock}</span>
                </div>
                <p className="text-xs text-indigo-600 font-medium mt-1">Total Stock</p>
              </div>
            </div>

            {category.description && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">Description</p>
                <p className="text-sm text-gray-700">
                  {category.description}
                </p>
              </div>
            )}

            <div className="flex justify-between items-center text-sm">
              <span className="font-medium text-gray-500">Created</span>
              <span className="text-gray-700">
                {new Date(category.created_at).toLocaleDateString()}
              </span>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              className="w-full bg-white/60 backdrop-blur-sm border-white/60 hover:bg-white/80"
              onClick={() => window.location.href = `/inventory/items?category=${category.id}`}
            >
              View Items ({category.total_items})
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ItemCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [formData, setFormData] = useState({ name: '', description: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const clearFormData = () => {
    setFormData({ name: '', description: '' })
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const fetchCategories = async () => {
    try {
      setIsLoading(true)
      const data = await inventoryApi.getCategoriesWithStats()
      setCategories(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching categories:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch categories')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const handleCreateCategory = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a category name')
      return
    }

    try {
      setIsSubmitting(true)
      await inventoryApi.createCategory({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        is_active: true
      })
      toast.success('Category created successfully')
      setIsAddDialogOpen(false)
      clearFormData()
      fetchCategories()
    } catch (err) {
      console.error('Error creating category:', err)
      toast.error('Failed to create category')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditCategory = async () => {
    if (!editingCategory || !formData.name.trim()) return

    try {
      setIsSubmitting(true)
      await inventoryApi.updateCategory(editingCategory.id, {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined
      })
      toast.success('Category updated successfully')
      setIsEditDialogOpen(false)
      setEditingCategory(null)
      clearFormData()
      fetchCategories()
    } catch (err) {
      console.error('Error updating category:', err)
      toast.error('Failed to update category')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteCategory = async (category: Category) => {
    try {
      await inventoryApi.deleteCategory(category.id)
      toast.success('Category deleted successfully')
      fetchCategories()
    } catch (err) {
      console.error('Error deleting category:', err)
      toast.error('Failed to delete category')
    }
  }

  const openEditDialog = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      description: category.description || ''
    })
    setIsEditDialogOpen(true)
  }

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Calculate total statistics across all categories
  const totalStats = categories.reduce(
    (acc, category) => ({
      total_items: acc.total_items + category.total_items,
      total_stock_value: acc.total_stock_value + category.total_stock_value,
      low_stock_items: acc.low_stock_items + category.low_stock_items,
      out_of_stock_items: acc.out_of_stock_items + category.out_of_stock_items,
      total_current_stock: acc.total_current_stock + category.total_current_stock,
    }),
    {
      total_items: 0,
      total_stock_value: 0,
      low_stock_items: 0,
      out_of_stock_items: 0,
      total_current_stock: 0,
    }
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (active.id !== over?.id) {
      setCategories((items) => {
        const oldIndex = items.findIndex((item) => item.id.toString() === active.id)
        const newIndex = items.findIndex((item) => item.id.toString() === over?.id)

        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-25 to-indigo-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-r from-violet-100 to-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-r from-purple-50 to-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-1000"></div>
      </div>

      {/* Enhanced grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

      {/* Main Content */}
      <div className="relative z-10">
        <header className="p-8 border-b border-white/20">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Item Categories</h1>
          <p className="text-gray-600 font-medium mb-3">
            Organize your inventory by categories • Drag to reorder • {filteredCategories.length} categories total
          </p>
          
          {/* Overall Statistics */}
          {!isLoading && categories.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden group cursor-pointer hover:scale-105 transition-all duration-200">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/20"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                  <CardTitle className="text-sm font-semibold text-gray-700">Total Items</CardTitle>
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <Package2 className="w-4 h-4 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="text-2xl font-bold text-gray-900 mb-1">{totalStats.total_items}</div>
                  <p className="text-xs text-gray-600 mt-2 font-medium">All inventory items</p>
                </CardContent>
              </Card>
              

              
              <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden group cursor-pointer hover:scale-105 transition-all duration-200">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-indigo-600/20"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                  <CardTitle className="text-sm font-semibold text-gray-700">Total Stock</CardTitle>
                  <div className="p-2 rounded-lg bg-indigo-500/20">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                  </div>
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="text-2xl font-bold text-gray-900 mb-1">{totalStats.total_current_stock}</div>
                  <p className="text-xs text-gray-600 mt-2 font-medium">Available items</p>
                </CardContent>
              </Card>
              
              {totalStats.low_stock_items > 0 && (
                <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden group cursor-pointer hover:scale-105 transition-all duration-200">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-yellow-600/20"></div>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                    <CardTitle className="text-sm font-semibold text-gray-700">Low Stock</CardTitle>
                    <div className="p-2 rounded-lg bg-yellow-500/20">
                      <TrendingDown className="w-4 h-4 text-yellow-600" />
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="text-2xl font-bold text-gray-900 mb-1">{totalStats.low_stock_items}</div>
                    <p className="text-xs text-gray-600 mt-2 font-medium">Need reordering</p>
                  </CardContent>
                </Card>
              )}
              
              {totalStats.out_of_stock_items > 0 && (
                <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden group cursor-pointer hover:scale-105 transition-all duration-200">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-red-600/20"></div>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                    <CardTitle className="text-sm font-semibold text-gray-700">Out of Stock</CardTitle>
                    <div className="p-2 rounded-lg bg-red-500/20">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="text-2xl font-bold text-gray-900 mb-1">{totalStats.out_of_stock_items}</div>
                    <p className="text-xs text-gray-600 mt-2 font-medium">Requires attention</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </header>

        <div className="p-8 flex-1 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/50 border-white/60"
              />
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              setIsAddDialogOpen(open)
              if (open) {
                clearFormData()
              }
            }}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700">
                  <Plus className="mr-2 h-4 w-4" /> Add Category
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white/95 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60">
                <DialogHeader>
                  <DialogTitle>Add New Category</DialogTitle>
                  <DialogDescription>
                    Create a new category to organize your inventory items.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="category-name">Name *</Label>
                    <Input
                      id="category-name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Category name"
                      className="bg-white/50 border-white/60"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category-description">Description</Label>
                    <Textarea
                      id="category-description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Category description (optional)"
                      className="bg-white/50 border-white/60"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="bg-white/50 border-white/60">
                    Cancel
                  </Button>
                  <Button onClick={handleCreateCategory} disabled={isSubmitting} className="bg-gradient-to-r from-violet-500 to-purple-600">
                    {isSubmitting ? 'Creating...' : 'Create Category'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 animate-pulse h-64" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
              <h3 className="mt-2 text-sm font-medium text-red-800">Error loading categories</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={filteredCategories.map(c => c.id.toString())} strategy={verticalListSortingStrategy}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCategories.map((category) => (
                    <SortableCategory
                      key={category.id}
                      category={category}
                      onEdit={openEditDialog}
                      onDelete={handleDeleteCategory}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
          
          {/* Footer spacing */}
          <div className="h-20"></div>
        </div>

        {/* Edit Category Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-white/95 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60">
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
              <DialogDescription>
                Update the category details below.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-category-name">Name *</Label>
                <Input
                  id="edit-category-name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Category name"
                  className="bg-white/50 border-white/60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category-description">Description</Label>
                <Textarea
                  id="edit-category-description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Category description (optional)"
                  className="bg-white/50 border-white/60"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="bg-white/50 border-white/60">
                Cancel
              </Button>
              <Button onClick={handleEditCategory} disabled={isSubmitting} className="bg-gradient-to-r from-violet-500 to-purple-600">
                {isSubmitting ? 'Updating...' : 'Update Category'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
