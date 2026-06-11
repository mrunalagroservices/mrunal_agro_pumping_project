"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Warehouse,
  Cpu,
  Power,
  Bell,
  Wifi,
  WifiOff,
  AlertTriangle,
} from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import StatCard from "@/components/StatCard";
import { httpClient } from "@/lib/api";
import { socketClient } from "@/lib/socket";
import { ApiResponse, Alert, Device, Farm, Actuator } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [actuators, setActuators] = useState<Actuator[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [farmsRes, devicesRes, actuatorsRes, alertsRes] =
        await Promise.all([
          httpClient.get<ApiResponse<Farm[]>>("/farms"),
          httpClient.get<ApiResponse<Device[]>>("/devices"),
          httpClient.get<ApiResponse<Actuator[]>>("/actuators"),
          httpClient.get<ApiResponse<Alert[]>>("/alerts?resolved=false"),
        ]);
      setFarms(farmsRes.data);
      setDevices(devicesRes.data);
      setActuators(actuatorsRes.data);
      setAlerts(alertsRes.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadData();
  }, [isAuthenticated, loadData]);

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
    const onActuatorStatus = (...args: unknown[]) => {
      const data = args[0] as Actuator;
      setActuators((prev) =>
        prev.map((a) => (a.id === data.id ? { ...a, ...data } : a))
      );
    };
    const onAlert = (...args: unknown[]) => {
      const data = args[0] as Alert;
      setAlerts((prev) => [data, ...prev]);
    };

    socketClient.on("device-status", onDeviceStatus);
    socketClient.on("actuator-status", onActuatorStatus);
    socketClient.on("alert", onAlert);

    return () => {
      socketClient.off("device-status", onDeviceStatus);
      socketClient.off("actuator-status", onActuatorStatus);
      socketClient.off("alert", onAlert);
    };
  }, [isAuthenticated]);

  const onlineDevices = devices.filter((d) => d.status === "online").length;
  const activeMotors = actuators.filter(
    (a) => a.current_state === "on"
  ).length;

  return (
    <DashboardShell breadcrumb={[]}>
      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Warehouse}
              label="Farms"
              value={farms.length}
              textColor="text-emerald-700"
              bgLight="bg-emerald-50"
            />
            <StatCard
              icon={Cpu}
              label="Devices online"
              value={`${onlineDevices} / ${devices.length}`}
              textColor="text-sky-700"
              bgLight="bg-sky-50"
            />
            <StatCard
              icon={Power}
              label="Active motors"
              value={activeMotors}
              textColor="text-primary-700"
              bgLight="bg-primary-50"
            />
            <StatCard
              icon={Bell}
              label="Open alerts"
              value={alerts.length}
              textColor="text-amber-700"
              bgLight="bg-amber-50"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                <h2 className="font-semibold text-slate-800">Devices</h2>
                <Link
                  href="/devices"
                  className="text-sm text-primary-700 font-medium hover:underline"
                >
                  View all
                </Link>
              </div>
              <div className="divide-y divide-slate-100">
                {devices.length === 0 && (
                  <p className="px-5 py-4 text-sm text-slate-500">
                    No devices yet.{" "}
                    <Link href="/devices" className="text-primary-700 underline">
                      Add one
                    </Link>
                  </p>
                )}
                {devices.slice(0, 6).map((d) => (
                  <Link
                    key={d.id}
                    href={`/devices/${d.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-slate-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {d.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {d.farm_name || "Unassigned"}
                      </p>
                    </div>
                    {d.status === "online" ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                        <Wifi className="w-4 h-4" /> Online
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-medium text-slate-400">
                        <WifiOff className="w-4 h-4" /> Offline
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                <h2 className="font-semibold text-slate-800">Open alerts</h2>
                <Link
                  href="/alerts"
                  className="text-sm text-primary-700 font-medium hover:underline"
                >
                  View all
                </Link>
              </div>
              <div className="divide-y divide-slate-100">
                {alerts.length === 0 && (
                  <p className="px-5 py-4 text-sm text-slate-500">
                    No open alerts. Everything looks good.
                  </p>
                )}
                {alerts.slice(0, 6).map((a) => (
                  <div key={a.id} className="flex items-start gap-3 px-5 py-3">
                    <AlertTriangle
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        a.severity === "critical"
                          ? "text-red-500"
                          : "text-amber-500"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm text-slate-800 truncate">
                        {a.message}
                      </p>
                      <p className="text-xs text-slate-500">
                        {a.device_name || "—"} ·{" "}
                        {new Date(a.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
