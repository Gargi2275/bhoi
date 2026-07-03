import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Plus, Edit, Pause, Play, Trash2, Search, Loader2, Upload } from "lucide-react";
import { PageWrap } from "@/components/wag/PageWrap";
import { AnimatedCard, Modal, StatusBadge } from "@/components/wag/primitives";
import api from "@/lib/api";

function AdvertisementsPage() {
  const [open, setOpen] = useState(false);
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form fields
  const [slot, setSlot] = useState("Hero Banner");
  const [advertiser, setAdvertiser] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchAds = async () => {
    setLoading(true);
    try {
      const data = await api.getAdvertisements();
      setAds(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAds();
  }, []);

  const handleCloseModal = () => {
    setOpen(false);
    setIsEditing(false);
    setEditingId(null);
    setSlot("Hero Banner");
    setAdvertiser("");
    setDestinationUrl("");
    setImageFile(null);
    setImagePreviewUrl("");
    setStartDate("");
    setEndDate("");
  };

  const handleSave = async () => {
    if (!advertiser.trim()) {
      alert("Please enter advertiser name.");
      return;
    }
    if (!isEditing && !imageFile) {
      alert("Please upload a banner image.");
      return;
    }
    setSaving(true);

    let formattedDestUrl = destinationUrl.trim();
    if (formattedDestUrl && !/^https?:\/\//i.test(formattedDestUrl)) {
      formattedDestUrl = "https://" + formattedDestUrl;
    }

    try {
      const payload: any = {
        slot,
        advertiser,
        destination_url: formattedDestUrl || null,
        start_date: startDate || null,
        end_date: endDate || null,
      };

      if (imageFile) {
        payload.image = imageFile;
      }

      if (isEditing && editingId) {
        await api.updateAdvertisement(editingId, payload);
      } else {
        await api.createAdvertisement({
          ...payload,
          status: "Active",
          priority: 1
        });
      }

      handleCloseModal();
      await fetchAds();
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to save advertisement");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (ad: any) => {
    const nextStatus = ad.status === "Active" ? "Paused" : "Active";
    try {
      await api.updateAdvertisement(ad.id, { status: nextStatus });
      await fetchAds();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this advertisement?")) return;
    try {
      await api.deleteAdvertisement(id);
      await fetchAds();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredAds = ads.filter(a => {
    const matchesSearch = (a.advertiser || "").toLowerCase().includes(search.toLowerCase());
    const matchesSlot = selectedSlot === "All" || a.slot === selectedSlot;
    const matchesStatus = selectedStatus === "All" || a.status === selectedStatus;
    return matchesSearch && matchesSlot && matchesStatus;
  });

  return (
    <PageWrap 
      title="Advertisements" 
      desc="Manage ad slots and active campaigns" 
      action={
        <button 
          onClick={() => {
            setIsEditing(false);
            setOpen(true);
          }} 
          className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold flex items-center gap-2 hover:bg-primary/95 transition shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Ad
        </button>
      }
    >
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-warm-muted" />
          <input 
            placeholder="Search by advertiser name…" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-warm bg-surface focus:outline-none focus:border-primary transition text-sm text-foreground" 
          />
        </div>
        <select 
          value={selectedSlot} 
          onChange={(e) => setSelectedSlot(e.target.value)}
          className="px-3 py-2 rounded-xl border border-warm bg-surface text-sm text-foreground focus:outline-none"
        >
          <option value="All">All Slots</option>
          {["Hero Banner", "Sidebar Top", "Sidebar Bottom", "Footer", "Content Inline"].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select 
          value={selectedStatus} 
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2 rounded-xl border border-warm bg-surface text-sm text-foreground focus:outline-none"
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Paused">Paused</option>
          <option value="Expired">Expired</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : filteredAds.length === 0 ? (
        <div className="p-8 text-center text-warm-muted border border-warm rounded-2xl bg-surface mb-8">
          No advertisements found matching current filters.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          {filteredAds.map(a => (
            <AnimatedCard key={a.id} className="overflow-hidden border border-warm flex flex-col justify-between">
              <div>
                <div className="h-32 bg-sand relative">
                  {a.image || a.image_url ? (() => {
                    const raw = a.image || a.image_url;
                    const src = raw.startsWith("http") ? raw : `${raw.startsWith("/") ? "" : "/"}${raw}`;
                    return <img src={src} alt="" className="w-full h-full object-cover" />;
                  })() : (
                    <div className="w-full h-full flex items-center justify-center text-warm-muted text-sm font-bold">No Image Banner</div>
                  )}
                  <div className="absolute top-2 right-2"><StatusBadge status={a.status} /></div>
                </div>
                <div className="p-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gold-light text-gold border border-gold/15">
                    {a.slot}
                  </span>
                  <div className="font-ui font-bold text-base text-foreground mt-2">{a.advertiser}</div>
                  {a.start_date && (
                    <div className="text-xs text-warm-muted mt-1.5 font-medium">
                      Active: {a.start_date} → {a.end_date || "Open-ended"}
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 pt-0">
                <div className="flex gap-2 pt-3 border-t border-warm">
                  <button onClick={() => handleToggleStatus(a)} className={`text-xs flex items-center gap-1 font-semibold ${a.status === "Active" ? "text-amber-600" : "text-teal"}`}>
                    {a.status === "Active" ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {a.status === "Active" ? "Pause" : "Resume"}
                  </button>
                  <button 
                    onClick={() => {
                      setIsEditing(true);
                      setEditingId(a.id);
                      setSlot(a.slot);
                      setAdvertiser(a.advertiser);
                      setDestinationUrl(a.destination_url || "");
                      const rawImg = a.image || a.image_url || "";
                      setImagePreviewUrl(rawImg && !rawImg.startsWith("http") ? `${rawImg.startsWith("/") ? "" : "/"}${rawImg}` : rawImg);
                      setImageFile(null);
                      setStartDate(a.start_date || "");
                      setEndDate(a.end_date || "");
                      setOpen(true);
                    }} 
                    className="text-xs flex items-center gap-1 text-primary font-semibold"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => handleDelete(a.id)} className="text-xs flex items-center gap-1 text-red-500 font-semibold ml-auto">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            </AnimatedCard>
          ))}
        </div>
      )}
      
      {ads.length > 0 && (
        <AnimatedCard className="p-5 border border-warm">
          <h3 className="font-ui font-semibold mb-3 text-foreground">Slot schedule timeline</h3>
          <div className="space-y-3">
            {ads.filter(a => a.start_date).map(a => (
              <div key={a.id}>
                <div className="flex justify-between text-xs mb-1 font-medium text-foreground">
                  <span>{a.slot}</span>
                  <span className="text-warm-muted">{a.advertiser}</span>
                </div>
                <div className="h-6 bg-sand rounded-lg relative overflow-hidden border border-warm/40">
                  <div className="absolute h-full bg-gradient-to-r from-primary to-gold rounded-lg" style={{ left: `${(a.priority - 1) * 12}%`, width: "32%" }} />
                </div>
              </div>
            ))}
          </div>
        </AnimatedCard>
      )}

      {/* Add/Edit/Create Advertisement Modal */}
      <Modal open={open} onClose={handleCloseModal} title={isEditing ? "Edit Advertisement" : "Add Advertisement"}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-warm-muted mb-1">Select Slot *</label>
            <select 
              value={slot} 
              onChange={e => setSlot(e.target.value)} 
              className="w-full px-3 py-2 rounded-lg border border-warm bg-surface text-sm text-foreground focus:outline-none"
            >
              {["Hero Banner", "Sidebar Top", "Sidebar Bottom", "Footer", "Content Inline"].map(s => (
                <option key={s} value={s} className="text-foreground">{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-warm-muted mb-1">Advertiser Name *</label>
            <input 
              value={advertiser} 
              onChange={e => setAdvertiser(e.target.value)} 
              placeholder="e.g. Acme Corporation" 
              className="w-full px-3 py-2 rounded-lg border border-warm bg-surface text-sm text-foreground focus:outline-none" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-warm-muted mb-1">Destination URL</label>
            <input 
              value={destinationUrl} 
              onChange={e => setDestinationUrl(e.target.value)} 
              placeholder="https://example.com" 
              className="w-full px-3 py-2 rounded-lg border border-warm bg-surface text-sm text-foreground focus:outline-none" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-warm-muted mb-1">Banner Image *</label>
            <label className="cursor-pointer block relative group">
              <div className="h-32 rounded-xl bg-sand border-2 border-dashed border-warm hover:border-primary flex flex-col items-center justify-center overflow-hidden transition relative">
                {imagePreviewUrl ? (
                  <>
                    <img src={imagePreviewUrl} alt="Selected Banner" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold transition">
                      Change Image
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-warm-muted mb-1.5" />
                    <span className="text-xs text-warm-muted font-medium text-center px-2">Click or drag image to upload banner</span>
                    <span className="text-[10px] text-warm-muted opacity-80 mt-0.5">Supports PNG, JPG, JPEG</span>
                  </>
                )}
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setImageFile(file);
                    setImagePreviewUrl(URL.createObjectURL(file));
                  }
                }}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-warm-muted mb-1">Start Date</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)} 
                className="w-full px-3 py-2 rounded-lg border border-warm bg-surface text-sm text-foreground focus:outline-none" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-warm-muted mb-1">End Date</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)} 
                className="w-full px-3 py-2 rounded-lg border border-warm bg-surface text-sm text-foreground focus:outline-none" 
              />
            </div>
          </div>
          <div className="flex gap-2 pt-3 border-t border-warm">
            <button type="button" onClick={handleCloseModal} className="flex-1 py-2 rounded-xl border border-warm text-sm font-semibold hover:bg-sand transition">Cancel</button>
            <button 
              type="button" 
              onClick={handleSave} 
              disabled={saving || !advertiser.trim() || (!isEditing && !imageFile)} 
              className="flex-1 py-2 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-dark transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Create"}
            </button>
          </div>
        </div>
      </Modal>
    </PageWrap>
  );
}

export const Route = createFileRoute("/admin/advertisements")({ component: AdvertisementsPage });
