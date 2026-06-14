"use client";

import { useEffect, useState } from "react";
import { MapPin, Cpu } from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import FarmsMap from "@/components/FarmsMap";
import { httpClient } from "@/lib/api";
import { ApiResponse, Farm, Actuator } from "@/lib/types";

export default function MapPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [actuators, setActuators] = useState<Actuator[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFarmId, setSelectedFarmId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      httpClient.get<ApiResponse<Farm[]>>("/farms"),
      httpClient.get<ApiResponse<Actuator[]>>("/actuators"),
    ])
      .then(([farmsRes, actuatorsRes]) => {
        setFarms(farmsRes.data);
        setActuators(actuatorsRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const activeFarmIds = new Set(
    actuators.filter((a) => a.current_state === "on").map((a) => a.farm_id)
  );

  const farmsWithLocation = farms.filter((f) => f.latitude != null && f.longitude != null);

  return (
    <DashboardShell breadcrumb={[{ label: "Map" }]}>
      <div className="flex flex-col gap-3 mb-4">
        <p className="text-sm text-slate-500">
          Live locations of your farms — pumps currently running are highlighted with a pulse.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 h-[70vh] lg:h-[calc(100vh-11rem)]">
        <div className="lg:w-72 shrink-0 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-medium text-slate-800">Farms</p>
            <p className="text-xs text-slate-500">{farmsWithLocation.length} on map</p>
          </div>
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <p className="text-sm text-slate-500 px-4 py-6">Loading...</p>
            ) : farmsWithLocation.length === 0 ? (
              <p className="text-sm text-slate-500 px-4 py-6">
                No farms have GPS coordinates yet. Edit a farm from the Farms page to add a location.
              </p>
            ) : (
              farmsWithLocation.map((farm) => {
                const isActive = activeFarmIds.has(farm.id);
                return (
                  <button
                    key={farm.id}
                    onClick={() => setSelectedFarmId(farm.id)}
                    className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                      selectedFarmId === farm.id ? "bg-primary-50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isActive ? "bg-primary-500" : "bg-slate-300"
                        }`}
                      />
                      <span className="font-medium text-slate-800 text-sm truncate">{farm.name}</span>
                    </div>
                    {farm.location && (
                      <p className="flex items-center gap-1 text-xs text-slate-500 mt-1 ml-4 truncate">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {farm.location}
                      </p>
                    )}
                    <p className="flex items-center gap-1 text-xs text-slate-400 mt-1 ml-4">
                      <Cpu className="w-3 h-3 shrink-0" />
                      {isActive ? "Pump running" : "Idle"} · {farm.device_count ?? 0} device(s)
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="flex-1 rounded-xl border border-slate-200 overflow-hidden min-h-[300px]">
          <FarmsMap
            farms={farms}
            activeFarmIds={activeFarmIds}
            selectedFarmId={selectedFarmId}
            onSelectFarm={setSelectedFarmId}
          />
        </div>
      </div>
    </DashboardShell>
  );
}
