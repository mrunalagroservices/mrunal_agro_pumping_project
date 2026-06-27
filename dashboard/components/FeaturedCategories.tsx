"use client";

import { Package } from "lucide-react";
import { Product } from "@/lib/types";

// Circular category-icon row (grocery-storefront style). No dedicated
// per-category image field exists yet, so each tile borrows the image of
// that category's first product — admin can change what shows here simply
// by reordering/re-imaging products, no separate category-image admin UI
// needed.
export default function FeaturedCategories({
  categories,
  products,
  selected,
  onSelect,
}: {
  categories: string[];
  products: Product[];
  selected: string | null;
  onSelect: (category: string | null) => void;
}) {
  if (categories.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold text-slate-800 mb-3">Featured Categories</h2>
      <div className="flex gap-5 overflow-x-auto pb-2 -mx-1 px-1">
        {categories.map((cat) => {
          const catProducts = products.filter((p) => p.category === cat);
          const thumb = catProducts.find((p) => p.is_best_seller)?.image_url ?? catProducts[0]?.image_url;
          const isSelected = selected === cat;
          return (
            <button
              key={cat}
              onClick={() => onSelect(isSelected ? null : cat)}
              className="flex flex-col items-center gap-2 shrink-0 w-20 group"
            >
              <div
                className={`w-16 h-16 rounded-full overflow-hidden flex items-center justify-center border-2 transition-colors ${
                  isSelected ? "border-emerald-500" : "border-transparent group-hover:border-emerald-200"
                } bg-emerald-50`}
              >
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt={cat} className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-6 h-6 text-emerald-300" />
                )}
              </div>
              <span className={`text-xs text-center leading-tight ${isSelected ? "text-emerald-700 font-bold" : "text-slate-600 font-medium"}`}>
                {cat}
              </span>
              <span className="text-[10px] text-slate-400">{catProducts.length} items</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
