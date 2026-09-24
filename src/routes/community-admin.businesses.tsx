import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  Plus, Trash2, Loader2, X, Check, Edit, Star,
  Upload, Image as ImageIcon, MapPin, Phone, MessageCircle,
  Globe, Mail, Calendar, Clock, Eye, AlertCircle
} from "lucide-react";
import { PageWrap } from "@/components/wag/PageWrap";
import { AnimatedCard, Modal, StatusBadge } from "@/components/wag/primitives";
import { cn, hasPermission } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { api, getImageUrl } from "@/lib/api";
import { useModulePermissions } from "./community-admin";

const CATEGORIES = [
  "Food & Bakery", "Manufacturing", "Jewellery", "Healthcare",
  "Textile", "Construction", "Automobile", "Professional",
  "Education", "Technology", "Retail", "Other"
];

const STATUSES = ["PENDING", "VERIFIED", "REJECTED", "SUSPENDED"];

const DEFAULT_HOURS = {
  Monday: "09:00 AM - 07:00 PM",
  Tuesday: "09:00 AM - 07:00 PM",
  Wednesday: "09:00 AM - 07:00 PM",
  Thursday: "09:00 AM - 07:00 PM",
  Friday: "09:00 AM - 07:00 PM",
  Saturday: "09:00 AM - 05:00 PM",
  Sunday: "Closed"
};

function blankForm() {
  return {
    name: "",
    category: "Retail",
    owner: "",
    location: "",
    phone: "",
    desc: "",
    address: "",
    city: "",
    state: "",
    whatsapp: "",
    email: "",
    website: "",
    hours: { ...DEFAULT_HOURS },
    socials: { instagram: "", facebook: "", youtube: "", linkedin: "" },
    gallery: [] as string[],
    status: "PENDING",
    featured: false
  };
}

