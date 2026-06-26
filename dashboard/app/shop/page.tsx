"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ShoppingCart, Search, Star, X, Plus, Minus,
  Heart, ChevronDown, ChevronUp, SlidersHorizontal, Package, Trash2, ClipboardList,
} from "lucide-react";
import MarketShell from "@/components/MarketShell";
import BannerCarousel from "@/components/BannerCarousel";
import type { Product, ShopSettings, ApiResponse, Banner } from "@/lib/types";
import { CartItem, cartFromStorage, cartToStorage } from "@/lib/products";
import { httpClient } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";

const DEFAULT_SETTINGS: ShopSettings = {
  price_range: { min: 0, max: 5000 },
  rating_options: [0, 3.5, 4, 4.5],
  categories: ["Seeds", "Fertilizers", "Irrigation", "Tools", "Pesticides", "Others"],
  delivery_charge_online: 100,
  coupons: [],
};

// ── Image fallback ─────────────────────────────────────────────────────────────
function PImg({ src, alt, className }: { src?: string | null; alt: string; className?: string }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <div className={`flex items-center justify-center text-4xl bg-emerald-50 ${className}`}>
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

// ── Filter Section ─────────────────────────────────────────────────────────────
function Section({ title, open, toggle, children }: { title: string; open: boolean; toggle: () => void; children: React.ReactNode }) {
  return (
    <div className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
      <button className="flex items-center justify-between w-full py-3 text-sm font-semibold text-slate-800" onClick={toggle}>
        {title}
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && children}
    </div>
  );
}

