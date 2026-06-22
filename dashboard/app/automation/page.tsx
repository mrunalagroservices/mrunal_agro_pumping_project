"use client";

import { useEffect, useState, FormEvent } from "react";
import { Plus, Zap, CalendarClock, Trash2, Loader2 } from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import Modal from "@/components/Modal";
import { httpClient } from "@/lib/api";
import { ApiResponse, AutomationRule, Schedule, Sensor, Actuator } from "@/lib/types";
import { useToast } from "@/contexts/ToastContext";

const CONDITION_LABELS: Record<string, string> = {
  "<": "is below",
  ">": "is above",
  "<=": "is at or below",
  ">=": "is at or above",
  "==": "equals",
};
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Tab = "rules" | "schedules";

export default function AutomationPage() {
  const [tab, setTab] = useState<Tab>("rules");
  const toast = useToast();

  // ── shared data ─────────────────────────────────────────────────────────────
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [actuators, setActuators] = useState<Actuator[]>([]);
  const [loading, setLoading] = useState(true);

  // ── automation rules ────────────────────────────────────────────────────────
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [ruleSubmitting, setRuleSubmitting] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [triggerSensorId, setTriggerSensorId] = useState("");
  const [triggerCondition, setTriggerCondition] = useState("<");
  const [triggerValue, setTriggerValue] = useState("");
  const [actionActuatorId, setActionActuatorId] = useState("");
  const [actionState, setActionState] = useState("on");
  const [actionDuration, setActionDuration] = useState("");

  // ── schedules ───────────────────────────────────────────────────────────────
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [showSchedModal, setShowSchedModal] = useState(false);
  const [schedSubmitting, setSchedSubmitting] = useState(false);
  const [schedName, setSchedName] = useState("");
  const [schedActuatorId, setSchedActuatorId] = useState("");
  const [startTime, setStartTime] = useState("06:00");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  async function loadAll() {
    setLoading(true);
    try {
      const [rulesRes, schedulesRes, sensorsRes, actuatorsRes] = await Promise.all([
        httpClient.get<ApiResponse<AutomationRule[]>>("/automation-rules"),
        httpClient.get<ApiResponse<Schedule[]>>("/schedules"),
        httpClient.get<ApiResponse<Sensor[]>>("/sensors"),
        httpClient.get<ApiResponse<Actuator[]>>("/actuators"),
      ]);
      setRules(rulesRes.data);
      setSchedules(schedulesRes.data);
      setSensors(sensorsRes.data);
      setActuators(actuatorsRes.data);
      if (sensorsRes.data.length && !triggerSensorId)
        setTriggerSensorId(String(sensorsRes.data[0].id));
      if (actuatorsRes.data.length) {
        if (!actionActuatorId) setActionActuatorId(String(actuatorsRes.data[0].id));
        if (!schedActuatorId) setSchedActuatorId(String(actuatorsRes.data[0].id));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── rule handlers ────────────────────────────────────────────────────────────
  function resetRuleForm() {
    setRuleName(""); setTriggerCondition("<"); setTriggerValue("");
    setActionState("on"); setActionDuration("");
  }

  async function handleCreateRule(e: FormEvent) {
    e.preventDefault(); setRuleSubmitting(true);
    try {
      await httpClient.post<ApiResponse<AutomationRule>>("/automation-rules", {
        name: ruleName,
        trigger_sensor_id: Number(triggerSensorId),
        trigger_condition: triggerCondition,
        trigger_value: Number(triggerValue),
        action_actuator_id: Number(actionActuatorId),
        action_state: actionState,
        action_duration_minutes: actionDuration ? Number(actionDuration) : 0,
      });
      setShowRuleModal(false); resetRuleForm(); loadAll();
      toast.success("Rule created", `"${ruleName}" will trigger automatically.`);
    } catch (err) {
      toast.error("Failed to create rule", err instanceof Error ? err.message : undefined);
    } finally { setRuleSubmitting(false); }
  }

  async function toggleRule(rule: AutomationRule) {
    try {
      await httpClient.put<ApiResponse<AutomationRule>>(`/automation-rules/${rule.id}`, { is_active: !rule.is_active });
      setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, is_active: !rule.is_active } : r));
      toast.info(rule.is_active ? "Rule paused" : "Rule activated");
    } catch (err) {
      toast.error("Failed to update rule", err instanceof Error ? err.message : undefined);
    }
  }

  async function deleteRule(id: number) {
    if (!confirm("Delete this automation rule?")) return;
    try {
      await httpClient.delete<ApiResponse<null>>(`/automation-rules/${id}`);
      loadAll();
      toast.success("Rule deleted");
    } catch (err) {
      toast.error("Failed to delete rule", err instanceof Error ? err.message : undefined);
    }
  }

  // ── schedule handlers ────────────────────────────────────────────────────────
  function resetSchedForm() {
    setSchedName(""); setStartTime("06:00"); setDurationMinutes("");
    setDaysOfWeek([0, 1, 2, 3, 4, 5, 6]);
  }

  function toggleDay(day: number) {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  async function handleCreateSchedule(e: FormEvent) {
    e.preventDefault();
    if (daysOfWeek.length === 0) { toast.warning("Select at least one day", "Choose which days this schedule runs."); return; }
    setSchedSubmitting(true);
    try {
      await httpClient.post<ApiResponse<Schedule>>("/schedules", {
        actuator_id: Number(schedActuatorId),
        name: schedName,
        days_of_week: daysOfWeek,
        start_time: startTime,
        duration_minutes: Number(durationMinutes),
      });
      setShowSchedModal(false); resetSchedForm(); loadAll();
      toast.success("Schedule created", `"${schedName}" is now active.`);
    } catch (err) {
      toast.error("Failed to create schedule", err instanceof Error ? err.message : undefined);
    } finally { setSchedSubmitting(false); }
  }

  async function toggleSchedule(s: Schedule) {
    try {
      await httpClient.put<ApiResponse<Schedule>>(`/schedules/${s.id}`, { is_active: !s.is_active });
      setSchedules((prev) => prev.map((x) => x.id === s.id ? { ...x, is_active: !s.is_active } : x));
      toast.info(s.is_active ? "Schedule paused" : "Schedule activated");
    } catch (err) {
      toast.error("Failed to update schedule", err instanceof Error ? err.message : undefined);
    }
  }

  async function deleteSchedule(id: number) {
    if (!confirm("Delete this schedule?")) return;
    try {
      await httpClient.delete<ApiResponse<null>>(`/schedules/${id}`);
      loadAll();
      toast.success("Schedule deleted");
    } catch (err) {
      toast.error("Failed to delete schedule", err instanceof Error ? err.message : undefined);
    }
  }

  // ── shared input class ───────────────────────────────────────────────────────
  const inp = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500";

  return (
    <DashboardShell breadcrumb={[{ label: "Automation & Schedules" }]}>
      {/* ── Tab bar + Add button ── */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setTab("rules")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === "rules" ? "bg-white text-amber-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Zap className="w-4 h-4" />
            Automation Rules
            {rules.length > 0 && (
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
                {rules.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("schedules")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === "schedules" ? "bg-white text-accent-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <CalendarClock className="w-4 h-4" />
            Schedules
            {schedules.length > 0 && (
              <span className="bg-accent-100 text-accent-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
                {schedules.length}
              </span>
            )}
          </button>
        </div>

        {tab === "rules" ? (
          <button
            onClick={() => setShowRuleModal(true)}
            disabled={sensors.length === 0 || actuators.length === 0}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Add rule
          </button>
        ) : (
          <button
            onClick={() => setShowSchedModal(true)}
            disabled={actuators.length === 0}
            className="flex items-center gap-2 bg-accent-600 hover:bg-accent-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Add schedule
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <>
          {/* ── Automation Rules tab ── */}
          {tab === "rules" && (
            <>
              {(sensors.length === 0 || actuators.length === 0) && (
                <div className="bg-amber-50 border border-amber-100 text-amber-700 text-sm rounded-lg px-4 py-3 mb-4">
                  You need at least one sensor and one actuator before creating automation rules.
                </div>
              )}
              {rules.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                  <Zap className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No automation rules yet.</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Rules trigger an actuator when a sensor crosses a threshold.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rules.map((rule) => (
                    <div key={rule.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                          <Zap className="w-4 h-4 text-amber-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{rule.name}</p>
                          <p className="text-sm text-slate-500 truncate">
                            When{" "}
                            <span className="font-medium text-slate-700">{rule.trigger_sensor_name}</span>{" "}
                            {CONDITION_LABELS[rule.trigger_condition] ?? rule.trigger_condition}{" "}
                            <span className="font-medium text-slate-700">{rule.trigger_value}</span>
                            , turn{" "}
                            <span className="font-medium text-slate-700">{rule.action_actuator_name}</span>{" "}
                            <span className="font-medium text-slate-700">{rule.action_state}</span>
                            {rule.action_state === "on" && rule.action_duration_minutes
                              ? ` for ${rule.action_duration_minutes} min`
                              : ""}
                          </p>
                          {rule.trigger_count > 0 && (
                            <p className="text-xs text-slate-400 mt-1">
                              Triggered {rule.trigger_count} time(s)
                              {rule.last_triggered_at
                                ? ` · last ${new Date(rule.last_triggered_at).toLocaleString()}`
                                : ""}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => toggleRule(rule)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
                            rule.is_active
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {rule.is_active ? "Active" : "Paused"}
                        </button>
                        <button onClick={() => deleteRule(rule.id)} className="text-slate-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Schedules tab ── */}
          {tab === "schedules" && (
            <>
              {actuators.length === 0 && (
                <div className="bg-amber-50 border border-amber-100 text-amber-700 text-sm rounded-lg px-4 py-3 mb-4">
                  You need at least one actuator registered before creating schedules.
                </div>
              )}
              {schedules.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                  <CalendarClock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No schedules yet.</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Schedules run motors at fixed times on selected days.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {schedules.map((s) => (
                    <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-accent-50 flex items-center justify-center shrink-0">
                          <CalendarClock className="w-4 h-4 text-accent-700" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                          <p className="text-sm text-slate-500">
                            <span className="font-medium text-slate-700">{s.actuator_name}</span>{" "}
                            at {s.start_time?.slice(0, 5)} for {s.duration_minutes} min
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {DAY_LABELS.map((label, i) => (
                              <span
                                key={i}
                                className={`inline-block mr-1 ${
                                  s.days_of_week.includes(i) ? "text-slate-600 font-medium" : "text-slate-300"
                                }`}
                              >
                                {label}
                              </span>
                            ))}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => toggleSchedule(s)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
                            s.is_active ? "bg-accent-100 text-accent-700" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {s.is_active ? "Active" : "Paused"}
                        </button>
                        <button onClick={() => deleteSchedule(s.id)} className="text-slate-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Add Rule modal ── */}
      {showRuleModal && (
        <Modal title="Add automation rule" onClose={() => { setShowRuleModal(false); resetRuleForm(); }}>
          <form onSubmit={handleCreateRule} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input type="text" required value={ruleName} onChange={(e) => setRuleName(e.target.value)}
                className={inp} placeholder="Auto-start pump on low water level" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">When sensor</label>
                <select value={triggerSensorId} onChange={(e) => setTriggerSensorId(e.target.value)} className={inp}>
                  {sensors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Condition</label>
                <select value={triggerCondition} onChange={(e) => setTriggerCondition(e.target.value)} className={inp}>
                  <option value="<">is below (&lt;)</option>
                  <option value="<=">is at or below (&lt;=)</option>
                  <option value=">">is above (&gt;)</option>
                  <option value=">=">is at or above (&gt;=)</option>
                  <option value="==">equals (==)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Threshold value</label>
              <input type="number" step="any" required value={triggerValue}
                onChange={(e) => setTriggerValue(e.target.value)} className={inp} placeholder="e.g. 20" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Then turn</label>
                <select value={actionActuatorId} onChange={(e) => setActionActuatorId(e.target.value)} className={inp}>
                  {actuators.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                <select value={actionState} onChange={(e) => setActionState(e.target.value)} className={inp}>
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
                <input type="number" min={0} value={actionDuration}
                  onChange={(e) => setActionDuration(e.target.value)} className={inp} placeholder="0" />
              </div>
            )}
            <button type="submit" disabled={ruleSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm rounded-lg px-4 py-2.5 transition-colors disabled:opacity-60">
              {ruleSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Add rule
            </button>
          </form>
        </Modal>
      )}

      {/* ── Add Schedule modal ── */}
      {showSchedModal && (
        <Modal title="Add schedule" onClose={() => { setShowSchedModal(false); resetSchedForm(); }}>
          <form onSubmit={handleCreateSchedule} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input type="text" required value={schedName} onChange={(e) => setSchedName(e.target.value)}
                className={inp} placeholder="Morning irrigation" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Actuator</label>
              <select value={schedActuatorId} onChange={(e) => setSchedActuatorId(e.target.value)} className={inp}>
                {actuators.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Start time</label>
                <input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inp} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Duration (minutes)</label>
                <input type="number" min={1} required value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)} className={inp} placeholder="30" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Repeat on</label>
              <div className="flex gap-1.5">
                {DAY_LABELS.map((label, i) => (
                  <button type="button" key={i} onClick={() => toggleDay(i)}
                    className={`flex-1 text-xs font-medium rounded-lg py-2 transition-colors ${
                      daysOfWeek.includes(i) ? "bg-accent-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" disabled={schedSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-accent-600 hover:bg-accent-700 text-white font-medium text-sm rounded-lg px-4 py-2.5 transition-colors disabled:opacity-60">
              {schedSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Add schedule
            </button>
          </form>
        </Modal>
      )}
    </DashboardShell>
  );
}
