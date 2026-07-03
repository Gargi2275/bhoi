import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { AccessGuard } from "@/components/wag/AccessGuard";
import { useAuth } from "@/context/AuthContext";
import { DashboardSidebar, MobileBottomNav, MobileHeader, type SidebarItem } from "@/components/wag/Sidebar";
import { LayoutDashboard, User, Users, Building2, Heart, Briefcase, Calendar, HandHeart, Bell, CreditCard, Settings, UsersRound, MessageSquare, Network, CalendarCheck, MapPin, Box } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { api } from "@/lib/api";

export const Route = createFileRoute("/dashboard")({
  component: DashLayout,
});

const isRemovedItem = (to: string, label: string) => {
  const path = to.toLowerCase();
  const name = label.toLowerCase();
  
  if (path.includes("hrms") || name.includes("hrms")) return true;
  if (path.includes("hierarchy") || name.includes("hierarchy")) return true;
  if (path.includes("family") || name.includes("family") || name.includes("families")) return true;
  if (path.includes("directory") || name.includes("directory")) return true;
  if (path.includes("cms") || name.includes("cms")) return true;
  if (path.includes("news") || name.includes("news") || path.includes("samachar") || name.includes("samachar")) return true;
  if (path.includes("jobs") || name.includes("jobs") || path.includes("job") || name.includes("job")) return true;
  if (path.includes("business") || name.includes("business")) return true;
  
  return false;
};

const ITEMS: SidebarItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/dashboard/hierarchy", label: "Hierarchy", icon: Network },
  { to: "/dashboard/profile", label: "My Profile", icon: User },
  { to: "/dashboard/subscription", label: "My Subscription", icon: CreditCard },
  { to: "/dashboard/family", label: "My Family", icon: UsersRound },
  { to: "/dashboard/directory", label: "Member Directory", icon: Users },
  { to: "/dashboard/business", label: "Business Directory", icon: Building2 },
  { to: "/dashboard/matrimony", label: "Matrimony", icon: Heart },
  { to: "/dashboard/jobs", label: "Jobs", icon: Briefcase },
  { to: "/dashboard/events", label: "Events", icon: Calendar },
  { to: "/dashboard/donations", label: "Donations", icon: HandHeart },
  { to: "/dashboard/venues", label: "Venues", icon: MapPin },
  { to: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { to: "/dashboard/messages", label: "Messages", icon: MessageSquare },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
];

const filteredITEMS = ITEMS.filter(item => !isRemovedItem(item.to, item.label));

const ICON_MAP: Record<string, any> = {
  LayoutDashboard,
  User,
  Users,
  Building2,
  Heart,
  Briefcase,
  Calendar,
  HandHeart,
  Bell,
  CreditCard,
  Settings,
  UsersRound,
  MessageSquare,
  Network,
  CalendarCheck,
  MapPin,
  Box
};

function DashLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [sidebarItems, setSidebarItems] = useState<SidebarItem[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.getNotifications();
      if (res) {
        const count = res.filter((n: any) => !n.is_read).length;
        setUnreadCount(count);
      }
    } catch (e) {
      console.warn("Failed to fetch notifications unread count:", e);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchUnreadCount();

    const handleUpdate = () => {
      fetchUnreadCount();
    };
    window.addEventListener("notifications-updated", handleUpdate);
    const interval = setInterval(fetchUnreadCount, 15000); // Poll every 15s

    return () => {
      window.removeEventListener("notifications-updated", handleUpdate);
      clearInterval(interval);
    };
  }, [user]);

  const fetchSidebar = () => {
    api.getSidebarModules()
      .then(modules => {
        const filtered = modules.filter(
          m => m.route && m.route !== "/dashboard/plan" && (m.route.startsWith("/dashboard") || m.module_code === "dashboard")
        );
        const mapped = filtered
          .map(m => {
            let label = m.display_name;
            if (m.route === "/dashboard/subscription" || m.module_code === "subscription") {
              label = "My Subscription";
            }
            return {
              to: m.route === "/dashboard/subscription" ? "/dashboard/subscription" : m.route,
              label: label,
              icon: m.route === "/dashboard/subscription" || m.module_code === "subscription" ? CreditCard : (ICON_MAP[m.icon] || ICON_MAP.Box),
              locked: m.locked
            };
          })
          .filter(item => !isRemovedItem(item.to, item.label));

        // Ensure My Subscription is present in mapped
        const hasSub = mapped.some(item => item.to === "/dashboard/subscription");
        if (!hasSub) {
          const profileIndex = mapped.findIndex(item => item.to === "/dashboard/profile");
          const subItem = { to: "/dashboard/subscription", label: "My Subscription", icon: CreditCard, locked: false };
          if (profileIndex !== -1) {
            mapped.splice(profileIndex + 1, 0, subItem);
          } else {
            mapped.push(subItem);
          }
        }
        
        if (mapped.length > 0) {
          setSidebarItems(mapped);
        } else {
          setSidebarItems(filteredITEMS);
        }
      })
      .catch(err => {
        console.error("Error fetching member sidebar modules", err);
        setSidebarItems(filteredITEMS);
      });
  };

  useEffect(() => {
    if (!mounted) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (user.role === "super_admin") {
      navigate({ to: "/admin" });
      return;
    } else if (user.role === "community_admin") {
      navigate({ to: "/community-admin" });
      return;
    }

    fetchSidebar();

    window.addEventListener("subscription-updated", fetchSidebar);
    return () => {
      window.removeEventListener("subscription-updated", fetchSidebar);
    };
  }, [mounted, user, navigate]);

  if (!mounted || !user) return null;

  const activeItems = sidebarItems.length > 0 ? sidebarItems : ITEMS;
  const updatedItems = activeItems.map(item => {
    if (item.to === "/dashboard/notifications") {
      return { ...item, badge: unreadCount };
    }
    return item;
  });
  return (
    <div className="flex flex-col min-h-screen bg-transparent w-full">
      <MobileHeader title="Member Panel" items={updatedItems} />
      <div className="flex flex-1 w-full">
        <DashboardSidebar items={updatedItems} title="Member" />
        <div className="flex-1 min-w-0 pb-6 md:pb-0">
          <AccessGuard>
            <Outlet />
          </AccessGuard>
        </div>
      </div>
    </div>
  );
}
