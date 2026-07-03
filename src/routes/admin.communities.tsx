import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { 
  CheckCircle, XCircle, Clock, FileText, AlertCircle, Calendar, 
  Search, Eye, Edit, Trash2, ArrowUpDown, Globe, Facebook, Instagram, 
  Youtube, Twitter, Users, Building, Heart, ShieldAlert, Award, CalendarDays, ExternalLink
} from "lucide-react";
import { PageWrap } from "@/components/wag/PageWrap";
import { AnimatedCard, DetailDrawer, StatusBadge, EmptyState, Modal } from "@/components/wag/primitives";
import { api } from "@/lib/api";

export const Route = createFileRoute("/admin/communities")({
  component: () => {
    const [communities, setCommunities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState("All");
    const [open, setOpen] = useState<any | null>(null);
    const [remarks, setRemarks] = useState("");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Search, sorting, and pagination state
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState("name");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Edit and Delete modals state
    const [editingCommunity, setEditingCommunity] = useState<any | null>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [deletingCommunity, setDeletingCommunity] = useState<any | null>(null);

    const tabs = ["All", "Pending Super Requests", "Pending Subsidiary Requests", "Approved Communities", "Rejected Communities"];

    const fetchCommunities = () => {
      setLoading(true);
      api.getCommunities()
        .then(res => {
          setCommunities(res || []);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    };

    useEffect(() => {
      fetchCommunities();
      const handleUpdate = () => {
        fetchCommunities();
      };
      window.addEventListener("community-updated", handleUpdate);
      return () => window.removeEventListener("community-updated", handleUpdate);
    }, []);

    useEffect(() => {
      if (open) {
        const fresh = communities.find(c => c.id === open.id);
        if (fresh) setOpen(fresh);
      }
    }, [communities]);

    const handleApprove = async (id: string) => {
      setErrorMsg(null);
      setActionLoading(true);
      try {
        await api.approveCommunity(id, remarks);
        setRemarks("");
        fetchCommunities();
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to approve community.");
      } finally {
        setActionLoading(false);
      }
    };

    const handleReject = async (id: string) => {
      setErrorMsg(null);
      if (!remarks.trim()) {
        setErrorMsg("Rejection reason is mandatory.");
        return;
      }
      setActionLoading(true);
      try {
        await api.rejectCommunity(id, remarks);
        setRemarks("");
        fetchCommunities();
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to reject community.");
      } finally {
        setActionLoading(false);
      }
    };

    const handleEditClick = (c: any, e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingCommunity(c);
      setEditForm({
        name: c.name || "",
        registration_no: c.registration_no || c.registrationNo || "",
        caste: c.caste || "",
        sub_caste: c.sub_caste || "",
        email: c.email || "",
        phone: c.phone || "",
        est_year: c.est_year || c.estYear || "",
        website: c.website || "",
        village: c.village || "",
        taluka: c.taluka || "",
        district: c.district || "",
        state: c.state || "",
        plan: c.plan || "Free",
        status: c.status || "Pending",
        office_address: c.office_address || c.officeAddress || "",
        vision_mission: c.vision_mission || c.visionMission || "",
        desc: c.desc || "",
        social_fb: c.social_fb || c.socialFb || "",
        social_tw: c.social_tw || c.socialTw || "",
        social_yt: c.social_yt || c.socialYt || "",
      });
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setActionLoading(true);
      setErrorMsg(null);
      try {
        await api.updateCommunity(editingCommunity.id, editForm);
        setEditingCommunity(null);
        fetchCommunities();
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to update community.");
      } finally {
        setActionLoading(false);
      }
    };

    const handleDeleteClick = (c: any, e: React.MouseEvent) => {
      e.stopPropagation();
      setDeletingCommunity(c);
    };

    const handleDeleteConfirm = async () => {
      setActionLoading(true);
      try {
        await api.deleteCommunity(deletingCommunity.id);
        setDeletingCommunity(null);
        if (open?.id === deletingCommunity.id) {
          setOpen(null);
        }
        fetchCommunities();
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to delete community.");
      } finally {
        setActionLoading(false);
      }
    };

    const handleSort = (field: string) => {
      if (sortBy === field) {
        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
      } else {
        setSortBy(field);
        setSortOrder("asc");
      }
    };

    // Filter by tab
    const tabFiltered = communities.filter(c => {
      const isRoot = !c.parent;
      const isBranch = !isRoot;

      if (tab === "All") return true;
      if (tab === "Pending Super Requests") {
        return isRoot && (c.status === "Pending Super Admin Approval" || c.status === "Pending");
      }
      if (tab === "Pending Subsidiary Requests") {
        return isBranch && (c.status === "Pending Super Admin Approval" || c.status === "Pending Parent Community Approval");
      }
      if (tab === "Approved Communities") {
        return c.status === "Active" || c.status === "Approved";
      }
      if (tab === "Rejected Communities") {
        return c.status?.startsWith("Rejected");
      }
      return true;
    });

    // Filter by search query
    const searchedList = tabFiltered.filter(c => {
      const q = searchQuery.toLowerCase();
      return (
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.district?.toLowerCase().includes(q) ||
        c.state?.toLowerCase().includes(q) ||
        c.village?.toLowerCase().includes(q)
      );
    });

    // Sort list
    const sortedList = [...searchedList].sort((a, b) => {
      let valA = a[sortBy] ?? "";
      let valB = b[sortBy] ?? "";
      
      if (sortBy === "member_count") {
        valA = a.member_count ?? 0;
        valB = b.member_count ?? 0;
      } else if (sortBy === "created_at") {
        valA = a.created_at ? new Date(a.created_at).getTime() : 0;
        valB = b.created_at ? new Date(b.created_at).getTime() : 0;
      }
      
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    // Pagination
    const totalPages = Math.ceil(sortedList.length / itemsPerPage);
    const paginatedList = sortedList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const getStatusBadge = (status: string) => {
      const s = status || "Pending";
      if (s === "Active" || s === "Approved") {
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">🟢 Active</span>;
      }
      if (s.startsWith("Pending")) {
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">🟡 Pending</span>;
      }
      if (s.startsWith("Rejected")) {
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">🔴 Rejected</span>;
      }
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200">⚪ {s}</span>;
    };

    const getTypeBadge = (parent: any) => {
      if (!parent) {
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">🟢 Super Community</span>;
      }
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">🔵 Subsidiary Community</span>;
    };

    return (
      <PageWrap title="Communities" desc="All platform communities and registration requests">
        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-warm mb-6 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setErrorMsg(null); setCurrentPage(1); }}
              className={`px-4 py-2 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                tab === t ? "border-primary text-primary" : "border-transparent text-warm-muted hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-warm-muted" />
            <input 
              type="text" 
              placeholder="Search communities..." 
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="pl-9 pr-4 py-2 w-full text-sm rounded-xl border border-warm bg-surface focus:outline-none focus:border-primary placeholder-warm-muted transition"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-warm-muted self-end sm:self-auto">
            <span>Sort by:</span>
            <button 
              onClick={() => handleSort("name")}
              className={`px-2.5 py-1.5 rounded-lg border border-warm bg-surface font-semibold flex items-center gap-1 hover:bg-sand/30 transition ${sortBy === "name" ? "text-primary border-primary" : ""}`}
            >
              Name <ArrowUpDown className="w-3 h-3" />
            </button>
            <button 
              onClick={() => handleSort("member_count")}
              className={`px-2.5 py-1.5 rounded-lg border border-warm bg-surface font-semibold flex items-center gap-1 hover:bg-sand/30 transition ${sortBy === "member_count" ? "text-primary border-primary" : ""}`}
            >
              Members <ArrowUpDown className="w-3 h-3" />
            </button>
            <button 
              onClick={() => handleSort("created_at")}
              className={`px-2.5 py-1.5 rounded-lg border border-warm bg-surface font-semibold flex items-center gap-1 hover:bg-sand/30 transition ${sortBy === "created_at" ? "text-primary border-primary" : ""}`}
            >
              Date <ArrowUpDown className="w-3 h-3" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : sortedList.length === 0 ? (
          <AnimatedCard className="border border-warm shadow-sm">
            <EmptyState 
              icon={<ShieldAlert className="w-8 h-8 text-gold" />}
              title="No Communities Found"
              desc="No registered communities matched your filters or search query."
            />
          </AnimatedCard>
        ) : (
          <div className="space-y-4">
            <AnimatedCard className="overflow-hidden shadow-sm border border-warm bg-surface">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-sand/50 text-warm-muted border-b border-warm">
                    <tr>
                      <th className="p-4 text-xs uppercase font-bold tracking-wider">Community</th>
                      <th className="p-4 text-xs uppercase font-bold tracking-wider">Type</th>
                      <th className="p-4 text-xs uppercase font-bold tracking-wider">Location</th>
                      <th className="p-4 text-xs uppercase font-bold tracking-wider">Members</th>
                      <th className="p-4 text-xs uppercase font-bold tracking-wider">Plan</th>
                      <th className="p-4 text-xs uppercase font-bold tracking-wider">Status</th>
                      <th className="p-4 text-xs uppercase font-bold tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm">
                    {paginatedList.map(c => (
                      <tr 
                        key={c.id} 
                        onClick={() => { setOpen(c); setErrorMsg(null); setRemarks(""); }} 
                        className="hover:bg-sand/20 cursor-pointer transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <img 
                              src={c.logo || c.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=random&size=80`} 
                              className="w-10 h-10 rounded-xl object-cover border border-warm shadow-sm bg-surface" 
                              alt={c.name}
                              onError={(e: any) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=random&size=80`; }}
                            />
                            <div className="min-w-0">
                              <div className="font-semibold text-foreground truncate">{c.name}</div>
                              <div className="text-xs text-warm-muted truncate">{c.email || "No email"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          {getTypeBadge(c.parent)}
                        </td>
                        <td className="p-4 text-xs text-warm-muted">
                          {c.village ? `${c.village}, ` : ""}{c.district}, {c.state}
                        </td>
                        <td className="p-4 font-semibold text-foreground">
                          {(c.member_count ?? 0).toLocaleString()}
                        </td>
                        <td className="p-4">
                          {/* Plan removed */}
                        </td>
                        <td className="p-4">
                          {getStatusBadge(c.status)}
                        </td>
                        <td className="p-4 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex gap-1.5 justify-end">
                            {(c.status === "Pending Super Admin Approval" || c.status === "Pending") && (
                              <button 
                                onClick={() => { setOpen(c); setErrorMsg(null); }}
                                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-teal text-white hover:bg-teal-600 transition shadow-sm"
                              >
                                Review
                              </button>
                            )}
                            <button 
                              onClick={() => { setOpen(c); setErrorMsg(null); }}
                              title="View Details"
                              className="p-1.5 text-warm-muted hover:text-primary hover:bg-sand/50 rounded-lg transition"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => handleEditClick(c, e)}
                              title="Edit Community"
                              className="p-1.5 text-warm-muted hover:text-teal hover:bg-sand/50 rounded-lg transition"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => handleDeleteClick(c, e)}
                              title="Delete Community"
                              className="p-1.5 text-warm-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AnimatedCard>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center px-2 py-3 border border-warm rounded-xl bg-surface/50 text-xs">
                <span className="text-warm-muted">
                  Showing page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({sortedList.length} total)
                </span>
                <div className="flex gap-2">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="px-3 py-1.5 border border-warm bg-surface hover:bg-sand/50 font-semibold rounded-lg disabled:opacity-50 transition"
                  >
                    Previous
                  </button>
                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="px-3 py-1.5 border border-warm bg-surface hover:bg-sand/50 font-semibold rounded-lg disabled:opacity-50 transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Details Drawer */}
        <DetailDrawer open={!!open} onClose={() => setOpen(null)} title={open?.name} size="lg">
          {open && (
            <div className="space-y-6">
              {/* Cover & Logo Header */}
              <div className="relative rounded-2xl overflow-hidden border border-warm shadow-sm bg-sand/30">
                <div className="h-32 w-full bg-gradient-to-r from-primary/10 via-gold/10 to-teal/10 relative">
                  {(open.cover || open.cover_url) && (
                    <img src={open.cover || open.cover_url} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="p-6 pt-0 relative flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-10">
                  <img 
                    src={open.logo || open.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(open.name)}&background=random&size=100`} 
                    className="w-20 h-20 rounded-2xl object-cover border-4 border-surface shadow-md bg-surface" 
                    alt={open.name}
                    onError={(e: any) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(open.name)}&background=random&size=100`; }}
                  />
                  <div className="flex-1 min-w-0 pb-1">
                    <h3 className="font-ui font-bold text-xl text-foreground truncate">{open.name}</h3>
                    <p className="text-xs text-warm-muted">
                      <span>{open.village ? `${open.village}, ` : ""}{open.district}, {open.state}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:self-end self-start">
                    {getTypeBadge(open.parent)}
                    {getStatusBadge(open.status)}
                  </div>
                </div>
              </div>

              {/* Quick Statistics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-surface p-4 rounded-xl border border-warm/60 shadow-sm text-center">
                  <div className="text-warm-muted text-xs font-semibold mb-1">Members</div>
                  <div className="font-bold text-lg text-foreground">{(open.member_count ?? 0).toLocaleString()}</div>
                </div>
                <div className="bg-surface p-4 rounded-xl border border-warm/60 shadow-sm text-center">
                  <div className="text-warm-muted text-xs font-semibold mb-1">Committee</div>
                  <div className="font-bold text-lg text-foreground">{(open.committee_count ?? 0).toLocaleString()}</div>
                </div>
                <div className="bg-surface p-4 rounded-xl border border-warm/60 shadow-sm text-center">
                  <div className="text-warm-muted text-xs font-semibold mb-1">Families</div>
                  <div className="font-bold text-lg text-foreground">{(open.families_count ?? 0).toLocaleString()}</div>
                </div>
                <div className="bg-surface p-4 rounded-xl border border-warm/60 shadow-sm text-center">
                  <div className="text-warm-muted text-xs font-semibold mb-1">Events</div>
                  <div className="font-bold text-lg text-foreground">{(open.events_count ?? 0).toLocaleString()}</div>
                </div>
                <div className="bg-surface p-4 rounded-xl border border-warm/60 shadow-sm text-center">
                  <div className="text-warm-muted text-xs font-semibold mb-1">Businesses</div>
                  <div className="font-bold text-lg text-foreground">{(open.businesses_count ?? 0).toLocaleString()}</div>
                </div>
                <div className="bg-surface p-4 rounded-xl border border-warm/60 shadow-sm text-center">
                  <div className="text-warm-muted text-xs font-semibold mb-1">Donations Campaign</div>
                  <div className="font-bold text-lg text-foreground">{(open.donations_count ?? 0).toLocaleString()}</div>
                </div>
              </div>

              {/* Community Information */}
              <div className="bg-surface rounded-2xl border border-warm p-5 space-y-4 shadow-sm">
                <h4 className="font-bold text-sm text-foreground border-b border-warm pb-2">Community Information</h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-warm-muted block">Registration Number</span>
                    <span className="font-semibold text-foreground">{open.registration_no || open.registrationNo || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-warm-muted block">Established Year</span>
                    <span className="font-semibold text-foreground">{open.est_year || open.estYear || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-warm-muted block">Community Type</span>
                    <span className="font-semibold text-foreground">{!open.parent ? "Super Community" : "Subsidiary Community"}</span>
                  </div>
                  <div>
                    <span className="text-warm-muted block">Parent Community</span>
                    <span className="font-semibold text-foreground">{open.parent_name || "None (Super)"}</span>
                  </div>
                  <div>
                    <span className="text-warm-muted block">Email Address</span>
                    <span className="font-semibold text-foreground">{open.email || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-warm-muted block">Phone Number</span>
                    <span className="font-semibold text-foreground">{open.phone || "N/A"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-warm-muted block">Website</span>
                    {open.website ? (
                      <a href={open.website} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline flex items-center gap-1">
                        {open.website} <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="font-semibold text-foreground">N/A</span>
                    )}
                  </div>
                  <div className="col-span-2">
                    <span className="text-warm-muted block">Office Address</span>
                    <span className="font-semibold text-foreground block whitespace-pre-line bg-sand/20 p-2.5 rounded-lg border border-warm/40">{open.office_address || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Social Links */}
              {(() => {
                const hasSocials = open.social_fb || open.social_tw || open.social_yt || open.website;
                if (!hasSocials) return null;
                return (
                  <div className="bg-surface rounded-2xl border border-warm p-5 shadow-sm">
                    <h4 className="font-bold text-sm text-foreground border-b border-warm pb-2">Social & External Links</h4>
                    <div className="flex flex-wrap gap-4 pt-2 text-xs">
                      {open.social_fb && (
                        <a href={open.social_fb.startsWith('http') ? open.social_fb : `https://facebook.com/${open.social_fb}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-blue-600 hover:underline font-semibold">
                          <Facebook className="w-4 h-4" /> Facebook
                        </a>
                      )}
                      {open.social_tw && (
                        <a href={open.social_tw.startsWith('http') ? open.social_tw : `https://twitter.com/${open.social_tw}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sky-500 hover:underline font-semibold">
                          <Twitter className="w-4 h-4" /> Twitter
                        </a>
                      )}
                      {open.social_yt && (
                        <a href={open.social_yt.startsWith('http') ? open.social_yt : `https://youtube.com/${open.social_yt}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-red-600 hover:underline font-semibold">
                          <Youtube className="w-4 h-4" /> YouTube
                        </a>
                      )}
                      {open.website && (
                        <a href={open.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-teal hover:underline font-semibold">
                          <Globe className="w-4 h-4" /> Website
                        </a>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Registration Details */}
              <div className="bg-surface rounded-2xl border border-warm p-5 space-y-4 shadow-sm text-xs">
                <h4 className="font-bold text-sm text-foreground border-b border-warm pb-2">Registration Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-warm-muted block">Caste</span>
                    <span className="font-semibold text-foreground">{open.caste || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-warm-muted block">Sub-Caste</span>
                    <span className="font-semibold text-foreground">{open.sub_caste || "N/A"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-warm-muted block mb-1">Vision & Mission</span>
                    <span className="font-semibold text-foreground block bg-sand/20 p-2.5 rounded-lg border border-warm/40 whitespace-pre-line">{open.vision_mission || "N/A"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-warm-muted block mb-1">Description</span>
                    <span className="font-semibold text-foreground block bg-sand/20 p-2.5 rounded-lg border border-warm/40 whitespace-pre-line">{open.desc || "No description provided."}</span>
                  </div>
                  {open.created_at && (
                    <div className="col-span-2">
                      <span className="text-warm-muted block">Registration Date</span>
                      <span className="font-semibold text-foreground">
                        {new Date(open.created_at).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Approval Timeline */}
              <div className="bg-surface rounded-2xl border border-warm p-5 space-y-4 shadow-sm">
                <h4 className="font-bold text-sm text-foreground border-b border-warm pb-2">Approval Timeline</h4>
                {/* Modern vertical timeline */}
                <div className="space-y-6 relative pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-warm">
                  {/* Step 1: Submitted */}
                  <div className="relative text-xs">
                    <div className="absolute -left-6 rounded-full w-5 h-5 bg-emerald-500 border-2 border-surface flex items-center justify-center text-white text-[10px] font-bold">✓</div>
                    <div className="font-semibold text-foreground">Registration Submitted</div>
                    <div className="text-warm-muted mt-0.5">
                      {open.created_at ? new Date(open.created_at).toLocaleDateString() : "Submitted"}
                    </div>
                  </div>

                  {/* Step 2: Parent Approved (if applicable) */}
                  {open.parent && (
                    <div className="relative text-xs">
                      {open.status === "Rejected By Parent Community Admin" ? (
                        <>
                          <div className="absolute -left-6 rounded-full w-5 h-5 bg-red-500 border-2 border-surface flex items-center justify-center text-white text-[10px] font-bold">✗</div>
                          <div className="font-semibold text-red-600">Parent Community Rejected</div>
                        </>
                      ) : open.status === "Pending Parent Community Approval" || open.status === "Pending" ? (
                        <>
                          <div className="absolute -left-6 rounded-full w-5 h-5 bg-amber-500 border-2 border-surface flex items-center justify-center text-white text-[10px] font-bold">⧗</div>
                          <div className="font-semibold text-amber-600">Pending Parent Community Approval</div>
                        </>
                      ) : (
                        <>
                          <div className="absolute -left-6 rounded-full w-5 h-5 bg-emerald-500 border-2 border-surface flex items-center justify-center text-white text-[10px] font-bold">✓</div>
                          <div className="font-semibold text-foreground">Parent Community Approved</div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Step 3: Super Admin Approved */}
                  <div className="relative text-xs">
                    {open.status.startsWith("Rejected By Super Admin") || open.status.startsWith("Rejected By Parent") ? (
                      <>
                        <div className="absolute -left-6 rounded-full w-5 h-5 bg-red-500 border-2 border-surface flex items-center justify-center text-white text-[10px] font-bold">✗</div>
                        <div className="font-semibold text-red-600">Super Admin Rejected</div>
                      </>
                    ) : open.status === "Pending Super Admin Approval" || open.status === "Pending" || open.status === "Pending Parent Community Approval" ? (
                      <>
                        <div className="absolute -left-6 rounded-full w-5 h-5 bg-amber-500 border-2 border-surface flex items-center justify-center text-white text-[10px] font-bold">⧗</div>
                        <div className="font-semibold text-amber-600">Pending Super Admin Approval</div>
                      </>
                    ) : (
                      <>
                        <div className="absolute -left-6 rounded-full w-5 h-5 bg-emerald-500 border-2 border-surface flex items-center justify-center text-white text-[10px] font-bold">✓</div>
                        <div className="font-semibold text-foreground">Super Admin Approved</div>
                      </>
                    )}
                  </div>

                  {/* Step 4: Activated */}
                  <div className="relative text-xs">
                    {open.status === "Active" || open.status === "Approved" ? (
                      <>
                        <div className="absolute -left-6 rounded-full w-5 h-5 bg-emerald-500 border-2 border-surface flex items-center justify-center text-white text-[10px] font-bold">✓</div>
                        <div className="font-semibold text-foreground">Activated & Active</div>
                      </>
                    ) : open.status === "Suspended" || open.status === "Inactive" ? (
                      <>
                        <div className="absolute -left-6 rounded-full w-5 h-5 bg-gray-500 border-2 border-surface flex items-center justify-center text-white text-[10px] font-bold">⚪</div>
                        <div className="font-semibold text-gray-600">Inactive / Suspended</div>
                      </>
                    ) : (
                      <>
                        <div className="absolute -left-6 rounded-full w-5 h-5 bg-gray-300 border-2 border-surface flex items-center justify-center text-white text-[10px] font-bold">⚪</div>
                        <div className="font-semibold text-warm-muted">Pending Activation</div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Panel */}
              {(open.status === "Pending Super Admin Approval" || open.status === "Pending") && (
                <div className="border-t border-warm pt-4 space-y-3.5">
                  <div>
                    <label className="text-xs font-semibold block mb-1.5 text-foreground">
                      Approval / Rejection Comments *
                    </label>
                    <textarea
                      rows={2.5}
                      placeholder="Add remarks or justification. Reason is mandatory for rejection."
                      value={remarks}
                      onChange={e => setRemarks(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-warm bg-surface focus:border-primary outline-none"
                    />
                  </div>

                  {errorMsg && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3.5">
                    <button
                      disabled={actionLoading}
                      onClick={() => handleApprove(open.id)}
                      className="py-2.5 rounded-xl bg-teal text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm shadow-teal/10 hover:bg-teal-600 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle className="w-4.5 h-4.5" />
                      {actionLoading ? "Processing..." : "Approve"}
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() => handleReject(open.id)}
                      className="py-2.5 rounded-xl bg-red-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm shadow-red-500/10 hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-4.5 h-4.5" />
                      {actionLoading ? "Processing..." : "Reject"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DetailDrawer>

        {/* Edit Modal */}
        <Modal 
          open={!!editingCommunity} 
          onClose={() => setEditingCommunity(null)} 
          title={`Edit Community: ${editingCommunity?.name}`}
          size="lg"
        >
          <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1 text-foreground">Community Name</label>
                <input 
                  type="text" 
                  value={editForm.name || ""} 
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })} 
                  className="w-full px-3 py-2 rounded-lg border border-warm bg-surface outline-none focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-foreground">Registration Number</label>
                <input 
                  type="text" 
                  value={editForm.registration_no || ""} 
                  onChange={e => setEditForm({ ...editForm, registration_no: e.target.value })} 
                  className="w-full px-3 py-2 rounded-lg border border-warm bg-surface outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-foreground">Caste</label>
                <input 
                  type="text" 
                  value={editForm.caste || ""} 
                  onChange={e => setEditForm({ ...editForm, caste: e.target.value })} 
                  className="w-full px-3 py-2 rounded-lg border border-warm bg-surface outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-foreground">Sub-Caste</label>
                <input 
                  type="text" 
                  value={editForm.sub_caste || ""} 
                  onChange={e => setEditForm({ ...editForm, sub_caste: e.target.value })} 
                  className="w-full px-3 py-2 rounded-lg border border-warm bg-surface outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-foreground">Email</label>
                <input 
                  type="email" 
                  value={editForm.email || ""} 
                  onChange={e => setEditForm({ ...editForm, email: e.target.value })} 
                  className="w-full px-3 py-2 rounded-lg border border-warm bg-surface outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-foreground">Phone</label>
                <input 
                  type="text" 
                  value={editForm.phone || ""} 
                  onChange={e => setEditForm({ ...editForm, phone: e.target.value })} 
                  className="w-full px-3 py-2 rounded-lg border border-warm bg-surface outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-foreground">Established Year</label>
                <input 
                  type="number" 
                  value={editForm.est_year || ""} 
                  onChange={e => setEditForm({ ...editForm, est_year: e.target.value })} 
                  className="w-full px-3 py-2 rounded-lg border border-warm bg-surface outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-foreground">Website</label>
                <input 
                  type="url" 
                  value={editForm.website || ""} 
                  onChange={e => setEditForm({ ...editForm, website: e.target.value })} 
                  className="w-full px-3 py-2 rounded-lg border border-warm bg-surface outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-foreground">Village</label>
                <input 
                  type="text" 
                  value={editForm.village || ""} 
                  onChange={e => setEditForm({ ...editForm, village: e.target.value })} 
                  className="w-full px-3 py-2 rounded-lg border border-warm bg-surface outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-foreground">Taluka</label>
                <input 
                  type="text" 
                  value={editForm.taluka || ""} 
                  onChange={e => setEditForm({ ...editForm, taluka: e.target.value })} 
                  className="w-full px-3 py-2 rounded-lg border border-warm bg-surface outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-foreground">District</label>
                <input 
                  type="text" 
                  value={editForm.district || ""} 
                  onChange={e => setEditForm({ ...editForm, district: e.target.value })} 
                  className="w-full px-3 py-2 rounded-lg border border-warm bg-surface outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-foreground">State</label>
                <input 
                  type="text" 
                  value={editForm.state || ""} 
                  onChange={e => setEditForm({ ...editForm, state: e.target.value })} 
                  className="w-full px-3 py-2 rounded-lg border border-warm bg-surface outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-foreground">Plan</label>
                <select 
                  value={editForm.plan || "Free"} 
                  onChange={e => setEditForm({ ...editForm, plan: e.target.value })} 
                  className="w-full px-3 py-2 rounded-lg border border-warm bg-surface outline-none focus:border-primary"
                >
                  <option value="Free">Free</option>
                  <option value="Basic">Basic</option>
                  <option value="Pro">Pro</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1 text-foreground">Status</label>
                <select 
                  value={editForm.status || ""} 
                  onChange={e => setEditForm({ ...editForm, status: e.target.value })} 
                  className="w-full px-3 py-2 rounded-lg border border-warm bg-surface outline-none focus:border-primary"
                >
                  <option value="Pending Super Admin Approval">Pending Super Admin Approval</option>
                  <option value="Pending Parent Community Approval">Pending Parent Community Approval</option>
                  <option value="Approved">Approved</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
              <div className="col-span-1 sm:col-span-2">
                <label className="block font-semibold mb-1 text-foreground">Office Address</label>
                <textarea 
                  rows={2}
                  value={editForm.office_address || ""} 
                  onChange={e => setEditForm({ ...editForm, office_address: e.target.value })} 
                  className="w-full px-3 py-2 rounded-lg border border-warm bg-surface outline-none focus:border-primary"
                />
              </div>
              <div className="col-span-1 sm:col-span-2">
                <label className="block font-semibold mb-1 text-foreground">Vision & Mission</label>
                <textarea 
                  rows={2}
                  value={editForm.vision_mission || ""} 
                  onChange={e => setEditForm({ ...editForm, vision_mission: e.target.value })} 
                  className="w-full px-3 py-2 rounded-lg border border-warm bg-surface outline-none focus:border-primary"
                />
              </div>
              <div className="col-span-1 sm:col-span-2">
                <label className="block font-semibold mb-1 text-foreground">Description</label>
                <textarea 
                  rows={2}
                  value={editForm.desc || ""} 
                  onChange={e => setEditForm({ ...editForm, desc: e.target.value })} 
                  className="w-full px-3 py-2 rounded-lg border border-warm bg-surface outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-foreground">Facebook Link</label>
                <input 
                  type="text" 
                  value={editForm.social_fb || ""} 
                  onChange={e => setEditForm({ ...editForm, social_fb: e.target.value })} 
                  className="w-full px-3 py-2 rounded-lg border border-warm bg-surface outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-foreground">Twitter/X Link</label>
                <input 
                  type="text" 
                  value={editForm.social_tw || ""} 
                  onChange={e => setEditForm({ ...editForm, social_tw: e.target.value })} 
                  className="w-full px-3 py-2 rounded-lg border border-warm bg-surface outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-foreground">YouTube Link</label>
                <input 
                  type="text" 
                  value={editForm.social_yt || ""} 
                  onChange={e => setEditForm({ ...editForm, social_yt: e.target.value })} 
                  className="w-full px-3 py-2 rounded-lg border border-warm bg-surface outline-none focus:border-primary"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-warm">
              <button 
                type="button" 
                onClick={() => setEditingCommunity(null)}
                className="px-4 py-2 bg-sand hover:bg-sand/75 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 bg-primary text-white hover:bg-primary-dark rounded-lg font-semibold"
              >
                {actionLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal 
          open={!!deletingCommunity} 
          onClose={() => setDeletingCommunity(null)} 
          title="Delete Community?"
          size="sm"
        >
          <div className="space-y-4 text-xs">
            <p className="text-warm-muted leading-relaxed">
              This action cannot be undone. It will soft-delete the community <strong>{deletingCommunity?.name}</strong> and deactivate all its associated accounts.
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-warm">
              <button 
                onClick={() => setDeletingCommunity(null)}
                className="px-4 py-2 bg-sand hover:bg-sand/75 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteConfirm}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
              >
                {actionLoading ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </Modal>
      </PageWrap>
    );
  },
});
