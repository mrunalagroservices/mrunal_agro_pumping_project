"use client";

import { useEffect, useState } from "react";
import { Loader2, IndianRupee, Gauge, Save, Check, MapPin, Plus, Pencil, Trash2, Star, X } from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import { httpClient } from "@/lib/api";
import { ApiResponse, Actuator, Organization } from "@/lib/types";
import {
  SavedAddress, getSavedAddresses, upsertAddress, deleteAddress,
  setDefaultAddress, newId,
} from "@/lib/savedAddresses";

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

const BLANK_ADDR: Omit<SavedAddress, "id"> = {
  label: "", name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "", isDefault: false,
};

const STATES = [
  "Andhra Pradesh","Bihar","Chhattisgarh","Gujarat","Haryana","Himachal Pradesh",
  "Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Odisha","Punjab",
  "Rajasthan","Tamil Nadu","Telangana","Uttar Pradesh","Uttarakhand","West Bengal",
];

function AddressFormModal({ initial, onSave, onClose }: {
  initial: SavedAddress | null;
  onSave: (a: SavedAddress) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Omit<SavedAddress, "id">>(initial ?? BLANK_ADDR);
  const inp = "w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition";

  function set(k: keyof typeof BLANK_ADDR, v: string | boolean) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function submit() {
    onSave({ ...form, id: initial?.id ?? newId() } as SavedAddress);
  }

  const valid = form.label && form.name && form.phone.replace(/\D/g, "").length >= 7 && form.line1 && form.city && form.state && form.pincode.length === 6;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-slate-800">{initial ? "Edit Address" : "Add New Address"}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Label *</label>
            <div className="flex gap-2 flex-wrap mb-1">
              {["Home", "Farm", "Office", "Other"].map((l) => (
                <button key={l} type="button" onClick={() => set("label", l)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${form.label === l ? "bg-primary-600 text-white border-primary-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  {l}
                </button>
              ))}
            </div>
            <input className={inp} value={form.label} onChange={(e) => set("label", e.target.value)} placeholder="Custom label" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Full Name *</label>
              <input className={inp} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ramesh Patil" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Phone *</label>
              <input className={inp} type="tel" maxLength={15} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="9876543210" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Address Line 1 *</label>
            <input className={inp} value={form.line1} onChange={(e) => set("line1", e.target.value)} placeholder="House no., Street, Village" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Address Line 2</label>
            <input className={inp} value={form.line2} onChange={(e) => set("line2", e.target.value)} placeholder="Landmark (optional)" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">City *</label>
              <input className={inp} value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Pune" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Pincode *</label>
              <input className={inp} type="tel" maxLength={6} value={form.pincode} onChange={(e) => set("pincode", e.target.value)} placeholder="411001" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">State *</label>
            <select className={inp} value={form.state} onChange={(e) => set("state", e.target.value)}>
              <option value="">Select state</option>
              {STATES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => set("isDefault", e.target.checked)} className="accent-primary-600 w-4 h-4" />
            <span className="text-sm text-slate-600">Set as default address</span>
          </label>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={!valid} className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors">
            {initial ? "Save Changes" : "Add Address"}
          </button>
        </div>
      </div>
    </div>
  );
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

  // ── Saved Addresses ──────────────────────────────────────────────────────────
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [addrModal, setAddrModal] = useState<SavedAddress | null | "new">(null);

  useEffect(() => { setAddresses(getSavedAddresses()); }, []);

  function handleSaveAddress(addr: SavedAddress) {
    setAddresses(upsertAddress(addr));
    setAddrModal(null);
  }

  function handleDeleteAddress(id: string) {
    if (!confirm("Remove this address?")) return;
    setAddresses(deleteAddress(id));
  }

  function handleSetDefault(id: string) {
    setAddresses(setDefaultAddress(id));
  }

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
        {/* ── Saved Addresses ── */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-green-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">Saved Addresses</p>
                <p className="text-xs text-slate-500">Pre-fill delivery address at checkout</p>
              </div>
            </div>
            <button
              onClick={() => setAddrModal("new")}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Address
            </button>
          </div>

          {addresses.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-xl">
              <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No saved addresses yet</p>
              <button onClick={() => setAddrModal("new")} className="mt-2 text-xs text-primary-600 font-semibold hover:underline">
                + Add your first address
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.map((addr) => (
                <div key={addr.id} className={`flex items-start gap-3 border rounded-xl p-4 ${addr.isDefault ? "border-primary-200 bg-primary-50" : "border-slate-100"}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${addr.isDefault ? "bg-primary-100" : "bg-slate-100"}`}>
                    <MapPin className={`w-4 h-4 ${addr.isDefault ? "text-primary-600" : "text-slate-500"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${addr.isDefault ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                        {addr.label}
                      </span>
                      {addr.isDefault && <span className="flex items-center gap-1 text-[10px] font-semibold text-primary-600"><Star className="w-3 h-3 fill-primary-600" /> Default</span>}
                    </div>
                    <p className="text-sm font-semibold text-slate-800">{addr.name} · {addr.phone}</p>
                    <p className="text-xs text-slate-500 truncate">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}, {addr.state} – {addr.pincode}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!addr.isDefault && (
                      <button onClick={() => handleSetDefault(addr.id)} title="Set as default"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition-colors">
                        <Star className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => setAddrModal(addr)} className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteAddress(addr.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {addrModal && (
        <AddressFormModal
          initial={addrModal === "new" ? null : addrModal}
          onSave={handleSaveAddress}
          onClose={() => setAddrModal(null)}
        />
      )}
    </DashboardShell>
  );
}
