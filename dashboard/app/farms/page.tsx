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
  Zap,
  ZapOff,
  Bell,
  BellOff,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Settings2,
  Droplets,
} from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import Modal from "@/components/Modal";
import LocationPickerMap from "@/components/LocationPickerMap";
import { httpClient } from "@/lib/api";
import { socketClient } from "@/lib/socket";
import { ApiResponse, Farm, Device, Actuator } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useLocale } from "@/contexts/LocaleContext";

type Tab = "farms" | "electricity" | "antitheft";

interface PowerEvent { event_type: "power_on" | "power_off"; created_at: string; }

interface PowerWindow { on: Date; off: Date | null; }

interface DayRecord { label: string; dateKey: string; windows: PowerWindow[]; totalMinutes: number; }

function timeSince(dateStr: string | null | undefined, t: (k: any, p?: any) => string): string {
  if (!dateStr) return t("farms_never_seen");
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t("farms_just_now");
  if (mins < 60) return t("farms_mins_ago", { mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("farms_hours_ago", { hours });
  return t("farms_days_ago", { days: Math.floor(hours / 24) });
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function fmtHours(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function buildDayRecords(events: PowerEvent[], deviceOnline: boolean, t: (k: any, p?: any) => string): DayRecord[] {
  // Build last 7 day buckets
  const days: DayRecord[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = i === 0 ? t("common_today") : i === 1 ? t("common_yesterday")
      : d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
    days.push({ label, dateKey: key, windows: [], totalMinutes: 0 });
  }

  // Walk events in order, pairing ON→OFF
  let onTime: Date | null = null;
  for (const ev of events) {
    const t = new Date(ev.created_at);
    if (ev.event_type === "power_on") {
      onTime = t;
    } else if (ev.event_type === "power_off" && onTime) {
      const dayKey = onTime.toISOString().slice(0, 10);
      const bucket = days.find((d) => d.dateKey === dayKey);
      if (bucket) {
        bucket.windows.push({ on: onTime, off: t });
        bucket.totalMinutes += Math.round((t.getTime() - onTime.getTime()) / 60000);
      }
      onTime = null;
    }
  }
  // If still on (no trailing off), close at now if device is currently online
  if (onTime && deviceOnline) {
    const dayKey = onTime.toISOString().slice(0, 10);
    const bucket = days.find((d) => d.dateKey === dayKey);
    if (bucket) {
      bucket.windows.push({ on: onTime, off: null });
      bucket.totalMinutes += Math.round((now.getTime() - onTime.getTime()) / 60000);
    }
  }
  return days;
}

export default function FarmsPage() {
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const { t } = useLocale();

  const [tab, setTab] = useState<Tab>("farms");
  const [farms, setFarms] = useState<Farm[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [actuators, setActuators] = useState<Actuator[]>([]);
  const [loading, setLoading] = useState(true);

  // electricity tab — notification prefs (device IDs with notify enabled)
  const [notifyEnabled, setNotifyEnabled] = useState<Set<number>>(new Set());
  // power event history per device: deviceId → events[]
  const [powerHistory, setPowerHistory] = useState<Map<number, PowerEvent[]>>(new Map());
  const [historyLoading, setHistoryLoading] = useState<Set<number>>(new Set());

  // anti-theft tab — per-actuator config
  const [antitheftEnabled, setAntitheftEnabled] = useState<Set<number>>(new Set());
  const [currentThresholds, setCurrentThresholds] = useState<Map<number, string>>(new Map());

  // farm CRUD
  const [showFarmModal, setShowFarmModal] = useState(false);
  const [farmSubmitting, setFarmSubmitting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [editFarm, setEditFarm] = useState<Farm | null>(null);
  const [farmName, setFarmName] = useState("");
  const [farmLocation, setFarmLocation] = useState("");
  const [farmLat, setFarmLat] = useState("");
  const [farmLng, setFarmLng] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showLocateMap, setShowLocateMap] = useState(false);

  // device CRUD
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [deviceDefaultFarmId, setDeviceDefaultFarmId] = useState<number | null>(null);
  const [devSubmitting, setDevSubmitting] = useState(false);
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
      const [farmsRes, devicesRes, actuatorsRes] = await Promise.all([
        httpClient.get<ApiResponse<Farm[]>>("/farms"),
        httpClient.get<ApiResponse<Device[]>>("/devices"),
        httpClient.get<ApiResponse<Actuator[]>>("/actuators"),
      ]);
      setFarms(farmsRes.data);
      setDevices(devicesRes.data);
      setActuators(actuatorsRes.data);
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

  // ── group helpers ──────────────────────────────────────────────────────────
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

  const actuatorsByFarm = new Map<number, Actuator[]>();
  for (const a of actuators) {
    if (a.farm_id) {
      const list = actuatorsByFarm.get(a.farm_id) ?? [];
      list.push(a);
      actuatorsByFarm.set(a.farm_id, list);
    }
  }

  function toggleCollapse(farmId: number) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(farmId) ? next.delete(farmId) : next.add(farmId);
      return next;
    });
  }

  // ── farm helpers ────────────────────────────────────────────────────────────
  function resetFarmForm() {
    setFarmName(""); setFarmLocation(""); setFarmLat(""); setFarmLng("");
    setLocationError(null); setShowLocateMap(false);
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) { setLocationError(t("farms_geolocation_unsupported")); return; }
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
    e.preventDefault(); setFarmSubmitting(true);
    try {
      await httpClient.post<ApiResponse<Farm>>("/farms", {
        name: farmName,
        location: farmLocation || undefined,
        latitude: farmLat ? Number(farmLat) : undefined,
        longitude: farmLng ? Number(farmLng) : undefined,
      });
      setShowFarmModal(false); resetFarmForm(); loadAll();
      toast.success(t("farms_toast_created_title"), t("farms_toast_created_body", { name: farmName }));
    } catch (err) {
      toast.error(t("farms_toast_create_failed"), err instanceof Error ? err.message : undefined);
    } finally { setFarmSubmitting(false); }
  }

  async function handleDeleteFarm(id: number) {
    if (!confirm(t("farms_confirm_delete_farm"))) return;
    try {
      await httpClient.delete<ApiResponse<null>>(`/farms/${id}`);
      loadAll();
      toast.success(t("farms_toast_deleted"));
    } catch (err) {
      toast.error(t("farms_toast_delete_failed"), err instanceof Error ? err.message : undefined);
    }
  }

  // ── device helpers ──────────────────────────────────────────────────────────
  function openAddDevice(farmId?: number) {
    setDeviceDefaultFarmId(farmId ?? null);
    setDevFarmId(farmId ? String(farmId) : "");
    setDevName(""); setDevRelayCount("4");
    setShowDeviceModal(true);
  }

  async function handleCreateDevice(e: FormEvent) {
    e.preventDefault(); setDevSubmitting(true);
    try {
      const res = await httpClient.post<ApiResponse<Device>>("/devices", {
        name: devName,
        farm_id: devFarmId ? Number(devFarmId) : undefined,
        relay_count: Number(devRelayCount),
      });
      setCreatedDevice(res.data);
      setShowDeviceModal(false);
      loadAll();
      toast.success(t("farms_toast_device_created"), t("farms_toast_device_created_body"));
    } catch (err) {
      toast.error(t("farms_toast_device_create_failed"), err instanceof Error ? err.message : undefined);
    } finally { setDevSubmitting(false); }
  }

  function closeDeviceModal() {
    setShowDeviceModal(false); setCreatedDevice(null); setCopied(false);
    setDeviceDefaultFarmId(null);
  }

  // ── power history loading ─────────────────────────────────────────────────
  async function loadPowerHistory(deviceIds: number[]) {
    const missing = deviceIds.filter((id) => !powerHistory.has(id));
    if (missing.length === 0) return;
    setHistoryLoading((prev) => new Set([...prev, ...missing]));
    try {
      const results = await Promise.all(
        missing.map((id) =>
          httpClient.get<ApiResponse<PowerEvent[]>>(`/devices/${id}/power-events?days=7`)
            .then((res) => ({ id, events: res.data }))
            .catch(() => ({ id, events: [] }))
        )
      );
      setPowerHistory((prev) => {
        const next = new Map(prev);
        for (const r of results) next.set(r.id, r.events);
        return next;
      });
    } finally {
      setHistoryLoading((prev) => {
        const next = new Set(prev);
        missing.forEach((id) => next.delete(id));
        return next;
      });
    }
  }

  useEffect(() => {
    if (tab === "electricity" && devices.length > 0) {
      loadPowerHistory(devices.map((d) => d.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, devices]);

  // ── tab helpers ─────────────────────────────────────────────────────────────
  function toggleNotify(deviceId: number) {
    setNotifyEnabled((prev) => {
      const next = new Set(prev);
      next.has(deviceId) ? next.delete(deviceId) : next.add(deviceId);
      return next;
    });
  }

  function toggleAntitheft(actuatorId: number) {
    setAntitheftEnabled((prev) => {
      const next = new Set(prev);
      next.has(actuatorId) ? next.delete(actuatorId) : next.add(actuatorId);
      return next;
    });
  }

  function setThreshold(actuatorId: number, value: string) {
    setCurrentThresholds((prev) => {
      const next = new Map(prev);
      next.set(actuatorId, value);
      return next;
    });
  }

  // ── electricity tab stats ─────────────────────────────────────────────────
  const onlineCount = devices.filter((d) => d.status === "online").length;
  const offlineCount = devices.length - onlineCount;

  return (
    <DashboardShell breadcrumb={[{ label: t("nav_farms_devices") }]}>
      {/* ── Tab bar ── */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setTab("farms")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === "farms" ? "bg-white text-accent-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Cpu className="w-4 h-4" />
            {t("nav_farms_devices")}
          </button>
          <button
            onClick={() => setTab("electricity")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === "electricity" ? "bg-white text-amber-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Zap className="w-4 h-4" />
            {t("farms_tab_electricity")}
            {onlineCount > 0 && tab !== "electricity" && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>
          <button
            onClick={() => setTab("antitheft")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === "antitheft" ? "bg-white text-red-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            {t("farms_tab_antitheft")}
          </button>
        </div>

        {/* Action buttons — only on farms tab */}
        {tab === "farms" && (
          <div className="flex gap-2">
            <button
              onClick={() => openAddDevice()}
              className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg px-4 py-2 transition-colors"
            >
              <Cpu className="w-4 h-4" /> {t("farms_add_device")}
            </button>
            <button
              onClick={() => { resetFarmForm(); setShowFarmModal(true); }}
              className="flex items-center gap-2 bg-accent-600 hover:bg-accent-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
            >
              <Plus className="w-4 h-4" /> {t("farms_add_farm")}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">{t("common_loading")}</p>
      ) : (
        <>
          {/* ════════════════════════════════════════════════════════════
              TAB 1 — Farms & Devices
          ════════════════════════════════════════════════════════════ */}
          {tab === "farms" && (
            <>
              {farms.length === 0 && unassigned.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                  <p className="text-slate-500 text-sm">{t("farms_no_farms_yet")}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {farms.map((farm) => {
                    const farmDevices = devicesByFarm.get(farm.id) ?? [];
                    const isCollapsed = collapsed.has(farm.id);
                    return (
                      <div key={farm.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
                          <button onClick={() => toggleCollapse(farm.id)} className="text-slate-400 hover:text-slate-600 shrink-0">
                            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-800 truncate">{farm.name}</h3>
                            {farm.location && (
                              <p className="flex items-center gap-1 text-xs text-slate-500 mt-0.5 truncate">
                                <MapPin className="w-3 h-3 shrink-0" /> {farm.location}
                              </p>
                            )}
                          </div>
                          <Link
                            href={`/farms/${farm.id}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl transition-colors shrink-0"
                          >
                            <Droplets className="w-3.5 h-3.5" /> {t("farms_zones_plans")}
                          </Link>
                          <span className="flex items-center gap-1 text-xs text-slate-500 shrink-0">
                            <Cpu className="w-3.5 h-3.5" />
                            {farmDevices.length === 1
                              ? t("farms_device_count_one", { n: farmDevices.length })
                              : t("farms_device_count_other", { n: farmDevices.length })}
                          </span>
                          <div className="relative shrink-0">
                            <button onClick={() => setOpenMenuId((id) => (id === farm.id ? null : farm.id))}
                              className="text-slate-400 hover:text-slate-600 p-1 -m-1 rounded-lg">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {openMenuId === farm.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                                <div className="absolute right-0 top-8 z-20 w-32 bg-white rounded-lg border border-slate-200 shadow-lg py-1">
                                  <button onClick={() => { setEditFarm(farm); setOpenMenuId(null); }}
                                    className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                                    <Pencil className="w-3.5 h-3.5" /> {t("common_edit")}
                                  </button>
                                  <button onClick={() => { setOpenMenuId(null); handleDeleteFarm(farm.id); }}
                                    className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
                                    <Trash2 className="w-3.5 h-3.5" /> {t("common_delete")}
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        {!isCollapsed && (
                          <div className="px-5 py-4">
                            {farmDevices.length === 0 ? (
                              <p className="text-sm text-slate-400 italic mb-3">{t("farms_no_devices_assigned")}</p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                                {farmDevices.map((d) => (
                                  <Link key={d.id} href={`/devices/${d.id}`}
                                    className="flex items-start justify-between p-3 rounded-lg border border-slate-100 hover:border-accent-200 hover:bg-accent-50/30 transition-colors">
                                    <div className="min-w-0">
                                      <p className="font-medium text-slate-800 text-sm truncate">{d.name}</p>
                                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                                        <span className="flex items-center gap-1"><Gauge className="w-3.5 h-3.5 text-sky-500" />{d.sensor_count ?? 0}</span>
                                        <span className="flex items-center gap-1"><Power className="w-3.5 h-3.5 text-accent-500" />{d.actuator_count ?? 0}</span>
                                      </div>
                                    </div>
                                    {d.status === "online" ? (
                                      <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 shrink-0">
                                        <Wifi className="w-3.5 h-3.5" /> {t("common_online")}
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1 text-xs font-medium text-slate-400 shrink-0">
                                        <WifiOff className="w-3.5 h-3.5" /> {t("common_offline")}
                                      </span>
                                    )}
                                  </Link>
                                ))}
                              </div>
                            )}
                            <button onClick={() => openAddDevice(farm.id)}
                              className="flex items-center gap-1.5 text-xs font-medium text-accent-700 hover:text-accent-800 hover:bg-accent-50 px-3 py-1.5 rounded-lg border border-dashed border-accent-300 transition-colors">
                              <Plus className="w-3.5 h-3.5" /> {t("farms_add_device_to_farm")}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {unassigned.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <div className="px-5 py-4 border-b border-slate-100">
                        <h3 className="font-semibold text-slate-600 text-sm">{t("farms_unassigned_devices")}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{t("farms_not_linked")}</p>
                      </div>
                      <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {unassigned.map((d) => (
                          <Link key={d.id} href={`/devices/${d.id}`}
                            className="flex items-start justify-between p-3 rounded-lg border border-slate-100 hover:border-accent-200 hover:bg-accent-50/30 transition-colors">
                            <div className="min-w-0">
                              <p className="font-medium text-slate-800 text-sm truncate">{d.name}</p>
                              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                                <span className="flex items-center gap-1"><Gauge className="w-3.5 h-3.5 text-sky-500" />{d.sensor_count ?? 0}</span>
                                <span className="flex items-center gap-1"><Power className="w-3.5 h-3.5 text-accent-500" />{d.actuator_count ?? 0}</span>
                              </div>
                            </div>
                            {d.status === "online" ? (
                              <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 shrink-0">
                                <Wifi className="w-3.5 h-3.5" /> {t("common_online")}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs font-medium text-slate-400 shrink-0">
                                <WifiOff className="w-3.5 h-3.5" /> {t("common_offline")}
                              </span>
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ════════════════════════════════════════════════════════════
              TAB 2 — Electricity Monitoring
          ════════════════════════════════════════════════════════════ */}
          {tab === "electricity" && (
            <div className="space-y-5">
              {/* Summary bar */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-5 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-700">{onlineCount}</p>
                    <p className="text-xs text-emerald-600 font-medium">
                      {onlineCount === 1 ? t("farms_devices_with_power_one") : t("farms_devices_with_power_other")}
                    </p>
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <ZapOff className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-500">{offlineCount}</p>
                    <p className="text-xs text-slate-500 font-medium">{t("farms_no_power_offline")}</p>
                  </div>
                </div>
              </div>

              {/* Battery + AC sensor explanation */}
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-4 flex items-start gap-3">
                <Zap className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800 space-y-1">
                  <p><strong>{t("farms_battery_esp32_title")}</strong> {t("farms_battery_esp32_body")}</p>
                  <p>{t("farms_ac_module_body")}</p>
                </div>
              </div>

              {/* Per-device power timeline */}
              {devices.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                  <ZapOff className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">{t("farms_no_devices_added")}</p>
                </div>
              ) : (
                [...farms.map((farm) => ({ farm, devList: devicesByFarm.get(farm.id) ?? [] })),
                 unassigned.length > 0 ? { farm: null, devList: unassigned } : null]
                  .filter(Boolean)
                  .map((item) => {
                    const { farm, devList } = item!;
                    if (devList.length === 0) return null;
                    return (
                      <div key={farm?.id ?? "unassigned"} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        {/* Farm header */}
                        <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50">
                          <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-700 text-sm truncate">
                              {farm ? farm.name : t("farms_unassigned_devices")}
                            </p>
                            {farm?.location && <p className="text-xs text-slate-400 truncate">{farm.location}</p>}
                          </div>
                        </div>

                        {/* Per-device rows */}
                        <div className="divide-y divide-slate-100">
                          {devList.map((d) => {
                            const hasPower = d.status === "online";
                            const notifyOn = notifyEnabled.has(d.id);
                            const events = powerHistory.get(d.id) ?? [];
                            const isLoadingHistory = historyLoading.has(d.id);
                            const dayRecords = buildDayRecords(events, hasPower, t);
                            const hasAnyHistory = dayRecords.some((r) => r.windows.length > 0);

                            return (
                              <div key={d.id} className="px-5 py-4">
                                {/* Device status row */}
                                <div className="flex items-center gap-3 mb-4">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${hasPower ? "bg-emerald-50" : "bg-slate-100"}`}>
                                    {hasPower
                                      ? <Zap className="w-5 h-5 text-emerald-600" />
                                      : <ZapOff className="w-5 h-5 text-slate-400" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-slate-800 text-sm">{d.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${hasPower ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                        {hasPower ? t("farms_power_on_badge") : t("farms_no_power_badge")}
                                      </span>
                                      <span className="text-xs text-slate-400">{timeSince(d.last_seen_at, t)}</span>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => toggleNotify(d.id)}
                                    className={`shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                                      notifyOn ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                                    }`}
                                  >
                                    {notifyOn ? <><Bell className="w-3.5 h-3.5" /> {t("farms_notify_on")}</> : <><BellOff className="w-3.5 h-3.5" /> {t("farms_notify_off")}</>}
                                  </button>
                                </div>

                                {/* 7-day power timeline */}
                                {isLoadingHistory ? (
                                  <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t("farms_loading_history")}
                                  </div>
                                ) : !hasAnyHistory ? (
                                  <div className="bg-slate-50 rounded-lg px-4 py-3 text-xs text-slate-400 italic">
                                    {t("farms_no_power_events")}
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {dayRecords.map((day) => (
                                      <div key={day.dateKey} className="flex gap-3 items-start">
                                        {/* Day label */}
                                        <div className="w-24 shrink-0 pt-1">
                                          <p className="text-xs font-semibold text-slate-600">{day.label}</p>
                                          {day.totalMinutes > 0 && (
                                            <p className="text-[10px] text-slate-400">{t("farms_total_suffix", { x: fmtHours(day.totalMinutes) })}</p>
                                          )}
                                        </div>

                                        {/* Windows */}
                                        <div className="flex-1">
                                          {day.windows.length === 0 ? (
                                            <div className="flex items-center gap-1.5 h-6">
                                              <div className="flex-1 h-1.5 rounded-full bg-slate-100" />
                                              <span className="text-[10px] text-slate-300">{t("farms_no_power_short")}</span>
                                            </div>
                                          ) : (
                                            <div className="space-y-1">
                                              {day.windows.map((w, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                  {/* Timeline bar */}
                                                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                    <span className="text-[11px] font-semibold text-emerald-700 shrink-0">
                                                      {fmtTime(w.on)}
                                                    </span>
                                                    <div className="flex-1 h-2 rounded-full bg-emerald-200 min-w-4" />
                                                    {w.off ? (
                                                      <span className="text-[11px] font-semibold text-red-500 shrink-0">
                                                        {fmtTime(w.off)}
                                                      </span>
                                                    ) : (
                                                      <span className="text-[11px] font-semibold text-emerald-600 shrink-0 animate-pulse">
                                                        {t("farms_now_indicator")}
                                                      </span>
                                                    )}
                                                  </div>
                                                  {/* Duration */}
                                                  <span className="text-[10px] text-slate-400 shrink-0 w-12 text-right">
                                                    {w.off
                                                      ? fmtHours(Math.round((w.off.getTime() - w.on.getTime()) / 60000))
                                                      : fmtHours(Math.round((Date.now() - w.on.getTime()) / 60000))}
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              TAB 3 — Anti-Theft
          ════════════════════════════════════════════════════════════ */}
          {tab === "antitheft" && (
            <div className="space-y-5">
              {/* Hardware notice */}
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-4 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700 mb-1">{t("farms_antitheft_requires_title")}</p>
                  <p className="text-sm text-red-600">
                    {t("farms_antitheft_requires_body")}
                  </p>
                </div>
              </div>

              {/* How it detects theft */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white border border-slate-200 rounded-xl px-4 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">{t("farms_normal_operation")}</p>
                  </div>
                  <p className="text-xs text-slate-500">{t("farms_normal_operation_body")}</p>
                </div>
                <div className="bg-white border border-red-100 rounded-xl px-4 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
                      <ShieldAlert className="w-4 h-4 text-red-500" />
                    </div>
                    <p className="text-sm font-semibold text-red-700">{t("farms_wire_cut_detected")}</p>
                  </div>
                  <p className="text-xs text-slate-500">{t("farms_wire_cut_body")}</p>
                </div>
              </div>

              {/* Per-farm motors */}
              {actuators.filter((a) => a.farm_id).length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                  <ShieldOff className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">{t("farms_no_motors_found")}</p>
                  <p className="text-xs text-slate-400 mt-1">{t("farms_add_actuators_first")}</p>
                </div>
              ) : (
                farms.map((farm) => {
                  const farmActuators = actuatorsByFarm.get(farm.id) ?? [];
                  if (farmActuators.length === 0) return null;
                  return (
                    <div key={farm.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-700 text-sm truncate">{farm.name}</p>
                          {farm.location && <p className="text-xs text-slate-400 truncate">{farm.location}</p>}
                        </div>
                        <span className="text-xs text-slate-400">
                          {farmActuators.length === 1
                            ? t("farms_motor_count_one", { n: farmActuators.length })
                            : t("farms_motor_count_other", { n: farmActuators.length })}
                        </span>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {farmActuators.map((a) => {
                          const enabled = antitheftEnabled.has(a.id);
                          const threshold = currentThresholds.get(a.id) ?? "";
                          const isRunning = a.current_state === "on";
                          return (
                            <div key={a.id} className="px-5 py-4">
                              <div className="flex items-center gap-4">
                                {/* Motor icon */}
                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${enabled ? "bg-red-50" : "bg-slate-100"}`}>
                                  {enabled
                                    ? <ShieldCheck className="w-5 h-5 text-red-500" />
                                    : <ShieldOff className="w-5 h-5 text-slate-400" />}
                                </div>

                                {/* Motor info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-slate-800 text-sm truncate">{a.name}</p>
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isRunning ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                      {isRunning ? t("farms_running") : t("farms_off")}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-400 mt-0.5 capitalize">{a.actuator_type}</p>
                                </div>

                                {/* Enable toggle */}
                                <button
                                  onClick={() => toggleAntitheft(a.id)}
                                  className={`shrink-0 w-12 h-6 rounded-full transition-colors relative focus:outline-none ${enabled ? "bg-red-500" : "bg-slate-200"}`}
                                >
                                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? "translate-x-7" : "translate-x-1"}`} />
                                </button>
                              </div>

                              {/* Expanded config when enabled */}
                              {enabled && (
                                <div className="mt-4 ml-15 pl-15 border-l-2 border-red-100 ml-[60px] pl-4 space-y-3">
                                  <div className="flex items-center gap-3">
                                    <Settings2 className="w-4 h-4 text-red-400 shrink-0" />
                                    <label className="text-xs font-medium text-slate-600 shrink-0">{t("farms_expected_current")}</label>
                                    <input
                                      type="number"
                                      step="0.1"
                                      min="0.1"
                                      value={threshold}
                                      onChange={(e) => setThreshold(a.id, e.target.value)}
                                      placeholder="e.g. 8.0"
                                      className="w-28 px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                                    />
                                    <span className="text-xs text-slate-400">A</span>
                                  </div>
                                  <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${
                                    !threshold
                                      ? "bg-amber-50 text-amber-700 border border-amber-100"
                                      : "bg-red-50 text-red-700 border border-red-100"
                                  }`}>
                                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                                    {!threshold
                                      ? t("farms_set_expected_current")
                                      : t("farms_alert_fires_below", { threshold: Number(threshold) * 0.5 })}
                                  </div>
                                  <p className="text-[11px] text-slate-400">
                                    {t("farms_requires_ct_sensor")}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}

      {/* ── Add Farm modal ── */}
      {showFarmModal && (
        <Modal title={t("farms_add_farm")} onClose={() => { setShowFarmModal(false); resetFarmForm(); }}>
          <form onSubmit={handleCreateFarm} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("farms_field_name")}</label>
              <input type="text" required value={farmName} onChange={(e) => setFarmName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                placeholder="North Field" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-slate-700">{t("farms_field_location_optional")}</label>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={useCurrentLocation} disabled={locating}
                    className="flex items-center gap-1 text-xs font-medium text-accent-700 hover:underline disabled:opacity-60">
                    {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5" />}
                    {t("farms_use_current_location")}
                  </button>
                  <button type="button" onClick={() => setShowLocateMap((v) => !v)}
                    className="flex items-center gap-1 text-xs font-medium text-accent-700 hover:underline">
                    <MapPin className="w-3.5 h-3.5" />
                    {showLocateMap ? t("farms_locate_on_map_hide") : t("farms_locate_on_map")}
                  </button>
                </div>
              </div>
              <input type="text" value={farmLocation} onChange={(e) => setFarmLocation(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                placeholder={t("farms_placeholder_village")} />
              {locationError && <p className="text-xs text-red-600 mt-1">{locationError}</p>}
            </div>
            {showLocateMap && (
              <LocationPickerMap
                lat={farmLat ? Number(farmLat) : null}
                lng={farmLng ? Number(farmLng) : null}
                hint={t("farms_locate_on_map_hint")}
                onChange={(lat, lng) => { setFarmLat(lat.toFixed(6)); setFarmLng(lng.toFixed(6)); }}
              />
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t("farms_field_latitude_optional")}</label>
                <input type="number" step="any" value={farmLat} onChange={(e) => setFarmLat(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                  placeholder="18.5204" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t("farms_field_longitude_optional")}</label>
                <input type="number" step="any" value={farmLng} onChange={(e) => setFarmLng(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                  placeholder="73.8567" />
              </div>
            </div>
            <button type="submit" disabled={farmSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-accent-600 hover:bg-accent-700 text-white font-medium text-sm rounded-lg px-4 py-2.5 transition-colors disabled:opacity-60">
              {farmSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {t("farms_add_farm")}
            </button>
          </form>
        </Modal>
      )}

      {/* ── Add Device modal ── */}
      {showDeviceModal && !createdDevice && (
        <Modal title={t("farms_add_device")} onClose={closeDeviceModal}>
          <form onSubmit={handleCreateDevice} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("farms_field_name")}</label>
              <input type="text" required value={devName} onChange={(e) => setDevName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                placeholder={t("farms_placeholder_field_gateway")} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("farms_field_farm_optional")}</label>
              <select value={devFarmId} onChange={(e) => setDevFarmId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500">
                <option value="">{t("home_unassigned")}</option>
                {farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("farms_field_relay_count")}</label>
              <input type="number" min={1} max={16} required value={devRelayCount}
                onChange={(e) => setDevRelayCount(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500" />
            </div>
            <button type="submit" disabled={devSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-accent-600 hover:bg-accent-700 text-white font-medium text-sm rounded-lg px-4 py-2.5 transition-colors disabled:opacity-60">
              {devSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {t("farms_add_device")}
            </button>
          </form>
        </Modal>
      )}

      {/* ── API key reveal after device creation ── */}
      {createdDevice && (
        <Modal title={t("farms_modal_device_created_title")} onClose={closeDeviceModal}>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              {t("farms_device_created_instructions")}
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
              className="w-full bg-accent-600 hover:bg-accent-700 text-white font-medium text-sm rounded-lg px-4 py-2.5 transition-colors">
              {t("farms_done")}
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
  const [showLocateMap, setShowLocateMap] = useState(false);
  const toast = useToast();
  const { t } = useLocale();

  function useCurrentLocation() {
    if (!navigator.geolocation) { setLocationError(t("farms_geolocation_unsupported")); return; }
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
    e.preventDefault(); setSubmitting(true);
    try {
      await httpClient.put<ApiResponse<Farm>>(`/farms/${farm.id}`, {
        name,
        location: location || null,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
      });
      toast.success(t("farms_toast_updated_title"), t("farms_toast_updated_body", { name }));
      onSaved();
    } catch (err) {
      toast.error(t("farms_toast_update_failed"), err instanceof Error ? err.message : undefined);
    } finally { setSubmitting(false); }
  }

  return (
    <Modal title={t("farms_modal_edit_farm_title")} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t("farms_field_name")}</label>
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
            placeholder="North Field" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-slate-700">{t("farms_field_location_optional")}</label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={useCurrentLocation} disabled={locating}
                className="flex items-center gap-1 text-xs font-medium text-accent-700 hover:underline disabled:opacity-60">
                {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5" />}
                {t("farms_use_current_location")}
              </button>
              <button type="button" onClick={() => setShowLocateMap((v) => !v)}
                className="flex items-center gap-1 text-xs font-medium text-accent-700 hover:underline">
                <MapPin className="w-3.5 h-3.5" />
                {showLocateMap ? t("farms_locate_on_map_hide") : t("farms_locate_on_map")}
              </button>
            </div>
          </div>
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
            placeholder={t("farms_placeholder_village")} />
          {locationError && <p className="text-xs text-red-600 mt-1">{locationError}</p>}
        </div>
        {showLocateMap && (
          <LocationPickerMap
            lat={latitude ? Number(latitude) : null}
            lng={longitude ? Number(longitude) : null}
            hint={t("farms_locate_on_map_hint")}
            onChange={(lat, lng) => { setLatitude(lat.toFixed(6)); setLongitude(lng.toFixed(6)); }}
          />
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t("farms_field_latitude")}</label>
            <input type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
              placeholder="18.5204" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t("farms_field_longitude")}</label>
            <input type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
              placeholder="73.8567" />
          </div>
        </div>
        <button type="submit" disabled={submitting}
          className="w-full flex items-center justify-center gap-2 bg-accent-600 hover:bg-accent-700 text-white font-medium text-sm rounded-lg px-4 py-2.5 transition-colors disabled:opacity-60">
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {t("farms_save_changes")}
        </button>
      </form>
    </Modal>
  );
}
