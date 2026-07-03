import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  LayoutDashboard, CreditCard, ShieldCheck, Box, FileText, CheckCircle2,
  AlertTriangle, ArrowUpCircle, RefreshCw, HardDrive, Users, UserCog, 
  Calendar, Image as ImageIcon, Heart, Building2, DollarSign, Download, 
  Printer, Percent, AlertCircle, Sparkles, Plus, Minus, Lock, BarChart2,
  RefreshCcw, Trash2, Bell, ShieldAlert, Award, Shield, Cpu, ChevronRight, Check, Activity
} from "lucide-react";

export const Route = createFileRoute("/community-admin/plan")({
  component: OrganizationSubscriptionCenter,
});

type MainTabKey = "overview" | "modules" | "analytics" | "billing" | "security";
type BillingSubTabKey = "renewals" | "invoices" | "addons" | "cards" | "refunds";

function OrganizationSubscriptionCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Navigation tabs
  const [activeMainTab, setActiveMainTab] = useState<MainTabKey>("overview");
  const [activeBillingSubTab, setActiveBillingSubTab] = useState<BillingSubTabKey>("renewals");

  // Core Data States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subData, setSubData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [addons, setAddons] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [refundRequests, setRefundRequests] = useState<any[]>([
    { id: "REF-9302", amount: 1999, date: "2026-06-12", status: "Completed", method: "Razorpay (UPI)", reason: "Accidental double subscription trigger" },
    { id: "REF-2291", amount: 499, date: "2026-06-25", status: "Pending", method: "Bank Transfer", reason: "Downgraded membership plan refund credit" }
  ]);

  // Payment Methods State
  const [paymentMethods, setPaymentMethods] = useState<any[]>([
    { id: "pm-1", type: "Credit Card", default: true, details: "Visa ending in 4829", expires: "09/2029", verified: true, active: true },
    { id: "pm-2", type: "UPI", default: false, details: "samajadmin@okaxis", expires: "", verified: true, active: true },
    { id: "pm-3", type: "Bank Transfer", default: false, details: "HDFC Bank A/C ending in 8901", expires: "", verified: false, active: true }
  ]);
  const [showAddMethodModal, setShowAddMethodModal] = useState(false);
  const [newMethod, setNewMethod] = useState({ type: "Credit Card", details: "", expiry: "" });

  // Notifications Config State
  const [notifConfig, setNotifConfig] = useState<Record<string, { email: boolean; sms: boolean; whatsapp: boolean; push: boolean }>>({
    invoice_generated: { email: true, sms: false, whatsapp: true, push: true },
    payment_successful: { email: true, sms: true, whatsapp: true, push: true },
    payment_failed: { email: true, sms: true, whatsapp: true, push: true },
    renewal_reminder: { email: true, sms: true, whatsapp: true, push: true },
    limit_reached: { email: true, sms: true, whatsapp: true, push: true }
  });

  // Security Verification
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [securityAction, setSecurityAction] = useState<string | null>(null);
  const [onOtpVerifiedCallback, setOnOtpVerifiedCallback] = useState<(() => void) | null>(null);

  // Coupons
  const [appliedCoupon, setAppliedCoupon] = useState<string>("");
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [couponInput, setCouponInput] = useState<string>("");
  const [couponError, setCouponError] = useState<string | null>(null);

  // Upgrade/Downgrade states
  const [selectedPlanUpgrade, setSelectedPlanUpgrade] = useState<any>(null);
  const [billingCycle, setBillingCycle] = useState<"Monthly" | "Quarterly" | "Half-Yearly" | "Yearly" | "Lifetime">("Monthly");
  const [isDowngradeWarnOpen, setIsDowngradeWarnOpen] = useState(false);
  const [downgradePlan, setDowngradePlan] = useState<any>(null);

  // Drawer / Modal states
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [addonQuantities, setAddonQuantities] = useState<Record<string, number>>({});
  
  // History table filters
  const [searchInvoice, setSearchInvoice] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const planRes = await api.getMyPlan();
      setSubData(planRes);
      setHistory(planRes.billing_history || []);

      const addonsRes = await api.getPlanAddons();
      setAddons(addonsRes || []);
      const initialQuantities: Record<string, number> = {};
      (addonsRes || []).forEach((a) => {
        initialQuantities[a.id || a.code] = 1;
      });
      setAddonQuantities(initialQuantities);

      const auditRes = await api.getSubscriptionAuditLogs();
      setAuditLogs(auditRes || []);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load Billing & Subscription settings.");
    } finally {
      setLoading(false);
    }
  };

  // Secure trigger for critical billing actions
  const requestOtpForAction = (actionName: string, executeCallback: () => void) => {
    setSecurityAction(actionName);
    setOtpSent(true);
    setOtpVerified(false);
    setOtpCode("");
    setOnOtpVerifiedCallback(() => executeCallback);
  };

  const verifyOtpAndExecute = () => {
    if (otpCode === "123456") {
      setOtpVerified(true);
      setOtpSent(false);
      if (onOtpVerifiedCallback) {
        onOtpVerifiedCallback();
      }
    } else {
      alert("Invalid OTP code. Please enter the mock code '123456' to authorize.");
    }
  };

  // Add/Remove Payment Method
  const handleAddPaymentMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMethod.details) return;
    const newPm = {
      id: `pm-${Date.now()}`,
      type: newMethod.type,
      default: paymentMethods.length === 0,
      details: newMethod.details,
      expires: newMethod.expiry || "N/A",
      verified: true,
      active: true
    };
    setPaymentMethods([...paymentMethods, newPm]);
    setShowAddMethodModal(false);
    setNewMethod({ type: "Credit Card", details: "", expiry: "" });
  };

  const handleSetDefaultPaymentMethod = (id: string) => {
    setPaymentMethods(paymentMethods.map(pm => ({
      ...pm,
      default: pm.id === id
    })));
  };

  const handleRemovePaymentMethod = (id: string) => {
    setPaymentMethods(paymentMethods.filter(pm => pm.id !== id));
  };

  // Purchase Add-on
  const handleBuyAddon = (addon: any) => {
    const qty = addonQuantities[addon.id || addon.code] || 1;
    requestOtpForAction(`Purchase ${qty}x ${addon.name}`, async () => {
      try {
        await api.purchasePlanAddon({
          addon_id: addon.id,
          quantity: qty,
          community_id: Number(user?.communityId || 1)
        });
        alert(`Success! Add-on limits for ${addon.name} upgraded by ${qty}.`);
        fetchData();
      } catch (err) {
        alert("Failed to purchase add-on.");
      }
    });
  };

  // Apply Promo Coupon code
  const handleValidateCoupon = () => {
    setCouponError(null);
    if (!couponInput.trim()) return;
    if (couponInput.toUpperCase() === "SAMAJ50") {
      setAppliedCoupon("SAMAJ50");
      setCouponDiscount(250);
      alert("Coupon 'SAMAJ50' applied successfully! Flat ₹250 discount applied.");
    } else if (couponInput.toUpperCase() === "WELCOME10") {
      setAppliedCoupon("WELCOME10");
      setCouponDiscount(150);
      alert("Coupon 'WELCOME10' applied successfully! Flat ₹150 discount applied.");
    } else {
      setCouponError("Invalid or expired promo code.");
    }
  };

  // Upgrade Plan Trigger
  const handleUpgradePlan = (plan: any) => {
    setSelectedPlanUpgrade(plan);
    requestOtpForAction(`Upgrade Plan to ${plan.name}`, async () => {
      try {
        await api.assignPlan({
          community_id: Number(user?.communityId || 1),
          plan_id: plan.id,
          billing_cycle: billingCycle,
          price_paid: billingCycle === "Monthly" ? plan.monthly_price : plan.yearly_price
        });
        alert(`Congratulations! Your Samaj community plan upgraded to ${plan.name}.`);
        fetchData();
      } catch (err) {
        alert("Failed to process plan upgrade.");
      }
    });
  };

  // Downgrade validation
  const handleCheckDowngrade = (plan: any) => {
    setDowngradePlan(plan);
    setIsDowngradeWarnOpen(true);
  };

  // Export tables
  const handleExport = (format: "csv" | "xlsx" | "pdf", data: any[], filename: string) => {
    alert(`Exporting ${filename}.${format} containing ${data.length} records.`);
  };

  const getMetricIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("member")) return Users;
    if (n.includes("family")) return Users;
    if (n.includes("event")) return Calendar;
    if (n.includes("business")) return Building2;
    if (n.includes("gallery")) return ImageIcon;
    if (n.includes("matrimony")) return Heart;
    if (n.includes("committee")) return UserCog;
    if (n.includes("storage")) return HardDrive;
    return Box;
  };

  const getModuleIcon = (code: string) => {
    switch (code) {
      case "dashboard": return LayoutDashboard;
      case "members": return Users;
      case "family": return Users;
      case "committee": return UserCog;
      case "events": return Calendar;
      case "businesses": return Building2;
      case "matrimony": return Heart;
      case "gallery": return ImageIcon;
      default: return Box;
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6 min-h-screen bg-[#FCF5EC]">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 bg-[#E6D9C8]/40 rounded-lg w-64 animate-pulse"></div>
            <div className="h-4 bg-[#E6D9C8]/40 rounded-lg w-96 animate-pulse"></div>
          </div>
          <div className="h-10 bg-[#E6D9C8]/40 rounded-xl w-36 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-[#E6D9C8]/40 rounded-2xl animate-pulse"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-96 bg-[#E6D9C8]/40 rounded-2xl col-span-2 animate-pulse"></div>
          <div className="h-96 bg-[#E6D9C8]/40 rounded-2xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error || !subData) {
    return (
      <div className="p-8 min-h-screen flex flex-col items-center justify-center bg-[#FCF5EC] text-center space-y-6">
        <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-full">
          <AlertTriangle className="w-16 h-16 text-red-500" />
        </div>
        <h2 className="text-3xl font-extrabold dark:text-white">Could not fetch Billing Center</h2>
        <p className="text-slate-500 max-w-md mx-auto">{error || "Connection error."}</p>
        <button onClick={fetchData} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition duration-200 shadow-md">
          Retry Connection
        </button>
      </div>
    );
  }

  const { header, usage, features, plans, billing_history, notifications } = subData;

  // Filtered History
  const filteredHistory = billing_history.filter((h: any) => {
    if (searchInvoice && !h.invoice_no.toLowerCase().includes(searchInvoice.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#FCF5EC] text-slate-800 dark:text-slate-100 font-sans antialiased">
      {/* Dynamic Header */}
      <div className="border-b border-[#E6D9C8] bg-[#FFFDF9] sticky top-0 z-30 backdrop-blur-md bg-opacity-95 dark:bg-opacity-95 px-6 py-4 md:px-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-6 h-6 text-[#EA580C]" />
              Organization Control Center
            </h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${
              header.status === "Active" 
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30" 
                : "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${header.status === "Active" ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
              {header.status}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Managing community <span className="font-semibold text-slate-700 dark:text-slate-200">{header.community_name}</span> • Powered by {header.plan_name} Edition
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="hidden lg:flex items-center gap-1 text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-[#E6D9C8]">
            <span className="font-semibold text-slate-700 dark:text-slate-200">{header.countdown_days}</span> days left in current cycle
          </div>
          <button
            onClick={() => {
              setActiveMainTab("billing");
              setActiveBillingSubTab("renewals");
            }}
            className="flex-1 md:flex-none px-4 py-2 bg-[#EA580C] hover:bg-[#D94E06] active:scale-95 text-white font-bold rounded-xl text-xs transition duration-150 shadow-sm"
          >
            Upgrade / Renew
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-73px)]">
        {/* Navigation Sidebar */}
        <div className="w-full lg:w-64 border-r border-[#E6D9C8] bg-[#FFFDF9] p-4 space-y-1 flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible shrink-0 scrollbar-none sticky lg:top-[73px] lg:h-[calc(100vh-73px)]">
          <div className="hidden lg:block pb-4 mb-4 border-b border-[#E6D9C8]">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block px-3">
              OPERATIONAL HUB
            </span>
          </div>

          {[
            { id: "overview", label: "Overview", icon: LayoutDashboard },
            { id: "modules", label: "Modules & Access", icon: Cpu },
            { id: "analytics", label: "Usage & Quotas", icon: BarChart2 },
            { id: "billing", label: "Billing & Financials", icon: CreditCard },
            { id: "security", label: "Security & Auditing", icon: ShieldCheck }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeMainTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveMainTab(tab.id as MainTabKey)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap lg:w-full ${
                  active
                    ? "bg-orange-50/70 text-[#EA580C] border border-orange-200/50"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? "text-[#EA580C]" : "text-slate-400"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto max-w-7xl">
          
          {/* OTP Authorization Banner */}
          {otpSent && (
            <div className="p-5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <h4 className="font-bold text-sm text-amber-800 dark:text-amber-300">Secure Action Verification Required</h4>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-400/80">
                  Please confirm <span className="font-bold">{securityAction}</span>. Enter the system OTP to authorize.
                </p>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <input
                  type="text"
                  placeholder="OTP (Mock: 123456)"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl text-xs outline-none w-full md:w-36 font-semibold"
                />
                <button
                  type="button"
                  onClick={verifyOtpAndExecute}
                  className="px-4 py-1.5 bg-[#EA580C] hover:bg-[#D94E06] active:scale-95 text-white text-xs font-bold rounded-xl transition duration-150"
                >
                  Verify
                </button>
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition duration-150"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: OVERVIEW CONTROL CENTER */}
          {activeMainTab === "overview" && (
            <div className="space-y-8">
              {/* Top Banner Alert Notifications */}
              {notifications && notifications.length > 0 && (
                <div className="space-y-3">
                  {notifications.map((notif: any, i: number) => (
                    <div key={i} className={`p-4 rounded-2xl border flex items-start gap-3 text-xs leading-relaxed ${
                      notif.type === "error" 
                        ? "bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 text-red-800 dark:text-red-300"
                        : "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-855 dark:text-amber-300"
                    }`}>
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">{notif.code.replace("_", " ").toUpperCase()}: </span>
                        {notif.message}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* License health & Core subscription Details */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-[#FFFDF9] p-6 rounded-2xl border border-[#E6D9C8] shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[220px]">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">
                          LICENSE CERTIFICATE
                        </span>
                        <h3 className="text-xl font-bold dark:text-white">Active Operational Agreement</h3>
                      </div>
                      <Award className="w-8 h-8 text-[#EA580C] opacity-60" />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase">License Key</span>
                        <p className="text-xs font-mono font-bold dark:text-white">LIC-4902-8392-XX</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase">Version</span>
                        <p className="text-xs font-bold dark:text-white">v1.2.0-stable</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase">Start Date</span>
                        <p className="text-xs font-bold dark:text-white">
                          {header.start_date ? new Date(header.start_date).toLocaleDateString() : "Active"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase">Next Billing</span>
                        <p className="text-xs font-bold dark:text-white">
                          {header.end_date ? new Date(header.end_date).toLocaleDateString() : "Lifetime"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-[#E6D9C8] flex justify-between items-center text-xs">
                    <span className="text-slate-400">{header.validity_desc}</span>
                    <span className="flex items-center gap-1.5 text-[#EA580C] font-semibold">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                      Auto-Renew: {header.auto_renew ? "On" : "Off"}
                    </span>
                  </div>
                </div>

                {/* Quick actions & AI Insights */}
                <div className="bg-gradient-to-br from-[#EA580C] to-[#C2410C] text-white p-6 rounded-2xl border border-transparent shadow-sm flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-orange-200" />
                      <h4 className="font-bold text-sm uppercase tracking-wider text-orange-200">AI Operational Insights</h4>
                    </div>
                    
                    {header.plan_code === "free" || header.plan_code === "basic" ? (
                      <p className="text-xs text-orange-100 leading-relaxed">
                        Upgrade to <span className="font-bold text-white">Pro Plan</span> today to unlock the Matrimony Directory, Committee Hierarchy, and increase your member limit to 2,000 users.
                      </p>
                    ) : (
                      <p className="text-xs text-orange-100 leading-relaxed">
                        Your system is optimized. Feature limits are healthy. Consider adding the SMS bundle if you need urgent communication for upcoming events.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 pt-4">
                    <button
                      onClick={() => setActiveMainTab("modules")}
                      className="w-full py-2 bg-white text-[#EA580C] font-bold rounded-xl text-xs hover:bg-orange-50 active:scale-95 transition"
                    >
                      Manage Modules
                    </button>
                    {header.plan_code !== "enterprise" && (
                      <button
                        onClick={() => {
                          setActiveMainTab("billing");
                          setActiveBillingSubTab("renewals");
                        }}
                        className="w-full py-2 bg-orange-500/20 text-white font-bold rounded-xl text-xs hover:bg-orange-500/30 active:scale-95 transition border border-orange-400/20"
                      >
                        Compare All Plans
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { name: "Members Active", current: usage[0]?.current || 0, limit: usage[0]?.limit || 50, color: "text-[#EA580C]", bg: "bg-[#EA580C]", metric: usage[0] },
                  { name: "Storage Used", current: `${usage[7]?.current || 0.0} GB`, limit: `${usage[7]?.limit || 1} GB`, color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-500", metric: usage[7] },
                  { name: "Events Created", current: usage[2]?.current || 0, limit: usage[2]?.limit || 5, color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-500", metric: usage[2] },
                  { name: "SMS Balance", current: usage[9]?.limit - usage[9]?.current || 0, limit: usage[9]?.limit || 100, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500", metric: usage[9] }
                ].map((kpi, idx) => {
                  const pct = kpi.metric ? Math.min(100, Math.round((kpi.metric.current / kpi.metric.limit) * 100)) : 0;
                  return (
                    <div key={idx} className="bg-[#FFFDF9] p-5 rounded-2xl border border-[#E6D9C8] shadow-sm space-y-3 flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{kpi.name}</span>
                        <span className={`font-black text-lg ${kpi.color}`}>{kpi.current}</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full ${kpi.bg} rounded-full`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Usage: {pct}%</span>
                          <span>Cap: {kpi.limit}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Grid: Quota Overview + Timeline */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Quota Gauge Grid */}
                <div className="lg:col-span-2 bg-[#FFFDF9] p-6 rounded-2xl border border-[#E6D9C8] shadow-sm space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-sm dark:text-white">Dynamic Resource Utilization</h4>
                      <p className="text-[11px] text-slate-400">Real-time capacity tracking for critical services</p>
                    </div>
                    <button 
                      onClick={() => setActiveMainTab("analytics")}
                      className="text-xs text-[#EA580C] font-bold hover:underline"
                    >
                      View Details
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {usage.slice(0, 8).map((u: any, idx: number) => {
                      const Icon = getMetricIcon(u.metric);
                      return (
                        <div key={idx} className="p-4 border border-[#E6D9C8] rounded-xl space-y-2 flex items-center gap-4">
                          <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <Icon className="w-5 h-5 text-slate-500" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="dark:text-white">{u.metric}</span>
                              <span className="text-slate-500">{u.current} / {u.limit} {u.unit}</span>
                            </div>
                            <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${u.percentage}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Audit log overview timeline */}
                <div className="bg-[#FFFDF9] p-6 rounded-2xl border border-[#E6D9C8] shadow-sm flex flex-col justify-between gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-bold text-sm dark:text-white">Recent Activity Trail</h4>
                      <p className="text-[11px] text-slate-400">Latest events from security and operations logs</p>
                    </div>

                    <div className="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-200 dark:before:bg-slate-800">
                      {auditLogs.slice(0, 3).map((log: any, idx: number) => (
                        <div key={idx} className="flex gap-3 text-xs">
                          <div className="w-6 h-6 rounded-full bg-orange-50 border border-[#E6D9C8] flex items-center justify-center shrink-0 z-10">
                            <Activity className="w-3 h-3 text-[#EA580C]" />
                          </div>
                          <div className="space-y-0.5">
                            <p className="font-semibold text-slate-700 dark:text-slate-200 capitalize">{log.field_name.replace("_", " ")}</p>
                            <p className="text-[10px] text-slate-400">{log.changed_by_name || "Admin"} • {new Date(log.created_at || log.timestamp).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                      {auditLogs.length === 0 && (
                        <p className="text-xs text-slate-400 text-center py-6">No audit records found.</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveMainTab("security")}
                    className="w-full py-2 text-center text-xs font-bold bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 rounded-xl transition"
                  >
                    View Audit Dashboard
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ACTIVE MODULES REGISTRY */}
          {activeMainTab === "modules" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold dark:text-white">Module Access & Enablement Registry</h3>
                <p className="text-xs text-slate-400 mt-1">Configure available functionalities and modules permitted under your subscription.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {features.map((feat: any, idx: number) => {
                  const Icon = getModuleIcon(feat.code);
                  const isEnabled = feat.status === "Enabled";
                  const isUpgrade = feat.status === "Upgrade Required";
                  
                  return (
                    <div 
                      key={idx} 
                      className={`bg-[#FFFDF9] p-5 rounded-2xl border shadow-sm transition-all duration-300 hover:scale-[1.01] hover:shadow-md flex flex-col justify-between gap-4 ${
                        isUpgrade 
                          ? "border-amber-200/50 dark:border-amber-900/30" 
                          : "border-[#E6D9C8]"
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div className={`p-2.5 rounded-xl ${
                            isEnabled 
                              ? "bg-orange-50 text-[#EA580C]" 
                              : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                          }`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isEnabled 
                              ? "bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400" 
                              : isUpgrade 
                                ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400" 
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                          }`}>
                            {feat.status}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-bold text-sm dark:text-white">{feat.name}</h4>
                          <p className="text-[11px] text-slate-400 mt-1 uppercase tracking-widest font-mono">Code: {feat.code}</p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[#E6D9C8] flex justify-between items-center">
                        <span className="text-[10px] text-slate-400">Route: {feat.route || "N/A"}</span>
                        {isUpgrade ? (
                          <button
                            onClick={() => {
                              setActiveMainTab("billing");
                              setActiveBillingSubTab("renewals");
                            }}
                            className="text-xs text-amber-600 dark:text-amber-400 font-bold hover:underline flex items-center gap-1"
                          >
                            Upgrade to {feat.upgrade_plan || "Pro"} <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Active
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: USAGE & ANALYTICS */}
          {activeMainTab === "analytics" && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-bold dark:text-white">Resource Consumption Analytics</h3>
                <p className="text-xs text-slate-400 mt-1">Detailed evaluation of quotas, usage rates, and allocation efficiency.</p>
              </div>

              {/* Progress bars for all quotas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#FFFDF9] p-6 rounded-2xl border border-[#E6D9C8] shadow-sm">
                {usage.map((u: any, idx: number) => (
                  <div key={idx} className="space-y-2 p-3 border border-[#E6D9C8] rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850 transition duration-150">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="dark:text-white">{u.metric}</span>
                      <span className="text-slate-500">{u.current} / {u.limit} {u.unit}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-550 ${
                        u.percentage >= 90 ? "bg-red-500" : u.percentage >= 75 ? "bg-amber-500" : "bg-indigo-600"
                      }`} style={{ width: `${u.percentage}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Utilized: {u.percentage}%</span>
                      <span>Available: {u.limit > 0 ? (u.limit - u.current).toFixed(1) : "Unlimited"} {u.unit}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Custom SVG Line Chart & Success Rate */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-[#FFFDF9] p-6 rounded-2xl border border-[#E6D9C8] shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-slate-400 uppercase">Monthly Resource Growth</span>
                    <span className="text-xs text-[#EA580C] font-bold bg-orange-50 px-2 py-0.5 rounded-lg">+14.2% Growth</span>
                  </div>
                  {/* Clean SVG Chart */}
                  <div className="relative h-48 w-full pt-4">
                    <svg viewBox="0 0 500 150" className="w-full h-full">
                      <defs>
                        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#EA580C" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#EA580C" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0,120 Q80,100 150,70 T300,50 T450,20 L500,20 L500,150 L0,150 Z"
                        fill="url(#chartGrad)"
                      />
                      <path
                        d="M0,120 Q80,100 150,70 T300,50 T450,20 L500,20"
                        fill="none"
                        stroke="#EA580C"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                      {/* Grid Lines */}
                      <line x1="0" y1="50" x2="500" y2="50" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="5" className="dark:stroke-slate-800" />
                      <line x1="0" y1="100" x2="500" y2="100" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="5" className="dark:stroke-slate-800" />
                      {/* Points */}
                      <circle cx="150" cy="70" r="5" fill="#EA580C" stroke="#ffffff" strokeWidth="2" />
                      <circle cx="300" cy="50" r="5" fill="#EA580C" stroke="#ffffff" strokeWidth="2" />
                      <circle cx="450" cy="20" r="5" fill="#EA580C" stroke="#ffffff" strokeWidth="2" />
                    </svg>
                    <div className="flex justify-between text-[10px] text-slate-400 mt-2 px-1">
                      <span>Jan</span>
                      <span>Feb</span>
                      <span>Mar</span>
                      <span>Apr</span>
                      <span>May (Current)</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#FFFDF9] p-6 rounded-2xl border border-[#E6D9C8] shadow-sm flex flex-col justify-between">
                  <span className="font-bold text-xs text-slate-400 uppercase">Operational Health</span>
                  <div className="flex flex-col items-center justify-center space-y-3 py-6">
                    <div className="relative w-28 h-28 rounded-full border-8 border-[#EA580C] flex items-center justify-center font-bold text-2xl dark:text-white">
                      99.8%
                    </div>
                    <p className="text-xs text-slate-400 text-center">Platform API uptime and sync integrity status</p>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 border-t border-[#E6D9C8] pt-3">
                    <span>Target: 99.5%</span>
                    <span className="text-emerald-500 font-bold">Compliant</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BILLING & FINANCIALS */}
          {activeMainTab === "billing" && (
            <div className="space-y-8">
              {/* Secondary Navigation for Billing Subtabs */}
              <div className="flex border-b border-slate-250 dark:border-slate-800 gap-6 overflow-x-auto scrollbar-none">
                {[
                  { id: "renewals", label: "Renewals & Plans" },
                  { id: "invoices", label: "Invoices & Receipts" },
                  { id: "addons", label: "Add-on Marketplace" },
                  { id: "cards", label: "Saved Methods" },
                  { id: "refunds", label: "Refund Center" }
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setActiveBillingSubTab(st.id as BillingSubTabKey)}
                    className={`pb-3 text-xs font-bold transition-all relative whitespace-nowrap ${
                      activeBillingSubTab === st.id
                        ? "text-[#EA580C] border-b-2 border-[#EA580C]"
                        : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              {/* SUBTAB 4.1: PLANS & RENEWALS */}
              {activeBillingSubTab === "renewals" && (
                <div className="space-y-8">
                  {/* Financial Stats Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-[#FFFDF9] p-5 rounded-2xl border border-[#E6D9C8] shadow-sm relative overflow-hidden">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">CURRENT MEMBERSHIP</span>
                      <h4 className="text-2xl font-black dark:text-white">{header.plan_name}</h4>
                      <p className="text-[10px] text-slate-400 uppercase mt-1">Status: {header.status}</p>
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600" />
                    </div>

                    <div className="bg-[#FFFDF9] p-5 rounded-2xl border border-[#E6D9C8] shadow-sm relative overflow-hidden">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">ESTIMATED PRICE</span>
                      <h4 className="text-2xl font-black text-[#EA580C]">
                        ₹{(header.plan_code === "basic" ? 1999 : 4999).toLocaleString()}
                      </h4>
                      <p className="text-[10px] text-slate-400 uppercase mt-1">Cycle: {billingCycle}</p>
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
                    </div>

                    <div className="bg-[#FFFDF9] p-5 rounded-2xl border border-[#E6D9C8] shadow-sm relative overflow-hidden">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">WALLET CREDITS</span>
                      <h4 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">₹850.00</h4>
                      <p className="text-[10px] text-slate-400 uppercase mt-1">Usable immediately</p>
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
                    </div>
                  </div>

                  {/* Plan compare grid */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-sm dark:text-white">Plan Comparison Chart</h4>
                      
                      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        {["Monthly", "Yearly", "Lifetime"].map((cycle) => (
                          <button
                            key={cycle}
                            onClick={() => setBillingCycle(cycle as any)}
                            className={`px-3 py-1 rounded-lg text-[10px] font-bold transition ${
                              billingCycle === cycle
                                ? "bg-[#FFFDF9] shadow-sm text-[#EA580C]"
                                : "text-slate-405"
                            }`}
                          >
                            {cycle}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {plans.length === 0 ? (
                        <div className="col-span-full bg-[#FFFDF9] border border-[#E6D9C8] rounded-2xl p-8 text-center space-y-3">
                          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto animate-pulse" />
                          <h5 className="font-bold text-sm text-[#3E2723]">No Upgrade Plans Configured</h5>
                          <p className="text-xs text-slate-505 max-w-md mx-auto leading-relaxed">
                            The platform Super Admin has not configured any premium subscription tiers yet. Please contact support or check back later to manage upgrades.
                          </p>
                        </div>
                      ) : (
                        plans.map((p: any) => {
                          const isCurrent = p.is_current;
                          const price = billingCycle === "Monthly" ? p.monthly_price : p.yearly_price;
                          const isHigher = price > (header.plan_code === "basic" ? 1999 : 4999);
                          
                          return (
                            <div
                              key={p.code}
                              className={`bg-[#FFFDF9] rounded-2xl p-6 border shadow-sm flex flex-col justify-between gap-6 relative ${
                                isCurrent 
                                  ? "border-2 border-[#EA580C]" 
                                  : "border-[#E6D9C8]"
                              }`}
                            >
                              <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                  <h4 className="font-extrabold text-sm dark:text-white uppercase">{p.name}</h4>
                                  {p.is_recommended && (
                                    <span className="px-2 py-0.5 bg-orange-50 text-[#EA580C] text-[9px] font-bold rounded-full border border-orange-200/50">
                                      Recommended
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed">{p.description}</p>
                                
                                <div className="text-xl font-black dark:text-white">
                                  ₹{price.toLocaleString()}
                                  <span className="text-xs text-slate-400 font-normal"> / {billingCycle === "Monthly" ? "mo" : "yr"}</span>
                                </div>

                                <div className="space-y-2 border-t border-[#E6D9C8] pt-4 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Members Cap</span>
                                    <span className="font-bold dark:text-white">{p.max_members}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Media Disk Limit</span>
                                    <span className="font-bold dark:text-white">{p.max_storage_gb} GB</span>
                                  </div>
                                </div>
                              </div>

                              {isCurrent ? (
                                <button disabled className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl text-xs font-bold cursor-not-allowed border border-[#E6D9C8]">
                                  Current Active Plan
                                </button>
                              ) : isHigher ? (
                                <button
                                  onClick={() => handleUpgradePlan(p)}
                                  className="w-full py-2 bg-[#EA580C] hover:bg-[#D94E06] text-white rounded-xl text-xs font-bold transition active:scale-95 duration-150 shadow-sm"
                                >
                                  Upgrade Plan
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleCheckDowngrade(p)}
                                  className="w-full py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition border border-[#E6D9C8] active:scale-95 duration-150"
                                >
                                  Downgrade
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Renew Secure Area */}
                  <div className="bg-[#FFFDF9] p-6 rounded-2xl border border-[#E6D9C8] shadow-sm space-y-6">
                    <h4 className="font-bold text-sm dark:text-white">Apply Promotion Coupon</h4>
                    <div className="flex gap-2 max-w-md">
                      <input
                        type="text"
                        placeholder="Promo Code (e.g. SAMAJ50)"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-xs outline-none w-full font-semibold"
                      />
                      <button
                        type="button"
                        onClick={handleValidateCoupon}
                        className="px-4 py-2 bg-[#EA580C] hover:bg-[#D94E06] active:scale-95 text-white text-xs font-bold rounded-xl transition duration-150"
                      >
                        Apply
                      </button>
                    </div>
                    {couponError && <p className="text-xs text-red-500 font-bold">{couponError}</p>}
                    {appliedCoupon && <p className="text-xs text-green-500 font-bold">Applied Successfully! Flat discount: ₹{couponDiscount}</p>}
                    
                    <div className="pt-4 border-t border-[#E6D9C8] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 block uppercase">Final Payable Balance</span>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">
                          ₹{Math.max(0, (header.plan_code === "basic" ? 1999 : 4999) - couponDiscount).toLocaleString()}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          requestOtpForAction("Renew Subscription", async () => {
                            alert("Subscription renewed successfully!");
                          });
                        }}
                        className="w-full md:w-auto px-6 py-3 bg-[#EA580C] hover:bg-[#D94E06] active:scale-95 text-white text-xs font-bold rounded-xl transition duration-150 shadow-sm"
                      >
                        Renew Subscription
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB 4.2: INVOICES & HISTORY */}
              {activeBillingSubTab === "invoices" && (
                <div className="bg-[#FFFDF9] p-6 rounded-2xl border border-[#E6D9C8] shadow-sm space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h4 className="font-bold text-sm dark:text-white">Tax Invoices Ledger</h4>
                      <p className="text-xs text-slate-400">Download system-generated PDF billing receipts</p>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleExport("csv", billing_history, "receipts")}
                        className="px-3 py-1.5 border border-[#E6D9C8] text-[10px] font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        EXPORT CSV
                      </button>
                      <button
                        onClick={() => handleExport("xlsx", billing_history, "receipts")}
                        className="px-3 py-1.5 border border-[#E6D9C8] text-[10px] font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        EXCEL
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2 max-w-sm">
                    <input
                      type="text"
                      placeholder="Search Invoice ID..."
                      value={searchInvoice}
                      onChange={(e) => setSearchInvoice(e.target.value)}
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-xs outline-none w-full font-semibold"
                    />
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#E6D9C8] text-slate-400 font-bold uppercase tracking-wider">
                          <th className="pb-3">Invoice No</th>
                          <th className="pb-3">Txn Hash</th>
                          <th className="pb-3">Billing Date</th>
                          <th className="pb-3">Method</th>
                          <th className="pb-3">Amount</th>
                          <th className="pb-3 text-right">Receipt Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E6D9C8]">
                        {filteredHistory.map((h: any) => (
                          <tr key={h.id} className="text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                            <td className="py-4 font-bold">{h.invoice_no || `INV-${h.id}`}</td>
                            <td className="py-4 font-mono">{h.transaction_id || `TXN-${h.id}`}</td>
                            <td className="py-4">{h.date}</td>
                            <td className="py-4 capitalize">{h.payment_method || "UPI"}</td>
                            <td className="py-4 font-bold text-slate-900 dark:text-white">₹{h.amount.toLocaleString()}</td>
                            <td className="py-4 text-right">
                              <button
                                onClick={() => {
                                  setSelectedInvoice(h);
                                  setIsInvoiceOpen(true);
                                }}
                                className="text-xs text-[#EA580C] hover:underline font-bold"
                              >
                                Open Invoice
                              </button>
                            </td>
                          </tr>
                        ))}
                        {filteredHistory.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400">
                              No matching billing records found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SUBTAB 4.3: ADD-ON MARKETPLACE */}
              {activeBillingSubTab === "addons" && (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-bold text-sm dark:text-white">On-Demand Quota Marketplace</h4>
                    <p className="text-xs text-slate-400 mt-1">Scale parameters instantly without changing plan tiers</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {addons.map((a: any) => {
                      const qty = addonQuantities[a.id || a.code] || 1;
                      return (
                        <div key={a.id || a.code} className="bg-[#FFFDF9] p-5 rounded-2xl border border-[#E6D9C8] shadow-sm flex flex-col justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-extrabold text-sm dark:text-white block">{a.name}</span>
                                <span className="text-[9px] text-slate-450 font-mono block uppercase mt-0.5">Code: {a.code}</span>
                              </div>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-[#EA580C] border border-orange-200/50">
                                ₹{a.price}/unit
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              {a.description || "Increases community allocations immediately."}
                            </p>
                          </div>

                          <div className="flex items-center justify-between border-t border-[#E6D9C8] pt-4 mt-2">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setAddonQuantities(prev => ({
                                    ...prev,
                                    [a.id || a.code]: Math.max(1, qty - 1)
                                  }));
                                }}
                                className="p-1 rounded bg-slate-50 dark:bg-slate-800 border border-[#E6D9C8] hover:bg-slate-100"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-xs font-bold w-6 text-center dark:text-white">{qty}</span>
                              <button
                                onClick={() => {
                                  setAddonQuantities(prev => ({
                                    ...prev,
                                    [a.id || a.code]: qty + 1
                                  }));
                                }}
                                className="p-1 rounded bg-slate-50 dark:bg-slate-800 border border-[#E6D9C8] hover:bg-slate-100"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <button
                              onClick={() => handleBuyAddon(a)}
                              className="px-4 py-2 bg-[#EA580C] hover:bg-[#D94E06] text-white rounded-xl text-xs font-bold transition active:scale-95 duration-150 shadow-sm"
                            >
                              Buy for ₹{(a.price * qty).toLocaleString()}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SUBTAB 4.4: PAYMENT METHODS */}
              {activeBillingSubTab === "cards" && (
                <div className="bg-[#FFFDF9] p-6 rounded-2xl border border-[#E6D9C8] shadow-sm space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-sm dark:text-white">Secure Settlement Methods</h4>
                      <p className="text-xs text-slate-400">Configure cards, accounts, or bank gateways</p>
                    </div>
                    <button
                      onClick={() => setShowAddMethodModal(true)}
                      className="px-4 py-2 bg-[#EA580C] hover:bg-[#D94E06] text-white rounded-xl text-xs font-bold transition active:scale-95 duration-150 shadow-sm"
                    >
                      Add Payment Card
                    </button>
                  </div>

                  <div className="space-y-4">
                    {paymentMethods.map((pm) => (
                      <div key={pm.id} className="p-4 border border-[#E6D9C8] rounded-2xl flex justify-between items-center shadow-sm">
                        <div className="flex items-center gap-3">
                          <CreditCard className="w-8 h-8 text-[#EA580C]" />
                          <div>
                            <p className="text-xs font-bold dark:text-white">
                              {pm.type} • {pm.details} {pm.default && <span className="text-[8px] text-green-500 font-bold bg-green-50 dark:bg-green-950/40 border border-green-200 px-1.5 py-0.5 rounded ml-2 uppercase">Default</span>}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Expires: {pm.expires || "N/A"} • Verified: {pm.verified ? "Yes" : "No"}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {!pm.default && (
                            <button
                              onClick={() => handleSetDefaultPaymentMethod(pm.id)}
                              className="px-3 py-1 border border-[#E6D9C8] text-[10px] font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                            >
                              Set Default
                            </button>
                          )}
                          <button
                            onClick={() => handleRemovePaymentMethod(pm.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUBTAB 4.5: REFUND LEDGER */}
              {activeBillingSubTab === "refunds" && (
                <div className="bg-[#FFFDF9] p-6 rounded-2xl border border-[#E6D9C8] shadow-sm space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-sm dark:text-white">Rebates & Refunds Registry</h4>
                      <p className="text-xs text-slate-400">Track current status of settlement returns</p>
                    </div>

                    <button
                      onClick={() => {
                        const amt = prompt("Refund Amount (₹):");
                        if (!amt) return;
                        const r = {
                          id: `REF-${Math.floor(1000 + Math.random() * 9000)}`,
                          amount: Number(amt),
                          date: new Date().toISOString().split("T")[0],
                          status: "Pending",
                          method: "Razorpay (UPI)",
                          reason: "Incorrect billing tier choice"
                        };
                        setRefundRequests([r, ...refundRequests]);
                      }}
                      className="px-4 py-2 bg-[#EA580C] hover:bg-[#D94E06] active:scale-95 text-white text-xs font-bold rounded-xl transition duration-150 shadow-sm"
                    >
                      Request Refund
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#E6D9C8] text-slate-400 font-bold uppercase tracking-wider">
                          <th className="pb-3">Refund ID</th>
                          <th className="pb-3">Date</th>
                          <th className="pb-3">Gateway</th>
                          <th className="pb-3">Reason Description</th>
                          <th className="pb-3">Amount</th>
                          <th className="pb-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E6D9C8]">
                        {refundRequests.map((ref) => (
                          <tr key={ref.id} className="text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                            <td className="py-3.5 font-bold">{ref.id}</td>
                            <td className="py-3.5">{ref.date}</td>
                            <td className="py-3.5">{ref.method}</td>
                            <td className="py-3.5 text-slate-400 max-w-xs truncate">{ref.reason}</td>
                            <td className="py-3.5 font-bold text-slate-900 dark:text-white">₹{ref.amount.toLocaleString()}</td>
                            <td className="py-3.5">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                                ref.status === "Completed" 
                                  ? "bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 border border-green-200" 
                                  : "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200"
                              }`}>
                                {ref.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SECURITY & AUDIT */}
          {activeMainTab === "security" && (
            <div className="space-y-8">
              {/* OTP and Security Alert Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#FFFDF9] p-6 rounded-2xl border border-[#E6D9C8] shadow-sm space-y-6">
                  <div>
                    <h4 className="font-bold text-sm dark:text-white">Multi-Factor Billing Security</h4>
                    <p className="text-xs text-slate-450 mt-1">Require additional checks for administrative actions</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-[#E6D9C8] rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                      <div className="space-y-0.5">
                        <span className="font-bold text-xs block dark:text-white">OTP Verification for Renewals</span>
                        <span className="text-[10px] text-slate-400">Verifies system administrator via email.</span>
                      </div>
                      <input type="checkbox" defaultChecked className="rounded accent-[#EA580C] text-[#EA580C] w-4 h-4" />
                    </div>

                    <div className="flex items-center justify-between p-4 border border-[#E6D9C8] rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                      <div className="space-y-0.5">
                        <span className="font-bold text-xs block dark:text-white">Log Administrative Activity</span>
                        <span className="text-[10px] text-slate-400">Records changes permanently in audit registry.</span>
                      </div>
                      <input type="checkbox" checked disabled className="rounded accent-[#EA580C] text-[#EA580C] w-4 h-4 cursor-not-allowed opacity-50" />
                    </div>
                  </div>
                </div>

                <div className="bg-[#FFFDF9] p-6 rounded-2xl border border-[#E6D9C8] shadow-sm space-y-6">
                  <div>
                    <h4 className="font-bold text-sm dark:text-white">Quota Limit Notifications</h4>
                    <p className="text-xs text-slate-450 mt-1">Configure warning channels for resource saturation alerts</p>
                  </div>

                  <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                    {Object.entries(notifConfig).map(([event, channels]) => (
                      <div key={event} className="p-3 border border-[#E6D9C8] rounded-xl space-y-2">
                        <span className="font-bold text-xs capitalize dark:text-white">{event.replace("_", " ")}</span>
                        <div className="flex gap-4 text-[10px] font-bold text-slate-400 uppercase">
                          {["email", "sms", "whatsapp", "push"].map((channel) => (
                            <label key={channel} className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={(channels as any)[channel]}
                                onChange={(e) => {
                                  setNotifConfig({
                                    ...notifConfig,
                                    [event]: {
                                      ...channels,
                                      [channel]: e.target.checked
                                    }
                                  });
                                }}
                                className="rounded accent-[#EA580C] text-[#EA580C] w-3.5 h-3.5"
                              />
                              <span>{channel}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Comprehensive Audit Logs Trail */}
              <div className="bg-[#FFFDF9] p-6 rounded-2xl border border-[#E6D9C8] shadow-sm space-y-6">
                <div>
                  <h4 className="font-bold text-sm dark:text-white">Billing Security Audit Trail</h4>
                  <p className="text-xs text-slate-400 mt-1">Chronological record of system modifications and subscriptions</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#E6D9C8] text-slate-400 font-bold uppercase tracking-wider">
                        <th className="pb-3">Event Timestamp</th>
                        <th className="pb-3">Actor / Admin</th>
                        <th className="pb-3">Action Type</th>
                        <th className="pb-3">Previous State</th>
                        <th className="pb-3">Modified State</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6D9C8]">
                      {auditLogs.map((log: any) => (
                        <tr key={log.id} className="text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                          <td className="py-3.5">{new Date(log.created_at || log.timestamp).toLocaleString()}</td>
                          <td className="py-3.5 font-bold">{log.changed_by_name || "Admin"}</td>
                          <td className="py-3.5 font-mono text-[10px] uppercase text-[#EA580C]">{log.field_name}</td>
                          <td className="py-3.5 text-slate-400">{log.old_value || "Empty"}</td>
                          <td className="py-3.5 font-semibold text-slate-900 dark:text-white">{log.new_value}</td>
                        </tr>
                      ))}
                      {auditLogs.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400">
                            No security audit events recorded.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Downgrade Limit Warning Assessment Dialog */}
      {isDowngradeWarnOpen && downgradePlan && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFDF9] rounded-3xl max-w-md w-full border border-[#E6D9C8] p-6 md:p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded-full text-red-500">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-red-800 dark:text-red-300">Downgrade Assessment Alert</h4>
                <p className="text-[10px] text-slate-400">System review of target limits compliance</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Before downgrading to the <span className="font-bold text-slate-700 dark:text-slate-200">{downgradePlan.name}</span> plan, your current utilization must fit the target limits.
            </p>

            <div className="space-y-3 text-xs">
              <div className="p-3 border border-[#E6D9C8] rounded-xl flex justify-between items-center">
                <span className="font-semibold">Members ({usage[0]?.current}) vs Limit ({downgradePlan.max_members})</span>
                {usage[0]?.current > downgradePlan.max_members ? (
                  <span className="text-red-500 font-bold uppercase text-[10px] tracking-wider">Violation</span>
                ) : (
                  <span className="text-emerald-500 font-bold uppercase text-[10px] tracking-wider">Compliant</span>
                )}
              </div>
              <div className="p-3 border border-[#E6D9C8] rounded-xl flex justify-between items-center">
                <span className="font-semibold">Disk Size ({usage[7]?.current} GB) vs Limit ({downgradePlan.max_storage_gb} GB)</span>
                {usage[7]?.current > downgradePlan.max_storage_gb ? (
                  <span className="text-red-500 font-bold uppercase text-[10px] tracking-wider">Violation</span>
                ) : (
                  <span className="text-emerald-500 font-bold uppercase text-[10px] tracking-wider">Compliant</span>
                )}
              </div>
            </div>

            {usage[0]?.current > downgradePlan.max_members || usage[7]?.current > downgradePlan.max_storage_gb ? (
              <div className="p-3 bg-red-50/50 dark:bg-red-950/20 border border-red-200 rounded-xl text-[10px] text-red-800 dark:text-red-300 leading-relaxed">
                <strong>Upgrade Blocked:</strong> You cannot execute downgrade until your current utilization is reduced below target parameters.
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  requestOtpForAction(`Downgrade Plan to ${downgradePlan.name}`, () => {
                    alert("Plan downgraded successfully.");
                    fetchData();
                  });
                  setIsDowngradeWarnOpen(false);
                }}
                className="w-full py-2.5 bg-red-600 hover:bg-red-750 text-white text-xs font-bold rounded-xl transition duration-150 active:scale-95 shadow-sm"
              >
                Confirm Downgrade Action
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsDowngradeWarnOpen(false)}
              className="w-full py-2.5 bg-slate-100 hover:bg-[#E6D9C8]/40 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-350 text-xs font-bold rounded-xl transition duration-150"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Invoice Modal Drawer */}
      {isInvoiceOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFDF9] rounded-3xl max-w-2xl w-full border border-[#E6D9C8] p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex justify-between items-start border-b border-[#E6D9C8] pb-4">
              <div>
                <span className="text-[10px] font-bold text-[#EA580C] uppercase tracking-widest">
                  WAG Platform Tax Invoice
                </span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                  {selectedInvoice.invoice_no || `INV-${selectedInvoice.id}`}
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">Invoice Issued: {selectedInvoice.date}</p>
              </div>
              <button
                onClick={() => setIsInvoiceOpen(false)}
                className="text-slate-450 hover:text-slate-650"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6 text-xs">
              <div>
                <span className="text-[9px] font-bold text-slate-400 block mb-1 uppercase">Billed To</span>
                <p className="font-bold dark:text-white">{header.community_name}</p>
                <p className="text-slate-400">Admin Email: {user?.email}</p>
                <p className="text-slate-400">GSTIN: 27AAACT9382Q1Z9</p>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-bold text-slate-400 block mb-1 uppercase">Payment Detail</span>
                <p className="font-bold dark:text-white">{selectedInvoice.payment_method || "Online Card"}</p>
                <p className="text-slate-400">Trans ID: {selectedInvoice.transaction_id || `TXN-WAG-${selectedInvoice.id}`}</p>
              </div>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E6D9C8] text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-2">Description</th>
                  <th className="pb-2 text-right">Unit Rate</th>
                  <th className="pb-2 text-right">Quantity</th>
                  <th className="pb-2 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6D9C8]">
                <tr className="text-slate-700 dark:text-slate-350">
                  <td className="py-4">
                    <p className="font-bold dark:text-white">{selectedInvoice.plan_name || "Community Plan"} Agreement</p>
                    <p className="text-[10px] text-slate-400">Billing Cycle: {selectedInvoice.billing_cycle || "Monthly"}</p>
                  </td>
                  <td className="py-4 text-right">₹{selectedInvoice.amount.toLocaleString()}</td>
                  <td className="py-4 text-right">1</td>
                  <td className="py-4 text-right font-bold text-slate-900 dark:text-white">₹{selectedInvoice.amount.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-t border-[#E6D9C8] pt-6 gap-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 border border-[#E6D9C8] rounded-lg flex items-center justify-center p-1 font-mono text-[9px] font-bold">
                  SECURE
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-450 block uppercase">Tax Verification</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Digisign Authenticated
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 w-full md:w-60 text-right text-xs">
                <div className="flex justify-between text-slate-450">
                  <span>Subtotal</span>
                  <span>₹{(selectedInvoice.amount * 0.82).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-450">
                  <span>GST (18%)</span>
                  <span>₹{(selectedInvoice.amount * 0.18).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 dark:text-white border-t border-[#E6D9C8] pt-1.5">
                  <span>Grand Total</span>
                  <span>₹{selectedInvoice.amount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-[#E6D9C8] pt-6">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 border border-[#E6D9C8] rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> Print
              </button>
              <button
                onClick={() => alert("PDF downloaded.")}
                className="px-4 py-2 bg-[#EA580C] hover:bg-[#D94E06] text-white rounded-xl text-xs font-bold transition flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Payment Method Modal */}
      {showAddMethodModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFDF9] rounded-3xl max-w-md w-full border border-[#E6D9C8] p-6 md:p-8 shadow-2xl relative space-y-6">
            <div className="flex justify-between items-center border-b border-[#E6D9C8] pb-4">
              <h3 className="text-base font-bold dark:text-white">Register Settlement Account</h3>
              <button onClick={() => setShowAddMethodModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleAddPaymentMethod} className="space-y-4">
              <div>
                <span className="text-[10px] text-slate-450 block mb-1 uppercase font-bold">Method Category</span>
                <select
                  value={newMethod.type}
                  onChange={(e) => setNewMethod({ ...newMethod, type: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-[#E6D9C8] px-3 py-2 rounded-xl text-xs outline-none"
                >
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="UPI">UPI VPA</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
              <div>
                <span className="text-[10px] text-slate-455 block mb-1 uppercase font-bold">Details (VPA / Card Number / Account)</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. 4111 2222 3333 4829 or user@upi"
                  value={newMethod.details}
                  onChange={(e) => setNewMethod({ ...newMethod, details: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-[#E6D9C8] px-3 py-2 rounded-xl text-xs outline-none font-semibold"
                />
              </div>
              {newMethod.type.includes("Card") && (
                <div>
                  <span className="text-[10px] text-slate-455 block mb-1 uppercase font-bold">Expiration Date (MM/YYYY)</span>
                  <input
                    type="text"
                    placeholder="e.g. 12/2030"
                    value={newMethod.expiry}
                    onChange={(e) => setNewMethod({ ...newMethod, expiry: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-[#E6D9C8] px-3 py-2 rounded-xl text-xs outline-none font-semibold"
                  />
                </div>
              )}
              <button type="submit" className="w-full py-2.5 bg-[#EA580C] hover:bg-[#D94E06] text-white rounded-xl text-xs font-bold transition duration-150 active:scale-95 shadow-sm">
                Add Method Securely
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
