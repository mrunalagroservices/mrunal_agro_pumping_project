"use client";

import { ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Sidebar from "./Sidebar";
import Topbar, { BreadcrumbItem } from "./Topbar";

// Like DashboardShell, but doesn't force a login redirect — the Mandi
// homepage/product pages are browsable by anyone. Authenticated users get
// the normal Sidebar+Topbar; anonymous visitors get a minimal top bar with a
// "Sign in" button instead. Actions that actually need an account (add to
// cart, wishlist, checkout, reviews) are gated at the point of use, not here.
export default function MarketShell({
  breadcrumb,
  children,
}: {
  breadcrumb: BreadcrumbItem[];
  children: ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-accent-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="flex items-center justify-between gap-4 px-4 lg:px-6 py-3 bg-white border-b border-slate-200 sticky top-0 z-30">
          <Image src="/logo.png" alt="Mrunal Agro" width={433} height={355} className="h-8 w-auto" priority />
          <button
            onClick={() => router.push(`/login?redirect=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/shop")}`)}
            className="px-4 py-2 bg-accent-600 hover:bg-accent-700 text-white text-sm font-semibold rounded-full transition-colors shrink-0"
          >
            Sign in
          </button>
        </header>
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar breadcrumb={breadcrumb} />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
