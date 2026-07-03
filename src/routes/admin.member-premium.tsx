import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  LayoutDashboard, CreditCard, ShieldCheck, Box, HelpCircle, FileText, CheckCircle2,
  AlertTriangle, XCircle, ArrowUpCircle, RefreshCw, Layers, HardDrive, MessageSquare,
  Users, UserCog, Calendar, Image, Heart, Briefcase, Building2, MapPin, HandHeart,
  FileBarChart, DollarSign, Download, Printer, Percent, AlertCircle, Sparkles, Send,
  ChevronRight, BadgePercent, Terminal, Phone, Mail, Clock, Plus, Minus, Lock, Eye, Copy, Trash,
  Settings, TrendingUp, Settings2, BellRing, FileSpreadsheet, ShieldAlert, Award, ToggleLeft,
  Edit2, Archive, X, Trophy, Rocket, Bolt, ArrowLeft, ArrowRight, Gem, Crown, Upload
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageWrap } from "@/components/wag/PageWrap";

export const Route = createFileRoute("/admin/member-premium")({
  component: SuperAdminMemberPremium,
});

const groups = [
  {
    id: "overview",
    label: "Overview & Insights",
    tabs: ["dashboard", "analytics", "audit"]
  },
  {
    id: "plans_matrix",
    label: "Plans & Feature Matrices",
    tabs: ["plans", "features", "matrix", "addons"]
  },
  {
    id: "memberships",
    label: "Member Subscriptions",
    tabs: ["members", "assignments", "trials"]
  },
  {
    id: "finance",
    label: "Finance & Sales Ledger",
    tabs: ["billing", "transactions", "coupons"]
  },
  {
    id: "settings_group",
    label: "Console Settings",
    tabs: ["notifications", "settings"]
  }
];

const tabNamesMap: Record<string, { label: string; icon: any }> = {
  dashboard: { label: "Workspace Dashboard", icon: LayoutDashboard },
  plans: { label: "Premium Plans", icon: Award },
  features: { label: "Premium Features", icon: Box },
  matrix: { label: "Feature Matrix Config", icon: Layers },
  members: { label: "Active Member Registry", icon: Users },
  assignments: { label: "Manual Assignments", icon: UserCog },
  billing: { label: "Billing & Revenue Analytics", icon: DollarSign },
  coupons: { label: "Coupons & Promos", icon: Percent },
  trials: { label: "Trial Policy Manager", icon: Clock },
  addons: { label: "Add-ons Catalog", icon: HardDrive },
  transactions: { label: "Transactions Ledger", icon: FileSpreadsheet },
  notifications: { label: "System Notification Logs", icon: BellRing },
  analytics: { label: "Advanced Insights", icon: FileBarChart },
  audit: { label: "Security Audit Trail", icon: ShieldCheck },
  settings: { label: "Global Subscription Settings", icon: Settings },
};

type SuperTabKey =
  | "dashboard"
  | "plans"
  | "features"
  | "matrix"
  | "members"
  | "assignments"
  | "billing"
  | "coupons"
  | "trials"
  | "addons"
  | "transactions"
  | "notifications"
  | "analytics"
  | "audit"
  | "settings";

