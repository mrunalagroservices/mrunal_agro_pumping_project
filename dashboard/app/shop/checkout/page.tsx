"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShoppingCart, MapPin, Plus, Minus, Trash2, CreditCard, Banknote,
  Smartphone, Tag, CheckCircle2, Truck, ArrowLeft, X, Lock,
} from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import { CartItem, cartFromStorage, cartToStorage } from "@/lib/products";
import { getSavedAddresses, SavedAddress } from "@/lib/savedAddresses";
import { httpClient } from "@/lib/api";
import type { ApiResponse, ShopSettings } from "@/lib/types";
import { useLocale } from "@/contexts/LocaleContext";

// ── Image fallback ─────────────────────────────────────────────────────────────
function PImg({ src, alt, className }: { src?: string | null; alt: string; className?: string }) {
  const [err, setErr] = useState(false);
  if (!src || err) return <div className={`flex items-center justify-center text-2xl bg-emerald-50 ${className}`}>🌿</div>;
  return <img src={src} alt={alt} className={`object-cover ${className}`} onError={() => setErr(true)} />;
}

function deliveryDate() {
  const t = new Date(); t.setDate(t.getDate() + 1);
  return t.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

type PayMethod = "cod" | "card" | "upi";

interface Address {
  name: string; phone: string; line1: string; line2: string;
  city: string; state: string; pincode: string;
}

const BLANK: Address = { name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" };
const STATES = [
  "Andhra Pradesh","Bihar","Chhattisgarh","Gujarat","Haryana","Himachal Pradesh",
  "Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Odisha","Punjab",
  "Rajasthan","Tamil Nadu","Telangana","Uttar Pradesh","Uttarakhand","West Bengal",
];

// ── Success Screen ─────────────────────────────────────────────────────────────
function SuccessScreen({ orderId, total, onContinue }: { orderId: number; total: number; onContinue: () => void }) {
  const { t } = useLocale();
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
        <CheckCircle2 className="w-12 h-12 text-emerald-600" />
      </div>
      <h2 className="text-2xl font-black text-slate-800 mb-2">{t("co_order_placed")}</h2>
      <p className="text-slate-500 mb-1">{t("co_order_confirmed")}</p>
      <p className="text-xs text-slate-400 mb-1">{t("co_order_id")} <span className="font-mono font-bold text-emerald-600">#{orderId}</span></p>
      <p className="text-emerald-600 font-semibold text-sm mb-8">{t("co_expected_delivery", { date: deliveryDate() })}</p>
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8 text-left space-y-2 text-sm text-slate-600 w-72 shadow-sm">
        <p>{t("co_order_confirmed_detail", { id: orderId, total: total.toLocaleString("en-IN") })}</p>
        <p>{t("co_dispatched_tomorrow")}</p>
        <p>{t("co_team_will_call")}</p>
      </div>
      <div className="flex gap-3">
        <button onClick={onContinue} className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full transition-colors">
          {t("co_continue_shopping")}
        </button>
        <button onClick={() => window.location.href = "/orders"} className="px-8 py-3 border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-bold rounded-full transition-colors">
          {t("co_view_my_orders")}
        </button>
      </div>
    </div>
  );
}

// ── Main Checkout Page ─────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [savedAddrs, setSavedAddrs] = useState<SavedAddress[]>([]);
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null);
  const [addr, setAddr] = useState<Address>(BLANK);
  const [showAddrForm, setShowAddrForm] = useState(false);
  // Card/UPI are temporarily disabled pending Razorpay integration — COD is
  // the only completable payment method for now.
  const payMethod: PayMethod = "cod";
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<null | { code: string; type: "percent" | "flat"; value: number; discount: number }>(null);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState("");
  const [placedOrderId, setPlacedOrderId] = useState<number | null>(null);
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);

  useEffect(() => {
    const c = cartFromStorage();
    if (c.length === 0) { router.replace("/shop"); return; }
    setCart(c);
    const addrs = getSavedAddresses();
    setSavedAddrs(addrs);
    const def = addrs.find((a) => a.isDefault);
    if (def) {
      setSelectedSavedId(def.id);
      setAddr({ name: def.name, phone: def.phone, line1: def.line1, line2: def.line2, city: def.city, state: def.state, pincode: def.pincode });
    }
    // Load shop settings for delivery charge
    httpClient.get<ApiResponse<ShopSettings>>("/shop-settings")
      .then((res) => setShopSettings(res.data))
      .catch(() => {});
  }, []);

  function changeQty(id: number, delta: number) {
    const next = cart.flatMap((i) => {
      if (i.product.id !== id) return [i];
      const q = i.qty + delta;
      return q <= 0 ? [] : [{ ...i, qty: q }];
    });
    setCart(next);
    cartToStorage(next);
  }

  const subtotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0);
  const deliveryCharge = 0;
  const discount = appliedCoupon?.discount ?? 0;
  const total = Math.max(0, subtotal + deliveryCharge - discount);

  function pickSaved(sa: SavedAddress) {
    if (selectedSavedId === sa.id) { setSelectedSavedId(null); setAddr(BLANK); setShowAddrForm(false); }
    else { setSelectedSavedId(sa.id); setAddr({ name: sa.name, phone: sa.phone, line1: sa.line1, line2: sa.line2, city: sa.city, state: sa.state, pincode: sa.pincode }); setShowAddrForm(false); }
  }

  async function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    setCouponError("");
    try {
      const res = await httpClient.post<ApiResponse<{ coupon: { code: string; type: "percent" | "flat"; value: number }; discount: number }>>("/shop-settings/validate-coupon", { code, subtotal });
      setAppliedCoupon({ code, type: res.data.coupon.type, value: res.data.coupon.value, discount: res.data.discount });
    } catch (err: unknown) {
      setCouponError(err instanceof Error ? err.message : t("co_invalid_coupon"));
    } finally {
      setCouponLoading(false);
    }
  }

  const addrComplete = addr.name && addr.phone.replace(/\D/g, "").length >= 7 && addr.line1 && addr.city && addr.state && addr.pincode.length === 6;
  const payComplete = true; // only COD is selectable right now

  async function placeOrder() {
    setPlaceError("");
    setPlacing(true);
    try {
      const res = await httpClient.post<ApiResponse<{ id: number }>>("/orders", {
        payment_method: payMethod,
        delivery_address: addr,
        coupon_code: appliedCoupon?.code || null,
        subtotal,
        delivery_charge: deliveryCharge,
        discount,
        total,
        items: cart.map((i) => ({
          product_id: i.product.id,
          product_name: i.product.name,
          product_image: i.product.image_url || null,
          category: i.product.category,
          unit: i.product.unit || null,
          price: i.product.price,
          original_price: i.product.original_price,
          qty: i.qty,
        })),
      });
      cartToStorage([]);
      setPlacedOrderId(res.data.id);
    } catch (err: unknown) {
      setPlaceError(err instanceof Error ? err.message : t("co_order_failed"));
    } finally {
      setPlacing(false);
    }
  }

  const inp = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition bg-white";

  if (placedOrderId !== null) {
    return (
      <DashboardShell breadcrumb={[{ label: t("shop_market_title"), href: "/shop" }, { label: t("co_checkout_title") }]}>
        <SuccessScreen orderId={placedOrderId} total={total} onContinue={() => router.push("/shop")} />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell breadcrumb={[{ label: t("shop_market_title"), href: "/shop" }, { label: t("co_checkout_title") }]}>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/shop")} className="flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-600 transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t("co_back_to_market")}
        </button>
        <h1 className="text-2xl font-black text-slate-800">{t("co_checkout_title")}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Col 1: Address ─────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">{t("co_delivery_address")}</h2>
              <button onClick={() => { setShowAddrForm(true); setSelectedSavedId(null); }}
                className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700">
                <Plus className="w-3.5 h-3.5" /> {t("co_new_address")}
              </button>
            </div>

            {savedAddrs.length === 0 && !showAddrForm ? (
              <div className="flex flex-col items-center py-8 px-6 text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                  <MapPin className="w-6 h-6 text-slate-400" />
                </div>
                <p className="font-semibold text-slate-700 mb-1">{t("co_no_address_saved")}</p>
                <p className="text-xs text-slate-400 mb-4">{t("co_add_address_track")}</p>
                <button onClick={() => setShowAddrForm(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-full transition-colors">
                  {t("co_add_new_address")}
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {savedAddrs.map((sa) => (
                  <button key={sa.id} onClick={() => pickSaved(sa)}
                    className={`w-full flex items-start gap-3 px-5 py-4 text-left transition-colors ${selectedSavedId === sa.id ? "bg-emerald-50" : "hover:bg-slate-50"}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${selectedSavedId === sa.id ? "bg-emerald-100" : "bg-slate-100"}`}>
                      <MapPin className={`w-4 h-4 ${selectedSavedId === sa.id ? "text-emerald-600" : "text-slate-400"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${selectedSavedId === sa.id ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>{sa.label}</span>
                        {sa.isDefault && <span className="text-[10px] font-semibold text-amber-600">{t("co_default_badge")}</span>}
                      </div>
                      <p className="text-sm font-semibold text-slate-800">{sa.name} · {sa.phone}</p>
                      <p className="text-xs text-slate-500 line-clamp-1">{sa.line1}, {sa.city}, {sa.state} – {sa.pincode}</p>
                    </div>
                    {selectedSavedId === sa.id && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-1" />}
                  </button>
                ))}
              </div>
            )}

            {showAddrForm && (
              <div className="px-5 py-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-bold text-slate-700">{t("co_enter_new_address")}</p>
                  <button onClick={() => setShowAddrForm(false)}><X className="w-4 h-4 text-slate-400" /></button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">{t("co_name_required")}</label>
                    <input className={inp} value={addr.name} onChange={(e) => setAddr((a) => ({ ...a, name: e.target.value }))} placeholder={t("co_full_name")} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">{t("co_phone_required")}</label>
                    <input className={inp} type="tel" maxLength={15} value={addr.phone} onChange={(e) => setAddr((a) => ({ ...a, phone: e.target.value }))} placeholder={t("co_phone_number")} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{t("co_address_required")}</label>
                  <input className={inp} value={addr.line1} onChange={(e) => setAddr((a) => ({ ...a, line1: e.target.value }))} placeholder={t("co_address_placeholder")} />
                </div>
                <input className={inp} value={addr.line2} onChange={(e) => setAddr((a) => ({ ...a, line2: e.target.value }))} placeholder={t("co_landmark_optional")} />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">{t("co_city_required")}</label>
                    <input className={inp} value={addr.city} onChange={(e) => setAddr((a) => ({ ...a, city: e.target.value }))} placeholder={t("co_city_placeholder")} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">{t("co_pincode_required")}</label>
                    <input className={inp} type="tel" maxLength={6} value={addr.pincode} onChange={(e) => setAddr((a) => ({ ...a, pincode: e.target.value }))} placeholder="411001" />
                  </div>
                </div>
                <select className={inp} value={addr.state} onChange={(e) => setAddr((a) => ({ ...a, state: e.target.value }))}>
                  <option value="">{t("co_select_state")}</option>
                  {STATES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3">
            <Truck className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-bold text-emerald-800">{t("co_delivery_by", { date: deliveryDate() })}</p>
              <p className="text-xs text-emerald-600">{t("co_cod_free")}</p>
            </div>
          </div>
        </div>

        {/* ── Col 2: Payment + Cart Items ────────────────────────── */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">{t("co_choose_payment")}</h2>
            </div>
            <div className="p-4 space-y-3">
              {/* COD — the only completable option right now */}
              <label className="flex items-center gap-3 border-2 border-emerald-500 bg-emerald-50 rounded-xl p-3.5 cursor-pointer">
                <input type="radio" className="accent-emerald-600 w-4 h-4" checked readOnly />
                <Banknote className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">{t("co_cod")}</p>
                  <p className="text-xs text-emerald-600 font-medium">{t("co_cod_pay_when")}</p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </label>

              {/* Card — disabled until Razorpay is wired in */}
              <div className="flex items-center gap-3 border-2 border-slate-100 bg-slate-50 rounded-xl p-3.5 opacity-60 cursor-not-allowed">
                <input type="radio" className="w-4 h-4" disabled />
                <CreditCard className="w-5 h-5 text-slate-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-500">{t("co_debit_credit_card")}</p>
                  <p className="text-xs text-slate-400">Visa, Mastercard, RuPay</p>
                </div>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-200 px-2 py-1 rounded-full">{t("co_coming_soon")}</span>
              </div>

              {/* UPI — disabled until Razorpay is wired in */}
              <div className="flex items-center gap-3 border-2 border-slate-100 bg-slate-50 rounded-xl p-3.5 opacity-60 cursor-not-allowed">
                <input type="radio" className="w-4 h-4" disabled />
                <Smartphone className="w-5 h-5 text-slate-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-500">{t("co_upi_label")}</p>
                  <p className="text-xs text-slate-400">{t("co_upi_sub")}</p>
                </div>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-200 px-2 py-1 rounded-full">{t("co_coming_soon")}</span>
              </div>
            </div>
          </div>

          {/* Cart items */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">
                {cart.length === 1 ? t("co_cart_count_one", { n: cart.length }) : t("co_cart_count_other", { n: cart.length })}
              </h2>
              <p className="text-xs text-slate-400">{t("co_review_before_checkout")}</p>
            </div>
            <div className="divide-y divide-slate-100">
              {cart.map(({ product: p, qty }) => (
                <div key={p.id} className="flex items-center gap-3 px-5 py-4">
                  <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-slate-100">
                    <PImg src={p.image_url} alt={p.name} className="w-full h-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 line-clamp-1">{p.name}</p>
                    <p className="text-xs text-slate-400">{t("co_per_item", { unit: p.unit ?? "", price: p.price })}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => changeQty(p.id, -1)} className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-600">
                      {qty === 1 ? <Trash2 className="w-3.5 h-3.5 text-red-400" /> : <Minus className="w-3 h-3" />}
                    </button>
                    <span className="w-5 text-center text-sm font-bold text-slate-800">{qty}</span>
                    <button onClick={() => changeQty(p.id, 1)} className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-600">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-sm font-bold text-slate-800 w-16 text-right shrink-0">₹{(p.price * qty).toLocaleString("en-IN")}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Col 3: Coupon + Summary ─────────────────────────────── */}
        <div className="space-y-4">
          {/* Coupon */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Tag className="w-4 h-4 text-emerald-600" /> {t("co_discount_code")}</h2>
            {appliedCoupon ? (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-emerald-700">{appliedCoupon.code}</p>
                  <p className="text-xs text-emerald-600 font-semibold">{t("co_saved_check", { n: appliedCoupon.discount })}</p>
                </div>
                <button onClick={() => { setAppliedCoupon(null); setCouponInput(""); }} className="text-red-400 hover:text-red-600 ml-2">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input className={`${inp} flex-1`} value={couponInput}
                    onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                    placeholder={t("co_enter_coupon")} />
                  <button onClick={applyCoupon} disabled={couponLoading || !couponInput.trim()}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors">
                    {couponLoading ? "…" : t("co_apply")}
                  </button>
                </div>
                {couponError && <p className="text-xs text-red-500 mt-1.5">{couponError}</p>}
                {shopSettings?.coupons?.length ? (
                  <p className="text-xs text-slate-400 mt-2">
                    {t("co_available_coupons", { codes: shopSettings.coupons.filter((c) => c.is_active).map((c) => c.code).join(" · ") })}
                  </p>
                ) : null}
              </>
            )}
          </div>

          {/* Order summary */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-bold text-slate-800 mb-4">{t("co_order_summary")}</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>{t("co_subtotal_items", { n: cart.reduce((s, i) => s + i.qty, 0) })}</span>
                <span>₹{subtotal.toLocaleString("en-IN")}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>{t("co_discount_with_code", { code: appliedCoupon?.code ?? "" })}</span>
                  <span>−₹{discount}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>{t("co_shipping")}</span>
                <span className={deliveryCharge === 0 ? "text-emerald-600 font-semibold" : ""}>{deliveryCharge === 0 ? t("co_free") : `₹${deliveryCharge}`}</span>
              </div>
              <div className="border-t border-slate-200 pt-3 flex justify-between font-black text-base text-slate-900">
                <span>{t("co_total")}</span>
                <span>₹{total.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
              {["VISA", "MC", "UPI", "Cash"].map((m) => (
                <span key={m} className="text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-500 rounded">{m}</span>
              ))}
            </div>

            {placeError && (
              <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2.5 rounded-xl">{placeError}</div>
            )}

            <button
              disabled={!addrComplete || !payComplete || placing || cart.length === 0}
              onClick={placeOrder}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors text-base"
            >
              {placing ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {t("co_processing")}</>
              ) : (
                <><Lock className="w-4 h-4" /> {t("co_checkout_amount", { total: total.toLocaleString("en-IN") })}</>
              )}
            </button>
            {(!addrComplete || !payComplete) && (
              <p className="text-center text-xs text-slate-400 mt-2">
                {!addrComplete ? t("co_add_address_continue") : t("co_complete_payment_continue")}
              </p>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
