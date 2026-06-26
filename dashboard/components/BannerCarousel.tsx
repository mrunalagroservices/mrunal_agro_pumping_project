"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Truck, Tag, Percent, Gift, Sprout, Droplets, Zap, ShoppingBag } from "lucide-react";
import { Banner } from "@/lib/types";

const ICONS: Record<string, typeof Truck> = { Truck, Tag, Percent, Gift, Sprout, Droplets, Zap, ShoppingBag };

const AUTOPLAY_MS = 4500;

// Amazon/Myntra-style sliding promo carousel for the Market homepage — every
// banner is admin-managed (Admin → Banners), so marketing copy/images can
// change without a deploy.
export default function BannerCarousel({ banners }: { banners: Banner[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (banners.length <= 1) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % banners.length);
    }, AUTOPLAY_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [banners.length]);

  if (banners.length === 0) return null;

  const goTo = (i: number) => setIndex(((i % banners.length) + banners.length) % banners.length);
  const banner = banners[index];
  const Icon = banner.icon ? ICONS[banner.icon] : null;

  return (
    <div className="relative -mx-4 lg:-mx-6 -mt-4 lg:-mt-6 mb-8 overflow-hidden rounded-b-2xl group" style={{ height: 220 }}>
      <div
        className="absolute inset-0 flex items-center cursor-pointer transition-opacity"
        style={{ background: `linear-gradient(135deg, ${banner.gradient_from}, ${banner.gradient_to})` }}
        onClick={() => banner.link_url && router.push(banner.link_url)}
      >
        {banner.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={banner.image_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
        )}
        <div className="relative z-10 px-8 lg:px-12 max-w-lg">
          <h2 className="text-white text-2xl lg:text-3xl font-black leading-tight mb-2">{banner.title}</h2>
          {banner.subtitle && <p className="text-white/90 text-sm">{banner.subtitle}</p>}
        </div>
        {Icon && (
          <Icon className="absolute right-10 bottom-6 w-24 h-24 text-white/15 hidden lg:block" strokeWidth={1.5} />
        )}
      </div>

      {banners.length > 1 && (
        <>
          <button
            onClick={() => goTo(index - 1)}
            aria-label="Previous banner"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/25 hover:bg-white/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => goTo(index + 1)}
            aria-label="Next banner"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/25 hover:bg-white/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {banners.map((b, i) => (
              <button
                key={b.id}
                onClick={() => goTo(i)}
                aria-label={`Go to banner ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-white" : "w-1.5 bg-white/50"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
