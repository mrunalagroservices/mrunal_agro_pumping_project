"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Star, Truck, ShoppingCart, Minus, Plus, Package } from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import { httpClient } from "@/lib/api";
import type { Product, ApiResponse } from "@/lib/types";
import { cartFromStorage, cartToStorage } from "@/lib/products";

function PImg({ src, alt, className }: { src?: string | null; alt: string; className?: string }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <div className={`flex items-center justify-center text-6xl bg-emerald-50 ${className}`}>
        🌿
      </div>
    );
  }
  return <img src={src} alt={alt} className={`object-cover ${className}`} onError={() => setErr(true)} />;
}

function fmtCount(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`; }

function deliveryDate() {
  const t = new Date(); t.setDate(t.getDate() + 1);
  return t.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [cartQty, setCartQty] = useState(0);

  useEffect(() => {
    httpClient.get<ApiResponse<Product[]>>("/products")
      .then((res) => {
        const found = res.data.find((p) => p.id === id) ?? null;
        setProduct(found);
      })
      .finally(() => setLoading(false));

    const cart = cartFromStorage();
    setCartQty(cart.find((i) => i.product.id === id)?.qty ?? 0);
  }, [id]);

  function addToCart() {
    if (!product) return;
    const cart = cartFromStorage();
    const idx = cart.findIndex((i) => i.product.id === product.id);
    const next = idx === -1
      ? [...cart, { product, qty: 1 }]
      : cart.map((i, n) => (n === idx ? { ...i, qty: i.qty + 1 } : i));
    cartToStorage(next);
    setCartQty((q) => q + 1);
  }

  function removeFromCart() {
    if (!product) return;
    const cart = cartFromStorage();
    const next = cart.flatMap((i) => {
      if (i.product.id !== product.id) return [i];
      return i.qty <= 1 ? [] : [{ ...i, qty: i.qty - 1 }];
    });
    cartToStorage(next);
    setCartQty((q) => Math.max(0, q - 1));
  }

  if (loading) {
    return (
      <DashboardShell breadcrumb={[{ label: "Market", href: "/shop" }, { label: "Product" }]}>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  if (!product) {
    return (
      <DashboardShell breadcrumb={[{ label: "Market", href: "/shop" }, { label: "Product" }]}>
        <div className="text-center py-24 text-slate-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold mb-2">Product not found</p>
          <button onClick={() => router.push("/shop")} className="text-sm text-emerald-600 hover:underline">← Back to Market</button>
        </div>
      </DashboardShell>
    );
  }

  const disc = product.original_price > product.price ? Math.round((1 - product.price / product.original_price) * 100) : 0;

  return (
    <DashboardShell breadcrumb={[{ label: "Market", href: "/shop" }, { label: product.name }]}>
      <button onClick={() => router.push("/shop")} className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Market
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl">
        <div className="relative rounded-2xl overflow-hidden bg-white border border-slate-200" style={{ aspectRatio: "1/1" }}>
          <PImg src={product.image_url} alt={product.name} className="w-full h-full" />
          {disc > 0 && <span className="absolute top-4 left-4 bg-red-500 text-white text-sm font-bold px-2.5 py-1 rounded-lg">{disc}% off</span>}
        </div>

        <div>
          {product.is_best_seller && <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full mb-3">★ Best Seller</span>}
          <h1 className="text-2xl font-bold text-slate-800 mb-1">{product.name}</h1>
          <p className="text-sm text-slate-400 mb-4">{product.unit} · {product.category}</p>
          <div className="flex items-center gap-2 mb-5">
            <span className="flex items-center gap-0.5 bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded">
              <Star className="w-3 h-3 fill-white" /> {product.rating}
            </span>
            <span className="text-xs text-slate-400">{fmtCount(product.review_count)} ratings</span>
          </div>
          <div className="flex items-baseline gap-3 mb-5">
            <span className="text-3xl font-bold text-emerald-600">₹{product.price.toLocaleString("en-IN")}</span>
            {product.original_price > product.price && (
              <span className="text-lg text-slate-400 line-through">₹{product.original_price.toLocaleString("en-IN")}</span>
            )}
          </div>
          {product.description && <p className="text-sm text-slate-600 mb-6 leading-relaxed">{product.description}</p>}
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 mb-6">
            <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-700 font-medium">Delivered by <strong>{deliveryDate()}</strong></p>
          </div>

          {product.stock_quantity === 0 ? (
            <button disabled className="w-full py-3.5 bg-slate-100 text-slate-400 font-bold rounded-xl cursor-not-allowed">Out of Stock</button>
          ) : cartQty > 0 ? (
            <div className="flex items-center justify-between border-2 border-emerald-500 rounded-xl px-4 py-3">
              <button onClick={removeFromCart} className="text-emerald-600 hover:text-emerald-800"><Minus className="w-5 h-5" /></button>
              <span className="font-bold text-emerald-700">{cartQty} in cart</span>
              <button onClick={addToCart} className="text-emerald-600 hover:text-emerald-800"><Plus className="w-5 h-5" /></button>
            </div>
          ) : (
            <button onClick={addToCart} className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
              <ShoppingCart className="w-4 h-4" /> Add to Cart
            </button>
          )}
          {product.stock_quantity > 0 && product.stock_quantity <= 20 && (
            <p className="text-xs text-red-500 font-medium mt-2">Only {product.stock_quantity} left!</p>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
