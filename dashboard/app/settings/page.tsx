"use client";

import { useEffect, useState } from "react";
import { Loader2, IndianRupee, Gauge, Save, Check } from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import { httpClient } from "@/lib/api";
import { ApiResponse, Actuator, Organization } from "@/lib/types";

type SpecField = "pipe_diameter_mm" | "flow_velocity_ms" | "flow_rate_lpm" | "power_rating_watts";

type SpecForm = Record<SpecField, string>;

function toForm(actuator: Actuator): SpecForm {
  return {
    pipe_diameter_mm: actuator.pipe_diameter_mm != null ? String(actuator.pipe_diameter_mm) : "",
    flow_velocity_ms: actuator.flow_velocity_ms != null ? String(actuator.flow_velocity_ms) : "",
    flow_rate_lpm: actuator.flow_rate_lpm != null ? String(actuator.flow_rate_lpm) : "",
    power_rating_watts: actuator.power_rating_watts != null ? String(actuator.power_rating_watts) : "",
  };
}

// Mirrors the backend formula: a rated flow rate wins, otherwise derive it from pipe area x velocity.
function effectiveFlowRateLpm(form: SpecForm): number | null {
  const flowRate = parseFloat(form.flow_rate_lpm);
  if (!isNaN(flowRate)) return flowRate;

  const pipe = parseFloat(form.pipe_diameter_mm);
  const velocity = parseFloat(form.flow_velocity_ms);
  if (!isNaN(pipe) && !isNaN(velocity)) {
    const radiusM = pipe / 2000;
    const areaM2 = Math.PI * radiusM * radiusM;
    return areaM2 * velocity * 60000;
  }
  return null;
}

export default function SettingsPage() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [rateInput, setRateInput] = useState("");
  const [savingRate, setSavingRate] = useState(false);
  const [rateSaved, setRateSaved] = useState(false);

  const [actuators, setActuators] = useState<Actuator[]>([]);
  const [forms, setForms] = useState<Record<number, SpecForm>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [orgRes, actuatorsRes] = await Promise.all([
          httpClient.get<ApiResponse<Organization>>("/organizations/me"),
          httpClient.get<ApiResponse<Actuator[]>>("/actuators"),
        ]);
        setOrganization(orgRes.data);
        setRateInput(String(orgRes.data.electricity_rate_per_kwh ?? 8));
        setActuators(actuatorsRes.data);
        const initialForms: Record<number, SpecForm> = {};
        for (const a of actuatorsRes.data) initialForms[a.id] = toForm(a);
        setForms(initialForms);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function saveRate() {
    setSavingRate(true);
    setRateSaved(false);
    try {
      const res = await httpClient.put<ApiResponse<Organization>>("/organizations/me", {
        electricity_rate_per_kwh: parseFloat(rateInput),
      });
      setOrganization(res.data);
      setRateSaved(true);
      setTimeout(() => setRateSaved(false), 2000);
    } finally {
      setSavingRate(false);
    }
  }

  function updateField(actuatorId: number, field: SpecField, value: string) {
    setForms((prev) => ({
      ...prev,
      [actuatorId]: { ...prev[actuatorId], [field]: value },
    }));
  }

  async function saveSpecs(actuator: Actuator) {
    const form = forms[actuator.id];
    setSavingId(actuator.id);
    setSavedId(null);
    try {
      const payload = {
        pipe_diameter_mm: form.pipe_diameter_mm === "" ? null : parseFloat(form.pipe_diameter_mm),
        flow_velocity_ms: form.flow_velocity_ms === "" ? null : parseFloat(form.flow_velocity_ms),
        flow_rate_lpm: form.flow_rate_lpm === "" ? null : parseFloat(form.flow_rate_lpm),
        power_rating_watts: form.power_rating_watts === "" ? null : parseFloat(form.power_rating_watts),
      };
      const res = await httpClient.put<ApiResponse<Actuator>>(`/actuators/${actuator.id}`, payload);
      setActuators((prev) => prev.map((a) => (a.id === actuator.id ? res.data : a)));
      setForms((prev) => ({ ...prev, [actuator.id]: toForm(res.data) }));
      setSavedId(actuator.id);
      setTimeout(() => setSavedId(null), 2000);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <DashboardShell breadcrumb={[{ label: "Settings" }]}>
      <div className="space-y-4 max-w-3xl">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <IndianRupee className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">Electricity tariff</p>
              <p className="text-xs text-slate-500">
                Used to estimate the cost of running your pumps in the Analytics page
              </p>
            </div>
          </div>
          {loading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : (
            <div className="flex items-end gap-3">
              <div className="flex-1 max-w-[200px]">
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Rate (₹ per kWh)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <button
                onClick={saveRate}
                disabled={savingRate}
                className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors disabled:opacity-60"
              >
                {savingRate ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : rateSaved ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center">
              <Gauge className="w-4 h-4 text-violet-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">Pump specifications</p>
              <p className="text-xs text-slate-500">
                Enter pipe size and flow velocity, or a rated flow rate from the pump nameplate, to
                estimate water usage. Add a power rating to estimate electricity usage.
              </p>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : actuators.length === 0 ? (
            <p className="text-sm text-slate-500">No pumps registered yet.</p>
          ) : (
            <div className="space-y-3">
              {actuators.map((actuator) => {
                const form = forms[actuator.id];
                if (!form) return null;
                const effectiveLpm = effectiveFlowRateLpm(form);
                return (
                  <div key={actuator.id} className="border border-slate-100 rounded-lg p-3">
                    <p className="text-sm font-medium text-slate-800 mb-2">
                      {actuator.name}
                      <span className="text-xs font-normal text-slate-400 ml-2 capitalize">
                        {actuator.actuator_type}
                      </span>
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Pipe diameter (mm)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="0.1"
                          value={form.pipe_diameter_mm}
                          onChange={(e) => updateField(actuator.id, "pipe_diameter_mm", e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Flow velocity (m/s)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={form.flow_velocity_ms}
                          onChange={(e) => updateField(actuator.id, "flow_velocity_ms", e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Rated flow rate (L/min)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="0.1"
                          value={form.flow_rate_lpm}
                          onChange={(e) => updateField(actuator.id, "flow_rate_lpm", e.target.value)}
                          placeholder="optional"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Power rating (W)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="1"
                          value={form.power_rating_watts}
                          onChange={(e) => updateField(actuator.id, "power_rating_watts", e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-xs text-slate-500">
                        Effective flow rate:{" "}
                        <span className="font-medium text-slate-700">
                          {effectiveLpm != null ? `${effectiveLpm.toFixed(1)} L/min` : "not configured"}
                        </span>
                      </p>
                      <button
                        onClick={() => saveSpecs(actuator)}
                        disabled={savingId === actuator.id}
                        className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium rounded-lg px-3 py-1.5 transition-colors disabled:opacity-60"
                      >
                        {savingId === actuator.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : savedId === actuator.id ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        Save
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
