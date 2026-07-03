import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Crown,
  Sparkles,
  CheckCircle2,
  XCircle,
  Calendar,
  AlertCircle,
  ShieldCheck,
  Loader2,
  ArrowRight,
  CreditCard,
  Lock,
  LifeBuoy,
  FileText,
  Clock,
  Briefcase,
  Copy,
  Check,
  RefreshCw,
  Search,
  MessageSquare,
  Heart,
  Database,
  Cpu,
  Award,
  Info,
  TrendingUp,
  FileSpreadsheet,
  AlertTriangle,
  Users,
  Building2,
  Box,
  MapPin,
  HelpCircle,
  Activity,
  CheckSquare
} from "lucide-react";
import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";

export const Route = createFileRoute("/dashboard/subscription")({
  component: MemberSubscriptionDashboard,
});

// Category metadata for icons and styles
const CATEGORY_META: Record<string, { title: string; desc: string; icon: any; color: string; bg: string; text: string }> = {
  messaging: { title: "Communication Suite", desc: "Direct messages and group chats", icon: MessageSquare, color: "border-l-indigo-500", bg: "bg-indigo-50", text: "text-indigo-600" },
  directory: { title: "Community Directory", desc: "Search and connect with other members", icon: Users, color: "border-l-emerald-500", bg: "bg-emerald-50", text: "text-emerald-600" },
  business: { title: "Business Listings", desc: "Showcase businesses in Samaj registry", icon: Building2, color: "border-l-amber-500", bg: "bg-amber-50", text: "text-amber-600" },
  jobs: { title: "Jobs Board", desc: "Post vacancies and apply for roles", icon: Briefcase, color: "border-l-blue-500", bg: "bg-blue-50", text: "text-blue-600" },
  events: { title: "Events Registration", desc: "Access community gatherings and events", icon: Calendar, color: "border-l-rose-500", bg: "bg-rose-50", text: "text-rose-600" },
  property: { title: "Venue & Property Booking", desc: "Rent or book community spaces", icon: MapPin, color: "border-l-sky-500", bg: "bg-sky-50", text: "text-sky-600" },
  donations: { title: "Donations & Funds", desc: "Contribute to fundraisers and charity", icon: Award, color: "border-l-pink-500", bg: "bg-pink-50", text: "text-pink-600" },
  ads: { title: "Business Ads Promotions", desc: "Advertise services on community banners", icon: Sparkles, color: "border-l-orange-500", bg: "bg-orange-50", text: "text-orange-600" },
  ai: { title: "AI Custom Features", desc: "Smart compatibility and matches", icon: Cpu, color: "border-l-purple-500", bg: "bg-purple-50", text: "text-purple-600" },
  matrimony: { title: "Matrimony Connect", desc: "Unlock bride/groom search profiles", icon: Heart, color: "border-l-red-500", bg: "bg-red-50", text: "text-red-600" },
  storage: { title: "Cloud & Media Storage", desc: "Upload docs and media assets", icon: Box, color: "border-l-cyan-500", bg: "bg-cyan-50", text: "text-cyan-600" },
  committee: { title: "Committee Access", desc: "Access committee board and decisions", icon: Users, color: "border-l-amber-600", bg: "bg-amber-50", text: "text-amber-700" },
  venues: { title: "Venues Access", desc: "Browse community halls and grounds", icon: MapPin, color: "border-l-emerald-600", bg: "bg-emerald-50", text: "text-emerald-700" },
  attendance: { title: "Attendance Access", desc: "Track and mark attendance registers", icon: CheckSquare, color: "border-l-indigo-600", bg: "bg-indigo-50", text: "text-indigo-700" },
  subsidiaries: { title: "Subsidiaries Access", desc: "Browse board members of subsidiaries", icon: Building2, color: "border-l-violet-600", bg: "bg-violet-50", text: "text-violet-700" },
};

