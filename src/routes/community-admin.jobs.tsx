import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Plus, Trash2, Loader2, X, Check, Edit, Upload } from "lucide-react";
import { PageWrap } from "@/components/wag/PageWrap";
import { AnimatedCard, Modal } from "@/components/wag/primitives";
import { cn, hasPermission } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useModulePermissions } from "./community-admin";

const JOB_TYPES = ["Full-time", "Part-time", "Internship", "Remote", "Contract", "Freelance"];
const JOB_CATEGORIES = ["Tech", "Marketing", "Finance", "Engineering", "Healthcare", "Design", "Sales", "Education", "Operations", "Other"];

const STATUS_OPTIONS = ["Applied", "Under Review", "Shortlisted", "Interview Scheduled", "Selected", "Rejected"];

const STATUS_COLORS: Record<string, string> = {
  "Applied": "bg-blue-50 text-blue-600 border border-blue-200",
  "Under Review": "bg-yellow-50 text-yellow-600 border border-yellow-200",
  "Shortlisted": "bg-purple-50 text-purple-600 border border-purple-200",
  "Interview Scheduled": "bg-orange-50 text-orange-600 border border-orange-200",
  "Selected": "bg-green-50 text-green-600 border border-green-200",
  "Rejected": "bg-red-50 text-red-600 border border-red-200"
};

function blankForm() {
  return { role: "", company: "", location: "", salary: "", type: "Full-time", category: "Other", desc: "" };
}

export const Route = createFileRoute("/community-admin/jobs")({
  component: CommunityAdminJobsPage,
});

