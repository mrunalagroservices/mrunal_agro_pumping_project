"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import {
  Plus,
  MapPin,
  Cpu,
  Trash2,
  Loader2,
  LocateFixed,
  MoreVertical,
  Pencil,
  Wifi,
  WifiOff,
  Gauge,
  Power,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import Modal from "@/components/Modal";
import { httpClient } from "@/lib/api";
import { socketClient } from "@/lib/socket";
import { ApiResponse, Farm, Device } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";

export default function FarmsPage() {
  const { user, isAuthenticated } = useAuth();

  const [farms, setFarms] = useState<Farm[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  // farm CRUD
  const [showFarmModal, setShowFarmModal] = useState(false);
  const [farmSubmitting, setFarmSubmitting] = useState(false);
  const [farmError, setFarmError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [editFarm, setEditFarm] = useState<Farm | null>(null);
  const [farmName, setFarmName] = useState("");
  const [farmLocation, setFarmLocation] = useState("");
  const [farmLat, setFarmLat] = useState("");
  const [farmLng, setFarmLng] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // device CRUD
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [deviceDefaultFarmId, setDeviceDefaultFarmId] = useState<number | null>(null);
  const [devSubmitting, setDevSubmitting] = useState(false);
  const [devError, setDevError] = useState<string | null>(null);
  const [createdDevice, setCreatedDevice] = useState<Device | null>(null);
  const [copied, setCopied] = useState(false);
  const [devName, setDevName] = useState("");
  const [devFarmId, setDevFarmId] = useState("");
  const [devRelayCount, setDevRelayCount] = useState("4");

  // collapse state per farm
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  async function loadAll() {
    setLoading(true);
    try {
      const [farmsRes, devicesRes] = await Promise.all([
        httpClient.get<ApiResponse<Farm[]>>("/farms"),
        httpClient.get<ApiResponse<Device[]>>("/devices"),
      ]);
      setFarms(farmsRes.data);
      setDevices(devicesRes.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  // Live device-status updates via socket
  useEffect(() => {
    if (!isAuthenticated) return;
    const handler = (...args: unknown[]) => {
      const data = args[0] as { device_id: number; status: string; last_seen_at: string };
      setDevices((prev) =>
        prev.map((d) =>
          d.id === data.device_id
            ? { ...d, status: data.status, last_seen_at: data.last_seen_at }
            : d
        )
      );
    };
    socketClient.on("device-status", handler);
    return () => socketClient.off("device-status", handler);
  }, [isAuthenticated]);

  // ── farm helpers ────────────────────────────────────────────────────────────
  function resetFarmForm() {
    setFarmName(""); setFarmLocation(""); setFarmLat(""); setFarmLng("");
    setFarmError(null); setLocationError(null);
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) { setLocationError("Geolocation not supported"); return; }
    setLocating(true); setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        setFarmLat(lat.toFixed(6)); setFarmLng(lon.toFixed(6));
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`);
          const d = await r.json();
          if (d?.display_name) setFarmLocation(d.display_name);
        } catch { /* best-effort */ } finally { setLocating(false); }
      },
      (err) => { setLocationError(err.message); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleCreateFarm(e: FormEvent) {
    e.preventDefault(); setFarmError(null); setFarmSubmitting(true);
    try {
      await httpClient.post<ApiResponse<Farm>>("/farms", {
        name: farmName,
        location: farmLocation || undefined,
        latitude: farmLat ? Number(farmLat) : undefined,
        longitude: farmLng ? Number(farmLng) : undefined,
      });
      setShowFarmModal(false); resetFarmForm(); loadAll();
    } catch (err) {
      setFarmError(err instanceof Error ? err.message : "Failed to create farm");
    } finally { setFarmSubmitting(false); }
  }

  async function handleDeleteFarm(id: number) {
    if (!confirm("Delete this farm? Devices assigned to it will become unassigned.")) return;
    await httpClient.delete<ApiResponse<null>>(`/farms/${id}`);
    loadAll();
  }

  // ── device helpers ──────────────────────────────────────────────────────────
  function openAddDevice(farmId?: number) {
    setDeviceDefaultFarmId(farmId ?? null);
    setDevFarmId(farmId ? String(farmId) : "");
    setDevName(""); setDevRelayCount("4"); setDevError(null);
    setShowDeviceModal(true);
  }

  async function handleCreateDevice(e: FormEvent) {
    e.preventDefault(); setDevError(null); setDevSubmitting(true);
    try {
      const res = await httpClient.post<ApiResponse<Device>>("/devices", {
        name: devName,
        farm_id: devFarmId ? Number(devFarmId) : undefined,
        relay_count: Number(devRelayCount),
      });
      setCreatedDevice(res.data);
      setShowDeviceModal(false);
      loadAll();
    } catch (err) {
      setDevError(err instanceof Error ? err.message : "Failed to create device");
    } finally { setDevSubmitting(false); }
  }

  function closeDeviceModal() {
    setShowDeviceModal(false); setCreatedDevice(null); setCopied(false);
    setDeviceDefaultFarmId(null);
  }

  // ── group devices ───────────────────────────────────────────────────────────
  const devicesByFarm = new Map<number, Device[]>();
  const unassigned: Device[] = [];
  for (const d of devices) {
    if (d.farm_id) {
      const list = devicesByFarm.get(d.farm_id) ?? [];
      list.push(d);
      devicesByFarm.set(d.farm_id, list);
    } else {
      unassigned.push(d);
    }
  }

  function toggleCollapse(farmId: number) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(farmId) ? next.delete(farmId) : next.add(farmId);
      return next;
    });
  }

  return (
    <DashboardShell breadcrumb={[{ label: "Farms & Devices" }]}>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-slate-500">Farms and their connected ESP32 gateways</p>
        <div className="flex gap-2">
          <button
            onClick={() => openAddDevice()}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            <Cpu className="w-4 h-4" /> Add device
          </button>
          <button
            onClick={() => { resetFarmForm(); setShowFarmModal(true); }}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add farm
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : farms.length === 0 && unassigned.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <p className="text-slate-500 text-sm">No farms yet. Add your first farm to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* ── Farm sections ── */}
          {farms.map((farm) => {
            const farmDevices = devicesByFarm.get(farm.id) ?? [];
            const isCollapsed = collapsed.has(farm.id);
            return (
              <div key={farm.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Farm header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
                  <button
                    onClick={() => toggleCollapse(farm.id)}
                    className="text-slate-400 hover:text-slate-600 shrink-0"
                  >
                    {isCollapsed
                      ? <ChevronRight className="w-4 h-4" />
                      : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800 truncate">{farm.name}</h3>
                    {farm.location && (
                      <p className="flex items-center gap-1 text-xs text-slate-500 mt-0.5 truncate">
                        <MapPin className="w-3 h-3 shrink-0" /> {farm.location}
                      </p>
                    )}
                  </div>
                  <span className="flex items-center gap-1 text-xs text-slate-500 shrink-0">
                    <Cpu className="w-3.5 h-3.5" />
                    {farmDevices.length} device{farmDevices.length !== 1 ? "s" : ""}
                  </span>
                  {/* kebab menu */}
                  <div className="relative shrink-0">
                    <button
                      onClick={() => setOpenMenuId((id) => (id === farm.id ? null : farm.id))}
                      className="text-slate-400 hover:text-slate-600 p-1 -m-1 rounded-lg"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {openMenuId === farm.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                        <div className="absolute right-0 top-8 z-20 w-32 bg-white rounded-lg border border-slate-200 shadow-lg py-1">
                          <button
                            onClick={() => { setEditFarm(farm); setOpenMenuId(null); }}
                            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => { setOpenMenuId(null); handleDeleteFarm(farm.id); }}
                            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Devices under this farm */}
                {!isCollapsed && (
                  <div className="px-5 py-4">
                    {farmDevices.length === 0 ? (
                      <p className="text-sm text-slate-400 italic mb-3">No devices assigned to this farm yet.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                        {farmDevices.map((d) => (
                          <Link
                            key={d.id}
                            href={`/devices/${d.id}`}
                            className="flex items-start justify-between p-3 rounded-lg border border-slate-100 hover:border-primary-200 hover:bg-primary-50/30 transition-colors"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-slate-800 text-sm truncate">{d.name}</p>
                              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                  <Gauge className="w-3.5 h-3.5 text-sky-500" />
                                  {d.sensor_count ?? 0}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Power className="w-3.5 h-3.5 text-primary-500" />
                                  {d.actuator_count ?? 0}
                                </span>
                              </div>
                            </div>
                            {d.status === "online" ? (
                              <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 shrink-0">
                                <Wifi className="w-3.5 h-3.5" /> Online
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs font-medium text-slate-400 shrink-0">
                                <WifiOff className="w-3.5 h-3.5" /> Offline
                              </span>
                            )}
                          </Link>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => openAddDevice(farm.id)}
                      className="flex items-center gap-1.5 text-xs font-medium text-primary-700 hover:text-primary-800 hover:bg-primary-50 px-3 py-1.5 rounded-lg border border-dashed border-primary-300 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add device to this farm
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* ── Unassigned devices ── */}
          {unassigned.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-600 text-sm">Unassigned devices</h3>
                <p className="text-xs text-slate-400 mt-0.5">Not linked to any farm</p>
              </div>
              <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {unassigned.map((d) => (
                  <Link
                    key={d.id}
                    href={`/devices/${d.id}`}
                    className="flex items-start justify-between p-3 rounded-lg border border-slate-100 hover:border-primary-200 hover:bg-primary-50/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 text-sm truncate">{d.name}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Gauge className="w-3.5 h-3.5 text-sky-500" />
                          {d.sensor_count ?? 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Power className="w-3.5 h-3.5 text-primary-500" />
                          {d.actuator_count ?? 0}
                        </span>
                      </div>
                    </div>
                    {d.status === "online" ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 shrink-0">
                        <Wifi className="w-3.5 h-3.5" /> Online
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-medium text-slate-400 shrink-0">
                        <WifiOff className="w-3.5 h-3.5" /> Offline
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Add Farm modal ── */}
      {showFarmModal && (
        <Modal title="Add farm" onClose={() => { setShowFarmModal(false); resetFarmForm(); }}>
          <form onSubmit={handleCreateFarm} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input type="text" required value={farmName} onChange={(e) => setFarmName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="North Field" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-slate-700">Location (optional)</label>
                <button type="button" onClick={useCurrentLocation} disabled={locating}
                  className="flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline disabled:opacity-60">
                  {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5" />}
                  Use current location
                </button>
              </div>
              <input type="text" value={farmLocation} onChange={(e) => setFarmLocation(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Village, Taluka, District" />
              {locationError && <p className="text-xs text-red-600 mt-1">{locationError}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Latitude (optional)</label>
                <input type="number" step="any" value={farmLat} onChange={(e) => setFarmLat(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="18.5204" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Longitude (optional)</label>
                <input type="number" step="any" value={farmLng} onChange={(e) => setFarmLng(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="73.8567" />
              </div>
            </div>
            {farmError && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{farmError}</p>}
            <button type="submit" disabled={farmSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm rounded-lg px-4 py-2.5 transition-colors disabled:opacity-60">
              {farmSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Add farm
            </button>
          </form>
        </Modal>
      )}

      {/* ── Add Device modal ── */}
      {showDeviceModal && !createdDevice && (
        <Modal title="Add device" onClose={closeDeviceModal}>
          <form onSubmit={handleCreateDevice} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input type="text" required value={devName} onChange={(e) => setDevName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Field Gateway 1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Farm (optional)</label>
              <select value={devFarmId} onChange={(e) => setDevFarmId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">Unassigned</option>
                {farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Relay count</label>
              <input type="number" min={1} max={16} required value={devRelayCount}
                onChange={(e) => setDevRelayCount(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            {devError && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{devError}</p>}
            <button type="submit" disabled={devSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm rounded-lg px-4 py-2.5 transition-colors disabled:opacity-60">
              {devSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Add device
            </button>
          </form>
        </Modal>
      )}

      {/* ── API key reveal after device creation ── */}
      {createdDevice && (
        <Modal title="Device created" onClose={closeDeviceModal}>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Use these values in the ESP32 firmware&apos;s{" "}
              <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">config.h</code> file.
              The API key is shown only once — copy it now.
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">ORG_ID</label>
              <p className="font-mono text-sm bg-slate-100 rounded-lg px-3 py-2">{user?.organization_id}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">API_KEY</label>
              <div className="flex items-center gap-2">
                <p className="font-mono text-sm bg-slate-100 rounded-lg px-3 py-2 flex-1 break-all">{createdDevice.api_key}</p>
                <button onClick={() => { navigator.clipboard.writeText(createdDevice.api_key); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                  className="p-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 shrink-0">
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button onClick={closeDeviceModal}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm rounded-lg px-4 py-2.5 transition-colors">
              Done
            </button>
          </div>
        </Modal>
      )}

      {/* ── Edit Farm modal ── */}
      {editFarm && (
        <EditFarmModal farm={editFarm} onClose={() => setEditFarm(null)}
          onSaved={() => { setEditFarm(null); loadAll(); }} />
      )}
    </DashboardShell>
  );
}

// ── Edit Farm Modal ────────────────────────────────────────────────────────────
function EditFarmModal({ farm, onClose, onSaved }: { farm: Farm; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(farm.name);
  const [location, setLocation] = useState(farm.location || "");
  const [latitude, setLatitude] = useState(farm.latitude != null ? String(farm.latitude) : "");
  const [longitude, setLongitude] = useState(farm.longitude != null ? String(farm.longitude) : "");
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function useCurrentLocation() {
    if (!navigator.geolocation) { setLocationError("Geolocation not supported"); return; }
    setLocating(true); setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        setLatitude(lat.toFixed(6)); setLongitude(lon.toFixed(6));
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`);
          const d = await r.json();
          if (d?.display_name) setLocation(d.display_name);
        } catch { /* best-effort */ } finally { setLocating(false); }
      },
      (err) => { setLocationError(err.message); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setError(null); setSubmitting(true);
    try {
      await httpClient.put<ApiResponse<Farm>>(`/farms/${farm.id}`, {
        name,
        location: location || null,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update farm");
    } finally { setSubmitting(false); }
  }

  return (
    <Modal title="Edit farm" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="North Field" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-slate-700">Location (optional)</label>
            <button type="button" onClick={useCurrentLocation} disabled={locating}
              className="flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline disabled:opacity-60">
              {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5" />}
              Use current location
            </button>
          </div>
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Village, Taluka, District" />
          {locationError && <p className="text-xs text-red-600 mt-1">{locationError}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Latitude</label>
            <input type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="18.5204" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Longitude</label>
            <input type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="73.8567" />
          </div>
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
        <button type="submit" disabled={submitting}
          className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm rounded-lg px-4 py-2.5 transition-colors disabled:opacity-60">
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Save changes
        </button>
      </form>
    </Modal>
  );
}
