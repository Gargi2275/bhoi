import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Loader2, 
  Calendar, 
  MapPin, 
  Clock, 
  X, 
  Check, 
  BarChart3, 
  LineChart, 
  TrendingUp, 
  UserCheck, 
  Download, 
  Trash, 
  FileSpreadsheet,
  AlertCircle
} from "lucide-react";
import { PageWrap } from "@/components/wag/PageWrap";
import { AnimatedCard, Modal, StatusBadge } from "@/components/wag/primitives";
import { cn, hasPermission } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { api, getImageUrl } from "@/lib/api";
import { useModulePermissions } from "./community-admin";

const EVENT_CATEGORIES = [
  "Cultural", 
  "Religious", 
  "Social", 
  "Business", 
  "Education", 
  "Sports", 
  "Youth", 
  "Women", 
  "Senior Citizens", 
  "Community Meeting", 
  "Charity", 
  "Other"
];

const EVENT_STATUSES = [
  "Draft", 
  "Pending Approval", 
  "Published", 
  "Registration Open", 
  "Ongoing", 
  "Completed", 
  "Cancelled"
];

function blankForm() {
  return { 
    title: "", 
    type: "Cultural", 
    customType: "", 
    date: "", 
    time: "", 
    start_time: "",
    end_time: "",
    venue: "", 
    venue_details: "", 
    desc: "", 
    organizer: "",
    max_attendees: "100", 
    status: "Published", 
    img: null as File | null, 
    removeImg: false,
    speakers: [] as any[],
    schedule: [] as any[]
  };
}

export const Route = createFileRoute("/community-admin/events")({
  component: CommunityAdminEvents,
});

