"use client";

import { useEffect, useState, FormEvent } from "react";
import { Plus, CalendarClock, Trash2, Loader2 } from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import Modal from "@/components/Modal";
import { httpClient } from "@/lib/api";
import { ApiResponse, Schedule, Actuator } from "@/lib/types";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [actuators, setActuators] = useState<Actuator[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [actuatorId, setActuatorId] = useState("");
  const [startTime, setStartTime] = useState("06:00");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  async function loadData() {
    setLoading(true);
    try {
      const [schedulesRes, actuatorsRes] = await Promise.all([
        httpClient.get<ApiResponse<Schedule[]>>("/schedules"),
        httpClient.get<ApiResponse<Actuator[]>>("/actuators"),
      ]);
      setSchedules(schedulesRes.data);
      setActuators(actuatorsRes.data);
      if (actuatorsRes.data.length && !actuatorId) {
        setActuatorId(String(actuatorsRes.data[0].id));
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
    setStartTime("06:00");
    setDurationMinutes("");
    setDaysOfWeek([0, 1, 2, 3, 4, 5, 6]);
    setError(null);
  }

  function toggleDay(day: number) {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (daysOfWeek.length === 0) {
      setError("Select at least one day");
      return;
    }
    setSubmitting(true);
    try {
      await httpClient.post<ApiResponse<Schedule>>("/schedules", {
        actuator_id: Number(actuatorId),
        name,
        days_of_week: daysOfWeek,
        start_time: startTime,
        duration_minutes: Number(durationMinutes),
      });
      setShowModal(false);
      resetForm();
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create schedule");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(schedule: Schedule) {
    await httpClient.put<ApiResponse<Schedule>>(`/schedules/${schedule.id}`, {
      is_active: !schedule.is_active,
    });
    setSchedules((prev) =>
      prev.map((s) =>
        s.id === schedule.id ? { ...s, is_active: !schedule.is_active } : s
      )
    );
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this schedule?")) return;
    await httpClient.delete<ApiResponse<null>>(`/schedules/${id}`);
    loadData();
  }

  return (
    <DashboardShell title="Schedules">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">
          Run motors and pumps automatically at fixed times
        </p>
        <button
          onClick={() => setShowModal(true)}
          disabled={actuators.length === 0}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Add schedule
        </button>
      </div>

      {!loading && actuators.length === 0 && (
        <div className="bg-amber-50 border border-amber-100 text-amber-700 text-sm rounded-lg px-4 py-3 mb-4">
          You need at least one actuator registered before you can create
          schedules.
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : schedules.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <p className="text-sm text-slate-500">No schedules yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                  <CalendarClock className="w-4 h-4 text-primary-700" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">
                    {s.name}
                  </p>
                  <p className="text-sm text-slate-500">
                    <span className="font-medium text-slate-700">
                      {s.actuator_name}
                    </span>{" "}
                    at {s.start_time?.slice(0, 5)} for {s.duration_minutes} min
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {DAY_LABELS.map((label, i) => (
                      <span
                        key={i}
                        className={`inline-block mr-1 ${
                          s.days_of_week.includes(i)
                            ? "text-slate-600 font-medium"
                            : "text-slate-300"
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
                  onClick={() => toggleActive(s)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    s.is_active
                      ? "bg-primary-100 text-primary-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {s.is_active ? "Active" : "Paused"}
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
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
        <Modal title="Add schedule" onClose={() => setShowModal(false)}>
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
                placeholder="Morning irrigation"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Actuator
              </label>
              <select
                value={actuatorId}
                onChange={(e) => setActuatorId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {actuators.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Start time
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="30"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Repeat on
              </label>
              <div className="flex gap-1.5">
                {DAY_LABELS.map((label, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => toggleDay(i)}
                    className={`flex-1 text-xs font-medium rounded-lg py-2 transition-colors ${
                      daysOfWeek.includes(i)
                        ? "bg-primary-600 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {label}
                  </button>
                ))}
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
              Add schedule
            </button>
          </form>
        </Modal>
      )}
    </DashboardShell>
  );
}
