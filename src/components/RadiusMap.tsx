"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";

type RadiusMapProps = {
  lat?: string;
  lng?: string;
  label?: string;
  compact?: boolean;
};

export function RadiusMap({ lat, lng, label, compact }: RadiusMapProps) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (!elRef.current || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    let cancelled = false;

    async function initMap() {
      const L = await import("leaflet");
      if (cancelled || !elRef.current) return;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const map = L.map(elRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: !compact,
        scrollWheelZoom: false,
        doubleClickZoom: !compact,
        boxZoom: !compact,
        keyboard: false,
      }).setView([latitude, longitude], compact ? 17 : 18);

      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        maxZoom: 19,
      }).addTo(map);

      L.circle([latitude, longitude], {
        radius: 100,
        color: "#ef4b22",
        weight: 2,
        opacity: 0.95,
        fillColor: "#ef4b22",
        fillOpacity: 0.14,
      }).addTo(map);

      const marker = L.divIcon({
        className: "radius-map-marker",
        html: `<span></span>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      L.marker([latitude, longitude], { icon: marker })
        .addTo(map)
        .bindTooltip(label || "ตำแหน่งเช็คอิน", { direction: "top", offset: [0, -16] });

      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 120);
    }

    initMap();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [lat, lng, label, compact]);

  if (!lat || !lng) {
    return (
      <div className={compact ? "radius-map compact empty" : "radius-map empty"}>
        <span>ยังไม่มีพิกัดสำหรับแสดงแผนที่</span>
      </div>
    );
  }

  return (
    <div className={compact ? "radius-map compact" : "radius-map"}>
      <div ref={elRef} className="radius-map-canvas" />
      <div className="radius-map-badge">รัศมี 100 เมตร</div>
    </div>
  );
}
