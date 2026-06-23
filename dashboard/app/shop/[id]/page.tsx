"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Star, Truck, ShoppingCart, Minus, Plus, Package, Heart, Share2,
  Store, Banknote, Headset, CheckCircle2,
} from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import { httpClient } from "@/lib/api";
import type { Product, ProductReview, ApiResponse } from "@/lib/types";
import { cartFromStorage, cartToStorage } from "@/lib/products";
import { useLocale } from "@/contexts/LocaleContext";

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

function fmtReviewDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function getWishlist(): Set<number> {
  try { return new Set(JSON.parse(typeof window !== "undefined" ? (localStorage.getItem("mrunal_wishlist") || "[]") : "[]")); }
  catch { return new Set(); }
}
function saveWishlist(w: Set<number>) {
  if (typeof window !== "undefined") localStorage.setItem("mrunal_wishlist", JSON.stringify([...w]));
}

function WriteReviewModal({ productId, onClose, onSubmitted }: { productId: number; onClose: () => void; onSubmitted: () => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLocale();

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await httpClient.post(`/products/${productId}/reviews`, { rating, comment: comment.trim() || null });
      onSubmitted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("pd_could_not_submit_review"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-slate-800 mb-4">{t("pd_write_a_review")}</h3>
        <div className="flex gap-1 mb-4">
          {[1, 2, 3, 4, 5].map((s) => (
            <button key={s} onClick={() => setRating(s)}>
              <Star className={`w-7 h-7 ${s <= rating ? "fill-emerald-600 text-emerald-600" : "text-slate-200"}`} />
            </button>
          ))}
        </div>
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} placeholder={t("ordersd_review_placeholder")}
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">{t("pd_cancel")}</button>
          <button onClick={submit} disabled={submitting} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-colors">
            {submitting ? t("pd_submitting") : t("pd_submit")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const [product, setProduct] = useState<Product | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartQty, setCartQty] = useState(0);
  const [wishlisted, setWishlisted] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const { t } = useLocale();

  function loadReviews() {
    httpClient.get<ApiResponse<ProductReview[]>>(`/products/${id}/reviews`).then((res) => setReviews(res.data)).catch(() => {});
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([
      httpClient.get<ApiResponse<Product[]>>("/products"),
      httpClient.get<ApiResponse<ProductReview[]>>(`/products/${id}/reviews`),
    ]).then(([prodRes, reviewRes]) => {
      setAllProducts(prodRes.data);
      setProduct(prodRes.data.find((p) => p.id === id) ?? null);
      setReviews(reviewRes.data);
    }).finally(() => setLoading(false));

    const cart = cartFromStorage();
    setCartQty(cart.find((i) => i.product.id === id)?.qty ?? 0);
    setWishlisted(getWishlist().has(id));
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

  function buyNow() {
    if (!product) return;
    const cart = cartFromStorage();
    if (!cart.some((i) => i.product.id === product.id)) {
      cartToStorage([...cart, { product, qty: 1 }]);
    }
    router.push("/shop/checkout");
  }

  function toggleWishlist() {
    const w = getWishlist();
    if (w.has(id)) w.delete(id); else w.add(id);
    saveWishlist(w);
    setWishlisted(w.has(id));
  }

  async function share() {
    if (!product) return;
    const text = t("pd_share_text", { name: product.name, price: product.price.toFixed(0) });
    if (navigator.share) {
      try { await navigator.share({ text }); } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
    }
  }

  if (loading) {
    return (
      <DashboardShell breadcrumb={[{ label: t("shop_market_title"), href: "/shop" }, { label: t("pd_product_fallback") }]}>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  if (!product) {
    return (
      <DashboardShell breadcrumb={[{ label: t("shop_market_title"), href: "/shop" }, { label: t("pd_product_fallback") }]}>
        <div className="text-center py-24 text-slate-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold mb-2">{t("pd_product_not_found")}</p>
          <button onClick={() => router.push("/shop")} className="text-sm text-emerald-600 hover:underline">{t("pd_back_to_market_arrow")}</button>
        </div>
      </DashboardShell>
    );
  }

  const disc = product.original_price > product.price ? Math.round((1 - product.price / product.original_price) * 100) : 0;
  const similar = allProducts.filter((p) => p.category === product.category && p.id !== product.id);

  return (
    <DashboardShell breadcrumb={[{ label: t("shop_market_title"), href: "/shop" }, { label: product.name }]}>
      <div className="flex items-center justify-between mb-4 max-w-4xl">
        <button onClick={() => router.push("/shop")} className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700">
          <ArrowLeft className="w-4 h-4" /> {t("pd_back_to_market")}
        </button>
        <div className="flex items-center gap-2">
          <button onClick={toggleWishlist} className={`w-9 h-9 rounded-full flex items-center justify-center border transition-colors ${wishlisted ? "bg-red-50 border-red-200" : "border-slate-200 hover:bg-slate-50"}`}>
            <Heart className={`w-4 h-4 ${wishlisted ? "fill-red-500 text-red-500" : "text-slate-500"}`} />
          </button>
          <button onClick={share} className="w-9 h-9 rounded-full flex items-center justify-center border border-slate-200 hover:bg-slate-50">
            <Share2 className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl">
        <div>
          <div className="relative rounded-2xl overflow-hidden bg-white border border-slate-200" style={{ aspectRatio: "1/1" }}>
            <PImg src={product.image_url} alt={product.name} className="w-full h-full" />
            {disc > 0 && <span className="absolute top-4 left-4 bg-red-500 text-white text-sm font-bold px-2.5 py-1 rounded-lg">{t("pd_off", { n: disc })}</span>}
            {product.review_count > 0 && (
              <div className="absolute bottom-3 right-3 bg-white rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 shadow">
                <span className="text-sm font-semibold text-slate-800">{product.rating.toFixed(1)}</span>
                <Star className="w-3.5 h-3.5 fill-emerald-700 text-emerald-700" />
                <span className="text-xs text-slate-400">{fmtCount(product.review_count)}</span>
              </div>
            )}
          </div>
        </div>

        <div>
          {product.is_best_seller && <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full mb-3">{t("pd_best_seller")}</span>}
          <h1 className="text-2xl font-bold text-slate-800 mb-1">{product.name}</h1>
          <p className="text-sm text-slate-400 mb-4">{product.unit}</p>
          <div className="flex items-baseline gap-3 mb-5">
            <span className="text-3xl font-bold text-slate-800">₹{product.price.toLocaleString("en-IN")}</span>
            {product.original_price > product.price && (
              <>
                <span className="text-lg text-slate-400 line-through">₹{product.original_price.toLocaleString("en-IN")}</span>
                <span className="text-sm font-semibold text-orange-600">{t("pd_off", { n: disc })}</span>
              </>
            )}
          </div>

          <div className="border-t border-slate-100 pt-5 mb-5">
            <p className="text-sm font-semibold text-slate-800 mb-3">{t("pd_delivery_services")}</p>
            <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3 mb-3">
              <Truck className="w-4 h-4 text-slate-700 shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-800">{product.stock_quantity > 0 ? t("pd_free_delivery_by", { date: deliveryDate() }) : t("pd_out_of_stock")}</p>
                <p className="text-xs text-slate-400">{t("pd_on_orders_above")}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm text-slate-700">
              <p className="flex items-center gap-2.5"><Store className="w-4 h-4 text-slate-500" /> {t("pd_sold_by")}</p>
              <p className="flex items-center gap-2.5"><Banknote className="w-4 h-4 text-slate-500" /> {t("pd_cod_available")}</p>
              <p className="flex items-center gap-2.5"><Headset className="w-4 h-4 text-slate-500" /> {t("pd_contact_support")}</p>
            </div>
          </div>

          {product.description && (
            <div className="border-t border-slate-100 pt-5 mb-5">
              <p className="text-sm font-semibold text-slate-800 mb-2">{t("pd_product_details")}</p>
              <p className="text-sm text-slate-500 leading-relaxed">{product.description}</p>
            </div>
          )}

          {product.stock_quantity > 0 && product.stock_quantity <= 20 && (
            <p className="text-xs text-red-500 font-medium mb-4">{t("pd_only_left", { n: product.stock_quantity })}</p>
          )}

          <div className="flex gap-3 sticky bottom-4">
            <button onClick={buyNow} disabled={product.stock_quantity === 0}
              className="flex-1 py-3 border-2 border-slate-800 text-slate-800 font-bold rounded-xl transition-colors hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
              {t("pd_buy_now")}
            </button>
            {product.stock_quantity === 0 ? (
              <button disabled className="flex-1 py-3 bg-slate-100 text-slate-400 font-bold rounded-xl cursor-not-allowed">{t("pd_out_of_stock_btn")}</button>
            ) : cartQty > 0 ? (
              <div className="flex-1 flex items-center justify-between border-2 border-emerald-500 rounded-xl px-4">
                <button onClick={removeFromCart} className="text-emerald-600 hover:text-emerald-800"><Minus className="w-5 h-5" /></button>
                <span className="font-bold text-emerald-700">{t("pd_in_cart", { n: cartQty })}</span>
                <button onClick={addToCart} className="text-emerald-600 hover:text-emerald-800"><Plus className="w-5 h-5" /></button>
              </div>
            ) : (
              <button onClick={addToCart} className="flex-1 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
                <ShoppingCart className="w-4 h-4" /> {t("pd_add_to_bag")}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 mt-8 pt-6 max-w-4xl">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-slate-800">{t("pd_ratings_reviews")}</p>
          <button onClick={() => setShowReviewModal(true)} className="text-sm font-semibold text-emerald-600 hover:underline">{t("pd_write_a_review")}</button>
        </div>
        {product.review_count > 0 && (
          <div className="inline-flex items-center gap-1.5 bg-emerald-700 text-white rounded-lg px-2.5 py-1.5 mb-4">
            <span className="text-sm font-bold">{product.rating.toFixed(1)}</span>
            <Star className="w-3.5 h-3.5 fill-white" />
          </div>
        )}
        {reviews.length === 0 ? (
          <p className="text-sm text-slate-400">{t("pd_no_reviews_yet")}</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex items-center gap-1 bg-emerald-700 text-white text-xs font-bold px-2 py-0.5 rounded">
                    {r.rating} <Star className="w-3 h-3 fill-white" />
                  </span>
                  <span className="text-xs text-slate-400">{fmtReviewDate(r.created_at)}</span>
                </div>
                {r.comment && <p className="text-sm text-slate-700 mb-2">{r.comment}</p>}
                <p className="flex items-center gap-1.5 text-xs text-slate-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {r.user_name}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {similar.length > 0 && (
        <div className="border-t border-slate-100 mt-8 pt-6 max-w-4xl">
          <p className="text-sm font-semibold text-slate-800 mb-3">{t("pd_similar_products")}</p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {similar.map((p) => (
              <button key={p.id} onClick={() => router.push(`/shop/${p.id}`)}
                className="w-36 shrink-0 border border-slate-200 rounded-xl overflow-hidden text-left hover:shadow-md transition-shadow">
                <div className="h-24 bg-emerald-50 flex items-center justify-center text-2xl overflow-hidden">
                  <PImg src={p.image_url} alt={p.name} className="w-full h-full" />
                </div>
                <div className="p-2.5">
                  <p className="text-xs text-slate-700 line-clamp-1 mb-1">{p.name}</p>
                  <p className="text-sm font-semibold text-slate-800">₹{p.price.toLocaleString("en-IN")}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {showReviewModal && (
        <WriteReviewModal productId={product.id} onClose={() => setShowReviewModal(false)} onSubmitted={loadReviews} />
      )}
    </DashboardShell>
  );
}
