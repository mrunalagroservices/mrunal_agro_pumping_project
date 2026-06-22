"use client";

import { useState } from "react";
import { Power, Loader2 } from "lucide-react";
import { Actuator } from "@/lib/types";

export default function ActuatorCard({
  actuator,
  onToggle,
}: {
  actuator: Actuator;
  onToggle: (state: "on" | "off", durationMinutes: number) => Promise<void>;
}) {
  const [duration, setDuration] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isOn = actuator.current_state === "on";

  async function handleToggle() {
    setSubmitting(true);
    try {
      await onToggle(isOn ? "off" : "on", duration ? Number(duration) : 0);
      if (!isOn) setDuration("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className={`bg-white rounded-xl border p-5 ${
        isOn ? "border-primary-300 ring-1 ring-primary-100" : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-slate-800">{actuator.name}</h3>
          <p className="text-xs text-slate-500 capitalize">
            {actuator.actuator_type} · Relay {actuator.relay_channel}
          </p>
        </div>
        <span
          className={`text-xs font-semibold px-2 py-1 rounded-full ${
            isOn
              ? "bg-primary-100 text-primary-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {isOn ? "ON" : "OFF"}
        </span>
      </div>

      {!isOn && (
        <div className="mt-4">
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Run for (minutes, optional)
          </label>
          <input
            type="number"
            min={0}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder={
              actuator.max_runtime_minutes
                ? `Max ${actuator.max_runtime_minutes} min`
                : "0 = run until stopped"
            }
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
        </div>
      )}

      {isOn && actuator.last_turned_on_at && (
        <p className="text-xs text-slate-500 mt-4">
          Running since{" "}
          {new Date(actuator.last_turned_on_at).toLocaleTimeString()}
        </p>
      )}

      <button
        onClick={handleToggle}
        disabled={submitting}
        className={`mt-4 w-full flex items-center justify-center gap-2 font-medium text-sm rounded-lg px-4 py-2.5 transition-colors disabled:opacity-60 ${
          isOn
            ? "bg-red-50 text-red-600 hover:bg-red-100"
            : "bg-accent-600 text-white hover:bg-accent-700"
        }`}
      >
        {submitting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Power className="w-4 h-4" />
        )}
        {isOn ? "Turn off" : "Turn on"}
      </button>
    </div>
  );
}
