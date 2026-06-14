import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { useCategories, useCategory } from "@/hooks/use-categories";
import { useProducts } from "@/hooks/use-products";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CollectionsFilter, applyFilters, type SortOption } from "@/components/CollectionsFilter";

export default function CategoryPage() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const categoryId = searchParams.get("id");

  const { data: categories } = useCategories();
  const { data: currentCategory } = useCategory(Number(categoryId) || 0);
  const { data: products, isLoading } = useProducts(categoryId || undefined);

  const visibleCategories = categories?.filter(c => !c.isHidden) || [];

  // Filter state
  const [search, setSearch] = useState("");
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [sort, setSort] = useState<SortOption>("default");

  const allProducts = products?.filter(p => !p.isHidden) ?? [];

  const priceMin = useMemo(
    () => allProducts.length > 0 ? Math.min(...allProducts.map(p => p.price)) : 0,
    [allProducts]
  );
  const priceMax = useMemo(
    () => allProducts.length > 0 ? Math.max(...allProducts.map(p => p.price)) : 100000,
    [allProducts]
  );
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);

  // Sync priceRange when products load
  useEffect(() => {
    setPriceRange([priceMin, priceMax]);
  }, [priceMin, priceMax]);

  const filteredProducts = useMemo(
    () => applyFilters(allProducts, search, priceRange, selectedColors, sort),
    [allProducts, search, priceRange, selectedColors, sort]
  );

  const hasActiveFilters = search !== "" || selectedColors.length > 0 || sort !== "default"
    || priceRange[0] !== priceMin || priceRange[1] !== priceMax;

  const clearFilters = () => {
    setSearch("");
    setSelectedColors([]);
    setSort("default");
    setPriceRange([priceMin, priceMax]);
  };

  const toggleColor = (color: string) => {
    setSelectedColors(prev =>
      prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]
    );
  };

  return (
    <Layout>
      {/* Header - Compact on mobile */}
      <div className="bg-muted/20 border-b border-border">
        <div className="container mx-auto px-4 py-8 sm:py-16 text-center">
          <h1 className="font-serif text-2xl sm:text-4xl md:text-5xl font-medium mb-2 sm:mb-4">
            {currentCategory ? currentCategory.name : "All Collections"}
          </h1>
          <p className="text-xs sm:text-base text-muted-foreground max-w-2xl mx-auto">
            Explore our meticulously designed furniture pieces.
          </p>
        </div>
      </div>

      {/* Horizontal Category Pills - Mobile optimized */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
            <div className="flex gap-2 sm:gap-3 min-w-max">
              <button
                className={cn(
                  "px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap",
                  !categoryId
                    ? "bg-foreground text-background shadow-lg"
                    : "bg-muted text-foreground"
                )}
                onClick={() => setLocation("/categories")}
                data-testid="filter-all"
              >
                All
              </button>
              {visibleCategories.map((cat) => (
                <button
                  key={cat.id}
                  className={cn(
                    "px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap",
                    Number(categoryId) === cat.id
                      ? "bg-foreground text-background shadow-lg"
                      : "bg-muted text-foreground"
                  )}
                  onClick={() => setLocation(`/categories?id=${cat.id}`)}
                  data-testid={`filter-category-${cat.id}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 sm:py-12">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Sidebar Filters - Hidden on mobile, visible on desktop */}
          <div className="hidden lg:block w-64 flex-shrink-0 space-y-8">
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
                {visibleCategories.map((cat) => (
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

          {/* Grid - 2 columns on mobile */}
          <div className="flex-1">
            {/* Search, price, color, sort filter bar */}
            <CollectionsFilter
              products={allProducts}
              search={search}
              onSearchChange={setSearch}
              priceRange={priceRange}
              onPriceRangeChange={setPriceRange}
              priceMin={priceMin}
              priceMax={priceMax}
              selectedColors={selectedColors}
              onColorToggle={toggleColor}
              sort={sort}
              onSortChange={setSort}
              onClear={clearFilters}
              hasActiveFilters={hasActiveFilters}
            />

            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="aspect-square bg-muted animate-pulse rounded-xl" />
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
                {filteredProducts.length === 0 && !isLoading && (
                  <div className="col-span-full text-center py-16 text-muted-foreground">
                    <p className="text-lg mb-2">No products match your filters</p>
                    <Button variant="ghost" onClick={clearFilters}>Clear filters</Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
