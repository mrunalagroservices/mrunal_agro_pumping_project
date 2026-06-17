"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ShoppingCart, Search, Star, Truck, X, Plus, Minus, Trash2, Package,
  MapPin, CreditCard, Banknote, Tag, CheckCircle2, ChevronRight,
  ChevronLeft, Lock, Smartphone,
} from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import { getSavedAddresses, SavedAddress } from "@/lib/savedAddresses";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Product {
  id: number; name: string; description: string; category: string;
  price: number; originalPrice: number; rating: number; reviewCount: number;
  unit: string; isBestSeller?: boolean; image: string; emoji: string;
  bg: string;
}

type CartItem = { product: Product; qty: number };

interface Address {
  name: string; phone: string; line1: string; line2: string;
  city: string; state: string; pincode: string;
}

type PayMethod = "cod" | "card" | "upi";
type CheckoutStep = "address" | "payment" | "review";

// ── Coupons ────────────────────────────────────────────────────────────────────
const COUPONS: Record<string, { type: "percent" | "fixed"; value: number; min: number; desc: string }> = {
  FARM10:  { type: "percent", value: 10, min: 0,   desc: "10% off on your order" },
  SAVE50:  { type: "fixed",   value: 50, min: 500, desc: "₹50 off on orders above ₹500" },
  MRUNAL:  { type: "percent", value: 15, min: 0,   desc: "15% off — Special offer" },
  AGRO20:  { type: "percent", value: 20, min: 1000, desc: "20% off on orders above ₹1000" },
};

// ── Products ───────────────────────────────────────────────────────────────────
const CATEGORIES = ["All", "Seeds", "Fertilizers", "Irrigation", "Tools", "Pesticides", "Others"];

