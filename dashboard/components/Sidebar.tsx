"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Warehouse,
  Zap,
  Bell,
  BarChart3,
  Map,
  Settings,
  LogOut,
  ShoppingBag,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";

interface MenuItem {
  icon: React.ElementType;
  label: string;
  href: string;
  textColor: string;
  bgLight: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useLocale();

  const menuItems: MenuItem[] = [
    {
      icon: LayoutDashboard,
      label: t("nav_dashboard"),
      href: "/",
      textColor: "text-accent-700",
      bgLight: "bg-accent-50",
    },
    {
      icon: Warehouse,
      label: t("nav_farms_devices"),
      href: "/farms",
      textColor: "text-emerald-700",
      bgLight: "bg-emerald-50",
    },
    {
      icon: Zap,
      label: t("nav_automation_schedules"),
      href: "/automation",
      textColor: "text-amber-700",
      bgLight: "bg-amber-50",
    },
    {
      icon: Bell,
      label: t("nav_alerts"),
      href: "/alerts",
      textColor: "text-amber-700",
      bgLight: "bg-amber-50",
    },
    {
      icon: BarChart3,
      label: t("nav_analytics"),
      href: "/analytics",
      textColor: "text-violet-700",
      bgLight: "bg-violet-50",
    },
    {
      icon: Map,
      label: t("nav_map"),
      href: "/map",
      textColor: "text-sky-700",
      bgLight: "bg-sky-50",
    },
    {
      icon: Settings,
      label: t("nav_settings"),
      href: "/settings",
      textColor: "text-slate-700",
      bgLight: "bg-slate-100",
    },
    {
      icon: ShoppingBag,
      label: t("nav_market"),
      href: "/shop",
      textColor: "text-green-700",
      bgLight: "bg-green-50",
    },
  ];

  return (
    <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 border-r border-slate-200 bg-white h-screen sticky top-0">
      <div className="flex items-center gap-2 px-6 h-16 border-b border-slate-200">
        <Image src="/icon.png" alt="Mrunal Agro" width={36} height={36} className="rounded-lg" />
        <div className="leading-tight">
          <p className="font-semibold text-slate-800">Mrunal Agro</p>
          <p className="text-xs text-slate-500">{t("nav_pumping_control")}</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? `${item.bgLight} ${item.textColor}`
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}

      </nav>

      <div className="px-3 py-4 border-t border-slate-200">
        <div className="px-3 mb-2">
          <p className="text-sm font-medium text-slate-800 truncate">
            {user?.name}
          </p>
          <p className="text-xs text-slate-500 truncate">{user?.email}</p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          {t("nav_logout")}
        </button>
      </div>
    </aside>
  );
}
