"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  Farm,
  FarmDiagram,
  DiagramElement,
  DiagramElementType,
  DiagramTool,
} from "@/lib/types";
import { ELEMENT_CFG } from "@/lib/diagramConfig";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const DEFAULT_CENTER: [number, number] = [73.8567, 18.5204];
const CONN_SOURCE = "diagram-connections";

const ELEMENT_TOOLS: DiagramElementType[] = [
  "well", "motor", "valve", "electricity_pole", "pipe_junction",
];

interface FarmsMapProps {
  farms: Farm[];
  activeFarmIds: Set<number>;
  selectedFarmId?: number | null;
  onSelectFarm?: (farmId: number) => void;
  // pin mode — clicking the map fires onMapClick even outside edit mode
  pinMode?: boolean;
  // diagram
  diagram?: FarmDiagram | null;
  editMode?: boolean;
  activeTool?: DiagramTool;
  connectingFromId?: string | null;
  selectedElementId?: string | null;
  onMapClick?: (lat: number, lng: number) => void;
  onElementClick?: (elementId: string) => void;
  onElementMove?: (elementId: string, lat: number, lng: number) => void;
}

export default function FarmsMap({
  farms,
  activeFarmIds,
  selectedFarmId,
  onSelectFarm,
  pinMode,
  diagram,
  editMode,
  activeTool,
  connectingFromId,
  selectedElementId,
  onMapClick,
  onElementClick,
  onElementMove,
}: FarmsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<number, maplibregl.Marker>>(new Map());
  const diagramMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const connSourceReadyRef = useRef(false);

  // Keep latest callbacks/props in refs so map event handlers never go stale.
  const onSelectRef = useRef(onSelectFarm);
  onSelectRef.current = onSelectFarm;
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;
  const onElementClickRef = useRef(onElementClick);
  onElementClickRef.current = onElementClick;
  const onElementMoveRef = useRef(onElementMove);
  onElementMoveRef.current = onElementMove;
  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;
  const editModeRef = useRef(editMode);
  editModeRef.current = editMode;
  const pinModeRef = useRef(pinMode);
  pinModeRef.current = pinMode;

  // ── Map initialisation ────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const located = farms.filter((f) => f.latitude != null && f.longitude != null);
    const center: [number, number] =
      located.length > 0
        ? [Number(located[0].longitude), Number(located[0].latitude)]
        : DEFAULT_CENTER;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center,
      zoom: located.length > 0 ? 11 : 6,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    // Add connection line source + layers once the style loads.
    map.on("load", () => {
      map.addSource(CONN_SOURCE, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "diagram-pipes",
        type: "line",
        source: CONN_SOURCE,
        filter: ["==", ["get", "connType"], "pipe"],
        paint: {
          "line-color": "#0ea5e9",
          "line-width": 3,
          "line-dasharray": [5, 3],
        },
      });
      map.addLayer({
        id: "diagram-wires",
        type: "line",
        source: CONN_SOURCE,
        filter: ["==", ["get", "connType"], "wire"],
        paint: {
          "line-color": "#f59e0b",
          "line-width": 2,
        },
      });
      connSourceReadyRef.current = true;
    });

    // Map click: fire in pin mode (GPS setting) or when an element tool is active.
    map.on("click", (e) => {
      if (pinModeRef.current) {
        onMapClickRef.current?.(e.lngLat.lat, e.lngLat.lng);
        return;
      }
      if (!editModeRef.current) return;
      const tool = activeToolRef.current;
      if (tool && ELEMENT_TOOLS.includes(tool as DiagramElementType)) {
        onMapClickRef.current?.(e.lngLat.lat, e.lngLat.lng);
      }
    });

    mapRef.current = map;

    return () => {
      diagramMarkersRef.current.forEach((m) => m.remove());
      diagramMarkersRef.current.clear();
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      connSourceReadyRef.current = false;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Map cursor based on active tool or pin mode ───────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const canvas = map.getCanvas();
    if (pinMode || (editMode && activeTool && activeTool !== "select")) {
      canvas.style.cursor = "crosshair";
    } else {
      canvas.style.cursor = "";
    }
  }, [editMode, activeTool, pinMode]);

  // ── Farm location markers ─────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const sync = () => {
      const presentIds = new Set(farms.map((f) => f.id));
      for (const [id, marker] of markersRef.current) {
        if (!presentIds.has(id)) { marker.remove(); markersRef.current.delete(id); }
      }
      for (const farm of farms) {
        if (farm.latitude == null || farm.longitude == null) continue;
        const isActive = activeFarmIds.has(farm.id);
        let marker = markersRef.current.get(farm.id);
        if (!marker) {
          const el = document.createElement("div");
          el.className = "farm-marker-wrapper";
          el.addEventListener("click", () => {
            if (!editModeRef.current) onSelectRef.current?.(farm.id);
          });
          marker = new maplibregl.Marker({ element: el, anchor: "center" })
            .setLngLat([Number(farm.longitude), Number(farm.latitude)])
            .setPopup(
              new maplibregl.Popup({ offset: 16, closeButton: false }).setHTML(
                `<div style="font-size:13px;font-family:inherit"><strong>${escapeHtml(farm.name)}</strong>${
                  farm.location
                    ? `<br/><span style="color:#64748b">${escapeHtml(farm.location)}</span>`
                    : ""
                }</div>`
              )
            )
            .addTo(map);
          markersRef.current.set(farm.id, marker);
        }
        const el = marker.getElement();
        el.innerHTML = `
          <div class="farm-marker ${isActive ? "farm-marker-active" : ""}">
            ${isActive ? '<span class="farm-marker-pulse"></span>' : ""}
            <span class="farm-marker-dot"></span>
            <span class="farm-marker-label">${escapeHtml(farm.name)}</span>
          </div>
        `;
      }
    };

    if (map.isStyleLoaded()) sync();
    else map.once("load", sync);
  }, [farms, activeFarmIds]);

  // ── Fly to selected farm ──────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || selectedFarmId == null) return;
    const farm = farms.find((f) => f.id === selectedFarmId);
    if (!farm || farm.latitude == null || farm.longitude == null) return;
    map.flyTo({
      center: [Number(farm.longitude), Number(farm.latitude)],
      zoom: Math.max(map.getZoom(), 13),
      speed: 1.2,
      curve: 1.4,
      essential: true,
    });
    for (const [id, marker] of markersRef.current) {
      const popup = marker.getPopup();
      if (id === selectedFarmId) {
        if (popup && !popup.isOpen()) marker.togglePopup();
      } else if (popup?.isOpen()) {
        marker.togglePopup();
      }
    }
  }, [selectedFarmId, farms]);

  // ── Diagram element markers ───────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const sync = () => {
      const currentIds = new Set((diagram?.elements ?? []).map((e) => e.id));

      // Remove stale markers.
      for (const [id, marker] of diagramMarkersRef.current) {
        if (!currentIds.has(id)) { marker.remove(); diagramMarkersRef.current.delete(id); }
      }

      // Add/update markers.
      for (const element of diagram?.elements ?? []) {
        const isConnectingFrom = connectingFromId === element.id;
        const isSelected = selectedElementId === element.id;
        const cfg = ELEMENT_CFG[element.type];

        let marker = diagramMarkersRef.current.get(element.id);

        if (!marker) {
          const el = document.createElement("div");
          el.addEventListener("click", (evt) => {
            evt.stopPropagation();
            onElementClickRef.current?.(element.id);
          });
          marker = new maplibregl.Marker({
            element: el,
            anchor: "center",
            draggable: !!editMode,
          })
            .setLngLat([element.lng, element.lat])
            .addTo(map);

          marker.on("dragend", () => {
            const ll = marker!.getLngLat();
            onElementMoveRef.current?.(element.id, ll.lat, ll.lng);
          });

          diagramMarkersRef.current.set(element.id, marker);
        }

        // Update draggable when edit mode changes.
        marker.setDraggable(!!editMode);

        // Re-render inner HTML (SVGs are hardcoded — safe to inject directly).
        const el = marker.getElement();
        const classes = [
          "diagram-el",
          isSelected ? "selected" : "",
          isConnectingFrom ? "connecting-from" : "",
        ]
          .filter(Boolean)
          .join(" ");

        el.innerHTML = `
          <div class="${classes}">
            <div class="diagram-el-dot" style="background:${cfg.gradient}">
              ${cfg.svg}
            </div>
            <div class="diagram-el-label">${escapeHtml(element.label || cfg.label)}</div>
          </div>
        `;
      }
    };

    if (map.isStyleLoaded()) sync();
    else map.once("load", sync);
  }, [diagram, editMode, connectingFromId, selectedElementId]);

  // ── Connection lines ──────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !connSourceReadyRef.current) return;

    const elementMap = new Map<string, DiagramElement>(
      (diagram?.elements ?? []).map((e) => [e.id, e])
    );

    const features: GeoJSON.Feature[] = (diagram?.connections ?? [])
      .map((conn) => {
        const from = elementMap.get(conn.from);
        const to = elementMap.get(conn.to);
        if (!from || !to) return null;
        return {
          type: "Feature" as const,
          properties: { connType: conn.type, id: conn.id },
          geometry: {
            type: "LineString" as const,
            coordinates: [
              [from.lng, from.lat],
              [to.lng, to.lat],
            ],
          },
        };
      })
      .filter(Boolean) as GeoJSON.Feature[];

    const source = map.getSource(CONN_SOURCE) as maplibregl.GeoJSONSource | undefined;
    source?.setData({ type: "FeatureCollection", features });
  }, [diagram]);

  // Retry connection line update once source is ready (handles initial load timing).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handler = () => {
      const elementMap = new Map<string, DiagramElement>(
        (diagram?.elements ?? []).map((e) => [e.id, e])
      );
      const features: GeoJSON.Feature[] = (diagram?.connections ?? [])
        .map((conn) => {
          const from = elementMap.get(conn.from);
          const to = elementMap.get(conn.to);
          if (!from || !to) return null;
          return {
            type: "Feature" as const,
            properties: { connType: conn.type, id: conn.id },
            geometry: {
              type: "LineString" as const,
              coordinates: [[from.lng, from.lat], [to.lng, to.lat]],
            },
          };
        })
        .filter(Boolean) as GeoJSON.Feature[];
      const source = map.getSource(CONN_SOURCE) as maplibregl.GeoJSONSource | undefined;
      source?.setData({ type: "FeatureCollection", features });
    };
    map.on("load", handler);
    return () => { map.off("load", handler); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
