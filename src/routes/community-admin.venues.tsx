import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import React, { useState, useEffect, useRef } from "react";
import { api, getImageUrl } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2, Plus, Edit, Trash2, MapPin, CheckSquare, Search,
  IndianRupee, FileText, Image as ImageIcon, Calendar as CalendarIcon,
  ShieldCheck, ClipboardCheck, DollarSign, List, BarChart3, Settings as SettingsIcon,
  CheckCircle, HelpCircle, ArrowLeft, ArrowRight, User, Phone, Mail, Sparkles,
  PlusCircle, AlertCircle, TrendingUp, Percent, Users, ChevronRight, X, Eye,
  Clock, ClipboardList, CheckCircle2, ShieldAlert, Upload, Sparkle, Tag, Info,
  Filter, FileSpreadsheet, RefreshCw, CalendarDays, Check, Slash, ChevronLeft, Wallet, Sliders
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, Tooltip as ChartTooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/community-admin/venues")({
  component: AdminVenues,
});

const AMENITIES_LIST = [
  { id: "Parking", label: "Parking", icon: "Car" },
  { id: "Kitchen", label: "Kitchen", icon: "Utensils" },
  { id: "Dining Hall", label: "Dining Hall", icon: "Coffee" },
  { id: "WiFi", label: "WiFi", icon: "Wifi" },
  { id: "AC", label: "Air Conditioning", icon: "Wind" },
  { id: "Generator", label: "Generator", icon: "Zap" },
  { id: "Lift", label: "Lift", icon: "ChevronsUpDown" },
  { id: "Security", label: "Security", icon: "Shield" },
  { id: "Garden", label: "Garden", icon: "Leaf" },
  { id: "Water Facility", label: "Water Facility", icon: "Droplet" },
  { id: "Projector", label: "Projector", icon: "Tv" },
  { id: "Stage", label: "Stage", icon: "Mic" },
  { id: "Sound System", label: "Sound System", icon: "Volume2" },
  { id: "Guest Rooms", label: "Guest Rooms", icon: "Bed" },
  { id: "Decoration Area", label: "Decoration Area", icon: "Sparkles" }
];

type LocalTab = 'overview' | 'add-property' | 'bookings' | 'ledger' | 'payments' | 'waiting' | 'settings';

let isFirstLoad = true;

