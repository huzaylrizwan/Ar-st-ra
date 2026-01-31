import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/hooks/use-categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Plus, Pencil, Trash2, Image as ImageIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCategorySchema, type InsertCategory, type Category } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function AdminCategories() {
  const { data: categories, isLoading } = useCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const form = useForm<InsertCategory>({
    resolver: zodResolver(insertCategorySchema),
    defaultValues: {
      name: "",
      slug: "",
      imageUrl: "",
      isHidden: false
    }
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
    form.reset({
      name: "",
      slug: "",
      imageUrl: "",
      isHidden: false
    });
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    form.reset({
      name: category.name,
      slug: category.slug,
      imageUrl: category.imageUrl,
      isHidden: category.isHidden
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure? This will delete the category.")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleImageUpload = (result: any) => {
    if (result.successful && result.successful.length > 0) {
      const file = result.successful[0];
      const objectPath = file.response.body.objectPath;
      form.setValue("imageUrl", objectPath, { shouldDirty: true, shouldValidate: true });
      toast({ title: "Image Uploaded", description: "Image successfully attached." });
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
                {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
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
                  <ObjectUploader
                    onGetUploadParameters={async (file) => {
                      const res = await fetch("/api/uploads/request-url", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          name: file.name,
                          size: file.size,
                          contentType: file.type,
                        }),
                      });
                      const { uploadURL } = await res.json();
                      return {
                        method: "PUT",
                        url: uploadURL,
                        headers: { "Content-Type": file.type },
                      };
                    }}
                    onComplete={handleImageUpload}
                  >
                    <span className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Upload Image</span>
                  </ObjectUploader>
                </div>
                <Input type="hidden" {...form.register("imageUrl")} />
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

      <div className="bg-card rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
              </TableRow>
            ) : categories?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No categories found.</TableCell>
              </TableRow>
            ) : (
              categories?.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <img src={category.imageUrl} className="w-12 h-12 rounded-sm object-cover" alt={category.name} />
                  </TableCell>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="text-muted-foreground">{category.slug}</TableCell>
                  <TableCell>
                    {category.isHidden ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">Hidden</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Active</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(category)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(category.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
}
