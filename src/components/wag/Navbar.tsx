"use client";
import { Link, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Search, Bell, Menu, X, ChevronDown, LogOut, User, LayoutDashboard, Settings as SettingsIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { AvatarCircle, PlanBadge } from "./primitives";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/communities", label: "Communities" },
  { to: "/directory", label: "Directory" },
  { to: "/events", label: "Events" },
  { to: "/jobs", label: "Jobs" },
  { to: "/matrimony", label: "Matrimony" },
];

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <svg width="36" height="36" viewBox="0 0 40 40" className="drop-shadow-sm">
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.46 0.21 265)" />
            <stop offset="100%" stopColor="oklch(0.38 0.21 265)" />
          </linearGradient>
        </defs>
        <path d="M20 3 L34 9 V21 C34 29 27 35 20 37 C13 35 6 29 6 21 V9 Z" fill="url(#lg)" />
        <path d="M14 19 L18 23 L26 14" fill="none" stroke="oklch(0.96 0.05 85)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="leading-tight">
        <div className="font-ui font-bold text-base">WE ARE UNITED</div>
        <div className="text-[10px] text-warm-muted -mt-0.5">Aapni Samaj, Aapnu Network</div>
      </div>
    </Link>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const path = useRouterState({ select: s => s.location.pathname });
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState(false);
  const [lang, setLang] = useState<"EN" | "GU" | "HI">("EN");
  const [drop, setDrop] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifDrop, setNotifDrop] = useState(false);

  const fetchNotifications = () => {
    if (!user) return;
    api.getNotifications()
      .then(res => {
        setNotifications(res || []);
        const unread = (res || []).filter((n: any) => !n.read && !n.is_read).length;
        setUnreadCount(unread);
      })
      .catch(err => console.error("Failed to load notifications", err));
  };

  useEffect(() => {
    fetchNotifications();
    if (user) {
      const interval = setInterval(fetchNotifications, 15000); // Poll every 15s
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      fetchNotifications();
    } catch (e) {
      console.error("Failed to mark notifications read", e);
    }
  };

  return (
    <>
      <motion.header initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="sticky top-0 z-40 backdrop-blur-xl bg-surface/80 border-b border-warm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Logo />
          <nav className="hidden lg:flex items-center gap-1">
            {LINKS.map(l => {
              const active = path === l.to;
              return (
                <Link key={l.to} to={l.to} className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  active ? "text-primary bg-primary/10" : "text-foreground hover:bg-sand")}>{l.label}</Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={() => setSearch(true)} className="w-9 h-9 rounded-lg hover:bg-sand flex items-center justify-center"><Search className="w-4 h-4" /></button>
            <div className="hidden sm:flex items-center gap-0.5 bg-sand rounded-full p-0.5">
              {(["EN", "GU", "HI"] as const).map(l => (
                <button key={l} onClick={() => setLang(l)} className={cn("px-2.5 py-1 rounded-full text-xs font-medium transition", lang === l ? "bg-primary text-white" : "text-warm-muted")}>{l}</button>
              ))}
            </div>
            {!user ? (
              <>
                <Link to="/login" className="hidden sm:inline-flex px-4 py-2 rounded-lg border border-gold text-gold text-sm font-medium hover:bg-gold-light transition">Login</Link>
                <Link to="/register" className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition shadow-sapphire">Register</Link>
              </>
            ) : (
              <>
                <div className="relative">
                  <button 
                    onClick={() => { setNotifDrop(v => !v); setDrop(false); }} 
                    className="relative w-9 h-9 rounded-lg hover:bg-sand flex items-center justify-center"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 px-1 min-w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                  <AnimatePresence>
                    {notifDrop && (
                      <motion.div 
                        initial={{ opacity: 0, y: -6, scale: 0.95 }} 
                        animate={{ opacity: 1, y: 0, scale: 1 }} 
                        exit={{ opacity: 0, y: -6, scale: 0.95 }} 
                        className="absolute right-0 top-12 w-80 bg-surface border border-warm rounded-xl shadow-warm-lg p-2 z-50 max-h-96 flex flex-col"
                      >
                        <div className="px-3 py-2 border-b border-warm flex justify-between items-center mb-1 flex-shrink-0">
                          <span className="font-semibold text-xs text-foreground">Notifications</span>
                          {unreadCount > 0 && (
                            <button 
                              onClick={handleMarkAllRead} 
                              className="text-[10px] text-primary hover:underline font-semibold"
                            >
                              Mark all as read
                            </button>
                          )}
                        </div>
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-xs text-warm-muted">No notifications yet.</div>
                        ) : (
                          <div className="space-y-1.5 max-h-72 overflow-y-auto p-1">
                            {notifications.map((n: any) => (
                              <div 
                                key={n.id} 
                                className={cn(
                                  "p-2.5 rounded-lg text-xs transition border border-transparent",
                                  (!n.read && !n.is_read) ? "bg-primary/5 border-primary/10 font-medium" : "hover:bg-sand/30"
                                )}
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <span className="font-semibold text-foreground leading-tight">{n.title || "Update"}</span>
                                  <span className="text-[9px] text-warm-muted whitespace-nowrap">
                                    {new Date(n.created_at || n.date).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-warm-muted mt-1 leading-normal text-[11px] font-normal">{n.message || n.text}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="relative">
                  <button onClick={() => { setDrop(v => !v); setNotifDrop(false); }} className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-sand">
                    <AvatarCircle name={user.name} src={user.avatar} size={32} />
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  <AnimatePresence>
                    {drop && (
                      <motion.div initial={{ opacity: 0, y: -6, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.95 }} className="absolute right-0 top-12 w-64 bg-surface border border-warm rounded-xl shadow-warm-lg p-2">
                        <div className="px-3 py-2.5 border-b border-warm mb-1">
                          <div className="font-medium text-sm">{user.name}</div>
                          <div className="text-xs text-warm-muted">{user.communityName}</div>
                        </div>
                        <Link to={dashHomeFor(user.role)} onClick={() => setDrop(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-sand text-sm"><LayoutDashboard className="w-4 h-4" />Dashboard</Link>
                        <Link to="/dashboard/profile" onClick={() => setDrop(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-sand text-sm"><User className="w-4 h-4" />My Profile</Link>
                        <Link to="/dashboard/settings" onClick={() => setDrop(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-sand text-sm"><SettingsIcon className="w-4 h-4" />Settings</Link>
                        <button onClick={() => { logout(); setDrop(false); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 text-red-600 text-sm"><LogOut className="w-4 h-4" />Logout</button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}
            <button onClick={() => setMobile(true)} className="lg:hidden w-9 h-9 rounded-lg hover:bg-sand flex items-center justify-center"><Menu className="w-5 h-5" /></button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {mobile && (
          <motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", damping: 28, stiffness: 260 }} className="fixed inset-0 z-50 bg-surface p-6">
            <div className="flex items-center justify-between mb-8"><Logo /><button onClick={() => setMobile(false)} className="w-9 h-9 rounded-lg hover:bg-sand flex items-center justify-center"><X /></button></div>
            <div className="space-y-2">{LINKS.map(l => <Link key={l.to} to={l.to} onClick={() => setMobile(false)} className="block px-4 py-3 rounded-xl bg-sand text-lg font-medium">{l.label}</Link>)}</div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {search && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-start pt-32 justify-center" onClick={() => setSearch(false)}>
            <motion.div initial={{ y: -20, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: -20, scale: 0.95 }} className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl mx-4 p-4" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <div className="flex items-center gap-3 border-b border-warm pb-3">
                <Search className="w-5 h-5 text-warm-muted" />
                <input autoFocus placeholder="Search communities, members, events, jobs…" className="flex-1 bg-transparent outline-none text-base" />
                <kbd className="text-xs px-2 py-1 bg-sand rounded">ESC</kbd>
              </div>
              <div className="pt-3 text-sm text-warm-muted">Try searching for "Rajula" or "Software Engineer"…</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function dashHomeFor(role: string) {
  if (role === "super_admin") return "/admin";
  if (role === "community_admin" || role === "admin") return "/community-admin";
  return "/dashboard";
}
