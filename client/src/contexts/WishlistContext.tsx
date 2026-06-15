import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

const STORAGE_KEY = "wishlist_product_ids";

function readWishlist(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

interface WishlistContextValue {
  ids: number[];
  toggle: (productId: number) => void;
  isWishlisted: (productId: number) => boolean;
  count: number;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<number[]>(readWishlist);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, [ids]);

  const toggle = useCallback((productId: number) => {
    setIds(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  }, []);

  const isWishlisted = useCallback(
    (productId: number) => ids.includes(productId),
    [ids]
  );

  return (
    <WishlistContext.Provider value={{ ids, toggle, isWishlisted, count: ids.length }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlistContext() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlistContext must be used inside WishlistProvider");
  return ctx;
}
