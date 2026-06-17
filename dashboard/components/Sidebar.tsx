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

interface MenuItem {
  icon: React.ElementType;
  label: string;
  href: string;
  textColor: string;
  bgLight: string;
}

const menuItems: MenuItem[] = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    href: "/",
    textColor: "text-primary-700",
    bgLight: "bg-primary-50",
  },
  {
    icon: Warehouse,
    label: "Farms & Devices",
    href: "/farms",
    textColor: "text-emerald-700",
    bgLight: "bg-emerald-50",
  },
  {
    icon: Zap,
    label: "Automation & Schedules",
    href: "/automation",
    textColor: "text-amber-700",
    bgLight: "bg-amber-50",
  },
  {
    icon: Bell,
    label: "Alerts",
    href: "/alerts",
    textColor: "text-amber-700",
    bgLight: "bg-amber-50",
  },
  {
    icon: BarChart3,
    label: "Analytics",
    href: "/analytics",
    textColor: "text-violet-700",
    bgLight: "bg-violet-50",
  },
  {
    icon: Map,
    label: "Map",
    href: "/map",
    textColor: "text-sky-700",
    bgLight: "bg-sky-50",
  },
  {
    icon: Settings,
    label: "Settings",
    href: "/settings",
    textColor: "text-slate-700",
    bgLight: "bg-slate-100",
  },
  {
    icon: ShoppingBag,
    label: "Market",
    href: "/shop",
    textColor: "text-green-700",
    bgLight: "bg-green-50",
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 border-r border-slate-200 bg-white h-screen sticky top-0">
      <div className="flex items-center gap-2 px-6 h-16 border-b border-slate-200">
        <Image src="/icon.png" alt="Mrunal Agro" width={36} height={36} className="rounded-lg" />
        <div className="leading-tight">
          <p className="font-semibold text-slate-800">Mrunal Agro</p>
          <p className="text-xs text-slate-500">Pumping Control</p>
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
          Logout
        </button>
      </div>
    </aside>
  );
}
