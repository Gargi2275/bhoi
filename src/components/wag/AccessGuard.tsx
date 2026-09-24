import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { ShieldAlert, ArrowRight, Home, RefreshCw, AlertTriangle, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface AccessGuardProps {
  children: React.ReactNode;
}

// Map path prefix to backend module code
function getModuleCodeFromPath(pathname: string): string | null {
  const p = pathname.toLowerCase();
  
  // Dashboard routes
  if (p.includes("/dashboard/matrimony")) return "matrimony";
  if (p.includes("/dashboard/family")) return "family";
  if (p.includes("/dashboard/directory")) return "members";
  if (p.includes("/dashboard/business")) return "business";
  if (p.includes("/dashboard/jobs")) return "jobs";
  if (p.includes("/dashboard/events")) return "events";
  if (p.includes("/dashboard/donations")) return "donations";
  if (p.includes("/dashboard/venues")) return "venues";
  if (p.includes("/dashboard/hierarchy")) return "hierarchy";
  if (p.includes("/dashboard/messages")) return "messages";
  if (p.includes("/dashboard/committee")) return "committee";
  if (p.includes("/dashboard/attendance")) return "attendance";
  if (p.includes("/dashboard/subsidiaries")) return "subsidiaries";
  if (p.includes("/dashboard/advertisements")) return "advertisements";
  if (p.includes("/dashboard/properties")) return "properties";
  
  if (p.includes("/community-admin/matrimony")) return "matrimony";
  if (p.includes("/community-admin/families")) return "family";
  if (p.includes("/community-admin/members")) return "members";
  if (p.includes("/community-admin/committee")) return "committee";
  if (p.includes("/community-admin/events")) return "events";
  if (p.includes("/community-admin/news")) return "news";
  if (p.includes("/community-admin/gallery")) return "gallery";
  if (p.includes("/community-admin/donations")) return "donations";
  if (p.includes("/community-admin/venues")) return "venues";
  if (p.includes("/community-admin/jobs")) return "jobs";
  if (p.includes("/community-admin/businesses")) return "business";
  if (p.includes("/community-admin/reports")) return "reports";
  if (p.includes("/community-admin/hierarchy")) return "hierarchy";
  if (p.includes("/community-admin/subsidiaries")) return "subsidiaries";
  
  return null;
}

export function AccessGuard({ children }: AccessGuardProps) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [access, setAccess] = useState<{
    has_access: boolean;
    status: string;
    reason?: string;
    current?: number;
    limit?: number;
  }>({ has_access: true, status: "Enabled" });

  const moduleCode = getModuleCodeFromPath(location.pathname);

  useEffect(() => {
    if (!user || user.role === "super_admin") {
      setChecking(false);
      return;
    }

    if (!moduleCode) {
      setChecking(false);
      return;
    }

    setChecking(true);
    
    // Query both community access and sidebar module lock status
    Promise.all([
      api.checkAccess(moduleCode, "view").catch(() => ({ has_access: true, status: "Enabled" })),
      api.getSidebarModules().catch(() => [])
    ])
      .then(([accessRes, sidebarModules]) => {
        // Find if this module is locked under the member's premium plan
        const matchedModule = sidebarModules.find(
          m => m.module_code === moduleCode || (m.route && m.route.toLowerCase().includes(location.pathname.toLowerCase()))
        );
        
        if (matchedModule && matchedModule.locked) {
          setAccess({
            has_access: false,
            status: "Upgrade Required",
            reason: user.role === "community_admin"
              ? "This module is locked under your organization's subscription plan."
              : "This module is locked under your current membership plan."
          });
        } else {
          setAccess(accessRes);
        }
        setChecking(false);
      })
      .catch((err) => {
        console.error("Access check failed", err);
        setChecking(false);
      });
  }, [location.pathname, user, moduleCode]);

  if (checking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
        <RefreshCw className="w-8 h-8 text-primary animate-spin mb-3" />
        <p className="text-sm font-semibold text-warm-muted animate-pulse">Verifying organization license & limits...</p>
      </div>
    );
  }

  if (!access.has_access) {
    const isCommunityAdmin = user?.role === "community_admin";

    // Subscription Limit reached view
    if (access.status === "Limited") {
      return (
        <div className="min-h-[70vh] flex items-center justify-center p-4 md:p-8 bg-transparent">
          <div className="max-w-md w-full bg-surface border border-warm rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gold/10 rounded-bl-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-gold" />
            </div>

            <div className="mb-6">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-50 text-amber-700 border border-amber-200">
                Limit Reached
              </span>
              <h2 className="text-xl font-bold font-ui mt-3 text-foreground leading-tight">
                Subscription Limit Reached
              </h2>
              <p className="text-xs text-warm-muted mt-2 leading-relaxed">
                Your community has reached the maximum allowed limit for <strong>{moduleCode}</strong> under the current subscription plan.
              </p>
            </div>

            {/* Current vs Limit Display */}
            <div className="bg-sand/30 border border-warm/60 rounded-2xl p-4 mb-6 text-xs">
              <div className="flex justify-between items-center mb-1.5 font-bold text-foreground">
                <span>Current Usage</span>
                <span>{access.current} / {access.limit}</span>
              </div>
              <div className="w-full bg-warm/40 h-2.5 rounded-full overflow-hidden">
                <div className="bg-gold h-full rounded-full" style={{ width: "100%" }} />
              </div>
              <div className="text-[10px] text-warm-muted mt-1.5 flex items-center gap-1">
                <span>⚠️ Upgrade plan to expand this capacity.</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {isCommunityAdmin ? (
                <button
                  onClick={() => navigate({ to: "/community-admin/plan" })}
                  className="w-full py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition text-xs shadow-md flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" /> Upgrade Subscription
                </button>
              ) : (
                <div className="p-3 bg-warm/20 border border-warm rounded-xl text-center text-xs text-warm-muted font-medium">
                  Please contact your Community Administrator to upgrade the plan.
                </div>
              )}
              <button
                onClick={() => navigate({ to: isCommunityAdmin ? "/community-admin" : "/dashboard" })}
                className="w-full py-2.5 border border-warm hover:bg-sand/30 rounded-xl text-xs font-semibold text-foreground transition flex items-center justify-center gap-1.5"
              >
                <Home className="w-4 h-4" /> Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Upgrade Required (feature disabled in current plan)
    if (access.status === "Upgrade Required") {
      return (
        <div className="min-h-[70vh] flex items-center justify-center p-4 md:p-8 bg-transparent">
          <div className="max-w-md w-full bg-surface border border-warm rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-bl-full flex items-center justify-center">
              <ShieldAlert className="w-8 h-8 text-primary" />
            </div>

            <div className="mb-6">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20">
                Upgrade Required
              </span>
              <h2 className="text-xl font-bold font-ui mt-3 text-foreground leading-tight">
                Module Disabled on Plan
              </h2>
              <p className="text-xs text-warm-muted mt-2 leading-relaxed">
                The <strong>{moduleCode?.toUpperCase()}</strong> module is not included in your current subscription tier. Upgrade your community license to enable access.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {isCommunityAdmin ? (
                <button
                  onClick={() => navigate({ to: "/community-admin/plan" })}
                  className="w-full py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition text-xs shadow-md flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" /> Upgrade Subscription
                </button>
              ) : (
                <div className="p-3 bg-warm/20 border border-warm rounded-xl text-center text-xs text-warm-muted font-medium">
                  Contact your Samaj Administrator to enable this module.
                </div>
              )}
              <button
                onClick={() => navigate({ to: isCommunityAdmin ? "/community-admin" : "/dashboard" })}
                className="w-full py-2.5 border border-warm hover:bg-sand/30 rounded-xl text-xs font-semibold text-foreground transition flex items-center justify-center gap-1.5"
              >
                <Home className="w-4 h-4" /> Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Expired, Suspended, Cancelled
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 md:p-8 bg-transparent">
        <div className="max-w-md w-full bg-surface border border-red-200 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-bl-full flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>

          <div className="mb-6">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-red-100 text-red-700 border border-red-200">
              License {access.status}
            </span>
            <h2 className="text-xl font-bold font-ui mt-3 text-foreground leading-tight">
              Community License Blocked
            </h2>
            <p className="text-xs text-warm-muted mt-2 leading-relaxed">
              Your community's subscription status is currently <strong>{access.status}</strong>. Full dashboard functionality is suspended until billing is resolved.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {isCommunityAdmin ? (
              <button
                onClick={() => navigate({ to: "/community-admin/plan" })}
                className="w-full py-2.5 bg-red-500 text-white rounded-xl font-bold hover:bg-red-650 transition text-xs shadow-md flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" /> Manage Subscription & Billing
              </button>
            ) : (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-center text-xs text-red-700 font-medium">
                The community's subscription has lapsed. Please contact your Community Admin.
              </div>
            )}
            <button
              onClick={() => navigate({ to: isCommunityAdmin ? "/community-admin" : "/dashboard" })}
              className="w-full py-2.5 border border-warm hover:bg-sand/30 rounded-xl text-xs font-semibold text-foreground transition flex items-center justify-center gap-1.5"
            >
              <Home className="w-4 h-4" /> Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
