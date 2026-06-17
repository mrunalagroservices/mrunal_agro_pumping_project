"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Mail, Phone, Building2, Calendar, ShoppingBag,
  MapPin, Search, CreditCard, ShoppingCart, Package, ChevronDown, ChevronRight,
} from "lucide-react";
import AdminShell from "@/components/AdminShell";
import { httpClient } from "@/lib/api";
import { UserProfile, ApiResponse } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  placed:    "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  shipped:   "bg-purple-100 text-purple-700",
  delivered: "bg-teal-100 text-teal-700",
  cancelled: "bg-red-100 text-red-600",
};

function Section({ title, icon: Icon, children, count }: {
  title: string; icon: React.ElementType; children: React.ReactNode; count?: number;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
        <Icon className="w-4 h-4 text-teal-600" />
        {title}
        {count !== undefined && (
          <span className="ml-auto text-xs font-semibold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full border border-teal-100">
            {count}
          </span>
        )}
      </h2>
      {children}
    </div>
  );
}

function OrderCard({ order }: { order: UserProfile["orders"][number] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
        <span className="font-mono font-bold text-slate-700 text-sm">#{order.id}</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[order.status] || "bg-slate-100 text-slate-600"}`}>
          {order.status}
        </span>
        <span className="text-xs text-slate-400 ml-1 capitalize">{order.payment_method}</span>
        <span className="ml-auto text-sm font-black text-slate-800">₹{Number(order.total).toLocaleString("en-IN")}</span>
        <span className="text-xs text-slate-400 ml-3 shrink-0">
          {new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-100 bg-teal-50/30 px-4 py-3 space-y-3">
          {/* Items */}
          <div className="space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 bg-white border border-slate-100 rounded-lg px-3 py-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center shrink-0 text-base overflow-hidden">
                  {item.product_image
                    ? <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover rounded-lg" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    : "🌿"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{item.product_name}</p>
                  <p className="text-[10px] text-slate-400">{item.unit} · Qty {item.qty}</p>
                </div>
                <p className="text-xs font-bold text-slate-700">₹{(Number(item.price) * item.qty).toLocaleString("en-IN")}</p>
              </div>
            ))}
          </div>
          {/* Address + summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-slate-100 rounded-lg px-3 py-2 text-xs text-slate-700">
              <p className="font-bold text-slate-500 uppercase text-[10px] mb-1">Delivery</p>
              <p className="font-semibold">{order.delivery_address.name} · {order.delivery_address.phone}</p>
              <p>{order.delivery_address.line1}{order.delivery_address.line2 ? `, ${order.delivery_address.line2}` : ""}</p>
              <p>{order.delivery_address.city}, {order.delivery_address.state} – {order.delivery_address.pincode}</p>
            </div>
            <div className="bg-white border border-slate-100 rounded-lg px-3 py-2 text-xs space-y-1">
              <p className="font-bold text-slate-500 uppercase text-[10px] mb-1">Summary</p>
              <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>₹{Number(order.subtotal).toLocaleString("en-IN")}</span></div>
              {Number(order.discount) > 0 && <div className="flex justify-between text-teal-600 font-medium"><span>Discount {order.coupon_code && `(${order.coupon_code})`}</span><span>−₹{Number(order.discount)}</span></div>}
              <div className="flex justify-between text-slate-500"><span>Delivery</span><span>{Number(order.delivery_charge) === 0 ? "Free" : `₹${order.delivery_charge}`}</span></div>
              <div className="flex justify-between font-bold text-slate-800 border-t border-slate-100 pt-1 mt-1"><span>Total</span><span>₹{Number(order.total).toLocaleString("en-IN")}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await httpClient.get<ApiResponse<UserProfile>>(`/admin/users/${params.id}`);
      setProfile(res.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <AdminShell title="User Profile">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminShell>
    );
  }

  if (!profile) {
    return (
      <AdminShell title="User Profile">
        <div className="text-center py-20 text-slate-400">User not found.</div>
      </AdminShell>
    );
  }

  const { user, orders, cart, top_searches, payment_methods } = profile;

  // Unique delivery addresses from orders
  const addresses = Object.values(
    orders.reduce((acc, o) => {
      const key = `${o.delivery_address.line1}|${o.delivery_address.pincode}`;
      if (!acc[key]) acc[key] = o.delivery_address;
      return acc;
    }, {} as Record<string, UserProfile["orders"][number]["delivery_address"]>)
  );

  // Preferred payment method
  const topPayment = payment_methods[0];

  // Total spent
  const totalSpent = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + Number(o.total), 0);

  return (
    <AdminShell title="User Profile">
      {/* Back button */}
      <button onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Users
      </button>

      {/* Profile header card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-teal-600 flex items-center justify-center shrink-0">
            <span className="text-2xl font-black text-white">{user.name.charAt(0).toUpperCase()}</span>
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black text-slate-800">{user.name}</h2>
            <p className="text-sm text-slate-500 capitalize">{user.role}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
              <span className="flex items-center gap-1.5"><Mail className="w-4 h-4 text-slate-400" /> {user.email}</span>
              {user.phone && <span className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-slate-400" /> {user.phone}</span>}
              <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4 text-slate-400" /> {user.org_name}</span>
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-slate-400" />
                Joined {new Date(user.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            </div>
          </div>
          {/* Stat pills */}
          <div className="flex flex-col gap-2 shrink-0 text-right">
            <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-2 text-center">
              <p className="text-xl font-black text-teal-700">{orders.length}</p>
              <p className="text-xs text-teal-600 font-medium">Orders</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-center">
              <p className="text-xl font-black text-slate-800">₹{totalSpent.toLocaleString("en-IN")}</p>
              <p className="text-xs text-slate-500 font-medium">Total Spent</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left column — narrow stats */}
        <div className="space-y-5">

          {/* Current Cart */}
          <Section title="Current Cart" icon={ShoppingCart} count={cart.length}>
            {cart.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Cart is empty</p>
            ) : (
              <div className="space-y-2">
                {cart.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center shrink-0 text-base overflow-hidden">
                      {item.product?.image_url
                        ? <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover rounded-lg" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        : "🌿"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{item.product?.name}</p>
                      <p className="text-[10px] text-slate-400">{item.product?.unit} · Qty {item.qty}</p>
                    </div>
                    <p className="text-xs font-bold text-teal-700 shrink-0">
                      ₹{(Number(item.product?.price ?? 0) * item.qty).toLocaleString("en-IN")}
                    </p>
                  </div>
                ))}
                <div className="text-right text-xs font-bold text-slate-600 pt-1">
                  Cart total: ₹{cart.reduce((s, i) => s + Number(i.product?.price ?? 0) * i.qty, 0).toLocaleString("en-IN")}
                </div>
              </div>
            )}
          </Section>

          {/* Top Searches */}
          <Section title="Top Searches" icon={Search} count={top_searches.length}>
            {top_searches.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No searches recorded</p>
            ) : (
              <div className="space-y-2">
                {top_searches.map((s, i) => (
                  <div key={s.query} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 w-4">{i + 1}</span>
                    <span className="flex-1 text-sm text-slate-700 font-medium truncate">"{s.query}"</span>
                    <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full shrink-0">{s.count}×</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Payment Preference */}
          <Section title="Payment Methods" icon={CreditCard}>
            {payment_methods.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No orders yet</p>
            ) : (
              <div className="space-y-2">
                {payment_methods.map((p) => (
                  <div key={p.payment_method} className="flex items-center gap-3">
                    <div className={`flex-1 h-2 rounded-full bg-slate-100 overflow-hidden`}>
                      <div
                        className="h-2 rounded-full bg-teal-500 transition-all"
                        style={{ width: `${(Number(p.count) / Number(payment_methods[0].count)) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 capitalize w-24 text-right shrink-0">{p.payment_method}</span>
                    <span className="text-xs text-slate-400 w-8 text-right shrink-0">{p.count}×</span>
                  </div>
                ))}
                {topPayment && (
                  <p className="text-xs text-slate-400 pt-1">
                    Prefers <span className="font-semibold text-teal-700 capitalize">{topPayment.payment_method}</span>
                  </p>
                )}
              </div>
            )}
          </Section>

          {/* Addresses */}
          <Section title="Delivery Addresses" icon={MapPin} count={addresses.length}>
            {addresses.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No addresses on record</p>
            ) : (
              <div className="space-y-2">
                {addresses.map((a, i) => (
                  <div key={i} className="bg-slate-50 rounded-xl px-3 py-2.5 text-xs text-slate-700">
                    <p className="font-semibold text-slate-800">{a.name} · {a.phone}</p>
                    <p>{a.line1}{a.line2 ? `, ${a.line2}` : ""}</p>
                    <p>{a.city}, {a.state} – {a.pincode}</p>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* Right column — orders */}
        <div className="lg:col-span-2">
          <Section title="Order History" icon={ShoppingBag} count={orders.length}>
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400 font-medium">No orders yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {orders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>
    </AdminShell>
  );
}
