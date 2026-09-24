import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Upload, Trash2, Loader2, Image as ImageIcon } from "lucide-react";
import { PageWrap } from "@/components/wag/PageWrap";
import { AnimatedCard } from "@/components/wag/primitives";
import { cn, hasPermission } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { api, getImageUrl } from "@/lib/api";
import { useModulePermissions } from "./community-admin";

export const Route = createFileRoute("/community-admin/gallery")({
  component: CommunityAdminGallery,
});

function CommunityAdminGallery() {
  const { user } = useAuth();
  const perms = useModulePermissions("gallery");
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPhotos = async () => {
    if (!user) return;
    if (!user.communityId && user.role !== "super_admin") {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const endpoint = user.communityId ? `/gallery/?communityId=${user.communityId}` : "/gallery/";
      const res = await apiFetch(endpoint);
      const data = await res.json();
      setPhotos(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, [user]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user?.communityId) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("community", String(user.communityId));
        formData.append("image", file);
        formData.append("title", file.name);
        
        await apiFetch("/gallery/", {
          method: "POST",
          body: formData,
        });
      }
      fetchPhotos();
    } catch (err: any) {
      alert("Failed to upload photos. " + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this photo?")) return;
    try {
      await apiFetch(`/gallery/${id}/`, { method: "DELETE" });
      fetchPhotos();
    } catch (err: any) {
      alert("Failed to delete photo.");
    }
  };

  // Internal apiFetch just for gallery since it's not exported natively from api.ts
  const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem("wag_token");
    const headers: Record<string, string> = {
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> || {}),
    };
    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }
    const res = await fetch(`/api${endpoint}`, { ...options, headers });
    if (!res.ok && res.status !== 204) {
      let msg = "API error";
      try {
        const text = await res.text();
        try {
          msg = JSON.stringify(JSON.parse(text));
        } catch {
          msg = text.slice(0, 150); // Get first 150 chars of HTML/text
        }
      } catch (e) {}
      throw new Error(msg);
    }
    return res;
  };

  return (
    <PageWrap title="Gallery" desc="Community photo albums">
      {hasPermission(user, ["Upload Photos"]) && perms.create && (
        <label className="block border-2 border-dashed border-warm rounded-2xl p-10 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition bg-surface mb-6 relative">
          {uploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-2" />
              <div className="font-medium text-primary">Uploading photos...</div>
            </div>
          ) : (
            <>
              <Upload className="w-10 h-10 mx-auto text-warm-muted" />
              <div className="mt-3 font-medium">Drag photos here or click to upload</div>
              <div className="text-xs text-warm-muted mt-1">JPG, PNG up to 10MB each · Bulk upload supported</div>
              <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleUpload} disabled={uploading} />
            </>
          )}
        </label>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : photos.length === 0 ? (
        <div className="text-center py-16 text-warm-muted border border-warm rounded-2xl bg-surface">No photos in the gallery yet.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map(p => (
            <AnimatedCard key={p.id} className="aspect-square overflow-hidden group relative bg-warm/20">
              {(p.image || p.image_url) ? (
                <img src={getImageUrl(p.image || p.image_url)} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-10 h-10 text-warm-muted" />
                </div>
              )}
              {hasPermission(user, ["Delete Photos"]) && perms.delete && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button 
                    onClick={() => handleDelete(p.id)}
                    className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              )}
            </AnimatedCard>
          ))}
        </div>
      )}
    </PageWrap>
  );
}