const getCategoryMeta = (cat: string) => {
  return CATEGORY_META[cat.toLowerCase()] || {
    title: cat.charAt(0).toUpperCase() + cat.slice(1) + " Module",
    desc: `Manage ${cat} allocations`,
    icon: Info,
    color: "border-l-slate-400",
    bg: "bg-slate-50",
    text: "text-slate-600"
  };
};

const SubscriptionSkeleton = () => {
  return (
    <div className="p-4 md:p-6 space-y-8 bg-[#FCF8F4] min-h-screen animate-pulse">
      <div className="h-10 bg-slate-200 rounded-xl w-1/3" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="h-64 bg-slate-200 rounded-3xl" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-20 bg-slate-200 rounded-2xl" />
            <div className="h-20 bg-slate-200 rounded-2xl" />
            <div className="h-20 bg-slate-200 rounded-2xl" />
          </div>
        </div>
        <div className="space-y-8">
          <div className="h-48 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    </div>
  );
};

function MemberSubscriptionDashboard() {
  const { user } = useAuth();
  const [membership, setMembership] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Dialog & Form states
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<any>(null);
  const [upgradeBillingCycle, setUpgradeBillingCycle] = useState<string>("monthly");
  const [paymentMethod, setPaymentMethod] = useState("Razorpay");
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Cancellation States
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const loadSubscriptionData = async () => {
    setLoading(true);
    try {
      const data = await api.getMemberMyMembership();
      setMembership(data);
    } catch (e) {
      console.error("Failed to load subscription data", e);
      toast.error("Failed to load subscription details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const getAvailableCycles = (plan: any) => {
    if (!plan) return [];
    const cycles = [];
    if (parseFloat(plan.monthly_price || 0) >= 0 && plan.monthly_price !== null) {
      cycles.push({ code: "monthly", label: "Monthly", price: parseFloat(plan.monthly_price || 0) });
    }
    if (parseFloat(plan.quarterly_price || 0) > 0) {
      cycles.push({ code: "quarterly", label: "Quarterly", price: parseFloat(plan.quarterly_price) });
    }
    if (parseFloat(plan.half_yearly_price || 0) > 0) {
      cycles.push({ code: "half_yearly", label: "Half Yearly", price: parseFloat(plan.half_yearly_price) });
    }
    if (parseFloat(plan.yearly_price || 0) > 0) {
      cycles.push({ code: "yearly", label: "Yearly", price: parseFloat(plan.yearly_price) });
    }
    if (parseFloat(plan.lifetime_price || 0) > 0) {
      cycles.push({ code: "lifetime", label: "Lifetime", price: parseFloat(plan.lifetime_price) });
    }
    return cycles;
  };

  const getNextRenewalDate = (cycle: string) => {
    const d = new Date();
    if (cycle === "monthly") d.setMonth(d.getMonth() + 1);
    else if (cycle === "quarterly") d.setMonth(d.getMonth() + 3);
    else if (cycle === "half_yearly") d.setMonth(d.getMonth() + 6);
    else if (cycle === "yearly") d.setFullYear(d.getFullYear() + 1);
    else if (cycle === "lifetime") return "Lifetime Access";
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  const handleValidateCoupon = async (planPrice: number) => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    setCouponError("");
    setCouponDiscount(0);
    try {
      const res = await api.validateMemberPremiumCoupon({
        code: couponCode,
        amount: planPrice
      });
      if (res.valid) {
        setCouponDiscount(res.discount_amount);
        toast.success(`Coupon applied! Saved ₹${res.discount_amount}`);
      } else {
        setCouponError(res.message || "Invalid coupon code");
      }
    } catch (err: any) {
      setCouponError("Could not validate coupon");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode("");
    setCouponDiscount(0);
    setCouponError("");
    toast.info("Coupon removed.");
  };

  const handleUpgradePlan = async (planId: number, planName: string) => {
    if (!membership) return;
    setSubmittingPayment(true);
    try {
      const res = await api.upgradeMemberPremiumSubscription(membership.id, {
        plan_id: planId,
        billing_cycle: upgradeBillingCycle,
        payment_method: paymentMethod,
        coupon: couponCode || undefined
      });
      toast.success(`Successfully upgraded to ${res.plan_name || planName}!`);
      setIsUpgradeOpen(false);
      setCouponCode("");
      setCouponDiscount(0);
      window.dispatchEvent(new Event("subscription-updated"));
      loadSubscriptionData();
    } catch (err: any) {
      toast.error("Upgrade check-out failed. Please try again.");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleCancelAutoRenew = async () => {
    if (!membership) return;
    try {
      await api.cancelMemberPremiumSubscription(membership.id, {
        reason: cancelReason
      });
      toast.success("Subscription auto-renewal cancelled.");
      setShowCancelModal(false);
      window.dispatchEvent(new Event("subscription-updated"));
      loadSubscriptionData();
    } catch (err) {
      toast.error("Failed to cancel subscription auto-renewal.");
    }
  };

  if (loading) return <SubscriptionSkeleton />;

  const plansList = membership?.all_plans || [];
  const currentPlanId = typeof membership?.plan === "object" ? membership.plan?.id : membership?.plan;
  const currentPlan = plansList.find((p: any) => p.id === currentPlanId) || {
    name: membership?.plan_name || "Free Plan",
    code: membership?.plan_code || "free",
    plan_type: membership?.plan_type || "free",
    short_description: "Basic membership tier",
    monthly_price: 0,
    yearly_price: 0,
    features: [],
    benefits: []
  };

  const usagesList = (membership?.usages || []).filter((usage: any) => {
    const planFeature = currentPlan?.features?.find((f: any) => f.feature_code === usage.feature_code);
    return planFeature?.is_enabled;
  });

  // Filter out current plan and Free plan from upgrade list, keeping higher plans only
  const currentMonthlyPrice = currentPlan ? parseFloat(currentPlan.monthly_price || 0) : 0;
  const upgradePlans = plansList.filter((p: any) => {
    if (p.code === "free") return false;
    return p.code !== currentPlan?.code;
  });

  // Calculate price breakdown for upgrade dialog
  const selectedUpgradePriceItem = getAvailableCycles(selectedPlanForUpgrade).find(c => c.code === upgradeBillingCycle);
  const upgradeBasePrice = selectedUpgradePriceItem ? selectedUpgradePriceItem.price : 0;
  const upgradeGST = Math.round((upgradeBasePrice - couponDiscount) * 0.18 * 100) / 100;
  const upgradeTotal = Math.max(0, Math.round((upgradeBasePrice - couponDiscount + upgradeGST) * 100) / 100);

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, string> = {
      active: "bg-emerald-100 text-emerald-800 border-emerald-200",
      trial: "bg-blue-100 text-blue-800 border-blue-200",
      expired: "bg-slate-100 text-slate-800 border-slate-200",
      cancelled: "bg-amber-100 text-amber-800 border-amber-200",
      suspended: "bg-rose-100 text-rose-800 border-rose-200",
    };
    const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown";
    return (
      <span className={`px-2.5 py-1 text-xs font-black rounded-full border ${statusMap[status] || "bg-gray-100 text-gray-800 border-gray-200"}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-8 bg-[#FCF8F4] min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#F0E6D8] pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            <Crown className="w-7 h-7 text-[#EA580C] fill-[#EA580C]/20" /> My Subscription
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage your membership level, benefits, and subscription upgrades.</p>
        </div>
      </div>

      {membership?.status === 'trial' && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse-subtle">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-300 fill-yellow-300" />
              <h3 className="font-black text-lg">You are on a Free Trial!</h3>
            </div>
            <p className="text-xs text-white/95 font-medium">Enjoy unlimited premium tools and community features. Upgrade today to avoid service interruption.</p>
          </div>
          <div className="flex items-center gap-4 bg-white/10 px-4 py-2.5 rounded-2xl backdrop-blur-md border border-white/20 self-start md:self-auto">
            <div className="text-center">
              <div className="text-2xl font-black">{membership?.days_remaining || 0}</div>
              <div className="text-[9px] uppercase tracking-wider font-bold opacity-80">Days Left</div>
            </div>
            <Button 
              onClick={() => {
                if (upgradePlans.length > 0) {
                  setSelectedPlanForUpgrade(upgradePlans[0]);
                  const cycles = getAvailableCycles(upgradePlans[0]);
                  if (cycles.length > 0) {
                    setUpgradeBillingCycle(cycles[0].code);
                  }
                  setIsUpgradeOpen(true);
                } else {
                  toast.error("No higher plans available at this moment.");
                }
              }}
              className="bg-white hover:bg-slate-50 text-orange-600 text-xs font-black px-4 py-2 rounded-xl shadow-md transition"
            >
              Upgrade Now
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Side: Current active plan & details */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-[#F0E6D8] shadow-sm overflow-hidden bg-white/70 backdrop-blur-md rounded-3xl">
            <CardHeader className="relative p-6 border-b border-[#F5ECE0] bg-gradient-to-r from-[#FFFDF9] to-white">
              <div className="absolute top-0 right-0 p-6 flex flex-col items-end gap-2">
                {getStatusBadge(membership?.status)}
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#FFF8EE] flex items-center justify-center border border-[#FBEAD4]">
                  <Crown className="w-6 h-6 text-[#EA580C]" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black text-slate-800">
                    {currentPlan?.name || "Free Plan"}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    {currentPlan?.short_description || "Basic membership tier"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Plan Pricing Card Block */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#FFFDF9] border border-[#FBEAD4] rounded-2xl p-4 flex flex-col justify-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Plan Cost</span>
                  <span className="text-2xl font-black text-slate-800 mt-1">
                    {currentPlan?.code === "free" ? "Free" : `₹${membership?.billing_cycle === "yearly" ? (currentPlan?.yearly_price || 0) : (currentPlan?.monthly_price || 0)}`}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 font-semibold capitalize">
                    Per {membership?.billing_cycle || "month"}
                  </span>
                </div>
                <div className="bg-[#FFFDF9] border border-[#FBEAD4] rounded-2xl p-4 flex flex-col justify-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Renewal Date</span>
                  <span className="text-sm font-black text-slate-800 mt-1.5 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {membership?.end_date ? new Date(membership.end_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Lifetime Access"}
                  </span>
                  <span className="text-[10px] text-[#EA580C] mt-0.5 font-bold">
                    {membership?.end_date ? `${membership.days_remaining} Days Remaining` : "No expiry"}
                  </span>
                </div>
                <div className="bg-[#FFFDF9] border border-[#FBEAD4] rounded-2xl p-4 flex flex-col justify-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Billing Type</span>
                  <span className="text-sm font-black text-slate-800 mt-1.5 capitalize flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-slate-400" />
                    {membership?.billing_cycle || "N/A"}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 font-semibold">
                    {membership?.auto_renew ? "Auto-renew active" : "Non-renewing"}
                  </span>
                </div>
              </div>

              {/* Dynamic Benefits & What's Included */}
              <div className="space-y-4 pt-2">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" /> Current Plan Features
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Map Category Modules exactly */}
                  {(() => {
                    const enabledCategories = Array.from(new Set(
                      currentPlan?.features
                        ?.filter((f: any) => f.is_enabled)
                        .map((f: any) => f.category?.toLowerCase())
                        .filter((cat: string) => cat && CATEGORY_META[cat])
                    )) as string[];
                    
                    if (enabledCategories.length === 0) {
                      return <div className="col-span-2 text-center py-6 text-xs text-slate-400">No premium modules enabled for this tier.</div>;
                    }
                    
                    return enabledCategories.map((cat: string) => {
                      const meta = CATEGORY_META[cat];
                      return (
                        <div key={cat} className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          <span className="text-xs font-bold text-slate-800">{meta.title}</span>
                        </div>
                      );
                    });
                  })()}
                </div>
                
                {currentPlan?.benefits?.filter((b: any) => b.is_included).length > 0 && (
                  <div className="pt-3 border-t border-dashed border-slate-200 mt-4">
                    <h4 className="text-xs font-bold text-slate-600 mb-3">Additional Benefits</h4>
                    <div className="space-y-2">
                      {currentPlan.benefits.filter((b: any) => b.is_included).map((benefit: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-slate-800">{benefit.title}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{benefit.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Resource Quota Progress Bars */}
              {usagesList.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-dashed border-slate-200">
                  <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#EA580C]" /> Feature Usage & Quotas
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {usagesList.map((usage: any) => {
                      const meta = getCategoryMeta(usage.category);
                      return (
                        <div key={usage.feature_code} className="p-4 rounded-2xl bg-white border border-[#F0E6D8] space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              {React.createElement(meta.icon, { className: `w-4 h-4 ${meta.text}` })}
                              {usage.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                              Used: {usage.used_count} | {usage.is_unlimited ? "Unlimited" : `Remaining: ${Math.max(0, usage.limit_value - usage.used_count)}`}
                            </span>
                          </div>
                          {!usage.is_unlimited && (
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#EA580C] rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, Math.round((usage.used_count / usage.limit_value) * 100))}%` }}
                              />
                            </div>
                          )}
                          <p className="text-[10px] text-slate-500">{usage.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
            {membership?.auto_renew && (
              <CardFooter className="px-6 py-4 bg-slate-50 border-t border-[#F5ECE0] flex justify-between items-center">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <AlertCircle className="w-4 h-4 text-[#EA580C]" />
                  Auto-renewal is active.
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setShowCancelModal(true)}
                  className="text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                >
                  Cancel Auto-Renewal
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>

        {/* Right Side: Upgrades Available */}
        <div className="space-y-6">
          <div className="bg-white/80 border border-[#F0E6D8] rounded-3xl p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-[#EA580C]" /> Available Upgrades
            </h2>

            <div className="space-y-4">
              {upgradePlans.map((plan: any) => (
                <div key={plan.id} className="border border-[#FBEAD4] rounded-2xl p-4 bg-[#FFFDF9] hover:shadow-md transition-all duration-300">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                        <Crown className="w-4 h-4 text-[#EA580C]" /> {plan.name}
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">{plan.short_description}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-slate-800">₹{plan.monthly_price}</span>
                      <span className="text-[9px] text-slate-400 block font-semibold">/ month</span>
                    </div>
                  </div>

                  {/* Included benefits summary */}
                  <div className="mt-3 space-y-1">
                    {plan.benefits?.filter((b: any) => b.is_included).slice(0, 3).map((b: any, i: number) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-[10px] text-slate-500 truncate">{b.title}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={() => {
                      setSelectedPlanForUpgrade(plan);
                      const cycles = getAvailableCycles(plan);
                      if (cycles.length > 0) {
                        setUpgradeBillingCycle(cycles[0].code);
                      }
                      setIsUpgradeOpen(true);
                    }}
                    className="w-full mt-4 bg-[#EA580C] hover:bg-[#D94E03] text-white text-xs font-black py-2 rounded-xl"
                  >
                    Upgrade Now
                  </Button>
                </div>
              ))}

              {upgradePlans.length === 0 && (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl">
                  <Award className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-bold">You are on the highest plan tier!</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Thank you for being a premium member.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade checkout Dialog */}
      <Dialog open={isUpgradeOpen} onOpenChange={setIsUpgradeOpen}>
        <DialogContent className="max-w-md bg-white border border-[#F0E6D8] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#EA580C]" /> Upgrade to {selectedPlanForUpgrade?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Select billing frequency and confirm your upgrade checkout.
            </DialogDescription>
          </DialogHeader>

          {selectedPlanForUpgrade && (
            <div className="space-y-5 pt-3">
              {/* Billing frequency selectors */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Billing Frequency</label>
                <div className="grid grid-cols-2 gap-2">
                  {getAvailableCycles(selectedPlanForUpgrade).map(cycle => (
                    <button
                      key={cycle.code}
                      onClick={() => {
                        setUpgradeBillingCycle(cycle.code);
                        setCouponDiscount(0);
                        setCouponCode("");
                        setCouponError("");
                      }}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                        upgradeBillingCycle === cycle.code
                          ? "border-[#EA580C] bg-[#FFF8EE]"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <span className="text-xs font-bold text-slate-800">{cycle.label}</span>
                      <span className="text-sm font-black text-[#EA580C] mt-0.5">₹{cycle.price}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Coupon discount codes */}
              {membership?.coupons && membership.coupons.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Promo Coupon Code</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value.toUpperCase())}
                      disabled={couponDiscount > 0 || validatingCoupon}
                      className="h-10 text-xs rounded-xl border-[#FBEAD4] bg-[#FFFDF9] uppercase"
                    />
                    {couponDiscount > 0 ? (
                      <Button variant="outline" onClick={handleRemoveCoupon} className="h-10 text-xs px-3 border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl">
                        Remove
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleValidateCoupon(upgradeBasePrice)}
                        disabled={validatingCoupon || !couponCode.trim()}
                        className="h-10 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-4 rounded-xl"
                      >
                        {validatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                      </Button>
                    )}
                  </div>
                  {couponError && <p className="text-[10px] text-rose-600 font-bold mt-1">{couponError}</p>}
                </div>
              )}

              {/* Payment Methods */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-[#FFFDF9] border border-[#FBEAD4] rounded-xl outline-none"
                >
                  <option value="Razorpay">Razorpay Checkout (UPI, Card, NetBanking)</option>
                  <option value="Manual">Bank Transfer / Cash Payment</option>
                </select>
              </div>

              {/* Checkout pricing breakdown summary */}
              <div className="bg-[#FFFDF9] border border-[#FBEAD4] rounded-2xl p-4 space-y-2.5">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Base Price ({upgradeBillingCycle})</span>
                  <span className="font-bold text-slate-800">₹{upgradeBasePrice}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-xs text-emerald-600">
                    <span>Coupon Discount</span>
                    <span className="font-bold">-₹{couponDiscount}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-slate-500">
                  <span>18% GST</span>
                  <span className="font-bold text-slate-800">₹{upgradeGST}</span>
                </div>
                <div className="h-px bg-slate-200 my-1" />
                <div className="flex justify-between text-sm font-black text-slate-800">
                  <span>Total Amount Payable</span>
                  <span className="text-[#EA580C]">₹{upgradeTotal}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setIsUpgradeOpen(false)}
              className="text-xs font-bold border-slate-200 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleUpgradePlan(selectedPlanForUpgrade.id, selectedPlanForUpgrade.name)}
              disabled={submittingPayment}
              className="bg-[#EA580C] hover:bg-[#D94E03] text-white text-xs font-black px-5 rounded-xl"
            >
              {submittingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm & Pay"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto-renewal cancellation modal */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="max-w-md bg-white border border-[#F0E6D8] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" /> Cancel Auto-Renewal
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Are you sure you want to stop automatic renewal? You will retain access until the end of your billing cycle.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-3">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Feedback / Reason for cancellation (Optional)</label>
            <textarea
              placeholder="Please let us know how we can improve..."
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              className="w-full h-24 p-3 text-xs bg-[#FFFDF9] border border-[#FBEAD4] rounded-xl outline-none resize-none"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCancelModal(false)}
              className="text-xs font-bold border-slate-200 rounded-xl"
            >
              Keep Subscription
            </Button>
            <Button
              onClick={handleCancelAutoRenew}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-black px-5 rounded-xl"
            >
              Cancel Auto-Renewal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default MemberSubscriptionDashboard;
