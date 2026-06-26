"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, X, GalleryHorizontal, ArrowUp, ArrowDown } from "lucide-react";
import AdminShell from "@/components/AdminShell";
import { httpClient } from "@/lib/api";
import { Banner, ApiResponse } from "@/lib/types";

const ICONS = ["", "Truck", "Tag", "Percent", "Gift", "Sprout", "Droplets", "Zap", "ShoppingBag"];
const EMPTY: Partial<Banner> = {
  title: "", subtitle: "", image_url: "", gradient_from: "#7c3aed", gradient_to: "#4f46e5",
  icon: "Truck", link_url: "", sort_order: 0, is_active: true,
};

const inputCls = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition";
const labelCls = "block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide";

function BannerModal({ banner, onClose, onSave }: {
  banner: Partial<Banner>; onClose: () => void; onSave: (data: Partial<Banner>) => Promise<void>;
}) {
  const [form, setForm] = useState<Partial<Banner>>(banner);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function set(key: keyof Banner, value: unknown) {
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
              <input required className={inputCls} value={form.title || ""} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Free Delivery" />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Subtitle</label>
              <input className={inputCls} value={form.subtitle || ""} onChange={(e) => set("subtitle", e.target.value)} placeholder="e.g. On all orders above ₹499" />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Image URL (optional — overlaid on the gradient)</label>
              <input className={inputCls} value={form.image_url || ""} onChange={(e) => set("image_url", e.target.value)} placeholder="https://…" />
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
              <label className={labelCls}>Sort Order</label>
              <input type="number" className={inputCls} value={form.sort_order ?? 0} onChange={(e) => set("sort_order", parseInt(e.target.value) || 0)} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Link URL (optional — e.g. /shop?category=Seeds)</label>
              <input className={inputCls} value={form.link_url || ""} onChange={(e) => set("link_url", e.target.value)} placeholder="/shop?category=Seeds" />
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="active" checked={!!form.is_active} onChange={(e) => set("is_active", e.target.checked)} className="w-4 h-4 rounded accent-emerald-600" />
              <label htmlFor="active" className="text-sm font-medium text-slate-700">Active (visible in Market)</label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-300 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-xl transition">
              {saving ? "Saving…" : "Save Banner"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Partial<Banner> | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await httpClient.get<ApiResponse<Banner[]>>("/admin/banners");
      setBanners(res.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save(data: Partial<Banner>) {
    if (data.id) {
      const res = await httpClient.put<ApiResponse<Banner>>(`/admin/banners/${data.id}`, data);
      setBanners((b) => b.map((x) => x.id === data.id ? res.data : x));
    } else {
      const res = await httpClient.post<ApiResponse<Banner>>("/admin/banners", data);
      setBanners((b) => [...b, res.data]);
    }
  }

  async function del(id: number) {
    await httpClient.delete<ApiResponse<unknown>>(`/admin/banners/${id}`);
    setBanners((b) => b.filter((x) => x.id !== id));
    setDeleteId(null);
  }

  async function move(banner: Banner, direction: -1 | 1) {
    const sorted = [...banners].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
    const idx = sorted.findIndex((b) => b.id === banner.id);
    const swapWith = sorted[idx + direction];
    if (!swapWith) return;
    await Promise.all([
      save({ id: banner.id, sort_order: swapWith.sort_order }),
      save({ id: swapWith.id, sort_order: banner.sort_order }),
    ]);
  }

  const sorted = [...banners].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);

  return (
    <AdminShell title="Banners">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-slate-500">Controls the sliding promo carousel at the top of the Market homepage, on both the website and the mobile app.</p>
        <button
          onClick={() => setModal(EMPTY)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors shrink-0 ml-4"
        >
          <Plus className="w-4 h-4" /> Add Banner
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-24 text-slate-400">
          <GalleryHorizontal className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No banners yet.</p>
          <button onClick={() => setModal(EMPTY)} className="mt-3 text-emerald-600 text-sm font-semibold hover:underline">Add your first banner →</button>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((b, i) => (
            <div key={b.id} className={`flex items-center gap-4 bg-white rounded-2xl border ${b.is_active ? "border-slate-200" : "border-slate-200 opacity-60"} p-4`}>
              <div className="flex flex-col gap-1 shrink-0">
                <button onClick={() => move(b, -1)} disabled={i === 0} className="p-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition">
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => move(b, 1)} disabled={i === sorted.length - 1} className="p-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition">
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>
              <div
                className="w-32 h-16 rounded-xl shrink-0 relative overflow-hidden flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${b.gradient_from}, ${b.gradient_to})` }}
              >
                {b.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.image_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
                )}
                <span className="relative z-10 text-white text-xs font-bold px-2 text-center line-clamp-2">{b.title}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm truncate">{b.title}</p>
                {b.subtitle && <p className="text-xs text-slate-400 truncate">{b.subtitle}</p>}
                {!b.is_active && <span className="inline-block mt-1 text-[10px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded">Hidden</span>}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setModal(b)} className="flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 transition">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => setDeleteId(b.id)} className="flex items-center justify-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 text-xs font-semibold rounded-xl hover:bg-red-50 transition">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && <BannerModal banner={modal} onClose={() => setModal(null)} onSave={save} />}

      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="font-bold text-lg text-slate-800 mb-2">Delete Banner?</h3>
            <p className="text-sm text-slate-500 mb-6">This cannot be undone. The banner will be permanently removed from the Market homepage.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-slate-300 text-slate-600 font-semibold rounded-xl hover:bg-slate-50">Cancel</button>
              <button onClick={() => del(deleteId)} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl">Delete</button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
