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
  Zone,
} from "@/lib/types";
import { ELEMENT_CFG } from "@/lib/diagramConfig";

// Satellite imagery + a transparent place-name/boundary overlay on top (a
// "hybrid" view, like Google Maps' satellite mode) — Esri's World Imagery and
// reference services are free and don't need an API key, unlike Mapbox/Google
// satellite tiles.
const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    satellite: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Esri, Maxar, Earthstar Geographics",
    },
    "satellite-labels": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
    },
  },
  layers: [
    { id: "satellite", type: "raster", source: "satellite" },
    { id: "satellite-labels", type: "raster", source: "satellite-labels" },
  ],
};
const DEFAULT_CENTER: [number, number] = [73.8567, 18.5204];
const CONN_SOURCE = "diagram-connections";
const BOUNDARY_SOURCE = "diagram-boundary";
const ZONES_SOURCE = "diagram-zones";
const DEFAULT_ZONE_COLOR = "#16a34a";

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
  // irrigation zones — each one's own plotted polygon, colored per zone
  zones?: Zone[];
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
  zones,
}: FarmsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<number, maplibregl.Marker>>(new Map());
  const diagramMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const connSourceReadyRef = useRef(false);
  const boundarySourceReadyRef = useRef(false);
  const zonesSourceReadyRef = useRef(false);

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

      // Farm boundary — a fill+outline once closed (>=3 points), or a plain
      // line/dots while still being plotted.
      map.addSource(BOUNDARY_SOURCE, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "boundary-fill",
        type: "fill",
        source: BOUNDARY_SOURCE,
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: { "fill-color": "#16a34a", "fill-opacity": 0.12 },
      });
      map.addLayer({
        id: "boundary-line",
        type: "line",
        source: BOUNDARY_SOURCE,
        paint: { "line-color": "#16a34a", "line-width": 2.5, "line-dasharray": [2, 1] },
      });
      map.addLayer({
        id: "boundary-points",
        type: "circle",
        source: BOUNDARY_SOURCE,
        filter: ["==", ["geometry-type"], "Point"],
        paint: { "circle-color": "#16a34a", "circle-radius": 5, "circle-stroke-color": "#fff", "circle-stroke-width": 1.5 },
      });
      boundarySourceReadyRef.current = true;
      connSourceReadyRef.current = true;

      // Irrigation zones — each its own colored fill+outline (or line/dots
      // while still being plotted), driven by a per-feature "color" property.
      map.addSource(ZONES_SOURCE, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "zones-fill",
        type: "fill",
        source: ZONES_SOURCE,
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: { "fill-color": ["get", "color"], "fill-opacity": 0.18 },
      });
      map.addLayer({
        id: "zones-line",
        type: "line",
        source: ZONES_SOURCE,
        paint: { "line-color": ["get", "color"], "line-width": 2.5 },
      });
      map.addLayer({
        id: "zones-points",
        type: "circle",
        source: ZONES_SOURCE,
        filter: ["==", ["geometry-type"], "Point"],
        paint: { "circle-color": ["get", "color"], "circle-radius": 5, "circle-stroke-color": "#fff", "circle-stroke-width": 1.5 },
      });
      zonesSourceReadyRef.current = true;
    });

    // Map click: fire in pin mode (GPS setting) or when an element tool is active.
    map.on("click", (e) => {
      if (pinModeRef.current) {
        onMapClickRef.current?.(e.lngLat.lat, e.lngLat.lng);
        return;
      }
      if (!editModeRef.current) return;
      const tool = activeToolRef.current;
      if (tool === "boundary" || tool === "zone" || (tool && ELEMENT_TOOLS.includes(tool as DiagramElementType))) {
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

  // ── Farm boundary ──────────────────────────────────────────────────────────
  function boundaryFeatures(): GeoJSON.Feature[] {
    const points = diagram?.boundary ?? [];
    if (points.length === 0) return [];
    const coords = points.map((p) => [p.lng, p.lat]);
    const features: GeoJSON.Feature[] = [];
    if (points.length >= 3) {
      features.push({
        type: "Feature",
        properties: {},
        geometry: { type: "Polygon", coordinates: [[...coords, coords[0]]] },
      });
    } else if (points.length === 2) {
      features.push({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: coords },
      });
    }
    // Always show each plotted point as a dot too, so it's clear where taps landed.
    for (const p of points) {
      features.push({
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
      });
    }
    return features;
  }

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !boundarySourceReadyRef.current) return;
    const source = map.getSource(BOUNDARY_SOURCE) as maplibregl.GeoJSONSource | undefined;
    source?.setData({ type: "FeatureCollection", features: boundaryFeatures() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagram?.boundary]);

  // Retry boundary update once source is ready (handles initial load timing).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handler = () => {
      const source = map.getSource(BOUNDARY_SOURCE) as maplibregl.GeoJSONSource | undefined;
      source?.setData({ type: "FeatureCollection", features: boundaryFeatures() });
    };
    map.on("load", handler);
    return () => { map.off("load", handler); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Irrigation zone polygons ─────────────────────────────────────────────
  function zoneFeatures(): GeoJSON.Feature[] {
    const features: GeoJSON.Feature[] = [];
    for (const zone of zones ?? []) {
      const points = zone.boundary ?? [];
      if (points.length === 0) continue;
      const color = zone.color || DEFAULT_ZONE_COLOR;
      const coords = points.map((p) => [p.lng, p.lat]);
      if (points.length >= 3) {
        features.push({
          type: "Feature",
          properties: { color, zoneId: zone.id },
          geometry: { type: "Polygon", coordinates: [[...coords, coords[0]]] },
        });
      } else if (points.length === 2) {
        features.push({
          type: "Feature",
          properties: { color, zoneId: zone.id },
          geometry: { type: "LineString", coordinates: coords },
        });
      }
      for (const p of points) {
        features.push({
          type: "Feature",
          properties: { color, zoneId: zone.id },
          geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        });
      }
    }
    return features;
  }

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !zonesSourceReadyRef.current) return;
    const source = map.getSource(ZONES_SOURCE) as maplibregl.GeoJSONSource | undefined;
    source?.setData({ type: "FeatureCollection", features: zoneFeatures() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zones]);

  // Retry zones update once source is ready (handles initial load timing).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handler = () => {
      const source = map.getSource(ZONES_SOURCE) as maplibregl.GeoJSONSource | undefined;
      source?.setData({ type: "FeatureCollection", features: zoneFeatures() });
    };
    map.on("load", handler);
    return () => { map.off("load", handler); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
