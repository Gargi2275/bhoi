import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { AccessGuard } from "@/components/wag/AccessGuard";
import { useAuth } from "@/context/AuthContext";
import { DashboardSidebar, MobileBottomNav, MobileHeader, type SidebarItem } from "@/components/wag/Sidebar";
import { LayoutDashboard, Users, UserCog, UsersRound, Calendar, Megaphone, Image, HandHeart, Briefcase, Building2, Heart, FileBarChart, CreditCard, Settings, ShieldCheck, CalendarCheck, MapPin, Box } from "lucide-react";
import { useEffect, useState, createContext, useContext } from "react";
import { api } from "@/lib/api";

export const Route = createFileRoute("/community-admin")({
  component: Layout,
});

import { Network, PlusCircle } from "lucide-react";

const ITEMS: SidebarItem[] = [
  { to: "/community-admin", label: "Overview", icon: LayoutDashboard },
  { to: "/community-admin/hierarchy", label: "Hierarchy", icon: Network },
  { to: "/community-admin/members", label: "Members", icon: Users },
  { to: "/community-admin/committee", label: "Committee", icon: UserCog },
  { to: "/community-admin/families", label: "Families", icon: UsersRound },
  { to: "/community-admin/events", label: "Events", icon: Calendar },
  { to: "/community-admin/news", label: "News", icon: Megaphone },
  { to: "/community-admin/gallery", label: "Gallery", icon: Image },
  { to: "/community-admin/donations", label: "Donations", icon: HandHeart },
  { to: "/community-admin/venues", label: "Venues", icon: MapPin },
  { to: "/community-admin/jobs", label: "Jobs", icon: Briefcase },
  { to: "/community-admin/businesses", label: "Businesses", icon: Building2 },
  { to: "/community-admin/matrimony", label: "Matrimony", icon: Heart },
  { to: "/community-admin/reports", label: "Reports", icon: FileBarChart },
  { to: "/community-admin/plan", label: "Organization Subscription", icon: CreditCard },
  { to: "/community-admin/settings", label: "Settings", icon: Settings },
];

const ICON_MAP: Record<string, any> = {
  LayoutDashboard,
  Users,
  UserCog,
  UsersRound,
  Calendar,
  Megaphone,
  Image,
  HandHeart,
  Briefcase,
  Building2,
  Heart,
  FileBarChart,
  CreditCard,
  Settings,
  ShieldCheck,
  CalendarCheck,
  MapPin,
  Box
};
const labelToCodeMap: Record<string, string> = {
  "Overview": "dashboard",
  "Subsidiaries": "subsidiaries",
  "Hierarchy": "hierarchy",
  "Members": "members",
  "Committee": "committee",
  "Families": "families",
  "Events": "events",
  "News": "news",
  "Gallery": "gallery",
  "Donations": "donations",
  "Property management": "venues",
  "Venues": "venues",
  "Jobs": "jobs",
  "Businesses": "businesses",
  "Matrimony": "matrimony",
  "Reports": "reports",
  "Organization Subscription": "plans",
  "Settings": "settings",
};

export interface ModulePermission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  export: boolean;
  import: boolean;
  approve: boolean;
  reject: boolean;
  assign: boolean;
  manage: boolean;
}

const ModulePermissionsContext = createContext<{
  modules: any[];
  getPermissions: (moduleCode: string) => ModulePermission;
}>({
  modules: [],
  getPermissions: () => ({
    view: true, create: true, edit: true, delete: true,
    export: true, import: true, approve: true, reject: true,
    assign: true, manage: true
  })
});

export function useModulePermissions(moduleCode: string) {
  const { getPermissions } = useContext(ModulePermissionsContext);
  return getPermissions(moduleCode);
}

