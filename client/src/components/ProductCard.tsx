import { Link } from "wouter";
import { type Product } from "@shared/schema";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useSettings } from "@/hooks/use-settings";

export function ProductCard({ product }: { product: Product }) {
  const { data: settings } = useSettings();
  const currencySymbol = settings?.currencySymbol ?? "$";
  const mainImage = product.images?.[0] || "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80"; // Fallback sofa image

  return (
    <Link href={`/products/${product.id}`} className="block group" data-testid={`product-card-${product.id}`}>
      <div className="relative aspect-square overflow-hidden bg-muted/20 rounded-2xl sm:rounded-xl mb-2 sm:mb-4">
        {/* Image */}
        <motion.img 
          src={mainImage} 
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
        
        {/* Quick Add Button - Mobile friendly */}
        <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
          <button 
            className="w-8 h-8 sm:w-10 sm:h-10 bg-foreground text-background rounded-full flex items-center justify-center shadow-lg"
            data-testid={`button-quick-view-${product.id}`}
            aria-label="Quick view product"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
      
      <div className="space-y-0.5 sm:space-y-1 px-1">
        <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Furniture</p>
        <h3 className="font-serif text-sm sm:text-base text-foreground group-hover:text-primary transition-colors leading-tight line-clamp-1">
          {product.name}
        </h3>
        <p className="text-sm sm:text-base font-semibold text-foreground">
          {currencySymbol}{Math.round(product.price / 100).toLocaleString()}
        </p>
      </div>
    </Link>
  );
}
