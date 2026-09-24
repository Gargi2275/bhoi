import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Newspaper, Loader2, X, Check } from "lucide-react";
import { PageWrap } from "@/components/wag/PageWrap";
import { AnimatedCard, Modal } from "@/components/wag/primitives";
import { cn, hasPermission } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { api, getImageUrl } from "@/lib/api";
import { useModulePermissions } from "./community-admin";

const NEWS_CATEGORIES = ["Meeting Notice", "Achievement", "Alert", "General", "Cultural", "Sports"];

function blankForm() {
  return { title: "", category: "General", excerpt: "", img: null as File | null, removeImg: false };
}

export const Route = createFileRoute("/community-admin/news")({
  component: () => {
    const { user } = useAuth();
    const perms = useModulePermissions("news");
    const [news, setNews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<any | null>(null);
    const [form, setForm] = useState<any>(blankForm());
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState("");
    const [filterCat, setFilterCat] = useState("All");

    const fetchNews = () => {
      if (!user) return;
      if (!user.communityId && user.role !== "super_admin") {
        setLoading(false);
        return;
      }
      setLoading(true);
      const params = user.communityId ? { communityId: user.communityId } : {};
      api.getNews(params)
        .then(res => setNews(res || []))
        .catch(console.error)
        .finally(() => setLoading(false));
    };

    useEffect(() => { fetchNews(); }, [user]);

    const openCreate = () => { setForm(blankForm()); setEditTarget(null); setOpen(true); };
    const openEdit = (n: any) => {
      setForm({ title: n.title, category: n.category, excerpt: n.excerpt || "", img: null, removeImg: false });
      setEditTarget(n);
      setOpen(true);
    };

    const handleSave = async () => {
      if (!form.title.trim()) return alert("Title is required.");
      setSaving(true);
      try {
        const payload = { ...form, community: user?.communityId };
        if (form.removeImg) {
          payload.img = null;
        } else if (!form.img) {
          delete payload.img;
        }
        delete payload.removeImg;

        if (editTarget) {
          await (api as any).updateNews(editTarget.id, payload);
        } else {
          await (api as any).createNews(payload);
        }
        setOpen(false);
        fetchNews();
      } catch (e: any) { alert(e.message || "Failed to save."); }
      finally { setSaving(false); }
    };

    const handleDelete = async (id: number) => {
      if (!confirm("Delete this announcement?")) return;
      try { await (api as any).deleteNews(id); fetchNews(); }
      catch (e: any) { alert(e.message || "Failed to delete."); }
    };

    const filtered = news.filter(n => {
      const matchCat = filterCat === "All" || n.category === filterCat;
      const matchSearch = (n.title || "").toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });

    const field = (key: string) => (evt: any) => setForm((f: any) => ({ ...f, [key]: evt.target.value }));

    const CATEGORY_COLORS: Record<string, string> = {
      "Meeting Notice": "bg-blue-50 text-blue-700 border-blue-200",
      "Achievement": "bg-teal/10 text-teal border-teal/20",
      "Alert": "bg-red-50 text-red-600 border-red-200",
      "General": "bg-gold-light text-gold border-gold/15",
      "Cultural": "bg-purple-50 text-purple-600 border-purple-200",
      "Sports": "bg-green-50 text-green-600 border-green-200",
    };

    return (
      <PageWrap
        title="News & Announcements"
        desc={`${news.length} posts published`}
        action={
          hasPermission(user, ["Create News"]) && perms.create ? (
            <button onClick={openCreate} className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold flex items-center gap-2 hover:bg-primary/95 transition shadow-sm">
              <Plus className="w-4 h-4" /> Create News
            </button>
          ) : null
        }
      >
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            placeholder="Search announcements…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 rounded-xl border border-warm bg-surface focus:outline-none focus:border-primary text-sm"
          />
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="px-3 py-2 rounded-xl border border-warm bg-surface text-sm">
            <option value="All">All Categories</option>
            {NEWS_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-warm-muted border border-warm rounded-2xl bg-surface">No announcements found.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {filtered.map(n => (
              <AnimatedCard key={n.id} className="overflow-hidden flex flex-col">
                {(n.img || n.img_url) ? (
                  <img src={getImageUrl(n.img || n.img_url)} alt="" className="h-44 w-full object-cover" />
                ) : (
                  <div className="h-44 w-full bg-gradient-to-br from-primary/10 to-gold/10 flex items-center justify-center">
                    <Newspaper className="w-12 h-12 text-primary/20" />
                  </div>
                )}
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[n.category] || "bg-gold-light text-gold border-gold/15"}`}>
                      {n.category}
                    </span>
                    <span className="text-xs text-warm-muted">{n.created_at ? new Date(n.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}</span>
                  </div>
                  <h3 className="font-ui font-bold text-base line-clamp-2">{n.title}</h3>
                  {n.excerpt && <p className="text-sm text-warm-muted mt-1 line-clamp-3 flex-1">{n.excerpt}</p>}
                  <div className="flex gap-2 mt-4 pt-3 border-t border-warm">
                    {hasPermission(user, ["Edit News"]) && perms.edit && (
                      <button onClick={() => openEdit(n)} className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg border border-warm hover:bg-sand transition font-medium">
                        <Edit className="w-3 h-3" /> Edit
                      </button>
                    )}
                    {hasPermission(user, ["Delete News"]) && perms.delete && (
                      <button onClick={() => handleDelete(n.id)} className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition font-medium">
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    )}
                  </div>
                </div>
              </AnimatedCard>
            ))}
          </div>
        )}

        <Modal open={open} onClose={() => setOpen(false)} title={editTarget ? "Edit Post" : "New Announcement"}>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-warm-muted block mb-1">Title *</label>
              <input placeholder="Post title" value={form.title} onChange={field("title")} className="w-full px-3 py-2.5 rounded-lg border border-warm bg-surface text-sm" />
            </div>
            <div>
              <label className="text-xs text-warm-muted block mb-1">Category</label>
              <select value={form.category} onChange={field("category")} className="w-full px-3 py-2.5 rounded-lg border border-warm bg-surface text-sm">
                {NEWS_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-warm-muted block mb-1">Image Photo (Optional)</label>
              {(editTarget?.img || editTarget?.img_url || form.img) && !form.removeImg ? (
                <div className="relative rounded-lg overflow-hidden border border-warm h-36 mb-2 bg-sand/30 flex items-center justify-center group">
                  <img 
                    src={form.img ? URL.createObjectURL(form.img) : getImageUrl(editTarget?.img || editTarget?.img_url)} 
                    alt="Preview" 
                    className="h-full w-full object-cover" 
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setForm((f: any) => ({ ...f, img: null, removeImg: true }));
                      }}
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition flex items-center gap-1 shadow-md"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                    <label className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/95 text-white text-xs font-semibold cursor-pointer transition flex items-center gap-1 shadow-md">
                      <Edit className="w-3.5 h-3.5" /> Change
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setForm((f: any) => ({ ...f, img: file, removeImg: false }));
                        }} 
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-warm rounded-lg p-4 bg-sand/10 hover:bg-sand/20 transition flex flex-col items-center justify-center">
                  <Newspaper className="w-8 h-8 text-warm-muted/50 mb-1" />
                  <span className="text-xs text-warm-muted mb-2">No image uploaded</span>
                  <label className="px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold cursor-pointer transition flex items-center gap-1 shadow-sm">
                    <Plus className="w-3.5 h-3.5" /> Upload Photo
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setForm((f: any) => ({ ...f, img: file, removeImg: false }));
                      }} 
                    />
                  </label>
                </div>
              )}
            </div>
            <div>
              <label className="text-xs text-warm-muted block mb-1">Content / Excerpt</label>
              <textarea rows={4} placeholder="Write your announcement content here…" value={form.excerpt} onChange={field("excerpt")} className="w-full px-3 py-2.5 rounded-lg border border-warm bg-surface text-sm" />
            </div>
            <div className="flex gap-2 pt-2 border-t border-warm">
              <button onClick={() => setOpen(false)} className="flex-1 py-2.5 rounded-xl border border-warm text-sm font-semibold hover:bg-sand transition"><X className="w-4 h-4 inline mr-1" />Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/95 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <Check className="w-4 h-4" /> {editTarget ? "Save" : "Publish"}
              </button>
            </div>
          </div>
        </Modal>
      </PageWrap>
    );
  },
});
