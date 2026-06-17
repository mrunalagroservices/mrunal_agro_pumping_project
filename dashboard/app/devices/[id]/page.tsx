"use client";

import { useEffect, useState, FormEvent, use } from "react";
import {
  Wifi, WifiOff, Plus, RefreshCw, Eye, EyeOff, Copy, Check, Loader2, Trash2,
  Zap, ZapOff, Bell, BellOff, ShieldAlert, ShieldCheck, ShieldOff, Settings2,
  Battery,
} from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import Modal from "@/components/Modal";
import SensorCard from "@/components/SensorCard";
import ActuatorCard from "@/components/ActuatorCard";
import { httpClient } from "@/lib/api";
import { socketClient } from "@/lib/socket";
import { ApiResponse, Actuator, DeviceDetail, Sensor } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

// ── Power event helpers ───────────────────────────────────────────────────────
interface PowerEvent { event_type: "power_on" | "power_off"; created_at: string; }
interface PowerWindow { on: Date; off: Date | null; }
interface DayRecord { label: string; dateKey: string; windows: PowerWindow[]; totalMinutes: number; }

function fmtTime(d: Date): string {
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function fmtHours(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
function timeSince(dateStr: string | null | undefined): string {
  if (!dateStr) return "Never seen";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
function buildDayRecords(events: PowerEvent[], deviceOnline: boolean): DayRecord[] {
  const days: DayRecord[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = i === 0 ? "Today" : i === 1 ? "Yesterday"
      : d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
    days.push({ label, dateKey: key, windows: [], totalMinutes: 0 });
  }
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

// ─────────────────────────────────────────────────────────────────────────────

export default function DeviceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const [device, setDevice] = useState<DeviceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const [showSensorModal, setShowSensorModal] = useState(false);
  const [showActuatorModal, setShowActuatorModal] = useState(false);

  // ── power monitoring ──────────────────────────────────────────────────────
  const [powerEvents, setPowerEvents] = useState<PowerEvent[]>([]);
  const [powerLoading, setPowerLoading] = useState(false);
  const [notifyEnabled, setNotifyEnabled] = useState(false);

  // ── anti-theft ────────────────────────────────────────────────────────────
  const [antitheftEnabled, setAntitheftEnabled] = useState<Set<number>>(new Set());
  const [currentThresholds, setCurrentThresholds] = useState<Map<number, string>>(new Map());

  async function loadDevice() {
    setLoading(true);
    try {
      const res = await httpClient.get<ApiResponse<DeviceDetail>>(`/devices/${id}`);
      setDevice(res.data);
    } finally {
      setLoading(false);
    }
  }

  async function loadPowerEvents() {
    setPowerLoading(true);
    try {
      const res = await httpClient.get<ApiResponse<PowerEvent[]>>(`/devices/${id}/power-events?days=7`);
      setPowerEvents(res.data);
    } catch {
      setPowerEvents([]);
    } finally {
      setPowerLoading(false);
    }
  }

  useEffect(() => { loadDevice(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadPowerEvents(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── socket listeners ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !device) return;
    const onSensorData = (...args: unknown[]) => {
      const data = args[0] as Sensor;
      if (data.device_id !== device.id) return;
      setDevice((prev) => prev ? { ...prev, sensors: prev.sensors.map((s) => s.id === data.id ? { ...s, ...data } : s) } : prev);
    };
    const onActuatorStatus = (...args: unknown[]) => {
      const data = args[0] as Actuator;
      if (data.device_id !== device.id) return;
      setDevice((prev) => prev ? { ...prev, actuators: prev.actuators.map((a) => a.id === data.id ? { ...a, ...data } : a) } : prev);
    };
    const onDeviceStatus = (...args: unknown[]) => {
      const data = args[0] as { device_id: number; status: string; last_seen_at: string };
      if (data.device_id !== device.id) return;
      setDevice((prev) => prev ? { ...prev, status: data.status, last_seen_at: data.last_seen_at } : prev);
    };
    socketClient.on("sensor-data", onSensorData);
    socketClient.on("actuator-status", onActuatorStatus);
    socketClient.on("device-status", onDeviceStatus);
    return () => {
      socketClient.off("sensor-data", onSensorData);
      socketClient.off("actuator-status", onActuatorStatus);
      socketClient.off("device-status", onDeviceStatus);
    };
  }, [isAuthenticated, device?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleToggle(actuatorId: number, state: "on" | "off", durationMinutes: number) {
    try {
      const res = await httpClient.post<ApiResponse<Actuator>>(`/actuators/${actuatorId}/toggle`, { state, duration_minutes: durationMinutes });
      setDevice((prev) => prev ? { ...prev, actuators: prev.actuators.map((a) => a.id === actuatorId ? { ...a, ...res.data } : a) } : prev);
      const actuatorName = device?.actuators.find((a) => a.id === actuatorId)?.name ?? "Actuator";
      toast.success(state === "on" ? `${actuatorName} turned ON` : `${actuatorName} turned OFF`);
    } catch (err) {
      toast.error("Failed to toggle actuator", err instanceof Error ? err.message : undefined);
    }
  }

  async function handleRegenerateKey() {
    if (!confirm("Regenerate the API key? The firmware will need to be reflashed with the new key.")) return;
    setRegenerating(true);
    try {
      const res = await httpClient.post<ApiResponse<{ api_key: string }>>(`/devices/${id}/regenerate-key`);
      setDevice((prev) => (prev ? { ...prev, api_key: res.data.api_key } : prev));
    } finally { setRegenerating(false); }
  }

  function copyApiKey() {
    if (!device) return;
    navigator.clipboard.writeText(device.api_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function toggleAntitheft(actuatorId: number) {
    setAntitheftEnabled((prev) => {
      const next = new Set(prev);
      next.has(actuatorId) ? next.delete(actuatorId) : next.add(actuatorId);
      return next;
    });
  }

  function setThreshold(actuatorId: number, value: string) {
    setCurrentThresholds((prev) => { const next = new Map(prev); next.set(actuatorId, value); return next; });
  }

  // ─────────────────────────────────────────────────────────────────────────
  const inp = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500";

  const breadcrumb = device
    ? [
        { label: "Farms & Devices", href: "/farms" },
        ...(device.farm_name ? [{ label: device.farm_name, href: "/farms" }] : []),
        { label: device.name },
      ]
    : [{ label: "Farms & Devices", href: "/farms" }, { label: "Device" }];

  if (loading) {
    return (
      <DashboardShell breadcrumb={breadcrumb}>
        <p className="text-sm text-slate-500">Loading…</p>
      </DashboardShell>
    );
  }

  if (!device) {
    return (
      <DashboardShell breadcrumb={breadcrumb}>
        <p className="text-sm text-slate-500">Device not found.</p>
      </DashboardShell>
    );
  }

  const hasPower = device.status === "online";
  const dayRecords = buildDayRecords(powerEvents, hasPower);
  const hasAnyHistory = dayRecords.some((r) => r.windows.length > 0);

  return (
    <DashboardShell breadcrumb={breadcrumb}>
      <div className="space-y-6">

        {/* ── 1. Device info card ───────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-semibold text-slate-800">{device.name}</h2>
                {device.status === "online" ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <Wifi className="w-3.5 h-3.5" /> Online
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    <WifiOff className="w-3.5 h-3.5" /> Offline
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs font-medium text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">
                  <Battery className="w-3.5 h-3.5" /> Battery powered · 24/7
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                {device.farm_name || "Unassigned"} · {device.device_type}
                {device.firmware_version ? ` · v${device.firmware_version}` : ""}
              </p>
              {device.ip_address && (
                <p className="text-xs text-slate-400 mt-1">
                  IP {device.ip_address} · Last seen {device.last_seen_at ? new Date(device.last_seen_at).toLocaleString() : "never"}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-500 mb-1">ORG_ID / API_KEY (for firmware config.h)</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs bg-slate-100 rounded px-2 py-1">ORG_ID = {device.organization_id}</span>
              <span className="font-mono text-xs bg-slate-100 rounded px-2 py-1 break-all">
                API_KEY = {showApiKey ? device.api_key : "•".repeat(20)}
              </span>
              <button onClick={() => setShowApiKey((v) => !v)} className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">
                {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              <button onClick={copyApiKey} className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button onClick={handleRegenerateKey} disabled={regenerating}
                className="flex items-center gap-1.5 text-xs font-medium text-amber-700 border border-amber-200 bg-amber-50 hover:bg-amber-100 rounded-lg px-2 py-1.5 disabled:opacity-60">
                {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Regenerate
              </button>
            </div>
          </div>
        </div>

        {/* ── 2. Electricity / Power Monitoring ────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${hasPower ? "bg-emerald-50" : "bg-slate-100"}`}>
                {hasPower ? <Zap className="w-4 h-4 text-emerald-600" /> : <ZapOff className="w-4 h-4 text-slate-400" />}
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 text-sm">Electricity Monitoring</h3>
                <p className="text-xs text-slate-400">Farm power availability · last 7 days</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {/* Current status badge */}
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${hasPower ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                {hasPower ? "⚡ Power ON" : "No Power"}
              </span>
              <span className="text-xs text-slate-400 hidden sm:block">{timeSince(device.last_seen_at)}</span>
              {/* Notify toggle */}
              <button
                onClick={() => setNotifyEnabled((v) => !v)}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                  notifyEnabled ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                }`}
              >
                {notifyEnabled ? <><Bell className="w-3.5 h-3.5" /> Notify ON</> : <><BellOff className="w-3.5 h-3.5" /> Notify OFF</>}
              </button>
            </div>
          </div>

          {/* How it works note */}
          <div className="mx-5 my-3 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5 flex items-start gap-2">
            <Battery className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Your ESP32 runs on battery 24/7. Connect an <strong>AC detection module</strong> to a GPIO pin — the firmware sends <code className="bg-amber-100 px-0.5 rounded">power_on</code> / <code className="bg-amber-100 px-0.5 rounded">power_off</code> events when mains electricity changes. Endpoint: <code className="bg-amber-100 px-0.5 rounded">POST /api/v1/devices/ingest/power-event</code> with header <code className="bg-amber-100 px-0.5 rounded">x-api-key</code>.
            </p>
          </div>

          {/* 7-day timeline */}
          <div className="px-5 pb-5">
            {powerLoading ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 py-3">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading history…
              </div>
            ) : !hasAnyHistory ? (
              <div className="bg-slate-50 rounded-lg px-4 py-4 text-center">
                <ZapOff className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                <p className="text-xs text-slate-400 italic">No power events recorded yet.</p>
                <p className="text-xs text-slate-400 mt-0.5">Once the AC detection circuit is wired and firmware is updated, the daily ON/OFF timeline will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {dayRecords.map((day) => (
                  <div key={day.dateKey} className="flex gap-3 items-start">
                    {/* Day label */}
                    <div className="w-24 shrink-0 pt-0.5">
                      <p className="text-xs font-semibold text-slate-600">{day.label}</p>
                      {day.totalMinutes > 0 && (
                        <p className="text-[10px] text-slate-400">{fmtHours(day.totalMinutes)} total</p>
                      )}
                    </div>
                    {/* Windows */}
                    <div className="flex-1 space-y-1">
                      {day.windows.length === 0 ? (
                        <div className="flex items-center gap-2 h-5">
                          <div className="flex-1 h-1.5 rounded-full bg-slate-100" />
                          <span className="text-[10px] text-slate-300 shrink-0">No power</span>
                        </div>
                      ) : (
                        day.windows.map((w, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-emerald-700 shrink-0 w-16 text-right">{fmtTime(w.on)}</span>
                            <div className="flex-1 h-2 rounded-full bg-emerald-200 min-w-4" />
                            {w.off ? (
                              <span className="text-[11px] font-semibold text-red-500 shrink-0 w-16">{fmtTime(w.off)}</span>
                            ) : (
                              <span className="text-[11px] font-semibold text-emerald-600 shrink-0 w-16 animate-pulse">Now ●</span>
                            )}
                            <span className="text-[10px] text-slate-400 shrink-0 w-10 text-right">
                              {w.off
                                ? fmtHours(Math.round((w.off.getTime() - w.on.getTime()) / 60000))
                                : fmtHours(Math.round((Date.now() - w.on.getTime()) / 60000))}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── 3. Actuators ─────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-800">Actuators (motors / pumps / valves)</h3>
            <button onClick={() => setShowActuatorModal(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-primary-700 hover:underline">
              <Plus className="w-4 h-4" /> Add actuator
            </button>
          </div>
          {device.actuators.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-500">
              No actuators registered for this device yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {device.actuators.map((a) => (
                <ActuatorCard key={a.id} actuator={a} onToggle={(state, dur) => handleToggle(a.id, state, dur)} />
              ))}
            </div>
          )}
        </div>

        {/* ── 4. Anti-Theft Monitoring ──────────────────────────────────────── */}
        {device.actuators.length > 0 && (
          <div className="bg-white rounded-xl border border-red-100 overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-red-50 bg-red-50/60">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-4 h-4 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-800 text-sm">Anti-Theft Monitoring</h3>
                <p className="text-xs text-slate-500">Detect if motor wires are forcefully cut · requires CT sensor hardware</p>
              </div>
            </div>

            {/* Hardware requirement note */}
            <div className="mx-5 mt-4 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5 flex items-start gap-2">
              <ShieldAlert className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">
                Needs a <strong>SCT-013 CT current sensor</strong> clipped around the motor wire. When motor is ON but current drops to 0A, it means wire was cut — an alert fires instantly. If motor is OFF but current is high — someone bypassed the app.
              </p>
            </div>

            {/* Per-actuator toggle rows */}
            <div className="px-5 py-4 space-y-4">
              {device.actuators.map((a) => {
                const enabled = antitheftEnabled.has(a.id);
                const threshold = currentThresholds.get(a.id) ?? "";
                const isRunning = a.current_state === "on";
                return (
                  <div key={a.id} className={`rounded-xl border p-4 transition-colors ${enabled ? "border-red-200 bg-red-50/30" : "border-slate-200"}`}>
                    {/* Actuator row */}
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${enabled ? "bg-red-100" : "bg-slate-100"}`}>
                        {enabled ? <ShieldCheck className="w-4 h-4 text-red-600" /> : <ShieldOff className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-slate-800 text-sm">{a.name}</p>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${isRunning ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                            {isRunning ? "● Running" : "Off"}
                          </span>
                          {enabled && threshold && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                              Monitoring {threshold}A
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 capitalize">{a.actuator_type} · Relay {a.relay_channel}</p>
                      </div>
                      {/* Slide toggle */}
                      <button
                        onClick={() => toggleAntitheft(a.id)}
                        className={`shrink-0 w-12 h-6 rounded-full transition-colors relative focus:outline-none ${enabled ? "bg-red-500" : "bg-slate-200"}`}
                      >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? "translate-x-7" : "translate-x-1"}`} />
                      </button>
                    </div>

                    {/* Expanded config when enabled */}
                    {enabled && (
                      <div className="mt-3 pl-12 space-y-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <Settings2 className="w-3.5 h-3.5 text-red-400 shrink-0" />
                          <label className="text-xs font-medium text-slate-600 shrink-0">Expected current (A)</label>
                          <input
                            type="number" step="0.1" min="0.1" value={threshold}
                            onChange={(e) => setThreshold(a.id, e.target.value)}
                            placeholder="e.g. 8.0"
                            className="w-28 px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                          />
                          <span className="text-xs text-slate-400">Amperes</span>
                        </div>
                        <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${
                          !threshold
                            ? "bg-amber-50 text-amber-700 border border-amber-100"
                            : "bg-red-50 text-red-700 border border-red-100"
                        }`}>
                          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                          {!threshold
                            ? "Enter expected current above to activate monitoring"
                            : `Alert fires if current drops below ${(Number(threshold) * 0.5).toFixed(1)}A while motor is ON`}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          ESP32 firmware endpoint: <code className="bg-slate-100 px-1 rounded">POST /api/v1/devices/ingest/power-event</code> — reuse same pattern for current readings.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 5. Sensors ───────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-800">Sensors</h3>
            <button onClick={() => setShowSensorModal(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-primary-700 hover:underline">
              <Plus className="w-4 h-4" /> Add sensor
            </button>
          </div>
          {device.sensors.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-500">
              No sensors registered for this device yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {device.sensors.map((s) => <SensorCard key={s.id} sensor={s} />)}
            </div>
          )}
        </div>

        {/* ── 6. Recent activity ───────────────────────────────────────────── */}
        {device.logs.length > 0 && (
          <div>
            <h3 className="font-semibold text-slate-800 mb-3">Recent activity</h3>
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {device.logs.map((l) => (
                <div key={l.id} className="px-4 py-2.5 text-sm flex items-center justify-between">
                  <span className="text-slate-700 capitalize">Device went {l.event_type}</span>
                  <span className="text-xs text-slate-400">{new Date(l.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showSensorModal && (
        <AddSensorModal deviceId={device.id} farmId={device.farm_id}
          onClose={() => setShowSensorModal(false)}
          onCreated={(sensor) => { setDevice((prev) => prev ? { ...prev, sensors: [...prev.sensors, sensor] } : prev); setShowSensorModal(false); }} />
      )}
      {showActuatorModal && (
        <AddActuatorModal deviceId={device.id} farmId={device.farm_id} relayCount={device.relay_count}
          existingChannels={device.actuators.map((a) => a.relay_channel)}
          onClose={() => setShowActuatorModal(false)}
          onCreated={(actuator) => { setDevice((prev) => prev ? { ...prev, actuators: [...prev.actuators, actuator] } : prev); setShowActuatorModal(false); }} />
      )}
    </DashboardShell>
  );
}

// ── Add Sensor Modal ───────────────────────────────────────────────────────────
function AddSensorModal({ deviceId, farmId, onClose, onCreated }: { deviceId: number; farmId: number; onClose: () => void; onCreated: (sensor: Sensor) => void }) {
  const [name, setName] = useState("");
  const [sensorType, setSensorType] = useState("water_level");
  const [channel, setChannel] = useState("");
  const [unit, setUnit] = useState("");
  const [minThreshold, setMinThreshold] = useState("");
  const [maxThreshold, setMaxThreshold] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const inp = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setSubmitting(true);
    try {
      const res = await httpClient.post<ApiResponse<Sensor>>("/sensors", {
        device_id: deviceId, farm_id: farmId || undefined, name,
        sensor_type: sensorType, channel, unit: unit || undefined,
        min_threshold: minThreshold ? Number(minThreshold) : undefined,
        max_threshold: maxThreshold ? Number(maxThreshold) : undefined,
      });
      toast.success("Sensor added", `"${name}" is now monitoring.`);
      onCreated(res.data);
    } catch (err) {
      toast.error("Failed to add sensor", err instanceof Error ? err.message : undefined);
    } finally { setSubmitting(false); }
  }

  return (
    <Modal title="Add sensor" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inp} placeholder="Borewell water level" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
            <select value={sensorType} onChange={(e) => setSensorType(e.target.value)} className={inp}>
              <option value="water_level">Water level</option>
              <option value="voltage">Voltage</option>
              <option value="flow_rate">Flow rate</option>
              <option value="pressure">Pressure</option>
              <option value="temperature">Temperature</option>
              <option value="moisture">Soil moisture</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Unit (optional)</label>
            <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} className={inp} placeholder="%, V, L/min" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Channel</label>
          <input type="text" required value={channel} onChange={(e) => setChannel(e.target.value)} className={inp} placeholder="water_level (must match firmware SENSORS[].channel)" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Min threshold (optional)</label>
            <input type="number" step="any" value={minThreshold} onChange={(e) => setMinThreshold(e.target.value)} className={inp} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Max threshold (optional)</label>
            <input type="number" step="any" value={maxThreshold} onChange={(e) => setMaxThreshold(e.target.value)} className={inp} />
          </div>
        </div>
        <button type="submit" disabled={submitting}
          className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm rounded-lg px-4 py-2.5 transition-colors disabled:opacity-60">
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Add sensor
        </button>
      </form>
    </Modal>
  );
}

// ── Add Actuator Modal ─────────────────────────────────────────────────────────
function AddActuatorModal({ deviceId, farmId, relayCount, existingChannels, onClose, onCreated }: {
  deviceId: number; farmId: number; relayCount: number; existingChannels: number[];
  onClose: () => void; onCreated: (actuator: Actuator) => void;
}) {
  const availableChannels = Array.from({ length: relayCount }, (_, i) => i + 1).filter((c) => !existingChannels.includes(c));
  const [name, setName] = useState("");
  const [actuatorType, setActuatorType] = useState("motor");
  const [relayChannel, setRelayChannel] = useState(availableChannels[0]?.toString() || "");
  const [maxRuntime, setMaxRuntime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const inp = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setSubmitting(true);
    try {
      const res = await httpClient.post<ApiResponse<Actuator>>("/actuators", {
        device_id: deviceId, farm_id: farmId || undefined, name,
        actuator_type: actuatorType, relay_channel: Number(relayChannel),
        max_runtime_minutes: maxRuntime ? Number(maxRuntime) : undefined,
      });
      toast.success("Actuator added", `"${name}" is ready to control.`);
      onCreated(res.data);
    } catch (err) {
      toast.error("Failed to add actuator", err instanceof Error ? err.message : undefined);
    } finally { setSubmitting(false); }
  }

  return (
    <Modal title="Add actuator" onClose={onClose}>
      {availableChannels.length === 0 ? (
        <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          <Trash2 className="w-4 h-4 mt-0.5 shrink-0" />
          All {relayCount} relay channels on this device are already in use.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inp} placeholder="Main field pump" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select value={actuatorType} onChange={(e) => setActuatorType(e.target.value)} className={inp}>
                <option value="motor">Motor</option>
                <option value="pump">Pump</option>
                <option value="valve">Valve</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Relay channel</label>
              <select value={relayChannel} onChange={(e) => setRelayChannel(e.target.value)} className={inp}>
                {availableChannels.map((c) => <option key={c} value={c}>Relay {c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Max runtime, minutes (optional safety cutoff)</label>
            <input type="number" min={0} value={maxRuntime} onChange={(e) => setMaxRuntime(e.target.value)} className={inp} placeholder="e.g. 120" />
          </div>
          <button type="submit" disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm rounded-lg px-4 py-2.5 transition-colors disabled:opacity-60">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Add actuator
          </button>
        </form>
      )}
    </Modal>
  );
}
