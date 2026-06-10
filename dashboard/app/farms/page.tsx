"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { Plus, MapPin, Cpu, Trash2, Loader2 } from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import Modal from "@/components/Modal";
import { httpClient } from "@/lib/api";
import { ApiResponse, Farm } from "@/lib/types";

export default function FarmsPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  async function loadFarms() {
    setLoading(true);
    try {
      const res = await httpClient.get<ApiResponse<Farm[]>>("/farms");
      setFarms(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFarms();
  }, []);

  function resetForm() {
    setName("");
    setLocation("");
    setLatitude("");
    setLongitude("");
    setError(null);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await httpClient.post<ApiResponse<Farm>>("/farms", {
        name,
        location: location || undefined,
        latitude: latitude ? Number(latitude) : undefined,
        longitude: longitude ? Number(longitude) : undefined,
      });
      setShowModal(false);
      resetForm();
      loadFarms();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create farm");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this farm? Devices assigned to it will be unassigned.")) return;
    await httpClient.delete<ApiResponse<null>>(`/farms/${id}`);
    loadFarms();
  }

  return (
    <DashboardShell title="Farms">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">
          Manage the farms in your organization
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add farm
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : farms.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <p className="text-sm text-slate-500">
            No farms yet. Add your first farm to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {farms.map((farm) => (
            <div
              key={farm.id}
              className="bg-white rounded-xl border border-slate-200 p-5"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-slate-800">{farm.name}</h3>
                <button
                  onClick={() => handleDelete(farm.id)}
                  className="text-slate-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {farm.location && (
                <p className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {farm.location}
                </p>
              )}
              <Link
                href={`/devices?farm_id=${farm.id}`}
                className="flex items-center gap-1.5 text-sm text-sky-700 mt-3 hover:underline"
              >
                <Cpu className="w-3.5 h-3.5" />
                {farm.device_count || 0} device(s)
              </Link>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title="Add farm" onClose={() => setShowModal(false)}>
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
                placeholder="North Field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Location (optional)
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Village, Taluka, District"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Latitude (optional)
                </label>
                <input
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="18.5204"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Longitude (optional)
                </label>
                <input
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="73.8567"
                />
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
              Add farm
            </button>
          </form>
        </Modal>
      )}
    </DashboardShell>
  );
}
