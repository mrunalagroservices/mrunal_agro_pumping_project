"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import {
  Plus,
  MapPin,
  Cpu,
  Trash2,
  Loader2,
  LocateFixed,
  MoreVertical,
  Pencil,
} from "lucide-react";
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
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [editFarm, setEditFarm] = useState<Farm | null>(null);

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

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
    setLocationError(null);
    setError(null);
  }

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser");
      return;
    }
    setLocationError(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        setLatitude(lat.toFixed(6));
        setLongitude(lon.toFixed(6));
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`
          );
          const data = await res.json();
          if (data?.display_name) setLocation(data.display_name);
        } catch {
          // reverse geocoding is best-effort; coordinates are already filled
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocationError(err.message || "Unable to retrieve your location");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
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
    <DashboardShell breadcrumb={[{ label: "Farms" }]}>
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
                <div className="relative">
                  <button
                    onClick={() =>
                      setOpenMenuId((id) => (id === farm.id ? null : farm.id))
                    }
                    className="text-slate-400 hover:text-slate-600 p-1 -m-1 rounded-lg"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {openMenuId === farm.id && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setOpenMenuId(null)}
                      />
                      <div className="absolute right-0 top-7 z-20 w-32 bg-white rounded-lg border border-slate-200 shadow-lg py-1">
                        <button
                          onClick={() => {
                            setEditFarm(farm);
                            setOpenMenuId(null);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setOpenMenuId(null);
                            handleDelete(farm.id);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
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
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-slate-700">
                  Location (optional)
                </label>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={locating}
                  className="flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline disabled:opacity-60"
                >
                  {locating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <LocateFixed className="w-3.5 h-3.5" />
                  )}
                  Use current location
                </button>
              </div>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Village, Taluka, District"
              />
              {locationError && (
                <p className="text-xs text-red-600 mt-1">{locationError}</p>
              )}
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

      {editFarm && (
        <EditFarmModal
          farm={editFarm}
          onClose={() => setEditFarm(null)}
          onSaved={() => {
            setEditFarm(null);
            loadFarms();
          }}
        />
      )}
    </DashboardShell>
  );
}

function EditFarmModal({
  farm,
  onClose,
  onSaved,
}: {
  farm: Farm;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(farm.name);
  const [location, setLocation] = useState(farm.location || "");
  const [latitude, setLatitude] = useState(
    farm.latitude != null ? String(farm.latitude) : ""
  );
  const [longitude, setLongitude] = useState(
    farm.longitude != null ? String(farm.longitude) : ""
  );
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser");
      return;
    }
    setLocationError(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        setLatitude(lat.toFixed(6));
        setLongitude(lon.toFixed(6));
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`
          );
          const data = await res.json();
          if (data?.display_name) setLocation(data.display_name);
        } catch {
          // reverse geocoding is best-effort; coordinates are already filled
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocationError(err.message || "Unable to retrieve your location");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await httpClient.put<ApiResponse<Farm>>(`/farms/${farm.id}`, {
        name,
        location: location || null,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update farm");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Edit farm" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
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
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-slate-700">
              Location (optional)
            </label>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={locating}
              className="flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline disabled:opacity-60"
            >
              {locating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LocateFixed className="w-3.5 h-3.5" />
              )}
              Use current location
            </button>
          </div>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Village, Taluka, District"
          />
          {locationError && (
            <p className="text-xs text-red-600 mt-1">{locationError}</p>
          )}
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
          Save changes
        </button>
      </form>
    </Modal>
  );
}
