"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, GalleryHorizontal, LayoutGrid, Rows3 } from "lucide-react";
import AdminShell from "@/components/AdminShell";
import BannerModal from "@/components/BannerModal";
import HomeSectionModal from "@/components/HomeSectionModal";
import { httpClient } from "@/lib/api";
import { Banner, BannerPlacement, HomeSection, ApiResponse } from "@/lib/types";

type Tab = "hero" | "promo" | "sections";

const EMPTY_BANNER = (placement: BannerPlacement): Partial<Banner> => ({
  title: "", subtitle: "", image_url: "", gradient_from: "#16a34a", gradient_to: "#0d9488",
  icon: placement === "promo" ? "Sprout" : "Tag", link_url: "", placement, sort_order: 0, is_active: true,
});
const EMPTY_SECTION: Partial<HomeSection> = {
  title: "", subtitle: "", source: "best_seller", category: "", layout: "row", max_items: 10, sort_order: 0, is_active: true,
};

const SOURCE_LABELS: Record<string, string> = {
  best_seller: "Best Sellers", deals: "Deals of the Day", newest: "New Arrivals", category: "By Category",
};

export default function HomePageEditor() {
  const [tab, setTab] = useState<Tab>("hero");
  const [banners, setBanners] = useState<Banner[]>([]);
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [loading, setLoading] = useState(true);

  const [bannerModal, setBannerModal] = useState<Partial<Banner> | null>(null);
  const [sectionModal, setSectionModal] = useState<Partial<HomeSection> | null>(null);
  const [deleteBannerId, setDeleteBannerId] = useState<number | null>(null);
  const [deleteSectionId, setDeleteSectionId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [bRes, sRes] = await Promise.all([
        httpClient.get<ApiResponse<Banner[]>>("/admin/banners"),
        httpClient.get<ApiResponse<HomeSection[]>>("/admin/home-sections"),
      ]);
      setBanners(bRes.data);
      setSections(sRes.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Banners ────────────────────────────────────────────────────────────────
  async function saveBanner(data: Partial<Banner>) {
    if (data.id) {
      const res = await httpClient.put<ApiResponse<Banner>>(`/admin/banners/${data.id}`, data);
      setBanners((b) => b.map((x) => x.id === data.id ? res.data : x));
    } else {
      const res = await httpClient.post<ApiResponse<Banner>>("/admin/banners", data);
      setBanners((b) => [...b, res.data]);
    }
  }
  async function delBanner(id: number) {
    await httpClient.delete<ApiResponse<unknown>>(`/admin/banners/${id}`);
    setBanners((b) => b.filter((x) => x.id !== id));
    setDeleteBannerId(null);
  }
  async function moveBanner(group: Banner[], banner: Banner, dir: -1 | 1) {
    const idx = group.findIndex((b) => b.id === banner.id);
    const swap = group[idx + dir];
    if (!swap) return;
    await Promise.all([
      saveBanner({ id: banner.id, sort_order: swap.sort_order }),
      saveBanner({ id: swap.id, sort_order: banner.sort_order }),
    ]);
  }
  const bannerGroup = (placement: BannerPlacement) =>
    banners.filter((b) => b.placement === placement).sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);

  // ── Sections ─────────────────────────────────────────────────────────────────
  async function saveSection(data: Partial<HomeSection>) {
    if (data.id) {
      const res = await httpClient.put<ApiResponse<HomeSection>>(`/admin/home-sections/${data.id}`, data);
      setSections((s) => s.map((x) => x.id === data.id ? res.data : x));
    } else {
      const res = await httpClient.post<ApiResponse<HomeSection>>("/admin/home-sections", data);
      setSections((s) => [...s, res.data]);
    }
  }
  async function delSection(id: number) {
    await httpClient.delete<ApiResponse<unknown>>(`/admin/home-sections/${id}`);
    setSections((s) => s.filter((x) => x.id !== id));
    setDeleteSectionId(null);
  }
  async function moveSection(section: HomeSection, dir: -1 | 1) {
    const sorted = [...sections].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
    const idx = sorted.findIndex((s) => s.id === section.id);
    const swap = sorted[idx + dir];
    if (!swap) return;
    await Promise.all([
      saveSection({ id: section.id, sort_order: swap.sort_order }),
      saveSection({ id: swap.id, sort_order: section.sort_order }),
    ]);
  }
  const sortedSections = [...sections].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);

  function BannerRows({ group, placement }: { group: Banner[]; placement: BannerPlacement }) {
    return (
      <>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-500">
            {placement === "hero"
              ? "The big sliding carousel at the very top of the Market homepage."
              : "The row of smaller promo cards below the categories."}
          </p>
          <button onClick={() => setBannerModal(EMPTY_BANNER(placement))}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors shrink-0 ml-4">
            <Plus className="w-4 h-4" /> Add Banner
          </button>
        </div>
        {group.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <GalleryHorizontal className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="font-medium text-sm">No banners here yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {group.map((b, i) => (
              <div key={b.id} className={`flex items-center gap-4 bg-white rounded-2xl border ${b.is_active ? "border-slate-200" : "border-slate-200 opacity-60"} p-4`}>
                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={() => moveBanner(group, b, -1)} disabled={i === 0} className="p-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition">
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => moveBanner(group, b, 1)} disabled={i === group.length - 1} className="p-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="w-32 h-16 rounded-xl shrink-0 relative overflow-hidden flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${b.gradient_from}, ${b.gradient_to})` }}>
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
                  <button onClick={() => setBannerModal(b)} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 transition">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => setDeleteBannerId(b.id)} className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 text-xs font-semibold rounded-xl hover:bg-red-50 transition">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    );
  }

  return (
    <AdminShell title="Home Page">
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        {([
          { id: "hero", label: "Hero Banners" },
          { id: "promo", label: "Promo Cards" },
          { id: "sections", label: "Product Sections" },
        ] as { id: Tab; label: string }[]).map((tb) => (
          <button key={tb.id} onClick={() => setTab(tb.id)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === tb.id ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}>
            {tb.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === "hero" ? (
        <BannerRows group={bannerGroup("hero")} placement="hero" />
      ) : tab === "promo" ? (
        <BannerRows group={bannerGroup("promo")} placement="promo" />
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-500">Curated product rows shown on the homepage (e.g. &quot;Popular Products&quot;, &quot;Deals of the Day&quot;).</p>
            <button onClick={() => setSectionModal(EMPTY_SECTION)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors shrink-0 ml-4">
              <Plus className="w-4 h-4" /> Add Section
            </button>
          </div>
          {sortedSections.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Rows3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="font-medium text-sm">No product sections yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedSections.map((s, i) => (
                <div key={s.id} className={`flex items-center gap-4 bg-white rounded-2xl border ${s.is_active ? "border-slate-200" : "border-slate-200 opacity-60"} p-4`}>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button onClick={() => moveSection(s, -1)} disabled={i === 0} className="p-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition">
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => moveSection(s, 1)} disabled={i === sortedSections.length - 1} className="p-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition">
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 text-emerald-600">
                    {s.layout === "grid" ? <LayoutGrid className="w-5 h-5" /> : <Rows3 className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{s.title}</p>
                    <p className="text-xs text-slate-400">
                      {SOURCE_LABELS[s.source] ?? s.source}{s.source === "category" && s.category ? ` · ${s.category}` : ""} · up to {s.max_items} items
                    </p>
                    {!s.is_active && <span className="inline-block mt-1 text-[10px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded">Hidden</span>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => setSectionModal(s)} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 transition">
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button onClick={() => setDeleteSectionId(s.id)} className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 text-xs font-semibold rounded-xl hover:bg-red-50 transition">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {bannerModal && <BannerModal banner={bannerModal} onClose={() => setBannerModal(null)} onSave={saveBanner} />}
      {sectionModal && <HomeSectionModal section={sectionModal} onClose={() => setSectionModal(null)} onSave={saveSection} />}

      {deleteBannerId !== null && (
        <DeleteDialog title="Delete Banner?" body="This cannot be undone. The banner will be removed from the Market homepage."
          onCancel={() => setDeleteBannerId(null)} onConfirm={() => delBanner(deleteBannerId)} />
      )}
      {deleteSectionId !== null && (
        <DeleteDialog title="Delete Section?" body="This cannot be undone. The product row will be removed from the homepage."
          onCancel={() => setDeleteSectionId(null)} onConfirm={() => delSection(deleteSectionId)} />
      )}
    </AdminShell>
  );
}

function DeleteDialog({ title, body, onCancel, onConfirm }: { title: string; body: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-7 h-7 text-red-600" />
        </div>
        <h3 className="font-bold text-lg text-slate-800 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 mb-6">{body}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-slate-300 text-slate-600 font-semibold rounded-xl hover:bg-slate-50">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl">Delete</button>
        </div>
      </div>
    </div>
  );
}
