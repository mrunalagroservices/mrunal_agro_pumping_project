"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  Clock,
  Droplets,
  Zap,
  IndianRupee,
  Activity,
  Settings as SettingsIcon,
} from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import StatCard from "@/components/StatCard";
import { httpClient } from "@/lib/api";
import {
  ApiResponse,
  Farm,
  AnalyticsOverview,
  AnalyticsDailyRuntime,
} from "@/lib/types";

type Range = "24h" | "10d";

function formatRuntime(minutes: number): string {
  const total = Math.round(minutes);
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

function formatNumber(n: number, decimals = 1): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

function formatHours(hours: number): string {
  return formatRuntime(hours * 60);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>("24h");
  const [farmId, setFarmId] = useState<string>("");
  const [farms, setFarms] = useState<Farm[]>([]);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [dailyRuntime, setDailyRuntime] = useState<AnalyticsDailyRuntime | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    httpClient
      .get<ApiResponse<Farm[]>>("/farms")
      .then((res) => setFarms(res.data))
      .catch(() => {});
  }, []);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ range });
      const dailyParams = new URLSearchParams({ days: "10" });
      if (farmId) {
        params.set("farm_id", farmId);
        dailyParams.set("farm_id", farmId);
      }
      const query = `?${params.toString()}`;
      const [overviewRes, dailyRes] = await Promise.all([
        httpClient.get<ApiResponse<AnalyticsOverview>>(`/analytics/overview${query}`),
        httpClient.get<ApiResponse<AnalyticsDailyRuntime>>(`/analytics/daily-runtime?${dailyParams.toString()}`),
      ]);
      setOverview(overviewRes.data);
      setDailyRuntime(dailyRes.data);
    } finally {
      setLoading(false);
    }
  }, [range, farmId]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const totals = overview?.totals;
  const totalActuators = overview?.actuators.length ?? 0;
  const noSpecsConfigured =
    !!overview && overview.actuators.length > 0 && overview.actuators.every((a) => !a.specs_configured);

  const chartData = (dailyRuntime?.days ?? []).map((d) => ({
    label: d.label,
    runtime_minutes: round2(d.total_hours * 60),
    water_liters: d.water_liters,
    electricity_kwh: d.electricity_kwh,
  }));

  return (
    <DashboardShell breadcrumb={[{ label: "Analytics" }]}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <p className="text-sm text-slate-500">
          Water usage, electricity consumption and runtime across your pumps
        </p>
        <div className="flex items-center gap-2">
          {farms.length > 0 && (
            <select
              value={farmId}
              onChange={(e) => setFarmId(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All farms</option>
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          )}
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setRange("24h")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                range === "24h"
                  ? "bg-white text-primary-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Last 24 Hours
            </button>
            <button
              onClick={() => setRange("10d")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                range === "10d"
                  ? "bg-white text-primary-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Last 10 Days
            </button>
          </div>
        </div>
      </div>

      {noSpecsConfigured && (
        <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-100 text-amber-700 text-sm rounded-lg px-4 py-3 mb-4">
          <span>
            Add pump specs (pipe diameter, flow rate, power rating) to see water &amp; electricity estimates.
          </span>
          <Link
            href="/settings"
            className="flex items-center gap-1 font-medium whitespace-nowrap hover:underline"
          >
            <SettingsIcon className="w-4 h-4" />
            Go to Settings
          </Link>
        </div>
      )}

      {loading && !overview ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
            <StatCard
              icon={Clock}
              label="Total Runtime"
              value={formatRuntime(totals?.runtime_minutes ?? 0)}
              textColor="text-violet-700"
              bgLight="bg-violet-50"
            />
            <StatCard
              icon={Droplets}
              label="Water Pumped"
              value={`${formatNumber(totals?.water_liters ?? 0)} L`}
              textColor="text-sky-700"
              bgLight="bg-sky-50"
            />
            <StatCard
              icon={Zap}
              label="Electricity Used"
              value={`${formatNumber(totals?.electricity_kwh ?? 0, 2)} kWh`}
              textColor="text-amber-700"
              bgLight="bg-amber-50"
            />
            <StatCard
              icon={IndianRupee}
              label="Estimated Cost"
              value={`₹${formatNumber(totals?.cost ?? 0, 2)}`}
              textColor="text-emerald-700"
              bgLight="bg-emerald-50"
            />
            <StatCard
              icon={Activity}
              label="Currently Running"
              value={`${totals?.currently_running ?? 0} / ${totalActuators}`}
              textColor="text-primary-700"
              bgLight="bg-primary-50"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-800 mb-3">Pump Runtime (min)</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, angle: -40, textAnchor: "end" }} interval={0} height={56} />
                  <YAxis tick={{ fontSize: 11 }} width={32} />
                  <Tooltip formatter={(value) => [`${formatNumber(Number(value))} min`, "Runtime"]} />
                  <Bar dataKey="runtime_minutes" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-800 mb-3">Water Pumped (L)</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, angle: -40, textAnchor: "end" }} interval={0} height={56} />
                  <YAxis tick={{ fontSize: 11 }} width={32} />
                  <Tooltip formatter={(value) => [`${formatNumber(Number(value))} L`, "Water"]} />
                  <Bar dataKey="water_liters" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-800 mb-3">Electricity Consumed (kWh)</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, angle: -40, textAnchor: "end" }} interval={0} height={56} />
                  <YAxis tick={{ fontSize: 11 }} width={32} />
                  <Tooltip formatter={(value) => [`${formatNumber(Number(value), 2)} kWh`, "Electricity"]} />
                  <Bar dataKey="electricity_kwh" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-medium text-slate-800">Per-pump breakdown</p>
            </div>
            {!overview || overview.actuators.length === 0 ? (
              <p className="text-sm text-slate-500 px-4 py-6 text-center">
                No pumps registered yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 uppercase tracking-wide border-b border-slate-100">
                      <th className="px-4 py-2 font-medium">Pump</th>
                      <th className="px-4 py-2 font-medium">Farm</th>
                      <th className="px-4 py-2 font-medium">Type</th>
                      <th className="px-4 py-2 font-medium text-right">Runtime</th>
                      <th className="px-4 py-2 font-medium text-right">Water (L)</th>
                      <th className="px-4 py-2 font-medium text-right">Electricity (kWh)</th>
                      <th className="px-4 py-2 font-medium text-right">Cost (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.actuators.map((a) => (
                      <tr key={a.id} className="border-b border-slate-50 last:border-0">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                a.current_state === "on" ? "bg-primary-500" : "bg-slate-300"
                              }`}
                            />
                            <span className="font-medium text-slate-800">{a.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-slate-500">{a.farm_name ?? "—"}</td>
                        <td className="px-4 py-2.5 text-slate-500 capitalize">{a.actuator_type}</td>
                        <td className="px-4 py-2.5 text-right text-slate-700">{formatRuntime(a.runtime_minutes)}</td>
                        <td className="px-4 py-2.5 text-right text-slate-700">
                          {a.specs_configured ? formatNumber(a.water_liters) : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-700">
                          {a.specs_configured ? formatNumber(a.electricity_kwh, 2) : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-700">
                          {a.specs_configured ? formatNumber(a.cost, 2) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mt-4">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-medium text-slate-800">Daily Motor Hours (Last 10 Days)</p>
              <p className="text-xs text-slate-500">How long each pump ran, and at what times</p>
            </div>
            {!dailyRuntime || dailyRuntime.days.every((d) => d.actuators.length === 0) ? (
              <p className="text-sm text-slate-500 px-4 py-6 text-center">
                No motor activity in the last 10 days.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 uppercase tracking-wide border-b border-slate-100">
                      <th className="px-4 py-2 font-medium">Date</th>
                      <th className="px-4 py-2 font-medium">Pump</th>
                      <th className="px-4 py-2 font-medium text-right">ON Hours</th>
                      <th className="px-4 py-2 font-medium">ON/OFF Sessions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyRuntime.days
                      .slice()
                      .reverse()
                      .flatMap((day) => {
                        if (day.actuators.length === 0) {
                          return (
                            <tr key={day.date} className="border-b border-slate-50 last:border-0">
                              <td className="px-4 py-2.5 text-slate-700">{day.label}</td>
                              <td className="px-4 py-2.5 text-slate-400" colSpan={3}>
                                No runtime
                              </td>
                            </tr>
                          );
                        }
                        return day.actuators.map((a, idx) => (
                          <tr key={`${day.date}-${a.id}`} className="border-b border-slate-50 last:border-0">
                            <td className="px-4 py-2.5 text-slate-700">
                              {idx === 0 ? day.label : ""}
                            </td>
                            <td className="px-4 py-2.5 font-medium text-slate-800">{a.name}</td>
                            <td className="px-4 py-2.5 text-right text-slate-700">{formatHours(a.hours)}</td>
                            <td className="px-4 py-2.5 text-slate-500">
                              {a.sessions.map((s) => `${s.start}–${s.end}`).join(", ")}
                            </td>
                          </tr>
                        ));
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </DashboardShell>
  );
}
