import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from "@/hooks/use-products";
import { useCategories } from "@/hooks/use-categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Plus, Pencil, Trash2, Image as ImageIcon, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema, type InsertProduct, type Product } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function AdminProducts() {
  const { data: products, isLoading } = useProducts();
  const { data: categories } = useCategories();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Helper for array fields (colors, sizes)
  const [colorsInput, setColorsInput] = useState("");
  const [sizesInput, setSizesInput] = useState("");

  const form = useForm<InsertProduct>({
    resolver: zodResolver(insertProductSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      categoryId: 0,
      arLink: "",
      colors: [],
      sizes: [],
      images: [],
      isHidden: false
    }
  });

  const onSubmit = async (data: InsertProduct) => {
    try {
      if (editingProduct) {
        await updateMutation.mutateAsync({ id: editingProduct.id, ...data });
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
    setEditingProduct(null);
    setColorsInput("");
    setSizesInput("");
    form.reset({
      name: "",
      description: "",
      price: 0,
      categoryId: 0,
      arLink: "",
      colors: [],
      sizes: [],
      images: [],
      isHidden: false
    });
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setColorsInput(product.colors?.join(", ") || "");
    setSizesInput(product.sizes?.join(", ") || "");
    form.reset({
      name: product.name,
      description: product.description,
      price: product.price,
      categoryId: product.categoryId,
      arLink: product.arLink,
      colors: product.colors,
      sizes: product.sizes,
      images: product.images,
      isHidden: product.isHidden
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure? This will delete the product.")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleImageUpload = (result: any) => {
    if (result.successful && result.successful.length > 0) {
      const newImages = result.successful.map((f: any) => {
        // Construct the internal proxy URL that the server serves
        const objectPath = f.response.body.objectPath;
        return objectPath; // Use the path directly, e.g. /objects/uploads/...
      });
      const currentImages = form.getValues("images") || [];
      const updatedImages = [...currentImages, ...newImages];
      form.setValue("images", updatedImages, { shouldValidate: true, shouldDirty: true });
      toast({ title: "Images Uploaded", description: `${newImages.length} images added.` });
    }
  };

  const removeImage = (index: number) => {
    const currentImages = form.getValues("images") || [];
    const newImages = [...currentImages];
    newImages.splice(index, 1);
    form.setValue("images", newImages);
  };

  // Process manual inputs for arrays on blur
  const handleArraysBlur = () => {
    if (colorsInput) {
      form.setValue("colors", colorsInput.split(",").map(s => s.trim()).filter(Boolean));
    }
    if (sizesInput) {
      form.setValue("sizes", sizesInput.split(",").map(s => s.trim()).filter(Boolean));
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold">Products</h1>
          <p className="text-muted-foreground mt-1">Manage your inventory</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Add Product</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit Product" : "New Product"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name</Label>
                  <Input id="name" {...form.register("name")} placeholder="Velvet Sofa" />
                  {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoryId">Category</Label>
                  <Select 
                    value={form.watch("categoryId") ? String(form.watch("categoryId")) : undefined} 
                    onValueChange={(val) => form.setValue("categoryId", Number(val), { shouldValidate: true })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.categoryId && <p className="text-sm text-destructive">Category is required</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" {...form.register("description")} placeholder="Product details..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (cents)</Label>
                  <Input 
                    id="price" 
                    type="number" 
                    {...form.register("price", { valueAsNumber: true })} 
                  />
                  <p className="text-xs text-muted-foreground">Example: 249900 = $2,499.00</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="arLink">AR Model Link (URL)</Label>
                  <Input id="arLink" {...form.register("arLink")} placeholder="https://..." />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="colors">Colors (comma separated)</Label>
                  <Input 
                    id="colors" 
                    value={colorsInput}
                    onChange={(e) => setColorsInput(e.target.value)}
                    onBlur={handleArraysBlur}
                    placeholder="#FFFFFF, #000000" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sizes">Sizes (comma separated)</Label>
                  <Input 
                    id="sizes" 
                    value={sizesInput}
                    onChange={(e) => setSizesInput(e.target.value)}
                    onBlur={handleArraysBlur}
                    placeholder="S, M, L, XL" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Images</Label>
                <div className="flex flex-wrap gap-4 mb-2">
                  {form.watch("images")?.map((url, i) => (
                    <div key={i} className="relative group w-20 h-20">
                      <img src={url} alt="" className="w-full h-full object-cover rounded-sm border" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <ObjectUploader
                    maxNumberOfFiles={5}
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
                    <div className="w-20 h-20 border-2 border-dashed border-border rounded-sm flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                      <ImageIcon className="w-6 h-6 text-muted-foreground" />
                    </div>
                  </ObjectUploader>
                </div>
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
                  {editingProduct ? "Update" : "Create"}
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
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>AR</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
              </TableRow>
            ) : products?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No products found.</TableCell>
              </TableRow>
            ) : (
              products?.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    {product.images?.[0] && (
                      <img src={product.images[0]} className="w-10 h-10 rounded-sm object-cover" alt="" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{categories?.find(c => c.id === product.categoryId)?.name}</TableCell>
                  <TableCell>${(product.price / 100).toLocaleString()}</TableCell>
                  <TableCell>
                    {product.arLink ? (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Yes</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">No</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(product)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(product.id)}>
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
