"use client";

import { useEffect, useRef } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";

export type StudentLocation = {
  id: string;
  fullName: string;
  code: string;
  department?: string;
  profileImage?: string;
  lat: number;
  lng: number;
  address?: string;
  status: string;
  checkInTime?: string;
  checkOutTime?: string;
  workMode?: string;
  isLate?: boolean;
};

type StudentLocationMapProps = {
  locations: StudentLocation[];
};

function initials(name: string) {
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function statusClass(location: StudentLocation) {
  if (location.isLate) return "late";
  if (location.status === "checked_out") return "checked-out";
  return "checked-in";
}

function statusLabel(location: StudentLocation) {
  if (location.status === "checked_out") return location.isLate ? "เช็คเอาท์แล้ว · มาสาย" : "เช็คเอาท์แล้ว";
  if (location.status === "checked_in") return location.isLate ? "เช็คอินแล้ว · มาสาย" : "เช็คอินแล้ว";
  return location.status || "-";
}

function buildPopup(location: StudentLocation) {
  const wrapper = document.createElement("div");
  wrapper.className = "student-map-popup";

  const head = document.createElement("div");
  head.className = "student-map-popup-head";

  const avatar = document.createElement("div");
  avatar.className = "student-map-popup-avatar";
  if (location.profileImage) {
    const img = document.createElement("img");
    img.src = location.profileImage;
    img.alt = "";
    avatar.appendChild(img);
  } else {
    avatar.textContent = initials(location.fullName);
  }

  const title = document.createElement("div");
  const name = document.createElement("strong");
  name.textContent = location.fullName;
  const meta = document.createElement("span");
  meta.textContent = `${location.code || "-"} · ${location.department || "-"}`;
  title.append(name, meta);
  head.append(avatar, title);

  const details = document.createElement("dl");
  details.className = "student-map-popup-details";
  [
    ["สถานะ", statusLabel(location)],
    ["เวลาเช็คอิน", location.checkInTime || "-"],
    ["เวลาเช็คเอาท์", location.checkOutTime || "-"],
    ["รูปแบบงาน", location.workMode || "-"],
    ["สถานที่", location.address || "-"],
  ].forEach(([label, value]) => {
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    details.append(dt, dd);
  });

  const link = document.createElement("a");
  link.href = `https://www.google.com/maps?q=${encodeURIComponent(`${location.lat},${location.lng}`)}`;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = "เปิด Google Maps";

  wrapper.append(head, details, link);
  return wrapper;
}

export function StudentLocationMap({ locations }: StudentLocationMapProps) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);

  useEffect(() => {
    const points = locations.filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));
    if (!elRef.current || points.length === 0) return;

    let cancelled = false;

    async function initMap() {
      const L = await import("leaflet");
      if (cancelled || !elRef.current) return;

      if (!mapRef.current) {
        mapRef.current = L.map(elRef.current, {
          zoomControl: true,
          attributionControl: false,
          scrollWheelZoom: false,
          doubleClickZoom: true,
          boxZoom: true,
          keyboard: false,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
        }).addTo(mapRef.current);
      }

      if (layerRef.current) {
        layerRef.current.remove();
      }

      const layer = L.layerGroup().addTo(mapRef.current);
      layerRef.current = layer;

      const bounds = L.latLngBounds(points.map((item) => [item.lat, item.lng]));

      points.forEach((location) => {
        const avatar = location.profileImage
          ? `<img src="${escapeHtml(location.profileImage)}" alt="" />`
          : `<span>${escapeHtml(initials(location.fullName))}</span>`;
        const marker = L.divIcon({
          className: `student-map-marker ${statusClass(location)}`,
          html: avatar,
          iconSize: [46, 46],
          iconAnchor: [23, 23],
          popupAnchor: [0, -24],
        });

        L.marker([location.lat, location.lng], { icon: marker })
          .addTo(layer)
          .bindPopup(buildPopup(location), { minWidth: 260, maxWidth: 320 });
      });

      if (points.length === 1) {
        mapRef.current.setView([points[0].lat, points[0].lng], 16);
      } else {
        mapRef.current.fitBounds(bounds, { padding: [34, 34], maxZoom: 16 });
      }

      setTimeout(() => mapRef.current?.invalidateSize(), 120);
    }

    initMap();

    return () => {
      cancelled = true;
      if (layerRef.current) {
        layerRef.current.remove();
        layerRef.current = null;
      }
    };
  }, [locations]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  if (locations.length === 0) {
    return (
      <div className="student-location-map empty">
        <span>ยังไม่มีพิกัดเช็คอินสำหรับวันนี้</span>
      </div>
    );
  }

  return (
    <div className="student-location-map">
      <div ref={elRef} className="student-location-map-canvas" />
    </div>
  );
}
