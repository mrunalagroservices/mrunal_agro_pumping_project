"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Plus, Trash2, Pencil, Play, Square, Zap, ZapOff,
  Droplets, Leaf, AreaChart, Check, X, ChevronDown, ChevronRight,
  FlaskConical, History, Settings2, Clock, AlertTriangle,
} from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import { httpClient } from "@/lib/api";
import {
  ApiResponse, Farm, Actuator, Zone, IrrigationPlan,
  IrrigationPlanStep, IrrigationRun, IrrigationRunLog,
} from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CROPS = ["Tomatoes", "Wheat", "Sugarcane", "Cotton", "Maize", "Grapes", "Onion", "Chili", "Other"];

function fmt(mins: number) {
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function elapsed(startedAt: string) {
  const secs = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

const inputCls = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition";
const labelCls = "block text-xs font-semibold text-slate-500 mb-1.5";

// ─── Zone Card ────────────────────────────────────────────────────────────────

function ZoneCard({
  zone, onEdit, onDelete, onValve,
}: {
  zone: Zone;
  onEdit: (z: Zone) => void;
  onDelete: (id: number) => void;
  onValve: (id: number, state: "on" | "off") => void;
}) {
  const valveOn = zone.valve_state === "on";
  return (
    <div className={`bg-white border-2 rounded-2xl p-4 transition-colors ${valveOn ? "border-emerald-400 bg-emerald-50/30" : "border-slate-200"}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-slate-800 text-base">{zone.name}</h3>
          {zone.crop_type && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-1">
              <Leaf className="w-3 h-3" /> {zone.crop_type}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <button onClick={() => onEdit(zone)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(zone.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {zone.area_sqm && (
        <p className="text-xs text-slate-500 mb-3 flex items-center gap-1">
          <AreaChart className="w-3 h-3" /> {zone.area_sqm} sqm
        </p>
      )}

      {/* Valve control */}
      <div className="border-t border-slate-100 pt-3">
        {zone.valve_actuator_id ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600">{zone.valve_name || "Solenoid Valve"}</p>
              <div className={`flex items-center gap-1 text-xs font-bold mt-0.5 ${valveOn ? "text-emerald-600" : "text-slate-400"}`}>
                <span className={`w-2 h-2 rounded-full ${valveOn ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
                {valveOn ? "OPEN — water flowing" : "CLOSED"}
              </div>
            </div>
            <button
              onClick={() => onValve(zone.id, valveOn ? "off" : "on")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                valveOn
                  ? "bg-red-100 text-red-700 hover:bg-red-200"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              }`}
            >
              {valveOn ? "Close Valve" : "Open Valve"}
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            No valve assigned — edit zone to link one
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Zone Modal ───────────────────────────────────────────────────────────────

function ZoneModal({
  zone, actuators, onSave, onClose,
}: {
  zone: Partial<Zone> | null;
  actuators: Actuator[];
  onSave: (data: Partial<Zone>) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<Zone>>(zone ?? {});
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try { await onSave(form); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
        <h3 className="font-bold text-lg text-slate-800 mb-5">{zone?.id ? "Edit Zone" : "Add Zone"}</h3>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className={labelCls}>Zone Name *</label>
            <input required className={inputCls} value={form.name ?? ""} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Zone A, North Field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Crop Type</label>
              <select className={inputCls} value={form.crop_type ?? ""} onChange={(e) => setForm((p) => ({ ...p, crop_type: e.target.value || null }))}>
                <option value="">Select crop…</option>
                {CROPS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Area (sqm)</label>
              <input type="number" min={0} className={inputCls} value={form.area_sqm ?? ""} onChange={(e) => setForm((p) => ({ ...p, area_sqm: e.target.value ? Number(e.target.value) : null }))} placeholder="500" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Solenoid Valve Actuator</label>
            <select className={inputCls} value={form.valve_actuator_id ?? ""} onChange={(e) => setForm((p) => ({ ...p, valve_actuator_id: e.target.value ? Number(e.target.value) : null }))}>
              <option value="">No valve assigned</option>
              {actuators.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.actuator_type})</option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1">Select the actuator that controls water flow to this zone</p>
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <input className={inputCls} value={form.description ?? ""} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value || null }))} placeholder="Optional notes" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-xl">
              {saving ? "Saving…" : "Save Zone"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Plan Builder Modal ───────────────────────────────────────────────────────

function PlanModal({
  plan, zones, actuators, onSave, onClose,
}: {
  plan: Partial<IrrigationPlan> | null;
  zones: Zone[];
  actuators: Actuator[];
  onSave: (data: { name: string; motor_actuator_id: number | null; steps: { zone_id: number | null; zone_name: string; duration_minutes: number }[] }) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(plan?.name ?? "");
  const [motorId, setMotorId] = useState<number | null>(plan?.motor_actuator_id ?? null);
  const [steps, setSteps] = useState<{ zone_id: number | null; zone_name: string; duration_minutes: number }[]>(
    plan?.steps?.map((s) => ({ zone_id: s.zone_id ?? null, zone_name: s.zone_name ?? "", duration_minutes: s.duration_minutes })) ?? [{ zone_id: null, zone_name: "", duration_minutes: 15 }]
  );
  const [saving, setSaving] = useState(false);

  const totalMins = steps.reduce((s, st) => s + st.duration_minutes, 0);

  function addStep() {
    setSteps((p) => [...p, { zone_id: null, zone_name: "", duration_minutes: 15 }]);
  }

  function removeStep(i: number) {
    setSteps((p) => p.filter((_, idx) => idx !== i));
  }

  function updateStep(i: number, field: string, value: unknown) {
    setSteps((p) => p.map((s, idx) => {
      if (idx !== i) return s;
      if (field === "zone_id") {
        const zone = zones.find((z) => z.id === Number(value));
        return { ...s, zone_id: value ? Number(value) : null, zone_name: zone?.name ?? "" };
      }
      return { ...s, [field]: value };
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!steps.length) return;
    setSaving(true);
    try { await onSave({ name, motor_actuator_id: motorId, steps }); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-lg text-slate-800 mb-5">{plan?.id ? "Edit Plan" : "Create Irrigation Plan"}</h3>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className={labelCls}>Plan Name *</label>
            <input required className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Morning Irrigation, Monsoon Plan" />
          </div>
          <div>
            <label className={labelCls}>Motor / Pump Actuator</label>
            <select className={inputCls} value={motorId ?? ""} onChange={(e) => setMotorId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">No motor (valve-only plan)</option>
              {actuators.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.actuator_type})</option>)}
            </select>
            <p className="text-xs text-slate-400 mt-1">Motor turns ON when plan starts and OFF when it ends</p>
          </div>

          {/* Steps */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelCls + " mb-0"}>Zone Steps (in order)</label>
              <span className="text-xs text-emerald-700 font-semibold">Total: {fmt(totalMins)}</span>
            </div>
            <div className="space-y-2">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2.5">
                  <span className="text-xs font-bold text-slate-400 w-5 shrink-0">{i + 1}</span>
                  <select
                    className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={step.zone_id ?? ""}
                    onChange={(e) => updateStep(i, "zone_id", e.target.value)}
                  >
                    <option value="">Select zone…</option>
                    {zones.map((z) => <option key={z.id} value={z.id}>{z.name}{z.crop_type ? ` (${z.crop_type})` : ""}</option>)}
                  </select>
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number" min={1} max={180}
                      className="w-16 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={step.duration_minutes}
                      onChange={(e) => updateStep(i, "duration_minutes", Math.max(1, Number(e.target.value)))}
                    />
                    <span className="text-xs text-slate-400">min</span>
                  </div>
                  {steps.length > 1 && (
                    <button type="button" onClick={() => removeStep(i)} className="text-red-400 hover:text-red-600 p-1 rounded">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addStep} className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 font-semibold hover:text-emerald-700">
              <Plus className="w-3.5 h-3.5" /> Add Zone Step
            </button>
          </div>

          {/* Preview timeline */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
            <p className="text-xs font-bold text-emerald-700 mb-2">Execution Order</p>
            <div className="flex flex-wrap gap-1.5 items-center">
              {motorId && <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full">Motor ON</span>}
              {steps.map((s, i) => (
                <span key={i} className="flex items-center gap-1 text-xs bg-white border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full">
                  {s.zone_name || `Zone ${i + 1}`} · {s.duration_minutes}min
                </span>
              ))}
              {motorId && <span className="text-xs bg-slate-600 text-white px-2 py-0.5 rounded-full">Motor OFF</span>}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving || !name.trim()} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-xl">
              {saving ? "Saving…" : "Save Plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Live Runner ──────────────────────────────────────────────────────────────

function LiveRunner({
  run, onStop, onDone,
}: {
  run: { run_id: number; is_simulation: boolean };
  onStop: () => void;
  onDone: () => void;
}) {
  const [status, setStatus] = useState<{ run: IrrigationRun; steps: IrrigationRunLog[] } | null>(null);
  const [stopping, setStopping] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await httpClient.get<ApiResponse<{ run: IrrigationRun; steps: IrrigationRunLog[] }>>(`/irrigation/runs/${run.run_id}`);
      setStatus(res.data);
      if (res.data.run.status !== "running") {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setTimeout(onDone, 1500);
      }
    } catch { /* ignore */ }
  }, [run.run_id, onDone]);

  useEffect(() => {
    poll();
    intervalRef.current = setInterval(poll, 2000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [poll]);

  async function stop() {
    setStopping(true);
    try {
      await httpClient.post(`/irrigation/runs/${run.run_id}/stop`, {});
      onStop();
    } catch { setStopping(false); }
  }

  const stepColors: Record<string, string> = {
    pending: "bg-slate-200",
    running: "bg-emerald-500",
    completed: "bg-emerald-700",
    aborted: "bg-red-400",
  };

  const r = status?.run;
  const steps = status?.steps ?? [];
  const progressPct = r ? Math.round((r.current_step / r.total_steps) * 100) : 0;

  return (
    <div className={`border-2 rounded-2xl p-5 ${run.is_simulation ? "border-violet-300 bg-violet-50/40" : "border-emerald-400 bg-emerald-50/40"}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${r?.status === "running" ? (run.is_simulation ? "bg-violet-500" : "bg-emerald-500") : "bg-slate-400"}`} />
          <span className="font-bold text-sm text-slate-800">
            {run.is_simulation ? "🧪 Simulating" : "▶ Running"}: {r?.plan_name ?? "…"}
          </span>
          {run.is_simulation && <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-semibold">3× speed</span>}
        </div>
        {r?.status === "running" && (
          <button onClick={stop} disabled={stopping} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded-xl transition-colors">
            <Square className="w-3.5 h-3.5" /> {stopping ? "Stopping…" : "Emergency Stop"}
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-slate-200 rounded-full mb-4 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-1000 ${run.is_simulation ? "bg-violet-500" : "bg-emerald-500"}`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step) => {
          const isActive = step.status === "running";
          return (
            <div key={step.step_order} className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${isActive ? "bg-white border border-emerald-200" : "bg-slate-50"}`}>
              <div className={`w-3 h-3 rounded-full shrink-0 ${stepColors[step.status] ?? "bg-slate-200"} ${isActive ? "animate-pulse" : ""}`} />
              <span className="font-semibold text-sm text-slate-700 flex-1">{step.zone_name || `Step ${step.step_order}`}</span>
              <span className="text-xs text-slate-500">{fmt(step.duration_minutes)}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${
                step.status === "completed" ? "bg-emerald-100 text-emerald-700"
                  : step.status === "running" ? "bg-emerald-600 text-white"
                  : step.status === "aborted" ? "bg-red-100 text-red-600"
                  : "bg-slate-100 text-slate-400"
              }`}>
                {step.status}
              </span>
            </div>
          );
        })}
      </div>

      {r && r.status !== "running" && (
        <div className={`mt-4 text-center text-sm font-bold ${r.status === "completed" ? "text-emerald-700" : "text-red-600"}`}>
          {r.status === "completed" ? "✓ Plan completed successfully" : "✗ Plan was stopped"}
        </div>
      )}
    </div>
  );
}

