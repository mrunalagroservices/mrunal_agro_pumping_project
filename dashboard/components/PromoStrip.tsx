"use client";

import { useRouter } from "next/navigation";
import { Truck, Tag, Percent, Gift, Sprout, Droplets, Zap, ShoppingBag } from "lucide-react";
import { Banner } from "@/lib/types";

const ICONS: Record<string, typeof Truck> = { Truck, Tag, Percent, Gift, Sprout, Droplets, Zap, ShoppingBag };

// The 3-card mid-page promo row (admin-managed, Admin → Banners → Promo strip),
// matching the grocery-storefront reference layout.
export default function PromoStrip({ banners }: { banners: Banner[] }) {
  const router = useRouter();
  if (banners.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      {banners.slice(0, 3).map((banner) => {
        const Icon = banner.icon ? ICONS[banner.icon] : null;
        return (
          <div
            key={banner.id}
            onClick={() => banner.link_url && router.push(banner.link_url)}
            className="relative rounded-2xl overflow-hidden h-40 p-5 flex flex-col justify-between cursor-pointer group"
            style={{ background: `linear-gradient(135deg, ${banner.gradient_from}, ${banner.gradient_to})` }}
          >
            {banner.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={banner.image_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:scale-105 transition-transform duration-300" />
            )}
            {Icon && <Icon className="absolute right-4 bottom-4 w-16 h-16 text-white/15" strokeWidth={1.5} />}
            <div className="relative z-10">
              <h3 className="text-white text-lg font-bold leading-snug">{banner.title}</h3>
              {banner.subtitle && <p className="text-white/85 text-xs mt-1">{banner.subtitle}</p>}
            </div>
            <span className="relative z-10 inline-flex items-center self-start bg-white/95 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-full group-hover:bg-white transition-colors">
              Shop Now
            </span>
          </div>
        );
      })}
    </div>
  );
}
