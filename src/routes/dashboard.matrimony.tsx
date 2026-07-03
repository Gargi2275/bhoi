import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useMemo } from "react";
import { 
  Heart, GraduationCap, Briefcase, MapPin, Loader2, Bookmark, Send, Inbox, 
  User, Settings, Shield, Sparkles, Check, X, Phone, Mail, Users, 
  Plus, Upload, Trash2, ArrowRight, ArrowLeft, Eye, ShieldAlert, FileText, 
  ChevronRight, Lock, Unlock, EyeOff, Info, Camera, Sliders, Layers, AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PageWrap } from "@/components/wag/PageWrap";
import { AnimatedCard, StatusBadge, DetailDrawer, EmptyState, Modal, ProgressRing } from "@/components/wag/primitives";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn, calculateAge } from "@/lib/utils";


const MATCHING_MODE = import.meta.env.VITE_MATCHING_MODE || "OPEN_TEST";
const IS_OPEN_TEST_MATCHING = ["OPEN_TEST", "OPEN_TESTING"].includes(MATCHING_MODE);

export const Route = createFileRoute("/dashboard/matrimony")({
  component: MatrimonyDashboard,
});

function MatrimonyStyles() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      .heart-interest-btn {
        transition: background-color 200ms ease, transform 250ms ease;
      }
      .heart-interest-btn svg {
        transition: transform 150ms ease, fill 250ms ease, stroke 250ms ease;
      }

      .matrimony-heart-inactive:hover {
        background-color: #FFF8F0 !important;
      }
      .matrimony-heart-inactive:hover svg {
        transform: scale(1.15);
      }
      .matrimony-heart-active:hover svg {
        transform: scale(1.1);
      }

      .matrimony-heart-icon-active {
        fill: #F5A623 !important;
        stroke: #F5A623 !important;
      }
      .matrimony-heart-icon-accepted {
        fill: #10B981 !important;
        stroke: #10B981 !important;
      }
      .matrimony-heart-icon-rejected {
        fill: #A1A1AA !important;
        stroke: #A1A1AA !important;
      }
      .matrimony-heart-icon-inactive {
        fill: transparent !important;
        stroke: #F5A623 !important;
      }

      /* Glow effects */
      .matrimony-heart-active {
        box-shadow: 0 0 12px rgba(245, 166, 35, 0.35) !important;
        border-color: #F5A623 !important;
      }
      .matrimony-heart-accepted {
        box-shadow: 0 0 12px rgba(16, 185, 129, 0.35) !important;
        border-color: #10B981 !important;
      }
      .matrimony-heart-rejected {
        background-color: #F4F4F5 !important;
        border-color: #E4E4E7 !important;
        opacity: 0.6;
        cursor: not-allowed !important;
      }

      .matrimony-heart-bounce-anim {
        animation: heartBounce 500ms ease forwards;
      }

      .matrimony-heart-deactivate-anim {
        animation: deactivatePulse 250ms ease forwards;
      }

      .matrimony-heart-bg-pulse {
        animation: bgFlash 400ms ease forwards;
      }

      @keyframes heartBounce {
        0%   { transform: scale(1); }
        30%  { transform: scale(1.5); }
        55%  { transform: scale(0.85); }
        75%  { transform: scale(1.2); }
        100% { transform: scale(1); }
      }
      @keyframes miniHeartFly {
        0%   { opacity: 1; transform: translate(0,0) scale(1); }
        100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(0); }
      }
      @keyframes rippleExpand {
        0%   { width: 44px; height: 44px; opacity: 0.7; margin: -22px 0 0 -22px; }
        100% { width: 72px; height: 72px; opacity: 0;   margin: -36px 0 0 -36px; }
      }
      @keyframes bgFlash {
        0%   { background: white; }
        50%  { background: #FFF3E0; }
        100% { background: white; }
      }
      @keyframes deactivatePulse {
        0%   { transform: scale(1); }
        50%  { transform: scale(0.8); }
        100% { transform: scale(1); }
      }
    ` }} />
  );
}

function MatrimonyHeartButton({
  interestInfo,
  onActivate,
  onDeactivate,
}: {
  interestInfo: { type: string; status: string; id: number } | null;
  onActivate: () => Promise<void>;
  onDeactivate: () => Promise<void>;
}) {
  const isSentPending = interestInfo?.type === "sent" && interestInfo?.status === "Pending";
  const isAccepted = interestInfo?.status === "Accepted";
  const isRejected = interestInfo?.status === "Rejected";
  
  const isCurrentlyActive = isSentPending || isAccepted;

  const [isActive, setIsActive] = useState(isCurrentlyActive);
  const [isPending, setIsPending] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isBgFlashing, setIsBgFlashing] = useState(false);
  const [deactivateAnimating, setDeactivateAnimating] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setIsActive(isCurrentlyActive);
  }, [isCurrentlyActive]);

  let tooltipText = "Send Interest";
  if (isSentPending) tooltipText = "Interest Sent";
  else if (isAccepted) tooltipText = "Interest Accepted";
  else if (isRejected) tooltipText = "Interest Rejected";

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPending || isRejected) return;

    const btn = buttonRef.current;
    if (!btn) return;

    if (!isActive) {
      setIsPending(true);
      spawnMiniHearts(btn);
      spawnRippleRing(btn);
      setIsAnimating(true);
      
      const fillTimeout = setTimeout(() => {
        setIsActive(true);
        setIsBgFlashing(true);
        setTimeout(() => setIsBgFlashing(false), 400);
      }, 300);

      try {
        await onActivate();
      } catch (err: any) {
        clearTimeout(fillTimeout);
        setIsActive(false);
        setIsAnimating(false);
        setIsBgFlashing(false);
      } finally {
        setIsPending(false);
        setTimeout(() => setIsAnimating(false), 500);
      }
    } else {
      setIsPending(true);
      setDeactivateAnimating(true);
      setIsActive(false);

      try {
        await onDeactivate();
      } catch (err: any) {
        setIsActive(true);
      } finally {
        setIsPending(false);
        setTimeout(() => setDeactivateAnimating(false), 250);
      }
    }
  };

  const spawnMiniHearts = (btn: HTMLButtonElement) => {
    const angles = [0, 45, 90, 135, 180, 225, 270, 315];
    const colors = ['#F5A623', '#E5395B', '#F5A623', '#E5395B',
                    '#F5A623', '#E5395B', '#F5A623', '#E5395B'];
    angles.forEach((angle, i) => {
      const rad = (angle * Math.PI) / 180;
      const dist = 28 + Math.random() * 10;
      const dx = Math.cos(rad) * dist;
      const dy = Math.sin(rad) * dist;
      const size = 8 + Math.random() * 5;
      const el = document.createElement('div');
      el.style.cssText = `
        position: absolute;
        top: 50%; left: 50%;
        width: ${size}px; height: ${size}px;
        margin: -${size/2}px 0 0 -${size/2}px;
        pointer-events: none;
        z-index: 10;
        --dx: ${dx}px;
        --dy: ${dy}px;
        animation: miniHeartFly 600ms ${i * 40}ms ease forwards;
      `;
      el.innerHTML = `<svg viewBox="0 0 10 10" width="${size}" height="${size}">
        <path d="M5,9C5,9 1,6.5 1,4C1,2.5 2,1.5 3.2,1.5C4,1.5 4.5,2 5,2.8
                 C5.5,2 6,1.5 6.8,1.5C8,1.5 9,2.5 9,4C9,6.5 5,9 5,9Z" 
              fill="${colors[i]}"/>
      </svg>`;
      btn.appendChild(el);
      setTimeout(() => el.remove(), 700);
    });
  };

  const spawnRippleRing = (btn: HTMLButtonElement) => {
    const ring = document.createElement('div');
    ring.style.cssText = `
      position: absolute;
      top: 50%; left: 50%;
      border: 2px solid #F5A623;
      border-radius: 50%;
      pointer-events: none;
      z-index: 5;
      animation: rippleExpand 500ms ease-out forwards;
    `;
    btn.appendChild(ring);
    setTimeout(() => ring.remove(), 600);
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      disabled={isPending || isRejected}
      onClick={handleClick}
      title={tooltipText}
      data-sent={isActive ? "true" : "false"}
      className={`heart-interest-btn w-11 h-11 rounded-full flex items-center justify-center border border-warm relative overflow-visible bg-white ${
        (isPending || isRejected) ? "cursor-not-allowed" : "cursor-pointer"
      } ${
        isRejected
          ? "matrimony-heart-rejected"
          : isAccepted
          ? "matrimony-heart-accepted"
          : isActive
          ? "matrimony-heart-active"
          : "matrimony-heart-inactive"
      } ${
        deactivateAnimating ? "matrimony-heart-deactivate-anim" : ""
      } ${
        isBgFlashing ? "matrimony-heart-bg-pulse" : ""
      }`}
    >
      <Heart
        className={`w-5 h-5 shrink-0 ${
          isAnimating ? "matrimony-heart-bounce-anim" : ""
        } ${
          isRejected
            ? "matrimony-heart-icon-rejected"
            : isAccepted
            ? "matrimony-heart-icon-accepted"
            : isActive 
            ? "matrimony-heart-icon-active" 
            : "matrimony-heart-icon-inactive"
        }`}
      />
    </button>
  );
}

const resolvePhotoUrl = (url: string | null | undefined): string => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const baseUrl = "http://localhost:8000";
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
};

function MatrimonyDashboard() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // People & Profile states
  const [peopleList, setPeopleList] = useState<any[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string>("self");
  const [myProfiles, setMyProfiles] = useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [communities, setCommunities] = useState<any[]>([]);
  
  const wizardPerson = peopleList.find(p => p.id === selectedPersonId);
  const wizardPersonAge = wizardPerson?.birthdate ? calculateAge(wizardPerson.birthdate) : "N/A";
  
  // Tab controller for bottom section
  const [activeTab, setActiveTab] = useState<string>("matches"); // matches | shortlisted | sent | received | history | admin
  
  // Matchmaking data states
  const [matches, setMatches] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [sentInterests, setSentInterests] = useState<any[]>([]);
  const [receivedInterests, setReceivedInterests] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({ views: 0, interestsReceived: 0, interestsSent: 0, wishlist: 0, matches: 0 });
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [adminProfiles, setAdminProfiles] = useState<any[]>([]);

  const [isTabSticky, setIsTabSticky] = useState(false);
  const tabContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (tabContainerRef.current) {
        const rect = tabContainerRef.current.getBoundingClientRect();
        // Sticky offset on mobile is 56px (h-14). On desktop, it is 0px.
        const stickyThreshold = window.innerWidth < 768 ? 57 : 1;
        setIsTabSticky(rect.top <= stickyThreshold);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleTabChange = (tabId: string) => {
    const currentScrollY = window.scrollY;
    
    // Capture the current height of the tab content area to prevent layout collapse
    const contentArea = document.getElementById("matrimony-tab-content-area");
    if (contentArea) {
      const currentHeight = contentArea.offsetHeight;
      contentArea.style.minHeight = `${currentHeight}px`;
    }
    
    setActiveTab(tabId);
    
    // Restore scroll position and clear the height restriction after rendering
    requestAnimationFrame(() => {
      window.scrollTo(0, currentScrollY);
      setTimeout(() => {
        const contentArea = document.getElementById("matrimony-tab-content-area");
        if (contentArea) {
          contentArea.style.minHeight = "";
        }
      }, 250);
    });
  };

  // Modal display controllers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [previewRole, setPreviewRole] = useState<"stranger" | "interested" | "approved" | "connected">("stranger");
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPhotosModalOpen, setIsPhotosModalOpen] = useState(false);
  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState(false);

  // Wizard steps within modals
  const [wizardStep, setWizardStep] = useState(1);
  const [editModalStep, setEditModalStep] = useState(1);
  const [fullscreenPhotoUrl, setFullscreenPhotoUrl] = useState<string | null>(null);

  // Creation/Wizard sources
  const [createProfileFor, setCreateProfileFor] = useState<"Self" | "Family Member">("Self");
  const [wizardPhotoFile, setWizardPhotoFile] = useState<File | null>(null);
  const [wizardPhotoPreviewUrl, setWizardPhotoPreviewUrl] = useState<string | null>(null);
  const [wizardPhotoFiles, setWizardPhotoFiles] = useState<{ file: File; previewUrl: string; category: string; isPrivate: boolean; isPrimary: boolean }[]>([]);
  const [modalPhotoFiles, setModalPhotoFiles] = useState<{ file: File; previewUrl: string; category: string; isPrivate: boolean }[]>([]);

  // Photo uploads
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoCategory, setPhotoCategory] = useState<string>("Profile Photo");
  const [photoIsPrivate, setPhotoIsPrivate] = useState<boolean>(false);
  const [uploadingPhoto, setUploadingPhoto] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);

  // Search/Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAge, setFilterAge] = useState<number[]>([18, 60]);
  const [filterMaritalStatus, setFilterMaritalStatus] = useState("Any");
  const [filterVerifiedOnly, setFilterVerifiedOnly] = useState(false);
  const [filterCaste, setFilterCaste] = useState("Any");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterHeight, setFilterHeight] = useState<number[]>([48, 84]); // 4'0" to 7'0"
  const [filterEducation, setFilterEducation] = useState<string[]>([]);
  const [filterOccupation, setFilterOccupation] = useState<string[]>([]);
  const [filterIncome, setFilterIncome] = useState<string>("Any");
  const [filterCommunityId, setFilterCommunityId] = useState<string>("Any");
  const [showOutsidePreferences, setShowOutsidePreferences] = useState<boolean>(false);

  // Debounced search queries
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [debouncedLocationQuery, setDebouncedLocationQuery] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedLocationQuery(filterLocation);
    }, 300);
    return () => clearTimeout(handler);
  }, [filterLocation]);

  // Load and refresh matches based on search query, filters, and preferences
  const fetchFilteredMatches = async (profileId: number) => {
    try {
      const params = {
        search: debouncedSearchQuery,
        location: debouncedLocationQuery,
        min_age: filterAge[0],
        max_age: filterAge[1],
        marital_status: filterMaritalStatus,
        caste: filterCaste,
        verified_only: filterVerifiedOnly,
        min_height: filterHeight[0],
        max_height: filterHeight[1],
        income: filterIncome,
        education: filterEducation.join(","),
        occupation: filterOccupation.join(","),
        community_id: filterCommunityId,
        show_outside_preferences: showOutsidePreferences,
      };
      const res = await api.getMatrimonyMatches(profileId, params);
      setMatches(res || []);
    } catch (err) {
      console.error("Error fetching filtered matches:", err);
    }
  };

  useEffect(() => {
    if (selectedProfile?.id) {
      fetchFilteredMatches(selectedProfile.id);
    }
  }, [
    selectedProfile?.id,
    debouncedSearchQuery,
    debouncedLocationQuery,
    filterAge,
    filterMaritalStatus,
    filterVerifiedOnly,
    filterCaste,
    filterHeight,
    filterIncome,
    filterEducation,
    filterOccupation,
    filterCommunityId,
    showOutsidePreferences,
  ]);

  // Drawer details
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerProfile, setDrawerProfile] = useState<any | null>(null);
  const [drawerTab, setDrawerTab] = useState("About");
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);

  // Mount guard for SSR / Hydration fix
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Form validation errors state
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Spinners
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Helper sanitizers to avoid uncontrolled/controlled input warnings
  const sanitizeFormObject = (obj: any) => {
    if (!obj) return {};
    const sanitized = { ...obj };

    // MAP backend fields to frontend fields if they are present on obj but frontend fields are not
    if (sanitized.visibility_type && !sanitized.visibility_scope) {
      const typeMapping: Record<string, string> = {
        'PRIVATE': 'Private',
        'COMMUNITY_NETWORK': 'Community Network',
        'CUSTOM_AUDIENCE': 'Custom Audience',
        'PLATFORM_WIDE': 'Platform Wide'
      };
      sanitized.visibility_scope = typeMapping[sanitized.visibility_type] || sanitized.visibility_type;
    }
    if (sanitized.hierarchy_scope && !sanitized.visibility_hierarchy) {
      sanitized.visibility_hierarchy = sanitized.hierarchy_scope;
    }
    if (sanitized.target_communities && (!sanitized.filter_communities || sanitized.filter_communities.length === 0)) {
      sanitized.filter_communities = sanitized.target_communities.map((c: any) => typeof c === 'object' ? c.id : c);
    }
    if (sanitized.selected_communities) {
      sanitized.selected_communities = sanitized.selected_communities.map((c: any) => typeof c === 'object' ? c.id : c);
    }
    if (sanitized.target_castes !== undefined && sanitized.filter_castes === undefined) {
      sanitized.filter_castes = sanitized.target_castes;
    }
    if (sanitized.target_subcastes !== undefined && sanitized.filter_sub_castes === undefined) {
      sanitized.filter_sub_castes = sanitized.target_subcastes;
    }
    if (sanitized.target_states !== undefined && sanitized.filter_states === undefined) {
      sanitized.filter_states = sanitized.target_states;
    }
    if (sanitized.target_cities !== undefined && sanitized.filter_cities === undefined) {
      sanitized.filter_cities = sanitized.target_cities;
    }
    if (sanitized.target_gender !== undefined && sanitized.filter_gender === undefined) {
      sanitized.filter_gender = sanitized.target_gender;
    }
    if (sanitized.target_age_min !== undefined && (sanitized.filter_min_age === undefined || sanitized.filter_min_age === null)) {
      sanitized.filter_min_age = sanitized.target_age_min;
    }
    if (sanitized.target_age_max !== undefined && (sanitized.filter_max_age === undefined || sanitized.filter_max_age === null)) {
      sanitized.filter_max_age = sanitized.target_age_max;
    }
    if (sanitized.target_marital_statuses !== undefined && sanitized.filter_marital_statuses === undefined) {
      sanitized.filter_marital_statuses = sanitized.target_marital_statuses;
    }
    if (sanitized.target_educations !== undefined && sanitized.filter_educations === undefined) {
      sanitized.filter_educations = sanitized.target_educations;
    }
    if (sanitized.target_occupations !== undefined && sanitized.filter_occupations === undefined) {
      sanitized.filter_occupations = sanitized.target_occupations;
    }

    const defaults: Record<string, any> = {
      relationship: "Self",
      marital_status: "Single",
      divorce_year: "",
      has_children: false,
      children_count: 0,
      children_living_with: "",
      year_of_loss: "",
      widowed_children_info: "",
      height: "",
      weight: "",
      complexion: "Fair",
      education: "",
      profession: "",
      income: "",
      diet: "Vegetarian",
      smoking: "No",
      drinking: "No",
      about: "",
      religion: "Hindu",
      mother_tongue: "Gujarati",
      languages_known: "",
      native_place: "",
      current_address: "",
      family_type: "Nuclear",
      family_values: "Traditional",
      fathers_occupation: "",
      mothers_occupation: "",
      siblings_count: 0,
      visibility_scope: "Public",
      contact_permission: "Everyone Who Can View",
      allow_interests: true,
      allow_direct_chat: true,
      allow_phone: true,
      allow_whatsapp: true,
      allow_email: true,
      contact_name: "",
      contact_relation: "Self",
      contact_phone: "",
      contact_whatsapp: "",
      contact_email: "",
      visibility_hierarchy: "My Community",
      selected_communities: [],
      filter_communities: [],
      filter_castes: "",
      filter_sub_castes: "",
      filter_states: "",
      filter_cities: "",
      filter_gender: "Everyone",
      filter_min_age: 18,
      filter_max_age: 60,
      filter_marital_statuses: "",
      filter_educations: "",
      filter_occupations: "",
      aadhaar: "",
      pan: "",
      photo_permission: "Everyone",
    };
    Object.keys(defaults).forEach(key => {
      if (sanitized[key] === null || sanitized[key] === undefined) {
        sanitized[key] = defaults[key];
      }
    });
    return sanitized;
  };

  const sanitizePrefForm = (obj: any) => {
    if (!obj) return {};
    const sanitized = { ...obj };
    const defaults: Record<string, any> = {
      gender: "Bride",
      min_age: 18,
      max_age: 60,
      caste: "",
      sub_caste: "",
      education: "",
      occupation: "",
      city: "",
      state: "",
      country: "India",
      min_height: "",
      max_height: "",
      marital_status: "Any",
      income_range: "",
    };
    Object.keys(defaults).forEach(key => {
      if (sanitized[key] === null || sanitized[key] === undefined) {
        sanitized[key] = defaults[key];
      }
    });
    return sanitized;
  };

  // Redefine state hooks to use raw states plus sanitization
  const [rawFormData, setRawFormData] = useState<any>(() => sanitizeFormObject({
    relationship: "Self",
    marital_status: "Single",
    divorce_year: "",
    has_children: false,
    children_count: 0,
    children_living_with: "",
    year_of_loss: "",
    widowed_children_info: "",
    height: "",
    weight: "",
    complexion: "Fair",
    education: "",
    profession: "",
    income: "",
    diet: "Vegetarian",
    smoking: "No",
    drinking: "No",
    about: "",
    religion: "Hindu",
    mother_tongue: "Gujarati",
    languages_known: "",
    native_place: "",
    current_address: "",
    family_type: "Nuclear",
    family_values: "Traditional",
    fathers_occupation: "",
    mothers_occupation: "",
    siblings_count: 0,
    visibility_scope: "Public",
    contact_permission: "Everyone Who Can View",
    allow_interests: true,
    allow_direct_chat: true,
    allow_phone: true,
    allow_whatsapp: true,
    allow_email: true,
    contact_name: "",
    contact_relation: "Self",
    contact_phone: "",
    contact_whatsapp: "",
    contact_email: "",
    visibility_hierarchy: "My Community",
    selected_communities: [],
    filter_communities: [],
    filter_castes: "",
    filter_sub_castes: "",
    filter_states: "",
    filter_cities: "",
    filter_gender: "Everyone",
    filter_min_age: 18,
    filter_max_age: 60,
    filter_marital_statuses: "",
    filter_educations: "",
    filter_occupations: "",
    aadhaar: "",
    pan: "",
    photo_permission: "Everyone",
  }));

  const [rawPrefForm, setRawPrefForm] = useState<any>(() => sanitizePrefForm({
    gender: "Bride",
    min_age: 18,
    max_age: 60,
    caste: "",
    sub_caste: "",
    education: "",
    occupation: "",
    city: "",
    state: "",
    country: "India",
    min_height: "",
    max_height: "",
    marital_status: "Any",
    income_range: "",
  }));

  const formData = sanitizeFormObject(rawFormData);
  const prefForm = sanitizePrefForm(rawPrefForm);

  const liveImpactSummary = useMemo(() => {
    if (!matches || matches.length === 0) return { count: 0, communities: 0, avgScore: 0 };
    const filtered = matches.filter(p => {
      if (prefForm.gender && p.gender !== prefForm.gender) return false;
      if (prefForm.min_age && p.age < prefForm.min_age) return false;
      if (prefForm.max_age && p.age > prefForm.max_age) return false;
      if (prefForm.marital_status && prefForm.marital_status !== "Any" && p.marital_status !== prefForm.marital_status) return false;
      if (prefForm.caste && prefForm.caste.trim().toLowerCase() !== "any" && prefForm.caste.trim()) {
        const casteQ = prefForm.caste.toLowerCase();
        const candCaste = (p.caste || "").toLowerCase();
        const candSubCaste = (p.sub_caste || "").toLowerCase();
        if (!candCaste.includes(casteQ) && !candSubCaste.includes(casteQ)) return false;
      }
      return true;
    });
    const uniqueComms = new Set(filtered.map(p => p.community_name || p.community).filter(Boolean));
    const totalScore = filtered.reduce((sum, p) => sum + (p.match_score || 0), 0);
    const avgScore = filtered.length > 0 ? Math.round(totalScore / filtered.length) : 0;
    return { count: filtered.length, communities: uniqueComms.size, avgScore };
  }, [prefForm, matches]);

  const setFormData = (update: any) => {
    setRawFormData((prev: any) => {
      const next = typeof update === 'function' ? update(prev) : update;
      return sanitizeFormObject(next);
    });
  };

  const setPrefForm = (update: any) => {
    setRawPrefForm((prev: any) => {
      const next = typeof update === 'function' ? update(prev) : update;
      return sanitizePrefForm(next);
    });
  };

  const populateFormData = (p: any) => {
    if (!p) return;
    setRawFormData(sanitizeFormObject(p));
  };

  const populatePrefForm = (pref: any, profileGender?: string) => {
    setRawPrefForm(sanitizePrefForm({
      gender: pref?.gender || (profileGender === "Bride" ? "Groom" : "Bride"),
      min_age: pref?.min_age || 18,
      max_age: pref?.max_age || 60,
      caste: pref?.caste || "",
      sub_caste: pref?.sub_caste || "",
      education: pref?.education || "",
      occupation: pref?.occupation || "",
      city: pref?.city || "",
      state: pref?.state || "",
      country: pref?.country || "India",
      min_height: pref?.min_height || "",
      max_height: pref?.max_height || "",
      marital_status: pref?.marital_status || "Any",
      income_range: pref?.income_range || "",
    }));
  };

  const [estimatedReach, setEstimatedReach] = useState<number | null>(null);
  const [estimatedCommunities, setEstimatedCommunities] = useState<number | null>(null);
  const [estimatedMatches, setEstimatedMatches] = useState<number | null>(null);
  const [loadingReach, setLoadingReach] = useState(false);

  // ── Profile completion: use backend-computed value when available ──────────
  const getProfileCompletion = (p: any) => {
    if (!p) return 0;
    // Prefer the authoritative backend-computed value
    if (typeof p.completion_percentage === 'number') return p.completion_percentage;
    // Fallback (should not normally be reached)
    const fields = [
      p.name, p.gender, p.dob,
      p.education && p.education.trim(),
      p.profession && p.profession.trim(),
      p.income && p.income.trim(),
      p.height && p.height.trim(),
      p.weight && p.weight.trim(),
      p.complexion && p.complexion.trim(),
      p.diet,
      p.mother_tongue && p.mother_tongue.trim(),
      p.city && p.city.trim(),
      p.state && p.state.trim(),
      p.native_place && p.native_place.trim(),
      p.about && p.about.trim().length >= 50,
      (p.photos && p.photos.length > 0) || p.photo || p.photo_url,
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  };

  // Use backend debug_fields when available
  const getDebugFields = (p: any) => p?.debug_fields || {};

  const isBasicDetailsComplete = (p: any) => {
    if (!p) return false;
    const d = getDebugFields(p);
    if (Object.keys(d).length > 0) {
      // All core identity, location, and about fields must be present
      return !!(d.name && d.gender && d.dob && d.education && d.profession && d.city && d.state && d.about);
    }
    // Fallback: check profile fields directly
    return !!(p.name && p.gender && p.dob &&
      p.education?.trim() && p.profession?.trim() &&
      p.city?.trim() && p.state?.trim() &&
      p.about?.trim().length >= 50);
  };

  const isPhysicalDetailsComplete = (p: any) => {
    if (!p) return false;
    const d = getDebugFields(p);
    if (Object.keys(d).length > 0) return !!(d.height && d.weight && d.complexion);
    return !!(p.height?.trim() && p.weight?.trim() && p.complexion?.trim());
  };

  const isPhotoUploaded = (p: any) => {
    if (!p) return false;
    const d = getDebugFields(p);
    if (Object.keys(d).length > 0) return !!d.photo;
    return !!((p.photos && p.photos.length > 0) || p.photo || p.photo_url);
  };

  const isPartnerPreferencesConfigured = (p: any) => {
    if (!p) return false;
    const d = getDebugFields(p);
    if (Object.keys(d).length > 0) return !!d.preferences;
    const pref = p.partner_preference;
    return !!(
      pref && (
        pref.gender || pref.caste || pref.sub_caste ||
        pref.education || pref.occupation || pref.city || pref.state
      )
    );
  };

  const isContactInfoComplete = (p: any) => {
    if (!p) return false;
    const d = getDebugFields(p);
    if (Object.keys(d).length > 0) return !!d.contact_info;
    return !!(p.contact_name?.trim() || p.contact_phone?.trim() || p.name);
  };

  const isVerified = (p: any) => !!(p && p.is_verified);

  // ── Single source of truth refresh ──────────────────────────────────────────
  const refreshProfile = async (profileId?: number) => {
    try {
      const id = profileId ?? selectedProfile?.id;
      if (!id) return;
      const fresh = await api.getMyProfile(id);
      if (fresh) {
        const debugFields = fresh.debug_fields || {};
        const incomplete = Object.entries(debugFields)
          .filter(([k, v]) => k !== 'status' && k !== 'completion_percentage' && !v)
          .map(([k]) => k);
        console.log('[MatrimonyDashboard] refreshed profile:', {
          id: fresh.id,
          status: fresh.status,
          completion_percentage: fresh.completion_percentage,
          debug_fields: debugFields,
          incomplete_fields: incomplete.length > 0 ? incomplete : 'NONE — all complete!',
        });
        setSelectedProfile(fresh);
        populateFormData(fresh);
        if (fresh.partner_preference) {
          populatePrefForm(fresh.partner_preference, fresh.gender);
        }
        // Also update the list entry
        setMyProfiles(prev => prev.map(p => p.id === fresh.id ? fresh : p));
      }
    } catch (e) {
      console.warn('[MatrimonyDashboard] refreshProfile failed', e);
    }
  };

  // Load families and construct the list of eligible people
  const loadPeopleList = async () => {
    try {
      const user = await api.getCurrentUser().catch(() => null);
      setCurrentUser(user);

      const families = await api.getMyFamilies().catch(() => []);
      
      const selfMember = {
        id: "self",
        name: user?.member?.name || user?.username || "Self",
        relation: "Self",
        gender: user?.member?.gender === "Male" ? "Groom" : "Bride",
        birthdate: user?.member?.birthdate || "",
        caste: user?.member?.caste || "Ahir",
        sub_caste: user?.member?.sub_caste || "",
        city: user?.member?.village || "",
        state: user?.member?.state || "",
        isSelf: true
      };

      const allFamilyMembers = families.flatMap((f: any) =>
        (f.members || []).map((m: any) => {
          let gender = "Bride";
          if (m.relation) {
            const rel = m.relation.toLowerCase();
            if (["son", "brother", "father", "groom", "husband"].includes(rel)) {
              gender = "Groom";
            }
          }
          return {
            id: String(m.id),
            name: m.name,
            relation: m.relation || "Member",
            gender,
            birthdate: m.birthdate || "",
            caste: m.caste || "Ahir",
            sub_caste: m.sub_caste || "",
            city: m.village || "",
            state: m.state || "",
            isSelf: false
          };
        })
      );

      // Filter to include only people aged >= 18
      const eligibleFamily = allFamilyMembers.filter((m: any) => {
        if (!m.birthdate) return true;
        const ageStr = calculateAge(m.birthdate);
        if (!ageStr) return true;
        return parseInt(ageStr, 10) >= 18;
      });

      const list = [selfMember];
      eligibleFamily.forEach(f => {
        if (f.name !== selfMember.name) {
          list.push(f);
        }
      });

      setPeopleList(list);
    } catch (e) {
      console.error("Failed to load family people list", e);
    }
  };

  // Load all initial configurations
  const loadInitialData = async () => {
    setLoading(true);
    try {
      await loadPeopleList();
      const comms = await api.getCommunities().catch(() => []);
      setCommunities(comms);
      
      const profiles = await api.getMyProfiles().catch(() => []);
      setMyProfiles(profiles);
    } catch (e) {
      console.error("Failed loading matrimony profiles", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Estimate Reach logic
  useEffect(() => {
    if (!isCreateModalOpen && !isEditModalOpen) return;
    
    const delayDebounce = setTimeout(async () => {
      setLoadingReach(true);
      try {
        const payload = {
          filter_gender: formData.filter_gender,
          filter_communities: formData.filter_communities,
          filter_castes: formData.filter_castes,
          filter_sub_castes: formData.filter_sub_castes,
          filter_states: formData.filter_states,
          filter_cities: formData.filter_cities,
          filter_min_age: formData.filter_min_age,
          filter_max_age: formData.filter_max_age,
          filter_marital_statuses: formData.filter_marital_statuses,
          filter_educations: formData.filter_educations,
          filter_occupations: formData.filter_occupations,
        };
        const res = await api.estimateReach(payload);
        setEstimatedReach(res.eligible_users ?? null);
        setEstimatedCommunities(res.eligible_communities ?? null);
        setEstimatedMatches(res.eligible_matches ?? null);
      } catch (e) {
        console.warn("Reach estimation failed", e);
      } finally {
        setLoadingReach(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [
    isCreateModalOpen,
    isEditModalOpen,
    formData.filter_gender,
    formData.filter_communities,
    formData.filter_castes,
    formData.filter_sub_castes,
    formData.filter_states,
    formData.filter_cities,
    formData.filter_min_age,
    formData.filter_max_age,
    formData.filter_marital_statuses,
    formData.filter_educations,
    formData.filter_occupations,
  ]);

  // Sync profile details when selected person or myProfiles changes
  useEffect(() => {
    if (loading) return;
    const activeProf = myProfiles.find(p => 
      selectedPersonId === "self" 
        ? !p.family_member 
        : p.family_member === parseInt(selectedPersonId)
    );
    if (activeProf) {
      handleSelectProfile(activeProf);
    } else {
      setSelectedProfile(null);
      setMatches([]);
      setWishlist([]);
      setSentInterests([]);
      setReceivedInterests([]);
    }
  }, [selectedPersonId, myProfiles, loading]);

  // Set selected profile and load statistics, preferences, and matches
  const handleSelectProfile = async (profileInput: any) => {
    let profile = profileInput;
    setSelectedProfile(profile);
    populateFormData(profile);
    if (profile.partner_preference) {
      populatePrefForm(profile.partner_preference, profile.gender);
    } else {
      populatePrefForm(null, profile.gender);
    }

    // Immediately fetch fresh data from backend so completion_percentage and status are current
    try {
      const fresh = await api.getMyProfile(profile.id);
      if (fresh) {
        console.log('[MatrimonyDashboard] initial profile load:', {
          id: fresh.id,
          status: fresh.status,
          completion_percentage: fresh.completion_percentage,
          debug_fields: fresh.debug_fields,
        });
        setSelectedProfile(fresh);
        profile = fresh;
        populateFormData(fresh);
        if (fresh.partner_preference) {
          populatePrefForm(fresh.partner_preference, fresh.gender);
        }
      }
    } catch (e) {
      console.warn('[MatrimonyDashboard] fresh profile fetch failed, using cached data', e);
    }
    
    try {
      const prefs = await api.getMatrimonyPreferences(profile.id).catch(() => null);
      if (prefs) {
        populatePrefForm(prefs, profile.gender);
      }

      const stats = await api.getMatrimonyAnalytics(profile.id).catch(() => null);
      if (stats) setAnalytics(stats);

      const logs = await api.getMatrimonyAuditLogs(profile.id).catch(() => []);
      setAuditLogs(logs);

      const matchParams = {
        search: debouncedSearchQuery,
        location: debouncedLocationQuery,
        min_age: filterAge[0],
        max_age: filterAge[1],
        marital_status: filterMaritalStatus,
        caste: filterCaste,
        verified_only: filterVerifiedOnly,
        min_height: filterHeight[0],
        max_height: filterHeight[1],
        income: filterIncome,
        education: filterEducation.join(","),
        occupation: filterOccupation.join(","),
        community_id: filterCommunityId,
        show_outside_preferences: showOutsidePreferences,
      };

      const [matchList, wishList, sentList, recList] = await Promise.all([
        api.getMatrimonyMatches(profile.id, matchParams).catch(() => []),
        api.getMatrimonyWishlist().catch(() => []),
        api.getMatrimonyInterestsSent().catch(() => []),
        api.getMatrimonyInterestsReceived().catch(() => []),
      ]);

      console.log("[MatrimonyDashboard] recommended matches response:", {
        matchingMode: MATCHING_MODE,
        selectedProfileId: profile.id,
        returnedCount: matchList?.length || 0,
        returnedProfileIds: (matchList || []).map((p: any) => p.id),
        clientFiltersBypassed: IS_OPEN_TEST_MATCHING,
      });
      setMatches(matchList || []);
      setWishlist(wishList || []);
      setSentInterests(sentList || []);
      setReceivedInterests(recList || []);

      populateFormData(profile);

    } catch (e) {
      console.error("Failed loading selected profile metrics", e);
    }
  };

  // Admin approval requests
  const loadAdminProfiles = async () => {
    try {
      const allProfs = await api.getMatrimonyProfiles({ pending_verification: true }).catch(() => []);
      setAdminProfiles(allProfs);
    } catch (e) {
      console.error("Failed to load admin verification requests", e);
    }
  };

  useEffect(() => {
    if (currentUser && (currentUser.role === "admin" || currentUser.role === "superadmin" || currentUser.is_staff)) {
      loadAdminProfiles();
    }
  }, [currentUser]);

  // Open profile details drawer
  const handleOpenProfileDetails = async (profile: any) => {
    setDrawerProfile(profile);
    setDrawerTab("About");
    setActivePhotoIndex(0);
    setDrawerOpen(true);
    try {
      await api.recordMatrimonyProfileView(profile.id);
      if (selectedProfile) {
        const stats = await api.getMatrimonyAnalytics(selectedProfile.id).catch(() => null);
        if (stats) setAnalytics(stats);
      }
    } catch (e) {
      console.warn("Could not record profile view log", e);
    }
  };

  // Check interest request status
  const getInterestStatus = (profileId: number, userId?: number) => {
    const sent = sentInterests.find(i => {
      if (i.receiver_id === profileId) return true;
      if (i.receiver_details?.id === profileId) return true;
      if (userId) {
        if (i.receiver_user_id === userId) return true;
        if (i.receiver_details?.user === userId) return true;
        if (i.receiver_details?.user_id === userId) return true;
        if (typeof i.receiver_details?.user === "object" && i.receiver_details.user.id === userId) return true;
      }
      return false;
    });
    if (sent) return { type: "sent", status: sent.status, id: sent.id };

    const rec = receivedInterests.find(i => {
      if (i.sender_id === profileId) return true;
      if (i.sender_details?.id === profileId) return true;
      if (userId) {
        if (i.sender_user_id === userId) return true;
        if (i.sender_details?.user === userId) return true;
        if (i.sender_details?.user_id === userId) return true;
        if (typeof i.sender_details?.user === "object" && i.sender_details.user.id === userId) return true;
      }
      return false;
    });
    if (rec) return { type: "received", status: rec.status, id: rec.id };
    return null;
  };

  // Interest request handlers
  const handleSendInterest = async (profileId: number, name: string) => {
    try {
      await api.showMatrimonyInterest(profileId);
      toast.success(`Interest request sent to ${name}!`);
      if (selectedProfile) {
        const [sentList, stats] = await Promise.all([
          api.getMatrimonyInterestsSent(),
          api.getMatrimonyAnalytics(selectedProfile.id)
        ]);
        setSentInterests(sentList || []);
        setAnalytics(stats);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send interest request");
      throw err;
    }
  };

  const handleAcceptInterest = async (interestId: number, name: string) => {
    try {
      await api.acceptMatrimonyInterest(interestId);
      toast.success(`Accepted interest from ${name}!`);
      if (selectedProfile) {
        const [recList, sentList, stats] = await Promise.all([
          api.getMatrimonyInterestsReceived(),
          api.getMatrimonyInterestsSent(),
          api.getMatrimonyAnalytics(selectedProfile.id)
        ]);
        setReceivedInterests(recList || []);
        setSentInterests(sentList || []);
        setAnalytics(stats);
        await fetchFilteredMatches(selectedProfile.id);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to accept interest");
    }
  };

  const handleRejectInterest = async (interestId: number, name: string) => {
    try {
      await api.rejectMatrimonyInterest(interestId);
      toast.success(`Declined interest from ${name}.`);
      const recList = await api.getMatrimonyInterestsReceived();
      setReceivedInterests(recList || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to decline interest");
    }
  };

  const handleWithdrawInterest = async (interestId: number, name: string) => {
    try {
      await api.withdrawMatrimonyInterest(interestId);
      toast.success(`Withdrew interest request sent to ${name}.`);
      if (selectedProfile) {
        const [sentList, stats] = await Promise.all([
          api.getMatrimonyInterestsSent(),
          api.getMatrimonyAnalytics(selectedProfile.id)
        ]);
        setSentInterests(sentList || []);
        setAnalytics(stats);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to withdraw interest request");
      throw err;
    }
  };

  const handleToggleWishlist = async (profileId: number, name: string) => {
    try {
      await api.toggleMatrimonyWishlist(profileId);
      const isShortlisted = wishlist.some(w => w.id === profileId);
      if (isShortlisted) {
        toast.success(`Removed ${name} from shortlist`);
      } else {
        toast.success(`Added ${name} to shortlist`);
      }
      const wishList = await api.getMatrimonyWishlist();
      setWishlist(wishList || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to update shortlist status");
    }
  };

  const handleMultipleFilesSelect = (files: FileList, isWizard: boolean) => {
    const allowedFormats = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const maxFiles = 10;
    
    const currentCount = isWizard 
      ? wizardPhotoFiles.length 
      : (selectedProfile?.photos?.length || 0) + modalPhotoFiles.length;
      
    const availableSlots = maxFiles - currentCount;
    if (availableSlots <= 0) {
      toast.error("You can upload a maximum of 10 photos.");
      return;
    }

    const filesToProcess = Array.from(files).slice(0, availableSlots);
    if (files.length > availableSlots) {
      toast.warning(`Only the first ${availableSlots} files were selected (max 10 photos allowed).`);
    }

    filesToProcess.forEach(file => {
      if (!allowedFormats.includes(file.type)) {
        toast.error(`Unsupported format for ${file.name}. Only JPG, JPEG, PNG, WEBP allowed.`);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large. Max size allowed is 5 MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const previewUrl = reader.result as string;
        if (isWizard) {
          setWizardPhotoFiles(prev => {
            const isFirst = prev.length === 0;
            return [...prev, {
              file,
              previewUrl,
              category: isFirst ? "Profile Photo" : "Lifestyle Photo",
              isPrivate: false,
              isPrimary: isFirst
            }];
          });
        } else {
          setModalPhotoFiles(prev => [...prev, {
            file,
            previewUrl,
            category: "Lifestyle Photo",
            isPrivate: false
          }]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleMultiplePhotosUploadSubmit = async () => {
    if (!selectedProfile || modalPhotoFiles.length === 0) return;
    setUploadingPhoto(true);
    try {
      for (const ph of modalPhotoFiles) {
        await api.uploadMatrimonyPhoto(selectedProfile.id, ph.file, ph.category, ph.isPrivate);
      }
      toast.success("All photos uploaded successfully!");
      setModalPhotoFiles([]);
      await refreshProfile(selectedProfile.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to upload photos");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // File size and format validators
  const validateAndSetPhoto = (file: File, isWizard: boolean) => {
    const allowedFormats = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedFormats.includes(file.type)) {
      toast.error("Unsupported file format. Please upload JPG, JPEG, PNG, or WEBP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large. Max size allowed is 5 MB.");
      return;
    }
    if (isWizard) {
      setWizardPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setWizardPhotoPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent, isWizard: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleMultipleFilesSelect(e.dataTransfer.files, isWizard);
    }
  };

  // Photo uploads
  const handlePhotoUploadSubmit = async () => {
    if (!selectedProfile || !photoFile) return;
    setUploadingPhoto(true);
    setUploadProgress(20);
    try {
      const interval = setInterval(() => {
        setUploadProgress((prev) => (prev !== null && prev < 90 ? prev + 15 : prev));
      }, 150);

      console.log('[MatrimonyDashboard] uploading photo for profile id:', selectedProfile.id);
      const res = await api.uploadMatrimonyPhoto(selectedProfile.id, photoFile, photoCategory, photoIsPrivate);
      console.log('[MatrimonyDashboard] upload response:', res);

      clearInterval(interval);
      setUploadProgress(100);
      toast.success("Photo uploaded successfully!");
      setPhotoFile(null);
      setPhotoPreviewUrl(null);

      // Re-fetch fresh profile data (completion, status, photos all update)
      await refreshProfile(selectedProfile.id);
    } catch (err: any) {
      toast.error(err.message || "Photo upload failed");
    } finally {
      setUploadingPhoto(false);
      setUploadProgress(null);
    }
  };

  const handlePhotoDelete = async (photoId: number) => {
    if (!selectedProfile) return;
    if (!confirm("Are you sure you want to delete this photo?")) return;
    try {
      await api.deleteMatrimonyPhoto(selectedProfile.id, photoId);
      toast.success("Photo deleted successfully");
      const updatedProf = await api.getMyProfile(selectedProfile.id);
      setSelectedProfile(updatedProf);
      const updatedProfiles = await api.getMyProfiles();
      setMyProfiles(updatedProfiles);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete photo");
    }
  };

  const handleUpdatePhotoSetting = async (photoId: number, category?: string, isPrivate?: boolean) => {
    if (!selectedProfile) return;
    try {
      await api.updateMatrimonyPhoto(selectedProfile.id, photoId, category, isPrivate);
      toast.success("Photo properties updated");
      const updatedProf = await api.getMyProfile(selectedProfile.id);
      setSelectedProfile(updatedProf);
    } catch (err: any) {
      toast.error(err.message || "Failed to update photo setting");
    }
  };

  const handleMovePhoto = async (photoIndex: number, direction: "up" | "down") => {
    if (!selectedProfile || !selectedProfile.photos) return;
    const list = [...selectedProfile.photos];
    const target = direction === "up" ? photoIndex - 1 : photoIndex + 1;
    if (target < 0 || target >= list.length) return;
    const temp = list[photoIndex];
    list[photoIndex] = list[target];
    list[target] = temp;
const photoIds = list.map((p: any) => p.id);
    try {
      await api.reorderMatrimonyPhotos(selectedProfile.id, photoIds);
      toast.success("Photo display order updated");
      const updatedProf = await api.getMyProfile(selectedProfile.id);
      setSelectedProfile(updatedProf);
    } catch (err: any) {
      toast.error(err.message || "Failed to reorder photos");
    }
  };

  const renderVisibilityAndAudienceSection = () => {
    const scope = formData.visibility_scope;

    const SearchableCommunitySelect = ({
      selectedIds,
      onChange,
      placeholder = "Select communities..."
    }: {
      selectedIds: number[];
      onChange: (ids: number[]) => void;
      placeholder?: string;
    }) => {
      const [isOpen, setIsOpen] = useState(false);
      const [search, setSearch] = useState("");

      const filteredComms = communities.filter((c: any) => {
        const isApproved = c.status === 'Approved' || c.status === 'Active';
        if (!isApproved) return false;
        if (!search.trim()) return true;
        return c.name.toLowerCase().includes(search.toLowerCase()) ||
               (c.caste && c.caste.toLowerCase().includes(search.toLowerCase()));
      });

      const selectedComms = communities.filter((c: any) => selectedIds.includes(c.id));

      const toggleSelect = (id: number) => {
        if (selectedIds.includes(id)) {
          onChange(selectedIds.filter(x => x !== id));
        } else {
          onChange([...selectedIds, id]);
        }
      };

      return (
        <div className="relative w-full">
          <div
            onClick={() => setIsOpen(!isOpen)}
            className="min-h-[42px] w-full px-3.5 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold flex flex-wrap gap-1.5 items-center cursor-pointer hover:border-gold transition-all"
          >
            {selectedComms.length === 0 ? (
              <span className="text-warm-muted">{placeholder}</span>
            ) : (
              selectedComms.map((c: any) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1 bg-gold/10 text-gold px-2 py-0.5 rounded-full text-[10px] font-bold border border-gold/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(c.id);
                  }}
                >
                  {c.name}
                  <span className="hover:text-red-500 cursor-pointer text-xs leading-none">×</span>
                </span>
              ))
            )}
            <span className="ml-auto text-warm-muted text-[10px]">▼</span>
          </div>

          {isOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
              <div className="absolute left-0 right-0 mt-1.5 border border-warm rounded-2xl bg-surface shadow-xl z-50 p-2.5 max-h-64 flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="Search community..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full px-3 py-1.5 border border-warm/60 rounded-xl bg-sand/10 text-xs focus:outline-none focus:border-gold"
                />

                <div className="overflow-y-auto space-y-1 pr-1 flex-1">
                  {filteredComms.length === 0 ? (
                    <p className="text-[11px] text-warm-muted text-center py-2">No approved communities found</p>
                  ) : (
                    filteredComms.map((c: any) => {
                      const indent = c.level > 1 ? `${(c.level - 1) * 12}px` : "0px";
                      const isChecked = selectedIds.includes(c.id);
                      return (
                        <div
                          key={c.id}
                          style={{ paddingLeft: indent }}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelect(c.id);
                          }}
                          className={`flex items-center gap-2 p-1.5 rounded-lg text-xs font-semibold cursor-pointer hover:bg-sand/15 select-none transition-all ${isChecked ? "bg-gold/5 text-gold" : "text-foreground"}`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="w-3.5 h-3.5 accent-gold cursor-pointer"
                          />
                          <span>{c.level > 1 ? "└ " : ""}{c.name}{c.caste ? ` (${c.caste})` : ""}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      );
    };

    const reachCards = [
      {
        id: "Private",
        label: "PRIVATE",
        desc: "Maximum Privacy",
        summary: "Visible only after approval.",
        reach: "0 Profiles",
        communities: "0 Communities",
        bullets: ["Hidden from search", "Hidden from recommendations", "Unlocked only when you accept interest"],
        theme: "border-slate-300 bg-slate-50/5 hover:border-slate-400",
        activeTheme: "border-slate-600 bg-slate-100/10 shadow-lg ring-2 ring-slate-400",
        textColor: "text-slate-600",
        icon: "🔒",
      },
      {
        id: "Community Network",
        label: "COMMUNITY ONLY",
        desc: "Within selected communities",
        summary: "Visible only inside selected communities.",
        reach: `${estimatedReach ?? 0} Profiles`,
        communities: `${estimatedCommunities ?? 0} Communities`,
        bullets: ["Visible within hierarchy", "Appears in community search", "Restricted to selected network"],
        theme: "border-warm bg-surface hover:border-gold",
        activeTheme: "border-gold bg-gold/5 shadow-lg ring-2 ring-gold/40",
        textColor: "text-gold",
        icon: "🏘️",
      },
      {
        id: "Custom Audience",
        label: "TARGETED MATCHES",
        desc: "Matching partner criteria only",
        summary: "Visible only to matching partner criteria.",
        reach: `${estimatedReach ?? 0} Profiles`,
        communities: `${estimatedMatches ?? 0} Match Score Eligible`,
        bullets: ["Visible only to matching filters", "Advanced target demographics", "Restricted profile access"],
        theme: "border-warm bg-surface hover:border-amber-500",
        activeTheme: "border-amber-500 bg-amber-50/5 shadow-lg ring-2 ring-amber-400",
        textColor: "text-amber-600",
        icon: "🎯",
      },
      {
        id: "Platform Wide",
        label: "OPEN TO ALL",
        desc: "Platform-wide reach",
        summary: "Visible platform-wide.",
        reach: "5,000+ Profiles",
        communities: "12 Communities",
        bullets: ["Visible across all platform", "Maximum match probability", "Broadest audience reach"],
        theme: "border-warm bg-surface hover:border-emerald-500",
        activeTheme: "border-emerald-500 bg-emerald-50/5 shadow-lg ring-2 ring-emerald-400",
        textColor: "text-emerald-600",
        icon: "🌐",
      },
    ];

    return (
      <div className="space-y-6">

        {/* ── SECTION 1: PROFILE REACH ── */}
        <div className="rounded-2xl border border-warm/60 overflow-hidden bg-white shadow-sm">
          <div className="px-4 py-3 bg-sand/20 border-b border-warm/40 flex items-center gap-2">
            <span className="text-base">👁️</span>
            <div>
              <p className="text-xs font-extrabold text-foreground uppercase tracking-wider">Step 1 — Profile Reach</p>
              <p className="text-[10px] text-warm-muted">Choose your profile's discoverability mode.</p>
            </div>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {reachCards.map((m) => {
              const isSelected = scope === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    const typeMappingReverse: Record<string, string> = {
                      'Private': 'PRIVATE',
                      'Community Network': 'COMMUNITY_NETWORK',
                      'Custom Audience': 'CUSTOM_AUDIENCE',
                      'Platform Wide': 'PLATFORM_WIDE'
                    };
                    setFormData({ 
                      ...formData, 
                      visibility_scope: m.id,
                      visibility_type: typeMappingReverse[m.id] || m.id
                    });
                  }}
                  className={`text-left p-4 border-2 rounded-2xl cursor-pointer transition-all select-none flex flex-col justify-between min-h-[220px] ${isSelected ? m.activeTheme : m.theme}`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xl">{m.icon}</span>
                      {isSelected ? (
                        <span className="inline-flex items-center gap-1 bg-gold/15 text-gold px-2 py-0.5 rounded-full text-[9px] font-black uppercase">Active</span>
                      ) : (
                        <span className="w-2.5 h-2.5 rounded-full bg-warm/30" />
                      )}
                    </div>
                    <div>
                      <p className={`text-xs font-black uppercase tracking-wide ${isSelected ? m.textColor : "text-foreground"}`}>{m.label}</p>
                      <p className="text-[10px] font-semibold text-warm-muted leading-tight mt-0.5">{m.desc}</p>
                    </div>
                    <p className="text-[10px] text-foreground font-semibold leading-relaxed pt-1 border-t border-warm/25">{m.summary}</p>
                    <ul className="space-y-1 pt-1.5">
                      {m.bullets.map((bullet, idx) => (
                        <li key={idx} className="text-[9px] text-warm-muted flex items-start gap-1">
                          <span className="text-gold shrink-0">✓</span>
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="mt-4 pt-2 border-t border-warm/30 flex items-center justify-between text-[10px] font-bold">
                    <span className="text-foreground">{m.reach}</span>
                    <span className="text-warm-muted">{m.communities}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── SECTION 2: AUDIENCE TARGETING DETAILED SETTINGS ── */}
        {scope === "Community Network" && (
          <div className="rounded-2xl border border-gold/40 overflow-hidden bg-white shadow-sm">
            <div className="px-4 py-3 bg-gold/5 border-b border-gold/20 flex items-center gap-2">
              <span className="text-base">🏘️</span>
              <div>
                <p className="text-xs font-extrabold text-foreground uppercase tracking-wider">Community Visibility Scope</p>
                <p className="text-[10px] text-warm-muted">Control exactly who within the community network can see your profile.</p>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { value: "My Community", label: "My Community Only", desc: "Only exact same community" },
                  { value: "Parent Community", label: "Parent Communities", desc: "My community + parent level" },
                  { value: "Child Communities", label: "Child Communities", desc: "My community + sub-communities" },
                  { value: "Entire Hierarchy Chain", label: "Entire Community Tree", desc: "Full tree — ancestors + descendants" },
                  { value: "Selected Communities", label: "Selected Communities (Custom)", desc: "Manually pick communities" },
                ].map((opt) => (
                  <label key={opt.value} className={`flex items-start gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all select-none ${formData.visibility_hierarchy === opt.value ? "border-gold bg-gold/5" : "border-warm/40 hover:bg-sand/20"}`}>
                    <input type="radio" name="hierarchy_scope" value={opt.value} checked={formData.visibility_hierarchy === opt.value} onChange={() => setFormData({ ...formData, visibility_hierarchy: opt.value })} className="mt-0.5 accent-gold" />
                    <div>
                      <p className="text-xs font-bold text-foreground">{opt.label}</p>
                      <p className="text-[10px] text-warm-muted mt-0.5 leading-snug">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              {formData.visibility_hierarchy === "Selected Communities" && (
                <div className="pt-2">
                  <label className="block text-xs font-bold text-warm-muted uppercase mb-1.5">Select Approved Communities</label>
                  <SearchableCommunitySelect
                    selectedIds={formData.selected_communities || []}
                    onChange={(ids) => setFormData({ ...formData, selected_communities: ids })}
                    placeholder="Search and select communities..."
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {scope === "Custom Audience" && (
          <div className="rounded-2xl border border-amber-400/40 overflow-hidden bg-white shadow-sm">
            <div className="px-4 py-3 bg-amber-50/5 border-b border-amber-200/40 flex items-center gap-2">
              <span className="text-base">🎯</span>
              <div>
                <p className="text-xs font-extrabold text-foreground uppercase tracking-wider">Targeted Matching Demographics</p>
                <p className="text-[10px] text-warm-muted">Set target filters. Only users matching ALL criteria will see your profile.</p>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-warm-muted uppercase mb-1">Gender Focus</label>
                  <select value={formData.filter_gender || "Everyone"} onChange={e => setFormData({ ...formData, filter_gender: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold">
                    <option value="Everyone">Everyone</option>
                    <option value="Groom">Grooms Only</option>
                    <option value="Bride">Brides Only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-warm-muted uppercase mb-1">Min Age Allowed</label>
                  <input type="number" min="18" max="70" value={formData.filter_min_age ?? ""} onChange={e => setFormData({ ...formData, filter_min_age: e.target.value === "" ? "" : parseInt(e.target.value) })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold text-center" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-warm-muted uppercase mb-1">Max Age Allowed</label>
                  <input type="number" min="18" max="70" value={formData.filter_max_age ?? ""} onChange={e => setFormData({ ...formData, filter_max_age: e.target.value === "" ? "" : parseInt(e.target.value) })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold text-center" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-warm-muted uppercase mb-1">Marital Status (comma-separated)</label>
                  <input type="text" value={formData.filter_marital_statuses || ""} onChange={e => setFormData({ ...formData, filter_marital_statuses: e.target.value })} placeholder="e.g. Single, Divorced" className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-warm-muted uppercase mb-1">State Target</label>
                  <input type="text" value={formData.filter_states || ""} onChange={e => setFormData({ ...formData, filter_states: e.target.value })} placeholder="e.g. Gujarat, Maharashtra" className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-warm-muted uppercase mb-1">City Target</label>
                  <input type="text" value={formData.filter_cities || ""} onChange={e => setFormData({ ...formData, filter_cities: e.target.value })} placeholder="e.g. Ahmedabad, Surat" className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-warm-muted uppercase mb-1">Caste List</label>
                  <input type="text" value={formData.filter_castes || ""} onChange={e => setFormData({ ...formData, filter_castes: e.target.value })} placeholder="e.g. Patel, Brahmin" className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-warm-muted uppercase mb-1">Sub-Caste List</label>
                  <input type="text" value={formData.filter_sub_castes || ""} onChange={e => setFormData({ ...formData, filter_sub_castes: e.target.value })} placeholder="e.g. Kadva, Leva" className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-warm-muted uppercase mb-1">Education Requirements</label>
                  <input type="text" value={formData.filter_educations || ""} onChange={e => setFormData({ ...formData, filter_educations: e.target.value })} placeholder="e.g. B.Tech, MBA" className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold" />
                </div>
              </div>
              <div className="pt-2">
                <label className="block text-xs font-bold text-warm-muted uppercase mb-1.5">Communities (Multi-select)</label>
                <SearchableCommunitySelect
                  selectedIds={formData.filter_communities || []}
                  onChange={(ids) => setFormData({ ...formData, filter_communities: ids })}
                  placeholder="Select targeted communities..."
                />
              </div>
            </div>
          </div>
        )}

        {/* ── SECTION 3: CONTACT SHARING POLICY ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-warm/60 overflow-hidden bg-white shadow-sm p-4 space-y-4">
            <div className="flex items-center gap-2 border-b border-warm/20 pb-2">
              <span className="text-base">📞</span>
              <div>
                <p className="text-xs font-extrabold text-foreground uppercase tracking-wider">Step 2 — Contact Sharing Policy</p>
                <p className="text-[10px] text-warm-muted">Controls Phone, WhatsApp, Email, Guardian info, Family info, Address.</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="block text-[10px] font-extrabold text-warm-muted uppercase tracking-wide">When should contact details be revealed?</label>
              <div className="flex flex-col gap-2.5">
                {[
                  { value: "Never", label: "Never Share", desc: "Keep all contacts hidden. Manual unlock requested individually." },
                  { value: "After Interest Approval", label: "After Interest Approval", desc: "Unlock contact automatically once interest request is accepted." },
                  { value: "After Mutual Interest", label: "After Mutual Interest", desc: "Reveal contact details only when both profiles express mutual interest." },
                  { value: "After Family Approval", label: "After Family Approval", desc: "Reveal only after family or guardian explicitly approves." },
                  { value: "Immediately", label: "Immediately", desc: "Reveal contact immediately to any user who is allowed to view your profile." },
                ].map((opt) => (
                  <label key={opt.value} className={`flex items-start gap-2.5 p-2.5 border rounded-xl cursor-pointer hover:bg-sand/10 transition-all ${formData.contact_permission === opt.value ? "border-gold bg-gold/5" : "border-warm/40"}`}>
                    <input
                      type="radio"
                      name="contact_permission"
                      value={opt.value}
                      checked={formData.contact_permission === opt.value}
                      onChange={() => setFormData({ ...formData, contact_permission: opt.value })}
                      className="mt-0.5 accent-gold"
                    />
                    <div>
                      <p className="text-xs font-bold text-foreground">{opt.label}</p>
                      <p className="text-[9px] text-warm-muted mt-0.5 leading-snug">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* ── SECTION 4: PHOTO PRIVACY ── */}
          <div className="rounded-2xl border border-warm/60 overflow-hidden bg-white shadow-sm p-4 space-y-4">
            <div className="flex items-center gap-2 border-b border-warm/20 pb-2">
              <span className="text-base">📸</span>
              <div>
                <p className="text-xs font-extrabold text-foreground uppercase tracking-wider">Step 3 — Photo Privacy</p>
                <p className="text-[10px] text-warm-muted">Control who can view your profile & album photos.</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-extrabold text-warm-muted uppercase tracking-wide">Photo visibility rules</label>
              <div className="flex flex-col gap-2.5">
                {[
                  { value: "Nobody", label: "Nobody", desc: "Photos are completely hidden from all other members." },
                  { value: "Blurred Preview Only", label: "Blurred Preview Only", desc: "Show a blurred preview of your photo; request access to reveal." },
                  { value: "After Interest Approval", label: "After Interest Approval", desc: "Reveal photos once you approve their interest request." },
                  { value: "After Mutual Interest", label: "After Mutual Interest", desc: "Reveal only if there is a mutual match/accepted request." },
                  { value: "Everyone", label: "Everyone (Public)", desc: "Visible to anyone who is allowed to view your profile." },
                ].map((opt) => (
                  <label key={opt.value} className={`flex items-start gap-2.5 p-2.5 border rounded-xl cursor-pointer hover:bg-sand/10 transition-all ${formData.photo_permission === opt.value ? "border-gold bg-gold/5" : "border-warm/40"}`}>
                    <input
                      type="radio"
                      name="photo_permission"
                      value={opt.value}
                      checked={formData.photo_permission === opt.value}
                      onChange={() => setFormData({ ...formData, photo_permission: opt.value })}
                      className="mt-0.5 accent-gold"
                    />
                    <div>
                      <p className="text-xs font-bold text-foreground">{opt.label}</p>
                      <p className="text-[9px] text-warm-muted mt-0.5 leading-snug">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── SECTION 5: LIVE PROFILE PREVIEW ── */}
        <div className="rounded-2xl border border-warm/60 overflow-hidden bg-white shadow-sm">
          <div className="px-4 py-3 bg-sand/20 border-b border-warm/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">👁️‍🗨️</span>
              <div>
                <p className="text-xs font-extrabold text-foreground uppercase tracking-wider">Step 4 — Live Profile Preview Simulator</p>
                <p className="text-[10px] text-warm-muted">See exactly what other users will see based on your current settings.</p>
              </div>
            </div>
            <div className="flex gap-1 bg-sand/20 p-0.5 rounded-lg border border-warm/40">
              {[
                { id: "stranger", label: "Strangers (NEW)" },
                { id: "interested", label: "Interested (SENT)" },
                { id: "approved", label: "Approved" },
                { id: "connected", label: "Connected (MUTUAL)" },
              ].map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setPreviewRole(role.id as any)}
                  className={`px-2 py-1 rounded-md text-[9px] font-black uppercase transition-all ${previewRole === role.id ? "bg-gold text-white shadow-sm" : "text-warm-muted hover:text-foreground"}`}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 bg-sand/5 grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Simulator Left Pane: Card Render Mock */}
            <div className="md:col-span-4 border border-warm/40 rounded-2xl bg-white p-4 flex flex-col items-center text-center gap-3 relative overflow-hidden shadow-sm">
              <div className="w-24 h-24 rounded-full border border-warm/60 bg-sand/10 flex items-center justify-center relative overflow-hidden">
                {/* Photo Blur Logic */}
                {(() => {
                  const policy = formData.photo_permission;
                  let isBlurred = false;
                  if (previewRole === "stranger") {
                    isBlurred = policy !== "Everyone";
                  } else if (previewRole === "interested") {
                    isBlurred = policy === "Nobody" || policy === "Blurred Preview Only" || policy === "After Interest Approval" || policy === "After Mutual Interest";
                  } else if (previewRole === "approved") {
                    isBlurred = policy === "Nobody" || policy === "Blurred Preview Only" || policy === "After Mutual Interest";
                  } else if (previewRole === "connected") {
                    isBlurred = policy === "Nobody" || policy === "Blurred Preview Only";
                  }

                  if (isBlurred) {
                    return (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-sand/40 backdrop-blur-md">
                        <span className="text-lg">🔒</span>
                        <span className="text-[8px] font-extrabold text-gold uppercase tracking-wider mt-0.5">Blurred Preview</span>
                      </div>
                    );
                  }
                  return (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-50">
                      <span className="text-2xl">👤</span>
                      <span className="text-[8px] font-extrabold text-emerald-600 uppercase tracking-wider mt-0.5">Photo Visible</span>
                    </div>
                  );
                })()}
              </div>

              <div>
                <p className="text-xs font-black text-foreground">{formData.contact_name || "Anjali Patel"}</p>
                <p className="text-[10px] text-warm-muted">{wizardPersonAge} Years • Female</p>
                <p className="text-[10px] text-warm-muted font-bold mt-1">Ahmedabad, Gujarat</p>
              </div>

              {/* Status Tags */}
              <div className="w-full space-y-1.5 mt-2 pt-2 border-t border-warm/25">
                {/* Contact Badge mock */}
                {(() => {
                  const policy = formData.contact_permission;
                  let visible = false;
                  if (previewRole === "stranger") {
                    visible = policy === "Immediately";
                  } else if (previewRole === "interested") {
                    visible = policy === "Immediately";
                  } else if (previewRole === "approved") {
                    visible = policy === "Immediately" || policy === "After Interest Approval";
                  } else if (previewRole === "connected") {
                    visible = policy !== "Never";
                  }

                  if (visible) {
                    return <span className="block w-full text-center bg-emerald-100/50 border border-emerald-500/20 text-emerald-600 rounded-lg py-1 text-[9px] font-black uppercase">🟢 Contact Available</span>;
                  }
                  if (previewRole === "stranger" || previewRole === "interested") {
                    return <span className="block w-full text-center bg-slate-100 border border-slate-500/20 text-slate-600 rounded-lg py-1 text-[9px] font-black uppercase">🔒 Contact Hidden</span>;
                  }
                  return <span className="block w-full text-center bg-amber-100/50 border border-amber-500/20 text-amber-600 rounded-lg py-1 text-[9px] font-black uppercase">🟡 Unlocks After Approval</span>;
                })()}

                {/* Family Badge mock */}
                {(() => {
                  const familyVisible = previewRole === "connected" || previewRole === "approved";
                  if (familyVisible) {
                    return <span className="block w-full text-center bg-emerald-100/50 border border-emerald-500/20 text-emerald-600 rounded-lg py-1 text-[9px] font-black uppercase">🟢 Family Details Available</span>;
                  }
                  return <span className="block w-full text-center bg-slate-100 border border-slate-500/20 text-slate-600 rounded-lg py-1 text-[9px] font-black uppercase">🔒 Family Details Hidden</span>;
                })()}
              </div>
            </div>

            {/* Simulator Right Pane: Field-level audit details */}
            <div className="md:col-span-8 border border-warm/40 rounded-2xl bg-white p-4 space-y-3 relative overflow-hidden shadow-sm">
              <p className="text-[10px] font-extrabold text-foreground uppercase tracking-wider pb-1.5 border-b border-warm/20">Data Field Serialization Audit</p>
              
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {[
                  {
                    name: "Full Name",
                    value: "Anjali Patel",
                    show: true,
                    rule: "Always visible"
                  },
                  {
                    name: "Age & Gender",
                    value: `${wizardPersonAge} Years • Female`,
                    show: true,
                    rule: "Always visible"
                  },
                  {
                    name: "City & State",
                    value: "Ahmedabad, Gujarat",
                    show: true,
                    rule: "Always visible"
                  },
                  {
                    name: "Education Qualification",
                    value: formData.education || "M.S. Computer Science",
                    show: previewRole !== "stranger",
                    rule: "Hidden for Strangers; Visible to Interested and above"
                  },
                  {
                    name: "Occupation/Profession",
                    value: formData.profession || "Software Engineer",
                    show: previewRole !== "stranger",
                    rule: "Hidden for Strangers; Visible to Interested and above"
                  },
                  {
                    name: "Annual Income",
                    value: formData.income ? `₹ ${formData.income}` : "₹ 15-20 Lakhs",
                    show: previewRole === "connected" || previewRole === "approved",
                    rule: "Hidden for Strangers/Interested; Visible to Approved and above"
                  },
                  {
                    name: "Contact Mobile",
                    value: formData.contact_phone || "+91 98765 43210",
                    show: (() => {
                      const policy = formData.contact_permission;
                      if (previewRole === "stranger") return policy === "Immediately";
                      if (previewRole === "interested") return policy === "Immediately";
                      if (previewRole === "approved") return policy === "Immediately" || policy === "After Interest Approval";
                      if (previewRole === "connected") return policy !== "Never";
                      return false;
                    })(),
                    rule: `Governed by Contact Sharing Policy: ${formData.contact_permission}`
                  },
                  {
                    name: "Family Member Name",
                    value: formData.contact_name || "Ramesh Shah",
                    show: previewRole === "connected" || previewRole === "approved",
                    rule: "Hidden for Strangers/Interested; Unlocks on Approval/Connected"
                  },
                  {
                    name: "Father's Occupation",
                    value: formData.fathers_occupation || "Business Owner",
                    show: previewRole === "connected" || previewRole === "approved",
                    rule: "Hidden for Strangers/Interested; Unlocks on Approval/Connected"
                  }
                ].map((f, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between text-xs py-1.5 border-b border-warm/10 last:border-0">
                    <div className="space-y-0.5">
                      <p className="font-bold text-foreground">{f.name}</p>
                      <p className="text-[9px] text-warm-muted">{f.rule}</p>
                    </div>
                    <div className="text-right mt-1 sm:mt-0 font-mono">
                      {f.show ? (
                        <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-bold">{f.value}</span>
                      ) : (
                        <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded text-[10px] font-bold">null (Hidden)</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── SECTION 6: VERIFICATION & TRUST ── */}
        <div className="rounded-2xl border border-warm/60 overflow-hidden bg-white shadow-sm">
          <div className="px-4 py-3 bg-sand/20 border-b border-warm/40 flex items-center gap-2">
            <span className="text-base">🛡️</span>
            <div>
              <p className="text-xs font-extrabold text-foreground uppercase tracking-wider">Step 5 — Verification & Trust</p>
              <p className="text-[10px] text-warm-muted">Identity documents used for profile verification only. Never shared.</p>
            </div>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Aadhaar Number</label>
              <input type="text" value={formData.aadhaar} onChange={e => setFormData({ ...formData, aadhaar: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold" placeholder="12-digit Aadhaar" maxLength={12} />
            </div>
            <div>
              <label className="block text-xs font-bold text-warm-muted uppercase mb-1">PAN Number</label>
              <input type="text" value={formData.pan} onChange={e => setFormData({ ...formData, pan: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold" placeholder="PAN Card ID" maxLength={10} />
            </div>
          </div>
        </div>

      </div>
    );
  };

  // Setup / Creation profile wizard
  const startCreateWizard = () => {
    const person = peopleList.find(p => p.id === selectedPersonId);
    if (!person) return;
    
    setCreateProfileFor(person.isSelf ? "Self" : "Family Member");
    
    setFormData({
      relationship: person.isSelf ? "Self" : person.relation,
      marital_status: "Single",
      divorce_year: "",
      has_children: false,
      children_count: 0,
      children_living_with: "",
      year_of_loss: "",
      widowed_children_info: "",
      height: "",
      weight: "",
      complexion: "Fair",
      education: "",
      profession: "",
      income: "",
      diet: "Vegetarian",
      smoking: "No",
      drinking: "No",
      about: "",
      religion: "Hindu",
      mother_tongue: "Gujarati",
      languages_known: "",
      native_place: person.city || "",
      current_address: "",
      family_type: "Nuclear",
      family_values: "Traditional",
      fathers_occupation: "",
      mothers_occupation: "",
      siblings_count: 0,
      visibility_scope: "Public",
      contact_permission: "Everyone Who Can View",
      allow_interests: true,
      allow_direct_chat: true,
      allow_phone: true,
      allow_whatsapp: true,
      allow_email: true,
      contact_name: person.name,
      contact_relation: person.isSelf ? "Self" : "Parent",
      contact_phone: currentUser?.member?.phone || "",
      contact_whatsapp: currentUser?.member?.phone || "",
      contact_email: currentUser?.email || "",
      visibility_hierarchy: "My Community",
      selected_communities: [],
      filter_communities: [],
      filter_castes: "",
      filter_sub_castes: "",
      filter_states: "",
      filter_cities: "",
      filter_gender: "Everyone",
      filter_min_age: 18,
      filter_max_age: 60,
      filter_marital_statuses: "",
      filter_educations: "",
      filter_occupations: "",
    });

    setPrefForm({
      gender: (person.gender === "Male" || person.gender === "Groom") ? "Bride" : "Groom",
      min_age: 18,
      max_age: 60,
      caste: person.caste || "",
      sub_caste: person.sub_caste || "",
      education: "",
      occupation: "",
      city: "",
      state: "",
      country: "India",
      min_height: "",
      max_height: "",
      marital_status: "Any",
      income_range: "",
    });

    setWizardPhotoFiles([]);
    setWizardStep(1);
    setIsCreateModalOpen(true);
  };

  const handleCreateProfileSubmit = async () => {
    console.log("[CreateProfileForm] handleCreateProfileSubmit initiated.");
    const person = peopleList.find(p => p.id === selectedPersonId);
    if (!person) {
      console.warn("[CreateProfileForm] Target person not found for selectedPersonId:", selectedPersonId);
      toast.error("Target person not found.");
      return;
    }

    // Run complete validation
    const isValid = validateCreateProfile();
    if (!isValid) {
      console.warn("[CreateProfileForm] Validation failed. Errors:", validationErrors);
      toast.error("Please fill in all required fields and resolve errors.");
      return;
    }

    const primaryPhotoItem = wizardPhotoFiles.find(p => p.isPrimary);
    if (!primaryPhotoItem) {
      console.warn("[CreateProfileForm] No primary photo selected.");
      toast.error("Please select a primary profile photo.");
      return;
    }

    setSavingProfile(true);
    try {
      const payload = {
        ...formData,
        member_id: person.isSelf ? "self" : person.id,
        relationship: person.isSelf ? "Self" : person.relation,
        dob: person.birthdate,
        gender: person.gender,
        caste: person.caste,
        sub_caste: person.sub_caste,
        city: person.city,
        state: person.state,
        photo: primaryPhotoItem.file,
      };

      console.log("[CreateProfileForm] Outgoing payload to api.createMatrimonyProfile:", payload);
      const newProfile = await api.createMatrimonyProfile(payload);
      console.log("[CreateProfileForm] Response from api.createMatrimonyProfile:", newProfile);
      const profileId = newProfile.id;

      // Upload remaining photos
      const otherPhotos = wizardPhotoFiles.filter(ph => !ph.isPrimary);
      console.log("[CreateProfileForm] Uploading remaining photos count:", otherPhotos.length);
      for (const ph of otherPhotos) {
        console.log("[CreateProfileForm] Uploading photo file:", ph.file.name, "category:", ph.category, "isPrivate:", ph.isPrivate);
        await api.uploadMatrimonyPhoto(profileId, ph.file, ph.category, ph.isPrivate);
      }

      // Save partner preferences
      console.log("[CreateProfileForm] Outgoing preferences to api.updateMatrimonyPreferences:", prefForm);
      const prefResponse = await api.updateMatrimonyPreferences(prefForm, profileId);
      console.log("[CreateProfileForm] Response from api.updateMatrimonyPreferences:", prefResponse);

      toast.success("Matrimony profile created successfully!");
      setIsCreateModalOpen(false);
      setWizardPhotoFiles([]);
      
      console.log("[CreateProfileForm] Fetching latest profiles list...");
      const updatedProfiles = await api.getMyProfiles();
      console.log("[CreateProfileForm] Updated profiles list:", updatedProfiles);
      setMyProfiles(updatedProfiles);
      
      // Auto-select the newly created profile
      if (updatedProfiles && updatedProfiles.length > 0) {
        const newlyCreated = updatedProfiles.find((p: any) => p.id === profileId) || updatedProfiles[0];
        console.log("[CreateProfileForm] Setting active profile to:", newlyCreated);
        setSelectedPersonId(newlyCreated.family_member_id || newlyCreated.id);
        setSelectedProfile(newlyCreated);
      }
    } catch (err: any) {
      console.error("[CreateProfileForm] Error creating profile:", err);
      toast.error(err.message || "Failed to create profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdateProfileSubmit = async () => {
    console.log("[EditProfileForm] handleUpdateProfileSubmit initiated.");
    if (!selectedProfile) {
      console.warn("[EditProfileForm] No selectedProfile is active.");
      return;
    }
    
    if (formData.marital_status === "Divorced" && !formData.divorce_year) {
      toast.error("Year of Divorce is required for Divorced status");
      return;
    }
    if (formData.marital_status === "Widowed" && !formData.year_of_loss) {
      toast.error("Year of Loss is required for Widowed status");
      return;
    }

    setSavingProfile(true);
    try {
      console.log("[EditProfileForm] Outgoing payload to api.updateMatrimonyProfile:", formData);
      const updatedProfile = await api.updateMatrimonyProfile(formData, selectedProfile.id);
      console.log("[EditProfileForm] Response from api.updateMatrimonyProfile:", updatedProfile);

      console.log("[EditProfileForm] Outgoing preferences to api.updateMatrimonyPreferences:", prefForm);
      const prefResponse = await api.updateMatrimonyPreferences(prefForm, selectedProfile.id);
      console.log("[EditProfileForm] Response from api.updateMatrimonyPreferences:", prefResponse);

      toast.success("Profile updated successfully!");
      setIsEditModalOpen(false);

      // Refresh everything from backend
      console.log("[EditProfileForm] Refreshing active profile details...");
      await refreshProfile(selectedProfile.id);
      await fetchFilteredMatches(selectedProfile.id);
    } catch (err: any) {
      console.error("[EditProfileForm] Error updating profile:", err);
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePreferencesSubmit = async () => {
    if (!selectedProfile) return;
    setSavingPrefs(true);
    try {
      await api.updateMatrimonyPreferences(prefForm, selectedProfile.id);
      toast.success("Partner preferences updated successfully!");
      setIsPreferencesModalOpen(false);

      // Re-fetch profile so partner_preference and status update
      await refreshProfile(selectedProfile.id);
      await fetchFilteredMatches(selectedProfile.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to save partner preferences");
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleVerifyProfile = async (profileId: number, name: string) => {
    try {
      await api.verifyMatrimonyProfile(profileId);
      toast.success(`Verified ${name}'s matrimony profile!`);
      loadAdminProfiles();
    } catch (err: any) {
      toast.error(err.message || "Verification failed");
    }
  };

  const handleSuspendProfile = async (profileId: number, name: string) => {
    try {
      await api.suspendMatrimonyProfile(profileId);
      toast.success(`Suspended ${name}'s matrimony profile.`);
      loadAdminProfiles();
    } catch (err: any) {
      toast.error(err.message || "Failed to suspend profile");
    }
  };

  // Height parsing utility
  const parseHeightToInches = (hStr: string): number => {
    if (!hStr) return 0;
    const match = hStr.match(/(\d+)\s*(?:'|ft|feet)\s*(\d+)?/i);
    if (match) {
      const ft = parseInt(match[1], 10);
      const inch = match[2] ? parseInt(match[2], 10) : 0;
      return ft * 12 + inch;
    }
    const decMatch = hStr.match(/(\d+)\.(\d+)/);
    if (decMatch) {
      const ft = parseInt(decMatch[1], 10);
      const inch = parseInt(decMatch[2], 10);
      return ft * 12 + inch;
    }
    return 0;
  };

  // Income level check utility
  const checkIncomeMatch = (incomeStr: string, range: string): boolean => {
    if (range === "Any") return true;
    if (!incomeStr) return false;
    const inc = incomeStr.toLowerCase();
    if (range === "Below 1L") {
      return inc.includes("below") || inc.includes("1l") || inc.includes("1 lakh") || inc.includes("1,00,000");
    }
    if (range === "1-3L") {
      return inc.includes("1-3") || inc.includes("2l") || inc.includes("3l");
    }
    if (range === "3-5L") {
      return inc.includes("3-5") || inc.includes("4l") || inc.includes("5l");
    }
    if (range === "5-10L") {
      return inc.includes("5-10") || inc.includes("6l") || inc.includes("7l") || inc.includes("8l") || inc.includes("9l") || inc.includes("10l");
    }
    if (range === "10L+") {
      return inc.includes("10l+") || inc.includes("10+") || inc.includes("above 10") || inc.includes("12l") || inc.includes("15l") || inc.includes("20l");
    }
    return true;
  };

  // Recommended matches filtering logic
  const filteredMatches = matches;

  const getUniqueCastes = () => {
    const vals = matches.map(p => p.caste).filter(Boolean);
    return ["Any", ...Array.from(new Set(vals))];
  };

  const getAllowedCommunities = () => {
    if (!currentUser?.member?.community || communities.length === 0) return communities;
    const userCommId = currentUser.member.community;
    const userComm = communities.find(c => c.id === userCommId);
    const allowedIds = new Set<number>();
    allowedIds.add(userCommId);

    if (userComm) {
      if (userComm.parent) {
        allowedIds.add(typeof userComm.parent === "object" ? userComm.parent.id : userComm.parent);
      }
    }
    
    communities.forEach(c => {
      const parentId = typeof c.parent === "object" ? c.parent?.id : c.parent;
      if (parentId === userCommId) {
        allowedIds.add(c.id);
      }
    });

    return communities.filter(c => allowedIds.has(c.id));
  };

  const validateCreateProfile = (step?: number): boolean => {
    const errors: Record<string, string> = {};
    
    // Step 1 validation
    if (!step || step === 1) {
      if (formData.marital_status === "Divorced" && !formData.divorce_year) {
        errors.divorce_year = "Year of Divorce is required for Divorced status.";
      }
      if (formData.marital_status === "Widowed" && !formData.year_of_loss) {
        errors.year_of_loss = "Year of Loss is required for Widowed status.";
      }
    }
    
    // Step 3 validation
    if (!step || step === 3) {
      // About Me is now optional
    }

    // Step 6 validation
    if (!step || step === 6) {
      if (wizardPhotoFiles.length === 0) {
        errors.photos = "At least 1 profile photo is required to create a profile.";
      } else {
        const primary = wizardPhotoFiles.find(p => p.isPrimary);
        if (!primary) {
          errors.photos = "Please select a primary profile photo.";
        }
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Render step navigation triggers inside modals
  const renderStepTabs = (current: number, setStep: (s: number) => void) => {
    const steps = ["Basic Details", "Education", "Lifestyle", "Preferences", "Privacy & Visibility", "Photos"];
    return (
      <div className="flex border-b border-warm mb-6 overflow-x-auto scrollbar-none font-ui text-xs font-bold">
        {steps.map((s, idx) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              const targetStep = idx + 1;
              if (targetStep < current) {
                setStep(targetStep);
              } else {
                let isValid = true;
                for (let stepToVal = current; stepToVal < targetStep; stepToVal++) {
                  if (!validateCreateProfile(stepToVal)) {
                    isValid = false;
                    toast.error(`Please complete the required details on Step ${stepToVal} first.`);
                    break;
                  }
                }
                if (isValid) {
                  setStep(targetStep);
                }
              }
            }}
            className={`pb-2 px-3 border-b-2 transition-all whitespace-nowrap ${current === idx + 1 ? "border-gold text-gold" : "border-transparent text-warm-muted"}`}
          >
            {s}
          </button>
        ))}
      </div>
    );
  };

  if (!isMounted) {
    return (
      <PageWrap title="Matrimony Portal" desc="Find verified life partners within your samaj and community hierarchy">
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-gold" />
          <span className="text-sm font-semibold text-warm-muted">Loading Matrimony Workspace...</span>
        </div>
      </PageWrap>
    );
  }

  return (
    <PageWrap title="Matrimony Portal" desc="Find verified life partners within your samaj and community hierarchy">
      <MatrimonyStyles />
      
      {/* 1. ONE PERSON = ONE PROFILE: TOP MANAGER DROPDOWN */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-gradient-to-r from-amber-50/70 to-orange-50/20 dark:from-zinc-900/40 dark:to-zinc-900/10 p-6 rounded-3xl border border-gold-light/40 shadow-sm font-ui">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gold/10 flex items-center justify-center text-gold border border-gold/20 shrink-0">
            <Heart className="w-6 h-6 fill-gold/15" />
          </div>
          <div>
            <div className="text-[10px] text-warm-muted uppercase font-bold tracking-wider mb-1">Viewing Space For:</div>
            <select
              value={selectedPersonId}
              onChange={(e) => setSelectedPersonId(e.target.value)}
              className="bg-transparent font-bold text-base md:text-lg text-foreground border-none focus:ring-0 p-0 cursor-pointer outline-none font-ui"
            >
              {peopleList.map((p) => (
                <option key={p.id} value={p.id} className="text-foreground dark:bg-zinc-800">
                  {p.name} ({p.relation})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {selectedProfile ? (
            <div className="flex items-center gap-3 bg-surface border border-warm/80 px-4 py-2 rounded-2xl shadow-xs">
              <span className="text-[10px] text-warm-muted font-bold uppercase">Status:</span>
              <div className="flex items-center gap-2 relative group">
                <StatusBadge status={selectedProfile.status || "Draft"} />
                {(selectedProfile.status || "Draft") === "Draft" && (
                  <>
                    <span className="text-zinc-400 cursor-help text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold">
                      ?
                    </span>
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block w-72 bg-zinc-950 text-white text-[11px] p-3 rounded-xl shadow-xl z-50 leading-relaxed font-normal">
                      Complete education, occupation, partner preferences and upload a primary photo to activate your profile.
                    </div>
                  </>
                )}
              </div>
              {selectedProfile.is_verified && (
                <span className="bg-teal-500/10 text-teal-600 dark:text-teal-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-teal-500/20">
                  <Shield className="w-3.5 h-3.5 fill-teal-500/10" /> Verified
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-warm-muted font-bold uppercase bg-sand/30 dark:bg-zinc-800 px-3 py-1.5 rounded-full">
                No Matrimony Profile
              </span>
              <button
                onClick={startCreateWizard}
                className="px-4 py-2 bg-gold hover:bg-gold/90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" /> Create Profile
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Persistent Status Notification Banner */}
      {selectedProfile && selectedProfile.status && selectedProfile.status !== "Approved" && selectedProfile.status !== "Active" && selectedProfile.status !== "Featured" && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "mb-6 p-4 rounded-2xl border flex items-start gap-3.5 shadow-sm font-ui",
            selectedProfile.status === "Pending Approval" || selectedProfile.status === "Ready For Review"
              ? "bg-amber-500/5 border-amber-500/20 text-amber-800 dark:text-amber-300"
              : selectedProfile.status === "Draft"
              ? "bg-blue-500/5 border-blue-500/20 text-blue-800 dark:text-blue-300"
              : selectedProfile.status === "Rejected"
              ? "bg-rose-500/5 border-rose-500/20 text-rose-800 dark:text-rose-300"
              : "bg-red-500/5 border-red-500/20 text-red-800 dark:text-red-300" // Suspended
          )}
        >
          <div className={cn(
            "p-2 rounded-xl shrink-0 border",
            selectedProfile.status === "Pending Approval" || selectedProfile.status === "Ready For Review"
              ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
              : selectedProfile.status === "Draft"
              ? "bg-blue-500/10 border-blue-500/20 text-blue-500"
              : selectedProfile.status === "Rejected"
              ? "bg-rose-500/10 border-rose-500/20 text-rose-500"
              : "bg-red-500/10 border-red-500/20 text-red-500"
          )}>
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-sm">
              {selectedProfile.status === "Pending Approval" || selectedProfile.status === "Ready For Review"
                ? "Profile Pending Approval"
                : selectedProfile.status === "Draft"
                ? "Profile in Draft Mode"
                : selectedProfile.status === "Rejected"
                ? "Profile Rejected by Moderator"
                : "Profile Suspended"
              }
            </h4>
            <p className="text-xs opacity-90 leading-relaxed font-semibold">
              {selectedProfile.status === "Pending Approval" || selectedProfile.status === "Ready For Review"
                ? "Your Matrimony Profile is pending administrative review. You will be able to search and interact with other matches once approved by the community admin."
                : selectedProfile.status === "Draft"
                ? "Your Matrimony Profile is currently in Draft. Please complete all required sections (education, occupation, location, and photos) to automatically submit it for approval."
                : selectedProfile.status === "Rejected"
                ? "Your Matrimony Profile has been rejected by the administrative moderation team. Please review your profile data or contact community admins for more information."
                : "Your Matrimony Profile has been suspended by community admins. Platform interactions and matches are currently disabled."
              }
            </p>
          </div>
        </motion.div>
      )}

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-gold" />
          <span className="text-sm font-semibold text-warm-muted">Syncing matrimony dashboard workspace...</span>
        </div>
      ) : selectedProfile ? (
        <div className="space-y-8">
          
          {/* 2. THREE-TIER WORKSPACE LAYOUT */}
          {/* TIER 1: TOP SECTION (COMPLETION, CHECKLIST & QUICK STATS) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 font-ui">
            
            {/* Left: Completion Card */}
            <AnimatedCard className="p-5 flex items-center gap-4 border-l-4 border-l-gold">
              <ProgressRing value={getProfileCompletion(selectedProfile)} size={72} stroke={8} />
              <div className="space-y-1 flex-1">
                <h4 className="font-bold text-sm text-foreground">Completion</h4>
                <p className="text-2xl font-black text-gold font-ui">{getProfileCompletion(selectedProfile)}%</p>
                <p className="text-[11px] text-warm-muted leading-relaxed">
                  {getProfileCompletion(selectedProfile) < 100 
                    ? "Add details & preferences to get 100% matches."
                    : "Your matrimony bio-data is complete."}
                </p>
              </div>
            </AnimatedCard>

            {/* Middle: Checklist Card */}
            <AnimatedCard className="p-5 border border-warm/80 bg-surface/50 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-foreground">Status Checklist</h4>
                {(selectedProfile.status === "Draft") && (
                  <div className="group relative">
                    <span className="cursor-pointer text-[10px] text-amber-600 underline font-bold">
                      Why Draft?
                    </span>
                    <div className="absolute right-0 bottom-6 hidden group-hover:block w-64 bg-zinc-950 text-white text-[11px] p-3 rounded-xl shadow-xl z-50 leading-relaxed font-normal">
                      Complete core details (education, profession, city), upload a profile photo,
                      and reach ≥50% completion to activate your profile.
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[10px] font-bold">
                {[
                  { label: "Basic Details", ok: isBasicDetailsComplete(selectedProfile), hint: "name, dob, education, profession, city, state, about (50+ chars)" },
                  { label: "Physical Info", ok: isPhysicalDetailsComplete(selectedProfile), hint: "height, weight, complexion" },
                  { label: "Profile Photo", ok: isPhotoUploaded(selectedProfile), hint: "upload a profile photo" },
                  { label: "Preferences", ok: isPartnerPreferencesConfigured(selectedProfile), hint: "configure partner preferences" },
                  { label: "Contact Info", ok: isContactInfoComplete(selectedProfile), hint: "contact name or phone number" },
                  { label: "Verification", ok: isVerified(selectedProfile), hint: "community admin verifies your profile" },
                ].map(({ label, ok, hint }) => (
                  <div key={label} className="flex items-center gap-1.5 group/item relative">
                    <span className={ok ? "text-emerald-500" : "text-zinc-400"}>{ok ? "✓" : "✗"}</span>
                    <span className={ok ? "text-foreground font-semibold" : "text-warm-muted font-normal"}>{label}</span>
                    {!ok && (
                      <div className="absolute left-0 bottom-5 hidden group-hover/item:block w-48 bg-zinc-950 text-white text-[10px] p-2 rounded-lg shadow-lg z-50 leading-relaxed font-normal pointer-events-none">
                        Required: {hint}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </AnimatedCard>

            {/* Right: Quick Stats */}
            <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Mutual Matches", val: analytics.matches || 0, icon: Heart, color: "text-rose-500 bg-rose-50 dark:bg-rose-950/20" },
                { label: "Profile Views", val: analytics.views || 0, icon: Users, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20" },
                { label: "Interests Sent", val: analytics.interestsSent || 0, icon: Send, color: "text-blue-500 bg-blue-50 dark:bg-blue-950/20" },
                { label: "Interests Recv", val: analytics.interestsReceived || 0, icon: Inbox, color: "text-teal-600 bg-teal-50 dark:bg-teal-950/20" }
              ].map((item, idx) => (
                <AnimatedCard key={idx} className="p-4 flex flex-col justify-center">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-black font-ui text-foreground">{item.val}</span>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                  </div>
                  <span className="text-[10px] text-warm-muted uppercase font-bold tracking-wider">{item.label}</span>
                </AnimatedCard>
              ))}
            </div>
          </div>

          {/* TIER 2: MIDDLE SECTION (PREMIUM PROFILE CARD) */}
          <AnimatedCard className="overflow-hidden border border-warm/80">
            <div className="grid md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr]">
              
              {/* Left Column: Photo Area */}
              <div className="relative aspect-[4/5] md:aspect-auto md:h-full bg-sand/15 overflow-hidden border-r border-warm/40">
                <img
                  src={resolvePhotoUrl(selectedProfile.photo || selectedProfile.photo_url || (selectedProfile.photos && selectedProfile.photos[0]?.image)) || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&fit=crop"}
                  alt={selectedProfile.name}
                  className="w-full h-full object-cover"
                />
                
                {/* Visual completion overlay */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 text-white">
                  <p className="text-xs text-zinc-300 font-medium font-ui">Primary Photo</p>
                  <p className="text-sm font-bold truncate mt-0.5">{selectedProfile.name}</p>
                </div>
              </div>

              {/* Right Column: Key Details Grid & 4 Actions */}
              <div className="p-6 md:p-8 flex flex-col justify-between space-y-6">
                
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-warm pb-4 mb-4">
                    <div>
                      <h3 className="text-xl md:text-2xl font-black text-foreground font-ui">{selectedProfile.name}</h3>
                      <p className="text-xs text-warm-muted font-bold font-ui mt-0.5">
                        Profile Managed By: <span className="text-gold">{selectedProfile.relationship || "Self"}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-sand text-warm-muted dark:bg-zinc-800 text-xs font-bold px-3 py-1 rounded-full">
                        {selectedProfile.marital_status}
                      </span>
                    </div>
                  </div>

                  {/* Bio Data Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 text-xs font-semibold text-foreground/80 font-ui">
                    <div>
                      <span className="text-[10px] text-warm-muted uppercase block font-bold mb-0.5">Age & Gender</span>
                      <span>{selectedProfile.age} Years • {selectedProfile.gender}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-warm-muted uppercase block font-bold mb-0.5">Caste / Sub-Caste</span>
                      <span>{selectedProfile.caste || "Ahir"} / {selectedProfile.sub_caste || "Samaj"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-warm-muted uppercase block font-bold mb-0.5">Location</span>
                      <span>{selectedProfile.city || "Not set"}, {selectedProfile.state || "India"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-warm-muted uppercase block font-bold mb-0.5">Education</span>
                      <span className="truncate block max-w-[180px]">{selectedProfile.education || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-warm-muted uppercase block font-bold mb-0.5">Occupation</span>
                      <span className="truncate block max-w-[180px]">{selectedProfile.profession || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-warm-muted uppercase block font-bold mb-0.5">Annual Income</span>
                      <span>{selectedProfile.income || "N/A"}</span>
                    </div>
                  </div>
                </div>

                {/* 4 Action Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-warm">
                  <button
                    onClick={() => setIsViewModalOpen(true)}
                    className="py-2.5 px-3 bg-surface hover:bg-sand border border-warm rounded-xl text-xs font-bold text-foreground flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Eye className="w-4 h-4 text-warm-muted" /> View Profile
                  </button>
                  <button
                    onClick={() => {
                      if (selectedProfile) {
                        populateFormData(selectedProfile);
                        if (selectedProfile.partner_preference) {
                          populatePrefForm(selectedProfile.partner_preference, selectedProfile.gender);
                        }
                      }
                      setEditModalStep(1);
                      setIsEditModalOpen(true);
                    }}
                    className="py-2.5 px-3 bg-surface hover:bg-sand border border-warm rounded-xl text-xs font-bold text-foreground flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Settings className="w-4 h-4 text-warm-muted" /> Edit Profile
                  </button>
                  <button
                    onClick={() => setIsPhotosModalOpen(true)}
                    className="py-2.5 px-3 bg-surface hover:bg-sand border border-warm rounded-xl text-xs font-bold text-foreground flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Camera className="w-4 h-4 text-warm-muted" /> Upload Photos
                  </button>
                  <button
                    onClick={() => {
                      if (selectedProfile) {
                        populatePrefForm(selectedProfile.partner_preference, selectedProfile.gender);
                      }
                      setIsPreferencesModalOpen(true);
                    }}
                    className="py-2.5 px-3 bg-surface hover:bg-sand border border-warm rounded-xl text-xs font-bold text-foreground flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Sliders className="w-4 h-4 text-warm-muted" /> Preferences
                  </button>
                </div>

              </div>
            </div>
          </AnimatedCard>

          {/* TIER 3: BOTTOM SECTION (TABS & RECOMMENDED MATCHES GRID) */}
          <div className="space-y-6">
            <div 
              ref={tabContainerRef}
              className={`sticky top-14 md:top-0 z-30 flex gap-1 border-b overflow-x-auto scrollbar-none p-1 rounded-t-2xl transition-all duration-300 ${
                isTabSticky 
                  ? "bg-surface shadow-md border-warm shadow-warm/20 py-2" 
                  : "bg-surface/40 backdrop-blur-xs border-warm"
              }`}
            >
              {[
                { id: "matches", label: "Recommended Matches", icon: Sparkles },
                { id: "shortlisted", label: "Shortlisted Partners", icon: Bookmark },
                { id: "sent", label: "Interests Sent", icon: Send },
                { id: "received", label: "Interests Received", icon: Inbox },
                { id: "history", label: "Profile Update Logs", icon: FileText },
                ...(currentUser?.role === "admin" || currentUser?.role === "superadmin" || currentUser?.is_staff 
                  ? [{ id: "admin", label: "Pending verifications", icon: Shield }] 
                  : [])
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => handleTabChange(t.id)}
                  className={`relative px-4 py-2.5 text-xs md:text-sm font-bold whitespace-nowrap transition-all duration-300 flex items-center gap-1.5 rounded-xl ${
                    activeTab === t.id 
                      ? "text-white z-10 font-black" 
                      : "text-warm-muted hover:text-foreground hover:bg-sand/40"
                  }`}
                >
                  <t.icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                  {activeTab === t.id && (
                    <motion.div
                      layoutId="activeTabPill"
                      className="absolute inset-0 bg-gold rounded-xl -z-10 shadow-sm shadow-gold/20"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* TAB PANELS */}
            <div id="matrimony-tab-content-area" className="min-h-[70vh] relative w-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: "easeInOut" }}
                  className="w-full"
                >
                  {["matches", "shortlisted", "sent", "received"].includes(activeTab) &&
                  (!selectedProfile || (
                    selectedProfile.status !== "Approved" &&
                    selectedProfile.status !== "Active" &&
                    selectedProfile.status !== "Featured"
                  )) ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center bg-surface border border-warm/80 rounded-3xl space-y-4 max-w-lg mx-auto shadow-sm my-8">
                      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                        <Lock className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground">Awaiting Approval</h3>
                      <p className="text-xs text-warm-muted leading-relaxed font-semibold">
                        Your Matrimony Profile is awaiting approval. Once approved by your Community Admin, you will be able to browse approved profiles, receive matches, and interact with other members.
                      </p>
                      {(!selectedProfile || selectedProfile.status === "Draft") && (
                        <button
                          onClick={() => {
                            if (selectedProfile) {
                              populateFormData(selectedProfile);
                              if (selectedProfile.partner_preference) {
                                populatePrefForm(selectedProfile.partner_preference, selectedProfile.gender);
                              }
                            }
                            setEditModalStep(1);
                            setIsEditModalOpen(true);
                          }}
                          className="px-5 py-2.5 bg-gold hover:bg-gold/90 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                        >
                          <Settings className="w-4 h-4" /> {selectedProfile ? "Complete Your Profile" : "Create Matrimony Profile"}
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      {activeTab === "matches" && (
                  <div className="grid lg:grid-cols-[280px_1fr] gap-6 items-start">
                
                {/* Refine Search Sidebar */}
                <AnimatedCard className="p-5 space-y-4 font-ui bg-surface/80 backdrop-blur-md border border-warm/60 shadow-lg max-h-[85vh] overflow-y-auto scrollbar-thin">
                  <div className="flex items-center justify-between border-b border-warm pb-3">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-warm-muted">Refine Matches</h3>
                    <button 
                      onClick={() => { 
                        setSearchQuery("");
                        setFilterAge([18, 60]); 
                        setFilterMaritalStatus("Any"); 
                        setFilterVerifiedOnly(false);
                        setFilterCaste("Any"); 
                        setFilterLocation("");
                        setFilterHeight([48, 84]);
                        setFilterEducation([]);
                        setFilterOccupation([]);
                        setFilterIncome("Any");
                        setFilterCommunityId("Any");
                        setShowOutsidePreferences(false);
                      }} 
                      className="text-[10px] text-gold font-bold hover:underline"
                    >
                      Reset All
                    </button>
                  </div>
                  <div className="space-y-4 text-xs font-semibold text-warm-muted">
                    {/* Show profiles outside my preferences toggle */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-sand/20 border border-warm/40">
                      <div className="flex flex-col mr-2">
                        <span className="font-bold text-xs text-warm-muted">Show profiles outside preferences</span>
                        <span className="text-[9px] text-warm-muted/70 font-normal">Bypasses mandatory Gender/Age/Caste/Marital Status filters</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={showOutsidePreferences}
                        onChange={e => setShowOutsidePreferences(e.target.checked)}
                        className="w-4 h-4 text-gold border-warm rounded-md focus:ring-gold cursor-pointer"
                      />
                    </div>

                    {/* Keyword search */}
                    <div>
                      <label className="block mb-1 font-bold">Keyword search</label>
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search name, education..." 
                        className="w-full px-3 py-2 rounded-xl border border-warm bg-surface focus:outline-none focus:border-gold"
                      />
                    </div>

                    {/* Dual Age Slider */}
                    <div>
                      <div className="flex justify-between mb-1 font-bold">
                        <span>Min Age: {filterAge[0]}</span>
                        <span>Max Age: {filterAge[1]}</span>
                      </div>
                      <div className="space-y-1">
                        <input
                          type="range"
                          min={18}
                          max={60}
                          value={filterAge[0]}
                          onChange={e => setFilterAge([Math.min(+e.target.value, filterAge[1]), filterAge[1]])}
                          className="w-full accent-gold h-1.5 bg-warm/30 rounded-lg appearance-none cursor-pointer"
                        />
                        <input
                          type="range"
                          min={18}
                          max={60}
                          value={filterAge[1]}
                          onChange={e => setFilterAge([filterAge[0], Math.max(+e.target.value, filterAge[0])])}
                          className="w-full accent-gold h-1.5 bg-warm/30 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Dual Height Slider */}
                    <div>
                      <div className="flex justify-between mb-1 font-bold">
                        <span>Min Height: {Math.floor(filterHeight[0]/12)}'{filterHeight[0]%12}"</span>
                        <span>Max Height: {Math.floor(filterHeight[1]/12)}'{filterHeight[1]%12}"</span>
                      </div>
                      <div className="space-y-1">
                        <input
                          type="range"
                          min={48}
                          max={84}
                          value={filterHeight[0]}
                          onChange={e => setFilterHeight([Math.min(+e.target.value, filterHeight[1]), filterHeight[1]])}
                          className="w-full accent-gold h-1.5 bg-warm/30 rounded-lg appearance-none cursor-pointer"
                        />
                        <input
                          type="range"
                          min={48}
                          max={84}
                          value={filterHeight[1]}
                          onChange={e => setFilterHeight([filterHeight[0], Math.max(+e.target.value, filterHeight[0])])}
                          className="w-full accent-gold h-1.5 bg-warm/30 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Community / Sub-community filter */}
                    <div>
                      <label className="block mb-1 font-bold">Community / Sub-Community</label>
                      <select 
                        value={filterCommunityId} 
                        onChange={e => setFilterCommunityId(e.target.value)} 
                        className="w-full px-3 py-2 rounded-xl border border-warm bg-surface focus:outline-none focus:border-gold"
                      >
                        <option value="Any">Any Community</option>
                        {getAllowedCommunities().map(c => (
                          <option key={c.id} value={c.id.toString()}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Caste */}
                    <div>
                      <label className="block mb-1 font-bold">Caste</label>
                      <select 
                        value={filterCaste} 
                        onChange={e => setFilterCaste(e.target.value)} 
                        className="w-full px-3 py-2 rounded-xl border border-warm bg-surface focus:outline-none focus:border-gold"
                      >
                        {getUniqueCastes().map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    {/* Marital Status */}
                    <div>
                      <label className="block mb-1 font-bold">Marital Status</label>
                      <select 
                        value={filterMaritalStatus} 
                        onChange={e => setFilterMaritalStatus(e.target.value)} 
                        className="w-full px-3 py-2 rounded-xl border border-warm bg-surface focus:outline-none focus:border-gold"
                      >
                        <option value="Any">Any status</option>
                        <option value="Single">Single</option>
                        <option value="Never Married">Never Married</option>
                        <option value="Divorced">Divorced</option>
                        <option value="Widowed">Widowed</option>
                      </select>
                    </div>

                    {/* Education Level (Multi-select) */}
                    <div>
                      <label className="block mb-1.5 font-bold">Education Level</label>
                      <div className="space-y-1.5 bg-surface/50 p-2.5 rounded-xl border border-warm/40">
                        {["Below Matric", "Matric", "Graduate", "Post Graduate", "PhD"].map(edu => (
                          <label key={edu} className="flex items-center gap-2 cursor-pointer select-none font-medium">
                            <input 
                              type="checkbox" 
                              checked={filterEducation.includes(edu)}
                              onChange={() => setFilterEducation(prev => prev.includes(edu) ? prev.filter(e => e !== edu) : [...prev, edu])}
                              className="w-3.5 h-3.5 accent-gold"
                            />
                            <span>{edu}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Occupation Type (Multi-select) */}
                    <div>
                      <label className="block mb-1.5 font-bold">Occupation Type</label>
                      <div className="space-y-1.5 bg-surface/50 p-2.5 rounded-xl border border-warm/40">
                        {["Service", "Business", "Professional", "Other"].map(occ => (
                          <label key={occ} className="flex items-center gap-2 cursor-pointer select-none font-medium">
                            <input 
                              type="checkbox" 
                              checked={filterOccupation.includes(occ)}
                              onChange={() => setFilterOccupation(prev => prev.includes(occ) ? prev.filter(o => o !== occ) : [...prev, occ])}
                              className="w-3.5 h-3.5 accent-gold"
                            />
                            <span>{occ}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Annual Income Range dropdown */}
                    <div>
                      <label className="block mb-1 font-bold">Annual Income Range</label>
                      <select 
                        value={filterIncome} 
                        onChange={e => setFilterIncome(e.target.value)} 
                        className="w-full px-3 py-2 rounded-xl border border-warm bg-surface focus:outline-none focus:border-gold"
                      >
                        <option value="Any">Any Income</option>
                        <option value="Below 1L">Below 1L</option>
                        <option value="1-3L">1 - 3 Lakhs</option>
                        <option value="3-5L">3 - 5 Lakhs</option>
                        <option value="5-10L">5 - 10 Lakhs</option>
                        <option value="10L+">10 Lakhs +</option>
                      </select>
                    </div>

                    {/* Location (State/City) */}
                    <div>
                      <label className="block mb-1 font-bold">Location (State/City)</label>
                      <input 
                        type="text"
                        value={filterLocation}
                        onChange={e => setFilterLocation(e.target.value)}
                        placeholder="e.g. Gujarat" 
                        className="w-full px-3 py-2 rounded-xl border border-warm bg-surface focus:outline-none focus:border-gold"
                      />
                    </div>

                    {/* Verified Only */}
                    <div className="flex items-center gap-2 pt-2 border-t border-warm">
                      <input 
                        type="checkbox" 
                        id="verifiedCheck"
                        checked={filterVerifiedOnly}
                        onChange={e => setFilterVerifiedOnly(e.target.checked)}
                        className="w-4 h-4 accent-gold"
                      />
                      <label htmlFor="verifiedCheck" className="cursor-pointer select-none">Verified Only</label>
                    </div>
                  </div>
                </AnimatedCard>

                {/* Matches Grid */}
                {filteredMatches.length === 0 ? (
                  <EmptyState
                    icon={<Sparkles />}
                    title={IS_OPEN_TEST_MATCHING ? "No eligible profiles found" : "No matches match filters"}
                    desc={IS_OPEN_TEST_MATCHING ? "Create another non-suspended test profile to display recommendations." : "Update your criteria preferences or refine sidebar options to display matches."}
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[900px] mx-auto justify-items-center">
                    <AnimatePresence>
                      {filteredMatches.map(p => {
                        const inWish = wishlist.some(w => w.id === p.id);
                        const initials = p.name ? p.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() : "MP";
                        const primaryPhoto = p.photo || p.photo_url || (p.photos && p.photos.find((ph: any) => !ph.is_private)?.image);
                        const interestInfo = getInterestStatus(p.id, p.user);
                        
                        let matchScoreColor = "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
                        if (p.match_score >= 80) {
                          matchScoreColor = "bg-amber-100 text-amber-850 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900";
                        } else if (p.match_score >= 60) {
                          matchScoreColor = "bg-emerald-100 text-emerald-850 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900";
                        } else if (p.match_score >= 40) {
                          matchScoreColor = "bg-orange-100 text-orange-850 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900";
                        }

                        return (
                          <motion.div
                            key={p.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.2 }}
                            className="w-[280px] overflow-hidden group cursor-pointer border border-warm/50 hover:border-gold/30 hover:shadow-lg transition-all duration-300 flex flex-col justify-between rounded-2xl bg-surface"
                            onClick={() => handleOpenProfileDetails(p)}
                          >
                            <div className="h-[180px] w-full relative bg-sand/20 overflow-hidden shrink-0">
                              {primaryPhoto ? (
                                <>
                                  <img 
                                    src={resolvePhotoUrl(primaryPhoto)} 
                                    alt={p.name} 
                                    className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${typeof primaryPhoto === "string" && primaryPhoto.includes("blurred=true") ? "blur-md saturate-50" : ""}`} 
                                    loading="lazy" 
                                  />
                                  {typeof primaryPhoto === "string" && primaryPhoto.includes("blurred=true") && (
                                    <div className="absolute inset-0 bg-black/25 backdrop-blur-xs flex items-center justify-center pointer-events-none">
                                      <span className="text-[9px] bg-black/75 text-white px-2 py-0.5 rounded-full font-bold border border-white/20 flex items-center gap-1 shadow-sm"><EyeOff className="w-2.5 h-2.5 text-gold shrink-0" /> Blurred Preview</span>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-500 to-amber-600 text-white font-bold text-2xl font-ui">
                                  {initials}
                                </div>
                              )}
                              
                              {p.match_score !== undefined && (
                                <div className={`absolute top-2.5 left-2.5 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-bold border ${matchScoreColor} shadow-sm flex items-center gap-1`}>
                                  <Sparkles className="w-2.5 h-2.5" />
                                  {p.match_score}% Match
                                </div>
                              )}

                              <div className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-full border border-white/20">
                                {p.marital_status}
                              </div>
                            </div>
                            
                            <div className="p-4 flex-1 flex flex-col justify-between space-y-3 font-ui text-xs">
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-sm text-foreground truncate max-w-[180px]">{p.name}</span>
                                  <span className="text-xs font-semibold text-warm-muted">{p.age} Yrs</span>
                                </div>

                                <div className="flex items-center gap-1 text-[11px] text-warm-muted">
                                  <Users className="w-3 h-3 text-gold shrink-0" />
                                  <span className="truncate">{p.caste || "Ahir"} {p.sub_caste ? `(${p.sub_caste})` : ""}</span>
                                </div>

                                <div className="flex items-center gap-1 text-[11px] text-warm-muted">
                                  <GraduationCap className="w-3 h-3 text-gold shrink-0" />
                                  <span className="truncate">{p.education || "Graduate"}</span>
                                </div>
                                <div className="flex items-center gap-1 text-[11px] text-warm-muted">
                                  <Briefcase className="w-3 h-3 text-gold shrink-0" />
                                  <span className="truncate">{p.profession || "Business"}</span>
                                </div>

                                <div className="flex items-center gap-1 text-[11px] text-warm-muted">
                                  <Sliders className="w-3 h-3 text-gold shrink-0" />
                                  <span>{p.height || "N/A"} • {p.weight ? `${p.weight} kg` : "N/A"}</span>
                                </div>

                                <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded w-max">
                                  {p.income || "Income: N/A"}
                                </div>

                                <div className="flex items-center gap-1 text-[10px] text-warm-muted pt-0.5 border-t border-warm/40">
                                  <MapPin className="w-3 h-3 text-gold shrink-0" />
                                  <span className="truncate">{p.city || "Gujarat"}, {p.state || "India"}</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 pt-2" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={() => handleToggleWishlist(p.id, p.name)}
                                  className={`py-2 border rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all duration-300 ${
                                    (interestInfo && interestInfo.type === "received") ? "w-[35%]" : "flex-1"
                                  } ${inWish ? "bg-gold border-gold text-white" : "border-warm bg-surface hover:bg-sand text-foreground"}`}
                                >
                                  <Bookmark className="w-3.5 h-3.5" />
                                  <span>
                                    {(interestInfo && interestInfo.type === "received") 
                                      ? (inWish ? "Saved" : "Save") 
                                      : (inWish ? "Shortlisted" : "Shortlist")
                                    }
                                  </span>
                                </button>
                                
                                {interestInfo && interestInfo.type === "received" ? (
                                  <div className="flex-1 py-2 rounded-xl flex items-center justify-center gap-1 text-[10px] bg-blue-500/5 text-blue-600 border border-blue-500/20 font-bold">
                                    Received - Pending
                                  </div>
                                ) : (
                                  <MatrimonyHeartButton
                                    interestInfo={interestInfo}
                                    onActivate={() => handleSendInterest(p.id, p.name)}
                                    onDeactivate={() => {
                                      const currentInterest = getInterestStatus(p.id, p.user);
                                      if (currentInterest?.id) {
                                        return handleWithdrawInterest(currentInterest.id, p.name);
                                      }
                                      return Promise.resolve();
                                    }}
                                  />
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            )}

            {activeTab === "shortlisted" && (
              wishlist.length === 0 ? (
                <EmptyState icon={<Bookmark />} title="No Shortlisted Matches" desc="Browse recommended matches and save potential life partners to review them later." />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[900px] mx-auto justify-items-center">
                  <AnimatePresence>
                    {wishlist.map(p => {
                      const inWish = true;
                      const initials = p.name ? p.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() : "MP";
                      const primaryPhoto = p.photo || p.photo_url || (p.photos && p.photos.find((ph: any) => !ph.is_private)?.image);
                      const interestInfo = getInterestStatus(p.id, p.user);
                      
                      let matchScoreColor = "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
                      if (p.match_score >= 80) {
                        matchScoreColor = "bg-amber-100 text-amber-850 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900";
                      } else if (p.match_score >= 60) {
                        matchScoreColor = "bg-emerald-100 text-emerald-850 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900";
                      } else if (p.match_score >= 40) {
                        matchScoreColor = "bg-orange-100 text-orange-850 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900";
                      }

                      return (
                        <motion.div 
                          key={p.id}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.2 }}
                          className="w-[280px] overflow-hidden group cursor-pointer border border-warm/50 hover:border-gold/30 hover:shadow-lg transition-all duration-300 flex flex-col justify-between rounded-2xl bg-surface"
                          onClick={() => handleOpenProfileDetails(p)}
                        >
                          <div className="h-[180px] w-full relative bg-sand/20 overflow-hidden shrink-0">
                            {primaryPhoto ? (
                              <>
                                <img 
                                  src={resolvePhotoUrl(primaryPhoto)} 
                                  alt={p.name} 
                                  className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${typeof primaryPhoto === "string" && primaryPhoto.includes("blurred=true") ? "blur-md saturate-50" : ""}`} 
                                  loading="lazy" 
                                />
                                {typeof primaryPhoto === "string" && primaryPhoto.includes("blurred=true") && (
                                  <div className="absolute inset-0 bg-black/25 backdrop-blur-xs flex items-center justify-center pointer-events-none">
                                    <span className="text-[9px] bg-black/75 text-white px-2 py-0.5 rounded-full font-bold border border-white/20 flex items-center gap-1 shadow-sm"><EyeOff className="w-2.5 h-2.5 text-gold shrink-0" /> Blurred Preview</span>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-500 to-amber-600 text-white font-bold text-2xl font-ui">
                                {initials}
                              </div>
                            )}
                            
                            {p.match_score !== undefined && (
                              <div className={`absolute top-2.5 left-2.5 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-bold border ${matchScoreColor} shadow-sm flex items-center gap-1`}>
                                <Sparkles className="w-2.5 h-2.5" />
                                {p.match_score}% Match
                              </div>
                            )}

                            <div className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-full border border-white/20">
                              {p.marital_status}
                            </div>
                          </div>
                          
                          <div className="p-4 flex-1 flex flex-col justify-between space-y-3 font-ui text-xs">
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-sm text-foreground truncate max-w-[180px]">{p.name}</span>
                                <span className="text-xs font-semibold text-warm-muted">{p.age} Yrs</span>
                              </div>

                              <div className="flex items-center gap-1 text-[11px] text-warm-muted">
                                <Users className="w-3 h-3 text-gold shrink-0" />
                                <span className="truncate">{p.caste || "Ahir"} {p.sub_caste ? `(${p.sub_caste})` : ""}</span>
                              </div>

                              <div className="flex items-center gap-1 text-[11px] text-warm-muted">
                                <GraduationCap className="w-3 h-3 text-gold shrink-0" />
                                <span className="truncate">{p.education || "Graduate"}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[11px] text-warm-muted">
                                <Briefcase className="w-3 h-3 text-gold shrink-0" />
                                <span className="truncate">{p.profession || "Business"}</span>
                              </div>

                              <div className="flex items-center gap-1 text-[11px] text-warm-muted">
                                <Sliders className="w-3 h-3 text-gold shrink-0" />
                                <span>{p.height || "N/A"} • {p.weight ? `${p.weight} kg` : "N/A"}</span>
                              </div>

                              <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded w-max">
                                {p.income || "Income: N/A"}
                              </div>

                              <div className="flex items-center gap-1 text-[10px] text-warm-muted pt-0.5 border-t border-warm/40">
                                <MapPin className="w-3 h-3 text-gold shrink-0" />
                                <span className="truncate">{p.city || "Gujarat"}, {p.state || "India"}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 pt-2" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => handleToggleWishlist(p.id, p.name)}
                                className={`py-2 border rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all duration-300 ${
                                  (interestInfo && interestInfo.type === "received") ? "w-[35%]" : "flex-1"
                                } ${inWish ? "bg-gold border-gold text-white" : "border-warm bg-surface hover:bg-sand text-foreground"}`}
                              >
                                <Bookmark className="w-3.5 h-3.5" />
                                <span>
                                  {(interestInfo && interestInfo.type === "received") 
                                    ? (inWish ? "Saved" : "Save") 
                                    : (inWish ? "Shortlisted" : "Shortlist")
                                  }
                                </span>
                              </button>
                              
                              {interestInfo && interestInfo.type === "received" ? (
                                <div className="flex-1 py-2 rounded-xl flex items-center justify-center gap-1 text-[10px] bg-blue-500/5 text-blue-600 border border-blue-500/20 font-bold">
                                  Received - Pending
                                </div>
                              ) : (
                                <MatrimonyHeartButton
                                  interestInfo={interestInfo}
                                  onActivate={() => handleSendInterest(p.id, p.name)}
                                  onDeactivate={() => {
                                    const currentInterest = getInterestStatus(p.id, p.user);
                                    if (currentInterest?.id) {
                                      return handleWithdrawInterest(currentInterest.id, p.name);
                                    }
                                    return Promise.resolve();
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )
            )}

             {activeTab === "sent" && (
              sentInterests.length === 0 ? (
                <EmptyState icon={<Send />} title="No Sent Interest Requests" desc="Explore matching profiles and send connect requests to start conversations." />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[900px] mx-auto justify-items-center">
                  <AnimatePresence>
                    {sentInterests.map(i => {
                      const p = i.receiver_details;
                      if (!p) return null;
                      const inWish = wishlist.some(w => w.id === p.id);
                      const initials = p.name ? p.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() : "MP";
                      const primaryPhoto = p.photo || p.photo_url || (p.photos && p.photos.find((ph: any) => !ph.is_private)?.image);
                      
                      let matchScoreColor = "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
                      if (p.match_score >= 80) {
                        matchScoreColor = "bg-amber-100 text-amber-850 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900";
                      } else if (p.match_score >= 60) {
                        matchScoreColor = "bg-emerald-100 text-emerald-850 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900";
                      } else if (p.match_score >= 40) {
                        matchScoreColor = "bg-orange-100 text-orange-850 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900";
                      }

                      return (
                        <motion.div
                          key={i.id}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.2 }}
                          className="w-[280px] overflow-hidden group cursor-pointer border border-warm/50 hover:border-gold/30 hover:shadow-lg transition-all duration-300 flex flex-col justify-between rounded-2xl bg-surface"
                          onClick={() => handleOpenProfileDetails(p)}
                        >
                          <div className="h-[180px] w-full relative bg-sand/20 overflow-hidden shrink-0">
                            {primaryPhoto ? (
                              <>
                                <img 
                                  src={resolvePhotoUrl(primaryPhoto)} 
                                  alt={p.name} 
                                  className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${typeof primaryPhoto === "string" && primaryPhoto.includes("blurred=true") ? "blur-md saturate-50" : ""}`} 
                                  loading="lazy" 
                                />
                                {typeof primaryPhoto === "string" && primaryPhoto.includes("blurred=true") && (
                                  <div className="absolute inset-0 bg-black/25 backdrop-blur-xs flex items-center justify-center pointer-events-none">
                                    <span className="text-[9px] bg-black/75 text-white px-2 py-0.5 rounded-full font-bold border border-white/20 flex items-center gap-1 shadow-sm"><EyeOff className="w-2.5 h-2.5 text-gold shrink-0" /> Blurred Preview</span>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-500 to-amber-600 text-white font-bold text-2xl font-ui">
                                {initials}
                              </div>
                            )}
                            
                            {p.match_score !== undefined && (
                              <div className={`absolute top-2.5 left-2.5 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-bold border ${matchScoreColor} shadow-sm flex items-center gap-1`}>
                                <Sparkles className="w-2.5 h-2.5" />
                                {p.match_score}% Match
                              </div>
                            )}

                            <div className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-full border border-white/20">
                              {p.marital_status}
                            </div>
                          </div>
                          
                          <div className="p-4 flex-1 flex flex-col justify-between space-y-3 font-ui text-xs">
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-sm text-foreground truncate max-w-[180px]">{p.name}</span>
                                <span className="text-xs font-semibold text-warm-muted">{p.age} Yrs</span>
                              </div>

                              <div className="flex items-center gap-1 text-[11px] text-warm-muted">
                                <Users className="w-3 h-3 text-gold shrink-0" />
                                <span className="truncate">{p.caste || "Ahir"} {p.sub_caste ? `(${p.sub_caste})` : ""}</span>
                              </div>

                              <div className="flex items-center gap-1 text-[11px] text-warm-muted">
                                <GraduationCap className="w-3 h-3 text-gold shrink-0" />
                                <span className="truncate">{p.education || "Graduate"}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[11px] text-warm-muted">
                                <Briefcase className="w-3 h-3 text-gold shrink-0" />
                                <span className="truncate">{p.profession || "Business"}</span>
                              </div>

                              <div className="flex items-center gap-1 text-[11px] text-warm-muted">
                                <Sliders className="w-3 h-3 text-gold shrink-0" />
                                <span>{p.height || "N/A"} • {p.weight ? `${p.weight} kg` : "N/A"}</span>
                              </div>

                              <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded w-max">
                                {p.income || "Income: N/A"}
                              </div>

                              <div className="flex items-center gap-1 text-[10px] text-warm-muted pt-0.5 border-t border-warm/40">
                                <MapPin className="w-3 h-3 text-gold shrink-0" />
                                <span className="truncate">{p.city || "Gujarat"}, {p.state || "India"}</span>
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-2 pt-2" onClick={e => e.stopPropagation()}>
                              <div className={`w-full py-1.5 rounded-lg flex items-center justify-center gap-1 text-[10px] font-bold ${
                                i.status === "Accepted"
                                  ? "bg-emerald-600 text-white shadow-sm"
                                  : i.status === "Rejected"
                                  ? "bg-zinc-100 text-zinc-500 border border-zinc-200"
                                  : "border border-amber-500 text-amber-600 bg-amber-500/5"
                              }`}>
                                {i.status === "Accepted" ? (
                                  <><Check className="w-3 h-3 text-white" /> Connected - Accepted</>
                                ) : i.status === "Rejected" ? (
                                  "Declined"
                                ) : (
                                  "Interest Sent - Pending"
                                )}
                              </div>
                              {i.status === "Pending" && (
                                <button
                                  onClick={() => handleWithdrawInterest(i.id, p.name)}
                                  className="w-full py-1.5 border border-red-200 hover:bg-red-50 text-red-600 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1"
                                >
                                  <X className="w-3 h-3" /> Withdraw Interest
                                </button>
                              )}
                              {i.status === "Accepted" && (
                                <button
                                  onClick={() => handleOpenProfileDetails(p)}
                                  className="w-full py-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 shadow-xs transition duration-200"
                                >
                                  <Phone className="w-3 h-3" /> View Contact Details
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )
            )}

            {activeTab === "received" && (
              receivedInterests.length === 0 ? (
                <EmptyState icon={<Inbox />} title="No Received Interest Requests" desc="Connect requests sent by other community members will be shown here." />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[900px] mx-auto justify-items-center">
                  <AnimatePresence>
                    {receivedInterests.map(i => {
                      const p = i.sender_details;
                      if (!p) return null;
                      const inWish = wishlist.some(w => w.id === p.id);
                      const initials = p.name ? p.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() : "MP";
                      const primaryPhoto = p.photo || p.photo_url || (p.photos && p.photos.find((ph: any) => !ph.is_private)?.image);
                      
                      let matchScoreColor = "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
                      if (p.match_score >= 80) {
                        matchScoreColor = "bg-amber-100 text-amber-850 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900";
                      } else if (p.match_score >= 60) {
                        matchScoreColor = "bg-emerald-100 text-emerald-850 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900";
                      } else if (p.match_score >= 40) {
                        matchScoreColor = "bg-orange-100 text-orange-850 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900";
                      }

                      return (
                        <motion.div
                          key={i.id}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.2 }}
                          className="w-[280px] overflow-hidden group cursor-pointer border border-warm/50 hover:border-gold/30 hover:shadow-lg transition-all duration-300 flex flex-col justify-between rounded-2xl bg-surface"
                          onClick={() => handleOpenProfileDetails(p)}
                        >
                          <div className="h-[180px] w-full relative bg-sand/20 overflow-hidden shrink-0">
                            {primaryPhoto ? (
                              <>
                                <img 
                                  src={resolvePhotoUrl(primaryPhoto)} 
                                  alt={p.name} 
                                  className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${typeof primaryPhoto === "string" && primaryPhoto.includes("blurred=true") ? "blur-md saturate-50" : ""}`} 
                                  loading="lazy" 
                                />
                                {typeof primaryPhoto === "string" && primaryPhoto.includes("blurred=true") && (
                                  <div className="absolute inset-0 bg-black/25 backdrop-blur-xs flex items-center justify-center pointer-events-none">
                                    <span className="text-[9px] bg-black/75 text-white px-2 py-0.5 rounded-full font-bold border border-white/20 flex items-center gap-1 shadow-sm"><EyeOff className="w-2.5 h-2.5 text-gold shrink-0" /> Blurred Preview</span>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-500 to-amber-600 text-white font-bold text-2xl font-ui">
                                {initials}
                              </div>
                            )}
                            
                            {p.match_score !== undefined && (
                              <div className={`absolute top-2.5 left-2.5 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-bold border ${matchScoreColor} shadow-sm flex items-center gap-1`}>
                                <Sparkles className="w-2.5 h-2.5" />
                                {p.match_score}% Match
                              </div>
                            )}

                            <div className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-full border border-white/20">
                              {p.marital_status}
                            </div>
                          </div>
                          
                          <div className="p-4 flex-1 flex flex-col justify-between space-y-3 font-ui text-xs">
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-sm text-foreground truncate max-w-[180px]">{p.name}</span>
                                <span className="text-xs font-semibold text-warm-muted">{p.age} Yrs</span>
                              </div>

                              <div className="flex items-center gap-1 text-[11px] text-warm-muted">
                                <Users className="w-3 h-3 text-gold shrink-0" />
                                <span className="truncate">{p.caste || "Ahir"} {p.sub_caste ? `(${p.sub_caste})` : ""}</span>
                              </div>

                              <div className="flex items-center gap-1 text-[11px] text-warm-muted">
                                <GraduationCap className="w-3 h-3 text-gold shrink-0" />
                                <span className="truncate">{p.education || "Graduate"}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[11px] text-warm-muted">
                                <Briefcase className="w-3 h-3 text-gold shrink-0" />
                                <span className="truncate">{p.profession || "Business"}</span>
                              </div>

                              <div className="flex items-center gap-1 text-[11px] text-warm-muted">
                                <Sliders className="w-3 h-3 text-gold shrink-0" />
                                <span>{p.height || "N/A"} • {p.weight ? `${p.weight} kg` : "N/A"}</span>
                              </div>

                              <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded w-max">
                                {p.income || "Income: N/A"}
                              </div>

                              <div className="flex items-center gap-1 text-[10px] text-warm-muted pt-0.5 border-t border-warm/40">
                                <MapPin className="w-3 h-3 text-gold shrink-0" />
                                <span className="truncate">{p.city || "Gujarat"}, {p.state || "India"}</span>
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-2 pt-2" onClick={e => e.stopPropagation()}>
                              <div className={`w-full py-1.5 rounded-lg flex items-center justify-center gap-1 text-[10px] font-bold ${
                                i.status === "Accepted"
                                  ? "bg-emerald-600 text-white shadow-sm"
                                  : i.status === "Rejected"
                                  ? "bg-zinc-100 text-zinc-500 border border-zinc-200"
                                  : "border border-blue-500 text-blue-600 bg-blue-500/5"
                              }`}>
                                {i.status === "Accepted" ? (
                                  <><Check className="w-3 h-3 text-white" /> Connected - Accepted</>
                                ) : i.status === "Rejected" ? (
                                  "Declined"
                                ) : (
                                  "Interest Received - Pending"
                                )}
                              </div>
                              {i.status === "Pending" && (
                                <div className="flex gap-2 w-full">
                                  <button
                                    onClick={() => handleRejectInterest(i.id, p.name)}
                                    className="flex-1 py-1.5 border border-red-200 hover:bg-red-50 text-red-600 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1"
                                  >
                                    <X className="w-3 h-3" /> Decline
                                  </button>
                                  <button
                                    onClick={() => handleAcceptInterest(i.id, p.name)}
                                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shadow-xs transition flex items-center justify-center gap-1"
                                  >
                                    <Check className="w-3 h-3" /> Accept
                                  </button>
                                </div>
                              )}
                              {i.status === "Accepted" && (
                                <div className="flex gap-2 w-full">
                                  <button
                                    onClick={() => handleRejectInterest(i.id, p.name)}
                                    className="w-[35%] py-1.5 border border-red-200 hover:bg-red-50 text-red-600 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1"
                                    title="Decline / Disconnect interest"
                                  >
                                    <X className="w-3 h-3" /> Decline
                                  </button>
                                  <button
                                    onClick={() => handleOpenProfileDetails(p)}
                                    className="flex-1 py-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 shadow-xs transition duration-200"
                                  >
                                    <Phone className="w-3 h-3" /> View Contact Details
                                  </button>
                                </div>
                              )}
                              {i.status === "Rejected" && (
                                <button
                                  onClick={() => handleAcceptInterest(i.id, p.name)}
                                  className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shadow-xs transition flex items-center justify-center gap-1"
                                >
                                  <Check className="w-3 h-3" /> Accept Interest Request
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )
            )}
                    </>
                  )}

            {activeTab === "history" && (
              <AnimatedCard className="p-5 max-w-3xl mx-auto font-ui">
                <h3 className="font-bold text-sm border-b border-warm pb-3 mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gold" /> Profile Update History Logs
                </h3>
                {auditLogs && auditLogs.length > 0 ? (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {auditLogs.map((log: any) => (
                      <div key={log.id} className="p-3 bg-sand/15 dark:bg-zinc-900/30 rounded-xl border border-warm/40 text-xs flex justify-between gap-4">
                        <div>
                          <span className="font-bold text-foreground/85 block">{log.action_description || log.action}</span>
                          <span className="text-warm-muted text-[10px]">Updated by: {log.performed_by_name || "User"}</span>
                        </div>
                        <span className="text-warm-muted text-[10px] shrink-0 font-medium">{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-warm-muted">
                    No history update logs recorded yet.
                  </div>
                )}
              </AnimatedCard>
            )}

            {activeTab === "admin" && (
              <AnimatedCard className="p-5 max-w-4xl mx-auto space-y-4">
                <h3 className="font-bold text-sm border-b border-warm pb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-gold" /> Pending Matrimony Verification Requests
                </h3>
                {adminProfiles && adminProfiles.length > 0 ? (
                  <div className="space-y-4 font-ui">
                    {adminProfiles.map((p: any) => (
                      <div key={p.id} className="p-4 bg-sand/10 dark:bg-zinc-900/20 border border-warm/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex gap-3">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-sand/30 shrink-0 border border-warm">
                            <img src={resolvePhotoUrl(p.photo || p.photo_url || (p.photos && p.photos[0]?.image)) || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&fit=crop"} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                              {p.name}, {p.age} 
                              <span className="bg-amber-100 text-amber-700 dark:bg-amber-950/40 text-[9px] font-bold px-2 py-0.5 rounded-full">{p.marital_status}</span>
                            </div>
                            <div className="text-[10px] text-warm-muted mt-0.5">{p.caste} • {p.city}, {p.state}</div>
                            <div className="text-[9px] text-warm-muted mt-1">Submitted by: {p.contact_name} ({p.contact_relation})</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleSuspendProfile(p.id, p.name)}
                            className="px-3 py-1.5 border border-red-200 hover:bg-red-50 text-red-600 rounded-xl text-[10px] font-bold transition"
                          >
                            Reject
                          </button>
                          <button 
                            onClick={() => handleVerifyProfile(p.id, p.name)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold shadow-xs transition flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" /> Approve & Verify
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center text-xs text-warm-muted">
                    No pending verification requests found. All profiles are verified!
                  </div>
                )}
              </AnimatedCard>
            )}
                </motion.div>
              </AnimatePresence>
            </div>

          </div>

        </div>
      ) : (
        /* No profile created state */
        <div className="space-y-6 max-w-2xl mx-auto py-10 font-ui text-center">
          <AnimatedCard className="p-8 space-y-5 flex flex-col items-center border border-warm/80">
            <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center text-gold border border-gold-light">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Matrimony Space Not Configured</h3>
              <p className="text-xs text-warm-muted mt-2 max-w-md mx-auto leading-relaxed">
                There is no active matrimonial profile registered for {peopleList.find(p => p.id === selectedPersonId)?.name || "the selected person"}.
                Create a matrimony card to showcase bio-data, configure preferences, and receive connect recommendations.
              </p>
            </div>
            <button
              onClick={startCreateWizard}
              className="px-6 py-2.5 bg-gold hover:bg-gold/90 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 transition"
            >
              <Plus className="w-4 h-4" /> Create Matrimony Profile
            </button>
          </AnimatedCard>
        </div>
      )}

      {/* MODAL 1: VIEW PROFILE MODAL */}
      <Modal open={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="View Matrimony Profile Details" size="lg">
        {selectedProfile && (
          <div className="space-y-6 text-foreground font-ui">
            <div className="flex flex-col sm:flex-row gap-4 border-b border-warm pb-4">
              <div className="w-20 h-25 rounded-xl overflow-hidden bg-sand/30 border border-warm shrink-0">
                <img src={resolvePhotoUrl(selectedProfile.photo || selectedProfile.photo_url || (selectedProfile.photos && selectedProfile.photos[0]?.image)) || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&fit=crop"} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-bold">{selectedProfile.name}</h4>
                <p className="text-xs text-warm-muted">{selectedProfile.gender} • {selectedProfile.age} Years • {selectedProfile.marital_status}</p>
                <div className="flex items-center gap-2 pt-1.5">
                  <StatusBadge status={selectedProfile.status} />
                  {selectedProfile.is_verified && <span className="bg-teal-50 text-teal-700 text-[9px] font-bold px-2 py-0.5 rounded border border-teal-200">Verified</span>}
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6 text-xs font-semibold">
              <div className="space-y-4">
                <h5 className="font-black text-[10px] text-gold uppercase tracking-wider border-b border-warm/40 pb-1">Basic Details</h5>
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-[10px] text-warm-muted block">Religion / Caste</span><span>{selectedProfile.religion || "Hindu"} / {selectedProfile.caste || "Ahir"}</span></div>
                  <div><span className="text-[10px] text-warm-muted block">Mother Tongue</span><span>{selectedProfile.mother_tongue || "Gujarati"}</span></div>
                  <div><span className="text-[10px] text-warm-muted block">Height / Weight</span><span>{selectedProfile.height || "N/A"} / {selectedProfile.weight ? `${selectedProfile.weight} kg` : "N/A"}</span></div>
                  <div><span className="text-[10px] text-warm-muted block">Complexion</span><span>{selectedProfile.complexion || "Fair"}</span></div>
                </div>
              </div>

              <div className="space-y-4">
                <h5 className="font-black text-[10px] text-gold uppercase tracking-wider border-b border-warm/40 pb-1">Education & Career</h5>
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-[10px] text-warm-muted block">Education</span><span>{selectedProfile.education || "N/A"}</span></div>
                  <div><span className="text-[10px] text-warm-muted block">Occupation</span><span>{selectedProfile.profession || "N/A"}</span></div>
                  <div><span className="text-[10px] text-warm-muted block">Annual Income</span><span>{selectedProfile.income || "N/A"}</span></div>
                  <div><span className="text-[10px] text-warm-muted block">Native Ancestry</span><span>{selectedProfile.native_place || "N/A"}</span></div>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h5 className="font-black text-[10px] text-gold uppercase tracking-wider border-b border-warm/40 pb-1">About Me (Self Introduction)</h5>
              <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-line bg-sand/15 dark:bg-zinc-900/30 p-3 rounded-xl border border-warm/40">
                {selectedProfile.about || "No introduction description provided."}
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <h5 className="font-black text-[10px] text-gold uppercase tracking-wider border-b border-warm/40 pb-1">Contact Information</h5>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-semibold">
                <div><span className="text-[10px] text-warm-muted block">Contact Person</span><span>{selectedProfile.contact_name || "N/A"} ({selectedProfile.contact_relation})</span></div>
                <div><span className="text-[10px] text-warm-muted block">Phone</span><span>{selectedProfile.contact_phone || "Protected"}</span></div>
                <div><span className="text-[10px] text-warm-muted block">Email</span><span>{selectedProfile.contact_email || "Protected"}</span></div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-warm">
              <button onClick={() => setIsViewModalOpen(false)} className="px-4 py-2 bg-gold hover:bg-gold/90 text-white rounded-xl text-xs font-bold transition">
                Close View
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 2: EDIT PROFILE MODAL (7-TAB DESIGN) */}
      <Modal open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Matrimony Profile Details" size="xl">
        <div className="font-ui">
          {/* 7 Tabs Navigation */}
          <div className="flex border-b border-warm mb-6 overflow-x-auto scrollbar-none font-ui text-xs font-bold">
            {[
              { id: 1, label: "Basic Details" },
              { id: 2, label: "Education" },
              { id: 3, label: "Career" },
              { id: 4, label: "Lifestyle" },
              { id: 5, label: "Family" },
              { id: 6, label: "Preferences" },
              { id: 7, label: "Privacy" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setEditModalStep(tab.id)}
                className={`pb-2 px-3 border-b-2 transition-all whitespace-nowrap ${editModalStep === tab.id ? "border-gold text-gold" : "border-transparent text-warm-muted"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-4 min-h-[360px] max-h-[60vh] overflow-y-auto pr-1 text-foreground">
            
            {/* Tab 1: Basic Details */}
            {editModalStep === 1 && (
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-gold border-b border-warm/40 pb-1">Basic Biological Details</h4>
                
                {/* Synced Fields Info Block */}
                <div className="p-4 bg-amber-50/15 dark:bg-zinc-900/30 border border-gold-light/40 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between border-b border-gold-light/20 pb-1.5">
                    <span className="text-[10px] text-gold uppercase font-bold flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" /> Synced From Member Profile
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-warm-muted uppercase block font-bold mb-0.5">Full Name</span>
                      <div className="flex items-center gap-1.5 text-foreground font-semibold">
                        <span className="truncate">{selectedProfile?.name || "N/A"}</span>
                        <span title="Synced From Member Profile"><Lock className="w-3 h-3 text-gold-light shrink-0" /></span>
                      </div>
                      <span className="text-[9px] text-warm-muted block mt-0.5">Synced From Member Profile</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-warm-muted uppercase block font-bold mb-0.5">Gender</span>
                      <div className="flex items-center gap-1.5 text-foreground font-semibold">
                        <span>{selectedProfile?.gender || "N/A"}</span>
                        <span title="Synced From Member Profile"><Lock className="w-3 h-3 text-gold-light shrink-0" /></span>
                      </div>
                      <span className="text-[9px] text-warm-muted block mt-0.5">Synced From Member Profile</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-warm-muted uppercase block font-bold mb-0.5">Date Of Birth</span>
                      <div className="flex items-center gap-1.5 text-foreground font-semibold">
                        <span>{selectedProfile?.dob || "N/A"}</span>
                        <span title="Synced From Member Profile"><Lock className="w-3 h-3 text-gold-light shrink-0" /></span>
                      </div>
                      <span className="text-[9px] text-warm-muted block mt-0.5">Synced From Member Profile</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-warm-muted uppercase block font-bold mb-0.5">Age</span>
                      <div className="flex items-center gap-1.5 text-foreground font-semibold">
                        <span>{selectedProfile?.age || "N/A"} Years</span>
                      </div>
                      <span className="text-[9px] text-gold font-bold block mt-0.5">Auto Calculated</span>
                    </div>
                    <div className="col-span-2 sm:col-span-4 border-t border-warm/40 pt-2 mt-1">
                      <span className="text-[10px] text-warm-muted uppercase block font-bold mb-0.5">Community</span>
                      <div className="flex items-center gap-1.5 text-foreground font-semibold">
                        <span>{selectedProfile?.community_name || "N/A"}</span>
                        <span title="Synced From Member Profile"><Lock className="w-3 h-3 text-gold-light shrink-0" /></span>
                      </div>
                      <span className="text-[9px] text-warm-muted block mt-0.5">Synced From Member Profile</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Marital Status</label>
                    <select value={formData.marital_status} onChange={e => setFormData({ ...formData, marital_status: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none focus:border-gold text-xs font-semibold">
                      <option value="Single">Single</option>
                      <option value="Never Married">Never Married</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widowed">Widowed</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Height (e.g. 5'6")</label>
                      <input type="text" value={formData.height} onChange={e => setFormData({ ...formData, height: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none text-xs font-semibold" placeholder="5'6" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Weight (kg)</label>
                      <input type="text" value={formData.weight} onChange={e => setFormData({ ...formData, weight: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none text-xs font-semibold" placeholder="e.g. 62" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Complexion</label>
                    <select value={formData.complexion} onChange={e => setFormData({ ...formData, complexion: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none text-xs font-semibold">
                      <option value="Very Fair">Very Fair</option>
                      <option value="Fair">Fair</option>
                      <option value="Wheatish">Wheatish</option>
                      <option value="Dark">Dark</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Religion</label>
                    <input type="text" value={formData.religion} onChange={e => setFormData({ ...formData, religion: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Ancestral Native Place</label>
                    <input type="text" value={formData.native_place} onChange={e => setFormData({ ...formData, native_place: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none text-xs font-semibold" placeholder="e.g. Amreli, Kutch" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Current Residential Address</label>
                    <textarea value={formData.current_address} onChange={e => setFormData({ ...formData, current_address: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none text-xs font-semibold h-12" placeholder="Street Address, City, State..." />
                  </div>
                </div>

                {formData.marital_status === "Divorced" && (
                  <div className="p-4 bg-red-50/20 dark:bg-red-950/10 border border-red-200/50 rounded-2xl space-y-4">
                    <h5 className="text-xs font-bold text-red-600 flex items-center gap-1"><Info className="w-4 h-4" /> Divorce Details</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Year of Divorce *</label>
                        <input type="number" value={formData.divorce_year} onChange={e => setFormData({ ...formData, divorce_year: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none text-xs font-semibold" placeholder="e.g. 2021" />
                      </div>
                      <div className="flex items-center gap-2 pt-6">
                        <input type="checkbox" id="divorceKids" checked={formData.has_children} onChange={e => setFormData({ ...formData, has_children: e.target.checked })} className="w-4 h-4 accent-gold" />
                        <label htmlFor="divorceKids" className="text-xs font-semibold text-warm-muted select-none cursor-pointer">Has Children</label>
                      </div>
                    </div>
                    {formData.has_children && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Children Count</label>
                          <input type="number" value={formData.children_count} onChange={e => setFormData({ ...formData, children_count: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none text-xs font-semibold" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Children Living With</label>
                          <select value={formData.children_living_with} onChange={e => setFormData({ ...formData, children_living_with: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none text-xs font-semibold">
                            <option value="Self">Living with Me</option>
                            <option value="Spouse">Living with Spouse</option>
                            <option value="Both">Joint Custody</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {formData.marital_status === "Widowed" && (
                  <div className="p-4 bg-amber-50/20 dark:bg-amber-950/10 border border-amber-200/50 rounded-2xl space-y-4">
                    <h5 className="text-xs font-bold text-amber-600 flex items-center gap-1"><Info className="w-4 h-4" /> Widow Details</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Year of Loss *</label>
                        <input type="number" value={formData.year_of_loss} onChange={e => setFormData({ ...formData, year_of_loss: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold" placeholder="e.g. 2019" />
                      </div>
                      <div className="flex items-center gap-2 pt-6">
                        <input type="checkbox" id="widowKids" checked={formData.has_children} onChange={e => setFormData({ ...formData, has_children: e.target.checked })} className="w-4 h-4 accent-gold" />
                        <label htmlFor="widowKids" className="text-xs font-semibold text-warm-muted select-none cursor-pointer">Has Children</label>
                      </div>
                    </div>
                    {formData.has_children && (
                      <div>
                        <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Widowed Children Info Description</label>
                        <input type="text" value={formData.widowed_children_info} onChange={e => setFormData({ ...formData, widowed_children_info: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none text-xs font-semibold" placeholder="e.g. 1 Son living with me" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Education */}
            {editModalStep === 2 && (
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-gold border-b border-warm/40 pb-1">Educational Background</h4>
                <div>
                  <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Highest Education Level / Degree</label>
                  <input type="text" value={formData.education} onChange={e => setFormData({ ...formData, education: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none text-xs font-semibold" placeholder="e.g. B.Tech in CS, MBA, MD, High School" />
                  <p className="text-[10px] text-warm-muted mt-1">Specify your degrees, universities, or fields of study clearly.</p>
                </div>
              </div>
            )}

            {/* Tab 3: Career */}
            {editModalStep === 3 && (
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-gold border-b border-warm/40 pb-1">Professional Career & Financials</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Profession / Occupation</label>
                    <input type="text" value={formData.profession} onChange={e => setFormData({ ...formData, profession: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none text-xs font-semibold" placeholder="e.g. Software Engineer, Doctor, Business Owner" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Annual Income Range</label>
                    <input type="text" value={formData.income} onChange={e => setFormData({ ...formData, income: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none text-xs font-semibold" placeholder="e.g. 12-15 LPA, $80k/year" />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Lifestyle */}
            {editModalStep === 4 && (
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-gold border-b border-warm/40 pb-1">Personal Lifestyle Choices</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Diet Type</label>
                    <select value={formData.diet} onChange={e => setFormData({ ...formData, diet: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none text-xs font-semibold">
                      <option value="Vegetarian">Vegetarian</option>
                      <option value="Jain">Jain Diet</option>
                      <option value="Eggetarian">Eggetarian</option>
                      <option value="Non-Vegetarian">Non-Vegetarian</option>
                      <option value="Vegan">Vegan</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Smoking Habits</label>
                      <select value={formData.smoking} onChange={e => setFormData({ ...formData, smoking: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold">
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                        <option value="Occasionally">Occasionally</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Drinking Habits</label>
                      <select value={formData.drinking} onChange={e => setFormData({ ...formData, drinking: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold">
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                        <option value="Occasionally">Occasionally</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Mother Tongue</label>
                    <input type="text" value={formData.mother_tongue} onChange={e => setFormData({ ...formData, mother_tongue: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Languages Spoken</label>
                    <input type="text" value={formData.languages_known} onChange={e => setFormData({ ...formData, languages_known: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold" placeholder="e.g. Gujarati, Hindi, English" />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 5: Family */}
            {editModalStep === 5 && (
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-gold border-b border-warm/40 pb-1">Family & Self Introduction</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Family Structure Type</label>
                    <select value={formData.family_type} onChange={e => setFormData({ ...formData, family_type: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold">
                      <option value="Nuclear">Nuclear Family</option>
                      <option value="Joint">Joint Family</option>
                      <option value="Extended">Extended Family</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Family Ethos / Values</label>
                    <select value={formData.family_values} onChange={e => setFormData({ ...formData, family_values: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold">
                      <option value="Traditional">Traditional</option>
                      <option value="Orthodox">Orthodox</option>
                      <option value="Moderate">Moderate</option>
                      <option value="Liberal">Liberal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Father's Occupation</label>
                    <input type="text" value={formData.fathers_occupation} onChange={e => setFormData({ ...formData, fathers_occupation: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Mother's Occupation</label>
                    <input type="text" value={formData.mothers_occupation} onChange={e => setFormData({ ...formData, mothers_occupation: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Siblings Count</label>
                    <input type="number" value={formData.siblings_count} onChange={e => setFormData({ ...formData, siblings_count: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold" />
                  </div>
                </div>
                
                <div className="pt-2">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-warm-muted uppercase">Self Introduction / About Me *</label>
                    <span className={`text-[10px] font-bold ${formData.about.length >= 200 ? "text-emerald-600" : "text-rose-500"}`}>
                      {formData.about.length} / 200 min characters
                    </span>
                  </div>
                  <textarea value={formData.about} onChange={e => setFormData({ ...formData, about: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none text-xs font-semibold h-28 leading-relaxed" placeholder="Describe your character, educational achievements, goals, and expectations for a lifetime partner..." />
                </div>
              </div>
            )}

            {/* Tab 6: Preferences */}
            {editModalStep === 6 && (
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-gold border-b border-warm/40 pb-1">Partner Criteria Expectations</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Preferred Gender</label>
                    <select value={prefForm.gender} onChange={e => setPrefForm({ ...prefForm, gender: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none">
                      <option value="Bride">Bride (Female)</option>
                      <option value="Groom">Groom (Male)</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Min Age</label>
                      <input type="number" value={prefForm.min_age} onChange={e => setPrefForm({ ...prefForm, min_age: +e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Max Age</label>
                      <input type="number" value={prefForm.max_age} onChange={e => setPrefForm({ ...prefForm, max_age: +e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Height Criteria (Min)</label>
                    <input type="text" value={prefForm.min_height} onChange={e => setPrefForm({ ...prefForm, min_height: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none" placeholder="e.g. 5'0" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Height Criteria (Max)</label>
                    <input type="text" value={prefForm.max_height} onChange={e => setPrefForm({ ...prefForm, max_height: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none" placeholder="e.g. 6'2" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Target Caste</label>
                    <input type="text" value={prefForm.caste} onChange={e => setPrefForm({ ...prefForm, caste: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none" placeholder="e.g. Ahir, Patidar" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Target Sub-Caste</label>
                    <input type="text" value={rawPrefForm.sub_caste ?? ""} onChange={e => setRawPrefForm((prev: any) => ({ ...prev, sub_caste: e.target.value }))} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none" placeholder="e.g. Samaj, Patidar (optional)" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Education Level Accepted</label>
                    <input type="text" value={prefForm.education} onChange={e => setPrefForm({ ...prefForm, education: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none" placeholder="e.g. Graduate, CA, MBA" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Occupation Expected</label>
                    <input type="text" value={prefForm.occupation} onChange={e => setPrefForm({ ...prefForm, occupation: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none" placeholder="e.g. Job, Business" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Preferred State</label>
                    <input type="text" value={prefForm.state} onChange={e => setPrefForm({ ...prefForm, state: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none" placeholder="e.g. Gujarat" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Preferred City</label>
                    <input type="text" value={prefForm.city} onChange={e => setPrefForm({ ...prefForm, city: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none" placeholder="e.g. Rajkot" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Income Range Accepted</label>
                    <select value={prefForm.income_range} onChange={e => setPrefForm({ ...prefForm, income_range: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none">
                      <option value="">Any Income</option>
                      <option value="0-3L">0 - 3 Lakhs</option>
                      <option value="3-5L">3 - 5 Lakhs</option>
                      <option value="5-10L">5 - 10 Lakhs</option>
                      <option value="10L+">10 Lakhs +</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Marital Status Accepted</label>
                    <select value={prefForm.marital_status} onChange={e => setPrefForm({ ...prefForm, marital_status: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none">
                      <option value="Any">Any Status</option>
                      <option value="Single">Single Only</option>
                      <option value="Never Married">Never Married Only</option>
                      <option value="Divorced">Divorced Only</option>
                      <option value="Widowed">Widowed Only</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 7: Privacy */}
            {editModalStep === 7 && (
              <div className="space-y-2">
                {renderVisibilityAndAudienceSection()}
              </div>
            )}

          </div>

          {/* Navigation Controls */}
          <div className="flex justify-between items-center pt-4 border-t border-warm mt-6">
            <button
              disabled={editModalStep === 1}
              onClick={() => setEditModalStep(prev => prev - 1)}
              className="py-2 px-4 border border-warm rounded-xl text-xs font-bold text-warm-muted hover:bg-sand/30 disabled:opacity-40 transition"
            >
              Back
            </button>
            {editModalStep < 7 ? (
              <button
                onClick={() => setEditModalStep(prev => prev + 1)}
                className="py-2 px-5 bg-gold hover:bg-gold/90 text-white rounded-xl text-xs font-bold shadow-xs transition"
              >
                Next Step
              </button>
            ) : (
              <button
                disabled={savingProfile}
                onClick={handleUpdateProfileSubmit}
                className="py-2 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
              >
                {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save Changes
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* MODAL 3: PHOTOS GALLERY MODAL */}
      <Modal open={isPhotosModalOpen} onClose={() => setIsPhotosModalOpen(false)} title="Manage Matrimonial Profile Photos" size="lg">
        {selectedProfile && (
          <div className="space-y-6 font-ui">
            
            {/* Drag & Drop Photo Upload Box */}
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={(e) => handleDrop(e, false)}
              className={`p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${dragActive ? "border-gold bg-gold/5" : "border-warm hover:border-gold/60"}`}
            >
              <input 
                type="file" 
                id="modalPhotoUploadInput" 
                accept="image/*" 
                multiple
                onChange={(e) => { if (e.target.files) handleMultipleFilesSelect(e.target.files, false); }} 
                className="hidden" 
              />
              <label htmlFor="modalPhotoUploadInput" className="cursor-pointer flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center text-gold">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-foreground mt-1">Drag & drop profile picture or click to select</span>
                <span className="text-[10px] text-warm-muted font-bold">Supports JPG, JPEG, PNG, WEBP (Max 5MB per file, Up to 10 photos total)</span>
              </label>
            </div>

            {/* Pending Uploads Queue Box */}
            {modalPhotoFiles.length > 0 && (
              <div className="space-y-3 p-4 bg-sand/15 dark:bg-zinc-900/40 rounded-2xl border border-warm/80">
                <div className="flex justify-between items-center border-b border-warm/40 pb-2">
                  <span className="text-xs font-bold text-foreground">Pending Uploads ({modalPhotoFiles.length})</span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setModalPhotoFiles([])}
                      className="px-2 py-1 hover:bg-sand rounded text-xs font-bold text-warm-muted"
                    >
                      Clear All
                    </button>
                    <button
                      disabled={uploadingPhoto}
                      onClick={handleMultiplePhotosUploadSubmit}
                      className="px-3 py-1 bg-gold hover:bg-gold/90 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition"
                    >
                      {uploadingPhoto ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        "Upload All"
                      )}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
                  {modalPhotoFiles.map((ph, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 p-2 bg-surface rounded-xl border border-warm/40">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <img src={ph.previewUrl} alt="" className="w-10 h-10 object-cover rounded-lg border border-warm" />
                        <div className="overflow-hidden">
                          <p className="text-[10px] font-bold truncate max-w-[120px]">{ph.file.name}</p>
                          <select 
                            value={ph.category} 
                            onChange={e => {
                              const updated = [...modalPhotoFiles];
                              updated[idx].category = e.target.value;
                              setModalPhotoFiles(updated);
                            }}
                            className="px-1 py-0.5 text-[8px] font-bold border border-warm rounded bg-surface focus:outline-none"
                          >
                            <option value="Profile Photo">Profile Photo</option>
                            <option value="Lifestyle Photo">Lifestyle Photo</option>
                            <option value="Family Photo">Family Photo</option>
                          </select>
                        </div>
                      </div>
                      <button 
                        onClick={() => setModalPhotoFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="text-warm-muted hover:text-red-500 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Photos List Grid */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-warm-muted">Uploaded Photos ({selectedProfile.photos?.length || 0} / 10 Max)</h4>
              {selectedProfile.photos && selectedProfile.photos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {selectedProfile.photos.map((ph: any, idx: number) => (
                    <div key={ph.id} className="relative aspect-[4/5] rounded-xl overflow-hidden border border-warm bg-sand/10 group flex flex-col justify-between">
                      <img src={resolvePhotoUrl(ph.image || ph.image_url)} alt="" className="w-full h-full object-cover" />
                      
                      {/* Photo details overlay */}
                      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded text-[8px] font-bold text-white flex items-center gap-1">
                        {ph.is_private ? <Lock className="w-2.5 h-2.5 text-amber-400" /> : <Unlock className="w-2.5 h-2.5 text-emerald-400" />}
                        {ph.category}
                      </div>

                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1 flex-wrap">
                        <button
                          title="View Fullscreen"
                          onClick={() => setFullscreenPhotoUrl(resolvePhotoUrl(ph.image || ph.image_url))}
                          className="w-7 h-7 bg-surface/90 hover:bg-white rounded-full flex items-center justify-center text-foreground shadow-xs transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {ph.category !== 'Profile Photo' && (
                          <button
                            title="Set as Profile Photo (Primary)"
                            onClick={() => handleUpdatePhotoSetting(ph.id, 'Profile Photo', ph.is_private)}
                            className="w-7 h-7 bg-surface/90 hover:bg-white rounded-full flex items-center justify-center text-emerald-600 shadow-xs transition"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          title={ph.is_private ? "Make Public" : "Make Private"}
                          onClick={() => handleUpdatePhotoSetting(ph.id, ph.category, !ph.is_private)}
                          className="w-7 h-7 bg-surface/90 hover:bg-white rounded-full flex items-center justify-center text-gold shadow-xs transition"
                        >
                          {ph.is_private ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        </button>
                        {idx > 0 && (
                          <button
                            title="Move Left"
                            onClick={() => handleMovePhoto(idx, "up")}
                            className="w-7 h-7 bg-surface/90 hover:bg-white rounded-full flex items-center justify-center text-foreground shadow-xs transition"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {idx < selectedProfile.photos.length - 1 && (
                          <button
                            title="Move Right"
                            onClick={() => handleMovePhoto(idx, "down")}
                            className="w-7 h-7 bg-surface/90 hover:bg-white rounded-full flex items-center justify-center text-foreground shadow-xs transition"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          title="Delete photo"
                          onClick={() => handlePhotoDelete(ph.id)}
                          className="w-7 h-7 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-xs transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-warm-muted border border-warm/40 rounded-xl bg-sand/5">
                  No additional photographs uploaded yet.
                </div>
              )}
            </div>

          </div>
        )}
      </Modal>

      {/* MODAL 4: PARTNER PREFERENCES MODAL */}
      <Modal open={isPreferencesModalOpen} onClose={() => setIsPreferencesModalOpen(false)} title="Update Partner Criteria Preferences" size="lg">
        {selectedProfile && (
          <div className="space-y-4 font-ui text-foreground">
            <h4 className="font-bold text-xs uppercase tracking-wider text-warm-muted border-b border-warm/40 pb-1">Specify expectations for matching</h4>
            
            {/* Live Preference Impact Summary */}
            <div className="bg-gold/10 border border-gold/30 rounded-xl p-3.5 flex items-center justify-between gap-4 font-ui text-xs font-semibold text-warm-muted animate-fadeIn">
              <div className="flex flex-col items-center flex-1 text-center border-r border-warm/30 last:border-r-0">
                <span className="text-[10px] uppercase font-bold text-warm-muted/70 mb-0.5">Matching Profiles</span>
                <span className="text-sm font-bold text-gold">{liveImpactSummary.count}</span>
              </div>
              <div className="flex flex-col items-center flex-1 text-center border-r border-warm/30 last:border-r-0">
                <span className="text-[10px] uppercase font-bold text-warm-muted/70 mb-0.5">Communities Covered</span>
                <span className="text-sm font-bold text-gold">{liveImpactSummary.communities}</span>
              </div>
              <div className="flex flex-col items-center flex-1 text-center">
                <span className="text-[10px] uppercase font-bold text-warm-muted/70 mb-0.5">Avg Match Score</span>
                <span className="text-sm font-bold text-gold">{liveImpactSummary.avgScore}%</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
              <div>
                <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Preferred Gender</label>
                <select value={prefForm.gender} onChange={e => setPrefForm({ ...prefForm, gender: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none">
                  <option value="Bride">Bride (Female)</option>
                  <option value="Groom">Groom (Male)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Min Age</label>
                  <input type="number" value={prefForm.min_age} onChange={e => setPrefForm({ ...prefForm, min_age: +e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Max Age</label>
                  <input type="number" value={prefForm.max_age} onChange={e => setPrefForm({ ...prefForm, max_age: +e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Height Criteria (Min)</label>
                <input type="text" value={prefForm.min_height} onChange={e => setPrefForm({ ...prefForm, min_height: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none" placeholder="e.g. 5'0" />
              </div>
              <div>
                <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Height Criteria (Max)</label>
                <input type="text" value={prefForm.max_height} onChange={e => setPrefForm({ ...prefForm, max_height: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none" placeholder="e.g. 6'2" />
              </div>
              <div>
                <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Target Caste</label>
                <input type="text" value={prefForm.caste} onChange={e => setPrefForm({ ...prefForm, caste: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none" placeholder="e.g. Ahir, Patidar" />
              </div>
              <div>
                <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Target Sub-Caste</label>
                <input type="text" value={rawPrefForm.sub_caste ?? ""} onChange={e => setRawPrefForm((prev: any) => ({ ...prev, sub_caste: e.target.value }))} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none" placeholder="e.g. Samaj, Patidar (optional)" />
              </div>
              <div>
                <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Education Level Accepted</label>
                <input type="text" value={prefForm.education} onChange={e => setPrefForm({ ...prefForm, education: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none" placeholder="e.g. Graduate, CA, MBA" />
              </div>
              <div>
                <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Occupation Expected</label>
                <input type="text" value={prefForm.occupation} onChange={e => setPrefForm({ ...prefForm, occupation: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none" placeholder="e.g. Job, Business" />
              </div>
              <div>
                <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Preferred State</label>
                <input type="text" value={prefForm.state} onChange={e => setPrefForm({ ...prefForm, state: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none" placeholder="e.g. Gujarat" />
              </div>
              <div>
                <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Preferred City</label>
                <input type="text" value={prefForm.city} onChange={e => setPrefForm({ ...prefForm, city: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none" placeholder="e.g. Rajkot" />
              </div>
              <div>
                <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Income Range Accepted</label>
                <select value={prefForm.income_range} onChange={e => setPrefForm({ ...prefForm, income_range: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none">
                  <option value="">Any Income</option>
                  <option value="0-3L">0 - 3 Lakhs</option>
                  <option value="3-5L">3 - 5 Lakhs</option>
                  <option value="5-10L">5 - 10 Lakhs</option>
                  <option value="10L+">10 Lakhs +</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Marital Status Accepted</label>
                <select value={prefForm.marital_status} onChange={e => setPrefForm({ ...prefForm, marital_status: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none">
                  <option value="Any">Any Status</option>
                  <option value="Single">Single Only</option>
                  <option value="Never Married">Never Married Only</option>
                  <option value="Divorced">Divorced Only</option>
                  <option value="Widowed">Widowed Only</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-warm">
              <button onClick={() => setIsPreferencesModalOpen(false)} className="px-4 py-2 border border-warm rounded-xl text-xs font-bold text-warm-muted hover:bg-sand/30">
                Cancel
              </button>
              <button onClick={handlePreferencesSubmit} disabled={savingPrefs} className="px-5 py-2 bg-gold hover:bg-gold/90 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5">
                {savingPrefs ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save Expectations
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 5: CREATE PROFILE MODAL (MULTI-STEP WIZARD) */}
      <Modal open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} closeOnOverlayClick={false} title="Create Matrimony Profile" size="xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            console.log("[CreateProfileForm] onSubmit fired. step:", wizardStep);
            
            // Validate the current step
            const isStepValid = validateCreateProfile(wizardStep);
            if (!isStepValid) {
              const firstError = Object.values(validationErrors)[0] || "Please fill in all required fields on this step.";
              toast.error(firstError);
              return;
            }

            if (wizardStep < 6) {
              setWizardStep(prev => prev + 1);
            } else {
              handleCreateProfileSubmit();
            }
          }}
          className="font-ui"
        >
          {renderStepTabs(wizardStep, setWizardStep)}

          <div className="space-y-4 min-h-[360px] max-h-[60vh] overflow-y-auto pr-1 text-foreground">
            
            {wizardStep === 1 && (
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-gold border-b border-warm/40 pb-1">Step 1: Basic Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Synced Fields Info Block */}
                  <div className="sm:col-span-2 p-4 bg-amber-50/15 dark:bg-zinc-900/30 border border-gold-light/40 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between border-b border-gold-light/20 pb-1.5">
                      <span className="text-[10px] text-gold uppercase font-bold flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5" /> Synced From Member Profile
                      </span>
                    </div>
                     <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-warm-muted uppercase block font-bold mb-0.5">Full Name</span>
                        <div className="flex items-center gap-1.5 text-foreground font-semibold">
                          <span className="truncate">{wizardPerson?.name || "N/A"}</span>
                          <span title="Synced From Member Profile"><Lock className="w-3 h-3 text-gold-light shrink-0" /></span>
                        </div>
                        <span className="text-[9px] text-warm-muted block mt-0.5">Synced From Member Profile</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-warm-muted uppercase block font-bold mb-0.5">Gender</span>
                        <div className="flex items-center gap-1.5 text-foreground font-semibold">
                          <span>{wizardPerson?.gender || "N/A"}</span>
                          <span title="Synced From Member Profile"><Lock className="w-3 h-3 text-gold-light shrink-0" /></span>
                        </div>
                        <span className="text-[9px] text-warm-muted block mt-0.5">Synced From Member Profile</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-warm-muted uppercase block font-bold mb-0.5">Date Of Birth</span>
                        <div className="flex items-center gap-1.5 text-foreground font-semibold">
                          <span>{wizardPerson?.birthdate || "N/A"}</span>
                          <span title="Synced From Member Profile"><Lock className="w-3 h-3 text-gold-light shrink-0" /></span>
                        </div>
                        <span className="text-[9px] text-warm-muted block mt-0.5">Synced From Member Profile</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-warm-muted uppercase block font-bold mb-0.5">Age</span>
                        <div className="flex items-center gap-1.5 text-foreground font-semibold">
                          <span>{wizardPersonAge} Years</span>
                        </div>
                        <span className="text-[9px] text-gold font-bold block mt-0.5">Auto Calculated</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Marital Status *</label>
                    <select value={formData.marital_status} onChange={e => setFormData({ ...formData, marital_status: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none text-xs font-semibold">
                      <option value="Single">Single</option>
                      <option value="Never Married">Never Married</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widowed">Widowed</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Height (e.g. 5'6")</label>
                      <input type="text" value={formData.height} onChange={e => setFormData({ ...formData, height: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none text-xs font-semibold" placeholder="5'6" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Weight (kg)</label>
                      <input type="text" value={formData.weight} onChange={e => setFormData({ ...formData, weight: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none text-xs font-semibold" placeholder="e.g. 65" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Complexion</label>
                    <select value={formData.complexion} onChange={e => setFormData({ ...formData, complexion: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none text-xs font-semibold">
                      <option value="Very Fair">Very Fair</option>
                      <option value="Fair">Fair</option>
                      <option value="Wheatish">Wheatish</option>
                      <option value="Dark">Dark</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Religion</label>
                    <input type="text" value={formData.religion} onChange={e => setFormData({ ...formData, religion: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none text-xs font-semibold" placeholder="e.g. Hindu" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Mother Tongue</label>
                    <input type="text" value={formData.mother_tongue} onChange={e => setFormData({ ...formData, mother_tongue: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Languages Known</label>
                    <input type="text" value={formData.languages_known} onChange={e => setFormData({ ...formData, languages_known: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none text-xs font-semibold" placeholder="e.g. Gujarati, Hindi, English" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Native Place</label>
                    <input type="text" value={formData.native_place} onChange={e => setFormData({ ...formData, native_place: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none text-xs font-semibold" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Current Residential Address</label>
                    <textarea value={formData.current_address} onChange={e => setFormData({ ...formData, current_address: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none text-xs font-semibold h-16" placeholder="State/City, Street Address details..." />
                  </div>
                </div>

                {formData.marital_status === "Divorced" && (
                  <div className="p-4 bg-red-50/20 dark:bg-red-950/10 border border-red-200/50 rounded-2xl space-y-4">
                    <h5 className="text-xs font-bold text-red-600">Divorce Details</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Year of Divorce *</label>
                        <input type="number" value={formData.divorce_year} onChange={e => {
                          setFormData({ ...formData, divorce_year: e.target.value });
                          if (e.target.value) {
                            setValidationErrors(prev => { const n = { ...prev }; delete n.divorce_year; return n; });
                          }
                        }} className={`w-full px-3 py-2 border rounded-xl bg-surface focus:outline-none text-xs font-semibold ${validationErrors.divorce_year ? 'border-red-500' : 'border-warm'}`} placeholder="e.g. 2020" />
                        {validationErrors.divorce_year && (
                          <p className="text-red-500 text-[10px] font-bold mt-1">{validationErrors.divorce_year}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 pt-6">
                        <input type="checkbox" id="wizardDivorceKids" checked={formData.has_children} onChange={e => setFormData({ ...formData, has_children: e.target.checked })} className="w-4 h-4 accent-gold" />
                        <label htmlFor="wizardDivorceKids" className="text-xs font-semibold text-warm-muted select-none cursor-pointer">Has Children</label>
                      </div>
                    </div>
                  </div>
                )}

                {formData.marital_status === "Widowed" && (
                  <div className="p-4 bg-amber-50/20 dark:bg-amber-950/10 border border-amber-200/50 rounded-2xl space-y-4">
                    <h5 className="text-xs font-bold text-amber-600">Widow Details</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Year of Loss *</label>
                        <input type="number" value={formData.year_of_loss} onChange={e => {
                          setFormData({ ...formData, year_of_loss: e.target.value });
                          if (e.target.value) {
                            setValidationErrors(prev => { const n = { ...prev }; delete n.year_of_loss; return n; });
                          }
                        }} className={`w-full px-3 py-2 border rounded-xl bg-surface text-xs font-semibold ${validationErrors.year_of_loss ? 'border-red-500' : 'border-warm'}`} placeholder="e.g. 2018" />
                        {validationErrors.year_of_loss && (
                          <p className="text-red-500 text-[10px] font-bold mt-1">{validationErrors.year_of_loss}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {wizardStep === 2 && (
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-gold border-b border-warm/40 pb-1">Step 2: Education & Career Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Education Level</label>
                    <input type="text" value={formData.education} onChange={e => setFormData({ ...formData, education: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none text-xs font-semibold" placeholder="e.g. MBA, B.Tech, MS" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Profession / Occupation</label>
                    <input type="text" value={formData.profession} onChange={e => setFormData({ ...formData, profession: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none text-xs font-semibold" placeholder="e.g. Software Engineer" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Annual Income Range</label>
                    <input type="text" value={formData.income} onChange={e => setFormData({ ...formData, income: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none text-xs font-semibold" placeholder="e.g. 10-15 LPA" />
                  </div>
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-gold border-b border-warm/40 pb-1">Step 3: Lifestyle & Family Background</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Diet Type</label>
                    <select value={formData.diet} onChange={e => setFormData({ ...formData, diet: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none text-xs font-semibold">
                      <option value="Vegetarian">Vegetarian</option>
                      <option value="Jain">Jain Diet</option>
                      <option value="Eggetarian">Eggetarian</option>
                      <option value="Non-Vegetarian">Non-Vegetarian</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Smoking</label>
                      <select value={formData.smoking} onChange={e => setFormData({ ...formData, smoking: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold">
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                        <option value="Occasionally">Occasionally</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Drinking</label>
                      <select value={formData.drinking} onChange={e => setFormData({ ...formData, drinking: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold">
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                        <option value="Occasionally">Occasionally</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Family Type</label>
                    <select value={formData.family_type} onChange={e => setFormData({ ...formData, family_type: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold">
                      <option value="Nuclear">Nuclear</option>
                      <option value="Joint">Joint</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Family Values</label>
                    <select value={formData.family_values} onChange={e => setFormData({ ...formData, family_values: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold">
                      <option value="Traditional">Traditional</option>
                      <option value="Moderate">Moderate</option>
                      <option value="Liberal">Liberal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Father's Occupation</label>
                    <input type="text" value={formData.fathers_occupation} onChange={e => setFormData({ ...formData, fathers_occupation: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Mother's Occupation</label>
                    <input type="text" value={formData.mothers_occupation} onChange={e => setFormData({ ...formData, mothers_occupation: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Siblings Count</label>
                    <input type="number" value={formData.siblings_count} onChange={e => setFormData({ ...formData, siblings_count: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold" />
                  </div>
                </div>
                <div className="pt-2">
                  <label className="block text-xs font-bold text-warm-muted uppercase mb-1">About Me Description (Optional)</label>
                  <textarea value={formData.about} onChange={e => {
                    setFormData({ ...formData, about: e.target.value });
                  }} className={`w-full px-3 py-2 border rounded-xl bg-surface focus:outline-none text-xs font-semibold h-28 leading-relaxed border-warm`} placeholder="Write a summary about your character, career ambitions, personal lifestyle, and what expectations you seek in a partner..." />
                  {validationErrors.about && (
                    <p className="text-red-500 text-[10px] font-bold mt-1">{validationErrors.about}</p>
                  )}
                </div>
              </div>
            )}

            {wizardStep === 4 && (
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-gold border-b border-warm/40 pb-1">Step 4: Partner Preferences</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Looking For (Gender) *</label>
                    <select value={prefForm.gender} onChange={e => setPrefForm({ ...prefForm, gender: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface focus:outline-none text-xs font-semibold">
                      <option value="Bride">Bride (Female)</option>
                      <option value="Groom">Groom (Male)</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Min Age</label>
                      <input type="number" value={prefForm.min_age} onChange={e => setPrefForm({ ...prefForm, min_age: Number(e.target.value) })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Max Age</label>
                      <input type="number" value={prefForm.max_age} onChange={e => setPrefForm({ ...prefForm, max_age: Number(e.target.value) })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Preferred Caste</label>
                    <input type="text" value={prefForm.caste} onChange={e => setPrefForm({ ...prefForm, caste: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold" placeholder="e.g. Ahir" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Preferred Sub-Caste</label>
                    <input type="text" value={rawPrefForm.sub_caste ?? ""} onChange={e => setRawPrefForm((prev: any) => ({ ...prev, sub_caste: e.target.value }))} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold" placeholder="e.g. Samaj (optional)" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Preferred Education Level</label>
                    <input type="text" value={prefForm.education} onChange={e => setPrefForm({ ...prefForm, education: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold" placeholder="e.g. Graduate" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Preferred Occupation</label>
                    <input type="text" value={prefForm.occupation} onChange={e => setPrefForm({ ...prefForm, occupation: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold" placeholder="e.g. Professional" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Preferred State</label>
                    <input type="text" value={prefForm.state} onChange={e => setPrefForm({ ...prefForm, state: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold" placeholder="e.g. Gujarat" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Preferred City</label>
                    <input type="text" value={prefForm.city} onChange={e => setPrefForm({ ...prefForm, city: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold" placeholder="e.g. Rajkot" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Min Height</label>
                      <input type="text" value={prefForm.min_height} onChange={e => setPrefForm({ ...prefForm, min_height: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold" placeholder="e.g. 5'0" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Max Height</label>
                      <input type="text" value={prefForm.max_height} onChange={e => setPrefForm({ ...prefForm, max_height: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold" placeholder="e.g. 6'2" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Preferred Marital Status</label>
                    <select value={prefForm.marital_status} onChange={e => setPrefForm({ ...prefForm, marital_status: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold">
                      <option value="Any">Any</option>
                      <option value="Single">Single</option>
                      <option value="Never Married">Never Married</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widowed">Widowed</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {wizardStep === 5 && (
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-gold border-b border-warm/40 pb-1">Step 5: Privacy, Visibility & Contact Details</h4>
                
                {renderVisibilityAndAudienceSection()}

                <div className="pt-4 border-t border-warm/40 space-y-4">
                  <h5 className="text-xs font-bold text-gold uppercase tracking-wider">Contact & Guardians Information</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Contact Guardian Name</label>
                      <input type="text" value={formData.contact_name} onChange={e => setFormData({ ...formData, contact_name: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Relation to member</label>
                      <input type="text" value={formData.contact_relation} onChange={e => setFormData({ ...formData, contact_relation: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold" placeholder="e.g. Father, Self" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Contact Mobile Phone</label>
                      <input type="text" value={formData.contact_phone} onChange={e => setFormData({ ...formData, contact_phone: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Contact Email Address</label>
                      <input type="email" value={formData.contact_email} onChange={e => setFormData({ ...formData, contact_email: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold" />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-warm/40 space-y-4">
                  <h5 className="text-xs font-bold text-gold uppercase tracking-wider">Identity & Verification</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-warm-muted uppercase mb-1">Aadhaar card number (For verification)</label>
                      <input type="text" value={formData.aadhaar} onChange={e => setFormData({ ...formData, aadhaar: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold" placeholder="12 Digit Aadhaar Number" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-warm-muted uppercase mb-1">PAN card number</label>
                      <input type="text" value={formData.pan} onChange={e => setFormData({ ...formData, pan: e.target.value })} className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-xs font-semibold" placeholder="10 Digit PAN Number" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {wizardStep === 6 && (
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-gold border-b border-warm/40 pb-1">Step 6: Profile Photographs</h4>
                
                {validationErrors.photos && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 rounded-xl text-xs font-bold text-red-600">
                    {validationErrors.photos}
                  </div>
                )}

                {/* Drag & Drop Photo Upload Box */}
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={(e) => handleDrop(e, true)}
                  className={`p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${dragActive ? "border-gold bg-gold/5" : "border-warm hover:border-gold/60"}`}
                >
                  <input 
                    type="file" 
                    id="wizardPhotoUploadInput" 
                    accept="image/*" 
                    multiple
                    onChange={(e) => { if (e.target.files) handleMultipleFilesSelect(e.target.files, true); }} 
                    className="hidden" 
                  />
                  <label htmlFor="wizardPhotoUploadInput" className="cursor-pointer flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center text-gold">
                      <Camera className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-foreground mt-1">Click to select or Drag & drop photographs</span>
                    <span className="text-[10px] text-warm-muted">Supports JPG, JPEG, PNG, WEBP (Max 5MB per photo, Up to 10 photos)</span>
                  </label>
                </div>

                {/* Previews of selected photos */}
                {wizardPhotoFiles.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-warm-muted uppercase tracking-wider">Selected Photos ({wizardPhotoFiles.length} / 10)</h5>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {wizardPhotoFiles.map((ph, idx) => (
                        <div key={idx} className="relative aspect-[4/5] rounded-xl overflow-hidden border border-warm bg-sand/10 group flex flex-col justify-between">
                          <img src={ph.previewUrl} alt="" className="w-full h-full object-cover" />
                          
                          <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded text-[8px] font-bold text-white flex items-center gap-1">
                            {ph.isPrimary ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : null}
                            {ph.isPrimary ? "Primary Profile Photo" : ph.category}
                          </div>

                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                            <button
                              type="button"
                              onClick={() => {
                                setWizardPhotoFiles(prev => prev.map((item, i) => ({
                                  ...item,
                                  isPrimary: i === idx,
                                  category: i === idx ? "Profile Photo" : (item.category === "Profile Photo" ? "Lifestyle Photo" : item.category)
                                })));
                              }}
                              className={`px-2 py-1 rounded text-[10px] font-bold transition ${ph.isPrimary ? "bg-emerald-600 text-white" : "bg-surface text-foreground hover:bg-white"}`}
                            >
                              {ph.isPrimary ? "Primary Photo" : "Set Primary"}
                            </button>
                            
                            <div className="flex items-center gap-1">
                              <select 
                                value={ph.category} 
                                disabled={ph.isPrimary}
                                onChange={e => {
                                  const updated = [...wizardPhotoFiles];
                                  updated[idx].category = e.target.value;
                                  setWizardPhotoFiles(updated);
                                }}
                                className="px-1 py-0.5 text-[8px] font-bold border border-warm rounded bg-surface focus:outline-none"
                              >
                                <option value="Profile Photo" disabled>Profile Photo</option>
                                <option value="Lifestyle Photo">Lifestyle Photo</option>
                                <option value="Family Photo">Family Photo</option>
                              </select>

                              <button 
                                type="button"
                                onClick={() => {
                                  setWizardPhotoFiles(prev => {
                                    const filtered = prev.filter((_, i) => i !== idx);
                                    if (ph.isPrimary && filtered.length > 0) {
                                      filtered[0].isPrimary = true;
                                      filtered[0].category = "Profile Photo";
                                    }
                                    return filtered;
                                  });
                                }}
                                className="p-1 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

          <div className="flex justify-between items-center pt-4 border-t border-warm mt-6 font-ui">
            <button
              type="button"
              disabled={wizardStep === 1}
              onClick={() => setWizardStep(prev => prev - 1)}
              className="py-2 px-4 border border-warm rounded-xl text-xs font-bold text-warm-muted hover:bg-sand/30 disabled:opacity-40 transition"
            >
              Back
            </button>
            {wizardStep < 6 ? (
              <button
                type="submit"
                className="py-2 px-5 bg-gold hover:bg-gold/90 text-white rounded-xl text-xs font-bold shadow-xs transition"
              >
                Next Step
              </button>
            ) : (
              <button
                type="submit"
                disabled={savingProfile}
                className="py-2 px-6 bg-gold hover:bg-gold/90 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
              >
                {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Create Matrimony Profile
              </button>
            )}
          </div>
        </form>
      </Modal>

      {/* 3. SLIDING DRAWER DETAIL VIEWER */}
      <DetailDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={drawerProfile?.name || "Profile Details"} size="lg">
        {drawerProfile && (() => {
          const interestInfo = getInterestStatus(drawerProfile.id, drawerProfile.user);
          const isMutual = interestInfo?.status === "Accepted";
          const inWish = wishlist.some(w => w.id === drawerProfile.id);
          const initials = drawerProfile.name ? drawerProfile.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() : "MP";
          const primaryPhoto = resolvePhotoUrl(drawerProfile.photo || drawerProfile.photo_url || (drawerProfile.photos && drawerProfile.photos.find((ph: any) => !ph.is_private)?.image));

          let matchScoreColor = "bg-zinc-105 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
          if (drawerProfile.match_score >= 80) {
            matchScoreColor = "bg-amber-100 text-amber-850 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900";
          } else if (drawerProfile.match_score >= 60) {
            matchScoreColor = "bg-emerald-100 text-emerald-850 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900";
          } else if (drawerProfile.match_score >= 40) {
            matchScoreColor = "bg-orange-100 text-orange-850 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900";
          }

          return (
            <div className="space-y-6 text-foreground font-ui relative pb-6">
              
              {/* Header card with cover image & quick stats */}
              <div className="relative rounded-2xl overflow-hidden bg-sand/10 dark:bg-zinc-900/40 border border-warm/80 p-5 flex flex-col sm:flex-row gap-5 items-center">
                <div className="w-24 h-24 rounded-full overflow-hidden shrink-0 border-2 border-gold/40 bg-surface flex items-center justify-center shadow-md">
                  {primaryPhoto ? (
                    <img src={primaryPhoto} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-500 to-amber-600 text-white font-black text-2xl">
                      {initials}
                    </div>
                  )}
                </div>
                <div className="flex-1 text-center sm:text-left min-w-0">
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <h4 className="text-xl font-bold text-foreground truncate flex items-center gap-1.5">
                      {drawerProfile.name}
                      <span title="Synced From Member Profile"><Lock className="w-3.5 h-3.5 text-gold-light/70" /></span>
                    </h4>
                    {drawerProfile.is_verified && (
                      <span className="bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        <Shield className="w-2.5 h-2.5 fill-teal-500/10" /> Verified
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-warm-muted mt-1 font-semibold flex items-center justify-center sm:justify-start gap-1 flex-wrap">
                    <span>{drawerProfile.age} Years</span>
                    <span className="text-[9px] bg-gold/10 text-gold px-1.5 py-0.2 rounded font-bold uppercase mr-1">Auto Calculated</span>
                    <span>•</span>
                    <span>{drawerProfile.marital_status}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      {drawerProfile.gender}
                      <span title="Synced From Member Profile"><Lock className="w-3 h-3 text-gold-light/60" /></span>
                    </span>
                  </div>
                  <p className="text-xs text-warm-muted mt-0.5 font-semibold flex items-center justify-center sm:justify-start gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gold" />
                    {drawerProfile.city || "Not Disclosed"}, {drawerProfile.state || "Not Disclosed"}
                  </p>
                </div>
                
                {drawerProfile.match_score !== undefined && (
                  <div className={`p-3 rounded-2xl text-center shrink-0 border ${matchScoreColor} shadow-xs`}>
                    <Sparkles className="w-5 h-5 text-gold mx-auto mb-0.5 animate-pulse" />
                    <div className="text-sm font-black">{drawerProfile.match_score}%</div>
                    <div className="text-[9px] font-bold uppercase tracking-wider opacity-80">Match Score</div>
                  </div>
                )}
              </div>

              {/* Sticky Tab Navigation Bar */}
              <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-warm flex gap-1 pt-1 overflow-x-auto scrollbar-none">
                {["About", "Compatibility & Fit", "Background & Lifestyle", "Partner Criteria", "Photos"].map(dt => (
                  <button
                    key={dt}
                    onClick={() => setDrawerTab(dt)}
                    className={`flex-1 pb-2 text-xs font-bold border-b-2 text-center transition-all whitespace-nowrap px-3 ${
                      drawerTab === dt ? "border-gold text-gold font-bold" : "border-transparent text-warm-muted hover:text-foreground"
                    }`}
                  >
                    {dt}
                  </button>
                ))}
              </div>

              {/* Tab Panel: Compatibility & Fit */}
              {drawerTab === "Compatibility & Fit" && (
                <div className="space-y-4 animate-fadeIn">
                  {/* Score circle and intro */}
                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-sand/15 dark:bg-zinc-900/10 border border-warm/40 p-4 rounded-xl">
                    <div className="relative w-20 h-20 flex items-center justify-center rounded-full bg-gold/10 border-2 border-gold/30">
                      <span className="text-xl font-bold text-gold">{drawerProfile.match_score || 0}%</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wider text-warm-muted mb-1">Mutual Compatibility Score</h4>
                      <p className="text-[11px] text-warm-muted/90 leading-relaxed font-medium">
                        This score is calculated dynamically based on your partner preference expectations and their stated lifestyle and background criteria.
                      </p>
                    </div>
                  </div>

                  {/* Positive Match Reasons */}
                  {drawerProfile.match_reasons && drawerProfile.match_reasons.length > 0 && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2.5">
                      <h5 className="font-bold text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1">
                        <Check className="w-4 h-4" /> Areas of Strong Agreement
                      </h5>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-warm-muted">
                        {drawerProfile.match_reasons.map((reason: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-emerald-600 dark:text-emerald-400 mt-0.5">✓</span>
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Negative Match Reasons / Gaps */}
                  {drawerProfile.match_negatives && drawerProfile.match_negatives.length > 0 && (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2.5">
                      <h5 className="font-bold text-amber-600 dark:text-amber-400 text-xs flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" /> Criteria Gaps / Mismatches
                      </h5>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-warm-muted">
                        {drawerProfile.match_negatives.map((neg: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-amber-600 dark:text-amber-400 mt-0.5">⚠️</span>
                            <span>{neg}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Detailed breakdown category-by-category */}
                  {drawerProfile.compatibility_breakdown && (
                    <div className="p-4 bg-sand/10 dark:bg-zinc-900/10 border border-warm/40 rounded-xl space-y-3">
                      <h5 className="font-bold text-warm-muted uppercase tracking-wider text-[10px] border-b border-warm/40 pb-1.5">
                        Preference Rule Matrix Breakdown
                      </h5>
                      <div className="space-y-2">
                        {Object.entries(drawerProfile.compatibility_breakdown).map(([category, val]: [string, any]) => {
                          const statusColor = val.status === 'Match' ? 'text-emerald-600' : val.status === 'Gap' ? 'text-amber-600' : 'text-warm-muted/70';
                          return (
                            <div key={category} className="flex justify-between items-center text-xs font-semibold py-1 border-b border-warm/20 last:border-0">
                              <span className="capitalize">{category.replace('_', ' ')}</span>
                              <span className={`${statusColor}`}>{val.message}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab Panel: About */}
              {drawerTab === "About" && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-warm-muted tracking-wider block">Introduction Description</span>
                    <p className="text-sm text-foreground/80 mt-1.5 leading-relaxed whitespace-pre-line bg-sand/10 dark:bg-zinc-900/10 p-3.5 rounded-xl border border-warm/40">
                      {drawerProfile.about || "No introduction description provided."}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs font-semibold border-t border-warm pt-4">
                    <div>
                      <span className="text-[10px] uppercase font-gold text-warm-muted block mb-0.5">Date Of Birth</span>
                      <div className="flex items-center gap-1.5 text-foreground/85">
                        <span>{drawerProfile.dob || "N/A"}</span>
                        <span title="Synced From Member Profile"><Lock className="w-3 h-3 text-gold-light/70" /></span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-gold text-warm-muted block mb-0.5">Caste / Sub-Caste</span>
                      <span className="text-foreground/85">{drawerProfile.caste || "Ahir"} / {drawerProfile.sub_caste || "Samaj"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-gold text-warm-muted block mb-0.5">Height & Weight</span>
                      <span className="text-foreground/85">{drawerProfile.height || "N/A"} / {drawerProfile.weight ? `${drawerProfile.weight} kg` : "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-gold text-warm-muted block mb-0.5">Religion</span>
                      <span className="text-foreground/85">{drawerProfile.religion || "Hindu"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-gold text-warm-muted block mb-0.5">Mother Tongue</span>
                      <span className="text-foreground/85">{drawerProfile.mother_tongue || "Gujarati"}</span>
                    </div>
                  </div>

                  {/* Family Background */}
                  {drawerProfile.family_details ? (
                    <div className="bg-sand/10 dark:bg-zinc-900/10 border border-warm/40 rounded-xl p-4 space-y-2.5 text-xs font-semibold mt-4">
                      <h5 className="font-bold text-gold uppercase tracking-wider text-[10px] border-b border-warm/40 pb-1.5 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> Family Background
                      </h5>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-warm-muted">
                        <p>Head of Family: <span className="text-foreground font-bold">{drawerProfile.family_details.head || "N/A"}</span></p>
                        <p>Native Place: <span className="text-foreground font-bold">{drawerProfile.family_details.village || drawerProfile.native_place || "N/A"}</span></p>
                        <p>Father's Occupation: <span className="text-foreground font-bold">{drawerProfile.fathers_occupation || drawerProfile.family_details.fathers_occupation || "N/A"}</span></p>
                        <p>Mother's Occupation: <span className="text-foreground font-bold">{drawerProfile.mothers_occupation || drawerProfile.family_details.mothers_occupation || "N/A"}</span></p>
                        <p>Siblings Count: <span className="text-foreground font-bold">{drawerProfile.siblings_count || drawerProfile.family_details.siblings_count || "0"}</span></p>
                      </div>

                      {drawerProfile.family_details.members && drawerProfile.family_details.members.length > 0 && (
                        <div className="mt-3">
                          <span className="text-[10px] uppercase font-bold text-warm-muted block mb-1.5">Family Members Details</span>
                          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                            {drawerProfile.family_details.members.map((m: any) => (
                              <div key={m.id} className="flex justify-between items-center bg-surface p-2 rounded-lg border border-warm/40">
                                <div>
                                  <div className="font-bold text-[11px] text-foreground">{m.name}</div>
                                  <div className="text-[9px] text-warm-muted">{m.relation} • {m.occupation || m.job_title || "N/A"}</div>
                                </div>
                                {m.salary && (
                                  <div className="text-[9.5px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded">
                                    {m.salary}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-sand/10 dark:bg-zinc-900/10 border border-warm/40 rounded-xl p-4 space-y-1.5 text-xs mt-4">
                      <h5 className="font-bold text-gold uppercase tracking-wider text-[10px] border-b border-warm/40 pb-1.5 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> Family Background
                      </h5>
                      <p className="text-warm-muted">Native Place / Ancestral: <span className="font-semibold text-foreground">{drawerProfile.native_place || "Not Disclosed"}</span></p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab Panel: Background & Lifestyle */}
              {drawerTab === "Background & Lifestyle" && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="grid grid-cols-2 gap-4 text-xs font-semibold bg-sand/10 dark:bg-zinc-900/10 border border-warm/40 p-4 rounded-xl">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-warm-muted block mb-0.5">Education Level</span>
                      <span className="text-foreground">{drawerProfile.education || "Graduate"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-warm-muted block mb-0.5">Occupation & Profession</span>
                      <span className="text-foreground">{drawerProfile.profession || "Business"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-warm-muted block mb-0.5">Annual Income</span>
                      <span className="text-foreground/90 font-bold text-emerald-600 dark:text-emerald-400">{drawerProfile.income || "Not Disclosed"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-warm-muted block mb-0.5">Dietary Choice</span>
                      <span className="text-foreground">{drawerProfile.diet || "Vegetarian"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-warm-muted block mb-0.5">Complexion</span>
                      <span className="text-foreground">{drawerProfile.complexion || "Fair"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-warm-muted block mb-0.5">Smoking / Drinking</span>
                      <span className="text-foreground">{drawerProfile.smoking || "No"} / {drawerProfile.drinking || "No"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-warm-muted block mb-0.5">Languages Known</span>
                      <span className="text-foreground">{drawerProfile.languages_known || "Gujarati, Hindi, English"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-warm-muted block mb-0.5">Family Style & Values</span>
                      <span className="text-foreground">{drawerProfile.family_type || "Joint"} ({drawerProfile.family_values || "Traditional"})</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Panel: Partner Criteria */}
              {drawerTab === "Partner Criteria" && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="p-4 bg-sand/10 dark:bg-zinc-900/10 rounded-xl border border-warm/40 text-xs space-y-3 font-semibold">
                    <h5 className="font-bold text-gold uppercase tracking-wider text-[10px] border-b border-warm/40 pb-1.5 flex items-center gap-1">
                      <Sliders className="w-3.5 h-3.5" /> Partner Expectation Settings
                    </h5>
                    <div className="grid grid-cols-2 gap-3 text-[11px]">
                      <div>
                        <span className="text-[10px] text-warm-muted block">Expected Age Range</span>
                        <span className="text-foreground">{drawerProfile.audience_age_min || drawerProfile.partner_preference?.min_age || 18} - {drawerProfile.audience_age_max || drawerProfile.partner_preference?.max_age || 60} Years</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-warm-muted block">Preferred Gender</span>
                        <span className="text-foreground">{drawerProfile.partner_preference?.gender || (drawerProfile.gender === "Bride" ? "Groom" : "Bride")}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-warm-muted block">Marital Status Allowed</span>
                        <span className="text-foreground">{drawerProfile.audience_marital_status || drawerProfile.partner_preference?.marital_status || "Any"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-warm-muted block">Caste Target</span>
                        <span className="text-foreground">{drawerProfile.audience_caste || drawerProfile.partner_preference?.caste || "Any Caste"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-warm-muted block">Expected Education</span>
                        <span className="text-foreground">{drawerProfile.partner_preference?.education || "Any"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-warm-muted block">Expected Occupation</span>
                        <span className="text-foreground">{drawerProfile.partner_preference?.occupation || "Any"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-warm-muted block">Height Range Expected</span>
                        <span className="text-foreground">
                          {drawerProfile.partner_preference?.min_height || "4'5"} - {drawerProfile.partner_preference?.max_height || "7'0"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-warm-muted block">Preferred State / Location</span>
                        <span className="text-foreground">{drawerProfile.partner_preference?.state || "Any State"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Panel: Photos */}
              {drawerTab === "Photos" && (
                <div className="space-y-4 animate-fadeIn">
                  {drawerProfile.photos && drawerProfile.photos.length > 0 ? (
                    <div className="space-y-4">
                      {/* Main Photo Display Card */}
                      <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-sand/30 border border-warm/80 group">
                        {drawerProfile.photos[activePhotoIndex]?.is_private && !isMutual ? (
                          <div className="w-full h-full relative">
                            <img src={resolvePhotoUrl(drawerProfile.photos[activePhotoIndex].image)} alt="" className="w-full h-full object-cover blur-2xl saturate-50" />
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white text-center p-4">
                              <Lock className="w-10 h-10 text-gold mb-2 animate-bounce" />
                              <p className="text-sm font-bold">Photos are Private</p>
                              <p className="text-xs text-zinc-300 mt-1 px-4">Contact details & private photos are hidden until interest request is mutually accepted.</p>
                            </div>
                          </div>
                        ) : drawerProfile.photos[activePhotoIndex]?.is_blurred || (drawerProfile.photos[activePhotoIndex]?.image && drawerProfile.photos[activePhotoIndex].image.includes("blurred=true")) ? (
                          <div className="w-full h-full relative animate-fadeIn">
                            <img src={resolvePhotoUrl(drawerProfile.photos[activePhotoIndex].image)} alt="" className="w-full h-full object-cover blur-2xl saturate-50" />
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white text-center p-4">
                              <EyeOff className="w-10 h-10 text-gold mb-2 animate-pulse" />
                              <p className="text-sm font-bold">Blurred Preview Only</p>
                              <p className="text-xs text-zinc-300 mt-1 px-4">This member has enabled blurred photo previews. Send interest and connect to request unblurred access.</p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <img 
                              src={resolvePhotoUrl(drawerProfile.photos[activePhotoIndex].image)} 
                              alt={`${drawerProfile.name} photo ${activePhotoIndex + 1}`} 
                              className="w-full h-full object-cover" 
                            />
                            {/* Previous & Next overlay buttons */}
                            {drawerProfile.photos.length > 1 && (
                              <>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActivePhotoIndex(prev => (prev === 0 ? drawerProfile.photos.length - 1 : prev - 1));
                                  }}
                                  className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition"
                                >
                                  <ArrowLeft className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActivePhotoIndex(prev => (prev === drawerProfile.photos.length - 1 ? 0 : prev + 1));
                                  }}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition"
                                >
                                  <ArrowRight className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            
                            {/* Fullscreen button */}
                            <button 
                              onClick={() => setFullscreenPhotoUrl(resolvePhotoUrl(drawerProfile.photos[activePhotoIndex].image))}
                              className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/85 transition opacity-0 group-hover:opacity-100"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-white/20">
                          {activePhotoIndex + 1} / {drawerProfile.photos.length} ({drawerProfile.photos[activePhotoIndex]?.category})
                        </div>
                      </div>

                      {/* Thumbnail strip selector */}
                      <div className="flex gap-2 overflow-x-auto scrollbar-none py-1 border-t border-warm/40 pt-3">
                        {drawerProfile.photos.map((ph: any, idx: number) => (
                          <button
                            key={ph.id}
                            onClick={() => setActivePhotoIndex(idx)}
                            className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                              activePhotoIndex === idx ? "border-gold scale-105 shadow-sm" : "border-warm/50 opacity-60 hover:opacity-100"
                            }`}
                          >
                            <img src={resolvePhotoUrl(ph.image)} alt="" className={`w-full h-full object-cover ${ph.is_blurred || (ph.image && ph.image.includes("blurred=true")) ? "blur-xs saturate-50" : ""}`} />
                            {ph.is_private && !isMutual && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                                <Lock className="w-3.5 h-3.5 text-gold" />
                              </div>
                            )}
                            {!(ph.is_private && !isMutual) && (ph.is_blurred || (ph.image && ph.image.includes("blurred=true"))) && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                                <EyeOff className="w-3.5 h-3.5 text-gold" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center border border-warm/40 rounded-2xl bg-sand/5">
                      <Camera className="w-8 h-8 text-warm-muted mx-auto mb-2" />
                      <p className="text-xs text-warm-muted font-bold">No Photos Uploaded</p>
                    </div>
                  )}
                </div>
              )}

              {/* Contact Information Exchanges Card */}
              <AnimatedCard className="p-4 border border-gold-light/60 bg-gradient-to-r from-gold/5 to-primary/5">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isMutual ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40" : "bg-gold/15 text-gold"}`}>
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-foreground">Contact & Family Details Exchange</h5>
                    {drawerProfile.contact_email || drawerProfile.contact_phone || drawerProfile.contact_whatsapp ? (
                      <div className="space-y-1 text-sm font-semibold text-foreground/90 pt-1">
                        {drawerProfile.contact_email && (
                          <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-gold" /> {drawerProfile.contact_email}</div>
                        )}
                        {drawerProfile.contact_phone && (
                          <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-gold" /> {drawerProfile.contact_phone}</div>
                        )}
                        {drawerProfile.contact_whatsapp && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded font-bold">WhatsApp</span>
                            {drawerProfile.contact_whatsapp}
                          </div>
                        )}
                        {drawerProfile.contact_name && (
                          <div className="text-[10px] text-warm-muted mt-1.5">
                            Contact Person: {drawerProfile.contact_name} {drawerProfile.contact_relation ? `(${drawerProfile.contact_relation})` : ''}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-warm-muted mt-1 leading-relaxed">
                        {isMutual 
                          ? "Contact details are set to private (Never Share) by this member."
                          : "Contact details are protected by privacy rules. Send interest and connect. Once accepted by both partners, contact information will unlock."}
                      </p>
                    )}
                  </div>
                </div>
              </AnimatedCard>

              {/* Action Buttons bar */}
              <div className="flex gap-2 border-t border-warm pt-4">
                <button
                  onClick={() => handleToggleWishlist(drawerProfile.id, drawerProfile.name)}
                  className={`flex-1 py-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition duration-200 ${
                    inWish ? "bg-gold border-gold text-white animate-pulse" : "border-warm bg-surface hover:bg-sand text-foreground"
                  }`}
                >
                  <Bookmark className="w-4 h-4" /> {inWish ? "Shortlisted" : "Shortlist"}
                </button>
                {interestInfo ? (
                  <div className="flex-1 py-2.5 rounded-xl bg-sand border border-warm flex items-center justify-center gap-1 text-xs font-bold text-warm-muted">
                    {interestInfo.status === "Accepted" ? (
                      <><Heart className="w-4 h-4 text-rose-500 fill-rose-500" /> Mutual Match</>
                    ) : interestInfo.status === "Rejected" ? (
                      "Interest Declined"
                    ) : interestInfo.type === "sent" ? (
                      "Interest Sent"
                    ) : (
                      "Interest Received"
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => handleSendInterest(drawerProfile.id, drawerProfile.name)}
                    className="flex-1 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 active:scale-95 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition duration-200"
                  >
                    <Heart className="w-4 h-4" /> Show Interest
                  </button>
                )}
              </div>

            </div>
          );
        })()}
      </DetailDrawer>

      {/* Lightbox / Fullscreen Image Viewer */}
      {fullscreenPhotoUrl && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4">
          <button 
            onClick={() => setFullscreenPhotoUrl(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition"
          >
            <X className="w-6 h-6" />
          </button>
          <img src={fullscreenPhotoUrl} alt="Fullscreen View" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
        </div>
      )}

    </PageWrap>
  );
}
