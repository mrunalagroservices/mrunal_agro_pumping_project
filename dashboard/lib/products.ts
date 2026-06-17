import type { Product } from "@/lib/types";

export type { Product };
export type CartItem = { product: Product; qty: number };

// Cart stored as full product snapshots (v2 key avoids conflict with old productId-only format)
const CART_KEY = "mrunal_cart_v2";

export function cartFromStorage(): CartItem[] {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(CART_KEY) : null;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Validate basic shape
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((i) => i?.product?.id && i?.qty > 0);
  } catch {
    return [];
  }
}

export function cartToStorage(cart: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}
