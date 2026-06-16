"use client";

import { useState, useMemo } from "react";
import {
  ShoppingCart, Search, Star, Truck, X,
  Plus, Minus, Trash2, Package,
} from "lucide-react";
import DashboardShell from "@/components/DashboardShell";

// ── Static product catalogue (mirrors mobile app) ─────────────────────────────
const CATEGORIES = ["All", "Seeds", "Fertilizers", "Irrigation", "Tools", "Pesticides", "Others"];

interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  originalPrice: number;
  rating: number;
  reviewCount: number;
  unit: string;
  isBestSeller?: boolean;
  emoji: string;
  color: string;
  bg: string;
}

const PRODUCTS: Product[] = [
  { id: 1, name: "Hybrid Tomato Seeds", description: "High-yield hybrid tomato seeds. Disease resistant, suitable for all seasons.", category: "Seeds", price: 149, originalPrice: 299, rating: 4.4, reviewCount: 2341, unit: "10g packet", isBestSeller: true, emoji: "🍅", color: "#16A34A", bg: "#DCFCE7" },
  { id: 2, name: "Onion Seeds (Nasik Red)", description: "Premium Nasik red onion seeds. High germination rate, 90-day variety.", category: "Seeds", price: 249, originalPrice: 399, rating: 4.2, reviewCount: 1892, unit: "500g", emoji: "🧅", color: "#9333EA", bg: "#F3E8FF" },
  { id: 3, name: "Wheat Seeds (HD-2967)", description: "Certified HD-2967 wheat seeds, high protein content, rust resistant.", category: "Seeds", price: 599, originalPrice: 799, rating: 4.6, reviewCount: 4120, unit: "5 kg bag", isBestSeller: true, emoji: "🌾", color: "#D97706", bg: "#FEF3C7" },
  { id: 4, name: "NPK Fertilizer 19-19-19", description: "Balanced NPK water-soluble fertilizer for all crops.", category: "Fertilizers", price: 650, originalPrice: 950, rating: 4.5, reviewCount: 3210, unit: "5 kg bag", isBestSeller: true, emoji: "🧪", color: "#0EA5E9", bg: "#E0F2FE" },
  { id: 5, name: "Organic Vermicompost", description: "100% organic vermicompost. Improves soil structure and water retention.", category: "Fertilizers", price: 450, originalPrice: 650, rating: 4.3, reviewCount: 1567, unit: "10 kg bag", emoji: "🌱", color: "#65A30D", bg: "#ECFCCB" },
  { id: 6, name: "DAP Fertilizer", description: "Di-ammonium phosphate for strong root development. Ideal for sowing time.", category: "Fertilizers", price: 1350, originalPrice: 1800, rating: 4.7, reviewCount: 5432, unit: "50 kg bag", isBestSeller: true, emoji: "⚗️", color: "#DC2626", bg: "#FEE2E2" },
  { id: 7, name: "Drip Irrigation Kit", description: "Complete drip irrigation kit for 1 acre. Includes main pipe, drippers, connectors.", category: "Irrigation", price: 2499, originalPrice: 3999, rating: 4.4, reviewCount: 890, unit: "1 acre kit", isBestSeller: true, emoji: "💧", color: "#0EA5E9", bg: "#E0F2FE" },
  { id: 8, name: "Sprinkler Set (8 heads)", description: "Rotating sprinkler set with 8 heads and 25m pipe.", category: "Irrigation", price: 899, originalPrice: 1299, rating: 4.1, reviewCount: 654, unit: "Set of 8", emoji: "🚿", color: "#0891B2", bg: "#CFFAFE" },
  { id: 9, name: "Garden Pressure Sprayer", description: "16-litre manual pressure sprayer with adjustable nozzle.", category: "Tools", price: 1299, originalPrice: 1999, rating: 4.3, reviewCount: 2100, unit: "16 litre", isBestSeller: true, emoji: "🪣", color: "#0369A1", bg: "#E0F2FE" },
  { id: 10, name: "Steel Garden Hoe", description: "Heavy duty steel garden hoe with wooden handle.", category: "Tools", price: 349, originalPrice: 549, rating: 4.0, reviewCount: 987, unit: "Single piece", emoji: "⛏️", color: "#78716C", bg: "#F5F5F4" },
  { id: 11, name: "Sickle (Stainless Steel)", description: "Stainless steel sickle with ergonomic grip. Rust-proof.", category: "Tools", price: 249, originalPrice: 399, rating: 4.2, reviewCount: 1234, unit: "Single piece", emoji: "🔧", color: "#374151", bg: "#F3F4F6" },
  { id: 12, name: "Imidacloprid Insecticide", description: "Systemic insecticide effective against sucking pests.", category: "Pesticides", price: 399, originalPrice: 599, rating: 4.5, reviewCount: 3456, unit: "250 ml", isBestSeller: true, emoji: "🧫", color: "#EA580C", bg: "#FFF7ED" },
  { id: 13, name: "Mancozeb Fungicide", description: "Broad spectrum fungicide for fruit, vegetable and field crops.", category: "Pesticides", price: 299, originalPrice: 450, rating: 4.3, reviewCount: 2109, unit: "500g", emoji: "💊", color: "#7C3AED", bg: "#F5F3FF" },
  { id: 14, name: "HDPE Mulch Film", description: "25-micron HDPE black mulch film. Controls weeds and conserves soil moisture.", category: "Others", price: 1800, originalPrice: 2500, rating: 4.2, reviewCount: 432, unit: "400m × 1.2m roll", emoji: "📦", color: "#374151", bg: "#F3F4F6" },
  { id: 15, name: "pH Soil Testing Kit", description: "Quick soil pH test kit with 100 test strips.", category: "Others", price: 299, originalPrice: 499, rating: 4.6, reviewCount: 1876, unit: "100 strips", isBestSeller: true, emoji: "🔬", color: "#0891B2", bg: "#CFFAFE" },
];

