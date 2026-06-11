"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  LayoutDashboard,
  Warehouse,
  Cpu,
  Zap,
  CalendarClock,
  Bell,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const mobileMenuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Warehouse, label: "Farms", href: "/farms" },
  { icon: Cpu, label: "Devices", href: "/devices" },
  { icon: Zap, label: "Automation", href: "/automation" },
  { icon: CalendarClock, label: "Schedules", href: "/schedules" },
  { icon: Bell, label: "Alerts", href: "/alerts" },
  { icon: BarChart3, label: "Analytics", href: "/analytics" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export default function Topbar({ title }: { title: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        <div className="flex items-center gap-3">
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
          <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
        </div>
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
                    ? "bg-primary-50 text-primary-700"
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
            Logout
          </button>
        </nav>
      )}
    </header>
  );
}
