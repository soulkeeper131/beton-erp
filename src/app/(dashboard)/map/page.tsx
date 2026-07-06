"use client";

import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";

interface SiteMarker {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export default function MapPage() {
  const [markers, setMarkers] = useState<SiteMarker[]>([]);
  const [selected, setSelected] = useState<SiteMarker | null>(null);

  useEffect(() => {
    fetch("/api/sites/map")
      .then((r) => r.json())
      .then(setMarkers);
  }, []);

  useEffect(() => {
    if (markers.length === 0) return;

    // Dynamically import Leaflet (SSR-safe)
    import("leaflet").then((L) => {
      // Fix default icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const container = document.getElementById("map");
      if (!container || (container as any)._leaflet_id) return;

      const map = L.map("map").setView([42.7, 23.3], 8);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const bounds = L.latLngBounds([]);

      markers.forEach((m) => {
        const marker = L.marker([m.latitude, m.longitude]).addTo(map);
        marker.bindPopup(
          `<strong>${m.name}</strong><br/>${m.address}<br/><a href="/sites/${m.id}">Отвори обект</a>`
        );
        bounds.extend([m.latitude, m.longitude]);
      });

      if (markers.length > 1) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      } else if (markers.length === 1) {
        map.setView([markers[0].latitude, markers[0].longitude], 15);
      }
    });
  }, [markers]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">🗺️ Карта на обектите</h1>

      {markers.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">Няма обекти с координати</p>
          <p className="text-sm">
            Добавете координати от страницата на обекта (Обекти → изберете обект →
            Редактирай)
          </p>
        </div>
      ) : (
        <>
          <div id="map" style={{ height: "70vh", borderRadius: "12px" }} />

          <div className="mt-4 flex flex-wrap gap-2">
            {markers.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelected(m)}
                className={`px-3 py-2 rounded-lg text-sm transition ${
                  selected?.id === m.id
                    ? "bg-orange-500 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                📍 {m.name}
              </button>
            ))}
          </div>

          {selected && (
            <div className="mt-4 p-4 bg-gray-800 rounded-lg">
              <h3 className="font-bold text-lg">{selected.name}</h3>
              <p className="text-gray-400">{selected.address}</p>
              <p className="text-gray-500 text-sm">
                📍 {selected.latitude.toFixed(6)},{" "}
                {selected.longitude.toFixed(6)}
              </p>
              <a
                href={`/sites/${selected.id}`}
                className="text-orange-400 text-sm hover:underline"
              >
                Отвори обект →
              </a>
            </div>
          )}
        </>
      )}
    </div>
  );
}
