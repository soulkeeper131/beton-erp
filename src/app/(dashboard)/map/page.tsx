"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

interface Site {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export default function MapPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSite, setSelectedSite] = useState<number | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    fetch("/api/sites/map")
      .then(r => r.json())
      .then(data => {
        setSites(data);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (sites.length === 0 || !mapContainerRef.current) return;

    // Dynamic import of Leaflet
    const L = require("leaflet");
    require("leaflet/dist/leaflet.css");

    // Fix default marker icon
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    });

    if (mapRef.current) {
      mapRef.current.remove();
    }

    const map = L.map(mapContainerRef.current).setView([42.6977, 23.3219], 7);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const bounds: [number, number][] = [];

    sites.forEach(site => {
      const marker = L.marker([site.latitude, site.longitude])
        .addTo(map)
        .bindPopup(`
          <strong>${site.name}</strong><br/>
          ${site.address}<br/>
          <a href="/sites/${site.id}" style="color:#f97316;">Към обекта →</a>
        `);

      if (selectedSite === site.id) {
        marker.openPopup();
      }

      bounds.push([site.latitude, site.longitude]);
    });

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 15);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [sites, selectedSite]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">🗺️ Карта на обектите</h1>
        <div className="text-center py-16 text-muted-foreground bg-muted/50 rounded-lg">
          <p className="text-lg">Няма обекти с GPS координати</p>
          <p className="text-sm mt-2">
            Добавете координати при{" "}
            <Link href="/sites" className="text-primary underline">
              редактиране на обект
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">
          🗺️ Карта на обектите{" "}
          <span className="text-sm font-normal text-muted-foreground">
            ({sites.length} обекта)
          </span>
        </h1>
      </div>

      {/* Site list buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedSite(null)}
          className={`px-3 py-1 rounded-md text-sm transition-colors ${
            selectedSite === null
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80"
          }`}
        >
          Всички
        </button>
        {sites.map(site => (
          <button
            key={site.id}
            onClick={() => setSelectedSite(selectedSite === site.id ? null : site.id)}
            className={`px-3 py-1 rounded-md text-sm transition-colors ${
              selectedSite === site.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            {site.name}
          </button>
        ))}
      </div>

      {/* Map */}
      <div
        ref={mapContainerRef}
        className="w-full rounded-lg border overflow-hidden"
        style={{ height: "calc(100vh - 250px)", minHeight: "400px" }}
      />
    </div>
  );
}
