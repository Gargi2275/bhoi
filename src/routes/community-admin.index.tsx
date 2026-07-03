import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Users, UserCheck, Calendar, HandHeart, UsersRound, Building2, CheckCircle, XCircle, AlertCircle, FileText, User, GraduationCap, Briefcase, ShieldCheck, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from "recharts";
import { PageWrap } from "@/components/wag/PageWrap";
import { AnimatedCard, AvatarCircle, StatCard, StatusBadge, DetailDrawer } from "@/components/wag/primitives";
import { cn, hasPermission, calculateAge } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { MEMBERS, NEWS } from "@/data/mock";
import { AdBanner } from "@/components/wag/AdBanner";

const growth = [{ m: "Jan", v: 920 }, { m: "Feb", v: 980 }, { m: "Mar", v: 1040 }, { m: "Apr", v: 1110 }, { m: "May", v: 1180 }, { m: "Jun", v: 1240 }];
const donations = [{ m: "Jan", v: 124000 }, { m: "Feb", v: 86000 }, { m: "Mar", v: 192000 }, { m: "Apr", v: 154000 }, { m: "May", v: 218000 }, { m: "Jun", v: 247000 }];
const tooltip = { contentStyle: { background: "#FFFDF7", border: "1px solid #E2D9CC", borderRadius: 12, fontSize: 12 } };