const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=400&h=300&q=80`;

const PRODUCTS: Product[] = [
  { id: 1,  name: "Hybrid Tomato Seeds",        description: "High-yield hybrid tomato seeds. Disease resistant, suitable for all seasons.",           category: "Seeds",       price: 149,  originalPrice: 299,  rating: 4.4, reviewCount: 2341, unit: "10g packet",     isBestSeller: true,  image: img("1518977676884-f3d0423fd102"), emoji: "🍅", bg: "#DCFCE7" },
  { id: 2,  name: "Onion Seeds (Nasik Red)",     description: "Premium Nasik red onion seeds. High germination rate, 90-day variety.",                  category: "Seeds",       price: 249,  originalPrice: 399,  rating: 4.2, reviewCount: 1892, unit: "500g",            emoji: "🧅", image: img("1587049352846-b37954f4a2c3"), bg: "#F3E8FF" },
  { id: 3,  name: "Wheat Seeds (HD-2967)",       description: "Certified HD-2967 wheat seeds, high protein content, rust resistant.",                   category: "Seeds",       price: 599,  originalPrice: 799,  rating: 4.6, reviewCount: 4120, unit: "5 kg bag",        isBestSeller: true,  image: img("1574323347407-f5e1ad6d020b"), emoji: "🌾", bg: "#FEF3C7" },
  { id: 4,  name: "NPK Fertilizer 19-19-19",     description: "Balanced NPK water-soluble fertilizer for all crops.",                                    category: "Fertilizers", price: 650,  originalPrice: 950,  rating: 4.5, reviewCount: 3210, unit: "5 kg bag",        isBestSeller: true,  image: img("1416879595882-3373a0480b5b"), emoji: "🧪", bg: "#E0F2FE" },
  { id: 5,  name: "Organic Vermicompost",        description: "100% organic vermicompost. Improves soil structure and water retention.",                 category: "Fertilizers", price: 450,  originalPrice: 650,  rating: 4.3, reviewCount: 1567, unit: "10 kg bag",       image: img("1592419044706-39796d40f98c"), emoji: "🌱", bg: "#ECFCCB" },
  { id: 6,  name: "DAP Fertilizer",             description: "Di-ammonium phosphate for strong root development. Ideal for sowing time.",              category: "Fertilizers", price: 1350, originalPrice: 1800, rating: 4.7, reviewCount: 5432, unit: "50 kg bag",       isBestSeller: true,  image: img("1464638681273-0962e9b53566"), emoji: "⚗️", bg: "#FEE2E2" },
  { id: 7,  name: "Drip Irrigation Kit",        description: "Complete drip irrigation kit for 1 acre. Includes main pipe, drippers, connectors.",    category: "Irrigation",  price: 2499, originalPrice: 3999, rating: 4.4, reviewCount: 890,  unit: "1 acre kit",     isBestSeller: true,  image: img("1563514227-cd1a5bc85878"), emoji: "💧", bg: "#E0F2FE" },
  { id: 8,  name: "Sprinkler Set (8 heads)",    description: "Rotating sprinkler set with 8 heads and 25m pipe.",                                      category: "Irrigation",  price: 899,  originalPrice: 1299, rating: 4.1, reviewCount: 654,  unit: "Set of 8",       image: img("1520412099551-62b6bafeb5bb"), emoji: "🚿", bg: "#CFFAFE" },
  { id: 9,  name: "Garden Pressure Sprayer",    description: "16-litre manual pressure sprayer with adjustable nozzle.",                               category: "Tools",       price: 1299, originalPrice: 1999, rating: 4.3, reviewCount: 2100, unit: "16 litre",       isBestSeller: true,  image: img("1584467735871-8e59c4e67252"), emoji: "🪣", bg: "#E0F2FE" },
  { id: 10, name: "Steel Garden Hoe",           description: "Heavy duty steel garden hoe with wooden handle.",                                        category: "Tools",       price: 349,  originalPrice: 549,  rating: 4.0, reviewCount: 987,  unit: "Single piece",   image: img("1416879595882-3373a0480b5b"), emoji: "⛏️", bg: "#F5F5F4" },
  { id: 11, name: "Sickle (Stainless Steel)",   description: "Stainless steel sickle with ergonomic grip. Rust-proof.",                               category: "Tools",       price: 249,  originalPrice: 399,  rating: 4.2, reviewCount: 1234, unit: "Single piece",   image: img("1535379453347-1ffd615e2e08"), emoji: "🔧", bg: "#F3F4F6" },
  { id: 12, name: "Imidacloprid Insecticide",   description: "Systemic insecticide effective against sucking pests.",                                  category: "Pesticides",  price: 399,  originalPrice: 599,  rating: 4.5, reviewCount: 3456, unit: "250 ml",         isBestSeller: true,  image: img("1584467735871-8e59c4e67252"), emoji: "🧫", bg: "#FFF7ED" },
  { id: 13, name: "Mancozeb Fungicide",         description: "Broad spectrum fungicide for fruit, vegetable and field crops.",                         category: "Pesticides",  price: 299,  originalPrice: 450,  rating: 4.3, reviewCount: 2109, unit: "500g",            image: img("1566073771259-6a8506099945"), emoji: "💊", bg: "#F5F3FF" },
  { id: 14, name: "HDPE Mulch Film",            description: "25-micron HDPE black mulch film. Controls weeds and conserves soil moisture.",          category: "Others",      price: 1800, originalPrice: 2500, rating: 4.2, reviewCount: 432,  unit: "400m × 1.2m roll", image: img("1500937386664-43d2b57a8a2b"), emoji: "📦", bg: "#F3F4F6" },
  { id: 15, name: "pH Soil Testing Kit",        description: "Quick soil pH test kit with 100 test strips.",                                           category: "Others",      price: 299,  originalPrice: 499,  rating: 4.6, reviewCount: 1876, unit: "100 strips",      isBestSeller: true,  image: img("1580974852861-c381510bc98a"), emoji: "🔬", bg: "#CFFAFE" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtCount(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`; }

