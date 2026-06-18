"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Save, Check, X, Settings2, Tag, Star, DollarSign, List, IndianRupee } from "lucide-react";
import AdminShell from "@/components/AdminShell";
import { httpClient } from "@/lib/api";
import { ShopSettings, ApiResponse } from "@/lib/types";

type Coupon = ShopSettings["coupons"][number];

const inputCls = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition";

function SaveBtn({ saving, saved, onClick }: { saving: boolean; saved: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={saving}
      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-colors">
      {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        : saved ? <Check className="w-4 h-4" />
        : <Save className="w-4 h-4" />}
      {saving ? "Saving…" : saved ? "Saved!" : "Save"}
    </button>
  );
}

export default function ShopSettingsPage() {
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Price range
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(5000);
  const [savingPrice, setSavingPrice] = useState(false);
  const [savedPrice, setSavedPrice] = useState(false);

  // Rating options
  const [ratingOptions, setRatingOptions] = useState<number[]>([0, 3.5, 4, 4.5]);
  const [ratingInput, setRatingInput] = useState("");
  const [savingRating, setSavingRating] = useState(false);
  const [savedRating, setSavedRating] = useState(false);

  // Categories
  const [categories, setCategories] = useState<string[]>([]);
  const [catInput, setCatInput] = useState("");
  const [savingCats, setSavingCats] = useState(false);
  const [savedCats, setSavedCats] = useState(false);

  // Delivery charge
  const [deliveryCharge, setDeliveryCharge] = useState(100);
  const [savingDelivery, setSavingDelivery] = useState(false);
  const [savedDelivery, setSavedDelivery] = useState(false);

  // Coupons
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [savingCoupons, setSavingCoupons] = useState(false);
  const [savedCoupons, setSavedCoupons] = useState(false);
  const [newCoupon, setNewCoupon] = useState<Partial<Coupon>>({ code: "", type: "percent", value: 10, min_order: 0, is_active: true });
  const [showNewCoupon, setShowNewCoupon] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await httpClient.get<ApiResponse<ShopSettings>>("/admin/shop-settings");
      const s = res.data;
      setSettings(s);
      setPriceMin(s.price_range?.min ?? 0);
      setPriceMax(s.price_range?.max ?? 5000);
      setRatingOptions(s.rating_options ?? [0, 3.5, 4, 4.5]);
      setCategories(s.categories ?? []);
      setDeliveryCharge(s.delivery_charge_online ?? 100);
      setCoupons(s.coupons ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveSetting(key: string, value: unknown, setSaving: (v: boolean) => void, setSaved: (v: boolean) => void) {
    setSaving(true);
    try {
      await httpClient.put<ApiResponse<ShopSettings>>("/admin/shop-settings", { [key]: value });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  function addRating() {
    const v = parseFloat(ratingInput);
    if (isNaN(v) || v < 0 || v > 5 || ratingOptions.includes(v)) return;
    setRatingOptions((p) => [...p, v].sort((a, b) => a - b));
    setRatingInput("");
  }

  function addCategory() {
    const c = catInput.trim();
    if (!c || categories.includes(c)) return;
    setCategories((p) => [...p, c]);
    setCatInput("");
  }

  function addCoupon() {
    const c = newCoupon;
    if (!c.code?.trim() || !c.value || !c.type) return;
    const coupon: Coupon = { code: c.code.trim().toUpperCase(), type: c.type as "percent" | "flat", value: Number(c.value), min_order: Number(c.min_order) || 0, is_active: c.is_active ?? true };
    setCoupons((p) => [...p, coupon]);
    setNewCoupon({ code: "", type: "percent", value: 10, min_order: 0, is_active: true });
    setShowNewCoupon(false);
  }

  function toggleCouponActive(code: string) {
    setCoupons((p) => p.map((c) => c.code === code ? { ...c, is_active: !c.is_active } : c));
  }

  if (loading) {
    return (
      <AdminShell title="Shop Settings">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Shop Settings">
      <div className="max-w-3xl space-y-5">

        {/* Price Range */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <IndianRupee className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Price Range Filter</h2>
              <p className="text-xs text-slate-500">Sets the min/max bounds of the price filter in the Market</p>
            </div>
          </div>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Min Price (₹)</label>
              <input type="number" min={0} className={inputCls} value={priceMin} onChange={(e) => setPriceMin(Number(e.target.value))} />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Max Price (₹)</label>
              <input type="number" min={1} className={inputCls} value={priceMax} onChange={(e) => setPriceMax(Number(e.target.value))} />
            </div>
            <SaveBtn saving={savingPrice} saved={savedPrice}
              onClick={() => saveSetting("price_range", { min: priceMin, max: priceMax }, setSavingPrice, setSavedPrice)} />
          </div>
        </div>

        {/* Rating Options */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <Star className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Rating Filter Options</h2>
              <p className="text-xs text-slate-500">Pill buttons shown in the filter sidebar (0 = "All")</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {ratingOptions.map((r) => (
              <div key={r} className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full">
                {r === 0 ? "All" : <><Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {r}+</>}
                {r !== 0 && (
                  <button onClick={() => setRatingOptions((p) => p.filter((x) => x !== r))} className="ml-0.5 text-red-400 hover:text-red-600">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1 max-w-40">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Add rating (0–5)</label>
              <input type="number" min={0} max={5} step={0.5} className={inputCls} value={ratingInput}
                onChange={(e) => setRatingInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addRating()} placeholder="e.g. 4.5" />
            </div>
            <button onClick={addRating} className="px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition">
              <Plus className="w-4 h-4" />
            </button>
            <SaveBtn saving={savingRating} saved={savedRating}
              onClick={() => saveSetting("rating_options", ratingOptions, setSavingRating, setSavedRating)} />
          </div>
        </div>

        {/* Categories */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <List className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Product Categories</h2>
              <p className="text-xs text-slate-500">Shown in the category filter and shop hero banner</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {categories.map((c) => (
              <div key={c} className="flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full">
                {c}
                <button onClick={() => setCategories((p) => p.filter((x) => x !== c))} className="ml-0.5 text-red-400 hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">New category</label>
              <input className={inputCls} value={catInput} onChange={(e) => setCatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCategory()} placeholder="e.g. Organic" />
            </div>
            <button onClick={addCategory} className="px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition">
              <Plus className="w-4 h-4" />
            </button>
            <SaveBtn saving={savingCats} saved={savedCats}
              onClick={() => saveSetting("categories", categories, setSavingCats, setSavedCats)} />
          </div>
        </div>

        {/* Delivery Charge */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Online Payment Delivery Charge</h2>
              <p className="text-xs text-slate-500">Charged when customer pays by card or UPI. COD is always free.</p>
            </div>
          </div>
          <div className="flex gap-4 items-end max-w-xs">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Charge (₹)</label>
              <input type="number" min={0} className={inputCls} value={deliveryCharge} onChange={(e) => setDeliveryCharge(Number(e.target.value))} />
            </div>
            <SaveBtn saving={savingDelivery} saved={savedDelivery}
              onClick={() => saveSetting("delivery_charge_online", deliveryCharge, setSavingDelivery, setSavedDelivery)} />
          </div>
        </div>

        {/* Coupons */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Tag className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800">Coupon Codes</h2>
                <p className="text-xs text-slate-500">Validated server-side at checkout</p>
              </div>
            </div>
            <button onClick={() => setShowNewCoupon((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Coupon
            </button>
          </div>

          {/* Existing coupons */}
          <div className="space-y-2 mb-4">
            {coupons.length === 0 && <p className="text-sm text-slate-400 italic">No coupons added yet</p>}
            {coupons.map((c) => (
              <div key={c.code} className={`flex items-center gap-3 border rounded-xl px-4 py-3 ${c.is_active ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200 bg-slate-50 opacity-60"}`}>
                <span className="font-mono font-bold text-emerald-700 text-sm">{c.code}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.type === "percent" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                  {c.type === "percent" ? `${c.value}% off` : `₹${c.value} off`}
                </span>
                {c.min_order > 0 && <span className="text-xs text-slate-500">Min ₹{c.min_order}</span>}
                <div className="ml-auto flex items-center gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-600 font-medium">
                    <input type="checkbox" checked={c.is_active} onChange={() => toggleCouponActive(c.code)} className="accent-emerald-600 w-3.5 h-3.5" />
                    Active
                  </label>
                  <button onClick={() => setCoupons((p) => p.filter((x) => x.code !== c.code))} className="text-red-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* New coupon form */}
          {showNewCoupon && (
            <div className="border border-dashed border-emerald-300 rounded-xl p-4 mb-4 space-y-3 bg-emerald-50/30">
              <p className="text-xs font-bold text-slate-600 uppercase">New Coupon</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Code *</label>
                  <input className={inputCls} value={newCoupon.code || ""} onChange={(e) => setNewCoupon((p) => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="FARM10" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Type *</label>
                  <select className={inputCls} value={newCoupon.type} onChange={(e) => setNewCoupon((p) => ({ ...p, type: e.target.value as "percent" | "flat" }))}>
                    <option value="percent">Percent off (%)</option>
                    <option value="flat">Flat amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Value *</label>
                  <input type="number" min={1} className={inputCls} value={newCoupon.value || ""} onChange={(e) => setNewCoupon((p) => ({ ...p, value: Number(e.target.value) }))} placeholder={newCoupon.type === "percent" ? "10" : "50"} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Min Order (₹)</label>
                  <input type="number" min={0} className={inputCls} value={newCoupon.min_order || 0} onChange={(e) => setNewCoupon((p) => ({ ...p, min_order: Number(e.target.value) }))} placeholder="0" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={addCoupon} disabled={!newCoupon.code?.trim() || !newCoupon.value}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors">
                  <Plus className="w-4 h-4" /> Add
                </button>
                <button onClick={() => setShowNewCoupon(false)} className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <SaveBtn saving={savingCoupons} saved={savedCoupons}
              onClick={() => saveSetting("coupons", coupons, setSavingCoupons, setSavedCoupons)} />
          </div>
        </div>

        {settings && (
          <p className="text-xs text-slate-400 text-center pb-4">
            <Settings2 className="w-3.5 h-3.5 inline mr-1" />
            All changes take effect immediately in the Market — no app restart needed.
          </p>
        )}
      </div>
    </AdminShell>
  );
}
