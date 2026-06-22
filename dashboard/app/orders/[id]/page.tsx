"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, CheckCircle2, Truck, PackageCheck, XCircle, ShoppingBag,
  MapPin, Star, Package,
} from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import { httpClient } from "@/lib/api";
import type { Order, OrderItem, Product, ApiResponse } from "@/lib/types";

const STATUS_INFO: Record<string, { label: string; text: string; bg: string; icon: typeof ShoppingBag }> = {
  confirmed: { label: "Order Confirmed", text: "text-blue-600", bg: "bg-blue-50", icon: CheckCircle2 },
  shipped:   { label: "Shipped",         text: "text-violet-600", bg: "bg-violet-50", icon: Truck },
  delivered: { label: "Item Delivered",  text: "text-emerald-700", bg: "bg-emerald-50", icon: PackageCheck },
  cancelled: { label: "Order Cancelled", text: "text-red-600", bg: "bg-red-50", icon: XCircle },
  placed:    { label: "Order Placed",    text: "text-amber-600", bg: "bg-amber-50", icon: ShoppingBag },
};

function statusInfo(status: string) {
  return STATUS_INFO[status] ?? STATUS_INFO.placed;
}

function PImg({ src, alt, className }: { src?: string | null; alt: string; className?: string }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return <div className={`flex items-center justify-center text-4xl bg-emerald-50 ${className}`}>🌿</div>;
  }
  return <img src={src} alt={alt} className={`object-cover ${className}`} onError={() => setErr(true)} />;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function RatingBox({ productId, productName }: { productId: number; productName: string }) {
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [comment, setComment] = useState("");
  const [showComment, setShowComment] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(stars: number) {
    setRating(stars);
    setSubmitting(true);
    try {
      await httpClient.post(`/products/${productId}/reviews`, { rating: stars, comment: comment.trim() || null });
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return <p className="text-xs font-medium text-emerald-700 bg-violet-50 rounded-lg px-3 py-2">Thanks for rating {productName}!</p>;
  }

  return (
    <div className="bg-violet-50 rounded-lg px-3 py-2">
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((s) => (
          <button key={s} disabled={submitting} onClick={() => (showComment ? setRating(s) : submit(s))}>
            <Star className={`w-5 h-5 ${s <= rating ? "fill-red-500 text-red-500" : "text-slate-300"}`} />
          </button>
        ))}
        <span className="flex-1" />
        <button onClick={() => setShowComment((v) => !v)} className="text-xs font-semibold text-red-500 hover:underline">
          Write Review
        </button>
      </div>
      {showComment && (
        <div className="mt-2 flex gap-2">
          <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your experience (optional)"
            className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          <button disabled={submitting || rating === 0} onClick={() => submit(rating)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg">
            Submit
          </button>
        </div>
      )}
    </div>
  );
}

function YouMayAlsoLike({ items }: { items: OrderItem[] }) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    httpClient.get<ApiResponse<Product[]>>("/products").then((res) => setProducts(res.data)).catch(() => {});
  }, []);

  const orderedIds = new Set(items.map((i) => i.product_id).filter((id): id is number => id != null));
  const categories = new Set(items.map((i) => i.category).filter((c): c is string => !!c));
  const suggestions = products.filter((p) => categories.has(p.category) && !orderedIds.has(p.id));

  if (suggestions.length === 0) return null;

  return (
    <div className="border-t border-slate-100 pt-6">
      <p className="text-lg font-semibold text-slate-800 mb-4">You may also like</p>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {suggestions.map((p) => (
          <button key={p.id} onClick={() => router.push(`/shop/${p.id}`)}
            className="w-36 shrink-0 border border-slate-200 rounded-xl overflow-hidden text-left hover:shadow-md transition-shadow">
            <div className="h-24 bg-emerald-50 flex items-center justify-center overflow-hidden">
              <PImg src={p.image_url} alt={p.name} className="w-full h-full" />
            </div>
            <div className="p-2.5">
              <p className="text-xs text-slate-700 line-clamp-1 mb-1">{p.name}</p>
              <p className="text-sm font-semibold text-slate-800">₹{p.price.toLocaleString("en-IN")}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    httpClient.get<ApiResponse<Order[]>>("/orders/mine")
      .then((res) => setOrder(res.data.find((o) => o.id === id) ?? null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <DashboardShell breadcrumb={[{ label: "My Orders", href: "/orders" }, { label: "Order" }]}>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  if (!order) {
    return (
      <DashboardShell breadcrumb={[{ label: "My Orders", href: "/orders" }, { label: "Order" }]}>
        <div className="text-center py-24 text-slate-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold mb-2">Order not found</p>
          <button onClick={() => router.push("/orders")} className="text-sm text-emerald-600 hover:underline">← Back to My Orders</button>
        </div>
      </DashboardShell>
    );
  }

  const info = statusInfo(order.status);
  const StatusIcon = info.icon;
  const heroImage = order.items.find((i) => i.product_image)?.product_image;

  return (
    <DashboardShell breadcrumb={[{ label: "My Orders", href: "/orders" }, { label: `Order #${order.id}` }]}>
      <button onClick={() => router.push("/orders")} className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to My Orders
      </button>

      <div className="max-w-3xl space-y-6">
        <div className="rounded-2xl overflow-hidden bg-white border border-slate-200" style={{ height: 280 }}>
          <PImg src={heroImage} alt={`Order #${order.id}`} className="w-full h-full" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-800">Order #{order.id}</h1>
          <p className="text-sm text-slate-400 mt-1">Placed on {fmtDate(order.created_at)}</p>
        </div>

        <div className={`flex items-center gap-3 rounded-xl px-4 py-3.5 ${info.bg}`}>
          <StatusIcon className={`w-5 h-5 shrink-0 ${info.text}`} />
          <div>
            <p className={`text-sm font-semibold ${info.text}`}>{info.label}</p>
            {(order.status === "delivered" || order.status === "shipped" || order.status === "cancelled") && (
              <p className={`text-xs ${info.text} opacity-80`}>{fmtDate(order.updated_at)}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 bg-slate-50 rounded-2xl divide-x divide-slate-200">
          <div className="p-5">
            <p className="text-sm font-semibold text-slate-800 mb-1.5">Ordered</p>
            <p className="text-sm text-slate-700">{fmtDate(order.created_at)}</p>
            <p className="text-xs text-slate-400">{fmtTime(order.created_at)}</p>
          </div>
          <div className="p-5 text-right">
            <p className="text-sm font-semibold text-slate-800 mb-1.5">Payment</p>
            <p className="text-sm text-slate-700">{order.payment_method.toUpperCase()}</p>
            <p className="text-xs text-slate-400">₹{Number(order.total).toLocaleString("en-IN")}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-slate-700 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-slate-800 mb-1">Delivery address</p>
            <p className="text-sm text-slate-500">{order.delivery_address.name} · {order.delivery_address.phone}</p>
            <p className="text-sm text-slate-500">
              {order.delivery_address.line1}{order.delivery_address.line2 ? `, ${order.delivery_address.line2}` : ""}, {order.delivery_address.city}, {order.delivery_address.state} – {order.delivery_address.pincode}
            </p>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-6">
          <p className="text-lg font-semibold text-slate-800 mb-4">Order details</p>
          <div className="space-y-4">
            {order.items.map((item) => (
              <div key={item.id}>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-50 shrink-0">
                    <PImg src={item.product_image} alt={item.product_name} className="w-full h-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 line-clamp-1">{item.product_name}</p>
                    <p className="text-xs text-slate-400">{item.unit} · Qty {item.qty}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 shrink-0">₹{(Number(item.price) * item.qty).toLocaleString("en-IN")}</p>
                </div>
                {order.status === "delivered" && item.product_id != null && (
                  <div className="mt-2 ml-[68px]">
                    <RatingBox productId={item.product_id} productName={item.product_name} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-100 pt-5 space-y-2">
          <div className="flex justify-between text-sm text-slate-600">
            <span>Subtotal</span>
            <span>₹{Number(order.subtotal).toLocaleString("en-IN")}</span>
          </div>
          {Number(order.discount) > 0 && (
            <div className="flex justify-between text-sm text-emerald-600">
              <span>Discount{order.coupon_code ? ` (${order.coupon_code})` : ""}</span>
              <span>−₹{Number(order.discount).toLocaleString("en-IN")}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-slate-600">
            <span>Delivery</span>
            <span>{Number(order.delivery_charge) === 0 ? "Free" : `₹${Number(order.delivery_charge).toLocaleString("en-IN")}`}</span>
          </div>
          <div className="border-t border-slate-100 pt-2 flex justify-between text-base font-bold text-slate-800">
            <span>Total</span>
            <span>₹{Number(order.total).toLocaleString("en-IN")}</span>
          </div>
        </div>

        <YouMayAlsoLike items={order.items} />
      </div>
    </DashboardShell>
  );
}
