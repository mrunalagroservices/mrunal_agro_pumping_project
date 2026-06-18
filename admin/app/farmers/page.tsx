"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ChevronDown, ChevronRight, Wifi, WifiOff, Zap, Cpu, MapPin, Phone, Mail, Trash2, Users, UserCircle,
} from "lucide-react";
import AdminShell from "@/components/AdminShell";
import { httpClient } from "@/lib/api";
import { AdminFarmer, AdminFarmerDetail, ApiResponse } from "@/lib/types";

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>{children}</span>;
}

function FarmerRow({ farmer, onDelete }: { farmer: AdminFarmer; onDelete: (id: number, name: string) => void }) {
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
          <Badge color="bg-emerald-100 text-emerald-700">{farmer.farm_count}</Badge>
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
        <td className="px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-1">
            {farmer.owner_id && (
              <Link
                href={`/users/${farmer.owner_id}`}
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                title="View user profile"
              >
                <UserCircle className="w-4 h-4" />
              </Link>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(farmer.id, farmer.org_name); }}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete organisation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>

      {open && (
        <tr>
          <td colSpan={8} className="bg-emerald-50/40 px-8 pb-5 pt-3">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
                <div className="w-4 h-4 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
                Loading details…
              </div>
            ) : detail ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Farms */}
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Farms ({detail.farms.length})
                  </p>
                  <div className="space-y-1">
                    {detail.farms.length === 0 && <p className="text-xs text-slate-400 italic">No farms</p>}
                    {detail.farms.map((f) => (
                      <div key={f.id} className="text-sm text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2">
                        {f.name} {f.location && <span className="text-slate-400 text-xs">· {f.location}</span>}
                      </div>
                    ))}
                  </div>
                </div>
                {/* Devices */}
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                    <Cpu className="w-3 h-3" /> Devices ({detail.devices.length})
                  </p>
                  <div className="space-y-1">
                    {detail.devices.length === 0 && <p className="text-xs text-slate-400 italic">No devices</p>}
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
                    <div className="flex items-center gap-2 text-slate-700">
                      <Mail className="w-4 h-4 text-slate-400" /> {detail.organization.owner_email || "—"}
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Phone className="w-4 h-4 text-slate-400" /> {detail.organization.owner_phone || "—"}
                    </div>
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
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await httpClient.get<ApiResponse<AdminFarmer[]>>("/admin/farmers");
      setFarmers(res.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await httpClient.delete<ApiResponse<unknown>>(`/admin/farmers/${deleteTarget.id}`);
      setFarmers((f) => f.filter((x) => x.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch { /* ignore */ }
    finally { setDeleting(false); }
  }

  const filtered = farmers.filter((f) =>
    !search || f.org_name.toLowerCase().includes(search.toLowerCase()) || (f.owner_email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminShell title="Farmers">
      <div className="mb-5 flex items-center justify-between gap-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by organisation or email…"
          className="border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-72 transition"
        />
        <span className="text-sm text-slate-500">{filtered.length} farmer{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
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
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <Users className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-slate-400 font-medium">No farmers found</p>
                  </td>
                </tr>
              ) : (
                filtered.map((f) => (
                  <FarmerRow key={f.id} farmer={f} onDelete={(id, name) => setDeleteTarget({ id, name })} />
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="font-bold text-lg text-slate-800 mb-2">Delete Organisation?</h3>
            <p className="text-sm text-slate-500 mb-1">
              <span className="font-semibold text-slate-700">{deleteTarget.name}</span> and all its farms, devices, and data will be permanently removed.
            </p>
            <p className="text-xs text-red-500 font-medium mb-6">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-slate-300 text-slate-600 font-semibold rounded-xl hover:bg-slate-50">Cancel</button>
              <button onClick={confirmDelete} disabled={deleting} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold rounded-xl">
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
