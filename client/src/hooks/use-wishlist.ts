import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "wishlist_product_ids";

function readWishlist(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useWishlist() {
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

  return { ids, toggle, isWishlisted, count: ids.length };
}