function SuperAdminMemberPremium() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SuperTabKey>("dashboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lists from APIs
  const [plans, setPlans] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [features, setFeatures] = useState<any[]>([]);
  const [addons, setAddons] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);

  // Filter & Search states
  const [memberSearch, setMemberSearch] = useState("");
  const [memberPlanFilter, setMemberPlanFilter] = useState("all");
  const [memberStatusFilter, setMemberStatusFilter] = useState("all");

  // Transaction Search
  const [txnSearch, setTxnSearch] = useState("");

  // Modals & Forms states
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [activePreviewCycle, setActivePreviewCycle] = useState("monthly");
  const [featureRegistry, setFeatureRegistry] = useState<any[]>([]);
  const [dashboardModules, setDashboardModules] = useState<any[]>([]);
  const [featureSearch, setFeatureSearch] = useState("");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

  const [planForm, setPlanForm] = useState({
    name: "",
    code: "",
    plan_type: "custom",
    short_description: "",
    description: "",
    color_theme: "#EA580C",
    icon: "Crown",
    monthly_price: 0,
    quarterly_price: 0,
    half_yearly_price: 0,
    yearly_price: 0,
    lifetime_price: 0,
    currency: "INR",
    gst_percentage: 18,
    discount_percentage: 0,
    trial_days: 14,
    grace_period_days: 7,
    status: "active",
    display_order: 1,
    display_badge: "",
    is_popular: false,
    is_recommended: false,
    is_best_seller: false,
    is_trial: false,
    auto_renew_enabled: true,
    coupon_applicable: true,
    metadata: {
      category: "premium",
      visibility: "public",
      tax_type: "exclusive",
      custom_pricing_allowed: false,
      trial_features: [] as string[],
      trial_restrictions: "",
      referral_discount: 0,
      festival_offer: "",
      renewal_discount: 0,
      downgrade_rules: "",
      auto_expiry: false,
      permissions: {} as Record<string, Record<string, boolean>>,
    },
    features: [] as any[],
    benefits: [] as any[],
  });

  // Feature Registry Form
  const [isFeatureModalOpen, setIsFeatureModalOpen] = useState(false);
  const [featureForm, setFeatureForm] = useState({
    name: "",
    feature_code: "",
    description: "",
    category: "general",
    is_enabled: true,
    is_unlimited: false,
    limit_value: 100,
    upgrade_message: ""
  });

  // Coupon Form
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: "",
    coupon_type: "percentage",
    discount_value: 10,
    max_discount_amount: 500,
    minimum_amount: 100,
    usage_limit: 100,
    expiry_date: ""
  });

  // Assignment Form
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({
    member_id: "",
    plan_id: "",
    billing_cycle: "monthly",
    amount_paid: 0,
    payment_method: "Manual",
    notes: ""
  });

  // Addon Form
  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);
  const [addonForm, setAddonForm] = useState({
    name: "",
    code: "",
    description: "",
    price: 0,
    billing_cycle: "Monthly",
    limit_type: "extra_members",
    limit_value: 0,
    active: true
  });

  const renderAddonModal = () => {
    if (!isAddonModalOpen) return null;
    return (
      <Dialog open={isAddonModalOpen} onOpenChange={setIsAddonModalOpen}>
        <DialogContent className="bg-white border-[#E6D9C8] max-w-md rounded-3xl p-8 text-slate-800 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-950">Define New Plan Add-on</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Create purchasable quota extensions (credits, space).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api.createMemberPremiumAddon(addonForm);
              toast.success("Add-on created successfully!");
              setIsAddonModalOpen(false);
              fetchData();
            } catch (err: any) {
              toast.error(err.message || "Failed to create addon.");
            }
          }} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1">Add-on Name *</span>
                <Input
                  required
                  value={addonForm.name}
                  onChange={e => setAddonForm({ ...addonForm, name: e.target.value })}
                  placeholder="e.g. Extra 500 Members"
                  className="border-[#E6D9C8] h-10 text-xs bg-[#FCF5EC]"
                />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1">Unique Code *</span>
                <Input
                  required
                  value={addonForm.code}
                  onChange={e => setAddonForm({ ...addonForm, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                  placeholder="e.g. extra_members_500"
                  className="border-[#E6D9C8] h-10 text-xs bg-[#FCF5EC]"
                />
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-700 block mb-1">Description</span>
              <textarea
                value={addonForm.description}
                onChange={e => setAddonForm({ ...addonForm, description: e.target.value })}
                placeholder="Describe what resources this extension unlocks..."
                className="w-full p-2.5 bg-[#FCF5EC] border border-[#E6D9C8] rounded-xl text-xs min-h-[60px] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1">Price (₹)</span>
                <Input
                  type="number"
                  value={addonForm.price}
                  onChange={e => setAddonForm({ ...addonForm, price: parseInt(e.target.value) || 0 })}
                  className="border-[#E6D9C8] h-10 text-xs bg-[#FCF5EC]"
                />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1">Billing Cycle</span>
                <select
                  value={addonForm.billing_cycle}
                  onChange={e => setAddonForm({ ...addonForm, billing_cycle: e.target.value })}
                  className="w-full bg-[#FCF5EC] border border-[#E6D9C8] p-2.5 rounded-xl text-xs h-10 focus:outline-none"
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Yearly">Yearly</option>
                  <option value="Lifetime">Lifetime</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1">Limit Type</span>
                <select
                  value={addonForm.limit_type}
                  onChange={e => setAddonForm({ ...addonForm, limit_type: e.target.value })}
                  className="w-full bg-[#FCF5EC] border border-[#E6D9C8] p-2.5 rounded-xl text-xs h-10 focus:outline-none"
                >
                  <option value="extra_chats">Extra Chats</option>
                  <option value="extra_members">Extra Members</option>
                  <option value="extra_storage">Extra Storage (GB)</option>
                  <option value="extra_sms">Extra SMS Credits</option>
                  <option value="extra_email">Extra Email Credits</option>
                  <option value="extra_properties">Extra Properties/Venues</option>
                  <option value="custom">Custom Quota</option>
                </select>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1">Limit Value</span>
                <Input
                  type="number"
                  value={addonForm.limit_value}
                  onChange={e => setAddonForm({ ...addonForm, limit_value: parseInt(e.target.value) || 0 })}
                  className="border-[#E6D9C8] h-10 text-xs bg-[#FCF5EC]"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddonModalOpen(false)}
                className="border-[#E6D9C8] text-slate-700 hover:bg-[#FCF5EC] rounded-xl h-10 text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#EA580C] hover:bg-[#D94E06] text-white font-bold rounded-xl h-10 text-xs"
              >
                Create Add-on
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  };

  // Trial Settings
  const [trialDaysConfig, setTrialDaysConfig] = useState(14);
  const [trialPlanCode, setTrialPlanCode] = useState("free");

  // Notifications Settings
  const [notifySubPurchased, setNotifySubPurchased] = useState(true);
  const [notifyTrialEnding, setNotifyTrialEnding] = useState(true);
  const [notifyPaymentFailed, setNotifyPaymentFailed] = useState(true);

  // Global Settings
  const [taxRate, setTaxRate] = useState(18);
  const [currency, setCurrency] = useState("INR");

  useEffect(() => {
    if (!user || user.role !== "super_admin") {
      navigate({ to: "/login" });
      return;
    }
    fetchData();
  }, [user]);

  // Real-time Form State Persistence during plan configuration
  useEffect(() => {
    if (isPlanModalOpen) {
      const key = `wag_plan_builder_draft_${editingPlan ? editingPlan.id : "new"}`;
      localStorage.setItem(key, JSON.stringify({ planForm, wizardStep }));
    }
  }, [planForm, wizardStep, editingPlan, isPlanModalOpen]);

  const checkAndLoadDraft = (planId: string) => {
    const draftKey = `wag_plan_builder_draft_${planId}`;
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.planForm) {
          if (confirm("We found an unsaved draft for this plan configuration. Would you like to restore it?")) {
            setPlanForm(parsed.planForm);
            if (typeof parsed.wizardStep === "number") {
              setWizardStep(parsed.wizardStep);
            }
            return true;
          } else {
            localStorage.removeItem(draftKey);
          }
        }
      } catch (e) {
        console.error("Failed to parse draft", e);
      }
    }
    return false;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [plansRes, subsRes, featuresRes, addonsRes, couponsRes, txnRes, auditRes, membersRes, analyticsRes, registryRes, sidebarModulesRes] =
        await Promise.all([
          api.getMemberPremiumPlans(),
          api.getMemberPremiumSubscriptions(),
          api.getMemberPremiumFeatures().catch(() => []),
          api.getMemberPremiumAddons().catch(() => []),
          api.getMemberPremiumCoupons().catch(() => []),
          api.getMemberPremiumTransactions().catch(() => []),
          api.getMemberPremiumAuditLogs().catch(() => []),
          api.getMembers().catch(() => []),
          api.getMemberPremiumPlanAnalytics().catch(() => null),
          api.getPremiumFeatureRegistry().catch(() => []),
          api.getSidebarModules().catch(() => [])
        ]);

      setPlans(plansRes || []);
      setSubscriptions(subsRes || []);
      setFeatures(featuresRes || []);
      setAddons(addonsRes || []);
      setCoupons(couponsRes || []);
      setTransactions(txnRes || []);
      setAuditLogs(auditRes || []);
      setAllMembers(membersRes || []);
      setAnalytics(analyticsRes);
      setFeatureRegistry(registryRes || []);
      setDashboardModules(sidebarModulesRes || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load subscription data");
    } finally {
      setLoading(false);
    }
  };

  const isModuleActiveInDashboard = (registryModule: string) => {
    if (dashboardModules.length === 0) return true; // fallback to showing all if dashboardModules failed to load

    // Map registry module codes to dashboard module codes
    const mapping: Record<string, string> = {
      matrimony: "matrimony",
      messaging: "messages",
      directory: "directory",
      business: "business",
      jobs: "jobs",
      events: "events",
      donations: "donations",
      property: "properties",
      ads: "advertisements",
      ai: "ai",
      committee: "committee",
      attendance: "attendance",
      subsidiaries: "subsidiaries",
      venues: "venues"
    };

    const dashboardCode = mapping[registryModule] || registryModule;

    // Check if dashboardCode is in the active sidebar modules list
    // Also match path e.g. "/dashboard/matrimony"
    return dashboardModules.some(m => {
      const code = m.module_code || "";
      const route = m.route || "";
      return (
        code.toLowerCase() === dashboardCode.toLowerCase() ||
        route.toLowerCase().includes(`/dashboard/${dashboardCode.toLowerCase()}`) ||
        // Special mapping cases
        (dashboardCode === "properties" && (code === "properties" || code === "venues" || route.includes("venues"))) ||
        (dashboardCode === "ai") // always show AI advanced features
      );
    });
  };

  const getModuleDisplayName = (registryModule: string) => {
    const mapping: Record<string, string> = {
      matrimony: "Matrimony",
      messaging: "Messages",
      directory: "Member Directory",
      business: "Business Directory",
      jobs: "Jobs & Careers",
      events: "Events",
      donations: "Donations",
      property: "Property Booking",
      ads: "Advertisements",
      ai: "AI & Smart Matching",
      committee: "Committee",
      attendance: "Attendance",
      subsidiaries: "Subsidiaries",
      venues: "Venues"
    };

    // Try to find the display name from the active dashboard modules
    const mappedCode = {
      matrimony: "matrimony",
      messaging: "messages",
      directory: "directory",
      business: "business",
      jobs: "jobs",
      events: "events",
      donations: "donations",
      property: "properties",
      ads: "advertisements",
      ai: "ai",
      committee: "committee",
      attendance: "attendance",
      subsidiaries: "subsidiaries",
      venues: "venues"
    }[registryModule] || registryModule;

    const activeMod = dashboardModules.find(m =>
      (m.module_code || "").toLowerCase() === mappedCode.toLowerCase() ||
      (m.route || "").toLowerCase().includes(`/dashboard/${mappedCode.toLowerCase()}`)
    );

    if (activeMod && activeMod.display_name) {
      return activeMod.display_name;
    }

    return mapping[registryModule] || registryModule.charAt(0).toUpperCase() + registryModule.slice(1);
  };

  const getModuleDescription = (registryModule: string) => {
    const descriptions: Record<string, string> = {
      matrimony: "Unlock premium matrimony services, candidate discovery, and contact unlocks.",
      messaging: "Access group chat, direct messages, and chat lists.",
      events: "Access premium community events, bookings, and ticket reservations.",
      donations: "Participate in donation campaigns, tracking, and community support.",
      venues: "View community grounds, halls, and venues details.",
      property: "Access property and community hall bookings and reservations.",
      ads: "View and post community advertisements and business announcements.",
      committee: "View committee hierarchy, boards, and decisions.",
      attendance: "Track and manage member attendance logs.",
      subsidiaries: "View and browse subsidiary organizations and boards."
    };
    return descriptions[registryModule] || `Includes all features for the ${registryModule} module.`;
  };

  const getModuleOfFeature = (featureCode: string): string => {
    const item = featureRegistry.find(i => i.feature_code === featureCode);
    return item?.module || "";
  };

  const toggleFeatureSelection = (feature: any) => {
    const exists = planForm.features.some((f: any) => f.feature_code === feature.feature_code);
    let newFeatures = [...planForm.features];
    const permissions = { ...planForm.metadata.permissions };
    if (exists) {
      newFeatures = newFeatures.filter((f: any) => f.feature_code !== feature.feature_code);
      delete permissions[feature.feature_code];
    } else {
      newFeatures.push({
        feature_code: feature.feature_code,
        name: feature.feature_name,
        description: feature.description,
        category: feature.module,
        is_enabled: true,
        limit_type: "unlimited",
        limit_value: 0,
        priority: 10,
        upgrade_message: "Upgrade to unlock this feature"
      });
      permissions[feature.feature_code] = {
        allow: true,
        read: true,
        create: true,
        edit: true,
        delete: true,
        export: true,
        download: true,
        ai_access: true
      };
    }
    setPlanForm({
      ...planForm,
      features: newFeatures,
      metadata: {
        ...planForm.metadata,
        permissions
      }
    });
  };

  const toggleSelectAllModule = (module: string, registryItems: any[]) => {
    const moduleFeatures = registryItems.filter(item => item.module === module);
    const allSelected = moduleFeatures.every(item => planForm.features.some((f: any) => f.feature_code === item.feature_code));

    let newFeatures = [...planForm.features];
    const permissions = { ...planForm.metadata.permissions };
    if (allSelected) {
      const codesToRemove = moduleFeatures.map(item => item.feature_code);
      newFeatures = newFeatures.filter((f: any) => !codesToRemove.includes(f.feature_code));
      codesToRemove.forEach(code => {
        delete permissions[code];
      });
    } else {
      moduleFeatures.forEach(item => {
        if (!newFeatures.some((f: any) => f.feature_code === item.feature_code)) {
          newFeatures.push({
            feature_code: item.feature_code,
            name: item.feature_name,
            description: item.description,
            category: item.module,
            is_enabled: true,
            limit_type: "unlimited",
            limit_value: 0,
            priority: 10,
            upgrade_message: "Upgrade to unlock this feature"
          });
          permissions[item.feature_code] = {
            allow: true,
            read: true,
            create: true,
            edit: true,
            delete: true,
            export: true,
            download: true,
            ai_access: true
          };
        }
      });
    }
    setPlanForm({
      ...planForm,
      features: newFeatures,
      metadata: {
        ...planForm.metadata,
        permissions
      }
    });
  };

  const togglePermission = (featureCode: string, permissionKey: string) => {
    const permissions = { ...planForm.metadata.permissions };
    if (!permissions[featureCode]) {
      permissions[featureCode] = {};
    }
    permissions[featureCode][permissionKey] = !permissions[featureCode][permissionKey];
    setPlanForm({
      ...planForm,
      metadata: {
        ...planForm.metadata,
        permissions
      }
    });
  };

  const exportPlanJson = () => {
    const dataStr = JSON.stringify(planForm, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `plan_config_${planForm.code || "draft"}.json`;
    a.click();
  };

  const validatePlan = () => {
    if (!planForm.name.trim()) return "Plan Name is required.";
    if (!planForm.code.trim()) return "Plan Code is required.";
    if (/[^a-z0-9_]/.test(planForm.code)) {
      return "Plan Code must contain only lowercase letters, numbers, and underscores.";
    }
    if (!editingPlan && plans.some(p => p.code.toLowerCase() === planForm.code.toLowerCase())) {
      return `Plan Code "${planForm.code}" already exists. Please choose a unique code.`;
    }
    const hasPrice = planForm.monthly_price > 0 ||
      planForm.quarterly_price > 0 ||
      planForm.half_yearly_price > 0 ||
      planForm.yearly_price > 0 ||
      planForm.lifetime_price > 0 ||
      planForm.metadata.category === "free";
    if (!hasPrice) {
      return "At least one billing cycle rate must be defined (unless categorized as a Free Tier).";
    }
    if (planForm.features.length === 0) {
      return "At least one feature must be enabled in the Feature Catalog.";
    }
    return null;
  };

  // Plan CRUD Actions
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPlan) {
        await api.updateMemberPremiumPlan(editingPlan.id, planForm);
        toast.success("Premium plan updated successfully!");
      } else {
        await api.createMemberPremiumPlan(planForm);
        toast.success("Premium plan created successfully!");
      }
      setIsPlanModalOpen(false);
      setEditingPlan(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save plan.");
    }
  };

  const handleEditPlan = (plan: any) => {
    setEditingPlan(plan);
    const restored = checkAndLoadDraft(plan.id.toString());
    if (!restored) {
      const meta = {
        category: plan.metadata?.category || "premium",
        visibility: plan.metadata?.visibility || "public",
        tax_type: plan.metadata?.tax_type || "exclusive",
        custom_pricing_allowed: plan.metadata?.custom_pricing_allowed || false,
        trial_features: plan.metadata?.trial_features || [],
        trial_restrictions: plan.metadata?.trial_restrictions || "",
        referral_discount: plan.metadata?.referral_discount || 0,
        festival_offer: plan.metadata?.festival_offer || "",
        renewal_discount: plan.metadata?.renewal_discount || 0,
        downgrade_rules: plan.metadata?.downgrade_rules || "",
        auto_expiry: plan.metadata?.auto_expiry || false,
        permissions: plan.metadata?.permissions || {},
      };

      setPlanForm({
        name: plan.name,
        code: plan.code,
        plan_type: plan.plan_type || "custom",
        short_description: plan.short_description || "",
        description: plan.description || "",
        color_theme: plan.color_theme || "#EA580C",
        icon: plan.icon || "Crown",
        monthly_price: Number(plan.monthly_price) || 0,
        quarterly_price: Number(plan.quarterly_price) || 0,
        half_yearly_price: Number(plan.half_yearly_price) || 0,
        yearly_price: Number(plan.yearly_price) || 0,
        lifetime_price: Number(plan.lifetime_price) || 0,
        currency: plan.currency || "INR",
        gst_percentage: Number(plan.gst_percentage) || 18,
        discount_percentage: Number(plan.discount_percentage) || 0,
        trial_days: Number(plan.trial_days) || 14,
        grace_period_days: Number(plan.grace_period_days) || 7,
        status: plan.status || "active",
        display_order: Number(plan.display_order) || 1,
        display_badge: plan.display_badge || "",
        is_popular: plan.is_popular || false,
        is_recommended: plan.is_recommended || false,
        is_best_seller: plan.is_best_seller || false,
        is_trial: plan.is_trial || false,
        auto_renew_enabled: plan.auto_renew_enabled !== false,
        coupon_applicable: plan.coupon_applicable !== false,
        metadata: meta,
        features: plan.features || [],
        benefits: plan.benefits || [],
      });
      setWizardStep(0);
    }
    setIsPlanModalOpen(true);
  };

  const handleClonePlan = async (id: number) => {
    try {
      await api.cloneMemberPremiumPlan(id);
      toast.success("Plan cloned successfully!");
      fetchData();
    } catch (err) {
      toast.error("Failed to clone plan.");
    }
  };

  const handleArchivePlan = async (id: number) => {
    if (confirm("Are you sure you want to archive this premium plan?")) {
      try {
        await api.archiveMemberPremiumPlan(id);
        toast.success("Plan archived successfully.");
        fetchData();
      } catch (err: any) {
        toast.error(err.message || "Failed to archive plan.");
      }
    }
  };

  const handleDeletePlan = async (id: number) => {
    if (confirm("Are you sure you want to delete this premium plan?")) {
      try {
        await api.deleteMemberPremiumPlan(id);
        toast.success("Plan deleted successfully.");
        fetchData();
      } catch (err: any) {
        toast.error(err.message || "Failed to delete plan.");
      }
    }
  };

  // Feature Registry Actions
  const handleSaveFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createMemberPremiumFeature(featureForm);
      toast.success("New feature registered successfully!");
      setIsFeatureModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error("Failed to register feature.");
    }
  };

  // Toggle Feature Matrix Cell
  const handleToggleMatrixFeature = async (planId: number, feature: any) => {
    try {
      const existing = features.find(f => f.plan === planId && f.feature_code === feature.feature_code);
      if (existing) {
        await api.updateMemberPremiumFeature(existing.id, {
          is_enabled: !existing.is_enabled
        });
      } else {
        await api.createMemberPremiumFeature({
          plan: planId,
          feature_code: feature.feature_code,
          name: feature.name,
          category: feature.category || "general",
          is_enabled: true,
          is_unlimited: true,
          limit_value: 0
        });
      }
      fetchData();
    } catch (err) {
      toast.error("Failed to update feature matrix configuration.");
    }
  };

  // Coupon Actions
  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createMemberPremiumCoupon({
        ...couponForm,
        code: couponForm.code.toUpperCase(),
        is_active: true
      });
      toast.success("Promo code generated successfully!");
      setIsCouponModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error("Failed to create coupon.");
    }
  };

  // Assignment Actions
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.assignMemberPremiumSubscription(assignForm);
      toast.success("Subscription assigned successfully!");
      setIsAssignModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error("Failed to assign subscription.");
    }
  };

  // Export functions (Excel / CSV mockup)
  const handleExport = (format: "csv" | "json") => {
    const dataStr = JSON.stringify(subscriptions, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const exportFileDefaultName = "members_subscriptions." + format;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  // Filter logic
  const filteredSubs = subscriptions.filter(sub => {
    const matchesSearch = sub.member_name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
      sub.member_email?.toLowerCase().includes(memberSearch.toLowerCase());
    const matchesPlan = memberPlanFilter === "all" || sub.plan_code === memberPlanFilter;
    const matchesStatus = memberStatusFilter === "all" || sub.status === memberStatusFilter;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const filteredTxns = transactions.filter(t => {
    return t.member_name?.toLowerCase().includes(txnSearch.toLowerCase()) ||
      t.transaction_id?.toLowerCase().includes(txnSearch.toLowerCase());
  });

  // Calculate Mock metrics if API doesn't populate everything
  const totalSubscribers = subscriptions.length;
  const activeSubscribers = subscriptions.filter(s => s.status === "active").length;
  const trialSubscribers = subscriptions.filter(s => s.status === "trial").length;
  const expiredSubscribers = subscriptions.filter(s => s.status === "expired" || s.status === "cancelled").length;

  const totalRevenue = transactions
    .filter(t => t.transaction_status === "success")
    .reduce((sum, t) => sum + Number(t.total_amount || t.amount || 0), 0);

  const pendingPayments = transactions.filter(t => t.transaction_status === "pending").length;
  const failedPayments = transactions.filter(t => t.transaction_status === "failed").length;

  const iconMap: Record<string, React.ComponentType<any>> = {
    Crown: Crown,
    Gem: Gem,
    Rocket: Rocket,
    Award: Award,
    PlusCircle: Plus,
    Zap: Bolt,
    Trophy: Trophy,
    Sparkles: Sparkles,
    Heart: Heart,
    ShieldCheck: ShieldCheck
  };

  if (isPlanModalOpen) {
    return (
      <div className="bg-[#FAF7F2] min-h-screen p-8 text-slate-800 space-y-6 flex flex-col font-sans">
        {/* Custom Header */}
        <div className="flex items-center justify-between border-b border-[#EADCC9] pb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (confirm("Discard changes and return to console?")) {
                  setIsPlanModalOpen(false);
                  setEditingPlan(null);
                }
              }}
              className="w-12 h-12 bg-white hover:bg-slate-50 border border-[#EADCC9] rounded-2xl flex items-center justify-center text-slate-700 transition shadow-sm"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {editingPlan ? "Edit Premium Plan" : "Create Premium Plan"}
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Build a powerful premium plan with customized features, limits, pricing and permissions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setWizardStep(5)}
              className="border-orange-200 text-orange-700 bg-white hover:bg-orange-50 rounded-xl px-4 py-2 text-xs font-bold flex items-center gap-1.5 h-10 shadow-sm"
            >
              <Eye className="w-4 h-4" /> Preview Plan
            </Button>
            <Button
              onClick={async () => {
                const err = validatePlan();
                if (err) {
                  toast.error(err);
                  return;
                }
                try {
                  const payload = { ...planForm, status: "inactive" };
                  if (editingPlan) {
                    await api.updateMemberPremiumPlan(editingPlan.id, payload);
                    toast.success("Draft updated successfully!");
                  } else {
                    await api.createMemberPremiumPlan(payload);
                    toast.success("Draft plan saved successfully!");
                  }
                  setIsPlanModalOpen(false);
                  setEditingPlan(null);
                  fetchData();
                } catch (err: any) {
                  toast.error(err.message || "Failed to save draft.");
                }
              }}
              className="bg-[#EA580C] hover:bg-[#D94E06] text-white rounded-xl px-5 py-2 text-xs font-bold flex items-center gap-1.5 h-10 shadow-md shadow-orange-700/20"
            >
              Save Draft
            </Button>
          </div>
        </div>

        {/* Steps Navigation Bar */}
        <div className="bg-white border border-[#EADCC9] rounded-2xl py-4 px-6 flex items-center justify-between text-xs overflow-x-auto shadow-sm gap-4 scrollbar-none">
          {[
            { number: 1, label: "Basic Info" },
            { number: 2, label: "Pricing & Cycle" },
            { number: 3, label: "Features & Modules" },
            { number: 4, label: "Limits & Quotas" },
            { number: 5, label: "Add-ons" },
            { number: 6, label: "Review & Publish" },
          ].map((step, idx) => {
            const isActive = wizardStep === idx;
            const isCompleted = wizardStep > idx;

            return (
              <button
                key={step.number}
                type="button"
                onClick={() => setWizardStep(idx)}
                className="flex items-center whitespace-nowrap transition cursor-pointer"
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold mr-2 text-xs transition ${isActive
                      ? "bg-[#EA580C] text-white shadow-sm"
                      : isCompleted
                        ? "bg-orange-100 text-[#EA580C] border border-orange-200"
                        : "bg-[#FAF6F0] text-slate-400 border border-slate-200"
                    }`}
                >
                  {step.number}
                </div>
                <span
                  className={`text-xs font-bold transition ${isActive
                      ? "text-[#EA580C] font-extrabold"
                      : "text-slate-500 hover:text-slate-800"
                    }`}
                >
                  {step.label}
                </span>
                {idx < 5 && (
                  <div className="w-8 border-b border-slate-200 mx-4 hidden md:block" />
                )}
              </button>
            );
          })}
        </div>

        {/* Main Content Pane Split */}
        <div className="flex flex-col lg:flex-row gap-6 items-start flex-1 w-full">
          {/* Left Panel Card */}
          <div className="flex-1 bg-white border border-[#EADCC9] rounded-3xl p-8 space-y-6 shadow-sm w-full">
            {wizardStep === 0 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Basic Information</h2>
                  <p className="text-xs text-slate-400">Define the basic details and appearance of the premium plan.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-slate-600 font-bold block mb-1">Plan Name *</span>
                    <Input
                      required
                      value={planForm.name}
                      onChange={e => setPlanForm({ ...planForm, name: e.target.value })}
                      placeholder="e.g. Matrimony Premium Gold"
                      className="border-slate-200 focus:border-orange-500 rounded-xl"
                    />
                  </div>
                  <div>
                    <span className="text-xs text-slate-600 font-bold block mb-1">Plan Code *</span>
                    <Input
                      required
                      disabled={!!editingPlan}
                      value={planForm.code}
                      onChange={e => setPlanForm({ ...planForm, code: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                      placeholder="e.g. premium_gold"
                      className="border-slate-200 focus:border-orange-500 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-slate-600 font-bold block mb-1">Plan Category *</span>
                    <select
                      value={planForm.metadata.category}
                      onChange={e => setPlanForm({
                        ...planForm,
                        metadata: { ...planForm.metadata, category: e.target.value }
                      })}
                      className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-sm focus:outline-none focus:border-orange-500"
                    >
                      <option value="free">Free Tier</option>
                      <option value="premium">Premium Level</option>
                      <option value="enterprise">Enterprise Custom</option>
                    </select>
                  </div>

                  <div>
                    <span className="text-xs text-slate-600 font-bold block mb-1">Display Order *</span>
                    <Input
                      type="number"
                      value={planForm.display_order}
                      onChange={e => setPlanForm({ ...planForm, display_order: Number(e.target.value) })}
                      className="border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-slate-600 font-bold block mb-1">Short Description *</span>
                    <div className="relative">
                      <textarea
                        required
                        maxLength={150}
                        value={planForm.short_description}
                        onChange={e => setPlanForm({ ...planForm, short_description: e.target.value })}
                        placeholder="e.g. Unlock all premium matrimony features and get priority search & match."
                        className="w-full h-20 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-orange-500 resize-none"
                      />
                      <span className="absolute bottom-2.5 right-3 text-[10px] text-slate-400 font-mono">
                        {planForm.short_description.length}/150
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-slate-600 font-bold block mb-1">Plan Badge</span>
                    <select
                      value={planForm.display_badge}
                      onChange={e => setPlanForm({ ...planForm, display_badge: e.target.value })}
                      className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-sm focus:outline-none focus:border-orange-500"
                    >
                      <option value="">Select Badge</option>
                      <option value="Recommended">Recommended</option>
                      <option value="Popular">Popular</option>
                      <option value="Best Seller">Best Seller</option>
                      <option value="New">New</option>
                    </select>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-600 font-bold block mb-2">Plan Icon</span>
                  <div className="flex flex-wrap gap-2 items-center">
                    {[
                      { name: "Crown", icon: Crown },
                      { name: "Gem", icon: Gem },
                      { name: "Rocket", icon: Rocket },
                      { name: "Award", icon: Award },
                      { name: "PlusCircle", icon: Plus },
                      { name: "Zap", icon: Bolt },
                      { name: "Trophy", icon: Trophy },
                    ].map((ico) => {
                      const IconComponent = ico.icon;
                      const isSelected = planForm.icon === ico.name;
                      return (
                        <button
                          key={ico.name}
                          type="button"
                          onClick={() => setPlanForm({ ...planForm, icon: ico.name })}
                          className={`w-12 h-12 bg-white hover:bg-slate-50 border rounded-xl flex items-center justify-center text-slate-700 transition ${isSelected ? "border-[#EA580C] ring-2 ring-orange-500/20" : "border-slate-200"
                            }`}
                          title={ico.name}
                        >
                          <IconComponent className={`w-5 h-5 ${isSelected ? "text-[#EA580C]" : ""}`} />
                        </button>
                      );
                    })}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const newIcon = prompt("Enter any Lucide Icon name (e.g. Shield, Star, Sun, Heart, User, Sparkles, Box, ShieldCheck):");
                        if (newIcon) {
                          const formatted = newIcon.trim().charAt(0).toUpperCase() + newIcon.trim().slice(1);
                          if (formatted in LucideIcons) {
                            setPlanForm({ ...planForm, icon: formatted });
                            toast.success(`Custom icon "${formatted}" has been selected successfully!`);
                          } else {
                            toast.error(`"${formatted}" is not a recognized Lucide icon name. Please try another one.`);
                          }
                        }
                      }}
                      className="border-dashed border-orange-200 text-orange-700 bg-white hover:bg-orange-50 rounded-xl px-4 py-2.5 text-xs font-bold h-12 ml-2"
                    >
                      <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload Custom Icon
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
                  <div>
                    <span className="text-xs text-slate-600 font-bold block mb-2">Accent Color</span>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {[
                        { name: "Orange", hex: "#EA580C" },
                        { name: "Blue", hex: "#3B82F6" },
                        { name: "Purple", hex: "#8B5CF6" },
                        { name: "Pink", hex: "#EC4899" },
                        { name: "Green", hex: "#10B981" },
                        { name: "Cyan", hex: "#06B6D4" },
                        { name: "Dark Slate", hex: "#1E293B" },
                      ].map((col) => {
                        const isSelected = planForm.color_theme === col.hex || planForm.color_theme.includes(col.hex);
                        return (
                          <button
                            key={col.name}
                            type="button"
                            onClick={() => setPlanForm({ ...planForm, color_theme: col.hex })}
                            className={`w-6 h-6 rounded-full border-2 transition ${isSelected ? "border-white ring-2 ring-orange-500 scale-110 shadow-sm" : "border-transparent"
                              }`}
                            style={{ backgroundColor: col.hex }}
                            title={col.name}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-slate-600 font-bold block mb-1">Visibility</span>
                    <select
                      value={planForm.metadata.visibility}
                      onChange={e => setPlanForm({
                        ...planForm,
                        metadata: { ...planForm.metadata, visibility: e.target.value }
                      })}
                      className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-sm focus:outline-none focus:border-orange-500"
                    >
                      <option value="public">Visible (Public)</option>
                      <option value="hidden">Hidden (Admin Only)</option>
                    </select>
                  </div>

                  <div>
                    <span className="text-xs text-slate-600 font-bold block mb-1">Status</span>
                    <select
                      value={planForm.status}
                      onChange={e => setPlanForm({ ...planForm, status: e.target.value })}
                      className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-sm focus:outline-none focus:border-orange-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
                  <label className="flex items-center gap-2 cursor-pointer p-3 bg-slate-50 rounded-xl hover:bg-slate-100/80 transition">
                    <input
                      type="checkbox"
                      checked={planForm.is_recommended}
                      onChange={e => setPlanForm({ ...planForm, is_recommended: e.target.checked })}
                      className="rounded text-orange-600 focus:ring-orange-500 h-4 w-4 border-slate-300"
                    />
                    <span className="text-xs font-bold text-slate-700">Recommended Plan</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-3 bg-slate-50 rounded-xl hover:bg-slate-100/80 transition">
                    <input
                      type="checkbox"
                      checked={planForm.is_popular}
                      onChange={e => setPlanForm({ ...planForm, is_popular: e.target.checked })}
                      className="rounded text-orange-600 focus:ring-orange-500 h-4 w-4 border-slate-300"
                    />
                    <span className="text-xs font-bold text-slate-700">Popular Plan</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-3 bg-slate-50 rounded-xl hover:bg-slate-100/80 transition">
                    <input
                      type="checkbox"
                      checked={planForm.is_best_seller}
                      onChange={e => setPlanForm({ ...planForm, is_best_seller: e.target.checked })}
                      className="rounded text-orange-600 focus:ring-orange-500 h-4 w-4 border-slate-300"
                    />
                    <span className="text-xs font-bold text-slate-700">Best Seller</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-3 bg-slate-50 rounded-xl hover:bg-slate-100/80 transition">
                    <input
                      type="checkbox"
                      checked={planForm.is_trial}
                      onChange={e => setPlanForm({ ...planForm, is_trial: e.target.checked })}
                      className="rounded text-orange-600 focus:ring-orange-500 h-4 w-4 border-slate-300"
                    />
                    <span className="text-xs font-bold text-slate-700">Trial Available</span>
                  </label>
                </div>
              </div>
            )}

            {wizardStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Pricing & Cycles</h2>
                  <p className="text-xs text-slate-400">Define the rates, tax policy, and payment terms of the plan.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-xs text-slate-600 font-bold block mb-1">Base Currency</span>
                    <select
                      value={planForm.currency}
                      onChange={e => setPlanForm({ ...planForm, currency: e.target.value })}
                      className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-sm focus:outline-none focus:border-orange-500"
                    >
                      <option value="INR">Indian Rupee (₹)</option>
                      <option value="USD">US Dollar ($)</option>
                      <option value="EUR">Euro (€)</option>
                    </select>
                  </div>

                  <div>
                    <span className="text-xs text-slate-600 font-bold block mb-1">Tax Mode</span>
                    <select
                      value={planForm.metadata.tax_type}
                      onChange={e => setPlanForm({
                        ...planForm,
                        metadata: { ...planForm.metadata, tax_type: e.target.value }
                      })}
                      className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-sm focus:outline-none focus:border-orange-500"
                    >
                      <option value="exclusive">Exclusive of Taxes</option>
                      <option value="inclusive">Inclusive of Taxes</option>
                    </select>
                  </div>

                  <div>
                    <span className="text-xs text-slate-600 font-bold block mb-1">GST Tax Rate (%)</span>
                    <Input
                      type="number"
                      value={planForm.gst_percentage}
                      onChange={e => setPlanForm({ ...planForm, gst_percentage: Number(e.target.value) })}
                      className="border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-slate-600 font-bold block mb-1">Discount Percentage (%)</span>
                    <Input
                      type="number"
                      value={planForm.discount_percentage}
                      onChange={e => setPlanForm({ ...planForm, discount_percentage: Number(e.target.value) })}
                      className="border-slate-200 rounded-xl"
                    />
                  </div>

                  <div className="flex items-center pt-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={planForm.auto_renew_enabled}
                        onChange={e => setPlanForm({ ...planForm, auto_renew_enabled: e.target.checked })}
                        className="rounded text-orange-600 h-4 w-4 border-slate-300"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-700 block">Enable Auto-Renewal by Default</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Recurring billing profiles will automatically generate.</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Billing Rates (Specify 0 to disable cycle)</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-1">Monthly</span>
                      <Input
                        type="number"
                        value={planForm.monthly_price}
                        onChange={e => setPlanForm({ ...planForm, monthly_price: Number(e.target.value) })}
                        className="border-slate-200 rounded-xl"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block mb-1">Quarterly</span>
                      <Input
                        type="number"
                        value={planForm.quarterly_price}
                        onChange={e => setPlanForm({ ...planForm, quarterly_price: Number(e.target.value) })}
                        className="border-slate-200 rounded-xl"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block mb-1">Half-Yearly</span>
                      <Input
                        type="number"
                        value={planForm.half_yearly_price}
                        onChange={e => setPlanForm({ ...planForm, half_yearly_price: Number(e.target.value) })}
                        className="border-slate-200 rounded-xl"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block mb-1">Yearly</span>
                      <Input
                        type="number"
                        value={planForm.yearly_price}
                        onChange={e => setPlanForm({ ...planForm, yearly_price: Number(e.target.value) })}
                        className="border-slate-200 rounded-xl"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block mb-1">Lifetime</span>
                      <Input
                        type="number"
                        value={planForm.lifetime_price}
                        onChange={e => setPlanForm({ ...planForm, lifetime_price: Number(e.target.value) })}
                        className="border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {wizardStep === 2 && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Features & Modules</h2>
                    <p className="text-xs text-slate-400">Toggle available system modules and configure advanced permissions.</p>
                  </div>
                  <div className="relative w-full md:w-64">
                    <Input
                      placeholder="Search features..."
                      value={featureSearch}
                      onChange={e => setFeatureSearch(e.target.value)}
                      className="pl-8 border-slate-200 rounded-xl text-xs h-9"
                    />
                    <LayoutDashboard className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {Array.from(new Set(featureRegistry.map(item => item.module)))
                    .filter(isModuleActiveInDashboard)
                    .map(module => {
                      const registryItems = featureRegistry.filter(item => item.module === module);
                      if (registryItems.length === 0) return null;

                      const isSelected = registryItems.every(item =>
                        planForm.features.some(f => f.feature_code === item.feature_code)
                      );

                      const matchesSearch = getModuleDisplayName(module).toLowerCase().includes(featureSearch.toLowerCase()) ||
                        getModuleDescription(module).toLowerCase().includes(featureSearch.toLowerCase()) ||
                        registryItems.some(item =>
                          item.feature_name.toLowerCase().includes(featureSearch.toLowerCase()) ||
                          item.description.toLowerCase().includes(featureSearch.toLowerCase())
                        );

                      if (featureSearch && !matchesSearch) return null;

                      return (
                        <label
                          key={module}
                          className={`flex items-start gap-4 p-5 rounded-2xl border cursor-pointer transition-all ${isSelected
                              ? "border-orange-500 bg-orange-50/20 shadow-md shadow-orange-100/50"
                              : "border-slate-100 hover:bg-slate-50 bg-white"
                            }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectAllModule(module, featureRegistry)}
                            className="rounded mt-1 text-orange-600 focus:ring-orange-500 h-4.5 w-4.5 border-slate-300"
                          />
                          <div className="space-y-1.5 flex-1">
                            <span className="text-sm font-black text-slate-800 block">
                              {getModuleDisplayName(module)}
                            </span>
                            <span className="text-xs text-slate-500 block leading-relaxed">
                              {getModuleDescription(module)}
                            </span>
                            <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-slate-100/60">
                              {registryItems.map(item => (
                                <span key={item.feature_code} className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
                                  {item.feature_name}
                                </span>
                              ))}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Limits & Quotas</h2>
                  <p className="text-xs text-slate-400">Configure module-level quotas, priorities, and custom upgrade path logic.</p>
                </div>

                <div className="space-y-4">
                  {Array.from(new Set(planForm.features.map(f => getModuleOfFeature(f.feature_code)))).filter(Boolean).map(module => {
                    const moduleFeatures = planForm.features.filter(f => getModuleOfFeature(f.feature_code) === module);
                    if (moduleFeatures.length === 0) return null;
                    const representative = moduleFeatures[0];

                    const updateModuleFeatures = (updater: (f: any) => any) => {
                      const newFeatures = planForm.features.map(f =>
                        getModuleOfFeature(f.feature_code) === module ? updater(f) : f
                      );
                      setPlanForm({ ...planForm, features: newFeatures });
                    };

                    return (
                      <div key={module} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                          <div>
                            <span className="text-sm font-black text-slate-800 block">{getModuleDisplayName(module)}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">{moduleFeatures.length} feature{moduleFeatures.length > 1 ? 's' : ''} included</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 pb-2">
                          {moduleFeatures.map(f => (
                            <span key={f.feature_code} className="text-[9px] bg-orange-100 text-[#EA580C] px-2 py-0.5 rounded-full font-bold">
                              {f.name}
                            </span>
                          ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <span className="text-xs text-slate-500 block mb-1">Limit Type</span>
                            <select
                              value={representative.limit_type}
                              onChange={e => {
                                const newType = e.target.value;
                                updateModuleFeatures(f => ({
                                  ...f,
                                  limit_type: newType,
                                  limit_value: newType === "unlimited" ? 0 : f.limit_value
                                }));
                              }}
                              className="w-full bg-white border border-slate-200 p-2 rounded-xl text-xs focus:outline-none"
                            >
                              <option value="unlimited">Unlimited</option>
                              <option value="custom">Custom Quota</option>
                            </select>
                          </div>

                          {representative.limit_type === "custom" && (
                            <div>
                              <span className="text-xs text-slate-500 block mb-1">Quota limit value</span>
                              <Input
                                type="number"
                                value={representative.limit_value}
                                onChange={e => {
                                  const val = Number(e.target.value);
                                  updateModuleFeatures(f => ({ ...f, limit_value: val }));
                                }}
                                className="border-slate-200 rounded-xl text-xs h-9"
                              />
                            </div>
                          )}

                          <div>
                            <span className="text-xs text-slate-500 block mb-1">Execution Priority</span>
                            <Input
                              type="number"
                              value={representative.priority || 10}
                              onChange={e => {
                                const val = Number(e.target.value);
                                updateModuleFeatures(f => ({ ...f, priority: val }));
                              }}
                              className="border-slate-200 rounded-xl text-xs h-9"
                            />
                          </div>
                        </div>

                        <div>
                          <span className="text-xs text-slate-500 block mb-1">Upgrade Fallback Alert Message</span>
                          <textarea
                            value={representative.upgrade_message || ""}
                            onChange={e => {
                              const msg = e.target.value;
                              updateModuleFeatures(f => ({ ...f, upgrade_message: msg }));
                            }}
                            placeholder="e.g. You have reached your monthly limit. Please upgrade to continue."
                            className="w-full h-16 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-orange-500 resize-none"
                          />
                        </div>
                      </div>
                    );
                  })}

                  {planForm.features.length === 0 && (
                    <div className="text-center py-10 bg-slate-50 rounded-2xl text-slate-400 text-xs">
                      No features enabled yet. Please enable features in the Features & Modules step.
                    </div>
                  )}
                </div>
              </div>
            )}

            {wizardStep === 4 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Add-ons Compatibility</h2>
                    <p className="text-xs text-slate-400">Select which premium addon packages can be optionally purchased alongside this plan.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddonModalOpen(true)}
                    className="border-[#E6D9C8] text-slate-700 bg-white hover:bg-slate-50 text-xs h-9 rounded-xl flex items-center gap-2 px-3 shadow-sm"
                  >
                    <Plus className="w-4 h-4 text-[#EA580C]" /> Create Add-on
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addons.map(addon => {
                    const isCompatible = planForm.benefits.some(b => b.title === `Add-on: ${addon.name}`);

                    return (
                      <label
                        key={addon.id}
                        className={`flex items-start gap-4 p-4 border rounded-2xl cursor-pointer transition-all ${isCompatible ? "border-orange-500 bg-orange-50/20" : "border-slate-100 hover:bg-slate-50/80 bg-white"
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={isCompatible}
                          onChange={e => {
                            let newBenefits = [...planForm.benefits];
                            if (e.target.checked) {
                              newBenefits.push({
                                title: `Add-on: ${addon.name}`,
                                description: addon.description || "Compatible Add-on Upgrade Pack",
                                icon: "Layers",
                                is_highlight: false,
                                is_included: true
                              });
                            } else {
                              newBenefits = newBenefits.filter(b => b.title !== `Add-on: ${addon.name}`);
                            }
                            setPlanForm({ ...planForm, benefits: newBenefits });
                          }}
                          className="rounded mt-0.5 text-orange-600 focus:ring-orange-500 h-4 w-4 border-slate-300"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">{addon.name}</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">{addon.description}</span>
                          <span className="text-[10px] text-slate-505 font-bold block mt-2">
                            Price: {addon.currency || "₹"}{addon.price} / {addon.billing_cycle}
                          </span>
                        </div>
                      </label>
                    );
                  })}

                  {addons.length === 0 && (
                    <div className="col-span-2 text-center py-10 bg-slate-50 rounded-2xl text-slate-400 text-xs">
                      No system add-ons configured in the registry.
                    </div>
                  )}
                </div>
              </div>
            )}

            {wizardStep === 5 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Review & Publish Plan</h2>
                  <p className="text-xs text-slate-400">Verify all subscription details, configurations, and launch the plan.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                    <h4 className="font-bold text-slate-900 text-sm border-b pb-2">Core Settings</h4>
                    <div className="grid grid-cols-2 gap-y-3 text-xs">
                      <span className="text-slate-500">Plan Name</span>
                      <span className="font-bold text-slate-800 text-right">{planForm.name || "(Draft)"}</span>

                      <span className="text-slate-500">Code</span>
                      <span className="font-mono font-bold text-slate-800 text-right">{planForm.code || "(Draft)"}</span>

                      <span className="text-slate-500">Category</span>
                      <span className="font-bold text-slate-800 text-right capitalize">{planForm.metadata.category}</span>

                      <span className="text-slate-500">Status</span>
                      <span className="font-bold text-slate-800 text-right capitalize">{planForm.status}</span>

                      <span className="text-slate-500">GST Percent</span>
                      <span className="font-bold text-slate-800 text-right">{planForm.gst_percentage}%</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                    <h4 className="font-bold text-slate-900 text-sm border-b pb-2">Cycles Pricing</h4>
                    <div className="grid grid-cols-2 gap-y-3 text-xs">
                      <span className="text-slate-500">Monthly</span>
                      <span className="font-bold text-slate-800 text-right">₹{planForm.monthly_price}</span>

                      <span className="text-slate-500">Quarterly</span>
                      <span className="font-bold text-slate-850 text-right">₹{planForm.quarterly_price}</span>

                      <span className="text-slate-500">Yearly</span>
                      <span className="font-bold text-slate-855 text-right">₹{planForm.yearly_price}</span>

                      <span className="text-slate-500">Lifetime</span>
                      <span className="font-bold text-slate-860 text-right">₹{planForm.lifetime_price}</span>

                      <span className="text-slate-500">Tax Mode</span>
                      <span className="font-bold text-slate-800 text-right capitalize">{planForm.metadata.tax_type}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="font-bold text-slate-900 text-sm">Enabled Features & Limits ({planForm.features.length})</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {planForm.features.map(f => (
                      <div key={f.feature_code} className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-100 text-xs">
                        <span className="text-slate-700 font-bold">{f.name}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded capitalize">
                          {f.limit_type === "unlimited" ? "Unlimited" : `${f.limit_value} count`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Device Simulator inside Review */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Interactive Simulator</span>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                      {(["desktop", "tablet", "mobile"] as const).map(dev => (
                        <button
                          key={dev}
                          type="button"
                          onClick={() => setPreviewDevice(dev)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${previewDevice === dev ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
                            }`}
                        >
                          {dev}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-center bg-[#FCFBF9] p-4 rounded-3xl border border-slate-200">
                    <div
                      className={`bg-white rounded-3xl border-8 border-slate-900 shadow-2xl transition-all duration-300 overflow-hidden ${previewDevice === "desktop" ? "w-full max-w-md h-[450px]" : ""
                        } ${previewDevice === "tablet" ? "w-[360px] h-[480px]" : ""
                        } ${previewDevice === "mobile" ? "w-[300px] h-[480px]" : ""
                        }`}
                    >
                      <div className="bg-slate-950 p-3 text-[10px] text-slate-400 font-mono flex items-center justify-between">
                        <span>WAG Samaj Premium Portal</span>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      </div>

                      <div className="p-4 overflow-y-auto h-[calc(100%-36px)] bg-slate-50 flex items-center justify-center">
                        <div className="w-full max-w-sm bg-white rounded-3xl border border-[#EADCC9] overflow-hidden shadow-lg">
                          <div className={`p-5 bg-gradient-to-br from-orange-500 to-amber-600 text-white relative`} style={{ backgroundColor: planForm.color_theme }}>
                            {planForm.display_badge && (
                              <span className="absolute top-4 right-4 bg-white/20 backdrop-blur-md text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full text-white border border-white/20">
                                {planForm.display_badge}
                              </span>
                            )}
                            <div className="text-xs font-bold uppercase tracking-widest opacity-80">
                              {planForm.metadata.category}
                            </div>
                            <h3 className="text-xl font-black mt-1 leading-tight">
                              {planForm.name || "Custom Plan Title"}
                            </h3>
                            <p className="text-[11px] opacity-90 mt-1">{planForm.short_description || "Dynamic Short Tagline"}</p>
                            <div className="mt-4 flex items-baseline gap-1">
                              <span className="text-2xl font-black">₹{planForm.monthly_price}</span>
                              <span className="text-[10px] opacity-80">/ month</span>
                            </div>
                          </div>
                          <div className="p-5 space-y-4">
                            <ul className="space-y-2 text-xs text-slate-600">
                              {planForm.features.slice(0, 3).map(f => (
                                <li key={f.feature_code} className="flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                  <span>{f.name}</span>
                                </li>
                              ))}
                              {planForm.features.length === 0 && (
                                <li className="text-slate-400 italic">No features enabled yet.</li>
                              )}
                            </ul>
                            <Button className="w-full mt-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl py-5 text-xs font-bold tracking-wide h-10">
                              Subscribe Now
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel Card (Preview & Highlights) */}
          <div className="w-full lg:w-96 space-y-6 shrink-0">
            {/* Plan Preview */}
            <div className="bg-white border border-[#EADCC9] rounded-3xl p-6 space-y-4 shadow-sm">
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Plan Preview</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">This is how the plan will appear to members.</p>
              </div>

              {(() => {
                const themeColor = planForm.color_theme || "#EA580C";
                const priceTiers = [
                  { key: "monthly", label: "Monthly", price: planForm.monthly_price, suffix: "month", text: "Billed Monthly" },
                  { key: "quarterly", label: "Quarterly", price: planForm.quarterly_price, suffix: "quarter", text: "Billed Quarterly" },
                  { key: "half_yearly", label: "Half-Yearly", price: planForm.half_yearly_price, suffix: "6 months", text: "Billed Half-Yearly" },
                  { key: "yearly", label: "Yearly", price: planForm.yearly_price, suffix: "year", text: "Billed Yearly" },
                  { key: "lifetime", label: "Lifetime", price: planForm.lifetime_price, suffix: "lifetime", text: "One-time Payment" },
                ].filter(t => t.price > 0);

                const currentTier = priceTiers.find(t => t.key === activePreviewCycle)
                  || priceTiers[0]
                  || { key: "monthly", label: "Monthly", price: planForm.monthly_price || 299, suffix: "month", text: "Billed Monthly" };

                return (
                  <div className="bg-[#FFFDF9] border border-[#EADCC9] rounded-3xl p-6 space-y-4 shadow-sm text-center relative overflow-hidden transition-all duration-300">
                    {planForm.display_badge && (
                      <span
                        className="absolute top-3 right-3 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border"
                        style={{
                          backgroundColor: `${themeColor}12`,
                          color: themeColor,
                          borderColor: `${themeColor}30`
                        }}
                      >
                        {planForm.display_badge}
                      </span>
                    )}

                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mt-4 mb-2 transition-all duration-300"
                      style={{
                        backgroundColor: `${themeColor}12`,
                        color: themeColor
                      }}
                    >
                      {React.createElement((LucideIcons as any)[planForm.icon] || Crown, { className: "w-6 h-6" })}
                    </div>

                    <h3 className="text-lg font-black text-slate-850 mt-1">
                      {planForm.name || "e.g. Matrimony Premium Gold"}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                      {planForm.short_description || "Unlock all premium matrimony features and get priority search & match."}
                    </p>

                    {/* Cycle Selector Pills */}
                    {priceTiers.length > 1 && (
                      <div className="flex flex-wrap justify-center gap-1 mb-2 pt-2">
                        {priceTiers.map(t => (
                          <button
                            key={t.key}
                            type="button"
                            onClick={() => setActivePreviewCycle(t.key)}
                            className="px-2 py-0.5 text-[9px] font-bold rounded-full border transition-all duration-200"
                            style={activePreviewCycle === t.key ? {
                              backgroundColor: themeColor,
                              borderColor: themeColor,
                              color: '#FFFFFF'
                            } : {
                              backgroundColor: '#F8FAFC',
                              borderColor: '#E2E8F0',
                              color: '#475569'
                            }}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex items-baseline justify-center gap-1 py-1">
                      <span className="text-2xl font-black text-slate-850" style={{ color: themeColor }}>
                        ₹{currentTier.price}
                      </span>
                      <span className="text-xs text-slate-400">/ {currentTier.suffix}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold block -mt-1">{currentTier.text}</span>

                    <div className="space-y-2 pt-4 border-t border-slate-100 text-left text-xs text-slate-600 max-w-[200px] mx-auto">
                      {planForm.features.slice(0, 3).map(f => (
                        <div key={f.feature_code} className="flex items-center gap-2">
                          <div
                            className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: `${themeColor}12`,
                              color: themeColor
                            }}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                          </div>
                          <span className="truncate">{f.name}</span>
                        </div>
                      ))}
                      {planForm.features.length === 0 && (
                        <>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0"
                              style={{
                                backgroundColor: `${themeColor}12`,
                                color: themeColor
                              }}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                            </div>
                            <span>Unlimited Matches</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0"
                              style={{
                                backgroundColor: `${themeColor}12`,
                                color: themeColor
                              }}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                            </div>
                            <span>Priority Search</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0"
                              style={{
                                backgroundColor: `${themeColor}12`,
                                color: themeColor
                              }}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                            </div>
                            <span>Premium Badge</span>
                          </div>
                        </>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      className="w-full border-slate-200 rounded-xl py-4 text-xs font-bold h-9 mt-2 transition-all duration-300"
                      style={{
                        color: themeColor,
                        borderColor: `${themeColor}30`
                      }}
                    >
                      + More Benefits
                    </Button>
                  </div>
                );
              })()}
            </div>

            {/* Plan Highlights */}
            <div className="bg-white border border-[#EADCC9] rounded-3xl p-6 space-y-4 shadow-sm">
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Plan Highlights</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Quick summary of current configuration.</p>
              </div>

              {(() => {
                const themeColor = planForm.color_theme || "#EA580C";
                const priceTiers = [
                  { label: "Monthly", price: planForm.monthly_price },
                  { label: "Quarterly", price: planForm.quarterly_price },
                  { label: "Half-Yearly", price: planForm.half_yearly_price },
                  { label: "Yearly", price: planForm.yearly_price },
                  { label: "Lifetime", price: planForm.lifetime_price },
                ].filter(t => t.price > 0);

                const activeAddonsCount = planForm.benefits.filter(b => b.title.startsWith("Add-on:")).length;
                const limitedFeaturesCount = planForm.features.filter(f => f.limit_value > 0 && !f.is_unlimited).length;

                return (
                  <div className="space-y-3.5 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-500 font-medium">Billing Cycles</span>
                      <span className="font-bold text-slate-800 text-right max-w-[180px] truncate" title={priceTiers.map(t => `${t.label} (₹${t.price})`).join(", ")}>
                        {priceTiers.length > 0 ? priceTiers.map(t => `${t.label} (₹${t.price})`).join(", ") : "Not Configured"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-500 font-medium">Trial Period</span>
                      <span className="font-bold text-slate-800">
                        {planForm.is_trial && planForm.trial_days > 0 ? `${planForm.trial_days} Days` : "No Trial"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-500 font-medium">Features</span>
                      <span className="font-bold text-slate-800">
                        {planForm.features.length > 0 ? `${planForm.features.length} Enabled` : "None Selected"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-500 font-medium">Add-ons compatibility</span>
                      <span className="font-bold text-slate-800">
                        {activeAddonsCount > 0 ? `${activeAddonsCount} Supported` : "None Allowed"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-500 font-medium">Coupons</span>
                      <span className="font-bold text-slate-800">
                        {planForm.coupon_applicable ? "Eligible" : "Not Applicable"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-500 font-medium">Limits</span>
                      <span className="font-bold text-slate-800">
                        {limitedFeaturesCount > 0 ? `${limitedFeaturesCount} Limited Items` : "All Unlimited"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-slate-500 font-medium">Theme & Style</span>
                      <div className="flex items-center gap-1.5 font-bold">
                        <div className="w-3 h-3 rounded-full border border-slate-200" style={{ backgroundColor: themeColor }} />
                        <span className="text-slate-850 uppercase text-[10px]">{themeColor}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="bg-white border border-[#EADCC9] rounded-2xl py-4 px-6 flex items-center justify-between shadow-sm">
          <Button
            type="button"
            onClick={() => {
              if (confirm("Discard changes and return to console?")) {
                const key = `wag_plan_builder_draft_${editingPlan ? editingPlan.id : "new"}`;
                localStorage.removeItem(key);
                setIsPlanModalOpen(false);
                setEditingPlan(null);
              }
            }}
            variant="outline"
            className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl px-5 h-10 text-xs font-bold"
          >
            Cancel
          </Button>

          <div className="text-center">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Step {wizardStep + 1} of 7</span>
            <span className="text-sm font-black text-slate-800">
              {wizardStep === 0 && "Basic Information"}
              {wizardStep === 1 && "Pricing & Cycle"}
              {wizardStep === 2 && "Features & Modules"}
              {wizardStep === 3 && "Limits & Quotas"}
              {wizardStep === 4 && "Add-ons"}
              {wizardStep === 5 && "Coupons & Trial"}
              {wizardStep === 6 && "Review & Publish"}
            </span>
          </div>

          {wizardStep < 6 ? (
            <Button
              type="button"
              onClick={() => setWizardStep(prev => Math.min(6, prev + 1))}
              className="bg-[#EA580C] hover:bg-[#D94E06] text-white rounded-xl px-6 h-10 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-orange-700/20"
            >
              Next Step <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={async () => {
                const err = validatePlan();
                if (err) {
                  toast.error(err);
                  return;
                }
                try {
                  const payload = { ...planForm, status: "active" };
                  const draftKey = `wag_plan_builder_draft_${editingPlan ? editingPlan.id : "new"}`;
                  if (editingPlan) {
                    await api.updateMemberPremiumPlan(editingPlan.id, payload);
                    toast.success("Premium plan published and updated successfully!");
                  } else {
                    await api.createMemberPremiumPlan(payload);
                    toast.success("Premium plan published successfully!");
                  }
                  localStorage.removeItem(draftKey);
                  setIsPlanModalOpen(false);
                  setEditingPlan(null);
                  fetchData();
                } catch (err: any) {
                  toast.error(err.message || "Failed to publish plan.");
                }
              }}
              className="bg-emerald-650 hover:bg-emerald-700 text-white rounded-xl px-6 h-10 text-xs font-bold shadow-md shadow-emerald-700/20"
            >
              Publish Plan
            </Button>
          )}
        </div>
        {renderAddonModal()}
      </div>
    );
  }

  return (
    <PageWrap
      title="Member Premium Console"
      desc="Super Admin control center for premium plans, feature matrices, transactions, and license assignments."
      action={
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={fetchData}
            className="border-[#E6D9C8] text-slate-700 hover:bg-[#FCF5EC] rounded-xl flex items-center gap-1.5 h-10 px-4"
          >
            <RefreshCw className="w-4 h-4" /> Sync Console
          </Button>
          <Button
            onClick={() => {
              setEditingPlan(null);
              const restored = checkAndLoadDraft("new");
              if (!restored) {
                setPlanForm({
                  name: "",
                  code: "",
                  plan_type: "custom",
                  short_description: "",
                  description: "",
                  color_theme: "#EA580C",
                  icon: "Crown",
                  monthly_price: 0,
                  quarterly_price: 0,
                  half_yearly_price: 0,
                  yearly_price: 0,
                  lifetime_price: 0,
                  currency: "INR",
                  gst_percentage: 18,
                  discount_percentage: 0,
                  trial_days: 14,
                  grace_period_days: 7,
                  status: "active",
                  display_order: 1,
                  display_badge: "",
                  is_popular: false,
                  is_recommended: false,
                  is_best_seller: false,
                  is_trial: false,
                  auto_renew_enabled: true,
                  coupon_applicable: true,
                  metadata: {
                    category: "premium",
                    visibility: "public",
                    tax_type: "exclusive",
                    custom_pricing_allowed: false,
                    trial_features: [],
                    trial_restrictions: "",
                    referral_discount: 0,
                    festival_offer: "",
                    renewal_discount: 0,
                    downgrade_rules: "",
                    auto_expiry: false,
                    permissions: {},
                  },
                  features: [],
                  benefits: [],
                });
                setWizardStep(0);
              }
              setIsPlanModalOpen(true);
            }}
            className="bg-[#EA580C] hover:bg-[#D94E06] text-white rounded-xl h-10 px-4 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Create Plan
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Dynamic Horizontal Grouped Tabs Switcher */}
        <div className="flex border-b border-[#E6D9C8] overflow-x-auto gap-2 pb-px scrollbar-none">
          {groups.map((group) => {
            const isActive = group.tabs.includes(activeTab);
            return (
              <button
                key={group.id}
                onClick={() => {
                  // Switch to the first tab of the selected group
                  setActiveTab(group.tabs[0] as SuperTabKey);
                }}
                className={`flex items-center gap-2 px-5 py-3 text-xs font-bold whitespace-nowrap transition-all border-b-2 rounded-t-xl -mb-px ${isActive
                    ? "border-[#EA580C] text-[#EA580C] bg-[#EA580C]/5 font-extrabold"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-[#FCF5EC]"
                  }`}
              >
                {group.id === "overview" && <LayoutDashboard className="w-4 h-4" />}
                {group.id === "plans_matrix" && <Layers className="w-4 h-4" />}
                {group.id === "memberships" && <Users className="w-4 h-4" />}
                {group.id === "finance" && <DollarSign className="w-4 h-4" />}
                {group.id === "settings_group" && <Settings className="w-4 h-4" />}
                {group.label}
              </button>
            );
          })}
        </div>

        {/* Secondary Navigation Selector Pills */}
        <div className="flex flex-wrap gap-2 p-1.5 bg-[#FFFDF9] border border-[#E6D9C8] rounded-2xl max-w-max">
          {groups
            .find((g) => g.tabs.includes(activeTab))
            ?.tabs.map((tabId) => {
              const tabDetails = tabNamesMap[tabId];
              const Icon = tabDetails.icon;
              const isActive = activeTab === tabId;
              return (
                <button
                  key={tabId}
                  onClick={() => setActiveTab(tabId as SuperTabKey)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${isActive
                      ? "bg-[#EA580C] text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-800 hover:bg-[#FCF5EC]/50"
                    }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tabDetails.label}
                </button>
              );
            })}
        </div>

        {/* Scrollable Main Content Workspace Area */}
        <div className="space-y-8 pt-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <RefreshCw className="w-8 h-8 text-[#EA580C] animate-spin" />
              <p className="text-sm font-semibold text-slate-500">Syncing Subscription Database...</p>
            </div>
          ) : (
            <>
              {/* TAB: DASHBOARD */}
              {activeTab === "dashboard" && (
                <div className="space-y-8">
                  {/* KPI Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="bg-white border-[#E6D9C8] shadow-sm rounded-2xl">
                      <CardContent className="p-6 space-y-2">
                        <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Total Premium Members</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-slate-900">{totalSubscribers}</span>
                          <span className="text-xs font-bold text-emerald-500 flex items-center gap-0.5">
                            <TrendingUp className="w-3 h-3" /> +12%
                          </span>
                        </div>
                        <Progress value={85} className="h-1.5 bg-slate-100" />
                      </CardContent>
                    </Card>

                    <Card className="bg-white border-[#E6D9C8] shadow-sm rounded-2xl">
                      <CardContent className="p-6 space-y-2">
                        <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Active Members</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-slate-900">{activeSubscribers}</span>
                          <span className="text-xs font-medium text-slate-400">subscribers</span>
                        </div>
                        <Progress value={(activeSubscribers / (totalSubscribers || 1)) * 100} className="h-1.5 bg-slate-100" />
                      </CardContent>
                    </Card>

                    <Card className="bg-white border-[#E6D9C8] shadow-sm rounded-2xl">
                      <CardContent className="p-6 space-y-2">
                        <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Revenue Today</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-[#EA580C]">₹{totalRevenue.toLocaleString()}</span>
                          <span className="text-xs font-bold text-emerald-500">Target Hit</span>
                        </div>
                        <Progress value={92} className="h-1.5 bg-slate-100" />
                      </CardContent>
                    </Card>

                    <Card className="bg-white border-[#E6D9C8] shadow-sm rounded-2xl">
                      <CardContent className="p-6 space-y-2">
                        <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Trial Conversion</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-slate-900">42.8%</span>
                          <span className="text-xs font-medium text-[#EA580C]">{trialSubscribers} in Trial</span>
                        </div>
                        <Progress value={42.8} className="h-1.5 bg-slate-100" />
                      </CardContent>
                    </Card>
                  </div>

                  {/* Chart and distribution */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="col-span-2 bg-white border-[#E6D9C8] shadow-sm rounded-2xl p-6 space-y-4">
                      <h3 className="text-lg font-bold text-slate-900">Subscription Status Overview</h3>
                      <div className="h-64 flex items-end justify-between gap-4 pt-10 px-4">
                        {[
                          { label: "Active", val: activeSubscribers, color: "bg-[#EA580C]" },
                          { label: "Trial", val: trialSubscribers, color: "bg-amber-400" },
                          { label: "Expired", val: expiredSubscribers, color: "bg-slate-300" }
                        ].map((bar, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                            <div
                              className={`${bar.color} w-16 rounded-t-xl transition-all duration-500`}
                              style={{ height: `${(bar.val / (totalSubscribers || 1)) * 100}%`, minHeight: "10%" }}
                            />
                            <span className="text-xs font-bold text-slate-600">{bar.label} ({bar.val})</span>
                          </div>
                        ))}
                      </div>
                    </Card>

                    <Card className="bg-white border-[#E6D9C8] shadow-sm rounded-2xl p-6 space-y-4">
                      <h3 className="text-lg font-bold text-slate-900">Plan Subscribers Distribution</h3>
                      <div className="space-y-4 pt-4">
                        {plans.map(p => {
                          const count = subscriptions.filter(s => s.plan_id === p.id).length;
                          const percent = totalSubscribers > 0 ? (count / totalSubscribers) * 100 : 0;
                          return (
                            <div key={p.id} className="space-y-2">
                              <div className="flex justify-between items-center text-sm font-semibold">
                                <span className="text-slate-800">{p.name}</span>
                                <span className="text-[#EA580C]">{count} users</span>
                              </div>
                              <Progress value={percent} className="h-2 bg-slate-100" />
                            </div>
                          );
                        })}
                        {plans.length === 0 && (
                          <p className="text-xs text-slate-400 text-center py-10">No active plans found to map distribution.</p>
                        )}
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {/* TAB: PLANS */}
              {activeTab === "plans" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-extrabold text-slate-900">Active Membership Plans ({plans.length})</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map(p => (
                      <Card key={p.id} className="bg-white border-[#E6D9C8] shadow-sm rounded-2xl overflow-hidden flex flex-col justify-between">
                        <CardHeader className="pb-4">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-[#EA580C]/10 text-[#EA580C] border-none font-bold rounded-full">
                                {p.code.toUpperCase()}
                              </Badge>
                              {p.icon && (
                                <div className="p-1 bg-slate-50 border border-slate-100 rounded-lg text-slate-700">
                                  {React.createElement((LucideIcons as any)[p.icon] || Crown, { className: "w-4 h-4 text-[#EA580C]" })}
                                </div>
                              )}
                            </div>
                            <span className={`w-3.5 h-3.5 rounded-full ${p.status === "active" ? "bg-emerald-500" : "bg-slate-300"}`} />
                          </div>
                          <CardTitle className="text-xl font-bold text-slate-900 mt-2">{p.name}</CardTitle>
                          <CardDescription className="text-slate-500 text-xs">{p.short_description}</CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-4">
                          <div className="text-3xl font-black text-slate-900">
                            ₹{p.monthly_price}
                            <span className="text-xs font-normal text-slate-400"> / month</span>
                          </div>
                          <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs text-slate-600">
                            <div className="flex justify-between">
                              <span>Quarterly Rate</span>
                              <span className="font-semibold text-slate-900">₹{p.quarterly_price}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Yearly Rate</span>
                              <span className="font-semibold text-slate-900">₹{p.yearly_price}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Grace Period</span>
                              <span className="font-semibold text-slate-900">{p.grace_period_days} Days</span>
                            </div>
                          </div>
                        </CardContent>

                        <CardFooter className="bg-slate-50 p-4 border-t border-[#E6D9C8]/40 flex gap-2">
                          <Button
                            onClick={() => handleEditPlan(p)}
                            variant="outline"
                            className="flex-1 border-[#E6D9C8] text-slate-700 hover:bg-white rounded-xl text-xs h-9"
                          >
                            <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                          </Button>
                          <Button
                            onClick={() => handleClonePlan(p.id)}
                            variant="outline"
                            className="border-[#E6D9C8] text-slate-700 hover:bg-white rounded-xl text-xs h-9"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            onClick={() => handleArchivePlan(p.id)}
                            variant="outline"
                            title="Archive Plan"
                            className="border-[#E6D9C8] text-amber-600 hover:bg-amber-50 rounded-xl text-xs h-9"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            onClick={() => handleDeletePlan(p.id)}
                            variant="outline"
                            title="Delete Plan"
                            className="border-[#E6D9C8] text-red-600 hover:bg-red-50 rounded-xl text-xs h-9"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                    {plans.length === 0 && (
                      <div className="col-span-3 text-center py-20 bg-white border border-[#E6D9C8] rounded-2xl text-slate-400">
                        No Premium Plans created. Click "Create Plan" to define your first individual plan.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: FEATURES */}
              {activeTab === "features" && (
                <div className="bg-white border border-[#E6D9C8] rounded-2xl shadow-sm p-6 space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Feature Registry Catalog</h3>
                      <p className="text-xs text-slate-400">Register core app capabilities to toggle dynamically in plans.</p>
                    </div>
                    <Button
                      onClick={() => setIsFeatureModalOpen(true)}
                      className="bg-[#EA580C] hover:bg-[#D94E06] text-white rounded-xl h-10 px-4 flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> Register Feature
                    </Button>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#E6D9C8]">
                        <TableHead className="text-slate-500 font-semibold">Feature Details</TableHead>
                        <TableHead className="text-slate-500 font-semibold">Registry Code</TableHead>
                        <TableHead className="text-slate-500 font-semibold">Category</TableHead>
                        <TableHead className="text-slate-500 font-semibold">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {features.map((feat) => (
                        <TableRow key={feat.id} className="border-[#E6D9C8]">
                          <TableCell className="font-semibold text-slate-800">
                            <div>
                              <span>{feat.name}</span>
                              <span className="text-[10px] text-slate-400 block">{feat.description}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-[#EA580C]">{feat.feature_code}</TableCell>
                          <TableCell className="capitalize text-slate-600">{feat.category}</TableCell>
                          <TableCell>
                            <Badge className="bg-emerald-100 text-emerald-700 border-none font-bold rounded-full">
                              Active
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {features.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-slate-400 py-10">
                            No features registered in catalog yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* TAB: FEATURE MATRIX */}
              {activeTab === "matrix" && (
                <div className="bg-white border border-[#E6D9C8] rounded-2xl shadow-sm p-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Dynamic Feature Matrix Grid</h3>
                    <p className="text-xs text-slate-400">Map registered benefits directly to active premium tiers.</p>
                  </div>

                  <div className="overflow-x-auto">
                    <Table className="min-w-[800px]">
                      <TableHeader>
                        <TableRow className="border-[#E6D9C8]">
                          <TableHead className="w-1/3 text-slate-500 font-semibold bg-slate-50/50">Feature Benefit</TableHead>
                          {plans.map(p => (
                            <TableHead key={p.id} className="text-center font-bold text-slate-950">
                              {p.name}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.from(new Set(features.map(f => f.feature_code))).map((featCode) => {
                          const featObj = features.find(f => f.feature_code === featCode);
                          return (
                            <TableRow key={featCode} className="border-[#E6D9C8]">
                              <TableCell className="font-semibold text-slate-800">
                                <div>
                                  <span>{featObj?.name || featCode}</span>
                                  <span className="text-[10px] text-slate-400 block font-mono">{featCode}</span>
                                </div>
                              </TableCell>
                              {plans.map(p => {
                                const hasFeat = features.find(f => f.plan === p.id && f.feature_code === featCode && f.is_enabled);
                                return (
                                  <TableCell key={`${p.id}-${featCode}`} className="text-center">
                                    <button
                                      onClick={() => handleToggleMatrixFeature(p.id, featObj)}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${hasFeat ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
                                        }`}
                                    >
                                      {hasFeat ? "Enabled" : "Disabled"}
                                    </button>
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          );
                        })}
                        {plans.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={10} className="text-center text-slate-400 py-10">
                              Please create a plan first to populate the matrix columns.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* TAB: ACTIVE MEMBERS */}
              {activeTab === "members" && (
                <div className="bg-white border border-[#E6D9C8] rounded-2xl shadow-sm p-6 space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Premium Members Registry</h3>
                      <p className="text-xs text-slate-400">View and manage subscription allocations.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Input
                        placeholder="Search subscriber email/name..."
                        value={memberSearch}
                        onChange={e => setMemberSearch(e.target.value)}
                        className="bg-[#FCF5EC] border-[#E6D9C8] w-64 rounded-xl"
                      />
                      <select
                        value={memberPlanFilter}
                        onChange={e => setMemberPlanFilter(e.target.value)}
                        className="bg-[#FCF5EC] border border-[#E6D9C8] p-2.5 rounded-xl text-sm focus:outline-none"
                      >
                        <option value="all">All Plans</option>
                        {plans.map(p => (
                          <option key={p.id} value={p.code}>{p.name}</option>
                        ))}
                      </select>
                      <Button onClick={() => handleExport("csv")} className="bg-[#EA580C] hover:bg-[#D94E06] text-white rounded-xl">
                        Export CSV
                      </Button>
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#E6D9C8]">
                        <TableHead className="text-slate-500 font-semibold">Subscriber</TableHead>
                        <TableHead className="text-slate-500 font-semibold">Plan</TableHead>
                        <TableHead className="text-slate-500 font-semibold">Interval</TableHead>
                        <TableHead className="text-slate-500 font-semibold">Expiry Date</TableHead>
                        <TableHead className="text-slate-500 font-semibold">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubs.map((sub) => (
                        <TableRow key={sub.id} className="border-[#E6D9C8]">
                          <TableCell className="font-semibold text-slate-800">
                            <div>
                              <span>{sub.member_name}</span>
                              <span className="text-xs text-slate-400 block">{sub.member_email}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold text-[#EA580C]">{sub.plan_name}</TableCell>
                          <TableCell className="capitalize text-slate-600">{sub.billing_cycle}</TableCell>
                          <TableCell className="text-slate-600">
                            {sub.end_date ? new Date(sub.end_date).toLocaleDateString() : "Lifetime"}
                          </TableCell>
                          <TableCell>
                            <Badge className={`border-none font-bold rounded-full ${sub.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                              }`}>
                              {sub.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredSubs.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-slate-400 py-10">
                            No matching premium subscriptions found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* TAB: MEMBER ASSIGNMENTS */}
              {activeTab === "assignments" && (
                <div className="bg-white border border-[#E6D9C8] rounded-2xl shadow-sm p-6 space-y-6 max-w-2xl">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Direct Subscription Allocation</h3>
                    <p className="text-xs text-slate-400">Override policies and directly assign premium tiers to members.</p>
                  </div>

                  <form onSubmit={handleAssignSubmit} className="space-y-4">
                    <div>
                      <span className="text-xs text-slate-500 block mb-1">Select Member Account</span>
                      <select
                        required
                        value={assignForm.member_id}
                        onChange={e => setAssignForm({ ...assignForm, member_id: e.target.value })}
                        className="w-full bg-[#FCF5EC] border border-[#E6D9C8] p-3 rounded-xl text-sm focus:outline-none"
                      >
                        <option value="">-- Choose Member Profile --</option>
                        {allMembers.map(m => (
                          <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <span className="text-xs text-slate-500 block mb-1">Premium Plan Tier</span>
                      <select
                        required
                        value={assignForm.plan_id}
                        onChange={e => setAssignForm({ ...assignForm, plan_id: e.target.value })}
                        className="w-full bg-[#FCF5EC] border border-[#E6D9C8] p-3 rounded-xl text-sm focus:outline-none"
                      >
                        <option value="">-- Select Premium Plan --</option>
                        {plans.map(p => (
                          <option key={p.id} value={p.id}>{p.name} (₹{p.monthly_price}/mo)</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs text-slate-500 block mb-1">Billing Cycle Override</span>
                        <select
                          value={assignForm.billing_cycle}
                          onChange={e => setAssignForm({ ...assignForm, billing_cycle: e.target.value })}
                          className="w-full bg-[#FCF5EC] border border-[#E6D9C8] p-3 rounded-xl text-sm focus:outline-none"
                        >
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block mb-1">Override Price Paid (₹)</span>
                        <input
                          type="number"
                          value={assignForm.amount_paid}
                          onChange={e => setAssignForm({ ...assignForm, amount_paid: Number(e.target.value) })}
                          className="w-full bg-[#FCF5EC] border border-[#E6D9C8] p-3 rounded-xl text-sm focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="text-xs text-slate-500 block mb-1">Admin Audit Notes</span>
                      <input
                        type="text"
                        value={assignForm.notes}
                        onChange={e => setAssignForm({ ...assignForm, notes: e.target.value })}
                        placeholder="e.g. Free trial extension request"
                        className="w-full bg-[#FCF5EC] border border-[#E6D9C8] p-3 rounded-xl text-sm focus:outline-none"
                      />
                    </div>

                    <Button type="submit" className="w-full bg-[#EA580C] hover:bg-[#D94E06] text-white rounded-xl py-3 font-bold">
                      Process Subscription Allocation
                    </Button>
                  </form>
                </div>
              )}

              {/* TAB: BILLING */}
              {activeTab === "billing" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-white border-[#E6D9C8] shadow-sm rounded-2xl p-6">
                      <span className="text-xs font-bold text-slate-400 block mb-1">Gross Invoiced Revenue</span>
                      <div className="text-3xl font-black text-slate-900">₹{totalRevenue.toLocaleString()}</div>
                      <span className="text-[10px] text-slate-400 block mt-2">Before taxes and promotional discounts</span>
                    </Card>
                    <Card className="bg-white border-[#E6D9C8] shadow-sm rounded-2xl p-6">
                      <span className="text-xs font-bold text-slate-400 block mb-1">Pending Gateways Transactions</span>
                      <div className="text-3xl font-black text-amber-500">{pendingPayments}</div>
                      <span className="text-[10px] text-slate-400 block mt-2">Awaiting webhook callback validation</span>
                    </Card>
                    <Card className="bg-white border-[#E6D9C8] shadow-sm rounded-2xl p-6">
                      <span className="text-xs font-bold text-slate-400 block mb-1">Failed Payments Retries</span>
                      <div className="text-3xl font-black text-red-500">{failedPayments}</div>
                      <span className="text-[10px] text-slate-400 block mt-2">Flagged for automated warning mail</span>
                    </Card>
                  </div>
                </div>
              )}

              {/* TAB: COUPONS */}
              {activeTab === "coupons" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Coupons & Promotions</h3>
                      <p className="text-xs text-slate-400">Generate discount coupon codes for checkout.</p>
                    </div>
                    <Button
                      onClick={() => setIsCouponModalOpen(true)}
                      className="bg-[#EA580C] hover:bg-[#D94E06] text-white rounded-xl h-10 px-4 flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> Create Coupon
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {coupons.map((c) => (
                      <Card key={c.id} className="bg-white border-[#E6D9C8] shadow-sm rounded-2xl p-5 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-base text-[#EA580C]">{c.code}</span>
                          <Badge className="bg-emerald-100 text-emerald-700 border-none font-bold rounded-full">
                            Active
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500">
                          Discount: <span className="font-bold text-slate-800">{c.discount_value}{c.coupon_type === "percentage" ? "%" : " Flat"} Off</span>
                        </p>
                        <p className="text-xs text-slate-500">Usage Limit: {c.used_count || 0} / {c.usage_limit || "Unlimited"}</p>
                        <p className="text-[10px] text-slate-400">Expires: {c.expiry_date ? new Date(c.expiry_date).toLocaleDateString() : "Never"}</p>
                      </Card>
                    ))}
                    {coupons.length === 0 && (
                      <div className="col-span-3 text-center py-20 bg-white border border-[#E6D9C8] rounded-2xl text-slate-400">
                        No Coupons configured yet. Click "Create Coupon" to configure one.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: TRIALS */}
              {activeTab === "trials" && (
                <div className="bg-white border border-[#E6D9C8] rounded-2xl shadow-sm p-6 space-y-6 max-w-xl">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Trial Period Management</h3>
                    <p className="text-xs text-slate-400">Configure global trial duration and allocations.</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <span className="text-xs text-slate-500 block mb-1">Default Trial Duration (Days)</span>
                      <input
                        type="number"
                        value={trialDaysConfig}
                        onChange={e => setTrialDaysConfig(Number(e.target.value))}
                        className="w-full bg-[#FCF5EC] border border-[#E6D9C8] p-3 rounded-xl text-sm focus:outline-none"
                      />
                    </div>

                    <div>
                      <span className="text-xs text-slate-500 block mb-1">Redirect Plan on Expiry</span>
                      <select
                        value={trialPlanCode}
                        onChange={e => setTrialPlanCode(e.target.value)}
                        className="w-full bg-[#FCF5EC] border border-[#E6D9C8] p-3 rounded-xl text-sm focus:outline-none"
                      >
                        <option value="free">Free Default Member Plan</option>
                        {plans.map(p => (
                          <option key={p.id} value={p.code}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <Button onClick={() => toast.success("Trial configurations saved globally!")} className="w-full bg-[#EA580C] hover:bg-[#D94E06] text-white rounded-xl py-3 font-bold">
                      Save Trial Configuration
                    </Button>
                  </div>
                </div>
              )}

              {/* TAB: ADD-ONS */}
              {activeTab === "addons" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">System Add-ons Extensions</h3>
                      <p className="text-xs text-slate-400">Create purchasable quota extensions (credits, space).</p>
                    </div>
                    <Button
                      onClick={() => setIsAddonModalOpen(true)}
                      className="bg-[#EA580C] hover:bg-[#D94E06] text-white rounded-xl h-10 px-4 flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> Create Add-on
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {addons.map((a) => (
                      <Card key={a.id} className="bg-white border-[#E6D9C8] shadow-sm rounded-2xl p-5 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-base text-slate-800">{a.name}</span>
                          <Badge className="bg-indigo-100 text-indigo-700 border-none font-bold rounded-full">
                            ₹{a.price}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500">{a.description}</p>
                        <span className="text-[10px] text-slate-400 block font-mono">Limit: +{a.limit_value} {a.limit_type.replace("_", " ")}</span>
                      </Card>
                    ))}
                    {addons.length === 0 && (
                      <div className="col-span-3 text-center py-20 bg-white border border-[#E6D9C8] rounded-2xl text-slate-400">
                        No purchasable add-ons extensions configured yet.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: TRANSACTIONS */}
              {activeTab === "transactions" && (
                <div className="bg-white border border-[#E6D9C8] rounded-2xl shadow-sm p-6 space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Transactions Ledger</h3>
                      <p className="text-xs text-slate-400">A detailed chronological audit log of all payment gateway checkouts.</p>
                    </div>
                    <Input
                      placeholder="Search Transaction ID / member..."
                      value={txnSearch}
                      onChange={e => setTxnSearch(e.target.value)}
                      className="bg-[#FCF5EC] border-[#E6D9C8] w-64 rounded-xl"
                    />
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#E6D9C8]">
                        <TableHead className="text-slate-500 font-semibold">Transaction ID</TableHead>
                        <TableHead className="text-slate-500 font-semibold">Subscriber</TableHead>
                        <TableHead className="text-slate-500 font-semibold">Amount Paid</TableHead>
                        <TableHead className="text-slate-500 font-semibold">Gateway</TableHead>
                        <TableHead className="text-slate-500 font-semibold">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTxns.map((t) => (
                        <TableRow key={t.id} className="border-[#E6D9C8]">
                          <TableCell className="font-mono text-xs">{t.transaction_id || `TXN-${t.id}`}</TableCell>
                          <TableCell className="font-semibold text-slate-800">{t.member_name}</TableCell>
                          <TableCell className="font-extrabold text-slate-900">₹{t.total_amount || t.amount || 0}</TableCell>
                          <TableCell className="capitalize text-slate-600">{t.payment_gateway}</TableCell>
                          <TableCell>
                            <Badge className={`border-none font-bold rounded-full ${t.transaction_status === "success" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                              }`}>
                              {t.transaction_status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredTxns.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-slate-400 py-10">
                            No checkout transaction logs recorded in ledger.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* TAB: NOTIFICATIONS */}
              {activeTab === "notifications" && (
                <div className="bg-white border border-[#E6D9C8] rounded-2xl shadow-sm p-6 space-y-6 max-w-xl">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Notification Subsystem</h3>
                    <p className="text-xs text-slate-400">Configure automated alerts and billing reminders triggers.</p>
                  </div>

                  <div className="space-y-4">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={notifySubPurchased}
                        onChange={e => setNotifySubPurchased(e.target.checked)}
                        className="rounded border-[#E6D9C8] text-[#EA580C] focus:ring-[#EA580C]"
                      />
                      <span className="text-sm font-semibold text-slate-700">Email notification on checkout purchase confirmation</span>
                    </label>

                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={notifyTrialEnding}
                        onChange={e => setNotifyTrialEnding(e.target.checked)}
                        className="rounded border-[#E6D9C8] text-[#EA580C] focus:ring-[#EA580C]"
                      />
                      <span className="text-sm font-semibold text-slate-700">Alert trial ends warning (3 days prior)</span>
                    </label>

                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={notifyPaymentFailed}
                        onChange={e => setNotifyPaymentFailed(e.target.checked)}
                        className="rounded border-[#E6D9C8] text-[#EA580C] focus:ring-[#EA580C]"
                      />
                      <span className="text-sm font-semibold text-slate-700">Alert community members on failed gateway retries</span>
                    </label>

                    <Button onClick={() => toast.success("Notification settings saved!")} className="w-full bg-[#EA580C] hover:bg-[#D94E06] text-white rounded-xl py-3 font-bold">
                      Save Alert Configurations
                    </Button>
                  </div>
                </div>
              )}

              {/* TAB: ANALYTICS */}
              {activeTab === "analytics" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="bg-white border-[#E6D9C8] shadow-sm rounded-2xl p-6 space-y-4">
                      <h3 className="text-lg font-bold text-slate-900">Revenue Generation Performance</h3>
                      <div className="h-64 flex items-end justify-between gap-4 pt-10 px-4">
                        {[
                          { label: "Q1 Revenue", val: totalRevenue * 0.8 },
                          { label: "Q2 Revenue", val: totalRevenue * 1.1 },
                          { label: "Q3 Revenue", val: totalRevenue }
                        ].map((q, idx) => (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                            <div className="bg-[#EA580C] w-20 rounded-t-xl" style={{ height: `${(q.val / (totalRevenue || 1)) * 100}%`, minHeight: "20%" }} />
                            <span className="text-xs font-semibold text-slate-600">{q.label}</span>
                          </div>
                        ))}
                      </div>
                    </Card>

                    <Card className="bg-white border-[#E6D9C8] shadow-sm rounded-2xl p-6 space-y-4">
                      <h3 className="text-lg font-bold text-slate-900">Retention & Renewals</h3>
                      <div className="space-y-4 pt-4">
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm font-bold">
                            <span>Monthly Active Retention</span>
                            <span className="text-emerald-500">94.2%</span>
                          </div>
                          <Progress value={94.2} className="h-2 bg-slate-100" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm font-bold">
                            <span>Yearly Contract Rollover</span>
                            <span className="text-[#EA580C]">88.5%</span>
                          </div>
                          <Progress value={88.5} className="h-2 bg-slate-100" />
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {/* TAB: AUDIT */}
              {activeTab === "audit" && (
                <div className="bg-white border border-[#E6D9C8] rounded-2xl shadow-sm p-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Security Audit Logs</h3>
                    <p className="text-xs text-slate-400">Strict read-only trail mapping all super admin actions.</p>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#E6D9C8]">
                        <TableHead className="text-slate-500 font-semibold">Timestamp</TableHead>
                        <TableHead className="text-slate-500 font-semibold">Operator</TableHead>
                        <TableHead className="text-slate-500 font-semibold">Action Triggered</TableHead>
                        <TableHead className="text-slate-500 font-semibold">Metadata Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map((log) => (
                        <TableRow key={log.id} className="border-[#E6D9C8]">
                          <TableCell className="text-xs font-mono text-slate-500">
                            {new Date(log.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-semibold text-slate-800">
                            {log.performed_by_name || "System"}
                          </TableCell>
                          <TableCell className="font-bold text-xs text-[#EA580C] uppercase">
                            {log.action}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {log.description}
                          </TableCell>
                        </TableRow>
                      ))}
                      {auditLogs.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-slate-400 py-10">
                            No admin audit trail log records found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* TAB: SETTINGS */}
              {activeTab === "settings" && (
                <div className="bg-white border border-[#E6D9C8] rounded-2xl shadow-sm p-6 space-y-6 max-w-xl">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Global Billing Settings</h3>
                    <p className="text-xs text-slate-400">Configure global currency, GST taxes and standard defaults.</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <span className="text-xs text-slate-500 block mb-1">Global Base Currency</span>
                      <select
                        value={currency}
                        onChange={e => setCurrency(e.target.value)}
                        className="w-full bg-[#FCF5EC] border border-[#E6D9C8] p-3 rounded-xl text-sm focus:outline-none"
                      >
                        <option value="INR">Indian Rupee (₹)</option>
                        <option value="USD">US Dollar ($)</option>
                        <option value="EUR">Euro (€)</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-xs text-slate-500 block mb-1">Standard GST Tax Rate (%)</span>
                      <input
                        type="number"
                        value={taxRate}
                        onChange={e => setTaxRate(Number(e.target.value))}
                        className="w-full bg-[#FCF5EC] border border-[#E6D9C8] p-3 rounded-xl text-sm focus:outline-none"
                      />
                    </div>

                    <Button onClick={() => toast.success("Global configuration saved!")} className="w-full bg-[#EA580C] hover:bg-[#D94E06] text-white rounded-xl py-3 font-bold">
                      Save Workspace Configuration
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* DYNAMIC ENTERPRISE PLAN BUILDER WIZARD */}
        {isPlanModalOpen && (
          <Dialog open={isPlanModalOpen} onOpenChange={(open) => {
            setIsPlanModalOpen(open);
            if (!open) setEditingPlan(null);
          }}>
            <DialogContent className="bg-slate-50 border-none max-w-none w-screen h-screen m-0 rounded-none p-0 text-slate-800 flex flex-col overflow-hidden">
              {/* Header Title Bar */}
              <div className="h-16 bg-slate-900 text-white px-6 flex items-center justify-between shadow-md shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-600 rounded-lg text-white">
                    <Settings2 className="w-5 h-5 animate-spin" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black tracking-tight">
                      {editingPlan ? "Edit Premium Plan Configurator" : "Enterprise Premium Plan Builder"}
                    </h2>
                    <p className="text-xs text-slate-400">
                      Create a 100% database-driven dynamic membership package
                    </p>
                  </div>
                </div>

                {/* Progress Tracker */}
                <div className="hidden md:flex items-center gap-6 text-sm text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-orange-500">Step {wizardStep + 1} of 7:</span>
                    <span>
                      {wizardStep === 0 && "Basic Information"}
                      {wizardStep === 1 && "Pricing & Cycles"}
                      {wizardStep === 2 && "Feature Catalog"}
                      {wizardStep === 3 && "Limits & Quotas"}
                      {wizardStep === 4 && "Add-ons Compatibility"}
                      {wizardStep === 5 && "Review Plan"}
                      {wizardStep === 6 && "Publish & Preview"}
                    </span>
                  </div>
                  <div className="w-32 bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-orange-500 h-full transition-all duration-300"
                      style={{ width: `${((wizardStep + 1) / 7) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    onClick={exportPlanJson}
                    variant="outline"
                    className="border-slate-700 text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-xl text-xs h-9"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" /> Export JSON
                  </Button>
                  <Button
                    onClick={() => {
                      if (confirm("Are you sure you want to discard your changes?")) {
                        setIsPlanModalOpen(false);
                        setEditingPlan(null);
                      }
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl p-2 h-9 w-9 flex items-center justify-center border border-slate-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Split Screen Layout */}
              <div className="flex flex-1 overflow-hidden">
                {/* Left Steps Navigation */}
                <div className="w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col justify-between shrink-0 text-slate-300">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Builder Progress</p>
                    {[
                      { label: "Basic Info", icon: LayoutDashboard },
                      { label: "Pricing & Cycles", icon: CreditCard },
                      { label: "Feature Catalog", icon: Box },
                      { label: "Limits & Quotas", icon: HardDrive },
                      { label: "Add-ons Allowed", icon: Layers },
                      { label: "Review Summary", icon: FileText },
                      { label: "Preview & Launch", icon: Send },
                    ].map((step, idx) => {
                      const StepIcon = step.icon;
                      const isActive = wizardStep === idx;
                      const isCompleted = wizardStep > idx;

                      return (
                        <button
                          key={idx}
                          onClick={() => setWizardStep(idx)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs transition-all ${isActive
                              ? "bg-orange-600 text-white font-bold shadow-md shadow-orange-950/20"
                              : "hover:bg-slate-800 text-slate-400"
                            }`}
                        >
                          <div className={`p-1.5 rounded-lg ${isActive ? "bg-orange-500" : "bg-slate-800 text-slate-400"}`}>
                            <StepIcon className="w-3.5 h-3.5" />
                          </div>
                          <span className="flex-1">{step.label}</span>
                          {isCompleted && (
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-6 border-t border-slate-800 text-[11px] text-slate-500 space-y-1">
                    <p>Enterprise Plan Builder v3.0</p>
                    <p>Status: {editingPlan ? "Editing Draft" : "Creating New Plan"}</p>
                  </div>
                </div>

                {/* Center Main Form Area */}
                <div className="flex-1 bg-white p-8 overflow-y-auto flex flex-col justify-between">
                  <div className="max-w-4xl mx-auto w-full space-y-8">
                    {/* STEP 0: BASIC INFORMATION */}
                    {wizardStep === 0 && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-xl font-black text-slate-900">Step 1: Basic Information</h3>
                          <p className="text-xs text-slate-500">Configure key identifiers, visual aesthetics, category and visibility of the plan.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="text-xs text-slate-600 font-bold block mb-1">Plan Name</span>
                            <Input
                              required
                              value={planForm.name}
                              onChange={e => setPlanForm({ ...planForm, name: e.target.value })}
                              placeholder="e.g. Matrimony Premium Gold"
                              className="border-slate-200 focus:border-orange-500"
                            />
                          </div>
                          <div>
                            <span className="text-xs text-slate-600 font-bold block mb-1">Unique Plan Code</span>
                            <Input
                              required
                              disabled={!!editingPlan}
                              value={planForm.code}
                              onChange={e => setPlanForm({ ...planForm, code: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                              placeholder="e.g. premium_gold"
                              className="border-slate-200 focus:border-orange-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <span className="text-xs text-slate-600 font-bold block mb-1">Plan Category</span>
                            <select
                              value={planForm.metadata.category}
                              onChange={e => setPlanForm({
                                ...planForm,
                                metadata: { ...planForm.metadata, category: e.target.value }
                              })}
                              className="w-full bg-white border border-slate-200 p-2.5 rounded-md text-sm focus:outline-none focus:border-orange-500"
                            >
                              <option value="free">Free Tier</option>
                              <option value="premium">Premium Level</option>
                              <option value="enterprise">Enterprise Custom</option>
                            </select>
                          </div>

                          <div>
                            <span className="text-xs text-slate-600 font-bold block mb-1">Display Badge</span>
                            <Input
                              value={planForm.display_badge}
                              onChange={e => setPlanForm({ ...planForm, display_badge: e.target.value })}
                              placeholder="e.g. Most Popular, Recommended"
                              className="border-slate-200"
                            />
                          </div>

                          <div>
                            <span className="text-xs text-slate-600 font-bold block mb-1">Display Order</span>
                            <Input
                              type="number"
                              value={planForm.display_order}
                              onChange={e => setPlanForm({ ...planForm, display_order: Number(e.target.value) })}
                              className="border-slate-200"
                            />
                          </div>
                        </div>

                        <div>
                          <span className="text-xs text-slate-600 font-bold block mb-1">Description / Tagline</span>
                          <Input
                            value={planForm.short_description}
                            onChange={e => setPlanForm({ ...planForm, short_description: e.target.value })}
                            placeholder="e.g. Unlock full matrimony features and get priority search lists."
                            className="border-slate-200"
                          />
                        </div>

                        <div>
                          <span className="text-xs text-slate-600 font-bold block mb-1">Full HTML Description</span>
                          <textarea
                            value={planForm.description}
                            onChange={e => setPlanForm({ ...planForm, description: e.target.value })}
                            placeholder="Enter markdown or text details about the benefits..."
                            className="w-full h-24 border border-slate-200 rounded-md p-2.5 text-sm focus:outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
                          <div>
                            <span className="text-xs text-slate-600 font-bold block mb-2">Accent Color Theme</span>
                            <div className="grid grid-cols-5 gap-2">
                              {[
                                { label: "Amber", class: "from-yellow-500 to-orange-600" },
                                { label: "Indigo", class: "from-blue-500 to-indigo-600" },
                                { label: "Grape", class: "from-purple-500 to-pink-600" },
                                { label: "Emerald", class: "from-emerald-500 to-teal-600" },
                                { label: "Slate", class: "from-slate-700 to-slate-900" },
                              ].map((col) => (
                                <button
                                  key={col.class}
                                  type="button"
                                  onClick={() => setPlanForm({ ...planForm, color_theme: col.class })}
                                  className={`h-8 rounded-lg bg-gradient-to-br ${col.class} border-2 ${planForm.color_theme === col.class ? "border-slate-900 ring-2 ring-orange-500" : "border-transparent"
                                    }`}
                                  title={col.label}
                                />
                              ))}
                            </div>
                          </div>

                          <div>
                            <span className="text-xs text-slate-600 font-bold block mb-1">Plan Icon</span>
                            <select
                              value={planForm.icon}
                              onChange={e => setPlanForm({ ...planForm, icon: e.target.value })}
                              className="w-full bg-white border border-slate-200 p-2.5 rounded-md text-sm focus:outline-none"
                            >
                              <option value="Crown">Crown</option>
                              <option value="Sparkles">Sparkles</option>
                              <option value="Award">Award</option>
                              <option value="Zap">Zap</option>
                              <option value="ShieldCheck">Shield Check</option>
                              <option value="Heart">Heart</option>
                            </select>
                          </div>

                          <div>
                            <span className="text-xs text-slate-600 font-bold block mb-1">Visibility Policy</span>
                            <select
                              value={planForm.metadata.visibility}
                              onChange={e => setPlanForm({
                                ...planForm,
                                metadata: { ...planForm.metadata, visibility: e.target.value }
                              })}
                              className="w-full bg-white border border-slate-200 p-2.5 rounded-md text-sm focus:outline-none"
                            >
                              <option value="public">Visible (Public)</option>
                              <option value="hidden">Hidden (Admin Only)</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
                          <label className="flex items-center gap-2 cursor-pointer p-3 bg-slate-50 rounded-xl hover:bg-slate-100">
                            <input
                              type="checkbox"
                              checked={planForm.is_recommended}
                              onChange={e => setPlanForm({ ...planForm, is_recommended: e.target.checked })}
                              className="rounded text-orange-600 focus:ring-orange-500"
                            />
                            <span className="text-xs font-bold text-slate-700">Recommended</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer p-3 bg-slate-50 rounded-xl hover:bg-slate-100">
                            <input
                              type="checkbox"
                              checked={planForm.is_popular}
                              onChange={e => setPlanForm({ ...planForm, is_popular: e.target.checked })}
                              className="rounded text-orange-600 focus:ring-orange-500"
                            />
                            <span className="text-xs font-bold text-slate-700">Popular Plan</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer p-3 bg-slate-50 rounded-xl hover:bg-slate-100">
                            <input
                              type="checkbox"
                              checked={planForm.is_best_seller}
                              onChange={e => setPlanForm({ ...planForm, is_best_seller: e.target.checked })}
                              className="rounded text-orange-600 focus:ring-orange-500"
                            />
                            <span className="text-xs font-bold text-slate-700">Best Seller</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer p-3 bg-slate-50 rounded-xl hover:bg-slate-100">
                            <input
                              type="checkbox"
                              checked={planForm.is_trial}
                              onChange={e => setPlanForm({ ...planForm, is_trial: e.target.checked })}
                              className="rounded text-orange-600 focus:ring-orange-500"
                            />
                            <span className="text-xs font-bold text-slate-700">Trial Available</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* STEP 1: PRICING */}
                    {wizardStep === 1 && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-xl font-black text-slate-900">Step 2: Pricing & Cycles</h3>
                          <p className="text-xs text-slate-500">Configure cost rates across multiple billing terms, including discount adjustments and taxes.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <span className="text-xs text-slate-600 font-bold block mb-1">Base Currency</span>
                            <select
                              value={planForm.currency}
                              onChange={e => setPlanForm({ ...planForm, currency: e.target.value })}
                              className="w-full bg-white border border-slate-200 p-2.5 rounded-md text-sm focus:outline-none"
                            >
                              <option value="INR">INR (₹)</option>
                              <option value="USD">USD ($)</option>
                              <option value="EUR">EUR (€)</option>
                            </select>
                          </div>
                          <div>
                            <span className="text-xs text-slate-600 font-bold block mb-1">GST Tax Rate (%)</span>
                            <Input
                              type="number"
                              value={planForm.gst_percentage}
                              onChange={e => setPlanForm({ ...planForm, gst_percentage: Number(e.target.value) })}
                              className="border-slate-200"
                            />
                          </div>
                          <div>
                            <span className="text-xs text-slate-600 font-bold block mb-1">Standard Discount %</span>
                            <Input
                              type="number"
                              value={planForm.discount_percentage}
                              onChange={e => setPlanForm({ ...planForm, discount_percentage: Number(e.target.value) })}
                              className="border-slate-200"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-slate-100">
                          <div>
                            <span className="text-xs text-slate-500 block mb-1">Monthly Price</span>
                            <Input
                              type="number"
                              value={planForm.monthly_price}
                              onChange={e => setPlanForm({ ...planForm, monthly_price: Number(e.target.value) })}
                              className="border-slate-200 font-bold"
                            />
                          </div>
                          <div>
                            <span className="text-xs text-slate-500 block mb-1">Quarterly Price</span>
                            <Input
                              type="number"
                              value={planForm.quarterly_price}
                              onChange={e => setPlanForm({ ...planForm, quarterly_price: Number(e.target.value) })}
                              className="border-slate-200 font-bold"
                            />
                          </div>
                          <div>
                            <span className="text-xs text-slate-500 block mb-1">Half-Yearly Price</span>
                            <Input
                              type="number"
                              value={planForm.half_yearly_price}
                              onChange={e => setPlanForm({ ...planForm, half_yearly_price: Number(e.target.value) })}
                              className="border-slate-200 font-bold"
                            />
                          </div>
                          <div>
                            <span className="text-xs text-slate-500 block mb-1">Yearly Price</span>
                            <Input
                              type="number"
                              value={planForm.yearly_price}
                              onChange={e => setPlanForm({ ...planForm, yearly_price: Number(e.target.value) })}
                              className="border-slate-200 font-bold"
                            />
                          </div>
                          <div>
                            <span className="text-xs text-slate-500 block mb-1">Lifetime Rate</span>
                            <Input
                              type="number"
                              value={planForm.lifetime_price}
                              onChange={e => setPlanForm({ ...planForm, lifetime_price: Number(e.target.value) })}
                              className="border-slate-200 font-bold"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-100">
                          <div>
                            <span className="text-xs text-slate-600 font-bold block mb-1">Tax Calculation Policy</span>
                            <select
                              value={planForm.metadata.tax_type}
                              onChange={e => setPlanForm({
                                ...planForm,
                                metadata: { ...planForm.metadata, tax_type: e.target.value }
                              })}
                              className="w-full bg-white border border-slate-200 p-2.5 rounded-md text-sm focus:outline-none"
                            >
                              <option value="exclusive">Exclusive (Price + GST Tax)</option>
                              <option value="inclusive">Inclusive (Price includes GST)</option>
                            </select>
                          </div>

                          <label className="flex items-center gap-2 cursor-pointer p-4 bg-slate-50 rounded-xl hover:bg-slate-100">
                            <input
                              type="checkbox"
                              checked={planForm.auto_renew_enabled}
                              onChange={e => setPlanForm({ ...planForm, auto_renew_enabled: e.target.checked })}
                              className="rounded text-orange-600 focus:ring-orange-500"
                            />
                            <div>
                              <span className="text-xs font-bold text-slate-700 block">Automatic Renewal</span>
                              <span className="text-[10px] text-slate-400">Trigger standard gateways on expiry</span>
                            </div>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer p-4 bg-slate-50 rounded-xl hover:bg-slate-100">
                            <input
                              type="checkbox"
                              checked={planForm.metadata.custom_pricing_allowed}
                              onChange={e => setPlanForm({
                                ...planForm,
                                metadata: { ...planForm.metadata, custom_pricing_allowed: e.target.checked }
                              })}
                              className="rounded text-orange-600"
                            />
                            <div>
                              <span className="text-xs font-bold text-slate-700 block">Allow Custom Pricing</span>
                              <span className="text-[10px] text-slate-400">Admin override during offline sale</span>
                            </div>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* STEP 2: FEATURE CATALOG */}
                    {wizardStep === 2 && (
                      <div className="space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <h3 className="text-xl font-black text-slate-900">Step 3: Premium Feature Catalog</h3>
                            <p className="text-xs text-slate-500">Enable features dynamically from the database Premium Feature Registry.</p>
                          </div>
                          <div className="w-64">
                            <Input
                              placeholder="Search features..."
                              value={featureSearch}
                              onChange={e => setFeatureSearch(e.target.value)}
                              className="border-slate-200"
                            />
                          </div>
                        </div>

                        {/* Dynamic groups based on registry */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          {Array.from(new Set(featureRegistry.map(item => item.module)))
                            .filter(isModuleActiveInDashboard)
                            .map(module => {
                              const registryItems = featureRegistry.filter(item => item.module === module);
                              if (registryItems.length === 0) return null;

                              const isSelected = registryItems.every(item =>
                                planForm.features.some(f => f.feature_code === item.feature_code)
                              );

                              const matchesSearch = getModuleDisplayName(module).toLowerCase().includes(featureSearch.toLowerCase()) ||
                                getModuleDescription(module).toLowerCase().includes(featureSearch.toLowerCase()) ||
                                registryItems.some(item =>
                                  item.feature_name.toLowerCase().includes(featureSearch.toLowerCase()) ||
                                  item.description.toLowerCase().includes(featureSearch.toLowerCase())
                                );

                              if (featureSearch && !matchesSearch) return null;

                              return (
                                <label
                                  key={module}
                                  className={`flex items-start gap-4 p-5 rounded-2xl border cursor-pointer transition-all ${isSelected
                                      ? "border-orange-500 bg-orange-50/20 shadow-md shadow-orange-100/50"
                                      : "border-slate-100 hover:bg-slate-50 bg-white"
                                    }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelectAllModule(module, featureRegistry)}
                                    className="rounded mt-1 text-orange-600 focus:ring-orange-500 h-4.5 w-4.5 border-slate-300"
                                  />
                                  <div className="space-y-1.5 flex-1">
                                    <span className="text-sm font-black text-slate-800 block">
                                      {getModuleDisplayName(module)}
                                    </span>
                                    <span className="text-xs text-slate-500 block leading-relaxed">
                                      {getModuleDescription(module)}
                                    </span>
                                    <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-slate-100/60">
                                      {registryItems.map(item => (
                                        <span key={item.feature_code} className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
                                          {item.feature_name}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                        </div>

                        {featureRegistry.length === 0 && (
                          <div className="text-center py-10 text-slate-400">
                            Loading Premium Feature Registry...
                          </div>
                        )}
                      </div>
                    )}

                    {/* STEP 3: LIMITS & QUOTAS */}
                    {wizardStep === 3 && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-xl font-black text-slate-900">Step 4: Limits & Quotas</h3>
                          <p className="text-xs text-slate-500">
                            Define constraints for entire modules. Adjust limits for all features in a selected module at once.
                          </p>
                        </div>

                        <div className="space-y-4">
                          {Array.from(new Set(planForm.features.map(f => getModuleOfFeature(f.feature_code)))).filter(Boolean).map(module => {
                            const moduleFeatures = planForm.features.filter(f => getModuleOfFeature(f.feature_code) === module);
                            if (moduleFeatures.length === 0) return null;
                            const representative = moduleFeatures[0];
                            const limitType = representative.limit_type;
                            const limitValue = representative.limit_value;

                            const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
                              const newType = e.target.value;
                              const newFeatures = planForm.features.map(f =>
                                getModuleOfFeature(f.feature_code) === module ? { ...f, limit_type: newType } : f
                              );
                              setPlanForm({ ...planForm, features: newFeatures });
                            };

                            const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                              const val = Number(e.target.value);
                              const newFeatures = planForm.features.map(f =>
                                getModuleOfFeature(f.feature_code) === module ? { ...f, limit_value: val } : f
                              );
                              setPlanForm({ ...planForm, features: newFeatures });
                            };

                            return (
                              <div key={module} className="p-5 border border-slate-100 bg-slate-50/50 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="md:w-1/3">
                                  <span className="text-xs font-black text-slate-800 block">{getModuleDisplayName(module)}</span>
                                </div>
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                                  <div>
                                    <span className="text-[10px] text-slate-500 block mb-1">Limit Mode</span>
                                    <select
                                      value={limitType}
                                      onChange={handleTypeChange}
                                      className="w-full bg-white border border-slate-200 p-2 rounded text-xs focus:outline-none"
                                    >
                                      <option value="unlimited">Unlimited Access</option>
                                      <option value="per_month">Usage Per Month</option>
                                      <option value="per_year">Usage Per Year</option>
                                      <option value="lifetime">Lifetime Count</option>
                                      <option value="count">Fixed Quota</option>
                                    </select>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-slate-500 block mb-1">Quota Value</span>
                                    <Input
                                      type="number"
                                      disabled={limitType === "unlimited"}
                                      value={limitValue}
                                      onChange={handleValueChange}
                                      className="h-8 border-slate-200 text-xs"
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {planForm.features.length === 0 && (
                            <div className="text-center py-10 bg-slate-50 rounded-2xl text-slate-400 text-xs">
                              No features selected. Please go back to the "Feature Catalog" step to enable features.
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* STEP 4: ADD-ONS ALLOWED */}
                    {wizardStep === 4 && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-xl font-black text-slate-900">Step 5: Add-ons Compatibility</h3>
                            <p className="text-xs text-slate-500">Associate modular system add-ons allowed to be bought alongside this plan.</p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsAddonModalOpen(true)}
                            className="border-[#E6D9C8] text-slate-700 bg-white hover:bg-slate-50 text-xs h-9 rounded-xl flex items-center gap-2 px-3 shadow-sm"
                          >
                            <Plus className="w-4 h-4 text-[#EA580C]" /> Create Add-on
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {addons.map(addon => {
                            const isCompatible = planForm.benefits.some(b => b.title === `Add-on: ${addon.name}`);

                            return (
                              <label
                                key={addon.id}
                                className={`flex items-start gap-4 p-4 border rounded-2xl cursor-pointer transition-all ${isCompatible
                                    ? "border-orange-500 bg-orange-50/20"
                                    : "border-slate-100 hover:bg-slate-50 bg-white"
                                  }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isCompatible}
                                  onChange={e => {
                                    let newBenefits = [...planForm.benefits];
                                    if (e.target.checked) {
                                      newBenefits.push({
                                        title: `Add-on: ${addon.name}`,
                                        description: addon.description || "Compatible Add-on Upgrade Pack",
                                        icon: "Layers",
                                        is_highlight: false,
                                        is_included: true
                                      });
                                    } else {
                                      newBenefits = newBenefits.filter(b => b.title !== `Add-on: ${addon.name}`);
                                    }
                                    setPlanForm({ ...planForm, benefits: newBenefits });
                                  }}
                                  className="rounded mt-0.5 text-orange-600 focus:ring-orange-500"
                                />
                                <div>
                                  <span className="text-xs font-bold text-slate-800 block">{addon.name}</span>
                                  <span className="text-[10px] text-slate-400 block mt-0.5">{addon.description}</span>
                                  <span className="text-[10px] text-slate-500 font-bold block mt-2">
                                    Price: {addon.currency || "₹"}{addon.price} / {addon.billing_cycle}
                                  </span>
                                </div>
                              </label>
                            );
                          })}

                          {addons.length === 0 && (
                            <div className="col-span-2 text-center py-10 bg-slate-50 rounded-2xl text-slate-400 text-xs">
                              No system add-ons configured in the registry.
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* STEP 5: REVIEW SUMMARY */}
                    {wizardStep === 5 && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-xl font-black text-slate-900">Step 6: Plan Review Summary</h3>
                          <p className="text-xs text-slate-500">Confirm all package configurations and pricing terms before launch.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                            <h4 className="font-bold text-slate-900 text-sm border-b pb-2">Core Settings</h4>
                            <div className="grid grid-cols-2 gap-y-3 text-xs">
                              <span className="text-slate-500">Plan Name</span>
                              <span className="font-bold text-slate-800 text-right">{planForm.name || "(Draft)"}</span>

                              <span className="text-slate-500">Code</span>
                              <span className="font-mono font-bold text-slate-800 text-right">{planForm.code || "(Draft)"}</span>

                              <span className="text-slate-500">Category</span>
                              <span className="font-bold text-slate-800 text-right capitalize">{planForm.metadata.category}</span>

                              <span className="text-slate-500">Status</span>
                              <span className="font-bold text-slate-800 text-right capitalize">{planForm.status}</span>

                              <span className="text-slate-500">GST Percent</span>
                              <span className="font-bold text-slate-800 text-right">{planForm.gst_percentage}%</span>
                            </div>
                          </div>

                          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                            <h4 className="font-bold text-slate-900 text-sm border-b pb-2">Cycles Pricing</h4>
                            <div className="grid grid-cols-2 gap-y-3 text-xs">
                              <span className="text-slate-500">Monthly</span>
                              <span className="font-bold text-slate-800 text-right">₹{planForm.monthly_price}</span>

                              <span className="text-slate-500">Quarterly</span>
                              <span className="font-bold text-slate-800 text-right">₹{planForm.quarterly_price}</span>

                              <span className="text-slate-500">Yearly</span>
                              <span className="font-bold text-slate-800 text-right">₹{planForm.yearly_price}</span>

                              <span className="text-slate-500">Lifetime</span>
                              <span className="font-bold text-slate-800 text-right">₹{planForm.lifetime_price}</span>

                              <span className="text-slate-500">Tax Mode</span>
                              <span className="font-bold text-slate-800 text-right capitalize">{planForm.metadata.tax_type}</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                          <div className="flex items-center justify-between border-b pb-2">
                            <h4 className="font-bold text-slate-900 text-sm">Enabled Features & Limits ({planForm.features.length})</h4>
                            <span className="text-xs text-orange-600 font-bold">Estimated annual value: ₹25,000+</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {planForm.features.map(f => (
                              <div key={f.feature_code} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100 text-xs">
                                <span className="text-slate-700 font-bold">{f.name}</span>
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded capitalize">
                                  {f.limit_type === "unlimited" ? "Unlimited" : `${f.limit_value} count`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* STEP 6: PREVIEW & LAUNCH */}
                    {wizardStep === 6 && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-xl font-black text-slate-900">Step 7: Member Dashboard Preview</h3>
                            <p className="text-xs text-slate-500">Simulate how members see this plan card layout on desktop, tablet or mobile screens.</p>
                          </div>

                          <div className="flex bg-slate-100 p-1 rounded-xl">
                            {(["desktop", "tablet", "mobile"] as const).map(dev => (
                              <button
                                key={dev}
                                onClick={() => setPreviewDevice(dev)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${previewDevice === dev ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
                                  }`}
                              >
                                {dev}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Device Simulator Frame */}
                        <div className="flex justify-center bg-slate-100 p-8 rounded-3xl border border-slate-200">
                          <div
                            className={`bg-white rounded-3xl border-8 border-slate-900 shadow-2xl transition-all duration-300 overflow-hidden ${previewDevice === "desktop" ? "w-full max-w-2xl h-[450px]" : ""
                              } ${previewDevice === "tablet" ? "w-[600px] h-[500px]" : ""
                              } ${previewDevice === "mobile" ? "w-[340px] h-[520px]" : ""
                              }`}
                          >
                            <div className="bg-slate-950 p-3 text-[10px] text-slate-400 font-mono flex items-center justify-between">
                              <span>WAG Samaj Portal Premium Membership</span>
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            </div>

                            <div className="p-6 overflow-y-auto h-[calc(100%-36px)] bg-slate-50 flex items-center justify-center">
                              {/* Simulated Plan Card */}
                              <div className="w-full max-w-sm bg-white rounded-3xl border border-[#E6D9C8] overflow-hidden shadow-lg transition-transform duration-300">
                                <div className={`p-6 bg-gradient-to-br ${planForm.color_theme || "from-yellow-500 to-orange-600"} text-white relative`}>
                                  {planForm.display_badge && (
                                    <span className="absolute top-4 right-4 bg-white/20 backdrop-blur-md text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full text-white border border-white/20">
                                      {planForm.display_badge}
                                    </span>
                                  )}

                                  <div className="text-sm font-black uppercase tracking-widest opacity-80">
                                    {planForm.metadata.category}
                                  </div>
                                  <h3 className="text-2xl font-black mt-1 leading-tight">
                                    {planForm.name || "Custom Plan Title"}
                                  </h3>
                                  <p className="text-xs opacity-90 mt-1">{planForm.short_description || "Dynamic Short Tagline"}</p>

                                  <div className="mt-6 flex items-baseline gap-1">
                                    <span className="text-3xl font-black">₹{planForm.monthly_price}</span>
                                    <span className="text-xs opacity-80">/ month</span>
                                  </div>
                                </div>

                                <div className="p-6 space-y-4">
                                  <div className="text-xs font-bold text-slate-700 uppercase tracking-widest">What's Included:</div>
                                  <ul className="space-y-2.5 text-xs text-slate-600">
                                    {planForm.features.map(f => (
                                      <li key={f.feature_code} className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                        <span>{f.name}</span>
                                      </li>
                                    ))}
                                    {planForm.features.length === 0 && (
                                      <li className="text-slate-400 italic">No features enabled yet.</li>
                                    )}
                                  </ul>

                                  <Button className="w-full mt-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl py-5 text-xs font-bold tracking-wide">
                                    Subscribe Now
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="max-w-4xl mx-auto w-full border-t border-slate-100 pt-6 mt-8 flex items-center justify-between shrink-0">
                    <Button
                      type="button"
                      disabled={wizardStep === 0}
                      onClick={() => setWizardStep(prev => Math.max(0, prev - 1))}
                      variant="outline"
                      className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl px-5 py-2.5 text-xs font-bold"
                    >
                      Back Step
                    </Button>

                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        onClick={async () => {
                          const err = validatePlan();
                          if (err) {
                            toast.error(err);
                            return;
                          }
                          try {
                            const payload = { ...planForm, status: "inactive" };
                            if (editingPlan) {
                              await api.updateMemberPremiumPlan(editingPlan.id, payload);
                              toast.success("Draft updated successfully!");
                            } else {
                              await api.createMemberPremiumPlan(payload);
                              toast.success("Draft plan saved successfully!");
                            }
                            setIsPlanModalOpen(false);
                            setEditingPlan(null);
                            fetchData();
                          } catch (err: any) {
                            toast.error(err.message || "Failed to save draft.");
                          }
                        }}
                        variant="outline"
                        className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl px-5 py-2.5 text-xs font-bold"
                      >
                        Save Draft
                      </Button>

                      {wizardStep < 6 ? (
                        <Button
                          type="button"
                          onClick={() => setWizardStep(prev => Math.min(6, prev + 1))}
                          className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-6 py-2.5 text-xs font-bold"
                        >
                          Next Step
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={async () => {
                            const err = validatePlan();
                            if (err) {
                              toast.error(err);
                              return;
                            }
                            try {
                              const payload = { ...planForm, status: "active" };
                              if (editingPlan) {
                                await api.updateMemberPremiumPlan(editingPlan.id, payload);
                                toast.success("Premium plan published and updated successfully!");
                              } else {
                                await api.createMemberPremiumPlan(payload);
                                toast.success("Premium plan published successfully!");
                              }
                              setIsPlanModalOpen(false);
                              setEditingPlan(null);
                              fetchData();
                            } catch (err: any) {
                              toast.error(err.message || "Failed to publish plan.");
                            }
                          }}
                          className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl px-6 py-2.5 text-xs font-bold shadow-md shadow-orange-700/20"
                        >
                          Publish Plan
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* REGISTER FEATURE MODAL */}
        {isFeatureModalOpen && (
          <Dialog open={isFeatureModalOpen} onOpenChange={setIsFeatureModalOpen}>
            <DialogContent className="bg-white border-[#E6D9C8] max-w-md rounded-3xl p-8 text-slate-800">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-slate-950">Register New Feature</DialogTitle>
                <DialogDescription className="text-slate-400 text-xs">
                  Define a feature code that will map directly to client visibility toggles.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSaveFeature} className="space-y-4 pt-4">
                <div>
                  <span className="text-xs text-slate-500 block mb-1">Feature Name</span>
                  <Input
                    required
                    value={featureForm.name}
                    onChange={e => setFeatureForm({ ...featureForm, name: e.target.value })}
                    placeholder="e.g. Matrimony Profile Boost"
                    className="border-[#E6D9C8]"
                  />
                </div>

                <div>
                  <span className="text-xs text-slate-500 block mb-1">Feature Unique Code</span>
                  <Input
                    required
                    value={featureForm.feature_code}
                    onChange={e => setFeatureForm({ ...featureForm, feature_code: e.target.value.toUpperCase() })}
                    placeholder="e.g. MATRIMONY_BOOST"
                    className="border-[#E6D9C8]"
                  />
                </div>

                <div>
                  <span className="text-xs text-slate-500 block mb-1">Description</span>
                  <Input
                    value={featureForm.description}
                    onChange={e => setFeatureForm({ ...featureForm, description: e.target.value })}
                    placeholder="Explain feature limitations or purpose..."
                    className="border-[#E6D9C8]"
                  />
                </div>

                <DialogFooter className="pt-4">
                  <Button
                    type="submit"
                    className="w-full bg-[#EA580C] hover:bg-[#D94E06] text-white font-bold rounded-xl h-12"
                  >
                    Register Feature Benefit
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* CREATE COUPON MODAL */}
        {isCouponModalOpen && (
          <Dialog open={isCouponModalOpen} onOpenChange={setIsCouponModalOpen}>
            <DialogContent className="bg-white border-[#E6D9C8] max-w-md rounded-3xl p-8 text-slate-800">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-slate-950">Generate Coupon Code</DialogTitle>
                <DialogDescription className="text-slate-400 text-xs">
                  Create promotional discount codes for members.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSaveCoupon} className="space-y-4 pt-4">
                <div>
                  <span className="text-xs text-slate-500 block mb-1">Promo Code</span>
                  <Input
                    required
                    value={couponForm.code}
                    onChange={e => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. FESTIVAL50"
                    className="border-[#E6D9C8]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-slate-500 block mb-1">Discount Type</span>
                    <select
                      value={couponForm.coupon_type}
                      onChange={e => setCouponForm({ ...couponForm, coupon_type: e.target.value })}
                      className="w-full bg-white border border-[#E6D9C8] p-2.5 rounded-xl text-sm focus:outline-none"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="flat">Flat Amount (₹)</option>
                    </select>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block mb-1">Discount Value</span>
                    <Input
                      type="number"
                      value={couponForm.discount_value}
                      onChange={e => setCouponForm({ ...couponForm, discount_value: Number(e.target.value) })}
                      className="border-[#E6D9C8]"
                    />
                  </div>
                </div>

                <DialogFooter className="pt-4">
                  <Button
                    type="submit"
                    className="w-full bg-[#EA580C] hover:bg-[#D94E06] text-white font-bold rounded-xl h-12"
                  >
                    Publish Promo Code
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {renderAddonModal()}
      </div>
    </PageWrap>
  );
}

export default SuperAdminMemberPremium;
