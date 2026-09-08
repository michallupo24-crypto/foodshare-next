"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/lib/supabase";

const CITY_COORDS: Record<string, [number, number]> = {
  "Tel Aviv": [32.0853, 34.7818],
  Jerusalem: [31.7683, 35.2137],
  Haifa: [32.794, 34.9896],
  Beersheba: [31.253, 34.7915],
};
const CITY_LABELS: Record<string, string> = {
  "Tel Aviv": "תל אביב",
  Jerusalem: "ירושלים",
  Haifa: "חיפה",
  Beersheba: "באר שבע",
};

export default function MapPage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<import("leaflet").CircleMarker[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from("food_items")
      .select("pickup_city")
      .gte("expiry_date", today)
      .then(({ data }) => {
        const c: Record<string, number> = {};
        for (const row of data ?? []) {
          c[row.pickup_city] = (c[row.pickup_city] ?? 0) + 1;
        }
        setCounts(c);
      });
  }, []);

  // create the map exactly once
  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !mapContainerRef.current || mapInstanceRef.current) return;
      const map = L.map(mapContainerRef.current).setView([31.9, 34.9], 8);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);
      mapInstanceRef.current = map;
    });
    return () => {
      cancelled = true;
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // (re)draw markers whenever counts change, without touching the map itself
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import("leaflet").then((L) => {
      const map = mapInstanceRef.current;
      if (!map) return;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      for (const [city, [lat, lon]] of Object.entries(CITY_COORDS)) {
        const count = counts[city] ?? 0;
        const radius = 8 + count * 4;
        const marker = L.circleMarker([lat, lon], {
          radius,
          color: "#3e6b4a",
          fillColor: "#3e6b4a",
          fillOpacity: 0.5,
        }).addTo(map);
        marker.bindPopup(
          `<strong>${CITY_LABELS[city]}</strong><br/>${count} מוצרים זמינים<br/><a href="/board?city=${encodeURIComponent(city)}">לצפייה בלוח</a>`
        );
        markersRef.current.push(marker);
      }
    });
  }, [counts]);

  return (
    <div>
      <h2 className="text-3xl mb-4">מפת זמינות</h2>
      <div ref={mapContainerRef} className="h-[500px] rounded-2xl border border-[var(--ink-border)]" />
    </div>
  );
}
