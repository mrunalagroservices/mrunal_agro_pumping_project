"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin } from "lucide-react";

// Same hybrid satellite style as FarmsMap.tsx (Esri free tiles, no API key).
const SATELLITE_MIN_ZOOM = 5;
const SATELLITE_MAX_ZOOM = 18;
const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "zoomed-out-fallback": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Esri",
    },
    satellite: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: SATELLITE_MAX_ZOOM,
      attribution: "Esri, Maxar, Earthstar Geographics",
    },
    "satellite-labels": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: SATELLITE_MAX_ZOOM,
    },
  },
  layers: [
    { id: "zoomed-out-fallback", type: "raster", source: "zoomed-out-fallback", maxzoom: SATELLITE_MIN_ZOOM },
    { id: "satellite", type: "raster", source: "satellite", minzoom: SATELLITE_MIN_ZOOM },
    { id: "satellite-labels", type: "raster", source: "satellite-labels", minzoom: SATELLITE_MIN_ZOOM },
  ],
};
const DEFAULT_CENTER: [number, number] = [73.8567, 18.5204];

interface LocationPickerMapProps {
  lat?: number | null;
  lng?: number | null;
  onChange: (lat: number, lng: number) => void;
  hint?: string;
}

// Drag-the-map-under-a-fixed-pin location picker, the same UX pattern used
// by ride-hailing/delivery apps: the pin stays dead-center of the viewport
// and the map's center coordinate (read on every move) becomes the value.
export default function LocationPickerMap({ lat, lng, onChange, hint }: LocationPickerMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const lastExternalRef = useRef<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const hasInitial = lat != null && lng != null;
    const center: [number, number] = hasInitial ? [lng as number, lat as number] : DEFAULT_CENTER;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center,
      zoom: hasInitial ? 16 : 5,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    const emitCenter = () => {
      const c = map.getCenter();
      lastExternalRef.current = `${c.lat.toFixed(6)},${c.lng.toFixed(6)}`;
      onChangeRef.current(c.lat, c.lng);
    };
    map.on("moveend", emitCenter);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recenter the map when lat/lng change from outside this component (e.g.
  // the "Use current location" button), but not when WE just emitted the
  // same coordinate from a drag (which would fight the user's gesture).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || lat == null || lng == null) return;
    const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    if (lastExternalRef.current === key) return;
    lastExternalRef.current = key;
    map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 15), duration: 500 });
  }, [lat, lng]);

  return (
    <div className="relative w-full h-56 rounded-lg overflow-hidden border border-slate-300">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full pointer-events-none">
        <MapPin className="w-9 h-9 text-red-600 drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)]" strokeWidth={2.5} />
      </div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white/90 text-[11px] font-medium text-slate-700 px-2.5 py-1 rounded-full shadow pointer-events-none whitespace-nowrap">
        {hint || "Drag the map to position the pin"}
      </div>
    </div>
  );
}
