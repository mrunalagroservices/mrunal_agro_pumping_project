"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Warehouse, Cpu, Wifi, WifiOff, Pencil, Trash2, X, MapPin,
  ChevronDown, ChevronRight, Zap,
} from "lucide-react";
import AdminShell from "@/components/AdminShell";
import { httpClient } from "@/lib/api";
import { AdminFarm, AdminDevice, ApiResponse } from "@/lib/types";

/* ─── Shared ───────────────────────────────────────────────────────────── */

const inputCls = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition";
const labelCls = "block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide";

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>{children}</span>;
}

function ConfirmDelete({ title, body, onCancel, onConfirm, loading }: {
  title: string; body: string; onCancel: () => void; onConfirm: () => void; loading: boolean;
}) {
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
          <button onClick={onConfirm} disabled={loading} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold rounded-xl">
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Farms tab ────────────────────────────────────────────────────────── */

function EditFarmModal({ farm, onClose, onSave }: {
  farm: AdminFarm; onClose: () => void; onSave: (id: number, name: string, location: string) => Promise<void>;
}) {
  const [name, setName] = useState(farm.name);
  const [location, setLocation] = useState(farm.location ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setSaving(true);
    try { await onSave(farm.id, name, location); onClose(); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-lg text-slate-800">Edit Farm</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 transition"><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{err}</div>}
          <div>
            <label className={labelCls}>Farm Name *</label>
            <input required className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Location</label>
            <input className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Village, District…" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-300 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-xl transition">
              {saving ? "Saving…" : "Save Farm"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FarmRow({ farm, onEdit, onDelete }: {
  farm: AdminFarm;
  onEdit: (farm: AdminFarm) => void;
  onDelete: (farm: AdminFarm) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className="hover:bg-slate-50 cursor-pointer" onClick={() => setOpen((v) => !v)}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            <div>
              <p className="font-semibold text-slate-800">{farm.name}</p>
              {farm.location && <p className="text-xs text-slate-400 flex items-center gap-0.5 mt-0.5"><MapPin className="w-3 h-3" />{farm.location}</p>}
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-slate-600">{farm.org_name}</td>
        <td className="px-4 py-3 text-center">
          <Badge color="bg-emerald-100 text-emerald-700"><Cpu className="w-3 h-3" /> {farm.device_count}</Badge>
        </td>
        <td className="px-4 py-3 text-center">
          <Badge color="bg-amber-100 text-amber-700"><Zap className="w-3 h-3" /> {farm.actuator_count}</Badge>
        </td>
        <td className="px-4 py-3 text-xs text-slate-400">{new Date(farm.created_at).toLocaleDateString("en-IN")}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => onEdit(farm)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Edit farm">
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={() => onDelete(farm)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete farm">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={6} className="bg-emerald-50/40 px-8 py-3 text-xs text-slate-500">
            <span className="font-semibold">Farm ID:</span> {farm.id} &nbsp;·&nbsp;
            <span className="font-semibold">Org ID:</span> {farm.organization_id}
          </td>
        </tr>
      )}
    </>
  );
}

function FarmsTab() {
  const [farms, setFarms] = useState<AdminFarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editTarget, setEditTarget] = useState<AdminFarm | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminFarm | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await httpClient.get<ApiResponse<AdminFarm[]>>("/admin/farms");
      setFarms(res.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveFarm(id: number, name: string, location: string) {
    const res = await httpClient.put<ApiResponse<AdminFarm>>(`/admin/farms/${id}`, { name, location });
    setFarms((f) => f.map((x) => x.id === id ? { ...x, ...res.data } : x));
  }

  async function deleteFarm() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await httpClient.delete<ApiResponse<unknown>>(`/admin/farms/${deleteTarget.id}`);
      setFarms((f) => f.filter((x) => x.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch { /* ignore */ }
    finally { setDeleting(false); }
  }

  const filtered = farms.filter((f) =>
    !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.org_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by farm or organisation…"
          className="border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-72 transition"
        />
        <span className="text-sm text-slate-500">{filtered.length} farm{filtered.length !== 1 ? "s" : ""}</span>
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
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Farm</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Organisation</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Devices</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Actuators</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Created</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <Warehouse className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-slate-400 font-medium">No farms found</p>
                  </td>
                </tr>
              ) : (
                filtered.map((f) => (
                  <FarmRow key={f.id} farm={f} onEdit={setEditTarget} onDelete={setDeleteTarget} />
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {editTarget && (
        <EditFarmModal farm={editTarget} onClose={() => setEditTarget(null)} onSave={saveFarm} />
      )}
      {deleteTarget && (
        <ConfirmDelete
          title="Delete Farm?"
          body={`"${deleteTarget.name}" and all its devices will be permanently removed. This cannot be undone.`}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={deleteFarm}
          loading={deleting}
        />
      )}
    </>
  );
}

/* ─── Devices tab ──────────────────────────────────────────────────────── */

function EditDeviceModal({ device, onClose, onSave }: {
  device: AdminDevice; onClose: () => void; onSave: (id: number, name: string, device_type: string) => Promise<void>;
}) {
  const [name, setName] = useState(device.name);
  const [type, setType] = useState(device.device_type);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setSaving(true);
    try { await onSave(device.id, name, type); onClose(); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-lg text-slate-800">Edit Device</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 transition"><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{err}</div>}
          <div>
            <label className={labelCls}>Device Name *</label>
            <input required className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Device Type</label>
            <input className={inputCls} value={type} onChange={(e) => setType(e.target.value)} placeholder="e.g. pump-controller" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-300 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-xl transition">
              {saving ? "Saving…" : "Save Device"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DevicesTab() {
  const [devices, setDevices] = useState<AdminDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all");
  const [editTarget, setEditTarget] = useState<AdminDevice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminDevice | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await httpClient.get<ApiResponse<AdminDevice[]>>("/admin/devices");
      setDevices(res.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveDevice(id: number, name: string, device_type: string) {
    const res = await httpClient.put<ApiResponse<AdminDevice>>(`/admin/devices/${id}`, { name, device_type });
    setDevices((d) => d.map((x) => x.id === id ? { ...x, ...res.data } : x));
  }

  async function deleteDevice() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await httpClient.delete<ApiResponse<unknown>>(`/admin/devices/${deleteTarget.id}`);
      setDevices((d) => d.filter((x) => x.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch { /* ignore */ }
    finally { setDeleting(false); }
  }

  const filtered = devices.filter((d) => {
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.org_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const onlineCount = devices.filter((d) => d.status === "online").length;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by device or organisation…"
          className="border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-72 transition"
        />
        <div className="flex gap-2">
          {(["all", "online", "offline"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors capitalize ${statusFilter === s ? "bg-emerald-600 text-white border-emerald-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            >{s}</button>
          ))}
        </div>
        <span className="text-sm text-slate-500 ml-auto">
          {filtered.length} device{filtered.length !== 1 ? "s" : ""} &nbsp;·&nbsp; {onlineCount} online
        </span>
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
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Device</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Farm</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Organisation</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Actuators</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Last Seen</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <Cpu className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-slate-400 font-medium">No devices found</p>
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-800">{d.name}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{d.device_type}</td>
                    <td className="px-4 py-3 text-slate-600">{d.farm_name || <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3 text-slate-600">{d.org_name}</td>
                    <td className="px-4 py-3 text-center">
                      {d.status === "online"
                        ? <Badge color="bg-emerald-100 text-emerald-700"><Wifi className="w-3 h-3" /> Online</Badge>
                        : <Badge color="bg-slate-100 text-slate-500"><WifiOff className="w-3 h-3" /> Offline</Badge>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge color="bg-amber-100 text-amber-700">{d.actuator_count}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {d.last_seen_at ? new Date(d.last_seen_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditTarget(d)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Edit device">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(d)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete device">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {editTarget && (
        <EditDeviceModal device={editTarget} onClose={() => setEditTarget(null)} onSave={saveDevice} />
      )}
      {deleteTarget && (
        <ConfirmDelete
          title="Delete Device?"
          body={`"${deleteTarget.name}" and all its actuators will be permanently removed. This cannot be undone.`}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={deleteDevice}
          loading={deleting}
        />
      )}
    </>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────── */

export default function FarmsPage() {
  const [tab, setTab] = useState<"farms" | "devices">("farms");

  return (
    <AdminShell title="Farms & Devices">
      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-2xl p-1 w-fit">
        <button
          onClick={() => setTab("farms")}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all ${tab === "farms" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          <Warehouse className="w-4 h-4" /> Farms
        </button>
        <button
          onClick={() => setTab("devices")}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all ${tab === "devices" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          <Cpu className="w-4 h-4" /> Devices
        </button>
      </div>

      {tab === "farms" ? <FarmsTab /> : <DevicesTab />}
    </AdminShell>
  );
}
