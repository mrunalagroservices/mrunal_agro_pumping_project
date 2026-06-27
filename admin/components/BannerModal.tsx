"use client";

import { useState, useRef } from "react";
import { X, Upload, Package, Loader2 } from "lucide-react";
import { httpClient } from "@/lib/api";
import { Banner, BannerPlacement, ApiResponse } from "@/lib/types";

const ICONS = ["", "Truck", "Tag", "Percent", "Gift", "Sprout", "Droplets", "Zap", "ShoppingBag"];
const PLACEMENTS: { value: BannerPlacement; label: string }[] = [
  { value: "hero", label: "Hero (top sliding carousel)" },
  { value: "promo", label: "Promo strip (3-card mid-page row)" },
];

const inputCls = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition";
const labelCls = "block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide";

export default function BannerModal({ banner, onClose, onSave }: {
  banner: Partial<Banner>; onClose: () => void; onSave: (data: Partial<Banner>) => Promise<void>;
}) {
  const [form, setForm] = useState<Partial<Banner>>(banner);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function set(key: keyof Banner, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleFile(file: File) {
    setErr("");
    setUploading(true);
    try {
      const res = await httpClient.uploadFile<ApiResponse<{ url: string }>>("/admin/upload", file);
      set("image_url", res.data.url);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setSaving(true);
    try { await onSave(form); onClose(); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h3 className="font-bold text-lg text-slate-800">{form.id ? "Edit Banner" : "Add Banner"}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 transition">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{err}</div>}

          {/* Live preview */}
          <div
            className="rounded-2xl p-5 text-white relative overflow-hidden min-h-[110px] flex flex-col justify-center"
            style={{ background: `linear-gradient(135deg, ${form.gradient_from || "#7c3aed"}, ${form.gradient_to || "#4f46e5"})` }}
          >
            {form.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.image_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
            )}
            <p className="font-bold text-lg relative z-10">{form.title || "Banner title"}</p>
            {form.subtitle && <p className="text-sm text-white/90 relative z-10">{form.subtitle}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>Title *</label>
              <input required className={inputCls} value={form.title || ""} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Fresh Vegetables Big Discount" />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Subtitle</label>
              <input className={inputCls} value={form.subtitle || ""} onChange={(e) => set("subtitle", e.target.value)} placeholder="e.g. Save up to 50% off on your first order" />
            </div>

            {/* Image upload + URL */}
            <div className="col-span-2 flex gap-4 items-start">
              <div className="w-24 h-24 rounded-xl border border-slate-200 overflow-hidden shrink-0 bg-slate-50 flex items-center justify-center">
                {uploading ? <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" /> : form.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                ) : <Package className="w-7 h-7 text-slate-300" />}
              </div>
              <div className="flex-1 space-y-2">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-semibold rounded-xl transition disabled:opacity-60">
                  <Upload className="w-4 h-4" /> {form.image_url ? "Replace Image" : "Upload Image"}
                </button>
                <input className={inputCls} value={form.image_url || ""} onChange={(e) => set("image_url", e.target.value)} placeholder="…or paste an image URL" />
              </div>
            </div>

            <div>
              <label className={labelCls}>Gradient From</label>
              <input type="color" className="w-full h-10 border border-slate-200 rounded-xl cursor-pointer" value={form.gradient_from || "#7c3aed"} onChange={(e) => set("gradient_from", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Gradient To</label>
              <input type="color" className="w-full h-10 border border-slate-200 rounded-xl cursor-pointer" value={form.gradient_to || "#4f46e5"} onChange={(e) => set("gradient_to", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Icon</label>
              <select className={inputCls} value={form.icon || ""} onChange={(e) => set("icon", e.target.value)}>
                {ICONS.map((i) => <option key={i} value={i}>{i || "None"}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Placement</label>
              <select className={inputCls} value={form.placement || "hero"} onChange={(e) => set("placement", e.target.value)}>
                {PLACEMENTS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Sort Order</label>
              <input type="number" className={inputCls} value={form.sort_order ?? 0} onChange={(e) => set("sort_order", parseInt(e.target.value) || 0)} />
            </div>
            <div className="flex items-center gap-3 mt-6">
              <input type="checkbox" id="banner-active" checked={!!form.is_active} onChange={(e) => set("is_active", e.target.checked)} className="w-4 h-4 rounded accent-emerald-600" />
              <label htmlFor="banner-active" className="text-sm font-medium text-slate-700">Active (visible in Market)</label>
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Link URL (optional — e.g. /shop?category=Seeds)</label>
              <input className={inputCls} value={form.link_url || ""} onChange={(e) => set("link_url", e.target.value)} placeholder="/shop?category=Seeds" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-300 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition">Cancel</button>
            <button type="submit" disabled={saving || uploading} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-xl transition">
              {saving ? "Saving…" : "Save Banner"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
