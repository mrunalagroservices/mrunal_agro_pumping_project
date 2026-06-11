"use client";

import { useEffect, useState, FormEvent } from "react";
import { Plus, Zap, Trash2, Loader2 } from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import Modal from "@/components/Modal";
import { httpClient } from "@/lib/api";
import { ApiResponse, AutomationRule, Sensor, Actuator } from "@/lib/types";

const CONDITION_LABELS: Record<string, string> = {
  "<": "is below",
  ">": "is above",
  "<=": "is at or below",
  ">=": "is at or above",
  "==": "equals",
};

export default function AutomationPage() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [actuators, setActuators] = useState<Actuator[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [triggerSensorId, setTriggerSensorId] = useState("");
  const [triggerCondition, setTriggerCondition] = useState("<");
  const [triggerValue, setTriggerValue] = useState("");
  const [actionActuatorId, setActionActuatorId] = useState("");
  const [actionState, setActionState] = useState("on");
  const [actionDuration, setActionDuration] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const [rulesRes, sensorsRes, actuatorsRes] = await Promise.all([
        httpClient.get<ApiResponse<AutomationRule[]>>("/automation-rules"),
        httpClient.get<ApiResponse<Sensor[]>>("/sensors"),
        httpClient.get<ApiResponse<Actuator[]>>("/actuators"),
      ]);
      setRules(rulesRes.data);
      setSensors(sensorsRes.data);
      setActuators(actuatorsRes.data);
      if (sensorsRes.data.length && !triggerSensorId) {
        setTriggerSensorId(String(sensorsRes.data[0].id));
      }
      if (actuatorsRes.data.length && !actionActuatorId) {
        setActionActuatorId(String(actuatorsRes.data[0].id));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setName("");
    setTriggerCondition("<");
    setTriggerValue("");
    setActionState("on");
    setActionDuration("");
    setError(null);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await httpClient.post<ApiResponse<AutomationRule>>("/automation-rules", {
        name,
        trigger_sensor_id: Number(triggerSensorId),
        trigger_condition: triggerCondition,
        trigger_value: Number(triggerValue),
        action_actuator_id: Number(actionActuatorId),
        action_state: actionState,
        action_duration_minutes: actionDuration ? Number(actionDuration) : 0,
      });
      setShowModal(false);
      resetForm();
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create rule");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(rule: AutomationRule) {
    await httpClient.put<ApiResponse<AutomationRule>>(
      `/automation-rules/${rule.id}`,
      { is_active: !rule.is_active }
    );
    setRules((prev) =>
      prev.map((r) =>
        r.id === rule.id ? { ...r, is_active: !rule.is_active } : r
      )
    );
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this automation rule?")) return;
    await httpClient.delete<ApiResponse<null>>(`/automation-rules/${id}`);
    loadData();
  }

  return (
    <DashboardShell breadcrumb={[{ label: "Automation" }]}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">
          If a sensor reading crosses a threshold, automatically turn an
          actuator on or off
        </p>
        <button
          onClick={() => setShowModal(true)}
          disabled={sensors.length === 0 || actuators.length === 0}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Add rule
        </button>
      </div>

      {!loading && (sensors.length === 0 || actuators.length === 0) && (
        <div className="bg-amber-50 border border-amber-100 text-amber-700 text-sm rounded-lg px-4 py-3 mb-4">
          You need at least one sensor and one actuator registered before you
          can create automation rules.
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : rules.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <p className="text-sm text-slate-500">
            No automation rules yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-amber-700" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">
                    {rule.name}
                  </p>
                  <p className="text-sm text-slate-500 truncate">
                    When{" "}
                    <span className="font-medium text-slate-700">
                      {rule.trigger_sensor_name}
                    </span>{" "}
                    {CONDITION_LABELS[rule.trigger_condition] ||
                      rule.trigger_condition}{" "}
                    <span className="font-medium text-slate-700">
                      {rule.trigger_value}
                    </span>
                    , turn{" "}
                    <span className="font-medium text-slate-700">
                      {rule.action_actuator_name}
                    </span>{" "}
                    <span className="font-medium text-slate-700">
                      {rule.action_state}
                    </span>
                    {rule.action_state === "on" &&
                    rule.action_duration_minutes
                      ? ` for ${rule.action_duration_minutes} min`
                      : ""}
                  </p>
                  {rule.trigger_count > 0 && (
                    <p className="text-xs text-slate-400 mt-1">
                      Triggered {rule.trigger_count} time(s)
                      {rule.last_triggered_at
                        ? ` · last ${new Date(
                            rule.last_triggered_at
                          ).toLocaleString()}`
                        : ""}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleActive(rule)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    rule.is_active
                      ? "bg-primary-100 text-primary-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {rule.is_active ? "Active" : "Paused"}
                </button>
                <button
                  onClick={() => handleDelete(rule.id)}
                  className="text-slate-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title="Add automation rule" onClose={() => setShowModal(false)}>
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
                placeholder="Auto-start pump on low water level"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  When sensor
                </label>
                <select
                  value={triggerSensorId}
                  onChange={(e) => setTriggerSensorId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {sensors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Condition
                </label>
                <select
                  value={triggerCondition}
                  onChange={(e) => setTriggerCondition(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="<">is below (&lt;)</option>
                  <option value="<=">is at or below (&lt;=)</option>
                  <option value=">">is above (&gt;)</option>
                  <option value=">=">is at or above (&gt;=)</option>
                  <option value="==">equals (==)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Threshold value
              </label>
              <input
                type="number"
                step="any"
                required
                value={triggerValue}
                onChange={(e) => setTriggerValue(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g. 20"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Then turn
                </label>
                <select
                  value={actionActuatorId}
                  onChange={(e) => setActionActuatorId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {actuators.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  State
                </label>
                <select
                  value={actionState}
                  onChange={(e) => setActionState(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="on">On</option>
                  <option value="off">Off</option>
                </select>
              </div>
            </div>

            {actionState === "on" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Run for, minutes (0 = until manually stopped)
                </label>
                <input
                  type="number"
                  min={0}
                  value={actionDuration}
                  onChange={(e) => setActionDuration(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="0"
                />
              </div>
            )}

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
              Add rule
            </button>
          </form>
        </Modal>
      )}
    </DashboardShell>
  );
}
