"use client";

import { useEffect, useState } from "react";
import {
  MapPin,
  Cpu,
  Pencil,
  X,
  Save,
  Trash2,
  MousePointer2,
} from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import FarmsMap from "@/components/FarmsMap";
import { httpClient } from "@/lib/api";
import {
  ApiResponse,
  Farm,
  Actuator,
  FarmDiagram,
  DiagramElement,
  DiagramElementType,
  DiagramConnectionType,
  DiagramTool,
} from "@/lib/types";
import { ELEMENT_CFG, CONN_CFG } from "@/lib/diagramConfig";

const ELEMENT_TOOL_TYPES: DiagramElementType[] = [
  "well", "motor", "valve", "electricity_pole", "pipe_junction",
];
const CONN_TOOL_TYPES: DiagramConnectionType[] = ["pipe", "wire"];

export default function MapPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [actuators, setActuators] = useState<Actuator[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFarmId, setSelectedFarmId] = useState<number | null>(null);

  // ── editor state ──────────────────────────────────────────────────────────
  const [editMode, setEditMode] = useState(false);
  const [editingFarmId, setEditingFarmId] = useState<number | null>(null);
  const [activeTool, setActiveTool] = useState<DiagramTool>("select");
  const [diagram, setDiagram] = useState<FarmDiagram | null>(null);
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
  const editingFarm = farms.find((f) => f.id === editingFarmId) ?? null;

  // ── editor helpers ────────────────────────────────────────────────────────
  const enterEditMode = async (farm: Farm) => {
    try {
      const res = await httpClient.get<ApiResponse<FarmDiagram>>(`/farms/${farm.id}/diagram`);
      setDiagram(res.data ?? { elements: [], connections: [] });
    } catch {
      setDiagram({ elements: [], connections: [] });
    }
    setEditingFarmId(farm.id);
    setSelectedFarmId(farm.id);
    setEditMode(true);
    setActiveTool("select");
    setConnectingFromId(null);
    setSelectedElementId(null);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setDiagram(null);
    setEditingFarmId(null);
    setActiveTool("select");
    setConnectingFromId(null);
    setSelectedElementId(null);
    setSaveError(null);
  };

  const saveDiagram = async () => {
    if (!editingFarmId || !diagram) return;
    setSaving(true);
    setSaveError(null);
    try {
      await httpClient.put(`/farms/${editingFarmId}/diagram`, diagram);
      // success — exit edit mode
      setEditMode(false);
      setDiagram(null);
      setEditingFarmId(null);
      setActiveTool("select");
      setConnectingFromId(null);
      setSelectedElementId(null);
      setSaveError(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const selectTool = (tool: DiagramTool) => {
    setActiveTool(tool);
    setConnectingFromId(null);
    setSelectedElementId(null);
  };

  // Called by FarmsMap when user clicks on the map canvas.
  const handleMapClick = (lat: number, lng: number) => {
    if (!editMode || !diagram) return;
    const elTypes = ELEMENT_TOOL_TYPES as string[];
    if (!elTypes.includes(activeTool)) return;
    const newEl: DiagramElement = {
      id: crypto.randomUUID(),
      type: activeTool as DiagramElementType,
      lat,
      lng,
    };
    setDiagram({ ...diagram, elements: [...diagram.elements, newEl] });
    setActiveTool("select");
  };

  // Called by FarmsMap when user clicks a diagram element marker.
  const handleElementClick = (elementId: string) => {
    if (!editMode || !diagram) return;
    if (activeTool === "pipe" || activeTool === "wire") {
      if (!connectingFromId) {
        setConnectingFromId(elementId);
      } else if (connectingFromId !== elementId) {
        setDiagram({
          ...diagram,
          connections: [
            ...diagram.connections,
            { id: crypto.randomUUID(), from: connectingFromId, to: elementId, type: activeTool },
          ],
        });
        setConnectingFromId(null);
        setActiveTool("select");
      }
    } else {
      // Select tool: toggle selection.
      setSelectedElementId((prev) => (prev === elementId ? null : elementId));
    }
  };

  const handleElementMove = (elementId: string, lat: number, lng: number) => {
    if (!diagram) return;
    setDiagram({
      ...diagram,
      elements: diagram.elements.map((e) =>
        e.id === elementId ? { ...e, lat, lng } : e
      ),
    });
  };

  const deleteSelectedElement = () => {
    if (!diagram || !selectedElementId) return;
    setDiagram({
      elements: diagram.elements.filter((e) => e.id !== selectedElementId),
      connections: diagram.connections.filter(
        (c) => c.from !== selectedElementId && c.to !== selectedElementId
      ),
    });
    setSelectedElementId(null);
  };

  // ── instruction text shown at bottom of palette ───────────────────────────
  const instruction = (() => {
    if (activeTool === "select") return selectedElementId ? "Drag to move · Delete to remove" : "Click an element to select it";
    if (activeTool === "pipe" || activeTool === "wire") {
      return connectingFromId ? "Now click the destination element" : "Click the first element";
    }
    return `Click on the map to place a ${ELEMENT_CFG[activeTool as DiagramElementType]?.label ?? activeTool}`;
  })();

  return (
    <DashboardShell breadcrumb={[{ label: "Map" }]}>
      <div className="flex flex-col gap-3 mb-4">
        <p className="text-sm text-slate-500">
          {editMode
            ? `Editing layout for "${editingFarm?.name ?? ""}"`
            : "Live locations of your farms — pumps currently running are highlighted with a pulse."}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 h-[70vh] lg:h-[calc(100vh-11rem)]">
        {/* ── Left panel ─────────────────────────────────────────────────── */}
        <div className="lg:w-72 shrink-0 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
          {editMode ? (
            /* ── Editor palette ─────────────────────────────────────────── */
            <>
              {/* Header */}
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 shrink-0">
                <Pencil className="w-4 h-4 text-primary-600 shrink-0" />
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {editingFarm?.name ?? "Edit Layout"}
                </p>
              </div>

              {/* Save / Cancel — always visible, never scrolled away */}
              <div className="px-3 pt-3 pb-2 shrink-0 flex gap-2">
                <button
                  onClick={cancelEdit}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-semibold border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button
                  onClick={saveDiagram}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-semibold bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-60 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>

              {/* Error message */}
              {saveError && (
                <div className="mx-3 mb-1 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 shrink-0">
                  {saveError}
                </div>
              )}

              <div className="overflow-y-auto flex-1 px-3 pb-3 space-y-4">
                {/* Select / Move */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 px-1">
                    Mode
                  </p>
                  <button
                    onClick={() => selectTool("select")}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      activeTool === "select"
                        ? "bg-slate-800 text-white border-slate-800"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <MousePointer2 className="w-4 h-4" />
                    Select / Move
                  </button>
                </div>

                {/* Elements */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 px-1">
                    Place element
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {ELEMENT_TOOL_TYPES.map((type) => {
                      const cfg = ELEMENT_CFG[type];
                      const isActive = activeTool === type;
                      return (
                        <button
                          key={type}
                          onClick={() => selectTool(type)}
                          className={`flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                            isActive
                              ? "border-transparent shadow-md scale-105"
                              : "border-slate-200 text-slate-700 hover:border-slate-300 hover:shadow-sm"
                          }`}
                          style={isActive ? { background: "linear-gradient(135deg,#f8fafc,#f1f5f9)", borderColor: "transparent" } : {}}
                        >
                          <span
                            className="w-10 h-10 rounded-full flex items-center justify-center shadow-md"
                            style={{ background: cfg.gradient, boxShadow: isActive ? "0 0 0 3px rgba(99,102,241,0.35), 0 3px 8px rgba(0,0,0,0.2)" : undefined }}
                            dangerouslySetInnerHTML={{ __html: cfg.svg }}
                          />
                          <span className={isActive ? "text-slate-800" : "text-slate-600"}>{cfg.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Connections */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 px-1">
                    Draw connection
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {CONN_TOOL_TYPES.map((type) => {
                      const cfg = CONN_CFG[type];
                      const isActive = activeTool === type;
                      return (
                        <button
                          key={type}
                          onClick={() => selectTool(type)}
                          className={`flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                            isActive
                              ? "border-transparent shadow-md scale-105"
                              : "border-slate-200 text-slate-700 hover:border-slate-300 hover:shadow-sm"
                          }`}
                        >
                          <span
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md"
                            style={{
                              background: cfg.color,
                              boxShadow: isActive ? `0 0 0 3px ${cfg.color}55, 0 3px 8px rgba(0,0,0,0.2)` : undefined,
                            }}
                          >
                            {cfg.symbol}
                          </span>
                          <span className={isActive ? "text-slate-800" : "text-slate-600"}>{cfg.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Delete selected */}
                {selectedElementId && (
                  <button
                    onClick={deleteSelectedElement}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete selected
                  </button>
                )}

                {/* Instruction hint */}
                <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 leading-relaxed">
                  {instruction}
                </p>
              </div>

            </>
          ) : (
            /* ── Farm list ──────────────────────────────────────────────── */
            <>
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-medium text-slate-800">Farms</p>
                <p className="text-xs text-slate-500">{farmsWithLocation.length} on map</p>
              </div>
              <div className="overflow-y-auto flex-1">
                {loading ? (
                  <p className="text-sm text-slate-500 px-4 py-6">Loading…</p>
                ) : farmsWithLocation.length === 0 ? (
                  <p className="text-sm text-slate-500 px-4 py-6">
                    No farms have GPS coordinates yet. Edit a farm from the Farms page to add a
                    location.
                  </p>
                ) : (
                  farmsWithLocation.map((farm) => {
                    const isActive = activeFarmIds.has(farm.id);
                    const isSelected = selectedFarmId === farm.id;
                    return (
                      <div
                        key={farm.id}
                        className={`border-b border-slate-50 ${isSelected ? "bg-primary-50" : ""}`}
                      >
                        <button
                          onClick={() => setSelectedFarmId(farm.id)}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                isActive ? "bg-primary-500" : "bg-slate-300"
                              }`}
                            />
                            <span className="font-medium text-slate-800 text-sm truncate">
                              {farm.name}
                            </span>
                          </div>
                          {farm.location && (
                            <p className="flex items-center gap-1 text-xs text-slate-500 mt-1 ml-4 truncate">
                              <MapPin className="w-3 h-3 shrink-0" />
                              {farm.location}
                            </p>
                          )}
                          <p className="flex items-center gap-1 text-xs text-slate-400 mt-1 ml-4">
                            <Cpu className="w-3 h-3 shrink-0" />
                            {isActive ? "Pump running" : "Idle"} · {farm.device_count ?? 0}{" "}
                            device(s)
                          </p>
                        </button>
                        {isSelected && (
                          <div className="px-4 pb-3">
                            <button
                              onClick={() => enterEditMode(farm)}
                              className="flex items-center gap-1.5 text-xs font-semibold text-primary-700 bg-primary-50 border border-primary-200 hover:bg-primary-100 transition-colors px-3 py-1.5 rounded-lg w-full justify-center"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Edit Layout
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Map ──────────────────────────────────────────────────────────── */}
        <div className="flex-1 rounded-xl border border-slate-200 overflow-hidden min-h-[300px]">
          <FarmsMap
            farms={farms}
            activeFarmIds={activeFarmIds}
            selectedFarmId={selectedFarmId}
            onSelectFarm={setSelectedFarmId}
            diagram={editMode ? diagram ?? undefined : undefined}
            editMode={editMode}
            activeTool={activeTool}
            connectingFromId={connectingFromId}
            selectedElementId={selectedElementId}
            onMapClick={handleMapClick}
            onElementClick={handleElementClick}
            onElementMove={handleElementMove}
          />
        </div>
      </div>
    </DashboardShell>
  );
}
