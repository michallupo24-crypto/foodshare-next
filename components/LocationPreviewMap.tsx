"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

// visual confirmation of the exact spot that was just captured - no
// reverse-geocoding API involved (none is used anywhere in this app by
// design), just a marker on the map at the raw coordinates so the person
// can see for themselves "yes, that's where I am" instead of trusting a
// generic "location shared" text message
export default function LocationPreviewMap({ lat, lon }: { lat: number; lon: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current) return;
      if (mapRef.current) {
        mapRef.current.setView([lat, lon], 15);
        L.marker([lat, lon]).addTo(mapRef.current);
        return;
      }
      const map = L.map(containerRef.current).setView([lat, lon], 15);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);
      L.marker([lat, lon]).addTo(map);
      mapRef.current = map;
    });
    return () => {
      cancelled = true;
    };
  }, [lat, lon]);

  useEffect(
    () => () => {
      mapRef.current?.remove();
      mapRef.current = null;
    },
    []
  );

  return <div ref={containerRef} className="h-40 rounded-xl border border-[var(--ink-border)] mt-1" />;
}
