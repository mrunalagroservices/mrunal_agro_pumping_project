"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ChevronDown, ChevronRight, Wifi, WifiOff, Zap, Cpu, MapPin, Phone, Mail,
} from "lucide-react";
import AdminShell from "@/components/AdminShell";
import { httpClient } from "@/lib/api";
import { AdminFarmer, AdminFarmerDetail, ApiResponse } from "@/lib/types";

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>{children}</span>;
}

function FarmerRow({ farmer }: { farmer: AdminFarmer }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<AdminFarmerDetail | null>(null);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setOpen((v) => !v);
    if (!detail && !loading) {
      setLoading(true);
      try {
        const res = await httpClient.get<ApiResponse<AdminFarmerDetail>>(`/admin/farmers/${farmer.id}`);
        setDetail(res.data);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
  }

  return (
    <>
      <tr className="hover:bg-slate-50 cursor-pointer" onClick={toggle}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            <span className="font-semibold text-slate-800">{farmer.org_name}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-slate-600">{farmer.owner_name || "—"}</td>
        <td className="px-4 py-3 text-sm text-slate-500">{farmer.owner_email || "—"}</td>
        <td className="px-4 py-3 text-center">
          <Badge color="bg-blue-100 text-blue-700">{farmer.farm_count}</Badge>
        </td>
        <td className="px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <Badge color="bg-emerald-100 text-emerald-700">
              <Wifi className="w-3 h-3" /> {farmer.online_device_count}
            </Badge>
            <Badge color="bg-slate-100 text-slate-500">
              <WifiOff className="w-3 h-3" /> {farmer.device_count - farmer.online_device_count}
            </Badge>
          </div>
        </td>
        <td className="px-4 py-3 text-center">
          {farmer.running_actuator_count > 0
            ? <Badge color="bg-amber-100 text-amber-700"><Zap className="w-3 h-3" /> {farmer.running_actuator_count} running</Badge>
            : <Badge color="bg-slate-100 text-slate-500">{farmer.actuator_count} total</Badge>}
        </td>
        <td className="px-4 py-3 text-xs text-slate-400">
          {new Date(farmer.created_at).toLocaleDateString("en-IN")}
        </td>
      </tr>

      {open && (
        <tr>
          <td colSpan={7} className="bg-slate-50 px-8 pb-4 pt-2">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
                <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                Loading details…
              </div>
            ) : detail ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Farms */}
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1"><MapPin className="w-3 h-3" /> Farms ({detail.farms.length})</p>
                  <div className="space-y-1">
                    {detail.farms.map((f) => (
                      <div key={f.id} className="text-sm text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2">
                        {f.name} {f.location && <span className="text-slate-400 text-xs">· {f.location}</span>}
                      </div>
                    ))}
                  </div>
                </div>
                {/* Devices */}
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1"><Cpu className="w-3 h-3" /> Devices ({detail.devices.length})</p>
                  <div className="space-y-1">
                    {detail.devices.map((d) => (
                      <div key={d.id} className="text-sm text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between">
                        <span>{d.name}</span>
                        {d.status === "online"
                          ? <Badge color="bg-emerald-100 text-emerald-700"><Wifi className="w-3 h-3" /> Online</Badge>
                          : <Badge color="bg-slate-100 text-slate-500"><WifiOff className="w-3 h-3" /> Offline</Badge>}
                      </div>
                    ))}
                  </div>
                </div>
                {/* Contact */}
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-2">Owner Contact</p>
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-700"><Mail className="w-4 h-4 text-slate-400" /> {detail.organization.owner_email || "—"}</div>
                    <div className="flex items-center gap-2 text-slate-700"><Phone className="w-4 h-4 text-slate-400" /> {detail.organization.owner_phone || "—"}</div>
                  </div>
                </div>
              </div>
            ) : null}
          </td>
        </tr>
      )}
    </>
  );
}

export default function FarmersPage() {
  const [farmers, setFarmers] = useState<AdminFarmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await httpClient.get<ApiResponse<AdminFarmer[]>>("/admin/farmers");
      setFarmers(res.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = farmers.filter((f) =>
    !search || f.org_name.toLowerCase().includes(search.toLowerCase()) || (f.owner_email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminShell title="Farmers">
      <div className="mb-4 flex items-center justify-between gap-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by organisation or email…"
          className="border border-slate-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 w-72"
        />
        <span className="text-sm text-slate-500">{filtered.length} farmer{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Organisation</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Owner</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Email</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Farms</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Devices</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Actuators</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16 text-slate-400">No farmers found</td></tr>
              ) : (
                filtered.map((f) => <FarmerRow key={f.id} farmer={f} />)
              )}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
