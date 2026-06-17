"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, X, Star, Package } from "lucide-react";
import AdminShell from "@/components/AdminShell";
import { httpClient } from "@/lib/api";
import { Product, ApiResponse } from "@/lib/types";

const CATEGORIES = ["Seeds", "Fertilizers", "Irrigation", "Tools", "Pesticides", "Others"];
const EMPTY: Partial<Product> = {
  name: "", category: "Seeds", price: 0, original_price: 0,
  unit: "", image_url: "", description: "", is_best_seller: false,
  is_active: true, stock_quantity: 0,
};

const inputCls = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition";
const labelCls = "block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide";

function ProductModal({ product, onClose, onSave }: {
  product: Partial<Product>; onClose: () => void; onSave: (data: Partial<Product>) => Promise<void>;
}) {
  const [form, setForm] = useState<Partial<Product>>(product);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function set(key: keyof Product, value: unknown) {
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

  const disc = form.original_price && form.price && form.original_price > form.price
    ? Math.round((1 - form.price / form.original_price) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h3 className="font-bold text-lg text-slate-800">{form.id ? "Edit Product" : "Add Product"}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 transition">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{err}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>Product Name *</label>
              <input required className={inputCls} value={form.name || ""} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Hybrid Tomato Seeds" />
            </div>
            <div>
              <label className={labelCls}>Category *</label>
              <select required className={inputCls} value={form.category || "Seeds"} onChange={(e) => set("category", e.target.value)}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Unit</label>
              <input className={inputCls} value={form.unit || ""} onChange={(e) => set("unit", e.target.value)} placeholder="e.g. 5 kg bag" />
            </div>
            <div>
              <label className={labelCls}>Sale Price (₹) *</label>
              <input required type="number" min="0" step="0.01" className={inputCls} value={form.price || ""} onChange={(e) => set("price", parseFloat(e.target.value))} />
            </div>
            <div>
              <label className={labelCls}>Original Price (₹) *</label>
              <input required type="number" min="0" step="0.01" className={inputCls} value={form.original_price || ""} onChange={(e) => set("original_price", parseFloat(e.target.value))} />
            </div>
            {disc > 0 && (
              <div className="col-span-2">
                <span className="inline-flex items-center gap-1.5 bg-teal-50 text-teal-700 text-sm font-semibold px-3 py-1.5 rounded-lg border border-teal-200">
                  ✓ {disc}% discount preview
                </span>
              </div>
            )}
            <div>
              <label className={labelCls}>Stock Quantity</label>
              <input type="number" min="0" className={inputCls} value={form.stock_quantity ?? 0} onChange={(e) => set("stock_quantity", parseInt(e.target.value))} />
            </div>
            <div>
              <label className={labelCls}>Image URL</label>
              <input className={inputCls} value={form.image_url || ""} onChange={(e) => set("image_url", e.target.value)} placeholder="https://…" />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Description</label>
              <textarea rows={3} className={`${inputCls} resize-none`} value={form.description || ""} onChange={(e) => set("description", e.target.value)} placeholder="Product description…" />
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="bestseller" checked={!!form.is_best_seller} onChange={(e) => set("is_best_seller", e.target.checked)} className="w-4 h-4 rounded accent-teal-600" />
              <label htmlFor="bestseller" className="text-sm font-medium text-slate-700">Best Seller badge</label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="active" checked={!!form.is_active} onChange={(e) => set("is_active", e.target.checked)} className="w-4 h-4 rounded accent-teal-600" />
              <label htmlFor="active" className="text-sm font-medium text-slate-700">Active (visible in Market)</label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-300 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold rounded-xl transition">
              {saving ? "Saving…" : "Save Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<Partial<Product> | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await httpClient.get<ApiResponse<Product[]>>("/admin/products");
      setProducts(res.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save(data: Partial<Product>) {
    if (data.id) {
      const res = await httpClient.put<ApiResponse<Product>>(`/admin/products/${data.id}`, data);
      setProducts((p) => p.map((x) => x.id === data.id ? res.data : x));
    } else {
      const res = await httpClient.post<ApiResponse<Product>>("/admin/products", data);
      setProducts((p) => [...p, res.data]);
    }
  }

  async function del(id: number) {
    await httpClient.delete<ApiResponse<unknown>>(`/admin/products/${id}`);
    setProducts((p) => p.filter((x) => x.id !== id));
    setDeleteId(null);
  }

  const filtered = products.filter((p) => {
    const matchCat = catFilter === "All" || p.category === catFilter;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <AdminShell title="Products">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          className="border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 w-56 transition"
        />
        <div className="flex gap-2 flex-wrap">
          {["All", ...CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setCatFilter(c)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${catFilter === c ? "bg-teal-600 text-white border-teal-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            >{c}</button>
          ))}
        </div>
        <div className="ml-auto">
          <button
            onClick={() => setModal(EMPTY)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 text-slate-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No products yet.</p>
          <button onClick={() => setModal(EMPTY)} className="mt-3 text-teal-600 text-sm font-semibold hover:underline">Add your first product →</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((p) => {
            const disc = p.original_price > p.price ? Math.round((1 - p.price / p.original_price) * 100) : 0;
            return (
              <div key={p.id} className={`bg-white rounded-2xl border ${p.is_active ? "border-slate-200" : "border-slate-200 opacity-60"} overflow-hidden hover:shadow-md transition-shadow`}>
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-full h-36 object-cover" />
                ) : (
                  <div className="h-36 bg-gradient-to-br from-teal-50 to-slate-100 flex items-center justify-center">
                    <Package className="w-12 h-12 text-teal-200" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs text-slate-400 font-medium">{p.category}</span>
                    <div className="flex gap-1 shrink-0">
                      {p.is_best_seller && <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded">★ Best</span>}
                      {!p.is_active && <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded">Hidden</span>}
                    </div>
                  </div>
                  <p className="font-semibold text-slate-800 text-sm leading-snug line-clamp-2 mb-1">{p.name}</p>
                  <p className="text-xs text-slate-400 mb-2">{p.unit}</p>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-slate-900">₹{p.price}</span>
                    {disc > 0 && <>
                      <span className="text-xs text-slate-400 line-through">₹{p.original_price}</span>
                      <span className="text-xs font-bold text-teal-600">{disc}% off</span>
                    </>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mb-4">
                    <span className="flex items-center gap-0.5"><Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {p.rating ?? "—"}</span>
                    <span>Stock: {p.stock_quantity}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setModal(p)} className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 transition">
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button onClick={() => setDeleteId(p.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-red-200 text-red-600 text-xs font-semibold rounded-xl hover:bg-red-50 transition">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && <ProductModal product={modal} onClose={() => setModal(null)} onSave={save} />}

      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="font-bold text-lg text-slate-800 mb-2">Delete Product?</h3>
            <p className="text-sm text-slate-500 mb-6">This cannot be undone. The product will be permanently removed from the Market.</p>
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