function Layout() {
  const { user, effectivePermissions } = useAuth();
  const navigate = useNavigate();
  const [isSuper, setIsSuper] = useState(false);
  const [deniedError, setDeniedError] = useState<string | null>(null);
  const [modules, setModules] = useState<any[]>([]);

  const getPermissions = (moduleCode: string): ModulePermission => {
    const defaultPerms = {
      view: true, create: true, edit: true, delete: true,
      export: true, import: true, approve: true, reject: true,
      assign: true, manage: true
    };
    if (user?.role === "super_admin") return defaultPerms;
    if (user?.role === "community_admin" && !user.customRoleName) {
      const matched = modules.find((m: any) => m.module_code === moduleCode);
      if (matched && matched.permissions) {
        return {
          view: !!matched.permissions.view,
          create: !!matched.permissions.create,
          edit: !!matched.permissions.edit,
          delete: !!matched.permissions.delete,
          export: !!matched.permissions.export,
          import: !!matched.permissions.import,
          approve: !!matched.permissions.approve,
          reject: !!matched.permissions.reject,
          assign: !!matched.permissions.assign,
          manage: !!matched.permissions.manage,
        };
      }
      if (matched && matched.locked) {
        return {
          view: false, create: false, edit: false, delete: false,
          export: false, import: false, approve: false, reject: false,
          assign: false, manage: false
        };
      }
      return defaultPerms;
    }
    return defaultPerms;
  };


  useEffect(() => {
    if (deniedError) {
      const timer = setTimeout(() => setDeniedError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [deniedError]);

  useEffect(() => {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (user.role === "member") {
      navigate({ to: "/dashboard" });
      return;
    }
    if (user.communityId) {
      api.getCommunities()
        .then(res => {
          const comm = (res || []).find((c: any) => String(c.id) === String(user.communityId));
          if (comm && (comm.type === "Super" || comm.type === "Super Community")) {
            setIsSuper(true);
          }
        })
        .catch(err => console.error("Error checking community type", err));
    }

    // Fetch sidebar modules AND subscription plan features in parallel
    Promise.all([
      api.getSidebarModules().catch(() => []),
      api.getMyPlan().catch(() => null)
    ]).then(([sidebarMods, planData]) => {
      // Build a map of module_code -> plan status from the subscription plan features
      const planFeatureMap: Record<string, string> = {};
      if (planData?.features) {
        for (const feat of planData.features) {
          planFeatureMap[feat.code] = feat.status; // "Enabled", "Disabled", "Upgrade Required", "Limited"
        }
      }

      // Always-unlocked modules regardless of plan
      const alwaysUnlocked = new Set(["dashboard", "settings", "plans", "subscriptions"]);

      // Merge locked state: if plan says Disabled/Upgrade Required → locked=true
      const merged = (sidebarMods || []).map((m: any) => {
        if (alwaysUnlocked.has(m.module_code)) return { ...m, locked: false };
        const planStatus = planFeatureMap[m.module_code];
        if (planStatus === "Disabled" || planStatus === "Upgrade Required") {
          return { ...m, locked: true };
        }
        if (planStatus === "Enabled" || planStatus === "Limited") {
          return { ...m, locked: false };
        }
        // If no plan data yet, fall back to whatever the sidebar module says
        return m;
      });

      setModules(merged);
    }).catch(err => console.error("Error fetching modules/plan", err));
  }, [user, navigate]);

  if (!user) return null;

  const mappedItems = ITEMS.map(item => {
    let code = labelToCodeMap[item.label];
    if (!code && item.to) {
      const parts = item.to.split("/");
      code = parts[parts.length - 1];
    }
    const matched = modules.find((m: any) => m.module_code === code || m.module_code === labelToCodeMap[item.label]);
    return {
      ...item,
      locked: matched ? matched.locked : false
    };
  });

  let items = [...mappedItems];
  if (isSuper) {
    if (!items.some(i => i.to === "/community-admin/subsidiaries")) {
      const matchedSub = modules.find((m: any) => m.module_code === "subsidiaries");
      items.splice(1, 0, { 
        to: "/community-admin/subsidiaries", 
        label: "Subsidiaries", 
        icon: Building2,
        locked: matchedSub ? matchedSub.locked : false 
      });
    }
  }

  // Expand Venues into Property management (Parent) and sub-items (Overview, Add Property)
  const venuesIndex = items.findIndex(i => i.to === "/community-admin/venues");
  if (venuesIndex !== -1) {
    const venueIcon = items[venuesIndex].icon;
    const venueRoute = items[venuesIndex].to;
    const venueLocked = items[venuesIndex].locked;
    items.splice(venuesIndex, 1,
      { to: venueRoute, label: "Property management", icon: venueIcon, search: { tab: "overview" }, locked: venueLocked },
      { to: venueRoute, label: "Overview", icon: LayoutDashboard, search: { tab: "overview" }, isSubItem: true, locked: venueLocked },
      { to: venueRoute, label: "Add Property", icon: PlusCircle, search: { tab: "add-property" }, isSubItem: true, locked: venueLocked }
    );
  }

  // Filter based on RBAC permissions if it's a committee member with a custom role
  const isCommitteeMember = !!user.customRoleName;
  if (isCommitteeMember) {
    const p = Array.isArray(effectivePermissions) ? effectivePermissions : (Array.isArray(user.permissions) ? user.permissions : []);
    const hasPerm = (perm: string) => p.includes(perm);
    
    items = items.filter(item => {
      if (item.label === "Overview" || item.label === "Dashboard") return true; // Always show Dashboard/Overview
      if (item.label === "Members") return hasPerm("View Members");
      if (item.label === "Committee") return hasPerm("View Committee");
      if (item.label === "Families") return hasPerm("View Families");
      if (item.label === "Events") return hasPerm("View Events");
      if (item.label === "News") return hasPerm("View News");
      if (item.label === "Gallery") return hasPerm("View Gallery");
      if (item.label === "Donations") return hasPerm("View Donations");
      if (item.label === "Jobs") return hasPerm("View Jobs");
      if (item.label === "Businesses") return hasPerm("View Businesses");
      if (item.label === "Matrimony") return hasPerm("View Profiles");
      if (item.label === "Reports") return hasPerm("View Reports");
      if (item.label === "Venues" || item.label === "Property management" || item.label === "Add Property" || (item.label === "Overview" && item.to === "/community-admin/venues")) return hasPerm("Manage Properties") || hasPerm("View Properties");
      if (item.label === "Settings") return hasPerm("Edit Community Profile") || hasPerm("Manage Logo") || hasPerm("Manage Banner") || hasPerm("Manage Community Information");
      if (item.label === "Hierarchy") return hasPerm("View Hierarchy");
      if (item.label === "Subsidiaries") return hasPerm("Manage Subsidiaries");
      if (item.label === "Roles") return false; 
      return false; // Hide all unassigned/unlisted modules by default
    });
  }

  const location = useLocation();
  const currentPath = location.pathname;

  const isAllowed = () => {
    if (user.role === "super_admin") return true;
    if (user.role === "community_admin" && !user.customRoleName) return true;
    
    // Find the longest matching route in the original ITEMS array
    const allOriginalItems = [...ITEMS, { to: "/community-admin/subsidiaries", label: "Subsidiaries", icon: Building2 }];
    const matchedOriginal = allOriginalItems
      .sort((a, b) => b.to.length - a.to.length)
      .find(i => currentPath === i.to || currentPath.startsWith(i.to + "/"));
      
    if (!matchedOriginal) return true;
    
    return items.some(i => i.to === matchedOriginal.to);
  };

  useEffect(() => {
    if (user && !isAllowed()) {
      navigate({ to: "/community-admin" });
      setDeniedError("Access Denied: You do not have permission to access that module.");
    }
  }, [currentPath, user]);

  return (
    <div className="flex flex-col min-h-screen bg-transparent w-full">
      <MobileHeader title="Samaj Admin" items={items} />
      <div className="flex flex-1 w-full">
        <DashboardSidebar items={items} title="Samaj Admin" />
        <div className="flex-1 min-w-0 pb-6 md:pb-0">
          {deniedError && (
            <div className="mx-6 mt-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-red-500 flex-shrink-0" />
                <span className="text-sm font-semibold">{deniedError}</span>
              </div>
              <button onClick={() => setDeniedError(null)} className="text-red-500 hover:text-red-700 text-xs font-bold font-ui">
                Dismiss
              </button>
            </div>
          )}
          <ModulePermissionsContext.Provider value={{ modules, getPermissions }}>
            <AccessGuard>
              <Outlet />
            </AccessGuard>
          </ModulePermissionsContext.Provider>
        </div>
      </div>
    </div>
  );
}
