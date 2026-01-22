import { useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { useCategories, useCategory } from "@/hooks/use-categories";
import { useProducts } from "@/hooks/use-products";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function CategoryPage() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const categoryId = searchParams.get("id");
  
  const { data: categories } = useCategories();
  const { data: currentCategory } = useCategory(Number(categoryId) || 0);
  const { data: products, isLoading } = useProducts(categoryId || undefined);

  return (
    <Layout>
      {/* Header */}
      <div className="bg-muted/20 border-b border-border">
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="font-serif text-4xl md:text-5xl font-medium mb-4">
            {currentCategory ? currentCategory.name : "All Collections"}
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Explore our meticulously designed furniture pieces, crafted to elevate your living experience.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Sidebar Filters */}
          <div className="w-full lg:w-64 flex-shrink-0 space-y-8">
            <div>
              <h3 className="font-bold text-sm uppercase tracking-widest mb-4">Collections</h3>
              <div className="flex flex-col gap-2">
                <Button 
                  variant="ghost" 
                  className={cn("justify-start px-2", !categoryId && "font-bold text-primary")}
                  onClick={() => setLocation("/categories")}
                >
                  All Products
                </Button>
                {categories?.filter(c => !c.isHidden).map((cat) => (
                  <Button
                    key={cat.id}
                    variant="ghost"
                    className={cn(
                      "justify-start px-2",
                      Number(categoryId) === cat.id && "font-bold text-primary"
                    )}
                    onClick={() => setLocation(`/categories?id=${cat.id}`)}
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Grid */}
          <div className="flex-1">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="aspect-[4/5] bg-muted animate-pulse" />
                ))}
              </div>
            ) : products && products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {products.filter(p => !p.isHidden).map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-muted-foreground">
                No products found in this collection.
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
