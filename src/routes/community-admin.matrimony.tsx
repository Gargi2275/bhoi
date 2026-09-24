import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Sparkles,
  Loader2,
  Trash2,
  CheckCircle,
  XCircle,
  Star,
  X,
  Check,
  Search,
  Filter,
  Eye,
  Calendar,
  MapPin,
  Briefcase,
  GraduationCap,
  Download,
  Maximize2,
  ZoomIn,
  ZoomOut,
  User,
  Users,
  ClipboardList,
  AlertTriangle,
  Info,
  SlidersHorizontal,
  Mail,
  Phone,
  Image as ImageIcon,
  Shield,
  FileText
} from "lucide-react";
import { PageWrap } from "@/components/wag/PageWrap";
import { AnimatedCard, AvatarCircle } from "@/components/wag/primitives";
import { cn, hasPermission } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useModulePermissions } from "./community-admin";

export const Route = createFileRoute("/community-admin/matrimony")({
  component: MatrimonyAdminDashboard,
});

function MatrimonyAdminDashboard() {
  const { user } = useAuth();
  const perms = useModulePermissions("matrimony");
  
  // Profile list & Loading states
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  
  // Statistics State
  const [stats, setStats] = useState({
    total_profiles: 0,
    ready_for_review: 0,
    active_profiles: 0,
    featured_profiles: 0,
    rejected_profiles: 0,
    total_interests_sent: 0,
    total_matches: 0
  });

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [genderFilter, setGenderFilter] = useState("All");
  const [maritalFilter, setMaritalFilter] = useState("All");
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(70);
  const [casteQuery, setCasteQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [completionMin, setCompletionMin] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // Detail Modal State
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "family" | "preferences" | "gallery" | "logs" | "review">("overview");
  const [reviewNotes, setReviewNotes] = useState("");
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  
  // Photo Zoom Lightbox State
  const [zoomPhoto, setZoomPhoto] = useState<any | null>(null);
  const [photoZoomScale, setPhotoZoomScale] = useState(1);

  // Match Modal (Legacy support / extra feature)
  const [matchOpen, setMatchOpen] = useState(false);
  const [selectedBride, setSelectedBride] = useState<string>("");
  const [selectedGroom, setSelectedGroom] = useState<string>("");
  const [confetti, setConfetti] = useState(false);

  // Fetch profiles & stats
  const fetchData = async () => {
    if (!user) return;
    if (!user.communityId && user.role !== "super_admin") {
      setLoading(false);
      setStatsLoading(false);
      return;
    }
    setLoading(true);
    setStatsLoading(true);
    try {
      const params = user.communityId ? { communityId: user.communityId } : {};
      const [profilesRes, statsRes] = await Promise.all([
        api.getMatrimonyProfiles(params),
        user.communityId ? api.getMatrimonyAdminStats(user.communityId) : Promise.resolve(null)
      ]);
      setProfiles(profilesRes || []);
      if (statsRes) {
        setStats(statsRes);
      }
    } catch (e) {
      console.error("Error fetching matrimony data:", e);
    } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Fetch audit logs when a profile is selected or when logs tab becomes active
  useEffect(() => {
    if (selectedProfile && activeTab === "logs") {
      setLogsLoading(true);
      api.getMatrimonyAuditLogs(selectedProfile.id)
        .then(setAuditLogs)
        .catch(console.error)
        .finally(() => setLogsLoading(false));
    }
  }, [selectedProfile, activeTab]);

  // Status handler
  const handleUpdateStatus = async (id: number, status: string, notes?: string) => {
    setActionLoading(id);
    try {
      await api.adminUpdateMatrimonyProfile(id, { status, ...(notes !== undefined && { review_notes: notes }) });
      
      // Update selected profile in modal if it's currently open
      if (selectedProfile && selectedProfile.id === id) {
        // Fetch fresh copy of the profile
        const fresh = await api.getMatrimonyProfiles({ communityId: user?.communityId });
        const updated = fresh.find((p: any) => p.id === id);
        if (updated) {
          setSelectedProfile(updated);
          setReviewNotes(updated.review_notes || "");
        }
      }
      
      await fetchData();
    } catch (e) {
      console.error("Error updating profile status:", e);
      alert("Failed to update status.");
    } finally {
      setActionLoading(null);
    }
  };

  // Delete handler
  const handleDeleteProfile = async (id: number) => {
    if (!confirm("Are you sure you want to soft delete this matrimony profile? It will be marked as Deleted.")) return;
    try {
      await api.deleteMatrimonyProfile(id);
      if (selectedProfile && selectedProfile.id === id) {
        setSelectedProfile(null);
      }
      await fetchData();
    } catch (e: any) {
      alert(e.message || "Failed to delete.");
    }
  };

  // Photo management handlers
  const handleSetPrimaryPhoto = async (photoId: number) => {
    if (!selectedProfile) return;
    try {
      await api.setPrimaryMatrimonyPhoto(selectedProfile.id, photoId);
      // Refresh selected profile
      const fresh = await api.getMatrimonyProfiles({ communityId: user?.communityId });
      const updated = fresh.find((p: any) => p.id === selectedProfile.id);
      if (updated) setSelectedProfile(updated);
      await fetchData();
    } catch (e) {
      console.error(e);
      alert("Failed to set primary photo.");
    }
  };

  const handleDeletePhoto = async (photoId: number) => {
    if (!selectedProfile) return;
    if (!confirm("Delete this photo permanently?")) return;
    try {
      await api.deleteMatrimonyPhoto(selectedProfile.id, photoId);
      // Refresh selected profile
      const fresh = await api.getMatrimonyProfiles({ communityId: user?.communityId });
      const updated = fresh.find((p: any) => p.id === selectedProfile.id);
      if (updated) setSelectedProfile(updated);
      await fetchData();
    } catch (e) {
      console.error(e);
      alert("Failed to delete photo.");
    }
  };

  // Match handler
  const handleCreateMatch = () => {
    if (!selectedBride || !selectedGroom) return alert("Please select both bride and groom.");
    setConfetti(true);
    setTimeout(() => {
      setConfetti(false);
      setMatchOpen(false);
      setSelectedBride("");
      setSelectedGroom("");
    }, 2500);
  };

  // Apply filters locally for dynamic fast search
  const filteredProfiles = profiles.filter(p => {
    // 1. Search Query (Name, ID, Mobile)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const nameMatch = p.name?.toLowerCase().includes(q);
      const idMatch = `MAT-${p.id}`.toLowerCase().includes(q) || String(p.id).includes(q);
      const phoneMatch = p.contact_phone?.toLowerCase().includes(q);
      if (!nameMatch && !idMatch && !phoneMatch) return false;
    }

    // 2. Caste / Subcaste Query (Community)
    if (casteQuery) {
      const c = casteQuery.toLowerCase();
      const casteMatch = p.caste?.toLowerCase().includes(c);
      const subCasteMatch = p.sub_caste?.toLowerCase().includes(c);
      if (!casteMatch && !subCasteMatch) return false;
    }

    // 3. Status Filter
    if (statusFilter !== "All" && p.status !== statusFilter) return false;

    // 4. Gender Filter
    if (genderFilter !== "All" && p.gender !== genderFilter) return false;

    // 5. Marital Status Filter
    if (maritalFilter !== "All" && p.marital_status !== maritalFilter) return false;

    // 6. Age Range
    if (p.age !== undefined && (p.age < ageMin || p.age > ageMax)) return false;

    // 7. City Filter
    if (cityFilter && !p.city?.toLowerCase().includes(cityFilter.toLowerCase())) return false;

    // 8. State Filter
    if (stateFilter && !p.state?.toLowerCase().includes(stateFilter.toLowerCase())) return false;

    // 9. Profile Completion %
    const completion = p.completion_percentage || 0;
    if (completion < completionMin) return false;

    return true;
  });

  const brides = profiles.filter(p => p.gender === "Bride" && p.status === "Active");
  const grooms = profiles.filter(p => p.gender === "Groom" && p.status === "Active");

  // Helper for status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/20 dark:text-teal-400";
      case "Ready For Review":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400";
      case "Draft":
        return "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800/40 dark:text-zinc-400";
      case "Featured":
        return "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/20 dark:text-yellow-400";
      case "Rejected":
        return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400";
      case "Suspended":
        return "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400";
      default:
        return "bg-zinc-100 text-zinc-600 border-zinc-200";
    }
  };

  return (
    <PageWrap
      title="Matrimony Management"
      desc="Enterprise-grade community matrimony admin portal & profile moderation"
      action={
        hasPermission(user, ["Manage Matches"]) && perms.create ? (
          <button
            onClick={() => setMatchOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gold text-white text-sm font-semibold flex items-center gap-2 hover:bg-gold/90 transition shadow-sm"
          >
            <Sparkles className="w-4 h-4" /> Matchmaking
          </button>
        ) : null
      }
    >
      {/* SECTION 1: STATS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        {[
          { label: "Total Profiles", val: stats.total_profiles, color: "text-zinc-800 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-900" },
          { label: "Review Pending", val: stats.ready_for_review, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/20" },
          { label: "Active Profiles", val: stats.active_profiles, color: "text-teal-600 bg-teal-50 dark:bg-teal-950/20" },
          { label: "Featured", val: stats.featured_profiles, color: "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20" },
          { label: "Rejected", val: stats.rejected_profiles, color: "text-red-500 bg-red-50 dark:bg-red-950/20" },
          { label: "Interests Sent", val: stats.total_interests_sent, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20" },
          { label: "Matches", val: stats.total_matches, color: "text-rose-600 bg-rose-50 dark:bg-rose-950/20" }
        ].map((item, idx) => (
          <div key={idx} className={cn("p-4 rounded-xl border border-warm/40 flex flex-col justify-center", item.color)}>
            {statsLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-warm-muted" />
            ) : (
              <span className="text-2xl font-black font-ui leading-none">{item.val}</span>
            )}
            <span className="text-[10px] text-warm-muted uppercase font-bold tracking-wider mt-1.5 leading-snug">{item.label}</span>
          </div>
        ))}
      </div>

      {/* SECTION 2: SEARCH & FILTERS BAR */}
      <div className="p-4 border border-warm/80 rounded-2xl bg-surface/50 mb-6 space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Main search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-warm-muted" />
            <input
              type="text"
              placeholder="Search by Name, Profile ID, or Contact Number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface border border-warm rounded-xl text-sm placeholder-warm-muted focus:outline-none focus:ring-1 focus:ring-gold"
            />
          </div>
          
          {/* Caste search */}
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Filter Caste / Sub-caste..."
              value={casteQuery}
              onChange={(e) => setCasteQuery(e.target.value)}
              className="w-full pl-4 pr-4 py-2.5 bg-surface border border-warm rounded-xl text-sm placeholder-warm-muted focus:outline-none focus:ring-1 focus:ring-gold"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "px-4 py-2.5 rounded-xl border text-sm font-semibold flex items-center gap-2 transition",
              showFilters ? "border-gold text-gold bg-gold/5" : "border-warm text-foreground hover:bg-sand"
            )}
          >
            <SlidersHorizontal className="w-4 h-4" /> Filters
          </button>
        </div>

        {/* Collapsible Advanced Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-warm pt-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {/* Status */}
                <div>
                  <label className="text-[10px] uppercase font-bold text-warm-muted block mb-1.5">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full p-2 bg-surface border border-warm rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-gold"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Draft">Draft</option>
                    <option value="Ready For Review">Ready For Review</option>
                    <option value="Active">Active</option>
                    <option value="Featured">Featured</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>

                {/* Gender */}
                <div>
                  <label className="text-[10px] uppercase font-bold text-warm-muted block mb-1.5">Gender</label>
                  <select
                    value={genderFilter}
                    onChange={(e) => setGenderFilter(e.target.value)}
                    className="w-full p-2 bg-surface border border-warm rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-gold"
                  >
                    <option value="All">All Genders</option>
                    <option value="Bride">Bride</option>
                    <option value="Groom">Groom</option>
                  </select>
                </div>

                {/* Marital Status */}
                <div>
                  <label className="text-[10px] uppercase font-bold text-warm-muted block mb-1.5">Marital Status</label>
                  <select
                    value={maritalFilter}
                    onChange={(e) => setMaritalFilter(e.target.value)}
                    className="w-full p-2 bg-surface border border-warm rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-gold"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Never Married">Never Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>

                {/* City */}
                <div>
                  <label className="text-[10px] uppercase font-bold text-warm-muted block mb-1.5">City</label>
                  <input
                    type="text"
                    placeholder="Enter City..."
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    className="w-full p-2 bg-surface border border-warm rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-gold"
                  />
                </div>

                {/* State */}
                <div>
                  <label className="text-[10px] uppercase font-bold text-warm-muted block mb-1.5">State</label>
                  <input
                    type="text"
                    placeholder="Enter State..."
                    value={stateFilter}
                    onChange={(e) => setStateFilter(e.target.value)}
                    className="w-full p-2 bg-surface border border-warm rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-gold"
                  />
                </div>

                {/* Completion threshold */}
                <div>
                  <label className="text-[10px] uppercase font-bold text-warm-muted block mb-1.5">Min Completion %</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="10"
                      value={completionMin}
                      onChange={(e) => setCompletionMin(Number(e.target.value))}
                      className="w-full accent-gold"
                    />
                    <span className="text-xs font-bold font-ui text-gold w-8 shrink-0">{completionMin}%</span>
                  </div>
                </div>

                {/* Age Range slider */}
                <div className="sm:col-span-2">
                  <label className="text-[10px] uppercase font-bold text-warm-muted block mb-1.5">Age Range: {ageMin} - {ageMax}</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="18"
                      max={ageMax}
                      value={ageMin}
                      onChange={(e) => setAgeMin(Math.max(18, Number(e.target.value)))}
                      className="w-16 p-1.5 text-center bg-surface border border-warm rounded-lg text-xs"
                    />
                    <span className="text-warm-muted text-xs">to</span>
                    <input
                      type="number"
                      min={ageMin}
                      max="80"
                      value={ageMax}
                      onChange={(e) => setAgeMax(Math.min(80, Number(e.target.value)))}
                      className="w-16 p-1.5 text-center bg-surface border border-warm rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* SECTION 3: PROFILES CONTENT */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-gold" />
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div className="text-center py-16 text-warm-muted border border-warm border-dashed rounded-3xl bg-surface/50">
          No matrimony profiles match the query.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProfiles.map((p) => {
            const hasPhoto = p.photo || p.photo_url || (p.photos && p.photos[0]?.image);
            const verified = p.is_verified;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "p-5 rounded-2xl border border-warm bg-surface hover:shadow-lg transition duration-200 grid grid-cols-1 md:grid-cols-[130px_1fr_250px] gap-5 relative overflow-hidden",
                  p.status === "Featured" ? "border-gold/55 shadow-sm shadow-gold/5 bg-gradient-to-r from-gold/5 to-transparent" : ""
                )}
              >
                {/* 1. LEFT COLUMN: PHOTO */}
                <div className="relative w-full aspect-square md:w-[130px] md:h-[160px] rounded-xl overflow-hidden bg-sand/10 border border-warm shrink-0 self-center">
                  {hasPhoto ? (
                    <img
                      src={p.photo || p.photo_url || p.photos[0]?.image}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/10 to-gold/10 flex items-center justify-center">
                      <AvatarCircle name={p.name} size={64} />
                    </div>
                  )}

                  {/* Gender badge on photo */}
                  <span
                    className={cn(
                      "absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-white shadow-sm z-10",
                      p.gender === "Bride" ? "bg-pink-500" : "bg-blue-500"
                    )}
                  >
                    {p.gender}
                  </span>

                  {/* Verification badge on photo */}
                  {verified && (
                    <span className="absolute bottom-2 right-2 bg-teal text-white p-1 rounded-full shadow-sm z-10" title="Verified Member">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </span>
                  )}
                </div>

                {/* 2. CENTER COLUMN: CORE DETAILS */}
                <div className="flex flex-col justify-between space-y-2.5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-ui font-black text-lg text-foreground leading-snug">{p.name}</h3>
                      <span className="text-xs bg-sand/35 px-2 py-0.5 rounded-lg border border-warm font-bold font-ui text-warm-muted">
                        ID: MAT-{p.id}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-1.5 gap-x-4 mt-2 text-xs text-warm-muted font-ui">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gold shrink-0" />
                        <span>{p.age} Yrs · {p.marital_status}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gold shrink-0" />
                        <span className="truncate">{p.city}, {p.state}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-gold shrink-0" />
                        <span className="truncate">Caste: {p.caste || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-gold shrink-0" />
                        <span className="truncate">{p.education || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-gold shrink-0" />
                        <span className="truncate">{p.profession || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black text-gold border border-gold/30 px-1 rounded shrink-0 font-display">₹</span>
                        <span>{p.income || "Not Disclosed"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Profile Completion percentage */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-warm-muted font-ui">
                      <span>Profile Completion</span>
                      <span className="text-gold">{(p.completion_percentage || 0)}%</span>
                    </div>
                    <div className="h-1.5 bg-sand/30 rounded-full overflow-hidden border border-warm/30">
                      <div
                        className="h-full bg-gold rounded-full transition-all duration-300"
                        style={{ width: `${p.completion_percentage || 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* 3. RIGHT COLUMN: STATUS & STATS */}
                <div className="flex flex-col justify-between items-start md:items-end border-t md:border-t-0 md:border-l border-warm/50 pt-4 md:pt-0 md:pl-5 font-ui">
                  <div className="flex flex-wrap md:flex-col items-center md:items-end gap-2 w-full">
                    {/* Status Badge */}
                    <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold border", getStatusColor(p.status))}>
                      {p.status}
                    </span>
                    
                    {/* Photos Count */}
                    <div className="flex items-center gap-1.5 text-xs text-warm-muted mt-1 font-bold">
                      <ImageIcon className="w-3.5 h-3.5 text-warm-muted" />
                      <span>{p.photos_count || 0} Photos</span>
                    </div>
                  </div>

                  {/* Interaction Mini-Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 w-full mt-3 text-center">
                    <div className="p-1.5 bg-sand/10 border border-warm/20 rounded-xl">
                      <div className="text-xs font-black text-foreground font-display">{p.views_count || 0}</div>
                      <div className="text-[8px] uppercase font-black tracking-wider text-warm-muted">Views</div>
                    </div>
                    <div className="p-1.5 bg-sand/10 border border-warm/20 rounded-xl">
                      <div className="text-xs font-black text-foreground font-display">{p.interests_received_count || 0}</div>
                      <div className="text-[8px] uppercase font-black tracking-wider text-warm-muted">Recv</div>
                    </div>
                    <div className="p-1.5 bg-sand/10 border border-warm/20 rounded-xl">
                      <div className="text-xs font-black text-foreground font-display">{p.interests_sent_count || 0}</div>
                      <div className="text-[8px] uppercase font-black tracking-wider text-warm-muted">Sent</div>
                    </div>
                  </div>

                  {/* Created Date */}
                  <div className="text-[9px] text-warm-muted font-bold mt-2 self-start md:self-end">
                    Created: {p.created_at ? new Date(p.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "N/A"}
                  </div>
                </div>

                {/* 4. BOTTOM ACTION AREA */}
                <div className="col-span-1 md:col-span-3 border-t border-warm/60 pt-3 mt-1 flex flex-wrap gap-2 items-center justify-between z-10">
                  <button
                    onClick={() => {
                      setSelectedProfile(p);
                      setReviewNotes(p.review_notes || "");
                      setActiveTab("overview");
                    }}
                    className="px-4 py-1.5 rounded-xl border border-warm text-foreground text-xs font-bold hover:bg-sand transition flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Details
                  </button>

                  <div className="flex flex-wrap gap-1.5">
                    {/* Approve (Only for Ready For Review / Draft / Suspended / Rejected) */}
                    {p.status !== "Active" && p.status !== "Featured" && perms.edit && (
                      <button
                        disabled={actionLoading === p.id}
                        onClick={() => handleUpdateStatus(p.id, "Active")}
                        className="px-3 py-1.5 rounded-xl bg-teal/10 hover:bg-teal/20 text-teal border border-teal/20 text-xs font-bold transition disabled:opacity-50"
                      >
                        Approve
                      </button>
                    )}

                    {/* Reject */}
                    {p.status === "Ready For Review" && perms.edit && (
                      <button
                        disabled={actionLoading === p.id}
                        onClick={() => handleUpdateStatus(p.id, "Rejected")}
                        className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 text-xs font-bold transition disabled:opacity-50"
                      >
                        Reject
                      </button>
                    )}

                    {/* Feature */}
                    {p.status === "Active" && perms.edit && (
                      <button
                        disabled={actionLoading === p.id}
                        onClick={() => handleUpdateStatus(p.id, "Featured")}
                        className="px-3 py-1.5 rounded-xl bg-yellow-50 hover:bg-yellow-100 text-yellow-600 border border-yellow-200 text-xs font-bold transition disabled:opacity-50 flex items-center gap-1"
                      >
                        <Star className="w-3 h-3 fill-yellow-600" /> Feature
                      </button>
                    )}
                    
                    {/* Unfeature */}
                    {p.status === "Featured" && perms.edit && (
                      <button
                        disabled={actionLoading === p.id}
                        onClick={() => handleUpdateStatus(p.id, "Active")}
                        className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-300 text-xs font-bold transition disabled:opacity-50"
                      >
                        Remove Feature
                      </button>
                    )}

                    {/* Suspend */}
                    {p.status !== "Suspended" && p.status !== "Deleted" && perms.edit && (
                      <button
                        disabled={actionLoading === p.id}
                        onClick={() => handleUpdateStatus(p.id, "Suspended")}
                        className="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 text-xs font-bold transition disabled:opacity-50"
                      >
                        Suspend
                      </button>
                    )}

                    {/* Delete */}
                    {p.status !== "Deleted" && perms.delete && (
                      <button
                        onClick={() => handleDeleteProfile(p.id)}
                        className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 text-xs font-bold transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* SECTION 4: View Details Modal (90% width) */}
      <AnimatePresence>
        {selectedProfile && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 md:p-8 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface border border-warm rounded-3xl w-full max-w-6xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-warm flex items-center justify-between bg-sand/15">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-black text-foreground font-ui">{selectedProfile.name}</h2>
                    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold border", getStatusColor(selectedProfile.status))}>
                      {selectedProfile.status}
                    </span>
                  </div>
                  <p className="text-xs text-warm-muted mt-1 font-ui font-medium">
                    Profile ID: <span className="font-bold text-foreground">MAT-{selectedProfile.id}</span> · Registered on: {selectedProfile.created_at ? new Date(selectedProfile.created_at).toLocaleDateString("en-IN") : "N/A"}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedProfile(null)}
                  className="w-10 h-10 rounded-full hover:bg-sand border border-warm/60 flex items-center justify-center transition"
                >
                  <X className="w-5 h-5 text-warm-muted" />
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-warm overflow-x-auto bg-surface">
                {[
                  { id: "overview", label: "Profile Overview", icon: User },
                  { id: "family", label: "Family Details", icon: Users },
                  { id: "preferences", label: "Preferences", icon: SlidersHorizontal },
                  { id: "gallery", label: "Photo Gallery", icon: ImageIcon },
                  { id: "logs", label: "Activity Logs", icon: ClipboardList },
                  { id: "review", label: "Admin Review", icon: Shield }
                ].map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id as any)}
                      className={cn(
                        "px-5 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors",
                        activeTab === t.id
                          ? "border-gold text-gold bg-gold/5"
                          : "border-transparent text-warm-muted hover:text-foreground"
                      )}
                    >
                      <Icon className="w-4 h-4" /> {t.label}
                    </button>
                  );
                })}
              </div>

              {/* Modal Scrollable Body */}
              <div className="p-6 overflow-y-auto flex-1 bg-zinc-50/50 dark:bg-zinc-950/20">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.15 }}
                  >
                    {/* TAB 1: OVERVIEW */}
                    {activeTab === "overview" && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Basic Profile info */}
                          <div className="p-5 border border-warm rounded-2xl bg-surface space-y-4">
                            <h3 className="font-ui font-black text-sm text-gold uppercase tracking-wider flex items-center gap-2 border-b border-warm pb-2">
                              <User className="w-4 h-4" /> Personal Attributes
                            </h3>
                            <div className="grid grid-cols-2 gap-y-3 text-xs">
                              <div>
                                <span className="text-warm-muted block">Gender</span>
                                <span className="font-bold">{selectedProfile.gender}</span>
                              </div>
                              <div>
                                <span className="text-warm-muted block">Date of Birth</span>
                                <span className="font-bold">{selectedProfile.dob || "N/A"}</span>
                              </div>
                              <div>
                                <span className="text-warm-muted block">Age</span>
                                <span className="font-bold">{selectedProfile.age} Yrs</span>
                              </div>
                              <div>
                                <span className="text-warm-muted block">Marital Status</span>
                                <span className="font-bold">{selectedProfile.marital_status}</span>
                              </div>
                              <div>
                                <span className="text-warm-muted block">Height / Weight</span>
                                <span className="font-bold">{selectedProfile.height || "N/A"} / {selectedProfile.weight || "N/A"}</span>
                              </div>
                              <div>
                                <span className="text-warm-muted block">Complexion</span>
                                <span className="font-bold">{selectedProfile.complexion || "N/A"}</span>
                              </div>
                              <div>
                                <span className="text-warm-muted block">Mother Tongue</span>
                                <span className="font-bold">{selectedProfile.mother_tongue || "N/A"}</span>
                              </div>
                              <div>
                                <span className="text-warm-muted block">Languages</span>
                                <span className="font-bold truncate block" title={selectedProfile.languages_known}>{selectedProfile.languages_known || "N/A"}</span>
                              </div>
                            </div>
                          </div>

                          {/* Professional info */}
                          <div className="p-5 border border-warm rounded-2xl bg-surface space-y-4">
                            <h3 className="font-ui font-black text-sm text-gold uppercase tracking-wider flex items-center gap-2 border-b border-warm pb-2">
                              <Briefcase className="w-4 h-4" /> Education & Profession
                            </h3>
                            <div className="grid grid-cols-1 gap-y-3 text-xs">
                              <div>
                                <span className="text-warm-muted block">Education Degree</span>
                                <span className="font-bold">{selectedProfile.education || "N/A"}</span>
                              </div>
                              <div>
                                <span className="text-warm-muted block">Profession / Occupation</span>
                                <span className="font-bold">{selectedProfile.profession || "N/A"}</span>
                              </div>
                              <div>
                                <span className="text-warm-muted block">Annual Income</span>
                                <span className="font-bold">{selectedProfile.income || "Not Disclosed"}</span>
                              </div>
                              <div>
                                <span className="text-warm-muted block">Religion</span>
                                <span className="font-bold">{selectedProfile.religion || "N/A"}</span>
                              </div>
                              <div>
                                <span className="text-warm-muted block">Caste / Sub-Caste</span>
                                <span className="font-bold">{selectedProfile.caste || "N/A"} / {selectedProfile.sub_caste || "N/A"}</span>
                              </div>
                            </div>
                          </div>

                          {/* Contact Info & Location */}
                          <div className="p-5 border border-warm rounded-2xl bg-surface space-y-4">
                            <h3 className="font-ui font-black text-sm text-gold uppercase tracking-wider flex items-center gap-2 border-b border-warm pb-2">
                              <Mail className="w-4 h-4" /> Contact & Location
                            </h3>
                            <div className="grid grid-cols-1 gap-y-3 text-xs">
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-warm-muted shrink-0" />
                                <div>
                                  <span className="text-warm-muted block text-[10px]">Contact Phone</span>
                                  <span className="font-bold">{selectedProfile.contact_phone || "N/A"}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-warm-muted shrink-0" />
                                <div>
                                  <span className="text-warm-muted block text-[10px]">Contact Email</span>
                                  <span className="font-bold">{selectedProfile.contact_email || "N/A"}</span>
                                </div>
                              </div>
                              <div>
                                <span className="text-warm-muted block">City / State</span>
                                <span className="font-bold">{selectedProfile.city || "N/A"}, {selectedProfile.state || "N/A"}</span>
                              </div>
                              <div>
                                <span className="text-warm-muted block">Native Place</span>
                                <span className="font-bold">{selectedProfile.native_place || "N/A"}</span>
                              </div>
                              <div>
                                <span className="text-warm-muted block">Contact Person / Relation</span>
                                <span className="font-bold">{selectedProfile.contact_name || "Self"} ({selectedProfile.contact_relation || "Self"})</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Divorced / Widowed Specific Details (if applicable) */}
                        {selectedProfile.marital_status !== "Never Married" && (
                          <div className="p-5 border border-warm rounded-2xl bg-surface space-y-3">
                            <h3 className="font-ui font-black text-sm text-gold uppercase tracking-wider flex items-center gap-2 border-b border-warm pb-1.5">
                              <Info className="w-4 h-4" /> Additional Marital Details
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                              {selectedProfile.marital_status === "Divorced" && (
                                <>
                                  <div>
                                    <span className="text-warm-muted block">Divorce Year</span>
                                    <span className="font-bold">{selectedProfile.divorce_year || "N/A"}</span>
                                  </div>
                                  <div>
                                    <span className="text-warm-muted block">Has Children</span>
                                    <span className="font-bold">{selectedProfile.has_children ? "Yes" : "No"}</span>
                                  </div>
                                  <div>
                                    <span className="text-warm-muted block">Children Count</span>
                                    <span className="font-bold">{selectedProfile.children_count || 0}</span>
                                  </div>
                                  <div>
                                    <span className="text-warm-muted block">Children Living With</span>
                                    <span className="font-bold">{selectedProfile.children_living_with || "N/A"}</span>
                                  </div>
                                </>
                              )}
                              {selectedProfile.marital_status === "Widowed" && (
                                <>
                                  <div>
                                    <span className="text-warm-muted block">Year of Loss</span>
                                    <span className="font-bold">{selectedProfile.year_of_loss || "N/A"}</span>
                                  </div>
                                  <div className="col-span-3">
                                    <span className="text-warm-muted block">Children Info</span>
                                    <span className="font-bold">{selectedProfile.widowed_children_info || "N/A"}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Lifestyle & About Me */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="p-5 border border-warm rounded-2xl bg-surface space-y-3">
                            <h3 className="font-ui font-black text-sm text-gold uppercase tracking-wider border-b border-warm pb-2">Lifestyle</h3>
                            <div className="grid grid-cols-2 gap-y-3 text-xs">
                              <div>
                                <span className="text-warm-muted block">Diet</span>
                                <span className="font-bold">{selectedProfile.diet || "N/A"}</span>
                              </div>
                              <div>
                                <span className="text-warm-muted block">Smoking</span>
                                <span className="font-bold">{selectedProfile.smoking || "N/A"}</span>
                              </div>
                              <div>
                                <span className="text-warm-muted block">Drinking</span>
                                <span className="font-bold">{selectedProfile.drinking || "N/A"}</span>
                              </div>
                              <div>
                                <span className="text-warm-muted block">Aadhaar (Last 4)</span>
                                <span className="font-bold">{selectedProfile.aadhaar ? `***${selectedProfile.aadhaar.slice(-4)}` : "Not Provided"}</span>
                              </div>
                            </div>
                          </div>

                          <div className="md:col-span-2 p-5 border border-warm rounded-2xl bg-surface space-y-3">
                            <h3 className="font-ui font-black text-sm text-gold uppercase tracking-wider border-b border-warm pb-2">About Bio-Data</h3>
                            <p className="text-xs text-foreground leading-relaxed italic whitespace-pre-wrap break-all">
                              "{selectedProfile.about || "No profile bio written yet."}"
                            </p>

                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 2: FAMILY DETAILS */}
                    {activeTab === "family" && (
                      <div className="space-y-6">
                        {selectedProfile.family_details ? (
                          <div className="space-y-5">
                            {/* Family Header */}
                            <div className="p-5 border border-warm rounded-2xl bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div>
                                <h3 className="font-ui font-black text-sm text-gold uppercase tracking-wider">Family Group</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-xs mt-2.5">
                                  <div>
                                    <span className="text-warm-muted">Family Head:</span>{" "}
                                    <span className="font-bold text-foreground">{selectedProfile.family_details.head}</span>
                                  </div>
                                  <div>
                                    <span className="text-warm-muted">Village / Native Place:</span>{" "}
                                    <span className="font-bold text-foreground">{selectedProfile.family_details.village || "Not Specified"}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <span className="bg-sand/35 border border-warm/60 px-3.5 py-1.5 rounded-xl text-xs font-bold text-warm-muted">
                                Total Members: {selectedProfile.family_details.members?.length || 0}
                              </span>
                            </div>

                            {/* Family Members Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {selectedProfile.family_details.members?.map((m: any) => (
                                <div key={m.id} className="p-4 border border-warm rounded-xl bg-surface space-y-3">
                                  <div className="flex items-center justify-between border-b border-warm pb-2">
                                    <h4 className="font-bold text-sm text-foreground">{m.name}</h4>
                                    <span className="px-2 py-0.5 rounded-md bg-gold/10 text-gold text-[10px] font-black uppercase tracking-wider">
                                      {m.relation}
                                    </span>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <span className="text-warm-muted block text-[10px]">Age</span>
                                      <span className="font-semibold">{m.age ? `${m.age} Yrs` : "N/A"}</span>
                                    </div>
                                    <div>
                                      <span className="text-warm-muted block text-[10px]">Education</span>
                                      <span className="font-semibold truncate block" title={m.education}>{m.education || "N/A"}</span>
                                    </div>
                                    <div>
                                      <span className="text-warm-muted block text-[10px]">Occupation</span>
                                      <span className="font-semibold truncate block" title={m.occupation}>{m.occupation || "N/A"}</span>
                                    </div>
                                    <div>
                                      <span className="text-warm-muted block text-[10px]">Annual Income</span>
                                      <span className="font-semibold">{m.salary || "N/A"}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-12 border border-warm border-dashed rounded-3xl bg-surface space-y-2">
                            <Users className="w-8 h-8 text-warm-muted mx-auto" />
                            <p className="text-sm font-semibold text-warm-muted">No family linkage established for this profile.</p>
                            <p className="text-xs text-warm-muted/70">Ensure they are linked to a family tree in the member register.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 3: PARTNER PREFERENCES */}
                    {activeTab === "preferences" && (
                      <div className="space-y-6">
                        {selectedProfile.partner_preference ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Core Preferences */}
                            <div className="p-5 border border-warm rounded-2xl bg-surface space-y-4">
                              <h3 className="font-ui font-black text-sm text-gold uppercase tracking-wider flex items-center gap-2 border-b border-warm pb-2">
                                <Heart className="w-4 h-4 fill-gold text-gold" /> Partner Match Requirements
                              </h3>
                              <div className="grid grid-cols-2 gap-y-3 text-xs">
                                <div>
                                  <span className="text-warm-muted block">Preferred Age</span>
                                  <span className="font-bold">{selectedProfile.partner_preference.min_age} - {selectedProfile.partner_preference.max_age} Yrs</span>
                                </div>
                                <div>
                                  <span className="text-warm-muted block">Preferred Height</span>
                                  <span className="font-bold">
                                    {selectedProfile.partner_preference.min_height || "N/A"} - {selectedProfile.partner_preference.max_height || "N/A"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-warm-muted block">Marital Status</span>
                                  <span className="font-bold">{selectedProfile.partner_preference.marital_status || "Any"}</span>
                                </div>
                                <div>
                                  <span className="text-warm-muted block">Preferred Religion</span>
                                  <span className="font-bold">{selectedProfile.partner_preference.country || "Any"}</span>
                                </div>
                                <div>
                                  <span className="text-warm-muted block">Caste Preference</span>
                                  <span className="font-bold truncate block" title={selectedProfile.partner_preference.caste}>{selectedProfile.partner_preference.caste || "Any"}</span>
                                </div>
                                <div>
                                  <span className="text-warm-muted block">Sub-Caste Preference</span>
                                  <span className="font-bold truncate block" title={selectedProfile.partner_preference.sub_caste}>{selectedProfile.partner_preference.sub_caste || "Any"}</span>
                                </div>
                              </div>
                            </div>

                            {/* Professional Preferences */}
                            <div className="p-5 border border-warm rounded-2xl bg-surface space-y-4">
                              <h3 className="font-ui font-black text-sm text-gold uppercase tracking-wider flex items-center gap-2 border-b border-warm pb-2">
                                <Briefcase className="w-4 h-4" /> Professional & Location Prefs
                              </h3>
                              <div className="grid grid-cols-2 gap-y-3 text-xs">
                                <div>
                                  <span className="text-warm-muted block">Preferred Education</span>
                                  <span className="font-bold truncate block" title={selectedProfile.partner_preference.education}>{selectedProfile.partner_preference.education || "Any"}</span>
                                </div>
                                <div>
                                  <span className="text-warm-muted block">Preferred Occupation</span>
                                  <span className="font-bold truncate block" title={selectedProfile.partner_preference.occupation}>{selectedProfile.partner_preference.occupation || "Any"}</span>
                                </div>
                                <div>
                                  <span className="text-warm-muted block">Preferred Income Range</span>
                                  <span className="font-bold">{selectedProfile.partner_preference.income_range || "Any"}</span>
                                </div>
                                <div>
                                  <span className="text-warm-muted block">Preferred State</span>
                                  <span className="font-bold">{selectedProfile.partner_preference.state || "Any"}</span>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-warm-muted block">Preferred City</span>
                                  <span className="font-bold">{selectedProfile.partner_preference.city || "Any"}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-12 border border-warm border-dashed rounded-3xl bg-surface space-y-2">
                            <SlidersHorizontal className="w-8 h-8 text-warm-muted mx-auto" />
                            <p className="text-sm font-semibold text-warm-muted">No partner preferences set yet by the user.</p>
                            <p className="text-xs text-warm-muted/70">They will show up here once configured on their dashboard.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 4: PHOTO GALLERY */}
                    {activeTab === "gallery" && (
                      <div className="space-y-6">
                        {/* Primary Photo Section */}
                        <div className="p-5 border border-warm rounded-2xl bg-surface">
                          <h3 className="font-ui font-black text-xs text-gold uppercase tracking-wider border-b border-warm pb-2 mb-4">Primary Photo</h3>
                          <div className="flex flex-col sm:flex-row items-center gap-6">
                            <div className="relative w-44 h-56 rounded-2xl overflow-hidden bg-sand/15 border border-warm shrink-0 group">
                              <img
                                src={selectedProfile.photo || selectedProfile.photo_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&fit=crop"}
                                alt="Primary Photo"
                                className="w-full h-full object-cover"
                              />
                              <button
                                onClick={() => {
                                  setZoomPhoto(selectedProfile.photo || selectedProfile.photo_url);
                                  setPhotoZoomScale(1);
                                }}
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white"
                              >
                                <Maximize2 className="w-6 h-6" />
                              </button>
                            </div>
                            
                            <div className="space-y-3 text-xs">
                              <div>
                                <span className="text-warm-muted block">Category</span>
                                <span className="font-bold">Profile Photo (Primary)</span>
                              </div>
                              <div>
                                <span className="text-warm-muted block">Visibility Status</span>
                                <span className="font-bold text-teal flex items-center gap-1">
                                  <Shield className="w-3.5 h-3.5 fill-teal/10" /> Public to Permitted Members
                                </span>
                              </div>
                              <div className="flex gap-2 pt-2">
                                <a
                                  href={selectedProfile.photo || selectedProfile.photo_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 rounded-xl border border-warm bg-surface hover:bg-sand text-foreground font-bold flex items-center gap-1.5 transition"
                                >
                                  <Download className="w-3.5 h-3.5" /> Download Image
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* All Uploaded Photos Section */}
                        <div className="p-5 border border-warm rounded-2xl bg-surface">
                          <h3 className="font-ui font-black text-xs text-gold uppercase tracking-wider border-b border-warm pb-2 mb-4">
                            All Uploaded Photos ({selectedProfile.photos?.length || 0})
                          </h3>
                          
                          {selectedProfile.photos && selectedProfile.photos.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                              {selectedProfile.photos.map((ph: any) => (
                                <div key={ph.id} className="border border-warm rounded-2xl overflow-hidden bg-sand/5 flex flex-col group relative">
                                  <div className="relative aspect-[4/5] overflow-hidden bg-zinc-950">
                                    <img
                                      src={ph.image}
                                      alt=""
                                      className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                                    />
                                    <button
                                      onClick={() => {
                                        setZoomPhoto(ph.image);
                                        setPhotoZoomScale(1);
                                      }}
                                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white"
                                    >
                                      <Maximize2 className="w-5 h-5" />
                                    </button>
                                  </div>

                                  <div className="p-2.5 text-[10px] space-y-1.5 bg-surface border-t border-warm flex-1 flex flex-col justify-between">
                                    <div>
                                      <div className="font-bold truncate text-foreground">{ph.category}</div>
                                      <div className="text-warm-muted">{ph.is_private ? "Private" : "Public"}</div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-1 pt-1.5 border-t border-warm/50">
                                      {ph.category !== "Profile Photo" && (
                                        <button
                                          onClick={() => handleSetPrimaryPhoto(ph.id)}
                                          className="py-1 rounded bg-teal/10 hover:bg-teal/20 text-teal font-black text-[8px] uppercase tracking-wider transition"
                                        >
                                          Set Primary
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleDeletePhoto(ph.id)}
                                        className="py-1 rounded bg-red-50 hover:bg-red-100 text-red-500 font-bold text-[8px] uppercase tracking-wider transition"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-warm-muted text-center py-6">No extra photos uploaded in gallery.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* TAB 5: ACTIVITY LOGS */}
                    {activeTab === "logs" && (
                      <div className="space-y-6">
                        <div className="p-5 border border-warm rounded-2xl bg-surface space-y-4">
                          <h3 className="font-ui font-black text-sm text-gold uppercase tracking-wider flex items-center gap-2 border-b border-warm pb-2">
                            <ClipboardList className="w-4 h-4" /> Audit History & Changes
                          </h3>

                          {logsLoading ? (
                            <div className="flex justify-center py-10">
                              <Loader2 className="w-6 h-6 animate-spin text-gold" />
                            </div>
                          ) : auditLogs.length === 0 ? (
                            <p className="text-xs text-warm-muted py-6 text-center">No audit log entries found for this profile.</p>
                          ) : (
                            <div className="relative border-l border-warm/80 pl-6 ml-2.5 space-y-6 text-xs">
                              {auditLogs.map((log) => (
                                <div key={log.id} className="relative">
                                  {/* Dot */}
                                  <span className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full bg-gold border border-surface shadow-sm" />
                                  
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-warm/40 pb-2">
                                    <div>
                                      <span className="font-bold text-foreground block text-sm">{log.action}</span>
                                      <span className="text-[10px] text-warm-muted">Performed by: <span className="font-semibold text-foreground">{log.performed_by_username || "System/User"}</span></span>
                                    </div>
                                    <span className="text-[10px] text-warm-muted font-mono self-start sm:self-center">
                                      {new Date(log.timestamp).toLocaleString("en-IN")}
                                    </span>
                                  </div>
                                  {log.details && (
                                    <p className="text-warm-muted mt-1.5 italic font-medium leading-relaxed">
                                      {log.details}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* TAB 6: ADMIN REVIEW */}
                    {activeTab === "review" && (
                      <div className="space-y-6">
                        <div className="p-5 border border-warm rounded-2xl bg-surface space-y-4">
                          <h3 className="font-ui font-black text-sm text-gold uppercase tracking-wider flex items-center gap-2 border-b border-warm pb-2">
                            <Shield className="w-4 h-4" /> Moderation & Review Notes
                          </h3>

                           <div className="space-y-3">
                            <label className="text-xs font-bold text-warm-muted block">Reviewer Notes (Persisted in DB)</label>
                            <textarea
                              rows={4}
                              value={reviewNotes}
                              onChange={(e) => setReviewNotes(e.target.value)}
                              disabled={!perms.edit}
                              placeholder="Write administrative review notes regarding approval, reasons for rejection, or requested changes..."
                              className="w-full p-4 bg-surface border border-warm rounded-2xl text-xs placeholder-warm-muted focus:outline-none focus:ring-1 focus:ring-gold disabled:opacity-85 disabled:cursor-not-allowed"
                            />
                            
                            {perms.edit && (
                              <div className="flex justify-end">
                                <button
                                  disabled={actionLoading === selectedProfile.id}
                                  onClick={() => handleUpdateStatus(selectedProfile.id, selectedProfile.status, reviewNotes)}
                                  className="px-4 py-2 bg-gold text-white text-xs font-bold rounded-xl hover:bg-gold/90 transition flex items-center gap-1.5 shadow-sm"
                                >
                                  {actionLoading === selectedProfile.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Review Notes"}
                                </button>
                              </div>
                            )}
                          </div>

                          {perms.edit && (
                            <div className="pt-4 border-t border-warm/60 space-y-4">
                              <h4 className="text-xs font-black uppercase tracking-wider text-warm-muted font-ui">Status Transitions</h4>
                              
                              <div className="flex flex-wrap gap-3">
                                {/* Approve Profile */}
                                {selectedProfile.status !== "Active" && selectedProfile.status !== "Featured" && (
                                  <button
                                    disabled={actionLoading === selectedProfile.id}
                                    onClick={() => handleUpdateStatus(selectedProfile.id, "Active", reviewNotes)}
                                    className="px-4 py-2.5 rounded-xl bg-teal text-white text-xs font-bold hover:bg-teal/90 transition shadow-sm flex items-center gap-1.5"
                                  >
                                    <CheckCircle className="w-4 h-4" /> Approve Profile
                                  </button>
                                )}

                                {/* Reject Profile */}
                                {selectedProfile.status !== "Rejected" && (
                                  <button
                                    disabled={actionLoading === selectedProfile.id}
                                    onClick={() => handleUpdateStatus(selectedProfile.id, "Rejected", reviewNotes)}
                                    className="px-4 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition shadow-sm flex items-center gap-1.5"
                                  >
                                    <XCircle className="w-4 h-4" /> Reject Profile
                                  </button>
                                )}

                                {/* Request Changes */}
                                {selectedProfile.status !== "Draft" && (
                                  <button
                                    disabled={actionLoading === selectedProfile.id}
                                    onClick={() => handleUpdateStatus(selectedProfile.id, "Draft", reviewNotes)}
                                    className="px-4 py-2.5 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition shadow-sm flex items-center gap-1.5"
                                  >
                                    <AlertTriangle className="w-4 h-4" /> Request Changes (Draft)
                                  </button>
                                )}

                                {/* Feature Profile */}
                                {selectedProfile.status === "Active" && (
                                  <button
                                    disabled={actionLoading === selectedProfile.id}
                                    onClick={() => handleUpdateStatus(selectedProfile.id, "Featured", reviewNotes)}
                                    className="px-4 py-2.5 rounded-xl bg-yellow-500 text-white text-xs font-bold hover:bg-yellow-600 transition shadow-sm flex items-center gap-1.5"
                                  >
                                    <Star className="w-4 h-4 fill-white" /> Feature Profile
                                  </button>
                                )}

                                {/* Suspend Profile */}
                                {selectedProfile.status !== "Suspended" && (
                                  <button
                                    disabled={actionLoading === selectedProfile.id}
                                    onClick={() => handleUpdateStatus(selectedProfile.id, "Suspended", reviewNotes)}
                                    className="px-4 py-2.5 rounded-xl bg-zinc-800 text-white text-xs font-bold hover:bg-zinc-900 dark:hover:bg-zinc-700 transition shadow-sm flex items-center gap-1.5"
                                  >
                                    <XCircle className="w-4 h-4" /> Suspend Profile
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SECTION 5: Zoom/Lightbox Modal */}
      <AnimatePresence>
        {zoomPhoto && (
          <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-[60]">
            <button
              onClick={() => setZoomPhoto(null)}
              className="absolute top-4 right-4 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition z-10"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Scale controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-zinc-900/80 border border-zinc-800 rounded-full px-5 py-2.5 flex items-center gap-4 text-white z-10">
              <button
                onClick={() => setPhotoZoomScale(Math.max(0.5, photoZoomScale - 0.25))}
                className="hover:text-gold transition p-1"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <span className="text-xs font-mono font-bold w-12 text-center">{Math.round(photoZoomScale * 100)}%</span>
              <button
                onClick={() => setPhotoZoomScale(Math.min(3, photoZoomScale + 0.25))}
                className="hover:text-gold transition p-1"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
            </div>

            <motion.div
              style={{ scale: photoZoomScale }}
              className="max-w-full max-h-[80vh] overflow-hidden rounded-2xl shadow-2xl transition-transform"
            >
              <img
                src={zoomPhoto}
                alt="Enlarged view"
                className="max-w-full max-h-[80vh] object-contain"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SECTION 6: Matchmaking Modal */}
      <AnimatePresence>
        {matchOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface border border-warm rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl p-6 relative"
            >
              <button
                onClick={() => setMatchOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-sand flex items-center justify-center transition"
              >
                <X className="w-4 h-4 text-warm-muted" />
              </button>

              <h3 className="text-lg font-black text-foreground font-ui mb-5">Create a Community Match</h3>

              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-ui font-bold text-sm mb-3 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-pink-50 text-pink-600 text-xs">Bride</span>
                    Select Bride
                  </h4>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {brides.length === 0 ? (
                      <p className="text-xs text-warm-muted text-center py-4">No active bride profiles.</p>
                    ) : (
                      brides.map((m) => (
                        <label
                          key={m.id}
                          className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition border ${selectedBride === String(m.id) ? "border-pink-300 bg-pink-50 dark:bg-pink-950/20" : "border-transparent hover:bg-sand"}`}
                        >
                          <input
                            type="radio"
                            name="bride"
                            value={m.id}
                            checked={selectedBride === String(m.id)}
                            onChange={() => setSelectedBride(String(m.id))}
                            className="accent-pink-500"
                          />
                          <AvatarCircle name={m.name} src={m.photo || m.photo_url} size={36} />
                          <div>
                            <div className="text-sm font-semibold">{m.name}{m.age ? `, ${m.age}` : ""}</div>
                            <div className="text-[10px] text-warm-muted">{m.education}</div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-ui font-bold text-sm mb-3 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs">Groom</span>
                    Select Groom
                  </h4>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {grooms.length === 0 ? (
                      <p className="text-xs text-warm-muted text-center py-4">No active groom profiles.</p>
                    ) : (
                      grooms.map((m) => (
                        <label
                          key={m.id}
                          className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition border ${selectedGroom === String(m.id) ? "border-blue-300 bg-blue-50 dark:bg-blue-950/20" : "border-transparent hover:bg-sand"}`}
                        >
                          <input
                            type="radio"
                            name="groom"
                            value={m.id}
                            checked={selectedGroom === String(m.id)}
                            onChange={() => setSelectedGroom(String(m.id))}
                            className="accent-blue-500"
                          />
                          <AvatarCircle name={m.name} src={m.photo || m.photo_url} size={36} />
                          <div>
                            <div className="text-sm font-semibold">{m.name}{m.age ? `, ${m.age}` : ""}</div>
                            <div className="text-[10px] text-warm-muted">{m.education}</div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={handleCreateMatch}
                disabled={!selectedBride || !selectedGroom}
                className="mt-6 w-full py-3 rounded-xl bg-gradient-to-r from-gold to-primary text-white font-bold flex items-center justify-center gap-2 hover:opacity-95 transition disabled:opacity-40 shadow-md"
              >
                <Heart className="w-5 h-5 fill-white" /> Confirm This Match
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confetti celebration */}
      {confetti && (
        <div className="fixed inset-0 pointer-events-none z-[100]">
          {Array.from({ length: 60 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ x: "50vw", y: "50vh", opacity: 1, scale: 1 }}
              animate={{ x: `${Math.random() * 100}vw`, y: `${Math.random() * 100}vh`, opacity: 0, scale: 0.3, rotate: Math.random() * 720 }}
              transition={{ duration: 2, ease: "easeOut" }}
              className="absolute w-3 h-3 rounded-sm"
              style={{ background: ["#C9860A", "#1B4FD8", "#0D7377", "#B91C1C", "#7C3AED", "#BE185D"][i % 6] }}
            />
          ))}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="bg-surface rounded-3xl shadow-2xl p-8 text-center border border-warm"
            >
              <Heart className="w-12 h-12 text-gold mx-auto mb-3 fill-gold" />
              <h2 className="font-display text-2xl font-bold">Match Created! 💍</h2>
              <p className="text-warm-muted text-sm mt-1">May this union be blessed.</p>
            </motion.div>
          </div>
        </div>
      )}
    </PageWrap>
  );
}
