/**
 * GOOGLE MAPS FRONTEND INTEGRATION - ESSENTIAL GUIDE
 *
 * USAGE FROM PARENT COMPONENT:
 * ======
 *
 * const mapRef = useRef<google.maps.Map | null>(null);
 *
 * <MapView
 *   initialCenter={{ lat: 40.7128, lng: -74.0060 }}
 *   initialZoom={15}
 *   onMapReady={(map) => {
 *     mapRef.current = map; // Store to control map from parent anytime, google map itself is in charge of the re-rendering, not react state.
 * </MapView>
 *
 * ======
 * Available Libraries and Core Features:
 * -------------------------------
 * 📍 MARKER (from `marker` library)
 * - Attaches to map using { map, position }
 * new google.maps.marker.AdvancedMarkerElement({
 *   map,
 *   position: { lat: 37.7749, lng: -122.4194 },
 *   title: "San Francisco",
 * });
 *
 * -------------------------------
 * 🏢 PLACES (from `places` library)
 * - Does not attach directly to map; use data with your map manually.
 * const place = new google.maps.places.Place({ id: PLACE_ID });
 * await place.fetchFields({ fields: ["displayName", "location"] });
 * map.setCenter(place.location);
 * new google.maps.marker.AdvancedMarkerElement({ map, position: place.location });
 *
 * -------------------------------
 * 🧭 GEOCODER (from `geocoding` library)
 * - Standalone service; manually apply results to map.
 * const geocoder = new google.maps.Geocoder();
 * geocoder.geocode({ address: "New York" }, (results, status) => {
 *   if (status === "OK" && results[0]) {
 *     map.setCenter(results[0].geometry.location);
 *     new google.maps.marker.AdvancedMarkerElement({
 *       map,
 *       position: results[0].geometry.location,
 *     });
 *   }
 * });
 *
 * -------------------------------
 * 📐 GEOMETRY (from `geometry` library)
 * - Pure utility functions; not attached to map.
 * const dist = google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
 *
 * -------------------------------
 * 🛣️ ROUTES (from `routes` library)
 * - Combines DirectionsService (standalone) + DirectionsRenderer (map-attached)
 * const directionsService = new google.maps.DirectionsService();
 * const directionsRenderer = new google.maps.DirectionsRenderer({ map });
 * directionsService.route(
 *   { origin, destination, travelMode: "DRIVING" },
 *   (res, status) => status === "OK" && directionsRenderer.setDirections(res)
 * );
 *
 * -------------------------------
 * 🌦️ MAP LAYERS (attach directly to map)
 * - new google.maps.TrafficLayer().setMap(map);
 * - new google.maps.TransitLayer().setMap(map);
 * - new google.maps.BicyclingLayer().setMap(map);
 *
 * -------------------------------
 * ✅ SUMMARY
 * - “map-attached” → AdvancedMarkerElement, DirectionsRenderer, Layers.
 * - “standalone” → Geocoder, DirectionsService, DistanceMatrixService, ElevationService.
 * - “data-only” → Place, Geometry utilities.
 */

/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState } from "react";
import { usePersistFn } from "@/hooks/usePersistFn";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: typeof google;
  }
}

const API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
const FORGE_BASE_URL =
  import.meta.env.VITE_FRONTEND_FORGE_API_URL ||
  "https://forge.butterfly-effect.dev";
const MAPS_PROXY_URL = `${FORGE_BASE_URL}/v1/maps/proxy`;

function loadMapScript() {
  return new Promise<void>((resolve, reject) => {
    if (!API_KEY) {
      reject(new Error("Google Maps API key is not configured"));
      return;
    }
    const script = document.createElement("script");
    script.src = `${MAPS_PROXY_URL}/maps/api/js?key=${API_KEY}&v=weekly&libraries=marker,places,geocoding,geometry`;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      resolve();
      script.remove(); // Clean up immediately
    };
    script.onerror = () => {
      reject(new Error("Google Maps script failed to load"));
    };
    document.head.appendChild(script);
  });
}

interface MapViewProps {
  className?: string;
  initialCenter?: google.maps.LatLngLiteral;
  initialZoom?: number;
  onMapReady?: (map: google.maps.Map) => void;
  onMapError?: (error: Error) => void;
  fallbackMode?: "roadmap" | "satellite";
  fallbackCenter?: google.maps.LatLngLiteral;
  fallbackZoom?: number;
}

