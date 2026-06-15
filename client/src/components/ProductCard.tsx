import { Link } from "wouter";
import { type Product } from "@shared/schema";
import { motion } from "framer-motion";
import { Box } from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import { WishlistButton } from "@/components/WishlistButton";
import { Skeleton } from "@/components/ui/skeleton";

interface ProductCardProps {
  product: Product;
  featured?: boolean; // taller card in masonry grid
}

export function ProductCard({ product, featured = false }: ProductCardProps) {
  const { data: settings } = useSettings();
  const currencySymbol = settings?.currencySymbol ?? "PKR";
  const mainImage = product.images?.[0] || "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80";

  const hasModel = false; // will be enhanced in Plan 3 with productModels check

  return (
    <Link href={`/products/${product.id}`} className="block group" data-testid={`product-card-${product.id}`}>
      <motion.div
        className="relative overflow-hidden"
        style={{
          borderRadius: "var(--radius-card)",
          background: "var(--surface-1)",
          boxShadow: "var(--shadow-card)",
          aspectRatio: featured ? "3/4" : "1/1",
        }}
        whileHover={{
          y: -6,
          boxShadow: "var(--shadow-glow)",
          transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
        }}
      >
        {/* Image */}
        <img
          src={mainImage}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          style={{ position: "absolute", inset: 0 }}
        />

        {/* Top badges */}
        <div className="absolute top-3 left-3 flex gap-2 z-10">
          {product.stockStatus === "out_of_stock" && (
            <span className="text-[9px] uppercase tracking-wider px-2.5 py-1 font-semibold"
              style={{ background: "rgba(239,68,68,0.9)", color: "#fff", borderRadius: "var(--radius-pill)" }}>
              Unavailable
            </span>
          )}
          {product.stockStatus === "made_to_order" && (
            <span className="text-[9px] uppercase tracking-wider px-2.5 py-1 font-semibold"
              style={{ background: "rgba(245,158,11,0.9)", color: "#fff", borderRadius: "var(--radius-pill)" }}>
              Made to Order
            </span>
          )}
          {hasModel && (
            <span className="text-[9px] uppercase tracking-wider px-2.5 py-1 font-semibold flex items-center gap-1"
              style={{ background: "rgba(120,100,255,0.85)", color: "#fff", borderRadius: "var(--radius-pill)" }}>
              <Box className="w-2.5 h-2.5" /> AR
            </span>
          )}
        </div>

        {/* Wishlist button */}
        <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <WishlistButton productId={product.id} />
        </div>

        {/* Glass info strip at bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 p-4 glass"
          style={{ borderRadius: "0 0 var(--radius-card) var(--radius-card)" }}
        >
          <h3 className="font-semibold text-sm leading-tight line-clamp-1 mb-0.5"
            style={{ fontFamily: "var(--font-serif)", color: "var(--text-primary)" }}>
            {product.name}
          </h3>
          <p className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
            {currencySymbol} {Math.round(product.price / 100).toLocaleString()}
          </p>
        </div>
      </motion.div>
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div style={{ borderRadius: "var(--radius-card)", overflow: "hidden" }}>
      <Skeleton className="w-full aspect-square" />
    </div>
  );
}