// ─── Plan Card ────────────────────────────────────────────────────────────────

function PlanCard({
  plan, onEdit, onDelete, onRun,
}: {
  plan: IrrigationPlan;
  onEdit: (p: IrrigationPlan) => void;
  onDelete: (id: number) => void;
  onRun: (id: number, mode: "real" | "simulation") => void;
}) {
  const totalMins = plan.steps.reduce((s, st) => s + st.duration_minutes, 0);

  return (
    <div className={`bg-white border-2 rounded-2xl p-4 transition-colors ${plan.is_active ? "border-slate-200" : "border-slate-100 opacity-60"}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-slate-800">{plan.name}</h3>
          {plan.motor_name && (
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" /> {plan.motor_name}
            </p>
          )}
        </div>
        <div className="flex gap-1">
          <button onClick={() => onEdit(plan)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(plan.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Steps preview */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {plan.steps.map((step, i) => (
          <span key={i} className="inline-flex items-center gap-1 text-xs bg-slate-50 border border-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
            <Droplets className="w-2.5 h-2.5 text-emerald-500" />
            {step.zone_name || `Zone ${i + 1}`} · {step.duration_minutes}min
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-xs text-slate-500 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Total {fmt(totalMins)}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => onRun(plan.id, "simulation")}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-violet-200 bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-bold rounded-xl transition-colors"
          >
            <FlaskConical className="w-3.5 h-3.5" /> Simulate
          </button>
          <button
            onClick={() => onRun(plan.id, "real")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors"
          >
            <Play className="w-3.5 h-3.5" /> Run Now
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "zones" | "plans" | "history";

export default function FarmDetailPage() {
  const params = useParams();
  const router = useRouter();
  const farmId = params.id as string;

  const [farm, setFarm] = useState<Farm | null>(null);
  const [actuators, setActuators] = useState<Actuator[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [plans, setPlans] = useState<IrrigationPlan[]>([]);
  const [history, setHistory] = useState<IrrigationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("zones");

  const [zoneModal, setZoneModal] = useState<Partial<Zone> | null | false>(false);
  const [planModal, setPlanModal] = useState<Partial<IrrigationPlan> | null | false>(false);
  const [activeRun, setActiveRun] = useState<{ run_id: number; is_simulation: boolean } | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const loadFarm = useCallback(async () => {
    try {
      const res = await httpClient.get<ApiResponse<Farm[]>>("/farms");
      const f = res.data.find((x) => String(x.id) === farmId);
      if (f) setFarm(f);
    } catch { /* ignore */ }
  }, [farmId]);

  const loadZones = useCallback(async () => {
    try {
      const res = await httpClient.get<ApiResponse<Zone[]>>(`/zones?farm_id=${farmId}`);
      setZones(res.data);
    } catch { /* ignore */ }
  }, [farmId]);

  const loadPlans = useCallback(async () => {
    try {
      const res = await httpClient.get<ApiResponse<IrrigationPlan[]>>(`/irrigation/plans?farm_id=${farmId}`);
      setPlans(res.data);
    } catch { /* ignore */ }
  }, [farmId]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await httpClient.get<ApiResponse<IrrigationRun[]>>(`/irrigation/runs?farm_id=${farmId}`);
      setHistory(res.data);
    } catch { /* ignore */ }
  }, [farmId]);

  const loadActuators = useCallback(async () => {
    try {
      const res = await httpClient.get<ApiResponse<Actuator[]>>(`/actuators?farm_id=${farmId}`);
      setActuators(res.data);
    } catch { /* ignore */ }
  }, [farmId]);

  useEffect(() => {
    Promise.all([loadFarm(), loadZones(), loadPlans(), loadActuators()])
      .finally(() => setLoading(false));
  }, [loadFarm, loadZones, loadPlans, loadActuators]);

  useEffect(() => {
    if (tab === "history") loadHistory();
  }, [tab, loadHistory]);

  // ── Zone actions ──
  async function saveZone(data: Partial<Zone>) {
    if (zoneModal && (zoneModal as Zone).id) {
      await httpClient.put<ApiResponse<Zone>>(`/zones/${(zoneModal as Zone).id}`, data);
    } else {
      await httpClient.post<ApiResponse<Zone>>("/zones", { ...data, farm_id: farmId });
    }
    await loadZones();
    setZoneModal(false);
  }

  async function deleteZone(id: number) {
    if (!confirm("Delete this zone?")) return;
    await httpClient.delete<ApiResponse<unknown>>(`/zones/${id}`);
    await loadZones();
  }

  async function controlValve(zoneId: number, state: "on" | "off") {
    await httpClient.post<ApiResponse<unknown>>(`/zones/${zoneId}/valve`, { state });
    await loadZones();
  }

  // ── Plan actions ──
  type PlanFormData = { name: string; motor_actuator_id: number | null; steps: { zone_id: number | null; zone_name: string; duration_minutes: number }[] };
  async function savePlan(data: PlanFormData) {
    if (planModal && (planModal as IrrigationPlan).id) {
      await httpClient.put<ApiResponse<IrrigationPlan>>(`/irrigation/plans/${(planModal as IrrigationPlan).id}`, data);
    } else {
      await httpClient.post<ApiResponse<IrrigationPlan>>("/irrigation/plans", { ...data, farm_id: farmId });
    }
    await loadPlans();
    setPlanModal(false);
  }

  async function deletePlan(id: number) {
    if (!confirm("Delete this irrigation plan?")) return;
    await httpClient.delete<ApiResponse<unknown>>(`/irrigation/plans/${id}`);
    await loadPlans();
  }

  async function runPlan(planId: number, mode: "real" | "simulation") {
    setRunError(null);
    try {
      const res = await httpClient.post<ApiResponse<{ run_id: number; is_simulation: boolean }>>(`/irrigation/plans/${planId}/run`, { mode });
      setActiveRun(res.data);
    } catch (err: unknown) {
      setRunError((err as Error).message ?? "Failed to start plan");
    }
  }

  if (loading) {
    return (
      <DashboardShell breadcrumb={[{ label: "Farms", href: "/farms" }, { label: "Farm" }]}>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell breadcrumb={[{ label: "Farms", href: "/farms" }, { label: farm?.name ?? "Farm" }]}>
      {/* Back */}
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Farms
      </button>

      {/* Farm header */}
      <div className="bg-white border border-slate-200 rounded-2xl px-6 py-4 mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-800">{farm?.name}</h2>
          {farm?.location && <p className="text-sm text-slate-500">{farm.location}</p>}
        </div>
        <div className="flex gap-4 text-center">
          <div><p className="text-xl font-black text-emerald-700">{zones.length}</p><p className="text-xs text-slate-500">Zones</p></div>
          <div><p className="text-xl font-black text-emerald-700">{plans.length}</p><p className="text-xs text-slate-500">Plans</p></div>
          <div><p className="text-xl font-black text-emerald-700">{actuators.length}</p><p className="text-xs text-slate-500">Actuators</p></div>
        </div>
      </div>

      {/* Live runner */}
      {activeRun && (
        <div className="mb-5">
          <LiveRunner
            run={activeRun}
            onStop={() => { setActiveRun(null); loadPlans(); }}
            onDone={() => { setActiveRun(null); loadHistory(); loadPlans(); }}
          />
        </div>
      )}
      {runError && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {runError}
          <button onClick={() => setRunError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-5 w-fit">
        {([["zones", "Zones", Droplets], ["plans", "Irrigation Plans", Settings2], ["history", "Run History", History]] as const).map(([t, label, Icon]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === t ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* ── Zones Tab ── */}
      {tab === "zones" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-500">{zones.length} zone{zones.length !== 1 ? "s" : ""} — each zone has one solenoid valve</p>
            <button
              onClick={() => setZoneModal({})}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Zone
            </button>
          </div>
          {zones.length === 0 ? (
            <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-2xl">
              <Droplets className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-slate-400 font-medium">No zones yet</p>
              <p className="text-sm text-slate-400 mt-1">Add zones to represent areas of your farm</p>
              <button onClick={() => setZoneModal({})} className="mt-4 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700">
                Add First Zone
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {zones.map((z) => (
                <ZoneCard key={z.id} zone={z} onEdit={(z) => setZoneModal(z)} onDelete={deleteZone} onValve={controlValve} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Plans Tab ── */}
      {tab === "plans" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-500">{plans.length} irrigation plan{plans.length !== 1 ? "s" : ""}</p>
            <button
              onClick={() => setPlanModal({})}
              disabled={zones.length === 0}
              title={zones.length === 0 ? "Add zones first" : ""}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" /> Create Plan
            </button>
          </div>
          {zones.length === 0 && (
            <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Add zones first before creating irrigation plans
            </div>
          )}
          {plans.length === 0 ? (
            <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-2xl">
              <Settings2 className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-slate-400 font-medium">No irrigation plans yet</p>
              <p className="text-sm text-slate-400 mt-1">Create a plan to define zone watering sequences</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {plans.map((p) => (
                <PlanCard key={p.id} plan={p} onEdit={(p) => setPlanModal(p)} onDelete={deletePlan} onRun={runPlan} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── History Tab ── */}
      {tab === "history" && (
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-2xl">
              <History className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-slate-400 font-medium">No runs yet</p>
            </div>
          ) : (
            history.map((run) => (
              <RunHistoryCard key={run.id} run={run} />
            ))
          )}
        </div>
      )}

      {/* ── Modals ── */}
      {zoneModal !== false && (
        <ZoneModal
          zone={zoneModal}
          actuators={actuators}
          onSave={saveZone}
          onClose={() => setZoneModal(false)}
        />
      )}
      {planModal !== false && (
        <PlanModal
          plan={planModal}
          zones={zones}
          actuators={actuators}
          onSave={savePlan}
          onClose={() => setPlanModal(false)}
        />
      )}
    </DashboardShell>
  );
}

// ─── Run History Card ─────────────────────────────────────────────────────────

function RunHistoryCard({ run }: { run: IrrigationRun }) {
  const [open, setOpen] = useState(false);
  const statusColor: Record<string, string> = {
    completed: "bg-emerald-100 text-emerald-700",
    aborted: "bg-red-100 text-red-600",
    running: "bg-amber-100 text-amber-700",
  };
  const steps: IrrigationRunLog[] = Array.isArray(run.steps) ? run.steps : [];
  const totalMins = steps.reduce((s, st) => s + st.duration_minutes, 0);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left" onClick={() => setOpen((v) => !v)}>
        {open ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize shrink-0 ${statusColor[run.status] ?? "bg-slate-100 text-slate-600"}`}>
          {run.status}
        </span>
        {run.is_simulation && <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-semibold shrink-0">simulation</span>}
        <span className="font-semibold text-sm text-slate-700 flex-1">{run.plan_name ?? "Manual Run"}</span>
        <span className="text-xs text-slate-400 shrink-0">{new Date(run.started_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</span>
        <span className="text-xs text-slate-400 shrink-0 ml-2">{run.total_steps} step{run.total_steps !== 1 ? "s" : ""} · {fmt(totalMins)}</span>
      </button>
      {open && steps.length > 0 && (
        <div className="border-t border-slate-100 px-4 py-3 space-y-1.5">
          {steps.map((s) => (
            <div key={s.step_order} className="flex items-center gap-3 text-sm">
              <span className={`w-2 h-2 rounded-full shrink-0 ${s.status === "completed" ? "bg-emerald-500" : s.status === "aborted" ? "bg-red-400" : "bg-slate-300"}`} />
              <span className="text-slate-700 flex-1">{s.zone_name || `Step ${s.step_order}`}</span>
              <span className="text-slate-400 text-xs">{fmt(s.duration_minutes)}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${s.status === "completed" ? "bg-emerald-50 text-emerald-700" : s.status === "aborted" ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-500"}`}>
                {s.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
