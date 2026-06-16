"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Farm } from "@/lib/types";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
// Default center: Pune, Maharashtra (used when no farm has GPS coordinates yet).
const DEFAULT_CENTER: [number, number] = [73.8567, 18.5204];

interface FarmsMapProps {
  farms: Farm[];
  activeFarmIds: Set<number>;
  selectedFarmId?: number | null;
  onSelectFarm?: (farmId: number) => void;
}

export default function FarmsMap({ farms, activeFarmIds, selectedFarmId, onSelectFarm }: FarmsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<number, maplibregl.Marker>>(new Map());
  const onSelectRef = useRef(onSelectFarm);
  onSelectRef.current = onSelectFarm;

  // Initialize the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const located = farms.filter((f) => f.latitude != null && f.longitude != null);
    const center: [number, number] =
      located.length > 0 ? [Number(located[0].longitude), Number(located[0].latitude)] : DEFAULT_CENTER;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center,
      zoom: located.length > 0 ? 11 : 6,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep markers in sync with farms / active status.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const syncMarkers = () => {
      const presentIds = new Set(farms.map((f) => f.id));
      for (const [id, marker] of markersRef.current) {
        if (!presentIds.has(id)) {
          marker.remove();
          markersRef.current.delete(id);
        }
      }

      for (const farm of farms) {
        if (farm.latitude == null || farm.longitude == null) continue;
        const isActive = activeFarmIds.has(farm.id);
        let marker = markersRef.current.get(farm.id);

        if (!marker) {
          const el = document.createElement("div");
          el.className = "farm-marker-wrapper";
          el.addEventListener("click", () => onSelectRef.current?.(farm.id));
          marker = new maplibregl.Marker({ element: el, anchor: "center" })
            .setLngLat([Number(farm.longitude), Number(farm.latitude)])
            .setPopup(
              new maplibregl.Popup({ offset: 16, closeButton: false }).setHTML(
                `<div style="font-size:13px;font-family:inherit"><strong>${escapeHtml(farm.name)}</strong>${
                  farm.location ? `<br/><span style="color:#64748b">${escapeHtml(farm.location)}</span>` : ""
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

    if (map.isStyleLoaded()) syncMarkers();
    else map.once("load", syncMarkers);
  }, [farms, activeFarmIds]);

  // Fly to the selected farm and open its popup.
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

  return <div ref={containerRef} className="w-full h-full" />;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
