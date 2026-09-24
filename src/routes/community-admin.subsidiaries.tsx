import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Clock, FileText, AlertCircle, Building2, MapPin, User, Globe, ChevronRight } from "lucide-react";
import { PageWrap } from "@/components/wag/PageWrap";
import { AnimatedCard, Modal, StatusBadge, AvatarCircle } from "@/components/wag/primitives";
import { useAuth } from "@/context/AuthContext";
import { api, getImageUrl } from "@/lib/api";
import { useModulePermissions } from "./community-admin";

export const Route = createFileRoute("/community-admin/subsidiaries")({
  component: () => {
    const { user } = useAuth();
    const perms = useModulePermissions("subsidiaries");
    const [communities, setCommunities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState("Pending");
    const [open, setOpen] = useState<any | null>(null);
    const [remarks, setRemarks] = useState("");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const tabs = ["All", "Pending", "Approved", "Rejected"];

    const fetchCommunities = () => {
      if (!user) return;
      if (!user.communityId && user.role !== "super_admin") {
        setLoading(false);
        return;
      }
      setLoading(true);
      api.getCommunities()
        .then(res => {
          // Filter only communities where parent matches the current user's community ID
          const linked = user.communityId
            ? (res || []).filter((c: any) => String(c.parent) === String(user.communityId))
            : (res || []);
          setCommunities(linked);
        })
        .catch(err => {
          console.error(err);
        })
        .finally(() => {
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
    }, [user]);

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
        await api.approveCommunity(id, remarks || "Approved by Parent Community Admin.");
        setRemarks("");
        fetchCommunities();
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to approve subsidiary community.");
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
        setErrorMsg(err.message || "Failed to reject subsidiary community.");
      } finally {
        setActionLoading(false);
      }
    };

    const filteredList = communities.filter(c => {
      if (tab === "All") return true;
      if (tab === "Pending") return c.status === "Pending Parent Community Approval";
      if (tab === "Approved") return c.status === "Active" || c.status === "Approved";
      if (tab === "Rejected") return c.status === "Rejected By Parent Community Admin";
      return true;
    });

    return (
      <PageWrap title="Subsidiary Community Requests" desc="Review and approve registration requests under your Community.">
        <div className="flex gap-2 border-b border-warm mb-6 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setErrorMsg(null); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === t ? "border-primary text-primary" : "border-transparent text-warm-muted hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <AnimatedCard className="overflow-hidden shadow-sm border border-warm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-sand text-left">
                  <tr>
                    <th className="p-3 text-xs uppercase font-semibold text-warm-muted">Community</th>
                    <th className="p-3 text-xs uppercase font-semibold text-warm-muted">Code</th>
                    <th className="p-3 text-xs uppercase font-semibold text-warm-muted">Location</th>
                    <th className="p-3 text-xs uppercase font-semibold text-warm-muted">Plan</th>
                    <th className="p-3 text-xs uppercase font-semibold text-warm-muted">Status</th>
                    <th className="p-3 text-xs uppercase font-semibold text-warm-muted text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm">
                  {filteredList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-8 text-warm-muted">
                        No subsidiary requests found.
                      </td>
                    </tr>
                  ) : (
                    filteredList.map(c => (
                      <tr 
                        key={c.id} 
                        onClick={() => { setOpen(c); setErrorMsg(null); setRemarks(""); }} 
                        className="hover:bg-sand/30 cursor-pointer transition-colors"
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <AvatarCircle name={c.name} src={c.logo_url || c.logo} size={40} />
                            <div>
                              <div className="font-semibold text-foreground">{c.name}</div>
                              <div className="text-xs text-warm-muted">{c.email || "No email"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-xs">
                          {c.registration_no || `COMM-${c.id}`}
                        </td>
                        <td className="p-3 text-xs text-warm-muted">
                          {c.village ? `${c.village}, ` : ""}{c.district}, {c.state}
                        </td>
                        <td className="p-3">
                          {/* Plan removed */}
                        </td>
                        <td className="p-3">
                          <StatusBadge status={c.status} />
                        </td>
                        <td className="p-3 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex gap-2 justify-end">
                            {c.status === "Pending Parent Community Approval" && (
                              <button 
                                onClick={() => { setOpen(c); setErrorMsg(null); }}
                                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-teal text-white hover:bg-teal-600 transition-colors"
                              >
                                Review
                              </button>
                            )}
                            <button 
                              onClick={() => { setOpen(c); setErrorMsg(null); }}
                              className="px-2.5 py-1 text-xs font-medium rounded-lg border border-warm hover:bg-sand/30 transition-colors"
                            >
                              Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </AnimatedCard>
        )}

        <Modal open={!!open} onClose={() => { setOpen(null); setErrorMsg(null); setRemarks(""); }} title={open?.name || "Subsidiary Details"} size="lg">
          {open && (
            <div className="space-y-5">
              {/* Header Banner */}
              <div className="relative rounded-xl overflow-hidden">
                <img
                  src={open.cover_url || open.cover ? getImageUrl(open.cover_url || open.cover) : "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800"}
                  alt=""
                  className="w-full h-32 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-3 left-4 flex items-end gap-3">
                  <AvatarCircle name={open.name} src={open.logo_url || open.logo} size={56} />
                  <div>
                    <h3 className="font-ui font-bold text-white text-base leading-tight">{open.name}</h3>
                    <p className="text-white/70 text-xs">{open.village ? `${open.village}, ` : ""}{open.district}, {open.state}</p>
                  </div>
                </div>
                <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
                  <StatusBadge status={open.status} />
                </div>
              </div>

              {/* Description */}
              {open.desc && (
                <p className="text-sm text-warm-muted leading-relaxed bg-sand/35 px-3.5 py-3 rounded-xl border border-warm/40">
                  {open.desc}
                </p>
              )}

              {/* Registration Info Grid */}
              <div>
                <h4 className="font-ui font-bold text-xs text-warm-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-primary" /> Registration & Contact
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs bg-sand/30 p-3 rounded-xl border border-warm/40">
                  {[
                    ["Caste / Sub-Caste", `${open.caste || "N/A"}${open.sub_caste ? ` (${open.sub_caste})` : ""}`],
                    ["Registration No.", open.registration_no || "N/A"],
                    ["Email", open.email || "N/A"],
                    ["Phone", open.phone || "N/A"],
                    ["Admin Name", open.admin_name || "N/A"],
                    ["Admin Email", open.admin_email || "N/A"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span className="text-warm-muted block">{label}</span>
                      <span className="font-semibold text-foreground break-all">{value}</span>
                    </div>
                  ))}
                  {open.website && (
                    <div className="col-span-2">
                      <span className="text-warm-muted block">Website</span>
                      <a href={open.website} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline truncate block">{open.website}</a>
                    </div>
                  )}
                  {open.office_address && (
                    <div className="col-span-2 border-t border-warm/60 pt-2 mt-1">
                      <span className="text-warm-muted block mb-0.5">Office Address</span>
                      <span className="font-semibold text-foreground whitespace-pre-line">{open.office_address}</span>
                    </div>
                  )}
                  {open.vision_mission && (
                    <div className="col-span-2 border-t border-warm/60 pt-2 mt-1">
                      <span className="text-warm-muted block mb-0.5">Vision & Mission</span>
                      <span className="font-semibold text-foreground whitespace-pre-line">{open.vision_mission}</span>
                    </div>
                  )}
                  {(open.social_fb || open.social_tw || open.social_yt) && (
                    <div className="col-span-2 border-t border-warm/60 pt-2 mt-1 grid grid-cols-3 gap-2">
                      <div><span className="text-warm-muted block">Facebook</span><span className="font-semibold truncate block">{open.social_fb || "N/A"}</span></div>
                      <div><span className="text-warm-muted block">Twitter</span><span className="font-semibold truncate block">{open.social_tw || "N/A"}</span></div>
                      <div><span className="text-warm-muted block">YouTube</span><span className="font-semibold truncate block">{open.social_yt || "N/A"}</span></div>
                    </div>
                  )}
                  {open.doc_name && (
                    <div className="col-span-2 border-t border-warm/60 pt-2 mt-1">
                      <span className="text-warm-muted block mb-0.5">Verification Document</span>
                      <span className="font-semibold text-primary flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" />{open.doc_name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Approval History */}
              <div>
                <h4 className="font-ui font-bold text-xs text-warm-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-primary" /> Approval History
                </h4>
                <div className="relative pl-5 space-y-3 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-warm">
                  {open.approval_history && open.approval_history.length > 0 ? (
                    open.approval_history.map((hist: any, index: number) => (
                      <div key={index} className="relative text-xs">
                        <div className={`absolute -left-5 rounded-full w-4 h-4 border-2 bg-surface flex items-center justify-center ${
                          hist.status === "Approved" || hist.status === "Active" ? "border-teal"
                          : hist.status.startsWith("Rejected") ? "border-red-500" : "border-primary"
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            hist.status === "Approved" || hist.status === "Active" ? "bg-teal"
                            : hist.status.startsWith("Rejected") ? "bg-red-500" : "bg-primary"
                          }`} />
                        </div>
                        <div className="flex justify-between font-semibold text-foreground">
                          <span>{hist.approval_level} Level</span>
                          <span className="text-[10px] text-warm-muted">{new Date(hist.approved_date).toLocaleDateString()}</span>
                        </div>
                        <div className="text-warm-muted mt-0.5">Status: <span className="font-medium">{hist.status}</span>{hist.approved_by_username && ` by ${hist.approved_by_username}`}</div>
                        {hist.remarks && <div className="bg-sand/30 p-2 rounded border border-warm/50 mt-1 text-[11px] text-warm-muted italic">"{hist.remarks}"</div>}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-warm-muted italic py-1">No approval history recorded yet.</div>
                  )}
                </div>
              </div>

              {/* Action Panel for Pending */}
              {open.status === "Pending Parent Community Approval" && perms.edit && (
                <div className="border-t border-warm pt-4 space-y-3">
                  <h4 className="font-ui font-bold text-xs text-warm-muted uppercase tracking-wider">Take Action</h4>
                  <div>
                    <label className="text-xs font-semibold block mb-1.5 text-foreground">Remarks (mandatory for rejection)</label>
                    <textarea
                      rows={3}
                      placeholder="Add remarks or justification..."
                      value={remarks}
                      onChange={e => setRemarks(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-warm bg-surface focus:border-primary outline-none resize-none"
                    />
                  </div>
                  {errorMsg && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      disabled={actionLoading}
                      onClick={() => handleApprove(open.id)}
                      className="py-2.5 rounded-xl bg-teal text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-teal-600 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {actionLoading ? "Processing..." : "✓ Approve"}
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() => handleReject(open.id)}
                      className="py-2.5 rounded-xl bg-red-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      {actionLoading ? "Processing..." : "✕ Reject"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>
      </PageWrap>
    );
  },
});
