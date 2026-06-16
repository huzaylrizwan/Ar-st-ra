import { useState, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import { Layout } from "@/components/Layout";
import { useCategories, useCategory } from "@/hooks/use-categories";
import { useProducts } from "@/hooks/use-products";
import { ProductCard } from "@/components/ProductCard";
import { motion, AnimatePresence } from "framer-motion";

export default function CategoryPage() {
  const [, setLocation] = useLocation();
  const rawSearch = useSearch();
  const categoryId = new URLSearchParams(rawSearch).get("id");

  const { data: categories } = useCategories();
  const { data: currentCategory } = useCategory(Number(categoryId) || 0);
  const { data: products, isLoading } = useProducts(categoryId || undefined);

  const visibleCategories = categories?.filter(c => !c.isHidden) || [];

  const [search, setSearch] = useState("");

  const filteredProducts = useMemo(
    () => (products?.filter(p => !p.isHidden) ?? []).filter(p =>
      !search || p.name.toLowerCase().includes(search.toLowerCase())
    ),
    [products, search]
  );

  return (
    <Layout>
      {/* Page header */}
      <div className="py-16 sm:py-24 text-center px-6">
        <p className="text-xs uppercase tracking-[0.3em] mb-4" style={{ color: "var(--accent)", fontFamily: "var(--font-sans)" }}>
          {currentCategory ? "Collection" : "All Collections"}
        </p>
        <h1 className="font-light" style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(32px, 4vw, 56px)",
          color: "var(--text-primary)",
        }}>
          {currentCategory ? currentCategory.name : "The Full Collection"}
        </h1>
      </div>

      {/* Glass sticky filter bar */}
      <div className="sticky top-16 z-40 py-4 glass mb-8"
        style={{ borderBottom: "1px solid var(--glass-border)" }}>
        <div className="container mx-auto px-4 sm:px-6 flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search furniture..."
            className="flex-1 px-4 py-2 text-sm outline-none"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--glass-border)",
              borderRadius: "var(--radius-input)",
              color: "var(--text-primary)",
            }}
          />
          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            <button
              type="button"
              aria-pressed={!categoryId}
              onClick={() => setLocation("/categories")}
              className="px-4 py-1.5 text-xs uppercase tracking-wider whitespace-nowrap transition-all"
              style={{
                background: !categoryId ? "var(--accent)" : "var(--surface-1)",
                color: !categoryId ? "#000" : "var(--text-secondary)",
                borderRadius: "var(--radius-pill)",
              }}
            >
              All
            </button>
            {visibleCategories.map(cat => (
              <button
                key={cat.id}
                type="button"
                aria-pressed={Number(categoryId) === cat.id}
                onClick={() => setLocation(`/categories?id=${cat.id}`)}
                className="px-4 py-1.5 text-xs uppercase tracking-wider whitespace-nowrap transition-all"
                style={{
                  background: Number(categoryId) === cat.id ? "var(--accent)" : "var(--surface-1)",
                  color: Number(categoryId) === cat.id ? "#000" : "var(--text-secondary)",
                  borderRadius: "var(--radius-pill)",
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Masonry product grid */}
      <div className="container mx-auto px-4 sm:px-6 pb-16">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 auto-rows-[200px] md:auto-rows-[240px]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-full skeleton-shimmer" style={{ borderRadius: "var(--radius-card)" }} />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No products match your search.</p>
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-2 md:grid-cols-3 gap-4 auto-rows-[200px] md:auto-rows-[240px]">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product, i) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.25 }}
                  className={`h-full ${i % 7 === 0 ? "row-span-2" : i % 7 === 3 ? "md:col-span-2" : ""}`}
                >
                  <ProductCard product={product} featured={i % 7 === 0} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
