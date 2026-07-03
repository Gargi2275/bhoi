import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { DashboardSidebar, MobileHeader, type SidebarItem } from "@/components/wag/Sidebar";
import { LayoutDashboard, Building2, Users, UserCog, Calendar, Heart, Briefcase, HandHeart, Image, CreditCard, FileBarChart, FileText, ShieldCheck, Settings, MapPin, Network, Crown } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  component: Layout,
});

const ITEMS: SidebarItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/communities", label: "Communities", icon: Building2 },
  { to: "/admin/community-hierarchy", label: "Hierarchy", icon: Network },
  { to: "/admin/members", label: "Members", icon: Users },
  { to: "/admin/committee", label: "Committee", icon: UserCog },
  { to: "/admin/events", label: "Events", icon: Calendar },
  { to: "/admin/venues", label: "Properties", icon: MapPin },
  { to: "/admin/matrimony", label: "Matrimony", icon: Heart },
  { to: "/admin/jobs-businesses", label: "Jobs & Businesses", icon: Briefcase },
  { to: "/admin/donations", label: "Donations", icon: HandHeart },
  { to: "/admin/advertisements", label: "Advertisements", icon: Image },
  { to: "/admin/reports", label: "Reports", icon: FileBarChart },
  { to: "/admin/cms", label: "CMS", icon: FileText },
  { to: "/admin/roles", label: "Roles", icon: ShieldCheck },
  { to: "/admin/subscriptions", label: "License Management", icon: CreditCard },
  { to: "/admin/member-premium", label: "Member Premium", icon: Crown },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!user) {
      navigate({ to: "/login" });
    } else if (user.role !== "super_admin") {
      navigate({ to: user.role === "community_admin" ? "/community-admin" : "/dashboard" });
    }
  }, [user, navigate]);

  if (!mounted) return null;
  if (!user || user.role !== "super_admin") return null;

  return (
    <div className="flex flex-col min-h-screen bg-transparent w-full">
      <MobileHeader title="Super Admin" items={ITEMS} />
      <div className="flex flex-1 w-full">
        <DashboardSidebar items={ITEMS} title="Super Admin" />
        <div className="flex-1 min-w-0 pb-6 md:pb-0"><Outlet /></div>
      </div>
    </div>
  );
}
