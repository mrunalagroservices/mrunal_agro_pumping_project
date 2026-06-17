"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, Warehouse, Cpu, Zap, Wifi, WifiOff } from "lucide-react";
import AdminShell from "@/components/AdminShell";
import { httpClient } from "@/lib/api";
import { AdminStats, ApiResponse } from "@/lib/types";

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <p className="text-3xl font-bold text-slate-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await httpClient.get<ApiResponse<AdminStats>>("/admin/stats");
      setStats(res.data);
    } catch {
      setError("Failed to load stats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <AdminShell title="Overview">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="text-red-500 text-center py-20">{error}</div>
      ) : stats ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Total Farmers" value={stats.farmers} sub="organisations registered" color="bg-blue-100 text-blue-700" />
            <StatCard icon={Warehouse} label="Total Farms" value={stats.farms} sub="across all organisations" color="bg-emerald-100 text-emerald-700" />
            <StatCard
              icon={Cpu}
              label="Devices"
              value={stats.devices.total}
              sub={`${stats.devices.online} online · ${stats.devices.total - stats.devices.online} offline`}
              color="bg-violet-100 text-violet-700"
            />
            <StatCard
              icon={Zap}
              label="Actuators"
              value={stats.actuators.total}
              sub={`${stats.actuators.running} currently running`}
              color="bg-amber-100 text-amber-700"
            />
          </div>

          {/* Device health */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-base font-bold text-slate-800 mb-4">Device Health</h2>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: stats.devices.total ? `${(stats.devices.online / stats.devices.total) * 100}%` : "0%" }}
                />
              </div>
              <div className="flex items-center gap-4 shrink-0 text-sm">
                <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                  <Wifi className="w-4 h-4" /> {stats.devices.online} Online
                </span>
                <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                  <WifiOff className="w-4 h-4" /> {stats.devices.total - stats.devices.online} Offline
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
