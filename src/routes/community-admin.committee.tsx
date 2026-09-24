import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Plus, Trash2, Phone, Mail, Loader2, X, Check, Edit, AlertCircle } from "lucide-react";
import { PageWrap } from "@/components/wag/PageWrap";
import { AnimatedCard, AvatarCircle, Modal } from "@/components/wag/primitives";
import { cn, hasPermission } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useModulePermissions } from "./community-admin";

function getActionWord(perm: string) {
  const lower = perm.toLowerCase();
  if (lower.startsWith("view")) return "View";
  if (lower.startsWith("add")) return "Add";
  if (lower.startsWith("edit")) return "Edit";
  if (lower.startsWith("delete")) return "Delete";
  if (lower.startsWith("create")) return "Create";
  if (lower.startsWith("approve")) return "Approve";
  if (lower.startsWith("remove")) return "Remove";
  if (lower.startsWith("upload")) return "Upload";
  if (lower.startsWith("export")) return "Export";
  if (lower.startsWith("manage")) return "Manage " + perm.replace(/^Manage /i, "");
  return perm;
}

function getModule(perm: string) {
  if (perm.includes("Members")) return "Members";
  if (perm.includes("Committee")) return "Committee";
  if (perm.includes("Families")) return "Families";
  if (perm.includes("Events")) return "Events";
  if (perm.includes("News")) return "News";
  if (perm.includes("Gallery") || perm.includes("Photos")) return "Gallery";
  if (perm.includes("Donations")) return "Donations";
  if (perm.includes("Jobs")) return "Jobs";
  if (perm.includes("Businesses")) return "Businesses";
  if (perm.includes("Profiles") || perm.includes("Matches") || perm.includes("Interests")) return "Matrimony";
  if (perm.includes("Reports")) return "Reports";
  if (perm.includes("Community Profile") || perm.includes("Logo") || perm.includes("Banner") || perm.includes("Information")) return "Settings";
  if (perm.includes("Hierarchy") || perm.includes("Subsidiaries")) return "Hierarchy";
  return "Other";
}

const DESIGNATIONS = ["President", "Vice President", "Secretary", "Joint Secretary", "Treasurer", "Member", "Advisor", "Trustee"];

function blankForm() {
  return { name: "", designation: "Member", phone: "", email: "", since: "", photo_url: "" };
}

