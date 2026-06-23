"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  ChevronRight,
  LayoutDashboard,
  Warehouse,
  Zap,
  Bell,
  BarChart3,
  Map,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import LanguageSwitcher from "./LanguageSwitcher";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function Topbar({ breadcrumb }: { breadcrumb: BreadcrumbItem[] }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { logout } = useAuth();
  const { t } = useLocale();

  const mobileMenuItems = [
    { icon: LayoutDashboard, label: t("nav_dashboard"), href: "/" },
    { icon: Warehouse, label: t("nav_farms_devices"), href: "/farms" },
    { icon: Zap, label: t("nav_automation_schedules"), href: "/automation" },
    { icon: Bell, label: t("nav_alerts"), href: "/alerts" },
    { icon: BarChart3, label: t("nav_analytics"), href: "/analytics" },
    { icon: Map, label: t("nav_map"), href: "/map" },
    { icon: Settings, label: t("nav_settings"), href: "/settings" },
  ];

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <button
            className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
          <div className="lg:hidden flex items-center gap-2">
            <Image src="/icon.png" alt="Mrunal Agro" width={32} height={32} className="rounded-lg" />
          </div>
          <nav className="flex items-center gap-1.5 text-sm min-w-0 overflow-hidden">
            {breadcrumb.length === 0 ? (
              <span className="font-semibold text-slate-800 truncate">{t("topbar_home")}</span>
            ) : (
              <Link href="/" className="text-slate-500 hover:text-slate-700 shrink-0">
                {t("topbar_home")}
              </Link>
            )}
            {breadcrumb.map((item, idx) => {
              const isLast = idx === breadcrumb.length - 1;
              return (
                <span key={idx} className="flex items-center gap-1.5 min-w-0">
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  {item.href && !isLast ? (
                    <Link
                      href={item.href}
                      className="text-slate-500 hover:text-slate-700 truncate"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span
                      className={`truncate ${
                        isLast
                          ? "font-semibold text-slate-800"
                          : "text-slate-500"
                      }`}
                    >
                      {item.label}
                    </span>
                  )}
                </span>
              );
            })}
          </nav>
        </div>
        <LanguageSwitcher />
      </div>

      {mobileOpen && (
        <nav className="lg:hidden border-t border-slate-200 px-3 py-3 space-y-1">
          {mobileMenuItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive
                    ? "bg-accent-50 text-accent-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="w-5 h-5" />
            {t("nav_logout")}
          </button>
        </nav>
      )}
    </header>
  );
}
