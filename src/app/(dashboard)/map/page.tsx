"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

interface SiteStats {
  offersCount: number;
  offersSent: number;
  offersAccepted: number;
  offersTotal: number;
  pouringsCount: number;
  totalM3: number;
  nextEvent: string | null;
  progress: number;
  progressLabel: string;
}

interface Site {
  id: number;
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  status: string;
  clientName: string | null;
  stats: SiteStats;
}

// Helper to format date
function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("bg-BG");
}

// Determine marker color and icon
function getMarkerStyle(site: Site) {
  if (site.status === "completed") return { color: "#22c55e", icon: "✅", label: "Завършен" };
  if (site.stats.pouringsCount > 0) return { color: "#f97316", icon: "🪣", label: "Активен" };
  if (site.stats.offersCount > 0) return { color: "#3b82f6", icon: "📋", label: "Офериран" };
  if (site.stats.nextEvent) return { color: "#a855f7", icon: "📅", label: "Планиран" };
  return { color: "#6b7280", icon: "📍", label: "Нов" };
}

function ProgressBar({ pct, label }: { pct: number; label: string }) {
  const color = pct >= 100 ? "bg-green-500" : pct >= 50 ? "bg-orange-500" : pct > 0 ? "bg-blue-500" : "bg-gray-300";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">Прогрес</span>
        <span className="font-medium">{label}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.max(pct, 5)}%` }}
        />
      </div>
    </div>
  );
}

// --- Leaflet + CSS loaded dynamically ---
const L_READY = { current: false };
async function ensureLeaflet() {
  if (L_READY.current) return require("leaflet");
  const L = require("leaflet");
  require("leaflet/dist/leaflet.css");
  L_READY.current = true;

  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
  return L;
}

export default function MapPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    fetch("/api/sites/map")
      .then(r => r.json())
      .then(data => {
        setSites(data);
        setLoading(false);
      });
  }, []);

  // Build map
  useEffect(() => {
    if (sites.length === 0 || !mapContainerRef.current) return;

    (async () => {
      const L = await ensureLeaflet();

      if (mapRef.current) {
        mapRef.current.remove();
      }

      const map = L.map(mapContainerRef.current).setView([42.6977, 23.3219], 7);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const bounds: [number, number][] = [];

      // Clear old markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      sites.forEach(site => {
        const style = getMarkerStyle(site);
        const isSelected = selectedSite?.id === site.id;

        // Custom div icon
        const icon = L.divIcon({
          className: "custom-marker",
          html: `<div style="
            background:${style.color};
            width:${isSelected ? "36px" : "28px"};
            height:${isSelected ? "36px" : "28px"};
            border-radius:50%;
            border:3px solid #fff;
            box-shadow:0 2px 6px rgba(0,0,0,0.3);
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:${isSelected ? "18px" : "14px"};
            transition:all 0.2s;
          ">${style.icon}</div>`,
          iconSize: [isSelected ? 36 : 28, isSelected ? 36 : 28],
          iconAnchor: [isSelected ? 18 : 14, isSelected ? 18 : 14],
          popupAnchor: [0, isSelected ? -18 : -14],
        });

        const marker = L.marker([site.latitude, site.longitude], { icon })
          .addTo(map)
          .bindPopup(buildPopup(site), { maxWidth: 320, className: "site-popup" });

        marker.on("click", () => {
          setSelectedSite(site);
        });

        markersRef.current.push(marker);
        bounds.push([site.latitude, site.longitude]);
      });

      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [50, 50] });
      } else if (bounds.length === 1) {
        map.setView(bounds[0], 15);
      }

      // When selectedSite changes from list, fly to marker
      if (selectedSite) {
        map.setView([selectedSite.latitude, selectedSite.longitude], 15, { animate: true });
        // Open the corresponding popup after a short delay
        setTimeout(() => {
          markersRef.current.forEach((m, i) => {
            if (sites[i]?.id === selectedSite.id) m.openPopup();
          });
        }, 500);
      }
    })();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [sites]); // eslint-disable-line

  function buildPopup(site: Site) {
    const s = site.stats;
    const style = getMarkerStyle(site);
    return `
      <div style="font-family:sans-serif;min-width:260px;font-size:13px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <span style="font-size:20px;">${style.icon}</span>
          <div>
            <strong style="font-size:15px;">${site.name}</strong>
            <div style="font-size:11px;color:#666;">${site.city || ""}${site.city && site.address ? ", " : ""}${site.address}</div>
          </div>
        </div>

        <div style="display:inline-block;background:${style.color}15;color:${style.color};padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600;margin-bottom:8px;">
          ${style.label}
        </div>

        <div style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px;">
            <span style="color:#666;">Прогрес</span>
            <span style="font-weight:600;">${s.progressLabel}</span>
          </div>
          <div style="height:6px;background:#e5e7eb;border-radius:99px;overflow:hidden;">
            <div style="width:${Math.max(s.progress, 5)}%;height:100%;border-radius:99px;background:${s.progress >= 100 ? '#22c55e' : s.progress >= 50 ? '#f97316' : s.progress > 0 ? '#3b82f6' : '#d1d5db'};"></div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;font-size:11px;">
          <div style="background:#f9fafb;padding:6px;border-radius:6px;">
            <div style="color:#666;">Оферти</div>
            <div style="font-weight:700;font-size:14px;">${s.offersCount}</div>
            ${s.offersAccepted > 0 ? `<div style="color:#22c55e;">✓ ${s.offersAccepted} приети</div>` : ""}
            ${s.offersTotal > 0 ? `<div style="color:#666;">${s.offersTotal.toFixed(0)} €</div>` : ""}
          </div>
          <div style="background:#f9fafb;padding:6px;border-radius:6px;">
            <div style="color:#666;">Актуване</div>
            <div style="font-weight:700;font-size:14px;">${s.pouringsCount}</div>
            ${s.totalM3 > 0 ? `<div style="color:#666;">${s.totalM3.toFixed(1)} m³</div>` : ""}
          </div>
        </div>

        ${s.nextEvent ? `<div style="font-size:11px;color:#666;margin-bottom:4px;">📅 Следващо: ${fmtDate(s.nextEvent)}</div>` : ""}

        <div style="display:flex;gap:6px;margin-top:4px;">
          <a href="/sites/${site.id}" style="flex:1;text-align:center;background:#f97316;color:#fff;padding:6px;border-radius:6px;text-decoration:none;font-size:12px;font-weight:600;">Детайли</a>
          <a href="/offers/new?siteId=${site.id}" style="flex:1;text-align:center;background:#3b82f6;color:#fff;padding:6px;border-radius:6px;text-decoration:none;font-size:12px;font-weight:600;">Оферта</a>
          <a href="/pourings/new?siteId=${site.id}" style="flex:1;text-align:center;background:#22c55e;color:#fff;padding:6px;border-radius:6px;text-decoration:none;font-size:12px;font-weight:600;">Акт</a>
        </div>
      </div>
    `;
  }

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
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">
          🗺️ Карта на обектите{" "}
          <span className="text-sm font-normal text-muted-foreground">
            ({sites.length} обекта)
          </span>
        </h1>
      </div>

      {/* Site cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sites.map(site => {
          const style = getMarkerStyle(site);
          const s = site.stats;
          const active = selectedSite?.id === site.id;
          return (
            <button
              key={site.id}
              onClick={() => setSelectedSite(active ? null : site)}
              className={`text-left p-3 rounded-lg border transition-all ${
                active
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5"
                  style={{ background: style.color + "20", color: style.color }}
                >
                  {style.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{site.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {site.clientName || site.city || site.address}
                  </div>
                  <div className="mt-2">
                    <ProgressBar pct={s.progress} label={s.progressLabel} />
                  </div>
                  <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                    <span>📋 {s.offersCount}</span>
                    <span>🪣 {s.pouringsCount}</span>
                    {s.totalM3 > 0 && <span>{s.totalM3.toFixed(0)} m³</span>}
                    {s.nextEvent && <span>📅 {fmtDate(s.nextEvent)}</span>}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Map */}
      <style>{`
        .leaflet-pane { z-index: 1 !important; }
        .leaflet-top, .leaflet-bottom { z-index: 2 !important; }
      `}</style>
      <div
        ref={mapContainerRef}
        className="w-full rounded-lg border overflow-hidden"
        style={{ height: "calc(100vh - 380px)", minHeight: "350px" }}
      />
    </div>
  );
}
