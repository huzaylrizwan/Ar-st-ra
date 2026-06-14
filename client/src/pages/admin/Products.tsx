import { useEffect, useState } from "react";
import { useProducts } from "@/hooks/use-products";
import { useCategories } from "@/hooks/use-categories";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Package, EyeOff, Pencil } from "lucide-react";
import { useLocation } from "wouter";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { SortableProductRow } from "@/components/SortableProductRow";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Product } from "@shared/schema";

export default function AdminProducts() {
  const { data: products, isLoading } = useProducts();
  const { data: categories } = useCategories();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const [localProducts, setLocalProducts] = useState<Product[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (products) {
      setLocalProducts([...products].sort((a, b) => a.sortOrder - b.sortOrder));
    }
  }, [products]);

  const sensors = useSensors(useSensor(PointerSensor));

  const reorderMutation = useMutation({
    mutationFn: async (items: { id: number; sortOrder: number }[]) => {
      const res = await fetch("/api/products/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(items),
      });
      if (!res.ok) throw new Error("Reorder failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/products"] }),
  });

  const bulkMutation = useMutation({
    mutationFn: async ({ ids, action }: { ids: number[]; action: "hide" | "show" | "delete" }) => {
      const res = await fetch("/api/products/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids, action }),
      });
      if (!res.ok) throw new Error("Bulk action failed");
    },
    onSuccess: () => {
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localProducts.findIndex(p => p.id === active.id);
    const newIndex = localProducts.findIndex(p => p.id === over.id);
    const reordered = arrayMove(localProducts, oldIndex, newIndex);

    setLocalProducts(reordered);
    reorderMutation.mutate(reordered.map((p, i) => ({ id: p.id, sortOrder: i })));
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === localProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(localProducts.map(p => p.id)));
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
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

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg mb-4 flex-wrap">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => bulkMutation.mutate({ ids: Array.from(selectedIds), action: "hide" })}
            disabled={bulkMutation.isPending}
          >
            Hide
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => bulkMutation.mutate({ ids: Array.from(selectedIds), action: "show" })}
            disabled={bulkMutation.isPending}
          >
            Show
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={bulkMutation.isPending}
            onClick={() => {
              if (confirm(`Delete ${selectedIds.size} product(s)? This cannot be undone.`)) {
                bulkMutation.mutate({ ids: Array.from(selectedIds), action: "delete" });
              }
            }}
          >
            Delete
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds(new Set())}
          >
            Cancel
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : localProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-border rounded-xl">
          <Package className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-1">No products yet</h3>
          <p className="text-muted-foreground text-sm mb-4">Get started by adding your first product.</p>
          <Button onClick={() => navigate("/admin/products/new")} className="gap-2">
            <Plus className="w-4 h-4" /> Add Product
          </Button>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          {/* Header row */}
          <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground">
            <div className="w-4" /> {/* drag handle space */}
            <Checkbox
              checked={selectedIds.size === localProducts.length && localProducts.length > 0}
              onCheckedChange={toggleAll}
              aria-label="Select all"
            />
            <div className="w-10" /> {/* image space */}
            <span className="flex-1">Name</span>
            <span className="w-28 hidden sm:block">Category</span>
            <span className="w-24 hidden md:block">Status</span>
            <span className="w-20 text-right">Price</span>
            <span className="w-16" /> {/* actions */}
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={localProducts.map(p => p.id)} strategy={verticalListSortingStrategy}>
              {localProducts.map((product) => {
                const category = categories?.find(c => c.id === product.categoryId);
                const price = (product.price / 100).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                });

                return (
                  <SortableProductRow key={product.id} product={product}>
                    {(dragHandle) => (
                      <div className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        {dragHandle}
                        <Checkbox
                          checked={selectedIds.has(product.id)}
                          onCheckedChange={() => toggleSelect(product.id)}
                          aria-label={`Select ${product.name}`}
                          onClick={e => e.stopPropagation()}
                        />
                        {/* Thumbnail */}
                        <div className="w-10 h-10 rounded-md overflow-hidden bg-muted/30 flex-shrink-0">
                          {product.images?.[0] ? (
                            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-4 h-4 text-muted-foreground/40" />
                            </div>
                          )}
                        </div>
                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{product.name}</p>
                          {product.isHidden && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                              <EyeOff className="w-2.5 h-2.5" /> Hidden
                            </span>
                          )}
                        </div>
                        {/* Category */}
                        <div className="w-28 hidden sm:block flex-shrink-0">
                          {category ? (
                            <Badge variant="secondary" className="text-[10px]">{category.name}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                        {/* Stock status */}
                        <div className="w-24 hidden md:block flex-shrink-0">
                          <span className={`text-xs font-medium ${
                            product.stockStatus === "out_of_stock"
                              ? "text-red-600"
                              : product.stockStatus === "made_to_order"
                              ? "text-amber-600"
                              : "text-green-600"
                          }`}>
                            {product.stockStatus === "out_of_stock"
                              ? "Out of Stock"
                              : product.stockStatus === "made_to_order"
                              ? "Made to Order"
                              : "In Stock"}
                          </span>
                        </div>
                        {/* Price */}
                        <div className="w-20 text-right flex-shrink-0">
                          <span className="text-sm font-semibold text-primary">${price}</span>
                        </div>
                        {/* Edit button */}
                        <div className="w-16 flex justify-end flex-shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => navigate(`/admin/products/${product.id}`)}
                            aria-label={`Edit ${product.name}`}
                            data-testid={`card-product-${product.id}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </SortableProductRow>
                );
              })}
            </SortableContext>
          </DndContext>
        </div>
      )}
    </AdminLayout>
  );
}
