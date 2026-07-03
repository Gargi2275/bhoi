import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, isToday, isThisWeek } from "date-fns";
import { 
  Heart, Sparkles, Flag, Loader2, Search, Check, Ban, Star, AlertTriangle, 
  User, Image as ImageIcon, Briefcase, GraduationCap, MapPin, Calendar, 
  ChevronRight, Users, X, Download, SlidersHorizontal, Trash2, CheckCircle2,
  FileText, ShieldAlert, FileImage, LayoutGrid, List, Filter, Mail, Phone,
  Eye, Activity, ZoomIn, ZoomOut, CheckSquare, XSquare, Clock, Shield
} from "lucide-react";
import { PageWrap } from "@/components/wag/PageWrap";
import { AvatarCircle } from "@/components/wag/primitives";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/matrimony")({
  component: MatrimonyAdminPage,
});

// Helper for Completion %
function calculateCompletion(p: any) {
  if (p.completion_percentage !== undefined) return p.completion_percentage;
  let score = 0;
  if (p.name) score += 10;
  if (p.age) score += 10;
  if (p.gender) score += 10;
  if (p.community) score += 10;
  if (p.education) score += 10;
  if (p.profession) score += 10;
  if (p.city || p.state) score += 10;
  if (p.photo || p.photo_url || (p.photos && p.photos.length > 0)) score += 20;
  if (p.is_verified || p.aadhaar_number) score += 10;
  return score;
}

function getMissingSections(p: any) {
  const missing = [];
  if (!p.photo && !p.photo_url && !(p.photos && p.photos.length > 0)) missing.push("Photos");
  if (!p.is_verified) missing.push("Verification");
  if (!p.education || !p.profession) missing.push("Career Details");
  if (!p.city && !p.state) missing.push("Location");
  return missing;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "Approved": case "Active": return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400";
    case "Pending Approval": case "Pending": return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400";
    case "Draft": return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400";
    case "Featured": return "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400";
    case "Rejected": return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400";
    case "Suspended": return "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400";
    case "Flagged": return "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400";
    default: return "bg-gray-100 text-gray-600 border-gray-200";
  }
};

const CircularProgress = ({ value, size = 44, strokeWidth = 4, color = "text-primary" }: any) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;
  
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        <circle cx={size/2} cy={size/2} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="transparent" className="text-warm/30" />
        <circle cx={size/2} cy={size/2} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} className={cn("transition-all duration-1000 ease-out", color)} />
      </svg>
      <span className="absolute text-[11px] font-bold text-foreground">{value}%</span>
    </div>
  );
};

function MatrimonyAdminPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [genderFilter, setGenderFilter] = useState("All");
  const [communityFilter, setCommunityFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);

  // Bulk Actions
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Drawer
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [zoomPhoto, setZoomPhoto] = useState<string | null>(null);

  const fetchProfiles = async () => {
    try {
      const data = await api.getMatrimonyProfiles();
      setProfiles(data || []);
    } catch (e) {
      console.error("Failed to fetch matrimony profiles", e);
    }
  };

  const fetchCommunities = async () => {
    try {
      const data = await api.getCommunities();
      setCommunities(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchProfiles(), fetchCommunities()]);
      setLoading(false);
    };
    init();
  }, []);

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    setActionLoading(id);
    try {
      await api.adminUpdateMatrimonyProfile(id, { status: newStatus });
      await fetchProfiles();
      if (selectedProfile && selectedProfile.id === id) {
        setSelectedProfile({ ...selectedProfile, status: newStatus });
      }
    } catch (e) {
      console.error("Failed to update status", e);
      alert("Failed to update profile status.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to ${action.toLowerCase()} ${selectedIds.size} profiles?`)) return;
    
    // Simple bulk action simulation loop
    for (const id of Array.from(selectedIds)) {
      if (action === "Delete") {
        await api.deleteMatrimonyProfile(id).catch(console.error);
      } else {
        await api.adminUpdateMatrimonyProfile(id, { status: action }).catch(console.error);
      }
    }
    setSelectedIds(new Set());
    fetchProfiles();
  };

  // Derived Stats
  const stats = useMemo(() => {
    let pending = 0, approved = 0, rejected = 0, featured = 0, verified = 0, incomplete = 0, todayCount = 0, weekCount = 0;
    profiles.forEach(p => {
      if (p.status === "Pending Approval" || p.status === "Pending") pending++;
      else if (p.status === "Approved" || p.status === "Active") approved++;
      else if (p.status === "Rejected") rejected++;
      else if (p.status === "Featured") featured++;
      
      if (p.is_verified) verified++;
      if (calculateCompletion(p) < 80) incomplete++;
      
      if (p.created_at) {
        try {
          const d = new Date(p.created_at);
          if (isToday(d)) todayCount++;
          if (isThisWeek(d)) weekCount++;
        } catch(e) {}
      }
    });
    return { total: profiles.length, pending, approved, rejected, featured, verified, incomplete, today: todayCount, week: weekCount };
  }, [profiles]);

  // Filtering
  const filteredProfiles = useMemo(() => {
    return profiles.filter(p => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || 
        (p.name && p.name.toLowerCase().includes(q)) || 
        (p.id && String(p.id).includes(q)) ||
        (p.profession && p.profession.toLowerCase().includes(q)) ||
        (p.contact_phone && p.contact_phone.toLowerCase().includes(q));
      
      const normalizedStatus = p.status === "Pending" ? "Pending Approval" : p.status === "Active" ? "Approved" : p.status;
      const matchesStatus = statusFilter === "All" || normalizedStatus === statusFilter;
      const matchesGender = genderFilter === "All" || p.gender === genderFilter;
      const matchesCommunity = communityFilter === "All" || String(p.community) === communityFilter;
      
      return matchesSearch && matchesStatus && matchesGender && matchesCommunity;
    });
  }, [profiles, searchQuery, statusFilter, genderFilter, communityFilter]);

  const toggleSelection = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  return (
    <PageWrap 
      title="Matrimony Administration" 
      desc="Enterprise dashboard for profile moderation, verification, and matchmaking operations."
    >
      {/* 1. ANALYTICS STATS BAR */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-3 mb-6">
        {[
          { label: "Total Profiles", val: stats.total, color: "text-zinc-800 bg-zinc-50 border-zinc-200" },
          { label: "Pending", val: stats.pending, color: "text-orange-700 bg-orange-50 border-orange-200" },
          { label: "Approved", val: stats.approved, color: "text-green-700 bg-green-50 border-green-200" },
          { label: "Rejected", val: stats.rejected, color: "text-red-700 bg-red-50 border-red-200" },
          { label: "Featured", val: stats.featured, color: "text-purple-700 bg-purple-50 border-purple-200" },
          { label: "Verified", val: stats.verified, color: "text-teal-700 bg-teal-50 border-teal-200" },
          { label: "Incomplete", val: stats.incomplete, color: "text-zinc-500 bg-surface border-warm" },
          { label: "Added Today", val: stats.today, color: "text-blue-700 bg-blue-50 border-blue-200" },
          { label: "Added Week", val: stats.week, color: "text-indigo-700 bg-indigo-50 border-indigo-200" }
        ].map((item, idx) => (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} key={idx} className={cn("p-3 rounded-xl border flex flex-col justify-center", item.color)}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin opacity-50" /> : <span className="text-xl font-black font-ui leading-none">{item.val}</span>}
            <span className="text-[9px] uppercase font-bold tracking-wider mt-1 leading-snug opacity-80">{item.label}</span>
          </motion.div>
        ))}
      </div>

      {/* 2. ADVANCED FILTERS & SEARCH */}
      <div className="p-4 border border-warm rounded-2xl bg-surface/80 backdrop-blur-sm mb-6 space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-warm-muted" />
            <input
              placeholder="Search by Name, Member ID, Profession, Phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface border border-warm rounded-xl text-sm placeholder-warm-muted focus:outline-none focus:ring-1 focus:ring-primary transition shadow-sm"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn("px-4 py-2.5 rounded-xl border text-sm font-semibold flex items-center gap-2 transition shadow-sm", showFilters ? "border-primary text-primary bg-primary/5" : "border-warm text-foreground hover:bg-sand")}
          >
            <SlidersHorizontal className="w-4 h-4" /> Filters
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-warm pt-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-warm-muted block mb-1.5">Status</label>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full p-2.5 bg-surface border border-warm rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="All">All Statuses</option>
                    <option value="Draft">Draft</option>
                    <option value="Pending Approval">Pending Approval</option>
                    <option value="Approved">Approved</option>
                    <option value="Featured">Featured</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Flagged">Flagged</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-warm-muted block mb-1.5">Gender</label>
                  <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} className="w-full p-2.5 bg-surface border border-warm rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="All">All Genders</option>
                    <option value="Bride">Bride</option>
                    <option value="Groom">Groom</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-warm-muted block mb-1.5">Community</label>
                  <select value={communityFilter} onChange={(e) => setCommunityFilter(e.target.value)} className="w-full p-2.5 bg-surface border border-warm rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="All">All Communities</option>
                    {communities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* BULK ACTION BAR */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mb-4 p-3 bg-surface border border-warm rounded-xl shadow-sm flex items-center justify-between">
            <span className="text-sm font-bold">{selectedIds.size} Profiles Selected</span>
            <div className="flex gap-2">
              <button onClick={() => handleBulkAction("Approved")} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition">Approve</button>
              <button onClick={() => handleBulkAction("Rejected")} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition">Reject</button>
              <button onClick={() => handleBulkAction("Featured")} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition">Feature</button>
              <button onClick={() => handleBulkAction("Flagged")} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 transition">Flag</button>
              <button onClick={() => handleBulkAction("Delete")} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. PROFILE CARDS GRID */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-64 rounded-2xl bg-warm/20 animate-pulse" />)}
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-warm rounded-3xl bg-surface/50 text-warm-muted">
          <Search className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-lg font-ui font-medium">No profiles found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProfiles.map((p) => {
            const hasPhoto = p.photo || p.photo_url || (p.photos && p.photos.length > 0);
            const photoUrl = p.photo || p.photo_url || (p.photos && p.photos[0]?.image);
            const compScore = calculateCompletion(p);
            const normalizedStatus = p.status === "Pending" ? "Pending Approval" : p.status === "Active" ? "Approved" : p.status;

            return (
              <motion.div key={p.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={cn("group relative rounded-2xl border bg-surface overflow-hidden flex flex-col shadow-sm hover:shadow-xl transition-all duration-300", p.status === "Featured" ? "border-purple-300 shadow-purple-500/10" : "border-warm")}>
                {/* Bulk Select Checkbox */}
                <div className="absolute top-3 left-3 z-20">
                  <button onClick={() => toggleSelection(p.id)} className={cn("w-5 h-5 rounded border flex items-center justify-center transition-colors bg-surface", selectedIds.has(p.id) ? "border-primary bg-primary text-white" : "border-warm text-transparent hover:border-warm-muted")}>
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                {/* Status Badge */}
                <div className="absolute top-3 right-3 z-20">
                  <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm backdrop-blur-md", getStatusColor(normalizedStatus))}>
                    {normalizedStatus}
                  </span>
                </div>

                {/* Card Header (Photo & Basic) */}
                <div className="p-4 pb-0 flex gap-4">
                  <div className="relative w-20 h-24 rounded-xl overflow-hidden shrink-0 border border-warm bg-sand/30 flex items-center justify-center group-hover:scale-[1.02] transition-transform">
                    {hasPhoto ? (
                      <img src={photoUrl} className="w-full h-full object-cover" loading="lazy" alt="" />
                    ) : (
                      <div className="flex flex-col items-center opacity-40">
                        <User className="w-8 h-8 mb-1" />
                        <span className="text-[8px] font-bold uppercase">No Photo</span>
                      </div>
                    )}
                    <span className={cn("absolute bottom-0 inset-x-0 text-center text-[9px] font-black uppercase py-0.5 text-white", p.gender === "Bride" ? "bg-pink-500/90" : "bg-blue-500/90")}>
                      {p.gender}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0 py-1">
                    <h3 className="font-ui font-black text-base text-foreground truncate">{p.name || "Unnamed"}</h3>
                    <div className="text-xs text-warm-muted font-medium mb-2">{p.age ? `${p.age} Yrs` : "Age N/A"} • {p.community ? communities.find(c => c.id === p.community)?.name || `Com #${p.community}` : "No Community"}</div>
                    
                    <div className="flex items-center gap-2 mb-1">
                      <CircularProgress value={compScore} size={32} strokeWidth={3} />
                      <div className="text-[10px] leading-tight text-warm-muted font-medium">
                        Profile<br/>Completion
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info Lines */}
                <div className="p-4 space-y-2 flex-1">
                  <div className="flex items-center gap-2 text-xs text-foreground/80"><GraduationCap className="w-3.5 h-3.5 text-warm-muted shrink-0" /><span className="truncate">{p.education || "-"}</span></div>
                  <div className="flex items-center gap-2 text-xs text-foreground/80"><Briefcase className="w-3.5 h-3.5 text-warm-muted shrink-0" /><span className="truncate">{p.profession || "-"}</span></div>
                  <div className="flex items-center gap-2 text-xs text-foreground/80"><MapPin className="w-3.5 h-3.5 text-warm-muted shrink-0" /><span className="truncate">{p.city || "-"}, {p.state || "-"}</span></div>
                </div>

                {/* Actions */}
                <div className="p-3 border-t border-warm bg-sand/10 flex flex-col gap-2">
                  <button onClick={() => setSelectedProfile(p)} className="w-full py-2 rounded-xl bg-surface border border-warm text-foreground text-xs font-bold hover:bg-primary hover:text-white hover:border-primary transition flex items-center justify-center gap-1.5 shadow-sm">
                    <Eye className="w-4 h-4" /> View Full Details
                  </button>
                  <div className="flex gap-1.5">
                    {normalizedStatus !== "Approved" && <button onClick={() => handleUpdateStatus(p.id, "Approved")} className="flex-1 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-bold hover:bg-green-100 transition flex items-center justify-center gap-1"><Check className="w-3 h-3"/> Approve</button>}
                    {normalizedStatus !== "Rejected" && <button onClick={() => handleUpdateStatus(p.id, "Rejected")} className="flex-1 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100 transition flex items-center justify-center gap-1"><Ban className="w-3 h-3"/> Reject</button>}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* 4. COMPLETE PROFILE VIEW DRAWER */}
      <AnimatePresence>
        {selectedProfile && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedProfile(null)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
            
            <motion.div initial={{ x: "100%", boxShadow: "-20px 0 50px rgba(0,0,0,0)" }} animate={{ x: 0, boxShadow: "-20px 0 50px rgba(0,0,0,0.1)" }} exit={{ x: "100%", boxShadow: "-20px 0 50px rgba(0,0,0,0)" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed inset-y-0 right-0 w-full max-w-2xl bg-surface shadow-2xl z-50 flex flex-col border-l border-warm overflow-hidden">
              
              {/* Drawer Header */}
              <div className="p-6 border-b border-warm bg-sand/20 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <AvatarCircle name={selectedProfile.name || "Unknown"} size={48} />
                  <div>
                    <h2 className="text-xl font-black font-ui text-foreground">{selectedProfile.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-bold text-warm-muted">ID: MAT-{selectedProfile.id}</span>
                      <span className={cn("px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider", getStatusColor(selectedProfile.status === "Pending" ? "Pending Approval" : selectedProfile.status === "Active" ? "Approved" : selectedProfile.status))}>
                        {selectedProfile.status === "Pending" ? "Pending Approval" : selectedProfile.status === "Active" ? "Approved" : selectedProfile.status}
                      </span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedProfile(null)} className="w-10 h-10 rounded-full border border-warm flex items-center justify-center hover:bg-warm/20 transition bg-surface shadow-sm">
                  <X className="w-5 h-5 text-warm-muted" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-zinc-50/30 dark:bg-zinc-900/10">
                
                {/* Top Quick Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border border-warm bg-surface flex flex-col items-center justify-center text-center">
                    <CircularProgress value={calculateCompletion(selectedProfile)} size={56} strokeWidth={5} color={calculateCompletion(selectedProfile) > 80 ? "text-green-500" : "text-orange-500"} />
                    <span className="text-[10px] uppercase font-bold text-warm-muted mt-2">Completion</span>
                  </div>
                  <div className="p-4 rounded-xl border border-warm bg-surface flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-1"><Calendar className="w-5 h-5"/></div>
                    <span className="text-lg font-black font-ui">{selectedProfile.age || "-"} Yrs</span>
                    <span className="text-[10px] uppercase font-bold text-warm-muted">Age</span>
                  </div>
                  <div className="p-4 rounded-xl border border-warm bg-surface flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mb-1"><Shield className="w-5 h-5"/></div>
                    <span className="text-sm font-black font-ui mt-1">{selectedProfile.is_verified ? "Verified" : "Unverified"}</span>
                    <span className="text-[10px] uppercase font-bold text-warm-muted">Status</span>
                  </div>
                </div>

                {/* Missing Sections Notice */}
                {getMissingSections(selectedProfile).length > 0 && (
                  <div className="p-4 rounded-xl border border-orange-200 bg-orange-50 flex gap-3 text-orange-800">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold mb-1">Missing Information</h4>
                      <p className="text-xs opacity-80">Profile is missing: {getMissingSections(selectedProfile).join(", ")}</p>
                    </div>
                  </div>
                )}

                {/* PHOTO GALLERY */}
                <section>
                  <h3 className="text-xs font-black uppercase tracking-wider text-warm-muted mb-4 flex items-center gap-2"><ImageIcon className="w-4 h-4"/> Photo Gallery</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(selectedProfile.photos && selectedProfile.photos.length > 0) ? selectedProfile.photos.map((ph: any, i: number) => (
                      <div key={i} onClick={() => setZoomPhoto(ph.image || ph.photo_url || ph)} className="relative aspect-square rounded-xl overflow-hidden border border-warm cursor-zoom-in group">
                        <img src={ph.image || ph.photo_url || ph} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" alt="" />
                      </div>
                    )) : (selectedProfile.photo || selectedProfile.photo_url) ? (
                      <div onClick={() => setZoomPhoto(selectedProfile.photo || selectedProfile.photo_url)} className="relative aspect-[3/4] sm:aspect-square rounded-xl overflow-hidden border border-warm cursor-zoom-in group col-span-2 sm:col-span-1">
                        <img src={selectedProfile.photo || selectedProfile.photo_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" alt="" />
                      </div>
                    ) : (
                      <div className="col-span-full py-8 border-2 border-dashed border-warm rounded-xl flex flex-col items-center justify-center text-warm-muted bg-surface/50">
                        <FileImage className="w-8 h-8 mb-2 opacity-50" />
                        <span className="text-sm font-medium">No Photos Uploaded</span>
                      </div>
                    )}
                  </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* BASIC DETAILS */}
                  <section>
                    <h3 className="text-xs font-black uppercase tracking-wider text-warm-muted mb-4 border-b border-warm pb-2 flex items-center gap-2"><User className="w-4 h-4"/> Basic Details</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between"><span className="text-xs text-warm-muted">Gender</span><span className="text-xs font-semibold">{selectedProfile.gender || "-"}</span></div>
                      <div className="flex justify-between"><span className="text-xs text-warm-muted">Marital Status</span><span className="text-xs font-semibold">{selectedProfile.marital_status || "-"}</span></div>
                      <div className="flex justify-between"><span className="text-xs text-warm-muted">Height</span><span className="text-xs font-semibold">{selectedProfile.height ? `${selectedProfile.height} cm` : "-"}</span></div>
                      <div className="flex justify-between"><span className="text-xs text-warm-muted">Weight</span><span className="text-xs font-semibold">{selectedProfile.weight ? `${selectedProfile.weight} kg` : "-"}</span></div>
                      <div className="flex justify-between"><span className="text-xs text-warm-muted">Complexion</span><span className="text-xs font-semibold">{selectedProfile.complexion || "-"}</span></div>
                      <div className="flex justify-between"><span className="text-xs text-warm-muted">Mother Tongue</span><span className="text-xs font-semibold">{selectedProfile.mother_tongue || "-"}</span></div>
                      <div className="flex justify-between"><span className="text-xs text-warm-muted">Native Place</span><span className="text-xs font-semibold">{selectedProfile.native_place || "-"}</span></div>
                    </div>
                  </section>

                  {/* EDUCATION & CAREER */}
                  <section>
                    <h3 className="text-xs font-black uppercase tracking-wider text-warm-muted mb-4 border-b border-warm pb-2 flex items-center gap-2"><Briefcase className="w-4 h-4"/> Education & Career</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between"><span className="text-xs text-warm-muted">Education</span><span className="text-xs font-semibold">{selectedProfile.education || "-"}</span></div>
                      <div className="flex justify-between"><span className="text-xs text-warm-muted">Occupation</span><span className="text-xs font-semibold">{selectedProfile.profession || "-"}</span></div>
                      <div className="flex justify-between"><span className="text-xs text-warm-muted">Employment</span><span className="text-xs font-semibold">{selectedProfile.employment_type || "-"}</span></div>
                      <div className="flex justify-between"><span className="text-xs text-warm-muted">Income</span><span className="text-xs font-semibold">{selectedProfile.income || "-"}</span></div>
                      <div className="flex justify-between"><span className="text-xs text-warm-muted">Work Location</span><span className="text-xs font-semibold">{selectedProfile.work_location || "-"}</span></div>
                    </div>
                  </section>

                  {/* LIFESTYLE & FAMILY */}
                  <section>
                    <h3 className="text-xs font-black uppercase tracking-wider text-warm-muted mb-4 border-b border-warm pb-2 flex items-center gap-2"><Users className="w-4 h-4"/> Family & Lifestyle</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between"><span className="text-xs text-warm-muted">Diet</span><span className="text-xs font-semibold">{selectedProfile.diet || "-"}</span></div>
                      <div className="flex justify-between"><span className="text-xs text-warm-muted">Family Type</span><span className="text-xs font-semibold">{selectedProfile.family_type || "-"}</span></div>
                      <div className="flex justify-between"><span className="text-xs text-warm-muted">Family Values</span><span className="text-xs font-semibold">{selectedProfile.family_values || "-"}</span></div>
                      <div className="flex justify-between"><span className="text-xs text-warm-muted">Father Occ.</span><span className="text-xs font-semibold">{selectedProfile.father_occupation || "-"}</span></div>
                      <div className="flex justify-between"><span className="text-xs text-warm-muted">Mother Occ.</span><span className="text-xs font-semibold">{selectedProfile.mother_occupation || "-"}</span></div>
                    </div>
                  </section>

                  {/* CONTACT & PRIVACY */}
                  <section>
                    <h3 className="text-xs font-black uppercase tracking-wider text-warm-muted mb-4 border-b border-warm pb-2 flex items-center gap-2"><Mail className="w-4 h-4"/> Contact & Privacy</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between"><span className="text-xs text-warm-muted">Phone</span><span className="text-xs font-semibold">{selectedProfile.contact_phone || "-"}</span></div>
                      <div className="flex justify-between"><span className="text-xs text-warm-muted">Email</span><span className="text-xs font-semibold truncate max-w-[150px]">{selectedProfile.contact_email || "-"}</span></div>
                      <div className="flex justify-between"><span className="text-xs text-warm-muted">Visibility</span><span className="text-xs font-semibold">{selectedProfile.visibility_type || "Public"}</span></div>
                      <div className="flex justify-between"><span className="text-xs text-warm-muted">Target Com.</span><span className="text-xs font-semibold">{selectedProfile.target_communities?.length ? `${selectedProfile.target_communities.length} selected` : "All"}</span></div>
                    </div>
                  </section>
                </div>

                {/* ABOUT ME */}
                <section>
                  <h3 className="text-xs font-black uppercase tracking-wider text-warm-muted mb-4 border-b border-warm pb-2 flex items-center gap-2"><FileText className="w-4 h-4"/> About Me</h3>
                  <p className="text-sm text-foreground/80 leading-relaxed bg-surface p-4 rounded-xl border border-warm">{selectedProfile.about_me || "No description provided."}</p>
                </section>

                {/* PARTNER PREFERENCES */}
                <section>
                  <h3 className="text-xs font-black uppercase tracking-wider text-warm-muted mb-4 border-b border-warm pb-2 flex items-center gap-2"><Heart className="w-4 h-4 text-pink-500 fill-pink-500"/> Partner Preferences</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface p-4 rounded-xl border border-warm">
                    <div className="flex justify-between"><span className="text-xs text-warm-muted">Looking For</span><span className="text-xs font-semibold">{selectedProfile.pref_looking_for || "-"}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-warm-muted">Age Range</span><span className="text-xs font-semibold">{selectedProfile.pref_age_min} to {selectedProfile.pref_age_max}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-warm-muted">Height Range</span><span className="text-xs font-semibold">{selectedProfile.pref_height_min} to {selectedProfile.pref_height_max}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-warm-muted">Marital Status</span><span className="text-xs font-semibold">{selectedProfile.pref_marital_status || "Any"}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-warm-muted">Education</span><span className="text-xs font-semibold">{selectedProfile.pref_education || "Any"}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-warm-muted">Location</span><span className="text-xs font-semibold">{selectedProfile.pref_location || "Any"}</span></div>
                  </div>
                </section>
              </div>

              {/* ADMIN ACTION BAR (Sticky Bottom) */}
              <div className="p-4 border-t border-warm bg-surface shrink-0 flex flex-wrap gap-2">
                {selectedProfile.status !== "Approved" && selectedProfile.status !== "Active" && (
                  <button onClick={() => handleUpdateStatus(selectedProfile.id, "Approved")} className="flex-1 py-2.5 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 transition shadow-sm flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4"/> Approve
                  </button>
                )}
                {selectedProfile.status !== "Rejected" && (
                  <button onClick={() => handleUpdateStatus(selectedProfile.id, "Rejected")} className="flex-1 py-2.5 rounded-xl bg-red-50 text-red-700 border border-red-200 font-bold text-sm hover:bg-red-100 transition shadow-sm flex items-center justify-center gap-2">
                    <Ban className="w-4 h-4"/> Reject
                  </button>
                )}
                {selectedProfile.status !== "Featured" && (
                  <button onClick={() => handleUpdateStatus(selectedProfile.id, "Featured")} className="flex-1 py-2.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 font-bold text-sm hover:bg-purple-100 transition shadow-sm flex items-center justify-center gap-2">
                    <Star className="w-4 h-4 fill-purple-700"/> Feature
                  </button>
                )}
                <button onClick={() => handleUpdateStatus(selectedProfile.id, "Flagged")} className="px-4 py-2.5 rounded-xl bg-yellow-50 text-yellow-700 border border-yellow-200 font-bold text-sm hover:bg-yellow-100 transition shadow-sm flex items-center justify-center gap-2">
                  <Flag className="w-4 h-4"/> Flag
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* FULLSCREEN PHOTO ZOOM */}
      <AnimatePresence>
        {zoomPhoto && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4">
            <button onClick={() => setZoomPhoto(null)} className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition backdrop-blur-md">
              <X className="w-6 h-6" />
            </button>
            <motion.img initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} src={zoomPhoto} className="max-w-full max-h-full object-contain rounded-lg" alt="" />
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrap>
  );
}

