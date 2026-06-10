"use client";

import { useEffect, useState, FormEvent, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  Wifi,
  WifiOff,
  Gauge,
  Power,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import Modal from "@/components/Modal";
import { httpClient } from "@/lib/api";
import { socketClient } from "@/lib/socket";
import { ApiResponse, Device, Farm } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";

function DevicesPageContent() {
  const { user, isAuthenticated } = useAuth();
  const searchParams = useSearchParams();
  const farmIdFilter = searchParams.get("farm_id");

  const [devices, setDevices] = useState<Device[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdDevice, setCreatedDevice] = useState<Device | null>(null);
  const [copied, setCopied] = useState(false);

  const [name, setName] = useState("");
  const [farmId, setFarmId] = useState("");
  const [relayCount, setRelayCount] = useState("4");

  async function loadData() {
    setLoading(true);
    try {
      const path = farmIdFilter
        ? `/devices?farm_id=${farmIdFilter}`
        : "/devices";
      const [devicesRes, farmsRes] = await Promise.all([
        httpClient.get<ApiResponse<Device[]>>(path),
        httpClient.get<ApiResponse<Farm[]>>("/farms"),
      ]);
      setDevices(devicesRes.data);
      setFarms(farmsRes.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmIdFilter]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const onDeviceStatus = (...args: unknown[]) => {
      const data = args[0] as { device_id: number; status: string; last_seen_at: string };
      setDevices((prev) =>
        prev.map((d) =>
          d.id === data.device_id
            ? { ...d, status: data.status, last_seen_at: data.last_seen_at }
            : d
        )
      );
    };
    socketClient.on("device-status", onDeviceStatus);
    return () => socketClient.off("device-status", onDeviceStatus);
  }, [isAuthenticated]);

  function resetForm() {
    setName("");
    setFarmId("");
    setRelayCount("4");
    setError(null);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await httpClient.post<ApiResponse<Device>>("/devices", {
        name,
        farm_id: farmId ? Number(farmId) : undefined,
        relay_count: Number(relayCount),
      });
      setCreatedDevice(res.data);
      resetForm();
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create device");
    } finally {
      setSubmitting(false);
    }
  }

  function closeAll() {
    setShowModal(false);
    setCreatedDevice(null);
    setCopied(false);
  }

  function copyApiKey() {
    if (!createdDevice) return;
    navigator.clipboard.writeText(createdDevice.api_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <DashboardShell title="Devices">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">
          ESP32 gateways that report sensors and control motors
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add device
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : devices.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <p className="text-sm text-slate-500">
            No devices yet. Provision an ESP32 gateway to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((d) => (
            <Link
              key={d.id}
              href={`/devices/${d.id}`}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:border-primary-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-slate-800">{d.name}</h3>
                {d.status === "online" ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                    <Wifi className="w-4 h-4" /> Online
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-medium text-slate-400">
                    <WifiOff className="w-4 h-4" /> Offline
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-1">
                {d.farm_name || "Unassigned"}
              </p>
              <div className="flex items-center gap-4 mt-3 text-sm text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-sky-600" />
                  {d.sensor_count || 0} sensors
                </span>
                <span className="flex items-center gap-1.5">
                  <Power className="w-4 h-4 text-primary-600" />
                  {d.actuator_count || 0} actuators
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showModal && !createdDevice && (
        <Modal title="Add device" onClose={closeAll}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Field Gateway 1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Farm (optional)
              </label>
              <select
                value={farmId}
                onChange={(e) => setFarmId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Unassigned</option>
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Relay count
              </label>
              <input
                type="number"
                min={1}
                max={16}
                required
                value={relayCount}
                onChange={(e) => setRelayCount(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm rounded-lg px-4 py-2.5 transition-colors disabled:opacity-60"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Add device
            </button>
          </form>
        </Modal>
      )}

      {createdDevice && (
        <Modal title="Device created" onClose={closeAll}>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Use these values in the ESP32 firmware&apos;s{" "}
              <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">
                config.h
              </code>{" "}
              file. The API key is shown only once — copy it now.
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                ORG_ID
              </label>
              <p className="font-mono text-sm bg-slate-100 rounded-lg px-3 py-2">
                {user?.organization_id}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                API_KEY
              </label>
              <div className="flex items-center gap-2">
                <p className="font-mono text-sm bg-slate-100 rounded-lg px-3 py-2 flex-1 break-all">
                  {createdDevice.api_key}
                </p>
                <button
                  onClick={copyApiKey}
                  className="p-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 shrink-0"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            <button
              onClick={closeAll}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm rounded-lg px-4 py-2.5 transition-colors"
            >
              Done
            </button>
          </div>
        </Modal>
      )}
    </DashboardShell>
  );
}

export default function DevicesPage() {
  return (
    <Suspense fallback={null}>
      <DevicesPageContent />
    </Suspense>
  );
}
