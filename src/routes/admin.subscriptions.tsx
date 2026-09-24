import React, { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageWrap } from "@/components/wag/PageWrap";
import { api } from "@/lib/api";
import { 
  LayoutDashboard, Plus, Edit2, Trash2, Copy, Archive, Check, X, Sliders, 
  Settings, ShieldCheck, AlertTriangle, Activity, FileText, Tag, CreditCard, 
  TrendingUp, UserPlus, HardDrive, MessageSquare, MapPin, Users, CheckCircle2, 
  Download, UserCheck, RefreshCw, FileBarChart, Calendar, Key, AlertOctagon, HelpCircle,
  AlertCircle
} from "lucide-react";

const COMMUNITY_ADMIN_SIDEBAR_CODES = [
  "dashboard",
  "subsidiaries",
  "hierarchy",
  "members",
  "committee",
  "family",
  "events",
  "news",
  "gallery",
  "donations",
  "venues",
  "jobs",
  "business",
  "matrimony",
  "reports",
  "plans",
  "settings"
];

export const Route = createFileRoute("/admin/subscriptions")({
  component: AdminSubscriptionsPage,
});

type TabType = "dashboard" | "plans" | "subscriptions" | "billing" | "addons" | "coupons" | "analytics" | "audit";

function AdminSubscriptionsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");

  const safeFormatDate = (dateStr: any, includeTime = false) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return includeTime ? d.toLocaleString() : d.toLocaleDateString();
  };

  // Global State
  const [plans, setPlans] = useState<any[]>([]);
  const [communities, setCommunities] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [features, setFeatures] = useState<any[]>([]);
  const [allFeatures, setAllFeatures] = useState<any[]>([]);
  const [addons, setAddons] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal / Drawer states
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<any>(null); // null for create
  const [permissionDrawerOpen, setPermissionDrawerOpen] = useState(false);
  const [selectedPlanForPerms, setSelectedPlanForPerms] = useState<any>(null);
  const [planPermissions, setPlanPermissions] = useState<any[]>([]);
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState<any>(null);

  // Multi-step Wizard States
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardPermissions, setWizardPermissions] = useState<any[]>([]);
  const [searchFeatureQuery, setSearchFeatureQuery] = useState("");
  const [selectedFeatureCategory, setSelectedFeatureCategory] = useState("All");
  
  // Addon Modal inside Wizard
  const [addonModalOpen, setAddonModalOpen] = useState(false);
  const [addonForm, setAddonForm] = useState({
    name: "",
    code: "",
    description: "",
    price: 0,
    billing_cycle: "Monthly",
    target_limit: "max_members",
    limit_value: 0,
    active: true
  });

  // Form states
  const [planForm, setPlanForm] = useState<any>({
    name: "",
    code: "",
    description: "",
    monthly_price: 0,
    quarterly_price: 0,
    half_yearly_price: 0,
    yearly_price: 0,
    lifetime_price: 0,
    currency: "INR",
    gst_percentage: 18,
    discount_percentage: 0,
    display_badge: "",
    is_popular: false,
    is_recommended: false,
    is_best_value: false,
    is_hidden: false,
    is_enterprise: false,
    color_theme: "from-blue-600 to-indigo-700 bg-indigo-950",
    display_order: 0,
    trial_days: 14,
    grace_period_days: 7,
    max_members: 1000,
    max_communities: 5,
    max_family_members: 5000,
    max_committee_members: 50,
    max_events: 50,
    max_venues: 5,
    max_matrimony_profiles: 500,
    max_gallery_images: 1000,
    max_storage_gb: 10,
    max_sms: 1000,
    max_email_credits: 10000,
    max_whatsapp_credits: 500,
    max_api_calls: 100000,
    max_notifications: 50000,
    custom_branding: false,
    community_logo: false,
    domain_mapping: false,
    white_label: false,
    custom_login: false,
    custom_email_templates: false,
    custom_sms_templates: false,
    custom_whatsapp: false,
    custom_theme: false,
    modules: {},
  });

  const [subForm, setSubForm] = useState({
    community_id: "",
    plan_id: "",
    status: "Active",
    billing_cycle: "Yearly",
    amount: 0,
    auto_renew: true,
    trial_days: 14,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [plansData, subsData, featuresData, addonsData, historyData, auditData, sidebarMods] = await Promise.all([
        api.getPlans(),
        api.getCommunitySubscriptions(),
        api.getFeatures(),
        api.getPlanAddons(),
        api.getSubscriptionHistory(),
        api.getSubscriptionAuditLogs(),
        api.getSidebarModules().catch(() => [])
      ]);
      
      setPlans(plansData || []);
      setSubscriptions(subsData || []);
      setAllFeatures(featuresData || []);

      const sidebarCodes = new Set((sidebarMods || []).map((m: any) => m.module_code.toLowerCase()));
      const filteredFeatures = (featuresData || []).filter((feat: any) => {
        const code = feat.code.toLowerCase();
        if (!COMMUNITY_ADMIN_SIDEBAR_CODES.includes(code)) return false;
        // Check if this code or its aliases are active in getSidebarModules
        if (code === "family") return sidebarCodes.has("family") || sidebarCodes.has("families");
        if (code === "business") return sidebarCodes.has("business") || sidebarCodes.has("businesses");
        if (code === "venues") return sidebarCodes.has("venues") || sidebarCodes.has("properties");
        if (code === "plans") return sidebarCodes.has("plans") || sidebarCodes.has("plan");
        return sidebarCodes.has(code);
      });
      setFeatures(filteredFeatures);

      setAddons(addonsData || []);
      setHistory(historyData || []);
      setAuditLogs(auditData || []);

      // Fetch communities to populate assign plan dropdown
      const comms = await api.getCommunities();
      setCommunities(comms || []);
    } catch (err) {
      console.error("Failed to load subscription data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = () => {
    setCurrentPlan(null);
    setPlanForm({
      name: "",
      code: "",
      description: "",
      monthly_price: 0,
      quarterly_price: 0,
      half_yearly_price: 0,
      yearly_price: 0,
      lifetime_price: 0,
      currency: "INR",
      gst_percentage: 18,
      discount_percentage: 0,
      display_badge: "",
      is_popular: false,
      is_recommended: false,
      is_best_value: false,
      is_hidden: false,
      is_enterprise: false,
      color_theme: "from-blue-600 to-indigo-700 bg-indigo-950 text-white",
      display_order: 0,
      trial_days: 14,
      grace_period_days: 7,
      max_members: 1000,
      max_communities: 5,
      max_family_members: 5000,
      max_committee_members: 50,
      max_events: 50,
      max_venues: 5,
      max_matrimony_profiles: 500,
      max_gallery_images: 1000,
      max_storage_gb: 10,
      max_sms: 1000,
      max_email_credits: 10000,
      max_whatsapp_credits: 500,
      max_api_calls: 100000,
      max_notifications: 50000,
      custom_branding: false,
      community_logo: false,
      domain_mapping: false,
      white_label: false,
      custom_login: false,
      custom_email_templates: false,
      custom_sms_templates: false,
      custom_whatsapp: false,
      custom_theme: false,
      modules: { active_features: ["dashboard", "members"] },
    });
    const perms = features.map(feat => ({
      feature_id: feat.id,
      feature_code: feat.code,
      feature_name: feat.name,
      allowed_operations: [],
      can_view: feat.code === "dashboard" || feat.code === "members",
      can_create: false,
      can_edit: false,
      can_delete: false,
      can_export: false,
      can_import: false,
      can_approve: false,
      can_reject: false,
      can_assign: false,
      can_manage: false,
    }));
    setWizardPermissions(perms);
    setWizardStep(1);
    setPlanModalOpen(true);
  };

  const handleEditPlan = (plan: any) => {
    setCurrentPlan(plan);
    const activeFeatures = plan.modules?.active_features || [];
    const cleanActiveFeatures = activeFeatures.map((code: string) => {
      const c = code.toLowerCase();
      if (c === "families") return "family";
      if (c === "businesses") return "business";
      if (c === "properties" || c === "property_booking") return "venues";
      if (c === "plan" || c === "subscriptions" || c === "community_subscription") return "plans";
      return c;
    });
    const uniqueCleanFeatures = Array.from(new Set(cleanActiveFeatures));

    setPlanForm({
      name: plan.name || "",
      code: plan.code || "",
      description: plan.description || "",
      monthly_price: plan.monthly_price || 0,
      quarterly_price: plan.quarterly_price || 0,
      half_yearly_price: plan.half_yearly_price || 0,
      yearly_price: plan.yearly_price || 0,
      lifetime_price: plan.lifetime_price || 0,
      currency: plan.currency || "INR",
      gst_percentage: plan.gst_percentage || 18,
      discount_percentage: plan.discount_percentage || 0,
      display_badge: plan.display_badge || "",
      is_popular: plan.is_popular || false,
      is_recommended: plan.is_recommended || false,
      is_best_value: plan.is_best_value || false,
      is_hidden: plan.is_hidden || false,
      is_enterprise: plan.is_enterprise || false,
      color_theme: plan.color_theme || "from-blue-600 to-indigo-700 bg-indigo-950 text-white",
      display_order: plan.display_order || 0,
      trial_days: plan.trial_days || 14,
      grace_period_days: plan.grace_period_days || 7,
      max_members: plan.max_members || 1000,
      max_communities: plan.max_communities || 5,
      max_family_members: plan.max_family_members || 5000,
      max_committee_members: plan.max_committee_members || 50,
      max_events: plan.max_events || 50,
      max_venues: plan.max_venues || 5,
      max_matrimony_profiles: plan.max_matrimony_profiles || 500,
      max_gallery_images: plan.max_gallery_images || 1000,
      max_storage_gb: plan.max_storage_gb || 10,
      max_sms: plan.max_sms || 1000,
      max_email_credits: plan.max_email_credits || 10000,
      max_whatsapp_credits: plan.max_whatsapp_credits || 500,
      max_api_calls: plan.max_api_calls || 100000,
      max_notifications: plan.max_notifications || 50000,
      custom_branding: plan.custom_branding || false,
      community_logo: plan.community_logo || false,
      domain_mapping: plan.domain_mapping || false,
      white_label: plan.white_label || false,
      custom_login: plan.custom_login || false,
      custom_email_templates: plan.custom_email_templates || false,
      custom_sms_templates: plan.custom_sms_templates || false,
      custom_whatsapp: plan.custom_whatsapp || false,
      custom_theme: plan.custom_theme || false,
      modules: {
        ...(plan.modules || {}),
        active_features: uniqueCleanFeatures
      },
    });
    
    const perms = features.map(feat => {
      const codesToSearch = [
        feat.code.toLowerCase(),
        ...(feat.code.toLowerCase() === "family" ? ["families"] :
            feat.code.toLowerCase() === "business" ? ["businesses"] :
            feat.code.toLowerCase() === "venues" ? ["properties", "property_booking"] :
            feat.code.toLowerCase() === "plans" ? ["plan", "subscriptions", "community_subscription"] : [])
      ];
      const existing = plan.feature_permissions?.find(
        (p: any) => {
          const pCode = (p.feature_code || p.feature?.code || "").toLowerCase();
          return p.feature === feat.id || p.feature?.id === feat.id || codesToSearch.includes(pCode);
        }
      );
      return {
        feature_id: feat.id,
        feature_code: feat.code,
        feature_name: feat.name,
        allowed_operations: existing?.allowed_operations || [],
        can_view: existing?.can_view || false,
        can_create: existing?.can_create || false,
        can_edit: existing?.can_edit || false,
        can_delete: existing?.can_delete || false,
        can_export: existing?.can_export || false,
        can_import: existing?.can_import || false,
        can_approve: existing?.can_approve || false,
        can_reject: existing?.can_reject || false,
        can_assign: existing?.can_assign || false,
        can_manage: existing?.can_manage || false,
      };
    });
    setWizardPermissions(perms);
    setWizardStep(1);
    setPlanModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const activeFeatures = planForm.modules?.active_features || [];
      const expandedFeatures = [...activeFeatures];
      if (activeFeatures.includes("family")) expandedFeatures.push("families");
      if (activeFeatures.includes("business")) expandedFeatures.push("businesses");
      if (activeFeatures.includes("venues")) expandedFeatures.push("properties", "property_booking");
      if (activeFeatures.includes("plans")) expandedFeatures.push("plan", "subscriptions", "community_subscription");

      const planToSave = {
        ...planForm,
        modules: {
          ...(planForm.modules || {}),
          active_features: expandedFeatures
        }
      };

      let savedPlan;
      if (currentPlan) {
        savedPlan = await api.updatePlan(currentPlan.id, planToSave);
      } else {
        savedPlan = await api.createPlan(planToSave);
      }
      
      const permsToSave: any[] = [];
      wizardPermissions.forEach(wp => {
        const isActive = activeFeatures.includes(wp.feature_code);
        const permObj = {
          ...wp,
          allowed_operations: isActive ? wp.allowed_operations || [] : [],
          can_view: isActive ? wp.can_view : false,
          can_create: isActive ? wp.can_create : false,
          can_edit: isActive ? wp.can_edit : false,
          can_delete: isActive ? wp.can_delete : false,
          can_export: isActive ? wp.can_export : false,
          can_import: isActive ? wp.can_import : false,
          can_approve: isActive ? wp.can_approve : false,
          can_reject: isActive ? wp.can_reject : false,
          can_assign: isActive ? wp.can_assign : false,
          can_manage: isActive ? wp.can_manage : false,
        };
        permsToSave.push(permObj);

        const aliasMap: Record<string, string[]> = {
          family: ["families"],
          business: ["businesses"],
          venues: ["properties", "property_booking"],
          plans: ["plan", "subscriptions", "community_subscription"]
        };

        const aliases = aliasMap[wp.feature_code];
        if (aliases) {
          aliases.forEach(aliasCode => {
            const aliasFeat = allFeatures.find(f => f.code.toLowerCase() === aliasCode);
            if (aliasFeat) {
              permsToSave.push({
                ...permObj,
                feature_id: aliasFeat.id,
                feature_code: aliasFeat.code,
                feature_name: aliasFeat.name
              });
            }
          });
        }
      });
      await api.updatePlanPermissions(savedPlan.id, permsToSave);
      
      setPlanModalOpen(false);
      fetchData();
    } catch (err) {
      alert("Failed to save plan: " + err);
    }
  };

  const handleClonePlan = async (plan: any) => {
    const name = prompt("Enter name for cloned plan:", `Copy of ${plan.name}`);
    if (!name) return;
    try {
      await api.clonePlan(plan.id, name);
      fetchData();
    } catch (err) {
      alert("Failed to clone plan: " + err);
    }
  };

  const handleArchivePlan = async (plan: any) => {
    if (!confirm(`Are you sure you want to archive "${plan.name}" plan?`)) return;
    try {
      await api.archivePlan(plan.id);
      fetchData();
    } catch (err) {
      alert("Failed to archive plan: " + err);
    }
  };

  const handleDeletePlan = async (plan: any) => {
    if (!confirm(`Are you sure you want to permanently delete "${plan.name}" plan? This cannot be undone.`)) return;
    try {
      await api.deletePlan(plan.id);
      fetchData();
    } catch (err) {
      alert("Failed to delete plan: " + (err as any).message || err);
    }
  };

  const handleEditPermissions = async (plan: any) => {
    setSelectedPlanForPerms(plan);
    setPermissionDrawerOpen(true);
    // Prepare list of feature permissions for this plan
    const perms = features.map(feat => {
      const codesToSearch = [
        feat.code.toLowerCase(),
        ...(feat.code.toLowerCase() === "family" ? ["families"] :
            feat.code.toLowerCase() === "business" ? ["businesses"] :
            feat.code.toLowerCase() === "venues" ? ["properties", "property_booking"] :
            feat.code.toLowerCase() === "plans" ? ["plan", "subscriptions", "community_subscription"] : [])
      ];
      const existing = plan.feature_permissions?.find(
        (p: any) => {
          const pCode = (p.feature_code || p.feature?.code || "").toLowerCase();
          return p.feature === feat.id || p.feature?.id === feat.id || codesToSearch.includes(pCode);
        }
      );
      return {
        feature_id: feat.id,
        name: feat.name,
        code: feat.code,
        allowed_operations: existing?.allowed_operations || [],
        can_view: existing?.can_view || false,
        can_create: existing?.can_create || false,
        can_edit: existing?.can_edit || false,
        can_delete: existing?.can_delete || false,
        can_export: existing?.can_export || false,
        can_import: existing?.can_import || false,
        can_approve: existing?.can_approve || false,
        can_reject: existing?.can_reject || false,
        can_assign: existing?.can_assign || false,
        can_manage: existing?.can_manage || false,
      };
    });
    setPlanPermissions(perms);
  };

  const handleTogglePermission = (index: number, opCode: string) => {
    const updated = [...planPermissions];
    const currentOps = updated[index].allowed_operations || [];
    let nextOps;
    if (currentOps.includes(opCode)) {
      nextOps = currentOps.filter((c: string) => c !== opCode);
    } else {
      nextOps = [...currentOps, opCode];
    }
    updated[index] = {
      ...updated[index],
      allowed_operations: nextOps,
      can_view: nextOps.some((op: string) => op.includes("view") || op.includes("read")),
    };
    setPlanPermissions(updated);
  };

  const handleSavePermissions = async () => {
    try {
      const permsToSave: any[] = [];
      planPermissions.forEach(perm => {
        permsToSave.push(perm);

        const aliasMap: Record<string, string[]> = {
          family: ["families"],
          business: ["businesses"],
          venues: ["properties", "property_booking"],
          plans: ["plan", "subscriptions", "community_subscription"]
        };

        const aliases = aliasMap[perm.code];
        if (aliases) {
          aliases.forEach(aliasCode => {
            const aliasFeat = allFeatures.find(f => f.code.toLowerCase() === aliasCode);
            if (aliasFeat) {
              permsToSave.push({
                ...perm,
                feature_id: aliasFeat.id,
                name: aliasFeat.name,
                code: aliasFeat.code
              });
            }
          });
        }
      });
      await api.updatePlanPermissions(selectedPlanForPerms.id, permsToSave);
      setPermissionDrawerOpen(false);
      fetchData();
    } catch (err) {
      alert("Failed to save permissions: " + err);
    }
  };

  // Helper for category filtering in step 3
  const getFeatureCategory = (code: string) => {
    const core = ["dashboard", "members", "family", "committee", "hierarchy"];
    const advanced = ["white_label", "domain_mapping", "analytics", "white-label", "domain-mapping"];
    const utilities = ["messages", "notifications", "settings", "attendance", "plans", "subscriptions", "reports", "audit_logs", "audit-logs", "custom_forms", "custom-forms", "documents"];
    const commerce = ["donations", "venues", "property_booking", "property-booking"];
    const engagement = ["events", "jobs", "businesses", "business_directory", "business-directory", "gallery", "matrimony"];
    
    const c = code.toLowerCase();
    if (core.includes(c)) return "Core";
    if (advanced.includes(c)) return "Advanced";
    if (utilities.includes(c)) return "Utilities";
    if (commerce.includes(c)) return "Commerce";
    if (engagement.includes(c)) return "Engagement";
    return "Other";
  };

  const getModuleLimitValue = (moduleCode: string) => {
    const mapping: Record<string, string> = {
      matrimony: "max_matrimony_profiles",
      events: "max_events",
      venues: "max_venues",
      donations: "max_donations",
      jobs: "max_jobs",
      businesses: "max_businesses",
      gallery: "max_gallery_images"
    };
    if (mapping[moduleCode]) {
      return (planForm as any)[mapping[moduleCode]] || 0;
    }
    return planForm.modules?.custom_limits?.[moduleCode] || 0;
  };

  const handleSetModuleLimit = (moduleCode: string, value: number) => {
    const mapping: Record<string, string> = {
      matrimony: "max_matrimony_profiles",
      events: "max_events",
      venues: "max_venues",
      donations: "max_donations",
      jobs: "max_jobs",
      businesses: "max_businesses",
      gallery: "max_gallery_images"
    };
    if (mapping[moduleCode]) {
      setPlanForm({
        ...planForm,
        [mapping[moduleCode]]: value
      });
    } else {
      const currentModules = planForm.modules || {};
      const currentCustom = currentModules.custom_limits || {};
      setPlanForm({
        ...planForm,
        modules: {
          ...currentModules,
          custom_limits: {
            ...currentCustom,
            [moduleCode]: value
          }
        }
      });
    }
  };

  const handleToggleFeature = (featureCode: string) => {
    const currentModules = planForm.modules || {};
    const currentFeatures = currentModules.active_features || [];
    let updatedFeatures;
    if (currentFeatures.includes(featureCode)) {
      updatedFeatures = currentFeatures.filter((f: string) => f !== featureCode);
    } else {
      updatedFeatures = [...currentFeatures, featureCode];
    }
    setPlanForm({
      ...planForm,
      modules: {
        ...currentModules,
        active_features: updatedFeatures
      }
    });
  };

  const handleToggleAddon = (addonId: number) => {
    const currentModules = planForm.modules || {};
    const currentAddons = currentModules.addon_ids || [];
    let updatedAddons;
    if (currentAddons.includes(addonId)) {
      updatedAddons = currentAddons.filter((id: number) => id !== addonId);
    } else {
      updatedAddons = [...currentAddons, addonId];
    }
    setPlanForm({
      ...planForm,
      modules: {
        ...currentModules,
        addon_ids: updatedAddons
      }
    });
  };

  const handleSaveAddon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const savedAddon = await api.createPlanAddon(addonForm);
      const addonsData = await api.getPlanAddons();
      setAddons(addonsData || []);
      const currentModules = planForm.modules || {};
      const currentAddons = currentModules.addon_ids || [];
      setPlanForm({
        ...planForm,
        modules: {
          ...currentModules,
          addon_ids: [...currentAddons, savedAddon.id]
        }
      });
      setAddonModalOpen(false);
      setAddonForm({
        name: "",
        code: "",
        description: "",
        price: 0,
        billing_cycle: "Monthly",
        target_limit: "max_members",
        limit_value: 0,
        active: true
      });
    } catch (err) {
      alert("Failed to create addon: " + err);
    }
  };

  // Simulated Autosave state
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("saved");
  useEffect(() => {
    if (planModalOpen) {
      setSaveStatus("saving");
      const timer = setTimeout(() => {
        setSaveStatus("saved");
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [planForm, wizardPermissions, planModalOpen]);

  const handleOpenAssignSub = () => {
    setSelectedSub(null);
    setSubForm({
      community_id: "",
      plan_id: "",
      status: "Active",
      billing_cycle: "Yearly",
      amount: 0,
      auto_renew: true,
      trial_days: 14,
    });
    setSubModalOpen(true);
  };

  const handleEditSub = (sub: any) => {
    setSelectedSub(sub);
    setSubForm({
      community_id: sub.community?.id || sub.community || "",
      plan_id: sub.plan?.id || sub.plan || "",
      status: sub.status || "Active",
      billing_cycle: "Yearly",
      amount: 0,
      auto_renew: sub.auto_renew !== undefined ? sub.auto_renew : true,
      trial_days: 0,
    });
    setSubModalOpen(true);
  };

  const handleSaveSub = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedSub) {
        // Upgrade/Downgrade or Update
        await api.updateCommunitySubscription(selectedSub.id, {
          plan: subForm.plan_id,
          status: subForm.status,
          auto_renew: subForm.auto_renew
        });
      } else {
        // Assign new plan
        await api.assignPlan({
          community_id: Number(subForm.community_id),
          plan_id: Number(subForm.plan_id),
          billing_cycle: subForm.billing_cycle,
          price_paid: Number(subForm.amount)
        });
      }
      setSubModalOpen(false);
      fetchData();
    } catch (err) {
      alert("Failed to save subscription: " + err);
    }
  };

  const handleCancelSub = async (sub: any) => {
    if (!confirm(`Are you sure you want to cancel subscription for "${sub.community?.name || 'Community'}"?`)) return;
    try {
      await api.cancelPlan(sub.id);
      fetchData();
    } catch (err) {
      alert("Failed to cancel subscription: " + err);
    }
  };

  // Helper stats for Dashboard
  const activeSubsCount = subscriptions.filter(s => s.status === "Active").length;
  const trialSubsCount = subscriptions.filter(s => s.status === "Trial").length;
  const expiredSubsCount = subscriptions.filter(s => s.status === "Expired").length;
  
  // Calculate total MRR/ARR
  let totalRevenue = history.reduce((sum, h) => sum + parseFloat(h.amount || 0), 0);
  let monthlyMRR = plans.reduce((sum, p) => {
    const subsOnPlan = subscriptions.filter(s => s.status === "Active" && (s.plan?.id === p.id || s.plan === p.id));
    return sum + (subsOnPlan.length * p.monthly_price);
  }, 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <RefreshCw className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-sm font-medium text-warm-muted animate-pulse">Loading Subscription Hub...</p>
      </div>
    );
  }

  return (
    <PageWrap
      title="Community License Management"
      desc="Configure global plans, manage community quotas, verify module permissions and audit billing histories."
      action={
        <div className="flex gap-2">
          <button 
            onClick={fetchData}
            className="p-2.5 bg-surface border border-warm hover:bg-sand/30 rounded-xl transition text-foreground"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button 
            onClick={handleCreatePlan}
            className="px-4 py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition text-xs shadow-md shadow-primary/10 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Create Plan
          </button>
        </div>
      }
    >
      <div className="space-y-6">

      {/* Tabs Menu */}
      <div className="flex border-b border-warm overflow-x-auto gap-2 pb-px scrollbar-none">
        {[
          { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
          { id: "plans", label: "Community Plans", icon: Sliders },
          { id: "subscriptions", label: "Subscriptions", icon: UserCheck },
          { id: "billing", label: "Billing & Invoices", icon: CreditCard },
          { id: "addons", label: "Add-ons", icon: Plus },
          { id: "coupons", label: "Coupons", icon: Tag },
          { id: "analytics", label: "Usage Analytics", icon: Activity },
          { id: "audit", label: "Audit Logs", icon: FileText }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 rounded-t-lg -mb-px ${
              activeTab === tab.id 
                ? "border-primary text-primary bg-primary/5" 
                : "border-transparent text-warm-muted hover:text-foreground hover:bg-sand/10"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: DASHBOARD */}
      {activeTab === "dashboard" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface border border-warm rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-warm-muted uppercase tracking-wider">Total Communities</span>
                <Users className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-black text-foreground">{communities.length}</p>
              <div className="text-[10px] text-warm-muted mt-1 font-medium">Platform registered tenants</div>
            </div>

            <div className="bg-surface border border-warm rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-warm-muted uppercase tracking-wider">Active Subscriptions</span>
                <CheckCircle2 className="w-4 h-4 text-teal-500" />
              </div>
              <p className="text-2xl font-black text-foreground">{activeSubsCount}</p>
              <div className="text-[10px] text-warm-muted mt-1 font-medium">{trialSubsCount} currently in Trial</div>
            </div>

            <div className="bg-surface border border-warm rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-warm-muted uppercase tracking-wider">Expired / Suspended</span>
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-2xl font-black text-foreground">{expiredSubsCount}</p>
              <div className="text-[10px] text-warm-muted mt-1 font-medium">Requiring license renewals</div>
            </div>

            <div className="bg-surface border border-warm rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-warm-muted uppercase tracking-wider">Monthly MRR</span>
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <p className="text-2xl font-black text-foreground">₹{monthlyMRR.toLocaleString()}</p>
              <div className="text-[10px] text-warm-muted mt-1 font-medium">Estimated monthly billing runrate</div>
            </div>
          </div>

          {/* Quick lists */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface border border-warm rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-warm pb-3">
                <h3 className="font-bold text-sm text-[#3E2723] flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-primary" /> Upcoming Renewals
                </h3>
              </div>
              <div className="divide-y divide-warm text-xs">
                {subscriptions.filter(s => s.status === "Active" && s.end_date).slice(0, 5).map(sub => (
                  <div key={sub.id} className="py-2.5 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-foreground">{sub.community?.name}</p>
                      <p className="text-[10px] text-warm-muted">Plan: {sub.plan?.name}</p>
                    </div>
                    <span className="text-[10px] font-bold text-warm-muted">
                      {safeFormatDate(sub.end_date)}
                    </span>
                  </div>
                ))}
                {subscriptions.filter(s => s.status === "Active" && s.end_date).length === 0 && (
                  <p className="py-4 text-center text-warm-muted">No upcoming renewals found.</p>
                )}
              </div>
            </div>

            <div className="bg-surface border border-warm rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-warm pb-3">
                <h3 className="font-bold text-sm text-[#3E2723] flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-gold" /> System Alerts
                </h3>
              </div>
              <div className="space-y-2 text-xs">
                {subscriptions.filter(s => s.status === "Expired").map(sub => (
                  <div key={sub.id} className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5 text-red-800">
                    <AlertOctagon className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold">Subscription Expired: {sub.community?.name}</p>
                      <p className="text-[10px] opacity-80">Access to core system capabilities is limited.</p>
                    </div>
                  </div>
                ))}
                {subscriptions.filter(s => s.status === "Expired").length === 0 && (
                  <div className="p-4 text-center text-warm-muted">
                    ✨ System health is optimal. No active license blockages.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: PLANS */}
      {activeTab === "plans" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.length === 0 ? (
              <div className="col-span-full bg-surface border border-warm rounded-2xl p-12 text-center space-y-4 shadow-sm">
                <AlertCircle className="w-10 h-10 text-amber-500 mx-auto animate-pulse" />
                <h3 className="font-extrabold text-base text-[#3E2723]">No Community Plans Found</h3>
                <p className="text-xs text-warm-muted max-w-md mx-auto leading-relaxed">
                  There are currently no community subscription plans defined in the database. 
                  Click the <strong>"Create Plan"</strong> button in the top right to create your first dynamic plan from scratch.
                </p>
              </div>
            ) : (
              plans.map(plan => (
                <div key={plan.id} className={`bg-surface border border-warm rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between relative ${plan.is_hidden ? 'opacity-60' : ''}`}>
                  
                  {/* Theme banner */}
                  <div className={`h-2 bg-gradient-to-r ${plan.color_theme || 'from-primary to-gold'}`} />
                  
                  <div className="p-5 space-y-4 flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-black text-lg text-foreground">{plan.name}</h3>
                        <p className="text-[10px] font-bold text-primary tracking-wider uppercase">{plan.code}</p>
                      </div>
                      {plan.display_badge && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-primary/10 text-primary border border-primary/20">
                          {plan.display_badge}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-warm-muted leading-relaxed line-clamp-2">{plan.description}</p>
                    
                    <div className="bg-sand/30 border border-warm rounded-xl p-3 space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-foreground">
                        <span>Monthly Price</span>
                        <span>₹{plan.monthly_price}</span>
                      </div>
                      <div className="flex justify-between text-xs font-semibold text-foreground">
                        <span>Yearly Price</span>
                        <span>₹{plan.yearly_price}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-warm-muted">
                        <span>Trial Days / Grace</span>
                        <span>{plan.trial_days}d / {plan.grace_period_days}d</span>
                      </div>
                    </div>

                    {/* Quotas */}
                    <div className="space-y-1 text-[11px] text-foreground font-medium">
                      <div className="flex justify-between">
                        <span className="text-warm-muted">Max Members:</span>
                        <span>{plan.max_members}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-warm-muted">Storage:</span>
                        <span>{plan.max_storage_gb} GB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-warm-muted">SMS Credits:</span>
                        <span>{plan.max_sms}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="bg-sand/20 border-t border-warm p-3 flex justify-between gap-1">
                    <button 
                      onClick={() => handleEditPlan(plan)}
                      className="p-2 text-warm-muted hover:text-foreground hover:bg-warm/30 rounded-lg transition"
                      title="Edit Plan Config"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleEditPermissions(plan)}
                      className="p-2 text-warm-muted hover:text-primary hover:bg-primary/10 rounded-lg transition"
                      title="Edit Module Permissions"
                    >
                      <ShieldCheck className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleClonePlan(plan)}
                      className="p-2 text-warm-muted hover:text-foreground hover:bg-warm/30 rounded-lg transition"
                      title="Clone Plan"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleArchivePlan(plan)}
                      className="p-2 text-warm-muted hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                      title="Archive Plan"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeletePlan(plan)}
                      className="p-2 text-warm-muted hover:text-red-650 hover:bg-red-50 rounded-lg transition"
                      title="Delete Plan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: SUBSCRIPTIONS */}
      {activeTab === "subscriptions" && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-[#3E2723]">Active Platform Licenses</h3>
            <button 
              onClick={handleOpenAssignSub}
              className="px-3.5 py-1.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-dark transition flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" /> Assign Subscription
            </button>
          </div>

          <div className="bg-surface border border-warm rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-sand/35 border-b border-warm text-[10px] font-bold text-warm-muted uppercase tracking-wider">
                  <th className="p-4">Community</th>
                  <th className="p-4">License Plan</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Validity</th>
                  <th className="p-4">Auto Renew</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm">
                {subscriptions.map(sub => (
                  <tr key={sub.id} className="hover:bg-sand/5">
                    <td className="p-4">
                      <div className="font-bold text-foreground">{sub.community?.name}</div>
                      <div className="text-[10px] text-warm-muted">{sub.community?.pincode}</div>
                    </td>
                    <td className="p-4 font-semibold text-foreground">
                      {sub.plan?.name || "Free"}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        sub.status === "Active" ? "bg-teal-50 text-teal-700 border border-teal-200" :
                        sub.status === "Trial" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                        sub.status === "Grace Period" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                        "bg-red-50 text-red-700 border border-red-200"
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="p-4 text-warm-muted">
                      {sub.end_date ? safeFormatDate(sub.end_date) : "Lifetime"}
                    </td>
                    <td className="p-4">
                      {sub.auto_renew ? (
                        <span className="text-teal-650 flex items-center gap-1 font-semibold"><Check className="w-3.5 h-3.5" /> Enabled</span>
                      ) : (
                        <span className="text-warm-muted flex items-center gap-1"><X className="w-3.5 h-3.5" /> Disabled</span>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-1">
                      <button 
                        onClick={() => handleEditSub(sub)}
                        className="px-2.5 py-1 border border-warm hover:bg-sand/30 rounded-lg font-bold text-[10px] transition text-foreground"
                      >
                        Modify
                      </button>
                      <button 
                        onClick={() => handleCancelSub(sub)}
                        className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-150 hover:bg-red-100 rounded-lg font-bold text-[10px] transition"
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: BILLING */}
      {activeTab === "billing" && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-[#3E2723]">Invoice & Payment Ledger</h3>
            <button className="px-3 py-1.5 border border-warm hover:bg-sand/30 rounded-xl text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Download className="w-4 h-4" /> Export Spreadsheet
            </button>
          </div>

          <div className="bg-surface border border-warm rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-sand/35 border-b border-warm text-[10px] font-bold text-warm-muted uppercase tracking-wider">
                  <th className="p-4">Transaction ID</th>
                  <th className="p-4">Community</th>
                  <th className="p-4">Billing Item</th>
                  <th className="p-4">Cycle</th>
                  <th className="p-4">Paid Date</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">GST Invoice No</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm">
                {history.map(item => (
                  <tr key={item.id} className="hover:bg-sand/5">
                    <td className="p-4 font-mono font-bold text-foreground">{item.transaction_id || "TXN-MANUAL"}</td>
                    <td className="p-4 font-medium text-foreground">{item.community_name || item.community?.name}</td>
                    <td className="p-4 text-warm-muted">{item.plan_name} ({item.action})</td>
                    <td className="p-4">{item.billing_cycle}</td>
                    <td className="p-4">{item.date}</td>
                    <td className="p-4 font-bold text-foreground">₹{parseFloat(item.amount).toLocaleString()}</td>
                    <td className="p-4 font-semibold text-primary">{item.gst_invoice_no || "N/A"}</td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-warm-muted">No billing transactions recorded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: ADD-ONS */}
      {activeTab === "addons" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex justify-between items-center border-b border-warm pb-3">
            <h3 className="font-bold text-sm text-[#3E2723]">System Add-ons Inventory</h3>
            <button className="px-3.5 py-1.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-dark transition flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Create Add-on
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {addons.map(addon => (
              <div key={addon.id} className="bg-surface border border-warm rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-base text-foreground">{addon.name}</h4>
                    <span className="text-[10px] font-bold text-primary tracking-wider uppercase">{addon.code}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                    Active
                  </span>
                </div>
                
                <p className="text-xs text-warm-muted leading-relaxed">{addon.description}</p>
                
                <div className="bg-sand/30 border border-warm rounded-xl p-3 flex justify-between items-center text-xs font-bold text-foreground">
                  <span>Price: ₹{addon.price} / {addon.billing_cycle}</span>
                  <span>Limit Increase: +{addon.limit_value}</span>
                </div>
              </div>
            ))}
            {addons.length === 0 && (
              <div className="col-span-3 p-8 text-center bg-sand/10 border border-dashed border-warm rounded-2xl text-warm-muted">
                No add-ons registered. Use the create action to register member or storage expansion modules.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: COUPONS */}
      {activeTab === "coupons" && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-[#3E2723]">Discounts & Promo Vouchers</h3>
            <button className="px-3.5 py-1.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-dark transition flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Add Coupon
            </button>
          </div>

          <div className="bg-surface border border-warm rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-sand/35 border-b border-warm text-[10px] font-bold text-warm-muted uppercase tracking-wider">
                  <th className="p-4">Coupon Code</th>
                  <th className="p-4">Discount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Expiry</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm">
                <tr className="hover:bg-sand/5">
                  <td className="p-4 font-mono font-bold text-foreground">WELCOME20</td>
                  <td className="p-4 font-bold text-teal-650">20% Off</td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-teal-50 text-teal-700 border border-teal-200">Active</span>
                  </td>
                  <td className="p-4 text-warm-muted">Dec 31, 2026</td>
                  <td className="p-4 text-right">
                    <button className="p-1.5 text-warm-muted hover:text-red-650 rounded hover:bg-red-50 transition"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: ANALYTICS */}
      {activeTab === "analytics" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex justify-between items-center border-b border-warm pb-3">
            <h3 className="font-bold text-sm text-[#3E2723]">Real-time Resource Quota Utilization</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sand border border-warm text-warm-muted">
              Live Auditing
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {subscriptions.slice(0, 4).map(sub => (
              <div key={sub.id} className="bg-surface border border-warm rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-black text-sm text-foreground">{sub.community?.name}</h4>
                  <span className="text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
                    {sub.plan?.name || "Free"}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="font-semibold text-warm-muted">Members Capacity</span>
                      <span className="font-bold text-foreground">320 / {sub.plan?.max_members || 500}</span>
                    </div>
                    <div className="w-full bg-warm/35 h-2 rounded-full overflow-hidden">
                      <div className="bg-primary h-full rounded-full" style={{ width: "64%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="font-semibold text-warm-muted">Storage Quota</span>
                      <span className="font-bold text-foreground">1.2 GB / {sub.plan?.max_storage_gb || 5} GB</span>
                    </div>
                    <div className="w-full bg-warm/35 h-2 rounded-full overflow-hidden">
                      <div className="bg-teal-500 h-full rounded-full" style={{ width: "24%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="font-semibold text-warm-muted">SMS Delivery Credits</span>
                      <span className="font-bold text-foreground">450 / {sub.plan?.max_sms || 500}</span>
                    </div>
                    <div className="w-full bg-warm/35 h-2 rounded-full overflow-hidden">
                      <div className="bg-gold h-full rounded-full" style={{ width: "90%" }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: AUDIT LOGS */}
      {activeTab === "audit" && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-[#3E2723]">License Operations Audit Log</h3>
            <span className="text-xs text-warm-muted">Tracks plan adjustments, upgrades and subscription changes</span>
          </div>

          <div className="bg-surface border border-warm rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-sand/35 border-b border-warm text-[10px] font-bold text-warm-muted uppercase tracking-wider">
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Billing Item</th>
                  <th className="p-4">Attribute</th>
                  <th className="p-4">Original Value</th>
                  <th className="p-4">Target Value</th>
                  <th className="p-4">Modified By</th>
                  <th className="p-4">Reason / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-sand/5">
                    <td className="p-4 text-warm-muted">{safeFormatDate(log.date, true)}</td>
                    <td className="p-4 font-bold text-foreground">
                      {log.plan ? `Plan: ${log.plan.name}` : log.community ? `Sub: ${log.community.name}` : "System"}
                    </td>
                    <td className="p-4 font-mono text-foreground">{log.field_name}</td>
                    <td className="p-4 text-red-700 font-semibold">{log.old_value || "Empty"}</td>
                    <td className="p-4 text-teal-700 font-semibold">{log.new_value}</td>
                    <td className="p-4 font-medium text-foreground">{log.changed_by?.username || "System API"}</td>
                    <td className="p-4 text-warm-muted">{log.reason}</td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-warm-muted">No operational changes logged.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PLAN FORM MODAL */}
      {planModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#121212]/80 backdrop-blur-md flex items-center justify-center p-0 md:p-6 overflow-hidden">
          <div className="bg-surface border border-warm rounded-none md:rounded-3xl w-full max-w-7xl h-full md:h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scaleIn">
            
            {/* WIZARD HEADER */}
            <div className="px-6 py-4 border-b border-warm bg-sand/10 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Sliders className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-black font-ui text-[#3E2723] uppercase tracking-wider flex items-center gap-2">
                    {currentPlan ? `Edit Platform Plan` : "SaaS Plan Architect"}
                    <span className="text-[10px] bg-primary/20 text-primary-dark px-2 py-0.5 rounded-full font-bold">
                      {planForm.name || "Draft"}
                    </span>
                  </h2>
                  <p className="text-[10px] text-warm-muted">Configure multi-tenant limits, pricing tiers, permissions & quotas</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 transition ${
                  saveStatus === "saving" ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-teal-50 text-teal-700 border border-teal-200"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${saveStatus === "saving" ? "bg-amber-500 animate-pulse" : "bg-teal-500"}`}></span>
                  {saveStatus === "saving" ? "Auto-saving..." : "Config Saved"}
                </span>
                
                <button 
                  onClick={() => setPlanModalOpen(false)}
                  className="p-2 hover:bg-warm/30 rounded-xl transition text-foreground"
                  title="Close Wizard"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* WIZARD BODY (Sidebar + Main Content Area) */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* SIDEBAR NAVIGATION */}
              <div className="w-64 border-r border-warm bg-sand/15 p-5 flex flex-col justify-between shrink-0 hidden md:flex">
                <div className="space-y-1">
                  {[
                    { step: 1, label: "Basic Information", desc: "Identity & Branding" },
                    { step: 2, label: "Pricing & Billing", desc: "Cycle Rates & Tax" },
                    { step: 3, label: "Features & Modules", desc: "Application Registry" },
                    { step: 4, label: "Limits & Quotas", desc: "Capacity Constraints" },
                    { step: 5, label: "Permissions Matrix", desc: "Granular Action Matrix" },
                    { step: 6, label: "Purchasable Add-ons", desc: "Feature Extensions" },
                    { step: 7, label: "Review & Publish", desc: "Live Activation" }
                  ].map((s) => {
                    const isActive = wizardStep === s.step;
                    const isCompleted = wizardStep > s.step;
                    return (
                      <button
                        key={s.step}
                        onClick={() => setWizardStep(s.step)}
                        className={`w-full text-left p-3 rounded-2xl flex items-start gap-3 transition ${
                          isActive ? "bg-primary text-white shadow-md shadow-primary/20" : "hover:bg-warm/20 text-foreground"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-black border ${
                          isActive ? "bg-white text-primary border-white" :
                          isCompleted ? "bg-teal-650 text-white border-teal-600" :
                          "bg-surface text-warm-muted border-warm"
                        }`}>
                          {isCompleted ? <Check className="w-3 h-3" /> : s.step}
                        </div>
                        <div className="space-y-0.5 leading-tight">
                          <p className={`text-[11px] font-bold ${isActive ? "text-white" : "text-foreground"}`}>{s.label}</p>
                          <p className={`text-[9px] ${isActive ? "text-white/80" : "text-warm-muted"}`}>{s.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-2">
                  <p className="text-[10px] font-bold text-[#3E2723] flex items-center gap-1.5"><HelpCircle className="w-3.5 h-3.5 text-primary" /> Tenant Architect</p>
                  <p className="text-[9px] text-warm-muted leading-relaxed">Changes made inside this wizard are dynamically loaded by member portals instantly after publishing.</p>
                </div>
              </div>

              {/* MAIN CONTENT AREA */}
              <div className="flex-1 p-6 md:p-10 overflow-y-auto bg-surface relative text-xs">
                
                {/* STEP 1: BASIC INFORMATION */}
                {wizardStep === 1 && (
                  <div className="space-y-6 max-w-3xl animate-fadeIn">
                    <div className="border-b border-warm pb-3">
                      <h3 className="text-base font-black text-[#3E2723] flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /> Basic Information</h3>
                      <p className="text-warm-muted text-[10px]">Define the plan's public identities, display badge tags, and client portal layout colors.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="font-bold text-foreground">Plan Name *</label>
                        <input 
                          type="text" 
                          required 
                          value={planForm.name} 
                          onChange={e => setPlanForm({...planForm, name: e.target.value})}
                          className="w-full p-3 bg-sand/20 border border-warm rounded-xl focus:border-primary focus:outline-none font-medium text-foreground text-xs"
                          placeholder="e.g. Enterprise Premium, Starter Hub"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-foreground">Unique Plan Code *</label>
                        <input 
                          type="text" 
                          required 
                          disabled={!!currentPlan}
                          value={planForm.code} 
                          onChange={e => setPlanForm({...planForm, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')})}
                          className="w-full p-3 bg-sand/20 border border-warm rounded-xl focus:border-primary focus:outline-none disabled:bg-warm/20 font-mono text-foreground text-xs"
                          placeholder="e.g. enterprise_tier"
                        />
                        <p className="text-[9px] text-warm-muted">Database slug identifier. Cannot be modified after plan creation.</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-foreground">Description & Pitch</label>
                      <textarea 
                        value={planForm.description} 
                        onChange={e => setPlanForm({...planForm, description: e.target.value})}
                        className="w-full p-3 bg-sand/20 border border-warm rounded-xl focus:border-primary focus:outline-none min-h-[90px] text-foreground text-xs"
                        placeholder="Provide details on who this plan is tailored for and its value proposition..."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="font-bold text-foreground">Recommended Badge Tag</label>
                        <input 
                          type="text" 
                          value={planForm.display_badge} 
                          onChange={e => setPlanForm({...planForm, display_badge: e.target.value})}
                          className="w-full p-3 bg-sand/20 border border-warm rounded-xl focus:border-primary text-xs"
                          placeholder="e.g. Best Value, Recommended, Save 20%"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-foreground">Display Order Weight</label>
                        <input 
                          type="number" 
                          value={planForm.display_order} 
                          onChange={e => setPlanForm({...planForm, display_order: parseInt(e.target.value) || 0})}
                          className="w-full p-3 bg-sand/20 border border-warm rounded-xl focus:border-primary text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="font-bold text-foreground block">Plan Visibility & Badges</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {[
                          { key: "is_popular", label: "Mark Popular", desc: "Highlights with star" },
                          { key: "is_recommended", label: "Mark Recommended", desc: "Slight border accent" },
                          { key: "is_best_value", label: "Mark Best Value", desc: "Displays value badge" },
                          { key: "is_enterprise", label: "Enterprise Tier", desc: "Forces custom quote" },
                          { key: "is_internal", label: "Internal Only", desc: "Admin assignable only" },
                          { key: "is_hidden", label: "Hide Plan", desc: "Temporarily deactivates plan" }
                        ].map(badge => (
                          <label key={badge.key} className="flex items-start gap-3 p-3 bg-sand/10 border border-warm rounded-xl cursor-pointer hover:bg-sand/20 transition">
                            <input 
                              type="checkbox" 
                              checked={!!planForm[badge.key]} 
                              onChange={e => setPlanForm({...planForm, [badge.key]: e.target.checked})}
                              className="rounded border-warm text-primary focus:ring-primary mt-0.5"
                            />
                            <div>
                              <p className="font-bold text-foreground text-[11px]">{badge.label}</p>
                              <p className="text-[9px] text-warm-muted">{badge.desc}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Gradient Theme Preset Selector */}
                    <div className="space-y-3">
                      <label className="font-bold text-foreground block">Portal Branding & Card Theme</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {[
                          { name: "Ocean Breeze", class: "from-blue-650 to-indigo-700 bg-indigo-950 text-white" },
                          { name: "Sunset Gold", class: "from-amber-600 to-red-650 bg-red-950 text-white" },
                          { name: "Emerald Forest", class: "from-emerald-600 to-teal-850 bg-teal-950 text-white" },
                          { name: "Royal Purple", class: "from-fuchsia-700 to-violet-900 bg-violet-950 text-white" },
                          { name: "Sleek Charcoal", class: "from-zinc-700 to-slate-900 bg-slate-950 text-white" },
                          { name: "Clay Terracotta", class: "from-[#8B4513] to-[#A0522D] bg-[#3E2723] text-white" }
                        ].map((theme) => {
                          const isSelected = planForm.color_theme === theme.class;
                          return (
                            <button
                              type="button"
                              key={theme.name}
                              onClick={() => setPlanForm({...planForm, color_theme: theme.class})}
                              className={`p-3 rounded-xl border text-left flex items-center justify-between gap-3 transition ${
                                isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-warm bg-sand/10 hover:bg-sand/20"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${theme.class}`} />
                                <span className="font-bold text-[11px] text-foreground">{theme.name}</span>
                              </div>
                              {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: PRICING & BILLING */}
                {wizardStep === 2 && (
                  <div className="space-y-6 max-w-3xl animate-fadeIn">
                    <div className="border-b border-warm pb-3">
                      <h3 className="text-base font-black text-[#3E2723] flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary" /> Pricing & Billing Cycles</h3>
                      <p className="text-warm-muted text-[10px]">Configure multi-currency, tax rules and flexible recurring rates. Set a price to 0 to disable that cycle.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4 bg-sand/10 border border-warm rounded-2xl p-5">
                        <h4 className="font-bold text-[#3E2723]">Currency Settings</h4>
                        
                        <div className="space-y-1">
                          <label className="font-bold text-foreground">Plan Billing Currency</label>
                          <select 
                            value={planForm.currency}
                            onChange={e => setPlanForm({...planForm, currency: e.target.value})}
                            className="w-full p-2.5 bg-surface border border-warm rounded-xl focus:border-primary"
                          >
                            <option value="INR">₹ INR (Indian Rupee)</option>
                            <option value="USD">$ USD (US Dollar)</option>
                            <option value="EUR">€ EUR (Euro)</option>
                            <option value="GBP">£ GBP (British Pound)</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="font-bold text-foreground">GST/Tax %</label>
                            <input 
                              type="number" 
                              value={planForm.gst_percentage} 
                              onChange={e => setPlanForm({...planForm, gst_percentage: parseInt(e.target.value) || 0})}
                              className="w-full p-2 bg-surface border border-warm rounded-xl focus:border-primary"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="font-bold text-foreground">Discount %</label>
                            <input 
                              type="number" 
                              value={planForm.discount_percentage} 
                              onChange={e => setPlanForm({...planForm, discount_percentage: parseInt(e.target.value) || 0})}
                              className="w-full p-2 bg-surface border border-warm rounded-xl focus:border-primary"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-bold text-[#3E2723]">Billing Cycle Rates</h4>
                        {[
                          { key: "monthly_price", label: "Monthly subscription" },
                          { key: "quarterly_price", label: "Quarterly subscription" },
                          { key: "half_yearly_price", label: "Half Yearly subscription" },
                          { key: "yearly_price", label: "Yearly subscription" },
                          { key: "lifetime_price", label: "Lifetime subscription" }
                        ].map((cycle) => (
                          <div key={cycle.key} className="flex items-center gap-3 bg-sand/5 border border-warm rounded-xl p-2.5">
                            <span className="text-[11px] font-bold text-foreground flex-1">{cycle.label}</span>
                            <div className="relative w-36">
                              <span className="absolute left-2.5 top-2 text-warm-muted font-bold">
                                {planForm.currency === "INR" ? "₹" : planForm.currency === "USD" ? "$" : planForm.currency === "EUR" ? "€" : "£"}
                              </span>
                              <input 
                                type="text"
                                inputMode="numeric"
                                value={planForm[cycle.key] === 0 ? "" : planForm[cycle.key]}
                                onChange={e => {
                                  const raw = e.target.value.replace(/[^0-9]/g, "");
                                  setPlanForm({...planForm, [cycle.key]: raw === "" ? 0 : parseInt(raw)});
                                }}
                                placeholder="0"
                                className="w-full p-1.5 pl-7 pr-2 bg-surface border border-warm rounded-lg text-right font-bold text-foreground focus:border-primary focus:outline-none"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: FEATURES & MODULES */}
                {wizardStep === 3 && (
                  <div className="space-y-6 max-w-4xl animate-fadeIn">
                    <div className="border-b border-warm pb-3">
                      <h3 className="text-base font-black text-[#3E2723] flex items-center gap-2"><Sliders className="w-5 h-5 text-primary" /> Application Registry Modules</h3>
                      <p className="text-warm-muted text-[10px]">Select which application modules are available in this plan. Features must exist in the centralized registry.</p>
                    </div>

                    {/* SEARCH & FILTERS BAR */}
                    <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
                      <input 
                        type="text" 
                        placeholder="Search system features..."
                        value={searchFeatureQuery}
                        onChange={e => setSearchFeatureQuery(e.target.value)}
                        className="p-2.5 bg-sand/15 border border-warm rounded-xl focus:border-primary focus:outline-none w-full md:w-80"
                      />

                      <div className="flex gap-1.5 overflow-x-auto pb-1">
                        {["All", "Core", "Engagement", "Utilities", "Commerce", "Advanced"].map(cat => (
                          <button
                            type="button"
                            key={cat}
                            onClick={() => setSelectedFeatureCategory(cat)}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition shrink-0 ${
                              selectedFeatureCategory === cat ? "bg-primary text-white" : "bg-sand/10 hover:bg-sand/20 text-foreground"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* MODULE LIST */}
                    <div className="grid grid-cols-1 gap-3">
                      {features
                        .filter(feat => {
                          const matchesQuery = feat.name.toLowerCase().includes(searchFeatureQuery.toLowerCase()) || feat.code.toLowerCase().includes(searchFeatureQuery.toLowerCase());
                          const category = getFeatureCategory(feat.code);
                          const matchesCategory = selectedFeatureCategory === "All" || category === selectedFeatureCategory;
                          return matchesQuery && matchesCategory;
                        })
                        .map(feat => {
                          const isEnabled = planForm.modules?.active_features?.includes(feat.code);
                          const category = getFeatureCategory(feat.code);
                          
                          return (
                            <div key={feat.id} className={`border rounded-2xl p-4 transition-all duration-200 ${
                              isEnabled ? "border-teal-300 bg-teal-50/5 shadow-sm" : "border-warm bg-sand/5 hover:bg-sand/10"
                            }`}>
                              <div className="flex justify-between items-center gap-4">
                                <div className="flex items-center gap-3">
                                  <div className={`p-2.5 rounded-xl ${isEnabled ? "bg-teal-100/50 text-teal-800" : "bg-warm/30 text-warm-muted"}`}>
                                    {feat.code === "matrimony" ? <Users className="w-5 h-5" /> : 
                                     feat.code === "events" ? <Calendar className="w-5 h-5" /> : 
                                     feat.code === "venues" ? <HardDrive className="w-5 h-5" /> : 
                                     feat.code === "donations" ? <TrendingUp className="w-5 h-5" /> : 
                                     feat.code === "messages" ? <MessageSquare className="w-5 h-5" /> :
                                     feat.code === "white_label" ? <Settings className="w-5 h-5" /> :
                                     <Sliders className="w-5 h-5" />}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-foreground text-xs">{feat.name}</span>
                                      <span className="text-[8px] font-mono bg-warm/30 text-warm-muted px-1.5 py-0.5 rounded uppercase">{feat.code}</span>
                                      <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                        category === "Core" ? "bg-blue-50 text-blue-700" :
                                        category === "Advanced" ? "bg-purple-50 text-purple-700" :
                                        category === "Utilities" ? "bg-amber-50 text-amber-700" :
                                        "bg-emerald-50 text-emerald-700"
                                      }`}>{category}</span>
                                    </div>
                                    <p className="text-[10px] text-warm-muted mt-0.5">{feat.description || "Registers and handles features dynamically under this module name."}</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      checked={!!isEnabled}
                                      onChange={() => handleToggleFeature(feat.code)}
                                      className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-warm/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"></div>
                                  </label>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* STEP 4: LIMITS & QUOTAS */}
                {wizardStep === 4 && (
                  <div className="space-y-6 max-w-3xl animate-fadeIn">
                    <div className="border-b border-warm pb-3">
                      <h3 className="text-base font-black text-[#3E2723] flex items-center gap-2"><HardDrive className="w-5 h-5 text-primary" /> Quota Limits & Capacity</h3>
                      <p className="text-warm-muted text-[10px]">Configure limits for each active module. Setting to -1 or large values indicates unlimited capacity.</p>
                    </div>

                    <div className="space-y-6">
                      
                      {/* CORE CAPACITIES */}
                      <div className="bg-sand/10 border border-warm rounded-2xl p-5 space-y-4">
                        <h4 className="font-bold text-sm text-[#3E2723] flex items-center gap-1.5"><Users className="w-4 h-4 text-primary" /> Core Capacity Limits</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="font-bold text-warm-muted">Max Members</label>
                            <input 
                              type="number" 
                              value={planForm.max_members} 
                              onChange={e => setPlanForm({...planForm, max_members: parseInt(e.target.value) || 0})}
                              className="w-full p-2 bg-surface border border-warm rounded-lg focus:border-primary"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="font-bold text-warm-muted">Max Family Members</label>
                            <input 
                              type="number" 
                              value={planForm.max_family_members} 
                              onChange={e => setPlanForm({...planForm, max_family_members: parseInt(e.target.value) || 0})}
                              className="w-full p-2 bg-surface border border-warm rounded-lg focus:border-primary"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="font-bold text-warm-muted">Max Committee Members</label>
                            <input 
                              type="number" 
                              value={planForm.max_committee_members} 
                              onChange={e => setPlanForm({...planForm, max_committee_members: parseInt(e.target.value) || 0})}
                              className="w-full p-2 bg-surface border border-warm rounded-lg focus:border-primary"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="font-bold text-warm-muted">Max Communities (Tenants)</label>
                            <input 
                              type="number" 
                              value={planForm.max_communities} 
                              onChange={e => setPlanForm({...planForm, max_communities: parseInt(e.target.value) || 0})}
                              className="w-full p-2 bg-surface border border-warm rounded-lg focus:border-primary"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="font-bold text-warm-muted">Storage Quota (GB)</label>
                            <input 
                              type="number" 
                              value={planForm.max_storage_gb} 
                              onChange={e => setPlanForm({...planForm, max_storage_gb: parseInt(e.target.value) || 0})}
                              className="w-full p-2 bg-surface border border-warm rounded-lg focus:border-primary"
                            />
                          </div>
                        </div>
                      </div>


                    </div>
                  </div>
                )}

                {/* STEP 5: PERMISSIONS MATRIX */}
                {wizardStep === 5 && (
                  <div className="space-y-6 max-w-4xl animate-fadeIn">
                    <div className="border-b border-warm pb-3">
                      <h3 className="text-base font-black text-[#3E2723] flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" /> Dynamic Permission Matrix</h3>
                      <p className="text-warm-muted text-[10px]">Map granular CRUD permissions for all enabled modules in this plan. Set actions to true to allow them.</p>
                    </div>

                    {/* ONLY SHOW ENABLED MODULES */}
                    {(!planForm.modules?.active_features || planForm.modules?.active_features.length === 0) ? (
                      <div className="p-8 text-center bg-sand/10 border border-warm rounded-2xl text-warm-muted">
                        No features enabled in Step 3. Go back to enable modules to configure permissions here.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {wizardPermissions
                          .filter(perm => planForm.modules?.active_features?.includes(perm.feature_code))
                          .map((perm, idx) => {
                            const actualIdx = wizardPermissions.findIndex(wp => wp.feature_id === perm.feature_id);
                            const featureObj = features.find(f => f.code === perm.feature_code || f.id === perm.feature_id);
                            const actions = featureObj?.permission_definitions || [];
                            const allowedOps = perm.allowed_operations || [];
                            const allowedCount = actions.filter((act: any) => allowedOps.includes(act.code)).length;

                            return (
                              <div key={perm.feature_id} className="border border-warm rounded-2xl overflow-hidden bg-surface">
                                <div className="bg-sand/15 px-5 py-3.5 flex justify-between items-center border-b border-warm">
                                  <div>
                                    <h4 className="font-bold text-foreground text-xs flex items-center gap-2">
                                      {perm.feature_name}
                                      <span className="text-[9px] font-mono bg-warm/30 text-warm-muted px-1.5 py-0.5 rounded uppercase">{perm.feature_code}</span>
                                    </h4>
                                    <p className="text-[9px] text-warm-muted mt-0.5">Active capabilities: {allowedCount}/{actions.length} actions enabled</p>
                                  </div>

                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = [...wizardPermissions];
                                        updated[actualIdx] = {
                                          ...updated[actualIdx],
                                          allowed_operations: actions.map((act: any) => act.code)
                                        };
                                        setWizardPermissions(updated);
                                      }}
                                      className="px-2.5 py-1 text-[9px] font-bold border border-warm hover:bg-sand/30 rounded-lg text-foreground transition"
                                    >
                                      Grant All
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = [...wizardPermissions];
                                        updated[actualIdx] = {
                                          ...updated[actualIdx],
                                          allowed_operations: []
                                        };
                                        setWizardPermissions(updated);
                                      }}
                                      className="px-2.5 py-1 text-[9px] font-bold border border-warm hover:bg-sand/30 rounded-lg text-foreground transition"
                                    >
                                      Revoke All
                                    </button>
                                  </div>
                                </div>

                                {actions.length === 0 ? (
                                  <div className="p-4 text-center text-[10px] text-warm-muted">
                                    No dynamic permissions registered for this module.
                                  </div>
                                ) : (
                                  <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {actions.map((act: any) => {
                                      const isChecked = allowedOps.includes(act.code);
                                      return (
                                        <label key={act.code} className="flex items-center gap-2 p-2 bg-sand/5 border border-warm rounded-lg hover:bg-sand/15 transition cursor-pointer">
                                          <input 
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => {
                                              const updated = [...wizardPermissions];
                                              const currentOps = updated[actualIdx].allowed_operations || [];
                                              let nextOps;
                                              if (isChecked) {
                                                nextOps = currentOps.filter((c: string) => c !== act.code);
                                              } else {
                                                nextOps = [...currentOps, act.code];
                                              }
                                              updated[actualIdx] = {
                                                ...updated[actualIdx],
                                                allowed_operations: nextOps
                                              };
                                              setWizardPermissions(updated);
                                            }}
                                            className="rounded border-warm text-primary focus:ring-primary w-3.5 h-3.5"
                                          />
                                          <span className="font-bold text-[10px] text-foreground">{act.name}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 6: ADD-ONS */}
                {wizardStep === 6 && (
                  <div className="space-y-6 max-w-4xl animate-fadeIn">
                    <div className="border-b border-warm pb-3 flex justify-between items-center">
                      <div>
                        <h3 className="text-base font-black text-[#3E2723] flex items-center gap-2"><Tag className="w-5 h-5 text-primary" /> Purchasable Extensions (Add-ons)</h3>
                        <p className="text-warm-muted text-[10px]">Select which add-on extensions are compatible and assignable for subscribers of this plan tier.</p>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setAddonForm({
                            name: "",
                            code: "",
                            description: "",
                            price: 0,
                            billing_cycle: "Monthly",
                            target_limit: "max_members",
                            limit_value: 0,
                            active: true
                          });
                          setAddonModalOpen(true);
                        }}
                        className="px-3.5 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md shadow-primary/10 transition"
                      >
                        <Plus className="w-4 h-4" /> Create Add-on
                      </button>
                    </div>

                    {addons.length === 0 ? (
                      <div className="p-8 text-center bg-sand/10 border border-warm rounded-2xl text-warm-muted">
                        No add-on extensions created yet. Click "Create Add-on" to construct one.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {addons.map(addon => {
                          const isLinked = planForm.modules?.addon_ids?.includes(addon.id);
                          return (
                            <div 
                              key={addon.id} 
                              onClick={() => handleToggleAddon(addon.id)}
                              className={`border rounded-2xl p-4 cursor-pointer transition flex justify-between items-center ${
                                isLinked ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm" : "border-warm bg-sand/5 hover:bg-sand/10"
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-foreground text-xs">{addon.name}</span>
                                  <span className="text-[8px] font-mono bg-warm/30 text-warm-muted px-1.5 py-0.5 rounded uppercase">{addon.code}</span>
                                </div>
                                <p className="text-[10px] text-warm-muted">{addon.description || "Provides extended resource capability limits for subscriber community."}</p>
                                <div className="flex items-center gap-2 pt-1">
                                  <span className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                    +{addon.limit_value} {(addon.target_limit || addon.limit_type || "").replace("max_", "").replace(/_/g, " ").toUpperCase()}
                                  </span>
                                  <span className="text-[9px] font-semibold text-warm-muted">
                                    {addon.billing_cycle} cycle
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0 ml-3">
                                <div className="text-right">
                                  <p className="font-black text-foreground">
                                    {planForm.currency === "INR" ? "₹" : planForm.currency === "USD" ? "$" : planForm.currency === "EUR" ? "€" : "£"}
                                    {addon.price}
                                  </p>
                                </div>
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
                                  isLinked ? "bg-primary border-primary text-white" : "border-warm bg-white"
                                }`}>
                                  {isLinked && <Check className="w-3.5 h-3.5" />}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 7: REVIEW & PUBLISH */}
                {wizardStep === 7 && (
                  <div className="space-y-6 max-w-4xl animate-fadeIn">
                    <div className="border-b border-warm pb-4">
                      <h3 className="text-base font-black text-[#3E2723] flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-600" /> Review & Publish Plan</h3>
                      <p className="text-warm-muted text-[10px]">Verify all configurations before writing them live to the multi-tenant database registry.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* CARD PREVIEW */}
                      <div className="space-y-3">
                        <h4 className="font-bold text-[#3E2723] text-xs uppercase tracking-wide">Client Portal Card Preview</h4>
                        <div className={`rounded-3xl p-5 bg-gradient-to-br shadow-xl ${planForm.color_theme || "from-blue-600 to-indigo-700"}`}>
                          <div className="flex justify-between items-start">
                            <div>
                              {planForm.display_badge && (
                                <span className="bg-white/20 backdrop-blur-sm text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase">
                                  {planForm.display_badge}
                                </span>
                              )}
                              <h5 className="font-black text-base mt-2 text-white">{planForm.name || "Draft Plan"}</h5>
                            </div>
                            {planForm.is_popular && (
                              <span className="text-[9px] font-black uppercase bg-amber-400 text-amber-950 px-2 py-0.5 rounded-md flex items-center gap-0.5">★ Popular</span>
                            )}
                          </div>
                          
                          <p className="text-[10px] text-white/85 mt-2 line-clamp-2">{planForm.description || "No description provided yet."}</p>

                          <div className="mt-4 border-t border-white/20 pt-4 flex items-baseline gap-1">
                            <span className="text-xl font-black text-white">
                              {planForm.currency === "INR" ? "₹" : planForm.currency === "USD" ? "$" : planForm.currency === "EUR" ? "€" : "£"}
                              {planForm.yearly_price || planForm.monthly_price || 0}
                            </span>
                            <span className="text-[10px] text-white/80">/ {planForm.yearly_price ? "Year" : "Month"}</span>
                          </div>

                          <div className="mt-4 space-y-1.5 text-[9px] text-white/80">
                            <p className="flex items-center gap-1.5">✓ Up to {planForm.max_members} community members</p>
                            <p className="flex items-center gap-1.5">✓ {planForm.max_storage_gb} GB secure storage</p>
                            <p className="flex items-center gap-1.5">✓ {planForm.modules?.active_features?.length || 0} active application modules</p>
                            <p className="flex items-center gap-1.5">✓ {planForm.trial_days} days free trial period</p>
                          </div>
                        </div>
                      </div>

                      {/* SUMMARY SPECS */}
                      <div className="md:col-span-2 space-y-4">

                        {/* VALIDATION CHECKLIST */}
                        <div className="bg-sand/10 border border-warm rounded-2xl p-5 space-y-3">
                          <h4 className="font-bold text-[#3E2723] text-xs flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" /> Architect Validation Checklist</h4>
                          <div className="space-y-2">
                            {[
                              {
                                label: "Plan Title & Slug Code",
                                ok: !!(planForm.name && planForm.code),
                                okMsg: `✓ ${planForm.code}`,
                                failMsg: "✗ Missing — go to Step 1"
                              },
                              {
                                label: "Active Billing Rates",
                                ok: planForm.monthly_price > 0 || planForm.yearly_price > 0 || planForm.lifetime_price > 0,
                                okMsg: `✓ ${planForm.currency} cycles configured`,
                                failMsg: "⚠ 0 — Free tier (OK if intentional)",
                                warn: true
                              },
                              {
                                label: "Application Modules",
                                ok: (planForm.modules?.active_features?.length || 0) > 0,
                                okMsg: `✓ ${planForm.modules?.active_features?.length} module(s) enabled`,
                                failMsg: "✗ None — subscribers get blank panel"
                              },
                              {
                                label: "Permissions Configured",
                                ok: wizardPermissions.some(wp => planForm.modules?.active_features?.includes(wp.feature_code) && (wp.allowed_operations?.length > 0 || wp.can_view)),
                                okMsg: "✓ At least one module has permissions",
                                failMsg: "⚠ No actions granted — all features will be view-only",
                                warn: true
                              },
                              {
                                label: "Linked Add-ons",
                                ok: (planForm.modules?.addon_ids?.length || 0) > 0,
                                okMsg: `✓ ${planForm.modules?.addon_ids?.length} add-on(s) linked`,
                                failMsg: "— None linked (optional)",
                                warn: true
                              }
                            ].map((item, i) => (
                              <div key={i} className={`flex justify-between items-center p-2.5 rounded-xl border ${
                                item.ok ? "bg-emerald-50 border-emerald-200" :
                                item.warn ? "bg-amber-50 border-amber-200" :
                                "bg-red-50 border-red-200"
                              }`}>
                                <span className="font-semibold text-foreground text-[11px]">{item.label}</span>
                                <span className={`font-bold text-[10px] ${
                                  item.ok ? "text-emerald-700" : item.warn ? "text-amber-700" : "text-red-700"
                                }`}>{item.ok ? item.okMsg : item.failMsg}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* PLAN SPEC SUMMARY */}
                        <div className="bg-sand/10 border border-warm rounded-2xl p-5 space-y-3">
                          <h4 className="font-bold text-[#3E2723] text-xs flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Plan Configuration Summary</h4>
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            {[
                              { label: "Max Members", value: planForm.max_members?.toLocaleString() },
                              { label: "Max Communities", value: planForm.max_communities },
                              { label: "Max Family Members", value: planForm.max_family_members?.toLocaleString() },
                              { label: "Max Storage", value: `${planForm.max_storage_gb} GB` },
                              { label: "Trial Period", value: `${planForm.trial_days} days` },
                              { label: "Grace Period", value: `${planForm.grace_period_days} days` },
                              { label: "GST Rate", value: `${planForm.gst_percentage}%` },
                              { label: "Discount", value: `${planForm.discount_percentage}%` }
                            ].map((row, i) => (
                              <div key={i} className="flex justify-between bg-surface border border-warm rounded-lg p-2">
                                <span className="text-warm-muted font-medium">{row.label}</span>
                                <span className="font-bold text-foreground">{row.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* ACTIVE MODULES TAGS */}
                        <div className="bg-sand/10 border border-warm rounded-2xl p-5 space-y-2">
                          <h4 className="font-bold text-[#3E2723] text-xs flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> Active Module Registry</h4>
                          <div className="flex flex-wrap gap-2">
                            {(!planForm.modules?.active_features || planForm.modules?.active_features.length === 0) ? (
                              <span className="text-[10px] text-warm-muted italic">No modules selected</span>
                            ) : (
                              planForm.modules.active_features.map((code: string) => {
                                const featName = features.find(f => f.code === code)?.name || code;
                                const permRecord = wizardPermissions.find(wp => wp.feature_code === code);
                                const allowedActions = permRecord ? Object.keys(permRecord).filter(k => k.startsWith("can_") && !!permRecord[k]).length : 0;
                                return (
                                  <span key={code} className="bg-surface border border-emerald-200 bg-emerald-50 px-2.5 py-1 rounded-xl text-[10px] font-bold text-emerald-800 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                    {featName}
                                    {allowedActions > 0 && <span className="bg-emerald-200 text-emerald-900 font-black px-1.5 py-0.5 rounded text-[8px]">{allowedActions} ops</span>}
                                  </span>
                                );
                              })
                            )}
                          </div>
                        </div>

                        {/* PREMIUM BRANDING FLAGS */}
                        {["custom_branding","community_logo","domain_mapping","white_label","custom_login"].some(k => planForm[k]) && (
                          <div className="bg-sand/10 border border-warm rounded-2xl p-5 space-y-2">
                            <h4 className="font-bold text-[#3E2723] text-xs flex items-center gap-2"><Key className="w-4 h-4 text-primary" /> Premium Capabilities Enabled</h4>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { key: "custom_branding", label: "Custom Branding" },
                                { key: "community_logo", label: "Community Logo" },
                                { key: "domain_mapping", label: "Domain Mapping" },
                                { key: "white_label", label: "White Label" },
                                { key: "custom_login", label: "Custom Login" },
                                { key: "custom_email_templates", label: "Email Templates" },
                                { key: "custom_sms_templates", label: "SMS Templates" },
                                { key: "custom_whatsapp", label: "WhatsApp Integration" },
                                { key: "custom_theme", label: "Custom Themes" }
                              ].filter(f => planForm[f.key]).map(f => (
                                <span key={f.key} className="bg-violet-50 border border-violet-200 text-violet-800 text-[10px] font-bold px-2.5 py-1 rounded-full">✓ {f.label}</span>
                              ))}
                            </div>
                          </div>
                        )}

                      </div>

                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* WIZARD FOOTER */}
            <div className="px-6 py-4 border-t border-warm bg-sand/15 flex justify-between items-center shrink-0">
              <button 
                type="button"
                onClick={() => setPlanModalOpen(false)}
                className="px-4 py-2 text-foreground font-bold hover:bg-warm/30 rounded-xl transition text-[11px]"
              >
                Exit Draft
              </button>

              {/* PROGRESS BAR */}
              <div className="flex items-center gap-3 hidden sm:flex">
                <span className="text-[10px] font-black text-warm-muted">Progress</span>
                <div className="w-56 h-1.5 bg-warm/30 rounded-full overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all duration-300 rounded-full" 
                    style={{ width: `${(wizardStep / 7) * 100}%` }} 
                  />
                </div>
                <span className="text-[10px] font-black text-foreground">{wizardStep} of 7</span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={wizardStep === 1}
                  onClick={() => setWizardStep(prev => prev - 1)}
                  className="px-4 py-2 border border-warm hover:bg-sand/30 text-foreground rounded-xl font-bold disabled:opacity-30 disabled:pointer-events-none transition text-[11px]"
                >
                  Previous Step
                </button>

                {wizardStep < 7 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep(prev => prev + 1)}
                    className="px-5 py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark shadow-md transition text-[11px]"
                  >
                    Next Step
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!planForm.name || !planForm.code || !(planForm.modules?.active_features?.length)}
                    onClick={handleSavePlan}
                    className="px-6 py-2 bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white rounded-xl font-black shadow-md shadow-green-950/20 transition disabled:opacity-40 disabled:pointer-events-none text-[11px]"
                  >
                    Publish & Activate Plan
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* INLINE ADD-ON CREATION DIALOG */}
      {addonModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-warm rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-scaleIn">
            <div className="flex justify-between items-center border-b border-warm pb-3">
              <h3 className="font-black text-sm text-[#3E2723]">Define New Plan Add-on</h3>
              <button onClick={() => setAddonModalOpen(false)} className="p-1 hover:bg-warm/30 rounded-lg text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAddon} className="space-y-4 text-left">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Add-on Name *</label>
                  <input 
                    type="text" 
                    required 
                    value={addonForm.name}
                    onChange={e => setAddonForm({...addonForm, name: e.target.value})}
                    className="w-full p-2 bg-sand/15 border border-warm rounded-lg text-xs"
                    placeholder="e.g. Extra 500 Members"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Unique Code *</label>
                  <input 
                    type="text" 
                    required 
                    value={addonForm.code}
                    onChange={e => setAddonForm({...addonForm, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')})}
                    className="w-full p-2 bg-sand/15 border border-warm rounded-lg text-xs"
                    placeholder="e.g. extra_members_500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Description</label>
                <textarea 
                  value={addonForm.description}
                  onChange={e => setAddonForm({...addonForm, description: e.target.value})}
                  className="w-full p-2 bg-sand/15 border border-warm rounded-lg text-xs min-h-[45px]"
                  placeholder="Describe what resources this extension unlocks..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Price</label>
                  <input 
                    type="number" 
                    value={addonForm.price}
                    onChange={e => setAddonForm({...addonForm, price: parseInt(e.target.value) || 0})}
                    className="w-full p-2 bg-sand/15 border border-warm rounded-lg text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Billing Cycle</label>
                  <select 
                    value={addonForm.billing_cycle}
                    onChange={e => setAddonForm({...addonForm, billing_cycle: e.target.value})}
                    className="w-full p-2 bg-sand/15 border border-warm rounded-lg text-xs"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Yearly">Yearly</option>
                    <option value="Lifetime">Lifetime</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Target Quota Limit</label>
                  <select 
                    value={addonForm.target_limit}
                    onChange={e => setAddonForm({...addonForm, target_limit: e.target.value})}
                    className="w-full p-2 bg-sand/15 border border-warm rounded-lg text-xs"
                  >
                    <option value="">-- Select Limit --</option>
                    <option value="max_members">Extra Members</option>
                    <option value="max_storage_gb">Extra Storage (GB)</option>
                    <option value="max_family_members">Extra Family Members</option>
                    <option value="max_committee_members">Extra Committee Members</option>
                    <option value="max_communities">Extra Subsidiary Communities</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Limit Value</label>
                  <input 
                    type="number" 
                    value={addonForm.limit_value}
                    onChange={e => setAddonForm({...addonForm, limit_value: parseInt(e.target.value) || 0})}
                    className="w-full p-2 bg-sand/15 border border-warm rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-warm pt-3">
                <button 
                  type="button" 
                  onClick={() => setAddonModalOpen(false)}
                  className="px-3 py-1.5 border border-warm rounded-lg font-bold hover:bg-sand/30"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-1.5 bg-primary text-white rounded-lg font-bold hover:bg-primary-dark"
                >
                  Create & Link Add-on
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMMUNITY SUBSCRIPTION MODAL */}
      {subModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-warm rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-6">
            
            <div className="flex justify-between items-center border-b border-warm pb-4">
              <h2 className="text-lg font-black font-ui text-[#3E2723]">
                {selectedSub ? `Modify License: ${selectedSub.community?.name}` : "Assign New Platform License"}
              </h2>
              <button 
                onClick={() => setSubModalOpen(false)}
                className="p-1.5 hover:bg-warm/30 rounded-xl transition text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSub} className="space-y-4 text-xs text-left">
              
              {!selectedSub && (
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Target Community *</label>
                  <select 
                    required 
                    value={subForm.community_id} 
                    onChange={e => setSubForm({...subForm, community_id: e.target.value})}
                    className="w-full p-2.5 bg-sand/20 border border-warm rounded-xl focus:border-primary focus:outline-none"
                  >
                    <option value="">-- Select Community --</option>
                    {communities.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="font-bold text-foreground">License Plan *</label>
                <select 
                  required 
                  value={subForm.plan_id} 
                  onChange={e => setSubForm({...subForm, plan_id: e.target.value})}
                  className="w-full p-2.5 bg-sand/20 border border-warm rounded-xl focus:border-primary focus:outline-none"
                >
                  <option value="">-- Select License Tier --</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Status</label>
                <select 
                  value={subForm.status} 
                  onChange={e => setSubForm({...subForm, status: e.target.value})}
                  className="w-full p-2.5 bg-sand/20 border border-warm rounded-xl focus:border-primary focus:outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="Trial">Trial</option>
                  <option value="Grace Period">Grace Period</option>
                  <option value="Expired">Expired</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>

              {!selectedSub && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-foreground">Billing Cycle</label>
                    <select 
                      value={subForm.billing_cycle} 
                      onChange={e => setSubForm({...subForm, billing_cycle: e.target.value})}
                      className="w-full p-2.5 bg-sand/20 border border-warm rounded-xl focus:border-primary focus:outline-none"
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Yearly">Yearly</option>
                      <option value="Lifetime">Lifetime</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-foreground">Receipt Amount</label>
                    <input 
                      type="number" 
                      value={subForm.amount} 
                      onChange={e => setSubForm({...subForm, amount: parseInt(e.target.value) || 0})}
                      className="w-full p-2.5 bg-sand/20 border border-warm rounded-xl focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 p-2 bg-sand/10 border border-warm rounded-xl">
                <label className="flex items-center gap-2 font-bold text-foreground cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={subForm.auto_renew} 
                    onChange={e => setSubForm({...subForm, auto_renew: e.target.checked})}
                    className="rounded border-warm text-primary focus:ring-primary"
                  />
                  Enable Auto Renewal
                </label>
              </div>

              <div className="flex justify-end gap-2 border-t border-warm pt-4">
                <button 
                  type="button"
                  onClick={() => setSubModalOpen(false)}
                  className="px-4 py-2 border border-warm hover:bg-sand/30 rounded-xl font-bold text-foreground"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark shadow-md"
                >
                  Save License Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODULE PERMISSIONS DRAWER */}
      {permissionDrawerOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-3xl bg-surface border-l border-warm shadow-2xl flex flex-col justify-between animate-slideIn">
          <div className="p-6 border-b border-warm flex justify-between items-center bg-sand/10">
            <div>
              <h2 className="text-lg font-black font-ui text-[#3E2723]">
                Module Registry Permissions
              </h2>
              <p className="text-[10px] text-warm-muted mt-0.5">
                Configure granular action capabilities for plan: <strong>{selectedPlanForPerms?.name}</strong>
              </p>
            </div>
            <button 
              onClick={() => setPermissionDrawerOpen(false)}
              className="p-1.5 hover:bg-warm/30 rounded-xl transition text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="bg-sand/20 border border-warm rounded-xl p-3 text-[10px] text-warm-muted flex gap-2">
              <HelpCircle className="w-4 h-4 text-primary shrink-0" />
              <span>
                Toggle specific action access permissions. Modules with <strong>View</strong> unchecked will automatically lock access to the entire page.
              </span>
            </div>

            <div className="space-y-4">
              {planPermissions.map((perm, idx) => {
                const featureObj = features.find(f => f.code === perm.code || f.id === perm.feature_id);
                const actions = featureObj?.permission_definitions || [];
                const allowedOps = perm.allowed_operations || [];
                const allowedCount = actions.filter((act: any) => allowedOps.includes(act.code)).length;

                return (
                  <div key={perm.feature_id} className="border border-warm rounded-2xl p-4 bg-surface space-y-3">
                    <div className="flex justify-between items-center border-b border-warm pb-2">
                      <div>
                        <h4 className="font-bold text-xs text-foreground">{perm.name}</h4>
                        <p className="text-[10px] text-warm-muted font-mono font-semibold">{perm.code}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...planPermissions];
                            updated[idx] = {
                              ...updated[idx],
                              allowed_operations: actions.map((act: any) => act.code)
                            };
                            setPlanPermissions(updated);
                          }}
                          className="px-2 py-0.5 text-[9px] font-bold border border-warm hover:bg-sand/30 rounded-lg text-foreground transition"
                        >
                          All
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...planPermissions];
                            updated[idx] = {
                              ...updated[idx],
                              allowed_operations: []
                            };
                            setPlanPermissions(updated);
                          }}
                          className="px-2 py-0.5 text-[9px] font-bold border border-warm hover:bg-sand/30 rounded-lg text-foreground transition"
                        >
                          None
                        </button>
                      </div>
                    </div>

                    {actions.length === 0 ? (
                      <div className="text-[10px] text-warm-muted p-2 bg-sand/5 border border-warm border-dashed rounded-lg text-center">
                        No dynamic permissions registered for this module.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[10px] font-semibold text-foreground">
                        {actions.map((act: any) => {
                          const isChecked = allowedOps.includes(act.code);
                          return (
                            <label key={act.code} className="flex items-center gap-1.5 cursor-pointer p-1.5 bg-sand/5 border border-warm rounded-lg hover:bg-sand/15 transition">
                              <input 
                                type="checkbox" 
                                checked={isChecked} 
                                onChange={() => handleTogglePermission(idx, act.code)}
                                className="rounded border-warm text-primary focus:ring-primary w-3.5 h-3.5"
                              />
                              {act.name}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-4 border-t border-warm bg-sand/10 flex justify-end gap-2">
            <button 
              onClick={() => setPermissionDrawerOpen(false)}
              className="px-4 py-2 border border-warm hover:bg-sand/30 rounded-xl font-bold text-xs text-foreground"
            >
              Cancel
            </button>
            <button 
              onClick={handleSavePermissions}
              className="px-5 py-2 bg-primary text-white rounded-xl font-bold text-xs hover:bg-primary-dark shadow-md"
            >
              Save Permissions Matrix
            </button>
          </div>
        </div>
      )}
    </div>
  </PageWrap>
  );
}
