"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronDown, ChevronRight, ClipboardList, MapPin, Package } from "lucide-react";
import AdminShell from "@/components/AdminShell";
import { httpClient } from "@/lib/api";
import { AdminOrder, ApiResponse } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  placed:    "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  shipped:   "bg-purple-100 text-purple-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-600",
};

const ALL_STATUSES = ["placed", "confirmed", "shipped", "delivered", "cancelled"];

function OrderRow({ order, onStatusChange }: {
  order: AdminOrder;
  onStatusChange: (id: number, status: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  async function changeStatus(status: string) {
    setUpdating(true);
    try { await onStatusChange(order.id, status); }
    finally { setUpdating(false); }
  }

  return (
    <>
      <tr className="hover:bg-slate-50 cursor-pointer" onClick={() => setOpen((v) => !v)}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            <span className="font-mono font-bold text-slate-800 text-sm">#{order.id}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <p className="text-sm font-semibold text-slate-800">{order.user_name || "—"}</p>
          <p className="text-xs text-slate-400">{order.user_email || ""}</p>
        </td>
        <td className="px-4 py-3 text-xs text-slate-500">
          {new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold capitalize ${STATUS_COLORS[order.status] || "bg-slate-100 text-slate-600"}`}>
            {order.status}
          </span>
        </td>
        <td className="px-4 py-3 text-sm font-semibold text-slate-500 capitalize">{order.payment_method}</td>
        <td className="px-4 py-3 text-sm font-black text-slate-800">₹{Number(order.total).toLocaleString("en-IN")}</td>
        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
          <select
            value={order.status}
            onChange={(e) => changeStatus(e.target.value)}
            disabled={updating}
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 transition"
          >
            {ALL_STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </td>
      </tr>

      {open && (
        <tr>
          <td colSpan={7} className="bg-emerald-50/40 px-8 pb-5 pt-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Items */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                  <Package className="w-3 h-3" /> Items ({order.items.length})
                </p>
                <div className="space-y-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 bg-white border border-slate-100 rounded-lg px-3 py-2">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 text-lg overflow-hidden">
                        {item.product_image
                          ? <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover rounded-lg" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          : "🌿"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 line-clamp-1">{item.product_name}</p>
                        <p className="text-[10px] text-slate-400">{item.unit} · Qty: {item.qty}</p>
                      </div>
                      <p className="text-xs font-bold text-slate-700 shrink-0">₹{(Number(item.price) * item.qty).toLocaleString("en-IN")}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery + financials */}
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Delivery Address
                  </p>
                  <div className="bg-white border border-slate-100 rounded-lg px-3 py-2 text-xs text-slate-700">
                    <p className="font-semibold">{order.delivery_address.name} · {order.delivery_address.phone}</p>
                    <p>{order.delivery_address.line1}{order.delivery_address.line2 ? `, ${order.delivery_address.line2}` : ""}</p>
                    <p>{order.delivery_address.city}, {order.delivery_address.state} – {order.delivery_address.pincode}</p>
                  </div>
                </div>
                <div className="bg-white border border-slate-100 rounded-lg px-3 py-2 text-xs space-y-1">
                  <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>₹{Number(order.subtotal).toLocaleString("en-IN")}</span></div>
                  {Number(order.discount) > 0 && <div className="flex justify-between text-emerald-600 font-medium"><span>Discount {order.coupon_code && `(${order.coupon_code})`}</span><span>−₹{Number(order.discount)}</span></div>}
                  <div className="flex justify-between text-slate-500"><span>Delivery</span><span>{Number(order.delivery_charge) === 0 ? "Free" : `₹${order.delivery_charge}`}</span></div>
                  <div className="flex justify-between font-bold text-slate-800 border-t border-slate-100 pt-1 mt-1"><span>Total</span><span>₹{Number(order.total).toLocaleString("en-IN")}</span></div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await httpClient.get<ApiResponse<AdminOrder[]>>("/admin/orders");
      setOrders(res.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id: number, status: string) {
    await httpClient.put<ApiResponse<AdminOrder>>(`/admin/orders/${id}`, { status });
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status } : o));
  }

  const filtered = orders.filter((o) => {
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    const matchSearch = !search || (o.user_name || "").toLowerCase().includes(search.toLowerCase())
      || (o.user_email || "").toLowerCase().includes(search.toLowerCase())
      || String(o.id).includes(search);
    return matchStatus && matchSearch;
  });

  return (
    <AdminShell title="Orders">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email or order #…"
          className="border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64 transition"
        />
        <div className="flex gap-2">
          {["all", ...ALL_STATUSES].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors capitalize ${statusFilter === s ? "bg-emerald-600 text-white border-emerald-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <span className="text-sm text-slate-500 ml-auto">{filtered.length} order{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Order</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Customer</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Payment</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Total</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Update Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <ClipboardList className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-slate-400 font-medium">No orders found</p>
                  </td>
                </tr>
              ) : (
                filtered.map((o) => <OrderRow key={o.id} order={o} onStatusChange={updateStatus} />)
              )}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
