import { Heart } from "lucide-react";
import { useWishlist } from "@/hooks/use-wishlist";
import { cn } from "@/lib/utils";

interface WishlistButtonProps {
  productId: number;
  className?: string;
}

export function WishlistButton({ productId, className }: WishlistButtonProps) {
  const { toggle, isWishlisted } = useWishlist();
  const active = isWishlisted(productId);

  return (
    <button
      type="button"
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(productId);
      }}
      className={cn(
        "w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200",
        "glass hover:scale-110 active:scale-95",
        className
      )}
    >
      <Heart
        className="w-4 h-4 transition-colors duration-200"
        style={{
          color: active ? "#e11d48" : "var(--text-secondary)",
          fill: active ? "#e11d48" : "none",
        }}
      />
    </button>
  );
}
