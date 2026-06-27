"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { HomeSection } from "@/lib/types";

const CATEGORIES = ["Seeds", "Fertilizers", "Irrigation", "Tools", "Pesticides", "Others"];
const SOURCES: { value: HomeSection["source"]; label: string; hint: string }[] = [
  { value: "best_seller", label: "Best Sellers", hint: "Products flagged as Best Seller in Products" },
  { value: "deals", label: "Deals of the Day", hint: "Highest-discount products, automatically" },
  { value: "newest", label: "New Arrivals", hint: "Most recently added products" },
  { value: "category", label: "By Category", hint: "All products in the chosen category" },
];

const inputCls = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition";
const labelCls = "block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide";

export default function HomeSectionModal({ section, onClose, onSave }: {
  section: Partial<HomeSection>; onClose: () => void; onSave: (data: Partial<HomeSection>) => Promise<void>;
}) {
  const [form, setForm] = useState<Partial<HomeSection>>(section);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function set(key: keyof HomeSection, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setSaving(true);
    try { await onSave(form); onClose(); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  }

  const sourceHint = SOURCES.find((s) => s.value === (form.source || "best_seller"))?.hint;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h3 className="font-bold text-lg text-slate-800">{form.id ? "Edit Product Section" : "Add Product Section"}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 transition">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{err}</div>}

          <div>
            <label className={labelCls}>Section Title *</label>
            <input required className={inputCls} value={form.title || ""} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Popular Products" />
          </div>
          <div>
            <label className={labelCls}>Subtitle (optional)</label>
            <input className={inputCls} value={form.subtitle || ""} onChange={(e) => set("subtitle", e.target.value)} placeholder="e.g. Loved by farmers across Maharashtra" />
          </div>
          <div>
            <label className={labelCls}>Which products?</label>
            <select className={inputCls} value={form.source || "best_seller"} onChange={(e) => set("source", e.target.value)}>
              {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            {sourceHint && <p className="text-xs text-slate-400 mt-1">{sourceHint}</p>}
          </div>
          {form.source === "category" && (
            <div>
              <label className={labelCls}>Category</label>
              <select className={inputCls} value={form.category || ""} onChange={(e) => set("category", e.target.value)}>
                <option value="">Choose a category…</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Layout</label>
              <select className={inputCls} value={form.layout || "row"} onChange={(e) => set("layout", e.target.value)}>
                <option value="row">Horizontal scroll row</option>
                <option value="grid">Grid</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Max products</label>
              <input type="number" min="1" max="50" className={inputCls} value={form.max_items ?? 10} onChange={(e) => set("max_items", parseInt(e.target.value) || 10)} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="section-active" checked={form.is_active ?? true} onChange={(e) => set("is_active", e.target.checked)} className="w-4 h-4 rounded accent-emerald-600" />
            <label htmlFor="section-active" className="text-sm font-medium text-slate-700">Active (visible on the homepage)</label>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-300 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-xl transition">
              {saving ? "Saving…" : "Save Section"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