export const Route = createFileRoute("/community-admin/committee")({
  component: () => {
    const { user } = useAuth();
    const [committee, setCommittee] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<any | null>(null);
    const [form, setForm] = useState<any>(blankForm());
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const [roles, setRoles] = useState<any[]>([]);

    const fetchCommittee = () => {
      if (!user) return;
      if (!user.communityId && user.role !== "super_admin") {
        setLoading(false);
        return;
      }
      setLoading(true);
      const params = user.communityId ? { communityId: user.communityId } : {};
      api.getCommittee(params)
        .then(res => setCommittee(res || []))
        .catch(console.error)
        .finally(() => setLoading(false));
    };

    const fetchRoles = () => {
      api.getRoles()
        .then(res => setRoles(res || []))
        .catch(console.error);
    };

    useEffect(() => { 
      if (user) {
        fetchCommittee(); 
        fetchRoles();
      }
    }, [user]);

    const openCreate = () => { setErrorMsg(""); setForm({ name: "", designation: "", role_id: "", phone: "", email: "", password: "", confirm_password: "", since: "", photo_url: "", permissions: [] }); setEditTarget(null); setOpen(true); };
    const openEdit = (c: any) => {
      setErrorMsg("");
      setForm({ 
        name: c.name, 
        designation: c.designation, 
        role_id: c.role_id ? String(c.role_id) : "", 
        phone: c.phone || "", 
        email: c.email || "", 
        password: "", 
        confirm_password: "", 
        since: c.since || "", 
        photo_url: c.photo_url || c.photo || "",
        permissions: Array.isArray(c.permissions) ? [...c.permissions] : []
      });
      setEditTarget(c);
      setOpen(true);
    };

    const handleSave = async () => {
      setErrorMsg("");
      if (!form.name.trim() || !form.email.trim() || !form.designation.trim()) {
        setErrorMsg("Name, Email, and Role are required.");
        return;
      }
      if (!editTarget && (!form.password || form.password !== form.confirm_password)) {
        setErrorMsg("Please provide a matching password for the new member's login account.");
        return;
      }
      setSaving(true);
      try {
        const payload = { ...form, community: user?.communityId };
        if (editTarget) {
          await api.updateCommitteeMember(editTarget.id, payload);
        } else {
          await api.createCommitteeMember(payload);
        }
        setOpen(false);
        fetchCommittee();
      } catch (e: any) { 
        setErrorMsg(e.message || "Failed to save."); 
      }
      finally { setSaving(false); }
    };

    const handleDelete = async (id: number) => {
      if (!confirm("Remove this committee member and their login access?")) return;
      try { await api.deleteCommitteeMember(id); fetchCommittee(); }
      catch (e: any) { alert(e.message || "Failed to delete."); }
    };

    const handleDesignationChange = async (id: number, role_id: string, designation: string) => {
      try { await api.updateCommitteeMember(id, { role_id, designation }); fetchCommittee(); }
      catch (e) { console.error(e); }
    };

    const field = (key: string) => (evt: any) => setForm((f: any) => ({ ...f, [key]: evt.target.value }));

    const DESIGNATION_COLORS: Record<string, string> = {
      "President": "bg-amber-100 text-amber-800 border-amber-200",
      "Vice President": "bg-blue-50 text-blue-700 border-blue-200",
      "Secretary": "bg-teal/10 text-teal border-teal/20",
      "Treasurer": "bg-green-50 text-green-700 border-green-200",
    };

    const perms = useModulePermissions("committee");
    const canAdd = hasPermission(user, ["Add Committee Members"]) && perms.create;
    const canEdit = hasPermission(user, ["Edit Committee Members"]) && perms.edit;
    const canDelete = hasPermission(user, ["Remove Committee Members"]) && perms.delete;

    return (
      <PageWrap
        title="Committee"
        desc={`${committee.length} committee members`}
        action={
          canAdd && (
            <button onClick={openCreate} className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold flex items-center gap-2 hover:bg-primary/95 transition shadow-sm">
              <Plus className="w-4 h-4" /> Add Member
            </button>
          )
        }
      >
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : committee.length === 0 ? (
          <div className="text-center py-16 text-warm-muted border border-warm rounded-2xl bg-surface">No committee members yet.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {committee.map(c => (
              <AnimatedCard key={c.id} className="p-5 text-center relative group">
                {(canEdit || canDelete) && (
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    {canEdit && <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary"><Edit className="w-3.5 h-3.5" /></button>}
                    {canDelete && <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>}
                  </div>
                )}
                <AvatarCircle name={c.name} src={c.photo_url || c.photo} size={84} />
                <h3 className="font-ui font-bold text-base mt-3">{c.name}</h3>
                <div className="mt-1.5">
                  <select
                    disabled={!canEdit}
                    value={roles.find(r => r.name === c.designation)?.id || ""}
                    onChange={e => {
                      const sel = roles.find(r => r.id.toString() === e.target.value);
                      if (sel) handleDesignationChange(c.id, sel.id, sel.name);
                    }}
                    className={`text-xs px-2 py-0.5 rounded-full border-0 outline-none font-semibold ${!canEdit ? "cursor-default" : "cursor-pointer"} ${DESIGNATION_COLORS[c.designation] || "bg-gold-light text-gold"}`}
                  >
                    <option value="" disabled>{c.designation || "Role"}</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                {c.since && <div className="text-xs text-warm-muted mt-1.5">Since {c.since}</div>}
                <div className="flex justify-center gap-3 mt-4 text-warm-muted">
                  {c.phone && (
                    <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-xs hover:text-primary transition">
                      <Phone className="w-3.5 h-3.5" /> {c.phone}
                    </a>
                  )}
                  {c.email && (
                    <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-xs hover:text-primary transition">
                      <Mail className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </AnimatedCard>
            ))}
          </div>
        )}

        <Modal open={open} onClose={() => setOpen(false)} title={editTarget ? "Edit Committee Member" : "Add Committee Member"} size="lg">
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-warm-muted uppercase tracking-wider block mb-1">Full Name *</label>
                <input placeholder="Name" value={form.name} onChange={field("name")} className="w-full px-3 py-2 rounded-lg border border-warm bg-surface focus:border-primary focus:outline-none transition text-sm shadow-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-warm-muted uppercase tracking-wider block mb-1">Role / Designation *</label>
                <select 
                  value={form.role_id || ""} 
                  onChange={e => {
                    const sel = roles.find(r => r.id.toString() === e.target.value);
                    setForm((f: any) => ({ 
                      ...f, 
                      role_id: e.target.value, 
                      designation: sel ? sel.name : "",
                      permissions: sel && Array.isArray(sel.permissions) ? [...sel.permissions] : []
                    }));
                  }} 
                  className="w-full px-3 py-2 rounded-lg border border-warm bg-surface focus:border-primary focus:outline-none transition text-sm shadow-sm"
                >
                  <option value="">Select a Role</option>
                  {roles.filter(r => r.active).map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {form.role_id && (() => {
              const selectedRole = roles.find(r => r.id.toString() === form.role_id);
              if (!selectedRole || !selectedRole.permissions || selectedRole.permissions.length === 0) return null;
              
              const modules = selectedRole.permissions.reduce((acc: any, p: string) => {
                const mod = getModule(p);
                if (!acc[mod]) acc[mod] = [];
                acc[mod].push(p);
                return acc;
              }, {});

              return (
                <div className="mt-4 border border-warm rounded-xl bg-surface overflow-hidden shadow-sm">
                  <div className="p-3 border-b border-warm bg-sand/30 flex justify-between items-center">
                    <h4 className="text-sm font-bold text-foreground">Assigned Permissions</h4>
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{form.permissions?.length || 0} / {selectedRole.permissions.length}</span>
                  </div>
                  <div className="p-4 space-y-4 max-h-[240px] overflow-y-auto">
                    {Object.entries(modules).map(([mod, perms]: [string, any]) => (
                      <div key={mod}>
                        <h5 className="text-[10px] font-bold text-warm-muted uppercase tracking-wider mb-2">{mod}</h5>
                        <div className="flex flex-wrap gap-2">
                          {perms.map((p: string) => {
                            const isChecked = form.permissions?.includes(p);
                            const actionWord = getActionWord(p);
                            return (
                              <button
                                type="button"
                                key={p}
                                onClick={() => {
                                  setForm((f: any) => ({
                                    ...f,
                                    permissions: isChecked 
                                      ? (f.permissions || []).filter((x: string) => x !== p)
                                      : [...(f.permissions || []), p]
                                  }));
                                }}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all select-none
                                  ${isChecked 
                                    ? 'bg-primary/10 border-primary/30 text-primary' 
                                    : 'bg-surface border-warm text-warm-muted hover:border-warm-dark hover:bg-sand'}`}
                              >
                                <span className={`w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 transition-colors ${isChecked ? "bg-primary text-white" : "bg-transparent border border-warm"}`}>
                                  {isChecked ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5 opacity-0" />}
                                </span>
                                {actionWord}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-warm-muted uppercase tracking-wider block mb-1">Phone</label>
                <input placeholder="+91 9XXXXXXXXX" value={form.phone} onChange={field("phone")} className="w-full px-3 py-2 rounded-lg border border-warm bg-surface focus:border-primary focus:outline-none transition text-sm shadow-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-warm-muted uppercase tracking-wider block mb-1">Since (Year)</label>
                <input type="date" value={form.since} onChange={field("since")} className="w-full px-3 py-2 rounded-lg border border-warm bg-surface focus:border-primary focus:outline-none transition text-sm shadow-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-warm-muted uppercase tracking-wider block mb-1">Email *</label>
              <input type="email" placeholder="email@samaj.org" value={form.email} onChange={field("email")} className="w-full px-3 py-2 rounded-lg border border-warm bg-surface focus:border-primary focus:outline-none transition text-sm shadow-sm" />
            </div>

            {!editTarget && (
              <div className="grid grid-cols-2 gap-4 bg-amber-50/50 p-4 rounded-xl border border-amber-100 mt-2 shadow-sm">
                <div className="col-span-2">
                  <p className="text-xs text-amber-800 font-bold uppercase tracking-wider">Login Account Credentials</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Password *</label>
                  <input 
                    type="password"
                    value={form.password || ""} 
                    onChange={field("password")} 
                    placeholder="••••••••" 
                    className="w-full px-3 py-2 rounded-lg border border-amber-200 bg-white focus:border-amber-400 focus:outline-none transition text-sm shadow-sm" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Confirm Password *</label>
                  <input 
                    type="password"
                    value={form.confirm_password || ""} 
                    onChange={field("confirm_password")} 
                    placeholder="••••••••" 
                    className="w-full px-3 py-2 rounded-lg border border-amber-200 bg-white focus:border-amber-400 focus:outline-none transition text-sm shadow-sm" 
                  />
                </div>
              </div>
            )}
            
            {errorMsg && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {errorMsg}
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-warm">
              <button onClick={() => setOpen(false)} className="flex-1 py-2.5 rounded-xl border border-warm text-sm font-semibold hover:bg-sand transition"><X className="w-4 h-4 inline mr-1" />Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/95 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <Check className="w-4 h-4" /> {editTarget ? "Save" : "Add Member"}
              </button>
            </div>
          </div>
        </Modal>
      </PageWrap>
    );
  },
});
