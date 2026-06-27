"use client";

import { Truck, Clock, RotateCcw, CreditCard, Headset } from "lucide-react";

const BADGES = [
  { icon: Truck, title: "Free Delivery", subtitle: "On all orders above ₹499" },
  { icon: Clock, title: "Fast Dispatch", subtitle: "Same-day from local retailers" },
  { icon: RotateCcw, title: "Easy Returns", subtitle: "For damaged or wrong items" },
  { icon: CreditCard, title: "All Payment Modes", subtitle: "UPI, Cards, Net Banking, COD" },
  { icon: Headset, title: "Customer Support", subtitle: "7am–10pm, Mon–Sat" },
];

// Static trust-signal strip (grocery-storefront style) — no admin editing
// needed since the claims are policy text, not per-product/per-banner data.
export default function TrustBadges() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 bg-white border border-slate-200 rounded-2xl p-5 mb-8">
      {BADGES.map((b) => (
        <div key={b.title} className="flex flex-col items-center text-center gap-1.5">
          <b.icon className="w-6 h-6 text-emerald-600" strokeWidth={1.75} />
          <p className="text-xs font-bold text-slate-800">{b.title}</p>
          <p className="text-[11px] text-slate-400 leading-snug">{b.subtitle}</p>
        </div>
      ))}
    </div>
  );
}
