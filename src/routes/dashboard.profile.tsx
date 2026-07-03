import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ShieldCheck, Edit, Mail, Phone, MapPin, GraduationCap, Briefcase, Loader2, User, Building2, BookOpen, Home, CheckCircle2, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { PageWrap } from "@/components/wag/PageWrap";
import { AnimatedCard, AvatarCircle, PlanBadge } from "@/components/wag/primitives";
import { api } from "@/lib/api";
import { AnimatePresence, motion } from "framer-motion";
import { calculateAge } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState("Personal");
  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editStep, setEditStep] = useState(0);
  const [editForm, setEditForm] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [birthdateError, setBirthdateError] = useState("");

  const fetchProfile = async () => {
    try {
      const data = await api.getCurrentUser();
      if (data?.member) setMember(data.member);
    } catch (e) {
      console.error("Profile load failed", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const openEdit = () => {
    const m = member || {};
    const initialBirthdate = m.birthdate || "";
    let initialAge = "";
    let initialError = "";

    if (initialBirthdate) {
      const birthDate = new Date(initialBirthdate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (birthDate > today) {
        initialError = "Birthdate cannot be in the future.";
      } else {
        initialAge = m.age ? String(m.age) : calculateAge(initialBirthdate);
      }
    }

    setBirthdateError(initialError);
    setEditForm({
      name: m.name || user?.name || "",
      email: m.email || user?.email || "",
      phone: m.phone || "",
      birthdate: initialBirthdate,
      age: initialAge,
      gender: m.gender || "Male",
      state: m.state || "Gujarat",
      district: m.district || "Amreli",
      taluka: m.taluka || "Rajula",
      village: m.village || "",
      aadhaar: m.aadhaar || "",
      school: m.school || "",
      college: m.college || "",
      degree: m.degree || "",
      fieldOfStudy: m.field_of_study || "",
      passingYear: m.passing_year || "",
      professionType: m.profession_type || "Job",
      jobTitle: m.job_title || "",
      company: m.company || "",
      industry: m.industry || "",
      salary: m.salary || "",
      jobWorkMode: m.job_work_mode || "On-site",
      jobType: m.job_type || "Full-time",
      jobCity: m.job_city || "",
      jobState: m.job_state || "Gujarat",
      jobCountry: m.job_country || "India",
      jobAddress: m.job_address || "",
      businessName: m.business_name || "",
      businessCategory: m.business_category || "",
      gstNo: m.gst_no || "",
      businessYears: m.business_years || "",
    });
    setEditStep(0);
    setSaved(false);
    setEditOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member?.id) return alert("Member profile not found.");
    if (!editForm.name.trim()) return alert("Full Name is required.");
    if (!editForm.phone.trim()) return alert("Mobile number is required.");
    
    if (editForm.birthdate) {
      const birthDate = new Date(editForm.birthdate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (birthDate > today) {
        return alert("Birthdate cannot be in the future.");
      }
    }

    const cleanAadhaar = (editForm.aadhaar || "").replace(/\D/g, "");
    if (cleanAadhaar && cleanAadhaar.length !== 12) return alert("Aadhaar must be exactly 12 digits.");

    setSubmitting(true);
    try {
      const payload: any = {
        name: editForm.name, email: editForm.email, phone: editForm.phone,
        birthdate: editForm.birthdate || null,
        age: editForm.age ? parseInt(editForm.age) : null, gender: editForm.gender,
        state: editForm.state, district: editForm.district,
        taluka: editForm.taluka, village: editForm.village,
        school: editForm.school, college: editForm.college, degree: editForm.degree,
        field_of_study: editForm.fieldOfStudy, passing_year: editForm.passingYear,
        education: editForm.degree || member.education || "Graduate",
        profession_type: editForm.professionType,
        job_title: editForm.jobTitle, company: editForm.company,
        industry: editForm.industry, salary: editForm.salary,
        job_work_mode: editForm.jobWorkMode, job_type: editForm.jobType,
        job_city: editForm.jobCity, job_state: editForm.jobState,
        job_country: editForm.jobCountry, job_address: editForm.jobAddress,
        business_name: editForm.businessName, business_category: editForm.businessCategory,
        gst_no: editForm.gstNo, business_years: editForm.businessYears,
        profession: editForm.professionType === "Job" ? editForm.jobTitle : editForm.businessName,
        aadhaar: editForm.aadhaar,
      };
      if (editForm.aadhaar !== member.aadhaar) payload.aadhaar_status = "Pending";
      await api.updateMember(member.id, payload);
      await refreshUser();
      await fetchProfile();
      setSaved(true);
      setTimeout(() => setEditOpen(false), 1200);
    } catch {
      alert("Failed to save changes. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBirthdateChange = (v: string) => {
    if (!v) {
      setBirthdateError("");
      setEditForm((prev: any) => ({
        ...prev,
        birthdate: "",
        age: ""
      }));
      return;
    }

    const birthDate = new Date(v);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (birthDate > today) {
      setBirthdateError("Birthdate cannot be in the future.");
      setEditForm((prev: any) => ({
        ...prev,
        birthdate: v,
        age: ""
      }));
    } else {
      setBirthdateError("");
      const calculatedAge = calculateAge(v);
      setEditForm((prev: any) => ({
        ...prev,
        birthdate: v,
        age: calculatedAge
      }));
    }
  };

  const f = (label: string, val: any, Icon?: any) => ({ label, val: val || "N/A", Icon });

  const TABS = ["Personal", "Address", "Education", "Profession", "Aadhaar"];
  const EDIT_STEPS = ["Personal", "Address", "Education", "Profession"];

  if (loading) return (
    <PageWrap title="My Profile">
      <div className="flex items-center justify-center min-h-[320px]">
        <Loader2 className="w-9 h-9 text-primary animate-spin" />
      </div>
    </PageWrap>
  );

  return (
    <PageWrap title="My Profile">
      {/* Hero Card */}
      <AnimatedCard className="overflow-hidden mb-6">
        <div className="h-36 bg-gradient-to-r from-primary via-primary/80 to-gold relative">
          <img
            src="https://images.unsplash.com/photo-1530023367847-a683933f4172?w=1200&h=300&fit=crop"
            alt="" className="w-full h-full object-cover mix-blend-overlay opacity-50"
          />
        </div>
        <div className="px-6 pb-6 -mt-12 flex flex-col sm:flex-row items-start sm:items-end gap-4 relative z-10">
          <div className="relative rounded-full border-4 border-white bg-white shadow-sm shrink-0 mt-2 sm:mt-0">
            <AvatarCircle name={member?.name || user?.name || "U"} src={member?.avatar || user?.avatar} size={100} />
          </div>
          <div className="flex-1 min-w-0 sm:pb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-ui font-bold text-xl truncate">{member?.name || user?.name}</h2>
              <ShieldCheck className="w-5 h-5 text-teal shrink-0" />
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-sm text-warm-muted">{member?.community_name || user?.communityName}</span>
            </div>
            <div className="text-xs text-warm-muted mt-1 flex items-center gap-1">
              <Mail className="w-3 h-3" /> {member?.email || user?.email}
            </div>
          </div>
          <button
            onClick={openEdit}
            className="shrink-0 px-4 py-2 rounded-xl border border-warm bg-white text-sm font-semibold flex items-center gap-2 hover:bg-sand hover:border-primary hover:text-primary transition-all shadow-sm"
          >
            <Edit className="w-4 h-4" /> Edit Profile
          </button>
        </div>
      </AnimatedCard>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-warm mb-5 overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${tab === t ? "border-primary text-primary" : "border-transparent text-warm-muted hover:text-foreground"}`}>
            {t}
          </button>
        ))}
      </div>

      <AnimatedCard className="p-6">
        {tab === "Personal" && (
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              f("Full Name", member?.name || user?.name),
              f("Email Address", member?.email || user?.email, Mail),
              f("Mobile Number", member?.phone, Phone),
              f("Birthdate", member?.birthdate ? new Date(member.birthdate).toLocaleDateString() : null),
              f("Age", member?.age ? `${member.age} Years` : null),
              f("Gender", member?.gender),
            ].map(({ label, val, Icon }) => <InfoField key={label} label={label} value={val} Icon={Icon} />)}
          </div>
        )}
        {tab === "Address" && (
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              f("State", member?.state, MapPin),
              f("District", member?.district),
              f("Taluka", member?.taluka),
              f("Village", member?.village),
            ].map(({ label, val, Icon }) => <InfoField key={label} label={label} value={val} Icon={Icon} />)}
          </div>
        )}
        {tab === "Education" && (
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              f("School", member?.school, GraduationCap),
              f("College", member?.college, BookOpen),
              f("Degree / Course", member?.degree),
              f("Field of Study", member?.field_of_study),
              f("Passing Year", member?.passing_year),
            ].map(({ label, val, Icon }) => <InfoField key={label} label={label} value={val} Icon={Icon} />)}
          </div>
        )}
        {tab === "Profession" && (
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
              <Briefcase className="w-3.5 h-3.5" />
              {member?.profession_type || "Job"}
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              {member?.profession_type === "Business" ? [
                f("Business Name", member?.business_name, Building2),
                f("Category", member?.business_category),
                f("GST No.", member?.gst_no),
                f("Years in Business", member?.business_years ? `${member.business_years} yrs` : null),
              ].map(({ label, val, Icon }) => <InfoField key={label} label={label} value={val} Icon={Icon} />)
              : [
                f("Job Title", member?.job_title, Briefcase),
                f("Company", member?.company, Building2),
                f("Industry", member?.industry),
                f("Annual Salary", member?.salary ? `₹${member.salary} LPA` : null),
                f("Work Mode", member?.job_work_mode),
                f("Job Type", member?.job_type),
                f("Job Location", [member?.job_city, member?.job_state].filter(Boolean).join(", "), MapPin),
              ].map(({ label, val, Icon }) => <InfoField key={label} label={label} value={val} Icon={Icon} />)}
            </div>
          </div>
        )}
        {tab === "Aadhaar" && (
          <div className="space-y-6">
            <InfoField label="Aadhaar Number" value={member?.aadhaar || "N/A"} Icon={ShieldCheck} />
            <div>
              <div className="text-xs uppercase tracking-wider text-warm-muted font-semibold mb-2">Verification Status</div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${
                member?.aadhaar_status === "Approved" ? "bg-teal/15 text-teal" :
                member?.aadhaar_status === "Rejected" ? "bg-red-100 text-red-600" :
                "bg-amber-100 text-amber-600"
              }`}>
                <ShieldCheck className="w-4 h-4" />
                {member?.aadhaar_status || "Pending"}
              </span>
            </div>
          </div>
        )}
      </AnimatedCard>

      {/* Edit Modal */}
      <AnimatePresence>
        {editOpen && (
          <>
            <motion.div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditOpen(false)} />
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setEditOpen(false)}
            >
              <motion.div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                onClick={e => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-warm flex items-center justify-between bg-gradient-to-r from-primary/5 to-gold/5">
                  <div>
                    <h3 className="font-ui font-bold text-lg">Edit Profile</h3>
                    <p className="text-xs text-warm-muted mt-0.5">Step {editStep + 1} of {EDIT_STEPS.length} — {EDIT_STEPS[editStep]}</p>
                  </div>
                  <button onClick={() => setEditOpen(false)} className="w-8 h-8 rounded-full hover:bg-sand flex items-center justify-center transition">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Step Progress */}
                <div className="px-6 pt-4 flex gap-2">
                  {EDIT_STEPS.map((s, i) => (
                    <button key={s} onClick={() => setEditStep(i)} className="flex-1 text-center">
                      <div className={`h-1.5 rounded-full transition-all ${i <= editStep ? "bg-primary" : "bg-warm"}`} />
                      <span className={`text-[10px] mt-1 font-semibold ${i === editStep ? "text-primary" : "text-warm-muted"}`}>{s}</span>
                    </button>
                  ))}
                </div>

                {/* Modal Body */}
                <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 py-5">
                  {saved ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                      <CheckCircle2 className="w-14 h-14 text-teal" />
                      <p className="font-ui font-bold text-lg text-teal">Profile Updated!</p>
                    </div>
                  ) : (
                    <AnimatePresence mode="wait">
                      <motion.div key={editStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>

                        {editStep === 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <EF label="Full Name *" type="text" value={editForm.name} onChange={v => setEditForm({ ...editForm, name: v })} />
                            <EF label="Email *" type="email" value={editForm.email} onChange={v => setEditForm({ ...editForm, email: v })} />
                            <EF label="Mobile Number *" type="text" value={editForm.phone} onChange={v => setEditForm({ ...editForm, phone: v })} />
                            <div>
                              <EF label="Birthdate" type="date" value={editForm.birthdate} onChange={handleBirthdateChange} />
                              {birthdateError && (
                                <p className="text-red-500 text-xs font-semibold mt-1">{birthdateError}</p>
                              )}
                            </div>
                            <EF label="Age (Auto-filled)" type="number" value={editForm.age} readOnly={true} onChange={() => {}} />
                            <div>
                              <label className="block text-xs font-semibold text-warm-muted uppercase tracking-wider mb-1">Gender</label>
                              <select value={editForm.gender} onChange={e => setEditForm({ ...editForm, gender: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-warm bg-white text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20">
                                {["Male", "Female", "Other"].map(g => <option key={g}>{g}</option>)}
                              </select>
                            </div>
                            <EF label="Aadhaar Number (12 digits)" type="text" maxLength={12} value={editForm.aadhaar} onChange={v => setEditForm({ ...editForm, aadhaar: v })} placeholder="XXXXXXXXXXXX" />
                          </div>
                        )}

                        {editStep === 1 && (
                          <div className="grid grid-cols-2 gap-4">
                            <EF label="State" value={editForm.state} onChange={v => setEditForm({ ...editForm, state: v })} />
                            <EF label="District" value={editForm.district} onChange={v => setEditForm({ ...editForm, district: v })} />
                            <EF label="Taluka" value={editForm.taluka} onChange={v => setEditForm({ ...editForm, taluka: v })} />
                            <EF label="Village" value={editForm.village} onChange={v => setEditForm({ ...editForm, village: v })} />
                          </div>
                        )}

                        {editStep === 2 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <EF label="School Name" value={editForm.school} onChange={v => setEditForm({ ...editForm, school: v })} />
                            <EF label="College Name" value={editForm.college} onChange={v => setEditForm({ ...editForm, college: v })} />
                            <EF label="Degree / Course" value={editForm.degree} onChange={v => setEditForm({ ...editForm, degree: v })} />
                            <EF label="Field of Study" value={editForm.fieldOfStudy} onChange={v => setEditForm({ ...editForm, fieldOfStudy: v })} />
                            <EF label="Passing Year" type="number" value={editForm.passingYear} onChange={v => setEditForm({ ...editForm, passingYear: v })} />
                          </div>
                        )}

                        {editStep === 3 && (
                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-semibold text-warm-muted uppercase tracking-wider mb-2">Profession Type</label>
                              <div className="inline-flex bg-sand rounded-full p-1 gap-1">
                                {["Job", "Business"].map(x => (
                                  <button key={x} type="button" onClick={() => setEditForm({ ...editForm, professionType: x })}
                                    className={`px-5 py-1.5 rounded-full text-sm font-semibold transition ${editForm.professionType === x ? "bg-primary text-white shadow" : "text-warm-muted"}`}>
                                    {x}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {editForm.professionType === "Job" ? <>
                                <EF label="Job Title" value={editForm.jobTitle} onChange={v => setEditForm({ ...editForm, jobTitle: v })} />
                                <EF label="Company" value={editForm.company} onChange={v => setEditForm({ ...editForm, company: v })} />
                                <EF label="Industry" value={editForm.industry} onChange={v => setEditForm({ ...editForm, industry: v })} />
                                <EF label="Annual Salary (LPA)" type="number" value={editForm.salary} onChange={v => setEditForm({ ...editForm, salary: v })} />
                                <div>
                                  <label className="block text-xs font-semibold text-warm-muted uppercase tracking-wider mb-1">Work Mode</label>
                                  <select value={editForm.jobWorkMode} onChange={e => setEditForm({ ...editForm, jobWorkMode: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-warm bg-white text-sm focus:outline-none focus:border-primary">
                                    <option value="On-site">On-site</option>
                                    <option value="Remote">Remote</option>
                                    <option value="Hybrid">Hybrid</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-warm-muted uppercase tracking-wider mb-1">Job Type</label>
                                  <select value={editForm.jobType} onChange={e => setEditForm({ ...editForm, jobType: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-warm bg-white text-sm focus:outline-none focus:border-primary">
                                    <option value="Full-time">Full-time</option>
                                    <option value="Part-time">Part-time</option>
                                    <option value="Contract">Contract</option>
                                    <option value="Internship">Internship</option>
                                  </select>
                                </div>
                                <EF label="Job City" value={editForm.jobCity} onChange={v => setEditForm({ ...editForm, jobCity: v })} />
                                <EF label="Job State" value={editForm.jobState} onChange={v => setEditForm({ ...editForm, jobState: v })} />
                                <div className="sm:col-span-2">
                                  <EF label="Job Address" value={editForm.jobAddress} onChange={v => setEditForm({ ...editForm, jobAddress: v })} />
                                </div>
                              </> : <>
                                <EF label="Business Name" value={editForm.businessName} onChange={v => setEditForm({ ...editForm, businessName: v })} />
                                <EF label="Category" value={editForm.businessCategory} onChange={v => setEditForm({ ...editForm, businessCategory: v })} />
                                <EF label="GST No." value={editForm.gstNo} onChange={v => setEditForm({ ...editForm, gstNo: v })} />
                                <EF label="Years in Business" type="number" value={editForm.businessYears} onChange={v => setEditForm({ ...editForm, businessYears: v })} />
                              </>}
                            </div>
                          </div>
                        )}

                      </motion.div>
                    </AnimatePresence>
                  )}
                </form>

                {/* Modal Footer */}
                {!saved && (
                  <div className="px-6 py-4 border-t border-warm flex items-center justify-between gap-3 bg-sand/30">
                    <button type="button" disabled={editStep === 0} onClick={() => setEditStep(s => s - 1)}
                      className="px-4 py-2 rounded-xl border border-warm text-sm font-semibold hover:bg-white transition disabled:opacity-40">
                      ← Back
                    </button>
                    {editStep < EDIT_STEPS.length - 1 ? (
                      <button type="button" onClick={() => setEditStep(s => s + 1)}
                        className="px-6 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition">
                        Next →
                      </button>
                    ) : (
                      <button type="button" onClick={handleSave} disabled={submitting}
                        className="px-6 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50 flex items-center gap-2">
                        {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : "✓ Save Changes"}
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </PageWrap>
  );
}

function InfoField({ label, value, Icon }: { label: string; value: string; Icon?: any }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-warm-muted font-bold mb-1">{label}</div>
      <div className="flex items-center gap-2 font-semibold text-sm">
        {Icon && <Icon className="w-4 h-4 text-primary shrink-0" />}
        <span>{value || "—"}</span>
      </div>
    </div>
  );
}

function EF({ label, type = "text", value, onChange, placeholder = "", maxLength, readOnly, className = "" }: {
  label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number; readOnly?: boolean; className?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-warm-muted uppercase tracking-wider mb-1">{label}</label>
      <input
        type={type}
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        readOnly={readOnly}
        className={`w-full px-3 py-2.5 rounded-xl border border-warm text-sm font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition ${
          readOnly ? "bg-sand/30 cursor-not-allowed opacity-75 focus:ring-0 focus:border-warm" : "bg-white"
        } ${className}`}
      />
    </div>
  );
}