// ── Filter Sidebar ─────────────────────────────────────────────────────────────
function FilterSidebar({ categories, ratingOptions, priceRange, products, selectedCats, onCatToggle, minPrice, maxPrice, onPriceChange, minRating, onRatingChange, onClear }: {
  categories: string[]; ratingOptions: number[]; priceRange: { min: number; max: number };
  products: Product[];
  selectedCats: string[]; onCatToggle: (c: string) => void;
  minPrice: number; maxPrice: number; onPriceChange: (mn: number, mx: number) => void;
  minRating: number; onRatingChange: (r: number) => void; onClear: () => void;
}) {
  const [catOpen, setCatOpen] = useState(true);
  const [priceOpen, setPriceOpen] = useState(true);
  const [ratingOpen, setRatingOpen] = useState(true);
  const { t } = useLocale();
  const catCounts = categories.reduce((acc, c) => { acc[c] = products.filter((p) => p.category === c).length; return acc; }, {} as Record<string, number>);
  const dirty = selectedCats.length > 0 || minPrice > priceRange.min || maxPrice < priceRange.max || minRating > 0;
  const inp = "w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sticky top-4 w-56">
      <div className="flex items-center justify-between mb-4">
        <p className="font-bold text-slate-800 flex items-center gap-2"><SlidersHorizontal className="w-4 h-4" /> {t("shop_filter")}</p>
        {dirty && <button onClick={onClear} className="text-xs text-emerald-600 font-semibold hover:underline">{t("shop_clear_all")}</button>}
      </div>
      <Section title={t("shop_category")} open={catOpen} toggle={() => setCatOpen((o) => !o)}>
        <div className="space-y-2.5 mt-1">
          {categories.map((c) => (
            <label key={c} className="flex items-center justify-between cursor-pointer group">
              <div className="flex items-center gap-2.5">
                <input type="checkbox" checked={selectedCats.includes(c)} onChange={() => onCatToggle(c)} className="accent-emerald-600 w-3.5 h-3.5" />
                <span className={`text-sm ${selectedCats.includes(c) ? "text-emerald-700 font-semibold" : "text-slate-600 group-hover:text-slate-800"}`}>{c}</span>
              </div>
              <span className="text-xs text-slate-400 bg-slate-50 rounded-full px-1.5">{catCounts[c] ?? 0}</span>
            </label>
          ))}
        </div>
      </Section>
      <Section title={t("shop_price_range")} open={priceOpen} toggle={() => setPriceOpen((o) => !o)}>
        <div className="flex gap-2 mt-2">
          <div className="flex-1">
            <p className="text-[10px] text-slate-400 mb-1">{t("shop_min_rs")}</p>
            <input type="number" className={inp} value={minPrice} min={priceRange.min} onChange={(e) => onPriceChange(Number(e.target.value), maxPrice)} />
          </div>
          <div className="flex-1">
            <p className="text-[10px] text-slate-400 mb-1">{t("shop_max_rs")}</p>
            <input type="number" className={inp} value={maxPrice} min={1} onChange={(e) => onPriceChange(minPrice, Number(e.target.value))} />
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">{t("shop_range_label", { min: priceRange.min, max: priceRange.max.toLocaleString("en-IN") })}</p>
      </Section>
      <Section title={t("shop_min_rating")} open={ratingOpen} toggle={() => setRatingOpen((o) => !o)}>
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {ratingOptions.map((r) => (
            <button key={r} onClick={() => onRatingChange(r)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${minRating === r ? "bg-emerald-600 text-white border-emerald-600" : "border-slate-200 text-slate-600 hover:border-emerald-300"}`}>
              {r === 0 ? t("shop_all") : <><Star className="w-3 h-3 fill-current" /> {r}+</>}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ── Product Card ───────────────────────────────────────────────────────────────
function ProductCard({ product: p, inCart, wishlisted, onOpen, onAdd, onRemove, onWishlist }: {
  product: Product; inCart: number; wishlisted: boolean;
  onOpen: () => void; onAdd: (e: React.MouseEvent) => void;
  onRemove: (e: React.MouseEvent) => void; onWishlist: (e: React.MouseEvent) => void;
}) {
  const disc = p.original_price > p.price ? Math.round((1 - p.price / p.original_price) * 100) : 0;
  const { t } = useLocale();
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col group" onClick={onOpen}>
      <div className="relative overflow-hidden" style={{ aspectRatio: "4/3" }}>
        <PImg src={p.image_url} alt={p.name} className="w-full h-full transition-transform duration-300 group-hover:scale-105" />
        <div className="absolute top-2 left-2">
          {p.is_best_seller
            ? <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{t("shop_best_seller")}</span>
            : <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{t("shop_new_arrival")}</span>}
        </div>
        {disc > 0 && <span className="absolute top-2 right-9 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">{disc}%</span>}
        <button onClick={onWishlist} className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-sm transition-colors ${wishlisted ? "bg-red-50" : "bg-white/80 hover:bg-white"}`}>
          <Heart className={`w-3.5 h-3.5 ${wishlisted ? "fill-red-500 text-red-500" : "text-slate-400"}`} />
        </button>
      </div>
      <div className="p-3 flex flex-col flex-1">
        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-0.5">{p.category}</p>
        <p className="text-sm font-semibold text-slate-800 line-clamp-2 leading-snug mb-1 flex-1">{p.name}</p>
        <p className="text-[11px] text-slate-400 mb-2">{p.unit}</p>
        <div className="flex items-center gap-1 mb-2">
          <span className="flex items-center gap-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
            <Star className="w-2.5 h-2.5 fill-emerald-600" /> {p.rating}
          </span>
          <span className="text-[10px] text-slate-400">({fmtCount(p.review_count)})</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-base font-bold text-emerald-600">₹{p.price.toLocaleString("en-IN")}</span>
          <span className="text-xs text-slate-400 line-through">₹{p.original_price.toLocaleString("en-IN")}</span>
        </div>
        {p.stock_quantity <= 20 && p.stock_quantity > 0 && <p className="text-[10px] text-red-500 font-medium mt-0.5">{t("shop_only_left", { n: p.stock_quantity })}</p>}
        {p.stock_quantity === 0 && <p className="text-[10px] text-red-600 font-bold mt-0.5">{t("shop_out_of_stock")}</p>}
      </div>
      <div className="px-3 pb-3" onClick={(e) => e.stopPropagation()}>
        {inCart > 0 ? (
          <div className="flex items-center justify-between border-2 border-emerald-500 rounded-xl px-3 py-1.5">
            <button onClick={onRemove} className="text-emerald-600">
              {inCart === 1 ? <Trash2 className="w-3.5 h-3.5 text-red-400" /> : <Minus className="w-3.5 h-3.5" />}
            </button>
            <span className="text-sm font-bold text-emerald-700">{inCart}</span>
            <button onClick={onAdd} className="text-emerald-600"><Plus className="w-3.5 h-3.5" /></button>
          </div>
        ) : (
          <button onClick={onAdd} disabled={p.stock_quantity === 0}
            className="w-full py-2 border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-600 hover:text-white text-xs font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            {p.stock_quantity === 0 ? t("shop_out_of_stock_btn") : t("shop_add_to_cart")}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ShopPage() {
  const router = useRouter();
  const { t } = useLocale();
  const { isAuthenticated } = useAuth();

  // Browsing is open to anyone; adding to cart/wishlist or checking out
  // requires an account — redirect there and back instead of silently failing.
  function requireLogin(): boolean {
    if (isAuthenticated) return true;
    router.push(`/login?redirect=${encodeURIComponent("/shop")}`);
    return false;
  }

  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<ShopSettings>(DEFAULT_SETTINGS);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  const [cart, setCart] = useState<CartItem[]>(() => cartFromStorage());
  const [wishlist, setWishlist] = useState<Set<number>>(() => {
    try { return new Set(JSON.parse(typeof window !== "undefined" ? (localStorage.getItem("mrunal_wishlist") || "[]") : "[]")); }
    catch { return new Set(); }
  });

  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(5000);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState("popular");
  const [search, setSearch] = useState("");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const searchLogTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0);

  // Load products + settings on mount
  useEffect(() => {
    Promise.all([
      httpClient.get<ApiResponse<Product[]>>("/products"),
      httpClient.get<ApiResponse<ShopSettings>>("/shop-settings"),
    ]).then(([prodRes, settingsRes]) => {
      setProducts(prodRes.data);
      const s = settingsRes.data;
      setSettings(s);
      setMinPrice(s.price_range?.min ?? 0);
      setMaxPrice(s.price_range?.max ?? 5000);
    }).catch(() => {
      // Silently fall back to empty products and default settings
    }).finally(() => setLoading(false));

    // Best-effort: a banner-fetch failure shouldn't take down the products grid.
    httpClient.get<ApiResponse<Banner[]>>("/banners")
      .then((res) => setBanners(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => { cartToStorage(cart); }, [cart]);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("mrunal_wishlist", JSON.stringify([...wishlist]));
  }, [wishlist]);

  // Log search (debounced 1.5 s, only if >= 2 chars)
  const logSearch = useCallback((q: string, count: number) => {
    if (searchLogTimer.current) clearTimeout(searchLogTimer.current);
    if (q.trim().length < 2) return;
    searchLogTimer.current = setTimeout(() => {
      httpClient.post("/search/log", { query: q.trim(), results_count: count }).catch(() => {});
    }, 1500);
  }, []);

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      if (selectedCats.length > 0 && !selectedCats.includes(p.category)) return false;
      if (p.price < minPrice || p.price > maxPrice) return false;
      if (p.rating < minRating) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    if (sortBy === "price_asc") list = [...list].sort((a, b) => a.price - b.price);
    else if (sortBy === "price_desc") list = [...list].sort((a, b) => b.price - a.price);
    else if (sortBy === "rating") list = [...list].sort((a, b) => b.rating - a.rating);
    else if (sortBy === "discount") list = [...list].sort((a, b) => (b.original_price - b.price) - (a.original_price - a.price));
    return list;
  }, [products, selectedCats, minPrice, maxPrice, minRating, sortBy, search]);

  // Curated row at the top of the homepage — admin marks products as "Best
  // Seller" from the Products admin page (no separate curation step needed).
  const bestSellers = useMemo(() => products.filter((p) => p.is_best_seller).slice(0, 10), [products]);

  // Log search whenever filtered changes due to search term
  useEffect(() => {
    if (search) logSearch(search, filtered.length);
  }, [search, filtered.length, logSearch]);

  function addToCart(product: Product) {
    if (!requireLogin()) return;
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id);
      if (idx === -1) return [...prev, { product, qty: 1 }];
      const next = [...prev]; next[idx] = { ...next[idx], qty: next[idx].qty + 1 }; return next;
    });
  }
  function removeFromCart(id: number) {
    setCart((prev) => prev.flatMap((i) => {
      if (i.product.id !== id) return [i];
      return i.qty <= 1 ? [] : [{ ...i, qty: i.qty - 1 }];
    }));
  }
  function toggleWishlist(id: number) {
    if (!requireLogin()) return;
    setWishlist((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function cartQty(id: number) { return cart.find((i) => i.product.id === id)?.qty ?? 0; }
  function clearFilters() {
    setSelectedCats([]);
    setMinPrice(settings.price_range?.min ?? 0);
    setMaxPrice(settings.price_range?.max ?? 5000);
    setMinRating(0);
  }
  function toggleCat(c: string) { setSelectedCats((p) => p.includes(c) ? p.filter((x) => x !== c) : [...p, c]); }

  return (
    <MarketShell breadcrumb={[{ label: t("shop_market_title") }]}>
      {/* Hero Banner — admin-managed sliding carousel (Admin → Banners), falls
          back to a static hero if no banners are configured yet */}
      {banners.length > 0 ? (
        <BannerCarousel banners={banners} />
      ) : (
        <div className="relative -mx-4 lg:-mx-6 -mt-4 lg:-mt-6 mb-8 overflow-hidden rounded-b-2xl" style={{ height: 240 }}>
          <img src="https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=1400&h=400&q=80"
            alt="Farm" className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/85 via-slate-900/50 to-transparent flex items-center">
            <div className="px-8 lg:px-12 max-w-lg">
              <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-2">{t("shop_hero_tag")}</p>
              <h1 className="text-white text-3xl lg:text-4xl font-black leading-tight mb-3">{t("shop_hero_title")}</h1>
              <p className="text-slate-300 text-sm mb-5">{settings.categories.join(" · ")}</p>
              <button onClick={() => document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" })}
                className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-5 py-2.5 rounded-full text-sm transition-colors">
                {t("shop_shop_now")}
              </button>
            </div>
          </div>
          <div className="absolute bottom-3 right-4 hidden lg:flex items-center gap-4 text-white/70 text-xs font-medium">
            <span>{t("shop_trusted_shipping")}</span>
            <span>{t("shop_easy_returns")}</span>
            <span>{t("shop_secure_shopping")}</span>
          </div>
        </div>
      )}

      {/* Search + Cart bar */}
      <div className="flex items-center gap-3 mb-6 flex-wrap" id="products-section">
        <div className="relative flex-1 min-w-48 max-w-lg">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("shop_search_placeholder")}
            className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-full text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>}
        </div>
        <button onClick={() => setMobileFilterOpen(true)} className="lg:hidden flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-full text-sm font-medium bg-white text-slate-600 shadow-sm">
          <SlidersHorizontal className="w-4 h-4" /> {t("shop_filter")}
        </button>
        <button onClick={() => { if (requireLogin()) router.push("/orders"); }}
          className="flex items-center gap-2 px-4 py-2.5 border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-semibold rounded-full hover:bg-emerald-100 transition-colors">
          <ClipboardList className="w-4 h-4" /> {t("shop_my_orders")}
        </button>
        <button onClick={() => { if (requireLogin()) router.push("/shop/checkout"); }}
          className="relative flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-full transition-colors shadow-sm">
          <ShoppingCart className="w-4 h-4" /> {t("shop_cart")}
          {cartCount > 0 && <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{cartCount}</span>}
        </button>
      </div>

      {/* Best Sellers — curated horizontal row, Amazon/Myntra homepage style */}
      {bestSellers.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-800 mb-3">{t("shop_best_seller")}</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-thin">
            {bestSellers.map((p) => (
              <div key={p.id} className="w-44 shrink-0 snap-start">
                <ProductCard product={p} inCart={cartQty(p.id)} wishlisted={wishlist.has(p.id)}
                  onOpen={() => router.push(`/shop/${p.id}`)}
                  onAdd={(e) => { e.stopPropagation(); addToCart(p); }}
                  onRemove={(e) => { e.stopPropagation(); removeFromCart(p.id); }}
                  onWishlist={(e) => { e.stopPropagation(); toggleWishlist(p.id); }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mobile filter drawer */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileFilterOpen(false)} />
          <div className="relative w-72 bg-white h-full overflow-y-auto p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-slate-800">{t("shop_filters_title")}</p>
              <button onClick={() => setMobileFilterOpen(false)}><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <FilterSidebar categories={settings.categories} ratingOptions={settings.rating_options} priceRange={settings.price_range}
              products={products} selectedCats={selectedCats} onCatToggle={toggleCat}
              minPrice={minPrice} maxPrice={maxPrice} onPriceChange={(a, b) => { setMinPrice(a); setMaxPrice(b); }}
              minRating={minRating} onRatingChange={setMinRating} onClear={clearFilters} />
            <button onClick={() => setMobileFilterOpen(false)} className="mt-4 w-full py-3 bg-emerald-600 text-white font-bold rounded-xl">
              {t("shop_view_n_products", { n: filtered.length })}
            </button>
          </div>
        </div>
      )}

      {/* Main layout */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex gap-6">
          <div className="hidden lg:block">
            <FilterSidebar categories={settings.categories} ratingOptions={settings.rating_options} priceRange={settings.price_range}
              products={products} selectedCats={selectedCats} onCatToggle={toggleCat}
              minPrice={minPrice} maxPrice={maxPrice} onPriceChange={(a, b) => { setMinPrice(a); setMaxPrice(b); }}
              minRating={minRating} onRatingChange={setMinRating} onClear={clearFilters} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-base font-bold text-slate-800">
                  {filtered.length === 1 ? t("shop_result_one", { n: filtered.length }) : t("shop_result_other", { n: filtered.length })}
                </p>
                {(selectedCats.length > 0 || search) && (
                  <p className="text-xs text-slate-400">{search && `"${search}"`}{selectedCats.length > 0 && ` · ${selectedCats.join(", ")}`}</p>
                )}
              </div>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                className="border border-slate-200 rounded-full px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700 shadow-sm">
                <option value="popular">{t("shop_sort_popular")}</option>
                <option value="price_asc">{t("shop_sort_price_asc")}</option>
                <option value="price_desc">{t("shop_sort_price_desc")}</option>
                <option value="rating">{t("shop_sort_rating")}</option>
                <option value="discount">{t("shop_sort_discount")}</option>
              </select>
            </div>

            {cartCount > 0 && (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                    <ShoppingCart className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-800">
                      {cartCount === 1
                        ? t("shop_items_in_cart_one", { n: cartCount, total: cartTotal.toLocaleString("en-IN") })
                        : t("shop_items_in_cart_other", { n: cartCount, total: cartTotal.toLocaleString("en-IN") })}
                    </p>
                    <p className="text-xs text-emerald-600">{t("shop_deliver_by", { date: deliveryDate() })}</p>
                  </div>
                </div>
                <button onClick={() => { if (requireLogin()) router.push("/shop/checkout"); }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-full transition-colors">
                  {t("shop_checkout_arrow")}
                </button>
              </div>
            )}

            {products.length === 0 && !loading ? (
              <div className="text-center py-24 text-slate-400">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-semibold mb-2">{t("shop_no_products_available")}</p>
                <p className="text-sm">{t("shop_ask_admin")}</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-24 text-slate-400">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-semibold mb-2">{t("shop_no_products_found")}</p>
                <button onClick={clearFilters} className="text-sm text-emerald-600 hover:underline">{t("shop_clear_filters")}</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map((p) => (
                  <ProductCard key={p.id} product={p} inCart={cartQty(p.id)} wishlisted={wishlist.has(p.id)}
                    onOpen={() => router.push(`/shop/${p.id}`)}
                    onAdd={(e) => { e.stopPropagation(); addToCart(p); }}
                    onRemove={(e) => { e.stopPropagation(); removeFromCart(p.id); }}
                    onWishlist={(e) => { e.stopPropagation(); toggleWishlist(p.id); }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </MarketShell>
  );
}
