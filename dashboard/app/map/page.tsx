"use client";

import { useEffect, useState, useCallback } from "react";
import {
  MapPin, MapPinOff, Cpu, Pencil, X, Save, Trash2, MousePointer2,
  Navigation, CheckCircle2, Shapes, Check, Undo2,
} from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import FarmsMap from "@/components/FarmsMap";
import { httpClient } from "@/lib/api";
import {
  ApiResponse, Farm, Actuator, FarmDiagram, DiagramElement,
  DiagramElementType, DiagramConnectionType, DiagramTool, Zone,
} from "@/lib/types";
import { ELEMENT_CFG, CONN_CFG } from "@/lib/diagramConfig";
import { useLocale } from "@/contexts/LocaleContext";
import { TranslationKey } from "@/lib/translations";

const ELEMENT_TOOL_TYPES: DiagramElementType[] = [
  "well", "motor", "valve", "electricity_pole", "pipe_junction", "pipe_end",
];
const CONN_TOOL_TYPES: DiagramConnectionType[] = ["pipe", "wire"];

const ELEMENT_LABEL_KEYS: Record<DiagramElementType, TranslationKey> = {
  well: "map_el_well",
  motor: "map_el_motor",
  valve: "map_el_valve",
  electricity_pole: "map_el_electricity_pole",
  pipe_junction: "map_el_pipe_junction",
  pipe_end: "map_el_pipe_end",
};
const CONN_LABEL_KEYS: Record<DiagramConnectionType, TranslationKey> = {
  pipe: "map_conn_pipe",
  wire: "map_conn_wire",
};

