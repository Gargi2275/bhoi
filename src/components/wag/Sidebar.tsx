"use client";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, type ComponentType } from "react";
import { ChevronLeft, LogOut, Menu, X, MapPin, Globe, Facebook, Twitter, Youtube, Phone, Mail, Building2, Users, Calendar, ExternalLink, Loader2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { AdBanner } from "@/components/wag/AdBanner";
import { api } from "@/lib/api";
import { toast } from "sonner";

export interface SidebarItem { to: string; label: string; icon: ComponentType<{ className?: string }>; badge?: number; search?: Record<string, string>; isSubItem?: boolean; locked?: boolean; }

export function DashboardSidebar({ items, title }: { items: SidebarItem[]; title: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const path = useRouterState({ select: s => s.location.pathname });
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleUpdate = () => {
      console.log("\n[COMPONENT REFRESHED]\nSidebar\n");
    };
    window.addEventListener("community-updated", handleUpdate);
    return () => window.removeEventListener("community-updated", handleUpdate);
  }, []);

  return (
    <>
    <CommunityDetailsPopup open={detailsOpen} onClose={() => setDetailsOpen(false)} user={user} />
    <motion.aside
      animate={{ width: collapsed ? 68 : 240 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
      className="sticky top-0 h-screen bg-surface border-r border-warm overflow-hidden flex-shrink-0 hidden md:flex flex-col"
    >
      <div className="p-3 flex items-center justify-between border-b border-warm/50">
        {!collapsed && <span className="text-xs uppercase tracking-wider font-semibold text-warm-muted px-2">{title}</span>}
        <button onClick={() => setCollapsed(v => !v)} className="w-8 h-8 rounded-lg hover:bg-sand flex items-center justify-center">
          <ChevronLeft className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>
      
      {/* Global Community Context Badge */}
      {!collapsed && (
        <button onClick={() => setDetailsOpen(true)} className="p-4 border-b border-warm/50 bg-surface-hover/30 hover:bg-sand/50 transition text-left w-full">
          <div className="flex items-center gap-3">
            {user?.communityLogo ? (
              <img src={user.communityLogo} alt="Community" className="w-10 h-10 rounded-xl object-cover shadow-sm border border-warm" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold shadow-sm">
                {user?.communityName ? user.communityName.charAt(0).toUpperCase() : "P"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-ui font-bold text-sm text-foreground truncate" title={user?.communityName || "Platform"}>
                {user?.communityName || "Platform"}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {user?.communityType && (
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${user.communityType.includes('Super') ? 'bg-orange-500' : 'bg-blue-500'}`} />
                )}
                <div className="text-[10px] text-warm-muted uppercase font-semibold tracking-wide truncate">
                  {user?.communityType || "Global"}
                </div>
              </div>
            </div>
          </div>
        </button>
      )}
      {collapsed && user?.communityLogo && (
        <button onClick={() => setDetailsOpen(true)} className="p-3 border-b border-warm/50 flex justify-center hover:bg-sand/50 w-full transition">
          <img src={user.communityLogo} alt="Community" className="w-8 h-8 rounded-lg object-cover" />
        </button>
      )}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {items.map(it => {
          const searchString = typeof window !== 'undefined' ? window.location.search : '';
          const active = path === it.to && (!it.search || Object.entries(it.search).every(([k, v]) => searchString.includes(`${k}=${v}`)));
          const Icon = it.icon;
          return (
            <Link 
              key={it.to + (it.search ? JSON.stringify(it.search) : '') + it.label} 
              to={it.locked ? (it.to.startsWith("/community-admin") ? "/community-admin/plan" : "/dashboard/subscription") : it.to} 
              search={it.search}
              onClick={(e) => {
                if (it.locked) {
                  e.preventDefault();
                  toast.error(`Upgrade required to unlock ${it.label}!`);
                  navigate({ to: it.to.startsWith("/community-admin") ? "/community-admin/plan" : "/dashboard/subscription" });
                }
              }}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition group",
                active ? "bg-primary/10 text-primary animate-pulse-subtle" : "text-foreground hover:bg-sand",
                it.locked && "text-warm-muted opacity-60 hover:bg-warm/5 cursor-pointer",
                collapsed && "justify-center",
                it.isSubItem && !collapsed && "pl-8 text-xs font-semibold text-warm-muted"
              )}
            >
              {active && <motion.span layoutId="sb-active" className="absolute left-0 top-1 bottom-1 w-1 rounded-r bg-primary" />}
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="truncate">{it.locked ? `🔒 ${it.label}` : it.label}</motion.span>}
              {it.locked && (
                <span className="ml-auto text-warm-muted/80" title="Upgrade Required">
                  <Lock className="w-3 h-3" />
                </span>
              )}
              {it.badge && it.badge > 0 ? (
                collapsed ? (
                  <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center border border-white">
                    {it.badge}
                  </span>
                ) : (
                  <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                    {it.badge}
                  </span>
                )
              ) : null}
            </Link>
          );
        })}
      </nav>
      
      {!collapsed && (
        <div className="px-3 my-2">
          <AdBanner slot="Sidebar Bottom" />
        </div>
      )}
      
      <div className="border-t border-warm mt-auto">

        {!collapsed && (
          <div className="p-3 border-b border-warm/30 bg-sand/30 flex items-center gap-3">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full object-cover border border-warm" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-foreground truncate">{user?.name}</div>
              <div className="text-[10px] text-warm-muted capitalize truncate">{user?.customRoleName ? `Role: ${user.customRoleName}` : user?.role?.replace('_', ' ')}</div>
              <div className="text-[10px] font-medium text-primary truncate mt-0.5">{user?.communityName || "Platform"}</div>
            </div>
          </div>
        )}
        <div className="p-2">
          <button
            onClick={logout}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition",
              collapsed && "justify-center"
            )}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="truncate">Logout</motion.span>}
          </button>
        </div>
      </div>
    </motion.aside>
    </>
  );
}

export function MobileBottomNav({ items }: { items: SidebarItem[] }) {
  const path = useRouterState({ select: s => s.location.pathname });
  const top = items.slice(0, 5);
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-surface/95 backdrop-blur border-t border-warm z-30 flex">
      {top.map(it => {
        const active = path === it.to;
        const Icon = it.icon;
        return (
          <Link key={it.to + it.label} to={it.to} className={cn("flex-1 flex flex-col items-center gap-1 py-2 text-[10px]", active ? "text-primary" : "text-warm-muted")}>
            <Icon className="w-5 h-5" /><span className="truncate max-w-full px-1">{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileHeader({ title, items }: { title: string, items?: SidebarItem[] }) {
  const [open, setOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { logout, user } = useAuth();
  const path = useRouterState({ select: s => s.location.pathname });
  const navigate = useNavigate();

  return (
    <>
      <CommunityDetailsPopup open={detailsOpen} onClose={() => setDetailsOpen(false)} user={user} />
      <header className="md:hidden sticky top-0 inset-x-0 h-14 bg-surface/95 backdrop-blur border-b border-warm z-20 flex items-center justify-between px-4 w-full">
        <div className="flex items-center gap-3">
          {items && (
            <button onClick={() => setOpen(true)} className="w-8 h-8 flex items-center justify-center text-foreground hover:bg-sand rounded-md">
              <Menu className="w-5 h-5" />
            </button>
          )}
          <span className="font-display font-bold text-primary text-sm">{title}</span>
        </div>
        <button
          onClick={logout}
          className="w-8 h-8 rounded-lg hover:bg-red-50 text-red-600 flex items-center justify-center transition"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* Attractive Mobile Sidebar Drawer */}
      {items && (
        <AnimatePresence>
          {open && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] md:hidden"
                onClick={() => setOpen(false)}
              />
              <motion.div
                initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} 
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed top-0 left-0 bottom-0 w-[80%] max-w-sm bg-surface z-[110] md:hidden flex flex-col shadow-2xl"
              >
                <div className="p-5 border-b border-warm/50 flex flex-col gap-4 bg-gradient-to-br from-primary/5 to-accent/5">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold text-foreground text-xl">Menu</span>
                    <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full hover:bg-white flex items-center justify-center transition shadow-sm bg-surface border border-warm">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Mobile Community Badge */}
                  <button onClick={() => setDetailsOpen(true)} className="flex items-center gap-3 bg-surface p-3 rounded-xl border border-warm/50 shadow-sm text-left hover:bg-sand/50 transition">
                    {user?.communityLogo ? (
                      <img src={user.communityLogo} alt="Community" className="w-10 h-10 rounded-lg object-cover border border-warm" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white font-bold">
                        {user?.communityName ? user.communityName.charAt(0).toUpperCase() : "P"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-ui font-bold text-sm text-foreground truncate">{user?.communityName || "Platform"}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {user?.communityType && (
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${user.communityType.includes('Super') ? 'bg-orange-500' : 'bg-blue-500'}`} />
                        )}
                        <div className="text-[10px] text-warm-muted uppercase tracking-wide truncate">{user?.communityType || "Global"}</div>
                      </div>
                    </div>
                  </button>
                </div>
                <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
                  {items.map(it => {
                    const active = path === it.to || (it.to !== "/dashboard" && it.to !== "/community-admin" && it.to !== "/admin" && path.startsWith(it.to));
                    const Icon = it.icon;
                    return (
                      <Link 
                        key={it.to + it.label} 
                        to={it.locked ? (it.to.startsWith("/community-admin") ? "/community-admin/plan" : "/dashboard/subscription") : it.to} 
                        search={it.search} 
                        onClick={(e) => {
                          setOpen(false);
                          if (it.locked) {
                            e.preventDefault();
                            toast.error(`Upgrade required to unlock ${it.label}!`);
                            navigate({ to: it.to.startsWith("/community-admin") ? "/community-admin/plan" : "/dashboard/subscription" });
                          }
                        }} 
                        className={cn(
                          "flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-semibold transition shadow-sm relative",
                          active ? "bg-primary text-white shadow-primary/20 scale-[1.02]" : "bg-white border border-warm text-foreground hover:bg-sand",
                          it.locked && "text-warm-muted opacity-60 hover:bg-warm/5 cursor-pointer"
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        {it.locked ? `🔒 ${it.label}` : it.label}
                        {it.locked && (
                          <span className="ml-auto text-warm-muted/80">
                            <Lock className="w-4 h-4" />
                          </span>
                        )}
                        {it.badge && it.badge > 0 && (
                          <span className={cn(
                            "ml-auto min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center",
                            active ? "bg-white text-primary" : "bg-primary text-white"
                          )}>
                            {it.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </nav>

              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}
    </>
  );
}

export function CommunityDetailsPopup({ open, onClose, user }: { open: boolean, onClose: () => void, user: any }) {
  const [community, setCommunity] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchCommunity = () => {
    if (user?.communityId) {
      setLoading(true);
      api.getCommunity(String(user.communityId))
        .then(data => setCommunity(data))
        .catch(() => setCommunity(null))
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    if (open) {
      fetchCommunity();
    } else {
      setCommunity(null);
    }
  }, [open, user?.communityId]);

  useEffect(() => {
    if (!open) return;
    const handleUpdate = () => {
      fetchCommunity();
    };
    window.addEventListener("community-updated", handleUpdate);
    return () => window.removeEventListener("community-updated", handleUpdate);
  }, [open, user?.communityId]);

  if (!open) return null;

  const logoSrc = community?.logo || community?.logo_url || null;
  const coverSrc = community?.cover || community?.cover_url || null;
  const isSuperComm = (community?.type || user?.communityType || '').toLowerCase().includes('super');
  const subsidiaryCount = community?.subsidiaries_count ?? 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.93, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.93, opacity: 0, y: 16 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
          className="bg-surface w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-warm/40 max-h-[90vh] flex flex-col"
        >
          {/* Cover Banner */}
          <div className="relative h-32 flex-shrink-0">
            {coverSrc ? (
              <img src={coverSrc} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${isSuperComm ? 'from-orange-500 via-primary to-gold' : 'from-blue-600 via-primary to-teal'}`} />
            )}
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <button
              onClick={onClose}
              className="absolute right-3 top-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition"
            >
              <X className="w-4 h-4" />
            </button>
            {/* Community type badge */}
            <div className="absolute bottom-3 right-3">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                isSuperComm
                  ? 'bg-orange-500/80 text-white border-orange-400/40'
                  : 'bg-blue-600/80 text-white border-blue-400/40'
              }`}>
                {isSuperComm ? '🟠 Super Community' : '🔵 Subsidiary'}
              </span>
            </div>
          </div>

          {/* Logo overlapping cover */}
          <div className="relative px-5 pb-0">
            <div className="-mt-10 mb-3 flex items-end gap-4">
              {logoSrc ? (
                <img src={logoSrc} alt="Logo" className="w-20 h-20 rounded-2xl object-cover shadow-xl border-4 border-surface flex-shrink-0" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-3xl font-bold shadow-xl border-4 border-surface flex-shrink-0">
                  {(community?.name || user?.communityName || 'P').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="pb-1 flex-1 min-w-0">
                <h3 className="font-ui font-bold text-lg text-foreground leading-tight truncate">
                  {community?.name || user?.communityName || 'Community'}
                </h3>
                {(community?.state || community?.district) && (
                  <div className="flex items-center gap-1 text-xs text-warm-muted mt-0.5">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{[community.village, community.district, community.state].filter(Boolean).join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto flex-1 px-5 pb-5 space-y-4">
            {loading && (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}

            {!loading && (
              <>
                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="bg-primary/5 rounded-xl p-3 text-center border border-primary/10">
                    <div className="text-lg font-bold font-display text-primary">{community?.member_count ?? '—'}</div>
                    <div className="text-[10px] text-warm-muted uppercase font-bold tracking-wide">Members</div>
                  </div>
                  <div className="bg-gold/5 rounded-xl p-3 text-center border border-gold/15">
                    <div className="text-lg font-bold font-display text-gold">{community?.events_count ?? '—'}</div>
                    <div className="text-[10px] text-warm-muted uppercase font-bold tracking-wide">Events</div>
                  </div>
                  <div className="bg-teal/5 rounded-xl p-3 text-center border border-teal/15">
                    <div className="text-lg font-bold font-display text-teal">
                      {isSuperComm ? subsidiaryCount : (community?.est_year ?? '—')}
                    </div>
                    <div className="text-[10px] text-warm-muted uppercase font-bold tracking-wide">
                      {isSuperComm ? 'Subsidiaries' : 'Est. Year'}
                    </div>
                  </div>
                </div>

                {/* Description */}
                {community?.desc && (
                  <div className="bg-sand/30 p-3 rounded-xl border border-warm/30 text-sm text-warm-muted leading-relaxed">
                    {community.desc}
                  </div>
                )}

                {/* Parent Community (if subsidiary) */}
                {!isSuperComm && (community?.parent_name || user?.parentCommunityName) && (
                  <div className="flex items-center gap-3 bg-orange-50 p-3 rounded-xl border border-orange-100">
                    <Building2 className="w-4 h-4 text-orange-500 flex-shrink-0" />
                    <div>
                      <div className="text-[10px] uppercase font-bold text-orange-600/70 tracking-wider">Parent Community</div>
                      <div className="font-semibold text-sm text-foreground">{community?.parent_name || user?.parentCommunityName}</div>
                    </div>
                  </div>
                )}

                {/* Admin Info */}
                {(community?.admin_name || community?.admin_email) && (
                  <div className="border-t border-warm/30 pt-3 space-y-2">
                    <div className="text-[10px] uppercase font-bold text-warm-muted tracking-wider">Community Admin</div>
                    <div className="flex items-center gap-3 bg-sand/20 p-3 rounded-xl">
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {community.admin_name ? community.admin_name.charAt(0).toUpperCase() : 'A'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-foreground truncate">{community.admin_name}</div>
                        {community.admin_email && (
                          <div className="text-xs text-warm-muted truncate flex items-center gap-1">
                            <Mail className="w-3 h-3" />{community.admin_email}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Contact & Location Details */}
                {(community?.phone || community?.email || community?.office_address) && (
                  <div className="border-t border-warm/30 pt-3 space-y-2">
                    <div className="text-[10px] uppercase font-bold text-warm-muted tracking-wider">Contact Info</div>
                    {community.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-warm-muted flex-shrink-0" />
                        <span className="text-foreground">{community.phone}</span>
                      </div>
                    )}
                    {community.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-warm-muted flex-shrink-0" />
                        <span className="text-foreground truncate">{community.email}</span>
                      </div>
                    )}
                    {community.office_address && (
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-warm-muted flex-shrink-0 mt-0.5" />
                        <span className="text-foreground text-xs leading-relaxed">{community.office_address}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Website & Social */}
                {(community?.website || community?.social_fb || community?.social_tw || community?.social_yt) && (
                  <div className="border-t border-warm/30 pt-3 space-y-2">
                    <div className="text-[10px] uppercase font-bold text-warm-muted tracking-wider">Online Presence</div>
                    <div className="flex flex-wrap gap-2">
                      {community.website && (
                        <a href={community.website} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/15 text-primary text-xs font-semibold hover:bg-primary/10 transition">
                          <Globe className="w-3.5 h-3.5" /> Website
                        </a>
                      )}
                      {community.social_fb && (
                        <a href={community.social_fb} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 text-xs font-semibold hover:bg-blue-100 transition">
                          <Facebook className="w-3.5 h-3.5" /> Facebook
                        </a>
                      )}
                      {community.social_tw && (
                        <a href={community.social_tw} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 border border-sky-100 text-sky-600 text-xs font-semibold hover:bg-sky-100 transition">
                          <Twitter className="w-3.5 h-3.5" /> Twitter
                        </a>
                      )}
                      {community.social_yt && (
                        <a href={community.social_yt} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs font-semibold hover:bg-red-100 transition">
                          <Youtube className="w-3.5 h-3.5" /> YouTube
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Registration Info */}
                {(community?.registration_no || community?.caste) && (
                  <div className="border-t border-warm/30 pt-3 space-y-2">
                    <div className="text-[10px] uppercase font-bold text-warm-muted tracking-wider">Registration</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {community.registration_no && (
                        <div className="bg-sand/30 px-3 py-2 rounded-lg border border-warm/30">
                          <div className="text-warm-muted">Reg. No.</div>
                          <div className="font-semibold text-foreground truncate">{community.registration_no}</div>
                        </div>
                      )}
                      {community.caste && (
                        <div className="bg-sand/30 px-3 py-2 rounded-lg border border-warm/30">
                          <div className="text-warm-muted">Caste</div>
                          <div className="font-semibold text-foreground truncate">{community.caste}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <button onClick={onClose} className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-md hover:shadow-lg transition hover:-translate-y-0.5 mt-2">
                  Close
                </button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