function deliveryDate() {
  const t = new Date(); t.setDate(t.getDate() + 1);
  return t.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

function calcDiscount(subtotal: number, coupon: { type: "percent" | "fixed"; value: number }): number {
  return coupon.type === "percent"
    ? Math.round(subtotal * coupon.value / 100)
    : coupon.value;
}

function ProductImage({ src, alt, bg, emoji, className }: { src: string; alt: string; bg: string; emoji: string; className?: string }) {
  const [errored, setErrored] = useState(false);
  if (errored) {
    return <div className={`flex items-center justify-center text-5xl ${className}`} style={{ background: bg }}>{emoji}</div>;
  }
  return (
    <img
      src={src} alt={alt}
      className={`object-cover ${className}`}
      onError={() => setErrored(true)}
    />
  );
}

// ── Checkout Modal ─────────────────────────────────────────────────────────────
function CheckoutModal({ cart, onChange, onClose, onSuccess }: {
  cart: CartItem[];
  onChange: (id: number, delta: number) => void;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<CheckoutStep>("address");
  const [savedAddrs] = useState<SavedAddress[]>(() => getSavedAddresses());
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(() => {
    const def = getSavedAddresses().find((a) => a.isDefault);
    return def?.id ?? null;
  });
  const [addr, setAddr] = useState<Address>(() => {
    const def = getSavedAddresses().find((a) => a.isDefault);
    if (def) return { name: def.name, phone: def.phone, line1: def.line1, line2: def.line2, city: def.city, state: def.state, pincode: def.pincode };
    return { name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" };
  });
  const [payMethod, setPayMethod] = useState<PayMethod>("cod");
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<null | { code: string; type: "percent" | "fixed"; value: number; desc: string }>(null);
  const [cardNum, setCardNum] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [upiId, setUpiId] = useState("");
  const [placing, setPlacing] = useState(false);

  const subtotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0);
  const deliveryCharge = payMethod !== "cod" ? 100 : 0;
  const discount = appliedCoupon ? calcDiscount(subtotal, appliedCoupon) : 0;
  const total = subtotal + deliveryCharge - discount;

  const STEPS: CheckoutStep[] = ["address", "payment", "review"];
  const stepIdx = STEPS.indexOf(step);
  const STEP_LABELS = ["Delivery Address", "Payment & Offers", "Review Order"];

  function setField(key: keyof Address, val: string) {
    setAddr((a) => ({ ...a, [key]: val }));
    setSelectedSavedId(null); // manual edit → deselect saved
  }

  function pickSaved(sa: SavedAddress) {
    if (selectedSavedId === sa.id) {
      // Tap again to deselect → clear form
      setSelectedSavedId(null);
      setAddr({ name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" });
    } else {
      setSelectedSavedId(sa.id);
      setAddr({ name: sa.name, phone: sa.phone, line1: sa.line1, line2: sa.line2, city: sa.city, state: sa.state, pincode: sa.pincode });
    }
  }

  function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    const def = COUPONS[code];
    if (!def) { setCouponError("Invalid coupon code"); return; }
    if (def.min && subtotal < def.min) { setCouponError(`Minimum order ₹${def.min} required`); return; }
    setAppliedCoupon({ code, ...def });
    setCouponError("");
  }

  function removeCoupon() { setAppliedCoupon(null); setCouponInput(""); setCouponError(""); }

  function canProceedAddress() {
    return addr.name && addr.phone.replace(/\D/g, "").length >= 7 && addr.line1 && addr.city && addr.state && addr.pincode.length === 6;
  }

  function canProceedPayment() {
    if (payMethod === "cod") return true;
    if (payMethod === "upi") return upiId.includes("@");
    if (payMethod === "card") return cardNum.replace(/\s/g, "").length === 16 && cardExpiry && cardCvv.length >= 3;
    return false;
  }

  async function placeOrder() {
    setPlacing(true);
    await new Promise((r) => setTimeout(r, 1500));
    setPlacing(false);
    onSuccess();
  }

  const inp = "w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[96vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-4">
            {stepIdx > 0 && (
              <button onClick={() => setStep(STEPS[stepIdx - 1])} className="text-slate-400 hover:text-slate-600">
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <p className="text-xs text-slate-400 font-medium">Step {stepIdx + 1} of 3</p>
              <h2 className="font-bold text-slate-800">{STEP_LABELS[stepIdx]}</h2>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-3 pb-0 shrink-0">
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-1 flex-1">
                <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 transition-colors ${i < stepIdx ? "bg-indigo-600 text-white" : i === stepIdx ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                  {i < stepIdx ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 rounded-full ${i < stepIdx ? "bg-indigo-500" : "bg-slate-100"}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* ── Step 1: Address ── */}
          {step === "address" && (
            <>
              {/* Saved address picker */}
              {savedAddrs.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">Saved Addresses</p>
                  <div className="flex flex-col gap-2">
                    {savedAddrs.map((sa) => (
                      <button
                        key={sa.id}
                        type="button"
                        onClick={() => pickSaved(sa)}
                        className={`w-full flex items-start gap-3 border-2 rounded-xl p-3 text-left transition-colors ${selectedSavedId === sa.id ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300 bg-white"}`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${selectedSavedId === sa.id ? "bg-indigo-100" : "bg-slate-100"}`}>
                          <MapPin className={`w-3.5 h-3.5 ${selectedSavedId === sa.id ? "text-indigo-600" : "text-slate-500"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${selectedSavedId === sa.id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}>{sa.label}</span>
                            {sa.isDefault && <span className="text-[10px] font-semibold text-amber-600">★ Default</span>}
                          </div>
                          <p className="text-sm font-semibold text-slate-800">{sa.name} · {sa.phone}</p>
                          <p className="text-xs text-slate-500 truncate">{sa.line1}{sa.line2 ? `, ${sa.line2}` : ""}, {sa.city}, {sa.state} – {sa.pincode}</p>
                        </div>
                        {selectedSavedId === sa.id && <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 my-3">
                    <div className="flex-1 h-px bg-slate-100" />
                    <span className="text-xs text-slate-400 font-medium">or enter a new address</span>
                    <div className="flex-1 h-px bg-slate-100" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Full Name *</label>
                  <input className={inp} value={addr.name} onChange={(e) => setField("name", e.target.value)} placeholder="Ramesh Patil" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Phone Number *</label>
                  <input className={inp} type="tel" value={addr.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="98765 43210" maxLength={15} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Address Line 1 *</label>
                  <input className={inp} value={addr.line1} onChange={(e) => setField("line1", e.target.value)} placeholder="House no., Street, Village" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Address Line 2</label>
                  <input className={inp} value={addr.line2} onChange={(e) => setField("line2", e.target.value)} placeholder="Landmark (optional)" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">City *</label>
                  <input className={inp} value={addr.city} onChange={(e) => setField("city", e.target.value)} placeholder="Pune" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Pincode *</label>
                  <input className={inp} type="tel" value={addr.pincode} onChange={(e) => setField("pincode", e.target.value)} placeholder="411001" maxLength={6} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">State *</label>
                  <select className={inp} value={addr.state} onChange={(e) => setField("state", e.target.value)}>
                    <option value="">Select state</option>
                    {["Andhra Pradesh","Bihar","Chhattisgarh","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Odisha","Punjab","Rajasthan","Tamil Nadu","Telangana","Uttar Pradesh","Uttarakhand","West Bengal"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
                <Truck className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                <p className="text-xs text-indigo-700">Delivery by <strong>{deliveryDate()}</strong> after order confirmation.</p>
              </div>
            </>
          )}

          {/* ── Step 2: Payment + Coupon ── */}
          {step === "payment" && (
            <>
              <p className="text-sm font-semibold text-slate-700">Select Payment Method</p>

              {/* COD */}
              <label className={`flex items-center gap-3 border-2 rounded-xl p-4 cursor-pointer transition-colors ${payMethod === "cod" ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300"}`}>
                <input type="radio" className="accent-indigo-600 w-4 h-4" checked={payMethod === "cod"} onChange={() => setPayMethod("cod")} />
                <Banknote className="w-5 h-5 text-indigo-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">Cash on Delivery</p>
                  <p className="text-xs text-indigo-600 font-medium">FREE delivery · Pay when you receive</p>
                </div>
              </label>

              {/* Card */}
              <label className={`flex flex-col gap-3 border-2 rounded-xl p-4 cursor-pointer transition-colors ${payMethod === "card" ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300"}`}>
                <div className="flex items-center gap-3" onClick={() => setPayMethod("card")}>
                  <input type="radio" className="accent-indigo-600 w-4 h-4" checked={payMethod === "card"} onChange={() => setPayMethod("card")} />
                  <CreditCard className="w-5 h-5 text-blue-600 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">Debit / Credit Card</p>
                    <p className="text-xs text-slate-500">Visa, Mastercard, RuPay · ₹100 delivery charge</p>
                  </div>
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                </div>
                {payMethod === "card" && (
                  <div className="space-y-2 mt-1" onClick={(e) => e.stopPropagation()}>
                    <input className={inp} value={cardNum} maxLength={19}
                      onChange={(e) => { const v = e.target.value.replace(/\D/g,"").slice(0,16); setCardNum(v.replace(/(.{4})/g,"$1 ").trim()); }}
                      placeholder="1234 5678 9012 3456" />
                    <div className="grid grid-cols-2 gap-2">
                      <input className={inp} value={cardExpiry} maxLength={5}
                        onChange={(e) => { let v = e.target.value.replace(/\D/g,""); if(v.length>2) v=v.slice(0,2)+"/"+v.slice(2); setCardExpiry(v); }}
                        placeholder="MM/YY" />
                      <input className={inp} type="password" value={cardCvv} maxLength={4} onChange={(e) => setCardCvv(e.target.value.replace(/\D/g,""))} placeholder="CVV" />
                    </div>
                  </div>
                )}
              </label>

              {/* UPI */}
              <label className={`flex flex-col gap-3 border-2 rounded-xl p-4 cursor-pointer transition-colors ${payMethod === "upi" ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300"}`}>
                <div className="flex items-center gap-3" onClick={() => setPayMethod("upi")}>
                  <input type="radio" className="accent-indigo-600 w-4 h-4" checked={payMethod === "upi"} onChange={() => setPayMethod("upi")} />
                  <Smartphone className="w-5 h-5 text-purple-600 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">UPI / GPay / PhonePe</p>
                    <p className="text-xs text-slate-500">Pay using your UPI ID · ₹100 delivery charge</p>
                  </div>
                </div>
                {payMethod === "upi" && (
                  <input className={inp} value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="name@upi or 98765@paytm" onClick={(e) => e.stopPropagation()} />
                )}
              </label>

              {/* Coupon */}
              <div className="border border-slate-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><Tag className="w-4 h-4 text-indigo-600" /> Coupon Code</p>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2.5">
                    <div>
                      <p className="text-sm font-bold text-indigo-700">{appliedCoupon.code} applied!</p>
                      <p className="text-xs text-indigo-600">{appliedCoupon.desc}</p>
                    </div>
                    <button onClick={removeCoupon} className="text-red-400 hover:text-red-600 ml-2"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input className={`${inp} flex-1`} value={couponInput} onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(""); }} placeholder="Enter coupon code" />
                    <button onClick={applyCoupon} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors whitespace-nowrap">Apply</button>
                  </div>
                )}
                {couponError && <p className="text-xs text-red-500 mt-1.5">{couponError}</p>}
                <p className="text-xs text-slate-400 mt-2">Try: FARM10 · SAVE50 · MRUNAL · AGRO20</p>
              </div>
            </>
          )}

          {/* ── Step 3: Review ── */}
          {step === "review" && (
            <>
              {/* Address summary */}
              <div className="bg-slate-50 rounded-xl p-4 flex items-start gap-3">
                <MapPin className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">{addr.name} · {addr.phone}</p>
                  <p className="text-xs text-slate-500">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}, {addr.state} - {addr.pincode}</p>
                </div>
                <button onClick={() => setStep("address")} className="ml-auto text-xs text-indigo-600 font-semibold hover:underline shrink-0">Change</button>
              </div>

              {/* Payment summary */}
              <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-3">
                {payMethod === "cod" ? <Banknote className="w-4 h-4 text-indigo-600" /> : payMethod === "card" ? <CreditCard className="w-4 h-4 text-blue-600" /> : <Smartphone className="w-4 h-4 text-purple-600" />}
                <p className="text-sm font-semibold text-slate-800 flex-1">
                  {payMethod === "cod" ? "Cash on Delivery" : payMethod === "card" ? `Card ending ${cardNum.slice(-4)}` : `UPI — ${upiId}`}
                </p>
                <button onClick={() => setStep("payment")} className="text-xs text-indigo-600 font-semibold hover:underline">Change</button>
              </div>

              {/* Items */}
              <div className="space-y-2">
                {cart.map(({ product: p, qty }) => (
                  <div key={p.id} className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl p-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
                      <ProductImage src={p.image} alt={p.name} bg={p.bg} emoji={p.emoji} className="w-full h-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.unit} × {qty}</p>
                    </div>
                    <p className="text-sm font-bold text-slate-800 shrink-0">₹{(p.price * qty).toLocaleString("en-IN")}</p>
                  </div>
                ))}
              </div>

              {/* Price breakdown */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between text-slate-600"><span>Subtotal ({cart.reduce((s, i) => s + i.qty, 0)} items)</span><span>₹{subtotal.toLocaleString("en-IN")}</span></div>
                {discount > 0 && <div className="flex justify-between text-indigo-600 font-medium"><span>Coupon ({appliedCoupon?.code})</span><span>−₹{discount}</span></div>}
                <div className="flex justify-between text-slate-600">
                  <span>Delivery</span>
                  <span className={deliveryCharge === 0 ? "text-indigo-600 font-medium" : ""}>{deliveryCharge === 0 ? "FREE" : `₹${deliveryCharge}`}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-base text-slate-900">
                  <span>Total</span>
                  <span>₹{total.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Truck className="w-3.5 h-3.5 text-indigo-600" />
                Expected delivery: <strong className="text-slate-600">{deliveryDate()}</strong>
              </div>
            </>
          )}
        </div>

        {/* Footer CTA */}
        <div className="px-6 py-4 border-t border-slate-100 shrink-0 bg-white">
          {step !== "review" ? (
            <button
              disabled={step === "address" ? !canProceedAddress() : !canProceedPayment()}
              onClick={() => setStep(STEPS[stepIdx + 1] as CheckoutStep)}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={placeOrder}
              disabled={placing}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold rounded-xl transition-colors"
            >
              {placing ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing…</>
              ) : (
                <><Lock className="w-4 h-4" /> Place Order · ₹{total.toLocaleString("en-IN")}</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Product Detail Modal ───────────────────────────────────────────────────────
function ProductModal({ product, onClose, onAdd }: { product: Product; onClose: () => void; onAdd: () => void }) {
  const disc = Math.round((1 - product.price / product.originalPrice) * 100);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="h-52 relative overflow-hidden">
          <ProductImage src={product.image} alt={product.name} bg={product.bg} emoji={product.emoji} className="w-full h-full" />
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white">
            <X className="w-4 h-4 text-slate-600" />
          </button>
          {disc > 0 && <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg">{disc}% off</span>}
        </div>
        <div className="p-6">
          {product.isBestSeller && <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full mb-3">★ Best Seller</span>}
          <h3 className="text-xl font-bold text-slate-800 mb-1">{product.name}</h3>
          <p className="text-sm text-slate-500 mb-4">{product.unit} · {product.category}</p>
          <div className="flex items-center gap-2 mb-4">
            <span className="flex items-center gap-1 bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded">
              <Star className="w-3 h-3 fill-white" /> {product.rating}
            </span>
            <span className="text-sm text-slate-500">{fmtCount(product.reviewCount)} ratings</span>
          </div>
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-3xl font-bold text-slate-900">₹{product.price}</span>
            <span className="text-lg text-slate-400 line-through">₹{product.originalPrice}</span>
            <span className="text-sm font-bold text-indigo-600">{disc}% off</span>
          </div>
          <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 mb-4">
            <Truck className="w-5 h-5 text-indigo-600 shrink-0" />
            <div>
              <p className="text-sm font-bold text-indigo-700">FREE 1-Day Delivery</p>
              <p className="text-xs text-indigo-600">Delivered by {deliveryDate()}</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">{product.description}</p>
          <button onClick={() => { onAdd(); onClose(); }} className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors">
            <ShoppingCart className="w-5 h-5" /> Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Cart Sidebar ───────────────────────────────────────────────────────────────
function CartSidebar({ items, onClose, onChange, onCheckout }: {
  items: CartItem[]; onClose: () => void;
  onChange: (id: number, delta: number) => void; onCheckout: () => void;
}) {
  const subtotal = items.reduce((s, i) => s + i.product.price * i.qty, 0);
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
                  <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0">
                    <ProductImage src={p.image} alt={p.name} bg={p.bg} emoji={p.emoji} className="w-full h-full" />
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
              <div className="flex items-center gap-2 bg-indigo-50 rounded-xl px-3 py-2">
                <Truck className="w-4 h-4 text-indigo-600 shrink-0" />
                <p className="text-xs text-indigo-700 font-medium">
                  {subtotal >= 499 ? `Free COD delivery · Delivered by ${deliveryDate()}` : `Add ₹${499 - subtotal} more for free COD delivery`}
                </p>
              </div>
              <div className="flex justify-between text-sm font-semibold text-slate-700">
                <span>Subtotal</span><span>₹{subtotal.toLocaleString("en-IN")}</span>
              </div>
              <button onClick={onCheckout} className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors">
                Proceed to Checkout <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Success Screen ─────────────────────────────────────────────────────────────
function OrderSuccess({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center">
        <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-10 h-10 text-indigo-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Order Placed!</h2>
        <p className="text-slate-500 text-sm mb-1">Your order has been confirmed.</p>
        <p className="text-indigo-600 font-semibold text-sm mb-6">
          Expected delivery by <strong>{deliveryDate()}</strong>
        </p>
        <div className="bg-slate-50 rounded-xl p-4 text-left space-y-1 text-sm text-slate-600 mb-6">
          <p>📦 Order is being packed</p>
          <p>🚚 Out for delivery tomorrow</p>
          <p>📞 Our team will call before delivery</p>
        </div>
        <button onClick={onClose} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors">
          Continue Shopping
        </button>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ShopPage() {
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("mrunal_cart") : null;
      if (!raw) return [];
      // Restore product references from PRODUCTS array (avoids stale embedded data)
      const parsed: { productId: number; qty: number }[] = JSON.parse(raw);
      return parsed.flatMap(({ productId, qty }) => {
        const p = PRODUCTS.find((x) => x.id === productId);
        return p ? [{ product: p, qty }] : [];
      });
    } catch {
      return [];
    }
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  // Persist cart to localStorage on every change
  useEffect(() => {
    const slim = cart.map((i) => ({ productId: i.product.id, qty: i.qty }));
    localStorage.setItem("mrunal_cart", JSON.stringify(slim));
  }, [cart]);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const filtered = useMemo(() => PRODUCTS.filter((p) => {
    const matchCat = category === "All" || p.category === category;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
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
    setCart((prev) => prev.flatMap((i) => {
      if (i.product.id !== id) return [i];
      const q = i.qty + delta;
      return q <= 0 ? [] : [{ ...i, qty: q }];
    }));
  }

  function handleSuccess() {
    setCart([]);
    setCheckoutOpen(false);
    setOrderSuccess(true);
  }

  return (
    <DashboardShell breadcrumb={[{ label: "Market" }]}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Market</h1>
          <p className="text-sm text-slate-500">Quality farm essentials, delivered in 1 day</p>
        </div>
        <button onClick={() => setCartOpen(true)} className="relative flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors">
          <ShoppingCart className="w-4 h-4" />
          Cart
          {cartCount > 0 && <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">{cartCount}</span>}
        </button>
      </div>

      {/* Delivery banner */}
      <div className="bg-gradient-to-r from-indigo-700 to-indigo-500 rounded-2xl px-6 py-4 mb-6 flex items-center gap-4">
        <Truck className="w-8 h-8 text-white shrink-0" />
        <div className="flex-1">
          <p className="text-white font-bold text-lg">FREE 1-Day Delivery on COD</p>
          <p className="text-indigo-100 text-sm">Delivered by {deliveryDate()} · Online payment: ₹100 delivery</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-white font-bold">{PRODUCTS.length}+ products</p>
          <p className="text-indigo-100 text-xs">Farm essentials</p>
        </div>
      </div>

      {/* Search + categories */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search seeds, fertilizers, tools…"
            className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`px-3 py-2 text-sm font-medium rounded-xl border transition-colors ${category === cat ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-200 text-slate-600 hover:bg-slate-50 bg-white"}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

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
              <div key={p.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer flex flex-col"
                onClick={() => setDetailProduct(p)}>
                {/* Image */}
                <div className="h-32 relative overflow-hidden">
                  <ProductImage src={p.image} alt={p.name} bg={p.bg} emoji={p.emoji} className="w-full h-full" />
                  {disc > 0 && <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">{disc}% off</span>}
                  {p.isBestSeller && <span className="absolute top-2 right-2 bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">★ Best</span>}
                </div>

                <div className="p-3 flex flex-col flex-1">
                  <p className="text-xs text-slate-400 mb-0.5">{p.category}</p>
                  <p className="text-sm font-semibold text-slate-800 leading-tight line-clamp-2 mb-1">{p.name}</p>
                  <p className="text-xs text-slate-400 mb-2">{p.unit}</p>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="flex items-center gap-0.5 bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                      <Star className="w-2.5 h-2.5 fill-white" /> {p.rating}
                    </span>
                    <span className="text-[10px] text-slate-400">({fmtCount(p.reviewCount)})</span>
                  </div>
                  <div className="flex items-baseline gap-1.5 mb-1">
                    <span className="font-bold text-slate-900">₹{p.price}</span>
                    <span className="text-xs text-slate-400 line-through">₹{p.originalPrice}</span>
                  </div>
                  <div className="flex items-center gap-1 mb-3">
                    <Truck className="w-3 h-3 text-indigo-600" />
                    <span className="text-[10px] text-indigo-700 font-medium">By {deliveryDate()}</span>
                  </div>

                  <div className="mt-auto" onClick={(e) => e.stopPropagation()}>
                    {inCart ? (
                      <div className="flex items-center justify-between border border-indigo-500 rounded-xl px-2 py-1.5">
                        <button onClick={() => changeQty(p.id, -1)} className="text-indigo-600 hover:text-indigo-800">
                          {inCart.qty === 1 ? <Trash2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                        </button>
                        <span className="text-sm font-bold text-indigo-700">{inCart.qty}</span>
                        <button onClick={() => changeQty(p.id, 1)} className="text-indigo-600 hover:text-indigo-800"><Plus className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <button onClick={() => addToCart(p)} className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors">
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
      {detailProduct && <ProductModal product={detailProduct} onClose={() => setDetailProduct(null)} onAdd={() => addToCart(detailProduct)} />}
      {cartOpen && <CartSidebar items={cart} onClose={() => setCartOpen(false)} onChange={changeQty} onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }} />}
      {checkoutOpen && <CheckoutModal cart={cart} onChange={changeQty} onClose={() => setCheckoutOpen(false)} onSuccess={handleSuccess} />}
      {orderSuccess && <OrderSuccess onClose={() => setOrderSuccess(false)} />}
    </DashboardShell>
  );
}
