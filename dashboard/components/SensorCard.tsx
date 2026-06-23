"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { ChevronDown, ChevronUp, Gauge } from "lucide-react";
import { httpClient } from "@/lib/api";
import { ApiResponse, Sensor, SensorReading } from "@/lib/types";
import { useLocale } from "@/contexts/LocaleContext";

export default function SensorCard({ sensor }: { sensor: Sensor }) {
  const { t } = useLocale();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [readings, setReadings] = useState<SensorReading[]>([]);

  async function toggleExpand() {
    const next = !expanded;
    setExpanded(next);
    if (next && readings.length === 0) {
      setLoading(true);
      try {
        const res = await httpClient.get<ApiResponse<SensorReading[]>>(
          `/sensors/${sensor.id}/readings?hours=24`
        );
        setReadings(res.data);
      } finally {
        setLoading(false);
      }
    }
  }

  const alertState = sensor.status as string | undefined;
  const value =
    sensor.current_value !== null && sensor.current_value !== undefined
      ? Number(sensor.current_value).toFixed(2)
      : "—";

  const chartData = readings.map((r) => ({
    time: new Date(r.recorded_at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    value: Number(r.value),
  }));

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={toggleExpand}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center">
            <Gauge className="w-4 h-4 text-sky-700" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-slate-800">
              {sensor.name}
            </p>
            <p className="text-xs text-slate-500">
              {sensor.sensor_type} · {sensor.channel}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-lg font-semibold text-slate-800">
              {value}
              {sensor.unit ? (
                <span className="text-sm font-normal text-slate-500 ml-1">
                  {sensor.unit}
                </span>
              ) : null}
            </p>
            {(sensor.min_threshold !== null && sensor.min_threshold !== undefined) ||
            (sensor.max_threshold !== null && sensor.max_threshold !== undefined) ? (
              <p
                className={`text-xs font-medium ${
                  alertState === "above" || alertState === "below"
                    ? "text-red-600"
                    : "text-slate-400"
                }`}
              >
                {sensor.min_threshold ?? "—"} - {sensor.max_threshold ?? "—"}
              </p>
            ) : null}
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-4 py-3">
          {loading ? (
            <p className="text-sm text-slate-500">{t("sc_loading_history")}</p>
          ) : chartData.length === 0 ? (
            <p className="text-sm text-slate-500">
              {t("sc_no_readings")}
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={`grad-${sensor.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fontSize: 10 }} minTickGap={30} />
                <YAxis tick={{ fontSize: 10 }} width={36} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#0ea5e9"
                  fill={`url(#grad-${sensor.id})`}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
}
