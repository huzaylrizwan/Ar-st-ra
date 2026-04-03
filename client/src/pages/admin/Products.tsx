import { useProducts, useDeleteProduct } from "@/hooks/use-products";
import { useCategories } from "@/hooks/use-categories";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Package, EyeOff } from "lucide-react";
import { useLocation } from "wouter";

export default function AdminProducts() {
  const { data: products, isLoading } = useProducts();
  const { data: categories } = useCategories();
  const deleteMutation = useDeleteProduct();
  const [, navigate] = useLocation();

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm("Are you sure? This will permanently delete the product.")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold">Products</h1>
          <p className="text-muted-foreground mt-1">Manage your inventory</p>
        </div>
        <Button
          className="gap-2"
          data-testid="button-add-product"
          onClick={() => navigate("/admin/products/new")}
        >
          <Plus className="w-4 h-4" /> Add Product
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : products?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-border rounded-xl">
          <Package className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-1">No products yet</h3>
          <p className="text-muted-foreground text-sm mb-4">Get started by adding your first product.</p>
          <Button onClick={() => navigate("/admin/products/new")} className="gap-2">
            <Plus className="w-4 h-4" /> Add Product
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {products?.map((product) => {
            const category = categories?.find((c) => c.id === product.categoryId);
            const price = (product.price / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            return (
              <div
                key={product.id}
                data-testid={`card-product-${product.id}`}
                onClick={() => navigate(`/admin/products/${product.id}`)}
                className="group cursor-pointer rounded-xl border border-border bg-card overflow-hidden hover:border-primary/50 hover:shadow-md transition-all duration-200"
              >
                <div className="relative aspect-square bg-muted/30">
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-10 h-10 text-muted-foreground/40" />
                    </div>
                  )}
                  {product.isHidden && (
                    <div className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1" title="Hidden from store">
                      <EyeOff className="w-3 h-3" />
                    </div>
                  )}
                </div>
                <div className="p-3 space-y-1.5">
                  <p className="font-medium text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors">{product.name}</p>
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    {category && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto">
                        {category.name}
                      </Badge>
                    )}
                    <span className="text-sm font-semibold text-primary ml-auto">${price}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}