function CommunityAdminEvents() {
  const { user } = useAuth();
  const perms = useModulePermissions("events");
  
  // Data State
  const [events, setEvents] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Page UI State
  const [activeTab, setActiveTab] = useState<"events" | "analytics">("events");
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [form, setForm] = useState<any>(blankForm());
  const [filterStatus, setFilterStatus] = useState("All");
  const [search, setSearch] = useState("");
  
  // Speakers & Schedule builder fields
  const [newSpeakerName, setNewSpeakerName] = useState("");
  const [newSpeakerRole, setNewSpeakerRole] = useState("");
  const [newSpeakerBio, setNewSpeakerBio] = useState("");
  
  const [newScheduleTime, setNewScheduleTime] = useState("");
  const [newScheduleActivity, setNewScheduleActivity] = useState("");

  // Registrations Manager Modal State
  const [selectedEventRegs, setSelectedEventRegs] = useState<any | null>(null);

  const fetchEventsAndRegistrations = async () => {
    if (!user?.communityId) return;
    try {
      const [eventsRes, regsRes] = await Promise.all([
        api.getEvents({ communityId: user.communityId }),
        api.getEventRegistrations()
      ]);
      setEvents(eventsRes || []);
      setRegistrations(regsRes || []);
    } catch (err) {
      console.error("Failed to load events/registrations", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventsAndRegistrations();
    // 6-second polling for real-time registrations and attendance sync
    const interval = setInterval(fetchEventsAndRegistrations, 6000);
    return () => clearInterval(interval);
  }, [user]);

  const openCreate = () => { 
    setForm(blankForm()); 
    setEditTarget(null); 
    setOpen(true); 
  };

  const openEdit = (e: any) => {
    const isCustomCat = !EVENT_CATEGORIES.includes(e.category || e.type);
    setForm({ 
      title: e.title, 
      type: isCustomCat ? "Other" : (e.category || e.type || "Cultural"), 
      customType: isCustomCat ? (e.category || e.type || "") : "",
      date: e.date, 
      time: e.time || "", 
      start_time: e.start_time || "",
      end_time: e.end_time || "",
      venue: e.venue, 
      venue_details: e.venue_details || "",
      desc: e.desc || "", 
      organizer: e.organizer || "",
      max_attendees: e.max_attendees || e.max || "100", 
      status: e.status, 
      img: null, 
      removeImg: false,
      speakers: e.speakers || [],
      schedule: e.schedule || []
    });
    setEditTarget(e);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.date) return alert("Title and date are required.");
    setSaving(true);
    try {
      const resolvedType = form.type === "Other" && form.customType.trim() ? form.customType : form.type;
      
      const payload = { 
        ...form, 
        type: resolvedType,
        category: resolvedType,
        community: user?.communityId, 
        max_attendees: form.max_attendees ? parseInt(form.max_attendees) : null 
      };
      
      if (form.removeImg) {
        payload.img = null;
      } else if (!form.img) {
        delete payload.img;
      }
      
      delete payload.removeImg;
      delete payload.customType;
      
      if (editTarget) {
        await api.updateEvent(editTarget.id, payload);
      } else {
        await api.createEvent(payload);
      }
      setOpen(false);
      fetchEventsAndRegistrations();
    } catch (e: any) { 
      alert(e.message || "Failed to save event."); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this event? This will also remove any related attendee registrations.")) return;
    try { 
      await api.deleteEvent(id); 
      fetchEventsAndRegistrations(); 
    } catch (e: any) { 
      alert(e.message || "Failed to delete."); 
    }
  };

  // Speakers sub-management
  const addSpeakerToForm = () => {
    if (!newSpeakerName.trim()) return;
    const sp = { name: newSpeakerName, designation: newSpeakerRole, bio: newSpeakerBio };
    setForm((f: any) => ({ ...f, speakers: [...f.speakers, sp] }));
    setNewSpeakerName("");
    setNewSpeakerRole("");
    setNewSpeakerBio("");
  };

  const removeSpeakerFromForm = (idx: number) => {
    setForm((f: any) => ({ ...f, speakers: f.speakers.filter((_: any, i: number) => i !== idx) }));
  };

  // Schedule sub-management
  const addScheduleToForm = () => {
    if (!newScheduleTime.trim() || !newScheduleActivity.trim()) return;
    const sch = { time: newScheduleTime, activity: newScheduleActivity };
    setForm((f: any) => ({ ...f, schedule: [...f.schedule, sch] }));
    setNewScheduleTime("");
    setNewScheduleActivity("");
  };

  const removeScheduleFromForm = (idx: number) => {
    setForm((f: any) => ({ ...f, schedule: f.schedule.filter((_: any, i: number) => i !== idx) }));
  };

  // Attendance controls inside registrations viewer
  const handleUpdateRegStatus = async (regId: number, status: string) => {
    try {
      await api.updateEventRegistration(regId, { status });
      fetchEventsAndRegistrations();
      // Keep state selectedEventRegs up to date in real time
      if (selectedEventRegs) {
        const updatedRegs = selectedEventRegs.regs.map((r: any) => 
          r.id === regId ? { ...r, status } : r
        );
        setSelectedEventRegs({ ...selectedEventRegs, regs: updatedRegs });
      }
    } catch (err: any) {
      alert("Failed to update status: " + (err.message || "Unknown error"));
    }
  };

  const handleDeleteReg = async (regId: number, attendeesCount: number) => {
    if (!confirm("Remove this member's registration?")) return;
    try {
      await api.deleteEventRegistration(regId);
      fetchEventsAndRegistrations();
      if (selectedEventRegs) {
        const updatedRegs = selectedEventRegs.regs.filter((r: any) => r.id !== regId);
        const updatedEvent = { 
          ...selectedEventRegs.event, 
          attendees: Math.max(0, (selectedEventRegs.event.attendees || 0) - attendeesCount) 
        };
        setSelectedEventRegs({ event: updatedEvent, regs: updatedRegs });
      }
    } catch (err: any) {
      alert("Failed to delete registration: " + (err.message || "Unknown error"));
    }
  };

  // Export registrations CSV file
  const handleExportCSV = (eventTitle: string, regs: any[]) => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Name,Email,Phone,Attendees,Registration Date,Status,Special Notes\r\n";
    regs.forEach(r => {
      csvContent += `"${r.name}","${r.email}","${r.phone}",${r.attendees},"${r.registration_date}","${r.status}","${r.special_notes || ""}"\r\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Registrations_${eventTitle.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = events.filter(e => {
    const matchStatus = filterStatus === "All" || e.status === filterStatus;
    const matchSearch = (e.title || "").toLowerCase().includes(search.toLowerCase()) || (e.venue || "").toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  // Analytics Math
  const totalEvents = events.length;
  const upcomingEvents = events.filter(e => new Date(e.date) >= new Date() && e.status !== "Completed" && e.status !== "Cancelled").length;
  const completedEvents = events.filter(e => e.status === "Completed").length;
  
  // Total registrations matches all registrations of community events
  const communityEventIds = new Set(events.map(e => e.id));
  const communityRegistrations = registrations.filter(r => communityEventIds.has(r.event));
  const totalRegistrations = communityRegistrations.reduce((sum, r) => sum + (r.attendees || 1), 0);
  const avgAttendance = completedEvents > 0 ? Math.round(totalRegistrations / completedEvents) : totalRegistrations;

  const field = (key: string) => (evt: any) => setForm((f: any) => ({ ...f, [key]: evt.target.value }));

  return (
    <PageWrap
      title="Events Management"
      desc={`${events.length} events active in your samaj portal`}
      action={
        <div className="flex gap-2">
          {activeTab === "events" && hasPermission(user, ["Create Events"]) && perms.create && (
            <button onClick={openCreate} className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold flex items-center gap-2 hover:bg-primary/95 transition shadow-sm">
              <Plus className="w-4 h-4" /> Create Event
            </button>
          )}
        </div>
      }
    >
      {/* Tab controls */}
      <div className="flex gap-1 border-b border-warm mb-6">
        <button
          onClick={() => setActiveTab("events")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "events" ? "border-primary text-primary" : "border-transparent text-warm-muted hover:text-foreground"}`}
        >
          Event List
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "analytics" ? "border-primary text-primary" : "border-transparent text-warm-muted hover:text-foreground"}`}
        >
          Event Analytics
        </button>
      </div>

      {activeTab === "events" && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <input
                placeholder="Search events or venue…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-4 pr-3 py-2 rounded-xl border border-warm bg-surface focus:outline-none focus:border-primary text-sm"
              />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-xl border border-warm bg-surface text-sm">
              <option value="All">All Statuses</option>
              {EVENT_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-warm-muted border border-warm rounded-2xl bg-surface">No events found.</div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(e => {
                const seatsRemaining = Math.max(0, (e.max_attendees || 100) - (e.attendees || 0));
                
                return (
                  <AnimatedCard key={e.id} className="overflow-hidden flex flex-col justify-between border border-warm shadow-sm hover:shadow">
                    <div>
                      {/* Cover */}
                      <div className="relative">
                        {(e.img || e.img_url) ? (
                          <img src={getImageUrl(e.img || e.img_url)} alt="" className="h-36 w-full object-cover" />
                        ) : (
                          <div className="h-36 w-full bg-gradient-to-br from-primary/10 to-gold/10 flex items-center justify-center">
                            <Calendar className="w-10 h-10 text-primary/30" />
                          </div>
                        )}
                        <div className="absolute top-3 left-3 bg-surface/90 border border-warm/60 px-2 py-0.5 rounded text-[10px] font-bold text-foreground">
                          {e.category || e.type}
                        </div>
                        <div className="absolute top-3 right-3">
                          <StatusBadge status={e.status} />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <h3 className="font-ui font-bold text-sm leading-snug line-clamp-1 mb-1">{e.title}</h3>
                        <p className="text-xs text-warm-muted line-clamp-2 mt-0.5 mb-3">{e.desc || "No description provided."}</p>
                        
                        <div className="space-y-1.5 text-[11px] text-warm-muted border-t border-warm/40 pt-3">
                          <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-primary" /> {e.date} {e.start_time && `· ${e.start_time} - ${e.end_time || "End"}`}</div>
                          <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-teal" /> {e.venue}</div>
                          <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-gold" /> {e.attendees || 0} / {e.max_attendees || 100} Registered ({seatsRemaining} left)</div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="p-4 pt-0">
                      <div className="flex gap-2 border-t border-warm pt-3">
                        <button 
                          onClick={() => {
                            const eventRegs = registrations.filter(r => r.event === e.id);
                            setSelectedEventRegs({ event: e, regs: eventRegs });
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg border border-warm hover:bg-sand transition font-bold text-foreground"
                        >
                          <Users className="w-3.5 h-3.5 text-primary" /> Manage Attendees
                        </button>
                        
                        {hasPermission(user, ["Edit Events"]) && perms.edit && (
                          <button onClick={() => openEdit(e)} className="p-1.5 rounded-lg border border-warm hover:bg-sand transition" title="Edit Event">
                            <Edit className="w-3.5 h-3.5 text-warm-muted" />
                          </button>
                        )}
                        {hasPermission(user, ["Delete Events"]) && perms.delete && (
                          <button onClick={() => handleDelete(e.id)} className="p-1.5 rounded-lg border border-red-100 bg-red-50 hover:bg-red-100 transition" title="Delete Event">
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </button>
                        )}
                      </div>
                    </div>
                  </AnimatedCard>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* Key Metrics cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 rounded-xl border border-warm bg-surface shadow-sm">
              <span className="text-[10px] text-warm-muted font-bold uppercase block mb-1">Total Events</span>
              <span className="text-xl font-bold font-ui text-foreground">{totalEvents}</span>
            </div>
            <div className="p-4 rounded-xl border border-warm bg-surface shadow-sm">
              <span className="text-[10px] text-warm-muted font-bold uppercase block mb-1">Upcoming</span>
              <span className="text-xl font-bold font-ui text-teal">{upcomingEvents}</span>
            </div>
            <div className="p-4 rounded-xl border border-warm bg-surface shadow-sm">
              <span className="text-[10px] text-warm-muted font-bold uppercase block mb-1">Completed</span>
              <span className="text-xl font-bold font-ui text-gold">{completedEvents}</span>
            </div>
            <div className="p-4 rounded-xl border border-warm bg-surface shadow-sm">
              <span className="text-[10px] text-warm-muted font-bold uppercase block mb-1">Total Bookings</span>
              <span className="text-xl font-bold font-ui text-primary">{totalRegistrations} Members</span>
            </div>
            <div className="p-4 rounded-xl border border-warm bg-surface shadow-sm col-span-2 md:col-span-1">
              <span className="text-[10px] text-warm-muted font-bold uppercase block mb-1">Avg Attendance</span>
              <span className="text-xl font-bold font-ui text-foreground">{avgAttendance} / Event</span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            
            {/* Custom chart: Registration Trends */}
            <div className="p-5 rounded-2xl border border-warm bg-surface shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-warm/60 pb-3">
                <div>
                  <h4 className="font-ui font-bold text-sm text-foreground flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-primary" /> Registration Analytics
                  </h4>
                  <p className="text-[10px] text-warm-muted">Seat fill-up percentage trends</p>
                </div>
                <span className="text-[9px] uppercase font-bold text-teal bg-teal/10 px-2 py-0.5 rounded border border-teal/15">Live</span>
              </div>

              <div className="space-y-4 pt-1">
                {events.slice(0, 4).map((e, idx) => {
                  const percent = Math.min(100, Math.round(((e.attendees || 0) / (e.max_attendees || 100)) * 100));
                  return (
                    <div key={e.id}>
                      <div className="flex justify-between text-xs mb-1 font-semibold">
                        <span className="truncate max-w-[200px]">{e.title}</span>
                        <span className="text-primary font-bold">{percent}% filled</span>
                      </div>
                      <div className="w-full h-3.5 bg-sand rounded-full overflow-hidden border border-warm/40">
                        <div className="h-full bg-primary transition-all duration-700" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
                {events.length === 0 && (
                  <p className="text-xs text-warm-muted italic text-center py-6">No event registration data found.</p>
                )}
              </div>
            </div>

            {/* Custom Chart: Monthly event category composition */}
            <div className="p-5 rounded-2xl border border-warm bg-surface shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-warm/60 pb-3">
                <div>
                  <h4 className="font-ui font-bold text-sm text-foreground flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-gold" /> Category Distribution
                  </h4>
                  <p className="text-[10px] text-warm-muted">Event distributions across categories</p>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                {EVENT_CATEGORIES.slice(0, 5).map(cat => {
                  const count = events.filter(e => e.category === cat || e.type === cat).length;
                  const ratio = events.length > 0 ? Math.round((count / events.length) * 100) : 0;
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-warm-muted w-24 truncate">{cat}</span>
                      <div className="flex-1 h-3 bg-sand rounded-full overflow-hidden">
                        <div className="h-full bg-gold transition-all duration-700" style={{ width: `${ratio}%` }} />
                      </div>
                      <span className="text-xs font-bold text-foreground w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ---------- MODAL 1: EVENT CREATE & EDIT ---------- */}
      <Modal open={open} onClose={() => setOpen(false)} title={editTarget ? "Edit Event" : "Create Event"} size="lg">
        <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
          
          <div className="grid sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-warm-muted uppercase tracking-wider block mb-1">Event Title *</label>
              <input placeholder="E.g. Annual Samaj Sneha Milan 2026" value={form.title} onChange={field("title")} className="w-full px-3.5 py-2 rounded-xl border border-warm bg-surface text-sm font-semibold" />
            </div>

            <div>
              <label className="text-[11px] font-bold text-warm-muted uppercase tracking-wider block mb-1">Category / Type</label>
              <select value={form.type} onChange={field("type")} className="w-full px-3.5 py-2.5 rounded-xl border border-warm bg-surface text-xs font-semibold outline-none">
                {EVENT_CATEGORIES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {form.type === "Other" && (
              <div>
                <label className="text-[11px] font-bold text-warm-muted uppercase tracking-wider block mb-1">Custom Category Name</label>
                <input placeholder="Enter category type" value={form.customType} onChange={field("customType")} className="w-full px-3.5 py-2.5 rounded-xl border border-warm bg-surface text-xs font-semibold" />
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-warm-muted uppercase tracking-wider block mb-1">Status</label>
              <select value={form.status} onChange={field("status")} className="w-full px-3.5 py-2.5 rounded-xl border border-warm bg-surface text-xs font-semibold outline-none">
                {EVENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-warm-muted uppercase tracking-wider block mb-1">Event Date *</label>
              <input type="date" value={form.date} onChange={field("date")} className="w-full px-3.5 py-2 rounded-xl border border-warm bg-surface text-sm font-semibold" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-warm-muted uppercase tracking-wider block mb-1">Start Time</label>
                <input type="time" value={form.start_time} onChange={field("start_time")} className="w-full px-2 py-2 rounded-lg border border-warm bg-surface text-xs" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-warm-muted uppercase tracking-wider block mb-1">End Time</label>
                <input type="time" value={form.end_time} onChange={field("end_time")} className="w-full px-2 py-2 rounded-lg border border-warm bg-surface text-xs" />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-warm-muted uppercase tracking-wider block mb-1">Max Seats Capacity</label>
              <input type="number" placeholder="E.g. 250" value={form.max_attendees} onChange={field("max_attendees")} className="w-full px-3.5 py-2 rounded-xl border border-warm bg-surface text-sm font-semibold" />
            </div>

            <div>
              <label className="text-[11px] font-bold text-warm-muted uppercase tracking-wider block mb-1">Organizer Name</label>
              <input placeholder="E.g. Surat Ahir Samaj Youth Club" value={form.organizer} onChange={field("organizer")} className="w-full px-3.5 py-2 rounded-xl border border-warm bg-surface text-sm font-semibold" />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-warm-muted uppercase tracking-wider block mb-1">Venue Address</label>
              <input placeholder="E.g. Community Hall, VIP Road, Surat" value={form.venue} onChange={field("venue")} className="w-full px-3.5 py-2 rounded-xl border border-warm bg-surface text-sm font-semibold" />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-warm-muted uppercase tracking-wider block mb-1">Venue Directions & Access Rules</label>
              <textarea rows={1} placeholder="Parking information, entry passes, dress code etc." value={form.venue_details} onChange={field("venue_details")} className="w-full px-3.5 py-2 rounded-xl border border-warm bg-surface text-xs resize-none" />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-warm-muted uppercase tracking-wider block mb-1">Cover Image</label>
              {(editTarget?.img || editTarget?.img_url || form.img) && !form.removeImg ? (
                <div className="relative rounded-lg overflow-hidden border border-warm h-36 mb-2 bg-sand/30 flex items-center justify-center group">
                  <img 
                    src={form.img ? URL.createObjectURL(form.img) : getImageUrl(editTarget?.img || editTarget?.img_url)} 
                    alt="Preview" 
                    className="h-full w-full object-cover" 
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setForm((f: any) => ({ ...f, img: null, removeImg: true }))}
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition flex items-center gap-1 shadow-md cursor-pointer"
                    >
                      <Trash className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-warm rounded-lg p-4 bg-sand/10 hover:bg-sand/20 transition flex flex-col items-center justify-center">
                  <Calendar className="w-8 h-8 text-warm-muted/50 mb-1" />
                  <span className="text-xs text-warm-muted mb-2">No image uploaded</span>
                  <label className="px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold cursor-pointer transition flex items-center gap-1 shadow-sm">
                    <Plus className="w-3.5 h-3.5" /> Upload Cover Photo
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setForm((f: any) => ({ ...f, img: file, removeImg: false }));
                      }} 
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-warm-muted uppercase tracking-wider block mb-1">About Event Description</label>
              <textarea rows={3} placeholder="Full event goals, special details..." value={form.desc} onChange={field("desc")} className="w-full px-3.5 py-2.5 rounded-xl border border-warm bg-surface text-sm resize-none" />
            </div>

            {/* SPEAKERS BUILDER */}
            <div className="sm:col-span-2 border-t border-warm pt-4">
              <label className="text-[11px] font-bold text-warm-muted uppercase tracking-wider block mb-2">Build Special Guests & Speakers List</label>
              
              {form.speakers.length > 0 && (
                <div className="space-y-2 mb-3">
                  {form.speakers.map((sp: any, idx: number) => (
                    <div key={idx} className="p-2.5 rounded-xl border border-warm/40 bg-sand/20 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-foreground">{sp.name}</span> - <span className="text-gold font-semibold">{sp.designation}</span>
                        <p className="text-[10px] text-warm-muted mt-0.5 line-clamp-1">{sp.bio}</p>
                      </div>
                      <button type="button" onClick={() => removeSpeakerFromForm(idx)} className="text-red-500 hover:text-red-700">
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid sm:grid-cols-3 gap-2 items-end bg-sand/10 p-3 rounded-xl border border-warm/40">
                <div>
                  <label className="text-[9px] font-bold text-warm-muted uppercase block mb-1">Speaker Name</label>
                  <input placeholder="Dr. R. K. Patel" value={newSpeakerName} onChange={e => setNewSpeakerName(e.target.value)} className="w-full px-2 py-1.5 rounded-lg border border-warm bg-surface text-xs" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-warm-muted uppercase block mb-1">Designation</label>
                  <input placeholder="E.g. Scholar" value={newSpeakerRole} onChange={e => setNewSpeakerRole(e.target.value)} className="w-full px-2 py-1.5 rounded-lg border border-warm bg-surface text-xs" />
                </div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="text-[9px] font-bold text-warm-muted uppercase block mb-1">Short Bio</label>
                    <input placeholder="Brief details..." value={newSpeakerBio} onChange={e => setNewSpeakerBio(e.target.value)} className="w-full px-2 py-1.5 rounded-lg border border-warm bg-surface text-xs" />
                  </div>
                  <button type="button" onClick={addSpeakerToForm} className="px-3 py-2 rounded-lg bg-teal text-white text-xs font-semibold hover:bg-teal-dark transition">
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* SCHEDULE TIMELINE BUILDER */}
            <div className="sm:col-span-2 border-t border-warm pt-4">
              <label className="text-[11px] font-bold text-warm-muted uppercase tracking-wider block mb-2">Build Schedule Timeline</label>
              
              {form.schedule.length > 0 && (
                <div className="space-y-2 mb-3">
                  {form.schedule.map((sch: any, idx: number) => (
                    <div key={idx} className="p-2 rounded-xl border border-warm/40 bg-sand/20 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-primary mr-2">{sch.time}</span>
                        <span className="text-foreground">{sch.activity}</span>
                      </div>
                      <button type="button" onClick={() => removeScheduleFromForm(idx)} className="text-red-500 hover:text-red-700">
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid sm:grid-cols-3 gap-2 items-end bg-sand/10 p-3 rounded-xl border border-warm/40">
                <div>
                  <label className="text-[9px] font-bold text-warm-muted uppercase block mb-1">Timeline Hour</label>
                  <input placeholder="E.g. 10:00 AM" value={newScheduleTime} onChange={e => setNewScheduleTime(e.target.value)} className="w-full px-2 py-1.5 rounded-lg border border-warm bg-surface text-xs" />
                </div>
                <div className="sm:col-span-2 flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="text-[9px] font-bold text-warm-muted uppercase block mb-1">Activity / Agenda</label>
                    <input placeholder="E.g. Opening Keynote Speech" value={newScheduleActivity} onChange={e => setNewScheduleActivity(e.target.value)} className="w-full px-2 py-1.5 rounded-lg border border-warm bg-surface text-xs" />
                  </div>
                  <button type="button" onClick={addScheduleToForm} className="px-3 py-2 rounded-lg bg-teal text-white text-xs font-semibold hover:bg-teal-dark transition">
                    Add
                  </button>
                </div>
              </div>
            </div>

          </div>

          <div className="sm:col-span-2 flex gap-2 pt-3 border-t border-warm mt-4">
            <button onClick={() => setOpen(false)} className="flex-1 py-2.5 rounded-xl border border-warm text-sm font-semibold hover:bg-sand transition text-warm-muted">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/95 transition disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editTarget ? "Save Event Changes" : "Publish Event"}
            </button>
          </div>

        </div>
      </Modal>

      {/* ---------- MODAL 2: REGISTERED MEMBERS ATTENDANCE ---------- */}
      <Modal 
        open={!!selectedEventRegs} 
        onClose={() => setSelectedEventRegs(null)} 
        title={`Attendee registrations: ${selectedEventRegs?.event?.title}`}
        size="lg"
      >
        {selectedEventRegs && (
          <div className="space-y-4 max-h-[85vh] overflow-y-auto pr-1">
            <div className="flex justify-between items-center bg-sand/35 p-3.5 rounded-xl border border-warm/40">
              <div className="text-xs text-warm-muted">
                Total bookings: <span className="font-bold text-foreground">{selectedEventRegs.regs.reduce((sum: number, r: any) => sum + r.attendees, 0)} attendees</span> across <span className="font-bold text-foreground">{selectedEventRegs.regs.length} registrations</span>.
              </div>
              <button 
                onClick={() => handleExportCSV(selectedEventRegs.event.title, selectedEventRegs.regs)} 
                className="px-3.5 py-2 rounded-xl border border-warm bg-surface hover:bg-sand/30 transition text-xs font-bold text-foreground flex items-center gap-1.5 shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4 text-green-600" /> Export Excel (CSV)
              </button>
            </div>

            <div className="overflow-x-auto border border-warm/60 rounded-xl bg-surface">
              <table className="w-full text-xs">
                <thead className="bg-sand text-left font-bold text-warm-muted uppercase tracking-wider border-b border-warm/80">
                  <tr>
                    <th className="p-3">Name</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Seats</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Attendance Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm">
                  {selectedEventRegs.regs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-warm-muted italic bg-sand/5">No member has registered yet.</td>
                    </tr>
                  ) : (
                    selectedEventRegs.regs.map((r: any) => (
                      <tr key={r.id} className="hover:bg-sand/20 transition-colors">
                        <td className="p-3 font-semibold text-foreground">
                          {r.name}
                          {r.family_members_attending && (
                            <span className="text-[10px] text-warm-muted block mt-0.5 font-normal">Family: {r.family_members_attending}</span>
                          )}
                          {r.special_notes && (
                            <span className="text-[9px] text-red-500 block mt-0.5 font-normal">⚠️ Notes: {r.special_notes}</span>
                          )}
                        </td>
                        <td className="p-3 text-warm-muted whitespace-nowrap">{r.phone}</td>
                        <td className="p-3 text-warm-muted">{r.email}</td>
                        <td className="p-3 font-bold text-foreground">{r.attendees}</td>
                        <td className="p-3 text-warm-muted whitespace-nowrap">
                          {new Date(r.registration_date).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.status === "Present" ? "bg-green-600 text-white" :
                            r.status === "Absent" ? "bg-red-500 text-white" : "bg-teal text-white"
                          }`}>
                            {r.status || "Registered"}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                          {perms.edit && (
                            <>
                              <button 
                                onClick={() => handleUpdateRegStatus(r.id, "Present")}
                                className="px-2 py-1 rounded bg-green-50 hover:bg-green-100 text-green-700 font-bold text-[10px] transition border border-green-200"
                              >
                                Present
                              </button>
                              <button 
                                onClick={() => handleUpdateRegStatus(r.id, "Absent")}
                                className="px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[10px] transition border border-red-200"
                              >
                                Absent
                              </button>
                            </>
                          )}
                          {perms.delete && (
                            <button 
                              onClick={() => handleDeleteReg(r.id, r.attendees)}
                              className="p-1 rounded bg-red-50 text-red-500 hover:bg-red-100 transition inline-flex items-center"
                              title="Remove registration"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setSelectedEventRegs(null)} 
                className="px-5 py-2.5 rounded-xl border border-warm text-xs font-bold text-warm-muted hover:bg-sand transition"
              >
                Close Manager
              </button>
            </div>
          </div>
        )}
      </Modal>

    </PageWrap>
  );
}
