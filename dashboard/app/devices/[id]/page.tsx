"use client";

import { useEffect, useState, FormEvent, use } from "react";
import {
  Wifi,
  WifiOff,
  Plus,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Check,
  Loader2,
  Trash2,
} from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import Modal from "@/components/Modal";
import SensorCard from "@/components/SensorCard";
import ActuatorCard from "@/components/ActuatorCard";
import { httpClient } from "@/lib/api";
import { socketClient } from "@/lib/socket";
import { ApiResponse, Actuator, DeviceDetail, Sensor } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";

export default function DeviceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { isAuthenticated } = useAuth();
  const [device, setDevice] = useState<DeviceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const [showSensorModal, setShowSensorModal] = useState(false);
  const [showActuatorModal, setShowActuatorModal] = useState(false);

  async function loadDevice() {
    setLoading(true);
    try {
      const res = await httpClient.get<ApiResponse<DeviceDetail>>(
        `/devices/${id}`
      );
      setDevice(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDevice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!isAuthenticated || !device) return;

    const onSensorData = (...args: unknown[]) => {
      const data = args[0] as Sensor;
      if (data.device_id !== device.id) return;
      setDevice((prev) =>
        prev
          ? {
              ...prev,
              sensors: prev.sensors.map((s) =>
                s.id === data.id ? { ...s, ...data } : s
              ),
            }
          : prev
      );
    };

    const onActuatorStatus = (...args: unknown[]) => {
      const data = args[0] as Actuator;
      if (data.device_id !== device.id) return;
      setDevice((prev) =>
        prev
          ? {
              ...prev,
              actuators: prev.actuators.map((a) =>
                a.id === data.id ? { ...a, ...data } : a
              ),
            }
          : prev
      );
    };

    const onDeviceStatus = (...args: unknown[]) => {
      const data = args[0] as {
        device_id: number;
        status: string;
        last_seen_at: string;
      };
      if (data.device_id !== device.id) return;
      setDevice((prev) =>
        prev
          ? { ...prev, status: data.status, last_seen_at: data.last_seen_at }
          : prev
      );
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

  async function handleToggle(
    actuatorId: number,
    state: "on" | "off",
    durationMinutes: number
  ) {
    const res = await httpClient.post<ApiResponse<Actuator>>(
      `/actuators/${actuatorId}/toggle`,
      { state, duration_minutes: durationMinutes }
    );
    setDevice((prev) =>
      prev
        ? {
            ...prev,
            actuators: prev.actuators.map((a) =>
              a.id === actuatorId ? { ...a, ...res.data } : a
            ),
          }
        : prev
    );
  }

  async function handleRegenerateKey() {
    if (!confirm("Regenerate the API key? The firmware will need to be reflashed with the new key.")) return;
    setRegenerating(true);
    try {
      const res = await httpClient.post<ApiResponse<{ api_key: string }>>(
        `/devices/${id}/regenerate-key`
      );
      setDevice((prev) => (prev ? { ...prev, api_key: res.data.api_key } : prev));
    } finally {
      setRegenerating(false);
    }
  }

  function copyApiKey() {
    if (!device) return;
    navigator.clipboard.writeText(device.api_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (loading) {
    return (
      <DashboardShell breadcrumb={[{ label: "Devices", href: "/devices" }, { label: "Device" }]}>
        <p className="text-sm text-slate-500">Loading...</p>
      </DashboardShell>
    );
  }

  if (!device) {
    return (
      <DashboardShell breadcrumb={[{ label: "Devices", href: "/devices" }, { label: "Device" }]}>
        <p className="text-sm text-slate-500">Device not found.</p>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      breadcrumb={[
        { label: device.farm_name || "Devices", href: device.farm_name ? "/farms" : "/devices" },
        { label: device.name },
      ]}
    >
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-800">
                  {device.name}
                </h2>
                {device.status === "online" ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <Wifi className="w-3.5 h-3.5" /> Online
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    <WifiOff className="w-3.5 h-3.5" /> Offline
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-1">
                {device.farm_name || "Unassigned"} · {device.device_type}
                {device.firmware_version ? ` · v${device.firmware_version}` : ""}
              </p>
              {device.ip_address && (
                <p className="text-xs text-slate-400 mt-1">
                  IP {device.ip_address} · Last seen{" "}
                  {device.last_seen_at
                    ? new Date(device.last_seen_at).toLocaleString()
                    : "never"}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-500 mb-1">
              ORG_ID / API_KEY (for firmware config.h)
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs bg-slate-100 rounded px-2 py-1">
                ORG_ID = {device.organization_id}
              </span>
              <span className="font-mono text-xs bg-slate-100 rounded px-2 py-1 break-all">
                API_KEY = {showApiKey ? device.api_key : "•".repeat(20)}
              </span>
              <button
                onClick={() => setShowApiKey((v) => !v)}
                className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                {showApiKey ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={copyApiKey}
                className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={handleRegenerateKey}
                disabled={regenerating}
                className="flex items-center gap-1.5 text-xs font-medium text-amber-700 border border-amber-200 bg-amber-50 hover:bg-amber-100 rounded-lg px-2 py-1.5 disabled:opacity-60"
              >
                {regenerating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                Regenerate
              </button>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-800">
              Actuators (motors / pumps / valves)
            </h3>
            <button
              onClick={() => setShowActuatorModal(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-primary-700 hover:underline"
            >
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
                <ActuatorCard
                  key={a.id}
                  actuator={a}
                  onToggle={(state, dur) => handleToggle(a.id, state, dur)}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-800">Sensors</h3>
            <button
              onClick={() => setShowSensorModal(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-primary-700 hover:underline"
            >
              <Plus className="w-4 h-4" /> Add sensor
            </button>
          </div>
          {device.sensors.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-500">
              No sensors registered for this device yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {device.sensors.map((s) => (
                <SensorCard key={s.id} sensor={s} />
              ))}
            </div>
          )}
        </div>

        {device.logs.length > 0 && (
          <div>
            <h3 className="font-semibold text-slate-800 mb-3">
              Recent activity
            </h3>
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {device.logs.map((l) => (
                <div key={l.id} className="px-4 py-2.5 text-sm flex items-center justify-between">
                  <span className="text-slate-700 capitalize">
                    Device went {l.event_type}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(l.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showSensorModal && (
        <AddSensorModal
          deviceId={device.id}
          farmId={device.farm_id}
          onClose={() => setShowSensorModal(false)}
          onCreated={(sensor) => {
            setDevice((prev) =>
              prev ? { ...prev, sensors: [...prev.sensors, sensor] } : prev
            );
            setShowSensorModal(false);
          }}
        />
      )}

      {showActuatorModal && (
        <AddActuatorModal
          deviceId={device.id}
          farmId={device.farm_id}
          relayCount={device.relay_count}
          existingChannels={device.actuators.map((a) => a.relay_channel)}
          onClose={() => setShowActuatorModal(false)}
          onCreated={(actuator) => {
            setDevice((prev) =>
              prev
                ? { ...prev, actuators: [...prev.actuators, actuator] }
                : prev
            );
            setShowActuatorModal(false);
          }}
        />
      )}
    </DashboardShell>
  );
}

function AddSensorModal({
  deviceId,
  farmId,
  onClose,
  onCreated,
}: {
  deviceId: number;
  farmId: number;
  onClose: () => void;
  onCreated: (sensor: Sensor) => void;
}) {
  const [name, setName] = useState("");
  const [sensorType, setSensorType] = useState("water_level");
  const [channel, setChannel] = useState("");
  const [unit, setUnit] = useState("");
  const [minThreshold, setMinThreshold] = useState("");
  const [maxThreshold, setMaxThreshold] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await httpClient.post<ApiResponse<Sensor>>("/sensors", {
        device_id: deviceId,
        farm_id: farmId || undefined,
        name,
        sensor_type: sensorType,
        channel,
        unit: unit || undefined,
        min_threshold: minThreshold ? Number(minThreshold) : undefined,
        max_threshold: maxThreshold ? Number(maxThreshold) : undefined,
      });
      onCreated(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add sensor");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Add sensor" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
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
            placeholder="Borewell water level"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Type
            </label>
            <select
              value={sensorType}
              onChange={(e) => setSensorType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
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
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Unit (optional)
            </label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="%, V, L/min"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Channel
          </label>
          <input
            type="text"
            required
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="water_level (must match firmware SENSORS[].channel)"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Min threshold (optional)
            </label>
            <input
              type="number"
              step="any"
              value={minThreshold}
              onChange={(e) => setMinThreshold(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Max threshold (optional)
            </label>
            <input
              type="number"
              step="any"
              value={maxThreshold}
              onChange={(e) => setMaxThreshold(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
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
          Add sensor
        </button>
      </form>
    </Modal>
  );
}

function AddActuatorModal({
  deviceId,
  farmId,
  relayCount,
  existingChannels,
  onClose,
  onCreated,
}: {
  deviceId: number;
  farmId: number;
  relayCount: number;
  existingChannels: number[];
  onClose: () => void;
  onCreated: (actuator: Actuator) => void;
}) {
  const availableChannels = Array.from({ length: relayCount }, (_, i) => i + 1).filter(
    (c) => !existingChannels.includes(c)
  );
  const [name, setName] = useState("");
  const [actuatorType, setActuatorType] = useState("motor");
  const [relayChannel, setRelayChannel] = useState(
    availableChannels[0]?.toString() || ""
  );
  const [maxRuntime, setMaxRuntime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await httpClient.post<ApiResponse<Actuator>>("/actuators", {
        device_id: deviceId,
        farm_id: farmId || undefined,
        name,
        actuator_type: actuatorType,
        relay_channel: Number(relayChannel),
        max_runtime_minutes: maxRuntime ? Number(maxRuntime) : undefined,
      });
      onCreated(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add actuator");
    } finally {
      setSubmitting(false);
    }
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
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Main field pump"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Type
              </label>
              <select
                value={actuatorType}
                onChange={(e) => setActuatorType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="motor">Motor</option>
                <option value="pump">Pump</option>
                <option value="valve">Valve</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Relay channel
              </label>
              <select
                value={relayChannel}
                onChange={(e) => setRelayChannel(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {availableChannels.map((c) => (
                  <option key={c} value={c}>
                    Relay {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Max runtime, minutes (optional safety cutoff)
            </label>
            <input
              type="number"
              min={0}
              value={maxRuntime}
              onChange={(e) => setMaxRuntime(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g. 120"
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
            Add actuator
          </button>
        </form>
      )}
    </Modal>
  );
}
