import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, type ReactNode } from "react";
import { PageWrap } from "@/components/wag/PageWrap";
import { AnimatedCard } from "@/components/wag/primitives";
import { 
  Settings, Globe, CreditCard, Mail, Bell, Shield, Palette, Database, Check, 
  Cpu, RefreshCw, PlusCircle, Copy, Archive, Power, ChevronUp, ChevronDown, 
  Trash2, Edit, Search, Filter, AlertTriangle, Sparkles
} from "lucide-react";
import { api } from "@/lib/api";

type Tab = "general" | "payments" | "email" | "notifications" | "security" | "branding" | "backups" | "modules";

function Section({ icon, title, desc, children }: { icon: ReactNode; title: string; desc?: string; children: ReactNode }) {
  return (
    <AnimatedCard className="p-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">{icon}</div>
        <div>
          <h3 className="font-ui font-semibold text-foreground">{title}</h3>
          {desc && <p className="text-xs text-warm-muted mt-0.5">{desc}</p>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </AnimatedCard>
  );
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-warm-muted uppercase tracking-wide">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="text-[11px] text-warm-muted mt-1">{hint}</p>}
    </label>
  );
}

function Toggle({ on, onChange, label, desc }: { on: boolean; onChange: () => void; label: string; desc?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        {desc && <div className="text-xs text-warm-muted">{desc}</div>}
      </div>
      <button onClick={onChange} className={`w-11 h-6 rounded-full p-0.5 transition ${on ? "bg-primary" : "bg-warm"}`}>
        <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}

function Body() {
  const [tab, setTab] = useState<Tab>("general");
  const [toggles, setToggles] = useState({ regOpen: true, otp: true, email: true, sms: false, push: true, twoFA: true, audit: true, autoBackup: true });
  const T = (k: keyof typeof toggles) => setToggles(p => ({ ...p, [k]: !p[k] }));

  // Modules tab states
  const [modules, setModules] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingModule, setEditingModule] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [formState, setFormState] = useState({
    module_code: "",
    display_name: "",
    category: "Custom",
    icon: "Box",
    route: "",
    sort_order: 1,
    is_sidebar_module: true,
    is_active: true,
    supports_subscription: false,
    supports_permissions: false,
    supports_usage_counter: false,
    supports_analytics: false,
  });

  const loadModules = async () => {
    setLoading(true);
    try {
      const data = await api.getModules();
      setModules(data || []);
    } catch (e) {
      console.error("Failed to load modules", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "modules") {
      loadModules();
    }
  }, [tab]);

  const handleScan = async () => {
    setLoading(true);
    try {
      const res = await api.scanModules();
      alert(`Discovery scan complete! Created ${res.created_modules} new layout modules.`);
      loadModules();
    } catch (e) {
      alert("Failed to run scan: " + e);
    } finally {
      setLoading(false);
    }
  };

  const handleClone = async (id: number) => {
    try {
      await api.cloneModule(id);
      loadModules();
    } catch (e) {
      alert("Failed to clone module: " + e);
    }
  };

  const handleArchive = async (id: number) => {
    if (!confirm("Are you sure you want to deactivate and archive this module?")) return;
    try {
      await api.archiveModule(id);
      loadModules();
    } catch (e) {
      alert("Failed to archive: " + e);
    }
  };

  const handleToggleActive = async (mod: any) => {
    try {
      if (mod.is_active) {
        await api.deactivateModule(mod.id);
      } else {
        await api.activateModule(mod.id);
      }
      loadModules();
    } catch (e) {
      alert("Failed to toggle module status: " + e);
    }
  };

  const handleMoveSort = async (mod: any, direction: 'up' | 'down') => {
    const sorted = [...modules].sort((a, b) => a.sort_order - b.sort_order);
    const index = sorted.findIndex(m => m.id === mod.id);
    if (direction === 'up' && index > 0) {
      const prev = sorted[index - 1];
      const updates = [
        { id: mod.id, sort_order: prev.sort_order },
        { id: prev.id, sort_order: mod.sort_order }
      ];
      try {
        await api.bulkUpdateModules(updates);
        loadModules();
      } catch (e) {
        alert("Failed to update sort order: " + e);
      }
    } else if (direction === 'down' && index < sorted.length - 1) {
      const next = sorted[index + 1];
      const updates = [
        { id: mod.id, sort_order: next.sort_order },
        { id: next.id, sort_order: mod.sort_order }
      ];
      try {
        await api.bulkUpdateModules(updates);
        loadModules();
      } catch (e) {
        alert("Failed to update sort order: " + e);
      }
    }
  };

  const handleBulkActivate = async () => {
    if (selectedIds.length === 0) return;
    try {
      await api.bulkActivateModules(selectedIds);
      setSelectedIds([]);
      loadModules();
    } catch (e) {
      alert("Failed to bulk activate: " + e);
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedIds.length === 0) return;
    try {
      await api.bulkDeactivateModules(selectedIds);
      setSelectedIds([]);
      loadModules();
    } catch (e) {
      alert("Failed to bulk deactivate: " + e);
    }
  };

  const openCreate = () => {
    const maxSort = modules.length > 0 ? Math.max(...modules.map(m => m.sort_order || 0)) : 0;
    setFormState({
      module_code: "",
      display_name: "",
      category: "Custom",
      icon: "Box",
      route: "",
      sort_order: maxSort + 1,
      is_sidebar_module: true,
      is_active: true,
      supports_subscription: false,
      supports_permissions: false,
      supports_usage_counter: false,
      supports_analytics: false,
    });
    setEditingModule(null);
    setIsFormOpen(true);
  };

  const openEdit = (mod: any) => {
    setFormState({
      module_code: mod.module_code,
      display_name: mod.display_name,
      category: mod.category || "Custom",
      icon: mod.icon || "Box",
      route: mod.route || "",
      sort_order: mod.sort_order || 1,
      is_sidebar_module: !!mod.is_sidebar_module,
      is_active: !!mod.is_active,
      supports_subscription: !!mod.supports_subscription,
      supports_permissions: !!mod.supports_permissions,
      supports_usage_counter: !!mod.supports_usage_counter,
      supports_analytics: !!mod.supports_analytics,
    });
    setEditingModule(mod);
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingModule) {
        await api.updateModule(editingModule.id, formState);
      } else {
        await api.createModule(formState);
      }
      setIsFormOpen(false);
      setEditingModule(null);
      loadModules();
    } catch (e: any) {
      alert("Failed to save module: " + (e.message || e));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const categories = Array.from(new Set(modules.map(m => m.category || "Custom")));

  const filteredModules = modules.filter(m => {
    const matchesSearch = m.display_name.toLowerCase().includes(search.toLowerCase()) || 
                          m.module_code.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === "all" || m.category === categoryFilter;
    return matchesSearch && matchesCat;
  }).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const TABS: { id: Tab; label: string; icon: typeof Settings }[] = [
    { id: "general", label: "General", icon: Globe },
    { id: "payments", label: "Payments", icon: CreditCard },
    { id: "email", label: "Email & SMS", icon: Mail },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Shield },
    { id: "branding", label: "Branding", icon: Palette },
    { id: "backups", label: "Backups", icon: Database },
    { id: "modules", label: "Modules Registry", icon: Cpu },
  ];

  return (
    <PageWrap title="Platform Settings" desc="Configure global platform behaviour, integrations, security, and registry modules" action={
      tab !== "modules" ? (
        <button onClick={() => alert("Platform settings saved successfully!")} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold shadow-sm hover:bg-primary/95 transition"><Check className="w-4 h-4" /> Save changes</button>
      ) : null
    }>
      <div className="grid lg:grid-cols-[220px_1fr] gap-5">
        <nav className="space-y-1 lg:sticky lg:top-20 lg:self-start">
          {TABS.map(t => {
            const I = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${tab === t.id ? "bg-primary/10 text-primary" : "text-foreground hover:bg-sand"}`}>
                <I className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </nav>

        <div className="space-y-5">
          {tab === "general" && (
            <Section icon={<Globe className="w-5 h-5" />} title="General" desc="Platform-wide identity and locale">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Platform name"><input defaultValue="WE ARE UNITED" className="w-full px-3 py-2 rounded-lg border border-warm bg-surface text-sm text-foreground" /></Field>
                <Field label="Tagline"><input defaultValue="Aapni Samaj, Aapnu Network" className="w-full px-3 py-2 rounded-lg border border-warm bg-surface text-sm text-foreground" /></Field>
                <Field label="Support email"><input defaultValue="support@weareunited.in" className="w-full px-3 py-2 rounded-lg border border-warm bg-surface text-sm text-foreground" /></Field>
                <Field label="Timezone"><select defaultValue="IST" className="w-full px-3 py-2 rounded-lg border border-warm bg-surface text-sm text-foreground"><option>IST (UTC+5:30)</option><option>UTC</option><option>EST</option></select></Field>
                <Field label="Default language"><select defaultValue="en" className="w-full px-3 py-2 rounded-lg border border-warm bg-surface text-sm text-foreground"><option value="en">English</option><option value="hi">हिन्दी</option><option value="gu">ગુજરાતી</option></select></Field>
                <Field label="Currency"><select defaultValue="INR" className="w-full px-3 py-2 rounded-lg border border-warm bg-surface text-sm text-foreground"><option>INR (₹)</option><option>USD ($)</option></select></Field>
              </div>
              <div className="pt-2 border-t border-warm">
                <Toggle on={toggles.regOpen} onChange={() => T("regOpen")} label="Open registration" desc="Allow new members to register without invite" />
              </div>
            </Section>
          )}

          {tab === "payments" && (
            <Section icon={<CreditCard className="w-5 h-5" />} title="Payment gateways" desc="Connect providers for subscriptions and donations">
              {[{ name: "Razorpay", status: "Connected" }, { name: "Stripe", status: "Disconnected" }, { name: "PayU", status: "Connected" }, { name: "Cashfree", status: "Disconnected" }].map(g => (
                <div key={g.name} className="flex items-center justify-between p-3 rounded-lg border border-warm">
                  <div><div className="font-semibold text-sm text-foreground">{g.name}</div><div className="text-xs text-warm-muted">{g.status}</div></div>
                  <button className={`px-3 py-1.5 rounded-lg text-xs font-medium ${g.status === "Connected" ? "border border-warm hover:bg-sand" : "bg-primary text-white"}`}>{g.status === "Connected" ? "Manage" : "Connect"}</button>
                </div>
              ))}
              <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-warm">
                <Field label="Platform fee (%)" hint="Charged on each donation"><input defaultValue="2.5" type="number" className="w-full px-3 py-2 rounded-lg border border-warm bg-surface text-sm text-foreground" /></Field>
                <Field label="Tax (GST %)"><input defaultValue="18" type="number" className="w-full px-3 py-2 rounded-lg border border-warm bg-surface text-sm text-foreground" /></Field>
              </div>
            </Section>
          )}

          {tab === "email" && (
            <Section icon={<Mail className="w-5 h-5" />} title="Email & SMS providers">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="SMTP host"><input defaultValue="smtp.sendgrid.net" className="w-full px-3 py-2 rounded-lg border border-warm bg-surface text-sm text-foreground" /></Field>
                <Field label="SMTP port"><input defaultValue="587" className="w-full px-3 py-2 rounded-lg border border-warm bg-surface text-sm text-foreground" /></Field>
                <Field label="From name"><input defaultValue="WE ARE UNITED" className="w-full px-3 py-2 rounded-lg border border-warm bg-surface text-sm text-foreground" /></Field>
                <Field label="From email"><input defaultValue="no-reply@weareunited.in" className="w-full px-3 py-2 rounded-lg border border-warm bg-surface text-sm text-foreground" /></Field>
                <Field label="SMS provider"><select className="w-full px-3 py-2 rounded-lg border border-warm bg-surface text-sm text-foreground"><option>MSG91</option><option>Twilio</option><option>Gupshup</option></select></Field>
                <Field label="Sender ID"><input defaultValue="WEAREUNITED" className="w-full px-3 py-2 rounded-lg border border-warm bg-surface text-sm text-foreground" /></Field>
              </div>
            </Section>
          )}

          {tab === "notifications" && (
            <Section icon={<Bell className="w-5 h-5" />} title="Notification channels">
              <Toggle on={toggles.email} onChange={() => T("email")} label="Email notifications" desc="Transactional and digest emails" />
              <Toggle on={toggles.sms} onChange={() => T("sms")} label="SMS notifications" desc="OTP and critical alerts" />
              <Toggle on={toggles.push} onChange={() => T("push")} label="Web push" desc="Browser and PWA notifications" />
              <Toggle on={toggles.otp} onChange={() => T("otp")} label="OTP on login" desc="Send OTP for every login attempt" />
            </Section>
          )}

          {tab === "security" && (
            <Section icon={<Shield className="w-5 h-5" />} title="Security">
              <Toggle on={toggles.twoFA} onChange={() => T("twoFA")} label="Require 2FA for admins" desc="All Super Admin and Platform Manager accounts" />
              <Toggle on={toggles.audit} onChange={() => T("audit")} label="Audit logging" desc="Record every admin action with IP and timestamp" />
              <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-warm">
                <Field label="Session timeout (mins)"><input defaultValue="60" type="number" className="w-full px-3 py-2 rounded-lg border border-warm bg-surface text-sm text-foreground" /></Field>
                <Field label="Max login attempts"><input defaultValue="5" type="number" className="w-full px-3 py-2 rounded-lg border border-warm bg-surface text-sm text-foreground" /></Field>
                <Field label="Password min length"><input defaultValue="10" type="number" className="w-full px-3 py-2 rounded-lg border border-warm bg-surface text-sm text-foreground" /></Field>
                <Field label="IP allowlist"><input placeholder="e.g. 203.0.113.0/24" className="w-full px-3 py-2 rounded-lg border border-warm bg-surface text-sm text-foreground" /></Field>
              </div>
            </Section>
          )}

          {tab === "branding" && (
            <Section icon={<Palette className="w-5 h-5" />} title="Branding">
              <div className="grid sm:grid-cols-3 gap-4">
                <Field label="Primary"><div className="flex items-center gap-2"><span className="w-9 h-9 rounded-lg bg-primary border border-warm" /><input defaultValue="#E07B2D" className="flex-1 px-3 py-2 rounded-lg border border-warm bg-surface text-sm font-mono text-foreground" /></div></Field>
                <Field label="Accent gold"><div className="flex items-center gap-2"><span className="w-9 h-9 rounded-lg bg-gold border border-warm" /><input defaultValue="#C9860A" className="flex-1 px-3 py-2 rounded-lg border border-warm bg-surface text-sm font-mono text-foreground" /></div></Field>
                <Field label="Surface"><div className="flex items-center gap-2"><span className="w-9 h-9 rounded-lg bg-surface border border-warm" /><input defaultValue="#FFFDF7" className="flex-1 px-3 py-2 rounded-lg border border-warm bg-surface text-sm font-mono text-foreground" /></div></Field>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-warm">
                <Field label="Logo (light)"><div className="border-2 border-dashed border-warm rounded-lg p-6 text-center text-xs text-warm-muted hover:bg-sand cursor-pointer">Drop SVG / PNG here</div></Field>
                <Field label="Favicon"><div className="border-2 border-dashed border-warm rounded-lg p-6 text-center text-xs text-warm-muted hover:bg-sand cursor-pointer">32×32 PNG / ICO</div></Field>
              </div>
            </Section>
          )}

          {tab === "backups" && (
            <Section icon={<Database className="w-5 h-5" />} title="Backups & data">
              <Toggle on={toggles.autoBackup} onChange={() => T("autoBackup")} label="Automatic daily backups" desc="Stored encrypted in S3-compatible storage" />
              <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-warm">
                <Field label="Retention (days)"><input defaultValue="90" type="number" className="w-full px-3 py-2 rounded-lg border border-warm bg-surface text-sm text-foreground" /></Field>
                <Field label="Last backup"><input defaultValue="2026-06-03 04:00 IST" readOnly className="w-full px-3 py-2 rounded-lg border border-warm bg-sand text-sm text-foreground" /></Field>
              </div>
              <div className="flex gap-2 pt-2"><button className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium">Run backup now</button><button className="px-4 py-2 rounded-lg border border-warm text-sm text-foreground">Restore from backup</button></div>
            </Section>
          )}

          {tab === "modules" && (
            <div className="space-y-6">
              {/* Header section with search, category filtering & scan/create actions */}
              <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-surface p-4 rounded-xl border border-warm shadow-sm">
                <div className="flex flex-1 w-full gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-warm-muted" />
                    <input 
                      type="text" 
                      placeholder="Search modules..." 
                      value={search} 
                      onChange={e => setSearch(e.target.value)} 
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-warm bg-surface text-sm text-foreground placeholder-warm-muted focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <select 
                    value={categoryFilter} 
                    onChange={e => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-warm bg-surface text-sm text-foreground focus:outline-none"
                  >
                    <option value="all">All Categories</option>
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="flex w-full md:w-auto gap-2">
                  <button 
                    onClick={handleScan}
                    disabled={loading}
                    className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-warm text-sm font-semibold hover:bg-sand transition text-foreground"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Scan Layouts
                  </button>
                  <button 
                    onClick={openCreate}
                    className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/95 transition shadow-sm"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Add Module
                  </button>
                </div>
              </div>

              {/* Bulk Actions Panel */}
              {selectedIds.length > 0 && (
                <div className="flex items-center justify-between bg-primary/10 border border-primary/20 p-3 rounded-lg animate-in fade-in slide-in-from-top-2 duration-200">
                  <span className="text-xs font-semibold text-primary">{selectedIds.length} modules selected</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleBulkActivate}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-sand border border-warm text-xs font-semibold text-foreground rounded shadow-sm"
                    >
                      <Power className="w-3.5 h-3.5 text-emerald-500" />
                      Bulk Activate
                    </button>
                    <button 
                      onClick={handleBulkDeactivate}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-sand border border-warm text-xs font-semibold text-foreground rounded shadow-sm"
                    >
                      <Power className="w-3.5 h-3.5 text-red-500" />
                      Bulk Deactivate
                    </button>
                  </div>
                </div>
              )}

              {/* Modules Table List */}
              <AnimatedCard className="overflow-hidden border border-warm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-sand/30 border-b border-warm text-warm-muted uppercase tracking-wider font-semibold">
                        <th className="p-3 w-10">
                          <input 
                            type="checkbox"
                            checked={filteredModules.length > 0 && selectedIds.length === filteredModules.length}
                            onChange={() => {
                              if (selectedIds.length === filteredModules.length) {
                                setSelectedIds([]);
                              } else {
                                setSelectedIds(filteredModules.map(m => m.id));
                              }
                            }}
                            className="rounded border-warm text-primary focus:ring-primary"
                          />
                        </th>
                        <th className="p-3">Module Code</th>
                        <th className="p-3">Display Name</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Route</th>
                        <th className="p-3 text-center">Sort</th>
                        <th className="p-3">Capabilities</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-warm">
                      {filteredModules.map(m => (
                        <tr key={m.id} className="hover:bg-sand/20 transition-colors">
                          <td className="p-3">
                            <input 
                              type="checkbox"
                              checked={selectedIds.includes(m.id)}
                              onChange={() => toggleSelect(m.id)}
                              className="rounded border-warm text-primary focus:ring-primary"
                            />
                          </td>
                          <td className="p-3 font-mono font-bold text-foreground flex items-center gap-1.5">
                            {m.module_code}
                            {m.is_system && <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-bold">SYS</span>}
                            {!m.is_active && <span className="px-1.5 py-0.5 rounded bg-warm text-warm-muted text-[9px] font-bold">INACTIVE</span>}
                          </td>
                          <td className="p-3 text-foreground font-semibold">{m.display_name}</td>
                          <td className="p-3 text-warm-muted font-medium">{m.category}</td>
                          <td className="p-3 font-mono text-warm-muted">{m.route}</td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => handleMoveSort(m, 'up')} className="p-1 rounded hover:bg-sand text-warm-muted hover:text-foreground">
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <span className="font-semibold w-5 text-center">{m.sort_order}</span>
                              <button onClick={() => handleMoveSort(m, 'down')} className="p-1 rounded hover:bg-sand text-warm-muted hover:text-foreground">
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              {m.supports_subscription && <span className="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 text-[9px] font-semibold">Subs</span>}
                              {m.supports_permissions && <span className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-semibold">Perm</span>}
                              {m.supports_usage_counter && <span className="px-1.5 py-0.5 rounded bg-purple-50 border border-purple-200 text-purple-700 text-[9px] font-semibold">Usage</span>}
                              {m.supports_analytics && <span className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-[9px] font-semibold">Analytic</span>}
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <div className="inline-flex gap-1">
                              <button 
                                onClick={() => openEdit(m)}
                                className="p-1.5 rounded hover:bg-primary/10 text-warm-muted hover:text-primary transition"
                                title="Edit Module"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleClone(m.id)}
                                className="p-1.5 rounded hover:bg-blue-50 text-warm-muted hover:text-blue-600 transition"
                                title="Clone Module"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleToggleActive(m)}
                                className={`p-1.5 rounded transition ${m.is_active ? 'hover:bg-amber-50 text-warm-muted hover:text-amber-600' : 'hover:bg-emerald-50 text-warm-muted hover:text-emerald-600'}`}
                                title={m.is_active ? "Deactivate" : "Activate"}
                              >
                                <Power className="w-4 h-4" />
                              </button>
                              {!m.is_system && (
                                <button 
                                  onClick={() => handleArchive(m.id)}
                                  className="p-1.5 rounded hover:bg-red-50 text-warm-muted hover:text-red-600 transition"
                                  title="Archive/Deactivate"
                                >
                                  <Archive className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredModules.length === 0 && (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-warm-muted text-sm">
                            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2 animate-bounce" />
                            No modules found matching filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </AnimatedCard>

              {/* Form Modal/Section for Add/Edit */}
              {isFormOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
                  <div className="bg-surface border border-warm rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                    <form onSubmit={handleSave} className="p-6 space-y-4">
                      <div className="flex items-center justify-between border-b border-warm pb-3">
                        <h4 className="font-ui font-semibold text-base text-foreground">
                          {editingModule ? `Edit Module: ${editingModule.display_name}` : "Create Custom Layout Module"}
                        </h4>
                        <button 
                          type="button" 
                          onClick={() => setIsFormOpen(false)}
                          className="text-warm-muted hover:text-foreground text-sm font-semibold"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="Module Code">
                          <input 
                            type="text"
                            required
                            disabled={!!editingModule}
                            value={formState.module_code}
                            onChange={e => setFormState(prev => ({ ...prev, module_code: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-warm bg-surface text-sm text-foreground disabled:bg-sand/30 disabled:text-warm-muted"
                            placeholder="e.g. hrms"
                          />
                        </Field>

                        <Field label="Display Name">
                          <input 
                            type="text"
                            required
                            value={formState.display_name}
                            onChange={e => setFormState(prev => ({ ...prev, display_name: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-warm bg-surface text-sm text-foreground"
                            placeholder="e.g. HRMS Portal"
                          />
                        </Field>

                        <Field label="Category">
                          <input 
                            type="text"
                            required
                            value={formState.category}
                            onChange={e => setFormState(prev => ({ ...prev, category: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-warm bg-surface text-sm text-foreground"
                            placeholder="e.g. Custom, Community, Finance"
                          />
                        </Field>

                        <Field label="Icon Class (Lucide)">
                          <input 
                            type="text"
                            required
                            value={formState.icon}
                            onChange={e => setFormState(prev => ({ ...prev, icon: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-warm bg-surface text-sm text-foreground"
                            placeholder="e.g. Users, Calendar, Box"
                          />
                        </Field>

                        <Field label="Route Path">
                          <input 
                            type="text"
                            required
                            value={formState.route}
                            onChange={e => setFormState(prev => ({ ...prev, route: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-warm bg-surface text-sm text-foreground"
                            placeholder="e.g. /dashboard/hrms"
                          />
                        </Field>

                        <Field label="Sort Order">
                          <input 
                            type="number"
                            required
                            value={formState.sort_order}
                            onChange={e => setFormState(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                            className="w-full px-3 py-2 rounded-lg border border-warm bg-surface text-sm text-foreground"
                            placeholder="1"
                          />
                        </Field>
                      </div>

                      <div className="pt-2 border-t border-warm space-y-2">
                        <span className="text-xs font-semibold text-warm-muted uppercase tracking-wide">Configuration & Toggles</span>
                        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
                          <Toggle 
                            on={formState.is_sidebar_module}
                            onChange={() => setFormState(prev => ({ ...prev, is_sidebar_module: !prev.is_sidebar_module }))}
                            label="Show in Sidebar"
                          />
                          <Toggle 
                            on={formState.is_active}
                            onChange={() => setFormState(prev => ({ ...prev, is_active: !prev.is_active }))}
                            label="Module Active"
                          />
                          <Toggle 
                            on={formState.supports_subscription}
                            onChange={() => setFormState(prev => ({ ...prev, supports_subscription: !prev.supports_subscription }))}
                            label="Subscription Support"
                            desc="Scan for plan builders"
                          />
                          <Toggle 
                            on={formState.supports_permissions}
                            onChange={() => setFormState(prev => ({ ...prev, supports_permissions: !prev.supports_permissions }))}
                            label="Permissions Support"
                            desc="Scan for RBAC/Roles matrix"
                          />
                          <Toggle 
                            on={formState.supports_usage_counter}
                            onChange={() => setFormState(prev => ({ ...prev, supports_usage_counter: !prev.supports_usage_counter }))}
                            label="Usage Counter Support"
                            desc="Expose to rate-limits engine"
                          />
                          <Toggle 
                            on={formState.supports_analytics}
                            onChange={() => setFormState(prev => ({ ...prev, supports_analytics: !prev.supports_analytics }))}
                            label="Analytics Support"
                            desc="Expose to reports dashboard"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end pt-3 border-t border-warm">
                        <button 
                          type="button"
                          onClick={() => setIsFormOpen(false)}
                          className="px-4 py-2 border border-warm rounded-lg text-sm text-foreground hover:bg-sand"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit"
                          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/95 shadow-sm"
                        >
                          Save Module
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PageWrap>
  );
}

export const Route = createFileRoute("/admin/settings")({ component: Body });