function CommunityAdminJobsPage() {
  const { user } = useAuth();
  const perms = useModulePermissions("jobs");
  const [activeTab, setActiveTab] = useState<"Postings" | "Applications">("Postings");
  const [jobs, setJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingApps, setLoadingApps] = useState(false);
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [form, setForm] = useState<any>(blankForm());
  const [saving, setSaving] = useState(false);
  
  // Searches
  const [search, setSearch] = useState("");
  const [searchApp, setSearchApp] = useState("");
  const [filterType, setFilterType] = useState("All");

  const fetchJobs = () => {
    if (!user) return;
    if (!user.communityId && user.role !== "super_admin") {
      setLoading(false);
      return;
    }
    setLoading(true);
    const params = user.communityId ? { communityId: user.communityId } : {};
    api.getJobs(params)
      .then(res => setJobs(res || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const fetchApplications = () => {
    if (!user) return;
    if (!user.communityId && user.role !== "super_admin") {
      setLoadingApps(false);
      return;
    }
    setLoadingApps(true);
    const params = user.communityId ? { communityId: user.communityId } : {};
    api.getJobApplications(params)
      .then(res => setApplications(res || []))
      .catch(console.error)
      .finally(() => setLoadingApps(false));
  };

  useEffect(() => { 
    fetchJobs(); 
    if (activeTab === "Applications") {
      fetchApplications();
    }
  }, [user, activeTab]);

  const openCreate = () => { setForm(blankForm()); setEditTarget(null); setOpen(true); };
  
  const openEdit = (j: any) => {
    setForm({ 
      role: j.role, 
      company: j.company, 
      location: j.location || "", 
      salary: j.salary || "", 
      type: j.type || "Full-time", 
      category: j.category || "Other", 
      desc: j.desc || "" 
    });
    setEditTarget(j);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.role.trim() || !form.company.trim()) return alert("Role and company are required.");
    setSaving(true);
    try {
      const payload = { ...form, community: user?.communityId };
      if (editTarget) {
        await api.updateJob(editTarget.id, payload);
      } else {
        await api.createJob(payload);
      }
      setOpen(false);
      fetchJobs();
    } catch (e: any) { 
      alert(e.message || "Failed to save."); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this job posting?")) return;
    try { 
      await api.deleteJob(id); 
      fetchJobs(); 
    } catch (e: any) { 
      alert(e.message || "Failed to delete."); 
    }
  };

  const handleStatusChange = async (appId: number, newStatus: string) => {
    try {
      await api.updateJobApplication(appId, { status: newStatus });
      setApplications(prev => 
        prev.map(app => app.id === appId ? { ...app, status: newStatus } : app)
      );
    } catch (e: any) {
      alert(e.message || "Failed to update status.");
    }
  };

  const filteredJobs = jobs.filter(j => {
    const matchType = filterType === "All" || j.type === filterType;
    const matchSearch = (j.role || "").toLowerCase().includes(search.toLowerCase()) || 
                        (j.company || "").toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const filteredApplications = applications.filter(app => {
    const matchSearch = (app.full_name || "").toLowerCase().includes(searchApp.toLowerCase()) ||
                        (app.job_title || "").toLowerCase().includes(searchApp.toLowerCase()) ||
                        (app.company_name || "").toLowerCase().includes(searchApp.toLowerCase());
    return matchSearch;
  });

  const field = (key: string) => (evt: any) => setForm((f: any) => ({ ...f, [key]: evt.target.value }));

  const TYPE_COLORS: Record<string, string> = {
    "Full-time": "bg-primary/10 text-primary",
    "Part-time": "bg-teal/10 text-teal",
    "Internship": "bg-amber-50 text-amber-600",
    "Remote": "bg-green-50 text-green-600",
    "Contract": "bg-purple-50 text-purple-600",
    "Freelance": "bg-pink-50 text-pink-600",
  };

  return (
    <PageWrap
      title="Jobs Management"
      desc="Create jobs and moderate incoming applicant submissions"
      action={
        activeTab === "Postings" && hasPermission(user, ["Create Jobs"]) && perms.create ? (
          <button onClick={openCreate} className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold flex items-center gap-2 hover:bg-primary/95 transition shadow-sm">
            <Plus className="w-4 h-4" /> Post Job
          </button>
        ) : null
      }
    >
      {/* Sub Tabs */}
      <div className="flex gap-2 border-b border-warm mb-6">
        <button 
          onClick={() => setActiveTab("Postings")} 
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-all",
            activeTab === "Postings" ? "border-primary text-primary font-semibold" : "border-transparent text-warm-muted"
          )}
        >
          Job Postings ({jobs.length})
        </button>
        <button 
          onClick={() => setActiveTab("Applications")} 
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-all",
            activeTab === "Applications" ? "border-primary text-primary font-semibold" : "border-transparent text-warm-muted"
          )}
        >
          Applications
        </button>
      </div>

      {activeTab === "Postings" ? (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <input
              placeholder="Search postings by role or company…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 px-4 py-2 rounded-xl border border-warm bg-surface focus:outline-none focus:border-primary text-sm"
            />
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 rounded-xl border border-warm bg-surface text-sm">
              <option value="All">All Types</option>
              {JOB_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <AnimatedCard className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-sand text-slate-800">
                  <tr>
                    {["Role & Company", "Location", "Salary", "Type", "Applicants", "Actions"].map(h => (
                      <th key={h} className="text-left p-3 text-xs uppercase tracking-wider text-warm-muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map(j => (
                    <tr key={j.id} className="border-t border-warm hover:bg-sand/35 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {j.logo_letter || j.company?.[0] || "J"}
                          </div>
                          <div>
                            <div className="font-semibold">{j.role}</div>
                            <div className="text-xs text-warm-muted">{j.company}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-warm-muted text-xs">{j.location}</td>
                      <td className="p-3 text-xs font-medium">{j.salary || "—"}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[j.type] || "bg-gold-light text-gold"}`}>
                          {j.type}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">{j.applicants || 0}</span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          {hasPermission(user, ["Edit Jobs"]) && perms.edit && (
                            <button onClick={() => openEdit(j)} className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition" title="Edit Job">
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {hasPermission(user, ["Delete Jobs"]) && perms.delete && (
                            <button onClick={() => handleDelete(j.id)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition" title="Delete Job">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredJobs.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-10 text-warm-muted">No job postings found.</td></tr>
                  )}
                </tbody>
              </table>
            </AnimatedCard>
          )}
        </>
      ) : (
        <>
          <div className="mb-6">
            <input
              placeholder="Search applications by applicant name, title, or company…"
              value={searchApp}
              onChange={e => setSearchApp(e.target.value)}
              className="w-full sm:w-80 px-4 py-2 rounded-xl border border-warm bg-surface focus:outline-none focus:border-primary text-sm"
            />
          </div>

          {loadingApps ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <AnimatedCard className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-sand text-slate-800">
                  <tr>
                    {["Applicant & Job", "Contact Details", "Experience & Qual.", "Applied Date", "Resume", "Status"].map(h => (
                      <th key={h} className="text-left p-3 text-xs uppercase tracking-wider text-warm-muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map(app => (
                    <tr key={app.id} className="border-t border-warm hover:bg-sand/35 transition-colors">
                      <td className="p-3">
                        <div className="font-semibold text-slate-800">{app.full_name}</div>
                        <div className="text-xs text-primary font-bold">{app.job_title}</div>
                        <div className="text-[10px] text-warm-muted">{app.company_name}</div>
                      </td>
                      <td className="p-3 text-xs space-y-0.5">
                        <div className="font-semibold text-slate-700">{app.mobile}</div>
                        <div className="text-warm-muted truncate max-w-[150px]">{app.email}</div>
                        <div className="text-[10px] text-warm-muted truncate max-w-[150px]">{app.address}</div>
                      </td>
                      <td className="p-3 text-xs space-y-0.5">
                        <div>Total Exp: <span className="font-semibold text-slate-800">{app.experience}</span></div>
                        <div className="text-warm-muted truncate max-w-[150px] font-semibold">{app.qualification}</div>
                        <div className="text-[10px] text-warm-muted truncate max-w-[150px]">{app.skills}</div>
                      </td>
                      <td className="p-3 text-xs text-warm-muted">
                        {new Date(app.applied_at).toLocaleDateString(undefined, {
                          year: 'numeric', month: 'short', day: 'numeric'
                        })}
                      </td>
                      <td className="p-3">
                        {app.resume ? (
                          <a 
                            href={app.resume} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-primary hover:underline font-bold inline-flex items-center gap-1 text-xs"
                          >
                            <Upload className="w-3.5 h-3.5 rotate-180" /> Open Resume
                          </a>
                        ) : (
                          <span className="text-warm-muted text-xs">None</span>
                        )}
                      </td>
                      <td className="p-3">
                        <select 
                          value={app.status} 
                          onChange={(e) => handleStatusChange(app.id, e.target.value)}
                          disabled={!perms.edit}
                          className={cn(
                            "text-xs font-bold px-2 py-1 rounded-xl focus:outline-none border",
                            !perms.edit ? "cursor-not-allowed opacity-80" : "cursor-pointer",
                            STATUS_COLORS[app.status] || "bg-sand text-slate-800 border-warm"
                          )}
                        >
                          {STATUS_OPTIONS.map(opt => (
                            <option key={opt} value={opt} className="bg-white text-slate-800 font-normal">
                              {opt}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                  {filteredApplications.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-10 text-warm-muted">No applications received yet.</td></tr>
                  )}
                </tbody>
              </table>
            </AnimatedCard>
          )}
        </>
      )}

      {/* Post/Edit Job Modal */}
      <Modal open={open} onClose={() => setOpen(false)} title={editTarget ? "Edit Job Post" : "Post Job Opportunity"}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-warm-muted block mb-1">Role / Title *</label>
              <input placeholder="e.g. Software Engineer" value={form.role} onChange={field("role")} className="w-full px-3 py-2.5 rounded-lg border border-warm bg-surface text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs text-warm-muted block mb-1">Company *</label>
              <input placeholder="Company name" value={form.company} onChange={field("company")} className="w-full px-3 py-2.5 rounded-lg border border-warm bg-surface text-sm focus:outline-none focus:border-primary" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-warm-muted block mb-1">Location</label>
              <input placeholder="City or Remote" value={form.location} onChange={field("location")} className="w-full px-3 py-2.5 rounded-lg border border-warm bg-surface text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs text-warm-muted block mb-1">Salary Range</label>
              <input placeholder="₹5-8 LPA" value={form.salary} onChange={field("salary")} className="w-full px-3 py-2.5 rounded-lg border border-warm bg-surface text-sm focus:outline-none focus:border-primary" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-warm-muted block mb-1">Job Type</label>
              <select value={form.type} onChange={field("type")} className="w-full px-3 py-2.5 rounded-lg border border-warm bg-surface text-sm focus:outline-none focus:border-primary">
                {JOB_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-warm-muted block mb-1">Category</label>
              <select value={form.category} onChange={field("category")} className="w-full px-3 py-2.5 rounded-lg border border-warm bg-surface text-sm focus:outline-none focus:border-primary">
                {JOB_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-warm-muted block mb-1">Description</label>
            <textarea rows={3} placeholder="Job description…" value={form.desc} onChange={field("desc")} className="w-full px-3 py-2.5 rounded-lg border border-warm bg-surface text-sm focus:outline-none focus:border-primary" />
          </div>
          <div className="flex gap-2 pt-2 border-t border-warm">
            <button onClick={() => setOpen(false)} className="flex-1 py-2.5 rounded-xl border border-warm text-sm font-semibold hover:bg-sand transition"><X className="w-4 h-4 inline mr-1" />Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/95 transition disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <Check className="w-4 h-4" /> {editTarget ? "Save Changes" : "Publish Job"}
            </button>
          </div>
        </div>
      </Modal>
    </PageWrap>
  );
}