export function MapView({
  className,
  initialCenter = { lat: 37.7749, lng: -122.4194 },
  initialZoom = 12,
  onMapReady,
  onMapError,
  fallbackMode = "roadmap",
  fallbackCenter = initialCenter,
  fallbackZoom = initialZoom,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  const init = usePersistFn(async () => {
    try {
      await loadMapScript();
    } catch (error) {
      const reason = error instanceof Error ? error : new Error("Map provider unavailable");
      setMapError(reason.message);
      onMapError?.(reason);
      return;
    }
    if (!mapContainer.current) {
      console.error("Map container not found");
      return;
    }
    if (!window.google?.maps) {
      const reason = new Error("Map provider unavailable");
      setMapError(reason.message);
      onMapError?.(reason);
      return;
    }
    map.current = new window.google.maps.Map(mapContainer.current, {
      zoom: initialZoom,
      center: initialCenter,
      mapTypeControl: false,
      fullscreenControl: true,
      zoomControl: false,
      streetViewControl: false,
      mapId: "DEMO_MAP_ID",
    });
    if (onMapReady) {
      onMapReady(map.current);
    }
  });

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div ref={mapContainer} className={cn("relative w-full h-[500px] overflow-hidden", className)}>
      {mapError && (
        <div className="absolute inset-0 overflow-hidden bg-[#182f3e]" aria-label="Map provider unavailable">
          {fallbackMode === "satellite" ? (
            <img
              key={`${fallbackMode}-${fallbackCenter.lat}-${fallbackCenter.lng}-${fallbackZoom}`}
              src={getFallbackSatelliteUrl(fallbackCenter, fallbackZoom)}
              alt="Satellite map preview"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-80"
            />
          ) : (
            <iframe
              title="OpenStreetMap"
              key={`${fallbackMode}-${fallbackCenter.lat}-${fallbackCenter.lng}-${fallbackZoom}`}
              src={getFallbackMapUrl(fallbackCenter, fallbackZoom)}
              className="pointer-events-none absolute inset-0 h-full w-full border-0 opacity-80"
            />
          )}
          {fallbackMode === "roadmap" && <div className="pointer-events-none absolute left-0 top-0 h-20 w-20 bg-[#182f3e]/80" />}
          <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(148,196,207,.15)_1px,transparent_1px),linear-gradient(90deg,rgba(148,196,207,.15)_1px,transparent_1px)] [background-size:72px_72px]" />
          <div className="absolute -left-[8%] top-[18%] h-[35%] w-[50%] rotate-[-9deg] rounded-[48%_52%_45%_55%] bg-[#789b88]/45 blur-[1px]" />
          <div className="absolute right-[-5%] top-[8%] h-[65%] w-[44%] rotate-[14deg] rounded-[55%_45%_48%_52%] bg-[#799984]/35 blur-[1px]" />
          <div className="absolute bottom-[-20%] left-[28%] h-[56%] w-[35%] rotate-[18deg] rounded-[46%_54%_50%_50%] bg-[#88a38a]/30" />
          <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(24deg,transparent_47%,rgba(244,226,174,.35)_48%,rgba(244,226,174,.35)_49%,transparent_50%),linear-gradient(112deg,transparent_48%,rgba(244,226,174,.25)_49%,transparent_50%)] [background-size:230px_180px,310px_250px]" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 rounded-full border border-white/25 bg-[#102331]/75 px-4 py-2 text-center shadow-xl backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200">Map preview</p>
            <p className="mt-1 text-[10px] text-slate-400">{fallbackMode === "satellite" ? "Esri World Imagery preview" : "OpenStreetMap preview"}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function getFallbackMapUrl(center: google.maps.LatLngLiteral, zoom: number) {
  const { west, south, east, north } = getFallbackBounds(center, zoom);
  const bbox = [west, south, east, north].map((value) => value.toFixed(5)).join("%2C");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`;
}

function getFallbackSatelliteUrl(center: google.maps.LatLngLiteral, zoom: number) {
  const { west, south, east, north } = getFallbackBounds(center, zoom);
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${west},${south},${east},${north}&bboxSR=4326&imageSR=4326&size=1600,1000&format=jpg&f=image`;
}

function getFallbackBounds(center: google.maps.LatLngLiteral, zoom: number) {
  const longitudeSpan = Math.min(360, 360 / 2 ** Math.max(0, zoom - 1));
  const latitudeSpan = Math.min(170, longitudeSpan * 0.56);
  const west = center.lng - longitudeSpan / 2;
  const east = center.lng + longitudeSpan / 2;
  const south = Math.max(-85, center.lat - latitudeSpan / 2);
  const north = Math.min(85, center.lat + latitudeSpan / 2);
  return { west, south, east, north };
}
