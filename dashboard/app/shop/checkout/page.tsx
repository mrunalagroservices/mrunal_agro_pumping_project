"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShoppingCart, MapPin, Plus, Minus, Trash2, CreditCard, Banknote,
  Smartphone, Tag, CheckCircle2, Truck, ArrowLeft, X, Star, Lock,
} from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import { CartItem, COUPONS, cartFromStorage, cartToStorage, PRODUCTS } from "@/lib/products";
import { getSavedAddresses, SavedAddress } from "@/lib/savedAddresses";

// ── Image with emoji fallback ──────────────────────────────────────────────────
function PImg({ src, alt, bg, emoji, className }: { src: string; alt: string; bg: string; emoji: string; className?: string }) {
  const [err, setErr] = useState(false);
  if (err) return <div className={`flex items-center justify-center text-2xl ${className}`} style={{ background: bg }}>{emoji}</div>;
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
const STATES = ["Andhra Pradesh","Bihar","Chhattisgarh","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Odisha","Punjab","Rajasthan","Tamil Nadu","Telangana","Uttar Pradesh","Uttarakhand","West Bengal"];

// ── Success Screen ─────────────────────────────────────────────────────────────
function SuccessScreen({ total, onContinue }: { total: number; onContinue: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-24 h-24 bg-teal-50 rounded-full flex items-center justify-center mb-6">
        <CheckCircle2 className="w-12 h-12 text-teal-600" />
      </div>
      <h2 className="text-2xl font-black text-slate-800 mb-2">Order Placed!</h2>
      <p className="text-slate-500 mb-1">Your order has been confirmed.</p>
      <p className="text-teal-600 font-semibold text-sm mb-8">Expected delivery by <strong>{deliveryDate()}</strong></p>
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8 text-left space-y-2 text-sm text-slate-600 w-72 shadow-sm">
        <p className="flex items-center gap-2">📦 Order confirmed · ₹{total.toLocaleString("en-IN")} paid</p>
        <p className="flex items-center gap-2">🚚 Will be dispatched by tomorrow</p>
        <p className="flex items-center gap-2">📞 Our team will call before delivery</p>
      </div>
      <button onClick={onContinue} className="px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-full transition-colors">
        Continue Shopping
      </button>
    </div>
  );
}

// ── Main Checkout Page ─────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [savedAddrs, setSavedAddrs] = useState<SavedAddress[]>([]);
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null);
  const [addr, setAddr] = useState<Address>(BLANK);
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [payMethod, setPayMethod] = useState<PayMethod>("cod");
  const [cardNum, setCardNum] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [upiId, setUpiId] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<null | { code: string; type: "percent" | "fixed"; value: number; desc: string }>(null);
  const [couponError, setCouponError] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false);

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
  const deliveryCharge = payMethod !== "cod" ? 100 : 0;

  function calcDiscount(sub: number) {
    if (!appliedCoupon) return 0;
    return appliedCoupon.type === "percent" ? Math.round(sub * appliedCoupon.value / 100) : appliedCoupon.value;
  }
  const discount = calcDiscount(subtotal);
  const total = subtotal + deliveryCharge - discount;

  function pickSaved(sa: SavedAddress) {
    if (selectedSavedId === sa.id) { setSelectedSavedId(null); setAddr(BLANK); setShowAddrForm(false); }
    else { setSelectedSavedId(sa.id); setAddr({ name: sa.name, phone: sa.phone, line1: sa.line1, line2: sa.line2, city: sa.city, state: sa.state, pincode: sa.pincode }); setShowAddrForm(false); }
  }

  function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    const def = COUPONS[code];
    if (!def) { setCouponError("Invalid coupon code"); return; }
    if (def.min && subtotal < def.min) { setCouponError(`Minimum order ₹${def.min} required`); return; }
    setAppliedCoupon({ code, ...def }); setCouponError("");
  }

  const addrComplete = addr.name && addr.phone.replace(/\D/g, "").length >= 7 && addr.line1 && addr.city && addr.state && addr.pincode.length === 6;
  const payComplete = payMethod === "cod" || (payMethod === "upi" && upiId.includes("@")) || (payMethod === "card" && cardNum.replace(/\s/g, "").length === 16 && cardExpiry && cardCvv.length >= 3);

  async function placeOrder() {
    setPlacing(true);
    await new Promise((r) => setTimeout(r, 1500));
    cartToStorage([]);
    setPlacing(false);
    setPlaced(true);
  }

  const inp = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition bg-white";

  if (placed) {
    return (
      <DashboardShell breadcrumb={[{ label: "Market", href: "/shop" }, { label: "Checkout" }]}>
        <SuccessScreen total={total} onContinue={() => router.push("/shop")} />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell breadcrumb={[{ label: "Market", href: "/shop" }, { label: "Checkout" }]}>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/shop")} className="flex items-center gap-2 text-sm text-slate-500 hover:text-teal-600 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Market
        </button>
        <h1 className="text-2xl font-black text-slate-800">Checkout</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Col 1: Address ─────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">Delivery Address</h2>
              <button onClick={() => { setShowAddrForm(true); setSelectedSavedId(null); }}
                className="flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700">
                <Plus className="w-3.5 h-3.5" /> New Address
              </button>
            </div>

            {savedAddrs.length === 0 && !showAddrForm ? (
              <div className="flex flex-col items-center py-8 px-6 text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                  <MapPin className="w-6 h-6 text-slate-400" />
                </div>
                <p className="font-semibold text-slate-700 mb-1">No address saved</p>
                <p className="text-xs text-slate-400 mb-4">Add an address to track your delivery</p>
                <button onClick={() => setShowAddrForm(true)}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-full transition-colors">
                  + Add New Address
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {savedAddrs.map((sa) => (
                  <button key={sa.id} onClick={() => pickSaved(sa)}
                    className={`w-full flex items-start gap-3 px-5 py-4 text-left transition-colors ${selectedSavedId === sa.id ? "bg-teal-50" : "hover:bg-slate-50"}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${selectedSavedId === sa.id ? "bg-teal-100" : "bg-slate-100"}`}>
                      <MapPin className={`w-4 h-4 ${selectedSavedId === sa.id ? "text-teal-600" : "text-slate-400"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${selectedSavedId === sa.id ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"}`}>{sa.label}</span>
                        {sa.isDefault && <span className="text-[10px] font-semibold text-amber-600">★ Default</span>}
                      </div>
                      <p className="text-sm font-semibold text-slate-800">{sa.name} · {sa.phone}</p>
                      <p className="text-xs text-slate-500 line-clamp-1">{sa.line1}, {sa.city}, {sa.state} – {sa.pincode}</p>
                    </div>
                    {selectedSavedId === sa.id && <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0 mt-1" />}
                  </button>
                ))}
              </div>
            )}

            {/* New address form */}
            {showAddrForm && (
              <div className="px-5 py-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-bold text-slate-700">Enter new address</p>
                  <button onClick={() => setShowAddrForm(false)}><X className="w-4 h-4 text-slate-400" /></button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Name *</label>
                    <input className={inp} value={addr.name} onChange={(e) => setAddr((a) => ({ ...a, name: e.target.value }))} placeholder="Full name" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Phone *</label>
                    <input className={inp} type="tel" maxLength={15} value={addr.phone} onChange={(e) => setAddr((a) => ({ ...a, phone: e.target.value }))} placeholder="Phone number" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Address *</label>
                  <input className={inp} value={addr.line1} onChange={(e) => setAddr((a) => ({ ...a, line1: e.target.value }))} placeholder="House no., Street, Village" />
                </div>
                <input className={inp} value={addr.line2} onChange={(e) => setAddr((a) => ({ ...a, line2: e.target.value }))} placeholder="Landmark (optional)" />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">City *</label>
                    <input className={inp} value={addr.city} onChange={(e) => setAddr((a) => ({ ...a, city: e.target.value }))} placeholder="City" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Pincode *</label>
                    <input className={inp} type="tel" maxLength={6} value={addr.pincode} onChange={(e) => setAddr((a) => ({ ...a, pincode: e.target.value }))} placeholder="411001" />
                  </div>
                </div>
                <select className={inp} value={addr.state} onChange={(e) => setAddr((a) => ({ ...a, state: e.target.value }))}>
                  <option value="">Select state *</option>
                  {STATES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Delivery note */}
          <div className="flex items-center gap-3 bg-teal-50 border border-teal-100 rounded-2xl px-4 py-3">
            <Truck className="w-5 h-5 text-teal-600 shrink-0" />
            <div>
              <p className="text-sm font-bold text-teal-800">Delivery by {deliveryDate()}</p>
              <p className="text-xs text-teal-600">COD: Free delivery · Online payment: ₹100</p>
            </div>
          </div>
        </div>

        {/* ── Col 2: Payment + Cart Items ────────────────────────── */}
        <div className="space-y-4">
          {/* Payment methods */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">Choose how to pay</h2>
            </div>
            <div className="p-4 space-y-3">
              {/* COD */}
              <label className={`flex items-center gap-3 border-2 rounded-xl p-3.5 cursor-pointer transition-colors ${payMethod === "cod" ? "border-teal-500 bg-teal-50" : "border-slate-200 hover:border-slate-300"}`}>
                <input type="radio" className="accent-teal-600 w-4 h-4" checked={payMethod === "cod"} onChange={() => setPayMethod("cod")} />
                <Banknote className="w-5 h-5 text-teal-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">Cash on Delivery</p>
                  <p className="text-xs text-teal-600 font-medium">Free delivery · Pay when you receive</p>
                </div>
                {payMethod === "cod" && <CheckCircle2 className="w-5 h-5 text-teal-600" />}
              </label>

              {/* Card */}
              <div className={`border-2 rounded-xl cursor-pointer transition-colors ${payMethod === "card" ? "border-teal-500 bg-teal-50" : "border-slate-200 hover:border-slate-300"}`}>
                <label className="flex items-center gap-3 p-3.5 cursor-pointer" onClick={() => setPayMethod("card")}>
                  <input type="radio" className="accent-teal-600 w-4 h-4" checked={payMethod === "card"} onChange={() => setPayMethod("card")} />
                  <CreditCard className="w-5 h-5 text-blue-600 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">Debit / Credit Card</p>
                    <p className="text-xs text-slate-500">Visa, Mastercard, RuPay · +₹100 delivery</p>
                  </div>
                  {payMethod === "card" && <CheckCircle2 className="w-5 h-5 text-teal-600" />}
                </label>
                {payMethod === "card" && (
                  <div className="px-4 pb-4 space-y-2" onClick={(e) => e.stopPropagation()}>
                    <input className={inp} value={cardNum} maxLength={19}
                      onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 16); setCardNum(v.replace(/(.{4})/g, "$1 ").trim()); }}
                      placeholder="1234 5678 9012 3456" />
                    <div className="grid grid-cols-2 gap-2">
                      <input className={inp} value={cardExpiry} maxLength={5}
                        onChange={(e) => { let v = e.target.value.replace(/\D/g, ""); if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2); setCardExpiry(v); }}
                        placeholder="MM/YY" />
                      <input className={inp} type="password" value={cardCvv} maxLength={4} onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ""))} placeholder="CVV" />
                    </div>
                  </div>
                )}
              </div>

              {/* UPI */}
              <div className={`border-2 rounded-xl cursor-pointer transition-colors ${payMethod === "upi" ? "border-teal-500 bg-teal-50" : "border-slate-200 hover:border-slate-300"}`}>
                <label className="flex items-center gap-3 p-3.5 cursor-pointer" onClick={() => setPayMethod("upi")}>
                  <input type="radio" className="accent-teal-600 w-4 h-4" checked={payMethod === "upi"} onChange={() => setPayMethod("upi")} />
                  <Smartphone className="w-5 h-5 text-purple-600 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">UPI / GPay / PhonePe</p>
                    <p className="text-xs text-slate-500">+₹100 delivery charge</p>
                  </div>
                  {payMethod === "upi" && <CheckCircle2 className="w-5 h-5 text-teal-600" />}
                </label>
                {payMethod === "upi" && (
                  <div className="px-4 pb-4" onClick={(e) => e.stopPropagation()}>
                    <input className={inp} value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="yourname@upi" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cart items */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">Cart · {cart.length} items</h2>
              <p className="text-xs text-slate-400">Check your products before checkout</p>
            </div>
            <div className="divide-y divide-slate-100">
              {cart.map(({ product: p, qty }) => (
                <div key={p.id} className="flex items-center gap-3 px-5 py-4">
                  <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-slate-100">
                    <PImg src={p.image} alt={p.name} bg={p.bg} emoji={p.emoji} className="w-full h-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 line-clamp-1">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.unit} · ₹{p.price} per item</p>
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

        {/* ── Col 3: Summary + Place Order ───────────────────────── */}
        <div className="space-y-4">
          {/* Coupon */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Tag className="w-4 h-4 text-teal-600" /> Discount Code</h2>
            {appliedCoupon ? (
              <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-teal-700">{appliedCoupon.code}</p>
                  <p className="text-xs text-teal-600">{appliedCoupon.desc}</p>
                  <p className="text-xs text-teal-600 font-semibold">Coupon code is valid! ✓</p>
                </div>
                <button onClick={() => { setAppliedCoupon(null); setCouponInput(""); }} className="text-red-400 hover:text-red-600 ml-2">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input className={`${inp} flex-1`} value={couponInput} onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(""); }} placeholder="Enter coupon code" />
                  <button onClick={applyCoupon} className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl transition-colors">Apply</button>
                </div>
                {couponError && <p className="text-xs text-red-500 mt-1.5">{couponError}</p>}
                <p className="text-xs text-slate-400 mt-2">Try: FARM10 · SAVE50 · MRUNAL · AGRO20</p>
              </>
            )}
          </div>

          {/* Order summary */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-bold text-slate-800 mb-4">Order Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal ({cart.reduce((s, i) => s + i.qty, 0)} items)</span>
                <span>₹{subtotal.toLocaleString("en-IN")}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-teal-600 font-medium">
                  <span>Discount ({appliedCoupon?.code})</span>
                  <span>−₹{discount}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Shipping</span>
                <span className={deliveryCharge === 0 ? "text-teal-600 font-semibold" : ""}>{deliveryCharge === 0 ? "Free" : `₹${deliveryCharge}`}</span>
              </div>
              <div className="border-t border-slate-200 pt-3 flex justify-between font-black text-base text-slate-900">
                <span>Total</span>
                <span>₹{total.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Payment icons */}
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
              {["VISA", "MC", "UPI", "Cash"].map((m) => (
                <span key={m} className="text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-500 rounded">{m}</span>
              ))}
            </div>

            <button
              disabled={!addrComplete || !payComplete || placing || cart.length === 0}
              onClick={placeOrder}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors text-base"
            >
              {placing ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing…</>
              ) : (
                <><Lock className="w-4 h-4" /> Checkout · ₹{total.toLocaleString("en-IN")}</>
              )}
            </button>
            {(!addrComplete || !payComplete) && (
              <p className="text-center text-xs text-slate-400 mt-2">
                {!addrComplete ? "Add delivery address to continue" : "Complete payment details to continue"}
              </p>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
