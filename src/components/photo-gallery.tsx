"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Trash2, Loader2 } from "lucide-react";
import { useIsAdmin } from "@/lib/use-is-admin";

type Photo = {
  id: number;
  filename: string;
  caption: string | null;
  uploadedAt: string;
};

type Props = {
  pouringId?: string;
  siteId?: string;
};

export function PhotoGallery({ pouringId, siteId }: Props) {
  const isAdmin = useIsAdmin();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadPhotos = async () => {
    const param = pouringId ? `pouringId=${pouringId}` : `siteId=${siteId}`;
    const res = await fetch(`/api/photos?${param}`);
    if (res.ok) setPhotos(await res.json());
    setLoading(false);
  };

  useEffect(() => { loadPhotos(); }, [pouringId, siteId]);

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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map(p => (
              <div key={p.id} className="relative group">
                <img
                  src={`/uploads/${p.filename}`}
                  alt={p.caption || ""}
                  className="w-full h-32 object-cover rounded-lg"
                  loading="lazy"
                />
                {p.caption && <p className="text-xs mt-1 text-muted-foreground truncate">{p.caption}</p>}
                {isAdmin && (
                  <button
                    className="absolute top-1 right-1 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDelete(p.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
