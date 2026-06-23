"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, AlertOctagon, Info, Check } from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import { httpClient } from "@/lib/api";
import { socketClient } from "@/lib/socket";
import { ApiResponse, Alert } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";

type Filter = "open" | "resolved" | "all";

const SEVERITY_ICON: Record<string, typeof AlertTriangle> = {
  critical: AlertOctagon,
  warning: AlertTriangle,
  info: Info,
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: "text-red-600 bg-red-50",
  warning: "text-amber-600 bg-amber-50",
  info: "text-sky-600 bg-sky-50",
};

export default function AlertsPage() {
  const { isAuthenticated } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<Filter>("open");
  const [loading, setLoading] = useState(true);
  const { t } = useLocale();

  const FILTER_LABELS: Record<Filter, string> = {
    open: t("alerts_filter_open"),
    resolved: t("alerts_filter_resolved"),
    all: t("alerts_filter_all"),
  };

  async function loadAlerts(f: Filter) {
    setLoading(true);
    try {
      const query = f === "all" ? "" : `?resolved=${f === "resolved"}`;
      const res = await httpClient.get<ApiResponse<Alert[]>>(
        `/alerts${query}`
      );
      setAlerts(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAlerts(filter);
  }, [filter]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const onAlert = (...args: unknown[]) => {
      const data = args[0] as Alert;
      if (filter === "resolved") return;
      setAlerts((prev) => [data, ...prev]);
    };
    socketClient.on("alert", onAlert);
    return () => socketClient.off("alert", onAlert);
  }, [isAuthenticated, filter]);

  async function handleResolve(id: number) {
    await httpClient.put<ApiResponse<Alert>>(`/alerts/${id}/resolve`);
    setAlerts((prev) =>
      filter === "all"
        ? prev.map((a) =>
            a.id === id ? { ...a, is_resolved: true, resolved_at: new Date().toISOString() } : a
          )
        : prev.filter((a) => a.id !== id)
    );
  }

  return (
    <DashboardShell breadcrumb={[{ label: t("nav_alerts") }]}>
      <div className="flex items-center gap-2 mb-4">
        {(["open", "resolved", "all"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-sm font-medium px-3 py-1.5 rounded-lg capitalize transition-colors ${
              filter === f
                ? "bg-accent-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">{t("common_loading")}</p>
      ) : alerts.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <p className="text-sm text-slate-500">
            {filter === "open" ? t("alerts_no_open") : t("alerts_no_alerts_found")}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => {
            const Icon = SEVERITY_ICON[a.severity] || AlertTriangle;
            const color = SEVERITY_COLOR[a.severity] || SEVERITY_COLOR.warning;
            return (
              <div
                key={a.id}
                className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800">{a.message}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {a.device_name && `${a.device_name} · `}
                    {a.alert_type} · {new Date(a.created_at).toLocaleString()}
                    {a.is_resolved && a.resolved_at
                      ? t("alerts_resolved_at", { date: new Date(a.resolved_at).toLocaleString() })
                      : ""}
                  </p>
                </div>
                {!a.is_resolved && (
                  <button
                    onClick={() => handleResolve(a.id)}
                    className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-lg px-2.5 py-1.5 shrink-0"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {t("alerts_resolve_btn")}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