export function AdminVenues() {
  const { user } = useAuth();
  const search = useSearch({ strict: false }) as any;
  const tabFromSearch = search?.tab as LocalTab;
  const isSuperAdmin = user?.role === "super_admin";

  const navigate = useNavigate();

  const [activeTab, _setActiveTab] = useState<LocalTab>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab') as LocalTab | null;
      if (tabParam && ['overview', 'add-property', 'bookings', 'ledger', 'payments', 'waiting', 'settings'].includes(tabParam)) {
        return tabParam;
      }
      if (isFirstLoad) {
        const savedTab = sessionStorage.getItem('venues_active_tab');
        if (savedTab && ['overview', 'add-property', 'bookings', 'ledger', 'payments', 'waiting', 'settings'].includes(savedTab)) {
          return savedTab as LocalTab;
        }
      }
    }
    return 'overview';
  });

  const [workflowStep, _setWorkflowStep] = useState<number>(() => {
    if (typeof window !== 'undefined' && isFirstLoad) {
      const savedStep = sessionStorage.getItem('venues_workflow_step');
      return savedStep ? parseInt(savedStep, 10) : 1;
    }
    return 1;
  });

  const setActiveTab = (tab: LocalTab) => {
    _setActiveTab(tab);
    sessionStorage.setItem('venues_active_tab', tab);
    navigate({
      search: (prev: any) => ({ ...prev, tab })
    } as any);
  };

  const setWorkflowStep = (step: number | ((prev: number) => number)) => {
    const resolveStep = (prev: number) => typeof step === 'function' ? step(prev) : step;
    _setWorkflowStep(prev => {
      const nextStep = resolveStep(prev);
      if (nextStep > 1 && !selectedPropertyForWizard) {
        toast.error("Please enter and save property details in Step 1 first.");
        return prev;
      }
      sessionStorage.setItem('venues_workflow_step', String(nextStep));
      return nextStep;
    });
  };

  const [loading, setLoading] = useState(true);

  // Core Data States
  const [properties, setProperties] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [pricings, setPricings] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [waitingList, setWaitingList] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [dependenciesList, setDependenciesList] = useState<any[]>([]);

  // Step 3 Page State & Modals
  const [step3Page, setStep3Page] = useState(1);
  const [editingResource, setEditingResource] = useState<any>(null);
  const [editResourceForm, setEditResourceForm] = useState<any>(null);
  const [selectedResourceIds, setSelectedResourceIds] = useState<Set<number>>(new Set());

  // Dynamic Amenities States
  const [newAmenityInput, setNewAmenityInput] = useState("");
  const [customAmenities, setCustomAmenities] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('venues_custom_amenities');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return [];
  });

  const handleAddCustomAmenity = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!customAmenities.includes(trimmed)) {
      const updated = [...customAmenities, trimmed];
      setCustomAmenities(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem('venues_custom_amenities', JSON.stringify(updated));
      }
      toast.success(`Amenity "${trimmed}" added successfully!`);
    } else {
      toast.info(`Amenity "${trimmed}" already exists.`);
    }
  };

  // Step 5 Add-ons States
  const [addonForm, setAddonForm] = useState({ name: '', hourly_rate: '', half_day_hours: '6', half_day_rate: '', full_day_rate: '', deposit_amount: '' });
  const [addonsList, setAddonsList] = useState<any[]>(() => {
    if (typeof window !== 'undefined' && isFirstLoad) {
      try {
        const saved = sessionStorage.getItem('venues_wizard_prop');
        if (saved) {
          const prop = JSON.parse(saved);
          if (prop && prop.internal_notes) {
            const parsed = JSON.parse(prop.internal_notes);
            if (parsed && Array.isArray(parsed.addons)) return parsed.addons;
          }
        }
      } catch(e) {}
    }
    return [];
  });
  const [savingAddon, setSavingAddon] = useState(false);

  // Lightbox Preview State
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Super Admin Property Approval States
  const [approvalFilter, setApprovalFilter] = useState<'Pending Approval' | 'Approved' | 'Rejected' | 'All'>('Pending Approval');
  const [rejectReasonInput, setRejectReasonInput] = useState("");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [propertyToReject, setPropertyToReject] = useState<any>(null);

  // Wizard Flow States (Step 1 to 12)
  const [selectedPropertyForWizard, setSelectedPropertyForWizardState] = useState<any>(() => {
    if (typeof window !== 'undefined' && isFirstLoad) {
      const saved = sessionStorage.getItem('venues_wizard_prop');
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });

  const setSelectedPropertyForWizard = (prop: any) => {
    setSelectedPropertyForWizardState(prop);
    if (typeof window !== 'undefined') {
      if (prop) {
        sessionStorage.setItem('venues_wizard_prop', JSON.stringify(prop));
      } else {
        sessionStorage.removeItem('venues_wizard_prop');
      }
    }
    if (prop) {
      try {
        if (prop.internal_notes) {
          const parsed = JSON.parse(prop.internal_notes);
          if (parsed && Array.isArray(parsed.addons)) {
            setAddonsList(parsed.addons);
            return;
          }
        }
      } catch (e) {}
      setAddonsList([]);
    } else {
      setAddonsList([]);
    }
  };

  const [selectedResourceForPricing, setSelectedResourceForPricing] = useState<any>(() => {
    if (typeof window !== 'undefined' && isFirstLoad) {
      const saved = sessionStorage.getItem('venues_selected_resource_for_pricing');
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });

  // Details Modal States
  const [selectedPropertyForDetails, setSelectedPropertyForDetails] = useState<any>(() => {
    if (typeof window !== 'undefined' && isFirstLoad) {
      const saved = sessionStorage.getItem('venues_selected_property_for_details');
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });

  const [isDetailsOpen, setIsDetailsOpen] = useState(() => {
    if (typeof window !== 'undefined' && isFirstLoad) {
      const saved = sessionStorage.getItem('venues_is_details_open');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });

  // Forms
  const [propertyForm, setPropertyForm] = useState(() => {
    const defaultForm = {
      name: "", property_type: "Community Hall", status: "Pending Approval", ownership: "Community Owned",
      address: "", city: "", state: "", pincode: "", country: "India", google_map_url: "",
      latitude: "21.1702", longitude: "72.8311",
      contact_person_name: "", contact_phone: "", alternate_phone: "", contact_email: "",
      description: "", rules: "",
      photos: [] as string[],
      uploaded_photos: [] as File[],
      cancellation_allowed: true, cancellation_hours: 24, refund_percentage: 100, security_deposit: 0,
      approval_required: true, manual_payment_allowed: true, tax_percentage: 18.0,
      terms_conditions: "", internal_notes: "",
      rejection_reason: "",
      amenities: [] as string[]
    };
    if (typeof window !== 'undefined' && isFirstLoad) {
      const saved = sessionStorage.getItem('venues_property_form');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            ...defaultForm,
            ...parsed,
            photos: Array.isArray(parsed?.photos) ? parsed.photos : [],
            uploaded_photos: [], // Ensure uploaded files array is initialized
            amenities: Array.isArray(parsed?.amenities) ? parsed.amenities : []
          };
        } catch (e) {
          return defaultForm;
        }
      }
    }
    return defaultForm;
  });

  // Sync propertyForm to sessionStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const { uploaded_photos, ...serializable } = propertyForm;
      sessionStorage.setItem('venues_property_form', JSON.stringify(serializable));
    }
  }, [propertyForm]);

  // Sync tab with URL search parameter
  useEffect(() => {
    if (tabFromSearch && ['overview', 'add-property', 'bookings', 'ledger', 'payments', 'waiting', 'settings'].includes(tabFromSearch)) {
      if (tabFromSearch !== activeTab) {
        _setActiveTab(tabFromSearch);
        sessionStorage.setItem('venues_active_tab', tabFromSearch);
      }
    } else {
      navigate({
        search: (prev: any) => ({ ...prev, tab: activeTab })
      } as any);
    }
  }, [tabFromSearch]);



  const [resourceForm, setResourceForm] = useState(() => {
    const defaultVal = {
      name: "", resource_type: "Hall", capacity: 500, description: "",
      booking_type: "Full Day", status: "Active",
      hourly_rate: 0, half_day_hours: 6, half_day_rate: 0, full_day_rate: 0, security_deposit: 0,
      min_booking_duration_hours: 1, max_booking_duration_hours: 24,
      setup_buffer_hours: 0, cleanup_buffer_hours: 0,
      isBulk: false, prefix: "Room", range_start: 1, range_end: 10,
      dependencies: [] as number[], amenities: [] as string[]
    };
    if (typeof window !== 'undefined' && isFirstLoad) {
      const saved = sessionStorage.getItem('venues_resource_form');
      return saved ? JSON.parse(saved) : defaultVal;
    }
    return defaultVal;
  });

  const PROPERTY_TYPE_OPTIONS = [
    "Community Hall", "Marriage Hall", "Guest House", "Dharamshala", "Rooms",
    "Parking", "Kitchen", "Conference Hall", "Garden", "Community Center", "Clubhouse", "Other"
  ];

  const RESOURCE_TYPE_OPTIONS = ["Main Hall", "Room", "Kitchen", "Parking", "Conference Hall", "Garden", "Dining Hall", "Other"];

  const [pricingForm, setPricingForm] = useState(() => {
    const defaultVal = {
      weekday_price: "5000",
      weekend_price: "7000",
      festival_price: "10000",
      seasonal_price: "8000",
      member_verified: "5000",
      member_non: "7000",
      member_vip: "4000",
      member_committee: "0"
    };
    if (typeof window !== 'undefined' && isFirstLoad) {
      const saved = sessionStorage.getItem('venues_pricing_form');
      return saved ? JSON.parse(saved) : defaultVal;
    }
    return defaultVal;
  });

  const [adminNotes, setAdminNotes] = useState("");
  const [transactionIdInput, setTransactionIdInput] = useState("TXN-2025-88990");
  const [bookingTabFilter, setBookingTabFilter] = useState<'All' | 'Pending' | 'Confirmed' | 'Cancelled'>(() => {
    if (typeof window !== 'undefined' && isFirstLoad) {
      const saved = sessionStorage.getItem('venues_booking_tab_filter');
      if (saved && ['All', 'Pending', 'Confirmed', 'Cancelled'].includes(saved)) {
        return saved as 'All' | 'Pending' | 'Confirmed' | 'Cancelled';
      }
    }
    return 'All';
  });

  const [bookingSearch, setBookingSearch] = useState(() => {
    if (typeof window !== 'undefined' && isFirstLoad) {
      return sessionStorage.getItem('venues_booking_search') || "";
    }
    return "";
  });

  const [bookingDateFilter, setBookingDateFilter] = useState(() => {
    if (typeof window !== 'undefined' && isFirstLoad) {
      return sessionStorage.getItem('venues_booking_date_filter') || "All Dates";
    }
    return "All Dates";
  });

  const [roomRangeForm, setRoomRangeForm] = useState(() => {
    const defaultVal = {
      resource_name: "Standard Room",
      prefix: "Room",
      start_num: 1,
      end_num: 50,
      digits: 2,
      amenities: [] as string[],
      resource_type: "Room",
      capacity: 4,
      hourly_rate: 0,
      half_day_hours: 6,
      half_day_rate: 0,
      full_day_rate: 0
    };
    if (typeof window !== 'undefined' && isFirstLoad) {
      const saved = sessionStorage.getItem('venues_room_range_form');
      return saved ? JSON.parse(saved) : defaultVal;
    }
    return defaultVal;
  });

  const handleAddCustomAmenityForSingle = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    handleAddCustomAmenity(trimmed);
    if (!resourceForm.amenities?.includes(trimmed)) {
      setResourceForm((prev: any) => ({
        ...prev,
        amenities: [...(prev.amenities || []), trimmed]
      }));
    }
    setNewAmenityInput("");
  };

  const handleAddCustomAmenityForRange = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    handleAddCustomAmenity(trimmed);
    if (!roomRangeForm.amenities?.includes(trimmed)) {
      setRoomRangeForm((prev: any) => ({
        ...prev,
        amenities: [...(prev.amenities || []), trimmed]
      }));
    }
    setNewAmenityInput("");
  };

  const [selectedPropertyForResourcesTab, setSelectedPropertyForResourcesTab] = useState<any>(() => {
    if (typeof window !== 'undefined' && isFirstLoad) {
      const saved = sessionStorage.getItem('venues_selected_property_for_resources_tab');
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });

  const [selectedPropertyForDependenciesTab, setSelectedPropertyForDependenciesTab] = useState<any>(() => {
    if (typeof window !== 'undefined' && isFirstLoad) {
      const saved = sessionStorage.getItem('venues_selected_property_for_dependencies_tab');
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });

  const [selectedPropertyForPricingTab, setSelectedPropertyForPricingTab] = useState<any>(() => {
    if (typeof window !== 'undefined' && isFirstLoad) {
      const saved = sessionStorage.getItem('venues_selected_property_for_pricing_tab');
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });

  const [selectedResourceForPricingTab, setSelectedResourceForPricingTab] = useState<any>(() => {
    if (typeof window !== 'undefined' && isFirstLoad) {
      const saved = sessionStorage.getItem('venues_selected_resource_for_pricing_tab');
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });

  const [pricingModel, setPricingModel] = useState<'hourly' | 'half_day' | 'full_day' | 'custom'>(() => {
    if (typeof window !== 'undefined' && isFirstLoad) {
      const saved = sessionStorage.getItem('venues_pricing_model');
      if (saved && ['hourly', 'half_day', 'full_day', 'custom'].includes(saved)) {
        return saved as 'hourly' | 'half_day' | 'full_day' | 'custom';
      }
    }
    return 'hourly';
  });

  const [customPricings, setCustomPricings] = useState(() => {
    const defaultVal = { hourly_price: 500, min_hours: 2, max_hours: 12, security_deposit: 5000, cleaning_charges: 1000, tax_percent: 18, notes: "", has_security_deposit: true, has_cleaning_charges: true };
    if (typeof window !== 'undefined' && isFirstLoad) {
      const saved = sessionStorage.getItem('venues_custom_pricings');
      return saved ? JSON.parse(saved) : defaultVal;
    }
    return defaultVal;
  });
  
  const [parentResourceDependency, setParentResourceDependency] = useState("");
  const [requiredResourceDependency, setRequiredResourceDependency] = useState("");
  const [dependencyRuleType, setDependencyRuleType] = useState<'parent_child' | 'combination'>('parent_child');
  const [whenMemberBooks, setWhenMemberBooks] = useState("");
  const [requireTheseResources, setRequireTheseResources] = useState("");
  const [globalAmenities, setGlobalAmenities] = useState<any[]>(AMENITIES_LIST);

  const [amenitySearch, setAmenitySearch] = useState(() => {
    if (typeof window !== 'undefined' && isFirstLoad) {
      return sessionStorage.getItem('venues_amenity_search') || "";
    }
    return "";
  });

  const [isAddAmenityOpen, setIsAddAmenityOpen] = useState(false);
  const [newAmenityForm, setNewAmenityForm] = useState({ name: "", status: "Active" });
  
  const [viewingBooking, setViewingBooking] = useState<any>(null);
  const [ledgerSubTab, setLedgerSubTab] = useState<'list' | 'calendar' | 'charts'>(() => {
    if (typeof window !== 'undefined' && isFirstLoad) {
      const saved = sessionStorage.getItem('venues_ledger_sub_tab');
      if (saved && ['list', 'calendar', 'charts'].includes(saved)) {
        return saved as 'list' | 'calendar' | 'charts';
      }
    }
    return 'list';
  });
  const [rejectDialogProperty, setRejectDialogProperty] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [resourceAddMode, setResourceAddMode] = useState<'single' | 'range'>(() => {
    if (typeof window !== 'undefined' && isFirstLoad) {
      const saved = sessionStorage.getItem('venues_resource_add_mode');
      if (saved === 'single' || saved === 'range') return saved;
    }
    return 'single';
  });

  const [resourceSearch, setResourceSearch] = useState(() => {
    if (typeof window !== 'undefined' && isFirstLoad) {
      return sessionStorage.getItem('venues_resource_search') || "";
    }
    return "";
  });

  const [resourceTypeFilter, setResourceTypeFilter] = useState(() => {
    if (typeof window !== 'undefined' && isFirstLoad) {
      return sessionStorage.getItem('venues_resource_type_filter') || "All";
    }
    return "All";
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const normalizePropertyForForm = (property: any) => ({
    ...property,
    photos: Array.isArray(property?.photos) ? property.photos : [],
    uploaded_photos: [],
    latitude: property?.latitude ?? "",
    longitude: property?.longitude ?? "",
  });

  const buildPropertyPayload = (isPublishing = false) => {
    const { uploaded_photos, ...payload } = propertyForm as any;
    let finalStatus = "Draft";
    if (isSuperAdmin) {
      finalStatus = payload.status || "Approved";
    } else if (isPublishing) {
      finalStatus = "Pending Approval";
    } else {
      finalStatus = selectedPropertyForWizard?.status || "Draft";
    }

    const serializedNotes = JSON.stringify({
      addons: addonsList
    });

    return {
      ...payload,
      uploaded_photos,
      status: finalStatus,
      internal_notes: serializedNotes,
      latitude: payload.latitude === "" ? null : payload.latitude,
      longitude: payload.longitude === "" ? null : payload.longitude,
      tax_percentage: payload.tax_percentage,
    };
  };

  // Helper function to reset all property console related session keys
  const resetSessionState = () => {
    const keys = [
      'venues_active_tab',
      'venues_workflow_step',
      'venues_property_form',
      'venues_resource_form',
      'venues_pricing_form',
      'venues_custom_pricings',
      'venues_room_range_form',
      'venues_booking_tab_filter',
      'venues_booking_search',
      'venues_booking_date_filter',
      'venues_resource_search',
      'venues_resource_type_filter',
      'venues_amenity_search',
      'venues_wizard_prop',
      'venues_selected_resource_for_pricing',
      'venues_selected_property_for_details',
      'venues_is_details_open',
      'venues_selected_property_for_resources_tab',
      'venues_selected_property_for_dependencies_tab',
      'venues_selected_property_for_pricing_tab',
      'venues_selected_resource_for_pricing_tab',
      'venues_pricing_model',
      'venues_scroll_y',
      'venues_ledger_sub_tab',
      'venues_resource_add_mode'
    ];
    keys.forEach(k => sessionStorage.removeItem(k));
  };

  // Sync state with sessionStorage or reset on fresh visit from another route
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!isFirstLoad) {
        resetSessionState();
        
        _setActiveTab('overview');
        _setWorkflowStep(1);
        setPropertyForm({
          name: "", property_type: "Community Hall", status: "Pending Approval", ownership: "Community Owned",
          address: "", city: "", state: "", pincode: "", country: "India", google_map_url: "",
          latitude: "21.1702", longitude: "72.8311",
          contact_person_name: "", contact_phone: "", alternate_phone: "", contact_email: "",
          description: "", rules: "",
          photos: [] as string[],
          uploaded_photos: [] as File[],
          cancellation_allowed: true, cancellation_hours: 24, refund_percentage: 100, security_deposit: 0,
          approval_required: true, manual_payment_allowed: true,
          terms_conditions: "", internal_notes: "",
          rejection_reason: "",
          amenities: [] as string[]
        });
        setResourceForm({
          name: "", resource_type: "Hall", capacity: 500, description: "",
          booking_type: "Full Day", status: "Active",
          hourly_rate: 0, half_day_rate: 0, full_day_rate: 0, security_deposit: 0,
          min_booking_duration_hours: 1, max_booking_duration_hours: 24,
          setup_buffer_hours: 0, cleanup_buffer_hours: 0,
          isBulk: false, prefix: "Room", range_start: 1, range_end: 10,
          dependencies: [] as number[]
        });
        setPricingForm({
          weekday_price: "5000",
          weekend_price: "7000",
          festival_price: "10000",
          seasonal_price: "8000",
          member_verified: "5000",
          member_non: "7000",
          member_vip: "4000",
          member_committee: "0"
        });
        setCustomPricings({ hourly_price: 500, min_hours: 2, max_hours: 12, security_deposit: 5000, cleaning_charges: 1000, tax_percent: 18, notes: "", has_security_deposit: true, has_cleaning_charges: true });
        setRoomRangeForm({ resource_name: "Standard Room", prefix: "Room", start_num: 1, end_num: 50, digits: 2, amenities: [] as string[] });
        setBookingTabFilter('All');
        setBookingSearch('');
        setBookingDateFilter('All Dates');
        setResourceSearch('');
        setResourceTypeFilter('All');
        setAmenitySearch('');
        setSelectedPropertyForWizardState(null);
        setSelectedResourceForPricing(null);
        setSelectedPropertyForDetails(null);
        setIsDetailsOpen(false);
        setSelectedPropertyForResourcesTab(null);
        setSelectedPropertyForDependenciesTab(null);
        setSelectedPropertyForPricingTab(null);
        setSelectedResourceForPricingTab(null);
        setPricingModel('hourly');
        setLedgerSubTab('list');
        setResourceAddMode('single');
      } else {
        isFirstLoad = false;
      }
    }
  }, []);

  // Sync remaining state variables to sessionStorage on change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('venues_ledger_sub_tab', ledgerSubTab);
    }
  }, [ledgerSubTab]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('venues_resource_add_mode', resourceAddMode);
    }
  }, [resourceAddMode]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('venues_resource_form', JSON.stringify(resourceForm));
    }
  }, [resourceForm]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('venues_pricing_form', JSON.stringify(pricingForm));
    }
  }, [pricingForm]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('venues_custom_pricings', JSON.stringify(customPricings));
    }
  }, [customPricings]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('venues_room_range_form', JSON.stringify(roomRangeForm));
    }
  }, [roomRangeForm]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('venues_booking_tab_filter', bookingTabFilter);
    }
  }, [bookingTabFilter]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('venues_booking_search', bookingSearch);
    }
  }, [bookingSearch]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('venues_booking_date_filter', bookingDateFilter);
    }
  }, [bookingDateFilter]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('venues_resource_search', resourceSearch);
    }
  }, [resourceSearch]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('venues_resource_type_filter', resourceTypeFilter);
    }
  }, [resourceTypeFilter]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('venues_amenity_search', amenitySearch);
    }
  }, [amenitySearch]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('venues_selected_resource_for_pricing', JSON.stringify(selectedResourceForPricing));
    }
  }, [selectedResourceForPricing]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('venues_selected_property_for_details', JSON.stringify(selectedPropertyForDetails));
    }
  }, [selectedPropertyForDetails]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('venues_is_details_open', JSON.stringify(isDetailsOpen));
    }
  }, [isDetailsOpen]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('venues_selected_property_for_resources_tab', JSON.stringify(selectedPropertyForResourcesTab));
    }
  }, [selectedPropertyForResourcesTab]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('venues_selected_property_for_dependencies_tab', JSON.stringify(selectedPropertyForDependenciesTab));
    }
  }, [selectedPropertyForDependenciesTab]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('venues_selected_property_for_pricing_tab', JSON.stringify(selectedPropertyForPricingTab));
    }
  }, [selectedPropertyForPricingTab]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('venues_selected_resource_for_pricing_tab', JSON.stringify(selectedResourceForPricingTab));
    }
  }, [selectedResourceForPricingTab]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('venues_pricing_model', pricingModel);
    }
  }, [pricingModel]);

  // Scroll Position Persistence & Recovery
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleScroll = () => {
        sessionStorage.setItem('venues_scroll_y', String(window.scrollY));
      };
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && !loading) {
      const scrollY = sessionStorage.getItem('venues_scroll_y');
      if (scrollY) {
        const timer = setTimeout(() => {
          window.scrollTo(0, parseInt(scrollY, 10));
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [loading, activeTab, workflowStep]);

  const fetchData = async () => {
    try {
      const params = user?.communityId ? { communityId: user.communityId } : {};
      const [propsRes, resRes, priceRes, booksRes, inspectRes, membersRes] = await Promise.all([
        api.getBookingProperties(),
        api.getPropertyResources(),
        api.getResourcePricing(),
        api.getVenueBookings(),
        api.getBookingInspections(),
        api.getMembers(params).catch(() => [])
      ]);
      setProperties(propsRes || []);
      const parsedResources = (resRes || []).map((r: any) => {
        let parsedAmenities: string[] = [];
        if (Array.isArray(r.amenities)) {
          parsedAmenities = r.amenities;
        } else if (typeof r.amenities === 'string') {
          try {
            const parsed = JSON.parse(r.amenities);
            if (Array.isArray(parsed)) {
              parsedAmenities = parsed;
            } else {
              parsedAmenities = r.amenities.split(',').map((s: string) => s.trim()).filter(Boolean);
            }
          } catch (e) {
            parsedAmenities = r.amenities.split(',').map((s: string) => s.trim()).filter(Boolean);
          }
        }
        return {
          ...r,
          amenities: parsedAmenities
        };
      });
      setResources(parsedResources);

      // Extract unique amenities to keep customAmenities list synchronized
      const uniqueAmenities = new Set<string>();
      parsedResources.forEach((r: any) => {
        r.amenities.forEach((a: string) => {
          if (a && typeof a === 'string') {
            uniqueAmenities.add(a.trim());
          }
        });
      });
      setCustomAmenities((prev) => {
        const merged = new Set([...prev, ...uniqueAmenities]);
        const arr = Array.from(merged);
        if (typeof window !== 'undefined') {
          localStorage.setItem('venues_custom_amenities', JSON.stringify(arr));
        }
        return arr;
      });
      setPricings(priceRes || []);
      setBookings(booksRes || []);
      setInspections(inspectRes || []);
      setMembers(membersRes || []);

      try {
        const waitlistRes = await api.getBookingWaitingList();
        setWaitingList(waitlistRes || []);
      } catch (e) {
        console.log("No waiting list endpoint available yet", e);
      }

      try {
        const deps = await api.getResourceDependencies();
        const mappedDeps = (deps || []).map((d: any) => ({
          ...d,
          parent_id: d.resource,
          required_id: d.requires,
          parent_resource_name: parsedResources.find((r:any) => r.id === d.resource)?.name,
          required_resource_name: parsedResources.find((r:any) => r.id === d.requires)?.name,
        }));
        setDependenciesList(mappedDeps);
      } catch (e) {
        console.log("No resource dependencies endpoint available yet", e);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handlePublishProperty = async () => {
    try {
      if (selectedPropertyForWizard) {
        const updated = await api.updateBookingProperty(selectedPropertyForWizard.id, buildPropertyPayload(true));
        setSelectedPropertyForWizard(updated);
        toast.success(isSuperAdmin ? "Property published and approved!" : "Property updated and sent for Super Admin approval!");
      } else {
        const created = await api.createBookingProperty(buildPropertyPayload(true));
        setSelectedPropertyForWizard(created);
        toast.success(isSuperAdmin ? "Property published and approved!" : "Property created and sent for Super Admin approval!");
      }
      await fetchData();
      setActiveTab('overview');
    } catch (error: any) {
      toast.error(error.message || "Failed to publish property");
    }
  };

  const handleNextStep = async () => {
    if (workflowStep === 1) {
      try {
        if (selectedPropertyForWizard) {
          const updated = await api.updateBookingProperty(selectedPropertyForWizard.id, buildPropertyPayload(false));
          setSelectedPropertyForWizard(updated);
          toast.success("Property general details updated.");
        } else {
          const created = await api.createBookingProperty(buildPropertyPayload(false));
          setSelectedPropertyForWizard(created);
          toast.success(isSuperAdmin ? "Property draft created." : "Property draft created. Please complete the remaining steps to submit for approval.");
        }
        setWorkflowStep(2);
      } catch (error: any) {
        console.error("Error saving property details:", error);
        toast.error(error.message || "Failed to save property details");
      }
    } else if (workflowStep === 2) {
      setWorkflowStep(3);
    } else if (workflowStep === 3) {
      setWorkflowStep(4);
    } else if (workflowStep === 4) {
      setWorkflowStep(5);
    } else if (workflowStep === 5) {
      setWorkflowStep(6);
    }
  };

  // Load existing prices for a resource into the form
  const loadPricingForResource = (resourceId: number | string) => {
    const resourcePricings = pricings.filter((p: any) => String(p.resource) === String(resourceId));
    const get = (seasonality: string, member_type: string) => {
      const match = resourcePricings.find((p: any) => p.seasonality === seasonality && p.member_type === member_type);
      return match ? String(match.price) : "";
    };
    setPricingForm({
      weekday_price:    get("Weekdays", "Non Member"),
      weekend_price:    get("Weekends", "Non Member"),
      festival_price:   get("Festivals", "Non Member"),
      seasonal_price:   get("Seasonal", "Non Member"),
      member_verified:  get("Standard", "Verified Member"),
      member_non:       get("Standard", "Non Member"),
      member_vip:       get("Standard", "VIP"),
      member_committee: get("Standard", "Committee"),
    });
  };

  const handleSavePricing = async () => {
    if (!selectedResourceForPricing) {
      toast.error("Please select a resource first.");
      return;
    }
    try {
      const entries = [
        { seasonality: "Weekdays",  member_type: "Non Member",      price: pricingForm.weekday_price },
        { seasonality: "Weekends",  member_type: "Non Member",      price: pricingForm.weekend_price },
        { seasonality: "Festivals", member_type: "Non Member",      price: pricingForm.festival_price },
        { seasonality: "Seasonal",  member_type: "Non Member",      price: pricingForm.seasonal_price },
        { seasonality: "Standard",  member_type: "Verified Member", price: pricingForm.member_verified },
        { seasonality: "Standard",  member_type: "Non Member",      price: pricingForm.member_non },
        { seasonality: "Standard",  member_type: "VIP",             price: pricingForm.member_vip },
        { seasonality: "Standard",  member_type: "Committee",       price: pricingForm.member_committee },
      ];
      await Promise.all(entries.map(entry => {
        const payload = { resource: selectedResourceForPricing.id, member_type: entry.member_type, seasonality: entry.seasonality, price: parseFloat(entry.price) || 0 };
        const existing = pricings.find((p: any) => String(p.resource) === String(selectedResourceForPricing.id) && p.member_type === entry.member_type && p.seasonality === entry.seasonality);
        return existing ? api.updateResourcePricing(existing.id, payload) : api.createResourcePricing(payload);
      }));
      toast.success(`Pricing saved for ${selectedResourceForPricing.name}!`);
      await fetchData();
    } catch (error: any) {
      console.error("Error saving pricing:", error);
      toast.error(error.message || "Failed to save pricing");
    }
  };

  const toggleAmenity = (amenityId: string) => {
    setPropertyForm((prev: any) => ({
      ...prev,
      amenities: prev.amenities.includes(amenityId)
        ? prev.amenities.filter((id: string) => id !== amenityId)
        : [...prev.amenities, amenityId]
    }));
  };

  const handleAddPhotosClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setPropertyForm((prev: any) => ({
        ...prev,
        uploaded_photos: [...prev.uploaded_photos, ...filesArray]
      }));
      toast.success(`${filesArray.length} file(s) selected for upload`);
    }
  };

  const removeUploadedPhoto = (index: number) => {
    setPropertyForm((prev: any) => ({
      ...prev,
      uploaded_photos: prev.uploaded_photos.filter((_: any, i: number) => i !== index)
    }));
  };

  const removeExistingPhoto = (photoPath: string) => {
    setPropertyForm((prev: any) => ({
      ...prev,
      photos: prev.photos.filter((p: any) => p !== photoPath)
    }));
  };

  const startNewPropertyFlow = () => {
    setSelectedPropertyForWizard(null);
    setPropertyForm({
      name: "", property_type: "Community Hall", status: "Pending Approval", ownership: "Community Owned",
      address: "", city: "", state: "", pincode: "", country: "India", google_map_url: "",
      latitude: "21.1702", longitude: "72.8311",
      contact_person_name: "", contact_phone: "", alternate_phone: "", contact_email: "",
      description: "", rules: "",
      photos: [] as string[],
      uploaded_photos: [] as File[],
      cancellation_allowed: true, cancellation_hours: 24, refund_percentage: 100, security_deposit: 0,
      approval_required: true, manual_payment_allowed: true,
      terms_conditions: "", internal_notes: "",
      rejection_reason: "",
      amenities: [] as string[]
    });
    setWorkflowStep(1);
    setActiveTab('add-property');
  };

  const formatCurrency = (val: any) => {
    const num = parseFloat(val);
    return isNaN(num) ? "₹0" : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
  };

  // Stats Calculations
  const displayedProperties = isSuperAdmin
    ? properties.filter((p: any) => p.status === "Pending Approval")
    : properties;
  const totalPropertiesVal = displayedProperties.length;
  
  const activeBookings = bookings.filter(b => ['Pending Approval', 'Approved', 'Payment Submitted', 'Confirmed'].includes(b.status));
  const activeBookingsCount = activeBookings.length;
  
  const totalRevenueSum = bookings
    .filter(b => ['Confirmed', 'Completed', 'Paid'].includes(b.status) || b.payment_status === 'Paid')
    .reduce((sum, b) => sum + parseFloat(b.total_amount || 0), 0);

  const occupancyRate = resources.length > 0
    ? Math.min(100, Math.round((new Set(bookings.filter(b => ['Confirmed', 'Approved', 'Paid'].includes(b.status)).map(b => b.resource)).size / resources.length) * 100))
    : 0;

  const totalMembersVal = members.length;

  // Custom Line Chart Coordinates Helper for Canvas SVG
  const calculateCumulativeRevenue = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const currentMonthBookings = bookings.filter(b => {
      const bDate = new Date(b.start_date);
      return bDate.getMonth() === currentMonth &&
        bDate.getFullYear() === currentYear &&
        ['Confirmed', 'Completed', 'Paid'].includes(b.status);
    });

    const revenuePoints = [0, 0, 0, 0, 0];

    currentMonthBookings.forEach(b => {
      const day = new Date(b.start_date).getDate();
      const amt = parseFloat(b.total_amount || 0);
      if (day <= 7) revenuePoints[0] += amt;
      if (day <= 14) revenuePoints[1] += amt;
      if (day <= 21) revenuePoints[2] += amt;
      if (day <= 28) revenuePoints[3] += amt;
      if (day > 28) revenuePoints[4] += amt;
    });

    for (let i = 1; i < revenuePoints.length; i++) {
      revenuePoints[i] += revenuePoints[i - 1];
    }

    return revenuePoints;
  };

  const getDayBookingStatus = (dayNum: number) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const dateStr = `${year}-${month}-${String(dayNum).padStart(2, '0')}`;

    const dayBookings = bookings.filter(b => b.start_date === dateStr);
    if (dayBookings.length === 0) return 'available';

    if (dayBookings.some(b => ['Confirmed', 'Paid'].includes(b.status))) return 'booked';
    if (dayBookings.some(b => b.status === 'Pending Approval' || b.payment_status === 'Payment Submitted')) return 'pending';
    if (dayBookings.some(b => b.status === 'Maintenance')) return 'maintenance';

    return 'available';
  };

  const revPoints = calculateCumulativeRevenue();
  const maxRev = Math.max(50000, revPoints[4]);
  const getYCoord = (val: number) => {
    const pct = val / maxRev;
    return 120 - (pct * 90); // Scale coordinates inside 120px height canvas
  };

  const y0 = getYCoord(revPoints[0]);
  const y1 = getYCoord(revPoints[1]);
  const y2 = getYCoord(revPoints[2]);
  const y3 = getYCoord(revPoints[3]);
  const y4 = getYCoord(revPoints[4]);

  // ==================== STEP RENDERING LOGIC ====================

  // Step 1: Add Property Details & Interactive Media Gallery
  const renderStep1 = () => {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }} 
        exit={{ opacity: 0 }}
        className="space-y-6"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info Fields */}
          <div className="lg:col-span-2 space-y-6 bg-card border border-border/40 rounded-3xl p-6 shadow-sm">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <span className="h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs">01</span>
                General Properties Information
              </h3>
              <p className="text-xs text-warm-muted mt-1">Provide overall descriptive information and community ownership parameters.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Property Name *</Label>
                <Input 
                  value={propertyForm.name} 
                  onChange={e => setPropertyForm({ ...propertyForm, name: e.target.value })} 
                  placeholder="e.g. Ahir Samaj Community Hall" 
                  className="rounded-xl border-border/70 focus:border-primary focus:ring-primary/20 h-10" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Property Type *</Label>
                <select 
                  className="flex h-10 w-full rounded-xl border border-border/70 bg-card px-3 py-2 text-xs font-semibold outline-none text-warm-muted focus:border-primary" 
                  value={propertyForm.property_type} 
                  onChange={e => setPropertyForm({ ...propertyForm, property_type: e.target.value })}
                >
                  {PROPERTY_TYPE_OPTIONS.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Community Owner *</Label>
                <Input 
                  value={propertyForm.community_name || ""} 
                  onChange={e => setPropertyForm({ ...propertyForm, community_name: e.target.value })} 
                  placeholder="e.g. we Are United" 
                  className="rounded-xl border-border/70 h-10" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Status</Label>
                <div className="flex items-center h-10 px-4 rounded-xl border border-border/40 bg-sand/10 text-xs font-bold text-foreground">
                  <span className={`w-2 h-2 rounded-full mr-2 shrink-0 ${
                    propertyForm.status === 'Approved' || propertyForm.status === 'Active'
                      ? 'bg-green-500'
                      : propertyForm.status === 'Pending Approval'
                        ? 'bg-amber-500'
                        : propertyForm.status === 'Draft'
                          ? 'bg-gray-400'
                          : 'bg-red-500'
                  }`} />
                  {propertyForm.status || 'Draft'}
                  <span className="text-[10px] text-warm-muted font-normal ml-auto italic">(Managed automatically)</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea 
                value={propertyForm.description} 
                onChange={e => setPropertyForm({ ...propertyForm, description: e.target.value })} 
                placeholder="Describe your spacious community venue, perfect locations, and other features..." 
                className="rounded-xl border-border/70 min-h-24 focus:border-primary" 
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Rules & Regulations</Label>
              <Textarea 
                value={propertyForm.rules} 
                onChange={e => setPropertyForm({ ...propertyForm, rules: e.target.value })} 
                placeholder="No alcohol allowed, clean up kitchen after events, standard timings, etc." 
                className="rounded-xl border-border/70 min-h-20" 
              />
            </div>
          </div>

          {/* Media & Location Side Column */}
          <div className="space-y-6">
            {/* Address & Coordinates */}
            <div className="bg-card border border-border/40 rounded-3xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <MapPin className="h-4.5 w-4.5 text-primary" /> Location Details
                </h3>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-warm-muted uppercase tracking-wider">Address *</Label>
                  <Input 
                    value={propertyForm.address} 
                    onChange={e => setPropertyForm({ ...propertyForm, address: e.target.value })} 
                    placeholder="Ring Road, Surat, Gujarat" 
                    className="rounded-xl border-border/70 h-9" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-warm-muted uppercase tracking-wider">City *</Label>
                    <Input 
                      value={propertyForm.city} 
                      onChange={e => setPropertyForm({ ...propertyForm, city: e.target.value })} 
                      placeholder="Surat" 
                      className="rounded-xl border-border/70 h-9" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-warm-muted uppercase tracking-wider">State *</Label>
                    <Input 
                      value={propertyForm.state} 
                      onChange={e => setPropertyForm({ ...propertyForm, state: e.target.value })} 
                      placeholder="Gujarat" 
                      className="rounded-xl border-border/70 h-9" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-warm-muted uppercase tracking-wider">Pin Code *</Label>
                    <Input 
                      value={propertyForm.pincode} 
                      onChange={e => setPropertyForm({ ...propertyForm, pincode: e.target.value })} 
                      placeholder="395002" 
                      className="rounded-xl border-border/70 h-9" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-warm-muted uppercase tracking-wider">Google Map Link</Label>
                    <Input 
                      value={propertyForm.google_map_url} 
                      onChange={e => setPropertyForm({ ...propertyForm, google_map_url: e.target.value })} 
                      placeholder="https://maps.google.com/..." 
                      className="rounded-xl border-border/70 h-9" 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Premium Photos Upload Zone */}
            <div className="bg-card border border-border/40 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <ImageIcon className="h-4.5 w-4.5 text-primary" /> Photos Gallery
                </h3>
                <Badge className="bg-sand text-warm-muted font-bold text-xs uppercase border border-border/40">
                  {propertyForm.photos.length + propertyForm.uploaded_photos.length} Selected
                </Badge>
              </div>

              {/* Upload Target Area */}
              <div 
                onClick={handleAddPhotosClick}
                className="border-2 border-dashed border-border/60 rounded-2xl p-6 text-center hover:bg-sand/10 transition cursor-pointer flex flex-col items-center justify-center gap-2 bg-sand/5"
              >
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Upload className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-foreground">Click to browse or drop photos</p>
                  <p className="text-xs text-warm-muted">Support JPEG, PNG, WebP up to 10MB each</p>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  multiple 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>

              {/* Upload Previews */}
              {(propertyForm.photos.length > 0 || propertyForm.uploaded_photos.length > 0) && (
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                  {/* Existing DB Photos */}
                  {propertyForm.photos.map((photo: string, i: number) => (
                    <div key={`exist-${i}`} className="aspect-square rounded-xl overflow-hidden border border-border/30 relative group bg-sand/20">
                      <img src={getImageUrl(photo)} alt="" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => removeExistingPhoto(photo)}
                        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {/* Newly Uploaded Files */}
                  {propertyForm.uploaded_photos.map((file: File, i: number) => {
                    const localUrl = URL.createObjectURL(file);
                    return (
                      <div key={`new-${i}`} className="aspect-square rounded-xl overflow-hidden border border-border/30 relative group bg-sand/20">
                        <img src={localUrl} alt="" className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={() => removeUploadedPhoto(i)}
                          className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Policies & Contact Block */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border/40 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wide">
              <ShieldCheck className="h-4.5 w-4.5 text-primary" /> Booking Rules & Policies
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 rounded-2xl border border-border/30 bg-sand/5">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">Require Approval</p>
                  <p className="text-xs text-warm-muted">Verify booking details first</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={propertyForm.approval_required} 
                  onChange={e => setPropertyForm({ ...propertyForm, approval_required: e.target.checked })} 
                  className="h-4 w-4 rounded text-primary focus:ring-primary" 
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl border border-border/30 bg-sand/5">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">Allow Manual Payments</p>
                  <p className="text-xs text-warm-muted">Bank transfers or cash</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={propertyForm.manual_payment_allowed} 
                  onChange={e => setPropertyForm({ ...propertyForm, manual_payment_allowed: e.target.checked })} 
                  className="h-4 w-4 rounded text-primary focus:ring-primary" 
                />
              </div>

              <div className="sm:col-span-2 space-y-3 p-3 rounded-2xl border border-border/30 bg-sand/5">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground">Allow Cancellation</p>
                    <p className="text-xs text-warm-muted">Permit refund rules for cancellations</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={propertyForm.cancellation_allowed} 
                    onChange={e => setPropertyForm({ ...propertyForm, cancellation_allowed: e.target.checked })} 
                    className="h-4 w-4 rounded text-primary" 
                  />
                </div>

                {propertyForm.cancellation_allowed && (
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/20">
                    <div className="space-y-1">
                      <Label className="text-xs text-warm-muted uppercase font-bold">Cancellation Window (Hours)</Label>
                      <Input 
                        type="number" 
                        value={propertyForm.cancellation_hours} 
                        onChange={e => setPropertyForm({ ...propertyForm, cancellation_hours: parseInt(e.target.value) || 24 })} 
                        className="h-8 rounded-lg text-xs" 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-warm-muted uppercase font-bold">Refund Percentage (%)</Label>
                      <Input 
                        type="number" 
                        value={propertyForm.refund_percentage} 
                        onChange={e => setPropertyForm({ ...propertyForm, refund_percentage: parseInt(e.target.value) || 100 })} 
                        className="h-8 rounded-lg text-xs" 
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-card border border-border/40 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wide">
              <User className="h-4.5 w-4.5 text-primary" /> Contact & Alternates
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Contact Person Name *</Label>
                <Input 
                  value={propertyForm.contact_person_name} 
                  onChange={e => setPropertyForm({ ...propertyForm, contact_person_name: e.target.value })} 
                  placeholder="e.g. Ramesh Patel" 
                  className="rounded-xl border-border/70 h-10" 
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Primary Phone *</Label>
                <Input 
                  value={propertyForm.contact_phone} 
                  onChange={e => setPropertyForm({ ...propertyForm, contact_phone: e.target.value })} 
                  placeholder="+91 9898012345" 
                  className="rounded-xl border-border/70 h-10" 
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Alternate Phone</Label>
                <Input 
                  value={propertyForm.alternate_phone} 
                  onChange={e => setPropertyForm({ ...propertyForm, alternate_phone: e.target.value })} 
                  placeholder="+91 9090901234" 
                  className="rounded-xl border-border/70 h-10" 
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Email Address</Label>
                <Input 
                  value={propertyForm.contact_email} 
                  onChange={e => setPropertyForm({ ...propertyForm, contact_email: e.target.value })} 
                  placeholder="ramesh@weareunited.in" 
                  className="rounded-xl border-border/70 h-10" 
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Terms & Conditions</Label>
              <Textarea 
                value={propertyForm.terms_conditions} 
                onChange={e => setPropertyForm({ ...propertyForm, terms_conditions: e.target.value })} 
                placeholder="Provide community specific conditions..." 
                className="rounded-xl border-border/70 min-h-16" 
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={startNewPropertyFlow} className="rounded-xl font-bold text-xs h-10 px-5">
            Reset Form
          </Button>
          <Button onClick={handleNextStep} className="bg-primary hover:bg-primary/95 text-white font-bold text-xs h-10 px-6 rounded-xl shadow-warm flex items-center gap-1">
            Save & Next Step <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    );
  };

  // Step 2: Add Resources (Airbnb/Booking Extranet Layout)
  const renderStep2 = () => {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="w-full space-y-6"
      >
        <Card className="border border-border/40 shadow-sm rounded-3xl bg-card overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary/8 to-primary/3 border-b border-border/30 pb-5">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] bg-primary text-white font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg shadow-sm">Step 2 of 12</span>
                <CardTitle className="text-2xl font-black mt-2.5 text-foreground tracking-tight">Resource Studio</CardTitle>
                <CardDescription className="text-xs text-warm-muted mt-1">Add rooms, halls, or spaces to <b className="text-foreground">{selectedPropertyForWizard?.name || "the Property"}</b></CardDescription>
              </div>
              <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-sm">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6 text-xs font-semibold">
            {/* Property selected alert */}
            <div className="flex items-center gap-3 bg-primary/5 border border-primary/10 p-3.5 rounded-2xl">
              <Building2 className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="font-bold text-foreground text-xs">Currently Configured Property</p>
                <p className="text-xs text-warm-muted mt-0.5">{selectedPropertyForWizard?.name} ({selectedPropertyForWizard?.city})</p>
              </div>
            </div>

            {/* Toggle Creation Type */}
            <div className="space-y-4">
              <Label className="text-xs font-bold text-foreground">Studio Generation Mode</Label>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'single', label: 'Single Unit', desc: 'Create one hall, kitchen or specific resource' },
                  { id: 'range', label: 'Add Bulk Resources', desc: 'Generate multiple resources (e.g. Rooms 101-150)' }
                ].map(mode => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setResourceAddMode(mode.id as any)}
                    className={`p-4 rounded-2xl border text-left flex flex-col gap-1.5 transition-all ${
                      resourceAddMode === mode.id 
                        ? 'border-primary bg-primary/5 text-primary shadow-sm ring-2 ring-primary/15' 
                        : 'border-border/60 hover:bg-sand/20 text-warm-muted'
                    }`}
                  >
                    <span className="font-bold text-sm text-foreground">{mode.label}</span>
                    <span className="text-xs font-medium leading-normal">{mode.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Generation details form based on selected mode */}
            {resourceAddMode === 'range' ? (
              <div className="space-y-5 p-5 border border-border/40 rounded-2xl bg-sand/5">
                <h4 className="font-bold text-foreground text-xs uppercase tracking-wider border-b pb-2">Add Bulk Resources (Room Range Generator)</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Base Resource Name *</Label>
                    <Input 
                      value={roomRangeForm.resource_name} 
                      onChange={e => setRoomRangeForm({ ...roomRangeForm, resource_name: e.target.value })} 
                      placeholder="e.g. Standard Guest Room"
                      className="rounded-xl border-border/70 h-10" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Resource Prefix</Label>
                    <Input 
                      value={roomRangeForm.prefix} 
                      onChange={e => setRoomRangeForm({ ...roomRangeForm, prefix: e.target.value })} 
                      placeholder="e.g. Room"
                      className="rounded-xl border-border/70 h-10" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Range Start Number *</Label>
                    <Input 
                      type="number" 
                      value={roomRangeForm.start_num} 
                      onChange={e => setRoomRangeForm({ ...roomRangeForm, start_num: parseInt(e.target.value) || 1 })}
                      className="rounded-xl border-border/70 h-10 font-mono" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Range End Number *</Label>
                    <Input 
                      type="number" 
                      value={roomRangeForm.end_num} 
                      onChange={e => setRoomRangeForm({ ...roomRangeForm, end_num: parseInt(e.target.value) || 1 })}
                      className="rounded-xl border-border/70 h-10 font-mono" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Digits Padding (Length)</Label>
                    <Input 
                      type="number" 
                      value={roomRangeForm.digits} 
                      onChange={e => setRoomRangeForm({ ...roomRangeForm, digits: parseInt(e.target.value) || 2 })}
                      className="rounded-xl border-border/70 h-10 font-mono" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Capacity (People) *</Label>
                    <Input 
                      type="number" 
                      value={roomRangeForm.capacity} 
                      onChange={e => setRoomRangeForm({ ...roomRangeForm, capacity: parseInt(e.target.value) || 4 })} 
                      className="rounded-xl border-border/70 h-10 font-mono" 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Hourly Rate (₹) *</Label>
                    <Input 
                      type="number" 
                      value={roomRangeForm.hourly_rate} 
                      onChange={e => setRoomRangeForm({ ...roomRangeForm, hourly_rate: parseFloat(e.target.value) || 0 })} 
                      placeholder="e.g. 100" 
                      className="rounded-xl border-border/70 h-10 font-mono" 
                    />
                  </div>

                  {/* Half-Day Rate (Hours & Price) */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Half-Day Hours</Label>
                      <Input 
                        type="number" 
                        value={roomRangeForm.half_day_hours} 
                        onChange={e => setRoomRangeForm({ ...roomRangeForm, half_day_hours: parseInt(e.target.value) || 6 })} 
                        className="rounded-xl border-border/70 h-10 font-mono" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Half-Day Price (₹)</Label>
                      <Input 
                        type="number" 
                        value={roomRangeForm.half_day_rate} 
                        onChange={e => setRoomRangeForm({ ...roomRangeForm, half_day_rate: parseFloat(e.target.value) || 0 })} 
                        placeholder="e.g. 500" 
                        className="rounded-xl border-border/70 h-10 font-mono" 
                      />
                    </div>
                  </div>

                  {/* Full-Day Rate (Static Hours & Price) */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Full-Day Hours</Label>
                      <Input 
                        value="24 Hours" 
                        disabled 
                        className="rounded-xl border-border/70 h-10 font-mono bg-sand/20 cursor-not-allowed" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Full-Day Price (₹) *</Label>
                      <Input 
                        type="number" 
                        value={roomRangeForm.full_day_rate} 
                        onChange={e => setRoomRangeForm({ ...roomRangeForm, full_day_rate: parseFloat(e.target.value) || 0 })} 
                        placeholder="e.g. 1000" 
                        className="rounded-xl border-border/70 h-10 font-mono" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2 flex flex-col justify-end">
                    <div className="p-3 bg-primary/5 rounded-xl border border-primary/15 text-center">
                      <span className="text-[10px] text-warm-muted uppercase tracking-wider block font-bold">Total Resources to Generate</span>
                      <span className="text-xl font-black text-primary font-mono mt-0.5">
                        {Math.max(0, roomRangeForm.end_num - roomRangeForm.start_num + 1)} Units
                      </span>
                    </div>
                  </div>
                </div>

                {/* Amenity Picker in range builder */}
                <div className="space-y-3 pt-3 border-t border-border/30">
                  <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                    <span>Pre-assigned Amenities</span>
                    <span className="text-[10px] text-warm-muted font-normal">Click to toggle selection</span>
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {customAmenities.map(amenity => {
                      const isSelected = roomRangeForm.amenities.includes(amenity);
                      return (
                        <button
                          key={amenity}
                          type="button"
                          onClick={() => {
                            setRoomRangeForm((prev: any) => ({
                              ...prev,
                              amenities: isSelected 
                                ? prev.amenities.filter((a: string) => a !== amenity) 
                                : [...prev.amenities, amenity]
                            }));
                          }}
                          className={`flex items-center gap-2 border p-2.5 rounded-xl transition cursor-pointer text-left ${
                            isSelected 
                              ? 'border-primary bg-primary/5 text-primary shadow-sm' 
                              : 'border-border/60 hover:bg-sand/30 text-warm-muted'
                          }`}
                        >
                          <div className={`h-4 w-4 rounded-md border flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-primary border-primary text-white' : 'border-border/70'
                          }`}>
                            {isSelected && <Check className="h-3 w-3" />}
                          </div>
                          <span className="text-xs font-semibold">{amenity}</span>
                        </button>
                      );
                    })}
                  </div>
                  {/* Dynamic Amenities creator mini-form */}
                  <div className="flex gap-2 max-w-md mt-2">
                    <Input 
                      placeholder="Add custom amenity label..." 
                      value={newAmenityInput} 
                      onChange={e => setNewAmenityInput(e.target.value)} 
                      className="rounded-xl border-border/70 h-9 text-xs" 
                    />
                    <Button 
                      type="button" 
                      onClick={() => handleAddCustomAmenityForRange(newAmenityInput)}
                      className="h-9 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs animate-fade-in"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 p-5 border border-border/30 rounded-2xl bg-gradient-to-b from-sand/10 to-transparent">
                <div className="flex items-center gap-2 border-b border-border/20 pb-3">
                  <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <h4 className="font-black text-sm text-foreground tracking-tight">Single Resource Details</h4>
                </div>

                {/* Row 1: Name + Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-warm-muted">Resource Name <span className="text-red-500">*</span></Label>
                    <Input value={resourceForm.name} onChange={e => setResourceForm({ ...resourceForm, name: e.target.value })} placeholder="e.g. Banquet Hall A" className="rounded-xl border-border/60 h-10 font-semibold bg-card focus:border-primary transition-colors" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-warm-muted">Resource Type <span className="text-red-500">*</span></Label>
                    <select className="flex h-10 w-full rounded-xl border border-border/60 bg-card px-3 py-2 text-xs font-semibold outline-none text-foreground focus:border-primary transition-colors" value={resourceForm.resource_type} onChange={e => setResourceForm({ ...resourceForm, resource_type: e.target.value })}>
                      {RESOURCE_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                </div>

                {/* Capacity */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-warm-muted">Capacity (People)</Label>
                    <Input type="number" value={resourceForm.capacity || ''} placeholder="e.g. 200" onChange={e => setResourceForm({ ...resourceForm, capacity: parseInt(e.target.value) || 0 })} className="rounded-xl border-border/60 h-10 font-mono bg-card focus:border-primary transition-colors" />
                  </div>
                </div>

                {/* Pricing Cards */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-warm-muted">Pricing Configuration</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                    {/* Hourly */}
                    <div className="p-4 rounded-2xl border border-border/40 bg-card hover:border-primary/40 transition-colors space-y-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                          <span className="text-[10px] font-black text-blue-600">1H</span>
                        </div>
                        <span className="text-xs font-bold text-foreground">Hourly Rate</span>
                      </div>
                      <Input type="number" value={resourceForm.hourly_rate || ''} placeholder="₹0" onChange={e => setResourceForm({ ...resourceForm, hourly_rate: parseFloat(e.target.value) || 0 })} className="rounded-xl border-border/50 h-9 font-mono text-sm focus:border-blue-400" />
                      <p className="text-[10px] text-warm-muted">Price per hour</p>
                    </div>

                    {/* Half-Day */}
                    <div className="p-4 rounded-2xl border border-border/40 bg-card hover:border-primary/40 transition-colors space-y-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                          <span className="text-[10px] font-black text-amber-600">½D</span>
                        </div>
                        <span className="text-xs font-bold text-foreground">Half-Day Rate</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <p className="text-[9px] text-warm-muted mb-1 font-semibold">Hours</p>
                          <Input type="number" value={resourceForm.half_day_hours || ''} placeholder="6" onChange={e => setResourceForm({ ...resourceForm, half_day_hours: parseInt(e.target.value) || 6 })} className="rounded-xl border-border/50 h-8 font-mono text-xs focus:border-amber-400" />
                        </div>
                        <div>
                          <p className="text-[9px] text-warm-muted mb-1 font-semibold">Price (₹)</p>
                          <Input type="number" value={resourceForm.half_day_rate || ''} placeholder="₹0" onChange={e => setResourceForm({ ...resourceForm, half_day_rate: parseFloat(e.target.value) || 0 })} className="rounded-xl border-border/50 h-8 font-mono text-xs focus:border-amber-400" />
                        </div>
                      </div>
                    </div>

                    {/* Full-Day */}
                    <div className="p-4 rounded-2xl border border-border/40 bg-card hover:border-primary/40 transition-colors space-y-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center">
                          <span className="text-[10px] font-black text-green-600">24H</span>
                        </div>
                        <span className="text-xs font-bold text-foreground">Full-Day Rate</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <p className="text-[9px] text-warm-muted mb-1 font-semibold">Hours</p>
                          <Input value="24" disabled className="rounded-xl border-border/50 h-8 font-mono text-xs bg-sand/20 cursor-not-allowed" />
                        </div>
                        <div>
                          <p className="text-[9px] text-warm-muted mb-1 font-semibold">Price (₹)</p>
                          <Input type="number" value={resourceForm.full_day_rate || ''} placeholder="₹0" onChange={e => setResourceForm({ ...resourceForm, full_day_rate: parseFloat(e.target.value) || 0 })} className="rounded-xl border-border/50 h-8 font-mono text-xs focus:border-green-400" />
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Amenities */}
                <div className="space-y-3 pt-1 border-t border-border/20">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-warm-muted">Amenities</Label>
                    {(resourceForm as any).amenities?.length > 0 && (
                      <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-lg">{(resourceForm as any).amenities.length} selected</span>
                    )}
                  </div>
                  {customAmenities.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {customAmenities.map(amenity => {
                        const sel = (resourceForm as any).amenities?.includes(amenity);
                        return (
                          <button key={amenity} type="button" onClick={() => setResourceForm((prev: any) => ({ ...prev, amenities: sel ? (prev as any).amenities.filter((a:string)=>a!==amenity) : [...((prev as any).amenities||[]),amenity] }))} className={`flex items-center gap-2 border px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer text-xs font-semibold ${sel?'border-primary bg-primary/5 text-primary shadow-sm':'border-border/50 hover:border-border hover:bg-sand/20 text-warm-muted'}`}>
                            <div className={`h-4 w-4 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${sel?'bg-primary border-primary text-white':'border-border/60'}`}>{sel&&<Check className="h-2.5 w-2.5"/>}</div>
                            <span className="truncate">{amenity}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-warm-muted italic">No amenities yet. Add one below.</p>
                  )}
                  <div className="flex gap-2 max-w-sm">
                    <Input placeholder="e.g. Projector, CCTV..." value={newAmenityInput} onChange={e => setNewAmenityInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { handleAddCustomAmenityForSingle(newAmenityInput); } }} className="rounded-xl border-border/60 h-9 text-xs flex-1" />
                    <Button type="button" onClick={() => handleAddCustomAmenityForSingle(newAmenityInput)} className="h-9 rounded-xl bg-foreground hover:bg-foreground/85 text-background font-bold text-xs px-4">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t border-border/40 pt-4 flex justify-between bg-sand/5 p-4 rounded-b-2xl">
            <Button variant="ghost" onClick={() => setWorkflowStep(1)} className="rounded-xl font-bold text-xs">
              Back to Property Details
            </Button>
            <Button
              onClick={async () => {
                if (!selectedPropertyForWizard) {
                  toast.error("Please save property details in step 1 first.");
                  return;
                }
                try {
                  if (resourceAddMode === 'range') {
                    const startNum = parseInt(String(roomRangeForm.start_num), 10);
                    const endNum = parseInt(String(roomRangeForm.end_num), 10);
                    const count = Math.max(0, endNum - startNum + 1);
                    if (count === 0) { toast.error("End number must be greater than or equal to start number."); return; }

                    // Build list of expected names
                    const generatedItems = Array.from({ length: count }).map((_, index) => {
                      const num = startNum + index;
                      const paddedNum = String(num).padStart(parseInt(String(roomRangeForm.digits), 10) || 1, "0");
                      const name = `${roomRangeForm.prefix} ${paddedNum}`.trim();
                      return {
                        name,
                        data: {
                          property: selectedPropertyForWizard.id,
                          name,
                          resource_type: roomRangeForm.resource_type || "Room",
                          capacity: parseInt(String(roomRangeForm.capacity), 10) || 0,
                          booking_type: "Full Day",
                          hourly_rate: parseFloat(String(roomRangeForm.hourly_rate)) || 0,
                          half_day_hours: (roomRangeForm.half_day_hours != null && roomRangeForm.half_day_hours !== '' ? parseInt(String(roomRangeForm.half_day_hours), 10) : 6),
                          half_day_rate: parseFloat(String(roomRangeForm.half_day_rate)) || 0,
                          full_day_rate: parseFloat(String(roomRangeForm.full_day_rate)) || 0,
                          status: "Active",
                          amenities: roomRangeForm.amenities || []
                        }
                      };
                    });

                    // Upsert: find existing resources with same names for this property
                    const propResources = resources.filter((r: any) => String(r.property) === String(selectedPropertyForWizard.id));
                    const existingByName = new Map(propResources.map((r: any) => [r.name, r]));

                    const toCreate = generatedItems.filter(item => !existingByName.has(item.name));
                    const toUpdate = generatedItems.filter(item => existingByName.has(item.name));

                    let createdCount = 0, updatedCount = 0;
                    if (toCreate.length > 0) {
                      await api.bulkCreatePropertyResources({ resources: toCreate.map(i => i.data) });
                      createdCount = toCreate.length;
                    }
                    for (const item of toUpdate) {
                      const existing = existingByName.get(item.name);
                      await api.updatePropertyResource(existing.id, { ...item.data, property: existing.property });
                      updatedCount++;
                    }
                    toast.success(`Done: ${createdCount} created, ${updatedCount} updated. (${count} total for range ${startNum}–${endNum})`);
                  } else {
                    await api.createPropertyResource({
                      property: selectedPropertyForWizard.id,
                      name: resourceForm.name,
                      resource_type: resourceForm.resource_type,
                      capacity: resourceForm.capacity,
                      booking_type: "Full Day",
                      hourly_rate: resourceForm.hourly_rate || 0,
                      half_day_hours: (resourceForm.half_day_hours != null && resourceForm.half_day_hours !== '' ? resourceForm.half_day_hours : 6),
                      half_day_rate: resourceForm.half_day_rate || 0,
                      full_day_rate: resourceForm.full_day_rate || 0,
                      status: resourceForm.status,
                      amenities: (resourceForm as any).amenities || []
                    });
                    toast.success(`"${resourceForm.name}" saved! Fields cleared for next resource.`);
                  }
                  // ✅ Reset both forms to blank defaults
                  setResourceForm({
                    name: "", resource_type: "Hall", capacity: 0, description: "",
                    booking_type: "Full Day", status: "Active",
                    hourly_rate: 0, half_day_hours: 6, half_day_rate: 0, full_day_rate: 0, security_deposit: 0,
                    min_booking_duration_hours: 1, max_booking_duration_hours: 24,
                    setup_buffer_hours: 0, cleanup_buffer_hours: 0,
                    isBulk: false, prefix: "Room", range_start: 1, range_end: 10,
                    dependencies: [] as number[], amenities: [] as string[]
                  } as any);
                  setRoomRangeForm({
                    resource_name: "", prefix: "Room",
                    start_num: 1, end_num: 10, digits: 2,
                    amenities: [] as string[], resource_type: "Room",
                    capacity: 0, hourly_rate: 0, half_day_hours: 6, half_day_rate: 0, full_day_rate: 0
                  });
                  fetchData();
                } catch (error: any) {
                  console.error("Error creating resources:", error);
                  toast.error(error.message || "Failed to create resources");
                }
              }}
              className="bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-xs px-5 shadow-sm flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Save & Add Another
            </Button>
            <Button
              onClick={handleNextStep}
              className="bg-foreground hover:bg-foreground/85 text-background rounded-xl font-bold text-xs px-5 shadow-sm"
            >
              Next Step →
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    );
  };

  // Step 3: Resource List with pricing + amenities + pagination
  const renderStep3 = () => {
    const PAGE_SIZE = 10;
    const propResources = resources.filter((r:any) => String(r.property) === String(selectedPropertyForWizard?.id));
    const filtered = propResources
      .filter((r:any) => r.name.toLowerCase().includes(resourceSearch.toLowerCase()))
      .filter((r:any) => resourceTypeFilter === "All" || r.resource_type.includes(resourceTypeFilter));
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(step3Page, totalPages);
    const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
    return (
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-6">
        <Card className="border border-border/40 shadow-sm rounded-3xl bg-card overflow-hidden">
          <CardHeader className="bg-sand/10 border-b border-border/30 pb-5">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs bg-primary/10 text-primary font-bold uppercase tracking-wider px-2 py-0.5 rounded">Step 3 of 12</span>
                <CardTitle className="text-xl font-black mt-2 text-foreground uppercase tracking-tight">Active Resource Inventory</CardTitle>
                <CardDescription className="text-xs text-warm-muted mt-0.5">Manage details and status of resource units allocated to your property.</CardDescription>
              </div>
              <Badge className="bg-primary text-white font-bold text-xs px-3 py-1 rounded-xl">{filtered.length} Resources</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4 text-xs font-semibold">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="relative flex-1 w-full max-w-xs">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-warm-muted" />
                <Input placeholder="Filter resource inventory..." value={resourceSearch} onChange={e => setResourceSearch(e.target.value)} className="pl-9 rounded-xl border-border/70 text-xs font-medium" />
              </div>
              <select className="h-9 rounded-xl border border-border/70 bg-card px-2.5 py-1 text-xs font-semibold outline-none text-warm-muted focus:border-primary" value={resourceTypeFilter} onChange={e => setResourceTypeFilter(e.target.value)}>
                <option value="All">All Types</option>
                <option value="Room">Rooms Only</option>
                <option value="Hall">Halls Only</option>
                <option value="Kitchen">Kitchens Only</option>
              </select>
            </div>
            {/* Bulk action bar */}
            {selectedResourceIds.size > 0 && (
              <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-2xl px-4 py-2.5">
                <span className="text-xs font-bold text-red-700">{selectedResourceIds.size} resource(s) selected</span>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setSelectedResourceIds(new Set())} className="h-8 text-xs font-semibold rounded-xl text-warm-muted">
                    Clear selection
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!confirm(`Delete ${selectedResourceIds.size} resource(s)? This cannot be undone.`)) return;
                      try {
                        await Promise.all(Array.from(selectedResourceIds).map(id => api.deletePropertyResource(id)));
                        toast.success(`${selectedResourceIds.size} resource(s) deleted.`);
                        setSelectedResourceIds(new Set());
                        fetchData();
                      } catch (e: any) {
                        toast.error(e.message || "Failed to delete resources");
                      }
                    }}
                    className="h-8 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl px-4 flex items-center gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete Selected
                  </Button>
                </div>
              </div>
            )}
            <div className="border border-border/40 rounded-2xl overflow-auto bg-card">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-sand/15 border-b border-border/30 text-warm-muted text-xs uppercase tracking-wider font-bold">
                    <th className="px-4 py-3.5 w-10">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-border/60 accent-primary cursor-pointer"
                        checked={pageItems.length > 0 && pageItems.every((r: any) => selectedResourceIds.has(r.id))}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedResourceIds(prev => new Set([...prev, ...pageItems.map((r: any) => r.id)]));
                          } else {
                            setSelectedResourceIds(prev => {
                              const next = new Set(prev);
                              pageItems.forEach((r: any) => next.delete(r.id));
                              return next;
                            });
                          }
                        }}
                      />
                    </th>
                    <th className="px-4 py-3.5">Resource</th>
                    <th className="px-4 py-3.5">Type</th>
                    <th className="px-4 py-3.5">Capacity</th>
                    <th className="px-4 py-3.5">Rates (₹)</th>
                    <th className="px-4 py-3.5">Amenities</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {pageItems.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-warm-muted text-xs font-medium">No resources found. Go back to Step 2 to generate some.</td></tr>
                  ) : (
                    pageItems.map((r:any) => (
                      <tr key={r.id} className={`hover:bg-sand/5 transition ${selectedResourceIds.has(r.id) ? 'bg-primary/3' : ''}`}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-border/60 accent-primary cursor-pointer"
                            checked={selectedResourceIds.has(r.id)}
                            onChange={e => {
                              setSelectedResourceIds(prev => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(r.id); else next.delete(r.id);
                                return next;
                              });
                            }}
                          />
                        </td>
                        <td className="px-4 py-3 font-bold text-foreground">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${r.status === 'Active' ? 'bg-green-500' : r.status === 'Maintenance' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                            {r.name}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="bg-sand/30 border border-border/30 text-warm-muted font-bold text-xs uppercase">{r.resource_type}</Badge>
                        </td>
                        <td className="px-4 py-3 font-mono">{r.capacity} Pax</td>
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            {r.hourly_rate > 0 && <div className="text-[10px] text-warm-muted"><span className="font-bold text-foreground">₹{r.hourly_rate}</span>/hr</div>}
                            {r.half_day_rate > 0 && <div className="text-[10px] text-warm-muted"><span className="font-bold text-foreground">₹{r.half_day_rate}</span>/{(r.half_day_hours != null && r.half_day_hours !== '' ? r.half_day_hours : 6)}h</div>}
                            {r.full_day_rate > 0 && <div className="text-[10px] text-warm-muted"><span className="font-bold text-foreground">₹{r.full_day_rate}</span>/24h</div>}
                            {!r.hourly_rate && !r.half_day_rate && !r.full_day_rate && <span className="text-warm-muted">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {Array.isArray(r.amenities) && r.amenities.length > 0 ? (
                              <>
                                {r.amenities.slice(0, 3).map((a:string) => (
                                  <Badge key={a} variant="outline" className="text-[10px] px-1.5 py-0 border-border/40 text-warm-muted">{a}</Badge>
                                ))}
                                {r.amenities.length > 3 && <span className="text-[10px] text-primary font-bold">+{r.amenities.length - 3}</span>}
                              </>
                            ) : <span className="text-warm-muted">None</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7 text-orange-600 rounded-lg hover:bg-orange-50/50"
                              onClick={() => {
                                setEditingResource(r);
                                setEditResourceForm({
                                  name: r.name,
                                  resource_type: r.resource_type,
                                  capacity: r.capacity || 0,
                                  hourly_rate: r.hourly_rate || 0,
                                  half_day_hours: (r.half_day_hours != null && r.half_day_hours !== '' ? r.half_day_hours : 6),
                                  half_day_rate: r.half_day_rate || 0,
                                  full_day_rate: r.full_day_rate || 0,
                                  status: r.status || "Active",
                                  booking_type: r.booking_type || "Full Day",
                                  amenities: Array.isArray(r.amenities) ? [...r.amenities] : []
                                });
                              }}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 rounded-lg hover:bg-red-50" onClick={async () => { try { await api.deletePropertyResource(r.id); toast.success("Resource deleted"); fetchData(); } catch(e:any){toast.error(e.message||"Failed");} }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-warm-muted font-medium">Page {safePage} of {totalPages} &bull; {filtered.length} total</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-8 rounded-xl text-xs font-bold" disabled={safePage <= 1} onClick={() => setStep3Page(p => Math.max(1, p-1))}>
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Prev
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 rounded-xl text-xs font-bold" disabled={safePage >= totalPages} onClick={() => setStep3Page(p => Math.min(totalPages, p+1))}>
                    Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* Edit Resource Dialog */}
            {editingResource && (
              <Dialog open={!!editingResource} onOpenChange={(open) => { if (!open) setEditingResource(null); }}>
                <DialogContent className="max-w-lg rounded-3xl p-6 border-none bg-card shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-black uppercase tracking-tight">Edit Resource Unit</DialogTitle>
                    <DialogDescription className="text-xs text-warm-muted">Update details for {editingResource.name}.</DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 text-xs font-semibold">
                    <div className="space-y-2">
                      <Label>Resource Name *</Label>
                      <Input 
                        value={editResourceForm.name} 
                        onChange={e => setEditResourceForm({ ...editResourceForm, name: e.target.value })} 
                        className="rounded-xl h-10" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Resource Type *</Label>
                      <select 
                        className="flex h-10 w-full rounded-xl border border-border/70 bg-card px-3 py-2 text-xs font-semibold outline-none text-warm-muted focus:border-primary" 
                        value={editResourceForm.resource_type} 
                        onChange={e => setEditResourceForm({ ...editResourceForm, resource_type: e.target.value })}
                      >
                        {RESOURCE_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Capacity (People)</Label>
                      <Input 
                        type="number" 
                        value={editResourceForm.capacity} 
                        onChange={e => setEditResourceForm({ ...editResourceForm, capacity: parseInt(e.target.value) || 0 })} 
                        className="rounded-xl h-10 font-mono" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <div className="flex items-center h-10 px-4 rounded-xl border border-border/40 bg-sand/10 text-xs font-bold text-foreground">
                        <span className={`w-2 h-2 rounded-full mr-2 shrink-0 ${
                          editResourceForm.status === 'Active'
                            ? 'bg-green-500'
                            : editResourceForm.status === 'Maintenance'
                              ? 'bg-amber-500'
                              : 'bg-gray-400'
                        }`} />
                        {editResourceForm.status || 'Active'}
                        <span className="text-[10px] text-warm-muted font-normal ml-auto italic">(Managed automatically)</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Hourly Rate (₹) *</Label>
                      <Input 
                        type="number" 
                        value={editResourceForm.hourly_rate} 
                        onChange={e => setEditResourceForm({ ...editResourceForm, hourly_rate: parseFloat(e.target.value) || 0 })} 
                        className="rounded-xl h-10 font-mono" 
                      />
                    </div>
                    {/* Half Day */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px]">Half-Day Hours</Label>
                        <Input 
                          type="number" 
                          value={editResourceForm.half_day_hours} 
                          onChange={e => setEditResourceForm({ ...editResourceForm, half_day_hours: parseInt(e.target.value) || 6 })} 
                          className="rounded-xl h-10 font-mono" 
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Half-Day Price (₹)</Label>
                        <Input 
                          type="number" 
                          value={editResourceForm.half_day_rate} 
                          onChange={e => setEditResourceForm({ ...editResourceForm, half_day_rate: parseFloat(e.target.value) || 0 })} 
                          className="rounded-xl h-10 font-mono" 
                        />
                      </div>
                    </div>
                    {/* Full Day */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px]">Full-Day Hours</Label>
                        <Input 
                          value="24 Hours" 
                          disabled 
                          className="rounded-xl h-10 font-mono bg-sand/20 cursor-not-allowed" 
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Full-Day Price (₹) *</Label>
                        <Input 
                          type="number" 
                          value={editResourceForm.full_day_rate} 
                          onChange={e => setEditResourceForm({ ...editResourceForm, full_day_rate: parseFloat(e.target.value) || 0 })} 
                          className="rounded-xl h-10 font-mono" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Amenities in edit mode */}
                  <div className="space-y-3 pt-3 border-t border-border/30 text-xs font-semibold">
                    <Label>Pre-assigned Amenities</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {customAmenities.map(amenity => {
                        const sel = editResourceForm.amenities?.includes(amenity);
                        return (
                          <button 
                            key={amenity} 
                            type="button" 
                            onClick={() => {
                              setEditResourceForm((prev: any) => ({
                                ...prev,
                                amenities: sel 
                                  ? prev.amenities.filter((a: string) => a !== amenity) 
                                  : [...(prev.amenities || []), amenity]
                              }));
                            }} 
                            className={`flex items-center gap-2 border p-2 rounded-xl text-left transition cursor-pointer text-[11px] font-semibold ${sel ? 'border-primary bg-primary/5 text-primary' : 'border-border/60 hover:bg-sand/30 text-warm-muted'}`}
                          >
                            <div className={`h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 ${sel ? 'bg-primary border-primary text-white' : 'border-border/70'}`}>
                              {sel && <Check className="h-2.5 w-2.5" />}
                            </div>
                            {amenity}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-2 max-w-sm mt-1">
                      <Input 
                        placeholder="Add custom amenity label..." 
                        value={newAmenityInput} 
                        onChange={e => setNewAmenityInput(e.target.value)} 
                        className="rounded-xl border-border/70 h-8 text-xs" 
                      />
                      <Button 
                        type="button" 
                        onClick={() => {
                          const trimmed = newAmenityInput.trim();
                          if (!trimmed) return;
                          handleAddCustomAmenity(trimmed);
                          if (!editResourceForm.amenities?.includes(trimmed)) {
                            setEditResourceForm((prev: any) => ({
                              ...prev,
                              amenities: [...(prev.amenities || []), trimmed]
                            }));
                          }
                          setNewAmenityInput("");
                        }}
                        className="h-8 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs"
                      >
                        Add
                      </Button>
                    </div>
                  </div>

                  <DialogFooter className="mt-6 gap-2">
                    <Button variant="ghost" onClick={() => setEditingResource(null)} className="rounded-xl text-xs font-bold">
                      Cancel
                    </Button>
                    <Button 
                      onClick={async () => {
                        try {
                          await api.updatePropertyResource(editingResource.id, {
                            ...editResourceForm,
                            property: editingResource.property
                          });
                          toast.success("Resource updated successfully");
                          setEditingResource(null);
                          fetchData();
                        } catch (error: any) {
                          toast.error(error.message || "Failed to update resource");
                        }
                      }}
                      className="bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold px-5 shadow-sm"
                    >
                      Save Changes
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </CardContent>
          <CardFooter className="border-t border-border/40 pt-4 flex justify-between bg-sand/5 p-4 rounded-b-2xl">
            <Button variant="ghost" onClick={() => setWorkflowStep(2)} className="rounded-xl font-bold text-xs">Back to Studio</Button>
            <Button onClick={handleNextStep} className="bg-primary hover:bg-primary/95 text-white rounded-xl font-bold text-xs px-5 shadow-sm">Configure Dependencies</Button>
          </CardFooter>
        </Card>
      </motion.div>
    );
  };

  // Step 4: Dependencies (Stripe Dashboard Layout)
  const renderStep4 = () => {
    const propResources = resources.filter(r => r.property === selectedPropertyForWizard?.id);
    return (
      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="w-full space-y-6"
      >
        <Card className="border border-border/40 shadow-sm rounded-3xl bg-card overflow-hidden">
          <CardHeader className="bg-sand/10 border-b border-border/30 pb-5">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs bg-primary/10 text-primary font-bold uppercase tracking-wider px-2 py-0.5 rounded">Step 4 of 12</span>
                <CardTitle className="text-xl font-black mt-2 text-foreground uppercase tracking-tight">Mandatory Resource Dependencies</CardTitle>
                <CardDescription className="text-xs text-warm-muted mt-0.5">Define linkage rules (e.g. Booking a Marriage Hall forces a required booking of a Kitchen room unit).</CardDescription>
              </div>
              <Badge className="bg-primary text-white font-bold text-xs px-3 py-1 rounded-xl">Step 4</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6 text-xs font-semibold">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-foreground">If member books (Parent Unit) *</Label>
                <select 
                  className="flex h-10 w-full rounded-xl border border-border/70 bg-card px-3 py-2 text-xs font-bold outline-none text-warm-muted focus:border-primary"
                  value={parentResourceDependency}
                  onChange={e => setParentResourceDependency(e.target.value)}
                >
                  <option value="">-- Choose Parent Resource --</option>
                  {propResources.map(r => <option key={r.id} value={r.id}>{r.name} ({r.resource_type})</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-foreground">Then system forces (Required Linkage) * <span className="text-warm-muted font-normal">(select multiple)</span></Label>
                <div className="border border-border/40 rounded-xl bg-sand/5 max-h-40 overflow-y-auto p-2 space-y-1">
                  {propResources.filter((r:any) => String(r.id) !== String(parentResourceDependency)).map((r:any) => {
                    const isChecked = requiredResourceDependency.split(',').filter(Boolean).includes(String(r.id));
                    return (
                      <button key={r.id} type="button" onClick={() => {
                        const current = requiredResourceDependency.split(',').filter(Boolean);
                        const newVal = isChecked ? current.filter(id => id !== String(r.id)) : [...current, String(r.id)];
                        setRequiredResourceDependency(newVal.join(','));
                      }} className={`w-full flex items-center gap-2 p-2 rounded-lg text-left text-xs font-semibold transition ${isChecked?'bg-primary/10 text-primary border border-primary/30':'hover:bg-sand/30 text-warm-muted border border-transparent'}`}>
                        <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${isChecked?'bg-primary border-primary text-white':'border-border/70'}`}>
                          {isChecked && <Check className="h-3 w-3" />}
                        </div>
                        {r.name} <span className="text-[10px] opacity-60">({r.resource_type})</span>
                      </button>
                    );
                  })}
                  {propResources.length === 0 && <p className="text-center text-warm-muted py-2 text-xs">No resources available.</p>}
                </div>
                <Button type="button" onClick={async () => {
                  if (!parentResourceDependency || !requiredResourceDependency) {
                    toast.error("Please select both parent and required resources");
                    return;
                  }
                  try {
                    const parentObj = propResources.find((r:any) => String(r.id) === String(parentResourceDependency));
                    const reqIds = requiredResourceDependency.split(',').filter(Boolean);
                    
                    const newDeps = await Promise.all(reqIds.map(async id => {
                      const reqObj = propResources.find((r:any) => String(r.id) === id);
                      const res = await api.createResourceDependency({
                        resource: parentObj?.id,
                        requires: reqObj?.id,
                        dependency_type: 'combination'
                      });
                      // Map backend response fields to frontend UI expectation
                      return {
                        ...res,
                        parent_resource_name: parentObj?.name,
                        required_resource_name: reqObj?.name,
                        parent_id: parentObj?.id,
                        required_id: reqObj?.id
                      };
                    }));
                    
                    setDependenciesList(prev => [...prev, ...newDeps]);
                    toast.success(`${newDeps.length} dependency rule(s) created and saved`);
                    setParentResourceDependency("");
                    setRequiredResourceDependency("");
                    fetchData();
                  } catch(e:any) { toast.error("Failed to link dependency rules"); }
                }} className="bg-primary hover:bg-primary/95 text-white font-bold rounded-xl h-9 px-4 text-xs w-full">
                  Create Links ({requiredResourceDependency.split(',').filter(Boolean).length} selected)
                </Button>
              </div>
            </div>

            {/* List of dependency rules */}
            <div className="space-y-3 pt-3">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Info className="h-4 w-4 text-warm-muted" /> Configured System Linkages
              </h4>
              
              <div className="border border-border/40 bg-sand/5 rounded-2xl p-4 space-y-2 max-h-48 overflow-y-auto">
                {dependenciesList.length === 0 ? (
                  <p className="text-center text-warm-muted py-6 font-medium">No dependency rules configured yet. Properties can be booked independently.</p>
                ) : (
                  dependenciesList.map((dep, idx) => (
                    <div key={dep.id || idx} className="flex justify-between items-center p-2.5 rounded-xl border border-border/40 bg-card shadow-sm">
                      <span className="font-semibold text-foreground">
                        {idx + 1}. {dep.parent || dep.parent_resource_name} <span className="text-primary px-2 font-bold">→ Requires →</span> {dep.required || dep.required_resource_name}
                      </span>
                      <button 
                        onClick={async () => {
                          try {
                            if (dep.id) {
                              await api.deleteResourceDependency(dep.id);
                            }
                            setDependenciesList(prev => prev.filter(item => item.id !== dep.id));
                            toast.success("Dependency rule unlinked and deleted");
                          } catch (e: any) {
                            toast.error("Failed to delete dependency rule");
                          }
                        }}
                        className="text-red-500 hover:text-red-700 h-6 w-6 rounded-lg hover:bg-red-50 flex items-center justify-center transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t border-border/40 pt-4 flex justify-between bg-sand/5 p-4 rounded-b-2xl">
            <Button variant="ghost" onClick={() => setWorkflowStep(3)} className="rounded-xl font-bold text-xs">
              Back to Resource List
            </Button>
            <Button
              onClick={handleNextStep}
              className="bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-xs px-5 shadow-sm"
            >
              Step 5: Add-ons
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    );
  };

  const renderStep5 = () => {

    const handleAddAddon = async () => {
      if (!addonForm.name.trim()) { toast.error('Add-on name is required'); return; }
      setSavingAddon(true);
      try {
        const newAddon = {
          id: Date.now(),
          name: addonForm.name.trim(),
          hourly_rate: parseFloat(addonForm.hourly_rate) || 0,
          half_day_hours: parseInt(addonForm.half_day_hours) || 6,
          half_day_rate: parseFloat(addonForm.half_day_rate) || 0,
          full_day_rate: parseFloat(addonForm.full_day_rate) || 0,
          deposit_amount: parseFloat(addonForm.deposit_amount) || 0,
          property: selectedPropertyForWizard?.id,
        };
        setAddonsList(prev => [...prev, newAddon]);
        setAddonForm({ name: '', hourly_rate: '', half_day_hours: '6', half_day_rate: '', full_day_rate: '', deposit_amount: '' });
        toast.success(`Add-on "${newAddon.name}" added successfully!`);
      } catch(e:any) {
        toast.error(e.message || 'Failed to add add-on');
      } finally {
        setSavingAddon(false);
      }
    };

    return (
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-6">
        <Card className="border border-border/40 shadow-sm rounded-3xl bg-card overflow-hidden">
          <CardHeader className="bg-sand/10 border-b border-border/30 pb-5">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs bg-primary/10 text-primary font-bold uppercase tracking-wider px-2 py-0.5 rounded">Step 5 of 12</span>
                <CardTitle className="text-xl font-black mt-2 text-foreground uppercase tracking-tight">Property Add-ons</CardTitle>
                <CardDescription className="text-xs text-warm-muted mt-0.5">Define optional chargeable add-ons for this property (e.g. Sound System, Projector, Catering).</CardDescription>
              </div>
              <Badge className="bg-primary text-white font-bold text-xs px-3 py-1 rounded-xl">{addonsList.length} Add-ons</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6 text-xs font-semibold">
            {/* Add-on Form */}
            <div className="p-5 border border-border/40 rounded-2xl bg-sand/5 space-y-4">
              <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">New Add-on Configuration</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Add-on Name *</Label>
                  <Input value={addonForm.name} onChange={e => setAddonForm({...addonForm, name: e.target.value})} placeholder="e.g. DJ Sound System" className="rounded-xl border-border/70 h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Hourly Rate (₹)</Label>
                  <Input type="number" value={addonForm.hourly_rate} onChange={e => setAddonForm({...addonForm, hourly_rate: e.target.value})} placeholder="e.g. 500" className="rounded-xl border-border/70 h-10 font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Deposit Amount (₹)</Label>
                  <Input type="number" value={addonForm.deposit_amount} onChange={e => setAddonForm({...addonForm, deposit_amount: e.target.value})} placeholder="e.g. 2000" className="rounded-xl border-border/70 h-10 font-mono" />
                </div>

                {/* Half Day */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Half-Day Hours</Label>
                    <Input type="number" value={addonForm.half_day_hours} onChange={e => setAddonForm({...addonForm, half_day_hours: e.target.value})} className="rounded-xl border-border/70 h-10 font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Half-Day Price (₹)</Label>
                    <Input type="number" value={addonForm.half_day_rate} onChange={e => setAddonForm({...addonForm, half_day_rate: e.target.value})} placeholder="e.g. 1500" className="rounded-xl border-border/70 h-10 font-mono" />
                  </div>
                </div>

                {/* Full Day */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Full-Day Hours</Label>
                    <Input value="24 Hours" disabled className="rounded-xl border-border/70 h-10 font-mono bg-sand/20 cursor-not-allowed" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Full-Day Price (₹)</Label>
                    <Input type="number" value={addonForm.full_day_rate} onChange={e => setAddonForm({...addonForm, full_day_rate: e.target.value})} placeholder="e.g. 3000" className="rounded-xl border-border/70 h-10 font-mono" />
                  </div>
                </div>
              </div>
              <Button onClick={handleAddAddon} disabled={savingAddon} className="bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-xs h-10 px-5 flex items-center gap-1.5 mt-2">
                <Plus className="h-3.5 w-3.5" /> {savingAddon ? 'Adding...' : 'Add Add-on Asset'}
              </Button>
            </div>

            {/* Add-ons List */}
            <div className="border border-border/40 rounded-2xl overflow-hidden bg-card">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-sand/15 border-b border-border/30 text-warm-muted text-xs uppercase tracking-wider font-bold">
                    <th className="px-4 py-3.5">#</th>
                    <th className="px-4 py-3.5">Add-on Asset</th>
                    <th className="px-4 py-3.5">Hourly Rate</th>
                    <th className="px-4 py-3.5">Half-Day Rate</th>
                    <th className="px-4 py-3.5">Full-Day Rate</th>
                    <th className="px-4 py-3.5">Deposit</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {addonsList.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-warm-muted text-xs font-medium">No add-ons yet. Use the form above to add chargeable extras.</td></tr>
                  ) : (
                    addonsList.map((addon, idx) => (
                      <tr key={addon.id} className="hover:bg-sand/5 transition">
                        <td className="px-4 py-3.5 text-warm-muted font-mono">{idx + 1}</td>
                        <td className="px-4 py-3.5 font-bold text-foreground">{addon.name}</td>
                        <td className="px-4 py-3.5 font-mono">{addon.hourly_rate > 0 ? `₹${addon.hourly_rate}/hr` : '—'}</td>
                        <td className="px-4 py-3.5 font-mono">{addon.half_day_rate > 0 ? `₹${addon.half_day_rate}/${addon.half_day_hours || 6}h` : '—'}</td>
                        <td className="px-4 py-3.5 font-mono">{addon.full_day_rate > 0 ? `₹${addon.full_day_rate}/24h` : '—'}</td>
                        <td className="px-4 py-3.5 font-mono">{addon.deposit_amount > 0 ? `₹${addon.deposit_amount}` : '—'}</td>
                        <td className="px-4 py-3.5 text-right">
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 rounded-lg hover:bg-red-50" onClick={() => { setAddonsList(prev => prev.filter(a => a.id !== addon.id)); toast.success('Add-on removed'); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
          <CardFooter className="border-t border-border/40 pt-4 flex justify-between bg-sand/5 p-4 rounded-b-2xl">
            <Button variant="ghost" onClick={() => setWorkflowStep(4)} className="rounded-xl font-bold text-xs">Back to Dependencies</Button>
            <Button onClick={() => setWorkflowStep(6)} className="bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-xs px-5 shadow-sm">
              Review &amp; Publish
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    );
  };

  // Step 6: Review & Publish
  const renderStep6 = () => {
    const propertyResources = resources.filter(r => r.property === selectedPropertyForWizard?.id);
    const totalResourcePrice = propertyResources.reduce((sum, r) => sum + (parseFloat(r.full_day_rate) || 0), 0);
    const totalAddonPrice = addonsList.reduce((sum, a) => sum + (parseFloat(a.full_day_rate) || 0), 0);
    const fullPackagePrice = totalResourcePrice + totalAddonPrice;
    
    return (
      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="w-full space-y-6"
      >
        <Card className="border border-border/40 shadow-sm rounded-3xl bg-card overflow-hidden">
          <CardHeader className="bg-sand/10 border-b border-border/30 pb-5">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs bg-primary/10 text-primary font-bold uppercase tracking-wider px-2 py-0.5 rounded">Step 7 of 7</span>
                <CardTitle className="text-xl font-black mt-2 text-foreground uppercase tracking-tight">Review & Publish Property</CardTitle>
                <CardDescription className="text-xs text-warm-muted mt-0.5">Please verify all settings, resources, and rates before saving.</CardDescription>
              </div>
              <Badge className="bg-[#3D1A00] text-white font-bold text-xs px-3 py-1 rounded-xl shadow-warm">Final Review</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6 text-xs font-semibold">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: General Info & Photos */}
              <div className="space-y-6">
                <div className="bg-sand/5 border border-border/30 rounded-2xl p-5 space-y-4">
                  <div className="flex justify-between items-center border-b border-border/20 pb-2">
                    <h3 className="font-bold text-xs text-primary uppercase tracking-wider">Property Details</h3>
                    <Button variant="ghost" onClick={() => setWorkflowStep(1)} className="h-6 w-6 p-0 hover:bg-sand/20 rounded-full">
                      <Edit className="h-3.5 w-3.5 text-warm-muted hover:text-primary" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-warm-muted uppercase font-bold">Property Name</p>
                      <p className="text-xs font-bold text-foreground mt-0.5">{propertyForm.name || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-warm-muted uppercase font-bold">Property Type</p>
                      <p className="text-xs font-bold text-foreground mt-0.5">{propertyForm.property_type || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-warm-muted uppercase font-bold">Ownership</p>
                      <p className="text-xs font-bold text-foreground mt-0.5">{propertyForm.ownership || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-warm-muted uppercase font-bold">Address</p>
                      <p className="text-xs font-bold text-foreground mt-0.5">{propertyForm.address || "N/A"}, {propertyForm.city}, {propertyForm.state} - {propertyForm.pincode}</p>
                    </div>
                  </div>
                  {propertyForm.description && (
                    <div className="pt-2">
                      <p className="text-xs text-warm-muted uppercase font-bold">Description</p>
                      <p className="text-xs font-medium text-foreground mt-0.5 leading-relaxed">{propertyForm.description}</p>
                    </div>
                  )}
                  {propertyForm.rules && (
                    <div className="pt-2">
                      <p className="text-xs text-warm-muted uppercase font-bold">Rules & Guidelines</p>
                      <p className="text-xs font-medium text-foreground mt-0.5 leading-relaxed">{propertyForm.rules}</p>
                    </div>
                  )}
                </div>

                {/* Photos */}
                <div className="bg-sand/5 border border-border/30 rounded-2xl p-5 space-y-4">
                  <div className="flex justify-between items-center border-b border-border/20 pb-2">
                    <h3 className="font-bold text-xs text-primary uppercase tracking-wider">Property Photos</h3>
                    <Button variant="ghost" onClick={() => setWorkflowStep(1)} className="h-6 w-6 p-0 hover:bg-sand/20 rounded-full">
                      <Edit className="h-3.5 w-3.5 text-warm-muted hover:text-primary" />
                    </Button>
                  </div>
                  {propertyForm.photos.length === 0 && propertyForm.uploaded_photos.length === 0 ? (
                    <p className="text-xs text-warm-muted italic font-medium">No photos uploaded for this property.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {propertyForm.photos.map((p: string, idx: number) => (
                        <div key={`photo-${idx}`} className="relative h-20 rounded-xl overflow-hidden border border-border/30 shadow-sm bg-sand/10">
                          <img src={getImageUrl(p)} alt={`photo-${idx}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {propertyForm.uploaded_photos.map((file: File, idx: number) => (
                        <div key={`file-${idx}`} className="relative h-20 rounded-xl overflow-hidden border border-border/30 shadow-sm bg-sand/10">
                          <img src={URL.createObjectURL(file)} alt={`file-${idx}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Resources, Rates, & Policies */}
              <div className="space-y-6">
                {/* Resources */}
                <div className="bg-sand/5 border border-border/30 rounded-2xl p-5 space-y-4">
                  <div className="flex justify-between items-center border-b border-border/20 pb-2">
                    <h3 className="font-bold text-xs text-primary uppercase tracking-wider">Resources Added ({propertyResources.length})</h3>
                    <Button variant="ghost" onClick={() => setWorkflowStep(2)} className="h-6 w-6 p-0 hover:bg-sand/20 rounded-full">
                      <Edit className="h-3.5 w-3.5 text-warm-muted hover:text-primary" />
                    </Button>
                  </div>
                  {propertyResources.length === 0 ? (
                    <p className="text-xs text-warm-muted italic font-medium">No resources defined yet. Go to Step 2 to generate resources.</p>
                  ) : (
                    <div className="divide-y divide-border/20 max-h-48 overflow-y-auto pr-1">
                      {propertyResources.map((res: any) => (
                        <div key={res.id} className="py-2 flex justify-between items-center">
                          <div>
                            <p className="text-xs font-bold text-foreground">{res.name}</p>
                            <p className="text-xs text-warm-muted">Capacity: {res.capacity} pax | Buffer: {res.buffer_time_hours} hrs</p>
                          </div>
                          <Badge className="bg-primary/10 text-primary text-xs uppercase font-bold">{res.resource_type}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Rates & Cancellation */}
                <div className="bg-sand/5 border border-border/30 rounded-2xl p-5 space-y-4">
                  <div className="flex justify-between items-center border-b border-border/20 pb-2">
                    <h3 className="font-bold text-xs text-primary uppercase tracking-wider">Pricing Rates & Policies</h3>
                    <Button variant="ghost" onClick={() => setWorkflowStep(5)} className="h-6 w-6 p-0 hover:bg-sand/20 rounded-full">
                      <Edit className="h-3.5 w-3.5 text-warm-muted hover:text-primary" />
                    </Button>
                  </div>
                  
                  {/* Full Package Display */}
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex justify-between items-center shadow-inner">
                    <div>
                      <p className="text-[10px] text-primary font-black uppercase tracking-wider">Full Package Rate</p>
                      <p className="text-[10px] text-primary/70 font-bold mt-0.5">Sum of all resources & add-ons (Full Day)</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-primary font-mono tracking-tight">₹{fullPackagePrice.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-warm-muted uppercase font-bold">Refundable Security Deposit (₹)</Label>
                      <Input 
                        type="number" 
                        value={propertyForm.security_deposit} 
                        onChange={e => setPropertyForm({ ...propertyForm, security_deposit: parseFloat(e.target.value) || 0 })} 
                        className="rounded-xl border-border/70 h-8 text-xs font-mono font-bold" 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-warm-muted uppercase font-bold">Tax Percentage (%)</Label>
                      <Input 
                        type="number" 
                        value={propertyForm.tax_percentage} 
                        onChange={e => setPropertyForm({ ...propertyForm, tax_percentage: parseFloat(e.target.value) || 0 })} 
                        className="rounded-xl border-border/70 h-8 text-xs font-mono font-bold" 
                      />
                    </div>
                    <div>
                      <p className="text-xs text-warm-muted uppercase font-bold">Cancellation Allowed</p>
                      <p className="text-xs font-bold text-foreground mt-0.5">{propertyForm.cancellation_allowed ? "Yes" : "No"}</p>
                    </div>
                    {propertyForm.cancellation_allowed && (
                      <>
                        <div>
                          <p className="text-xs text-warm-muted uppercase font-bold">Cancellation Window</p>
                          <p className="text-xs font-bold text-foreground mt-0.5">{propertyForm.cancellation_hours} Hours</p>
                        </div>
                        <div>
                          <p className="text-xs text-warm-muted uppercase font-bold">Refund Percentage</p>
                          <p className="text-xs font-bold text-foreground mt-0.5">{propertyForm.refund_percentage}%</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Add-ons Offered */}
                <div className="bg-sand/5 border border-border/30 rounded-2xl p-5 space-y-4">
                  <div className="flex justify-between items-center border-b border-border/20 pb-2">
                    <h3 className="font-bold text-xs text-primary uppercase tracking-wider">Add-ons Offered</h3>
                    <Button variant="ghost" onClick={() => setWorkflowStep(5)} className="h-6 w-6 p-0 hover:bg-sand/20 rounded-full">
                      <Edit className="h-3.5 w-3.5 text-warm-muted hover:text-primary" />
                    </Button>
                  </div>
                  {addonsList.length === 0 ? (
                    <p className="text-xs text-warm-muted italic font-medium">No add-ons linked.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {addonsList.map((addon: any) => (
                        <Badge key={addon.id} className="bg-[#FAF9F6] text-primary border border-border/40 font-bold text-xs uppercase tracking-wider px-2 py-0.5 rounded-lg shadow-sm">
                          {addon.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t border-border/40 pt-4 flex justify-between bg-sand/5 p-4 rounded-b-2xl">
            <Button variant="ghost" onClick={() => setWorkflowStep(5)} className="rounded-xl font-bold text-xs">
              Back to Add-ons
            </Button>
            <Button 
              onClick={handlePublishProperty}
              className="bg-[#3D1A00] hover:bg-[#2A1200] text-white rounded-xl font-bold text-xs px-6 py-2 shadow-warm"
            >
              Save & Publish Property
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    );
  };

    // ==================== TAB 1: DASHBOARD OVERVIEW ====================
  const renderDashboardOverview = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Left Column: Properties & Charts */}
        <div className="lg:col-span-8 space-y-6">
          {/* Properties Grid Header */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-bold text-lg text-foreground tracking-tight">Samaj Active Properties</h2>
                <p className="text-xs text-warm-muted">Manage locations, assign rooms, and configure scheduling coefficients.</p>
              </div>
              <Button 
                onClick={startNewPropertyFlow}
                className="bg-primary hover:bg-primary/95 text-white rounded-xl font-bold text-xs h-9 px-4 flex items-center gap-1 shadow-sm"
              >
                <Plus className="h-4 w-4" /> Add Property
              </Button>
            </div>

            {/* Properties Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {displayedProperties.map((property, idx) => {
                const propResources = resources.filter(r => r.property === property.id);
                const propBookings = bookings.filter(b => b.property === property.id);
                const propRevenue = propBookings
                  .filter(b => ['Confirmed', 'Completed', 'Paid'].includes(b.status))
                  .reduce((sum, b) => sum + parseFloat(b.total_amount || 0), 0);

                const coverGradients = [
                  'from-amber-100 to-orange-100',
                  'from-teal-100 to-emerald-100',
                  'from-blue-100 to-indigo-100',
                  'from-rose-100 to-red-100'
                ];

                return (
                  <motion.div
                    key={property.id}
                    whileHover={{ y: -6, scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 300, damping: 22 }}
                    className="relative"
                  >
                    <Card className="overflow-hidden shadow-sm hover:shadow-xl hover:shadow-primary/5 border border-border/40 bg-card group transition-all duration-300 rounded-3xl flex flex-col justify-between min-h-[330px]">
                      {/* Image header container */}
                      <div className="h-40 bg-gradient-to-br from-sand/20 to-sand/40 relative overflow-hidden flex items-center justify-center">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent z-10" />
                        {property.photos && property.photos.length > 0 ? (
                          <img 
                            src={getImageUrl(property.photos[0])} 
                            alt="" 
                            className="w-full h-full object-cover z-0 group-hover:scale-105 transition-transform duration-700 ease-out" 
                          />
                        ) : (
                          <Building2 className="h-14 w-14 text-warm-muted/40 group-hover:scale-105 transition-transform duration-500" />
                        )}
                        
                        {/* Elegant Status Badge */}
                        <div className="absolute top-3 right-3 z-20 flex gap-1.5">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-xl shadow-sm backdrop-blur-md ${
                            property.status === 'Approved' || property.status === 'Active'
                              ? 'bg-emerald-500/90 text-white'
                              : property.status === 'Pending Approval'
                                ? 'bg-[#EA580C]/90 text-white'
                                : 'bg-red-500/90 text-white'
                          }`}>
                            {property.status}
                          </span>
                        </div>

                        {/* Hover Delete Button */}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (confirm(`Are you sure you want to delete "${property.name}"? This will remove all associated units, pricing tiers, and waitlists.`)) {
                              try {
                                await api.deleteBookingProperty(property.id);
                                toast.success("Property deleted successfully");
                                await fetchData();
                              } catch (err: any) {
                                toast.error(err.message || "Failed to delete property");
                              }
                            }
                          }}
                          className="absolute top-3 left-3 h-8 w-8 rounded-full bg-white/95 text-warm-muted hover:bg-red-50 hover:text-red-600 border border-border/20 z-20 transition-all opacity-0 group-hover:opacity-100 shadow-md flex items-center justify-center"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>

                        {/* Title text overlay on cover */}
                        <div className="absolute bottom-3 left-4 right-4 z-20">
                          <span className="text-[9px] font-bold text-white/90 uppercase tracking-widest bg-white/10 backdrop-blur-md px-2 py-0.5 rounded-md">
                            {property.property_type || "Venue"}
                          </span>
                        </div>
                      </div>
                      
                      {/* Body details */}
                      <CardHeader className="p-5 pb-2 space-y-1">
                        <h3 className="font-bold text-lg text-foreground line-clamp-1 group-hover:text-primary transition-colors duration-200">
                          {property.name}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-warm-muted font-medium">
                          <MapPin className="h-4.5 w-4.5 text-primary/70 shrink-0" />
                          <span className="truncate">{property.address ? `${property.address}, ` : ''}{property.city}, {property.state}</span>
                        </div>
                      </CardHeader>

                      <CardContent className="p-5 pt-0 pb-5 space-y-4">
                        <div className="grid grid-cols-2 gap-3 border-t border-border/25 pt-4">
                          <div className="flex items-center gap-2 bg-sand/15 rounded-2xl p-2.5 border border-border/20 shadow-sm">
                            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                              <Building2 className="h-4.5 w-4.5 text-primary" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-warm-muted font-bold uppercase tracking-wider">Capacity</span>
                              <span className="text-sm font-black text-foreground leading-tight">{propResources.length} Units</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 bg-sand/15 rounded-2xl p-2.5 border border-border/20 shadow-sm">
                            <div className="h-8 w-8 rounded-xl bg-[#EA580C]/10 flex items-center justify-center">
                              <CalendarIcon className="h-4.5 w-4.5 text-[#EA580C]" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-warm-muted font-bold uppercase tracking-wider">Booked</span>
                              <span className="text-sm font-black text-foreground leading-tight">{propBookings.length} Orders</span>
                            </div>
                          </div>
                        </div>

                        {/* Footer actions & revenue row */}
                        <div className="flex justify-between items-center pt-3 border-t border-border/25 mt-2">
                          <div className="flex flex-col">
                            <span className="text-[9px] text-warm-muted uppercase font-bold tracking-widest">Revenue Accrued</span>
                            <span className="text-lg font-black text-emerald-600 mt-0.5 font-mono">{formatCurrency(propRevenue)}</span>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedPropertyForDetails(property);
                                setIsDetailsOpen(true);
                              }}
                              className="rounded-2xl text-xs font-bold h-9 px-3.5 border-border/40 hover:bg-sand/30 hover:border-border transition-colors duration-200"
                            >
                              Details
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedPropertyForWizard(property);
                                setPropertyForm(normalizePropertyForForm(property));
                                setWorkflowStep(1);
                                setActiveTab('add-property');
                              }}
                              className="bg-primary hover:bg-primary/95 text-white rounded-2xl text-xs font-bold h-9 px-4 shadow-md transition-all duration-200"
                            >
                              Edit/Manage
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Revenue chart widget */}
          <Card className="border border-border/40 rounded-3xl bg-card shadow-sm overflow-hidden">
            <CardHeader className="border-b border-border/30 pb-3 bg-sand/5 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-foreground">Accrued Revenue Over Time</CardTitle>
                <p className="text-xs text-warm-muted">Financial metrics generated from confirmed booking orders.</p>
              </div>
              <Badge className="bg-primary/10 text-primary border-none font-bold text-xs uppercase px-2 py-0.5">Live Data</Badge>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={[
                      { name: 'Week 1', revenue: revPoints[0] },
                      { name: 'Week 2', revenue: revPoints[1] },
                      { name: 'Week 3', revenue: revPoints[2] },
                      { name: 'Week 4', revenue: revPoints[3] },
                      { name: 'Week 5', revenue: revPoints[4] }
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EBE6DF" />
                    <XAxis dataKey="name" stroke="#8A7A6E" tickLine={false} />
                    <YAxis
                      stroke="#8A7A6E"
                      tickLine={false}
                      tickFormatter={v => `₹${(v / 1000)}k`}
                    />
                    <ChartTooltip formatter={(v: any) => [`₹${v.toLocaleString()}`, 'Accrued Revenue']} />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3D1A00"
                      strokeWidth={3}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Operations, Calendar, Activities */}
        <div className="lg:col-span-4 space-y-6">
          {/* Operations Shortcuts */}
          <Card className="border border-border/40 rounded-3xl bg-card shadow-sm overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b border-border/30 bg-transparent">
              <h3 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="h-4.5 w-4.5 text-primary" /> Management Shortcuts
              </h3>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-2 gap-2 text-xs">
              <button 
                onClick={() => setActiveTab('bookings')}
                className="flex flex-col items-center justify-center p-3 border border-border/40 rounded-2xl bg-sand/5 hover:bg-sand/10 transition"
              >
                <ClipboardCheck className="h-5 w-5 text-primary mb-1" />
                <span className="font-bold">Bookings</span>
              </button>
              <button 
                onClick={() => setActiveTab('payments')}
                className="flex flex-col items-center justify-center p-3 border border-border/40 rounded-2xl bg-sand/5 hover:bg-sand/10 transition"
              >
                <Wallet className="h-5 w-5 text-primary mb-1" />
                <span className="font-bold">Payments</span>
              </button>
              <button 
                onClick={() => setActiveTab('waiting')}
                className="flex flex-col items-center justify-center p-3 border border-border/40 rounded-2xl bg-sand/5 hover:bg-sand/10 transition"
              >
                <Clock className="h-5 w-5 text-primary mb-1" />
                <span className="font-bold">Waitlist</span>
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className="flex flex-col items-center justify-center p-3 border border-border/40 rounded-2xl bg-sand/5 hover:bg-sand/10 transition"
              >
                <SettingsIcon className="h-5 w-5 text-primary mb-1" />
                <span className="font-bold">Settings</span>
              </button>
            </CardContent>
          </Card>

          {/* Mini Calendar Schedule */}
          <Card className="border border-border/40 rounded-3xl bg-card shadow-sm overflow-hidden">
            <CardHeader className="p-4 border-b border-border/30 flex flex-row items-center justify-between bg-sand/5">
              <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">Mini Schedule</h3>
              <Badge className="bg-sand text-warm-muted font-bold text-[10px] uppercase border border-border/40">June 2026</Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-warm-muted uppercase">
                <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-warm-muted">
                {Array.from({ length: 4 }).map((_, i) => (
                  <span key={`offset-${i}`} className="py-1 opacity-20">•</span>
                ))}
                {Array.from({ length: 31 }).map((_, i) => {
                  const day = i + 1;
                  const status = getDayBookingStatus(day);
                  let cellClass = "hover:bg-sand/10 rounded-md py-0.5";
                  if (status === 'booked') cellClass = "bg-primary/10 text-primary font-bold rounded-md py-0.5";
                  if (status === 'pending') cellClass = "bg-amber-500/10 text-amber-600 font-bold rounded-md py-0.5";
                  return (
                    <span key={day} className={cellClass}>{day}</span>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // ==================== TAB 2: BOOKINGS LIST ====================
  const renderBookingsTab = () => {
    return (
      <div className="space-y-6 mt-6 w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="font-bold text-lg text-foreground tracking-tight">Booking Application Requests</h2>
            <p className="text-xs text-warm-muted mt-0.5">Approve, reject, or manage member event bookings and cost breakdown validation.</p>
          </div>
          
          <div className="flex gap-2">
            {['All', 'Pending', 'Confirmed', 'Cancelled'].map((filter: any) => (
              <button
                key={filter}
                onClick={() => setBookingTabFilter(filter)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  bookingTabFilter === filter 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'bg-white text-warm-muted border border-border/50 hover:bg-sand/30'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-warm-muted" />
          <Input 
            placeholder="Search bookings by member name..." 
            value={bookingSearch}
            onChange={e => setBookingSearch(e.target.value)}
            className="pl-9 rounded-xl border-border/70 text-xs font-medium" 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Bookings Queue List */}
          <div className={`${viewingBooking ? 'lg:col-span-6' : 'lg:col-span-12'} space-y-4 transition-all duration-300 w-full`}>
            <div className="border border-border/40 rounded-3xl overflow-hidden bg-card shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-sand/15 border-b border-border/30 text-warm-muted text-xs uppercase tracking-wider font-bold">
                    <th className="px-5 py-4">Applicant Member</th>
                    <th className="px-5 py-4">Venue Property</th>
                    <th className="px-5 py-4">Assigned Dates</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Invoice Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 text-xs font-semibold">
                  {bookings
                    .filter(b => b && (bookingTabFilter === 'All' || (b.status || '').includes(bookingTabFilter)))
                    .filter(b => b && (b.user_name || '').toLowerCase().includes(bookingSearch.toLowerCase()))
                    .map(b => (
                      <tr 
                        key={b.id} 
                        onClick={() => {
                          setViewingBooking(b);
                          setTransactionIdInput(b.transaction_id || "TXN-VERIFY");
                          setAdminNotes(b.admin_notes || "");
                        }}
                        className={`hover:bg-sand/5 transition cursor-pointer ${
                          viewingBooking?.id === b.id ? 'bg-sand/10 border-l-4 border-l-primary' : ''
                        }`}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                              {b.user_name ? b.user_name.charAt(0).toUpperCase() : "M"}
                            </div>
                            <div>
                              <p className="font-bold text-foreground">{b.user_name || "Samaj Member"}</p>
                              <p className="text-xs text-warm-muted mt-0.5">{b.user_phone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-bold text-foreground">{b.property_name || "Ahir Samaj Bhavan"}</p>
                          <p className="text-xs text-warm-muted mt-0.5">{b.resource_name || "Main Banquet Hall"}</p>
                        </td>
                        <td className="px-5 py-4 font-mono text-xs">
                          {b.start_date} to {b.end_date}
                        </td>
                        <td className="px-5 py-4">
                          <Badge className={`font-bold text-[10px] uppercase tracking-wider ${
                            b.status === 'Confirmed' || b.status === 'Approved' ? 'bg-green-50 text-green-700 border border-green-200' :
                            b.status === 'Pending' || b.status === 'Pending Approval' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            {b.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-right font-black text-foreground font-mono">
                          {formatCurrency(b.total_amount)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Booking Action & Details Console Split-Pane */}
          {viewingBooking && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-6 space-y-6 w-full"
            >
              <Card className="border border-border/40 shadow-sm rounded-3xl bg-card overflow-hidden">
                <CardHeader className="bg-sand/10 border-b border-border/30 pb-5">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-sm font-black text-foreground uppercase tracking-tight flex items-center gap-1.5">
                        <ClipboardList className="h-4 w-4 text-primary" />
                        Application Console
                      </CardTitle>
                      <p className="text-xs text-warm-muted mt-0.5">Review cost breakdown and perform decisions.</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      onClick={() => setViewingBooking(null)} 
                      className="h-6 w-6 p-0 hover:bg-sand/20 rounded-full"
                    >
                      <X className="h-4 w-4 text-warm-muted" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6 text-xs font-semibold">
                  <div className="grid grid-cols-2 gap-4 border-b border-border/30 pb-4">
                    <div>
                      <span className="text-xs text-warm-muted uppercase font-bold tracking-wider">Applicant / Guest</span>
                      <p className="font-bold text-xs text-foreground mt-0.5">{viewingBooking.guest_name || viewingBooking.user_name || "Samaj Member"}</p>
                      <p className="text-xs text-warm-muted mt-0.5">Contact: {viewingBooking.guest_phone || viewingBooking.user_phone || "N/A"}</p>
                      <p className="text-xs text-warm-muted mt-0.5 break-words">Email: {viewingBooking.guest_email || viewingBooking.user_email || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-xs text-warm-muted uppercase font-bold tracking-wider">Event & Asset Details</span>
                      <p className="font-bold text-xs text-foreground mt-0.5">{viewingBooking.event_name || "No Event Name"} ({viewingBooking.event_type || "General"})</p>
                      <p className="text-xs text-warm-muted mt-0.5">Property: {viewingBooking.property_name || "Ahir Samaj Bhavan"}</p>
                      <p className="text-xs text-warm-muted mt-0.5">Asset: {viewingBooking.resource_name || "Main Hall"}</p>
                    </div>
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="space-y-2 bg-sand/5 p-4 rounded-xl border border-border/30">
                    <h4 className="font-bold text-primary text-xs uppercase tracking-wider border-b pb-1">Cost Structure</h4>
                    <div className="space-y-1.5 font-medium text-warm-muted">
                      <div className="flex justify-between">
                        <span>Base Rental Amount</span>
                        <span className="font-mono text-foreground font-bold">{formatCurrency((viewingBooking.total_amount || 0) - 6000)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Security Deposit</span>
                        <span className="font-mono text-foreground font-bold">₹5,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cleaning Fee</span>
                        <span className="font-mono text-foreground font-bold">₹1,000</span>
                      </div>
                      <div className="border-t border-border/30 pt-1.5 flex justify-between items-center text-xs font-bold text-foreground">
                        <span>Total Paid/Payable</span>
                        <span className="font-mono text-primary font-black text-sm">{formatCurrency(viewingBooking.total_amount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Decision Fields */}
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-foreground">Verification Notes (Internal)</Label>
                      <Textarea 
                        value={adminNotes} 
                        onChange={e => setAdminNotes(e.target.value)} 
                        placeholder="Write down verified bank transaction references, etc..."
                        className="rounded-xl border-border/70 min-h-16 text-xs font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-foreground">Payment Transaction Reference</Label>
                      <Input 
                        value={transactionIdInput} 
                        onChange={e => setTransactionIdInput(e.target.value)} 
                        placeholder="TXN-2026-..."
                        className="rounded-xl border-border/70 h-9 font-mono text-xs font-medium"
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t border-border/40 pt-4 flex justify-between bg-sand/5 p-4 rounded-b-2xl gap-2">
                  <Button 
                    variant="outline" 
                    onClick={async () => {
                      try {
                        await api.updateVenueBooking(viewingBooking.id, { status: "Rejected", admin_notes: adminNotes });
                        toast.success("Booking request rejected");
                        setViewingBooking(null);
                        fetchData();
                      } catch (e: any) {
                        toast.error(e.message || "Failed to reject booking");
                      }
                    }}
                    className="rounded-xl font-bold text-xs h-9 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                  >
                    Reject
                  </Button>
                  <Button 
                    onClick={async () => {
                      try {
                        await api.updateVenueBooking(viewingBooking.id, { 
                          status: "Confirmed", 
                          admin_notes: adminNotes, 
                          payment_status: "Paid",
                          transaction_id: transactionIdInput 
                        });
                        toast.success("Booking request confirmed!");
                        setViewingBooking(null);
                        fetchData();
                      } catch (e: any) {
                        toast.error(e.message || "Failed to confirm booking");
                      }
                    }}
                    className="bg-[#3D1A00] hover:bg-[#2A1200] text-white rounded-xl font-bold text-xs h-9 px-4 shadow-sm"
                  >
                    Approve & Confirm
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    );
  };

  const renderLedgerTab = () => {
    const confirmedBookings = bookings.filter(b => ['Confirmed', 'Approved', 'Paid'].includes(b.status) || b.payment_status === 'Paid');
    
    return (
      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="w-full space-y-6 mt-6"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="font-bold text-lg text-foreground tracking-tight">Confirmed Booking Ledger & Calendar</h2>
            <p className="text-xs text-warm-muted mt-0.5">Track confirmed dates, schedules, check-in operations, and occupancy statistics.</p>
          </div>
          
          {/* Sub-tab pills */}
          <div className="flex gap-1 bg-sand/15 p-1 rounded-2xl border border-border/30 bg-white">
            {[
              { id: 'list', label: 'Ledger List', icon: ClipboardList },
              { id: 'calendar', label: 'Event Schedule', icon: CalendarDays },
              { id: 'charts', label: 'Occupancy Charts', icon: TrendingUp }
            ].map((subTab) => {
              const SubIcon = subTab.icon;
              return (
                <button
                  key={subTab.id}
                  onClick={() => setLedgerSubTab(subTab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    ledgerSubTab === subTab.id 
                      ? 'bg-primary text-white shadow-sm' 
                      : 'text-warm-muted hover:bg-sand/35'
                  }`}
                >
                  <SubIcon className="h-3.5 w-3.5" />
                  {subTab.label}
                </button>
              );
            })}
          </div>
        </div>

        {ledgerSubTab === 'list' && (
          <Card className="border border-border/40 shadow-sm rounded-3xl bg-card overflow-hidden">
            <CardContent className="pt-6 space-y-6 text-xs font-semibold">
              <div className="border border-border/40 rounded-2xl overflow-hidden bg-card">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-sand/15 border-b border-border/30 text-warm-muted text-xs uppercase tracking-wider font-bold">
                      <th className="px-4 py-3.5">Booked Asset Unit</th>
                      <th className="px-4 py-3.5">Host Member</th>
                      <th className="px-4 py-3.5">Assigned Dates</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5 text-right">Invoice Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {confirmedBookings.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-warm-muted font-medium">
                          No active/confirmed bookings registered in system database.
                        </td>
                      </tr>
                    ) : (
                      confirmedBookings.map(b => (
                        <tr key={b.id} className="hover:bg-sand/5 transition">
                          <td className="px-4 py-3.5">
                            <p className="font-bold text-foreground">{b.property_name || "Ahir Samaj Bhavan"}</p>
                            <p className="text-xs text-warm-muted mt-0.5">{b.resource_name || "Main Banquet Hall"}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="font-bold text-foreground">{b.user_name || "Samaj Member"}</p>
                            <p className="text-xs text-warm-muted mt-0.5">{b.user_phone}</p>
                          </td>
                          <td className="px-4 py-3.5 font-mono">
                            {b.start_date} to {b.end_date}
                          </td>
                          <td className="px-4 py-3.5">
                            <Badge className="bg-green-50 text-green-700 border border-green-200 text-xs font-bold uppercase">
                              Paid & Verified
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5 text-right font-black text-foreground font-mono">
                            {formatCurrency(b.total_amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {ledgerSubTab === 'calendar' && (
          <Card className="border border-border/40 shadow-sm rounded-3xl bg-card overflow-hidden">
            <CardContent className="pt-6 space-y-6 text-xs font-semibold">
              <div className="border border-border/40 rounded-2xl p-5 bg-card space-y-4">
                <div className="flex justify-between items-center border-b border-border/30 pb-3">
                  <h3 className="font-bold text-sm text-foreground">Surat properties Schedule - June 2026</h3>
                  <div className="flex gap-1.5 text-xs font-bold">
                    <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-primary" /> Booked</div>
                    <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Pending</div>
                    <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-300" /> Free</div>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-warm-muted uppercase tracking-wider">
                  <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
                </div>

                <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-warm-muted min-h-64">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={`offset-${i}`} className="bg-sand/5 rounded-xl border border-dashed border-border/20 p-2 text-warm-muted/30 flex items-center justify-center font-mono">
                      •
                    </div>
                  ))}

                  {Array.from({ length: 31 }).map((_, i) => {
                    const day = i + 1;
                    const status = getDayBookingStatus(day);
                    const isToday = day === 18;
                    
                    let cellClass = "bg-sand/5 hover:bg-sand/15 border border-border/20 text-warm-muted";
                    if (status === 'booked') cellClass = "bg-primary/10 border-primary text-primary hover:bg-primary/15";
                    if (status === 'pending') cellClass = "bg-amber-500/10 border-amber-500 text-amber-700 hover:bg-amber-500/15";
                    
                    return (
                      <div 
                        key={day} 
                        className={`rounded-xl p-2.5 transition flex flex-col justify-between items-center min-h-12 border ${cellClass} ${
                          isToday ? 'ring-2 ring-primary ring-offset-2' : ''
                        }`}
                      >
                        <span className="font-bold font-mono">{day}</span>
                        {status !== 'available' && (
                          <span className={`w-1.5 h-1.5 rounded-full mt-1 ${
                            status === 'booked' ? 'bg-primary animate-pulse' : 'bg-amber-500'
                          }`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {ledgerSubTab === 'charts' && (
          <Card className="border border-border/40 shadow-sm rounded-3xl bg-card overflow-hidden">
            <CardContent className="pt-6 space-y-6 text-xs font-semibold">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-sand/10 p-4 border border-border/30 rounded-2xl flex flex-col justify-between">
                  <div>
                    <span className="text-xs text-warm-muted uppercase font-bold tracking-wider block">Total Booked Days</span>
                    <span className="text-3xl font-black text-foreground mt-1 block">184 Days</span>
                  </div>
                  <p className="text-xs text-green-600 font-semibold flex items-center gap-0.5 mt-2">
                    <TrendingUp className="h-3 w-3" /> +14.5% vs last year
                  </p>
                </div>

                <div className="bg-sand/10 p-4 border border-border/30 rounded-2xl flex flex-col justify-between">
                  <div>
                    <span className="text-xs text-warm-muted uppercase font-bold tracking-wider block">Gross Ledger Revenue</span>
                    <span className="text-3xl font-black text-foreground mt-1 block">{formatCurrency(totalRevenueSum)}</span>
                  </div>
                  <p className="text-xs text-green-600 font-semibold flex items-center gap-0.5 mt-2">
                    <TrendingUp className="h-3 w-3" /> +28% vs last month
                  </p>
                </div>

                <div className="bg-sand/10 p-4 border border-border/30 rounded-2xl flex flex-col justify-between">
                  <div>
                    <span className="text-xs text-warm-muted uppercase font-bold tracking-wider block">Average Occupancy</span>
                    <span className="text-3xl font-black text-foreground mt-1 block">{occupancyRate || 82}%</span>
                  </div>
                  <p className="text-xs text-green-600 font-semibold flex items-center gap-0.5 mt-2">
                    <TrendingUp className="h-3 w-3" /> Peak season demand
                  </p>
                </div>
              </div>

              <div className="border border-border/40 rounded-2xl p-4 bg-card">
                <h4 className="font-bold text-xs text-foreground mb-4 uppercase tracking-wider">Revenue Accruals Trend - June 2026</h4>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={[
                        { name: 'Week 1', revenue: revPoints[0] },
                        { name: 'Week 2', revenue: revPoints[1] },
                        { name: 'Week 3', revenue: revPoints[2] },
                        { name: 'Week 4', revenue: revPoints[3] },
                        { name: 'Week 5', revenue: revPoints[4] }
                      ]}
                      margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EBE6DF" />
                      <XAxis dataKey="name" stroke="#8A7A6E" tickLine={false} />
                      <YAxis
                        stroke="#8A7A6E"
                        tickLine={false}
                        tickFormatter={v => `₹${(v / 1000)}k`}
                      />
                      <ChartTooltip formatter={(v: any) => [`₹${v.toLocaleString()}`, 'Accrued Revenue']} />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="#3D1A00"
                        strokeWidth={3}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    );
  };
  // ==================== TAB 3: PAYMENTS VERIFICATION ====================
  const renderPaymentsTab = () => {
    const paymentPendingBookings = bookings.filter(b => b.payment_status === "Payment Submitted" || b.status === "Pending Approval");
    return (
      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="w-full space-y-6 mt-6"
      >
        <div>
          <h2 className="font-bold text-lg text-foreground tracking-tight">Manual Payments & Bank Transfers Verification</h2>
          <p className="text-xs text-warm-muted mt-0.5">Verify bank transaction references and receipt uploads submitted by samaj members.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List queue */}
          <div className="lg:col-span-2 space-y-4">
            <div className="border border-border/40 rounded-3xl overflow-hidden bg-card shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-sand/15 border-b border-border/30 text-warm-muted text-xs uppercase tracking-wider font-bold">
                    <th className="px-4 py-3">Member Details</th>
                    <th className="px-4 py-3">Reference TXN</th>
                    <th className="px-4 py-3">Invoice</th>
                    <th className="px-4 py-3 text-right">Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {paymentPendingBookings.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-warm-muted font-semibold">
                        No pending bank transactions to verify currently.
                      </td>
                    </tr>
                  ) : (
                    paymentPendingBookings.map(b => (
                      <tr key={b.id} className="hover:bg-sand/5 transition">
                        <td className="px-4 py-3">
                          <p className="font-bold text-foreground">{b.user_name || "Samaj Member"}</p>
                          <p className="text-xs text-warm-muted mt-0.5">{b.user_phone}</p>
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {b.transaction_id || "TXN-NOT-PROVIDED"}
                        </td>
                        <td className="px-4 py-3 font-bold text-foreground">
                          {formatCurrency(b.total_amount)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button 
                            onClick={() => {
                              setViewingBooking(b);
                              setTransactionIdInput(b.transaction_id || "TXN-VERIFY");
                            }}
                            className="bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold h-7 px-3 shadow-sm"
                          >
                            Verify
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Pane */}
          {viewingBooking && (
            <div className="bg-card border border-border/40 rounded-3xl p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-foreground text-xs uppercase tracking-wider border-b pb-2">Verify Transaction</h3>
              
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-warm-muted block font-bold uppercase tracking-wider">Member Details</span>
                  <p className="font-bold text-foreground mt-0.5">{viewingBooking.user_name}</p>
                  <p className="text-xs text-warm-muted">{viewingBooking.user_phone}</p>
                </div>

                <div>
                  <span className="text-xs text-warm-muted block font-bold uppercase tracking-wider">Total Payable Surcharges</span>
                  <p className="font-mono font-black text-primary text-base mt-0.5">{formatCurrency(viewingBooking.total_amount)}</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-warm-muted uppercase font-bold">Transaction Reference ID</Label>
                  <Input 
                    value={transactionIdInput}
                    onChange={e => setTransactionIdInput(e.target.value)}
                    className="rounded-xl font-mono text-xs h-9"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      toast.info("Payment reference rejected. Notification sent to member.");
                      setViewingBooking(null);
                    }}
                    className="flex-1 rounded-xl text-xs font-bold h-9 text-red-600 border-red-200"
                  >
                    Reject payment
                  </Button>
                  <Button 
                    onClick={async () => {
                      try {
                        await api.updateVenueBooking(viewingBooking.id, { 
                          payment_status: "Paid", 
                          transaction_id: transactionIdInput,
                          status: "Confirmed"
                        });
                        toast.success("Payment verified. Booking confirmed & ledger updated!");
                        fetchData();
                        setViewingBooking(null);
                      } catch (e: any) {
                        toast.error("Failed to approve transaction payment");
                      }
                    }}
                    className="flex-1 bg-primary text-white rounded-xl text-xs font-bold h-9"
                  >
                    Confirm Paid
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  // ==================== TAB 4: WAITING LIST ====================
  const renderWaitingListTab = () => {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="w-full space-y-6 mt-6"
      >
        <div>
          <h2 className="font-bold text-lg text-foreground tracking-tight">Active Date waitlists</h2>
          <p className="text-xs text-warm-muted mt-0.5">Manage queue priorities for overlapping venue booking dates requested by members.</p>
        </div>

        <div className="border border-border/40 rounded-3xl overflow-hidden bg-card shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-sand/15 border-b border-border/30 text-warm-muted text-xs uppercase tracking-wider font-bold">
                <th className="px-5 py-4">Queue Index</th>
                <th className="px-5 py-4">Samaj Applicant</th>
                <th className="px-5 py-4">Target Resource</th>
                <th className="px-5 py-4">Requested Dates</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 font-semibold">
              {waitingList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-warm-muted font-medium">
                    No Samaj members on waiting list queues currently.
                  </td>
                </tr>
              ) : (
                waitingList.map((wait, idx) => (
                  <tr key={wait.id} className="hover:bg-sand/5 transition">
                    <td className="px-5 py-4 font-mono font-bold text-primary">
                      #{idx + 1}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-foreground">{wait.user_name || "Samaj Member"}</p>
                      <p className="text-xs text-warm-muted mt-0.5">{wait.user_phone}</p>
                    </td>
                    <td className="px-5 py-4 text-foreground">
                      {wait.resource_name || "Main Banquet Hall"}
                    </td>
                    <td className="px-5 py-4 font-mono text-warm-muted">
                      {wait.start_date} to {wait.end_date}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button 
                        onClick={() => {
                          toast.success("Member promoted to primary booking spot");
                        }}
                        className="bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold h-7 px-3 shadow-sm"
                      >
                        Promote Spot
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    );
  };

  // ==================== SUPER ADMIN RENDER FUNCTIONS ====================

  const ImageCarousel = ({ photos }: { photos: string[] }) => {
    const [[page, direction], setPage] = useState([0, 0]);

    if (!photos || photos.length === 0) {
      return (
        <div className="aspect-[16/9] w-full rounded-2xl border border-dashed border-border/60 bg-sand/5 flex flex-col items-center justify-center text-warm-muted gap-2">
          <ImageIcon className="h-10 w-10 text-warm-muted/40" />
          <p className="text-xs font-semibold">No photos uploaded for this property</p>
        </div>
      );
    }

    const imageIndex = (page % photos.length + photos.length) % photos.length;

    const paginate = (newDirection: number) => {
      setPage([page + newDirection, newDirection]);
    };

    const slideVariants = {
      enter: (direction: number) => ({
        x: direction > 0 ? 500 : -500,
        opacity: 0
      }),
      center: {
        zIndex: 1,
        x: 0,
        opacity: 1
      },
      exit: (direction: number) => ({
        zIndex: 0,
        x: direction < 0 ? 500 : -500,
        opacity: 0
      })
    };

    return (
      <div className="relative aspect-[16/9] w-full rounded-3xl overflow-hidden border border-border/40 bg-card group shadow-md">
        <AnimatePresence initial={false} custom={direction}>
          <motion.img
            key={page}
            src={getImageUrl(photos[imageIndex])}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            className="absolute inset-0 w-full h-full object-cover cursor-zoom-in"
            onClick={() => setLightboxImage(getImageUrl(photos[imageIndex]))}
          />
        </AnimatePresence>

        {photos.length > 1 && (
          <>
            {/* Navigation Arrows */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                paginate(-1);
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white text-foreground rounded-full p-2.5 shadow-md hover:scale-105 transition-all duration-200 focus:outline-none flex items-center justify-center border border-border/20"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                paginate(1);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white text-foreground rounded-full p-2.5 shadow-md hover:scale-105 transition-all duration-200 focus:outline-none flex items-center justify-center border border-border/20"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Dots Indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 bg-black/25 px-3 py-1.5 rounded-full backdrop-blur-sm">
              {photos.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    const diff = i - imageIndex;
                    if (diff !== 0) {
                      paginate(diff);
                    }
                  }}
                  className={`h-2 w-2 rounded-full transition-all duration-300 ${
                    imageIndex === i ? 'bg-white w-4' : 'bg-white/50 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Zoom Overlay Indicator */}
        <div className="absolute top-4 right-4 bg-white/95 text-foreground px-3 py-1.5 rounded-xl text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none flex items-center gap-1 shadow-sm border border-border/20">
          <Eye className="h-3.5 w-3.5" /> Click for Fullscreen
        </div>
      </div>
    );
  };

  const renderPropertyDetailsContent = (property: any) => {
    if (!property) return null;
    const propResources = resources.filter(r => String(r.property) === String(property.id));

    return (
      <div className="space-y-6 text-xs font-semibold text-foreground">
        
        {/* Image Carousel */}
        <ImageCarousel photos={property.photos || []} />

        {/* 1. CORE STATS GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#FAF9F6] border border-border/40 p-3 rounded-2xl flex flex-col justify-between shadow-sm">
            <span className="text-[10px] text-warm-muted uppercase tracking-wider block font-bold">Ownership</span>
            <span className="text-xs font-black mt-1 text-primary">{property.ownership || "Community Owned"}</span>
          </div>
          <div className="bg-[#FAF9F6] border border-border/40 p-3 rounded-2xl flex flex-col justify-between shadow-sm">
            <span className="text-[10px] text-warm-muted uppercase tracking-wider block font-bold">Security Deposit</span>
            <span className="text-xs font-black mt-1 text-primary">₹{property.security_deposit || 0}</span>
          </div>
          <div className="bg-[#FAF9F6] border border-border/40 p-3 rounded-2xl flex flex-col justify-between shadow-sm">
            <span className="text-[10px] text-warm-muted uppercase tracking-wider block font-bold">Refund Policy</span>
            <span className="text-xs font-black mt-1 text-primary">
              {property.cancellation_allowed ? `${property.refund_percentage || 100}% Refund` : "No Refund"}
            </span>
          </div>
          <div className="bg-[#FAF9F6] border border-border/40 p-3 rounded-2xl flex flex-col justify-between shadow-sm">
            <span className="text-[10px] text-warm-muted uppercase tracking-wider block font-bold">Cancellation Window</span>
            <span className="text-xs font-black mt-1 text-primary">
              {property.cancellation_allowed ? `Up to ${property.cancellation_hours || 24} hrs` : "N/A"}
            </span>
          </div>
        </div>

        {/* 2. BOOKING POLICIES / GATES */}
        <div className="bg-[#FAF9F6] border border-border/40 p-4 rounded-2xl space-y-2 shadow-sm">
          <h4 className="text-[10px] text-warm-muted font-black uppercase tracking-wider">Booking Configuration & Policies</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${property.approval_required ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              <span>{property.approval_required ? 'Admin Approval Required' : 'Instant Bookings Enabled'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${property.manual_payment_allowed ? 'bg-emerald-500' : 'bg-gray-400'}`} />
              <span>{property.manual_payment_allowed ? 'Manual Payments Accepted' : 'Online Only'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${property.cancellation_allowed ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span>{property.cancellation_allowed ? 'Cancellation Allowed' : 'No Cancellation'}</span>
            </div>
          </div>
        </div>

        {/* 3. DESCRIPTION & RULES */}
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-[10px] text-warm-muted font-black uppercase tracking-wider">Overview Description</h4>
            <div className="bg-[#FAF9F6] border border-border/30 p-3.5 rounded-2xl text-xs font-medium text-foreground leading-relaxed whitespace-pre-wrap shadow-inner">
              {property.description || "No overview description provided."}
            </div>
          </div>

          <div className="space-y-1">
            <h4 className="text-[10px] text-warm-muted font-black uppercase tracking-wider">Rules & Policies</h4>
            <div className="bg-[#FAF9F6] border border-border/30 p-3.5 rounded-2xl text-xs font-medium text-foreground leading-relaxed whitespace-pre-wrap shadow-inner">
              {property.rules || "No specific rules configured."}
            </div>
          </div>

          {property.terms_conditions && (
            <div className="space-y-1">
              <h4 className="text-[10px] text-warm-muted font-black uppercase tracking-wider">Terms & Conditions</h4>
              <div className="bg-[#FAF9F6] border border-border/30 p-3.5 rounded-2xl text-xs font-medium text-foreground leading-relaxed whitespace-pre-wrap shadow-inner">
                {property.terms_conditions}
              </div>
            </div>
          )}

          {(() => {
            if (!property.internal_notes) return null;
            let parsedNotes: any = null;
            try {
              parsedNotes = JSON.parse(property.internal_notes);
            } catch (e) {
              // Not JSON
            }

            if (parsedNotes && Array.isArray(parsedNotes.addons) && parsedNotes.addons.length > 0) {
              return (
                <div className="space-y-2">
                  <h4 className="text-[10px] text-warm-muted font-black uppercase tracking-wider text-amber-700">Configured Add-ons</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {parsedNotes.addons.map((addon: any, idx: number) => (
                      <div key={idx} className="bg-amber-50/50 border border-amber-200/50 p-3 rounded-2xl shadow-sm flex flex-col gap-1.5">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-amber-900 text-sm">{addon.name}</span>
                          {addon.deposit_amount && addon.deposit_amount !== "0" && addon.deposit_amount !== 0 && (
                            <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-lg font-bold">
                              Deposit: ₹{addon.deposit_amount}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[10px] text-amber-800">
                          {addon.hourly_rate && addon.hourly_rate !== "0" && addon.hourly_rate !== 0 && (
                            <div>
                              <span className="uppercase tracking-wider font-bold block opacity-60">Hourly</span>
                              <span className="font-black text-amber-900 text-xs">₹{addon.hourly_rate}</span>
                            </div>
                          )}
                          {addon.half_day_rate && addon.half_day_rate !== "0" && addon.half_day_rate !== 0 && (
                            <div>
                              <span className="uppercase tracking-wider font-bold block opacity-60">Half Day ({addon.half_day_hours || 6}h)</span>
                              <span className="font-black text-amber-900 text-xs">₹{addon.half_day_rate}</span>
                            </div>
                          )}
                          {addon.full_day_rate && addon.full_day_rate !== "0" && addon.full_day_rate !== 0 && (
                            <div>
                              <span className="uppercase tracking-wider font-bold block opacity-60">Full Day</span>
                              <span className="font-black text-amber-900 text-xs">₹{addon.full_day_rate}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            // Fallback for normal text notes
            return (
              <div className="space-y-1">
                <h4 className="text-[10px] text-warm-muted font-black uppercase tracking-wider text-amber-700">Internal Admin Notes</h4>
                <div className="bg-amber-50/50 border border-amber-200/50 p-3.5 rounded-2xl text-xs font-medium text-amber-900 leading-relaxed whitespace-pre-wrap shadow-inner">
                  {property.internal_notes}
                </div>
              </div>
            );
          })()}
        </div>

        {/* 4. AMENITIES */}
        {property.amenities && property.amenities.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-[10px] text-warm-muted font-black uppercase tracking-wider">Available Amenities</h4>
            <div className="flex flex-wrap gap-1.5">
              {property.amenities.map((amenity: string, i: number) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-sm"
                >
                  <Check className="h-3 w-3 text-primary" />
                  {amenity}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* 5. LOCATION & CONTACT INFORMATION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border/40 pt-4">
          <div className="space-y-2.5">
            <h4 className="text-[10px] text-warm-muted font-black uppercase tracking-wider">Location Details</h4>
            <div className="bg-[#FAF9F6] border border-border/30 p-3.5 rounded-2xl space-y-2 shadow-sm font-semibold">
              <p className="text-foreground leading-relaxed">
                {property.address}<br />
                {property.city}, {property.state} - {property.pincode}<br />
                {property.country}
              </p>
              {property.google_map_url && (
                <a
                  href={property.google_map_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-primary hover:underline text-[11px] font-bold pt-1"
                >
                  <MapPin className="h-3.5 w-3.5" /> View on Google Maps
                </a>
              )}
              {(property.latitude || property.longitude) && (
                <div className="text-[10px] text-warm-muted pt-1 flex gap-3">
                  <span>Lat: <strong className="text-foreground">{property.latitude || "N/A"}</strong></span>
                  <span>Lng: <strong className="text-foreground">{property.longitude || "N/A"}</strong></span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2.5">
            <h4 className="text-[10px] text-warm-muted font-black uppercase tracking-wider">Contact Directory</h4>
            <div className="bg-[#FAF9F6] border border-border/30 p-3.5 rounded-2xl space-y-2 shadow-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary/70 shrink-0" />
                <div>
                  <p className="text-[10px] text-warm-muted uppercase">Contact Person</p>
                  <p className="text-foreground font-black">{property.contact_person_name || "N/A"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary/70 shrink-0" />
                <div>
                  <p className="text-[10px] text-warm-muted uppercase">Primary Phone</p>
                  <p className="text-foreground font-black">{property.contact_phone || "N/A"}</p>
                </div>
              </div>
              {property.alternate_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary/70 shrink-0" />
                  <div>
                    <p className="text-[10px] text-warm-muted uppercase">Alternate Phone</p>
                    <p className="text-foreground font-black">{property.alternate_phone}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary/70 shrink-0" />
                <div>
                  <p className="text-[10px] text-warm-muted uppercase">Email Address</p>
                  <p className="text-foreground font-black">{property.contact_email || "N/A"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 6. GENERATED RESOURCES & RATES */}
        <div className="space-y-2.5 border-t border-border/40 pt-4">
          <h4 className="text-[10px] text-warm-muted font-black uppercase tracking-wider">Associated Resource Units ({propResources.length})</h4>
          {propResources.length === 0 ? (
            <p className="text-xs text-warm-muted italic bg-[#FAF9F6] p-4 rounded-2xl border border-dashed border-border/40 text-center">
              No resource units generated for this property.
            </p>
          ) : (
            <div className="border border-border/40 rounded-2xl overflow-hidden bg-card text-xs shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-sand/15 border-b border-border/30 text-warm-muted font-bold text-[10px] uppercase">
                    <th className="px-4 py-2.5">Resource Name</th>
                    <th className="px-4 py-2.5">Type</th>
                    <th className="px-4 py-2.5">Max Capacity</th>
                    <th className="px-4 py-2.5">Pricing Rates (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 font-semibold text-foreground">
                  {propResources.map((r: any) => (
                    <tr key={r.id} className="hover:bg-sand/5">
                      <td className="px-4 py-3 font-bold text-foreground">{r.name}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="bg-sand/20 text-warm-muted border border-border/30 text-[9px] font-bold uppercase">{r.resource_type}</Badge>
                      </td>
                      <td className="px-4 py-3 font-mono">{r.capacity} Pax</td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5 text-[10px] font-mono text-warm-muted">
                          {r.hourly_rate > 0 && <div><span className="font-bold text-foreground">₹{r.hourly_rate}</span>/hr</div>}
                          {r.half_day_rate > 0 && <div><span className="font-bold text-foreground">₹{r.half_day_rate}</span>/half</div>}
                          {r.full_day_rate > 0 && <div><span className="font-bold text-foreground">₹{r.full_day_rate}</span>/day</div>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDetailSheetForSuperAdmin = () => {
    if (!selectedPropertyForDetails) return null;

    return (
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="sm:max-w-3xl w-full overflow-y-auto bg-card border-l border-border/70 p-6 space-y-6">
          <SheetHeader className="text-left space-y-2 border-b border-border/60 pb-4">
            <div className="flex items-center justify-between">
              <Badge className="bg-primary text-white font-bold uppercase text-xs tracking-wider">
                {selectedPropertyForDetails.property_type}
              </Badge>
              <Badge className={`font-bold uppercase text-xs tracking-wider ${
                selectedPropertyForDetails.status === "Approved" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                selectedPropertyForDetails.status === "Rejected" ? "bg-rose-50 text-rose-700 border border-rose-200" :
                "bg-amber-50 text-amber-700 border border-amber-200"
              }`}>
                {selectedPropertyForDetails.status}
              </Badge>
            </div>
            <SheetTitle className="text-2xl font-bold text-foreground mt-1">
              {selectedPropertyForDetails.name}
            </SheetTitle>
            <p className="text-xs text-[#EA580C] font-bold">
              Submitted by community: {selectedPropertyForDetails.community_name || "Community Admin"}
            </p>
            <SheetDescription className="text-xs text-warm-muted flex items-center gap-1 mt-0.5 font-semibold">
              <MapPin className="h-3.5 w-3.5 text-primary/70" /> 
              {selectedPropertyForDetails.address}, {selectedPropertyForDetails.city}, {selectedPropertyForDetails.state}, {selectedPropertyForDetails.pincode}
            </SheetDescription>
          </SheetHeader>

          {/* Core Property Details Render */}
          {renderPropertyDetailsContent(selectedPropertyForDetails)}

          {/* Action buttons inside the sheet */}
          <div className="border-t border-border/40 pt-5 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsDetailsOpen(false)}
              className="rounded-xl font-bold text-xs h-10 px-5"
            >
              Close
            </Button>
            {selectedPropertyForDetails.status === 'Pending Approval' && (
              <>
                <Button
                  onClick={async () => {
                    try {
                      await api.approveBookingProperty(selectedPropertyForDetails.id);
                      toast.success(`Property "${selectedPropertyForDetails.name}" approved successfully!`);
                      setIsDetailsOpen(false);
                      fetchData();
                    } catch (e: any) {
                      toast.error(e.message || "Failed to approve property");
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl h-10 px-5 shadow-sm"
                >
                  Approve Property
                </Button>
                <Button
                  onClick={() => {
                    setPropertyToReject(selectedPropertyForDetails);
                    setRejectReasonInput("");
                    setIsRejectDialogOpen(true);
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl h-10 px-5 shadow-sm"
                >
                  Reject Property
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    );
  };

  const renderRejectReasonDialog = () => {
    return (
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card border border-border/40 p-6 space-y-4 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black tracking-tight text-foreground uppercase">
              Reject Property Submission
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-xs font-semibold text-warm-muted">
            <p>Please enter a rejection reason. This will be sent back to the community admin to help them make the necessary adjustments.</p>
            <Textarea
              placeholder="e.g. Please upload higher resolution cover photos and correct the pricing structure for halls."
              value={rejectReasonInput}
              onChange={(e) => setRejectReasonInput(e.target.value)}
              className="h-24 rounded-xl border border-border/70 text-xs font-medium text-foreground outline-none"
            />
          </div>
          <DialogFooter className="flex gap-2 justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => setIsRejectDialogOpen(false)}
              className="rounded-xl font-bold text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!rejectReasonInput.trim()) {
                  toast.error("Rejection reason is required");
                  return;
                }
                try {
                  await api.rejectBookingProperty(propertyToReject.id, { rejection_reason: rejectReasonInput.trim() });
                  toast.success(`Property "${propertyToReject.name}" rejected successfully.`);
                  setIsRejectDialogOpen(false);
                  setIsDetailsOpen(false);
                  fetchData();
                } catch (e: any) {
                  toast.error(e.message || "Failed to reject property");
                }
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl h-9"
            >
              Reject Submission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const renderSuperAdminApprovalView = () => {
    const filteredProps = properties.filter((p: any) => {
      if (approvalFilter === 'All') return true;
      return p.status === approvalFilter;
    });

    const pendingCount = properties.filter((p: any) => p.status === 'Pending Approval').length;
    const approvedCount = properties.filter((p: any) => p.status === 'Approved').length;
    const rejectedCount = properties.filter((p: any) => p.status === 'Rejected').length;

    return (
      <div className="flex flex-col min-h-screen bg-[#FAF9F6] pb-12 font-sans w-full px-6 md:px-8 pt-6">
        {/* Header Row */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-5">
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
              <ShieldAlert className="h-6.5 w-6.5 text-[#3D1A00]" />
              Superadmin Property Approval Workspace
            </h1>
            <p className="text-xs text-warm-muted mt-1 font-bold">
              Review, approve, or reject property listings submitted by community admins. Approved properties will be visible to members.
            </p>
          </div>
        </div>

        {/* Tab Filter Row */}
        <div className="flex gap-2 p-1.5 bg-sand/20 rounded-2xl overflow-x-auto scrollbar-none border border-border/40 mt-6 bg-white shadow-sm w-full max-w-lg">
          {[
            { id: 'Pending Approval', label: `Pending (${pendingCount})`, icon: Clock },
            { id: 'Approved', label: `Approved (${approvedCount})`, icon: CheckCircle2 },
            { id: 'Rejected', label: `Rejected (${rejectedCount})`, icon: AlertCircle },
            { id: 'All', label: `All (${properties.length})`, icon: List }
          ].map(tab => {
            const isActive = approvalFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setApprovalFilter(tab.id as any)}
                className="relative px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap focus:outline-none flex-1"
              >
                {isActive && (
                  <motion.div
                    layoutId="activeApprovalIndicator"
                    className="absolute inset-0 bg-[#FAF9F6] border border-border/50 rounded-xl shadow-sm"
                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                  />
                )}
                <span className={`relative z-10 flex items-center justify-center gap-1.5 transition-colors duration-200 ${
                  isActive ? 'text-primary' : 'text-warm-muted hover:text-foreground'
                }`}>
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Main Properties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {filteredProps.length === 0 ? (
            <div className="col-span-full py-16 flex flex-col items-center justify-center text-center bg-white border border-border/40 rounded-3xl shadow-sm">
              <Building2 className="h-12 w-12 text-warm-muted/40 mb-3" />
              <h3 className="text-sm font-black text-foreground uppercase tracking-tight">No Properties Found</h3>
              <p className="text-xs text-warm-muted mt-1 max-w-md px-4">
                There are currently no properties in the "{approvalFilter}" state.
              </p>
            </div>
          ) : (
            filteredProps.map((property: any) => {
              const coverPhoto = property.photos && property.photos.length > 0 ? getImageUrl(property.photos[0]) : null;
              const propResources = resources.filter(r => String(r.property) === String(property.id));
              
              return (
                <motion.div
                  key={property.id}
                  whileHover={{ y: -4 }}
                  className="bg-white border border-border/40 rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between min-h-[300px]"
                >
                  <div>
                    {/* Property Image Header */}
                    <div className="h-40 bg-sand/10 relative overflow-hidden flex items-center justify-center border-b border-border/30">
                      {coverPhoto ? (
                        <img src={coverPhoto} alt={property.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center text-warm-muted/40">
                          <Building2 className="h-10 w-10" />
                          <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">No Cover Image</span>
                        </div>
                      )}
                      
                      {/* Community Badge */}
                      <Badge className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm text-foreground hover:bg-white border border-border/40 text-[10px] font-bold shadow-sm rounded-xl">
                        {property.community_name || "Community Listing"}
                      </Badge>
                      
                      {/* Status Pill */}
                      <Badge className={`absolute top-3 right-3 text-[10px] font-bold shadow-sm rounded-xl uppercase tracking-wider ${
                        property.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        property.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {property.status}
                      </Badge>
                    </div>

                    {/* Card Content */}
                    <div className="p-5 space-y-3">
                      <div>
                        <span className="text-[10px] bg-primary/10 text-primary font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                          {property.property_type}
                        </span>
                        <h3 className="text-base font-black text-foreground tracking-tight mt-1 truncate">
                          {property.name}
                        </h3>
                        <p className="text-xs text-warm-muted flex items-center gap-1 mt-0.5 truncate font-semibold">
                          <MapPin className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                          {property.address}, {property.city}
                        </p>
                      </div>

                      {/* Info Row */}
                      <div className="flex items-center justify-between text-[11px] text-warm-muted border-t border-border/20 pt-2 font-semibold">
                        <span>Resources: <strong className="text-foreground">{propResources.length} units</strong></span>
                        <span>Security Dep: <strong className="text-foreground">₹{property.security_deposit || 0}</strong></span>
                      </div>

                      {property.rejection_reason && (
                        <div className="bg-rose-50/50 border border-rose-100 p-2.5 rounded-xl text-[11px] text-rose-800">
                          <span className="font-bold uppercase tracking-wider block text-[9px] text-rose-600 mb-0.5">Rejection Reason</span>
                          {property.rejection_reason}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-4 bg-sand/5 border-t border-border/20 flex gap-2">
                    <Button
                      onClick={() => {
                        setSelectedPropertyForDetails(property);
                        setIsDetailsOpen(true);
                      }}
                      className="flex-1 bg-white hover:bg-sand/10 border border-border/50 text-foreground font-bold text-xs rounded-xl h-9 shadow-sm"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" /> View Details
                    </Button>

                    {property.status === 'Pending Approval' && (
                      <>
                        <Button
                          onClick={async () => {
                            try {
                              await api.approveBookingProperty(property.id);
                              toast.success(`Property "${property.name}" approved successfully!`);
                              fetchData();
                            } catch (e: any) {
                              toast.error(e.message || "Failed to approve property");
                            }
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl h-9 px-3.5 shadow-sm"
                        >
                          Approve
                        </Button>
                        <Button
                          onClick={() => {
                            setPropertyToReject(property);
                            setRejectReasonInput("");
                            setIsRejectDialogOpen(true);
                          }}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl h-9 px-3.5 shadow-sm"
                        >
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Detailed Sheet (Slide Over) */}
        {renderDetailSheetForSuperAdmin()}

        {/* Reject Dialog */}
        {renderRejectReasonDialog()}
      </div>
    );
  };

  // ==================== MAIN RENDER LAYOUT ====================

  if (isSuperAdmin) {
    return renderSuperAdminApprovalView();
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF9F6] pb-12 font-sans w-full px-6 md:px-8 pt-6">
      
      {/* ================= 1. HEADER ROW ================= */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Building2 className="h-6.5 w-6.5 text-[#3D1A00]" />
            we Are United Property Console
          </h1>
          <p className="text-xs text-warm-muted mt-1 font-bold">
            Samaj Property Extranet Management Studio • conflict-free schedule engines.
          </p>
        </div>

        {/* Right Search Input Box */}
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-warm-muted" />
            <Input 
              placeholder="Search assets or bookings... ⌘K" 
              className="pl-9 pr-8 py-2 rounded-xl border-border/70 bg-card text-xs focus-visible:ring-primary/20 w-full"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-warm-muted/10 border border-border/50 text-xs text-warm-muted px-1.5 py-0.5 rounded font-mono pointer-events-none">
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      {/* ================= 2. TAB CONTROLLER ROW ================= */}
      <div className="flex gap-2 p-1.5 bg-sand/20 rounded-2xl overflow-x-auto scrollbar-none border border-border/40 mt-6 bg-white shadow-sm w-full relative">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'add-property', label: 'Add/Edit Property', icon: Sparkles },
          { id: 'bookings', label: 'Applications & Decisions', icon: ClipboardList },
          { id: 'ledger', label: 'Confirmed Ledger', icon: CheckCircle2 },
          { id: 'payments', label: 'Bank Transfers', icon: Wallet },
          { id: 'waiting', label: 'Date Waitlists', icon: Clock }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as LocalTab);
                if (tab.id === 'add-property') {
                  setWorkflowStep(1);
                }
              }}
              className="relative px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap focus:outline-none"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-[#FAF9F6] border border-border/50 rounded-xl shadow-sm"
                  transition={{ type: "spring", stiffness: 350, damping: 28 }}
                />
              )}
              <span className={`relative z-10 flex items-center gap-2 transition-colors duration-200 ${
                isActive ? 'text-primary' : 'text-warm-muted hover:text-foreground'
              }`}>
                <tab.icon className="h-4.5 w-4.5 text-primary" />
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ================= 3. RENDERING ACTIVE VIEWS ================= */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
          className="flex-1"
        >
          {activeTab === 'overview' && renderDashboardOverview()}

          {/* 12-Step Wizard Layout */}
          {activeTab === 'add-property' && (
            <div className="space-y-6 mt-6">
              {/* Horizontal Timeline Track without Outer Card Container */}
              <div className="relative flex items-center justify-between w-full overflow-x-auto pb-6 pt-6 px-4 scrollbar-none gap-8 md:gap-12">
                {/* Background Track Line - Changed to z-0 so it is visible but behind circles */}
                <div className="absolute top-[37px] left-8 right-8 h-[3px] bg-border/40 z-0 rounded-full">
                  <motion.div 
                    className="h-full bg-emerald-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${((workflowStep - 1) / 6) * 100}%` }}
                    transition={{ duration: 0.35, ease: "easeInOut" }}
                  />
                </div>
                
                {[
                  { step: 1, label: "Add Property", desc: "General & Photos" },
                  { step: 2, label: "Add Resources", desc: "Studio range" },
                  { step: 3, label: "Resource List", desc: "Active inventory" },
                  { step: 4, label: "Dependencies", desc: "Linkages" },
                  { step: 5, label: "Add-ons", desc: "Chargeable extras" },
                  { step: 6, label: "Review & Publish", desc: "Finalize details" }
                ].map(item => {
                  const isActive = workflowStep === item.step;
                  const isCompleted = workflowStep > item.step;
                  return (
                    <button
                      key={item.step}
                      type="button"
                      onClick={() => setWorkflowStep(item.step)}
                      className="flex flex-col items-center text-center shrink-0 focus:outline-none group relative"
                    >
                      {/* Step Circle */}
                      <div className={`h-[42px] w-[42px] rounded-full border-2 flex items-center justify-center transition-all duration-300 relative z-10 ${
                        isCompleted 
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/10' 
                          : isActive
                            ? 'bg-[#18181B] border-[#EA580C] text-white ring-4 ring-[#EA580C]/15 scale-110 shadow-md'
                            : 'bg-white border-border text-warm-muted/70'
                      }`}>
                        {isCompleted ? (
                          <Check className="h-4 w-4 stroke-[3px]" />
                        ) : (
                          <span className={`font-mono text-xs font-black ${isActive ? 'text-white' : 'text-warm-muted/70'}`}>
                            {item.step}
                          </span>
                        )}

                        {isActive && (
                          <>
                            {/* Spinning Dashed Ring */}
                            <span className="absolute inset-[-6px] rounded-full border border-dashed border-[#EA580C] animate-spin" style={{ animationDuration: '6s' }} />
                            {/* Spinning Dotted Ring (opposite direction) */}
                            <span className="absolute inset-[-10px] rounded-full border border-dotted border-[#EA580C]/40 animate-spin" style={{ animationDuration: '10s', animationDirection: 'reverse' }} />
                            {/* Pulsing Glow Ring */}
                            <span className="absolute inset-[-14px] rounded-full border border-[#EA580C]/20 animate-ping" style={{ animationDuration: '2.5s' }} />
                          </>
                        )}
                      </div>

                      {/* Labels */}
                      <div className="mt-3 space-y-0.5 max-w-[95px]">
                        <p className={`text-xs font-black tracking-tight transition-colors duration-200 ${
                          isActive 
                            ? 'text-[#EA580C]' 
                            : isCompleted 
                              ? 'text-foreground font-bold' 
                              : 'text-warm-muted/65'
                        }`}>
                          {item.label}
                        </p>
                        <p className={`text-[10px] font-semibold leading-tight truncate ${
                          isActive 
                            ? 'text-[#EA580C]/80' 
                            : isCompleted 
                              ? 'text-warm-muted' 
                              : 'text-warm-muted/50'
                        }`}>
                          {item.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Render Active Step Content with Slide Transitions */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={workflowStep}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.18, ease: "easeInOut" }}
                  className="mt-6"
                >
                  {workflowStep === 1 && renderStep1()}
                  {workflowStep === 2 && renderStep2()}
                  {workflowStep === 3 && renderStep3()}
                  {workflowStep === 4 && renderStep4()}
                  {workflowStep === 5 && renderStep5()}
                  {workflowStep === 6 && renderStep6()}
                </motion.div>
              </AnimatePresence>

              {/* Stepper Footer Controls */}
              <div className="flex justify-between items-center bg-card border border-border/40 rounded-2xl p-4 shadow-sm mt-6">
                <Button
                  variant="outline"
                  disabled={workflowStep === 1}
                  onClick={() => setWorkflowStep(prev => Math.max(1, prev - 1))}
                  className="rounded-xl font-bold text-xs h-9"
                >
                  ← Previous Step
                </Button>
                <span className="text-xs text-warm-muted font-bold">Step {workflowStep} of 6</span>
                <Button
                  disabled={workflowStep === 6}
                  onClick={() => setWorkflowStep(prev => Math.min(6, prev + 1))}
                  className="bg-[#3D1A00] hover:bg-[#3D1A00]/90 text-white rounded-xl font-bold text-xs h-9"
                >
                  Next Step →
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'bookings' && renderBookingsTab()}
          {activeTab === 'ledger' && renderLedgerTab()}
          {activeTab === 'payments' && renderPaymentsTab()}
          {activeTab === 'waiting' && renderWaitingListTab()}

          {activeTab === 'settings' && (
            <div className="bg-card rounded-[2rem] border border-border/40 shadow-sm p-6 space-y-6 mt-6 w-full">
              <h3 className="text-lg font-bold text-foreground">Venue Management Global Settings</h3>
              <div className="space-y-4 text-xs font-semibold">
                <div className="space-y-2">
                  <Label className="font-semibold text-foreground">Automatic Resource Release Timeout (Minutes)</Label>
                  <Input type="number" defaultValue="10" className="rounded-xl border-border/70 font-semibold" />
                  <p className="text-xs text-warm-muted">Standard period a selected resource is reserved/locked during checkout.</p>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-foreground">Standard Security Deposit Amount (₹)</Label>
                  <Input type="number" defaultValue="5000" className="rounded-xl border-border/70 font-semibold" />
                </div>
                <Button className="bg-primary hover:bg-primary/95 text-white rounded-xl font-semibold text-xs h-10 px-5 shadow-sm">Save Settings</Button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ================= 4. PROPERTIES DETAIL SLIDE OVER SHEET ================= */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="sm:max-w-3xl w-full overflow-y-auto bg-card border-l border-border/70 p-6 space-y-6">
          <SheetHeader className="text-left space-y-2 border-b border-border/60 pb-4">
            <div className="flex items-center justify-between">
              <Badge className="bg-primary text-white font-bold uppercase text-xs tracking-wider">
                {selectedPropertyForDetails?.property_type}
              </Badge>
              <Badge variant="outline" className={`font-bold uppercase text-xs tracking-wider ${
                selectedPropertyForDetails?.status === "Approved" || selectedPropertyForDetails?.status === "Active" ? "text-green-700 border-green-200 bg-green-50" :
                selectedPropertyForDetails?.status === "Rejected" ? "text-red-700 border-red-200 bg-red-50" :
                "text-amber-700 border-amber-200 bg-amber-50"
              }`}>
                {selectedPropertyForDetails?.status}
              </Badge>
            </div>
            <SheetTitle className="text-2xl font-bold text-foreground mt-1">
              {selectedPropertyForDetails?.name}
            </SheetTitle>
            <SheetDescription className="text-xs text-warm-muted flex items-center gap-1 mt-0.5 font-semibold">
              <MapPin className="h-3.5 w-3.5 text-primary/70" /> {selectedPropertyForDetails?.address}, {selectedPropertyForDetails?.city}, {selectedPropertyForDetails?.state}, {selectedPropertyForDetails?.pincode}
            </SheetDescription>
          </SheetHeader>

          {/* Core Property Details Render */}
          {renderPropertyDetailsContent(selectedPropertyForDetails)}
        </SheetContent>
      </Sheet>

    </div>
  );
}
