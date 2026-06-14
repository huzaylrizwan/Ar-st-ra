import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/hooks/use-categories";
import { fetchWithCsrf } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ImageUploader } from "@/components/ImageUploader";
import { Plus, Pencil, Trash2, Image as ImageIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCategorySchema, type InsertCategory, type Category } from "@shared/schema";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { SortableCategoryRow } from "@/components/SortableCategoryRow";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function AdminCategories() {
  const { data: categories, isLoading } = useCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [localCategories, setLocalCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (categories) {
      setLocalCategories([...categories].sort((a, b) => a.sortOrder - b.sortOrder));
    }
  }, [categories]);

  const sensors = useSensors(useSensor(PointerSensor));

  const reorderMutation = useMutation({
    mutationFn: async (items: { id: number; sortOrder: number }[]) => {
      const res = await fetchWithCsrf("/api/categories/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(items),
      });
      if (!res.ok) throw new Error("Reorder failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/categories"] }),
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localCategories.findIndex(c => c.id === active.id);
    const newIndex = localCategories.findIndex(c => c.id === over.id);
    const reordered = arrayMove(localCategories, oldIndex, newIndex);

    setLocalCategories(reordered);
    reorderMutation.mutate(reordered.map((c, i) => ({ id: c.id, sortOrder: i })));
  };

  const form = useForm<InsertCategory>({
    resolver: zodResolver(insertCategorySchema),
    defaultValues: { name: "", slug: "", imageUrl: "", isHidden: false, sortOrder: 0 },
  });

  const onSubmit = async (data: InsertCategory) => {
    try {
      if (editingCategory) {
        await updateMutation.mutateAsync({ id: editingCategory.id, ...data });
      } else {
        await createMutation.mutateAsync(data);
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
    }
  };

  const resetForm = () => {
    setEditingCategory(null);
    form.reset({ name: "", slug: "", imageUrl: "", isHidden: false, sortOrder: 0 });
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    form.reset({
      name: category.name,
      slug: category.slug,
      imageUrl: category.imageUrl,
      isHidden: category.isHidden,
      sortOrder: category.sortOrder,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure? This will delete the category.")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold">Categories</h1>
          <p className="text-muted-foreground mt-1">Manage your product collections</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Add Category</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Edit Category" : "New Category"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...form.register("name")} placeholder="Living Room" />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL)</Label>
                <Input id="slug" {...form.register("slug")} placeholder="living-room" />
              </div>
              <div className="space-y-2">
                <Label>Cover Image</Label>
                <div className="flex items-center gap-4">
                  {form.watch("imageUrl") && (
                    <img src={form.watch("imageUrl")} alt="Preview" className="w-16 h-16 object-cover rounded-sm border" />
                  )}
                  <ImageUploader
                    onUpload={(url) => form.setValue("imageUrl", url, { shouldDirty: true, shouldValidate: true })}
                  >
                    <span className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Upload Image</span>
                  </ImageUploader>
                </div>
                <Input
                  placeholder="Or paste an image URL directly..."
                  value={form.watch("imageUrl") || ""}
                  onChange={(e) => form.setValue("imageUrl", e.target.value, { shouldDirty: true, shouldValidate: true })}
                />
                {form.formState.errors.imageUrl && <p className="text-sm text-destructive">Image is required</p>}
              </div>
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="isHidden">Hide from Store</Label>
                <Switch
                  id="isHidden"
                  checked={form.watch("isHidden")}
                  onCheckedChange={(checked) => form.setValue("isHidden", checked)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingCategory ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground">
          <div className="w-4" />
          <div className="w-12">Image</div>
          <span className="flex-1">Name</span>
          <span className="w-32 hidden sm:block">Slug</span>
          <span className="w-20">Status</span>
          <span className="w-20 text-right">Actions</span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
        ) : localCategories.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No categories found.</div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={localCategories.map(c => c.id)} strategy={verticalListSortingStrategy}>
              {localCategories.map((category) => (
                <SortableCategoryRow key={category.id} category={category}>
                  {(dragHandle) => (
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      {dragHandle}
                      <div className="w-12 flex-shrink-0">
                        <img
                          src={category.imageUrl}
                          alt={category.name}
                          className="w-10 h-10 rounded-md object-cover border border-border"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{category.name}</p>
                      </div>
                      <div className="w-32 hidden sm:block flex-shrink-0">
                        <p className="text-xs text-muted-foreground truncate">{category.slug}</p>
                      </div>
                      <div className="w-20 flex-shrink-0">
                        {category.isHidden ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">Hidden</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Active</span>
                        )}
                      </div>
                      <div className="w-20 flex justify-end gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(category)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(category.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </SortableCategoryRow>
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </AdminLayout>
  );
}