export const Route = createFileRoute("/community-admin/businesses")({
  component: () => {
    const { user } = useAuth();
    const perms = useModulePermissions("business");
    const [businesses, setBusinesses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<any | null>(null);
    const [form, setForm] = useState<any>(blankForm());
    const [saving, setSaving] = useState(false);

    // File upload state
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
    const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);

    // Form tab navigation
    const [activeTab, setActiveTab] = useState<"basic" | "contact" | "schedule">("basic");

    // Search and filter state
    const [search, setSearch] = useState("");
    const [filterCat, setFilterCat] = useState("All");
    const [filterStatus, setFilterStatus] = useState("All");

    const logoInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    const fetchBusinesses = () => {
      if (!user) return;
      if (!user.communityId && user.role !== "super_admin") {
        setLoading(false);
        return;
      }
      setLoading(true);
      const params = user.communityId ? { community_id: user.communityId } : {};
      api.getBusinesses(params)
        .then(res => setBusinesses(res || []))
        .catch(console.error)
        .finally(() => setLoading(false));
    };

    useEffect(() => { fetchBusinesses(); }, [user]);

    const openCreate = () => {
      setForm(blankForm());
      setEditTarget(null);
      setLogoFile(null);
      setCoverFile(null);
      setLogoPreview(null);
      setCoverPreview(null);
      setGalleryFiles([]);
      setGalleryPreviews([]);
      setActiveTab("basic");
      setOpen(true);
    };

    const openEdit = (b: any) => {
      setForm({
        name: b.name,
        category: b.category,
        owner: b.owner,
        location: b.location || "",
        phone: b.phone || "",
        desc: b.desc || "",
        address: b.address || "",
        city: b.city || "",
        state: b.state || "",
        whatsapp: b.whatsapp || "",
        email: b.email || "",
        website: b.website || "",
        hours: b.hours && typeof b.hours === "object" ? { ...DEFAULT_HOURS, ...b.hours } : { ...DEFAULT_HOURS },
        socials: b.socials && typeof b.socials === "object" ? b.socials : { instagram: "", facebook: "", youtube: "", linkedin: "" },
        gallery: Array.isArray(b.gallery) ? b.gallery : [],
        status: b.status || (b.verified ? "VERIFIED" : "PENDING"),
        featured: !!b.featured
      });
      setEditTarget(b);
      setLogoFile(null);
      setCoverFile(null);
      setLogoPreview(b.img || b.img_url || null);
      setCoverPreview(b.cover || b.cover_url || null);
      setGalleryFiles([]);
      setGalleryPreviews([]);
      setActiveTab("basic");
      setOpen(true);
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setLogoFile(file);
        setLogoPreview(URL.createObjectURL(file));
      }
    };

    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setCoverFile(file);
        setCoverPreview(URL.createObjectURL(file));
      }
    };

    const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      const newFiles = [...galleryFiles, ...files];
      setGalleryFiles(newFiles);
      setGalleryPreviews(newFiles.map(f => URL.createObjectURL(f)));
    };

    const removeNewGalleryPhoto = (index: number) => {
      const newFiles = galleryFiles.filter((_, i) => i !== index);
      setGalleryFiles(newFiles);
      setGalleryPreviews(newFiles.map(f => URL.createObjectURL(f)));
    };

    const removeExistingGalleryPhoto = (index: number) => {
      setForm((prev: any) => ({
        ...prev,
        gallery: prev.gallery.filter((_: any, i: number) => i !== index)
      }));
    };

    const handleSave = async () => {
      if (!form.name.trim()) return alert("Business name is required.");
      if (!form.owner.trim()) return alert("Owner name is required.");

      setSaving(true);
      try {
        const fd = new FormData();
        fd.append("name", form.name);
        fd.append("category", form.category);
        fd.append("owner", form.owner);

        // Auto sync location with city, state if location is empty
        const loc = form.location || (form.city && form.state ? `${form.city}, ${form.state}` : form.city || form.state || "");
        fd.append("location", loc);

        fd.append("phone", form.phone);
        fd.append("desc", form.desc);
        fd.append("address", form.address);
        fd.append("city", form.city);
        fd.append("state", form.state);
        fd.append("whatsapp", form.whatsapp);
        fd.append("email", form.email);
        fd.append("website", form.website);
        fd.append("status", form.status);
        fd.append("featured", String(form.featured));
        fd.append("community", String(user?.communityId || ""));

        fd.append("hours", JSON.stringify(form.hours));
        fd.append("socials", JSON.stringify(form.socials));
        fd.append("gallery", JSON.stringify(form.gallery));

        if (logoFile) fd.append("img", logoFile);
        if (coverFile) fd.append("cover", coverFile);

        galleryFiles.forEach((file, idx) => {
          fd.append(`business_gallery_${idx}`, file);
        });

        if (editTarget) {
          await api.updateBusiness(editTarget.id, fd);
        } else {
          await api.createBusiness(fd);
        }
        setOpen(false);
        fetchBusinesses();
      } catch (e: any) {
        alert(e.message || "Failed to save.");
      } finally {
        setSaving(false);
      }
    };

    const handleDelete = async (id: number) => {
      if (!confirm("Delete this business permanently from directory?")) return;
      try {
        await api.deleteBusiness(id);
        fetchBusinesses();
      } catch (e: any) {
        alert(e.message || "Failed to delete.");
      }
    };

    const handleApprove = async (id: number) => {
      try {
        const fd = new FormData();
        fd.append("status", "VERIFIED");
        await api.updateBusiness(id, fd);
        fetchBusinesses();
      } catch (e: any) {
        alert(e.message || "Failed to verify business.");
      }
    };

    const filtered = businesses.filter(b => {
      const matchCat = filterCat === "All" || b.category === filterCat;
      const matchStatus = filterStatus === "All" || (b.status || (b.verified ? "VERIFIED" : "PENDING")) === filterStatus;
      const matchSearch =
        (b.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (b.owner || "").toLowerCase().includes(search.toLowerCase()) ||
        (b.city || "").toLowerCase().includes(search.toLowerCase()) ||
        (b.state || "").toLowerCase().includes(search.toLowerCase());
      return matchCat && matchStatus && matchSearch;
    });

    const setSubFieldValue = (field: string, key: string, val: string) => {
      setForm((f: any) => ({
        ...f,
        [field]: {
          ...f[field],
          [key]: val
        }
      }));
    };

    const field = (key: string) => (evt: any) => {
      const val = evt.target.type === "checkbox" ? evt.target.checked : evt.target.value;
      setForm((f: any) => ({ ...f, [key]: val }));
    };

    return (
      <PageWrap
        title="Samaj Business Manager"
        desc="Administer community directory listings, verify member shops, and spotlight premium partners."
        action={
          hasPermission(user, ["Add Businesses"]) && perms.create ? (
            <button onClick={openCreate} className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold flex items-center gap-2 hover:bg-primary/95 transition shadow-sm">
              <Plus className="w-4 h-4" /> Add Business
            </button>
          ) : null
        }
      >
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <input
            placeholder="Search by shop name, owner, city..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 rounded-xl border border-warm bg-surface focus:outline-none focus:border-primary text-sm"
          />
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="px-3 py-2 rounded-xl border border-warm bg-surface text-sm">
            <option value="All">All Categories</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-xl border border-warm bg-surface text-sm">
            <option value="All">All Statuses</option>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        {/* Directory Listing Table */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <AnimatedCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-sand">
                  <tr>
                    {["Business Details", "Owner", "Location", "Verification Status", "Spotlight", "Analytics", "Actions"].map(h => (
                      <th key={h} className="text-left p-3.5 text-xs uppercase tracking-wider text-warm-muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm">
                  {filtered.map(b => {
                    const currentStatus = b.status || (b.verified ? "VERIFIED" : "PENDING");
                    const coverImg = b.cover || b.cover_url;
                    return (
                      <tr key={b.id} className="hover:bg-sand/30 transition-colors">
                        {/* Logo and Name */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              {(b.img || b.img_url) ? (
                                <img src={getImageUrl(b.img || b.img_url)} className="w-12 h-12 rounded-xl object-cover border border-warm" />
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-gold/10 text-gold flex items-center justify-center font-bold text-sm">
                                  {b.name?.[0] || "B"}
                                </div>
                              )}
                              {b.featured && (
                                <div className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white p-0.5 rounded-full shadow-sm">
                                  <Star className="w-2.5 h-2.5 fill-white" />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-800 flex items-center gap-1">
                                {b.name}
                              </div>
                              <span className="text-[10px] uppercase font-bold text-gold">{b.category}</span>
                            </div>
                          </div>
                        </td>

                        {/* Owner */}
                        <td className="p-3.5">
                          <div className="text-slate-800 font-medium">{b.owner}</div>
                          {b.phone && <div className="text-xs text-warm-muted">{b.phone}</div>}
                        </td>

                        {/* Location */}
                        <td className="p-3.5">
                          <div className="text-slate-700 text-xs font-semibold">{b.city || b.location || "N/A"}</div>
                          {b.state && <div className="text-[10px] text-warm-muted">{b.state}</div>}
                        </td>

                        {/* Status */}
                        <td className="p-3.5">
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-bold inline-block border",
                            currentStatus === "VERIFIED" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                            currentStatus === "PENDING" && "bg-amber-50 text-amber-700 border-amber-200",
                            currentStatus === "REJECTED" && "bg-red-50 text-red-700 border-red-200",
                            currentStatus === "SUSPENDED" && "bg-slate-50 text-slate-700 border-slate-200"
                          )}>
                            {currentStatus}
                          </span>
                        </td>

                        {/* Spotlight / Featured */}
                        <td className="p-3.5">
                          {b.featured ? (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Featured
                            </span>
                          ) : (
                            <span className="text-xs text-warm-muted">Standard</span>
                          )}
                        </td>

                        {/* Analytics summary */}
                        <td className="p-3.5 text-xs text-warm-muted">
                          <div className="flex gap-2">
                            <span>Opens: <strong>{b.opens || 0}</strong></span>
                            <span>Clicks: <strong>{(b.whatsapp_clicks || 0) + (b.call_clicks || 0)}</strong></span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5">
                            {hasPermission(user, ["Edit Businesses"]) && perms.edit && currentStatus === "PENDING" && (
                              <button
                                onClick={() => handleApprove(b.id)}
                                className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"
                                title="Approve & Verify"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            {hasPermission(user, ["Edit Businesses"]) && perms.edit && (
                              <button onClick={() => openEdit(b)} className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition">
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            {hasPermission(user, ["Delete Businesses"]) && perms.delete && (
                              <button onClick={() => handleDelete(b.id)} className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-warm-muted space-y-2">
                        <AlertCircle className="w-8 h-8 text-warm-muted mx-auto" />
                        <div>No directory listings found.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </AnimatedCard>
        )}

        {/* Modal Editor Form */}
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title={editTarget ? `Modify: ${editTarget.name}` : "Create Business Directory Listing"}
          size="lg"
        >
          {/* Tabs header */}
          <div className="flex border-b border-warm mb-4">
            {(["basic", "contact", "schedule"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 py-2 text-sm font-semibold border-b-2 text-center transition capitalize",
                  activeTab === tab ? "border-primary text-primary" : "border-transparent text-warm-muted hover:text-slate-800"
                )}
              >
                {tab === "basic" ? "Basic Info" : tab === "contact" ? "Contact & Location" : "Hours & Socials"}
              </button>
            ))}
          </div>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {/* TAB 1: Basic Information */}
            {activeTab === "basic" && (
              <div className="space-y-4">
                {/* Logo & Cover Upload */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Logo area */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600 block">Business Logo</label>
                    <div
                      onClick={() => logoInputRef.current?.click()}
                      className="border-2 border-dashed border-warm rounded-2xl p-4 text-center cursor-pointer hover:bg-sand/30 transition flex flex-col items-center justify-center min-h-[110px]"
                    >
                      {logoPreview ? (
                        <img src={getImageUrl(logoPreview)} className="w-16 h-16 rounded-xl object-cover border border-warm" />
                      ) : (
                        <>
                          <Upload className="w-5 h-5 text-warm-muted mb-1" />
                          <span className="text-[10px] text-warm-muted">1:1 Square PNG/JPG</span>
                        </>
                      )}
                      <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                    </div>
                  </div>

                  {/* Cover Area */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600 block">Cover Banner Image</label>
                    <div
                      onClick={() => coverInputRef.current?.click()}
                      className="border-2 border-dashed border-warm rounded-2xl p-4 text-center cursor-pointer hover:bg-sand/30 transition flex flex-col items-center justify-center min-h-[110px]"
                    >
                      {coverPreview ? (
                        <img src={getImageUrl(coverPreview)} className="w-full h-16 rounded-xl object-cover border border-warm" />
                      ) : (
                        <>
                          <ImageIcon className="w-5 h-5 text-warm-muted mb-1" />
                          <span className="text-[10px] text-warm-muted">Landscape Aspect</span>
                        </>
                      )}
                      <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Business/Shop Name *</label>
                    <input placeholder="E.g. ABC Electronics" value={form.name} onChange={field("name")} className="w-full px-3 py-2.5 rounded-lg border border-warm bg-surface text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Category / Sector</label>
                    <select value={form.category} onChange={field("category")} className="w-full px-3 py-2.5 rounded-lg border border-warm bg-surface text-sm">
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Owner Name *</label>
                    <input placeholder="E.g. Rajesh Patel" value={form.owner} onChange={field("owner")} className="w-full px-3 py-2.5 rounded-lg border border-warm bg-surface text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Status</label>
                    <select value={form.status} onChange={field("status")} className="w-full px-3 py-2.5 rounded-lg border border-warm bg-surface text-sm font-semibold">
                      {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Public Description</label>
                  <textarea rows={3} placeholder="Briefly describe products, services, and specialties..." value={form.desc} onChange={field("desc")} className="w-full px-3 py-2.5 rounded-lg border border-warm bg-surface text-sm" />
                </div>

                <div className="bg-sand/30 p-3.5 rounded-2xl flex items-center justify-between border border-warm/60">
                  <div>
                    <strong className="text-xs text-slate-800 block">Spotlight Featured Banner</strong>
                    <span className="text-[10px] text-warm-muted">Promote to slide showcase carousel on directory home.</span>
                  </div>
                  <input type="checkbox" checked={form.featured} onChange={field("featured")} className="rounded text-gold focus:ring-gold w-5 h-5" />
                </div>

                {/* Business Photos (Gallery) */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 block">Business Photos (Gallery)</label>
                  
                  {/* Click/Drag to upload area */}
                  <div
                    onClick={() => galleryInputRef.current?.click()}
                    className="border-2 border-dashed border-warm rounded-2xl p-6 text-center cursor-pointer hover:bg-sand/30 transition flex flex-col items-center justify-center min-h-[110px] group"
                  >
                    <Upload className="w-6 h-6 text-warm-muted mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-bold text-slate-700">Upload Gallery Photos</span>
                    <span className="text-[10px] text-warm-muted mt-1">Select multiple PNG, JPG images</span>
                    <input ref={galleryInputRef} type="file" multiple accept="image/*" onChange={handleGalleryChange} className="hidden" />
                  </div>

                  {/* Existing gallery images from database */}
                  {form.gallery && form.gallery.length > 0 && (
                    <div className="space-y-1.5 mt-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Existing Gallery Photos</span>
                      <div className="grid grid-cols-5 gap-2">
                        {form.gallery.map((url: string, idx: number) => (
                          <div key={`existing-${idx}`} className="relative aspect-video rounded-xl overflow-hidden border border-warm bg-orange-50 group">
                            <img src={getImageUrl(url)} alt="" className="w-full h-full object-cover" />
                            <button type="button" onClick={() => removeExistingGalleryPhoto(idx)}
                              className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white rounded-xl">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Newly selected images preview */}
                  {galleryPreviews.length > 0 && (
                    <div className="space-y-1.5 mt-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Newly Selected Photos</span>
                      <div className="grid grid-cols-5 gap-2">
                        {galleryPreviews.map((src, idx) => (
                          <div key={`new-${idx}`} className="relative aspect-video rounded-xl overflow-hidden border border-warm bg-orange-50 group">
                            <img src={src} alt="" className="w-full h-full object-cover" />
                            <button type="button" onClick={() => removeNewGalleryPhoto(idx)}
                              className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white rounded-xl">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: Contacts & Address */}
            {activeTab === "contact" && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Contact Phone *</label>
                    <input placeholder="+91 9XXXXXXXXX" value={form.phone} onChange={field("phone")} className="w-full px-3 py-2.5 rounded-lg border border-warm bg-surface text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">WhatsApp Number</label>
                    <input placeholder="+91 9XXXXXXXXX" value={form.whatsapp} onChange={field("whatsapp")} className="w-full px-3 py-2.5 rounded-lg border border-warm bg-surface text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Business Email</label>
                    <input type="email" placeholder="contact@shop.com" value={form.email} onChange={field("email")} className="w-full px-3 py-2.5 rounded-lg border border-warm bg-surface text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Website URL</label>
                    <input type="url" placeholder="https://www.shopname.com" value={form.website} onChange={field("website")} className="w-full px-3 py-2.5 rounded-lg border border-warm bg-surface text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Location Alias</label>
                    <input placeholder="E.g. Gujarat, India" value={form.location} onChange={field("location")} className="w-full px-3 py-2.5 rounded-lg border border-warm bg-surface text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">City / Town</label>
                    <input placeholder="E.g. Surat" value={form.city} onChange={field("city")} className="w-full px-3 py-2.5 rounded-lg border border-warm bg-surface text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">State</label>
                    <input placeholder="E.g. Gujarat" value={form.state} onChange={field("state")} className="w-full px-3 py-2.5 rounded-lg border border-warm bg-surface text-sm" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Detailed Physical Address</label>
                  <textarea rows={2} placeholder="Shop number, building, landmark, road details..." value={form.address} onChange={field("address")} className="w-full px-3 py-2.5 rounded-lg border border-warm bg-surface text-sm" />
                </div>
              </div>
            )}

            {/* TAB 3: Operating Hours & Social Links */}
            {activeTab === "schedule" && (
              <div className="space-y-4">
                {/* Social Handles */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Social Handles (IDs/Names)</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Instagram</label>
                      <input placeholder="Username" value={form.socials.instagram} onChange={e => setSubFieldValue("socials", "instagram", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-warm bg-surface text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Facebook</label>
                      <input placeholder="Username" value={form.socials.facebook} onChange={e => setSubFieldValue("socials", "facebook", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-warm bg-surface text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">YouTube</label>
                      <input placeholder="Channel Handle" value={form.socials.youtube} onChange={e => setSubFieldValue("socials", "youtube", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-warm bg-surface text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">LinkedIn</label>
                      <input placeholder="Profile Name" value={form.socials.linkedin} onChange={e => setSubFieldValue("socials", "linkedin", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-warm bg-surface text-xs" />
                    </div>
                  </div>
                </div>

                {/* Operating Hours */}
                <div className="space-y-2 pt-2 border-t border-warm">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Weekly Operating Hours</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {Object.keys(DEFAULT_HOURS).map(day => (
                      <div key={day} className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-600 w-20">{day}</span>
                        <input
                          value={form.hours[day]}
                          onChange={e => setSubFieldValue("hours", day, e.target.value)}
                          placeholder="e.g. 09:00 AM - 07:00 PM or Closed"
                          className="flex-1 px-3 py-1.5 rounded-lg border border-warm bg-surface text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Action Buttons */}
          <div className="flex gap-2 pt-4 border-t border-warm mt-4">
            <button onClick={() => setOpen(false)} className="flex-1 py-2.5 rounded-xl border border-warm text-sm font-semibold hover:bg-sand transition"><X className="w-4 h-4 inline mr-1" />Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/95 transition disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <Check className="w-4 h-4" /> Save Listing
            </button>
          </div>
        </Modal>
      </PageWrap>
    );
  },
});
