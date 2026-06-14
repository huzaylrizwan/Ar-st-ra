import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import type { Product } from "@shared/schema";

export type SortOption = "default" | "price_asc" | "price_desc" | "name_asc" | "name_desc";

interface CollectionsFilterProps {
  products: Product[];
  search: string;
  onSearchChange: (v: string) => void;
  priceRange: [number, number];
  onPriceRangeChange: (v: [number, number]) => void;
  priceMin: number;
  priceMax: number;
  selectedColors: string[];
  onColorToggle: (color: string) => void;
  sort: SortOption;
  onSortChange: (v: SortOption) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

export function CollectionsFilter({
  products, search, onSearchChange, priceRange, onPriceRangeChange,
  priceMin, priceMax, selectedColors, onColorToggle, sort, onSortChange,
  onClear, hasActiveFilters,
}: CollectionsFilterProps) {
  const allColors = Array.from(new Set(products.flatMap(p => p.colors)));

  return (
    <div className="flex flex-wrap items-center gap-3 py-4 border-b border-border mb-6">
      {/* Search */}
      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search products…"
          className="pl-9"
        />
      </div>

      {/* Price range */}
      {priceMax > priceMin && (
        <div className="flex items-center gap-2 min-w-[200px]">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            ${Math.round(priceRange[0] / 100).toLocaleString()} – ${Math.round(priceRange[1] / 100).toLocaleString()}
          </span>
          <Slider
            min={priceMin}
            max={priceMax}
            step={100}
            value={priceRange}
            onValueChange={(v) => onPriceRangeChange(v as [number, number])}
            className="w-32"
          />
        </div>
      )}

      {/* Color filters */}
      {allColors.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {allColors.map(color => (
            <button
              key={color}
              onClick={() => onColorToggle(color)}
              title={color}
              className={`w-6 h-6 rounded-full border-2 transition-all ${
                selectedColors.includes(color)
                  ? "border-primary scale-110 shadow-md"
                  : "border-transparent hover:border-muted-foreground/50"
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      )}

      {/* Sort */}
      <Select value={sort} onValueChange={(v) => onSortChange(v as SortOption)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">Default</SelectItem>
          <SelectItem value="price_asc">Price: Low → High</SelectItem>
          <SelectItem value="price_desc">Price: High → Low</SelectItem>
          <SelectItem value="name_asc">Name: A → Z</SelectItem>
          <SelectItem value="name_desc">Name: Z → A</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClear} className="gap-1 text-muted-foreground">
          <X className="w-3 h-3" /> Clear
        </Button>
      )}
    </div>
  );
}

export function applyFilters(
  products: Product[],
  search: string,
  priceRange: [number, number],
  selectedColors: string[],
  sort: SortOption,
): Product[] {
  let result = products.filter(p => {
    const matchesSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());

    const matchesPrice = p.price >= priceRange[0] && p.price <= priceRange[1];

    const matchesColor = selectedColors.length === 0 ||
      selectedColors.some(c => p.colors.includes(c));

    return matchesSearch && matchesPrice && matchesColor;
  });

  switch (sort) {
    case "price_asc":  result.sort((a, b) => a.price - b.price); break;
    case "price_desc": result.sort((a, b) => b.price - a.price); break;
    case "name_asc":   result.sort((a, b) => a.name.localeCompare(b.name)); break;
    case "name_desc":  result.sort((a, b) => b.name.localeCompare(a.name)); break;
    default: break;
  }

  return result;
}
