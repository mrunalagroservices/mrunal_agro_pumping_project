"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, ReactNode } from "react";
import {
  LayoutDashboard, Users, ShoppingBag, LogOut, ShieldCheck,
  Warehouse, ClipboardList, History, Settings2, UserCircle, Home,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const NAV = [
  { href: "/overview",       label: "Overview",        icon: LayoutDashboard },
  { href: "/farmers",        label: "Farmers",         icon: Users           },
  { href: "/users",          label: "Users",           icon: UserCircle      },
  { href: "/farms",          label: "Farms & Devices", icon: Warehouse       },
  { href: "/products",       label: "Products",        icon: ShoppingBag     },
  { href: "/home",           label: "Home Page",       icon: Home            },
  { href: "/orders",         label: "Orders",          icon: ClipboardList   },
  { href: "/search-history", label: "Search History",  icon: History         },
  { href: "/shop-settings",  label: "Shop Settings",   icon: Settings2       },
];

export default function AdminShell({ children, title }: { children: ReactNode; title: string }) {
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-slate-200">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 leading-tight">Admin Panel</p>
            <p className="text-[10px] text-slate-400 leading-tight">Mrunal Agro</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active ? "bg-emerald-50 text-emerald-700 font-semibold" : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                }`}>
                <Icon className={`w-4 h-4 ${active ? "text-emerald-600" : "text-slate-400"}`} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-4 border-t border-slate-200 pt-4 space-y-1">
          <div className="px-3 mb-2">
            <p className="text-xs font-semibold text-slate-800 truncate">{user.name}</p>
            <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
          </div>
          <button onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 sticky top-0 z-10">
          <h1 className="text-lg font-bold text-slate-800">{title}</h1>
          <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" /> Admin
          </span>
        </header>
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