type CartItem = { product: Product; qty: number };

function fmtCount(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;
}

function deliveryDate() {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return t.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

// ── Product detail modal ──────────────────────────────────────────────────────
function ProductModal({ product, onClose, onAdd }: {
  product: Product; onClose: () => void; onAdd: () => void;
}) {
  const disc = Math.round((1 - product.price / product.originalPrice) * 100);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Image area */}
        <div className="h-48 flex items-center justify-center text-8xl relative" style={{ background: product.bg }}>
          {product.emoji}
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center hover:bg-white">
            <X className="w-4 h-4 text-slate-600" />
          </button>
          {disc > 0 && (
            <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg">{disc}% off</span>
          )}
        </div>

        <div className="p-6">
          {product.isBestSeller && (
            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full mb-3">
              ★ Best Seller
            </span>
          )}
          <h3 className="text-xl font-bold text-slate-800 mb-1">{product.name}</h3>
          <p className="text-sm text-slate-500 mb-4">{product.unit} · {product.category}</p>

          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-1 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded">
              <Star className="w-3 h-3 fill-white" /> {product.rating}
            </div>
            <span className="text-sm text-slate-500">{fmtCount(product.reviewCount)} ratings</span>
          </div>

          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-3xl font-bold text-slate-900">₹{product.price}</span>
            <span className="text-lg text-slate-400 line-through">₹{product.originalPrice}</span>
            <span className="text-sm font-bold text-green-600">{disc}% off</span>
          </div>

          <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3 mb-4">
            <Truck className="w-5 h-5 text-green-600 shrink-0" />
            <div>
              <p className="text-sm font-bold text-green-700">FREE 1-Day Delivery</p>
              <p className="text-xs text-green-600">Delivered by {deliveryDate()}</p>
            </div>
          </div>

          <p className="text-sm text-slate-600 mb-6 leading-relaxed">{product.description}</p>

          <button
            onClick={() => { onAdd(); onClose(); }}
            className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors"
          >
            <ShoppingCart className="w-5 h-5" /> Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Cart sidebar ──────────────────────────────────────────────────────────────
function CartSidebar({ items, onClose, onChange, onOrder }: {
  items: CartItem[];
  onClose: () => void;
  onChange: (id: number, delta: number) => void;
  onOrder: () => void;
}) {
  const total = items.reduce((s, i) => s + i.product.price * i.qty, 0);
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold">Your Cart ({items.length})</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
            <ShoppingCart className="w-12 h-12 opacity-30" />
            <p>Cart is empty</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {items.map(({ product: p, qty }) => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ background: p.bg }}>
                    {p.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{p.name}</p>
                    <p className="text-xs text-slate-500">₹{p.price} × {qty}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => onChange(p.id, -1)} className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50">
                      {qty === 1 ? <Trash2 className="w-3.5 h-3.5 text-red-400" /> : <Minus className="w-3.5 h-3.5" />}
                    </button>
                    <span className="w-6 text-center text-sm font-bold">{qty}</span>
                    <button onClick={() => onChange(p.id, 1)} className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-sm font-bold w-14 text-right shrink-0">₹{p.price * qty}</span>
                </div>
              ))}
            </div>

            <div className="px-5 py-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center gap-2 bg-green-50 rounded-xl px-3 py-2">
                <Truck className="w-4 h-4 text-green-600 shrink-0" />
                <p className="text-xs text-green-700 font-medium">
                  {total >= 499 ? `FREE delivery by ${deliveryDate()}` : `Add ₹${499 - total} more for FREE delivery`}
                </p>
              </div>
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span>₹{total.toLocaleString("en-IN")}</span>
              </div>
              <button
                onClick={onOrder}
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors"
              >
                Place Order
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ShopPage() {
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [ordered, setOrdered] = useState(false);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const filtered = useMemo(() => PRODUCTS.filter((p) => {
    const matchCat = category === "All" || p.category === category;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  }), [category, search]);

  function addToCart(product: Product) {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id);
      if (idx === -1) return [...prev, { product, qty: 1 }];
      const next = [...prev];
      next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
      return next;
    });
  }

  function changeQty(id: number, delta: number) {
    setCart((prev) =>
      prev.flatMap((i) => {
        if (i.product.id !== id) return [i];
        const newQty = i.qty + delta;
        return newQty <= 0 ? [] : [{ ...i, qty: newQty }];
      })
    );
  }

  function placeOrder() {
    setCart([]);
    setCartOpen(false);
    setOrdered(true);
    setTimeout(() => setOrdered(false), 5000);
  }

  return (
    <DashboardShell breadcrumb={[{ label: "Market" }]}>
      {/* Page header with cart */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Market</h1>
          <p className="text-sm text-slate-500">Quality farm essentials, delivered in 1 day</p>
        </div>
        <button
          onClick={() => setCartOpen(true)}
          className="relative flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <ShoppingCart className="w-4 h-4" />
          Cart
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* Order success banner */}
      {ordered && (
        <div className="mb-4 flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl">
          <span className="text-xl">🎉</span>
          <div>
            <p className="font-semibold">Order placed successfully!</p>
            <p className="text-sm">Your items will be delivered by {deliveryDate()}.</p>
          </div>
        </div>
      )}

      {/* 1-day delivery banner */}
      <div className="bg-gradient-to-r from-green-600 to-green-500 rounded-2xl px-6 py-4 mb-6 flex items-center gap-4">
        <Truck className="w-8 h-8 text-white shrink-0" />
        <div className="flex-1">
          <p className="text-white font-bold text-lg">FREE 1-Day Delivery</p>
          <p className="text-green-100 text-sm">On all orders above ₹499 · Delivered by {deliveryDate()}</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-white font-bold">{PRODUCTS.length}+ products</p>
          <p className="text-green-100 text-xs">Farm essentials</p>
        </div>
      </div>

      {/* Search + categories */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search seeds, fertilizers, tools…"
            className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-2 text-sm font-medium rounded-xl border transition-colors ${
                category === cat
                  ? "bg-green-600 text-white border-green-600"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50 bg-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <p className="text-sm text-slate-500 mb-4">{filtered.length} products</p>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No products found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((p) => {
            const disc = Math.round((1 - p.price / p.originalPrice) * 100);
            const inCart = cart.find((i) => i.product.id === p.id);
            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer flex flex-col"
                onClick={() => setDetailProduct(p)}
              >
                {/* Thumbnail */}
                <div className="h-32 flex items-center justify-center text-6xl relative" style={{ background: p.bg }}>
                  {p.emoji}
                  {disc > 0 && (
                    <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                      {disc}% off
                    </span>
                  )}
                  {p.isBestSeller && (
                    <span className="absolute top-2 right-2 bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                      ★ Best
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-3 flex flex-col flex-1">
                  <p className="text-xs text-slate-400 mb-0.5">{p.category}</p>
                  <p className="text-sm font-semibold text-slate-800 leading-tight line-clamp-2 mb-1">{p.name}</p>
                  <p className="text-xs text-slate-400 mb-2">{p.unit}</p>

                  {/* Rating */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="flex items-center gap-0.5 bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                      <Star className="w-2.5 h-2.5 fill-white" /> {p.rating}
                    </span>
                    <span className="text-[10px] text-slate-400">({fmtCount(p.reviewCount)})</span>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-1.5 mb-1">
                    <span className="font-bold text-slate-900">₹{p.price}</span>
                    <span className="text-xs text-slate-400 line-through">₹{p.originalPrice}</span>
                  </div>

                  {/* Delivery */}
                  <div className="flex items-center gap-1 mb-3">
                    <Truck className="w-3 h-3 text-green-600" />
                    <span className="text-[10px] text-green-700 font-medium">By {deliveryDate()}</span>
                  </div>

                  {/* Add button */}
                  <div className="mt-auto" onClick={(e) => e.stopPropagation()}>
                    {inCart ? (
                      <div className="flex items-center justify-between border border-green-500 rounded-xl px-2 py-1.5">
                        <button onClick={() => changeQty(p.id, -1)} className="text-green-600 hover:text-green-800">
                          {inCart.qty === 1 ? <Trash2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                        </button>
                        <span className="text-sm font-bold text-green-700">{inCart.qty}</span>
                        <button onClick={() => changeQty(p.id, 1)} className="text-green-600 hover:text-green-800">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(p)}
                        className="w-full py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl transition-colors"
                      >
                        Add to Cart
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {detailProduct && (
        <ProductModal
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
          onAdd={() => addToCart(detailProduct)}
        />
      )}
      {cartOpen && (
        <CartSidebar
          items={cart}
          onClose={() => setCartOpen(false)}
          onChange={changeQty}
          onOrder={placeOrder}
        />
      )}
    </DashboardShell>
  );
}
