"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Package } from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import { httpClient } from "@/lib/api";
import { ApiResponse, Order } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  placed:    "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  shipped:   "bg-purple-100 text-purple-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-600",
};

function OrderRow({ order, onOpen }: { order: Order; onOpen: () => void }) {
  const total = Number(order.total);
  return (
    <button onClick={onOpen}
      className="w-full flex items-center gap-3 px-4 py-4 text-left border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-slate-800">Order #{order.id}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[order.status] || "bg-slate-100 text-slate-600"}`}>{order.status}</span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          {new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {order.items.length} item{order.items.length !== 1 ? "s" : ""} · {order.payment_method.toUpperCase()}
        </p>
      </div>
      <p className="text-sm font-black text-slate-800 shrink-0">₹{total.toLocaleString("en-IN")}</p>
      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
    </button>
  );
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    httpClient.get<ApiResponse<Order[]>>("/orders/mine")
      .then((res) => setOrders(res.data))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardShell breadcrumb={[{ label: "My Orders" }]}>
      <div className="max-w-3xl space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
            <Package className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="font-semibold text-slate-600 mb-1">No orders yet</p>
            <p className="text-sm text-slate-400 mb-4">Start shopping in the Market to see your orders here.</p>
            <a href="/shop" className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full text-sm transition-colors">
              Go to Market →
            </a>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500">{orders.length} order{orders.length !== 1 ? "s" : ""} placed</p>
            {orders.map((o) => <OrderRow key={o.id} order={o} onOpen={() => router.push(`/orders/${o.id}`)} />)}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