export const Route = createFileRoute("/community-admin/")({
  component: () => {
    const { user } = useAuth();
    const [communities, setCommunities] = useState<any[]>([]);
    const [subsidiaries, setSubsidiaries] = useState<any[]>([]);
    const [selectedSub, setSelectedSub] = useState<any | null>(null);
    const [selectedMember, setSelectedMember] = useState<any | null>(null);
    const [remarks, setRemarks] = useState("");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
      personal: true, location: true, education: true, profession: true, verification: true
    });

    const [membersList, setMembersList] = useState<any[]>([]);
    const [newsList, setNewsList] = useState<any[]>([]);

    const toggleSection = (key: string) => {
      setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleMemberAction = async (memberId: string, action: 'approve' | 'reject') => {
      setActionLoading(true);
      try {
        if (action === 'approve') {
          await api.updateMember(memberId, { aadhaar_status: "Approved", status: "Verified" });
          toast.success("Member approved and verified successfully!");
        } else if (action === 'reject') {
          await api.updateMember(memberId, { status: "Rejected" });
          toast.success("Member rejected.");
        }
        fetchData();
      } catch (err: any) {
        toast.error(err.message || "Failed to update member.");
      } finally {
        setActionLoading(false);
      }
    };

    const handleUpdateMember = async (memberId: string, data: any) => {
      setActionLoading(true);
      try {
        const updated = await api.updateMember(memberId, data);
        setSelectedMember((prev: any) => prev && prev.id === memberId ? { ...prev, ...updated } : prev);
        fetchData();
        toast.success("Member updated successfully.");
      } catch (e: any) {
        console.error("Failed to update member", e);
        toast.error(e.message || "Failed to update member.");
      } finally {
        setActionLoading(false);
      }
    };

    const handleUpdateStatus = async (memberId: string, status: string) => {
      await handleUpdateMember(memberId, { status });
    };

    const SectionHeader = ({ icon: Icon, label, sectionKey, color = "text-primary" }: any) => (
      <button
        type="button"
        onClick={() => toggleSection(sectionKey)}
        className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-sand/40 hover:bg-sand/70 transition border border-warm/60"
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-3.5 h-3.5 ${color}`} />
          <span className="text-[11px] font-bold uppercase tracking-wider text-warm-muted">{label}</span>
        </div>
        {expandedSections[sectionKey]
          ? <ChevronUp className="w-3.5 h-3.5 text-warm-muted" />
          : <ChevronDown className="w-3.5 h-3.5 text-warm-muted" />}
      </button>
    );

    const Field = ({ label, value }: { label: string; value?: any }) => {
      if (value === null || value === undefined || value === "") return null;
      return (
        <div className="flex justify-between items-start py-1.5 border-b border-warm/30 last:border-0 gap-3">
          <span className="text-[11px] text-warm-muted font-medium shrink-0 min-w-[100px]">{label}</span>
          <span className="text-[12px] font-semibold text-foreground text-right break-words max-w-[200px]">{value}</span>
        </div>
      );
    };

    const fetchData = () => {
      if (!user || !user.communityId) return;
      
      api.getCommunities()
        .then(res => {
          setCommunities(res || []);
          const subs = (res || []).filter((c: any) => 
            String(c.parent) === String(user.communityId) && 
            c.status === "Pending Parent Community Approval"
          );
          setSubsidiaries(subs);
        })
        .catch(err => console.error("Failed to load communities", err));

      api.getMembers({ communityId: user.communityId })
        .then(res => setMembersList(res || []))
        .catch(err => console.error(err));
        
      api.getNews({ communityId: user.communityId })
        .then(res => setNewsList(res || []))
        .catch(err => console.error(err));
    };

    useEffect(() => {
      fetchData();
      const handleUpdate = () => {
        console.log("\n[COMPONENT REFRESHED]\nOverview\n");
        fetchData();
      };
      window.addEventListener("community-updated", handleUpdate);
      return () => window.removeEventListener("community-updated", handleUpdate);
    }, [user]);

    const handleApproveSub = async (id: string) => {
      setErrorMsg(null);
      setActionLoading(true);
      try {
        await api.approveCommunity(id, remarks || "Approved by Parent Community Admin.");
        setRemarks("");
        setSelectedSub(null);
        fetchData();
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to approve subsidiary.");
      } finally {
        setActionLoading(false);
      }
    };

    const handleRejectSub = async (id: string) => {
      setErrorMsg(null);
      if (!remarks.trim()) {
        setErrorMsg("Rejection reason is mandatory.");
        return;
      }
      setActionLoading(true);
      try {
        await api.rejectCommunity(id, remarks);
        setRemarks("");
        setSelectedSub(null);
        fetchData();
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to reject subsidiary.");
      } finally {
        setActionLoading(false);
      }
    };

    const canEditProfile = hasPermission(user, ["Edit Community Profile", "Manage Logo", "Manage Banner", "Manage Community Information"]);
    const canManageCommunities = hasPermission(user, ["Manage Subsidiaries"]);
    const canApproveMembers = hasPermission(user, ["Approve Members"]);

    return (
      <PageWrap title="Samaj Overview" desc={`${user?.communityName || "Samaj"} · Admin Panel`}>
        {/* Global Admin Context Banner */}
        <AnimatedCard className="mb-8 p-5 bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/10">
          <div className="flex flex-col md:flex-row gap-5 items-start md:items-center justify-between">
            <div className="flex items-center gap-4">
              {user?.communityLogo ? (
                <img src={user.communityLogo} alt="" className="w-16 h-16 rounded-xl object-cover border border-warm shadow-sm" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center text-white text-2xl font-bold shadow-sm">
                  {user?.communityName ? user.communityName.charAt(0).toUpperCase() : "P"}
                </div>
              )}
              <div>
                <h2 className="font-ui font-bold text-xl text-foreground">
                  {user?.customRoleName ? `Role: ${user.customRoleName}` : "Community Administrator"}
                </h2>
                <div className="text-sm text-warm-muted mt-1">
                  {user?.customRoleName ? (
                    <div className="flex flex-col gap-0.5 text-xs text-warm-muted">
                      <div>Name: <span className="font-semibold text-foreground">{user?.name}</span></div>
                      <div>Role: <span className="font-semibold text-primary">{user?.customRoleName}</span></div>
                      <div>Community: <span className="font-semibold text-primary">{user?.communityName || "Platform"}</span></div>
                    </div>
                  ) : (
                    <>Managing: <span className="font-semibold text-primary">{user?.communityName || "Platform"}</span></>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-1.5 md:items-end text-sm">
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-warm shadow-sm">
                <span className="text-warm-muted">Type:</span>
                <span className="font-semibold flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${user?.communityType?.includes('Super') ? 'bg-orange-500' : 'bg-blue-500'}`}></span>
                  {user?.communityType || "Community"}
                </span>
              </div>
              {user?.parentCommunityName ? (
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-warm shadow-sm">
                  <span className="text-warm-muted">Parent:</span>
                  <span className="font-semibold">{user.parentCommunityName}</span>
                </div>
              ) : null}
              {canEditProfile && (
                <div className="mt-1">
                  <a 
                    href="/community-admin/settings"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg font-semibold transition-colors shadow-sm"
                  >
                    <FileText className="w-3.5 h-3.5" /> Edit Community Profile
                  </a>
                </div>
              )}
            </div>
          </div>
        </AnimatedCard>
        {/* Pending Subsidiaries Widget (Visible only to Parent Community Admins when pending exists) */}
        {user?.role === "community_admin" && canManageCommunities && subsidiaries.length > 0 && (
          <div className="mb-8">
            <AnimatedCard className="overflow-hidden border border-amber-200 bg-amber-50/10">
              <div className="p-5 border-b border-amber-200 bg-amber-50/30 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="font-ui font-bold text-base text-amber-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-amber-600" />
                    Pending Subsidiary Registrations
                  </h3>
                  <p className="text-xs text-amber-700/80 mt-0.5">
                    As Parent Community Admin, you must review and approve/reject these registrations.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-850 animate-pulse border border-amber-200">
                  {subsidiaries.length} Pending Approval
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-sand/35 text-left text-xs text-warm-muted uppercase">
                    <tr>
                      <th className="p-3">Community Info</th>
                      <th className="p-3">Location</th>
                      <th className="p-3">Plan</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subsidiaries.map(sub => (
                      <tr key={sub.id} className="border-t border-warm hover:bg-sand/15 transition-colors">
                        <td className="p-3 flex items-center gap-3">
                          <img 
                            src={sub.logo_url || sub.logo || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=120"} 
                            className="w-10 h-10 rounded-xl object-cover border border-warm shadow-sm"
                            alt=""
                          />
                          <div>
                            <div className="font-semibold text-foreground">{sub.name}</div>
                            <div className="text-xs text-warm-muted">Admin: {sub.admin_name || sub.email}</div>
                          </div>
                        </td>
                        <td className="p-3 text-xs text-warm-muted">
                          {sub.village ? `${sub.village}, ` : ""}{sub.district}, {sub.state}
                        </td>
                        <td className="p-3">
                          {/* Plan removed */}
                        </td>
                        <td className="p-3 text-right">
                          <button 
                            onClick={() => { setSelectedSub(sub); setErrorMsg(null); setRemarks(""); }}
                            className="px-3 py-1.5 rounded-lg bg-teal text-white text-xs font-semibold hover:bg-teal-650 transition-colors"
                          >
                            Review Request
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AnimatedCard>
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-8">
          {hasPermission(user, ["View Members"]) && <StatCard icon={<Users />} label="Total Members" value={membersList.length} accent="primary" />}
          {hasPermission(user, ["View Members"]) && <StatCard icon={<UserCheck />} label="Pending Approvals" value={membersList.filter(m => m.status === "Pending").length} accent="gold" />}
          {hasPermission(user, ["View Events"]) && <StatCard icon={<Calendar />} label="Active Events" value={6} accent="teal" />}
          {hasPermission(user, ["View Donations"]) && <StatCard icon={<HandHeart />} label="Donations (₹)" value={184000} accent="primary" />}
          {canManageCommunities && <StatCard icon={<Building2 />} label="Subsidiaries" value={communities.filter(c => String(c.parent) === String(user?.communityId)).length} accent="teal" />}
          {hasPermission(user, ["View Families"]) && <StatCard icon={<UsersRound />} label="Families" value={Math.floor(membersList.length / 4)} accent="gold" />}
          {hasPermission(user, ["View Businesses"]) && <StatCard icon={<Building2 />} label="Businesses" value={18} accent="teal" />}
        </div>

        <AdBanner slot="Hero Banner" />

        <div className="grid lg:grid-cols-2 gap-5 mb-6">
          {hasPermission(user, ["View Members"]) && (
            <AnimatedCard className="p-5">
              <h3 className="font-ui font-semibold mb-3">Member growth (6 months)</h3>
              <div className="h-64">
                <ResponsiveContainer>
                  <LineChart data={growth}>
                    <CartesianGrid stroke="#E2D9CC" strokeDasharray="3 3" />
                    <XAxis dataKey="m" stroke="#6B5E4E" fontSize={11} />
                    <YAxis stroke="#6B5E4E" fontSize={11} />
                    <Tooltip {...tooltip} />
                    <Line type="monotone" dataKey="v" stroke="oklch(0.46 0.21 265)" strokeWidth={2.5} dot={{ fill: "oklch(0.46 0.21 265)", r: 4 }} isAnimationActive />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </AnimatedCard>
          )}
          {hasPermission(user, ["View Donations"]) && (
            <AnimatedCard className="p-5">
              <h3 className="font-ui font-semibold mb-3">Monthly donations</h3>
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={donations}>
                    <CartesianGrid stroke="#E2D9CC" strokeDasharray="3 3" />
                    <XAxis dataKey="m" stroke="#6B5E4E" fontSize={11} />
                    <YAxis stroke="#6B5E4E" fontSize={11} />
                    <Tooltip {...tooltip} />
                    <Bar dataKey="v" fill="oklch(0.68 0.14 75)" radius={[8,8,0,0]} isAnimationActive />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </AnimatedCard>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {hasPermission(user, ["View Members"]) && (
            <div className="lg:col-span-2">
              <AnimatedCard className="overflow-hidden h-full">
                <div className="p-5 border-b border-warm">
                  <h3 className="font-ui font-semibold">Pending Member Approvals</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <tbody>
                      {membersList.filter(m => m.status === "Pending").slice(0, 6).map(m => (
                        <tr key={m.id} className="border-t border-warm">
                          <td className="p-3 flex items-center gap-2">
                            <AvatarCircle name={m.name} src={m.avatar} size={32} />
                            <div>
                              <div className="font-medium">{m.name}</div>
                              <div className="text-xs text-warm-muted">{m.phone}</div>
                            </div>
                          </td>
                          <td className="p-3 text-xs">{m.created_at ? new Date(m.created_at).toLocaleDateString() : 'N/A'}</td>
                          {canApproveMembers && (
                            <td className="p-3 text-right">
                              <button
                                disabled={actionLoading}
                                onClick={() => handleMemberAction(m.id, 'approve')}
                                className="px-2 py-1 rounded bg-teal text-white text-xs mr-1 hover:bg-teal-dark transition disabled:opacity-50"
                              >
                                <CheckCircle className="w-3 h-3 inline" />
                              </button>
                              <button
                                disabled={actionLoading}
                                onClick={() => handleMemberAction(m.id, 'reject')}
                                className="px-2 py-1 rounded bg-red-500 text-white text-xs mr-1 hover:bg-red-650 transition disabled:opacity-50"
                              >
                                <XCircle className="w-3 h-3 inline" />
                              </button>
                              <button
                                onClick={() => setSelectedMember(m)}
                                className="px-2 py-1 rounded bg-amber-500 text-white text-xs hover:bg-amber-600 transition"
                              >
                                <AlertCircle className="w-3 h-3 inline" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                      {membersList.filter(m => m.status === "Pending").length === 0 && (
                        <tr>
                          <td colSpan={3} className="p-6 text-center text-warm-muted">No pending approvals.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </AnimatedCard>
            </div>
          )}
          {hasPermission(user, ["View News"]) && (
            <AnimatedCard className="p-5 lg:col-span-1">
              <h3 className="font-ui font-semibold mb-3">Recent activity</h3>
              <div className="space-y-3 text-sm">
                {newsList.slice(0,5).map(n => (
                  <div key={n.id} className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <div>
                      <div className="font-medium line-clamp-1">{n.title}</div>
                      <div className="text-xs text-warm-muted">{n.created_at ? new Date(n.created_at).toLocaleDateString() : 'N/A'}</div>
                    </div>
                  </div>
                ))}
                {newsList.length === 0 && <div className="text-warm-muted text-center py-4">No recent activity</div>}
              </div>
            </AnimatedCard>
          )}
        </div>

        {/* Detailed Drawer for Subsidiary Approval review */}
        <DetailDrawer open={!!selectedSub} onClose={() => setSelectedSub(null)} title={selectedSub?.name}>
          {selectedSub && (
            <div className="space-y-6">
              <div className="relative">
                <img 
                  src={selectedSub.cover_url || selectedSub.cover || "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800"} 
                  alt="" 
                  className="w-full h-40 object-cover rounded-xl border border-warm" 
                />
                <div className="absolute left-6 -bottom-8">
                  <img 
                    src={selectedSub.logo_url || selectedSub.logo || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=120"} 
                    className="w-16 h-16 rounded-2xl object-cover border-4 border-surface shadow-md" 
                    alt=""
                  />
                </div>
              </div>

              <div className="pt-6">
                <h3 className="font-ui font-bold text-lg text-foreground">{selectedSub.name}</h3>
                <p className="text-xs text-warm-muted mt-0.5">
                  {selectedSub.village ? `${selectedSub.village}, ` : ""}{selectedSub.district}, {selectedSub.state}
                </p>
              </div>

              <p className="text-sm text-warm-muted leading-relaxed bg-sand/35 p-3 rounded-xl border border-warm/40">
                {selectedSub.desc || "No description provided."}
              </p>

              {/* Submitted Registration Data */}
              <div className="border-t border-warm pt-4">
                <h4 className="font-ui font-bold text-sm text-foreground mb-3 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-primary" />
                  Submitted Registration Details
                </h4>
                <div className="bg-sand/35 p-4 rounded-xl border border-warm/40 space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-warm-muted block">Caste / Sub-Caste</span>
                      <span className="font-semibold text-foreground">
                        {selectedSub.caste || "N/A"} {selectedSub.sub_caste ? `(${selectedSub.sub_caste})` : ""}
                      </span>
                    </div>
                    <div>
                      <span className="text-warm-muted block">Est. Year</span>
                      <span className="font-semibold text-foreground">{selectedSub.est_year || selectedSub.estYear || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-warm-muted block">Registration No.</span>
                      <span className="font-semibold text-foreground">{selectedSub.registration_no || selectedSub.registrationNo || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-warm-muted block">Email</span>
                      <span className="font-semibold text-foreground">{selectedSub.email || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-warm-muted block">Phone</span>
                      <span className="font-semibold text-foreground">{selectedSub.phone || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-warm-muted block">Website</span>
                      {selectedSub.website ? (
                        <a href={selectedSub.website} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline truncate block">
                          {selectedSub.website}
                        </a>
                      ) : (
                        <span className="font-semibold text-foreground">N/A</span>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-warm/60 pt-2">
                    <span className="text-warm-muted block mb-1">Office Address</span>
                    <span className="font-semibold text-foreground block whitespace-pre-line">{selectedSub.office_address || selectedSub.officeAddress || "N/A"}</span>
                  </div>

                  <div className="border-t border-warm/60 pt-2">
                    <span className="text-warm-muted block mb-1">Vision & Mission</span>
                    <span className="font-semibold text-foreground block whitespace-pre-line">{selectedSub.vision_mission || selectedSub.visionMission || "N/A"}</span>
                  </div>

                  <div className="border-t border-warm/60 pt-2 grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-warm-muted block">Facebook</span>
                      <span className="font-semibold text-foreground truncate block">{selectedSub.social_fb || selectedSub.socialFb || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-warm-muted block">Twitter</span>
                      <span className="font-semibold text-foreground truncate block">{selectedSub.social_tw || selectedSub.socialTw || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-warm-muted block">YouTube</span>
                      <span className="font-semibold text-foreground truncate block">{selectedSub.social_yt || selectedSub.socialYt || "N/A"}</span>
                    </div>
                  </div>

                  {selectedSub.doc_name && (
                    <div className="border-t border-warm/60 pt-2">
                      <span className="text-warm-muted block mb-1">Verification Document Reference</span>
                      <span className="font-semibold text-primary flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" /> {selectedSub.doc_name}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Timeline */}
              <div className="border-t border-warm pt-4">
                <h4 className="font-ui font-bold text-sm text-foreground mb-3 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-primary" />
                  Approval Workflow & Timeline
                </h4>
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-warm">
                  {selectedSub.approval_history && selectedSub.approval_history.length > 0 ? (
                    selectedSub.approval_history.map((hist: any, index: number) => (
                      <div key={index} className="relative text-xs">
                        <div className="absolute -left-6 rounded-full w-4 h-4 border-2 bg-surface flex items-center justify-center border-primary">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        </div>
                        <div className="flex justify-between font-semibold text-foreground">
                          <span>{hist.approval_level} Level</span>
                          <span className="text-[10px] text-warm-muted">
                            {new Date(hist.approved_date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-warm-muted mt-0.5">
                          Status: <span className="font-medium">{hist.status}</span>
                          {hist.approved_by_username && ` by ${hist.approved_by_username}`}
                        </div>
                        {hist.remarks && (
                          <div className="bg-sand/30 p-2 rounded border border-warm/50 mt-1 text-[11px] text-warm-muted italic">
                            "{hist.remarks}"
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-warm-muted italic py-1">
                      No approval workflow timeline recorded yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-warm pt-4 space-y-3.5">
                <div>
                  <label className="text-xs font-semibold block mb-1.5 text-foreground">
                    Remarks / Comments *
                  </label>
                  <textarea
                    rows={2.5}
                    placeholder="Provide justification or remarks. Mandatory for rejection."
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
                    onClick={() => handleApproveSub(selectedSub.id)}
                    className="py-2.5 rounded-xl bg-teal text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-teal-600 transition-colors disabled:opacity-50 shadow-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {actionLoading ? "Processing..." : "Approve"}
                  </button>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleRejectSub(selectedSub.id)}
                    className="py-2.5 rounded-xl bg-red-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-red-600 transition-colors disabled:opacity-50 shadow-sm"
                  >
                    <XCircle className="w-4 h-4" />
                    {actionLoading ? "Processing..." : "Reject"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </DetailDrawer>

        {/* Member Details Drawer */}
        <DetailDrawer open={!!selectedMember} onClose={() => setSelectedMember(null)} title="Member Details">
          {selectedMember && (
            <div className="space-y-4">
              {/* Profile header */}
              <div className="text-center pb-4 border-b border-warm">
                <AvatarCircle name={selectedMember.name} src={selectedMember.avatar || selectedMember.avatar_url} size={80} />
                <h2 className="font-ui font-bold text-lg mt-3">{selectedMember.name}</h2>
                <div className="flex items-center justify-center gap-2 mt-1.5 flex-wrap">
                  <StatusBadge status={selectedMember.status} />
                  {selectedMember.gender && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {selectedMember.gender}
                    </span>
                  )}
                  {selectedMember.role && selectedMember.role !== "member" && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20 uppercase">
                      {selectedMember.role.replace("_", " ")}
                    </span>
                  )}
                </div>
                {selectedMember.community_name && (
                  <div className="text-xs text-warm-muted mt-1.5">
                    📍 {selectedMember.community_name}
                  </div>
                )}
              </div>

              {/* ── PERSONAL INFO ── */}
              <div className="space-y-2">
                <SectionHeader icon={User} label="Personal Information" sectionKey="personal" color="text-primary" />
                {expandedSections.personal && (
                  <div className="px-1 space-y-0">
                    <Field label="Full Name" value={selectedMember.name} />
                    <Field label="Email" value={selectedMember.email} />
                    <Field label="Phone" value={selectedMember.phone} />
                    <Field label="Gender" value={selectedMember.gender} />
                    <Field label="Age" value={(selectedMember.age || calculateAge(selectedMember.birthdate)) ? `${selectedMember.age || calculateAge(selectedMember.birthdate)} years` : null} />
                    <Field label="Date of Birth" value={selectedMember.birthdate} />
                    <Field label="Joined On" value={selectedMember.joined_date || selectedMember.joinedDate} />
                  </div>
                )}
              </div>

              {/* ── LOCATION ── */}
              <div className="space-y-2">
                <SectionHeader icon={MapPin} label="Location Details" sectionKey="location" color="text-teal" />
                {expandedSections.location && (
                  <div className="px-1 space-y-0">
                    <Field label="Village" value={selectedMember.village} />
                    <Field label="Taluka" value={selectedMember.taluka} />
                    <Field label="District" value={selectedMember.district} />
                    <Field label="State" value={selectedMember.state} />
                  </div>
                )}
              </div>

              {/* ── EDUCATION ── */}
              <div className="space-y-2">
                <SectionHeader icon={GraduationCap} label="Education" sectionKey="education" color="text-blue-500" />
                {expandedSections.education && (
                  <div className="px-1 space-y-0">
                    <Field label="Education Level" value={selectedMember.education} />
                    <Field label="Degree / Qualification" value={selectedMember.degree} />
                    <Field label="Field of Study" value={selectedMember.field_of_study} />
                    <Field label="School" value={selectedMember.school} />
                    <Field label="College / University" value={selectedMember.college} />
                    <Field label="Passing Year" value={selectedMember.passing_year} />
                  </div>
                )}
              </div>

              {/* ── PROFESSION ── */}
              <div className="space-y-2">
                <SectionHeader icon={Briefcase} label="Profession / Work" sectionKey="profession" color="text-gold" />
                {expandedSections.profession && (
                  <div className="px-1 space-y-0">
                    <Field label="Profession Type" value={selectedMember.profession_type} />
                    <Field label="Job Title" value={selectedMember.job_title} />
                    <Field label="Company" value={selectedMember.company} />
                    <Field label="Industry" value={selectedMember.industry} />
                    <Field label="Annual Salary (LPA)" value={selectedMember.salary} />
                    <Field label="Work Mode" value={selectedMember.job_work_mode} />
                    <Field label="Job Type" value={selectedMember.job_type} />
                    <Field label="Job City" value={selectedMember.job_city} />
                    <Field label="Job State" value={selectedMember.job_state} />
                    <Field label="Job Country" value={selectedMember.job_country} />
                    <Field label="Job Address" value={selectedMember.job_address} />
                    <Field label="Business Name" value={selectedMember.business_name} />
                    <Field label="Business Category" value={selectedMember.business_category} />
                    <Field label="GST Number" value={selectedMember.gst_no} />
                    <Field label="Years in Business" value={selectedMember.business_years} />
                    <Field label="Profession (General)" value={selectedMember.profession} />
                  </div>
                )}
              </div>

              {/* ── AADHAAR VERIFICATION ── */}
              <div className="space-y-2">
                <SectionHeader icon={ShieldCheck} label="Aadhaar Verification" sectionKey="verification" color="text-red-500" />
                {expandedSections.verification && (
                  <div className="px-1 space-y-0">
                    <div className="flex justify-between items-center py-1.5 border-b border-warm/30">
                      <span className="text-[11px] text-warm-muted font-medium">Aadhaar Number</span>
                      <span className="font-mono text-[12px] font-semibold">{selectedMember.aadhaar || "Not provided"}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-[11px] text-warm-muted font-medium">Aadhaar Status</span>
                      <StatusBadge status={selectedMember.aadhaar_status || "Pending"} />
                    </div>
                  </div>
                )}
              </div>

              {/* ── ADMIN ACTIONS ── */}
              {(() => {
                const isAuthorized = hasPermission(user, ["Approve Members"]);
                if (!isAuthorized) {
                  return (
                    <div className="p-3 bg-red-50 border border-red-150 rounded-xl text-xs text-red-700 font-medium">
                      You do not have permission to approve or reject members.
                    </div>
                  );
                }

                return (
                  <>
                    {/* Step 1: Aadhaar Verification */}
                    <div className="bg-sand/50 rounded-xl p-3 border border-warm space-y-2">
                      <div className="text-xs font-semibold text-warm-muted uppercase tracking-wider">Step 1: Aadhaar ID Status</div>
                      {selectedMember.aadhaar_status === "Approved" ? (
                        <div className="flex items-center justify-between bg-teal/10 border border-teal/20 px-3 py-2 rounded-lg text-xs font-medium">
                          <span className="flex items-center gap-1 text-teal-800">
                            <CheckCircle className="w-3.5 h-3.5 text-teal" />
                            Aadhaar Approved & Verified
                          </span>
                          <button
                            disabled={actionLoading}
                            onClick={() => handleUpdateMember(selectedMember.id, { aadhaar_status: "Rejected" })}
                            className="text-[10px] text-red-500 hover:underline font-semibold"
                          >
                            Reject Aadhaar
                          </button>
                        </div>
                      ) : selectedMember.aadhaar_status === "Rejected" ? (
                        <div className="flex items-center justify-between bg-red-50 border border-red-200 px-3 py-2 rounded-lg text-xs font-medium">
                          <span className="flex items-center gap-1 text-red-700">
                            <XCircle className="w-3.5 h-3.5 text-red-500" />
                            Aadhaar Rejected
                          </span>
                          <button
                            disabled={actionLoading}
                            onClick={() => handleUpdateMember(selectedMember.id, { aadhaar_status: "Approved" })}
                            className="text-[10px] text-teal hover:underline font-semibold"
                          >
                            Approve Aadhaar
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-xs text-warm-muted leading-relaxed">
                            Review member's Aadhaar details above, then approve or reject.
                          </div>
                          <div className="flex gap-2">
                            <button
                              disabled={actionLoading}
                              onClick={() => handleUpdateMember(selectedMember.id, { aadhaar_status: "Approved" })}
                              className="flex-1 py-1.5 rounded-lg bg-teal text-white text-xs font-medium flex items-center justify-center gap-1 hover:bg-teal-dark transition disabled:opacity-50"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Approve Aadhaar
                            </button>
                            <button
                              disabled={actionLoading}
                              onClick={() => handleUpdateMember(selectedMember.id, { aadhaar_status: "Rejected" })}
                              className="flex-1 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium flex items-center justify-center gap-1 hover:bg-red-650 transition disabled:opacity-50"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject Aadhaar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Step 2: Profile Approval */}
                    <div className="bg-sand/50 rounded-xl p-3 border border-warm space-y-2">
                      <div className="text-xs font-semibold text-warm-muted uppercase tracking-wider">Step 2: Profile Status</div>
                      {selectedMember.aadhaar_status !== "Approved" ? (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-medium flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                          <span>Approve Aadhaar first to enable profile approval options.</span>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {["Verified", "Active"].includes(selectedMember.status) ? (
                            <div className="bg-teal/10 border border-teal/20 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1 text-teal-800">
                              <CheckCircle className="w-3.5 h-3.5 text-teal" />
                              Profile Approved & Active
                            </div>
                          ) : selectedMember.status === "Rejected" ? (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5 text-red-500" /> Profile Rejected
                            </div>
                          ) : selectedMember.status === "Suspended" ? (
                            <div className="bg-gray-100 border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-xs font-medium">
                              Profile Suspended
                            </div>
                          ) : (
                            <div className="text-xs text-warm-muted">Aadhaar verified. Approve or reject this member's profile.</div>
                          )}

                          <div className="grid grid-cols-2 gap-2 pt-1">
                            {!["Verified", "Active"].includes(selectedMember.status) && (
                              <button
                                disabled={actionLoading}
                                onClick={() => handleUpdateStatus(selectedMember.id, "Verified")}
                                className="py-2 rounded-lg bg-teal text-white text-sm flex items-center justify-center gap-1 hover:bg-teal-dark transition disabled:opacity-50"
                              >
                                <CheckCircle className="w-4 h-4" /> Approve Profile
                              </button>
                            )}
                            {selectedMember.status !== "Rejected" && (
                              <button
                                disabled={actionLoading}
                                onClick={() => handleUpdateStatus(selectedMember.id, "Rejected")}
                                className="py-2 rounded-lg bg-red-500 text-white text-sm flex items-center justify-center gap-1 hover:bg-red-650 transition disabled:opacity-50"
                              >
                                <XCircle className="w-4 h-4" /> Reject Profile
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </DetailDrawer>
      </PageWrap>
    );
  },
});
