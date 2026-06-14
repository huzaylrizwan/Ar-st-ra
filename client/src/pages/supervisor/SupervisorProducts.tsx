import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SupervisorLayout } from "./SupervisorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Pencil, Plus, Package } from "lucide-react";
import type { Product, Category } from "@shared/schema";

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  price: z.coerce.number().min(0, "Price must be non-negative"),
  categoryId: z.coerce.number().min(1, "Category is required"),
  arLink: z.string().optional().default(""),
  images: z.string().optional(),
  isHidden: z.boolean().default(false),
});

type ProductFormValues = z.infer<typeof productSchema>;

function ProductFormDialog({
  open,
  onClose,
  product,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  categories: Category[];
}) {
  const { toast } = useToast();
  const isEdit = !!product;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? {
          name: product.name,
          description: product.description,
          price: product.price / 100,
          categoryId: product.categoryId ?? 0,
          arLink: product.arLink || "",
          images: (product.images || []).join(", "),
          isHidden: product.isHidden,
        }
      : {
          name: "",
          description: "",
          price: 0,
          categoryId: categories[0]?.id || 0,
          arLink: "",
          images: "",
          isHidden: false,
        },
  });

  const mutation = useMutation({
    mutationFn: (data: ProductFormValues) => {
      const imagesArray = data.images
        ? data.images.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      const payload = {
        name: data.name,
        description: data.description,
        price: Math.round(data.price * 100),
        categoryId: data.categoryId,
        arLink: data.arLink || "",
        images: imagesArray,
        colors: product?.colors || [],
        sizes: product?.sizes || [],
        isHidden: data.isHidden,
      };

      if (isEdit) {
        return apiRequest("PUT", `/api/supervisor/products/${product!.id}`, payload);
      }
      return apiRequest("POST", "/api/supervisor/products", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supervisor/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: isEdit ? "Product updated" : "Product created",
        description: "Changes are now live on the storefront.",
      });
      onClose();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save product.", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Product" : "Add Product"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Product name" {...field} data-testid="input-product-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Product description" rows={3} {...field} data-testid="input-product-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price ($)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-product-price" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(Number(v))}
                    defaultValue={String(field.value)}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-product-category">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="images"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URLs (comma-separated)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="https://example.com/img1.jpg, https://example.com/img2.jpg"
                      rows={2}
                      {...field}
                      data-testid="input-product-images"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="arLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>AR Model URL (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/model.glb" {...field} data-testid="input-product-ar" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-save-product">
                {mutation.isPending ? "Saving..." : isEdit ? "Save Changes" : "Add Product"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function SupervisorProducts() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/supervisor/products"],
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const openAdd = () => {
    setEditingProduct(null);
    setDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingProduct(null);
  };

  return (
    <SupervisorLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Products</h1>
            <p className="text-muted-foreground">Add and edit products in the catalog</p>
          </div>
          <Button onClick={openAdd} data-testid="button-add-product">
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : !products?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No products yet. Add your first product.</p>
              <Button className="mt-4" onClick={openAdd} data-testid="button-add-first-product">
                Add Product
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <Card key={product.id} data-testid={`card-product-${product.id}`}>
                {product.images?.[0] && (
                  <div className="aspect-video overflow-hidden rounded-t-lg">
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm font-medium leading-tight">{product.name}</CardTitle>
                    {product.isHidden && <Badge variant="secondary" className="text-xs shrink-0">Hidden</Badge>}
                  </div>
                  <p className="text-sm font-semibold text-primary">
                    ${(product.price / 100).toFixed(2)}
                  </p>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(product)}
                    className="w-full gap-2"
                    data-testid={`button-edit-product-${product.id}`}
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {dialogOpen && (
        <ProductFormDialog
          open={dialogOpen}
          onClose={closeDialog}
          product={editingProduct}
          categories={categories || []}
        />
      )}
    </SupervisorLayout>
  );
}