export default function MapPage() {
  const { t } = useLocale();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [actuators, setActuators] = useState<Actuator[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFarmId, setSelectedFarmId] = useState<number | null>(null);

  // ── pin mode ─────────────────────────────────────────────────────────────
  const [pinningFarmId, setPinningFarmId] = useState<number | null>(null);
  const [pinSaving, setPinSaving] = useState(false);

  // ── diagram editor ────────────────────────────────────────────────────────
  const [editMode, setEditMode] = useState(false);
  const [editingFarmId, setEditingFarmId] = useState<number | null>(null);
  const [activeTool, setActiveTool] = useState<DiagramTool>("select");
  const [diagram, setDiagram] = useState<FarmDiagram | null>(null);
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── read-only diagram for the selected farm (shown whenever not editing) ───
  const [viewDiagram, setViewDiagram] = useState<FarmDiagram | null>(null);

  useEffect(() => {
    if (editMode) return; // edit mode manages its own diagram state/fetch
    if (selectedFarmId == null) { setViewDiagram(null); return; }
    let cancelled = false;
    httpClient.get<ApiResponse<FarmDiagram>>(`/farms/${selectedFarmId}/diagram`)
      .then((res) => { if (!cancelled) setViewDiagram(res.data ?? null); })
      .catch(() => { if (!cancelled) setViewDiagram(null); });
    return () => { cancelled = true; };
  }, [selectedFarmId, editMode]);

  // ── irrigation zones for the selected farm (visible in both view + edit) ───
  const [zones, setZones] = useState<Zone[]>([]);
  const [plottingZoneId, setPlottingZoneId] = useState<number | null>(null);
  const [zoneSaving, setZoneSaving] = useState(false);

  useEffect(() => {
    if (selectedFarmId == null) { setZones([]); return; }
    let cancelled = false;
    httpClient.get<ApiResponse<Zone[]>>(`/zones?farm_id=${selectedFarmId}`)
      .then((res) => { if (!cancelled) setZones(res.data ?? []); })
      .catch(() => { if (!cancelled) setZones([]); });
    return () => { cancelled = true; };
  }, [selectedFarmId]);

  const load = useCallback(() => {
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

  useEffect(() => { load(); }, [load]);

  const activeFarmIds = new Set(
    actuators.filter((a) => a.current_state === "on").map((a) => a.farm_id)
  );
  const farmsWithLocation = farms.filter((f) => f.latitude != null && f.longitude != null);
  const farmsNoLocation = farms.filter((f) => f.latitude == null || f.longitude == null);
  const editingFarm = farms.find((f) => f.id === editingFarmId) ?? null;
  const pinningFarm = farms.find((f) => f.id === pinningFarmId) ?? null;

  // ── pin mode handlers ─────────────────────────────────────────────────────
  function startPin(farm: Farm) {
    // cancel any diagram edit first
    if (editMode) cancelEdit();
    setPinningFarmId(farm.id);
    setSelectedFarmId(farm.id);
  }

  function cancelPin() {
    setPinningFarmId(null);
  }

  // ── diagram editor helpers ─────────────────────────────────────────────────
  const enterEditMode = async (farm: Farm) => {
    if (pinningFarmId) cancelPin();
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
    setSelectedConnectionId(null);
    setSaveError(null);
    setPlottingZoneId(null);
  };

  const saveDiagram = async () => {
    if (!editingFarmId || !diagram) return;
    setSaving(true);
    setSaveError(null);
    try {
      await httpClient.put(`/farms/${editingFarmId}/diagram`, diagram);
      setEditMode(false);
      setDiagram(null);
      setEditingFarmId(null);
      setActiveTool("select");
      setConnectingFromId(null);
      setSelectedElementId(null);
      setSelectedConnectionId(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t("map_failed_to_save"));
    } finally {
      setSaving(false);
    }
  };

  const selectTool = (tool: DiagramTool) => {
    setActiveTool(tool);
    setConnectingFromId(null);
    setSelectedElementId(null);
    setSelectedConnectionId(null);
    setPlottingZoneId(null);
  };

  // Deletes an element and — since a wire/pipe is meaningless without both
  // ends — any connection attached to it too.
  const deleteElementById = (elementId: string) => {
    if (!diagram) return;
    setDiagram({
      ...diagram,
      elements: diagram.elements.filter((e) => e.id !== elementId),
      connections: diagram.connections.filter(
        (c) => c.from !== elementId && c.to !== elementId
      ),
    });
    setSelectedElementId((prev) => (prev === elementId ? null : prev));
  };

  const deleteSelectedElement = () => {
    if (!selectedElementId) return;
    deleteElementById(selectedElementId);
  };

  const deleteConnectionById = (connectionId: string) => {
    if (!diagram) return;
    setDiagram({
      ...diagram,
      connections: diagram.connections.filter((c) => c.id !== connectionId),
    });
    setSelectedConnectionId((prev) => (prev === connectionId ? null : prev));
  };

  const renameSelectedElement = (label: string) => {
    if (!diagram || !selectedElementId) return;
    setDiagram({
      ...diagram,
      elements: diagram.elements.map((e) =>
        e.id === selectedElementId ? { ...e, label: label.trim() || undefined } : e
      ),
    });
  };

  const handleConnectionClick = (connectionId: string) => {
    setSelectedConnectionId((prev) => (prev === connectionId ? null : connectionId));
    setSelectedElementId(null);
  };

  const deleteSelectedConnection = () => {
    if (!selectedConnectionId) return;
    deleteConnectionById(selectedConnectionId);
  };

  // ── farm boundary plotting ──────────────────────────────────────────────────
  const startBoundaryPlotting = () => {
    if (!diagram) return;
    if (!diagram.boundary) setDiagram({ ...diagram, boundary: [] });
    setActiveTool("boundary");
  };

  const undoLastBoundaryPoint = () => {
    if (!diagram?.boundary?.length) return;
    setDiagram({ ...diagram, boundary: diagram.boundary.slice(0, -1) });
  };

  const clearBoundary = () => {
    if (!diagram) return;
    setDiagram({ ...diagram, boundary: [] });
  };

  const completeBoundary = () => {
    setActiveTool("select");
  };

  // Removes the farm's plotted boundary entirely (outside of active plotting
  // mode) — persisted on the next Save, same as any other diagram edit.
  const deleteFarmBoundaryShape = () => {
    if (!diagram) return;
    if (!confirm(t("map_boundary_delete_confirm"))) return;
    setDiagram({ ...diagram, boundary: [] });
  };

  // ── irrigation zone plotting ─────────────────────────────────────────────
  const startZonePlotting = (zone: Zone) => {
    setZones((prev) => prev.map((z) => z.id === zone.id && !z.boundary ? { ...z, boundary: [] } : z));
    setPlottingZoneId(zone.id);
    setActiveTool("zone");
  };

  const undoLastZonePoint = () => {
    if (plottingZoneId == null) return;
    setZones((prev) => prev.map((z) =>
      z.id === plottingZoneId && z.boundary?.length ? { ...z, boundary: z.boundary.slice(0, -1) } : z
    ));
  };

  const clearZoneBoundary = () => {
    if (plottingZoneId == null) return;
    setZones((prev) => prev.map((z) => z.id === plottingZoneId ? { ...z, boundary: [] } : z));
  };

  const completeZonePlotting = async () => {
    if (plottingZoneId == null) return;
    const zone = zones.find((z) => z.id === plottingZoneId);
    if (!zone) return;
    setZoneSaving(true);
    try {
      await httpClient.put<ApiResponse<Zone>>(`/zones/${zone.id}`, { boundary: zone.boundary ?? [] });
    } catch {
      // best-effort — the polygon stays visible locally even if the save failed;
      // re-selecting the farm will refetch and reveal whether it actually persisted
    } finally {
      setZoneSaving(false);
      setPlottingZoneId(null);
      setActiveTool("select");
    }
  };

  // Removes a zone's plotted shape — saved immediately, same as Complete,
  // since zone boundaries aren't batched with the diagram Save button.
  const deleteZoneBoundaryShape = async (zone: Zone) => {
    if (!confirm(t("map_boundary_delete_confirm"))) return;
    setZones((prev) => prev.map((z) => z.id === zone.id ? { ...z, boundary: [] } : z));
    try {
      await httpClient.put<ApiResponse<Zone>>(`/zones/${zone.id}`, { boundary: [] });
    } catch {
      // best-effort, same as completeZonePlotting
    }
  };

  // ── unified map click handler ─────────────────────────────────────────────
  const handleMapClick = async (lat: number, lng: number) => {
    // Pin mode: save GPS for the selected farm
    if (pinningFarmId !== null) {
      setPinSaving(true);
      try {
        await httpClient.put<ApiResponse<Farm>>(`/farms/${pinningFarmId}`, { latitude: lat, longitude: lng });
        setFarms((prev) =>
          prev.map((f) => f.id === pinningFarmId ? { ...f, latitude: lat, longitude: lng } : f)
        );
        setSelectedFarmId(pinningFarmId);
        setPinningFarmId(null);
      } catch { /* ignore */ }
      finally { setPinSaving(false); }
      return;
    }

    if (!editMode) return;

    // Plotting a zone's boundary — append a point to that zone, not the diagram.
    if (activeTool === "zone" && plottingZoneId != null) {
      setZones((prev) => prev.map((z) =>
        z.id === plottingZoneId ? { ...z, boundary: [...(z.boundary ?? []), { lat, lng }] } : z
      ));
      return;
    }

    if (!diagram) return;

    // Plotting the farm boundary — append a point.
    if (activeTool === "boundary") {
      setDiagram({ ...diagram, boundary: [...(diagram.boundary ?? []), { lat, lng }] });
      return;
    }

    // Diagram edit mode: place element
    if (!ELEMENT_TOOL_TYPES.includes(activeTool as DiagramElementType)) return;
    const newEl: DiagramElement = {
      id: crypto.randomUUID(),
      type: activeTool as DiagramElementType,
      lat,
      lng,
    };
    setDiagram({ ...diagram, elements: [...diagram.elements, newEl] });
    setActiveTool("select");
  };

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
      setSelectedConnectionId(null);
      setSelectedElementId((prev) => {
        const next = prev === elementId ? null : elementId;
        setLabelDraft(next ? diagram.elements.find((e) => e.id === next)?.label ?? "" : "");
        return next;
      });
    }
  };

  const handleElementMove = (elementId: string, lat: number, lng: number) => {
    if (!diagram) return;
    setDiagram({
      ...diagram,
      elements: diagram.elements.map((e) => e.id === elementId ? { ...e, lat, lng } : e),
    });
  };

  const instruction = (() => {
    if (activeTool === "select") {
      if (selectedElementId) return t("map_instr_select_with_selection");
      if (selectedConnectionId) return t("map_instr_connection_selected");
      return t("map_instr_select_empty");
    }
    if (activeTool === "boundary") return t("map_instr_boundary");
    if (activeTool === "zone") return t("map_instr_zone");
    if (activeTool === "pipe" || activeTool === "wire") {
      return connectingFromId ? t("map_instr_connect_dest") : t("map_instr_connect_first");
    }
    const labelKey = ELEMENT_LABEL_KEYS[activeTool as DiagramElementType];
    return t("map_instr_place", { element: labelKey ? t(labelKey) : activeTool });
  })();

  return (
    <DashboardShell breadcrumb={[{ label: "Map" }]}>
      {/* Pin mode banner */}
      {pinningFarmId !== null && (
        <div className="mb-3 flex items-center gap-3 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md">
          <Navigation className="w-4 h-4 shrink-0 animate-pulse" />
          <span className="flex-1">
            {pinSaving
              ? t("map_saving_location")
              : t("map_pin_instruction", { farm: pinningFarm?.name ?? "" })}
          </span>
          <button onClick={cancelPin} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 h-[72vh] lg:h-[calc(100vh-11rem)]">
        {/* ── Left panel ─────────────────────────────────────────────────── */}
        <div className="lg:w-72 shrink-0 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
          {editMode ? (
            /* ── Editor palette ─────────────────────────────────────────── */
            <>
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 shrink-0">
                <Pencil className="w-4 h-4 text-emerald-600 shrink-0" />
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {editingFarm?.name ?? t("map_edit_layout")}
                </p>
              </div>

              <div className="px-3 pt-3 pb-2 shrink-0 flex gap-2">
                <button
                  onClick={cancelEdit}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-semibold border-2 border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4" /> {t("common_cancel")}
                </button>
                <button
                  onClick={saveDiagram}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  {saving ? t("map_saving") : t("common_save")}
                </button>
              </div>

              {saveError && (
                <div className="mx-3 mb-1 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 shrink-0">
                  {saveError}
                </div>
              )}

              <div className="overflow-y-auto flex-1 px-3 pb-3 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 px-1">{t("map_mode")}</p>
                  <button
                    onClick={() => selectTool("select")}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      activeTool === "select" ? "bg-slate-800 text-white border-slate-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <MousePointer2 className="w-4 h-4" /> {t("map_select_move")}
                  </button>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 px-1">{t("map_farm_boundary")}</p>
                  {activeTool === "boundary" ? (
                    <div className="space-y-1.5">
                      <p className="text-xs text-slate-500 px-1">
                        {t("map_boundary_points_count", { n: diagram?.boundary?.length ?? 0 })}
                      </p>
                      <div className="flex gap-1.5">
                        <button
                          onClick={undoLastBoundaryPoint}
                          disabled={!diagram?.boundary?.length}
                          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                        >
                          <Undo2 className="w-3.5 h-3.5" /> {t("map_boundary_undo")}
                        </button>
                        <button
                          onClick={clearBoundary}
                          disabled={!diagram?.boundary?.length}
                          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> {t("map_boundary_clear")}
                        </button>
                      </div>
                      <button
                        onClick={completeBoundary}
                        disabled={(diagram?.boundary?.length ?? 0) < 3}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 transition-colors"
                      >
                        <Check className="w-4 h-4" /> {t("map_boundary_complete")}
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1.5">
                      <button
                        onClick={startBoundaryPlotting}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        <Shapes className="w-4 h-4" />
                        {(diagram?.boundary?.length ?? 0) >= 3 ? t("map_boundary_replot") : t("map_boundary_plot")}
                      </button>
                      {(diagram?.boundary?.length ?? 0) >= 3 && (
                        <button
                          onClick={deleteFarmBoundaryShape}
                          title={t("map_boundary_delete")}
                          className="px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 px-1">{t("map_zones")}</p>
                  {zones.length === 0 ? (
                    <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2 leading-relaxed">{t("map_zones_none")}</p>
                  ) : (
                    <div className="space-y-1.5">
                      {zones.map((zone) => {
                        const isPlotting = plottingZoneId === zone.id;
                        const hasShape = (zone.boundary?.length ?? 0) >= 3;
                        return (
                          <div key={zone.id} className="border border-slate-200 rounded-lg px-2.5 py-2">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ background: zone.color || "#16a34a" }}
                              />
                              <span className="text-xs font-medium text-slate-700 truncate flex-1">{zone.name}</span>
                              {!isPlotting && (
                                <>
                                  <button
                                    onClick={() => startZonePlotting(zone)}
                                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 shrink-0"
                                  >
                                    {hasShape ? t("map_boundary_replot") : t("map_boundary_plot")}
                                  </button>
                                  {hasShape && (
                                    <button
                                      onClick={() => deleteZoneBoundaryShape(zone)}
                                      title={t("map_boundary_delete")}
                                      className="text-red-500 hover:text-red-700 shrink-0"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                            {isPlotting && (
                              <div className="mt-2 space-y-1.5">
                                <p className="text-[11px] text-slate-500">
                                  {t("map_boundary_points_count", { n: zone.boundary?.length ?? 0 })}
                                </p>
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={undoLastZonePoint}
                                    disabled={!zone.boundary?.length}
                                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                                  >
                                    <Undo2 className="w-3 h-3" /> {t("map_boundary_undo")}
                                  </button>
                                  <button
                                    onClick={clearZoneBoundary}
                                    disabled={!zone.boundary?.length}
                                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" /> {t("map_boundary_clear")}
                                  </button>
                                </div>
                                <button
                                  onClick={completeZonePlotting}
                                  disabled={(zone.boundary?.length ?? 0) < 3 || zoneSaving}
                                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 transition-colors"
                                >
                                  <Check className="w-3.5 h-3.5" /> {zoneSaving ? t("map_saving") : t("map_boundary_complete")}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 px-1">{t("map_place_element")}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {ELEMENT_TOOL_TYPES.map((type) => {
                      const cfg = ELEMENT_CFG[type];
                      const isActive = activeTool === type;
                      return (
                        <button
                          key={type}
                          onClick={() => selectTool(type)}
                          className={`flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                            isActive ? "border-transparent shadow-md scale-105" : "border-slate-200 text-slate-700 hover:border-slate-300"
                          }`}
                        >
                          <span className="w-10 h-10 rounded-full flex items-center justify-center shadow-md bg-white border border-slate-200">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={cfg.icon} alt={cfg.label} className="w-7 h-7 object-contain" />
                          </span>
                          <span>{t(ELEMENT_LABEL_KEYS[type])}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 px-1">{t("map_draw_connection")}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {CONN_TOOL_TYPES.map((type) => {
                      const cfg = CONN_CFG[type];
                      const isActive = activeTool === type;
                      return (
                        <button
                          key={type}
                          onClick={() => selectTool(type)}
                          className={`flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                            isActive ? "border-transparent shadow-md scale-105" : "border-slate-200 text-slate-700 hover:border-slate-300"
                          }`}
                        >
                          <span
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md"
                            style={{ background: cfg.color }}
                          >
                            {cfg.symbol}
                          </span>
                          <span>{t(CONN_LABEL_KEYS[type])}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedElementId && (
                  <div className="space-y-1.5 border-t border-slate-100 pt-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">{t("map_edit_selected_element")}</p>
                    <input
                      value={labelDraft}
                      onChange={(e) => setLabelDraft(e.target.value)}
                      onBlur={() => renameSelectedElement(labelDraft)}
                      onKeyDown={(e) => { if (e.key === "Enter") renameSelectedElement(labelDraft); }}
                      placeholder={t("map_element_label_placeholder")}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      onClick={deleteSelectedElement}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" /> {t("map_delete_selected")}
                    </button>
                  </div>
                )}

                {selectedConnectionId && (
                  <div className="space-y-1.5 border-t border-slate-100 pt-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">{t("map_edit_selected_connection")}</p>
                    <button
                      onClick={deleteSelectedConnection}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" /> {t("map_delete_connection")}
                    </button>
                  </div>
                )}

                <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 leading-relaxed">
                  {instruction}
                </p>
              </div>
            </>
          ) : (
            /* ── Farm list ──────────────────────────────────────────────── */
            <>
              <div className="px-4 py-3 border-b border-slate-100 shrink-0">
                <p className="text-sm font-semibold text-slate-800">{t("map_farms_title")}</p>
                <p className="text-xs text-slate-500">{t("map_pinned_unpinned", { pinned: farmsWithLocation.length, unpinned: farmsNoLocation.length })}</p>
              </div>

              <div className="overflow-y-auto flex-1">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-6 h-6 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : farms.length === 0 ? (
                  <p className="text-sm text-slate-400 italic px-4 py-8 text-center">{t("map_no_farms_yet")}</p>
                ) : (
                  <>
                    {/* Pinned farms */}
                    {farmsWithLocation.length > 0 && (
                      <div>
                        <p className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                          {t("map_on_map")}
                        </p>
                        {farmsWithLocation.map((farm) => {
                          const isActive = activeFarmIds.has(farm.id);
                          const isSelected = selectedFarmId === farm.id;
                          return (
                            <div key={farm.id} className={`border-b border-slate-50 ${isSelected ? "bg-emerald-50/60" : ""}`}>
                              <button
                                onClick={() => { setSelectedFarmId(farm.id); if (pinningFarmId) cancelPin(); }}
                                className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? "bg-emerald-500" : "bg-slate-300"}`} />
                                  <span className="font-medium text-slate-800 text-sm truncate">{farm.name}</span>
                                </div>
                                {farm.location && (
                                  <p className="flex items-center gap-1 text-xs text-slate-500 mt-1 ml-4 truncate">
                                    <MapPin className="w-3 h-3 shrink-0" /> {farm.location}
                                  </p>
                                )}
                                <p className="flex items-center gap-1 text-xs text-slate-400 mt-0.5 ml-4">
                                  <Cpu className="w-3 h-3 shrink-0" />
                                  {isActive ? t("map_pump_running") : t("map_idle")} · {t("map_device_count", { count: farm.device_count ?? 0 })}
                                </p>
                              </button>
                              {isSelected && (
                                <div className="px-4 pb-3 flex gap-2">
                                  <button
                                    onClick={() => startPin(farm)}
                                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors px-3 py-1.5 rounded-lg"
                                  >
                                    <MapPin className="w-3.5 h-3.5" /> {t("map_repin")}
                                  </button>
                                  <button
                                    onClick={() => enterEditMode(farm)}
                                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors px-3 py-1.5 rounded-lg"
                                  >
                                    <Pencil className="w-3.5 h-3.5" /> {t("map_layout")}
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Unpinned farms */}
                    {farmsNoLocation.length > 0 && (
                      <div>
                        <p className="px-4 py-2 text-[10px] font-bold text-amber-500 uppercase tracking-wider bg-amber-50 border-b border-amber-100">
                          {t("map_not_pinned")}
                        </p>
                        {farmsNoLocation.map((farm) => {
                          const isPinning = pinningFarmId === farm.id;
                          return (
                            <div key={farm.id} className={`border-b border-slate-50 ${isPinning ? "bg-emerald-50/60" : ""}`}>
                              <div className="px-4 py-3 flex items-center gap-3">
                                <MapPinOff className="w-4 h-4 text-slate-300 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-slate-700 text-sm truncate">{farm.name}</p>
                                  <p className="text-xs text-slate-400">{t("map_device_count", { count: farm.device_count ?? 0 })}</p>
                                </div>
                                {isPinning ? (
                                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg animate-pulse">
                                    <Navigation className="w-3 h-3" /> {t("map_pinning")}
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => startPin(farm)}
                                    className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors px-2 py-1.5 rounded-lg shrink-0"
                                  >
                                    <MapPin className="w-3 h-3" /> {t("map_pin")}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Legend */}
              <div className="px-4 py-3 border-t border-slate-100 shrink-0 flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> {t("map_legend_running")}</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-300 inline-block" /> {t("map_legend_idle")}</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-auto" />
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
            onSelectFarm={(id) => { setSelectedFarmId(id); if (pinningFarmId) cancelPin(); }}
            pinMode={pinningFarmId !== null}
            diagram={editMode ? diagram ?? undefined : viewDiagram ?? undefined}
            editMode={editMode}
            activeTool={activeTool}
            connectingFromId={connectingFromId}
            selectedElementId={selectedElementId}
            selectedConnectionId={selectedConnectionId}
            onMapClick={handleMapClick}
            onElementClick={handleElementClick}
            onElementMove={handleElementMove}
            onElementDelete={deleteElementById}
            onConnectionClick={handleConnectionClick}
            onConnectionDelete={deleteConnectionById}
            zones={zones}
          />
        </div>
      </div>
    </DashboardShell>
  );
}
