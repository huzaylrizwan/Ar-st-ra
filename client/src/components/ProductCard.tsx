import { Link } from "wouter";
import { type Product } from "@shared/schema";
import { motion } from "framer-motion";
import { Eye } from "lucide-react";

export function ProductCard({ product }: { product: Product }) {
  const mainImage = product.images?.[0] || "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80"; // Fallback sofa image

  return (
    <Link href={`/products/${product.id}`} className="block group">
      <div className="relative aspect-[4/5] overflow-hidden bg-muted/30 rounded-sm mb-4">
        {/* Image */}
        <motion.img 
          src={mainImage} 
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
        
        {/* Quick Action */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
          <div className="bg-white/90 backdrop-blur text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
            <Eye className="w-3 h-3" /> View Details
          </div>
        </div>
      </div>
      
      <div className="text-center space-y-1">
        <h3 className="font-serif text-lg text-foreground group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        <p className="text-sm font-medium text-muted-foreground">
          ${(product.price / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </p>
      </div>
    </Link>
  );
}
