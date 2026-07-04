"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Trash2, Loader2, MapPin } from "lucide-react";
import { useIsAdmin } from "@/lib/use-is-admin";

type Photo = {
  id: number;
  filename: string;
  caption: string | null;
  latitude: number | null;
  longitude: number | null;
  uploadedAt: string;
};

type GeoInfo = {
  displayName: string;
  road: string;
  city: string;
  country: string;
};

type Props = {
  pouringId?: string;
  siteId?: string;
};

function MapThumbnail({ lat, lng }: { lat: number; lng: number }) {
  const zoom = 16;
  const size = "300x150";
  const marker = `${lat},${lng}`;
  // OpenStreetMap static map via a free tile service
  const src = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=${zoom}&size=${size}&markers=${marker},red-pushpin`;

  return (
    <img
      src={src}
      alt="Локация"
      className="w-full h-24 object-cover rounded mt-1"
      loading="lazy"
    />
  );
}

export function PhotoGallery({ pouringId, siteId }: Props) {
  const isAdmin = useIsAdmin();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [geoCache, setGeoCache] = useState<Record<string, GeoInfo | null>>({});
  const [loadingGeo, setLoadingGeo] = useState<Record<string, boolean>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const loadPhotos = async () => {
    const param = pouringId ? `pouringId=${pouringId}` : `siteId=${siteId}`;
    const res = await fetch(`/api/photos?${param}`);
    if (res.ok) {
      const data = await res.json();
      setPhotos(data);
    }
    setLoading(false);
  };

  useEffect(() => { loadPhotos(); }, [pouringId, siteId]);

  const fetchGeo = useCallback(async (lat: number, lng: number) => {
    const key = `${lat},${lng}`;
    if (geoCache[key] !== undefined) return;
    setLoadingGeo(prev => ({ ...prev, [key]: true }));
    try {
      const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
      if (res.ok) {
        const json = await res.json();
        setGeoCache(prev => ({ ...prev, [key]: json }));
      } else {
        setGeoCache(prev => ({ ...prev, [key]: null }));
      }
    } catch {
      setGeoCache(prev => ({ ...prev, [key]: null }));
    }
    setLoadingGeo(prev => ({ ...prev, [key]: false }));
  }, [geoCache]);

  // Lazy-load geocode for photos with GPS
  useEffect(() => {
    photos.forEach(p => {
      if (p.latitude && p.longitude) {
        fetchGeo(p.latitude, p.longitude);
      }
    });
  }, [photos, fetchGeo]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    if (pouringId) fd.append("pouringId", pouringId);
    if (siteId) fd.append("siteId", siteId);
    await fetch("/api/photos", { method: "POST", body: fd });
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    loadPhotos();
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/photos?id=${id}`, { method: "DELETE" });
    loadPhotos();
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">🖼️ Снимки ({photos.length})</CardTitle>
        {isAdmin && (
          <div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Camera className="h-4 w-4 mr-1" />}
              Качи
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {photos.length === 0 ? (
          <p className="text-muted-foreground text-sm">Няма снимки</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {photos.map(p => {
              const geoKey = `${p.latitude},${p.longitude}`;
              const geo = (p.latitude && p.longitude) ? geoCache[geoKey] : undefined;
              const geoLoading = loadingGeo[geoKey];

              return (
                <div key={p.id} className="relative group border rounded-lg overflow-hidden bg-card">
                  {/* Image */}
                  <img
                    src={`/uploads/${p.filename}`}
                    alt={p.caption || ""}
                    className="w-full h-40 object-cover"
                    loading="lazy"
                  />

                  {/* Info below image */}
                  <div className="p-2">
                    {p.caption && <p className="text-xs font-medium truncate">{p.caption}</p>}

                    {/* GPS location */}
                    {p.latitude && p.longitude && (
                      <div className="mt-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 text-orange-500" />
                          <span>{p.latitude.toFixed(6)}, {p.longitude.toFixed(6)}</span>
                        </div>

                        {/* Address */}
                        {geoLoading ? (
                          <p className="text-xs text-muted-foreground mt-0.5">Зарежда адрес...</p>
                        ) : geo ? (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate" title={geo.displayName}>
                            {[geo.road, geo.city].filter(Boolean).join(", ") || geo.displayName}
                          </p>
                        ) : null}

                        {/* Map thumbnail */}
                        {p.latitude && p.longitude && (
                          <MapThumbnail lat={p.latitude} lng={p.longitude} />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Delete button */}
                  {isAdmin && (
                    <button
                      className="absolute top-2 right-2 bg-destructive text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDelete(p.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
