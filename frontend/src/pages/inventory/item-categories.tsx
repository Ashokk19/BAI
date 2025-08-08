"use client"

import { useState, useEffect } from "react"
import { Package2, Search, Plus, Edit, Trash2, GripVertical, AlertTriangle } from "lucide-react"
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
import { inventoryApi } from '@/services/inventoryApi'
import { toast } from 'sonner'

interface Category {
  id: number
  name: string
  description?: string
  is_active: boolean
  created_at: string
}

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
        className="bg-white/60 backdrop-blur-sm border-white/20 shadow-lg hover:shadow-xl transition-shadow duration-300"
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
              <div className="p-2 rounded-lg bg-gray-100">
                <Package2 className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-gray-800">
                  {category.name}
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 font-medium">
                  Category ID: {category.id}
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 hover:bg-gray-100"
                onClick={() => onEdit(category)}
              >
                <Edit className="w-4 h-4 text-gray-500" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-100 text-red-500 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
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
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium text-gray-500">Status</span>
              <span className={`font-bold ${category.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                {category.is_active ? 'Active' : 'Inactive'}
              </span>
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
              className="w-full"
              onClick={() => window.location.href = `/inventory/items?category=${category.id}`}
            >
              View Items
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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const fetchCategories = async () => {
    try {
      setIsLoading(true)
      const data = await inventoryApi.getCategories()
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
      setFormData({ name: '', description: '' })
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
      setFormData({ name: '', description: '' })
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
    <div className="flex flex-col h-full">
      <header className="p-4 border-b">
        <h1 className="text-2xl font-bold">Item Categories</h1>
        <p className="text-gray-500">
          Organize your inventory by categories • Drag to reorder • {filteredCategories.length} categories total
        </p>
      </header>

      <div className="p-4 flex-1 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
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
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category-description">Description</Label>
                  <Textarea
                    id="category-description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Category description (optional)"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateCategory} disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Category'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="bg-gray-100 animate-pulse h-64" />
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
        <DialogContent>
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category-description">Description</Label>
              <Textarea
                id="edit-category-description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Category description (optional)"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditCategory} disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Category'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
