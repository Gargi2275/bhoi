import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Search, CheckCircle, XCircle, MoreVertical, Loader2, AlertCircle, User, MapPin, GraduationCap, Briefcase, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";
import { PageWrap } from "@/components/wag/PageWrap";
import { AnimatedCard, AvatarCircle, DetailDrawer, StatusBadge } from "@/components/wag/primitives";
import { cn, hasPermission, calculateAge } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useModulePermissions } from "./community-admin";

export const Route = createFileRoute("/community-admin/members")({
  component: () => {
    const { user } = useAuth();
    const perms = useModulePermissions("members");
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState("All");
    const [open, setOpen] = useState<any | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedVillage, setSelectedVillage] = useState("All");
    const [actionLoading, setActionLoading] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
      personal: true, location: true, education: true, profession: true, verification: true
    });

    const tabs = ["All", "Verified", "Pending", "Rejected", "Suspended"];

    const toggleSection = (key: string) => {
      setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const fetchMembers = () => {
      if (!user) return;
      if (!user.communityId && user.role !== "super_admin") {
        setLoading(false);
        return;
      }
      setLoading(true);
      const params = user.communityId ? { communityId: user.communityId } : {};
      api.getMembers(params)
        .then(res => {
          setMembers(res || []);
        })
        .catch(err => console.error("Failed to load members", err))
        .finally(() => setLoading(false));
    };

    useEffect(() => {
      fetchMembers();
    }, [user]);

    const handleUpdateMember = async (memberId: string, data: any) => {
      setActionLoading(true);
      try {
        const updated = await api.updateMember(memberId, data);
        setOpen((prev: any) => prev && prev.id === memberId ? { ...prev, ...updated } : prev);
        fetchMembers();
      } catch (e) {
        console.error("Failed to update member", e);
      } finally {
        setActionLoading(false);
      }
    };

    const handleUpdateStatus = async (memberId: string, status: string) => {
      await handleUpdateMember(memberId, { status });
    };

    const filteredList = members.filter(m => {
      const matchesTab = tab === "All" || m.status === tab;
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        (m.name || "").toLowerCase().includes(searchLower) ||
        (m.phone || "").includes(searchLower) ||
        (m.village || "").toLowerCase().includes(searchLower) ||
        (m.email || "").toLowerCase().includes(searchLower) ||
        (m.profession || "").toLowerCase().includes(searchLower);
      const matchesVillage = selectedVillage === "All" || m.village === selectedVillage;
      return matchesTab && matchesSearch && matchesVillage;
    });

    const uniqueVillages = Array.from(new Set(members.map(m => m.village).filter(Boolean)));

    // Collapsible section header
    const SectionHeader = ({ icon: Icon, label, sectionKey, color = "text-primary" }: any) => (
      <button
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

    // Single field row - only renders if value exists
    const Field = ({ label, value }: { label: string; value?: any }) => {
      if (value === null || value === undefined || value === "") return null;
      return (
        <div className="flex justify-between items-start py-1.5 border-b border-warm/30 last:border-0 gap-3">
          <span className="text-[11px] text-warm-muted font-medium shrink-0 min-w-[100px]">{label}</span>
          <span className="text-[12px] font-semibold text-foreground text-right break-words max-w-[200px]">{value}</span>
        </div>
      );
    };

    return (
      <PageWrap title="Members" desc={`${filteredList.length} members in your samaj`}>
        {/* Status tabs */}
        <div className="flex gap-2 border-b border-warm mb-6 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${tab === t ? "border-primary text-primary" : "border-transparent text-warm-muted"}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Search + filter */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-warm-muted" />
            <input
              placeholder="Search by name, phone, email, village..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-warm bg-surface text-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="px-3 py-2 rounded-lg border border-warm bg-surface text-sm"
            value={selectedVillage}
            onChange={e => setSelectedVillage(e.target.value)}
          >
            <option value="All">All villages</option>
            {uniqueVillages.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        {/* Members table */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <AnimatedCard className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-sand">
                <tr>
                  {["Member", "Phone", "Village", "Status", "Joined", ""].map(h => (
                    <th key={h} className="text-left p-3 text-xs uppercase tracking-wider text-warm-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredList.map(m => (
                  <tr
                    key={m.id}
                    onClick={() => setOpen(m)}
                    className="border-t border-warm hover:bg-sand cursor-pointer"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <AvatarCircle name={m.name} src={m.avatar || m.avatar_url} size={36} />
                        <div>
                          <div className="font-medium">{m.name}</div>
                          <div className="text-xs text-warm-muted">{m.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-sm">{m.phone}</td>
                    <td className="p-3 text-sm text-warm-muted">{m.village || "—"}</td>
                    <td className="p-3">
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="p-3 text-xs text-warm-muted whitespace-nowrap">
                      {m.joined_date || m.joinedDate}
                    </td>
                    <td className="p-3">
                      <MoreVertical className="w-4 h-4 text-warm-muted" />
                    </td>
                  </tr>
                ))}
                {filteredList.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-warm-muted">
                      No members found matching the criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </AnimatedCard>
        )}

        {/* ─── DETAIL DRAWER ─── */}
        <DetailDrawer open={!!open} onClose={() => setOpen(null)} title="Member Details">
          {open && (
            <div className="space-y-4">

              {/* Profile header */}
              <div className="text-center pb-4 border-b border-warm">
                <AvatarCircle name={open.name} src={open.avatar || open.avatar_url} size={80} />
                <h2 className="font-ui font-bold text-lg mt-3">{open.name}</h2>
                <div className="flex items-center justify-center gap-2 mt-1.5 flex-wrap">
                  <StatusBadge status={open.status} />
                  {open.gender && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {open.gender}
                    </span>
                  )}
                  {open.role && open.role !== "member" && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20 uppercase">
                      {open.role.replace("_", " ")}
                    </span>
                  )}
                </div>
                {open.community_name && (
                  <div className="text-xs text-warm-muted mt-1.5">
                    📍 {open.community_name}
                  </div>
                )}
              </div>

              {/* ── PERSONAL INFO ── */}
              <div className="space-y-2">
                <SectionHeader icon={User} label="Personal Information" sectionKey="personal" color="text-primary" />
                {expandedSections.personal && (
                  <div className="px-1 space-y-0">
                    <Field label="Full Name" value={open.name} />
                    <Field label="Email" value={open.email} />
                    <Field label="Phone" value={open.phone} />
                    <Field label="Gender" value={open.gender} />
                    <Field label="Age" value={(open.age || calculateAge(open.birthdate)) ? `${open.age || calculateAge(open.birthdate)} years` : null} />
                    <Field label="Date of Birth" value={open.birthdate} />
                    <Field label="Joined On" value={open.joined_date || open.joinedDate} />
                  </div>
                )}
              </div>

              {/* ── LOCATION ── */}
              <div className="space-y-2">
                <SectionHeader icon={MapPin} label="Location Details" sectionKey="location" color="text-teal" />
                {expandedSections.location && (
                  <div className="px-1 space-y-0">
                    <Field label="Village" value={open.village} />
                    <Field label="Taluka" value={open.taluka} />
                    <Field label="District" value={open.district} />
                    <Field label="State" value={open.state} />
                  </div>
                )}
              </div>

              {/* ── EDUCATION ── */}
              <div className="space-y-2">
                <SectionHeader icon={GraduationCap} label="Education" sectionKey="education" color="text-blue-500" />
                {expandedSections.education && (
                  <div className="px-1 space-y-0">
                    <Field label="Education Level" value={open.education} />
                    <Field label="Degree / Qualification" value={open.degree} />
                    <Field label="Field of Study" value={open.field_of_study} />
                    <Field label="School" value={open.school} />
                    <Field label="College / University" value={open.college} />
                    <Field label="Passing Year" value={open.passing_year} />
                  </div>
                )}
              </div>

              {/* ── PROFESSION ── */}
              <div className="space-y-2">
                <SectionHeader icon={Briefcase} label="Profession / Work" sectionKey="profession" color="text-gold" />
                {expandedSections.profession && (
                  <div className="px-1 space-y-0">
                    <Field label="Profession Type" value={open.profession_type} />
                    {/* Job fields */}
                    <Field label="Job Title" value={open.job_title} />
                    <Field label="Company" value={open.company} />
                    <Field label="Industry" value={open.industry} />
                    <Field label="Annual Salary (LPA)" value={open.salary} />
                    <Field label="Work Mode" value={open.job_work_mode} />
                    <Field label="Job Type" value={open.job_type} />
                    <Field label="Job City" value={open.job_city} />
                    <Field label="Job State" value={open.job_state} />
                    <Field label="Job Country" value={open.job_country} />
                    <Field label="Job Address" value={open.job_address} />
                    {/* Business fields */}
                    <Field label="Business Name" value={open.business_name} />
                    <Field label="Business Category" value={open.business_category} />
                    <Field label="GST Number" value={open.gst_no} />
                    <Field label="Years in Business" value={open.business_years} />
                    {/* General profession fallback */}
                    <Field label="Profession (General)" value={open.profession} />
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
                      <span className="font-mono text-[12px] font-semibold">{open.aadhaar || "Not provided"}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-[11px] text-warm-muted font-medium">Aadhaar Status</span>
                      <StatusBadge status={open.aadhaar_status || "Pending"} />
                    </div>
                  </div>
                )}
              </div>

              {/* ── ADMIN ACTIONS ── */}
              {(() => {
                const isAuthorized = hasPermission(user, ["Approve Members"]) && perms.approve;

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

                      {open.aadhaar_status === "Approved" ? (
                        <div className="flex items-center justify-between bg-teal/10 border border-teal/20 px-3 py-2 rounded-lg text-xs font-medium">
                          <span className="flex items-center gap-1 text-teal-800">
                            <CheckCircle className="w-3.5 h-3.5 text-teal" />
                            Aadhaar Approved & Verified
                          </span>
                          <button
                            disabled={actionLoading}
                            onClick={() => handleUpdateMember(open.id, { aadhaar_status: "Rejected" })}
                            className="text-[10px] text-red-500 hover:underline font-semibold"
                          >
                            Reject Aadhaar
                          </button>
                        </div>
                      ) : open.aadhaar_status === "Rejected" ? (
                        <div className="flex items-center justify-between bg-red-50 border border-red-200 px-3 py-2 rounded-lg text-xs font-medium">
                          <span className="flex items-center gap-1 text-red-700">
                            <XCircle className="w-3.5 h-3.5 text-red-500" />
                            Aadhaar Rejected
                          </span>
                          <button
                            disabled={actionLoading}
                            onClick={() => handleUpdateMember(open.id, { aadhaar_status: "Approved" })}
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
                              onClick={() => handleUpdateMember(open.id, { aadhaar_status: "Approved" })}
                              className="flex-1 py-1.5 rounded-lg bg-teal text-white text-xs font-medium flex items-center justify-center gap-1 hover:bg-teal-dark transition disabled:opacity-50"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Approve Aadhaar
                            </button>
                            <button
                              disabled={actionLoading}
                              onClick={() => handleUpdateMember(open.id, { aadhaar_status: "Rejected" })}
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

                      {open.aadhaar_status !== "Approved" ? (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-medium flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                          <span>Approve Aadhaar first to enable profile approval options.</span>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {["Verified", "Active"].includes(open.status) ? (
                            <div className="bg-teal/10 border border-teal/20 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1 text-teal-800">
                              <CheckCircle className="w-3.5 h-3.5 text-teal" />
                              Profile Approved & Active
                            </div>
                          ) : open.status === "Rejected" ? (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5 text-red-500" /> Profile Rejected
                            </div>
                          ) : open.status === "Suspended" ? (
                            <div className="bg-gray-100 border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-xs font-medium">
                              Profile Suspended
                            </div>
                          ) : (
                            <div className="text-xs text-warm-muted">Aadhaar verified. Approve or reject this member's profile.</div>
                          )}

                          <div className="grid grid-cols-2 gap-2 pt-1">
                            {!["Verified", "Active"].includes(open.status) && (
                              <button
                                disabled={actionLoading}
                                onClick={() => handleUpdateStatus(open.id, "Verified")}
                                className="py-2 rounded-lg bg-teal text-white text-sm flex items-center justify-center gap-1 hover:bg-teal-dark transition disabled:opacity-50"
                              >
                                <CheckCircle className="w-4 h-4" /> Approve Profile
                              </button>
                            )}
                            {open.status !== "Rejected" && (
                              <button
                                disabled={actionLoading}
                                onClick={() => handleUpdateStatus(open.id, "Rejected")}
                                className="py-2 rounded-lg bg-red-500 text-white text-sm flex items-center justify-center gap-1 hover:bg-red-650 transition disabled:opacity-50"
                              >
                                <XCircle className="w-4 h-4" /> Reject Profile
                              </button>
                            )}
                            {open.status !== "Suspended" && (
                              <button
                                disabled={actionLoading}
                                onClick={() => handleUpdateStatus(open.id, "Suspended")}
                                className="py-2 rounded-lg border border-warm text-sm hover:bg-sand transition disabled:opacity-50"
                              >
                                Suspend Profile
                              </button>
                            )}
                            {open.status !== "Pending" && (
                              <button
                                disabled={actionLoading}
                                onClick={() => handleUpdateStatus(open.id, "Pending")}
                                className="py-2 rounded-lg border border-warm text-sm hover:bg-sand transition disabled:opacity-50"
                              >
                                Need Info
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
