"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Users, Warehouse, Cpu, Zap, ChevronDown, ChevronRight,
  Plus, Pencil, Trash2, X, Upload, Package,
  CheckCircle, XCircle, ShieldCheck,
} from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import { httpClient } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  ApiResponse, AdminStats, AdminFarmer, AdminFarmerDetail, Product,
} from "@/lib/types";

type Tab = "overview" | "farmers" | "products";
const CATEGORIES = ["Seeds", "Fertilizers", "Irrigation", "Tools", "Pesticides", "Others"];

// ── helpers ───────────────────────────────────────────────────────────────────
function StatBox({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

// ── Product modal ─────────────────────────────────────────────────────────────
function ProductModal({ product, onClose, onSaved }: {
  product: Product | null;
  onClose: () => void;
  onSaved: (p: Product) => void;
}) {
  const [form, setForm] = useState({
    name: product?.name ?? "",
    description: product?.description ?? "",
    category: product?.category ?? "Seeds",
    price: product?.price?.toString() ?? "",
    original_price: product?.original_price?.toString() ?? "",
    unit: product?.unit ?? "",
    image_url: product?.image_url ?? "",
    is_best_seller: product?.is_best_seller ?? false,
    is_active: product?.is_active ?? true,
    stock_quantity: product?.stock_quantity?.toString() ?? "100",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const discount = form.price && form.original_price
    ? Math.round((1 - Number(form.price) / Number(form.original_price)) * 100)
    : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = {
        ...form,
        price: Number(form.price),
        original_price: Number(form.original_price),
        stock_quantity: Number(form.stock_quantity),
      };
      const res = product
        ? await httpClient.put<ApiResponse<Product>>(`/admin/products/${product.id}`, body)
        : await httpClient.post<ApiResponse<Product>>("/admin/products", body);
      onSaved(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const inp = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold">{product ? "Edit Product" : "Add New Product"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Image preview */}
          {form.image_url && (
            <div className="w-full h-40 rounded-xl overflow-hidden bg-slate-100 mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.image_url} alt="preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Product Name *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inp} placeholder="e.g. Hybrid Tomato Seeds" />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Image URL</label>
              <div className="flex gap-2">
                <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className={inp} placeholder="https://example.com/product.jpg" />
                <div className="flex items-center gap-1 px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-500 shrink-0 cursor-not-allowed" title="Image upload coming soon">
                  <Upload className="w-4 h-4" /> Upload
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Paste a direct image URL. Upload from device coming soon.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Category *</label>
              <select required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inp}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Unit / Pack size</label>
              <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className={inp} placeholder="e.g. 500g, 5 kg bag" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Sale Price (₹) *</label>
              <input required type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={inp} placeholder="149" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Original Price (₹) *</label>
              <div className="relative">
                <input required type="number" min="0" step="0.01" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: e.target.value })} className={inp} placeholder="299" />
                {discount > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-600">{discount}% off</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Stock Quantity</label>
              <input type="number" min="0" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} className={inp} />
            </div>

            <div className="flex items-center gap-6 pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={form.is_best_seller} onChange={(e) => setForm({ ...form, is_best_seller: e.target.checked })} className="accent-amber-500 w-4 h-4" />
                <span className="font-medium">Best Seller</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="accent-emerald-500 w-4 h-4" />
                <span className="font-medium">Active / Visible</span>
              </label>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
              <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${inp} resize-none`} placeholder="Describe the product — key features, usage, benefits…" />
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60">
              {saving ? "Saving…" : product ? "Save Changes" : "Add Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");

  // Stats
  const [stats, setStats] = useState<AdminStats | null>(null);

  // Farmers
  const [farmers, setFarmers] = useState<AdminFarmer[]>([]);
  const [expandedFarmer, setExpandedFarmer] = useState<number | null>(null);
  const [farmerDetail, setFarmerDetail] = useState<Record<number, AdminFarmerDetail>>({});

  // Products
  const [products, setProducts] = useState<Product[]>([]);
  const [productModal, setProductModal] = useState<{ open: boolean; product: Product | null }>({ open: false, product: null });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [farmersSearch, setFarmersSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productCategory, setProductCategory] = useState("All");

  // Redirect non-admins
  useEffect(() => {
    if (user && !user.is_admin) router.push("/");
  }, [user, router]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, farmersRes, productsRes] = await Promise.all([
        httpClient.get<ApiResponse<AdminStats>>("/admin/stats"),
        httpClient.get<ApiResponse<AdminFarmer[]>>("/admin/farmers"),
        httpClient.get<ApiResponse<Product[]>>("/admin/products"),
      ]);
      setStats(statsRes.data);
      setFarmers(farmersRes.data);
      setProducts(productsRes.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function toggleExpand(farmerId: number) {
    if (expandedFarmer === farmerId) { setExpandedFarmer(null); return; }
    setExpandedFarmer(farmerId);
    if (!farmerDetail[farmerId]) {
      const res = await httpClient.get<ApiResponse<AdminFarmerDetail>>(`/admin/farmers/${farmerId}`);
      setFarmerDetail((prev) => ({ ...prev, [farmerId]: res.data }));
    }
  }

  async function deleteProduct(id: number) {
    await httpClient.delete(`/admin/products/${id}`);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setDeleteConfirm(null);
  }

  const filteredFarmers = farmers.filter((f) =>
    !farmersSearch || f.org_name.toLowerCase().includes(farmersSearch.toLowerCase()) ||
    (f.owner_name ?? "").toLowerCase().includes(farmersSearch.toLowerCase()) ||
    (f.owner_email ?? "").toLowerCase().includes(farmersSearch.toLowerCase())
  );

  const filteredProducts = products.filter((p) => {
    const matchCat = productCategory === "All" || p.category === productCategory;
    const matchSearch = !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  if (user && !user.is_admin) return null;

  const tabCls = (t: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === t ? "bg-white text-primary-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`;

  return (
    <DashboardShell breadcrumb={[{ label: "Admin Dashboard" }]}>
      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 mb-6 w-fit">
        <button onClick={() => setTab("overview")} className={tabCls("overview")}>
          <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" />Overview</span>
        </button>
        <button onClick={() => setTab("farmers")} className={tabCls("farmers")}>
          <span className="flex items-center gap-2"><Users className="w-4 h-4" />Farmers ({farmers.length})</span>
        </button>
        <button onClick={() => setTab("products")} className={tabCls("products")}>
          <span className="flex items-center gap-2"><Package className="w-4 h-4" />Products ({products.length})</span>
        </button>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {/* ── Overview ── */}
      {!loading && tab === "overview" && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatBox icon={Users} label="Total Farmers" value={stats.farmers} color="bg-violet-50 text-violet-600" />
            <StatBox icon={Warehouse} label="Total Farms" value={stats.farms} color="bg-emerald-50 text-emerald-600" />
            <StatBox
              icon={Cpu} label="Devices"
              value={`${stats.devices.online} / ${stats.devices.total}`}
              sub={`${stats.devices.total - stats.devices.online} offline`}
              color="bg-sky-50 text-sky-600"
            />
            <StatBox
              icon={Zap} label="Motors Running"
              value={`${stats.actuators.running} / ${stats.actuators.total}`}
              sub="Currently active"
              color="bg-amber-50 text-amber-600"
            />
          </div>

          {/* Quick farmer overview table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="font-semibold text-slate-800">All Farmers</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 uppercase tracking-wide border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-2.5 font-medium">Organization</th>
                    <th className="px-4 py-2.5 font-medium">Owner</th>
                    <th className="px-4 py-2.5 font-medium text-center">Farms</th>
                    <th className="px-4 py-2.5 font-medium text-center">Devices</th>
                    <th className="px-4 py-2.5 font-medium text-center">Motors ON</th>
                    <th className="px-4 py-2.5 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {farmers.map((f) => (
                    <tr key={f.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{f.org_name}</td>
                      <td className="px-4 py-3">
                        <p className="text-slate-700">{f.owner_name ?? "—"}</p>
                        <p className="text-xs text-slate-400">{f.owner_email}</p>
                      </td>
                      <td className="px-4 py-3 text-center">{f.farm_count}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-medium ${f.online_device_count > 0 ? "text-emerald-600" : "text-slate-500"}`}>
                          {f.online_device_count}
                        </span>
                        <span className="text-slate-400">/{f.device_count}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {f.running_actuator_count > 0
                          ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">● {f.running_actuator_count} ON</span>
                          : <span className="text-slate-400 text-xs">Idle</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{new Date(f.created_at).toLocaleDateString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Farmers tab ── */}
      {!loading && tab === "farmers" && (
        <div className="space-y-4">
          <input
            value={farmersSearch}
            onChange={(e) => setFarmersSearch(e.target.value)}
            placeholder="Search by org name, owner, email…"
            className="w-full max-w-md px-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <div className="space-y-3">
            {filteredFarmers.map((farmer) => {
              const isOpen = expandedFarmer === farmer.id;
              const detail = farmerDetail[farmer.id];
              return (
                <div key={farmer.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  {/* Header row */}
                  <button
                    onClick={() => toggleExpand(farmer.id)}
                    className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 text-violet-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800">{farmer.org_name}</p>
                      <p className="text-sm text-slate-500 truncate">
                        {farmer.owner_name} · {farmer.owner_email}
                        {farmer.owner_phone && ` · ${farmer.owner_phone}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 text-sm">
                      <span className="text-slate-600">
                        <span className="font-semibold">{farmer.farm_count}</span> farms
                      </span>
                      <span className="text-slate-600">
                        <span className={`font-semibold ${farmer.online_device_count > 0 ? "text-emerald-600" : ""}`}>{farmer.online_device_count}</span>
                        /{farmer.device_count} online
                      </span>
                      {farmer.running_actuator_count > 0 && (
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                          ● {farmer.running_actuator_count} running
                        </span>
                      )}
                      <span className="text-xs text-slate-400">Joined {new Date(farmer.created_at).toLocaleDateString("en-IN")}</span>
                      {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div className="border-t border-slate-100 px-5 pb-5 pt-4 grid grid-cols-1 lg:grid-cols-3 gap-5">
                      {/* Farms */}
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <Warehouse className="w-3.5 h-3.5" /> Farms ({detail?.farms.length ?? "…"})
                        </p>
                        {detail?.farms.length === 0 && <p className="text-xs text-slate-400">No farms</p>}
                        <div className="space-y-1.5">
                          {detail?.farms.map((f) => (
                            <div key={f.id} className="flex items-center gap-2 text-sm">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                              <span className="font-medium text-slate-700">{f.name}</span>
                              {f.location && <span className="text-xs text-slate-400 truncate">— {f.location}</span>}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Devices */}
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5" /> Devices ({detail?.devices.length ?? "…"})
                        </p>
                        <div className="space-y-1.5">
                          {detail?.devices.map((d) => (
                            <div key={d.id} className="flex items-center gap-2 text-sm">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${d.status === "online" ? "bg-emerald-400" : "bg-slate-300"}`} />
                              <span className="font-medium text-slate-700 truncate">{d.name}</span>
                              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${d.status === "online" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                {d.status}
                              </span>
                            </div>
                          ))}
                          {detail?.devices.length === 0 && <p className="text-xs text-slate-400">No devices</p>}
                        </div>
                      </div>

                      {/* Actuators */}
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5" /> Motors / Actuators ({detail?.actuators.length ?? "…"})
                        </p>
                        <div className="space-y-1.5">
                          {detail?.actuators.map((a) => (
                            <div key={a.id} className="flex items-center gap-2 text-sm">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${a.current_state === "on" ? "bg-primary-500" : "bg-slate-300"}`} />
                              <span className="font-medium text-slate-700 truncate capitalize">{a.name}</span>
                              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${a.current_state === "on" ? "bg-primary-50 text-primary-700" : "bg-slate-100 text-slate-500"}`}>
                                {a.current_state.toUpperCase()}
                              </span>
                            </div>
                          ))}
                          {detail?.actuators.length === 0 && <p className="text-xs text-slate-400">No motors</p>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Products tab ── */}
      {!loading && tab === "products" && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search products…"
              className="px-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 flex-1 max-w-sm"
            />
            <div className="flex items-center gap-2 flex-wrap">
              {["All", ...CATEGORIES].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setProductCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    productCategory === cat
                      ? "bg-primary-600 text-white border-primary-600"
                      : "border-slate-300 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <button
              onClick={() => setProductModal({ open: true, product: null })}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 shrink-0 ml-auto"
            >
              <Plus className="w-4 h-4" /> Add Product
            </button>
          </div>

          {/* Products grid */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No products yet. Click <strong>Add Product</strong> to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((p) => {
                const discount = Math.round((1 - p.price / p.original_price) * 100);
                return (
                  <div key={p.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
                    {/* Image */}
                    <div className="h-40 bg-slate-100 relative">
                      {p.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-12 h-12 text-slate-300" />
                        </div>
                      )}
                      {/* Badges */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        {discount > 0 && (
                          <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded">{discount}% off</span>
                        )}
                        {p.is_best_seller && (
                          <span className="text-[10px] font-bold bg-amber-400 text-white px-1.5 py-0.5 rounded">★ Best</span>
                        )}
                      </div>
                      <div className="absolute top-2 right-2">
                        {p.is_active
                          ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                          : <XCircle className="w-4 h-4 text-red-400" />}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3 flex-1 flex flex-col">
                      <p className="text-xs text-slate-400 mb-0.5">{p.category}</p>
                      <p className="text-sm font-semibold text-slate-800 leading-tight mb-1 line-clamp-2">{p.name}</p>
                      {p.unit && <p className="text-xs text-slate-400 mb-2">{p.unit}</p>}
                      <div className="flex items-baseline gap-2 mt-auto">
                        <span className="font-bold text-slate-800">₹{p.price}</span>
                        <span className="text-xs text-slate-400 line-through">₹{p.original_price}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">Stock: {p.stock_quantity}</p>

                      {/* Actions */}
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => setProductModal({ open: true, product: p })}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium hover:bg-slate-50"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(p.id)}
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-red-200 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Product modal */}
      {productModal.open && (
        <ProductModal
          product={productModal.product}
          onClose={() => setProductModal({ open: false, product: null })}
          onSaved={(saved) => {
            setProducts((prev) => {
              const idx = prev.findIndex((p) => p.id === saved.id);
              if (idx === -1) return [saved, ...prev];
              const next = [...prev];
              next[idx] = saved;
              return next;
            });
            setProductModal({ open: false, product: null });
          }}
        />
      )}

      {/* Delete confirm */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-lg text-slate-800 mb-2">Delete product?</h3>
            <p className="text-sm text-slate-500 mb-5">This will permanently remove the product from the shop.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium hover:bg-slate-50">Cancel</button>
              <button onClick={() => deleteProduct(deleteConfirm)} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
